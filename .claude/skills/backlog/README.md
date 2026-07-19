---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Backlog — Abhaengigkeits-bewusstes Sprint Planning

> Laedt das gesamte Backlog, mappt Abhaengigkeiten, respektiert DB-Schema-Ketten und schlaegt konkrete Reihenfolge vor. Schluss mit "welche Story als naechstes?" per Bauchgefuehl.

**Version:** 1.10.0 · **Befehl:** `/backlog`

> **Neu in 1.9.0 (BOO-486):** Sprint-Budget aus dem frisch gelesenen Modell-Profil (Schritt 2b) — Budget-Ansage mit Herkunft, Blatt-Budget-Gate (`× capability_factor`) fuer den Story-Schnitt, `effort_ai_hours` ans `reference_model` gekoppelt; ohne Profil Cloud-Default 200k + Warnung.

> 🔗 Sprint-Automation: **`/sprint-run`** faehrt einen ganzen Sprint und orchestriert die Kette `backlog → implement → sprint-review`. Siehe [`sprint-run/`](../sprint-run/README.md) · HANDBUCH Anhang AD.

> **Claude-Code-Modus:** Die Priorisierung (Schritte 0–5) liest read-only → **`plan`** (Plan Mode); im `/sprint-run`-Daemon laeuft sie read-only mit. **Ausnahme — der Sprint-Plan-Sync (Schritt 6, BOO-194)** schreibt die Sprint-Zuordnung nach Linear: manueller Trigger (`/backlog sync`) + Dry-Run-Default, Schreiben erst nach Bestaetigung (**`acceptEdits`**). Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Die meisten Backlogs sind flache Listen nach Prioritaet sortiert. Echte Backlogs haben versteckte Struktur: Abhaengigkeiten, Schema-Versionsketten, Stories die Linear noch als "Todo" zeigt obwohl sie letzte Woche released wurden.

Der Skill laedt das ganze Bild — Systemkontext aus `CLAUDE.md` + `ARCHITECTURE_DESIGN.md`, abgeschlossene Issues der letzten 30 Tage, alle offenen Issues — und baut einen Abhaengigkeitsgraph. Findet was ein Mensch uebersieht:

- Stories die blockiert aussehen, aber nicht sind (Blocker ist schon Done)
- Zwei Stories beide auf `schemaVersion 18` (Konflikt — eine muss neu)
- Zirkulaere Abhaengigkeiten
- Verwaiste Referenzen (`{PREFIX}-14` in Issue X erwaehnt aber existiert nicht)

---

## Wie er funktioniert

```
Environment laden  (.claude/environment.json — Pfade + tools_available, Fallback auf Defaults)
        │
        ▼
Systemkontext laden  (CLAUDE.md + ARCHITECTURE_DESIGN.md + SYSTEM_ARCHITECTURE.md)
        │
        ▼
Completed Issues laden (letzte 30 Tage)
        │
        ▼
Offenes Backlog laden (alle Stati)
        │
        ▼
Abhaengigkeits-Graph · Schema-Chain-Check · Cycle Detection
        │
        ▼
Sortieren:  In Progress > Blocker > Intent-Label > Prio > Dep-Tiefe > Alter
        │
        ▼
Output:  Geordnete Liste · Konflikte · Backlog-Hygiene-Vorschlaege
```

Die `.claude/environment.json` liefert Pfade (`paths.specs`, `paths.architecture_design`, `paths.reports_local`, ...) und ein `tools_available`-Gating: ist ein Tool nicht aktiv, ueberspringt der Skill den Aufruf mit Hinweis im Output. Fehlt die Datei, faellt der Skill auf Standard-Pfade zurueck und vermerkt das.

---

## Der Schema-Chain-Check (Pflicht)

Laeuft bei jedem Backlog-Durchgang. Stoppt Schema-Konflikte bevor zwei Entwickler die gleiche Migration anfangen:

1. Offene Issues auf `## DB Schema Impact` Sektion pruefen
2. Chain aufbauen: `currentSchemaVersion → targetSchemaVersion` pro Story
3. Regel: **Stories mit niedriger `targetSchemaVersion` IMMER zuerst**
4. Konflikt-Flag: Zwei Stories mit gleicher Ziel-Version → als **kritischer Blocker** gemeldet

Beispiel-Output:
```
Schema-Chain: STORY-A (v17 → v18) muss vor STORY-B (v18 → v19) kommen.
Konflikt:     STORY-C und STORY-D zielen beide auf v18 — eine muss neu.
```

---

## Intent-Label-Priorisierung

Beim Sortieren respektiert der Skill das Intent-Label aus der `## Intent-Check`-Sektion im Story-Body (gesetzt von `/ideation`):

- `on-intent` kommt **vor** `neutral` bei gleichem Status und gleicher Priority
- `off-intent`-Stories landen am Ende — mit Warnung: "Story X ist off-intent — gehoert ins Backlog, nicht in den Sprint"
- Fehlt das Label, wird die Story als `neutral` behandelt

Bei der Ausgabe wird der Grund erklaert: "Story X priorisiert vor Y weil on-intent bei gleichen Points."

---

## Trigger-Phrasen

- `/backlog`
- "was steht an?"
- "Sprint Planning"
- "Prioritaeten"
- "was nehm ich als naechstes?"

---

## Schnittstellen zu anderen Skills

| Upstream | Was geliefert wird | Downstream | Was wir liefern |
|----------|--------------------|------------|------------------|
| `ideation` | Neue Stories + Abhaengigkeiten + Schema-Impact | `implement` | Top-Story + Begruendung der Reihenfolge |
| Linear | Offene / abgeschlossene Issues | `architecture-review` | Stories die einen Pre-Check brauchen |
| `architecture-review` (System-Mode) | Empfohlene Issues | `sprint-review` | Aktueller Backlog-Snapshot fuer Quartals-Audit |

---

## Artefakte / Outputs

- **Priorisierte Story-Liste** mit explizitem Grund pro Story
- **Abhaengigkeits-Konflikte** — Orphans, Cycles, kaputte Referenzen
- **Schema-Chain-Report** — wer vor wem, und warum
- **Hygiene-Vorschlaege** — Issues zum Schliessen, neu priorisieren, splitten
- **Sprint-Forecast** (wenn Financials aktiv, BOO-192) — erwartete KI-Kosten, Mensch-Equivalent-Wert, Wall-Clock und ROI je geplanter Story + Sprint-Aggregat; persistiert unter `docs/financials/sprint-XX-forecast.md`, plus Forecast-vs-Ist-Drift gegen den Ist-Report (Signal, kein Block). Siehe HANDBUCH Anhang AK.
- **Sprint-Budget-Ansage aus dem Modell-Profil** (Schritt 2b, BOO-486) — liest `.claude/model-profile.yml` frisch, sagt Sprint-Budget (`served_context × effective_fraction × budget_pct`, SSoT BOO-484) samt Herkunft an und flaggt Stories ueber dem Blatt-Budget-Deckel (`× capability_factor`) als «zu gross — splitten»; ohne Profil Cloud-Default 200k + Warnung.
- **Sprint-Plan-Sync** (Schritt 6, BOO-194 — schreibend) — traegt die freigegebene Sprint-Zuordnung als Label `sprint-N` nach Linear zurueck und gleicht AC-Listen gegen verlinkte Specs ab. Manueller Trigger (`/backlog sync`), Dry-Run-Default, Audit-Log unter `docs/audits/backlog-sync-YYYY-MM-DD.md`. Ersetzt den manuellen Click pro Story (Linear-Cycles bewusst inaktiv).

---

## Installation

```bash
cp -r backlog ~/.claude/skills/backlog
```

---

## Dateistruktur

```
backlog/
└── SKILL.md     ← Skill-Definition (wird von Claude Code gelesen)
```

Keine Referenz-Dateien — Workflow ist self-contained in `SKILL.md`.
