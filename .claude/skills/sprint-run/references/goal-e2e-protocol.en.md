---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Manual E2E validation protocol (`/goal` sprint)

> **Manual operator protocol.** This protocol is **not** buildable as an automated CI test — a real
> autonomous `/goal` sprint runs LLM subagents and is not scriptable. The operator executes the
> steps manually and records the observed states. Model: HANDBUCH validation protocols (cf. BOO-48,
> verify-setup + manual protocol).

Purpose: prove **end-to-end**, once, that `/sprint-run` (2.0.0) prepares correctly, `/goal`
orchestrates correctly and gate-failure recovery works — on **one** real story.

## Prerequisites

- A project with `/bootstrap` setup (incl. `.claude/settings.local.json` allowlist, BOO-203).
- `execution_isolation=git-worktree` in `CONVENTIONS.md`.
- `pre-edit-bodyguard` hook wired (Layer-0).
- A small, self-contained test story with a complete spec (incl. subagent section), e.g. a trivial
  function + test. Linear status `Todo`/`Backlog`.

## Procedure (1-story sprint)

| Step | Action | Expected state (record) |
|---|---|---|
| 1 | Start `/sprint-run` with the test story | Pre-flight green; `/quality-gate-audit --trigger pre-sprint` exit 0 |
| 2 | Observe the three safety prerequisites | allowlist present, `execution_isolation=git-worktree` confirmed, bodyguard live — otherwise abort/pause |
| 3 | Observe preparation | worktree `../wt-<ISSUE>` created; `.claude/agents/<story>-<agent>.md` generated |
| 4 | Observe the `/goal` call | `/goal` starts with the single-story termination phrase (see goal-termination-phrases.en.md) |
| 5 | Observe the subagent run | story subagent implements `/implement` in the worktree, pushes, waits for CI |
| 6 | **Provoke gate-failure recovery** (see below) | worker fixes the red gate, re-runs it; evaluator: "not yet satisfied" → loop until green |
| 7 | Observe the gate assertion | `meta.json` without unjustified `skipped_gates`; merge only afterwards |
| 8 | Observe termination | `/goal` terminates once the phrase is satisfied (issue done, gates green, merged) |
| 9 | Observe completion | `/sprint-run` aggregates `journal/sprint-<date>.md`; ccusage snapshot runs (or warns soft) |

## Gate-failure recovery step (step 6, mandatory)

So that the protocol really proves the **recovery loop**, trigger a gate failure artificially — one
of the two variants:

- **Semgrep failure:** Deliberately introduce a Semgrep finding into the test story (e.g. a pattern
  from `.semgrep.yml`, such as a hardcoded secret-like token in a comment-free path). Expectation:
  gate red → worker agent removes the finding → gate green again.
- **ESLint failure:** A deliberately lint-violating line (e.g. an unused variable under
  `no-unused-vars`). Expectation: gate red → worker fixes → gate green.

Record: **(a)** that the worker agent fixed it itself (no operator intervention), **(b)** that the
evaluator returned "not yet satisfied" before the fix, **(c)** that after the fix the termination
phrase was satisfied.

## Abort/pause paths (observe at least once)

- **Sensitive-path pause:** Have a story touch a path from `.claude/sensitive-paths.json` → `/goal`
  pauses, operator gives `review-ok` (also testable remotely). See `gate-block-handling.en.md`.
- **Missing safety prerequisite:** Temporarily set `execution_isolation` to something other than
  `worktree` → `/sprint-run` aborts **before** the `/goal` call.

## Result note

After the run, record the observed state per step (e.g. as a comment on the test story or in the
sprint journal). A passing run proves: configurator phase, `/goal` handover, native subagent
execution, gate-recovery loop, gate assertion and termination all work end-to-end.
