---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Faktengraph-Schema (SSoT)

Single Source of Truth fuer `docs/_intake/brownfield/fact-graph.yml`. Aenderungen am Schema passieren HIER; SKILL.md zeigt nur den Kern. Das Format lebt bewusst im Template, nicht im Skill-Fliesstext — Kunden-Anpassung heisst Template anpassen, ohne Skill-Drift.

## Vollstaendiges Schema (schema_version 1)

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

## Feld-Regeln

- **`evidence` ist Pflicht an jeder Kante.** Eine Kante ohne `file` + `line` darf nicht geschrieben werden — lieber weglassen und in `counts` als Luecke sichtbar machen.
- **`limitations` ist Pflicht am Extraktor.** Leere Liste nur bei scip-java mit vollstaendigem Build; sonst muss dort stehen, was fehlt.
- **`kind: entrypoint`** ist ein Text-Signal (`public static void main`, `@SpringBootApplication`, Servlet-Deklaration), kein Laufzeit-Fakt — das bleibt so gekennzeichnet.
- IDs sind FQNs (Fully Qualified Names). Bei Namens-Kollisionen ausserhalb von Paketen (Default-Package): Datei-Pfad als Prefix.
- Der Graph ist **append-only pro Lauf**: jeder Lauf schreibt einen vollstaendigen neuen Stand; Historie liegt in git.

## Abgrenzung

Der Faktengraph enthaelt **nur EXTRACTED-Fakten** (Tool-Output). LLM-Vermutungen (INFERRED) gehoeren nie in diese Datei — sie leben in den Befund-Dokumenten und sind dort als Vermutung gekennzeichnet (ab Ehrlichkeits-Schicht, v0.2.x).
