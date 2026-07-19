---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: sprint-run
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Sprint-Konfigurator mit /goal-Engine: bereitet einen ganzen Sprint vor (Pre-Flight,
  Specs, Worktrees pro Story, Subagent-Definitionen, Token-Budget) und uebergibt die
  Ausfuehrung an die native Termination-Engine `/goal`. `/goal` orchestriert die Stories
  parallel als native Subagents (Worktree-isoliert) und laeuft, bis die Termination-Phrase
  erfuellt ist (alle Issues done, alle Quality-Gates gruen, Sprint-Journal geschrieben).
  `/sprint-run` schreibt keinen Produktcode und veraendert die orchestrierten Skills nicht —
  es konfiguriert den Sprint und ruft `/goal` auf. Verwenden wenn der Operator "Sprint laufen
  lassen", "fahr den Sprint", "automation-cycle" oder "/sprint-run" sagt.
version: 2.5.1
metadata:
  hermes:
    category: governance
    tags: [orchestration, sprint-automation, goal-engine, execution-isolation, token-boundary, gate-block-safety]
    requires_toolsets: [terminal, git, linear]
    related_skills: [backlog, implement, sprint-review, ideation, goal, quality-gate-audit]
---

# Sprint-Run

Bereitet einen kompletten Sprint vor und uebergibt die Ausfuehrung an die native
Termination-Engine **`/goal`**. `/sprint-run` ist ein **Konfigurator + `/goal`-Wrapper**: es
laedt Kontext, prueft die Pre-Flight-Gates, legt pro Story einen `git worktree` an, generiert
aus den `## Subagents`-Sektionen der Specs die `.claude/agents/`-Definitionen, plant das
Token-Budget — und ruft dann `/goal` mit einer **Termination-Phrase** auf. `/goal` orchestriert
die Stories als native Subagents parallel (Worktree-isoliert) und laeuft, bis die Phrase
erfuellt ist.

`/sprint-run` schreibt **keinen** eigenen Produktcode und veraendert die orchestrierten Skills
nicht. Story-Parallelisierung uebernehmen **native Subagents**, die Termination uebernimmt
**`/goal`** — nicht mehr ein eigener Container-/Hybrid-Driver.

> **Abgrenzung zu `/implement`:** `/implement` setzt **eine** Story um. `/sprint-run` konfiguriert
> **N** Stories als Sprint und laesst `/goal` sie ausfuehren. Wer eine einzelne Story umsetzen
> will, nimmt `/implement` direkt.

> **Breaking Change (2.0.0, ADR-4):** Bis 1.x war `/sprint-run` ein Hybrid-Container-Orchestrator
> mit eigenem Daemon-Loop. Ab 2.0.0 ist die Container-Logik (Dockerfile, `devcontainer.json`,
> Volume-Mount, Lazy-Build), der Hybrid-Driver und der `/implement`-als-Container-Simulation-Loop
> **entfallen** — ersetzt durch native Subagents unter `/goal`. Siehe Abschnitt
> [„Was entfaellt"](#was-entfaellt-adr-4).

## `/goal` als Termination-Engine

`/goal` ist die **native Anthropic-Termination-Engine** (dokumentiert unter [`goal/`](../goal/README.md) — bewusst kein Skill dieses Repos, siehe Build-vs-Buy in ADR-1).
Sie nimmt eine **Termination-Phrase** entgegen, orchestriert native Subagents und laeuft so lange,
bis ein Evaluator die Phrase als erfuellt sieht. `/sprint-run` liefert `/goal` zwei Dinge: die
**vorbereitete Umgebung** (Worktrees, Agent-Definitionen, Budget) und die **Phrase**, die das
Sprint-Ende maschinell definiert. Die Loop-Mechanik (Worker fixt → Gate erneut → Evaluator prueft)
gehoert `/goal`, nicht mehr `/sprint-run`.

## Workflow

### Phase A — Vorbereitung (Konfigurator)

#### Schritt 0: Environment + Sprint-Kontext laden

- `.claude/environment.json` lesen: `thresholds.token_warn_threshold`, `token_hard_threshold`
  (Default 70/80), `tools_available.{git,gh,linear}`, Pfade.
- `CONVENTIONS.md` lesen: `backlog_adapter` (Linear/GitHub/none), `governance_mode`,
  `execution_isolation`, `worktree_strategy`.
- Fallback: fehlt `environment.json`, mit Defaults weiterfahren und warnen (Soft).

#### Schritt 1: Sprint-Pre-Flight ⛔ HARD GATE

Pro Sprint genau einmal — `/goal` darf **nicht** auf einem unsauberen Sprint gestartet werden.
Pruefen und bei Verstoss STOPP mit konkretem Remediation-Hinweis:

- **Backlog priorisiert?** `/backlog` liefert eine geordnete Kandidatenliste (Status `Backlog`,
  Reihenfolge nach Prioritaet). Leer → STOPP.
- **Specs vollstaendig?** Fuer **jede** Kandidaten-Story existiert `specs/<ISSUE>.md` (Spec-Gate),
  ist Schrader-vollstaendig — maschinell pruefbar via
  `python3 .claude/scripts/schrader_check.py specs/<ISSUE>.md` (BOO-418; Exit 1 = unvollstaendig) — und
  traegt den `Execution Isolation`-Block (`execution_mode`, `worktree_strategy`, `write_scopes`)
  **sowie eine `## Subagents`-Sektion** (kanonisches Heading, BOO-420; daraus wird die Agent-Definition in Schritt 4 generiert).
  Fehlt etwas → Story aus dem Sprint nehmen oder STOPP.
- **Governance-Gates grün?** `governance_mode` aus CONVENTIONS; aktive Gates (sensitive-paths,
  personal-data) sind konfiguriert und das Pause-Verhalten (Sensitive-Path-Approval) ist verdrahtet.
- **Werkzeug bereit?** `git worktree` verfuegbar, `gh` authentifiziert (fuer Remote-CI-Gates),
  Arbeitsbaum auf `main` clean.
- **Quality Gates verdrahtet?** (BOO-183, **ERHALTEN**) `/quality-gate-audit --trigger pre-sprint`
  aufrufen — prueft, ob die deklarierten Gates (Semgrep-Wiring, Coverage, Slopsquatting,
  Layer-0-Bodyguard) tatsaechlich verdrahtet sind, nicht nur nominell konfiguriert. Engine:
  `quality-gate-audit/scripts/gate-checks.sh`, Exit `0` = alle `verdrahtet`/akzeptiert
  ueberschrieben, Exit `1` = mindestens ein Gate `blind`. **Mindestens ein Gate `blind` → STOPP**
  mit Verweis auf den Reparatur-Hinweis im Audit-Report
  (`docs/audits/YYYY-MM-DD-quality-gate-audit.md`). Override nur bewusst und **nur transient**:
  `/quality-gate-audit --override-gate <name> --reason "..."` — gilt fuer genau diesen Lauf.
  (Der frueher dokumentierte persistente Frontmatter-Override `override_blind` wurde mit BOO-418
  ersatzlos gestrichen: er existierte in keinem Schema und wurde nie ausgewertet — totes Feature.)

> Dieser Gate ist die Voraussetzung dafuer, dass `/goal` danach ohne Rueckfragen laufen darf.
> Details: [references/orchestration-checklist.md](references/orchestration-checklist.md).
> Cross-Link: der Pre-Sprint-Trigger wird im Skill [quality-gate-audit](../quality-gate-audit/SKILL.md) definiert.

#### Schritt 2: Drei Sicherheits-Voraussetzungen (Pre-/goal-Checks) ⛔

Bevor `/goal` aufgerufen wird, **muessen** drei Sicherheits-Voraussetzungen erfuellt sein. Jede ist
ein Hard-Check — fehlt eine, wird `/goal` **nicht** gestartet:

1. **Bash-Permission auto-allow fuer Gate-Commands.** Damit `/goal` und seine Subagents die
   Quality-Gates unbeaufsichtigt fahren koennen, muss `.claude/settings.local.json` eine
   **Allowlist** (`permissions.allow`) mit den Gate-Commands tragen: `semgrep`, `eslint`,
   `pytest`, `gh run`, `git`. Das Template legt `/bootstrap` an (siehe
   `bootstrap/references/file-templates.md`, Block „.claude/settings.local.json (BOO-203)").
   Fehlt die Allowlist → STOPP mit Verweis auf das Template (sonst blockiert jede Gate-Ausfuehrung
   an einem Permission-Prompt).
2. **Worktree als Sicherheits-Boundary.** Der Skill prueft `execution_isolation=git-worktree` (aus
   CONVENTIONS, erlaubte Werte: `none | write-scope | git-worktree`) **vor** dem `/goal`-Aufruf.
   Ist die Isolation **nicht** `git-worktree` → **Abbruch**.
   Native Subagents duerfen nur in Worktree-isolierten Arbeitsbaeumen parallel schreiben; ohne
   diese Boundary kollidieren ihre Aenderungen.
3. **Layer-0 Bodyguard aktiv.** Der Skill prueft per Self-Audit, dass der `pre-edit-bodyguard`-Hook
   verdrahtet ist (Eintrag in `.claude/settings.json` `hooks` + Datei vorhanden). Ist der Bodyguard
   **nicht live** → Skill **pausiert** mit „Bodyguard nicht aktiv" und fuehrt `/goal` nicht aus.

> Die drei Voraussetzungen ersetzen die frueheren Container-Boundaries (1.x): Worktree statt
> Container-Volume, Allowlist statt Container-Permissions, Bodyguard statt Container-Sandbox.

#### Schritt 3: Sprint-Token-Budget planen (BOO-38/40, **ERHALTEN**)

- Sprint = **80 % des Context-Windows** des verwendeten Modells (Token-Box statt Zeit-Box,
  HANDBUCH Anhang G). Kein Burndown, keine Velocity.
- **Modell-Profil frisch lesen (BOO-486):** `.claude/model-profile.yml` (BOO-485) an dieser
  Stelle bei **jedem** Sprint-Lauf frisch lesen — nie cachen, keine Fenstergroesse hardcoden.
  Sprint-Budget (Ebene B) = `served_context × effective_fraction × budget_pct`; Begriffe und
  Formel NUR referenzieren, nie neu definieren (SSoT:
  [`docs/standards/context-window-management.md`](../docs/standards/context-window-management.md), BOO-484).
- **Budget-Ansage (Pflicht, SSoT §12):** das konkrete Token-Budget UND seine Herkunft
  («Profil» oder «Default») im Sprint-Plan aussprechen.
- **Fallback (Profil fehlt):** konservativer Cloud-Default aus
  `bootstrap/templates/model-profile.yml` (`served_context=200000`, `effective_fraction=1.0`,
  `budget_pct=0.80` → Budget 160k) + Warnung: «Modell-Profil fehlt — Cloud-Default 200k aktiv.
  Empfehlung: Endpoint-Probe rennen (HANDBUCH Anhang BP).»
- Summe der `token_estimate` aller Kandidaten-Stories gegen das Sprint-Budget projizieren.
  Stories, die das Budget sprengen, in den naechsten Sprint verschieben (Hinweis, kein Abbruch).
- **Blatt-Budget-Kappung (Ebene A, BOO-486):** Stories, deren `token_estimate` das
  Blatt-Budget × `capability_factor` uebersteigt, werden nicht verschoben, sondern als
  **«zu gross — splitten»** zurueckgegeben (Split-Mechanik: `/ideation` Schritt 5b) — ein
  schwaches Modell (`capability_factor < 1`) erzwingt so mehr, kleinere Stories.
  Ehrliche Grenze: deklariert + an diesem Gate geprueft, kein Voll-Enforcement (Daemon, BOO-170).
- Reihenfolge/Abhaengigkeiten festlegen: `blockedBy` zuerst, dann Prioritaet — als Hinweis fuer
  `/goal` (welche Stories sequenziell statt parallel laufen muessen).
- Ergebnis: geordnete Sprint-Liste + projiziertes Budget. Details:
  [references/token-boundary.md](references/token-boundary.md).

#### Schritt 4: Worktrees + Subagent-Definitionen generieren

> **Pairwise-Disjunkt-Check (BOO-354):** Bei `parallel_story_limit > 1` prueft der Pre-Flight
> vorab die deklarierten `write_scopes` aller gleichzeitig laufenden Stories **paarweise** auf
> Datei-Ueberlappung (Glob). Fehlende `write_scopes` oder Ueberlappung → **serialisieren + Warnung**
> statt blind parallel. Details: [references/orchestration-checklist.md](references/orchestration-checklist.md).

Pro Story der geplanten Sprint-Liste:

| # | Aktion |
|---|--------|
| 4.1 | **Worktree anlegen:** `git worktree add ../wt-<ISSUE> -b feat/boo-<n>-<slug>` (eigener Branch je Story, Sicherheits-Boundary aus Schritt 2.2). |
| 4.2 | **Subagent-Definition generieren:** aus der **`## Subagents`-Sektion** der Spec eine `.claude/agents/<story>-<agent>.md` erzeugen (Rolle, Worktree-Pfad, `write_scopes`, Story-ID, Gate-Liste). Diese Datei liest `/goal` beim Spawnen des Story-Worker-Subagents. |
| 4.3 | **Linear → In Progress** (Adapter aus CONVENTIONS; bei `none` lokal protokollieren) — optional, kann `/goal` auch pro Story setzen. |

Ergebnis von Phase A: pro Story ein Worktree + eine Agent-Definition, ein Token-Budget, die
geprueften Sicherheits-Voraussetzungen. Details:
[references/worktree-flow.md](references/worktree-flow.md).

### Phase B — `/goal`-Aufruf

#### Schritt 5: `/goal` mit Termination-Phrase starten

Der Skill ruft die native Termination-Engine `/goal` mit einer **Termination-Phrase** auf, die das
Sprint-Ende maschinell definiert. Beispiel:

```
/goal "Sprint <id> closed: alle Linear-Issues status:done, alle Quality-Gates grün
(Semgrep, ESLint, Coverage>=80%, GitHub Actions), journal/sprint-<date>.md geschrieben,
keine offenen Subagent-Tasks"
```

Phrasen-Bibliothek (kuratierte, getestete Phrasen): [references/goal-termination-phrases.md](references/goal-termination-phrases.md).

#### Schritt 6: `/goal` orchestriert (gehoert `/goal`, nicht `/sprint-run`)

`/goal` uebernimmt ab hier die Ausfuehrung:

- **Native Subagents parallel pro Story** (Worktree-isoliert, Agent-Definition aus Schritt 4.2).
  `parallel_story_limit` aus CONVENTIONS begrenzt die gleichzeitigen Worker.
- **Gate-Failure-Recovery:** Schlaegt ein Quality-Gate fehl, fixt der Worker-Agent und ruft das
  Gate erneut; der Evaluator sieht „noch nicht erfuellt" → Loop bis gruen. (Diese Loop-Mechanik,
  die in 1.x der Daemon-Loop war, gehoert jetzt `/goal`.)
- **Approval-Bedarf (Sensitive-Path):** Beruehrt eine Story einen Sensitive-Path oder
  Personal-Data, **pausiert** `/goal`, der Operator antwortet (`review-ok` / `privacy-ok`, auch
  Remote). **Kein** automatischer Bypass, **kein** Timeout-Resume. Protokoll:
  [references/gate-block-handling.md](references/gate-block-handling.md).
- **Rebase-vor-Merge (BOO-354):** Direkt vor dem Merge-Gate rebased `/goal` den Story-Branch auf
  frisches `origin/main` — Divergenz wird frueh und klein an der Story sichtbar, nicht spaet als
  Merge-Kaskade. Rebase-Konflikt → [`/resolve-conflict`](../resolve-conflict/README.md) (BOO-352):
  mechanisch auto, inhaltlich an den Menschen. Details: [references/worktree-flow.md](references/worktree-flow.md).
- **Post-Story-Gate-Assertion:** Vor dem Merge einer Story liest `/goal` deren
  `journal/reports/local/<run>/meta.json` und verifiziert maschinell, dass kein Pflicht-Gate
  **still** uebersprungen wurde. Regelwerk unveraendert:
  [references/gate-assertion.md](references/gate-assertion.md).
- **Token-Boundary (BOO-38/40, ERHALTEN):** Die 80%-Token-Boundary ist Teil der Termination-Logik —
  bei Erreichen terminiert `/goal` den Sprint auch dann, wenn noch Stories offen sind (sie bleiben
  im Backlog). Details: [references/token-boundary.md](references/token-boundary.md).

### Phase C — Abschluss

#### Schritt 7: Sprint-Journal aggregieren

Nach Terminierung durch `/goal` aggregiert `/sprint-run` (bzw. `/sprint-review`) die
`journal/reports/local/*/meta.json` der Story-Laeufe zu `journal/sprint-<date>.md` (Metriken,
Learning-Loop). Optional einen `/insights`-Meta-Block voranstellen.

#### Schritt 8: Sprint-Report (Pflicht-Output)

Abschluss-Tabelle:

| Story | Status | Token | Gates | Worktree |
|---|---|---|---|---|
| BOO-XX | Done / Failed / Skipped | ~Xk | gruen/rot | aufgeraeumt |

Plus: Gesamt-Token-Verbrauch (% des Budgets), `/goal`-Approval-Pausen, verbleibende
Backlog-Stories, Verweis auf das `/sprint-review`-Ergebnis.

#### Schritt 9: Kosten-Snapshot (BOO-189, **ERHALTEN**)

Zum Sprint-Abschluss einen **Ist-Verbrauch** aus den lokalen Claude-Code-Logs erfassen — als
gemessene Groesse, nicht als Schaetzung:

- Aufruf: `bash .claude/hooks/ccusage-capture.sh "/sprint-run <sprint>"` (Capture-Template aus dem
  Setup, intern `npx --yes ccusage@latest daily`). Haengt einen Token-/Kosten-Snapshot an
  `docs/financials/sprint-costs.md` an.
- **Soft-Gate:** schlaegt der Aufruf fehl (ccusage/npx nicht installiert, kein Log), **nur warnen**
  und den Sprint-Abschluss **nicht abbrechen** — der Report aus Schritt 8 bleibt gueltig.
- **Komplementaer zur Schaetzung:** dieser Ist-Wert ergaenzt das `token_tracking` aus den
  Story-`meta.json`, ersetzt es nicht.
- **Bekannte Grenze:** ccusage attribuiert Sub-Agent-Token (Task-Tool) evtl. nicht sauber (Issues
  #313/#806/#950) — in stark sub-agent-getriebenen `/goal`-Laeufen ist der ausgewiesene Verbrauch
  evtl. unvollstaendig bzw. dem Parent zugeschlagen.

## Was entfaellt (ADR-4)

Mit 2.0.0 **entfallen** folgende Mechanismen aus 1.x — sie sind durch native Subagents unter
`/goal` ersetzt und duerfen **nicht** mehr verdrahtet werden:

| Entfaellt (1.x) | Ersatz (2.0.0) |
|---|---|
| Dockerfile + `devcontainer.json` fuer den Sprint-Run-Zweck | Worktree als Sicherheits-Boundary (Schritt 2.2) |
| Container-Lifecycle / Lazy-Container-Bootstrap | `/goal` spawnt native Subagents on demand |
| Hybrid-Driver-Approval-Mechanik | `/goal`-Pause bei Sensitive-Path (Schritt 6) |
| Container-Volume-Mount | `git worktree` pro Story |
| `/implement`-im-Daemon-Modus pro Story als Container-Simulation | native Subagents unter `/goal` |
| Skill-eigene Schleife **hinter** `--auto` (1.x-Daemon-Loop) | Flag bleibt; Termination-Loop gehoert `/goal` |

> Es gibt seit 2.0.0 **keinen** Container und **keine** skill-eigene Ausfuehrungs-Schleife mehr —
> auch nicht hinter `--auto`. Das Flag selbst bleibt als Betriebsart erhalten (siehe naechster
> Abschnitt); `/sprint-run` konfiguriert und uebergibt, die Ausfuehrungs-Schleife lebt in `/goal`.

## Betriebsart `--auto` (unbeaufsichtigter Lauf)

`--auto` ist als Flag **erhalten**: derselbe Konfigurator-Ablauf, aber fuer den unbeaufsichtigten
Betrieb (z.B. Headless-VPS: `claude -p "/sprint-run --auto" --permission-mode dontAsk`). Entfallen
ist nur die skill-eigene Schleife dahinter (1.x) — auch im `--auto`-Lauf faehrt die Ausfuehrungs-
und Termination-Schleife `/goal`. Im unbeaufsichtigten Modus werden die Modell-Routing-Empfehlungen
aus HANDBUCH Anhang N **erzwungen**: Aufloesung via [`scripts/resolve-model.py`](scripts/resolve-model.py),
Abweichungs-Report via [`scripts/model-drift-report.py`](scripts/model-drift-report.py).
Betriebs-Details und Rollenteilung (Betriebsart headless / Wrapper `/sprint-run` / Motor `/goal`):
[Runbook headless-vps](../docs/runbooks/headless-vps.md).

## E2E-Validierung

Ein echter autonomer Sprint laesst sich nicht im Rahmen der Skill-Umsetzung fahren. Das
**manuelle Operator-Validierungs-Protokoll** (1-Story-Sprint mit `/goal`, inkl.
Gate-Failure-Recovery) liegt in [references/goal-e2e-protocol.md](references/goal-e2e-protocol.md).
Zum Durchspielen: [references/goal-e2e-fixture.md](references/goal-e2e-fixture.md) setzt das
wegwerfbare Test-Projekt (triviale Story + provozierte Gate-Failures) auf, und
[references/goal-e2e-journal-template.md](references/goal-e2e-journal-template.md) ist das
ausfuellbare Journal fuer den Durchlauf (inkl. DoD-Abgleich BOO-203).

## Integration mit anderen Skills

| Upstream | Was geliefert wird | Downstream | Was wir liefern |
|----------|--------------------|------------|------------------|
| `ideation` | Stories + Specs (inkl. `## Subagents`-Sektion) | `goal` | Termination-Phrase, Worktrees, Agent-Definitionen, Budget |
| `backlog` | Priorisierte Sprint-Liste | `sprint-review` (Sprint-Ende) | Aggregierte Story-Metriken (meta.json) |

Kette: `intent → ideation → backlog → sprint-run → /goal ( native Subagents )* → sprint-review`.

## Trigger-Phrasen

- `/sprint-run`
- `/sprint-run --auto` (unbeaufsichtigter Lauf, siehe [Betriebsart `--auto`](#betriebsart---auto-unbeaufsichtigter-lauf))
- "Sprint laufen lassen"
- "fahr den Sprint"
- "automation-cycle"

## Konfiguration

Felder (in `.claude/environment.json` bzw. `CONVENTIONS.md`, plus pro Story im Spec-`Execution Isolation`-Block):

| Feld | Bedeutung | Default |
|---|---|---|
| `token_hard_threshold` | Sprint-Boundary in % des Context-Windows (Teil der `/goal`-Termination) | `80` |
| `execution_isolation` | Muss `git-worktree` sein (Sicherheits-Voraussetzung Schritt 2.2; CONVENTIONS-Wertemenge `none | write-scope | git-worktree`) | `git-worktree` |
| `worktree_strategy` | Isolation pro Story | `git-worktree` |
| `parallel_story_limit` | Max. parallele Story-Subagents unter `/goal` (1 = sequentiell) | `1` |

## Dateistruktur

```
sprint-run/
├── SKILL.md                                  ← Skill-Definition
├── SKILL.en.md                               ← English Mirror
├── README.md                                 ← Deutsch README
├── README.en.md                              ← English README
├── overview.excalidraw / .png                ← Skill-Overview-Sketch (+ .en)
├── scripts/
│   ├── resolve-model.py                      ← Modell-Routing im --auto-Lauf (Anhang N; test_resolve_model.py)
│   └── model-drift-report.py                 ← Drift-Report Modell-Policy vs. Ist (test_model_drift_report.py)
└── references/
    ├── orchestration-checklist.md            ← Sprint-Pre-Flight + Pre-/goal-Checks (+ .en.md)
    ├── goal-termination-phrases.md           ← Termination-Phrasen-Bibliothek (+ .en.md)
    ├── goal-e2e-protocol.md                  ← Manuelles 1-Story-E2E-Protokoll (+ .en.md)
    ├── goal-e2e-journal-template.md          ← Ausfuellbares E2E-Journal (DoD-Abgleich BOO-203) (+ .en.md)
    ├── goal-e2e-fixture.md                   ← Wegwerf-Test-Projekt-Runsheet (Story + Gate-Failures) (+ .en.md)
    ├── gate-block-handling.md                ← /goal-Pause/Resume bei Sensitive-Path (+ .en.md)
    ├── gate-assertion.md                     ← Post-Story-Gate-Assertion (meta.json) (+ .en.md)
    ├── worktree-flow.md                      ← Worktree pro Story: add → merge → remove (+ .en.md)
    └── token-boundary.md                     ← 80%-Boundary als Teil der /goal-Termination (+ .en.md)
```
