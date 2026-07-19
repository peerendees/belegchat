---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Token-Boundary — 80% logic + sprint budget

Reference for `/sprint-run` step 3 (budget planning) and the `/goal` termination (since 2.0.0 the
80% boundary is part of `/goal`'s termination logic, no longer a skill-owned loop).
Basis: HANDBUCH Appendix G (sprint-sizing mechanic, BOO-38/39/40).

## Principle: token box instead of time box

A sprint is **80% of the context window** of the model used — model-independent.
No burndown, no velocity, no story-points-per-sprint statistic. Outcome is measured via
intent fulfillment, not via token consumption.

| Threshold | Source (`environment.json`) | Effect |
|---|---|---|
| `token_warn_threshold` | default `70` | Soft warning: sprint is nearing its end |
| `token_hard_threshold` | default `80` | **Hard stop**: sprint boundary → `/sprint-review` |

## Budget planning (step 3)

1. **Read the model profile fresh (BOO-486):** `.claude/model-profile.yml` (BOO-485) →
   `served_context`, `effective_fraction`, `budget_pct`, `capability_factor` — on every run,
   never cache, never hardcode a window size.
2. Sprint budget = `served_context × effective_fraction × budget_pct` (formula SSoT:
   `docs/standards/context-window-management.en.md`, BOO-484 — reference only). Example with
   the cloud default profile: 200k × 1.0 × 0.80 = 160k. **Fallback without a profile:** exactly
   this cloud default from `bootstrap/templates/model-profile.yml` + a warning in the output.
3. Sum the `token_estimate` of all candidate stories (from the spec `Execution Isolation` block).
4. Move stories that blow the budget to the next sprint — **hint, no
   abort**. No story is secretly trimmed. **Exception (leaf budget, level A):** if a single
   story's `token_estimate` exceeds `leaf budget × capability_factor`, moving does not help —
   the story is **too big → split** (`/ideation` step 5b).
5. Order: `blockedBy` first, then priority.
6. Budget announcement: state the concrete token number + origin (profile or default) (SSoT §12).

## Boundary check (part of the `/goal` termination)

`/goal` continuously projects the cumulative consumption against `token_hard_threshold`. The
boundary is **part of the termination phrase/logic** — `/goal` terminates the sprint even if the
content phrase is not yet satisfied:

- **< 80%:** keep running (next/parallel stories).
- **≥ 80%:** `/goal` terminates → `/sprint-run` aggregates the journal and triggers
  `/sprint-review`, operator hint **"Sprint boundary reached"**. Remaining stories stay in the
  backlog for the next sprint.

> The boundary is **conservative**: better to stop one story earlier than to run into the
> context limit in the middle of a story. A started, not fully tested story is more expensive than a
> postponed one.

## Relation to story points

Percentage shares refer to the profile budget (BOO-486); the example column applies to the
cloud default profile (200k):

| SP | Budget share (example @200k profile) | Execution mode |
|---|---|---|
| 1 | ~5% | linear |
| 2 | ~10–15% | linear / sub-agents |
| 3 | ~20–30% | sub-agents |
| 5 | ~40–60% | agentic |
| 8 | >60% | **split** |

`/sprint-run` uses this estimate only for **ordering and boundary** — the actual
mode choice per story is made by `/implement` (step 0c) based on the spec block.

Sketch: `docs/sprint-run-flow.png` (HANDBUCH Appendix AD).
