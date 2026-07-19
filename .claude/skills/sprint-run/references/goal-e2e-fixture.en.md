---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# E2E fixture — throwaway test project for the `/goal` sprint

> **Reproducible operator runsheet.** Sets up a **throwaway** test project to play through the
> 1-story sprint from [`goal-e2e-protocol.en.md`](goal-e2e-protocol.en.md). After the run, fill in
> [`goal-e2e-journal-template.en.md`](goal-e2e-journal-template.en.md).
>
> **Honest note:** `/bootstrap` is an **LLM step**, not fully scriptable. This runsheet does not say
> "run this script", but **what the operator feeds `/bootstrap`**. The `/goal` run itself is not
> scriptable either (native subagents). The runsheet only prepares the deterministic artifacts
> (spec, test-story code, gate violations).

## 1 — Set up the test story (`/bootstrap` inputs)

The operator calls `/bootstrap` and provides these values (rationale in parentheses):

- **`execution_isolation = git-worktree`** in `CONVENTIONS.md` — safety prerequisite 2.2 (native
  subagents only write worktree-isolated in parallel; without `worktree` `/sprint-run` aborts before
  the `/goal` call).
- **`.claude/settings.local.json` allowlist** with the gate commands `semgrep`, `eslint`, `pytest`,
  `gh run`, `git` (template block ".claude/settings.local.json (BOO-203)" from
  `bootstrap/references/file-templates.md`) — otherwise every gate execution blocks on a permission
  prompt.
- **`pre-edit-bodyguard` hook** wired (entry in `.claude/settings.json` `hooks` + hook file present)
  — safety prerequisite 2.3; without it `/sprint-run` **pauses**.
- **Test story in Linear**, status `Todo` or `Backlog` (pre-flight: backlog prioritized, status
  `Todo`/`Backlog`).

## 2 — Trivial test story (spec in Schrader format)

A pure function `sum(a, b)` + one unit test. The spec carries the full execution-isolation block
(YAML frontmatter) and the agent-pattern/subagent section. Place it as `specs/BOO-E2E.md` (adjust
the issue slot to the real test issue):

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

> The spec body above stays in the project's working language (German), matching the real
> `specs/*.md` schema; only the runsheet prose is bilingual.

**Target implementation (what the worker produces in the worktree):**

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

## 3 — Provoke gate-failure recovery (two variants)

Per run, deliberately introduce **one** variant so the gate-recovery loop from step 6 of the
protocol actually fires. Expectation both times: **gate red → worker agent fixes it itself → gate
green** (no operator intervention; the evaluator returned "not yet satisfied" before the fix).

### Variant (a) — ESLint `no-unused-vars`

A deliberately lint-violating, unused variable in `src/sum.js`:

```javascript
// src/sum.js — Variante (a): provoziert ESLint no-unused-vars
function sum(a, b) {
  const unused = 42;        // <-- no-unused-vars: ESLint rot
  return a + b;
}

module.exports = { sum };
```

- **Expectation:** `eslint` reports `no-unused-vars` → gate red → worker removes the line
  `const unused = 42;` → `eslint` green.

### Variant (b) — Semgrep finding

A pattern Semgrep picks up as a finding — matching the protocol hint "a hardcoded secret-like token
in a comment-free path":

```javascript
// src/sum.js — Variante (b): provoziert ein Semgrep-Finding
function sum(a, b) {
  const apiKey = "EXAMPLE_FAKE_DO_NOT_USE_replace_with_a_pattern_your_semgrep_catches";   // <-- Semgrep: hardcoded secret
  return a + b;
}

module.exports = { sum };
```

- **Expectation:** `semgrep` flags the hardcoded secret as a finding → gate red → worker removes the
  token → `semgrep` green.

> Introduce exactly **one** of the findings per run. The worker agent (not the operator) must apply
> the fix — that is the proof of the recovery loop.

## 4 — Optional: abort/pause paths

- **Sensitive-path pause:** have a story (or the test story temporarily) touch a path from
  `.claude/sensitive-paths.json` → `/goal` pauses → operator gives `review-ok` (also remote). See
  [`gate-block-handling.en.md`](gate-block-handling.en.md).
- **Missing safety prerequisite:** temporarily set `execution_isolation` to something other than
  `git-worktree` → `/sprint-run` aborts **before** the `/goal` call.

## 5 — After the run

Record the observed state per step in
[`goal-e2e-journal-template.en.md`](goal-e2e-journal-template.en.md) and tick off the BOO-203 DoD
reconciliation. Delete the throwaway project afterwards (no product value).
</content>
