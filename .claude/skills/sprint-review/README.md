---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Sprint Review — Periodisches Audit fuer Architektur, Tech Debt, Backlog + Learning-Loop

> Periodischer System-Check: aktive Architektur-Dimensionen · Reports-Aggregation + Metriken · Tech-Debt-Inventur · Backlog-Hygiene · Prozess-Compliance · Anti-Pattern-Selbstdiagnose · optionaler DPO-Audit-Trigger · Learning-Loop-Eintrag (L1/L2/L3). Ein Durchlauf, ein Report, eine Action-Liste — und ein geschlossener Learning-Loop.

**Version:** 2.11.0 · **Befehl:** `/sprint-review`

> 🔗 Sprint-Automation: **`/sprint-run`** faehrt einen ganzen Sprint und orchestriert die Kette `backlog → implement → sprint-review`. Siehe [`sprint-run/`](../sprint-run/README.md) · HANDBUCH Anhang AD.

> **Claude-Code-Modus:** `/sprint-review` schreibt Audit-Reports → beaufsichtigt **`acceptEdits`**; unbeaufsichtigt (vom `/sprint-run`-Daemon getriggert) **`dontAsk`** + Allowlist. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Die meisten Teams reviewen "wie lief der Sprint" anhand der Velocity. Das ist ein Symptom. Dieser Skill auditiert das System selbst: Ist die Architektur noch gesund? Waechst Tech Debt? Haben Issues Abhaengigkeiten? Ist die Doku synchron? Passt die Projektpraxis zur `CONVENTIONS.md`?

Zusaetzlich schliesst der Skill den **Learning-Loop**: am Ende erfasst er die Lessons-Learned (Level L1/L2/L3, je nach Projekt-Konfiguration).

Der Output ist handlungsfaehig: Top-3-Risiken, Tech-Debt-Score (Niedrig / Mittel / Hoch), empfohlene neue Issues, Backlog-Bereinigungs-Vorschlaege, Anti-Pattern-Selbstdiagnose und — wenn das Privacy-Add-on aktiv ist — ein deterministischer Datenschutz-Audit.

---

## Wie er funktioniert (Schritte 0–9b)

```
Schritt 0: Environment laden
   · .claude/environment.json + CONVENTIONS.md (governance_mode, execution_isolation, Gates)
   · Pfade aus paths.* (reports_local, lessons_l1/l2/l3, specs, ...)
   · Tool-Verfuegbarkeit aus tools_available.<tool> pruefen (graceful skip)
   · Fehlt die Datei: Default-Pfade annehmen + Hinweis im Output

Schritt 1: System-Snapshot (parallel)
   · Backlog (alle Stati, Linear/M365/GitHub)
   · ARCHITECTURE_DESIGN.md (VOLLSTAENDIG, §1/§3/§4/§6/§7/§9-Checkliste + alle ADRs)
   · SYSTEM_ARCHITECTURE.md · lib/config.js · Git-Log der Periode
   · Self-Healing-Logs (wenn aktiv) · vorherige journal/-Eintraege (wenn Learning-Loop aktiv)

Schritt 1b: Governance-Konventions-Drift
   · Praxis vs. CONVENTIONS.md (governance_mode lite/standard/heavy, execution_isolation)
   · Abweichungen als "Governance Drift" dokumentieren

Schritt 2: Architektur-Review (aktive Dimensionen)
   Standard: Reliability · Data Integrity · Security · Performance
             Observability · Maintainability · Testability
   Add-ons (wenn aktiv): Privacy · Cost Efficiency · Signal Quality · Compliance
   + Testability-Metriken (Coverage auf neuem Code, Pass-Rate, Contract-Tests)

Schritt 2b: Reports-Aggregation + Metriken (BOO-6)
   · Local Implement-Reports (meta.json: Iterations-Counts, SARIF-Pattern)
   · CI-Reports (Erfolgsraten, haeufige Failures) · SonarQube-Cloud-API (Hotspots, Trends)
   · Cost-Aggregation (BOO-84: token_tracking + model-tiers.json, Tier-Breakdown, Cache-Hit-Rate)
   · L3-DB-Trends (wenn aktiv) → Aggregat-Metriken ins Sprint-File-Frontmatter

Schritt 2c: Projekt-Index-Sensor (BOO-471) — read-only, kein Gate
   · misst Anwesenheit (graph.json + index-stamp.json) + Frische (Stempel head_sha == HEAD)
   · Beobachtung/WARN ins Journal, nie FAIL; lite/kein Index = neutraler Skip
   · Frontmatter project_index:{present,fresh,status} (Anti-Fabrikation: keine erfundene Nutzungsquote)

Schritt 3: Tech-Debt-Inventur
   · Code-Duplikation · hardcoded Werte · Deprecated Features
   · offene Code-Marker · stale Dependencies

Schritt 4: Backlog-Hygiene
   · Orphans · fehlende Abhaengigkeiten · obsolete Issues · fehlende Issues · veraltete Prios

Schritt 5: Prozess-Compliance
   · Pflicht-Template bei neuen Issues? · Abhaengigkeiten bidirektional dokumentiert?
   · Doku-Versionen synchron? · Obsidian-Change-Logs? · Component-Docs aktuell?
   · Neue *.md in ARCHITECTURE_DESIGN.md §9 registriert? (orphan-check)

Schritt 6: Report + Massnahmen
   · 3–5 Saetze Gesamtbewertung · Top-3-Risiken · Tech-Debt-Score
   · empfohlene neue Issues · Backlog-Bereinigungsvorschlaege

Schritt 7: Anti-Pattern-Selbstdiagnose (BOO-26)
   · liest anti-pattern-katalog.md, Ja/Nein/Unklar je AP — Reflexion, kein Gate (~5 Min)
   · technische APs (skill-detektierbar) + Kultur-APs (nur Reflexion)
   · Auswertung: alle Nein = Notiz · 1-2 Ja = Retro-Eintrag · 3+ Ja = ADR-Vorschlag + Issue

Schritt 7c: DPO-Audit-Trigger (BOO-69/BOO-87, nur wenn Privacy-Add-on aktiv)
   · Aktivierung: PRIVACY.md existiert UND Sprint-Counter erreicht privacy_audit_cadence (Default 4)
   · deterministischer Kontrollkatalog-Runner (dpo/scripts/dpo-audit.py) ueber dpo/controls/*.yml
   · Report-Paar dpo/reports/<date>_audit.md + .json mit Status PASS/GAP/REVIEW-NEEDED
   · Aggregation in Sprint-Report + Backlog-Folge-Stories (Label privacy) pro GAP/REVIEW-NEEDED

Schritt 8: Learning-Loop-Eintrag (PFLICHT wenn Learning-Loop aktiv)
   · Aktivierung ueber .learning-loop (L1/L2/L3) — sonst Skip
   · L1: learnings.md (3x WAS funktionierte / nicht / naechstes Experiment)
   · L2: strukturiertes Sprint-Journal + Quartals-Meta-Retro bei jedem 4. Sprint
   · L3: zusaetzlich SQLite-Insert (journal/learnings.db)

Schritt 9: Kosten-Snapshot (BOO-189) — ccusage-Ist-Verbrauch an sprint-costs.md anhaengen (Soft-Gate)

Schritt 9b: Worker-Equivalent-Report (BOO-191, nur wenn Financials aktiv)
   · liest aktiven Verrechnungssatz aus worker-equivalent-baseline.md Abschnitt 1
   · aggregiert Σ effort_ai_hours (Kontext) + Σ effort_human_equiv_hours der Sprint-Stories (Doppelspalte, BOO-193)
   · KI-Kosten aus Cost-Aggregat (Schritt 2b) bzw. ccusage; Wall-Clock aus Sprint-Log/Git
   · ROI = Σ(effort_human_equiv_hours) × Satz ÷ KI-Kosten (Σ effort_ai_hours nur Kontext)
   · Report-Datei docs/financials/sprint-XX-worker-equivalent.md; native Waehrung, keine FX-Umrechnung
   · graceful skip ohne Baseline/Doppelspalte; Block auch in Schritt 6 + Abschluss sichtbar
```

---

## Trigger-Phrasen

- `/sprint-review`
- "Sprint Review"
- "Architektur-Audit"
- "Tech Debt"
- "Aufraeumen"
- "retro"

---

## Schnittstellen zu anderen Skills

| Skill | Beziehung |
|-------|-----------|
| `ideation` | Liest bei jeder Story-Erstellung die letzten 3 Learning-Loop-Eintraege und warnt bei Anti-Pattern-Match |
| `architecture-review --system` | Kann das Sprint-Review im System-weiten Scope ausfuehren (alle aktiven Dimensionen) |
| `breakfix` | Schreibt Breakfix-Learnings parallel in den Loop als `what_didnt` mit Root-Cause |
| `implement` | Liefert die Local-Reports (meta.json, Token-Tracking) fuer die Reports-Aggregation |
| `dpo` (Standalone) | Liefert den deterministischen Kontrollkatalog-Runner fuer den DPO-Audit-Trigger (Schritt 7c) |

---

## Artefakte / Outputs

- **Zusammenfassung** — 3–5 Saetze Top-Bewertung
- **Top-3-Risiken** — was zuerst, mit Begruendung
- **Tech-Debt-Score** — Niedrig / Mittel / Hoch, plus Grund
- **Empfohlene Issues** — neue Tickets, bereit fuer `/ideation`
- **Backlog-Bereinigung** — Issues zum Schliessen, Re-Priorisieren, Mergen
- **Aggregat-Metriken** — ins Sprint-File-Frontmatter (Iterations, Coverage-Trend, SonarQube-Hotspots, Cost-Breakdown/Tier-Breakdown)
- **Projekt-Index-Sensor** (BOO-471) — `project_index:{present,fresh,status}` im Frontmatter + Beobachtungszeile im Report (kein Gate)
- **Anti-Pattern-Selbstdiagnose** — Ja/Nein/Unklar-Matrix mit Gegenmittel
- **Privacy Audit** (wenn aktiv) — `dpo/reports/<date>_audit.md` + `.json` mit PASS/GAP/REVIEW-NEEDED-Liste
- **Worker-Equivalent-Report** (wenn Financials aktiv, BOO-191) — `docs/financials/sprint-XX-worker-equivalent.md` mit KI-Kosten, Mensch-Equivalent-Kosten, ROI-Faktor und Wall-Clock (native Waehrung)
- **Learning-Loop-Eintraege** — `journal/learnings.md` (L1), Sprint-Journal (L2), SQLite-DB (L3)

---

## Konfiguration

Learning-Loop-Aktivierung: `{PROJECT_PATH}/.learning-loop`-File mit Inhalt `L1`, `L2` oder `L3`. Wird im Bootstrap Block D.4 angelegt oder spaeter manuell.

DPO-Audit-Trigger (Schritt 7c): `PRIVACY.md` im Projekt-Root + `environment.json.privacy_audit_cadence` (Default 4 Sprints). DPO-Skill als Standalone unter `~/.claude/skills/dpo/`, Kataloge unter `dpo/controls/`.

---

## Installation

```bash
cp -r sprint-review ~/.claude/skills/sprint-review
```

---

## Dateistruktur

```
sprint-review/
├── SKILL.md                            ← Skill-Definition (DE)
├── SKILL.en.md                         ← Skill-Definition (EN)
├── README.md / README.en.md            ← diese Uebersicht
└── scripts/
    ├── project_index_sensor.py         ← Projekt-Index-Sensor (BOO-471, read-only)
    └── test_project_index_sensor.py    ← stdlib-unittest-Regression
```
