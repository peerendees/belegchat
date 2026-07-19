---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# E2E-Fixture — Wegwerf-Test-Projekt fuer den `/goal`-Sprint

> **Reproduzierbares Operator-Runsheet.** Setzt ein **wegwerfbares** Test-Projekt auf, mit dem der
> 1-Story-Sprint aus [`goal-e2e-protocol.md`](goal-e2e-protocol.md) durchgespielt werden kann. Nach
> dem Lauf das [`goal-e2e-journal-template.md`](goal-e2e-journal-template.md) ausfuellen.
>
> **Ehrlicher Hinweis:** `/bootstrap` ist ein **LLM-Schritt**, nicht voll skriptbar. Dieses
> Runsheet sagt nicht „fuehre dieses Skript aus", sondern **womit der Operator `/bootstrap`
> fuettert**. Auch der `/goal`-Lauf selbst ist nicht skriptbar (native Subagents). Das Runsheet
> bereitet nur die deterministischen Artefakte (Spec, Test-Story-Code, Gate-Verstoesse) vor.

## 1 — Test-Story aufsetzen (`/bootstrap`-Eingaben)

Der Operator ruft `/bootstrap` und gibt diese Werte vor (Begruendung in Klammern):

- **`execution_isolation = git-worktree`** in `CONVENTIONS.md` — Sicherheits-Voraussetzung 2.2 (native
  Subagents schreiben nur Worktree-isoliert parallel; ohne `worktree` bricht `/sprint-run` vor dem
  `/goal`-Aufruf ab).
- **`.claude/settings.local.json`-Allowlist** mit den Gate-Commands `semgrep`, `eslint`, `pytest`,
  `gh run`, `git` (Template-Block „.claude/settings.local.json (BOO-203)" aus
  `bootstrap/references/file-templates.md`) — sonst blockiert jede Gate-Ausfuehrung an einem
  Permission-Prompt.
- **`pre-edit-bodyguard`-Hook** verdrahtet (Eintrag in `.claude/settings.json` `hooks` + Hook-Datei
  vorhanden) — Sicherheits-Voraussetzung 2.3; ohne ihn **pausiert** `/sprint-run`.
- **Test-Story in Linear** anlegen, Status `Todo` oder `Backlog` (Pre-Flight: Backlog priorisiert,
  Status `Todo`/`Backlog`).

## 2 — Triviale Test-Story (Spec im Schrader-Format)

Eine reine Funktion `sum(a, b)` + ein Unit-Test. Die Spec traegt den vollstaendigen
Execution-Isolation-Block (YAML-Frontmatter) und die Agent-Pattern-/Subagent-Sektion. Als
`specs/BOO-E2E.md` ablegen (Issue-Slot an den realen Test-Issue anpassen):

```markdown
---
story_id: BOO-E2E
title: sum(a, b) — triviale Test-Story fuer den /goal-E2E-Lauf
change_type: none
execution_mode: sub-agents
worktree_strategy: git-worktree
write_scopes:
  - src/sum.js
  - tests/sum.test.js
estimate: 1
token_estimate: 3000
estimation_basis: |
  Eine reine Funktion (~5 Zeilen) + ein Unit-Test (~8 Zeilen), kein Cross-Skill,
  keine Doku — bewusst minimal, nur als E2E-Vehikel fuer den /goal-Lauf.
---

# BOO-E2E — sum(a, b): triviale Test-Story fuer den /goal-E2E-Lauf

## Schrader-Prompt-Bestandteile

### Insight (Perceive)

Der `/goal`-Sprint braucht eine echte, aber risikofreie Story, um End-to-End belegt zu
werden (BOO-203): Konfigurator-Phase, `/goal`-Uebergabe, native Subagent-Ausfuehrung,
Gate-Recovery-Loop, Gate-Assertion und Termination. Eine reine Funktion ohne externe
Abhaengigkeiten ist dafuer das minimale Vehikel — sie traegt keinen Produktwert, nur die
Mechanik.

### Constraints

**Must:**
- Reine Funktion `sum(a, b)` in `src/sum.js`, keine Seiteneffekte, keine I/O.
- Ein Unit-Test in `tests/sum.test.js`, der `sum(2, 3) === 5` prueft.
- `change_type: none` (reiner Code, kein Non-Code-Pfad).
- Keine sensiblen Pfade beruehren (ausser fuer den optionalen Sensitive-Path-Pause-Test).

### Erfolgskriterien

1. `src/sum.js` exportiert `sum(a, b)` und liefert `a + b`.
2. `tests/sum.test.js` ist gruen (Linter + Test).
3. Kein Pflicht-Gate wird still uebersprungen (`meta.json` ohne unbegruendeten `skipped_gates`).

### Gewuenschtes Ergebnis

Der Story-Subagent setzt `/implement` im Worktree um, pusht, die Gates laufen gruen, `/goal`
merged nach `main` und terminiert. Der Operator beobachtet den Durchlauf und fuellt das
E2E-Journal.

## Definition of Done

- [ ] `sum(a, b)` implementiert, Test gruen
- [ ] Gates gruen, keine unbegruendeten Skips in `meta.json`
- [ ] Story nach `main` gemerged, `/goal` terminiert

## Security Impact

- **Change-Type:** none
- **Angriffsoberflaeche:** keine — reine arithmetische Funktion ohne I/O oder externe Aufrufe.
- **Sensitive Pfade:** keine.

## Security Validation

- Lokale Checks: `git diff --check`, ESLint, Semgrep, Unit-Test.
- Akzeptierte Risiken: keine.

## Akzeptanzkriterien

- [ ] AC1: `src/sum.js` exportiert `sum(a, b)` = `a + b`
- [ ] AC2: `tests/sum.test.js` prueft `sum(2, 3) === 5` und ist gruen
- [ ] AC3: `meta.json` ohne unbegruendeten `skipped_gates`

## Agent-Pattern

> **PFLICHT — Subagent-Sektion. Aus ihr generiert /sprint-run Schritt 4.2 die
> `.claude/agents/<story>-<agent>.md`.**

**Gewaehltes Pattern:** sub-agents (ein isolierter Story-Worker im Worktree `../wt-BOO-E2E`).

**Begruendung:** Die Test-Story braucht genau einen Worktree-isolierten Story-Worker, der `/implement`
ausfuehrt — kein Agent-Team, keine Parallel-Subagents. `write_scopes`: `src/sum.js` +
`tests/sum.test.js`. Gate-Liste: ESLint, Semgrep, Unit-Test.
```

**Soll-Implementierung (was der Worker im Worktree erzeugt):**

```javascript
// src/sum.js
function sum(a, b) {
  return a + b;
}

module.exports = { sum };
```

```javascript
// tests/sum.test.js
const { sum } = require("../src/sum");

test("sum adds two numbers", () => {
  expect(sum(2, 3)).toBe(5);
});
```

## 3 — Gate-Failure-Recovery provozieren (zwei Varianten)

Pro Lauf **eine** Variante bewusst einbauen, damit der Gate-Recovery-Loop aus Schritt 6 des
Protokolls wirklich feuert. Erwartung beide Male: **Gate rot → Worker-Agent fixt selbst → Gate
gruen** (kein Operator-Eingriff; der Evaluator lieferte vor dem Fix „noch nicht erfuellt").

### Variante (a) — ESLint `no-unused-vars`

Eine bewusst lint-verletzende, ungenutzte Variable in `src/sum.js`:

```javascript
// src/sum.js — Variante (a): provoziert ESLint no-unused-vars
function sum(a, b) {
  const unused = 42;        // <-- no-unused-vars: ESLint rot
  return a + b;
}

module.exports = { sum };
```

- **Erwartung:** `eslint` meldet `no-unused-vars` → Gate rot → Worker entfernt die Zeile
  `const unused = 42;` → `eslint` gruen.

### Variante (b) — Semgrep-Finding

Ein Muster, das Semgrep als Finding zieht — entsprechend dem Protokoll-Hinweis „ein hardcodiertes
Secret-aehnliches Token in einem Kommentar-freien Pfad":

```javascript
// src/sum.js — Variante (b): provoziert ein Semgrep-Finding
function sum(a, b) {
  const apiKey = "EXAMPLE_FAKE_DO_NOT_USE_replace_with_a_pattern_your_semgrep_catches";   // <-- Semgrep: hardcoded secret
  return a + b;
}

module.exports = { sum };
```

- **Erwartung:** `semgrep` zieht das hardcodierte Secret als Finding → Gate rot → Worker entfernt
  das Token → `semgrep` gruen.

> Genau **eines** der Findings pro Lauf einbauen. Der Worker-Agent (nicht der Operator) muss den Fix
> setzen — das ist der Beleg fuer die Recovery-Schleife.

## 4 — Optional: Abbruch-/Pause-Pfade

- **Sensitive-Path-Pause:** Eine Story (oder die Test-Story temporaer) einen Pfad aus
  `.claude/sensitive-paths.json` beruehren lassen → `/goal` pausiert → Operator gibt `review-ok`
  (auch remote). Siehe [`gate-block-handling.md`](gate-block-handling.md).
- **Fehlende Sicherheits-Voraussetzung:** `execution_isolation` temporaer auf etwas anderes als
  `git-worktree` setzen → `/sprint-run` bricht **vor** dem `/goal`-Aufruf ab.

## 5 — Nach dem Lauf

Den beobachteten Zustand je Schritt in
[`goal-e2e-journal-template.md`](goal-e2e-journal-template.md) eintragen und den
DoD-Abgleich BOO-203 abhaken. Das Wegwerf-Projekt danach loeschen (kein Produktwert).
</content>
