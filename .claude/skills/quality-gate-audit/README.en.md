---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

> 🌐 **Language:** English (this file) · [🇩🇪 Deutsche Version](README.md)

# Quality-Gate-Audit — checks whether the quality gates are actually wired

> A quality gate can be **configured** and still be **blind**. This skill checks each of a project's
> four gates against existence, registration and a signal test, and classifies it as `wired`,
> `nominal` or `blind`. It **diagnoses** and **does not repair** — it establishes the truth and
> writes it as an audit report.

**Version:** 1.3.0 · **Command:** `/quality-gate-audit`

> **New in 1.2.0 (BOO-370):** **phantom-gate probe** — GitHub-side detection of a required check that never posts (dead mandatory gate, e.g. SonarCloud after an org transfer). `bash quality-gate-audit/scripts/phantom-gate-probe.sh`; `gh` as the only network dependency, no Sonar access. Reports, does not repair.
>
> **New in 1.1.0 (BOO-202):** monthly **native-feature watch** (ADR-5 re-eval trigger — are Anthropic's *Agent Teams* still experimental?). A **watch**, not a wiring gate — blocks no sprint, does not feed into `wired/nominal/blind`.

---

## What does /quality-gate-audit do?

Three states, one single difference — does the gate fire on a targeted trigger or not?

- **`wired`** — file present, registered in the executing path, signal test fires.
- **`nominal`** — present and configured, but registered nowhere: effectively never runs.
- **`blind`** — claims to check, checks nothing (file missing/empty or layer hangs nowhere).

The distinction **nominal vs. blind** is the core of the audit: `nominal` gives false safety,
`blind` is openly broken — neither is wiring. The skill writes the result as an audit report to
`docs/audits/` and prints a status table. It **does not run a gate** (that is what
`/security-architect` and `/implement` do) — it checks **one level higher**: whether the gates are
wired at all, so that they *can* fire.

---

## Usage

### Command + trigger phrases

```
/quality-gate-audit
```

Or one of the trigger phrases:

```
are the quality gates wired
check the quality gates
gate wiring check
quality gate audit
```

### CLI flags

| Call | Effect |
|------|--------|
| `/quality-gate-audit` | interactive run, default trigger `manual`. |
| `--trigger {post-install\|pre-sprint\|post-update\|manual}` | trigger context (controls frontmatter `triggered_by` + trigger mechanics). |
| `--override-gate <name>[,<name>...] --reason "..."` | transiently accept one/several `blind` gates. `--reason` is **mandatory** and lands in the audit trail. |
| `--report-only` | only output the last report, **no** new run. |
| `--trigger post-update --force` | manual post-update trigger (fallback when the version marker does not catch). |

**Exit code:** `0` if all gates are `wired` **or** accepted as overridden; `1` if ≥1 gate is `blind`
without an override.

### Four automatic triggers

| Trigger | Who triggers | Behavior |
|---------|--------------|----------|
| `post-install` | final step in `/bootstrap` | baseline report right after setup. |
| `pre-sprint` | **HARD HOOK** in `/sprint-run` step 1 | all `wired` → sprint starts; ≥1 `blind` → **STOP**. |
| `post-update` | version marker `.claude/.last-framework-version` | mismatch against framework `version` → auto trigger. |
| `manual` | operator (`/quality-gate-audit`) | default, interactive run. |

---

## Modes & features

### The four gates

| # | Gate | What is checked | Signal test |
|---|------|-----------------|-------------|
| 1 | **Semgrep wiring** | `.semgrep/`, wiring canary, `semgrep.yml` workflow | `semgrep --config .semgrep/ …/wiring-canary.py` must report `qgaudit-wiring-canary`. |
| 2 | **Coverage** | `coverage-check.sh` + thresholds (`COVERAGE_PASS=80`/`WARN=60`) | thresholds present **and** hook registered. |
| 3 | **Slopsquatting** | `slopsquatting/wordlist.txt`, `dependency-check.sh` | wordlist ≤ 90 days + referenced + a known entry detected via `grep`. |
| 4 | **Layer-0 bodyguard** | `pre-edit-bodyguard.sh`, `bodyguard/patterns/*.yml`, `settings.json` | synthetic AWS-key edit → hook blocks with exit 1 + `[BODYGUARD] BLOCKIERT`. |

Full table with paths, markers and nominal-vs-blind criteria:
[references/gate-catalog.md](references/gate-catalog.md).

### Status scheme

`wired` (everything bites) · `nominal` (configured, but not registered) · `blind` (checks nothing).
The engine `scripts/gate-checks.sh` (deterministic, bash 3.2-compatible, dependency-free) runs the
signal tests itself and yields one line `gate=<name> status=<status>` per gate.

### Phantom-gate probe (BOO-370)

Separate from the wiring audit: `scripts/phantom-gate-probe.sh` checks GitHub-side whether a **required
check really posts** — or blocks every PR as a dead mandatory gate without ever checking (classic case:
SonarCloud loses its project binding after an org transfer). Two statuses: `aktiv` (posted in the window of
the last N commits) / `nominell` (required, but never posted = phantom). `gh` is the only network
dependency, **no Sonar access** needed; the probe **reports, does not repair**. Org-transfer fix: HANDBUCH
Appendix AA. Details in [SKILL.en.md](SKILL.en.md).

### Report

- **Path:** `docs/audits/YYYY-MM-DD-quality-gate-audit.md` (configurable via `.claude/environment.json`,
  field `paths.audits`). Checked into Git, not under drift watch.
- **Frontmatter:** `audit_id`, `triggered_by`, `framework_version`, `overrides: []`,
  `summary: {wired, nominal, blind}`.
- **Body:** status table, per gate check path + signal-test output + repair hint, diff against the
  last run (from the 2nd run onward), next steps.

---

## Background

The trigger was a concrete Semgrep incident: a custom-rule directory (`.semgrep/`) was cleanly
configured, but never handed to the CLI via `--config` — the rules simply never ran
(ADR "Semgrep Custom-Rule-Wiring", 2026-06-11). The gate was **nominally** there and effectively
**blind**. Exactly this gap between *configured* and *effective* gives false safety: you rely on a
protection that never fires.

The lesson: **nominal is blind.** A gate you have not tested against a real trigger is not a
protection but an assumption. `/quality-gate-audit` turns this lesson into a reproducible check —
with a **wiring canary** per gate (a fixture with a deliberate violation that only produces a hit
when the gate is truly wired). A hit proves the wiring; silence proves blindness.

---

## File structure

```
quality-gate-audit/
├── SKILL.md                              ← Skill definition (1.0.0, DE — primary)
├── SKILL.en.md                           ← Skill definition (1.0.0, EN)
├── README.md                             ← German README
├── README.en.md                          ← this file (EN)
├── scripts/
│   ├── gate-checks.sh                    ← deterministic audit engine (4 gates)
│   └── signal-tests/
│       └── bodyguard-canary-edit.sh      ← AWS-key edit against the bodyguard hook
└── references/
    ├── gate-catalog.md                   ← gate table (paths, markers, criteria)
    ├── test-plan.md                      ← positive/negative cases per gate
    └── test-fixtures/                    ← project-wired / project-blind / project-nominell
```

> **Overview sketch:** `quality-gate-audit-overview.excalidraw`/`.png` (+ `.en`) follow via the
> central render pass.

## Related

- Security big picture: [ciso-security runbook](../docs/runbooks/ciso-security.en.md)
- The governance principle behind it: [governance-prinzip runbook](../docs/runbooks/governance-prinzip.en.md)
