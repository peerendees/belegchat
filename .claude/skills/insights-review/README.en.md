---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Insights-Review — operator reflection as a sprint-review companion

> Calls Anthropic's native `/insights` and integrates a clearly separated operator-reflection block into `journal/sprint-{date}.md`. Boundary (ADR-3): `/sprint-review` = what the **project** learned (repo-versioned), `/insights` = how the **operator** worked (local).

**Version:** 1.0.1 · **Command:** `/insights-review`

## What the skill does

`/insights` is a native Claude Code engine for operator working patterns. Without a link to the sprint rhythm it stays unused — or its findings accidentally land in the project learning loop and mix operator reflection with project knowledge. This lean skill ties `/insights` to `/sprint-review` and keeps the boundary (ADR-3) clean: it rebuilds nothing (build-vs-buy), it calls and integrates a separated meta block.

## Activation

- Flag `complement_insights: true` in the project `CLAUDE.md` `native_paths` block (BOO-199, switch B). Default `true`, active only when `runtime_target: claude-code`.
- Called from `/sprint-review` **step 7d** (only when the flag is active) or directly by the operator.

## Boundary

- `/sprint-review` writes the project learning-loop entry; `insights-review` only adds the operator-reflection block.
- Comparison doc "Sprint Review vs /insights": HANDBUCH **Appendix AO** (BOO-211).

Details + meta-block template: [SKILL.en.md](SKILL.en.md). German: [README.md](README.md).
