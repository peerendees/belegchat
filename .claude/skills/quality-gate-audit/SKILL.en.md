---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: quality-gate-audit
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Quality-Gate-Audit: checks whether a project's declared quality gates are actually
  WIRED — not merely configured nominally. Four gates (Semgrep wiring, coverage,
  slopsquatting, Layer-0 bodyguard) are each checked against existence + registration + signal
  test and classified as `wired` / `nominal` / `blind`. Writes an audit report to
  `docs/audits/`. Diagnoses, does NOT repair. Hard hook in `/sprint-run` step 1
  (≥1 gate blind → sprint STOP) and final step in `/bootstrap` (baseline report).
  Use when the operator says "quality gate audit", "are the gates wired", "check the
  quality gates", "gate wiring check" or "/quality-gate-audit". Also automatically via
  trigger post-install / pre-sprint / post-update.
version: 1.3.0
metadata:
  hermes:
    category: governance
    tags: [quality-gates, wiring-verification, semgrep-canary, slopsquatting, bodyguard, audit-trail]
    requires_toolsets: [terminal, git]
    related_skills: [sprint-run, bootstrap, slopsquatting-deep-refresh, implement]
---

# Quality-Gate-Audit

Checks whether a project's declared quality gates are **actually wired** — i.e. whether they hang
in the executing path and fire on a targeted trigger — rather than just sitting nominally in a
config. The skill **diagnoses**, it **does not repair**: it determines whether a gate is `wired`,
`nominal` or `blind`, and writes the result as an audit report.

> **Why:** A custom-rule directory that is never handed to the CLI via `--config` is effectively
> blind — the rules simply never run (ADR "Semgrep Custom-Rule-Wiring", 2026-06-11). Exactly this
> gap between *configured* and *effective* is what this audit closes.

> **Distinction from `/security-architect` and `/implement`:** The other skills **run** gates
> (security scan, coverage check during implementation). `/quality-gate-audit` checks **one level
> higher**: whether the gates are wired at all, so that they *can* fire. It does not replace a gate
> run — it verifies the wiring.

## CLI interface

| Call | Effect |
|------|--------|
| `/quality-gate-audit` | interactive run, default trigger `manual`. |
| `--trigger {post-install\|pre-sprint\|post-update\|manual}` | trigger context (controls frontmatter `triggered_by` + trigger mechanics). |
| `--override-gate <name>[,<name>...] --reason "..."` | transiently accept one/several `blind` gates. `--reason` is **mandatory**. |
| `--report-only` | only output the last report, **no** new run. |
| `--trigger post-update --force` | manual post-update trigger (fallback when the version marker does not catch). |

**Exit code:** `0` if all gates are `wired` **or** accepted as overridden; `1` if ≥1 gate is
`blind` without an override. (The engine `scripts/gate-checks.sh` implements exactly this rule.)

## Gate catalog (four gates initially)

Checked in the target project (`$PROJECT_ROOT` = git root of the cwd). Full table with paths,
markers and nominal-vs-blind criteria: [references/gate-catalog.md](references/gate-catalog.md).

| # | Gate | Check path (core) | Signal test |
|---|------|-------------------|-------------|
| 1 | **Semgrep wiring** | `.semgrep/`, `.semgrep/test-fixtures/wiring-canary.py`, `.github/workflows/{ci-,}semgrep.yml` | `semgrep --config .semgrep/ …/wiring-canary.py` must report `qgaudit-wiring-canary`. |
| 2 | **Coverage** | `.claude/hooks/coverage-check.sh` (+ `COVERAGE_PASS=80`/`COVERAGE_WARN=60`) | thresholds present **and** hook registered (settings.json / pre-commit / implement chain). |
| 3 | **Slopsquatting** | `.claude/hooks/slopsquatting/wordlist.txt`, `.claude/hooks/dependency-check.sh` | wordlist ≤ 90 days + referenced by `dependency-check.sh` + a known entry detected via `grep`. |
| 4 | **Layer-0 bodyguard** | `.claude/hooks/pre-edit-bodyguard.sh`, `bodyguard/patterns/*.yml`, `settings.json` (matcher `Edit\|Write\|MultiEdit`) | synthetic AWS-key edit → hook blocks with exit 1 + `[BODYGUARD] BLOCKIERT`. |

## Status values

| Status | Meaning |
|--------|---------|
| `wired` | file present + registered + signal test fires. |
| `nominal` | present, but registration/wiring is missing — configured, yet never runs. |
| `blind` | claims to check, checks nothing (file missing/empty, layer hangs nowhere). |

The distinction **nominal vs. blind is mandatory** — it is the core of the audit. `nominal` gives
false safety, `blind` is openly broken; neither is wiring.

## Output / report

- **Default path:** `docs/audits/YYYY-MM-DD-quality-gate-audit.md`, configurable via
  `.claude/environment.json` field `paths.audits`. Checked into Git, **NOT** under drift watch.
- **Frontmatter (mandatory):** `audit_id` (e.g. `2026-06-14-001`), `triggered_by`,
  `framework_version`, `overrides: []`, `summary: {wired, nominal, blind}`.
- **Body:**
  1. Summary — status table per gate.
  2. Per gate — check path, inspected files, signal-test output, status, repair hint on `nominal`/`blind`.
  3. Diff against the last check (from the 2nd run onward).
  4. Next steps.
- **CLI output:** status table per gate, **yellow warning** on active overrides, path to the report.

Example report: [docs/audits/2026-06-14-quality-gate-audit.md](../docs/audits/2026-06-14-quality-gate-audit.md).

## Workflow

### Step 0: Load environment + trigger
- Read `.claude/environment.json`: `paths.audits` (default `docs/audits/`), `tools_available.semgrep`.
- `$PROJECT_ROOT` = `git rev-parse --show-toplevel` (fallback: cwd).
- Trigger from `--trigger` (default `manual`). `--report-only` → straight to step 4 (output last report).

### Step 1: Run the engine
- `bash <skill-dir>/scripts/gate-checks.sh --gate all --root "$PROJECT_ROOT" --format machine`.
- Per gate, lines `gate=<name> status=<status> note="..."` are produced. Pass overrides through via
  `--override-gate <list>` (from the CLI's `--override-gate ... --reason`).
- The engine runs the signal tests itself (Semgrep scan of the canary, bodyguard canary edit
  via `scripts/signal-tests/bodyguard-canary-edit.sh`).

### Step 2: Write the report
- Render frontmatter + body per the schema above, to `paths.audits/YYYY-MM-DD-quality-gate-audit.md`.
- `audit_id` = `YYYY-MM-DD-NNN` (running number of the day). `summary` from the status counters.
- From the 2nd run onward: diff against the last report in the same directory (which gate changed status).

### Step 3: CLI output
- Show the status table. On active overrides, a **yellow warning** ("gate X blind, accepted: <reason>").
- Name the path to the report.

### Step 4: Escalation on `blind`
- ≥1 gate `blind` without an override → exit 1. In the report under "Next steps", a concrete repair
  hint per blind gate (which file is missing/not hung). **The skill does not repair itself** — it
  points to `/bootstrap` (gate scaffold) resp. the respective hook source.

## Trigger mechanics

| Trigger | Who triggers | Behavior |
|---------|--------------|----------|
| `post-install` | final step in `/bootstrap` | baseline report. Establishes the wiring truth right after setup. |
| `pre-sprint` | **HARD HOOK** in `/sprint-run` step 1 | all `wired` → sprint starts; ≥1 `blind` → **STOP**. Override **only transiently** via `--override-gate … --reason` (per run; unattended, the operator passes the flag in the invocation). Daemon (`--auto`) without override → abort. The persistent frontmatter override `override_blind` was removed in BOO-418 (existed in no schema, was never evaluated). |
| `post-update` | marker `.claude/.last-framework-version` (in `.gitignore`) | compare against framework `version`; mismatch → auto trigger, then update the marker. `--force` as a manual fallback. |
| `manual` | operator (`/quality-gate-audit`) | default. Interactive run. |

> **Safety property:** The `pre-sprint` hook is the brake that prevents a sprint from starting on a
> project with blind gates. A `blind` override is always justification-bound (`--reason`) and lands
> in the audit trail (frontmatter `overrides`).

## Native-feature watch — ADR-5 re-eval trigger (monthly, BOO-202)

Beyond the wiring audit, the **monthly** run (routine "Hermes-Health" in `docs/runbooks/routinen-vernetzen.md`) carries a **watch** rather than a gate: are Anthropic's **Agent Teams** still *experimental*? ADR-5 (vault: *Hermes-Layer vs Agent Teams — re-evaluation trigger*) holds Hermes differentiating only as long as Agent Teams are experimental — **re-eval trigger 1** is met once they flip to *stable* on [code.claude.com](https://code.claude.com).

**Behavior:**

- The run **reminds** to check the Agent Teams status (code.claude.com / release notes). Whether the determination is manual (operator looks) or via WebFetch stays lightweight-open — **not hard-wired**.
- **Trigger 1 met (stable)** → message "ADR-5 re-eval trigger 1 met — decide a new ADR (ADR-6) between options A/B/C". No hard block.
- **Still experimental** → note "Agent Teams unchanged experimental, as of <date>" (do not invent a status — the run checks, it does not assert).
- The two other ADR-5 triggers (Q4 2026 soft deadline · operator need from an enterprise pilot) are calendar/demand-driven and need no skill check.

**Boundary:** this is a **watch**, not a wiring gate — it does NOT feed into the `wired`/`nominal`/`blind` rating and blocks no sprint. Phase-7 stories (Hermes, BOO-31/32/33) stay "in preparation", not "in progress".

## Phantom-gate probe (BOO-370)

A **required check that never posts** is a dead mandatory gate: it blocks every PR without ever checking anything — and trains routine overrides, which erodes the author≠merger discipline. Concrete trigger: after the repo transfer `vibercoder79` → org `Vibecoder79` the SonarCloud project binding broke off, the required check `SonarCloud Code Analysis` stopped posting, yet kept blocking. That was detectable purely **GitHub-side** (branch ruleset + check suites/commit status) — **no Sonar access needed**. Exactly this is what the probe automates.

> **Plain language:** A smoke-detector test for mandatory checks. The detector is on the ceiling (required check), but does it still beep when there's a fire? The probe presses the test button: has this required check ever emitted a signal on the last commits at all? If never → dead detector, just decoration.

**Call:**

```
bash quality-gate-audit/scripts/phantom-gate-probe.sh [--repo owner/repo] [--branch <name>] [--last N] [--format table|machine]
```

- `--repo owner/repo` (default: auto-detect from `git remote`), `--branch` (default: default branch), `--last N` (default 20), `--format table|machine`.
- The probe reads the required checks from the branch ruleset (`required_status_checks`) and the actually posted signals as the **union** of check-runs and commit status over the last N commits. A required check that never appears in this union → phantom.

**Status vocabulary (mapping onto the rubric):**

| Status | Meaning | Analog to the wiring rubric |
|--------|---------|-----------------------------|
| `aktiv` | Required check posted at least once in the window (last N commits) — alive. | like `wired` |
| `nominell` | Required check is listed in the ruleset but **never** posted in the window → phantom gate/dead. | like `nominal` (false safety) |
| (none) | No required check in the ruleset → informational note, not an error. | — |

**Exit code:** `0` if all required checks are `aktiv` (or none listed); `1` if ≥1 `nominell` (phantom detected); `2` on an environment problem (`gh` missing/unauth/repo undeterminable).

**`gh` precondition + graceful degradation:** the only network dependency is `gh` (using its built-in `--jq`, **not** system `jq`). If `gh` is missing or the auth is invalid, the probe reports it clearly and exits 2 (environment problem) instead of faking a gate verdict.

**Boundary:** the probe **reports, does not repair** — the decision (fix the binding / remove the check) stays with the operator (analog to `gate-checks.sh`). **No Sonar access** and **no Sonar MCP** (separate story BOO-371) — purely GitHub-side detection. For the org-transfer case including the fix see HANDBUCH **Appendix AA**.

## Engine + references

- **Engine:** [scripts/gate-checks.sh](scripts/gate-checks.sh) — deterministic bash engine
  (bash 3.2-compatible, dependency-free, NO `jq`/`yq`). One function per gate
  (`check_semgrep`, `check_coverage`, `check_slopsquatting`, `check_bodyguard`).
  CLI: `--gate <name>|all`, `--format {table|machine}`, `--root <path>`, `--override-gate <list>`.
- **Phantom-gate probe:** [scripts/phantom-gate-probe.sh](scripts/phantom-gate-probe.sh) — GitHub-side
  detection of dead required checks (`gh` as the only network dependency, no Sonar access). See section
  "Phantom-gate probe (BOO-370)".
- **Signal tests:** [scripts/signal-tests/](scripts/signal-tests/) — `bodyguard-canary-edit.sh`
  (synthetic AWS-key edit against the bodyguard hook) and `phantom-required-check.sh` (offline fixture test
  of the phantom classification: required=`docs-drift`+`SonarCloud Code Analysis`, observed=only `docs-drift` →
  `nominell`/`aktiv`, exit 1). The Semgrep canary scan runs directly in `gate-checks.sh`.
- **Gate catalog:** [references/gate-catalog.md](references/gate-catalog.md) — all paths, markers, criteria.
- **Test plan:** [references/test-plan.md](references/test-plan.md) — positive/negative cases per gate.
- **Fixtures:** [references/test-fixtures/](references/test-fixtures/) — `project-wired` / `project-blind` / `project-nominell`.

## Trigger phrases

- `/quality-gate-audit`
- "are the quality gates wired"
- "check the quality gates"
- "gate wiring check"
- "quality gate audit"

## Configuration

| Field | Meaning | Default |
|------|---------|---------|
| `paths.audits` (in `.claude/environment.json`) | report directory | `docs/audits/` |
| `tools_available.semgrep` | semgrep CLI present? If missing, the Semgrep gate falls back to `nominal` (no hard fail). | autodetected |
| `.claude/.last-framework-version` | version marker for the `post-update` trigger (in `.gitignore`). | — |

## File structure

```
quality-gate-audit/
├── SKILL.md                              ← Skill definition (1.2.0, DE — primary)
├── SKILL.en.md                           ← Skill definition (1.2.0, EN)
├── README.md / README.en.md              ← README (DE + EN)
├── scripts/
│   ├── gate-checks.sh                    ← deterministic audit engine (4 gates)
│   ├── phantom-gate-probe.sh             ← phantom-gate detection (does a required check really post?)
│   └── signal-tests/
│       ├── bodyguard-canary-edit.sh      ← AWS-key edit against the bodyguard hook
│       └── phantom-required-check.sh     ← offline fixture test of the phantom classification
└── references/
    ├── gate-catalog.md                   ← gate table (paths, markers, criteria)
    ├── test-plan.md                      ← positive/negative cases per gate
    └── test-fixtures/                    ← project-wired / project-blind / project-nominell
```

> **Overview sketch:** follow-up (`quality-gate-audit-overview.excalidraw`/`.png` + `.en`) via the central render pass.
