---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Ideation — Vom rohen Einfall zur gut geschriebenen Linear-Story

> Workflow der aus einer rohen Idee ein produktionsreifes Linear-Issue macht — mit Research, Architecture Design Document (ADD), Dependency-Mapping, Sprint-Fit-Check, Intent-Check, Privacy-Pre-Flight und Token-Heuristik. Schluss mit "was haben wir eigentlich beschlossen?" drei Wochen spaeter.

**Version:** 2.16.0 · **Befehl:** `/ideation`

> **Neu in 2.15.0 (BOO-486):** Die Token-Heuristik (Schritt 5b) liest `.claude/model-profile.yml` frisch (Budget = `served_context × effective_fraction × budget_pct`, SSoT BOO-484), kappt Stories am Blatt-Budget (`× capability_factor`) und koppelt `effort_ai_hours` ans `reference_model`; ohne Profil Cloud-Default 200k + Warnung.

> 🔗 Sprint-Automation: **`/sprint-run`** faehrt einen ganzen Sprint und orchestriert die Kette `backlog → implement → sprint-review`. Siehe [`sprint-run/`](../sprint-run/README.md) · HANDBUCH Anhang AD.

> **Claude-Code-Modus:** `/ideation` denkt und schlaegt vor (Research, Story, Issue) → **`plan`** (Plan Mode): explorieren, du gibst frei, bevor Spec/Linear-Issue geschrieben werden. Kein unbeaufsichtigter Betrieb. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Die meisten Teams schreiben Issues wie Chat-Nachrichten: ein Titel, ein Absatz, vielleicht ACs wenn man Glueck hat. Drei Wochen spaeter weiss niemand mehr was "es" eigentlich hiess.

Der Skill fuehrt einen strengen Prozess in 9 Schritten: Environment laden, weiche Pre-Flights (Architektur-Doku-Aktualitaet, Learnings-Loop, Intent-Check, Privacy), Research (wenn noetig), Lesen der vollstaendigen Architektur (alle ADRs, nicht nur die ersten paar), DB-Schema-Chain-Check und Domain-Context, Erstellung eines Architecture Design Documents (ADD) bei echten Features, Enforcement-Check bei jedem neuen ADR, Story-Draft mit Sprint-Fit-Scoring und Token-Heuristik (SP + Ausfuehrungsmodus), und erst dann — nach Operator-Freigabe — Linear-Issue erstellen.

Output: Eine Story die jemand in sechs Monaten aufschlagen kann und weiss worum es ging.

---

## Die 9 Schritte

| # | Schritt | Was er erzwingt |
|---|---------|-----------------|
| 0 | **Environment laden** | `.claude/environment.json` + `CONVENTIONS.md` lesen (`governance_mode`, `execution_isolation`, Pfade, Tool-Verfuegbarkeit). Fehlt die Datei: Defaults + Warnung. |
| 0a | **Architektur-Doku-Aktualitaet (weich)** | Warnt wenn `ARCHITECTURE_DESIGN.md` aelter als Threshold (`architecture_doc_freshness_days`, Default 30). Kein Hard-Gate — Operator kann fortfahren (Override wird in der Story dokumentiert). |
| 0.5 | **Learnings-Kontext** | Nur wenn `.learning-loop` aktiv (L1/L2/L3): letzte Lessons-Learned bzw. Sprint-Retros gegen die Idee spiegeln, bei Anti-Pattern-Match warnen. |
| 0.6 | **Intent-Check** | Nur wenn `intents/` existiert: Story-Idee gegen aktiven Intent abgleichen, Label vergeben (`on-intent` / `neutral` / `off-intent`). `off-intent` → Story wird nicht erstellt (Override mit "override intent" moeglich). |
| 0e | **Privacy-Pre-Flight (BOO-69)** | Nur wenn `PRIVACY.md` aktiv: `personal_data: true/false` ins Frontmatter; bei `true` DPO-ASSESS-Hinweis + `privacy`-Label. |
| 1 | **Research (wenn noetig)** | Externe Fakten werden via `/research` verifiziert bevor sie ACs werden. Kein "Ich glaube die API kann das." |
| 2 | **Kontext laden (parallel)** | Backlog, `ARCHITECTURE_DESIGN.md` (komplett, §1–§8 + alle ADRs), `SYSTEM_ARCHITECTURE.md`, DB-Schema-Chain-Check, Domain-Context (`docs/domain/`), Similar-Issue-Check |
| 3 | **Architecture Design Document** | Features bekommen ein ADD: Komponenten, Datenfluss, Infra-Impact, 8-Dim-Eval, ADRs, Risiken |
| 4 | **Story-Draft** | Kombiniert ADD + Story-Template (Feature oder Fix/Refactor); `Change-Type` aktiv waehlen, auch fuer Non-Code-Stories |
| 5 | **Abgleich + Sprint-Fit** | Abhaengigkeiten (bidirektional), Prio im Kontext, SP-Estimate, WIP-Check, Carry-Over-Risiko |
| 5b | **Token-Heuristik + SP + Ausfuehrungsmodus (BOO-39)** | Token-Verbrauch schaetzen, daraus SP-Klasse + Modus (`linear` / `sub-agents` / `agentic`) ableiten, Execution-Isolation gegen `CONVENTIONS.md` pruefen, Frontmatter befuellen. SP=8 → Story splitten. |
| 6 | **Finalisieren (nach OK)** | Linear-Issue erstellt + betroffene Issues upgedatet; **Backlog-first-IDs** (Nummer kommt vom Backlog-Tool, dann erst die Spec-Datei mit genau dieser Nummer — BOO-154) |

> **Backlog-first gegen Cross-Session-Drift (Schritt 6, BOO-154):** Die Story-Nummer kommt **vom Backlog-Tool** — erst das Issue anlegen, **dann** die Spec-Datei `specs/<PREFIX>XXX.md` mit **genau dieser** Nummer benennen. Nummern nie manuell raten oder parallel vergeben: arbeiten mehrere Sessions/Entwickler gleichzeitig, fuehrt das sonst zu Nummern-Kollisionen + Repo↔Backlog-Versatz. Vor der Vergabe gegen das Backlog-Tool pruefen (offene + zuletzt vergebene Issues). Das ist die Ebene-1/2-Vermeidung aus dem Drei-Ebenen-Kollisionsschutz → `docs/kollisionsschutz-drei-ebenen.md`.

---

## Intent-Check (Schritt 0.6)

Wenn das Projekt `intents/`-Artefakte aus `/intent` hat, gleicht Ideation jede Idee gegen den aktiven Intent ab und vergibt ein Label, das im Story-Body unter `## Intent-Check` festgehalten wird:

| Label | Kriterium | Konsequenz |
|-------|-----------|------------|
| **on-intent** | Story zahlt direkt auf eine Intent-Metrik ein | Story wird erstellt |
| **neutral** | Story ist indirekt noetig (Infrastruktur, tech-debt, Enabler) | Story wird erstellt MIT Begruendungspflicht im Body |
| **off-intent** | Story zahlt nicht ein oder widerspricht dem Intent | Story wird NICHT erstellt — Begruendung + Anpassungs-Vorschlag; Operator kann "override intent" erzwingen |

Binaeres on/off waere zu hart — Infrastruktur (Auth-Refactor, DB-Migration) ist nie direkt on-intent, muss aber moeglich sein (→ `neutral` mit Begruendung).

---

## Token-Heuristik + Ausfuehrungsmodus (Schritt 5b, BOO-39)

Vor dem Linear-Push schaetzt der Skill den Token-Verbrauch und leitet daraus Story Points und Ausfuehrungsmodus ab. Signale: Anzahl betroffener Files, Diff-Groesse, Test-/Doku-Aufwand, Cross-Skill-Beruehrungen, Reference-Lese-Aufwand. Optional kalibriert ueber `journal/learnings.db` (L3, falls mindestens 5 aehnliche Stories vorhanden).

| Token-Estimate | Anteil 80%-Budget | SP-Klasse | Ausfuehrungsmodus |
|---|---|---|---|
| < 8k | ~5% | 1 | linear |
| 8–24k | ~10–15% | 2 | linear / sub-agents |
| 24–48k | ~20–30% | 3 | sub-agents |
| 48–96k | ~40–60% | 5 | agentic |
| > 96k | ueber 60% | 8 | **Story aufteilen** |

Der Operator bestaetigt oder korrigiert die Schaetzung (Hybrid-Frage). Die Execution-Isolation wird gegen `CONVENTIONS.md` geprueft (`linear` → `worktree_strategy: none`, `sub-agents` → `write-scope`/`git-worktree`, `agentic` → `git-worktree` + Worktree-Plan). Frontmatter mit `estimate`, `token_estimate`, `execution_mode`, `worktree_strategy`, `write_scopes` und `estimation_basis` wird in die Story-Spec geschrieben; das Linear-Issue bekommt `estimate` plus Hinweis-Block.

---

## Der Enforcement-Check (Pflicht bei jedem neuen ADR)

Jede neue Architektur-Entscheidung triggert diese Frage: **Ist sie maschinell erzwungen oder nur dokumentiert?**

| Antwort | Aktion |
|---------|--------|
| Maschinell erzwungen (Commit-Hook, Self-Healing-Check, Config-Validation) | Guard-Location in Story eintragen |
| Nur dokumentiert | Automatisch Guard-Story als separates 1-SP-Ticket vorschlagen |

Typische Guard-Mechanismen:
- Commit-Hooks in `.claude/hooks/` (wie Spec-Gate, Exchange-Guard)
- Self-Healing Architecture-Guard — um neue Pruefung erweitern
- Config-Validation in Self-Healing

Check laeuft automatisch. Du fragst nicht danach. Papier-ADRs werden zu Guard-Stories.

---

## Sprint-Fit-Scoring (Pflicht)

| Kriterium | Bewertung |
|-----------|-----------|
| Geschaetzte Story Points | 1–5 SP (>5 → Splitting-Vorschlag) |
| Sessions bis Done | 1–2 Sessions (>2 → zu gross, splitten) |
| Sprint-Passung | Passt neben aktuellen Sprint-Stories? (max 3–4 total) |
| WIP-Impact | Wuerde Aufnahme WIP > 2 erzeugen? |
| Carry-Over-Risiko | Niedrig / Mittel / Hoch |

Carry-Over "Hoch" → Splitting-Vorschlag wird mitgeliefert.

---

## Trigger-Phrasen

- `/ideation`
- "ich hab eine Idee"
- "neues Feature"
- "wir brauchen X"
- "neue Story"

---

## Schnittstellen zu anderen Skills

| Upstream | Was geliefert wird | Downstream | Was wir liefern |
|----------|--------------------|------------|------------------|
| User-Idee | Roh-Beschreibung | `backlog` | Neue priorisierte Story |
| `research` | Fakten, Vergleiche, API-Details | `implement` | Story + Spec mit klaren ACs und Scope |
| `security-architect` (DESIGN) | Threat Model fuer die Aenderung | `architecture-review` | Story bereit fuer Pre-Check |
| `cloud-system-engineer` (Teammate) | Infrastruktur-Impact | | |

---

## Artefakte / Outputs

- **Linear-Issue** — komplett befuelltes Template (Feature oder Fix/Refactor)
- **Architecture Design Document (ADD)** — als Kommentar oder `<details>`-Block bei Features
- **`specs/ISSUE-XX.md` Placeholder** — vorgezeichnet fuer implement zum Vervollstaendigen
- **Abhaengigkeits-Updates** — bidirektional in betroffenen Issues
- **Guard-Story** — wenn ein neues ADR maschinelle Erzwingung braucht
- **Story-Frontmatter** — `estimate`, `token_estimate`, `execution_mode`, `worktree_strategy`, `write_scopes`, `estimation_basis` (Schritt 5b) sowie `personal_data` (Privacy-Pre-Flight)

---

## Installation

```bash
cp -r ideation ~/.claude/skills/ideation
```

---

## Dateistruktur

```
ideation/
├── SKILL.md                                      ← Skill-Definition (DE)
├── SKILL.en.md                                   ← Skill-Definition (EN)
├── README.md                                     ← Diese Datei (DE)
├── README.en.md                                  ← Englisches README
└── references/
    ├── architecture-design-document.md           ← ADD-Template (DE)
    ├── architecture-design-document.en.md        ← Englische Spiegelung
    ├── architecture-dimensions.md                ← 8 Dimensionen Deep Dive (DE)
    ├── architecture-dimensions.en.md             ← Englische Spiegelung
    ├── story-template-feature.md                 ← Feature/Agent-Template (DE)
    ├── story-template-feature.en.md              ← Englische Spiegelung
    ├── story-template-fix.md                     ← Fix/Refactor-Template (DE)
    ├── story-template-fix.en.md                  ← Englische Spiegelung
    ├── token-heuristik.md                        ← Token-Window-Heuristik (Schritt 5b, DE)
    └── token-heuristik.en.md                     ← Englische Spiegelung
```
