---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: insights-review
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Calls Anthropic's native /insights as an operator-reflection companion to the sprint review and
  integrates a clearly separated meta block into journal/sprint-{date}.md. Boundary (ADR-3):
  /sprint-review = what the PROJECT learned (repo-versioned); /insights = how the OPERATOR worked
  (local). Activated via complement_insights: true in the CLAUDE.md native_paths block (BOO-199,
  switch B). Use when the operator says "insights-review", "operator reflection", or wants the
  complement_insights companion to the sprint review.
version: 1.0.1
metadata:
  hermes:
    category: governance
    tags: [insights, sprint-review, operator-reflection, complement-insights]
    related_skills: [sprint-review, bootstrap]
---

# Insights-Review

A lean companion to `/sprint-review`: calls Anthropic's native `/insights` and integrates its operator
reflection as a clearly separated meta block in the sprint report. The skill **does not rebuild
`/insights`** (build-vs-buy, ADR-1) — it ties it to the sprint rhythm and keeps the boundary clean.

## The boundary (ADR-3) — why separate

| Dimension | `/sprint-review` (framework) | `/insights` (Anthropic-native) |
|---|---|---|
| Question | What did the **project** learn? | How did the **operator** work? |
| Source | Story outputs, learning loop L1/L2/L3 | Local usage logs |
| Output | `journal/sprint-{date}.md`, audit-ready | Pattern report, session-based |
| Persistence | In the repo, versioned | Local |
| Frequency | Per sprint | Monthly or on demand |

Project lesson → learning loop (repo). Operator reflection → this meta block (from `/insights`, local).
Never mix them — see ADR-3 (Automemory vs Learning-Loop).

## Activation

- Flag `complement_insights` from the project `CLAUDE.md` `native_paths` block (BOO-199). Default
  `true`. **Switch-A coupling:** active only when `runtime_target: claude-code`.
- Called from `/sprint-review` **step 7d** (only when the flag is active), or directly by the operator.

## Workflow

1. **Check the flag** — `complement_insights: true` and `runtime_target: claude-code`? Otherwise skip
   with a log note.
2. **Call `/insights`** — Anthropic's native engine; the operator confirms the call (operator-local
   data). If `/insights` fails or the operator declines → skip, no hard block.
3. **Integrate the meta block** — write the block below into `journal/sprint-{date}.md`, **separate**
   from the learning-loop entry (step 8 of the sprint review). The block is marked as operator
   reflection, not a project lesson.

## Meta-block template (`journal/sprint-{date}.md`)

```markdown
## Operator reflection (/insights — complement_insights)

> Operator working patterns of this sprint period — local from /insights, **not** project knowledge
> (boundary ADR-3). Does not travel as a lesson into team knowledge.

- **Working patterns:** <what /insights shows about the way of working>
- **Friction points:** <where time/tokens/context were lost>
- **Next operator change:** <one concrete, personal adjustment>
```

## Boundary

- **`/sprint-review`** writes the project learning-loop entry (step 8). `insights-review` only adds the
  operator-reflection block — it does not replace or alter the learning loop.
- **Comparison doc** "Sprint Review vs /insights" in the HANDBUCH = BOO-211 (Appendix AO).
- **Flag definition** `complement_insights` = BOO-199 (5a), the CLAUDE.md `native_paths` block.
