---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

# Architecture Review — Architecture Dimensions Against One Story or the Whole System

> Review any story — or the entire system — against the active architecture dimensions (8 standard + active add-ons). Catches risks, tech debt, and scaling issues **before** they land in production.

**Version:** 1.18.0 · **Command:** `/architecture-review`

> **Claude Code mode:** `/architecture-review` is read-only analysis → **`plan`** (plan mode); findings / recommendations, no code. Details: HANDBUCH §6 "Claude Code mode".

---

## What It Does

Most teams only review architecture when something breaks. This skill turns architecture review into a routine checkpoint — for individual stories (Story Review) or the full system (System Review).

The skill forces Claude to read `ARCHITECTURE_DESIGN.md` end-to-end (§1–§6 plus optional add-on sections §7+ and every ADR) before making any judgment. No skimming, no "I've read enough." That rule alone prevents most bad calls.

**Two modes:**

| Mode | Trigger | What it produces |
|------|---------|------------------|
| **A — Story Review** | Before a story goes into `/implement` | Per-dimension status (OK / Warning / Critical), concrete recommendations, optional story changes |
| **B — System Review** | Quarterly or when planning a refactor | Full audit: strengths, risks, concrete tech debt, new issues for the backlog |

---

## The Architecture Dimensions

**8 standard dimensions** (always active):

| # | Dimension | What gets checked |
|---|-----------|-------------------|
| 1 | **Reliability** | Failure modes, retries, backoff, circuit breakers |
| 2 | **Data Integrity** | Schema contracts, migrations, referential integrity |
| 3 | **Security** | Auth boundaries, secret handling, attack surface |
| 4 | **Performance** | Latency budgets, hot paths, bottlenecks |
| 5 | **Observability** | Metrics coverage, logs, traces, alert rules |
| 6 | **Maintainability** | Coupling, clarity, dead code, duplication |
| 7 | **Testability** | Testability, coverage, contract tests |
| 8 | **Scalability** | Load behavior, horizontal scaling, bottlenecks |

**AI-Readiness** (standard dimension, BOO-7) — see its own section below.

**Add-ons** (only when activated at bootstrap): Privacy / GDPR, Cost Efficiency, Signal Quality, Compliance.

Add-ons are activated domain-specifically at bootstrap time — the active dimension list lives in `ARCHITECTURE_DESIGN.md §5`. The skill never blindly checks every dimension; it picks the ones relevant to the story at hand.

---

## AI-Readiness (Standard, BOO-7)

A dedicated standard dimension from Schrader *Code Crash* ch. 4. AI-readiness is a precondition for AI-assisted development and is checked on **every** story. `/bootstrap` anchors it proactively, `/architecture-review` validates it reactively.

**8 checks (4 principles + 4 anti-patterns):**

| Check | What gets checked |
|-------|-------------------|
| **P1 — Small, independent modules** | Modules <500 LOC, single purpose, no circular imports |
| **P2 — Explicit interfaces** | Typed boundaries, complete ADRs, no magic strings |
| **P3 — Testability as a precondition** | Coverage >=80% on new code (BOO-15), contract tests present |
| **P4 — Observable from day one** | JSON logging, current `/metrics` endpoint, alert rules defined |
| **AP1 — Grown monolith** | No monolith growth, no shared-state anti-pattern |
| **AP2 — Implicit knowledge** | No `console.log` in prod, complete ADRs |
| **AP3 — No real module boundaries** | No direct DB access from the wrong module, no circular imports |
| **AP4 — Tests as an afterthought** | Tests in the same PR, coverage gate green |

Detailed questions per check: `references/dimensions-detail.en.md §9.1–§9.8`. Single source of truth for principles and anti-patterns: `intentron/references/ki-architektur-prinzipien.md`.

---

## How It Works

```
Story / System under review
        │
        ▼
Read ARCHITECTURE_DESIGN.md §1–§6 (+§7+ add-ons) + all ADRs (enforced checklist)
        │
        ▼
Map the change to affected components
        │
        ▼
Evaluate relevant dimensions (standard + active add-ons, not always all)
        │
        ▼
Optional: add feature-flag hygiene + SonarQube Cloud findings
        │
        ▼
Output:  Status · Finding · Recommendation  (per dimension)
```

The enforced read-the-docs-first rule is the anti-pattern-breaker. Without it, reviews turn into gut checks. With it, every judgment ties back to a concrete ADR or design decision.

---

## Trigger Phrases

- `/architecture-review`
- "review the architecture"
- "does this fit architecturally?"
- "architectural check"
- "architecture audit"

---

## Interfaces with Other Skills

| Upstream (feeds into it) | What's provided | Downstream (consumes the review) | What we deliver |
|--------------------------|-----------------|----------------------------------|------------------|
| `ideation` | Story with ACs + proposed components | `implement` | Pass/Fail signal before code is written |
| `backlog` | Priority list of pending stories | `sprint-review` | Dimension-level findings feed the quarterly audit |
| `security-architect` (DESIGN mode) | Threat model for the change | `research` | Flags open questions that need deep research |

---

## Artifacts / Outputs

Per dimension reviewed:

```
### Dimension: Reliability
Status:        WARNING
Finding:       Retry logic on the Kafka consumer lacks exponential backoff.
               First-retry storm observed in staging at 4× normal load.
Recommendation: Add jittered exponential backoff (ADR-12 precedent).
                Create story: "RELI-43 — Add backoff to consumer retries"
```

A System Review additionally produces:
- **Strengths** — what is working well
- **Top 3 risks** — what to fix first
- **Tech debt score** — Low / Medium / High
- **Recommended issues** — new Linear tickets for the backlog

---

## Feature-Flag Hygiene (BOO-17)

The skill hunts for stale AI-code feature flags. It greps for `// AI-generated:` (or `# AI-generated:` for Python) in `src/` and `lib/`, then checks each `STORY_ID` comment found:

1. Is the feature flag `flag.{STORY_ID}` still active (in `config/flags.json` or env)?
2. How long has the flag been running (via `git log`)?
3. If stable in production for >72h: create a tech-debt issue to remove the flag and delete the `// AI-generated:` comments.

**Alarm threshold:** flag older than 7 days without removal → tech-debt issue with priority High.

---

## SonarQube Cloud Read Block (BOO-6)

**Read-only.** When SonarQube Cloud is configured, the skill calls the SonarQube REST API and enriches the review with findings — it writes **nothing** back. SonarQube Cloud remains the source of truth for security metrics.

**Prerequisite check** (all three must hold):
1. `sonar-project.properties` in the project root (set by `/bootstrap` block D.5, BOO-5)
2. `SONAR_TOKEN` in `.env` or as an environment variable
3. `tools_available.sonarqube_cloud` in `.claude/environment.json` is `true`

If a prerequisite is missing, the review continues without the SonarQube block (no hard error, just a note).

**What it fetches:** security hotspots (unresolved, per component) plus technical-debt ratio, reliability, security and maintainability ratings. Results appear as an extra "SonarQube" column in the review table. When `Hotspots > 5`, `sqale_debt_ratio > 5.0`, or `reliability_rating != "A"`, a recommendation block with a link to the SonarQube findings is added.

---

## Installation

```bash
cp -r architecture-review ~/.claude/skills/architecture-review
```

The skill activates automatically on the next Claude Code session.

---

## File Structure

```
architecture-review/
├── README.md                        ← This file
├── SKILL.md                         ← Skill definition (read by Claude Code)
└── references/
    └── dimensions-detail.md         ← Expanded criteria per dimension
```

---

## Changelog

### v1.18.0 (BOO-444)

Verification freshness in the review: the doc-grounding block (BOO-443) additionally checks the interface verification for freshness. One REST call per dependency in `ARCHITECTURE_DESIGN.md §Dependencies / Interfaces` (the same SSoT) against `context7.com/api/v2/libs/search`: a newer version in `versions[]` than the pinned one OR "Verified on" > 45 days → warning with library, pinned and newest version. Offline/error → skipped ("freshness not checkable"), the review always runs through. **Warn-only by design — no abort path, no hard gate** (not even via `compliance_doc_gate`). Pure skill instruction; details HANDBUCH appendix BL.

### v1.12.0

README brought up to the current SKILL state. Dimension model corrected: 8 standard dimensions (Reliability, Data Integrity, Security, Performance, Observability, Maintainability, Testability, Scalability) + AI-Readiness as a standard dimension + add-ons (Privacy/GDPR, Cost Efficiency, Signal Quality, Compliance). New sections documented: **AI-Readiness** (8 checks — 4 principles + 4 anti-patterns, BOO-7), **Feature-Flag Hygiene** (BOO-17) and **SonarQube Cloud Read Block** (BOO-6). Mandatory read scope corrected to §1–§6 plus optional add-on sections §7+.

### v1.3.0 (BOO-14)

Observability invariants pinned as mandatory check points under §5 Quality dimensions. `SKILL.md` mandatory checklist extended with an explicit "Observability — three invariants" sub-block: logging schema (6 mandatory fields + logger ADR), metrics endpoint (4 mandatory metrics + port 9090+N), alert rules (3 mandatory alerts `{service}_down` / `{service}_error_rate_high` / `{service}_p95_slow` + routing + promtool validation). `references/dimensions-detail.en.md` §5 restructured into three sub-sections 5.1/5.2/5.3, each with 5 review questions; existing BOO-8 content kept as a "General hygiene" block. Schrader Code Crash chap. 3 + chap. 4 linked as source.

### v1.2.1 (BOO-43)

Drift fix: `architecture-design-template.md` rolled back to §-numbering so the §1–§N references in the skill resolve. Skill mandatory checklist re-aligned to the real template layout (§1 Big Picture, §2 Design rationale, §3 ADR, §4 Component overview, §5 Quality dimensions, §6 References, §7+ optional add-ons).
