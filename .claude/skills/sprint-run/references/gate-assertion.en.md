---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gate assertion — post-story verification against meta.json

Reference for `/sprint-run` step 6 (execution by `/goal`). Machine verification that `/implement`
executed all mandatory gates per story (or skipped them only legitimately) — the safeguard against a
**silently** skipped lint/test/security check. Since 2.0.0 (ADR-4) `/goal` runs this assertion
before each story merge (the ruleset itself is unchanged).

## Source: meta.json (BOO-36/84)

In step 6f-bis `/implement` writes `journal/reports/local/<YYYY-MM-DD_HHMM>_<STORY>/meta.json`.
Relevant fields:

- `change_type` — enum from `CONVENTIONS.md` (`none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`, BOO-68); default when the field is missing: `none` (= code gates run). Non-code subset: `workflow | config | infrastructure | content`
- `skipped_gates` — list of skipped gates (with reason)
- `override_audit` — documented operator overrides (e.g. coverage < 80% with justification).
  **Extended by BOO-176:** also covers a deliberately lowered quality threshold — an entry names the
  gate-config file, the threshold (old→new or the disabled rule) and the operator's justification.
  This is the **only** legitimate way to lower the bar.
- `iterations` — iterations per gate

### Story diff as input (BOO-176)

The two BOO-176 checks below need the **story diff** — not just `meta.json`. Source is the diff of the
story branch against its merge base: `git diff <base>..<head>` (or
`git diff <base>..<head> -- <path>` for a single config file). `<base>` = merge base with `main`,
`<head>` = HEAD of the story branch (the same diff `/implement` already runs against the gates). From
it we read (a) **which** files changed and (b) the **old→new** content of the gate-config files.

## Legitimacy rule

An entry in `skipped_gates` is **legitimate** exactly when:

1. it is covered by `change_type` — in non-code mode (`/implement` step 5.7) the
   code gates 6a/6a-bis/6a-tris/6a-quart are legitimately skipped; **or**
2. it is documented in `override_audit` with a justification (operator override).

Otherwise → **unjustified skip → story fail**.

Addendum for non-code stories: the gates 6c (architecture quick check),
6d (smoke test), 6e (security findings) that are **hard** in non-code mode must carry evidence —
if it is missing → fail.

If `meta.json` is missing entirely → fail (gate run not provable, no "silently green").

### Rule AC3a — gate-config diff (threshold lowering) (BOO-176)

The skip check above only sees **whether** a gate ran — not whether someone **lowered the bar**.
AC3a closes that gap: if the story diff touches a **gate-config file** and thereby **lowers a
threshold** or **disables a rule**, that is legitimate only with a documented `override_audit` entry.

Gate-config files (stack-agnostic):
`eslint.config.*`, `.eslintrc*`, `ruff.toml`, `pyproject.toml`, `.semgrep.yml`, `phpstan.neon*`,
`.coveragerc`, `jest.config.*`, `vitest.config.*`, `sonar-project.properties`.

Counts as a **lowering / disabling** (old→new compared from the `git diff` of the config file):

- PHPStan `level:` **lower** (e.g. 7→5),
- coverage threshold **lower** — `fail_under` (`.coveragerc`/`pyproject.toml`),
  `coverageThreshold` (`jest.config.*`/`vitest.config.*`), `sonar.coverage` minimum,
- a **rule removed / disabled** — out of `rules` (ESLint), `select` (Ruff), the Semgrep rule set,
  or via a broad `eslint-disable` / `# noqa` (cf. bodyguard pattern, BOO-176 AC2).

The comparison is **old→new** (`git diff <base>..<head> -- <config-file>`): only a real regression
(threshold down / rule gone) trips the rule — a raise or pure reformatting does not. Without a
matching `override_audit` entry (config file + threshold old→new + operator justification) → **fail**.
`override_audit` is the **only** legitimate way; `change_type` does **not** cover a threshold lowering.

### Rule AC3b — change_type plausibility (BOO-176)

The agent sets `change_type` in the spec frontmatter itself (see
`implement/references/non-code-flow.md`). In non-code mode the code gates 6a/6a-bis/6a-tris/6a-quart
are legitimately skipped — so an agent could set `change_type: config|workflow|…` to bypass code
gates **even though** the diff contains real code. AC3b checks plausibility:

If `meta.change_type ∈ {workflow, config, infrastructure, content}` (non-code) **but** the story diff
contains real **code files** — application code such as `*.ts`/`*.tsx`/`*.js`/`*.py`/`*.php`/`*.go`/
`*.rs`/`*.java` under `src/`, `lib/` or similar app code, **not** pure config/docs — → **fail**
("`change_type` claims non-code, diff contains code → code gates must not be skipped"). The only
legitimate way out: an explicit `override_audit` entry with an operator justification. Gate-config
files themselves do **not** count as app code here (they are config) — their lowering is already
caught by AC3a.

## Implementation (BOO-418)

The ruleset is implemented as a deterministic script: `gate_assertion.py`
(canonical in `bootstrap/scripts/`, shipped to `.claude/scripts/`, unit tests
`test_gate_assertion.py`). Invoked by `/goal` before every story merge:

```bash
python3 .claude/scripts/gate_assertion.py \
  --meta journal/reports/local/<run>/meta.json \
  --base <merge-base> --head <story-head>
```

Exit 0 = PASS, exit 1 = story FAIL. Deterministically covered: skip legitimacy,
non-code hard-gate skips (6c/6d/6e), gate-config downgrade (AC3a), change_type
plausibility (AC3b), missing meta.json. **Honest boundary:** the substantive
evidence check of the non-code hard gates remains rule-guided, LLM-executed —
meta.json carries no evidence fields.

## Pseudocode (reading version)

```text
meta = read(journal/reports/local/<run>/meta.json)        # missing -> FAIL
diff = git_diff(<base>..<head>)                           # story branch vs merge base (BOO-176)

# --- skip legitimacy (BOO-165) ---
for g in meta.skipped_gates:
    if g.gate in CODE_GATES and meta.change_type in {workflow,config,infrastructure,content}: ok
    elif g.gate in meta.override_audit: ok
    else: FAIL(story, gate=g)

# --- non-code evidence (BOO-165) ---
if meta.change_type in {workflow,config,infrastructure,content}:   # non-code (step 5.7)
    for g in [6c, 6d, 6e]:
        if not has_evidence(meta, g): FAIL(story, gate=g)

# --- AC3a: gate-config diff / threshold lowering (BOO-176) ---
GATE_CONFIGS = {eslint.config.*, .eslintrc*, ruff.toml, pyproject.toml, .semgrep.yml,
                phpstan.neon*, .coveragerc, jest.config.*, vitest.config.*,
                sonar-project.properties}
for f in changed_files(diff):
    if f matches GATE_CONFIGS:
        old, new = git_show(<base>:f), git_show(<head>:f)   # old -> new
        if threshold_lowered(old, new) or rule_disabled(old, new):
            # phpstan level lower | fail_under/coverageThreshold lower | rule removed from rules/select
            if not override_audit_covers(meta, f): FAIL(story, gate="gate-config-downgrade", file=f)

# --- AC3b: change_type plausibility (BOO-176) ---
if meta.change_type in {workflow,config,infrastructure,content}:
    if has_app_code(diff):    # *.ts/*.tsx/*.js/*.py/*.php/*.go/*.rs/*.java under src/|lib/, not pure config/docs
        if not override_audit_covers(meta, "change_type"):
            FAIL(story, gate="change_type-implausible")   # non-code claimed, diff contains code

PASS   # only then merge (step 4.6)
```

## On fail

- Story back to `Backlog` (In Progress → Backlog).
- Operator notify: story ID + which gate + reason.
- No merge. `/goal` sets the story termination to "not satisfied"; the other stories keep running
  independently (or `/goal` terminates if this was the only open story).

## Classifying the three layers

- **Layer 1** — `/implement` gates (step 6): prompt-driven.
- **Layer 2** — remote CI gate before merge (BOO-148): mechanical.
- **The gate assertion is the machine bridge:** `/goal` verifies layer 1 against the machine output
  (`meta.json`), **before** layer 2 merges. Does not change `/implement` — only reads its `meta.json`.

Sketch: `docs/sprint-run-flow.png` + `docs/story-breakdown.png` (HANDBUCH Appendix AD).
