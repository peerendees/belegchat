---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

# Ideation — From Raw Idea to Well-Written Linear Story

> Workflow that turns a raw idea into a production-ready Linear issue — with research, architecture design document (ADD), dependency mapping, sprint-fit check, intent gate, privacy pre-flight, and token heuristic. No more "what did we actually agree on?" three weeks later.

**Version:** 2.16.0 · **Command:** `/ideation`

> **New in 2.15.0 (BOO-486):** the token heuristic (step 5b) reads `.claude/model-profile.yml` fresh (budget = `served_context × effective_fraction × budget_pct`, SSoT BOO-484), caps stories at the leaf budget (`× capability_factor`) and couples `effort_ai_hours` to the `reference_model`; without a profile: cloud default 200k + warning.

> 🔗 Sprint automation: **`/sprint-run`** runs a whole sprint and orchestrates the chain `backlog → implement → sprint-review`. See [`sprint-run/`](../sprint-run/README.en.md) · HANDBUCH Appendix AD.

> **Claude Code mode:** `/ideation` thinks and proposes (research, story, issue) → **`plan`** (plan mode): explore, you approve before any spec / Linear issue is written. No unattended operation. Details: HANDBUCH §6 "Claude Code mode".

---

## What It Does

Most teams write issues like chat messages: a headline, a paragraph, maybe acceptance criteria if you're lucky. Three weeks later, nobody remembers what "it" actually meant.

This skill runs a rigorous 9-step process: it loads the environment, runs soft pre-flights (architecture-doc freshness, learnings loop, intent gate, privacy), researches (when needed), reads the full architecture (all ADRs, not just the first few), checks the DB schema chain and domain context, creates an Architecture Design Document (ADD) for real features, flags when a decision needs a machine-enforced guard, drafts the story with sprint-fit scoring and a token heuristic (SP + execution mode), and only then — after operator approval — creates the Linear issue.

The output is a story that a teammate can pick up in six months and still understand the full context.

---

## The 9 Steps

| # | Step | What it enforces |
|---|------|------------------|
| 0 | **Load environment** | Read `.claude/environment.json` + `CONVENTIONS.md` (`governance_mode`, `execution_isolation`, paths, tool availability). Missing file: defaults + warning. |
| 0a | **Architecture-doc freshness (soft)** | Warns if `ARCHITECTURE_DESIGN.md` is older than the threshold (`architecture_doc_freshness_days`, default 30). No hard gate — operator can proceed (override documented in the story). |
| 0.5 | **Learnings context** | Only if `.learning-loop` is active (L1/L2/L3): mirror recent lessons-learned or sprint retros against the idea, warn on anti-pattern match. |
| 0.6 | **Intent gate** | Only if `intents/` exists: match the story idea against the active intent, assign a label (`on-intent` / `neutral` / `off-intent`). `off-intent` → story not created (override via "override intent" possible). |
| 0e | **Privacy pre-flight (BOO-69)** | Only if `PRIVACY.md` is active: `personal_data: true/false` in frontmatter; on `true` a DPO ASSESS hint + `privacy` label. |
| 1 | **Research (when needed)** | External facts get verified via `/research` before they become ACs. No "I think the API supports this." |
| 2 | **Context load (parallel)** | Backlog, `ARCHITECTURE_DESIGN.md` (full, §1–§8 + all ADRs), `SYSTEM_ARCHITECTURE.md`, DB schema-chain check, domain context (`docs/domain/`), similar-issue check |
| 3 | **Architecture Design Document** | Features get an ADD: components, data flow, infra impact, 8-dimension eval, ADRs, risks |
| 4 | **Story draft** | Combines ADD + story template (feature or fix/refactor); actively choose `Change-Type`, even for non-code stories |
| 5 | **Alignment + sprint-fit** | Dependencies (bidirectional), priority in context, SP estimate, WIP check, carry-over risk |
| 5b | **Token heuristic + SP + execution mode (BOO-39)** | Estimate token consumption, derive SP class + mode (`linear` / `sub-agents` / `agentic`), check execution isolation against `CONVENTIONS.md`, fill frontmatter. SP=8 → split the story. |
| 6 | **Finalize (after OK)** | Linear issue created + affected issues updated; **backlog-first IDs** (number comes from the backlog tool, then the spec file with exactly that number — BOO-154) |

> **Backlog-first against cross-session drift (step 6, BOO-154):** the story number comes **from the backlog tool** — create the issue first, **then** name the spec file `specs/<PREFIX>XXX.md` with **exactly that** number. Never guess numbers manually or assign them in parallel: with several sessions/developers working at once this causes number collisions + repo↔backlog drift. Check against the backlog tool before assigning (open + most recently assigned issues). This is the level-1/2 avoidance from the three-level collision protection → `docs/kollisionsschutz-drei-ebenen.md`.

---

## Intent Gate (Step 0.6)

When the project has `intents/` artifacts from `/intent`, ideation matches every idea against the active intent and assigns a label, recorded in the story body under `## Intent-Check`:

| Label | Criterion | Consequence |
|-------|-----------|-------------|
| **on-intent** | Story contributes directly to an intent metric | Story is created |
| **neutral** | Story is indirectly needed (infrastructure, tech debt, enabler) | Story is created WITH mandatory justification in the body |
| **off-intent** | Story does not contribute or contradicts the intent | Story is NOT created — reasoning + adjustment suggestion; operator can force "override intent" |

Binary on/off would be too harsh — infrastructure (auth refactor, DB migration) is never directly on-intent but must remain possible (→ `neutral` with justification).

---

## Token Heuristic + Execution Mode (Step 5b, BOO-39)

Before the Linear push, the skill estimates token consumption and derives story points and the execution mode from it. Signals: number of affected files, diff size, test/doc effort, cross-skill touches, reference-reading effort. Optionally calibrated via `journal/learnings.db` (L3, if at least 5 similar stories exist).

| Token estimate | Share of 80% budget | SP class | Execution mode |
|---|---|---|---|
| < 8k | ~5% | 1 | linear |
| 8–24k | ~10–15% | 2 | linear / sub-agents |
| 24–48k | ~20–30% | 3 | sub-agents |
| 48–96k | ~40–60% | 5 | agentic |
| > 96k | over 60% | 8 | **split the story** |

The operator confirms or corrects the estimate (hybrid question). Execution isolation is checked against `CONVENTIONS.md` (`linear` → `worktree_strategy: none`, `sub-agents` → `write-scope`/`git-worktree`, `agentic` → `git-worktree` + worktree plan). Frontmatter with `estimate`, `token_estimate`, `execution_mode`, `worktree_strategy`, `write_scopes`, and `estimation_basis` is written into the story spec; the Linear issue gets `estimate` plus a hint block.

---

## The Enforcement Check (Mandatory on Every New ADR)

Every new architectural decision triggers this question: **Is this enforced, or just documented?**

| Answer | Action |
|--------|--------|
| Machine-enforced (commit hook, self-healing check, config validation) | Note the guard's location in the story |
| Only documented | Automatically suggest a "Guard Story" as a separate 1-SP ticket |

Typical guard mechanisms:
- Commit hooks in `.claude/hooks/` (like spec-gate, exchange-guard)
- Self-healing architecture guard — extend with a new check
- Config validation in self-healing

This check runs automatically. You don't ask for it. Paper-only ADRs become guard stories.

---

## Sprint-Fit Scoring (Mandatory)

| Criterion | Rating |
|-----------|--------|
| Estimated story points | 1–5 SP (>5 → suggest splitting) |
| Sessions to Done | 1–2 sessions (>2 → too big, split) |
| Sprint fit | Does it fit alongside current sprint stories? (max 3–4 total) |
| WIP impact | Would taking it on push WIP > 2? |
| Carry-over risk | Low / Medium / High |

High carry-over risk → splitting suggestion attached.

---

## Trigger Phrases

- `/ideation`
- "I have an idea"
- "new feature"
- "we need X"
- "new story"

---

## Interfaces with Other Skills

| Upstream | What's provided | Downstream | What we deliver |
|----------|-----------------|------------|------------------|
| User idea | Raw description | `backlog` | New priority-ranked story |
| `research` | Facts, comparisons, API details | `implement` | Story + Spec with clear ACs and scope |
| `security-architect` (DESIGN) | Threat model for the change | `architecture-review` | Story ready for pre-check |
| `cloud-system-engineer` (Teammate) | Infrastructure impact assessment | | |

---

## Artifacts / Outputs

- **Linear issue** — fully filled template (feature or fix/refactor)
- **Architecture Design Document (ADD)** — attached as comment or `<details>` block for features
- **`specs/ISSUE-XX.md` placeholder** — sketched for implement to complete
- **Dependency updates** — bidirectional in affected issues
- **Guard Story** — whenever a new ADR needs machine enforcement
- **Story frontmatter** — `estimate`, `token_estimate`, `execution_mode`, `worktree_strategy`, `write_scopes`, `estimation_basis` (step 5b) plus `personal_data` (privacy pre-flight)

---

## Installation

```bash
cp -r ideation ~/.claude/skills/ideation
```

---

## File Structure

```
ideation/
├── SKILL.md                                      ← Skill definition (DE)
├── SKILL.en.md                                   ← Skill definition (EN)
├── README.md                                     ← German README
├── README.en.md                                  ← This file (EN)
└── references/
    ├── architecture-design-document.md           ← ADD template (DE)
    ├── architecture-design-document.en.md        ← English mirror
    ├── architecture-dimensions.md                ← 8 dimensions deep dive (DE)
    ├── architecture-dimensions.en.md             ← English mirror
    ├── story-template-feature.md                 ← Feature/agent template (DE)
    ├── story-template-feature.en.md              ← English mirror
    ├── story-template-fix.md                     ← Fix/refactor template (DE)
    ├── story-template-fix.en.md                  ← English mirror
    ├── token-heuristik.md                        ← Token-window heuristic (step 5b, DE)
    └── token-heuristik.en.md                     ← English mirror
```

