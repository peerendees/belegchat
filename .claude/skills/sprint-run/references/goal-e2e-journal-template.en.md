---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# E2E journal — `/goal` sprint (fill-in)

> **Fill-in operator journal.** This file mirrors the steps from
> [`goal-e2e-protocol.en.md`](goal-e2e-protocol.en.md) and makes them recordable. Before the run,
> set up the throwaway test project per [`goal-e2e-fixture.en.md`](goal-e2e-fixture.en.md). The
> operator runs `/goal` themselves and records the **observed** state per step. A real autonomous
> run is **not** scriptable (LLM subagents) — this journal does not replace a CI test, it documents
> the manual run.

| Field | Value |
|---|---|
| Date | ____ |
| Operator | ____ |
| Test story (issue) | ____ |
| Branch | ____ |
| Model | ____ |
| Sprint ID | ____ |

---

## Phase A — Preparation (configurator)

### Step 1 — Start `/sprint-run` with the test story

- **Expected (protocol):** pre-flight green; `/quality-gate-audit --trigger pre-sprint` exit `0`.
- Observed: ____
- [ ] OK [ ] Deviation — note: ____

### Step 2 — Observe the three safety prerequisites

- **Expected:** allowlist (`.claude/settings.local.json`) present, `execution_isolation=git-worktree`
  confirmed, Layer-0 bodyguard live — otherwise abort/pause.
- Observed (allowlist): ____
- Observed (`execution_isolation=git-worktree`): ____
- Observed (bodyguard live): ____
- [ ] OK [ ] Deviation — note: ____

### Step 3 — Observe preparation

- **Expected:** worktree `../wt-<ISSUE>` created; `.claude/agents/<story>-<agent>.md` generated.
- Observed (worktree path): ____
- Observed (agent definition path): ____
- [ ] OK [ ] Deviation — note: ____

## Phase B — `/goal` call

### Step 4 — Observe the `/goal` call

- **Expected:** `/goal` starts with the single-story termination phrase (see
  [`goal-termination-phrases.en.md`](goal-termination-phrases.en.md)).
- Observed (phrase used): ____
- [ ] OK [ ] Deviation — note: ____

### Step 5 — Observe the subagent run

- **Expected:** story subagent implements `/implement` in the worktree, pushes, waits for CI.
- Observed (implement in worktree): ____
- Observed (push + CI wait): ____
- [ ] OK [ ] Deviation — note: ____

### Step 6 — Provoke gate-failure recovery (mandatory)

Pick a variant from [`goal-e2e-fixture.en.md`](goal-e2e-fixture.en.md) and record it:

- Chosen variant: [ ] ESLint (`no-unused-vars`) [ ] Semgrep finding
- **Expected:** gate red → worker agent fixes it itself (no operator intervention) → gate green
  again; the evaluator returned "not yet satisfied" before the fix.
- Observed (a) worker fixed it itself (no operator intervention): ____
- Observed (b) evaluator "not yet satisfied" before fix: ____
- Observed (c) termination phrase satisfied after fix: ____
- [ ] OK [ ] Deviation — note: ____

### Step 7 — Observe the gate assertion

- **Expected:** `meta.json` without unjustified `skipped_gates`; merge only afterwards.
- Observed (`meta.json` / `skipped_gates`): ____
- [ ] OK [ ] Deviation — note: ____

### Step 8 — Observe termination

- **Expected:** `/goal` terminates once the phrase is satisfied (issue done, gates green, merged).
- Observed (termination time/reason): ____
- [ ] OK [ ] Deviation — note: ____

## Phase C — Completion

### Step 9 — Observe completion

- **Expected:** `/sprint-run` aggregates `journal/sprint-<date>.md`; ccusage snapshot runs (or warns
  soft).
- Observed (sprint journal path): ____
- Observed (ccusage snapshot / soft warning): ____
- [ ] OK [ ] Deviation — note: ____

---

## Abort/pause paths (observe at least once)

### Sensitive-path pause

- **Expected:** have a story touch a path from `.claude/sensitive-paths.json` → `/goal` pauses,
  operator gives `review-ok` (also testable remotely). See
  [`gate-block-handling.en.md`](gate-block-handling.en.md).
- Observed (pause triggered): ____
- Observed (`review-ok` resumes): ____
- [ ] OK [ ] Deviation [ ] not tested — note: ____

### Missing safety prerequisite

- **Expected:** temporarily set `execution_isolation` to something other than `worktree` →
  `/sprint-run` aborts **before** the `/goal` call.
- Observed (abort before `/goal`): ____
- [ ] OK [ ] Deviation [ ] not tested — note: ____

---

## Result / DoD reconciliation BOO-203

DoD: **"A 1-story sprint runs through with `/goal`."** Each item is checked against the observed
steps above:

- [ ] **Configurator phase** completed (pre-flight + three safety prerequisites green) — steps 1–3
- [ ] **`/goal` handover** with termination phrase done — step 4
- [ ] **Native subagent execution** in the worktree observed — step 5
- [ ] **Gate-recovery loop** proven: gate red → worker fixes itself → evaluator "not yet satisfied"
  → green — step 6 (a/b/c)
- [ ] **Gate assertion** without unjustified skip before merge — step 7
- [ ] **Termination** by `/goal` once the phrase is satisfied — step 8

**Overall result:** [ ] passed [ ] not passed

**Filing:** record the filled-in state as a comment on the test story or in the sprint journal
(cf. [`goal-e2e-protocol.en.md`](goal-e2e-protocol.en.md), section "Result note").
</content>
