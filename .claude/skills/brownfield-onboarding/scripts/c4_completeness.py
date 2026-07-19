#!/usr/bin/env python3
"""C4-Vollstaendigkeits-Check — Diagramm gegen Faktengraph erzwingen (BOO-297, Phase 3).

Verhindert den haeufigsten dokumentierten Fehler LLM-generierter Architektur-
Diagramme (CIAO-Studie: abgeschnittene/ausgelassene Klassen): kein DSL-Element
ohne Graph-Beleg, kein relevanter Graph-Node ohne Diagramm-Platz oder
begruendete Auslassung. Vertrag: references/c4-structurizr.md (SSoT).

Aufruf:
    python3 c4_completeness.py --fact-graph fact-graph.yml \
        --dsl workspace.dsl --map c4-map.yml [--relevant-kinds package]

Exit-Codes: 0 = vollstaendig · 1 = Verstoss · 2 = Umgebungsfehler.
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("FEHLER: PyYAML fehlt. Installieren mit: python3 -m pip install pyyaml", file=sys.stderr)
    sys.exit(2)


def main() -> int:
    ap = argparse.ArgumentParser(description="C4-Diagramm-Vollstaendigkeit gegen den Faktengraph pruefen")
    ap.add_argument("--fact-graph", required=True)
    ap.add_argument("--dsl", required=True)
    ap.add_argument("--map", dest="map_file", required=True)
    ap.add_argument("--relevant-kinds", default="package",
                    help="Komma-getrennte node-kinds, die im Diagramm vorkommen muessen (Default: package)")
    args = ap.parse_args()

    paths = {n: Path(p) for n, p in
             [("fact-graph", args.fact_graph), ("dsl", args.dsl), ("map", args.map_file)]}
    for name, p in paths.items():
        if not p.is_file():
            print(f"FEHLER: {name}-Datei {p} nicht gefunden", file=sys.stderr)
            return 2

    graph = yaml.safe_load(paths["fact-graph"].read_text(encoding="utf-8")) or {}
    c4map = yaml.safe_load(paths["map"].read_text(encoding="utf-8")) or {}
    dsl_text = paths["dsl"].read_text(encoding="utf-8")

    graph_ids = {n.get("id") for n in (graph.get("nodes") or []) if n.get("id")}
    elements = c4map.get("elements") or []
    omitted = c4map.get("omitted") or []
    errors = []

    # 1) Kein erfundenes Element: jedes Mapping zeigt auf einen Graph-Node
    for el in elements:
        node = el.get("graph_node")
        if node not in graph_ids:
            errors.append(f"elements: '{el.get('dsl_id')}' zeigt auf unbekannten Graph-Node '{node}' (Fabrikations-Verdacht)")

    # 2) Sidecar und DSL laufen nicht auseinander
    for el in elements:
        dsl_id = el.get("dsl_id") or ""
        if not re.search(rf"\b{re.escape(dsl_id)}\b", dsl_text):
            errors.append(f"dsl: Identifier '{dsl_id}' aus c4-map.yml kommt im workspace.dsl nicht vor")

    # 3) Keine stille Auslassung: jeder relevante Graph-Node ist gemappt oder begruendet ausgelassen
    relevant_kinds = {k.strip() for k in args.relevant_kinds.split(",") if k.strip()}
    mapped = {el.get("graph_node") for el in elements}
    omitted_ok, omitted_bad = set(), []
    for o in omitted:
        if str(o.get("reason", "")).strip():
            omitted_ok.add(o.get("graph_node"))
        else:
            omitted_bad.append(o.get("graph_node"))
    for node in (graph.get("nodes") or []):
        if node.get("kind") in relevant_kinds:
            nid = node.get("id")
            if nid not in mapped and nid not in omitted_ok:
                errors.append(f"vollstaendigkeit: Graph-Node '{nid}' ({node.get('kind')}) fehlt im Diagramm und ist nicht begruendet ausgelassen")
    for nid in omitted_bad:
        errors.append(f"omitted: '{nid}' ohne Begruendung — stille Auslassung ist nicht zulaessig")

    # 4) Kein Element am Register vorbei: component-Deklarationen == level:component-Eintraege
    dsl_components = len(re.findall(r'=\s*component\s+"', dsl_text))
    map_components = sum(1 for el in elements if el.get("level") == "component")
    if dsl_components != map_components:
        errors.append(f"zaehlung: {dsl_components} component-Deklarationen im DSL vs. {map_components} im Sidecar")

    print(f"c4-completeness: {len(elements)} Elemente, {len(omitted_ok)} begruendet ausgelassen, {len(errors)} Verstoesse.")
    for e in errors:
        print(f"  FAIL {e}")
    if errors:
        print("Ergebnis: ROT — Diagramm unvollstaendig oder nicht belegt; erst beheben, dann uebergeben.")
        return 1
    print("Ergebnis: Diagramm vollstaendig gegen den Faktengraph.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
