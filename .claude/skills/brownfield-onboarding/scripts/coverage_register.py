#!/usr/bin/env python3
"""Coverage-Register — Closed-World-Zaehlung (BOO-297, Phase 2).

Zaehlt deterministisch, wie viel der Quelle der Faktengraph tatsaechlich
gesehen hat, und schreibt das Register nach docs/_intake/brownfield/coverage.yml.
Die Luecke wird ausgewiesen, nie glattgebuegelt: "340 von 1'900 Dateien gesehen"
ist ein gueltiges, ehrliches Ergebnis.

Aufruf:
    python3 coverage_register.py --fact-graph docs/_intake/brownfield/fact-graph.yml \
        --src-root /pfad/zur/quelle --out docs/_intake/brownfield/coverage.yml

Exit-Codes: 0 = Register geschrieben (Luecken sind KEIN Fehler) ·
1 = Inkonsistenz (Graph behauptet mehr als die Quelle hergibt) · 2 = Umgebungsfehler.
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("FEHLER: PyYAML fehlt. Installieren mit: python3 -m pip install pyyaml", file=sys.stderr)
    sys.exit(2)


def resolve_contained(base: Path, candidate: Path) -> "Path | None":
    """Kanonisiert candidate und gibt den aufgeloesten Pfad zurueck, wenn er innerhalb
    von base liegt — sonst None (Schutz gegen Path-Traversal). Alle Datei-Operationen
    laufen ausschliesslich auf dem hier zurueckgegebenen, validierten Pfad."""
    base_real = Path(os.path.realpath(base))
    cand_real = Path(os.path.realpath(candidate))
    if cand_real != base_real and not cand_real.is_relative_to(base_real):
        return None
    return cand_real


def main() -> int:
    ap = argparse.ArgumentParser(description="Coverage-Register aus Faktengraph + Quelle erzeugen")
    ap.add_argument("--fact-graph", required=True)
    ap.add_argument("--src-root", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    src_root = Path(os.path.realpath(args.src_root))
    # Schutz gegen Path-Traversal via CLI: Faktengraph und Register muessen im aktuellen
    # Projekt liegen (Aufruf aus dem Projekt-Root — Anti-Fabrikations-Regel 4).
    # Weiterverwendet werden NUR die kanonisierten, validierten Pfade.
    graph_path = resolve_contained(Path.cwd(), Path(args.fact_graph))
    out_path = resolve_contained(Path.cwd(), Path(args.out))
    if graph_path is None or out_path is None:
        bad = args.fact_graph if graph_path is None else args.out
        print(f"FEHLER: Pfad {bad} liegt ausserhalb des Projekts (cwd) — abgelehnt", file=sys.stderr)
        return 2
    if not graph_path.is_file():
        print(f"FEHLER: {graph_path} nicht gefunden", file=sys.stderr)
        return 2
    if not src_root.is_dir():
        print(f"FEHLER: SRC_ROOT {src_root} ist kein Verzeichnis", file=sys.stderr)
        return 2

    graph = yaml.safe_load(graph_path.read_text(encoding="utf-8")) or {}
    nodes = graph.get("nodes") or []

    # Ground truth direkt aus der Quelle zaehlen (nicht aus dem Graphen uebernehmen)
    all_files = [p for p in src_root.rglob("*") if p.is_file() and ".git" not in p.parts]
    java_files = {str(p.relative_to(src_root)) for p in all_files if p.suffix == ".java"}
    other_files = len(all_files) - len(java_files)

    seen_files = {n.get("file") for n in nodes if n.get("file")}
    seen_java = seen_files & java_files
    ghost_files = sorted(seen_files - java_files - {None})  # im Graph, aber nicht in der Quelle

    total, seen = len(java_files), len(seen_java)
    unseen = sorted(java_files - seen_java)
    register = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generator": "brownfield-onboarding/scripts/coverage_register.py",
        "closed_world": {
            "java_files_total": total,
            "java_files_seen": seen,
            "coverage_pct": round(100.0 * seen / total, 1) if total else 0.0,
            "files_out_of_scope_non_java": other_files,
        },
        # Die Luecke wird benannt, nicht versteckt (bei vielen Dateien: erste 200 + Zaehler)
        "unseen_files": unseen[:200],
        "unseen_files_truncated": max(0, len(unseen) - 200),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(yaml.safe_dump(register, sort_keys=False, allow_unicode=True), encoding="utf-8")

    print(f"coverage: {seen} von {total} Java-Dateien im Graph gesehen "
          f"({register['closed_world']['coverage_pct']}%), {other_files} Nicht-Java out-of-scope.")
    print(f"Register geschrieben: {out_path}")

    if ghost_files:
        print(f"FEHLER: {len(ghost_files)} Graph-Eintraege ohne Quelldatei (Fabrikations-Verdacht):", file=sys.stderr)
        for g in ghost_files[:20]:
            print(f"  GHOST {g}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
