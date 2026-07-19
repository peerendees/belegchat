#!/usr/bin/env python3
"""Chunk-Plan — Modul-weiser Map-Reduce-Plan fuer die Narration (BOO-489).

Liest den deterministischen Faktengraphen (`docs/_intake/brownfield/fact-graph.yml`)
und emittiert einen **Modul-Chunk-Plan** (`docs/_intake/brownfield/chunk-plan.yml`):
pro Modul/Paket ein Slice (Nodes + die Kanten, die das Modul beruehren) mit einer
**lokalen, bewusst ueberschaetzenden Token-Schaetzung**. Ueberschreitet ein Modul das
Chunk-Budget, wird es **gesplittet** (nie ungeprueft "ein Modul = ein Chunk").

Warum das gefahrlos chunkbar ist: Die Architektur-Kanten stehen VOR der Narration
deterministisch im Faktengraphen (scip-java/clangd) — das Zerstueckeln der Narration
zerreisst die Zusammenhaenge nicht (BOO-489, Epic BOO-483).

Token-Budget = num_ctx x effective_fraction x safety (Formel-SSoT: BOO-484).
  - Ohne Modell-Profil: konservativer Fest-Default (klein genug fuer jedes realistische Modell).
  - Mit Profil (BOO-485): num_ctx / effective_fraction werden gelesen; Format-Owner ist BOO-485,
    dieses Skript liest nur best-effort die zwei Felder.
  - Token-Schaetzung LOKAL (Ollamas Anthropic-Endpunkt bietet kein count_tokens): Zeichen-Heuristik,
    bewusst ueberschaetzend (mehr Sicherheitsmarge). KEIN API-Aufruf.

Aufruf:
    python3 chunk_plan.py \
        --fact-graph docs/_intake/brownfield/fact-graph.yml \
        --out docs/_intake/brownfield/chunk-plan.yml \
        [--src-root /pfad/zur/quelle] [--profile pfad/zum/model-profile.yml] \
        [--num-ctx 32000] [--effective-fraction 0.5] [--safety 0.8]

    python3 chunk_plan.py --self-test    # dependency-armer Funktions-Selbsttest

Exit-Codes: 0 = Plan geschrieben · 1 = leerer Graph (keine Nodes) · 2 = Umgebungs-/Pfadfehler.
"""

import argparse
import math
import os
import posixpath
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("FEHLER: PyYAML fehlt. Installieren mit: python3 -m pip install pyyaml", file=sys.stderr)
    sys.exit(2)

GENERATOR = "brownfield-onboarding/scripts/chunk_plan.py v1"

# --- Konservative Fest-Defaults (ohne Modell-Profil) --------------------------------
# Klein genug, dass jeder Chunk auf jedem realistischen Modell passt (auch lokal via Ollama,
# wo num_ctx klein defaultet und die brauchbare Grenze weit unter dem Nominalwert liegt).
DEFAULT_NUM_CTX = 32_000
DEFAULT_EFFECTIVE_FRACTION = 0.5
DEFAULT_SAFETY = 0.8

# --- Lokaler Token-Schaetzer (bewusst ueberschaetzend) ------------------------------
# Reale Tokenizer liegen bei ~4 Zeichen/Token (Prosa) bis ~3 (dichter Code/YAML). Wir teilen
# durch einen KLEINEN Divisor -> die Schaetzung faellt eher zu HOCH aus (Sicherheitsmarge).
CHARS_PER_TOKEN = 3.0
# Fixer Overhead pro Chunk fuer das Subagent-Briefing (Prompt, Instruktionen, Ehrlichkeits-Schicht).
PROMPT_OVERHEAD_TOKENS = 800
# Fallback-Schaetzung pro Quell-Datei, wenn --src-root fehlt (kein echtes Datei-Mass verfuegbar).
# Bewusst grosszuegig — lieber ein Modul zu frueh splitten als einen Chunk sprengen.
PER_FILE_FALLBACK_TOKENS = 1_500

# Sentinel fuer Nodes ohne ableitbares Modul (kein Paket, kein parent, keine dotted/pfad-id).
ROOT_MODULE = "(root)"


def _s(value) -> str:
    """Kompakte, robuste String-Normalisierung: None-sicher, getrimmt (Trim beidseitig)."""
    return str(value or "").strip()


def resolve_contained(base: Path, candidate: Path):
    """Kanonisiert candidate und gibt den aufgeloesten Pfad zurueck, wenn er innerhalb von
    base liegt — sonst None (Schutz gegen Path-Traversal). Weiterverwendet wird NUR der hier
    zurueckgegebene, validierte Pfad (Anti-Fabrikations-Regel 4: nie ausserhalb schreiben)."""
    base_real = Path(os.path.realpath(base))
    cand_real = Path(os.path.realpath(candidate))
    if cand_real != base_real and not cand_real.is_relative_to(base_real):
        return None
    return cand_real


def module_key(node: dict) -> str:
    """Bestimmt das Modul/Paket eines Node — die Chunk-Einheit (nicht die Rohdatei).

    Ein `package`-Node repraesentiert das Modul selbst -> seine id. Klassen/Interfaces/Enums/
    Entrypoints gehoeren in ihr Paket -> `parent` (FQN des Pakets). Fehlt `parent`, wird das
    Modul aus der id abgeleitet (dotted FQN oder pfad-artige C/C++-id)."""
    kind = _s(node.get("kind"))
    node_id = _s(node.get("id"))
    if kind == "package":
        return node_id or ROOT_MODULE
    parent = _s(node.get("parent"))
    if parent:
        return parent
    if "." in node_id:
        return node_id.rsplit(".", 1)[0]
    file_ref = _s(node.get("file"))
    if "/" in node_id:
        return posixpath.dirname(node_id)
    if "/" in file_ref:
        return posixpath.dirname(file_ref)
    return ROOT_MODULE


def sanitize_module_name(module: str) -> str:
    """Modul-Schluessel -> dateisystem-sicherer Name fuer module-<name>.md (Punkte bleiben
    lesbar, Slashes/Whitespace werden ersetzt)."""
    name = module.replace(os.sep, "/").replace("/", ".").replace(" ", "_")
    name = name.strip("._()") or "root"
    return name


def estimate_tokens(nodes: list, edges: list, files: set, src_root) -> int:
    """Lokale, bewusst ueberschaetzende Token-Schaetzung fuer einen Modul-Slice. Kein API-Aufruf.

    Setzt sich zusammen aus (1) dem serialisierten Graph-Slice, (2) den Quell-Ausschnitten,
    die der Subagent lesen muss, und (3) einem fixen Prompt-Overhead. Ohne --src-root wird die
    Quell-Groesse pro Datei konservativ pauschaliert; mit --src-root wird die echte Dateigroesse
    (ganze Datei = Obergrenze) herangezogen."""
    slice_doc = {"nodes": nodes, "edges": edges}
    graph_chars = len(yaml.safe_dump(slice_doc, allow_unicode=True, sort_keys=True))
    graph_tokens = math.ceil(graph_chars / CHARS_PER_TOKEN)

    source_tokens = 0
    if src_root is not None:
        for rel in sorted(files):
            fpath = resolve_contained(src_root, src_root / rel)
            if fpath is None or not fpath.is_file():
                # Datei ausserhalb der Quelle oder nicht gefunden -> Fallback statt Abbruch.
                source_tokens += PER_FILE_FALLBACK_TOKENS
                continue
            try:
                size = fpath.stat().st_size
            except OSError:
                source_tokens += PER_FILE_FALLBACK_TOKENS
                continue
            source_tokens += math.ceil(size / CHARS_PER_TOKEN)
    else:
        source_tokens = len(files) * PER_FILE_FALLBACK_TOKENS

    return graph_tokens + source_tokens + PROMPT_OVERHEAD_TOKENS


def _group_nodes_by_module(nodes: list):
    """Nodes nach Modul buckets; gibt (modules, id_to_module) zurueck."""
    modules = {}
    id_to_module = {}
    for node in nodes:
        mod = module_key(node)
        nid = _s(node.get("id"))
        id_to_module.setdefault(nid, mod)
        bucket = modules.setdefault(
            mod, {"nodes": [], "node_ids": set(), "files": set(), "edges": []}
        )
        bucket["nodes"].append(node)
        if nid:
            bucket["node_ids"].add(nid)
        fref = _s(node.get("file"))
        if fref:
            bucket["files"].add(fref)
    return modules, id_to_module


def _assign_edges_to_modules(edges: list, modules: dict, id_to_module: dict) -> None:
    """Ordnet jede Kante den Modulen ihrer Endpunkte zu (from ODER to im Modul)."""
    for edge in edges:
        touched = {id_to_module.get(_s(edge.get(key))) for key in ("from", "to")}
        touched.discard(None)
        for mod in touched:
            modules[mod]["edges"].append(edge)


def build_module_slices(graph: dict) -> dict:
    """Gruppiert Nodes nach Modul; jedem Modul werden die Kanten zugeordnet, die es beruehren
    (from ODER to im Modul) — so traegt das Modul seine Zusammenhaenge, nicht die Rohdatei."""
    modules, id_to_module = _group_nodes_by_module(graph.get("nodes") or [])
    _assign_edges_to_modules(graph.get("edges") or [], modules, id_to_module)
    return modules


def split_into_parts(node_list: list, parts: int) -> list:
    """Deterministische Partition (nach id sortiert) in `parts` moeglichst gleich grosse Gruppen."""
    ordered = sorted(node_list, key=lambda n: str(n.get("id") or ""))
    parts = max(1, min(parts, len(ordered)))
    size = math.ceil(len(ordered) / parts)
    return [ordered[i : i + size] for i in range(0, len(ordered), size)]


def edges_for(node_ids: set, all_edges: list) -> list:
    """Kanten, die eine der node_ids beruehren."""
    out = []
    for edge in all_edges:
        efrom = _s(edge.get("from"))
        eto = _s(edge.get("to"))
        if efrom in node_ids or eto in node_ids:
            out.append(edge)
    return out


def files_for(nodes: list) -> set:
    return {_s(n.get("file")) for n in nodes if _s(n.get("file"))}


def plan_chunks(graph: dict, budget: int, src_root) -> list:
    """Baut die Chunk-Liste: pro Modul ein Chunk, ueber-Budget-Module werden gesplittet."""
    modules = build_module_slices(graph)
    chunks = []
    for module in sorted(modules):
        bucket = modules[module]
        nodes = bucket["nodes"]
        module_edges = bucket["edges"]
        files = bucket["files"]
        est = estimate_tokens(nodes, module_edges, files, src_root)

        if est <= budget or len(nodes) <= 1:
            # Passt (oder ist unteilbar: ein einzelner Node kann nicht kleiner werden).
            chunks.append(
                _make_chunk(module, 1, 1, nodes, module_edges, files, est, budget)
            )
            continue

        parts = math.ceil(est / budget)
        groups = split_into_parts(nodes, parts)
        parts_total = len(groups)
        for idx, group in enumerate(groups, start=1):
            gids = {_s(n.get("id")) for n in group}
            gedges = edges_for(gids, module_edges)
            gfiles = files_for(group)
            gest = estimate_tokens(group, gedges, gfiles, src_root)
            chunks.append(
                _make_chunk(module, idx, parts_total, group, gedges, gfiles, gest, budget)
            )
    return chunks


def _make_chunk(module, part, parts_total, nodes, edges, files, est, budget) -> dict:
    base = sanitize_module_name(module)
    suffix = f".p{part:02d}" if parts_total > 1 else ""
    chunk_id = f"module-{base}{suffix}"
    return {
        "id": chunk_id,
        "module": module,
        "part": part,
        "parts_total": parts_total,
        "node_ids": sorted(_s(n.get("id")) for n in nodes),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "files": sorted(files),
        "est_tokens": est,
        "within_budget": bool(est <= budget),
        "module_doc": f"docs/_intake/brownfield/{chunk_id}.md",
    }


def load_profile(profile_path):
    """Best-effort: liest num_ctx / effective_fraction aus einem Modell-Profil (BOO-485 ist
    Format-Owner). Fehlendes/kaputtes/ausserhalb-des-Projekts Profil -> (None, None),
    Aufrufer nimmt den konservativen Default."""
    # Pfad-Traversal-Schutz (SonarCloud S2083 / Security Rating): das Profil wird gegen das
    # Projekt (cwd) contained — die Datei-Operation laeuft NUR auf dem kanonisierten, validierten
    # resolve_contained-Rueckgabewert (realpath + Containment-Check), identisch zu fact-graph/out.
    # Ein Profil ausserhalb des Projekts -> (None, None) -> konservativer Default (graceful).
    # Fuer ein maschinen-/modell-globales Profil ausserhalb des Baums stattdessen die Werte direkt
    # via --num-ctx / --effective-fraction uebergeben.
    real_path = resolve_contained(Path.cwd(), Path(profile_path))
    if real_path is None or not real_path.is_file():
        return None, None
    try:
        with open(real_path, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
    except (OSError, yaml.YAMLError):
        return None, None
    if not isinstance(data, dict):
        return None, None
    # Profil kann die Felder top-level oder unter "context" tragen — beides best-effort lesen.
    ctx = data.get("context") if isinstance(data.get("context"), dict) else {}
    num_ctx = data.get("num_ctx", ctx.get("num_ctx"))
    frac = data.get("effective_fraction", ctx.get("effective_fraction"))
    try:
        num_ctx = int(num_ctx) if num_ctx is not None else None
    except (TypeError, ValueError):
        num_ctx = None
    try:
        frac = float(frac) if frac is not None else None
    except (TypeError, ValueError):
        frac = None
    return num_ctx, frac


def compute_budget(args):
    """Ermittelt (budget, meta) aus Profil / CLI-Override / konservativem Default.

    Prioritaet pro Feld: CLI-Override > Profil > Default. Der 'profile_source'-Vermerk sagt
    ehrlich, woher die Werte kamen (Audit-Spur im Plan)."""
    num_ctx = DEFAULT_NUM_CTX
    frac = DEFAULT_EFFECTIVE_FRACTION
    source = "default-conservative"

    if args.profile:
        p_ctx, p_frac = load_profile(args.profile)
        if p_ctx is not None or p_frac is not None:
            num_ctx = p_ctx if p_ctx is not None else num_ctx
            frac = p_frac if p_frac is not None else frac
            source = f"profile:{args.profile}"
        else:
            source = "default-conservative (profile unreadable)"

    if args.num_ctx is not None:
        num_ctx = args.num_ctx
        source = "cli-override"
    if args.effective_fraction is not None:
        frac = args.effective_fraction
        source = "cli-override"

    safety = args.safety if args.safety is not None else DEFAULT_SAFETY
    budget = int(num_ctx * frac * safety)
    if budget < 1:
        budget = 1
    meta = {
        "num_ctx": num_ctx,
        "effective_fraction": frac,
        "safety_factor": safety,
        "chunk_budget_tokens": budget,
        "profile_source": source,
        "estimator": f"char-heuristic (chars/{CHARS_PER_TOKEN}, deliberately overestimating); "
        "no count_tokens API call",
    }
    return budget, meta


def build_plan_doc(graph, chunks, budget_meta) -> dict:
    modules = sorted({c["module"] for c in chunks})
    over = [c["id"] for c in chunks if not c["within_budget"]]
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generator": GENERATOR,
        "source_fact_graph": {
            "generator": graph.get("generator"),
            "extractor_tier": (graph.get("extractor") or {}).get("tier"),
        },
        "budget": budget_meta,
        "counts": {
            "modules": len(modules),
            "chunks": len(chunks),
            "nodes_total": len(graph.get("nodes") or []),
            "edges_total": len(graph.get("edges") or []),
            "chunks_over_budget": len(over),
        },
        # Chunks, die selbst nach dem Split ueber Budget bleiben (z.B. eine einzelne
        # riesige Datei) — ehrlich ausgewiesen statt still durchgewinkt.
        "over_budget_chunks": over,
        "chunks": chunks,
    }


def run(args) -> int:
    graph_path = resolve_contained(Path.cwd(), Path(args.fact_graph))
    out_path = resolve_contained(Path.cwd(), Path(args.out))
    if graph_path is None or out_path is None:
        bad = args.fact_graph if graph_path is None else args.out
        print(f"FEHLER: Pfad {bad} liegt ausserhalb des Projekts (cwd) — abgelehnt", file=sys.stderr)
        return 2
    if not graph_path.is_file():
        print(f"FEHLER: {graph_path} nicht gefunden — zuerst Schritt 5 (Faktengraph)", file=sys.stderr)
        return 2

    try:
        with open(graph_path, "r", encoding="utf-8") as fh:
            graph = yaml.safe_load(fh) or {}
    except yaml.YAMLError as exc:
        print(f"FEHLER: Faktengraph nicht parsebar: {exc}", file=sys.stderr)
        return 2
    if not isinstance(graph, dict) or not (graph.get("nodes") or []):
        print("FEHLER: Faktengraph hat keine nodes — nichts zu chunken.", file=sys.stderr)
        return 1

    src_root = None
    if args.src_root:
        src_root = Path(os.path.realpath(args.src_root))
        if not src_root.is_dir():
            print(f"FEHLER: --src-root {src_root} ist kein Verzeichnis", file=sys.stderr)
            return 2

    budget, budget_meta = compute_budget(args)
    chunks = plan_chunks(graph, budget, src_root)
    plan = build_plan_doc(graph, chunks, budget_meta)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        yaml.safe_dump(plan, fh, allow_unicode=True, sort_keys=False)

    over = plan["counts"]["chunks_over_budget"]
    print(
        f"Chunk-Plan geschrieben: {out_path} — {plan['counts']['modules']} Module, "
        f"{plan['counts']['chunks']} Chunks (Budget {budget} Token"
        f", Quelle: {budget_meta['profile_source']})."
    )
    if over:
        print(
            f"HINWEIS: {over} Chunk(s) bleiben ueber Budget (unteilbar, z.B. eine sehr grosse "
            f"Datei) — im Plan unter over_budget_chunks ausgewiesen. Subagent-Return trotzdem "
            f"deckeln, ggf. Datei manuell aufteilen.",
            file=sys.stderr,
        )
    return 0


def _self_test() -> int:
    """Dependency-armer Funktions-Selbsttest (kein Datei-I/O): prueft Modul-Gruppierung,
    Budget-Rechnung, Split-Verhalten und den unteilbaren Grenzfall."""
    billing_mod = "com.acme.billing"
    persist_mod = "com.acme.persistence"
    invoice = f"{billing_mod}.Invoice"
    db = f"{persist_mod}.Db"
    graph = {
        "generator": "self-test",
        "extractor": {"tier": "file-inventory"},
        "nodes": [
            {"id": billing_mod, "kind": "package", "file": "src/billing/pkg.java", "line": 1},
            {"id": invoice, "kind": "class",
             "file": "src/billing/Invoice.java", "line": 12, "parent": billing_mod},
            {"id": f"{billing_mod}.Tax", "kind": "class",
             "file": "src/billing/Tax.java", "line": 3, "parent": billing_mod},
            {"id": db, "kind": "class",
             "file": "src/persistence/Db.java", "line": 5, "parent": persist_mod},
        ],
        "edges": [
            {"from": invoice, "to": db,
             "kind": "references", "evidence": {"file": "src/billing/Invoice.java", "line": 7}},
        ],
    }
    # 1) Modul-Gruppierung: 3 Module (billing, persistence; package-Node zaehlt zu billing).
    slices = build_module_slices(graph)
    assert billing_mod in slices, "billing-Modul fehlt"
    assert persist_mod in slices, "persistence-Modul fehlt"
    # Cross-Modul-Kante muss in BEIDEN Endpunkt-Modulen auftauchen.
    assert len(slices[billing_mod]["edges"]) == 1, "Kante fehlt im billing-Modul"
    assert len(slices[persist_mod]["edges"]) == 1, "Kante fehlt im persistence-Modul"

    # 2) Budget-Rechnung: 32000 * 0.5 * 0.8 = 12800.
    class _A:
        profile = None
        num_ctx = None
        effective_fraction = None
        safety = None
    budget, meta = compute_budget(_A())
    assert budget == 12800, f"Budget-Rechnung falsch: {budget}"
    assert meta["profile_source"] == "default-conservative"

    # 3) Split-Verhalten: mit winzigem Budget muss ein Mehr-Node-Modul splitten.
    chunks = plan_chunks(graph, budget=10, src_root=None)
    billing = [c for c in chunks if c["module"] == billing_mod]
    assert sum(c["parts_total"] for c in billing[:1]) >= 2 or len(billing) >= 2, \
        "billing haette splitten muessen"
    # 4) Unteilbarer Grenzfall: Ein-Node-Modul bleibt ein Chunk, ehrlich als over-budget markiert.
    persistence = [c for c in chunks if c["module"] == persist_mod]
    assert len(persistence) == 1 and persistence[0]["node_count"] == 1, "persistence-Split falsch"
    assert persistence[0]["within_budget"] is False, "Ein-Node-Over-Budget nicht ausgewiesen"

    # 5) Namens-Sanitisierung fuer pfad-artige C/C++-Module.
    assert sanitize_module_name("src/net/tcp") == "src.net.tcp"
    assert sanitize_module_name(ROOT_MODULE) == "root"
    print("SELF-TEST OK — Gruppierung, Budget, Split, Grenzfall, Sanitisierung gruen.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Modul-Chunk-Plan aus Faktengraph erzeugen (BOO-489)")
    ap.add_argument("--fact-graph", default="docs/_intake/brownfield/fact-graph.yml")
    ap.add_argument("--out", default="docs/_intake/brownfield/chunk-plan.yml")
    ap.add_argument("--src-root", default=None,
                    help="optional: Quell-Root fuer echte Datei-Groessen-Schaetzung (read-only)")
    ap.add_argument("--profile", default=None,
                    help="optional: Modell-Profil (BOO-485) mit num_ctx / effective_fraction")
    ap.add_argument("--num-ctx", type=int, default=None, help="CLI-Override num_ctx")
    ap.add_argument("--effective-fraction", type=float, default=None,
                    help="CLI-Override effective_fraction")
    ap.add_argument("--safety", type=float, default=None,
                    help=f"CLI-Override Sicherheitsfaktor (Default {DEFAULT_SAFETY})")
    ap.add_argument("--self-test", action="store_true", help="Funktions-Selbsttest, dann Ende")
    args = ap.parse_args()

    if args.self_test:
        return _self_test()
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
