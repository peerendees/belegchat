---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

# Implement — 8-Step Protocol from Issue to Shipped Code

> Turns a Linear issue into shipped code through a non-skippable 8-step protocol: identify → dependencies → context → governance validation → spec-gate → plan → implement → post-validation. No step optional, no shortcuts. Also usable by the automation daemon without human in the loop.

**Version:** 2.27.0 · **Command:** `/implement`

> **New in 2.27.0 (BOO-510):** remote-CI loop (step 6h) hardened to a presence check — the 0-checks trap per HANDBUCH appendix BR §BR.5/BR.6 is closed: before `gh run watch`, a mandatory pre-stage verifies the EXISTENCE of expected checks (`gh api .../check-runs --jq .total_count`); 0 checks despite existing workflows is now its own state `no_checks_reported` (never pass, never skip) with cause hints (GITHUB_TOKEN anti-recursion / `action_required` / trigger wiring) and remediation per appendix T "0 checks ≠ green".

> **New in 2.25.0 (BOO-486):** token pre-flight (step 0b) and subagent generation (step 4b) read `.claude/model-profile.yml` fresh (budget = `served_context × effective_fraction × budget_pct`, SSoT BOO-484): hard story cap at the leaf budget (`× capability_factor`) and fan-out refusal at 80% orchestrator utilization; without a profile: cloud default 200k + warning.

> **Native subagents (BOO-204, switch B):** with `prefer_native_subagents: true`, `/implement` generates real `.claude/agents/<story>-<agent>.md` from the spec's `## Subagents` section — each subagent with its own context window (leaf budget from the model profile, BOO-486), own tools/permissions, optionally its own model (steps 0d + 4b). Without the flag/section: the previous text-block pattern in the same window.

> 🔗 Sprint automation: **`/sprint-run`** runs a whole sprint and orchestrates the chain `backlog → implement → sprint-review`. See [`sprint-run/`](../sprint-run/README.en.md) · HANDBUCH Appendix AD.

> **Claude Code mode:** /implement executes → supervised `acceptEdits`, unattended (daemon/auto-execute) `dontAsk` + allowlist; **not** plan mode (read-only, blocks execution). The "plan" in step 4 is the skill's implementation plan, not Claude Code plan mode. See HANDBUCH §6 "Claude Code mode".

---

## What It Does

Most "AI pair programmer" tools jump from "here's the ticket" to "here's the code". In between, they skip: reading the architecture, validating dependencies, checking for an existing spec, verifying governance artifacts, and running acceptance criteria against the real output.

This skill runs the full 8-step protocol. Every step has an explicit purpose and a gate to the next. Skipping is not an option — the governance hooks (spec-gate, doc-version-sync) enforce it machine-level on `git commit` and `git push`.

---

## The Steps

The protocol has grown considerably since v1.5.0 — three pre-flight checks (steps 0/0b/0c) run before the 8 core steps, and several hard gates were added.

| # | Step | Gate |
|---|------|------|
| 0 | **Load environment** | Read `.claude/environment.json`, `CONVENTIONS.md`, `SECURITY.md`, `DEVELOPER_ONBOARDING.md`; check `tools_available.*`; record `llm_proxy_url` as audit trail (BOO-71, read-only) |
| 0b | **Token-window pre-flight** (BOO-40, soft) | Projection `current + story_estimate` against `token_warn`/`token_hard` thresholds; soft warning + sprint-switch hint |
| 0c | **Execution-isolation pre-flight** (BOO-52, hard under parallelism) | `execution_mode` (linear/sub-agents/agentic) must match `execution_isolation` + `worktree_strategy` + `write_scopes`; Codex adapter advisory only |
| 1 | **Identify issue** | Backlog: "In Progress" issue exists and is unambiguous; **status guard (BOO-319):** explicit key with status done/canceled → hard STOP (follow-up story instead of re-implementation) |
| 1b | **Schrader-components gate** ⛔ HARD GATE | Issue must be a complete Schrader prompt: Insight, Constraints, Success Criteria, Desired Outcome (each ≥20 chars, no placeholder) |
| 2 | **Dependency check** | Blockers resolved? Siblings aligned? |
| 3 | **Context build** | `CLAUDE.md`, `DEVELOPER_ONBOARDING.md`, `ARCHITECTURE_DESIGN.md` (ADRs/quality attributes), affected files, `docs/domain/*` |
| 3b | **Governance validation** | 8-dimension table? `## Security Impact` (always) + `## Security Validation` (on code/security/tooling/dependency/CI/governance) present? Load security reference stack per change-type; ADD valid? |
| 3c | **Spec-file gate** ⛔ HARD GATE | `specs/ISSUE-XX.md` exists? Enforced by `.claude/hooks/spec-gate.sh`; a spec for a closed story = audit artifact, not an assignment (BOO-319) |
| 4 | **Plan + operator approval** | Human-in-the-loop (auto-execute skips) |
| 5 | **Implementation** | Secure-coding-by-default (Layer-0 edit bodyguard BOO-86); `// AI-generated: {STORY_ID}` markers (BOO-17); docs updated; git commit + push; **session reference + audit trace written to spec file** (BOO-19) |
| 5.5 | **Sensitive-paths gate** ⛔ STOP on match (BOO-18) | Only if `.claude/sensitive-paths.json` exists; glob-match on changed files → mandatory human review (`review-ok: ...`) |
| 5.5b | **Personal-data-paths gate** ⛔ STOP on match (BOO-69) | Only with `personal_data: true` + `.claude/personal-data-paths.json`; glob-match → DPO/privacy review (`privacy-ok: ...`, GDPR Art. 25) |
| 5.7 | **Change-type branching** (BOO-68) | `change_type` from spec frontmatter → code-strict or non-code mode (see below) |
| 6 | **Post-implement validation** | See sub-steps below |
| 7 | **Backlog update** | Other issues affected by the change updated |
| 8 | **Result table** (mandatory) | Summary + `specs/ISSUE-XX.md` "Summary" section filled |

> Step 0c note: sub-agents may only start with a disjoint write scope; mini-briefings must include role, task, allowed/forbidden paths, integration rule, and the index rule (query-first when a project index exists, BOO-445).

> **Cross-session note (step 0c, BOO-154):** this pre-flight isolates parallel **agents within ONE story** (level 3). When **several people/sessions** work on the same repo at once, that's a **different** mechanism: **own clone per person** or **`git worktree` per session** (levels 1/2) — otherwise the local `main`/branch shifts under you and numbers/waves collide. The three levels of collision protection: `docs/kollisionsschutz-drei-ebenen.md`.

### Post-Implement Validation (Step 6)

Step 6 is a loop, not a one-shot check: `Validate → Interpret → Decide → Fix → Re-Validate → PASS/FAIL → Learn`. Once per run a gitignored persistence directory `journal/reports/local/{YYYY-MM-DD_HHMM}_{STORY-ID}/` for raw tool outputs is created (BOO-36). `/implement` only writes raw outputs; `/sprint-review` aggregates later (hard separation — no direct `learnings.db` writes).

| Sub | Check | Tool |
|-----|-------|------|
| 6a | **Code Quality Gate** (declarative iteration, max 5) | ESLint (`eslint.config.mjs`) / Ruff · SonarLint (IDE) · Error Lens (inline); SARIF/JSON persistence per iteration |
| 6a-bis | **Security Gate — Semgrep** (BOO-4, max 5 iter., <10s) | `.semgrep.yml` pack reader → Semgrep CLI → `semgrep-final.sarif` |
| 6a-tris | **Dependency Gate — slopsquatting protection** (BOO-12) | Only on manifest diff: existence check (404 → block), age check (<30 days → warn), CVE check (high/critical → block) |
| 6a-quart | **Coverage Gate — diff coverage ≥80%** (BOO-15, max 5 iter.) | c8 / pytest-cov → `coverage-check.sh`; <60% block, 60-80% warn; JUnit-XML persistence |
| 6b | **Acceptance Criteria + Linear comment** | Check every AC, evidence logged |
| 6c | **Architecture Quick-Check** | Relevant dimensions — config SSoT? Hardcoded values? Error handling? |
| 6d | **Smoke Test** | Real execution — not just syntax check |
| 6e | **Security & Privacy Findings** | Security always; privacy block mandatory when `personal_data: true` (BOO-69); check onboarding/hub impact |
| 6f | **Result: PASS / FAIL** | PASS → backlog Done + changelog + Obsidian sync |
| 6f-bis | **Write meta.json** (BOO-36 + BOO-84) | Run metadata incl. `change_type`, `iterations`, `skipped_gates`, `environment`, 3-level `token_tracking`, `cache_hit_rate`, `override_audit` |
| 6g | **Intent verification** (non-blocking) | Only if `intents/INTENT-XX.md` exists — measure metrics, write to spec, never block |

> How these gates share the same config-reader logic locally (pre-commit) and in CI is shown in HANDBUCH chapter 8d-quart.

### Non-code stories (Step 5.7 — BOO-68)

Not every story produces code. n8n / Make / Zapier workflows, Terraform / Pulumi / IaC, pure
cloud or app configs, and CMS content are real implementations with real risk, but they have
no classic code diff.

Before step 6, the skill reads `change_type` from the spec frontmatter. If the value is in
`{workflow, config, infrastructure, content}`, it switches to **non-code mode**:

- Code gates 6a / 6a-bis / 6a-tris / 6a-quart are skipped **explicitly** (not silently) — the
  reason lands in `meta.json.skipped_gates`
- Soft gates 6c / 6d / 6e become **hard gates** with mandatory evidence
- The sensitive-paths gate 5.5 still fires — patterns should cover `n8n/**`, `infra/**`,
  `**/*.tf`, `workflows/**/*.json`
- Optional domain gates (n8n-lint, tfsec, tflint, yamllint) run when `tools_available.<tool>`
  is active

Full explanation with flow sketch: [references/non-code-flow.md](references/non-code-flow.md).

---

## The Spec-File Gate (Hard Gate)

This is the governance firewall. Every code change requires a spec file at `specs/ISSUE-XX.md` **before** the plan step begins.

- If the spec exists → read it, verify it matches the current issue, proceed
- If missing → **STOP**. Create the spec from `specs/TEMPLATE.md`, commit it, wait for operator confirmation
- No exceptions — not for hotfixes, not for config changes. Only pure doc-only commits are exempt.

Machine-enforced by `.claude/hooks/spec-gate.sh`, which blocks any `git commit ISSUE-XXX` if `specs/ISSUE-XXX.md` is missing.

---

## Sensitive- and Personal-Data Gates

Two additional STOP gates fire before the quality gates whenever changed files touch sensitive or personal-data areas:

- **Sensitive-paths gate (step 5.5, BOO-18)** — runs only if `.claude/sensitive-paths.json` exists. Changed files (`git diff --name-only HEAD`) are checked against the `patterns` (glob, `**` recursive). On a match → mandatory STOP with the full diff and mandatory human review. The operator confirms with `review-ok: {name} - {comment}`, and the block is recorded in the spec file under `## Human Review`.
- **Personal-data-paths gate (step 5.5b, BOO-69)** — runs only with story frontmatter `personal_data: true` AND a present `.claude/personal-data-paths.json` (or `.codex/...`). On a match → mandatory STOP + DPO/privacy review (GDPR Art. 25). The operator confirms with `privacy-ok: ...` or the `/dpo` skill writes a REVIEW report to `journal/reports/local/<date>_<story>/privacy.md`; the block is recorded in the spec file under `## Privacy Review`.

Both gates can fire simultaneously — then `review-ok` first (technical), then `privacy-ok` (legal). Neither confirmation replaces the other, no auto-bypass.

---

## Audit Trail (BOO-19)

In step 5, after the commit, a **session reference** is written to the spec file under `## Session-Referenz`: session timestamp, best-effort session ID, path to the session log (`~/.claude/projects/.../sessions/{ID}.jsonl`), commit SHA, and an audit-trace command (`bash .claude/scripts/audit-trace.sh {SPEC_ID}`). If the session file cannot be found, only commit SHA + timestamp are recorded (no STOP).

---

## Trigger Phrases

- `/implement`
- "los" (German "go")
- "implement the story"
- "build it"

Also runs automatically under the Linear Automation Daemon when a webhook fires.

---

## Interfaces with Other Skills

| Upstream | What's provided | Downstream | What we deliver |
|----------|-----------------|------------|------------------|
| `backlog` | Top-ranked story | `security-architect` (REVIEW) | Mandatory review on a sensitive-path hit (step 5.5), gate-able report; otherwise on demand. Every-change SAST = Semgrep |
| `ideation` | Story + ADD + spec placeholder | `architecture-review` | Impact on affected dimensions |
| `architecture-review` (Pre-check) | Go/No-Go signal | `grafana` | New metrics → dashboards |
| `research` (on-demand) | Fact checks during implementation | `sprint-review` | Cumulative change history |
| `cloud-system-engineer` | Deployment guidance | | |

---

## Artifacts / Outputs

- **Code changes** — committed with proper ISSUE-XX message format
- **Updated documentation** — `CLAUDE.md`, `SYSTEM_ARCHITECTURE.md`, etc., version-bumped together
- **Linear comments** — AC verification, validation result
- **`specs/ISSUE-XX.md`** — completed with summary (3 paragraphs, plain language)
- **Changelog entry** — CHANGELOG.md + Obsidian sync
- **Result table** — mandatory summary

---

## Installation

```bash
cp -r implement ~/.claude/skills/implement
```

Also ensure the governance hooks are installed (done by `/bootstrap`):
```bash
ls .claude/hooks/spec-gate.sh .claude/hooks/doc-version-sync.sh
```

---

## File Structure

```
implement/
├── SKILL.md                                    ← Skill definition
└── references/
    ├── architecture-checklist.md               ← Relevant-dimensions checklist (+ .en.md)
    ├── change-checklist.md                     ← Per-change validation (+ .en.md)
    ├── non-code-flow.md                        ← Step 5.7: non-code branching (BOO-68) (+ .en.md)
    └── validation-checklist.md                 ← Post-implement sub-steps (+ .en.md)
```

---

---

