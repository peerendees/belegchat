---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# infrastructure-onboarding

> Framework bundle skill — guided 13-layer infrastructure reconciliation on the **propose-and-confirm** principle. Origin: BOO-223 (2026-06-19), output of BOO-217.

**Version:** 1.0.0 · **Command:** `/infrastructure-onboarding`

> **Claude Code mode:** `/infrastructure-onboarding` writes into the §5b table of `ARCHITECTURE_DESIGN.md` (and optionally sub-MD skeletons) → supervised **`acceptEdits`** (the skill confirms every layer proposal with the operator before writing). No unattended operation. Details: HANDBUCH §6 "Claude Code mode".

## What the skill does

`infrastructure-onboarding` decides the **13 infrastructure layers** (frontend, APIs, database, caching/CDN, hosting, cloud/compute, CI/CD, rate limiting, IAM, security/RLS, monitoring, rollback/recovery, audit/SLA) for a concrete project — guided, but without a 13-question grind.

Instead of an empty questionnaire, the skill **first reads everything the project already describes** (intent, `ARCHITECTURE_DESIGN.md` incl. the §5b table + §5, `CONVENTIONS.md`, `.claude/environment.json`, `CONTEXT.md` and the stack-neutral **catalog** from BOO-220). Then it makes **one concrete proposal per layer** from the role of an experienced architect — stack-/intent-aware, against the catalog's real mandatory questions + anti-patterns. The **operator confirms or overrides**, and the result lands in the §5b table.

**Propose-and-confirm = the model proposes (verifiable), the operator decides, the table records.**

## Core properties

- **Read list before every proposal** (mandatory) — no invented stack facts, missing sources are named.
- **Concrete proposals at runtime** — examples arise from the real stack and live only in the project table, **never** in the catalog (which stays stack-neutral).
- **Idempotent re-run** — existing decisions (`ok`/`n/a`) are mirrored, only deltas are asked.
- **Lazy-fill** — "later" is a valid answer; `/architecture-review` finds open layers again.
- **Anti-fabrication** — every proposal names the catalog question/anti-pattern it checks against; the operator always confirms before writing.

## Three moments, three tools

| Moment | Tool |
|---|---|
| One-time / updated full reconciliation of the 13 layers | **this skill** |
| Per-feature decision (a story touches a layer), lazy | `/ideation` (`change_type: infrastructure`) |
| Recurring drift check | `/architecture-review` (§5b) |
| Concrete VPS operations/hardening check | `/cloud-system-engineer` |

## Workflow (8 steps)

1. **Pre-flight + load read list** — §5b table + catalog present? Read the sources.
2. **Build the stack/intent profile** — compact profile from environment.json + CONVENTIONS + intent, operator confirms.
3. **Read the §5b table (idempotency anchor)** — mirror decided layers, mark open ones for a proposal.
4. **Propose per layer** — catalog question + stack profile → concrete proposal + anti-pattern warning.
5. **Confirm / override** — confirm / change / n/a (deliberate) / later.
6. **Write the §5b table** — only confirmed rows, §5 untouched.
7. **On-demand sub-MD skeleton** — depth only where needed (DB schema/IAM/recovery).
8. **Wrap-up + coverage** — how many layers ok/n/a/open; re-run hint.

## File structure

```
infrastructure-onboarding/
├── SKILL.md / SKILL.en.md       ← skill definition (8-step workflow, anti-fabrication)
├── README.md / README.en.md     ← this file
├── overview.excalidraw / .png   ← overview sketch (DE)
└── overview.en.excalidraw / .en.png ← overview sketch (EN)
```

## Background

The skill is the third stage of the infra-layer block: **catalog** (BOO-220, "what to ask") → **§5b table** (BOO-221, "where it lives") → **infrastructure-onboarding** (BOO-223, "how it gets filled"). Sibling skill to `knowledge-onboarding` (same pattern: read → propose → operator confirms → artifact). Source: clarification note BOO-217 (2026-06-18).
</content>

## Related

- The table this skill fills in: [architecture-design-template §5b](../bootstrap/references/architecture-design-template.en.md)
- The 13-layer catalogue behind it: [infrastructure-dimensions](../cloud-system-engineer/references/infrastructure-dimensions.en.md)
