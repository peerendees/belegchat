---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: resolve-conflict
recommended_model: opus  # BOO-170 — conflict resolution is judgement work; mechanical classes may use haiku, the content recommendation opus
description: |
  Assisted resolution of merge conflicts. Reads the conflict (PR via `gh` or the local merge
  state), states the problem in plain language, auto-resolves mechanical conflicts via a vetted
  allowlist, and presents content conflicts with a recommendation only. Gates run before every
  release — no silent merge. Use when the operator says "resolve the merge conflict",
  "the PR has conflicts", "merge is blocked", or runs "/resolve-conflict".
version: 1.2.0
metadata:
  hermes:
    category: coding
    tags: [merge-conflict, git, quality-gates, collision-protection, allowlist]
    requires_toolsets: [terminal, git, gh]
    related_skills: [implement, sprint-run]
  effort_ai_hours: 5
  effort_human_equiv_hours: 20
---

# Resolve-Conflict

Resolve merge conflicts with assistance — the conflict handler `sprint-run` does not have today.

> **Plain language:** Until now the framework leaves you on your own at a merge conflict (`git merge --no-ff` silently falls back to "native Git, human resolves"). This skill reads the conflict, resolves the mechanical part itself, and hands you the substantive part with a recommendation. It invents no new capability — it codifies the routine you otherwise re-prompt at every conflict.

This is a **framework skill** (like `implement`/`goal`): it is also shipped to the customer. It belongs to conflict **resolution**; conflict *avoidance* lives on the other layers of collision protection → [`docs/kollisionsschutz-drei-ebenen.md`](../docs/kollisionsschutz-drei-ebenen.md).

## When to use this skill

- A `git merge`/`git rebase` or a PR merge reports conflicts and you want to resolve them guided instead of digging through markers by hand.
- Two parallel branches touched the same append-target file (`docs/INDEX.md`, `HANDBUCH.md`, `docs/releases/README.md`, a changelog) — the classic mechanical conflict.
- **Not** for conflict *avoidance*: that is layers 1/2/3 of collision protection (own clone / worktree / write scopes) and BOO-353/BOO-354.
- **Not** as a silent auto-merger: content conflicts are never resolved on their own, gates are never skipped.

## Workflow (6 steps)

### Step 0: Load environment + autonomy

1. Read `CONVENTIONS.md` (`governance_mode`) — it drives the **autonomy level** (step 2). Fallback: `governance_mode=standard`.
2. Read `.claude/environment.json` for `paths.*` and `tools_available.*` (`gh`, `git`). If a tool is missing, the associated path is skipped and noted in the output.
3. Determine the source: **PR mode** (argument is a PR number/URL → `gh pr checkout`) or **local mode** (an in-progress merge/rebase with conflict markers in the working tree).

### Step 1: Read the conflict and state it in plain language

**Plain-language duty (BOO-372):** The addressee is often **not a GitHub pro**. So **always start with an everyday-language picture** of **what** the problem is — with an analogy — **before** any technical detail (file names, markers, "DIRTY"). Jargon is explained immediately or avoided.

> **Everyday picture (default opener):** "Two people edit the same Word document, both change sentence 5 differently → the computer doesn't know which version is right and asks you." That first — and only then the technical mapping.

**Sequence:**

1. **The everyday picture first** (analogy above): what actually happened, without jargon.
2. List conflicted files: `git diff --name-only --diff-filter=U` (local) or from the PR merge state.
3. Per file, evaluate the conflict hunks (`<<<<<<< / ======= / >>>>>>>`): *our* side (HEAD/`ours`) vs. *their* side (`theirs`).
4. **Then the concrete plain-language report** per hunk — in everyday language, not raw markers: "Both sides changed the same spot in `file`: we → A, they → B."
5. **Next-step duty:** Every report ends with **one clear next step** in everyday language — not just a status diagnosis. E.g. "Say 'yes' and I'll merge the harmless cases" or "For this one you have to decide — A or B?".

### Step 2: Auto-resolve mechanical conflicts (allowlist)

Only **known, safe patterns** are resolved automatically. The full class list is the SSoT in [`references/allowlist.md`](references/allowlist.md). Core:

- **Two-sided append lines** in ordered lists/tables (changelog, release wave list, appendix table, `docs/INDEX.md`): keep both lines, sort them in correctly (union, not choice).
- **Wave-index head / version bump:** keep the higher version resp. both wave entries.
- **DE/EN parity files:** apply the same structural resolution to both language files.
- **Pure formatting** (whitespace, line endings, order of stable blocks).

Every auto-resolution is logged (which class, which file). If a hunk fits **no** allowlist class → it is a content conflict (step 3).

### Step 3: Content conflicts with a recommendation only

**Mechanical vs. content — separate them in layperson's words (BOO-372):** Do not report as a "K1/K2 allowlist class", but as an everyday distinction:

- **Mechanical** = "This is pure bookkeeping, I clear it myself" (e.g. both sides appended one line each at the bottom — you simply keep both).
- **Content** = "Here **YOU** must decide, because it is a substantive statement" (both sides say something different at the same spot — only a human knows what is meant).

**Sequence:**

1. For each non-mechanical hunk: diff of both sides + **rationale in everyday language** (what each side intends) + **proposal** (which side or combination, with why) + **clear next step** ("Which version should go in — yours or theirs?").
2. **Do NOT resolve on your own.** The human decides. The skill only writes after explicit approval.

### Step 4: Gates as a mandatory net (no silent merge)

Before every merge release, the existing quality gates run (tied to [`sprint-run/references/gate-assertion.md`](../sprint-run/references/gate-assertion.md)): lint/test/security by `change_type`, plus the merge-gate rule from [`sprint-run/references/worktree-flow.md`](../sprint-run/references/worktree-flow.md) (no merge without green remote CI + green gate assertion, never onto a dirty `main`).

**Negative rule:** if a gate is red, there is **no** release — the skill stops and reports the red gate. A red gate state is never overridable through a conflict resolution.

### Step 5: Dialable autonomy (solo → enterprise)

How far "mechanical = automatic" reaches depends on `governance_mode` (analogous to the gate staging):

| `governance_mode` | Mechanical classes | Content conflicts |
|---|---|---|
| `lite` (solo) | all allowlist classes auto | proposal, approval may be terse |
| `standard` | append/format classes auto, version/wave head with a short confirmation | proposal + explicit approval |
| `heavy` (enterprise) | every auto-resolution is confirmed individually | proposal + explicit approval + audit entry |

Default without `CONVENTIONS.md`: `standard`.

### Example plain-language dialog (tone template, BOO-372)

This is how a good report sounds — analogy → what's "boring" → where you must decide → next step:

> **What's going on:** Imagine two people editing the same Word document and both change sentence 5 — the computer doesn't know which version is right and asks you. That's exactly what happened here on your pull request.
>
> **What I clear myself (pure bookkeeping):** In the change list both sides appended one new line each at the bottom. Nothing to decide there — I just keep both. (3 such cases.)
>
> **Where I need you (one real decision):** In one file **your** version says "price = 99", the **other** says "price = 89". Both can be right — only a human knows.
>
> **Your next step:** For this one case, tell me: **99 or 89?** The rest (the 3 bookkeeping cases) I clear as soon as you say "go".

No jargon as the result; every report ends with exactly one clear next step.

## Scope boundary

- **No new capability** — codifies the recurring prompt plus a vetted routine.
- **No auto-merge of content conflicts, never a silent merge.**
- **No conflict avoidance** — that is BOO-353 (multi-session protection) and BOO-354 (rebase hardening in `sprint-run`).
- **Wiring as `sprint-run` merge handler:** callable standalone **and** since **BOO-354** fixed into `sprint-run` — the rebase-before-merge step hands rebase conflicts to this skill ([`sprint-run/references/worktree-flow.en.md`](../sprint-run/references/worktree-flow.en.md)).

## References

- Collision-protection hub: [`docs/kollisionsschutz-drei-ebenen.md`](../docs/kollisionsschutz-drei-ebenen.md) (resolution ↔ avoidance)
- `sprint-run`: [`sprint-run/references/worktree-flow.md`](../sprint-run/references/worktree-flow.md) · [`sprint-run/references/gate-assertion.md`](../sprint-run/references/gate-assertion.md)
- HANDBUCH **Appendix BC** · User FAQ §12 "How does the framework resolve merge conflicts?"
- Spec: [`specs/BOO-352.md`](../specs/BOO-352.md) · Allowlist: [`references/allowlist.md`](references/allowlist.md)
