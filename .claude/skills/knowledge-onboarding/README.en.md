---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# knowledge-onboarding

> Framework bundle skill — routes a project's existing documentation deterministically into the governance artefacts. Origin: BOO-137 (2026-06-03).

**Version:** 1.2.1 · **Command:** `/knowledge-onboarding`

> **Claude Code mode:** `/knowledge-onboarding` writes reference blocks and a manifest → supervised **`acceptEdits`** (the skill has its own per-file apply / diff gates). No unattended operation. Details: HANDBUCH §6 "Claude Code mode".

## What the skill does

`knowledge-onboarding` takes an existing knowledge package — GitHub repo, local folder, upload or chat-provided — and assigns each file to **the right place in the framework artefacts**. Instead of "analyse the repo and take everything over" (LLM whim, fabrication-prone, non-deterministic), the skill uses a **routing rubric (SSoT, Tier 0/1/2/3)** and a **persisted manifest** (`journal/knowledge-onboarding-map.yml`). On re-scan the manifest is read first — known files keep their routing, only new / changed ones are reclassified.

**Determinism = rubric + manifest + operator pinning.**

## Sketches — explained visually

Five explainer sketches in OWLIST design dive into the core concepts. The big picture is in `overview.png`; these sketches zoom into one concept each.

**1 · Problem → Solution** — deterministic, not LLM whim

![Problem → Solution](references/sketches/01-problem-loesung.en.png)

**2 · 3 adapters → one file list** — every source becomes the same normalised list

![3 adapters → one file list](references/sketches/02-adapter-funnel.en.png)

**3 · Tier waterfall** — every file falls through until exactly one category matches

![Tier waterfall](references/sketches/03-tier-wasserfall.en.png)

**4 · Manifest determinism** — re-scan reads the manifest first (re-read, not re-infer)

![Manifest determinism](references/sketches/04-manifest-determinismus.en.png)

**5 · Anti-fabrication** — propose, don't blindly apply

![Anti-fabrication](references/sketches/05-anti-fabrikation.en.png)

## When to use

- **Post-bootstrap.** Skeleton artefacts (CLAUDE.md / AGENTS.md / CONVENTIONS.md / ARCHITECTURE_DESIGN.md) exist.
- The customer brings **preliminary material**: GAP analyses, legal research, README, PLAN, `docs/`, design files, demo storyboards, handover, prompt library.
- **Trigger:** `/knowledge-onboarding`, or phase-7.6 hint after bootstrap, when block B set `bestands_doku_erkannt: true`.

## Usage (short)

```
/knowledge-onboarding
> Which source? (a/b/c)
> URL/path
> [skill scans, classifies, asks on tier-3 cases]
> Proposal table displayed
> Apply? [a/b/c/d]
> Manifest written, reference blocks in target artefacts, coverage report
```

## Workflow (8 steps)

1. **Adapter choice** (GitHub / local / chat) → unified file list
2. **Pre-flight** (project root, bootstrap trace, framework artefacts → Tier-0 exclusion)
3. **Read manifest** (determinism anchor; `pinned: true` protects)
4. **Classification** Tier 0/1/2/3 (Tier 3 = ambiguous → operator asks)
5. **Proposal table** (no auto-apply)
6. **Routing-apply** — default `reference` (docs-as-code), option `extract` with diff approval
7. **Write manifest** (committed, audit trail)
8. **Coverage check** (warning if skip > 50% or Tier 3 > 30%)

Details: [SKILL.en.md](SKILL.en.md).

## Routing rubric (short form)

| Tier | Category | Target artefact |
|---|---|---|
| 0 | Framework artefact / code | skip |
| 1 | Intent · GAP · Scope | `intents/` + `ARCHITECTURE_DESIGN.md §1` |
| 1 | Legal · Compliance | `SECURITY.md`/`GOVERNANCE.md` + DPO + ADR |
| 1 | Design · UI · Visual | `ARCHITECTURE_DESIGN.md §5` + `DESIGN.md` + ADR |
| 1 | Architecture · Plan | `ARCHITECTURE_DESIGN.md` + Backlog |
| 1 | Vocabulary · Context | `CONTEXT.md` + Component-Docs |
| 1 | Research | `docs/project/research/` |
| 1 | Demo · Storyboard · Pitch | `docs/project/demo/` |
| 1 | Onboarding · Handover | `DEVELOPER_ONBOARDING.md` |
| 1 | Prompt library | `docs/project/prompts/` |
| 4 | Decision taken | ADR `docs/domain/adrs/` (Tier 2 — content signal) |
| 3 | Ambiguous (≥ 2 matches or no match) | Operator asks |

Full rubric with keyword lists + examples: [references/routing-rubric.en.md](references/routing-rubric.en.md).

## Background

From the documentation review discussion (Tobias, 2026-06-03):
- **BOO-117** reads a source only for the stack hint — no completeness.
- **/architecture-review** reads code (8 checks), no human docs.
- **Appendix U / framework-upgrade** pulls framework skeletons into the repo but **does not** ingest the customer's knowledge package.
- Gap: no defined, repeatable flow "knowledge package → governance artefacts". Today ad-hoc, fabrication-prone, no coverage check.

Solution: this skill. Determinism via rubric (signals) + manifest (re-read instead of re-infer) + pinned operator corrections. Source: ADR `02 Projekte/Code-Crash Framework/Decisions/2026-06-03 Knowledge-Onboarding-Skill — Routing-Rubrik + Manifest-Determinismus.md` in the SecondBrain.

## File structure

```
knowledge-onboarding/
├── SKILL.md                      Workflow (DE)
├── SKILL.en.md                   Workflow (EN)
├── README.md                     README (DE)
├── README.en.md                  This file (EN)
├── overview.excalidraw           Sketch DE (OWLIST colors)
├── overview.png                  rendered
├── overview.en.excalidraw        Sketch EN
├── overview.en.png
└── references/
    ├── routing-rubric.md         Routing-table SSoT (DE)
    ├── routing-rubric.en.md      SSoT (EN)
    └── sketches/                 5 explainer sketches (OWLIST), DE + EN each
        ├── 01-problem-loesung.excalidraw/.png (+ .en)
        ├── 02-adapter-funnel.excalidraw/.png (+ .en)
        ├── 03-tier-wasserfall.excalidraw/.png (+ .en)
        ├── 04-manifest-determinismus.excalidraw/.png (+ .en)
        └── 05-anti-fabrikation.excalidraw/.png (+ .en)
```

## Sources

- Spec: [`specs/BOO-137.md`](../specs/BOO-137.md)
- ADR: SecondBrain `02 Projekte/Code-Crash Framework/Decisions/2026-06-03 Knowledge-Onboarding-Skill — Routing-Rubrik + Manifest-Determinismus.md`
- Linear: [BOO-137](https://linear.app/owlist/issue/BOO-137)
- HANDBUCH section "Knowledge-Onboarding"
- Related skills: [`ideation/`](../ideation/), [`architecture-review/`](../architecture-review/), [`intent/`](../intent/), [`pitch/`](../pitch/), [`dpo/`](../dpo/)
