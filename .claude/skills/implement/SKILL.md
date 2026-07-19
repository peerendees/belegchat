---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: implement
recommended_model: opus  # BOO-170 — Produktcode auf bestem Modell; Iterations-Loops haiku, Security-Findings opus (model-tiers.json)
description: |
  Implementierungs-Protokoll fuer User Stories aus dem Backlog-Adapter. 8-Schritte-Workflow von Issue-Identifikation
  bis Ergebnis-Tabelle inkl. Post-Implement Validation. Verwenden wenn der Operator "los" sagt,
  eine Story umsetzen will, oder "/implement" ausfuehrt. Wird auch vom Automation Daemon genutzt
  (ohne Human-in-the-Loop).
version: 2.27.0
metadata:
  hermes:
    category: coding
    tags: [code-generation, deklarativer-modus, quality-gates, token-pre-flight, codex-adapter]
    requires_toolsets: [terminal, git, eslint, semgrep]
    related_skills: [ideation, sprint-review]
---

# Implement

User Story aus dem Linear-Backlog systematisch umsetzen. 8 Schritte + Governance-Validation, keiner darf uebersprungen werden.

## Workflow (10 Schritte)

### Schritt 0: Environment laden

1. Lese `.claude/environment.json` (falls vorhanden — sonst Defaults verwenden + Warnung loggen).
2. Lese `CONVENTIONS.md` (falls vorhanden) als projektlokalen Vertrag fuer `governance_mode` und `execution_isolation`. Fallback: `governance_mode=standard`, `execution_isolation=write-scope`.
3. Bei Bedarf Pfade extrahieren aus `paths.*` (z.B. `paths.reports_local`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`, `paths.conventions`).
4. Bei Tool-Aufruf pruefen: ist Tool in `tools_available.<tool>` aktiv (z.B. `tools_available.eslint`, `tools_available.semgrep`, `tools_available.tests`)? Bei `false` oder fehlendem Eintrag: Skill ueberspringt den Aufruf und gibt einen Hinweis im Output.
5. Lese `SECURITY.md` falls vorhanden. Bei fehlender Datei Warnung ausgeben und fuer jede Security-relevante Aenderung ein TODO in der Ergebnis-Tabelle notieren.
6. Lese `DEVELOPER_ONBOARDING.md` falls vorhanden. Bei fehlender Datei Warnung ausgeben: "Hinweis: Developer Onboarding fehlt — Projekt ist schwerer an fremde Teams oder andere Tools uebergabefaehig."
7. **`llm_proxy_url` lesen (BOO-71, optional):** Wenn `.claude/environment.json` das Feld `llm_proxy_url` mit einem Wert ungleich `null` enthaelt, den Wert in `meta.json.llm_routing.proxy_url` und `meta.json.llm_routing.proxy_active = true` festhalten. **Read-only**: das Framework setzt KEIN tatsaechliches Proxy-Routing um — der Wert ist eine Audit-Spur fuer Operator-betriebene Souveraenitaets-/Anonymisierungs-Proxys. Implementation des Routings ist Operator-Aufgabe (Wrapper-Skript, Hook, eigener Proxy-Server). Bei `null` oder fehlendem Feld: `meta.json.llm_routing.proxy_active = false`. Details: HANDBUCH Anhang Q.
8. Fallback bei fehlender Datei: Standard-Pfade aus dem Schema annehmen (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`, `CONVENTIONS.md`, `SECURITY.md`, `DEVELOPER_ONBOARDING.md`) und im Output vermerken: "Hinweis: `.claude/environment.json` fehlt — Defaults aktiv. Empfehlung: `/bootstrap` re-rennen oder die Datei manuell anlegen."

### Schritt 0b: Token-Window-Pre-Flight (BOO-40, weich)

Vor jeder Story pruefen, ob die geschaetzte Story-Last die Sprint-Box-Grenze knackt. **Soft-Trigger** — der Operator kann immer weitermachen, der Skill warnt nur. Konvention: HANDBUCH Anhang G (BOO-38). Kontextfenster-Basis (bedientes Fenster × nutzbarer Anteil, nicht Modell-Maximum) und Begriffe: [`docs/standards/context-window-management.md`](../docs/standards/context-window-management.md) (BOO-484).

**Modell-Profil frisch lesen (BOO-486):** Die Bezugsbasis aller Prozentwerte in diesem Schritt ist das Budget aus `.claude/model-profile.yml` (BOO-485): `served_context × effective_fraction × budget_pct` — an diesem Entscheidungspunkt bei **jeder** Story frisch lesen, nie cachen, keine Fenstergroesse hardcoden; Formel + Begriffe NUR referenzieren (SSoT BOO-484). Im Output das Budget UND seine Herkunft nennen («Profil» oder «Default», SSoT §12). **Fallback (Profil fehlt):** konservativer Cloud-Default aus `bootstrap/templates/model-profile.yml` (`served_context=200000`, `effective_fraction=1.0`, `budget_pct=0.80`, `capability_factor=1.0`) + Warnung: «Modell-Profil fehlt — Cloud-Default 200k aktiv. Empfehlung: Endpoint-Probe rennen (HANDBUCH Anhang BP).» Ehrliche Grenze: die Preflight-Schaetzung bleibt eine **Warnung mit Marge**, kein Praezisions-Gate — Voll-Enforcement bleibt beim Daemon (BOO-170).

**Logik:**

1. **Aktuelles Context-Window messen:**
   - Via `/context`-Befehl (natives Claude-Code-Kommando); sonst Schaetzung aus Chat-Laenge
     (sehr ungenau — Hinweis im Output). Ein eigenes Mess-Kommando liefert das Framework NICHT (BOO-419).
   - Prozentwerte immer gegen das Profil-Budget (oben) rechnen, nicht gegen das Datenblatt-Maximum.

2. **Story-Token-Schaetzung aus Spec-Frontmatter `token_estimate` lesen** (gesetzt von `/ideation` Schritt 5b — BOO-39).
   - Fallback: aus `estimate` (SP) ableiten gemaess HANDBUCH Anhang G:
     - 1 SP → 5%, 2 → 12%, 3 → 25%, 5 → 50%, 8 → "Story zu gross, splitten"

3. **Projektion berechnen:**
   ```
   projektion_prozent = aktuell_prozent + story_geschaetzt_prozent
   ```

4. **Schwellen aus `.claude/environment.json` lesen** (BOO-38 hat sie als Pflicht-Feld etabliert):
   - `thresholds.token_warn_threshold` (Default 70)
   - `thresholds.token_hard_threshold` (Default 80)

5. **Wenn `projektion > token_hard_threshold`:**

   ```
   [!warning] Token-Pre-Flight:
   - Aktuell: 65% (130k / 200k — Beispiel mit Cloud-Default-Profil)
   - Story-Schaetzung: 25% (50k)
   - Projektion: 90% — ueber Sprint-Box-Grenze (80%)

   Empfehlung: Sprint hier abschliessen.
   Naechste Schritte:
   1. /sprint-review starten (aktuellen Sprint-Stand persistieren)
   2. Diesen Chat schliessen
   3. Neuen Chat oeffnen, Story dort starten

   Trotzdem fortfahren? [ja/nein]
   ```

6. **Bei `nein`:** Skill stoppt, gibt /sprint-review-Hinweis und Sprint-Wechsel-Anleitung aus:

   ```
   1. /sprint-review starten (Sprint-File schreiben, L3 aktualisieren)
   2. Letzte Lesson committen
   3. Diesen Chat schliessen
   4. Neuen Chat oeffnen mit:
      "Setze Sprint X fort, naechste Story: BOO-YY"
      /implement BOO-YY
   ```

7. **Bei `ja`:** Risiko-Vermerk in `journal/reports/local/{date}_{story}/meta.json` schreiben (Feld wird in Schritt 6f-bis ergaenzt):

   ```json
   "pre_flight_warning": "projection 90%, user proceeded"
   ```

   ... weiter zu Schritt 1.

8. **Bei `projektion > token_warn_threshold` aber `<= token_hard_threshold`:** weicher Hinweis ohne Block:

   ```
   [!info] Token-Pre-Flight:
   - Projektion: 78% (knapp unter Sprint-Box-Grenze 80%)
   - Hinweis: noch eine kleine Story passt rein, danach Sprint-Ende empfohlen
   ```

   Weiter zu Schritt 1.

**Harter Deckel (Ebene A, BOO-486):** Unabhaengig vom Soft-Trigger gilt: liegt der Story-Footprint (`token_estimate`) ueber `Blatt-Budget × capability_factor` (Blatt-Budget = Profil-Budget des einzelnen Agent-Fensters, Ebene A), ist die Story **zu gross — splitten** (`/ideation` Schritt 5b), nicht «trotzdem fortfahren». `capability_factor` wirkt doppelt: kleinere Stories UND mehr Verifikations-Loops einplanen (er skaliert Iterationszahlen, SSoT-Glossar).

**Begruendung Soft-Trigger:** manche Stories sind kleiner als geschaetzt; manche Sprint-Wechsel sind teurer als ein Compact. Operator behaelt Kontrolle. Wenn `pre_flight_warning` in `meta.json` ist und die Session tatsaechlich gecompacted hat → Lesson fuer L3 ("Schaetzung war zu konservativ" oder "User-Entscheid war richtig") → Kalibrierung fuer `/ideation` Token-Heuristik (BOO-39).

### Schritt 0c: Execution-Isolation-Pre-Flight (BOO-52, hart bei Parallelitaet)

Vor jeder Story pruefen, ob der Ausfuehrungsmodus zur projektlokalen `CONVENTIONS.md` passt.

> **Cross-Session-Hinweis (BOO-154):** Dieser Pre-Flight isoliert parallele **Agenten EINER Story** (Ebene 3). Arbeiten **mehrere Menschen/Sessions** parallel am selben Projekt, gilt zusaetzlich: **eigener Klon pro Person** bzw. **`git worktree` pro Session** — nie zwei Sessions im selben Working Tree (sonst Branch-/Datei-Kollisionen, weggewechselte Branches). Die drei Ebenen des Kollisionsschutzes: `docs/kollisionsschutz-drei-ebenen.md`.

**Ablauf:**

1. `CONVENTIONS.md` lesen und `execution_isolation` ermitteln:
   - `none`
   - `write-scope`
   - `git-worktree`
2. Spec-Frontmatter lesen:
   - `execution_mode`
   - `worktree_strategy`
   - `write_scopes`
   - `codex_execution_hint` (optional, nur beratend)
3. Regeln anwenden:

| `execution_mode` | Pflicht |
|---|---|
| `linear` | keine Worktree-Pflicht |
| `sub-agents` | `execution_isolation` muss `write-scope` oder `git-worktree` sein; `write_scopes` muessen konkret befuellt sein |
| `agentic` | `execution_isolation` und `worktree_strategy` muessen `git-worktree` sein |

**Codex-Adapter-Regel:** Codex darf auch bei `linear` intern planen, Tasks bilden und Sandbox-Schritte ausfuehren. Das ist kein Regelbruch, solange nur eine sequenzielle Schreibspur entsteht. `codex_execution_hint` darf die Ausfuehrung empfehlen (`single-agent`, `parallel-workers`, `worktree-required`), aber niemals `execution_mode`, `execution_isolation`, `write_scopes` oder Gates ueberschreiben.

4. Bei Regelbruch STOPP:

```
[STOP — EXECUTION ISOLATION]
Story BOO-XX ist als sub-agents/agentic markiert, aber die Isolation ist unvollstaendig.

Gefunden:
  execution_mode: sub-agents
  worktree_strategy: none
  write_scopes: leer

Naechste Schritte:
  a) Spec auf linear herunterstufen
  b) CONVENTIONS.md auf write-scope/git-worktree anheben
  c) write_scopes und Integrationsregel in specs/BOO-XX.md ergaenzen
```

5. Bei `git-worktree`: nicht automatisch Worktrees anlegen, solange kein Adapter/Skript vorhanden ist. Stattdessen den Operator-/Adapter-Plan ausgeben:

```
Empfohlener Worktree-Plan:
  git worktree add ../{repo}-{story}-{role} -b {story}-{role}
```

6. Subagents duerfen nur mit disjunktem Write-Scope gestartet werden. Mini-Briefings muessen enthalten: Rolle, Aufgabe, erlaubte Pfade, verbotene Pfade, Integrationsregel, Index-Regel (Query-first, falls ein Projekt-Index mit gueltigem Commit-Stempel existiert — BOO-445).

### Schritt 0d: Native-Pfade-Flags lesen (BOO-204, Schalter B)

Lies aus der Projekt-`CLAUDE.md` den `native_paths:`-Block (definiert in BOO-199). Relevant fuer
`/implement`: `prefer_native_subagents` (Default **`true`**, wenn Flag oder Block fehlt).
**Schalter-A-Kopplung:** gilt nur bei `runtime_target: claude-code` (aus `CONVENTIONS.md`, Schritt 0);
bei `codex` / `cross-tool` / `unknown` ist der Flag inaktiv → immer altes Pattern. Der gelesene Wert
steuert Schritt 4b.

### Schritt 0e: Doku-Drift-Pre-Flight (BOO-229, weich)

Vor der Umsetzung den gemeinsamen Drift-Checker aufrufen (falls vorhanden):
```bash
bash scripts/doc-drift-check.sh
```
Er liest `ARCHITECTURE_DESIGN.md §Referenzen` + `INDEX.md` als **Single Source of Truth** und meldet
Vollstaendigkeits-, Frische- und lokal-vs-remote-Drift. Der Befund fliesst als Hinweis in den Lauf —
**warn-only in dieser Stufe** (kein Abbruch). Dieselbe SSoT-Liste steuert den Post-Implement-Doku-Check
in Schritt 6e (keine skill-eigene, hartkodierte Datei-Liste mehr). Fehlt das Skript (Projekt vor BOO-229):
`intentron migrate --issue BOO-229` nachziehen; der Lauf geht weiter. Bei `compliance_doc_gate: true`
(`CONVENTIONS.md`, gespiegelt in `.claude/environment.json`) wird ein **FAIL** des Checkers zum Hard-Block:
`/implement` startet nicht, bis der Drift aufgeloest ist; im Autopilot (`sprint-run` → `/goal`) **pausiert**
die Story (siehe `sprint-run/references/gate-block-handling.md`) — der Worker traegt sicher Aufloesbares
selbst nach, pausiert nur bei Echt-Entscheidung (lokal ≠ remote). **WARN** bleibt eine Warnung.
Default `false`. Details: HANDBUCH Anhang AS.

### Schritt 1: Issue identifizieren

- **Enge Query statt Volllast (BOO-405) ⛔:** NUR das In-Progress-Issue via Backlog-Adapter laden — NIE das gesamte Backlog in den Kontext ziehen. Der Skill braucht genau einen Auftrag; die frühere Volllast-Ladung war ein struktureller Token-Fresser (User-Feedback 08.07.2026: der Backlog-MCP dominierte den Token-Verbrauch der Session).
  - Bei uebergebenem Key (`/implement PREFIX-XX`): das Issue **per ID** laden (Linear-MCP als Beispiel: `get_issue(id)`).
  - Ohne Key: mit **Status-Filter** laden (Linear-MCP: `list_issues` mit `state: "started"` bzw. State-Name "In Progress" + kleinem `limit`); andere Adapter analog (GitHub/Gitea: `state=open` + `status/*`-Label-Filter).
  - Antworten klein halten: `limit`/Pagination nutzen, aus der Antwort nur die benoetigten Felder (ID, Titel, Status, Description) weiterverwenden; Feld-Selektion zusaetzlich nutzen, wo der Adapter sie bietet (GraphQL/REST). Zugriffs-Kontrakt: [`docs/runbooks/backlog-adapter-inventar.md`](../docs/runbooks/backlog-adapter-inventar.md) §Zugriffs-Kontrakt.
- Issue mit Status "In Progress" identifizieren (das ist der Auftrag)
- Falls mehrere "In Progress": aeltestes zuerst, Operator fragen bei Unklarheit
- Issue-Description vollstaendig lesen

**Status-Guard bei explizit uebergebenem Issue-Key (BOO-319) ⛔:** Wird der Skill mit einem konkreten Key aufgerufen (`/implement PREFIX-XX`), ZUERST den Status des Backlog-Records pruefen — adapter-neutral ueber `backlog_adapter` aus `CONVENTIONS.md` (Linear / GitHub Issues / M365 / none):

- Status `Done` oder `Cancelled` (Linear-Typ completed/canceled → Done/Cancelled) → **harter STOPP**, nicht re-implementieren:

  ```
  [STOP — STORY ABGESCHLOSSEN] PREFIX-XX ist im Backlog seit <Datum> als Done/Canceled markiert.
  Abschluss-Kommentar/Ergebnis im Backlog-Record lesen, bevor irgendetwas passiert.
  Neuer Bedarf? -> Folge-Story via /ideation anlegen statt die alte Story erneut umzusetzen.
  ```

- Als Duplikat markiert → Original-Issue nennen und dort weiterarbeiten.
- Merksatz: **Backlog-Record = SSoT fuer den Story-STATUS, Spec = SSoT fuer den Story-INHALT** (CONVENTIONS.md §Spec-Gate). Fehlerklasse zweimal real belegt: Sprint-Doppelbau 2026-06-18, ueberholter Entwurf zu einer abgeschlossenen Story 2026-07-02.

### Schritt 1b: Schrader-Bestandteile-Gate ⛔ HARD GATE — kein Implement ohne vollstaendigen Prompt

Prueft ob das Issue ein vollstaendiger Schrader-Prompt ist (Code Crash Kap. 5). Kein Soft-Warning — harter Block.

**Ablauf:**

0. **Skript-Check (BOO-418):** Issue-Description in eine Datei schreiben (oder pipen) und
   `python3 .claude/scripts/schrader_check.py <issue.md>` ausfuehren — Exit 0 = vollstaendig,
   Exit 1 = STOPP mit Checkliste. Das Skript ist die deterministische Referenz; die Regeln
   darunter beschreiben dasselbe fuer den Leser.
1. Issue-Description auf Sektion `## Schrader-Prompt-Bestandteile` pruefen (alternativ: `## Schrader Prompt Components` fuer EN-Issues)
2. Alle 4 Sub-Sections pruefen — muss mind. 20 Zeichen nicht-leeren Inhalt enthalten (kein Template-Placeholder):
   - `### Insight (Perceive)`
   - `### Constraints`
   - `### Erfolgskriterien` (oder `### Success Criteria`)
   - `### Gewuenschtes Ergebnis` (oder `### Desired Outcome`)

   Der Ueberschriften-Vergleich ist seit BOO-499 umlaut-normalisiert: `### Gewünschtes Ergebnis`
   (echte Umlaute) zaehlt wie die ASCII-Transliteration — ein tadelloses deutsches Issue
   faellt nicht mehr durch. Die Meldungstexte bleiben ASCII.
3. Optional: `## Definition of Done` Sektion pruefen — Existenz pruefen (Inhalt nicht tief validiert)

**Bei fehlendem Bestandteil — STOPP:**
```
[STOP] Issue BOO-XX ist kein vollstaendiger Prompt — Schrader-Bestandteil fehlt:
  - [x] Insight: vorhanden
  - [ ] Constraints: leer oder fehlt
  - [x] Erfolgskriterien: vorhanden
  - [x] Gewuenschtes Ergebnis: vorhanden

Geh zurueck zu /ideation und ergaenze den fehlenden Bestandteil bevor du /implement startest.
```

**Bei vollstaendigem Issue:** Weiter zu Schritt 2.

> Pruefung regelbasiert und **skript-gedeckt** (BOO-418): `schrader_check.py` (kanonisch `bootstrap/scripts/`, ausgeliefert nach `.claude/scripts/`) ist die deterministische Referenz — kein LLM noetig. Issues vor INTENTRON Governance v2 (ohne `## Schrader-Prompt-Bestandteile`) koennen den Gate-Check nicht passieren — Operator muss die Sektion nachtraeglich ergaenzen (Migrations-Schritt in `migration-checklist-v1-to-v2.md`).

### Schritt 2: Abhaengigkeits-Check

- `## Abhaengigkeiten` Sektion im Issue pruefen
- Parent-Issue und Siblings pruefen (EPIC-Kontext)
- Referenzen zum Issue gezielt via Adapter-Suche finden ({PREFIX}-XX Mentions — Linear-MCP als Beispiel: `list_issues` mit `query: "{PREFIX}-XX"` + kleinem `limit`; kein Gesamt-Backlog in den Kontext laden, BOO-405)
- **Falls Abhaengigkeit OFFEN:** Operator warnen — "{PREFIX}-XX haengt von {PREFIX}-YY ab (Status: Backlog). Trotzdem fortfahren?"
- **Falls Reihenfolge abweicht:** Impact-Analyse zeigen

### Schritt 3: Kontext aufbauen

- CLAUDE.md lesen (Systemkontext)
- **`DEVELOPER_ONBOARDING.md` lesen** falls vorhanden — Handoff-Kontext fuer fremde Entwicklungsteams und Toolwechsel (Claude Code -> Codex/Cursor/GitHub Copilot/Google Antigravity/klassisches Dev-Team). Runtime-Hinweise, SSoTs, Startpunkt Umsetzung und Pflegepflicht in die Plan-Erstellung einbeziehen.
- **`ARCHITECTURE_DESIGN.md` lesen** — Lead-Dokument: ADRs, Quality Attributes, Leitprinzipien. Pruefen ob die Story gegen bestehende ADRs oder Quality Attributes verstoesst (z.B. ADR-6: Zero External Dependencies, ADR-5: Kill-Switch First). Verweist auf alle weiteren Architektur-Dokumente. **§5b Infra-Layer-Gegencheck (weich, BOO-221):** Beruehrt die Story einen der 13 Infra-Layer, dessen Tabellen-Zeile `n.ok`/leer ist, im Plan kurz vermerken (Entscheidung nachziehen oder bewusst `n/a`). Kein Block (Lazy-Fill erlaubt).
- Betroffene Code-Dateien identifizieren (aus Issue-Description + eigene Analyse)
- Verwandte abgeschlossene Issues pruefen (was wurde schon gebaut?)
- Architektur-Dimensionen pruefen die fuer diese Story relevant sind:
  Siehe [references/architecture-checklist.md](references/architecture-checklist.md)
- **Domain-Context (wenn vorhanden):** Falls `docs/domain/` im Projekt existiert, relevante `docs/domain/*.md`-Dateien laden (Schluessel-Begriffe die in der Story-Description oder den ACs vorkommen). Bei Sub-Agent-Delegation den Domain-Context als Teil des Mini-Briefings mitgeben: "Relevante Domain-Begriffe fuer diese Story: [Begriff → Pfad zur domain/*.md]"

### Schritt 3b: Governance-Validation (PFLICHT)

Vor der Plan-Erstellung die Governance-Artefakte aus dem Issue validieren (Pruefschritte siehe unten).

1. **8-Dimensionen pruefen:** Ist die Tabelle im Issue vorhanden? Stimmt die Einschaetzung?
   Fehlt eine Dimension die durch die geplante Aenderung betroffen ist?
2. **Security-Checklist:** Security-by-Design Sektion im Issue lesen.
   SECURITY.md Checkliste fuer den Change-Type durchgehen (neue API? Webhook? externer Input?).
3. **Security Impact + Security Validation pruefen:** Jede Story muss eine Sektion `## Security Impact` enthalten. Bei Code-, Security-, Tooling-, Dependency-, CI- oder Governance-Aenderungen muss zusaetzlich `## Security Validation` befuellt sein. Fehlt eine der Sektionen, STOPP mit Hinweis auf `/ideation` oder manuelle Nachpflege.
4. **Security-Referenzstack laden:** Je nach Change-Type die passenden Referenzen laden:
   - `auth` / `api`: `SECURITY.md`, API-Inventar, sensitive-paths, OWASP/API-Checkliste falls im Projekt vorhanden
   - `data`: `SECURITY.md`, Datenfluss-/Privacy-Sektion, Schema-/Storage-Doku
   - `dependency`: `SECURITY.md`, Dependency-/Supply-Chain-Regeln, `.semgrep.yml`, Manifest-Diff
   - `ci` / `governance`: `SECURITY.md`, Hook-/CI-Regeln, `CONVENTIONS.md`
   - `none`: Begruendung aus der Story uebernehmen und nur Basis-Secret-/Logging-Check durchfuehren
5. **ADD validieren (bei Features):** Architecture Design Document gegen aktuellen Code pruefen.
   Stimmen die genannten Dateien noch? Sind die Integrationspunkte korrekt?
6. **Fehlende Artefakte:** Falls 8-Dimensionen, Security-Sektion, Security-Validation oder ACs im Issue fehlen:
   - **Operator warnen:** "Issue {PREFIX}-XX fehlt [Sektion]. Soll ich die Sektion nachtraeglich ergaenzen?"
   - **NICHT stillschweigend weitermachen** — Governance-Luecken muessen sichtbar sein

### Schritt 3c: Spec-File Gate ⛔ HARD GATE — kein Plan ohne Spec

> **Diese Sperre wird zusaetzlich durch `.claude/hooks/spec-gate.sh` maschinell erzwungen.**
> Der Hook blockiert jeden `git commit {PREFIX}-XXX` wenn `specs/{PREFIX}-XXX.md` fehlt.

**Ablauf:**

1. Pruefen: Existiert `specs/{PREFIX}-XXX.md`?

2. **Falls JA:** Spec lesen — stimmt der Inhalt mit dem aktuellen Issue ueberein?
   Falls veraltet: Spec aktualisieren, dann weiter zu Schritt 4.
   **Gehoert die Spec zu einer abgeschlossenen Story** (Status-Guard aus Schritt 1), ist sie
   **Audit-Artefakt, kein Auftrag** — es gilt der STOPP aus Schritt 1, nicht „aktualisieren und weiter".

3. **Falls NEIN → STOPP. Spec jetzt erstellen:**
   a. `specs/TEMPLATE.md` lesen
   b. `specs/{PREFIX}-XXX.md` vollstaendig befuellen:
      - Why (aus Issue uebernehmen)
      - What (Deliverable + Done-Kriterien)
      - Constraints (Must / Must Not / Out of Scope)
      - Current State (betroffene Dateien + bestehende Patterns)
      - Tasks (T1, T2... — max 3 Files/Task, konkreter Verify-Step)
   c. Spec in Git committen: `git commit -m "docs: specs/{PREFIX}-XXX.md erstellt"`
   d. **Operator explizit bestaetigen lassen:**
      Ausgabe: `"Spec-File erstellt: specs/{PREFIX}-XXX.md — bitte prüfen und bestätigen, dann geht es weiter."`
   e. **Warten auf Operator-OK** — erst danach weiter zu Schritt 4
   f. Backlog-Record-/Adapter-Kommentar: Link zum Spec-File

4. **Keine Ausnahmen** — auch bei kleinen Fixes, Hotfixes, Config-Aenderungen.
   Einzige Ausnahme: reine Doku-Commits ohne Code-Aenderungen.
   **Was als «reine Doku» zaehlt (BOO-500/A14, dieselbe Definition wie im CI-Gate):**
   der Diff beruehrt AUSSCHLIESSLICH `journal/**` und `docs/**` (z.B. Daily Note,
   Runbook-Korrektur). **Explizit NICHT reine Doku:** `CLAUDE.md`, `AGENTS.md`,
   Skill-Dateien (`SKILL.md`) und beliebige `*.md` ausserhalb von journal/docs —
   das sind Instruktions-Senken (BOO-364), eine Aenderung dort ist eine
   Verhaltensaenderung und braucht eine Story; `specs/` gehoert immer zu einer Story.
   Das CI-Gate `spec-gate-ci.yml` traegt seit BOO-500 denselben Vorab-Check; die
   Etikett-Pflicht (label-guard) gilt fuer Doku-Dateien unveraendert weiter.

### Schritt 4: Plan erstellen + Operator-Freigabe

- Konkreten Implementierungsplan praesentieren
- Dateien, Aenderungen, Risiken, Test-Strategie
- **Warten auf Operator-Freigabe** (Human-in-the-Loop)
- Bei Daemon-Ausfuehrung (Auto-Execute): diesen Schritt ueberspringen

### Schritt 4b: Native-Subagent-Generierung (BOO-204, Schalter B)

Steuert das *Wie* der Story-internen Subagents — nicht das *Ob*. Zwei Patterns:

- **Altes Pattern** (`prefer_native_subagents: false`, `runtime_target ≠ claude-code`, oder Spec **ohne**
  `## Subagents`-Sektion): Subagents als Text-Block-Briefing via Agent-Tool im **gleichen
  Kontextfenster** wie der Orchestrator (simulierte Choreografie). Bisheriges Verhalten, unveraendert.
- **Neues Pattern** (`prefer_native_subagents: true` UND Spec hat eine `## Subagents`-Sektion):
  `/implement` generiert vor der Code-Phase pro Eintrag eine `.claude/agents/<story>-<agent>.md` und
  ueberlaesst Anthropic die Choreografie. Jeder Agent hat ein **eigenes Kontextfenster** mit eigenem
  Blatt-Budget (`served_context × effective_fraction × budget_pct` aus `.claude/model-profile.yml` —
  frisch lesen, BOO-486; ohne Profil Cloud-Default 200k + Warnung), eigene
  Tool-Permissions, optional ein eigenes Modell.

**Fan-out-Verweigerung (Ebene B, BOO-486):** Beim Fan-out ist der Orchestrator-Kontext nicht die
Summe der Sub-Agent-Arbeit — er haelt Briefings, Rueckgabe-Summaries und eigenes Reasoning
(SSoT BOO-484 §3). Vor **jedem** Spawn fuehrt der Orchestrator Buchhaltung ueber sein eigenes
Fenster (via `/context` bzw. Schaetzung, wie Schritt 0b): Erreicht die eigene Auslastung
`budget_pct` (80 %) des Orchestrator-Budgets aus dem frisch gelesenen Modell-Profil, wird
**kein weiterer Subagent gespawnt** — stattdessen Zwischenstand persistieren (Platte, nicht
Fenster) und mit frischem Fenster bzw. `/sprint-review` weitermachen. Rueckgaben der Subagents
klein halten (Pointer + Status + Zaehler), sonst kippt Ebene B trotz sauberer Blaetter.
Ehrliche Grenze: deklarierte Regel, an diesem benannten Gate geprueft — **kein Voll-Enforcement**
(bleibt beim Daemon, BOO-170); die Buchhaltung ist eine Schaetzung mit Marge, kein Praezisions-Gate.

**Quelle = die `## Subagents`-Sektion der Story-Spec** — derselbe SSoT, den `/sprint-run` Schritt 4.2
liest (eine Konvention, nicht zwei). Format:

```yaml
# In specs/<story>.md, Sektion "## Subagents" (optional — fehlt sie, laeuft die Story sequenziell):
- name: <slug>                  # -> .claude/agents/<story>-<slug>.md
  role: <Aufgabe des Agents>
  model: opus | sonnet | haiku  # optional; Default: Code-Kern bleibt Opus
  tools: [Read, Edit, Bash]     # optional; Default: Skill-Permissions
  write_scopes: [<pfad/glob>]   # Pflicht bei execution_mode sub-agents/agentic
```

Pro generierter `.claude/agents/<story>-<slug>.md`: Rolle, Story-ID, `write_scopes`, Worktree-Pfad
(falls `execution_isolation: git-worktree`), Gate-Liste, Modell, Tool-Permissions.

**Orthogonal zur Isolation:** Native Subagents und `execution_isolation` / `worktree_strategy`
(Schritt 0c) sind unabhaengig kombinierbar — der Flag aendert die Agent-*Art*, nicht die
Worktree-Strategie.

**Hygiene:** Generierte Story-Agent-Dateien sind transient (pro Lauf) und nicht Teil des Story-Diffs —
`.claude/agents/<story>-*.md` in `.gitignore` aufnehmen.

**lint-fixer (Schritt 6a):** laeuft unter derselben Generator-Logik — die Kopiervorlage
`references/lint-fixer.agent.md` ist der Spezialfall „ein fixer-Agent, `model: haiku`".

### Schritt 5: Implementation (nach Freigabe)

> **Secure-Coding-Hinweis (Shift-Left auf Prompt-Ebene).** Schon beim Schreiben sicher-by-default arbeiten — nicht erst von den Gates korrigieren lassen:
> - **Keine hardcoded Secrets** — API-Keys/Tokens/Passwoerter ueber Env-Variablen oder Secret-Manager, nie als Literal im Code.
> - **Parametrisierte Queries** statt String-Konkatenation (Prepared Statements / Query-Builder), nie User-Input in SQL kleben.
> - **TLS-Verifikation NICHT abschalten** (`verify=False`, `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0` sind tabu).
> - **Kein `eval`/`exec`** auf Fremd-/User-Input; keine Shell mit ungeprueftem Input (`shell=True`, `child_process.exec`).
>
> Der Layer-0-Edit-Bodyguard (BOO-86) ist der **deterministische Backstop** dazu — er faengt diese Muster ab, falls sie doch durchrutschen. Tiefe Pruefung bleibt Layer 2/3 (Semgrep, CI). Siehe HANDBUCH Anhang V.

- Sub-Tasks: Vor Implementation → "In Progress", nach Abschluss → "Done"
- Plan vollstaendig umsetzen
- Alle neuen Funktionen, Methoden und Code-Pfade mit Kommentar `// AI-generated: {STORY_ID}` markieren (Rollback-Identifikation, BOO-17). Fuer Python: `# AI-generated: {STORY_ID}`.

> **Rollback per `/rewind` (BOO-208).** Der Marker oben identifiziert AI-Code *nach* dem Schreiben; fuer aktives Zurueckspulen *in der Session* nutze Anthropics `/rewind` (`Esc Esc`) — es spult Claude-Edits zurueck. **Empfehlung:** vor jedem `git commit` einen Checkpoint setzen, falls die Story einen Rollback brauchen koennte. **Grenze:** `/rewind` betrifft **nur Claude-Edits**, NICHT manuelle Aenderungen, Bash-/Tool-Outputs oder bereits committete/gepushte Staende (dafuer Git). Siehe HANDBUCH §11b „Checkpoints & Rollback".
- Alle Doku-Files aktualisieren (CLAUDE.md, SYSTEM_ARCHITECTURE.md, etc.)
- Git Commit + Push
- **Session-Referenz ins Spec-File schreiben (BOO-19):**
  ```bash
  # Commit-SHA holen
  COMMIT_SHA=$(git rev-parse HEAD)
  # Neueste Session-Datei fuer dieses Projekt (best-effort)
  SESSION_FILE=$(ls -t ~/.claude/projects/*/sessions/*.jsonl 2>/dev/null | head -1)
  SESSION_ID=$(basename "${SESSION_FILE}" .jsonl 2>/dev/null || echo "unbekannt")
  SESSION_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  ```
  In `specs/{PREFIX}-XXX.md` unter `## Session-Referenz` eintragen:
  ```markdown
  ## Session-Referenz

  **Session-Timestamp:** {SESSION_TS}
  **Session-ID:** `{SESSION_ID}` (best-effort — neueste Session beim Commit)
  **Session-Log:** `~/.claude/projects/.../sessions/{SESSION_ID}.jsonl`
  **Commit-SHA:** `{COMMIT_SHA}`
  **Audit-Trace:** `bash .claude/scripts/audit-trace.sh {SPEC_ID}` (braucht jq)
  ```
  Danach Spec-File committen: `git commit -m "docs: specs/{PREFIX}-XXX.md Session-Referenz (BOO-19)"`

  > Wenn SESSION_FILE leer bleibt (keine Session-Datei gefunden): Nur COMMIT_SHA + SESSION_TS eintragen, SESSION_ID als "unbekannt" markieren — kein STOPP.

- Rueckfragen NUR bei echten Blockern

### Schritt 5.5: Sensitive-Paths-Gate ⛔ STOP BEI SENSITIVEM PFAD (BOO-18)

> Dieser Schritt laeuft NUR wenn `.claude/sensitive-paths.json` im Projekt existiert.
> Ohne diese Datei: sofort weiter zu Schritt 6.
>
> **Verdrahtet seit BOO-423 (nicht nur dieser Prosa-Schritt):** Denselben getesteten Kern
> (`commit_guard.py sensitive-paths`) ruft jetzt auch der Runtime-Hook `spec-gate.sh` bei `git commit`
> UND der Always-on-CI-Backstop `sensitive-paths-ci.yml` auf jeden PR — der Bypass ist ein
> `review-ok:`-Trailer in der Commit-Message/im PR-Body. Dieser Schritt bleibt die vorgelagerte
> KI-Selbstpruefung; Hook + CI sind die harte, belegbare Durchsetzung dahinter.
>
> **Technischer REVIEW-Report (BOO-424, analog DPO-REVIEW in 5.5b):** Bei einem Sensitive-Path-Treffer
> ist dies der Pflicht-Punkt fuer den `security-architect` **REVIEW**-Modus — er strukturiert die
> menschliche Pflicht-Freigabe technisch (OWASP-Top-10-Schnellcheck, Secrets, Risiko-Klassifizierung
> HOCH/MITTEL/NIEDRIG) und legt einen **gate-baren Report** unter
> `journal/reports/local/<run>/security-review.md` ab (Existenz + Pfad landen in `meta.json`, siehe 6f-bis).
> Ausserhalb von Sensitive-Path-Treffern ist REVIEW ein **Abruf-Feature** — das deterministische
> Every-Change-Gate ist Semgrep (6a-bis), nicht dieser LLM-Schnellcheck.

**Ablauf:**

1. `.claude/sensitive-paths.json` lesen — `patterns`-Array laden.
2. Geaenderte Dateien ermitteln:
   ```bash
   git diff --name-only HEAD
   ```
3. Jede geaenderte Datei gegen die Pattern-Liste pruefen (Glob-Matching, `**` = rekursiv):
   - `auth/**` trifft auf `auth/token.js`, `auth/middleware/jwt.js`, etc.
   - `**/*pii*` trifft auf `lib/pii-handler.js`, `src/models/pii.js`, etc.
4. **Kein Treffer → Gate bestanden**, weiter zu Schritt 6.
5. **Treffer vorhanden → PFLICHT-STOPP:**

```
[STOP — SENSITIVE PATH] Die folgenden geaenderten Dateien beruehren sensible Bereiche:
  - auth/token.js  (Pattern: auth/**)
  - lib/pii-handler.js  (Pattern: **/*pii*)

Mandatory Human Review erforderlich (BOO-18, Schrader Kap. 3 §Enterprise Governance).

VOLLSTAENDIGER DIFF ZUR REVIEW:
[diff output hier]

Bitte fuehre `/security --mode review` mit dem Diff aus (technischer REVIEW-Report) oder
bestaetige nach eigener Zeile-fuer-Zeile-Pruefung manuell mit:
  review-ok: {pfad-oder-pattern}     z.B. review-ok: auth/token.js  ODER  review-ok: auth/**

Ohne explizite Bestätigung wird der Commit nicht durchgeführt.
```

> **Trailer-Format (BOO-498/A13):** Der Wert hinter `review-ok:` ist der **Pfad oder das Pattern**,
> das freigegeben wird — der getestete Kern (`commit_guard.py`) vergleicht exakt dagegen
> (pfad-genaue Freigabe: wer freigibt, sagt WAS). Wer/Warum gehoert in die **Prosa daneben**
> (und in `## Human Review` im Spec, Schritt 7a), nicht in den Trailer-Wert. Mehrere Pfade:
> kommagetrennt oder eine Trailer-Zeile pro Pfad.

6. **Auf Review-Bestaetigung warten** — Operator antwortet mit `review-ok: ...` ODER der
   `security-architect`-Skill (REVIEW-Modus) schreibt einen REVIEW-Report nach
   `journal/reports/local/<run>/security-review.md` (BOO-424). **HOCH-Befund im Report = Blocker**
   bis er gefixt oder als dokumentierte Ausnahme mit `review-ok:` bestaetigt ist.
7. **Nach Bestätigung:**
   a. Review-Kommentar ins Spec-File eintragen unter `## Human Review`:
      ```markdown
      ## Human Review
      - **Date:** {{TODAY}}
      - **Reviewer:** {{REVIEWER_NAME}}
      - **Comment:** {{REVIEW_COMMENT}}
      - **Sensitive Paths Touched:** {{LIST_OF_SENSITIVE_FILES}}
      - **Security-Review-Report:** {{PATH_TO_SECURITY_REVIEW}} (falls REVIEW-Modus lief)
      ```
   b. Spec-File committen: `git commit -m "docs: specs/{PREFIX}-XXX.md Human Review dokumentiert (BOO-18)"`
   c. Danach regulaerer Commit mit dem Code.

> **Ohne `review-ok`-Bestätigung:** Schritt 6 wird NICHT erreicht. Keine Ausnahme, kein Auto-Bypass.

### Schritt 5.5b: Personal-Data-Paths-Gate ⛔ STOP BEI PERSONAL-DATA-PFAD (BOO-69/BOO-427)

> Dieser Schritt laeuft, sobald `.claude/personal-data-paths.json` (oder
> `.codex/personal-data-paths.json`) im Projekt existiert — **unabhaengig** vom
> Story-Frontmatter. Ohne Pattern-Datei: sofort weiter zu Schritt 5.7.
>
> **Invertierte Gate-Logik (BOO-427):** Der Pattern-Treffer allein stoppt. Frueher feuerte
> das Gate nur bei Selbstdeklaration `personal_data: true` — eine falsch eingestufte Story
> (`personal_data: false`, aber der Diff trifft einen PII-Pfad) wurde durchgewinkt
> (Befund B3-02). Jetzt ficht der Treffer die Frontmatter-Einstufung an.

**Ablauf:**

1. `.claude/personal-data-paths.json` lesen — `patterns`-Array laden.
2. Geaenderte Dateien ermitteln (gleiche Logik wie 5.5).
3. Jede geaenderte Datei gegen die Pattern-Liste pruefen (Glob-Matching).
4. **Kein Treffer → Gate bestanden**, weiter zu Schritt 5.7 (auch bei `personal_data: true` —
   die Story verarbeitet PII, aber dieser Diff beruehrt keine deklarierten PII-Pfade).
5. **Treffer + `personal_data: false` oder fehlend → PFLICHT-STOPP mit Reklassifizierungs-Frage:**

```
[STOP — REKLASSIFIZIERUNG] Die Story ist als personal_data: false eingestuft,
aber der Diff trifft deklarierte PII-Pfade:
  - db/migrations/add_email_to_orders.sql  (Pattern: **/migrations/**)

Der Pattern-Treffer ficht die Einstufung an (BOO-427). Zwei Wege:
  a) Reklassifizieren: Story-Frontmatter auf personal_data: true setzen,
     dann DPO REVIEW wie in Punkt 6 (privacy-ok erforderlich).
  b) Einstufung begruendet halten: privacy-ok: {pfad-oder-pattern} — die Begruendung
     («Fehlalarm, weil …») in der Prosa daneben, nicht im Trailer-Wert (BOO-498/A13)

Ohne (a) oder (b) wird der Commit nicht durchgefuehrt. Durchwinken ist keiner der Wege.
```

6. **Treffer + `personal_data: true` → PFLICHT-STOPP + DPO REVIEW:**

```
[STOP — PERSONAL DATA PATH] Die folgenden geaenderten Dateien beruehren personenbezogene Daten:
  - src/api/profile.ts  (Pattern: **/profile*)
  - lib/onboarding/consent.ts  (Pattern: **/onboarding/**)

Privacy Review erforderlich (BOO-69, DSGVO Art. 25 Privacy by Design).

VOLLSTAENDIGER DIFF ZUR REVIEW:
[diff output hier]

Bitte fuehre `/dpo --mode review` mit dem Diff aus oder bestaetige manuell mit:
  privacy-ok: {pfad-oder-pattern}     z.B. privacy-ok: src/api/profile.ts  ODER  privacy-ok: **/onboarding/**

Ohne explizite Bestaetigung wird der Commit nicht durchgefuehrt.
```

> **Trailer-Format (BOO-498/A13):** analog `review-ok` — der Wert ist der **Pfad oder das
> Pattern**; was geprueft wurde (Datenminimierung, Loeschmechanik, Consent, …) gehoert in
> die Prosa daneben und in `## Privacy Review` im Spec (Schritt 8a).

7. **Auf DPO-Review oder Manuelle Bestaetigung warten** — Operator antwortet mit `privacy-ok: ...` ODER der DPO-Skill schreibt einen REVIEW-Report nach `journal/reports/local/<date>_<story>/privacy.md`.
8. **Nach Bestaetigung:**
   a. Privacy-Block ins Spec-File eintragen unter `## Privacy Review`:
      ```markdown
      ## Privacy Review
      - **Date:** {{TODAY}}
      - **Reviewer:** {{REVIEWER_NAME}}
      - **Comment:** {{REVIEW_COMMENT}}
      - **Personal Data Paths Touched:** {{LIST_OF_PERSONAL_DATA_FILES}}
      - **DPO Report:** {{PATH_TO_DPO_REPORT}} (falls vorhanden)
      ```
   b. Spec-File committen: `git commit -m "docs: specs/{{STORY_ID}}.md Privacy Review dokumentiert (BOO-69)"`
   c. Danach regulaerer Commit mit dem Code.

**Verhaeltnis zu Schritt 5.5:** Beide Gates koennen gleichzeitig zuschlagen (sensitive UND personal-data). In dem Fall: erst `review-ok` (5.5), dann `privacy-ok` (5.5b). Beide Bestaetigungen sind erforderlich, keine ersetzt die andere — DPO bewertet rechtlich, security-architect technisch.

> **Ohne `privacy-ok`-Bestaetigung:** Schritt 5.7 wird NICHT erreicht. Keine Ausnahme, kein Auto-Bypass.

> **Issue-Referenz:** BOO-69 (Gate) + BOO-427 (invertierte Logik). Pattern-Datei: `.claude/personal-data-paths.json` (bei Bootstrap mit Privacy-Add-on automatisch angelegt). DPO-Skill als Standalone unter `~/.claude/skills/dpo/`. HANDBUCH-Hintergrund: Anhang O Privacy by Design.

### Schritt 5.5c: EU-AI-Act-Hinweis (BOO-101/106, weich — kein STOPP)

> **Aktivierung:** Nur wenn `AI_SYSTEM.md` im Projekt-Root existiert (EU-AI-Act-Add-on aktiv). Sonst ueberspringen.

**Zweck:** Sicherstellen, dass KI-System-relevante Code-Aenderungen ihre Doku aktuell halten — der AI Act verlangt aktuelle System-Dokumentation, keinen zeilenweisen Code-Check.

1. Wenn die Story `ai_act_relevant: true` traegt **oder** die geaenderten Dateien KI-System-Code beruehren (Modell-Aufruf, Inferenz, KI-Ein-/Ausgaben, Logging der KI-Entscheidungen): pruefen, ob `AI_SYSTEM.md` noch stimmt (Risikoklasse, Transparenz, Human Oversight, Logging, GPAI).
2. Bei Abweichung: `AI_SYSTEM.md` aktualisieren **oder** einen Punkt in den `## AI-System`-Block der Spec aufnehmen, der im periodischen dpo-AUDIT als REVIEW-NEEDED auftaucht.
3. **Kein harter Stopp** (anders als 5.5/5.5b) — Hinweis + Doku-Pflege; Schritt 5.7 wird nicht blockiert.

> **Issue-Referenz:** BOO-101/105/106. Verbindliche Pruefung: `/sprint-review` 7c (Katalog `eu-ai-act.yml`). Gesamtbild der Mechanik: `docs/compliance/compliance-mechanik.md`. KEINE Rechtsberatung — Urteils-Punkte = REVIEW-NEEDED.

### Schritt 5.7: Change-Type-Verzweigung (BOO-68)

Vor dem Eintritt in die Quality Gates wird der `Change-Type` aus dem Spec-Frontmatter
(Sektion 8 Security Impact der Story; im Spec-File als `change_type` im Frontmatter)
gelesen und das Gate-Verhalten entsprechend gesetzt.

**Hintergrund:** Stories ohne klassischen Code-Diff (n8n/Make/Zapier-Workflow, Terraform/Pulumi/
CloudFormation-IaC, reine Cloud-/App-Configs, CMS-Content) wuerden ohne diese Verzweigung
alle Code-Gates leer durchlaufen und `final_status: passed` melden — obwohl niemand die
echten Risiken (Webhook-Auth, Credentials, IAM-Drift, oeffentliche Buckets) geprueft hat.
Schrader-Prinzip: "kein Output ohne Verify". Details siehe
[references/non-code-flow.md](references/non-code-flow.md).

**Ablauf:**

1. `change_type` aus Spec-Frontmatter lesen. Fallback wenn fehlt: `none` (Default = code-strict).
2. Pruefen, ob `change_type` in der Non-Code-Menge liegt:
   `{workflow, config, infrastructure, content}`.
3. Wenn **Code-Strict** (alle anderen Werte einschliesslich `none`): kein Verhaltenswechsel,
   weiter zu Schritt 6 wie bisher.
4. Wenn **Non-Code**: Gate-Modus auf `non-code` setzen. Wirkung:

| Gate | Code-Strict (Default) | Non-Code (`workflow`/`config`/`infrastructure`/`content`) |
|---|---|---|
| 6a ESLint/Ruff | Iterations-Loop, Hard | **Skip mit Begruendung in meta.json** |
| 6a-bis Semgrep | Iterations-Loop, Hard | **Skip mit Begruendung in meta.json** |
| 6a-tris Dependency | Hard bei Manifest-Diff | **Skip ausser Manifest tatsaechlich im Diff** |
| 6a-quart Coverage | Hard >=80% | **Skip mit Begruendung in meta.json** |
| 6b Akzeptanzkriterien | Hard | Hard (unveraendert) |
| 6c Architektur-Check | Soft | **Hard — Pflicht-Dokumentation** |
| 6d Smoke Test | Soft | **Hard — Pflicht-Ausfuehrung in Test-Env** |
| 6e Security-Findings | Dokumentation | **Hard — Pflicht-Dokumentation pro Domain-Risiko** |
| 5.5 Sensitive-Paths | Hard bei Treffer | Hard bei Treffer (unveraendert — Pattern fuer n8n/IaC/Config erweitern) |

5. **Skip-Begruendung in meta.json:** Skip ist NICHT stillschweigend. Jeder uebersprungene
   Code-Gate erscheint in `meta.json.skipped_gates` mit Grund:

   ```json
   "skipped_gates": {
     "eslint": "non-code: change_type=workflow",
     "semgrep": "non-code: change_type=workflow",
     "dependency": "non-code: no manifest in diff",
     "coverage": "non-code: change_type=workflow"
   }
   ```

6. **Optionale Domain-Gates (best-effort, nur wenn `tools_available.<tool>` aktiv):**
   - `change_type=workflow`: `tools_available.n8n_lint`, `tools_available.workflow_jsonschema`
   - `change_type=infrastructure`: `tools_available.tflint`, `tools_available.tfsec`, `tools_available.checkov`
   - `change_type=config`: `tools_available.yamllint`, `tools_available.jsonschema`, `tools_available.opa`
   - `change_type=content`: `tools_available.markdownlint`, `tools_available.broken_links`

   Fehlt das Tool: Skip mit Hinweis "Domain-Gate fuer change_type=X empfohlen — `tools_available.X` nicht aktiv".
   Konkrete Tool-Integrationen sind eigene Folge-Stories — diese Story etabliert nur den Mechanismus.

7. **meta.json bekommt zusaetzliches Feld `change_type`** (Audit-Spur fuer `/sprint-review`):

   ```json
   {
     "story_id": "BOO-XX",
     "change_type": "workflow",
     "iterations": { "eslint": 0, "tests": 0, "semgrep": 0, "coverage": 0 },
     "skipped_gates": { "eslint": "non-code: change_type=workflow", ... },
     "final_status": "passed"
   }
   ```

8. **PASS-Kriterien Non-Code (ueberschreiben validation-checklist.md PASS):**
   - 6b: alle ACs mit Evidenz abgehakt
   - 6c: Architektur-Quick-Check mit konkretem Befund dokumentiert (nicht leer)
   - 6d: Smoke Test ausgefuehrt + Output dokumentiert (Workflow getriggert, Plan/Apply gelaufen, Config angewendet)
   - 6e: Security-Findings pro Domain (Webhook-Auth / Credentials / IAM / Public Surface) dokumentiert oder explizit als "n/a — Begruendung" markiert
   - 5.5: bei Treffer `review-ok` vorhanden (unveraendert)

9. **FAIL-Kriterien Non-Code (ueberschreiben):**
   - 6c leer / "n/a" ohne Begruendung
   - 6d nicht ausgefuehrt oder Output nicht dokumentiert
   - 6e leer / "keine Pruefung" ohne Begruendung

> **Diese Verzweigung ersetzt nicht die `tools_available`-Logik aus Schritt 0.4** — sie ergaenzt
> sie. `tools_available` regelt "Tool da oder nicht", Schritt 5.7 regelt "Story-Natur Code oder
> nicht". Beide Mechanismen koennen denselben Gate skippen — `meta.json.skipped_gates`
> dokumentiert den Grund eindeutig.

### Schritt 6: Post-Implement Validation — Validate-Fix-Learn

Validierung BEVOR das Issue auf "Done" gesetzt wird. Siehe [references/validation-checklist.md](references/validation-checklist.md)

Dieser Schritt ist eine Schleife, kein einmaliger Check:

```text
Validate -> Interpret -> Decide -> Fix -> Re-Validate -> PASS/FAIL -> Learn
```

Regeln:
- Jeder fehlgeschlagene Gate-Lauf wird interpretiert, bevor Code gepatcht wird.
- Fixes werden nur fuer erkannte Ursachen gemacht, nicht blind fuer Symptome.
- Nach jedem Fix muss derselbe Gate erneut laufen.
- `Done` ist erst erlaubt, wenn alle blockierenden Gates gruen sind oder ein Operator eine dokumentierte Ausnahme bestaetigt.
- Nach PASS/FAIL wird ein Learning geschrieben, wenn ein wiederholbares Muster sichtbar wurde.

**6-Prelude) Iteration-Run-Setup — Persistenz-Verzeichnis fuer raw Tool-Outputs (BOO-36)**

Bevor die einzelnen Gates (6a/6a-bis/6a-quart/...) iterieren, wird **einmal pro Implement-Run** ein Persistenz-Verzeichnis fuer die raw Tool-Outputs angelegt. Alle Iterations-Outputs (ESLint, Semgrep, Tests, Coverage) landen parallel zur deklarativen Iteration auch dort — `/sprint-review` liest spaeter aus diesem Verzeichnis und aggregiert L2-Lessons. **`/implement` schreibt nur raw Outputs**, NICHT direkt in `journal/learnings.db` (L3). Die Trennung ist hart: Implement persistiert, Sprint-Review aggregiert.

```bash
# Default-Pfad (kann via paths.reports_local aus .claude/environment.json ueberschrieben werden)
REPORTS_BASE="journal/reports/local"
STAMP=$(date -u +%Y-%m-%d_%H%M)
STORY_ID="${ISSUE_KEY}"   # z.B. BOO-36
RUN_DIR="${REPORTS_BASE}/${STAMP}_${STORY_ID}"
mkdir -p "${RUN_DIR}"

# Start-Zeitstempel und Iterationen-Counter initialisieren (Shell-Variablen fuer meta.json)
RUN_STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ITER_ESLINT=0
ITER_TESTS=0
ITER_SEMGREP=0
ITER_COVERAGE=0
RUN_FINAL_STATUS="in_progress"
```

**Pfad-Konvention:**
- Default: `journal/reports/local/{YYYY-MM-DD_HHMM}_{STORY-ID}/` (lebend unter Projekt-Root)
- gitignored (Bootstrap legt den Eintrag in `.gitignore` an — siehe `references/file-templates.md` §.gitignore)
- Dateien pro Run:
  - `eslint-iter{N}.sarif` — pro ESLint-Iteration (`--format @microsoft/eslint-formatter-sarif --output-file ...` oder `--format json --output-file ...` als Fallback)
  - `tests-iter{N}.junit.xml` — pro Test-Iteration (`pytest --junit-xml=...` / `jest --reporters=default --reporters=jest-junit` mit `JEST_JUNIT_OUTPUT_FILE`)
  - `coverage-final.json` — Coverage-Endstand (c8 / pytest-cov, JSON-Reporter, einmaliger Lopy am Iterations-Ende)
  - `semgrep-final.sarif` — Semgrep-Endstand (`semgrep --sarif --output ...`, einmaliger Copy am Iterations-Ende)
  - `meta.json` — Run-Metadaten (Schema siehe Schritt 6-Closeout)

**Wichtig:** Schreib-Pfad ist eigenstaendig — wenn ein Gate uebersprungen wird (z.B. kein `eslint.config.mjs`), erscheint die entsprechende Datei nicht im Run-Verzeichnis. `meta.json.iterations.<gate>` bleibt dann auf `0`.

**Bei `tools_available.<tool> == false`** (aus `.claude/environment.json`): Persistenz fuer dieses Gate wird ebenfalls uebersprungen — das Verhalten passt zur regulaeren Gate-Logik, der raw Output entsteht ja gar nicht erst.

**6a) Code Quality Gate — ESLint + SonarLint + Error Lens (deklarative Iteration)**

> **Tool-Kette:** `eslint.config.mjs` definiert Regeln (Industriestandard seit BOO-2:
> ESLint Recommended + Airbnb Base + Security + SonarJS) → ESLint CLI prueft →
> SonarQube for IDE zeigt Tiefenanalyse → Error Lens zeigt beides inline in VS Code.

**Deklarativer Modus (Schrader Code Crash Z. 2105-2141, Compound Engineering Mechanik #1):**
Der Skill iteriert ueber den ESLint-Output bis 0 Errors — der Skill formuliert Code-Fixes
basierend auf den Findings, prueft erneut, und stoppt erst wenn das Gate gruen ist oder
das Iterations-Limit erreicht ist.

> **Modell-Delegation (BOO-171):** Diese und die folgende mechanische Iterations-Schleife (6a-bis Semgrep)
> sind stumpfe „fix bis gruen"-Arbeit ohne tiefes Reasoning. Der Opus-Parent **delegiert** sie an einen
> **`lint-fixer`-Subagenten mit `model: haiku`** (Kopiervorlage: [`references/lint-fixer.agent.md`](references/lint-fixer.agent.md)
> — als Projekt-Subagent nach `.claude/agents/lint-fixer.md` ablegen, oder direkt per Agent-Tool mit
> `model: haiku` und diesem Briefing spawnen). Mini-Briefing: geaenderte Dateien,
> Linter-Output, erlaubte Schreib-Pfade, Iterations-Limit. **Code-Kern (Schritt 5) und Security-Findings (6e)
> bleiben Opus.** Das `meta.json`-Schema (`skill_invoked: implement-iterations`, `model_tier: haiku`) bildet
> das bereits ab; Tier-Quelle `bootstrap/references/model-tiers.json`. Faellt der Subagent aus, iteriert der
> Parent selbst weiter (kein Hard-Block).

```bash
# Alle in diesem Commit geaenderten JS-Dateien pruefen — Pflicht-Run + SARIF-Persistenz pro Iteration
# --no-warn-ignored (ESLint v9, BOO-469): explizit uebergebene, per Root-`ignores` ausgeschlossene
# Dateien erzeugen sonst «File ignored»-Warnungen -> Phantom-Block ohne echten Befund (Nested Workspace).
ITER_ESLINT=$((ITER_ESLINT + 1))
git diff --name-only HEAD | grep -E '\.(js|mjs)$' | \
  xargs npx eslint --no-warn-ignored --max-warnings=0 \
    --format @microsoft/eslint-formatter-sarif \
    --output-file "${RUN_DIR}/eslint-iter${ITER_ESLINT}.sarif"
# Fallback ohne SARIF-Formatter: --format json --output-file "${RUN_DIR}/eslint-iter${ITER_ESLINT}.json"
```

> **SARIF vs JSON:** Wenn `@microsoft/eslint-formatter-sarif` als devDependency vorhanden ist, SARIF-Format nutzen (CI-tauglich, GitHub-Action-kompatibel). Sonst Built-in `--format json` als Fallback — dann heisst die Datei `eslint-iter{N}.json`. ESLint nativen SARIF-Support gibt es aktuell nicht; der `@microsoft/eslint-formatter-sarif`-Plugin ist der etablierte Weg.

**Iterations-Loop (Pflicht):**

1. ESLint auf geaenderten Dateien ausfuehren — Output landet IMMER auch in `${RUN_DIR}/eslint-iter${ITER_ESLINT}.sarif` (oder `.json` im Fallback).
2. Wenn `errors > 0`:
   a. Code-Fixes basierend auf Output formulieren (Skill liest Findings, schlaegt Patches vor)
   b. Patches anwenden (Edit-Tool)
   c. `ITER_ESLINT` erhoehen, erneut Schritt 1 pruefen (neuer Iterations-Output landet in `eslint-iter{N+1}.sarif`)
3. Wenn `errors == 0`: Gate bestanden — weiter zu Schritt 6b.
4. **Maximal 5 Iterationen.** Bei Iteration 5 ohne gruen: STOPP mit klarem Hinweis an
   den Operator: welche Findings persistieren, welche Fixes versucht wurden, warum sie
   nicht gegriffen haben. Operator entscheidet (manueller Fix, Regel-Ausnahme, oder Story
   als Carry-Over markieren).

**Gate-Verhalten:**
- **0 Errors + 0 Warnings:** Gate bestanden — weiter zu Schritt 6b.
- **Errors vorhanden + Iterationen verbleibend:** weiter iterieren.
- **Errors vorhanden + Iterations-Limit erreicht:** STOPP, Operator-Eingriff.
- **Nur Warnings:** Operator entscheidet ob akzeptabel (mit Begruendung im Linear-Kommentar).
- Kein `eslint.config.mjs` im Projekt: Gate ueberspringen + Operator hinweisen dass Regeldatei fehlt (BOO-2-Migration).

**Python-Aequivalent:** dasselbe Schema mit `npx eslint` -> `ruff check`, `eslint.config.mjs`
-> `pyproject.toml`. Ruff-Iteration laeuft mit demselben 5-Iterations-Limit. SARIF-Persistenz analog: `ruff check --output-format sarif --output-file "${RUN_DIR}/ruff-iter${ITER_ESLINT}.sarif"` (Ruff hat nativen SARIF-Support seit `ruff` 0.4.x). Counter-Variable bleibt `ITER_ESLINT`, der Datei-Name spiegelt den Linter (`ruff-iter{N}.sarif` statt `eslint-iter{N}.sarif`).

**6a-bis) Security Gate — Semgrep (deklarative Iteration, BOO-4)**

> **Tool-Kette:** `.semgrep.yml` (Manifest aus BOO-3) → Hook-Skript liest aktive Packs
> und konstruiert `--config p/...`-Flags → Semgrep CLI prueft → Findings im Output.
> Zweiter Quality-Gate nach ESLint, gleiche Iterations-Mechanik.

**Manifest-Reader (gleiche Logik wie im Pre-Commit-Hook und der GitHub Action):**

```bash
# Aktive Packs aus .semgrep.yml extrahieren
PACKS=$(grep -E '^[[:space:]]*-[[:space:]]+p/' .semgrep.yml | sed -E 's/^[[:space:]]*-[[:space:]]+//')
ARGS=""
for pack in $PACKS; do
    ARGS="$ARGS --config $pack"
done

# Semgrep auf geanderten Dateien — SARIF-Persistenz fuer den Final-Lauf
ITER_SEMGREP=$((ITER_SEMGREP + 1))
git diff --name-only HEAD | xargs semgrep $ARGS --error --quiet \
    --sarif --output "${RUN_DIR}/semgrep-final.sarif"
```

> **Semgrep-Persistenz-Konvention:** Wir schreiben pro Iteration NACH `${RUN_DIR}/semgrep-final.sarif` — der File-Name `-final` reflektiert, dass nur der Endstand fuer Sprint-Review interessant ist (Semgrep iteriert seltener als ESLint und das letzte File gewinnt durch Ueberschreiben). Counter `ITER_SEMGREP` wird trotzdem hochgezaehlt fuer `meta.json.iterations.semgrep`.

**Iterations-Loop (gleiche Mechanik wie 6a):**

1. Manifest-Reader laedt aktive Packs aus `.semgrep.yml`.
2. Semgrep auf geanderten Dateien ausfuehren mit konstruierten Flags — Output ueberschreibt `${RUN_DIR}/semgrep-final.sarif`.
3. Wenn Findings vorhanden:
   a. Code-Fixes basierend auf Output formulieren
   b. Patches anwenden (Edit-Tool)
   c. `ITER_SEMGREP` erhoehen, erneut Schritt 2 pruefen
4. Wenn 0 Findings: Gate bestanden — weiter zu 6b.
5. **Maximal 5 Iterationen.** Bei Iteration 5 ohne gruen: STOPP, Operator-Eingriff.

**Gate-Verhalten:**
- 0 Findings: Gate bestanden — weiter zu 6b.
- High/Critical Findings + Iterationen verbleibend: weiter iterieren.
- High/Critical Findings + Iterations-Limit erreicht: STOPP, Operator-Eingriff.
- Nur Medium/Low: Operator entscheidet (mit Begruendung im Linear-Kommentar).
- Kein `.semgrep.yml`: Gate ueberspringen + Operator hinweisen "Regeldatei fehlt — /bootstrap erneut" (BOO-3-Migration).
- Keine aktiven Packs in `.semgrep.yml` (alle auskommentiert): Gate ueberspringen + Hinweis.

**Laufzeit-Budget:** muss unter 10 Sekunden bleiben. Bei groesseren Repos Optimierung via `--baseline-ref HEAD~1` statt voller Scan.

**6a-tris) Dependency Gate — Slopsquatting-Schutz (BOO-12)**

> **Tool-Kette:** `git diff --cached` -> `hooks/dependency-check.sh` -> Registry-Lookup
> (npm view / pip / curl-Fallback) -> Existenz + Age + CVE-Check.
> Schrader Code Crash Kap. 3-4: KI-Halluzinationen sind eigener Angriffsvektor.

**Trigger:** Lauft NUR wenn `package.json`, `requirements.txt`, `pyproject.toml` oder
`Cargo.toml` im Diff sind. Sonst sofort Exit 0 (Performance).

**Drei Checks pro neu hinzugefuegter Dependency:**

1. **Existenz-Check** — Registry-Lookup (npmjs/pypi). 404 → BLOCKIERT (Halluzination?).
2. **Age-Check** — Package <30 Tage alt? Warnung (Typosquatter-Risiko, manuelle Verifikation).
3. **CVE-Check** — `npm audit --audit-level=high` / `pip-audit`. High/Critical → BLOCKIERT.

**Gate-Verhalten:**
- 0 Findings: Gate bestanden — weiter zu 6b.
- Existenz-404 / High/Critical CVE: Gate BLOCKIERT, Operator muss verifizieren oder Paket entfernen.
- Age-Warning: Gate bestanden, aber Hinweis im Output. Operator entscheidet ob das ein Risiko ist.
- Cargo-Diff: Hinweis "Cargo-Vollunterstuetzung in zukuenftiger Iteration", Operator laeuft `cargo audit` manuell.
- Tool-Fallback: Bei fehlendem `npm` / `pip-audit` wird auf curl gegen Registry zurueckgefallen.

**Laufzeit-Budget:** mit Registry-Lookup ueblicherweise 2-5 Sekunden. Bei vielen neuen
Dependencies parallelisierbar — heute serielle Implementation, optimierbar bei Bedarf.

**6a-quart) Coverage Gate — Diff-Coverage >=80% fuer neuen Code (BOO-15)**

> **Tool-Kette:** Test-Lauf (c8 / pytest-cov) -> coverage.json -> hooks/coverage-check.sh
> -> korreliert git diff --added mit Coverage-Daten -> Gate-Entscheidung.
> Schrader Code Crash Kap. 3: Gesamt-Coverage auf Legacy-Repos ist unfair —
> nur Diff-Coverage auf neu hinzugefuegten Zeilen.

**Wichtig:** Dieser Schritt laeuft im Skill, NICHT im Pre-Commit-Hook (Tests
dauern zu lange — wuerde 10s-Budget des Hooks sprengen).

**Iterations-Loop:**

1. Test-Lauf mit Coverage-Output und JUnit-XML pro Iteration:
   - Node: `npx c8 --reporter=json --reporter=text-summary npx jest --reporters=default --reporters=jest-junit` mit `JEST_JUNIT_OUTPUT_FILE="${RUN_DIR}/tests-iter${ITER_TESTS}.junit.xml"`. Coverage-Output landet in `coverage/coverage-final.json`.
   - Python: `pytest --cov --cov-report=json --junit-xml="${RUN_DIR}/tests-iter${ITER_TESTS}.junit.xml"`. Coverage-Output landet in `coverage.json`.
   - Iterations-Counter zuvor hochzaehlen: `ITER_TESTS=$((ITER_TESTS + 1))`.
   - Bei Iteration: `ITER_COVERAGE=$((ITER_COVERAGE + 1))` synchron.
2. `bash .claude/hooks/coverage-check.sh` aufrufen — vergleicht Added-Lines
   aus `git diff --cached -U0` mit Coverage-Daten.
3. Coverage-Endstand nach Run-Verzeichnis kopieren (einmaliger Copy am Iterations-Ende):
   - Node: `cp coverage/coverage-final.json "${RUN_DIR}/coverage-final.json"`
   - Python: `cp coverage.json "${RUN_DIR}/coverage-final.json"`
4. Gate-Verhalten:
   - **>=80% (Pass):** Gate bestanden — weiter zu 6b.
   - **60-80% (Warn):** Operator entscheidet, Begruendung im Linear-Kommentar.
   - **<60% (Block):** Tests hinzufuegen + Iterations-Schritt 1 wiederholen.
5. **Maximal 5 Iterationen.** Bei Iteration 5 ohne gruen: STOPP, Operator-Eingriff
   (manueller Test-Reichweiten-Plan oder Story splitten).

> **JUnit-XML-Konvention:** Sowohl pytest (`--junit-xml=...`) als auch jest-junit (env-var `JEST_JUNIT_OUTPUT_FILE`) schreiben JUnit-XML — Standardformat fuer Test-Reports, von `/sprint-review` parsbar. Wenn der Test-Runner kein JUnit-XML kann (z.B. Mocha ohne Reporter): Persistenz fuer Tests uebersprungen, `ITER_TESTS` wird nicht erhoeht, `meta.json.iterations.tests` bleibt 0 — der Coverage-Lauf selbst laeuft weiter.

**Gate-Verhalten Sonderfaelle:**
- Keine Coverage-Daten (kein `coverage-final.json` / `coverage.json`): Gate
  uebersprungen mit Hinweis "/bootstrap nachziehen fuer Test-Setup".
- Diff hat nur Test-Files / Configs / Docs: Gate uebersprungen.
- Diff hat 0 added lines: Gate uebersprungen.

**Konfiguration:** Schwellwerte sind als Konstanten im Skript (`COVERAGE_PASS=80`,
`COVERAGE_WARN=60`). Operator kann via env-vars override:
`COVERAGE_PASS=90 bash .claude/hooks/coverage-check.sh`.

**Laufzeit-Budget:** Skript-Lauf <2 Sekunden. Test-Lauf selbst kann mehrere
Minuten dauern — daher NICHT im Pre-Commit-Hook.

**6a-quint) Anti-Platzhalter-Check — Test-Qualitaet statt nur Test-Quantitaet (BOO-177)**

> **Tool-Kette:** `git diff --cached --name-only` -> Test-Datei-Filter -> hooks/anti-placeholder-check.py
> -> deterministischer Befund (Python-AST + JS/TS-Heuristik) -> Gate-Entscheidung.
> Gleiches Grundproblem wie BOO-176 ("Agent gamed das Gate"), hier auf Test-Ebene:
> triviale/leere Tests heben die Coverage-Zahl, ohne etwas zu testen.

**Wichtig:** Laeuft **nach** dem Coverage-Lauf (6a-quart), im Skill — NICHT im Pre-Commit-Hook.
Coverage misst *wie viel* Code getestet ist, der Anti-Platzhalter-Check ob *echt* getestet wird.
Es ist **kein Linter** (ESLint/Ruff pruefen Stil/Typen, nicht Test-Sinnhaftigkeit) — ein eigener,
gezielter Check nur auf Test-Dateien.

**Geprueft werden** nur die geaenderten Test-Dateien aus `git diff --cached`
(erkannt an `*.test.{js,ts,jsx,tsx}`, `*.spec.{js,ts}`, `test_*.py`, `*_test.py`, `tests/**`):

```bash
bash -c 'python3 .claude/hooks/anti-placeholder-check.py --strict'
# ohne Argumente erkennt der Check die gestageten Test-Dateien selbst
```

**Flaggt zwei Klassen:**
1. **Triviale/leere Tests** — `expect(true).toBe(true)`, `assert True`, `assert 1 == 1`,
   leerer Testkoerper (nur `pass` / `{}` / Docstring).
2. **Unbegruendete Skips** — `it.skip`/`test.skip`/`describe.skip`/`xit`/`xdescribe`,
   `@pytest.mark.skip`/`@pytest.mark.skipif` **ohne** `reason=` bzw. ohne Begruendungskommentar.

**Gate-Verhalten:**
- **0 Findings:** Gate bestanden — weiter zu Schritt 2 (Syntax & Laufzeit).
- **>=1 Finding (Block):** Gate **fail** — Platzhalter-Test durch echte Assertion ersetzen oder
  Skip begruenden (`reason=` / Kommentar), dann Iterations-Schritt 1 von 6a-quart wiederholen.
- **Operator-Override:** nur explizit + protokolliert — Befund + Begruendung als
  `override_audit`-Eintrag in `meta.json` festhalten (gleiche Disziplin wie BOO-176:
  die Test-Messlatte senkt nur der Operator, nie der Agent). Im `git diff --cached` ist
  kein Test-File enthalten -> Gate uebersprungen (`skipped_gates.anti_placeholder`).

**Doku in `meta.json`:** Iterationen unter `iterations.anti_placeholder`, ein
Skip-Grund unter `skipped_gates.anti_placeholder` (z.B. `"no test files in diff"`),
ein Operator-Override unter `override_audit[]`.

**Konfiguration:** Default = Warnung; `--strict` / `STRICT=1` macht jeden Treffer zum
Hard-Fail (im Gate immer strict). Projekt-Allowlist optional in
`.claude/anti-placeholder-check.local` (ein Glob pro Zeile; Praefix `path:` fuer zusaetzliche
Test-Pfade). Selbsttest: `python3 .claude/hooks/anti-placeholder-check.py --self-test`.

**Laufzeit-Budget:** <1 Sekunde (nur die geaenderten Test-Dateien, dependency-frei).

Schritt 2 — Syntax & Laufzeit:
- `node --check` auf alle geaenderten .js Files (Syntax-Fehler?)
- Falls Agent: 1x ausfuehren im DRY_RUN/TEST_MODE — laeuft er durch ohne Crash?
- Falls Library/Modul: Wird es korrekt importiert von allen Consumern?

**Hintergrund der 7 Tools:**
| Tool | Rolle | Wann aktiv |
|------|-------|-----------|
| **ESLint** (`.eslintrc.js`) | Definiert + prueft Coding-Regeln (Syntax, Security, Style) | CLI in Schritt 6a + passiv in VS Code |
| **Semgrep** (`.semgrep.yml`) | Pre-Commit-SAST mit Pack-basiertem Regelset | CLI in Schritt 6a-bis + Pre-Commit-Hook + CI-Layer |
| **Slopsquatting-Hook** (`.claude/hooks/dependency-check.sh`) | Supply-Chain-Pruefung (Existenz + Age + CVE) | Pre-Commit-Hook nach Semgrep, nur bei Manifest-Diff |
| **Coverage-Hook** (`.claude/hooks/coverage-check.sh`) | Diff-Coverage-Gate (>=80% added lines) | Wann aktiv: /implement Schritt 6a-quart, NICHT Pre-Commit-Hook |
| **Anti-Platzhalter-Check** (`.claude/hooks/anti-placeholder-check.py`) | Test-Qualitaet: flaggt triviale/leere Tests + unbegruendete Skips (BOO-177) | Wann aktiv: /implement Schritt 6a-quint, NICHT Pre-Commit-Hook |
| **SonarQube for IDE** (SonarLint) | Tiefere Security-Analyse, Code Smells, Bug-Patterns | Passiv im Editor waehrend Coding |
| **Error Lens** | Zeigt ESLint + SonarLint Findings inline in der Zeile | Passiv im Editor — kein Verstecken von Fehlern |

**6b) Akzeptanzkriterien + Linear-Kommentar** (PFLICHT)
- Jedes Akzeptanzkriterium aus der Issue-Description einzeln durchgehen
- Checkbox-fuer-Checkbox: Ist das Kriterium erfuellt? Evidenz notieren
- Falls ein Kriterium NICHT erfuellt: Fix implementieren oder Operator informieren
- **Linear-Kommentar schreiben** mit AC-Verification:
  ```
  ## AC-Verification
  - [x] AC 1: [Beschreibung] — ✅ [Evidenz]
  - [x] AC 2: [Beschreibung] — ✅ [Evidenz]
  - [ ] AC 3: [Beschreibung] — ❌ [Grund / was fehlt]
  ```

**6c) Architektur-Quick-Check**
- Nur die relevanten Dimensionen pruefen (siehe architecture-checklist.md)
- Fokus: Wurde etwas eingefuehrt das gegen bestehende Patterns verstoesst?
- Config-SSoT verletzt? Hardcoded Values statt config.js?
- Error Handling vorhanden wo noetig? (API-Calls, File I/O)

**6d) Smoke Test**
- Agent/Feature 1x real ausfuehren (nicht nur Syntax-Check)
- Output plausibel? Signal-File korrekt geschrieben?
- Keine unerwarteten Seiteneffekte auf andere Agents/Signals?

**6e) Security- und Privacy-Findings dokumentieren**

*Security-Block (immer):*
- Was wurde geprueft? (aus Schritt 3b Security-Checklist)
- Was ist sicher? Was wurde mitigiert?
- Offene Risiken die akzeptiert wurden?
- Bei LOW-Risk Stories genuegt: "Security: Keine neuen Angriffsvektoren"
- Abgleich mit `## Security Validation` aus der Story: Jede versprochene Validierung braucht Evidenz oder eine dokumentierte Ausnahme.
- **security-architect REVIEW (BOO-424):** Wurde bei einem Sensitive-Path-Treffer (Schritt 5.5) der REVIEW-Modus durchgelaufen? Pfad zum Report: `journal/reports/local/<run>/security-review.md` — HOCH-Befunde sind Blocker (gefixt oder als `review-ok:`-Ausnahme dokumentiert). Ohne Sensitive-Path-Treffer: `n/a — kein sensibler Pfad; deterministisches Every-Change-Gate = Semgrep (6a-bis)`.
- **Doku-Artefakte (SSoT-abgeleitet, BOO-229):** pruefen, welche der in `ARCHITECTURE_DESIGN.md §Referenzen` + `INDEX.md` registrierten Dateien durch die Aenderung aktualisiert werden muessen — die Liste kommt aus der **Single Source of Truth**, NICHT aus einer hier hartkodierten Aufzaehlung (frueheres Drift-Risiko: neue Artefakte wie `API_INVENTORY.md` mussten in jeder Skill-Liste nachgezogen werden). `bash scripts/doc-drift-check.sh` zeigt den Drift (registrierte Datei fehlt, erwartbares Artefakt unregistriert, Frische, lokal-vs-remote). Zusaetzlich die **nicht-Doku-Security-Konfig** pruefen, die nicht in der §Referenzen/INDEX-Tabelle steht: `.semgrep.yml`, `.claude/sensitive-paths.json`, `.codex/hooks.json`.

*Privacy-Block (PFLICHT bei `personal_data: true`, BOO-69):*
- Was wurde geprueft (Datenminimierung, Pseudonymisierung, Logging keine PII, Loeschmechanik, Consent)?
- Wurde der DPO REVIEW-Modus durchgelaufen? Pfad zum Report: `journal/reports/local/<date>_<story>/privacy.md`
- Abgleich mit `## Privacy Review` aus dem Spec (Schritt 5.5b): Jede dokumentierte Pruefung braucht Evidenz oder dokumentierte Ausnahme.
- Pruefen ob `PRIVACY.md`, `personal-data-paths.json`, ggf. DPIA unter `dpia/` durch die Aenderung aktualisiert werden muessen.
- Bei `personal_data: false` OHNE 5.5b-Pattern-Treffer: Privacy-Block kurz mit "n/a — Story beruehrt keine personenbezogenen Daten" abschliessen. Gab es einen Treffer (Reklassifizierungs-Stopp, BOO-427): den Entscheid dokumentieren — reklassifiziert ODER `privacy-ok: … Fehlalarm: …` mit Begruendung.
- **Onboarding-/Hub-Impact pruefen:** Pruefen ob `DEVELOPER_ONBOARDING.md` oder der Project Hub / PMO-Hub aktualisiert werden muessen. Trigger: neue Runtime-/Tool-Hinweise, geaenderte Zielarchitektur, neue Pflichtlektuere, geaenderte Backlog-/Issue-Arbeitsweise, neue Security-Regeln, neue Startpunkte fuer Umsetzung oder Handoff-relevante Annahmen. Ergebnis dokumentieren: aktualisiert oder "keine Aktualisierung noetig".

**6f) Ergebnis**
- **PASS:** Weiter zu Schritt 7 (Backlog-Record/Adapter → Done, Change-Log, Push)
- **FAIL:** Zurueck zu Schritt 5, Fix implementieren, erneut validieren
- Validation-Ergebnis als Kommentar/Ergebnisnotiz im Backlog-Record oder Adapter dokumentieren

**6g) Learn**
- Wenn ein Gate mehrfach fehlschlug, eine knappe Lesson in den aktiven Learning-Loop schreiben (`journal/learnings.md`, L2 oder L3 je nach `.learning-loop`).
- Wenn kein Learning-Loop aktiv ist: im Abschlussbericht notieren `Learning: SKIP bewusst — Learning-Loop nicht aktiviert`.
- Lesson-Format: Ursache, erprobter Fix, kuenftige Vorbeugung, betroffene Gate-/Tool-Kategorie.

Nach erfolgreicher Validation:
- Backlog-Record/Adapter → Done + Kommentar/Ergebnisnotiz (inkl. Validation-Ergebnis)
- Change-Log-Eintrag via Backlog-Adapter (Linear-MCP: `save_comment`; ein `linear.writeChangeLog()`-Tool existiert nicht, BOO-419)

**6f-bis) meta.json schreiben (BOO-36, erweitert um BOO-84 Token-Tracking)**

Am Ende des Runs — egal ob PASS, FAIL oder STOP — wird `meta.json` ins Run-Verzeichnis geschrieben. Audit-Spur fuer `/sprint-review`.

Seit BOO-84 enthaelt das Schema zusaetzlich **drei Ebenen Token-Tracking** (pro Iteration, pro Skill-Aufruf, pro Story) plus **Cache-Hit-Rate** und einen **Override-Audit-Trail**. Tatsaechliche Token-Werte werden idealerweise via Claude-Code-PostToolUse-Hook in `.claude/last-run-tokens.json` zwischengespeichert und beim meta.json-Schreiben gemerged — **diesen Hook liefert das Framework NICHT aus (geplant, BOO-419)**; der verdrahtete Ist-Mess-Pfad ist der ccusage-Snapshot (BOO-189). Wenn Hook nicht aktiv: Operator paste die Token-Counts manuell ein (Claude Code zeigt sie am Session-Ende an), oder die Felder bleiben `null` (kein Cost-Aggregat im Sprint-Review fuer diese Story).

```bash
RUN_COMPLETED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# RUN_FINAL_STATUS aus Schritt 6f setzen: "passed" | "failed" | "stopped_iteration_limit"
# ENVIRONMENT aus .claude/environment.json laden (mac/vps/ci) — Default "unknown" wenn Datei fehlt
ENVIRONMENT=$(jq -r .environment .claude/environment.json 2>/dev/null || echo "unknown")
# CHANGE_TYPE aus Spec-Frontmatter (Schritt 5.7) — Default "none" wenn nicht gesetzt
# SKIPPED_GATES_JSON wird in Schritt 5.7 / 6 pro uebersprungenem Gate gefuellt — Default "{}"
# BOO-424: security_review — Pfad zum security-architect-REVIEW-Report bei Sensitive-Path-Treffer
#   (Schritt 5.5), sonst "n/a — kein sensibler Pfad". Existenz gate-bar fuer /sprint-review.
if [ -f "${RUN_DIR}/security-review.md" ]; then
  SECURITY_REVIEW="${RUN_DIR}/security-review.md"
else
  SECURITY_REVIEW="n/a — kein sensibler Pfad; Every-Change-Gate = Semgrep"
fi

# BOO-84: Token-Tracking-Daten aus optionalem Hook-Cache laden, sonst leeres Skelett
TOKEN_CACHE=".claude/last-run-tokens.json"
if [ -f "$TOKEN_CACHE" ]; then
  TOKENS_JSON=$(cat "$TOKEN_CACHE")
else
  TOKENS_JSON='{"iterations": [], "skill_invocations": [], "story_totals": null, "cache_hit_rate": null}'
fi

# BOO-84: Override-Audit-Trail aus optionalem Cache laden, sonst leeres Array
OVERRIDE_CACHE=".claude/last-run-overrides.json"
if [ -f "$OVERRIDE_CACHE" ]; then
  OVERRIDE_JSON=$(cat "$OVERRIDE_CACHE")
else
  OVERRIDE_JSON='[]'
fi

cat > "${RUN_DIR}/meta.json" <<EOF
{
  "story_id": "${STORY_ID}",
  "change_type": "${CHANGE_TYPE:-none}",
  "started_at": "${RUN_STARTED_AT}",
  "completed_at": "${RUN_COMPLETED_AT}",
  "iterations": {
    "eslint": ${ITER_ESLINT},
    "tests": ${ITER_TESTS},
    "semgrep": ${ITER_SEMGREP},
    "coverage": ${ITER_COVERAGE}
  },
  "skipped_gates": ${SKIPPED_GATES_JSON:-"{}"},
  "final_status": "${RUN_FINAL_STATUS}",
  "environment": "${ENVIRONMENT}",
  "security_review": "${SECURITY_REVIEW}",
  "token_tracking": ${TOKENS_JSON},
  "override_audit": ${OVERRIDE_JSON}
}
EOF

# Nach erfolgreichem Schreiben: Caches loeschen, damit naechster Run frisch startet
rm -f "$TOKEN_CACHE" "$OVERRIDE_CACHE"
```

**Schema (erweitert durch BOO-68 change_type + skipped_gates und BOO-84 token_tracking + override_audit):**

```json
{
  "story_id": "BOO-15",
  "change_type": "api",
  "started_at": "2026-04-27T14:30:00Z",
  "completed_at": "2026-04-27T14:34:00Z",
  "iterations": {
    "eslint": 3,
    "tests": 2,
    "semgrep": 1,
    "coverage": 1
  },
  "skipped_gates": {},
  "final_status": "passed",
  "environment": "mac",
  "security_review": "n/a — kein sensibler Pfad; Every-Change-Gate = Semgrep"
}
```

**Non-Code Beispiel (`change_type: workflow`):**

```json
{
  "story_id": "BOO-72",
  "change_type": "workflow",
  "started_at": "2026-05-22T10:00:00Z",
  "completed_at": "2026-05-22T10:08:00Z",
  "iterations": {
    "eslint": 0,
    "tests": 0,
    "semgrep": 0,
    "coverage": 0
  },
  "skipped_gates": {
    "eslint": "non-code: change_type=workflow",
    "semgrep": "non-code: change_type=workflow",
    "dependency": "non-code: no manifest in diff",
    "coverage": "non-code: change_type=workflow"
  },
  "final_status": "passed",
  "environment": "mac",
  "token_tracking": {
    "iterations": [
      {
        "iteration_label": "step-6a-eslint-1",
        "skill_invoked": "implement-iterations",
        "model_used": "claude-haiku-4-5-20251001",
        "model_tier": "haiku",
        "input_tokens": 4500,
        "output_tokens": 800,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 12000
      }
    ],
    "skill_invocations": [
      {
        "skill_invoked": "implement-iterations",
        "model_tier_default": "haiku",
        "iterations_count": 3,
        "input_tokens_total": 13500,
        "output_tokens_total": 2400,
        "cache_creation_tokens_total": 0,
        "cache_read_tokens_total": 36000
      }
    ],
    "story_totals": {
      "input_tokens": 28000,
      "output_tokens": 5400,
      "cache_creation_tokens": 4500,
      "cache_read_tokens": 72000,
      "estimated_cost_usd": 0.18
    },
    "cache_hit_rate": 0.85
  },
  "override_audit": [
    {
      "skill": "implement-iterations",
      "recommended_tier": "haiku",
      "actual_model": "claude-sonnet-4-6",
      "override_origin": "cli-flag",
      "operator": "tobias",
      "timestamp": "2026-04-27T14:32:00Z"
    }
  ]
}
```

**Feld-Konvention:**
- `story_id`: Issue-Key aus Linear (z.B. `BOO-36`)
- `change_type`: aus Spec-Frontmatter (Schritt 5.7). Werte: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content` (BOO-68)
- `started_at` / `completed_at`: ISO-8601 UTC (`date -u +%Y-%m-%dT%H:%M:%SZ`)
- `iterations.<gate>`: Anzahl Iterationen pro Gate, 0 wenn Gate uebersprungen
- `skipped_gates.<gate>`: Grund pro uebersprungenem Gate (z.B. `"non-code: change_type=workflow"` oder `"tools_available.eslint == false"`). Leer `{}` wenn nichts geskippt.
- `final_status`: `passed` (Gate alle gruen) | `failed` (Gate-Block ohne Iterations-Limit) | `stopped_iteration_limit` (Iteration 5 erreicht ohne gruen)
- `environment`: `mac` | `vps` | `ci` | `unknown` (aus `.claude/environment.json`)
- `token_tracking.iterations[]`: pro Iteration eine Zeile — feinster Drill-Down
- `token_tracking.skill_invocations[]`: pro Skill-Aufruf aggregiert
- `token_tracking.story_totals`: gesamte Story-Summe + USD-Cost (Pricing aus `bootstrap/references/model-tiers.json`)
- `token_tracking.cache_hit_rate`: `cache_read_tokens / (input_tokens + cache_read_tokens)` — Optimierungs-Effekt
- `override_audit[]`: jedes Mal wenn der Operator das empfohlene Modell uebergeht (CLI-Flag oder CLAUDE.md), wird hier protokolliert
- `override_audit[].override_origin`: `cli-flag` | `claude-md` | `none` (none bedeutet: empfohlenes Tier wurde genutzt, normalerweise kein Eintrag)

**Verantwortlichkeiten (BOO-84):**
- Claude-Code-PostToolUse-Hook (optional; **geplant, nicht ausgeliefert — BOO-419**) schreibt `.claude/last-run-tokens.json` und `.claude/last-run-overrides.json` waehrend des Runs.
- `/implement` Schritt 6f-bis mergt diese in `meta.json` und loescht die Caches.
- Wenn Hook nicht aktiv: Felder bleiben leer (`token_tracking: { ... cache_hit_rate: null }` und `override_audit: []`). Kein Story-Lauf blockiert, aber Sprint-Review zeigt fuer diese Story kein Cost-Aggregat.
- USD-Cost-Berechnung passiert OPTIONAL im `/sprint-review`-Skill mittels `bootstrap/references/model-tiers.json` — Pricing zentral, nicht in jeder meta.json dupliziert.

**Wichtig — Verantwortlichkeits-Trennung:**
- `/implement` schreibt NUR raw Outputs nach `journal/reports/local/` — inkl. `meta.json`.
- `/sprint-review` LIEST `journal/reports/local/` + `ci/` und aggregiert zu `journal/sprint-{date}.md` (L2). In einer zweiten Phase parsed `/sprint-review` die aggregierten Daten in `journal/learnings.db` (L3).
- **`/implement` schreibt NICHT direkt in `learnings.db`.** Diese Trennung haelt Implement schnell (kein DB-Lock, kein Schema-Wissen) und macht Sprint-Review zum Single Writer der Learnings-DB.

**6g) Intent-Verifikation**

> Dieser Schritt wird nur ausgefuehrt wenn `intents/INTENT-XX.md` im Projekt existiert.

1. Aktive `intents/INTENT-XX.md` laden
2. Pro Metrik im Intent:
   - Aktuellen Wert messen (Monitoring, Tests, Logs — je nach Metrik-Typ)
   - Ins Spec-File eintragen (unter `## Intent-Verifikation`):
     ```
     - Metrik: [Name]. Ziel: [Zielwert]. Messung: [Ist-Wert] [✅/⚠/❌]
     ```
3. Wenn alle Metriken ✅ → im Linear-Kommentar als "Intent: alle Metriken erreicht" notieren
4. Wenn Metriken ⚠ oder ❌ → Hinweis: "Intent-Metrik [X] nicht erreicht — neue Story zur Nacharbeit empfohlen?"

**Blockt nicht.** Selbst wenn eine Metrik schlechter geworden ist, geht der Commit durch. Der Measure-Loop dokumentiert nur, damit die naechste Story gezielt gegensteuern kann. (Schrader: "Nach jedem KI-Output fragt sich das Team: Erfuellt das unseren Intent?")

**6h) Remote-CI-Loop — Validate-Fix-Learn gegen GitHub Actions (BOO-147)**

> **Zweck:** Die lokalen Gates (6a–6a-quart) pruefen nur die lokale Maschine (Pre-Commit-Hooks, Linter, Tests). CI-spezifische Fehler — falsche Token-Syntax in Workflow-YAML, Container-Checkout-Fehler, im CI-Runner fehlende Pakete, Umgebungs-Drift — schlagen erst in GitHub Actions zu und bleiben sonst unentdeckt bis zum manuellen Debugging. Dieser Loop ist das **Remote-Pendant zum lokalen Validate-Fix-Learn-Loop**: Er wartet nach dem Push auf das CI-Ergebnis und iteriert bei Failure dieselbe `Validate -> Interpret -> Decide -> Fix -> Re-Validate`-Schleife — nur gegen die Remote-Pipeline statt gegen die lokalen Gates.

> **Anker:** Der Code wurde in Schritt 5 ("Git Commit + Push") remote gepusht; Spec-Commits (Session-Referenz, ggf. Human/Privacy Review) folgen ebenfalls als Push. Dieser Loop laeuft **nach dem letzten Push** dieses Runs — also nachdem 6f PASS gemeldet und 6f-bis `meta.json` geschrieben hat. Wenn `/implement` ohne Push lief (reiner Doku-Lauf, Daemon-Dry-Run, oder Push wurde uebersprungen): Loop ueberspringen.

**Graceful Degradation (kein Hard-Fail) — zuerst pruefen:**

1. **`gh` installiert?** `command -v gh` leer → Skip mit Hinweis: "Remote-CI-Loop uebersprungen — GitHub CLI (`gh`) nicht installiert. Empfehlung: `gh` installieren + `gh auth login`, oder CI-Status manuell in GitHub pruefen."
2. **`gh` eingeloggt?** `gh auth status` schlaegt fehl → Skip mit Hinweis: "Remote-CI-Loop uebersprungen — `gh` nicht eingeloggt (`gh auth login`)."
3. **Remote vorhanden + gepusht?** Kein `origin`-Remote (`git remote get-url origin` leer) oder es lief gar kein Push in diesem Run → Skip mit Hinweis: "Remote-CI-Loop uebersprungen — kein Remote/kein Push."
4. **Workflows im Repo vorhanden?** Zwei Faelle, die NICHT gleich behandelt werden duerfen (0-Checks-Falle, [HANDBUCH Anhang BR §BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.md#br-gate-faustregel-anwesenheit-von-gruen-boo-506)):
   - **Keine Workflows im Repo** (kein `.github/workflows/`-Verzeichnis oder keine `*.yml`/`*.yaml`-Dateien darin) → Skip ok, mit Hinweis: "Remote-CI-Loop uebersprungen — keine GitHub-Actions-Workflows im Repo."
   - **Workflows vorhanden, aber 0 Runs/Checks fuer den gepushten Commit** → **KEIN Skip.** Das ist kein fehlendes Vorbedingungs-Setup, sondern ein Befund: weiter zur Anwesenheits-Vorstufe unten, die den Fall als `RUN_CI_STATUS="no_checks_reported"` behandelt.

In den echten Skip-Faellen (1–3 sowie "keine Workflows im Repo"): **kein STOPP, kein FAIL** — Hinweis im Output + `meta.json.skipped_gates.remote_ci` mit Grund setzen, dann weiter zu Schritt 7. `meta.json.skipped_gates.remote_ci` darf den 0-Checks-Fall (Workflows vorhanden, aber keine Checks am Commit gemeldet) **NIE** als Skip oder pass fuehren — dieser Fall wird ausschliesslich als `no_checks_reported`-Befund protokolliert (siehe Anwesenheits-Vorstufe + Persistenz unten).

**Anwesenheits-Vorstufe (Pflicht, VOR `gh run watch`) — Existenz erwarteter Checks pruefen (BOO-510):**

> **Faustregel ([HANDBUCH Anhang BR §BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.md#br-gate-faustregel-anwesenheit-von-gruen-boo-506)):** «Ein Gate darf nie auf die Abwesenheit von Rotem prüfen. Es muss die erwarteten Checks namentlich einfordern — ‹nicht gemeldet› ist ein Fehler, kein Erfolg.» `gh run watch --exit-status` prueft nur den ERFOLG eines CI-Laufs, nicht dessen EXISTENZ: Gibt es fuer den gepushten Commit gar keinen Run, kann der Loop das als «kein Failure» fehldeuten — und winkt genau dann durch, wenn die Pruef-Maschinerie ausgefallen ist.

```bash
# Anwesenheits-Vorstufe: gibt es fuer den gepushten Commit ueberhaupt Checks?
SHA=$(git rev-parse HEAD)
# Trigger-Latenz abfedern: bis ~60s pollen, bevor 0 als Befund gilt
for i in 1 2 3 4 5 6; do
  CHECK_COUNT=$(gh api "repos/{owner}/{repo}/commits/${SHA}/check-runs" --jq .total_count)
  [ "${CHECK_COUNT:-0}" -ge 1 ] && break
  sleep 10
done
# Alternative auf PR-Ebene: Zeilen von `gh pr checks <pr-nummer>` zaehlen
if [ "${CHECK_COUNT:-0}" -eq 0 ]; then
  RUN_CI_STATUS="no_checks_reported"   # 0 Checks ≠ gruen — eigener Zustand, NIE pass
fi
```

- **`CHECK_COUNT >= 1`:** Checks sind anwesend → weiter zum Iterations-Loop unten. `gh run watch` prueft jetzt den Erfolg von etwas, das nachweislich existiert («Anwesenheit von Gruen»), statt die Abwesenheit von Rot.
- **`CHECK_COUNT == 0` → `RUN_CI_STATUS="no_checks_reported"`:** NICHT gruen, KEIN pass, KEIN Skip. Typische Ursachen: **GITHUB_TOKEN-Anti-Rekursion** (der Push kam aus einem Workflow mit dem eingebauten Token — der Folgestand bekommt keine Checks, [§BR.6](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.md#br-github-token-kettenregel-boo-506)) · **`action_required`** (Laeufe existieren, warten aber auf Freigabe) · **falsch verdrahtete Trigger** (Workflow matcht Branch/Pfad/Event des Pushes nicht). Remediation nach [HANDBUCH Anhang T «0 Checks ≠ grün»](../docs/handbuch/anhang-t-post-install-verifikation-framework-installiert.md#t-0-checks-boo-501): wartende Laeufe finden (`gh run list --status action_required`) und freigeben (`gh api -X POST repos/<owner>/<repo>/actions/runs/<run-id>/approve`) **oder** die Checks manuell fahren (`gh workflow run <ci>.yml --ref <branch>`), danach die Vorstufe wiederholen. Bleibt es bei 0 Checks: **Operator-Eskalation** mit Befund (Commit-SHA, Workflow-Liste, vermutete Ursache) — NICHT weiter zu Schritt 7, als waere CI gruen; `final_status` wird in 6f-bis wie bei einem Gate-Fail gefuehrt, bis der Operator entscheidet.

**Iterations-Loop (Pflicht, wenn Vorbedingungen erfuellt und Anwesenheits-Vorstufe Checks bestaetigt hat):**

```bash
# Counter analog zu den lokalen Gates
ITER_CI=0
RUN_CI_STATUS="in_progress"

# Auf den CI-Run fuer den aktuell gepushten Commit warten (blockierend bis Abschluss)
ITER_CI=$((ITER_CI + 1))
gh run watch --exit-status \
  --workflow ci.yml 2>/dev/null \
  || gh run watch --exit-status   # Fallback ohne Workflow-Filter: juengster Run
```

1. **`gh run watch --exit-status`** wartet, bis der CI-Run abgeschlossen ist. Exit-Code 0 = CI gruen, Exit-Code != 0 = CI fehlgeschlagen.
2. **Bei CI gruen (Exit 0):** Loop bestanden — `RUN_CI_STATUS="passed"`, weiter zu Schritt 7.
3. **Bei CI-Failure (Exit != 0):**
   a. **Interpret:** `gh run view --log-failed` ausfuehren — nur die fehlgeschlagenen Steps/Jobs ausgeben (kompakter als der volle Log). Den Output lesen und die Ursache klassifizieren (Workflow-YAML-Syntax / Token-/Secret-Referenz / Container-Checkout / fehlendes Paket / echter Test-/Lint-Fail, der lokal nicht reproduzierte / Umgebungs-Drift).
   b. **Decide + Fix:** Fix nur fuer die **erkannte Ursache** formulieren (kein blindes Symptom-Patchen — gleiche Regel wie im lokalen Loop). Workflow-/Config-Aenderungen via Edit-Tool, Code-Aenderungen analog Schritt 5.
   c. **Re-Validate:** Fix committen + pushen, `ITER_CI` erhoehen, erneut `gh run watch --exit-status` fuer den neuen Commit.
4. **Maximal 3 Iterationen.** Bei Iteration 3 ohne gruen: STOPP, **Operator-Eskalation** mit klarem Hinweis: welcher Job/Step persistiert, welche Fixes versucht wurden, der relevante `gh run view --log-failed`-Auszug, und warum die Fixes nicht griffen. Operator entscheidet (manueller Fix, CI-Config-Review, oder Story als Carry-Over markieren). `RUN_CI_STATUS="stopped_iteration_limit"`.

**Persistenz + meta.json (analog 6a/6f-bis):**
- Pro Failure-Iteration den `gh run view --log-failed`-Auszug nach `${RUN_DIR}/ci-iter${ITER_CI}.log` schreiben (raw Output fuer `/sprint-review`, gleiche Konvention wie `eslint-iter{N}.sarif`).
- `meta.json.iterations.remote_ci` = `${ITER_CI}` ergaenzen; bei echtem Skip `meta.json.skipped_gates.remote_ci` mit Grund setzen (z.B. `"gh not installed"`, `"no push in this run"`, `"no workflows in repo"`). **NIE zulaessig:** den 0-Checks-Fall als Skip oder pass fuehren — bei `RUN_CI_STATUS="no_checks_reported"` bleibt `skipped_gates.remote_ci` leer und der Zustand wird als `meta.json.remote_ci_status = "no_checks_reported"` protokolliert ([§BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.md#br-gate-faustregel-anwesenheit-von-gruen-boo-506): «nicht gemeldet» ist ein Fehler, kein Erfolg).
- Bei `RUN_CI_STATUS="stopped_iteration_limit"` oder `RUN_CI_STATUS="no_checks_reported"` wird `final_status` in 6f-bis entsprechend gefuehrt (CI-Fail und 0-Checks-Befund blockieren `Done` genauso wie ein lokaler Gate-Fail — `Done` erst wenn CI nachweislich gruen ist oder der Operator eine dokumentierte Ausnahme bestaetigt).

**Signal-Test-Rezept (dokumentiert — kein Live-PR noetig, BOO-510):** Der gefaehrliche Zustand fuer diese Vorstufe laesst sich gezielt provozieren, das Rezept existiert bereits im Framework: Ein PR, den ein Workflow mit dem eingebauten `GITHUB_TOKEN` oeffnet (z.B. die `*-refresh.yml`-Bump-PRs), bekommt wegen GitHubs Anti-Rekursion **keine automatische CI** — 0 Checks trotz vorhandener Workflows (Provokations-Rezept + Freigabe-Kommandos: [HANDBUCH Anhang T «0 Checks ≠ grün»](../docs/handbuch/anhang-t-post-install-verifikation-framework-installiert.md#t-0-checks-boo-501), BOO-501; Zustands-Systematik: [Anhang BR §BR.2/§BR.6](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.md#br-github-token-kettenregel-boo-506)). Erwartetes Loop-Verhalten in genau diesem Zustand: `RUN_CI_STATUS="no_checks_reported"` melden — **nicht** pass, **nicht** Skip. Meldet der Loop pass, ist die Anwesenheits-Vorstufe kaputt.

> **Verhaeltnis zum lokalen Loop:** 6a–6a-quart fangen ab, was lokal pruefbar ist; 6h faengt ab, was erst im CI-Runner sichtbar wird. Beide nutzen dieselbe Mechanik (iterieren bis gruen, Ursachen-getriebene Fixes, hartes Iterations-Limit, Operator-Eskalation). Lokaler Loop: max 5 Iterationen pro Gate. Remote-CI-Loop: max 3 Iterationen (CI-Runs sind teurer/langsamer — eine niedrigere Decke erzwingt fruehere Operator-Eskalation statt endloser Push-Schleifen).

### Schritt 7: Backlog-Update

- Pruefen ob durch die Umsetzung andere Issues im Backlog betroffen sind
- Falls ja: Descriptions aktualisieren (neue Abhaengigkeiten, geaenderte Voraussetzungen)
- Falls Issues obsolet geworden sind: Operator informieren

### Schritt 8: Ergebnis-Tabelle (PFLICHT)

Nach Abschluss IMMER eine Zusammenfassungs-Tabelle ausgeben:

```markdown
| Was | Status |
|-----|--------|
| Config-Aenderung | ✅ Detail |
| Code-Aenderung | ✅ Detail |
| Tests/Verifikation | ✅ Detail |
| Dokumentation | ✅ Detail |
| Onboarding / Project Hub | ✅ aktualisiert oder keine Aktualisierung noetig |
| Git Push | ✅ Commit-Hash |
| Linear → Done | ✅ |
| Obsidian Change-Log | ✅ |
```

Zeilen je nach Umsetzung anpassen. Jede Zeile mit Checkmark und kurzem Detail.
Der Operator soll auf einen Blick sehen was gemacht wurde, ohne nachfragen zu muessen.

Danach: **`## Zusammenfassung` im Spec-File befuellen** (`specs/{PREFIX}-XXX.md`).
Kein Fachjargon — so erklaert als wuerde man es einem Laien erzaehlen der das System nicht kennt.
3 Absaetze: (1) Was war das Problem? (2) Was wurde gebaut / wie funktioniert es? (3) Was aendert sich dadurch?
Dann committen: `git commit -m "docs: specs/{PREFIX}-XXX.md Zusammenfassung ergaenzt"`

### Schritt 9: Kosten-Snapshot (BOO-189)

Nach Story-Abschluss einen **Ist-Verbrauch** aus den lokalen Claude-Code-Logs erfassen — gemessen statt
geschaetzt:

- Aufruf: `bash .claude/hooks/ccusage-capture.sh "/implement <story-id>"` (Capture-Template aus dem Setup,
  intern `npx --yes ccusage@latest daily`). Haengt einen Token-/Kosten-Snapshot an
  `docs/financials/sprint-costs.md` an.
- **Soft-Gate:** schlaegt der Aufruf fehl (ccusage/npx nicht installiert, kein Log), **nur warnen** und die
  Story **nicht abbrechen** — die Ergebnis-Tabelle aus Schritt 8 bleibt gueltig.
- **Komplementaer zur Schaetzung:** dieser Ist-Wert ergaenzt das `token_tracking` der `meta.json`
  (Schritt 6f-bis), ersetzt es nicht.
- **Bekannte Grenze:** ccusage attribuiert Sub-Agent-Token (Task-Tool) evtl. nicht sauber (Issues #313/#806/#950) —
  in stark sub-agent-getriebenen Laeufen ist der ausgewiesene Verbrauch evtl. unvollstaendig bzw. dem Parent
  zugeschlagen.

## Aenderungs-Checkliste (PFLICHT nach jeder Code-Aenderung)

Siehe [references/change-checklist.md](references/change-checklist.md)
