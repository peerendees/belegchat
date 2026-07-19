---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# C4-Ausgabe: Faktengraph → Structurizr-DSL (SSoT)

Single Source of Truth fuer die C4-Erzeugung ab v0.3.0. Kernentscheidung (Research 2026-07-01, design-relevant): **C4 erzeugen wir SELBST aus dem Faktengraph.** Das jQAssistant-C4-Plugin LIEST C4-Modelle (Validierung As-Is vs. To-Be), es generiert sie nicht — es bleibt optionaler Validator. Ausgabe-Format ist [Structurizr DSL](https://structurizr.com) (text-basiert, LLM-freundlich, Apache 2.0); Rendering laeuft ueber den offiziellen Structurizr-MCP-Server, wenn verbunden — sonst bleibt die DSL-Datei das Artefakt (graceful degradation).

## Warum erzwungene Vollstaendigkeit

Der haeufigste dokumentierte Fehler des State-of-the-Art-Vergleichs (CIAO, arXiv 2604.08293) sind „Diagram Errors" — abgeschnittene oder ausgelassene Klassen, 32 Vorkommnisse in der 22-Dev-Studie. Genau dagegen richtet sich der deterministische Vollstaendigkeits-Check: **kein Diagramm-Element ohne Graph-Beleg, kein relevantes Graph-Element ohne Diagramm-Platz oder begruendete Auslassung.**

## Mapping Faktengraph → C4 (ehrlich getaggt)

| C4-Ebene | Quelle im Faktengraph | Konfidenz |
|---|---|---|
| C1 Context: das Software-System | Quell-Root als Ganzes | EXTRACTED |
| C1 Context: externe Systeme | Fremd-Import-Gruppen (z.B. `org.springframework.*`, JDBC) — Nutzung belegt, System-Charakter vermutet | INFERRED |
| C2 Container | Build-Module (Maven-`<module>`/Gradle-Subprojects) mit `datei:zeile` aus der Build-Datei; Single-Module-Projekt → ein Container | EXTRACTED |
| C3 Component | Top-Level-Pakete unter dem Root-Paket; Kanten = aggregierte Paket-Referenzen aus `edges` | EXTRACTED (scip) / EXTRACTED mit `limitations` (import-basiert bei Stufe 2/3) |

Jedes DSL-Element traegt seinen Konfidenz-Tag als Structurizr-Tag (`tags "EXTRACTED"` / `tags "INFERRED"`) — die Ehrlichkeits-Schicht ist im Diagramm sichtbar, nicht nur im Text.

## Artefakte

```
docs/_intake/brownfield/architecture/
├── workspace.dsl      # Structurizr DSL: C1 Context, C2 Container, C3 Component
├── c4-map.yml         # Sidecar: DSL-Element -> Graph-Node -> Ebene (+ omitted-Liste)
└── *.png / *.svg      # optional: Renderings via Structurizr-MCP
```

### DSL-Geruest (Template)

```
workspace "<projekt>" "Brownfield-Befund BOO-297 — generiert aus fact-graph.yml, Stand <datum>" {
  model {
    sys = softwareSystem "<projekt>" {
      tags "EXTRACTED"
      web = container "<modul>" {
        tags "EXTRACTED"
        billing = component "com.acme.billing" "Belegt: pom.xml:12" { tags "EXTRACTED" }
      }
    }
    db = softwareSystem "Relationale DB (vermutet aus JDBC-Imports)" { tags "INFERRED" }
    sys -> db "JDBC (Invoice.java:7)"
  }
  views {
    systemContext sys { include * ; autolayout lr }
    container sys     { include * ; autolayout lr }
    component web     { include * ; autolayout lr }
  }
}
```

Beschreibungs-Konvention: Belege (`datei:zeile`) stehen in den Element-/Kanten-Beschreibungen; die zugehoerigen Claims liegen wie immer in `claims.yml`.

### Sidecar `c4-map.yml` (Vertrag fuer den Vollstaendigkeits-Check)

```yaml
schema_version: 1
generated_at: <ISO>
elements:
  - dsl_id: billing            # Identifier im workspace.dsl
    graph_node: com.acme.billing
    level: component           # context | container | component
    confidence: EXTRACTED
omitted:                       # Graph-Nodes ohne Diagramm-Platz — nur MIT Begruendung zulaessig
  - graph_node: com.acme.generated
    reason: "generierter Code (JAXB), 0 eingehende Kanten — bewusst ausgelassen"
```

## Vollstaendigkeits-Check (deterministisch, Pflicht)

```bash
python3 brownfield-onboarding/scripts/c4_completeness.py \
  --fact-graph docs/_intake/brownfield/fact-graph.yml \
  --dsl docs/_intake/brownfield/architecture/workspace.dsl \
  --map docs/_intake/brownfield/architecture/c4-map.yml
```

Vier Pruefungen, Exit 1 bei Verstoss:

1. Jedes `elements[]`-Mapping zeigt auf einen existierenden Graph-Node (keine erfundenen Elemente).
2. Jede `dsl_id` kommt im `workspace.dsl` tatsaechlich vor (Sidecar und DSL laufen nicht auseinander).
3. Jeder relevante Graph-Node (Default: alle `kind: package`) ist gemappt ODER steht mit nicht-leerer Begruendung in `omitted` (keine stillen Auslassungen — der CIAO-Fehler).
4. Die Anzahl `component`-Deklarationen im DSL entspricht den `level: component`-Eintraegen im Sidecar (kein Element am Register vorbei).

**Kein Diagramm wird mit rotem Vollstaendigkeits-Check uebergeben.** Der Lauf steht im Abschluss-Block.

## Rendering (optional, graceful)

Reihenfolge: **Offline zuerst**, MCP wenn verbunden, sonst DSL-only. Kein Rendering ist kein Fehler.

- **Offline (Schritt 10b, Default, kein Docker/kein Online-Dienst):** `bash brownfield-onboarding/scripts/render_c4_local.sh` exportiert `workspace.dsl` via `structurizr-cli` nach Mermaid und baut eine in Obsidian direkt lesbare `C4-Diagramme.md` (Mermaid-Fences) — siehe §Offline-Render.
- **Structurizr-MCP verbunden:** Views rendern lassen, Ergebnis-Bilder neben die DSL legen; `/visualize` kann darauf aufsetzen.
- **Nichts davon:** Operator-Hinweis mit Einrichtungs-Verweis; `workspace.dsl` bleibt das massgebliche, versionierbare Artefakt.

### Offline-Render (BOO-475)

`scripts/render_c4_local.sh` ist der **portable, offline-sichere** Render-Weg (Mac + Windows via Git-Bash). Er ersetzt keinen Online-Dienst — er nutzt eine **lokal installierte** Toolchain:

- **JDK** (>= 17, getestet mit 21) — erkannt ueber `JAVA_HOME` → `/usr/libexec/java_home` → funktionierendes `java` auf PATH → bekannte (keg-only) Homebrew-/Linux-Pfade. **Kein** hardcodierter Pfad wie `/opt/homebrew`.
- **structurizr-cli** — erkannt ueber `STRUCTURIZR_CLI_HOME` → `~/tools/structurizr-cli/structurizr.sh` → `structurizr.sh` auf PATH.

Ablauf: Scan **nur** auf `docs/_intake/brownfield/architecture/*.dsl` (nie repo-weit) → `export -format mermaid` → `C4-Diagramme.md` mit `provenance:`-Etikett (`origin: ai-claude`, `status: draft`), damit die Note das Label-Gate im Kundenprojekt besteht.

Exit-Codes: `0` erfolgreich · `2` Render-Tools fehlen (Hinweis + Runbook, **kein Abbruch**) · `3` keine DSL im Intake-Pfad · `4` Rendering fehlgeschlagen (DSL-Syntax). **Standalone-Re-Run:** bei vorhandener DSL jederzeit erneut aufrufbar, ohne Neu-Extraktion.

Einmalige Tool-Einrichtung (einmal online, danach offline): `docs/runbooks/c4-rendering-setup.md`.

## jQAssistant (nur Validator, optional)

Wer jQAssistant im Einsatz hat, kann das erzeugte C4-Modell als To-Be/As-Is-Abgleich einlesen und regelbasiert pruefen lassen. Der Skill setzt das nicht voraus und generiert nichts damit.
