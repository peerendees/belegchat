---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Termination phrase library (`/goal`)

Reference for `/sprint-run` step 5. A **termination phrase** is the machine-checkable description of
sprint end that `/sprint-run` hands to the native termination engine `/goal`. `/goal` runs until an
evaluator sees the phrase as satisfied.

## What makes a good phrase

A phrase is good when each of its clauses is **objectively checkable** — not "sprint done", but
concrete, observable states:

- **Issue status:** "all Linear issues status:done" (checkable via Linear adapter)
- **Quality gates:** "all gates green (Semgrep, ESLint, Coverage>=80%, GitHub Actions)" (checkable
  via gate exit codes / `gh run`)
- **Artifacts:** "journal/sprint-<date>.md written" (checkable via filesystem)
- **No open tasks:** "no open subagent tasks" (checkable via `/goal`'s internal task list)

Avoid vague terms ("clean", "good", "done") without a measurable criterion — the evaluator cannot
check them and the loop never terminates or terminates too early.

## Standard sprint phrase

```
/goal "Sprint <id> closed: all Linear issues status:done, all quality gates green
(Semgrep, ESLint, Coverage>=80%, GitHub Actions), journal/sprint-<date>.md written,
no open subagent tasks"
```

## Variants

### Python stack (pytest + Ruff instead of ESLint)

```
/goal "Sprint <id> closed: all Linear issues status:done, all quality gates green
(Semgrep, Ruff, pytest, Coverage>=80%, GitHub Actions), journal/sprint-<date>.md written,
no open subagent tasks"
```

### Single-story sprint (E2E validation, see goal-e2e-protocol.en.md)

```
/goal "Story <ISSUE> closed: Linear status:done, all quality gates green (Semgrep, ESLint,
Coverage>=80%, GitHub Actions), merged to main, meta.json without unjustified skipped_gates"
```

### With token boundary as an explicit terminator

The 80% boundary is part of the termination logic anyway (see `token-boundary.en.md`); for clarity
it can appear explicitly in the phrase:

```
/goal "Sprint <id> closed: all Linear issues status:done, all quality gates green,
journal/sprint-<date>.md written — OR token budget (80% context window) reached
(then leave remaining stories in the backlog)"
```

## Anti-patterns

- **Uncheckable phrase** ("sprint is done") — the evaluator has no criterion → no defined end.
- **Only issue status, no gates** ("all issues done") — may terminate on red code because the gate
  condition is missing.
- **Contradictory conditions** without OR — if two clauses are mutually exclusive, `/goal` never
  terminates.
- **Manual steps in the phrase** ("operator has reviewed") — approval pauses belong in the
  gate-block protocol (`gate-block-handling.en.md`), not in the termination phrase.
