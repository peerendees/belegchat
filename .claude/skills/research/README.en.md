---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

# Research — Deep Research for Claude Code

> One command (`/research <question>`) brings source-backed in-depth research to Claude Code: automatic 2-tier routing between fast WebSearch and Perplexity `sonar-deep-research`.

**Version:** 1.3.0 · **Command:** `/research`

> **Deutsche Version:** [README.md](README.md)

> **Claude Code mode:** `/research` calls external APIs (Perplexity, paid) and returns results → recommended **supervised** (`default`). No unattended operation because of API cost. Details: HANDBUCH §6 "Claude Code mode".

---

## What the skill does and which problem it solves

Claude Code has **no built-in deep research** — only a simple WebSearch. The deep-research feature from the Claude web app is not available in Claude Code. This skill closes the gap: it uses **Perplexity `sonar-deep-research`** as the deep-research engine (researches internally across dozens of sources, synthesizes, returns citations) and complements it with **Claude WebSearch** as a fast cross-check. The result: reliable, source-backed in-depth research right inside Claude Code.

---

## Installation

`research` is a **vendored bundle skill** of the intentron framework and is installed automatically by bootstrap (Phase 5) from the `intentron` repo into `~/.claude/skills/research/`. Manually:

```bash
mkdir -p ~/.claude/skills/research
cp -R research/* ~/.claude/skills/research/
```

**Prerequisite (DEEP only, BOO-452):** ONE of the two keys as an environment variable — `PERPLEXITY_API_KEY` (starts with `pplx-`, path A direct) OR `OPENROUTER_API_KEY` (starts with `sk-or-v1-`, path B via OpenRouter, slugs `perplexity/sonar*`) — see [references/perplexity-api.en.md](references/perplexity-api.en.md). Without a key the QUICK tier (WebSearch) keeps working; DEEP is unavailable — a conscious fallback, no hard gate.

---

## Modes / features

The skill routes automatically by question complexity:

| Tier | When | Engine | Duration | Cost |
|------|------|--------|----------|------|
| **QUICK** (default) | fact checks, "What is X?", current prices/data | Claude WebSearch (1-3 parallel searches) | seconds | $0 |
| **DEEP** | market analyses, comparisons, multi-aspect questions, explicit "deep" | Perplexity `sonar-deep-research` + WebSearch cross-check | 10-60 s | ~$0.01-0.05 |

Every answer contains: **Summary**, **Details**, **Sources** (separated into `[Deep Research]` / `[WebSearch]`), **Confidence** (high/medium/low) and the **tier** used.

---

## Background / motivation

In the intentron framework, bootstrap makes **Phase 4.10 (Domain Deep Research)** mandatory: domain knowledge is persisted before stories are written — AI operator teams have no distributed domain-expert knowledge, and this step compensates for that systematically (Schrader ch. 2). `/research` is the engine of this mandatory phase. So that a single `git clone` of the framework is self-contained, `research` has lived as a vendored bundle skill directly in the `intentron` repo since **BOO-219** (master remains `claudecodeskills`, via `publish_skill.py`).

---

## Sources

- Perplexity API (`sonar` / `sonar-deep-research`): https://docs.perplexity.ai
- OpenRouter (Sonar models via `perplexity/` slugs, verified 2026-07-12): https://openrouter.ai/docs/api-reference/overview · https://openrouter.ai/perplexity/sonar-deep-research
- Claude Code WebSearch (built in)

---

## File structure

```
research/
├── README.md                      ← German version
├── README.en.md                   ← This file
├── SKILL.md                       ← Skill definition (DE)
├── SKILL.en.md                    ← Skill definition (EN)
├── overview.excalidraw / .png     ← Overview diagram (DE)
├── overview.en.excalidraw / .png  ← Overview diagram (EN)
└── references/
    ├── perplexity-api.md          ← Perplexity API reference (DE)
    └── perplexity-api.en.md       ← Perplexity API reference (EN)
```

---

*Skill Version 1.3.0 | intentron Framework — vendored bundle skill (master: claudecodeskills)*
