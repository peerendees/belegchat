---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Worktree flow — one worktree per story

Reference for `/sprint-run` step 4.1 (preparation: create) and `/goal` (execution: merge +
cleanup). Each story runs in its own `git worktree` with its own branch — this is the **safety
boundary** for the native subagents (collision protection level 2,
`docs/kollisionsschutz-drei-ebenen.md`). `/sprint-run` creates the worktree **before** the `/goal`
call; merge and cleanup are done by `/goal` during execution.

## Why worktree instead of branch switching?

- **Isolation:** Each story has its own working tree — no `git checkout` back-and-forth,
  no accidental mixing of changes.
- **Parallel-capable:** With `parallel_story_limit > 1` multiple stories can run simultaneously in
  disjoint worktrees (disjoint `write_scopes` — since BOO-354 checked pairwise in the pre-flight,
  no longer merely assumed; pairwise disjoint check, see `orchestration-checklist.en.md`).
- **Clean `main`:** The main working tree stays untouched until a merge.

## Flow per story

```bash
# /sprint-run step 4.1 — create (own branch per story), BEFORE the /goal call
git worktree add ../wt-BOO-<n> -b feat/boo-<n>-<slug>

# /goal (story subagent) — in the worktree: /implement + remote CI wait
cd ../wt-BOO-<n>
# ... the story subagent implements /implement, pushes the branch, waits for green CI ...

# /goal — rebase before merge: pull the branch onto fresh main BEFORE merging (BOO-354)
# Divergence then shows early + small (at the story), not late as a big merge cascade.
cd ../wt-BOO-<n>
git fetch origin
git rebase origin/main      # on conflict: hand over to /resolve-conflict (BOO-352)

# /goal — merge ONLY on green CI + green gate assertion, then clean up
cd <repo-root>
git merge --no-ff feat/boo-<n>-<slug>      # or PR merge via gh
git worktree remove ../wt-BOO-<n>
git branch -d feat/boo-<n>-<slug>          # after successful merge
```

## Rules

- **Branch naming:** `feat/boo-<n>-<slug>` (or the `gitBranchName` suggested by Linear).
- **Rebase before merge (BOO-354):** mandatory — every story branch is rebased onto fresh
  `origin/main` directly before the merge gate. Rebase conflict → hand over to
  [`/resolve-conflict`](../../resolve-conflict/README.md) (BOO-352): mechanical conflict → skill
  resolves automatically (allowlist); content conflict → to the human with a recommendation.
  Automatic, because the gates run afterwards anyway; only on conflict does the human decide.
- **Merge gate:** no merge without green remote CI (BOO-148) + green gate assertion.
  "Green" means: the expected checks are **reported and green** — 0 reported checks
  are an error, not green (gate rule of thumb, HANDBUCH appendix BR §BR.5, BOO-506).
- **Cleanup is mandatory:** after merge `git worktree remove` + delete branch. Orphaned
  worktrees block later runs.
- **On error:** remove the worktree (or keep it for diagnosis and note it in the sprint report).
- **Dirty `main`:** never merge when the main tree is not clean — STOP.

## Three levels of collision protection (classification)

- **Level 1 — Multi-User:** own clone per person.
- **Level 2 — Multi-Session/Subagent:** `git worktree` per story ← *this is where `/sprint-run` + `/goal` act*.
- **Level 3 — Multi-Agent:** execution isolation + disjoint write scopes (`/implement` step 0c).

Sketch: `docs/story-breakdown.png` + `docs/github-integration.png` (HANDBUCH Appendix AD).
