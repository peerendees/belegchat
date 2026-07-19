---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Fact graph schema (SSoT)

Single source of truth for `docs/_intake/brownfield/fact-graph.yml`. Schema changes happen HERE; SKILL.md only shows the core. The format deliberately lives in the template, not in the skill prose — customising for a customer means adjusting the template, without skill drift.

## Full schema (schema_version 1)

```yaml
schema_version: 1
generated_at: 2026-07-02T09:00:00Z          # ISO-8601 UTC
generator: brownfield-onboarding/SKILL.md v0.1.0

source:
  adapter: git-url | local | archive
  identifier: <URL oder absoluter Pfad>
  commit: <sha>                              # nur bei git-url; sonst "n.a."
  scanned_at: <ISO-8601>

extractor:
  tier: scip-java | tree-sitter | file-inventory
  version: <Tool-Version, wenn ermittelbar>
  limitations:                               # was DIESE Stufe nicht liefern kann — Pflichtfeld
    - "edges sind import-basiert, keine Call-Aufloesung"   # Beispiel tree-sitter
    - "keine Methoden-Ebene"                                # Beispiel file-inventory

nodes:
  - id: com.acme.billing                     # eindeutig; Paket-/Klassen-FQN
    kind: package | class | interface | enum | entrypoint
    file: src/main/java/com/acme/billing/Invoice.java   # relativ zu SRC_ROOT
    line: 12                                 # 1-basiert; bei package: Zeile der package-Deklaration einer Vertreter-Datei
    name: Invoice
    parent: com.acme.billing                 # contains-Hierarchie; leer bei Top-Level

edges:
  - from: com.acme.billing.Invoice
    to: com.acme.persistence.Db
    kind: references | imports | contains
    evidence:
      file: src/main/java/com/acme/billing/Invoice.java
      line: 7                                # die Zeile, die die Kante belegt (import/Referenz)

counts:
  java_files_total: 1900                     # alle *.java unter SRC_ROOT
  java_files_indexed: 340                    # tatsaechlich vom Extraktor erfasst
  files_out_of_scope: 210                    # Nicht-Java (Mischprojekt), mit Endungs-Aufschluesselung im Manifest
  nodes: 512
  edges: 1804
```

## Field rules

- **`evidence` is mandatory on every edge.** An edge without `file` + `line` must not be written — better to leave it out and make it visible as a gap in `counts`.
- **`limitations` is mandatory on the extractor.** An empty list only with scip-java and a complete build; otherwise it must state what is missing.
- **`kind: entrypoint`** is a text signal (`public static void main`, `@SpringBootApplication`, servlet declaration), not a runtime fact — and stays labelled as such.
- IDs are FQNs (Fully Qualified Names). For name collisions outside packages (default package): file path as prefix.
- The graph is **append-only per run**: each run writes a complete new state; history lives in git.

## Scope boundary

The fact graph contains **EXTRACTED facts only** (tool output). LLM assumptions (INFERRED) never belong in this file — they live in the finding documents and are labelled there as assumptions (from the honesty layer, v0.2.x).
