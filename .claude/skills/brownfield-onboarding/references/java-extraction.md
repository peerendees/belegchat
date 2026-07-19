---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Java-Extraktion: scip-java + Fallbacks

Referenz fuer Schritt 4 des Skills. Drei Stufen, absteigende Genauigkeit — die verwendete Stufe steht immer im Output (`extractor.tier`), inklusive `limitations`.

## Stufe 1 — scip-java (primaer)

[SCIP](https://sourcegraph.com/blog/announcing-scip) (Sourcegraph Code Intelligence Protocol) ist der reifste sprachagnostische Faktengraph-Standard; [scip-java](https://sourcegraph.github.io/scip-java/) ist der JVM-Indexer (Java, Scala, Kotlin — Kotlin laut Projekt „less mature"). Recherche-Stand 2026-07-01, dreifach bestaetigt.

**Verfuegbarkeit pruefen / beschaffen:**

```bash
command -v scip-java \
  || command -v cs && cs launch com.sourcegraph:scip-java_2.13:latest -- --help
```

Wenn weder scip-java noch Coursier (`cs`) vorhanden: Operator fragen, ob installiert werden darf (`cs` via Homebrew/apt), sonst Stufe 2.

**Index bauen:**

```bash
cd "$SRC_ROOT"
scip-java index --output "$TMP/index.scip"
```

scip-java braucht einen **funktionierenden Build** (Maven/Gradle wird automatisch erkannt). Schlaegt der Build fehl (fehlende private Dependencies, alte JDK-Version — bei Legacy haeufig): Fehlermeldung festhalten, Stufe 2 nutzen und den Grund in `extractor.limitations` dokumentieren.

**Was der Index liefert:** Symbole mit Definition (Datei/Zeile), Referenzen (wer nutzt was, aufgeloest — nicht nur Imports), daraus ableitbar: Paket-Abhaengigkeiten, Klassen-Hierarchie, oeffentliche API-Flaechen.

**Auslesen:** `scip print --json "$TMP/index.scip"` (scip CLI) oder direkte Protobuf-Verarbeitung; daraus `nodes`/`edges` gemaess [fact-graph-schema.md](fact-graph-schema.md) destillieren. Nur Fakten uebernehmen, die im Index stehen — keine Anreicherung an dieser Stelle.

## Stufe 2 — mcp-server-tree-sitter (Fallback)

Wenn scip-java nicht lauffaehig ist (Build kaputt, Toolchain fehlt, Operator lehnt Installation ab): tree-sitter-basierte Extraktion via MCP-Server (31 Sprachen bestaetigt; Recherche 2026-07-01).

- Werkzeug via ToolSearch laden (MCP-Server muss in der Session verbunden sein; sonst Operator-Hinweis mit Einrichtungs-Verweis und weiter zu Stufe 3).
- Pro `*.java`-Datei: Klassen-/Interface-/Methoden-Deklarationen + `import`-Zeilen mit Zeilennummer extrahieren.
- **Grenzen (in `limitations` eintragen):** Kanten sind import-basiert, keine aufgeloesten Referenzen; keine Cross-File-Symbolaufloesung; **Skalengrenze**: bei sehr grossen Codebasen (Groessenordnung >1M LOC, laut Projekt-Roadmap HOLD) Datei-weise chunken statt Repo-weit arbeiten — und die Chunk-Grenzen im Manifest festhalten.

## Stufe 3 — Datei-Inventar (Minimal-Fallback)

Deterministisch, ohne Zusatz-Tooling, bewusst grob:

```bash
find "$SRC_ROOT" -type f -name "*.java" | wc -l                          # counts.java_files_total
grep -rn --include="*.java" -E "^package " "$SRC_ROOT" | sort -u         # Pakete (mit file:line)
grep -rn --include="*.java" -E "^public (class|interface|enum) " "$SRC_ROOT"   # Typen (mit file:line)
grep -rn --include="*.java" -E "^import " "$SRC_ROOT"                    # Import-Kanten (mit file:line)
grep -rln --include="*.java" "public static void main" "$SRC_ROOT"       # Einstiegspunkt-Signale
```

`limitations` enthaelt dann mindestens: „keine Methoden-Ebene", „Kanten nur import-basiert", „keine Symbolaufloesung". Der Rohbefund weist prominent aus, dass nur das Inventar lief.

## Bewusst NICHT verwendet

- **PhpDependencyAnalysis** u.ae. sprachfremde Extraktoren — v1 ist Java-only (C/C++ separat als BOO-301).
- **RefExpo/DepMiner-Benchmark-Zahlen** als Beleg — die Ueberlegenheits-Zahlen haben die Verifikation nicht ueberstanden (Recherche 2026-07-01, 0-3 gekillt). Die Werkzeuge selbst existieren; wer sie einbinden will, macht das als eigene Story mit eigener Pruefung.
- **jQAssistant als C4-Generator** — das C4-Plugin LIEST C4-Modelle (Validierung As-Is vs. To-Be), es generiert sie nicht. C4 erzeugt dieser Skill ab v0.3.x selbst aus dem Faktengraph.
