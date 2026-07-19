---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: implement
recommended_model: opus  # BOO-170 — product code on the best model; iteration loops haiku, security findings opus (model-tiers.json)
description: |
  Implementation protocol for user stories. 8-step workflow from issue identification
  to closing table including post-implement validation. Use when the operator says "go",
  wants to implement a story, or runs "/implement". Also used by the automation daemon
  (no human in the loop).
version: 2.27.0
language: en
metadata:
  hermes:
    category: coding
    tags: [code-generation, deklarativer-modus, quality-gates, token-pre-flight, codex-adapter]
    requires_toolsets: [terminal, git, eslint, semgrep]
    related_skills: [ideation, sprint-review]
---

# Implement

Systematically implement a user story from the Linear backlog. 8 steps + governance validation — none may be skipped.

## Workflow (10 steps)

### Step 0: Load environment

1. Read `.claude/environment.json` (if present — otherwise fall back to defaults and log a warning).
2. Read project-local `CONVENTIONS.md` if present. Extract `governance_mode` and `execution_isolation`. Fallback: `governance_mode: standard`, `execution_isolation: write-scope`.
3. Extract paths from `paths.*` as needed (e.g. `paths.reports_local`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`, `paths.conventions`).
4. Before any tool invocation, check `tools_available.<tool>` (e.g. `tools_available.eslint`, `tools_available.semgrep`, `tools_available.tests`). If `false` or missing, the skill skips the call and notes it in the output.
5. Read `SECURITY.md` if present. If missing, warn and add a TODO to the result table for every security-relevant change.
6. Read `DEVELOPER_ONBOARDING.md` if present. If missing, warn: "Note: Developer Onboarding is missing — the project is harder to hand over to unfamiliar teams or other tools."
7. **Read `llm_proxy_url` (BOO-71, optional):** if `.claude/environment.json` contains the field `llm_proxy_url` with a non-`null` value, record the value in `meta.json.llm_routing.proxy_url` and set `meta.json.llm_routing.proxy_active = true`. **Read-only**: the framework does NOT perform any actual proxy routing — the value is an audit trail for operator-run sovereignty/anonymisation proxies. Implementing the routing is the operator's job (wrapper script, hook, dedicated proxy server). When `null` or missing: `meta.json.llm_routing.proxy_active = false`. Details: HANDBUCH Appendix Q.
8. Missing-file fallback: assume the schema defaults (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`, `CONVENTIONS.md`, `SECURITY.md`, `DEVELOPER_ONBOARDING.md`) and add a note to the output: "Note: `.claude/environment.json` is missing — defaults active. Recommendation: re-run `/bootstrap` or create the file manually."

### Step 0b: Token-window pre-flight (BOO-40, soft)

Before each story, check whether the estimated story load crosses the sprint-box limit. **Soft trigger** — the operator can always proceed; the skill only warns. Convention: HANDBUCH Appendix G (BOO-38). Context window base (served window × usable share, not the model maximum) and terms: [`docs/standards/context-window-management.en.md`](../docs/standards/context-window-management.en.md) (BOO-484).

**Read the model profile fresh (BOO-486):** the reference base of all percentages in this step is the budget from `.claude/model-profile.yml` (BOO-485): `served_context × effective_fraction × budget_pct` — read fresh at this decision point for **every** story, never cache, never hardcode a window size; formula + terms are ONLY referenced (SSoT BOO-484). State the budget AND its origin in the output ("profile" or "default", SSoT §12). **Fallback (profile missing):** conservative cloud default from `bootstrap/templates/model-profile.yml` (`served_context=200000`, `effective_fraction=1.0`, `budget_pct=0.80`, `capability_factor=1.0`) + warning: "Model profile missing — cloud default 200k active. Recommendation: run the endpoint probe (HANDBUCH Appendix BP)." Honest limit: the pre-flight estimate remains a **warning with margin**, not a precision gate — full enforcement stays with the daemon (BOO-170).

**Logic:**

1. **Measure current context window:**
   - Via the `/context` command (native Claude Code); otherwise estimate from chat length
     (very imprecise — note it in the output). The framework ships NO measuring command of its own (BOO-419).
   - Always compute percentages against the profile budget (above), not against the data-sheet maximum.
   - Fallback: estimate from chat length (very rough — flag in output)

2. **Read story token estimate from spec frontmatter `token_estimate`** (set by `/ideation` step 5b — BOO-39).
   - Fallback: derive from `estimate` (SP) per HANDBUCH Appendix G:
     - 1 SP → 5%, 2 → 12%, 3 → 25%, 5 → 50%, 8 → "story too large, split"

3. **Compute projection:**
   ```
   projection_percent = current_percent + story_estimated_percent
   ```

4. **Read thresholds from `.claude/environment.json`** (BOO-38 established them as mandatory fields):
   - `thresholds.token_warn_threshold` (default 70)
   - `thresholds.token_hard_threshold` (default 80)

5. **If `projection > token_hard_threshold`:**

   ```
   [!warning] Token pre-flight:
   - Current: 65% (130k / 200k — example with the cloud default profile)
   - Story estimate: 25% (50k)
   - Projection: 90% — over sprint-box limit (80%)

   Recommendation: close the sprint here.
   Next steps:
   1. Start /sprint-review (persist current sprint state)
   2. Close this chat
   3. Open a new chat and start the story there

   Proceed anyway? [yes/no]
   ```

6. **On `no`:** the skill stops and emits the /sprint-review hint plus sprint-switch instructions:

   ```
   1. Start /sprint-review (write the sprint file, update L3)
   2. Commit the last lesson
   3. Close this chat
   4. Open a new chat with:
      "Continue sprint X, next story: BOO-YY"
      /implement BOO-YY
   ```

7. **On `yes`:** write a risk note into `journal/reports/local/{date}_{story}/meta.json` (field added in step 6f-bis):

   ```json
   "pre_flight_warning": "projection 90%, user proceeded"
   ```

   ... continue to step 1.

8. **If `projection > token_warn_threshold` but `<= token_hard_threshold`:** soft hint without block:

   ```
   [!info] Token pre-flight:
   - Projection: 78% (just below the sprint-box limit of 80%)
   - Hint: one small story may still fit, then sprint close is recommended
   ```

   Continue to step 1.

**Hard cap (level A, BOO-486):** independent of the soft trigger: if the story footprint (`token_estimate`) exceeds `leaf budget × capability_factor` (leaf budget = profile budget of the single agent window, level A), the story is **too big — split** (`/ideation` step 5b), not "proceed anyway". `capability_factor` acts twice: smaller stories AND plan for more verification loops (it scales iteration counts, SSoT glossary).

**Soft-trigger rationale:** some stories are smaller than estimated; some sprint switches are costlier than a compact. The operator stays in control. When `pre_flight_warning` ends up in `meta.json` and the session actually compacted → lesson for L3 ("estimate was too conservative" or "operator decision was right") → calibration for `/ideation` token heuristic (BOO-39).

### Step 0c: Execution-isolation pre-flight (BOO-52, hard for parallel work)

Before implementation, validate the story against `CONVENTIONS.md`:

> **Cross-session note (BOO-154):** this pre-flight isolates parallel **agents within ONE story** (level 3). When **several people/sessions** work on the same project in parallel, additionally: **own clone per person** resp. **`git worktree` per session** — never two sessions in the same working tree (otherwise branch/file collisions, branches switched out from under you). The three levels of collision protection: `docs/kollisionsschutz-drei-ebenen.en.md`.

1. Read project convention:
   - `governance_mode`
   - `execution_isolation`
   - active gates
2. Read spec frontmatter:
   - `execution_mode`
   - `worktree_strategy`
   - `write_scopes`
   - `codex_execution_hint` (optional, advisory only)
3. Apply the rules:

| Execution mode | Minimum isolation | Hard rule |
|---|---|---|
| `linear` | `none` | no parallel writes |
| `sub-agents` | `write-scope` or `git-worktree` | every sub-agent has an explicit write scope |
| `agentic` | `git-worktree` | each autonomous execution lane gets its own worktree/branch |

**Codex adapter rule:** Codex may still plan internally, create tasks and run sandboxed steps under `linear`. That is not a violation as long as it produces only one sequential write lane. `codex_execution_hint` may recommend execution style (`single-agent`, `parallel-workers`, `worktree-required`), but must never override `execution_mode`, `execution_isolation`, `write_scopes` or gates.

If the rule is violated: STOP before step 1 and show the missing field or mismatched convention.

For `git-worktree`, do not silently create worktrees. Present the intended layout first:

```bash
git worktree add ../{repo}-{story}-{role} -b {story}-{role}
```

Sub-agent briefings must include: role, task, allowed paths, forbidden paths, integration rule, and the index rule (query-first when a project index with a valid commit stamp exists — BOO-445). The integration owner merges the lanes back into the main worktree after gates pass.

### Step 0d: Read native-path flags (BOO-204, switch B)

Read the `native_paths:` block (defined in BOO-199) from the project `CLAUDE.md`. Relevant for
`/implement`: `prefer_native_subagents` (default **`true`** when the flag or block is missing).
**Switch-A coupling:** applies only when `runtime_target: claude-code` (from `CONVENTIONS.md`, Step 0);
for `codex` / `cross-tool` / `unknown` the flag is inactive → always the old pattern. The value read here
drives Step 4b.

### Step 0e: Doc-drift pre-flight (BOO-229, soft)

Before implementing, call the shared drift checker (if present):
```bash
bash scripts/doc-drift-check.sh
```
It reads `ARCHITECTURE_DESIGN.md §References` + `INDEX.md` as the **single source of truth** and reports
completeness, freshness and local-vs-remote drift. The finding feeds the run as a note —
**warn-only at this stage** (no abort). The same SSoT list drives the post-implement doc check in
Step 6e (no skill-own, hard-coded file list anymore). If the script is missing (project predating BOO-229):
catch up with `intentron migrate --issue BOO-229`; the run continues. With `compliance_doc_gate: true`
(`CONVENTIONS.md`, mirrored to `.claude/environment.json`) a checker **FAIL** becomes a hard block:
`/implement` does not start until the drift is resolved; in the autopilot (`sprint-run` → `/goal`) the story
**pauses** (see `sprint-run/references/gate-block-handling.md`) — the worker catches up safely resolvable
drift itself, pausing only for a real decision (local ≠ remote). **WARN** stays a warning.
Default `false`. Details: HANDBUCH Appendix AS.

### Step 1: Identify the issue

- **Narrow query instead of full load (BOO-405) ⛔:** ONLY load the In-Progress issue via the backlog adapter — NEVER pull the entire backlog into the context. The skill needs exactly one assignment; the former full-backlog load was a structural token drain (user feedback 2026-07-08: the backlog MCP dominated the session's token consumption).
  - With a passed key (`/implement PREFIX-XX`): load the issue **by ID** (Linear MCP as example: `get_issue(id)`).
  - Without a key: load with a **status filter** (Linear MCP: `list_issues` with `state: "started"` or the state name "In Progress" + a small `limit`); other adapters analogously (GitHub/Gitea: `state=open` + `status/*` label filter).
  - Keep responses small: use `limit`/pagination, carry only the needed fields (ID, title, status, description) forward from the response; additionally use field selection where the adapter offers it (GraphQL/REST). Access contract: [`docs/runbooks/backlog-adapter-inventar.en.md`](../docs/runbooks/backlog-adapter-inventar.en.md) §Access contract.
- Identify the issue with status "In Progress" (that's the assignment)
- If several are "In Progress": oldest first, ask operator when unclear
- Read the issue description in full

**Status guard for an explicitly passed issue key (BOO-319) ⛔:** When the skill is invoked with a concrete key (`/implement PREFIX-XX`), FIRST check the status of the Backlog Record — adapter-neutral via `backlog_adapter` from `CONVENTIONS.md` (Linear / GitHub Issues / M365 / none):

- Status `Done` or `Cancelled` (Linear type completed/canceled → Done/Cancelled) → **hard STOP**, do not re-implement:

  ```
  [STOP — STORY CLOSED] PREFIX-XX has been marked Done/Canceled in the backlog since <date>.
  Read the closing comment/result in the Backlog Record before anything else happens.
  New need? -> Create a follow-up story via /ideation instead of re-implementing the old one.
  ```

- Marked as a duplicate → name the original issue and continue there.
- Rule of thumb: **the Backlog Record is the SSoT for a story's STATUS, the spec is the SSoT for its CONTENT** (CONVENTIONS.md §Spec-Gate). This failure class is documented twice for real: a sprint built twice on 2026-06-18, a superseded draft for a closed story on 2026-07-02.

### Step 1b: Schrader components gate ⛔ HARD GATE — no implement without a complete prompt

Checks whether the issue is a complete Schrader prompt (Code Crash ch. 5). No soft warning — a hard block.

**Flow:**

0. **Script check (BOO-418):** write the issue description to a file (or pipe it) and run
   `python3 .claude/scripts/schrader_check.py <issue.md>` — exit 0 = complete, exit 1 = STOP with
   a checklist. The script is the deterministic reference; the rules below describe the same for the reader.
1. Check the issue description for a `## Schrader-Prompt-Bestandteile` section (alternatively: `## Schrader Prompt Components` for EN issues)
2. Check all 4 sub-sections — each must contain at least 20 characters of non-empty content (no template placeholder):
   - `### Insight (Perceive)`
   - `### Constraints`
   - `### Erfolgskriterien` (or `### Success Criteria`)
   - `### Gewuenschtes Ergebnis` (or `### Desired Outcome`)

   Since BOO-499 the heading comparison is umlaut-normalized: `### Gewünschtes Ergebnis`
   (real umlauts) counts like the ASCII transliteration — a flawless German issue no
   longer falls through. Message texts stay ASCII.
3. Optional: check the `## Definition of Done` section — existence only (content not deeply validated)

**If a component is missing — STOP:**
```
[STOP] Issue BOO-XX is not a complete prompt — Schrader component missing:
  - [x] Insight: present
  - [ ] Constraints: empty or missing
  - [x] Success criteria: present
  - [x] Desired outcome: present

Go back to /ideation and add the missing component before starting /implement.
```

**If the issue is complete:** continue with step 2.

> Check is rule-based and **script-backed** (BOO-418): `schrader_check.py` (canonical in `bootstrap/scripts/`, shipped to `.claude/scripts/`) is the deterministic reference — no LLM needed. Issues predating INTENTRON governance v2 (without `## Schrader-Prompt-Bestandteile`) cannot pass the gate check — the operator must add the section retroactively (migration step in `migration-checklist-v1-to-v2.md`).

### Step 2: Dependency check

- Check the `## Dependencies` section of the issue
- Check parent issue and siblings (EPIC context)
- Find references to the issue via a targeted adapter search (PREFIX-XX mentions — Linear MCP as example: `list_issues` with `query: "PREFIX-XX"` + a small `limit`; do not load the entire backlog into the context, BOO-405)
- **If a dependency is OPEN:** warn the operator — "PREFIX-XX depends on PREFIX-YY (status: backlog). Continue anyway?"
- **If order differs:** show impact analysis

### Step 3: Build context

- Read CLAUDE.md (system context)
- **Read `DEVELOPER_ONBOARDING.md`** if present — handover context for unfamiliar development teams and tool switches (Claude Code -> Codex/Cursor/GitHub Copilot/Google Antigravity/classic development team). Include runtime notes, SSoTs, implementation starting point and maintenance obligation in the plan.
- **Read `ARCHITECTURE_DESIGN.md`** — the lead document: ADRs, quality attributes, guiding principles. Check whether the story violates existing ADRs or quality attributes (e.g. ADR-6: zero external dependencies, ADR-5: kill-switch first). References all further architecture docs. **§5b infra-layer cross-check (soft, BOO-221):** if the story touches one of the 13 infra layers whose table row is `n.ok`/empty, note it briefly in the plan (catch up the decision or set it deliberately to `n/a`). No block (lazy-fill allowed).
- Identify affected code files (from issue description + your own analysis)
- Check related completed issues (what's already built?)
- Check the architecture dimensions relevant for this story:
  See [references/architecture-checklist.en.md](references/architecture-checklist.en.md)

### Step 3b: Governance validation (mandatory)

Validate the governance artifacts of the issue before drafting the plan (check steps below).

1. **8-dimensions check:** is the table in the issue present? Is the assessment sound?
   Is a dimension missing that the planned change affects?
2. **Security checklist:** read the Security-by-Design section in the issue.
   Walk through the SECURITY.md checklist for the change type (new API? webhook? external input?).
3. **Check Security Impact + Security Validation:** every story must contain a `## Security Impact` section. For code, security, tooling, dependency, CI, or governance changes, `## Security Validation` must also be filled. If either section is missing, STOP and point back to `/ideation` or manual remediation.
4. **Load the security reference stack:** depending on change type, load the relevant references:
   - `auth` / `api`: `SECURITY.md`, API inventory, sensitive paths, OWASP/API checklist if present
   - `data`: `SECURITY.md`, data-flow/privacy section, schema/storage docs
   - `dependency`: `SECURITY.md`, dependency/supply-chain rules, `.semgrep.yml`, manifest diff
   - `ci` / `governance`: `SECURITY.md`, hook/CI rules, `CONVENTIONS.md`
   - `none`: carry over the story rationale and run only the baseline secrets/logging check
5. **Validate ADD (for features):** check the Architecture Design Document against current code.
   Do the listed files still exist? Are the integration points correct?
6. **Missing artifacts:** if 8-dimensions, security section, security validation or ACs are missing:
   - **Warn the operator:** "Issue PREFIX-XX is missing [section]. Should I add it retroactively?"
   - **Do NOT silently continue** — governance gaps must be visible

### Step 3c: Spec-file gate ⛔ HARD GATE — no plan without a spec

> **This gate is additionally enforced by `.claude/hooks/spec-gate.sh`.**
> The hook blocks any `git commit PREFIX-XXX` if `specs/PREFIX-XXX.md` is missing.

**Flow:**

1. Check: does `specs/PREFIX-XXX.md` exist?

2. **If YES:** read the spec — does the content match the current issue?
   If outdated: update the spec, then continue to step 4.
   **If the spec belongs to a closed story** (status guard from step 1), it is an
   **audit artifact, not an assignment** — the STOP from step 1 applies, not "update and continue".

3. **If NO → STOP. Create the spec now:**
   a. Read `specs/TEMPLATE.md`
   b. Fully populate `specs/PREFIX-XXX.md`:
      - Why (take from the issue)
      - What (deliverable + done criteria)
      - Constraints (Must / Must Not / Out of Scope)
      - Current State (affected files + existing patterns)
      - Tasks (T1, T2… — max 3 files per task, concrete verify step)
   c. Commit the spec: `git commit -m "docs: specs/PREFIX-XXX.md created"`
   d. **Ask the operator to confirm explicitly:**
      Output: `"Spec file created: specs/PREFIX-XXX.md — please review and confirm, then we continue."`
   e. **Wait for operator OK** — only then continue to step 4
   f. Backlog Record / adapter comment: link to the spec file

4. **No exceptions** — even for small fixes, hotfixes, config changes.
   Only exception: pure doc commits without code changes.
   **What counts as "pure docs" (BOO-500/A14, same definition as in the CI gate):**
   the diff touches EXCLUSIVELY `journal/**` and `docs/**` (e.g. daily note, runbook
   fix). **Explicitly NOT pure docs:** `CLAUDE.md`, `AGENTS.md`, skill files
   (`SKILL.md`) and any `*.md` outside journal/docs — those are instruction sinks
   (BOO-364); a change there is a behaviour change and needs a story; `specs/`
   always belongs to a story. The CI gate `spec-gate-ci.yml` carries the same
   pre-check since BOO-500; the label requirement (label-guard) continues to apply
   to doc files unchanged.

### Step 4: Create plan + operator approval

- Present a concrete implementation plan
- Files, changes, risks, test strategy
- **Wait for operator approval** (human in the loop)
- In daemon execution (auto-execute): skip this step

### Step 4b: Native subagent generation (BOO-204, switch B)

Controls the *how* of story-internal subagents — not the *whether*. Two patterns:

- **Old pattern** (`prefer_native_subagents: false`, `runtime_target ≠ claude-code`, or a spec **without**
  a `## Subagents` section): subagents as a text-block briefing via the Agent tool in the **same context
  window** as the orchestrator (simulated choreography). Existing behaviour, unchanged.
- **New pattern** (`prefer_native_subagents: true` AND the spec has a `## Subagents` section):
  `/implement` generates one `.claude/agents/<story>-<agent>.md` per entry before the code phase and lets
  Anthropic do the choreography. Each agent gets its **own context window** with its own
  leaf budget (`served_context × effective_fraction × budget_pct` from `.claude/model-profile.yml` —
  read fresh, BOO-486; without a profile: cloud default 200k + warning), its own tool
  permissions, optionally its own model.

**Fan-out refusal (level B, BOO-486):** on fan-out the orchestrator context is not the sum of the
sub-agent work — it holds briefings, return summaries and its own reasoning (SSoT BOO-484 §3).
Before **every** spawn the orchestrator keeps books on its own window (via `/context` or an
estimate, as in step 0b): once its own utilization reaches `budget_pct` (80%) of the orchestrator
budget from the freshly read model profile, **no further subagent is spawned** — instead persist
the intermediate state (disk, not window) and continue with a fresh window or `/sprint-review`.
Keep subagent returns small (pointer + status + counters), otherwise level B tips over despite
clean leaves. Honest limit: a declared rule, checked at this named gate — **no full enforcement**
(that stays with the daemon, BOO-170); the bookkeeping is an estimate with margin, not a precision gate.

**Source = the spec's `## Subagents` section** — the same SSoT that `/sprint-run` step 4.2 reads (one
convention, not two). Format:

```yaml
# In specs/<story>.md, section "## Subagents" (optional — if absent, the story runs sequentially):
- name: <slug>                  # -> .claude/agents/<story>-<slug>.md
  role: <what the agent does>
  model: opus | sonnet | haiku  # optional; default: code core stays Opus
  tools: [Read, Edit, Bash]     # optional; default: skill permissions
  write_scopes: [<path/glob>]   # required for execution_mode sub-agents/agentic
```

Per generated `.claude/agents/<story>-<slug>.md`: role, story ID, `write_scopes`, worktree path (if
`execution_isolation: git-worktree`), gate list, model, tool permissions.

**Orthogonal to isolation:** native subagents and `execution_isolation` / `worktree_strategy` (Step 0c)
combine independently — the flag changes the agent *kind*, not the worktree strategy.

**Hygiene:** generated story-agent files are transient (per run) and not part of the story diff —
add `.claude/agents/<story>-*.md` to `.gitignore`.

**lint-fixer (Step 6a):** runs under the same generator logic — the template
`references/lint-fixer.agent.md` is the special case "one fixer agent, `model: haiku`".

### Step 5: Implementation (after approval)

> **Secure-coding hint (shift-left at the prompt layer).** Write secure-by-default from the start — don't wait for the gates to correct it:
> - **No hardcoded secrets** — API keys/tokens/passwords via env variables or a secret manager, never as a literal in code.
> - **Parametrized queries** instead of string concatenation (prepared statements / query builder), never glue user input into SQL.
> - **Do NOT disable TLS verification** (`verify=False`, `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0` are off-limits).
> - **No `eval`/`exec`** on foreign/user input; no shell with unchecked input (`shell=True`, `child_process.exec`).
>
> The Layer-0 Edit-Bodyguard (BOO-86) is the **deterministic backstop** for this — it catches these patterns if they slip through anyway. Deep checks stay in Layers 2/3 (Semgrep, CI). See HANDBUCH Appendix V.

- Sub-tasks: before implementation → "In Progress", after completion → "Done"
- Execute the plan fully
- Mark all new functions, methods, and code paths with comment `// AI-generated: {STORY_ID}` (rollback identification, BOO-17). For Python: `# AI-generated: {STORY_ID}`.

> **Rollback via `/rewind` (BOO-208).** The marker above identifies AI code *after* writing; for active rewinding *within the session* use Anthropic's `/rewind` (`Esc Esc`) — it rewinds Claude edits. **Recommendation:** set a checkpoint before every `git commit` in case the story needs a rollback. **Boundary:** `/rewind` only affects **Claude edits**, NOT manual changes, Bash/tool outputs, or already committed/pushed state (use Git for those). See HANDBUCH §11b "Checkpoints & rollback".
- Update all doc files (CLAUDE.md, SYSTEM_ARCHITECTURE.md, etc.)
- Git commit + push
- **Write Session-Reference to Spec-File (BOO-19):**
  ```bash
  # Get commit SHA
  COMMIT_SHA=$(git rev-parse HEAD)
  # Most recent session file for this project (best-effort)
  SESSION_FILE=$(ls -t ~/.claude/projects/*/sessions/*.jsonl 2>/dev/null | head -1)
  SESSION_ID=$(basename "${SESSION_FILE}" .jsonl 2>/dev/null || echo "unknown")
  SESSION_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  ```
  Write to `specs/{PREFIX}-XXX.md` under `## Session-Reference`:
  ```markdown
  ## Session-Reference

  **Session-Timestamp:** {SESSION_TS}
  **Session-ID:** `{SESSION_ID}` (best-effort — most recent session at commit time)
  **Session-Log:** `~/.claude/projects/.../sessions/{SESSION_ID}.jsonl`
  **Commit-SHA:** `{COMMIT_SHA}`
  **Audit-Trace:** `bash .claude/scripts/audit-trace.sh {SPEC_ID}` (requires jq)
  ```
  Then commit the spec file: `git commit -m "docs: specs/{PREFIX}-XXX.md session reference (BOO-19)"`

  > If SESSION_FILE is empty (no session file found): Write only COMMIT_SHA + SESSION_TS, mark SESSION_ID as "unknown" — no STOP.

- No questions unless there's a real blocker

### Step 5.5: Sensitive Paths Gate ⛔ STOP FOR SENSITIVE PATH (BOO-18)

> This step runs ONLY if `.claude/sensitive-paths.json` exists in the project.
> Without this file: proceed directly to Step 6.
>
> **Wired since BOO-423 (not just this prose step):** the same tested core
> (`commit_guard.py sensitive-paths`) is now also invoked by the runtime hook `spec-gate.sh` at
> `git commit` AND by the always-on CI backstop `sensitive-paths-ci.yml` on every PR — the bypass is
> a `review-ok:` trailer in the commit message / PR body. This step remains the upstream AI
> self-check; hook + CI are the hard, demonstrable enforcement behind it.
>
> **Technical REVIEW report (BOO-424, mirrors DPO-REVIEW in 5.5b):** on a sensitive-path hit this is
> the mandatory entry point for the `security-architect` **REVIEW** mode — it structures the mandatory
> human sign-off technically (OWASP Top 10 quick check, secrets, HIGH/MEDIUM/LOW risk classification)
> and writes a **gate-able report** to `journal/reports/local/<run>/security-review.md` (existence + path
> land in `meta.json`, see 6f-bis). Outside sensitive-path hits, REVIEW is an **on-demand feature** — the
> deterministic every-change gate is Semgrep (6a-bis), not this LLM quick check.

**Process:**

1. Read `.claude/sensitive-paths.json` — load `patterns` array.
2. Determine changed files:
   ```bash
   git diff --name-only HEAD
   ```
3. Check each changed file against the pattern list (glob matching, `**` = recursive):
   - `auth/**` matches `auth/token.js`, `auth/middleware/jwt.js`, etc.
   - `**/*pii*` matches `lib/pii-handler.js`, `src/models/pii.js`, etc.
4. **No match → Gate passed**, proceed to Step 6.
5. **Match found → MANDATORY STOP:**

```
[STOP — SENSITIVE PATH] The following changed files touch sensitive areas:
  - auth/token.js  (Pattern: auth/**)
  - lib/pii-handler.js  (Pattern: **/*pii*)

Mandatory Human Review required (BOO-18, Schrader Ch. 3 §Enterprise Governance).

FULL DIFF FOR REVIEW:
[diff output here]

Please run `/security --mode review` on the diff (technical REVIEW report) or, after your own
line-by-line check, confirm manually with:
  review-ok: {path-or-pattern}     e.g. review-ok: auth/token.js  OR  review-ok: auth/**

Without explicit confirmation, the commit will not proceed.
```

> **Trailer format (BOO-498/A13):** the value after `review-ok:` is the **path or pattern**
> being released — the tested core (`commit_guard.py`) compares exactly against it
> (path-precise release: whoever approves says WHAT). Who/why belongs in the **prose next
> to it** (and in `## Human Review` in the spec, step 7a), not in the trailer value.
> Multiple paths: comma-separated or one trailer line per path.

6. **Wait for review confirmation** — Operator responds with `review-ok: ...` OR the
   `security-architect` skill (REVIEW mode) writes a REVIEW report to
   `journal/reports/local/<run>/security-review.md` (BOO-424). **A HIGH finding in the report = blocker**
   until fixed or confirmed as a documented exception with `review-ok:`.
7. **After confirmation:**
   a. Write review comment to Spec-File under `## Human Review`:
      ```markdown
      ## Human Review
      - **Date:** {{TODAY}}
      - **Reviewer:** {{REVIEWER_NAME}}
      - **Comment:** {{REVIEW_COMMENT}}
      - **Sensitive Paths Touched:** {{LIST_OF_SENSITIVE_FILES}}
      - **Security-Review-Report:** {{PATH_TO_SECURITY_REVIEW}} (if REVIEW mode ran)
      ```
   b. Commit Spec-File: `git commit -m "docs: specs/{PREFIX}-XXX.md human review documented (BOO-18)"`
   c. Then regular commit with the code changes.

> **Without `review-ok` confirmation:** Step 6 is NOT reached. No exceptions, no auto-bypass.

### Step 5.5b: Personal-Data-Paths-Gate ⛔ STOP FOR PERSONAL-DATA PATH (BOO-69/BOO-427)

> This step runs as soon as `.claude/personal-data-paths.json` (or
> `.codex/personal-data-paths.json`) exists in the project — **independent** of the story
> frontmatter. Without the pattern file: immediately on to Step 5.7.
>
> **Inverted gate logic (BOO-427):** the pattern match alone stops. Previously the gate only
> fired on the self-declaration `personal_data: true` — a misclassified story
> (`personal_data: false`, but the diff hits a PII path) was waved through (finding B3-02).
> Now the match challenges the frontmatter classification.

**Procedure:**

1. Read `.claude/personal-data-paths.json` — load `patterns` array.
2. Determine changed files (same logic as 5.5).
3. Check each changed file against the pattern list (glob matching).
4. **No match → gate passed**, on to Step 5.7 (even with `personal_data: true` — the story
   processes PII, but this diff does not touch declared PII paths).
5. **Match + `personal_data: false` or absent → MANDATORY STOP with re-classification question:**

```
[STOP — RE-CLASSIFICATION] The story is classified personal_data: false,
but the diff hits declared PII paths:
  - db/migrations/add_email_to_orders.sql  (pattern: **/migrations/**)

The pattern match challenges the classification (BOO-427). Two ways forward:
  a) Re-classify: set the story frontmatter to personal_data: true,
     then DPO REVIEW as in item 6 (privacy-ok required).
  b) Keep the classification with justification: privacy-ok: {path-or-pattern} — put the
     justification ("false positive because …") in the prose next to it, not in the
     trailer value (BOO-498/A13)

Without (a) or (b) the commit will not proceed. Waving through is not one of the ways.
```

6. **Match + `personal_data: true` → MANDATORY STOP + DPO REVIEW:**

```
[STOP — PERSONAL DATA PATH] The following changed files touch personal data:
  - src/api/profile.ts  (pattern: **/profile*)
  - lib/onboarding/consent.ts  (pattern: **/onboarding/**)

Privacy review required (BOO-69, GDPR Art. 25 Privacy by Design).

FULL DIFF FOR REVIEW:
[diff output here]

Please run `/dpo --mode review` with the diff or confirm manually with:
  privacy-ok: {path-or-pattern}     e.g. privacy-ok: src/api/profile.ts  OR  privacy-ok: **/onboarding/**

Without explicit confirmation, the commit will not proceed.
```

> **Trailer format (BOO-498/A13):** analogous to `review-ok` — the value is the **path or
> pattern**; what was checked (data minimisation, deletion mechanics, consent, …) belongs
> in the prose next to it and in `## Privacy Review` in the spec (step 8a).

7. **Wait for DPO review or manual confirmation** — operator answers with `privacy-ok: ...` OR the DPO skill writes a REVIEW report to `journal/reports/local/<date>_<story>/privacy.md`.
8. **After confirmation:**
   a. Add privacy block to the spec file under `## Privacy Review`:
      ```markdown
      ## Privacy Review
      - **Date:** {{TODAY}}
      - **Reviewer:** {{REVIEWER_NAME}}
      - **Comment:** {{REVIEW_COMMENT}}
      - **Personal Data Paths Touched:** {{LIST_OF_PERSONAL_DATA_FILES}}
      - **DPO Report:** {{PATH_TO_DPO_REPORT}} (if available)
      ```
   b. Commit spec file: `git commit -m "docs: specs/{{STORY_ID}}.md privacy review documented (BOO-69)"`
   c. Then regular commit with the code.

**Relation to Step 5.5:** Both gates can trigger simultaneously (sensitive AND personal-data). In that case: first `review-ok` (5.5), then `privacy-ok` (5.5b). Both confirmations are required; neither replaces the other — DPO assesses legally, security-architect technically.

> **Without `privacy-ok` confirmation:** Step 5.7 is NOT reached. No exceptions, no auto-bypass.

> **Issue reference:** BOO-69 (gate) + BOO-427 (inverted logic). Pattern file: `.claude/personal-data-paths.json` (automatically created by Bootstrap with Privacy add-on). DPO skill as standalone under `~/.claude/skills/dpo/`. HANDBUCH background: Appendix O Privacy by Design.

### Step 5.5c: EU AI Act reminder (BOO-101/106, soft — no STOP)

> **Activation:** Only if `AI_SYSTEM.md` exists in the project root (EU AI Act add-on active). Otherwise skip.

**Purpose:** Ensure AI-system-relevant code changes keep their documentation current — the AI Act requires up-to-date system documentation, not a per-line code check.

1. If the story carries `ai_act_relevant: true` **or** the changed files touch AI-system code (model call, inference, AI inputs/outputs, logging of AI decisions): check whether `AI_SYSTEM.md` is still accurate (risk class, transparency, human oversight, logging, GPAI).
2. On a discrepancy: update `AI_SYSTEM.md` **or** add an item to the spec's `## AI System` block that surfaces as REVIEW-NEEDED in the periodic dpo AUDIT.
3. **No hard stop** (unlike 5.5/5.5b) — reminder + doc upkeep; Step 5.7 is not blocked.

> **Issue reference:** BOO-101/105/106. Binding check: `/sprint-review` 7c (catalogue `eu-ai-act.yml`). Full mechanism picture: `docs/compliance/compliance-mechanik.md`. No legal advice — judgment items = REVIEW-NEEDED.

### Step 5.7: Change-type branching (BOO-68)

Before entering the quality gates, read `change_type` from the spec frontmatter (section 8
Security Impact of the story; stored as `change_type` in the spec file frontmatter) and set
the gate behaviour accordingly.

**Background:** Stories without a classic code diff (n8n / Make / Zapier workflow, Terraform /
Pulumi / CloudFormation IaC, pure cloud or app configs, CMS content) would otherwise pass all
code gates empty and report `final_status: passed` — even though no one verified the real
risks (webhook auth, credentials, IAM drift, public buckets). Schrader principle: "no output
without verify". See [references/non-code-flow.md](references/non-code-flow.md).

**Procedure:**

1. Read `change_type` from the spec frontmatter. Default if missing: `none` (= code-strict).
2. Check whether `change_type` is in the non-code set: `{workflow, config, infrastructure, content}`.
3. If **code-strict** (any other value including `none`): no change in behaviour, continue to step 6.
4. If **non-code**: set gate mode to `non-code`. Effect:

| Gate | Code-strict (default) | Non-code (`workflow`/`config`/`infrastructure`/`content`) |
|---|---|---|
| 6a ESLint/Ruff | Iteration loop, hard | **Skip with reason in meta.json** |
| 6a-bis Semgrep | Iteration loop, hard | **Skip with reason in meta.json** |
| 6a-tris Dependency | Hard on manifest diff | **Skip unless a manifest is actually in the diff** |
| 6a-quart Coverage | Hard >=80% | **Skip with reason in meta.json** |
| 6b Acceptance criteria | Hard | Hard (unchanged) |
| 6c Architecture check | Soft | **Hard — mandatory documentation** |
| 6d Smoke test | Soft | **Hard — mandatory execution in test env** |
| 6e Security findings | Documentation | **Hard — mandatory documentation per domain risk** |
| 5.5 Sensitive paths | Hard on hit | Hard on hit (unchanged — extend patterns for n8n/IaC/config) |

5. **Skip reasoning in meta.json:** Skips are NOT silent. Every skipped code gate is recorded
   in `meta.json.skipped_gates` with a reason:

   ```json
   "skipped_gates": {
     "eslint": "non-code: change_type=workflow",
     "semgrep": "non-code: change_type=workflow",
     "dependency": "non-code: no manifest in diff",
     "coverage": "non-code: change_type=workflow"
   }
   ```

6. **Optional domain gates (best-effort, only when `tools_available.<tool>` is active):**
   - `change_type=workflow`: `tools_available.n8n_lint`, `tools_available.workflow_jsonschema`
   - `change_type=infrastructure`: `tools_available.tflint`, `tools_available.tfsec`, `tools_available.checkov`
   - `change_type=config`: `tools_available.yamllint`, `tools_available.jsonschema`, `tools_available.opa`
   - `change_type=content`: `tools_available.markdownlint`, `tools_available.broken_links`

   If the tool is missing: skip with note "Domain gate for change_type=X recommended — `tools_available.X` not active".
   Concrete tool integrations are follow-up stories — this story only establishes the mechanism.

7. **`meta.json` gets the additional field `change_type`** (audit trail for `/sprint-review`):

   ```json
   {
     "story_id": "BOO-XX",
     "change_type": "workflow",
     "iterations": { "eslint": 0, "tests": 0, "semgrep": 0, "coverage": 0 },
     "skipped_gates": { "eslint": "non-code: change_type=workflow", ... },
     "final_status": "passed"
   }
   ```

8. **Non-code PASS criteria (override validation-checklist.en.md PASS):**
   - 6b: every AC ticked with evidence
   - 6c: architecture quick-check has a concrete finding documented (not empty)
   - 6d: smoke test was executed and the output documented (workflow triggered, plan/apply ran, config applied)
   - 6e: security findings per domain (webhook auth / credentials / IAM / public surface) documented or explicitly marked "n/a — reason"
   - 5.5: `review-ok` present on hit (unchanged)

9. **Non-code FAIL criteria (override):**
   - 6c empty / "n/a" without justification
   - 6d not executed or output not documented
   - 6e empty / "no check" without justification

> **This branching does not replace the `tools_available` logic from step 0.4** — it
> complements it. `tools_available` controls "tool present or not", step 5.7 controls "story
> nature: code or not". Both mechanisms can skip the same gate — `meta.json.skipped_gates`
> documents the reason unambiguously.

### Step 6: Post-implement validation — Validate-Fix-Learn

Validation BEFORE the issue is set to "Done". See [references/validation-checklist.en.md](references/validation-checklist.en.md)

This step is a loop, not a one-shot check:

```text
Validate -> Interpret -> Decide -> Fix -> Re-Validate -> PASS/FAIL -> Learn
```

Rules:
- Every failed gate run is interpreted before code is patched.
- Fixes address identified causes, not just symptoms.
- After each fix, the same gate must run again.
- `Done` is allowed only when all blocking gates are green or an operator confirms a documented exception.
- After PASS/FAIL, write a learning when a repeatable pattern appeared.

**6-Prelude) Iteration-run setup — persistence directory for raw tool outputs (BOO-36)**

Before the individual gates (6a/6a-bis/6a-quart/...) iterate, **once per implement run** a persistence directory for raw tool outputs is created. All iteration outputs (ESLint, Semgrep, tests, coverage) land — in parallel to the declarative iteration — in that directory; `/sprint-review` reads from it later and aggregates L2 lessons. **`/implement` writes only raw outputs**, NOT directly into `journal/learnings.db` (L3). The separation is hard: implement persists, sprint-review aggregates.

```bash
# Default path (can be overridden via paths.reports_local in .claude/environment.json)
REPORTS_BASE="journal/reports/local"
STAMP=$(date -u +%Y-%m-%d_%H%M)
STORY_ID="${ISSUE_KEY}"   # e.g. BOO-36
RUN_DIR="${REPORTS_BASE}/${STAMP}_${STORY_ID}"
mkdir -p "${RUN_DIR}"

# Initialise start timestamp and iteration counters (shell variables for meta.json)
RUN_STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ITER_ESLINT=0
ITER_TESTS=0
ITER_SEMGREP=0
ITER_COVERAGE=0
RUN_FINAL_STATUS="in_progress"
```

**Path convention:**
- Default: `journal/reports/local/{YYYY-MM-DD_HHMM}_{STORY-ID}/` (lives under project root)
- gitignored (bootstrap adds the entry to `.gitignore` — see `references/file-templates.en.md` §.gitignore)
- Files per run:
  - `eslint-iter{N}.sarif` — per ESLint iteration (`--format @microsoft/eslint-formatter-sarif --output-file ...` or `--format json --output-file ...` as fallback)
  - `tests-iter{N}.junit.xml` — per test iteration (`pytest --junit-xml=...` / `jest --reporters=default --reporters=jest-junit` with `JEST_JUNIT_OUTPUT_FILE`)
  - `coverage-final.json` — coverage end state (c8 / pytest-cov, JSON reporter, one-time copy at iteration end)
  - `semgrep-final.sarif` — Semgrep end state (`semgrep --sarif --output ...`, one-time copy at iteration end)
  - `meta.json` — run metadata (schema see step 6 closeout)

**Important:** the write path is independent — if a gate is skipped (e.g. no `eslint.config.mjs`), the corresponding file does not appear in the run directory. `meta.json.iterations.<gate>` then stays at `0`.

**If `tools_available.<tool> == false`** (from `.claude/environment.json`): persistence for that gate is also skipped — the behaviour mirrors the regular gate logic, the raw output simply does not exist.

**6a) Code-quality gate — ESLint + SonarLint + Error Lens (declarative iteration)**

> **Tool chain:** `eslint.config.mjs` defines rules (industry standard since BOO-2:
> ESLint Recommended + Airbnb Base + Security + SonarJS) → ESLint CLI checks →
> SonarQube for IDE shows deep analysis → Error Lens shows both inline in VS Code.

**Declarative mode (Schrader Code Crash lines 2105-2141, compound-engineering mechanism #1):**
The skill iterates over the ESLint output until 0 errors — the skill formulates code fixes
based on the findings, re-checks, and stops only when the gate is green or the iteration
limit is reached.

> **Model delegation (BOO-171):** This and the following mechanical iteration loop (6a-bis Semgrep) are
> blunt "fix until green" work without deep reasoning. The opus parent **delegates** them to a
> **`lint-fixer` subagent with `model: haiku`** (copy template: [`references/lint-fixer.agent.md`](references/lint-fixer.agent.md)
> — place it as a project subagent at `.claude/agents/lint-fixer.md`, or spawn it directly via the Agent
> tool with `model: haiku` and this briefing). Mini-briefing: changed files, linter
> output, allowed write paths, iteration limit. **Code core (step 5) and security findings (6e) stay opus.**
> The `meta.json` schema (`skill_invoked: implement-iterations`, `model_tier: haiku`) already reflects this;
> tier source `bootstrap/references/model-tiers.json`. If the subagent is unavailable, the parent keeps
> iterating itself (no hard block).

```bash
# Check all JS files changed in this commit — mandatory run + per-iteration SARIF persistence
# --no-warn-ignored (ESLint v9, BOO-469): explicitly passed files excluded via root `ignores`
# otherwise emit "File ignored" warnings -> phantom block without a real finding (nested workspace).
ITER_ESLINT=$((ITER_ESLINT + 1))
git diff --name-only HEAD | grep -E '\.(js|mjs)$' | \
  xargs npx eslint --no-warn-ignored --max-warnings=0 \
    --format @microsoft/eslint-formatter-sarif \
    --output-file "${RUN_DIR}/eslint-iter${ITER_ESLINT}.sarif"
# Fallback without SARIF formatter: --format json --output-file "${RUN_DIR}/eslint-iter${ITER_ESLINT}.json"
```

> **SARIF vs JSON:** if `@microsoft/eslint-formatter-sarif` is installed as a devDependency, use SARIF (CI-friendly, GitHub Action compatible). Otherwise fall back to built-in `--format json` — the file is then `eslint-iter{N}.json`. ESLint has no native SARIF support yet; the `@microsoft/eslint-formatter-sarif` plugin is the established path.

**Iteration loop (mandatory):**

1. Run ESLint on changed files — output ALWAYS lands additionally in `${RUN_DIR}/eslint-iter${ITER_ESLINT}.sarif` (or `.json` in fallback).
2. If `errors > 0`:
   a. Formulate code fixes based on the output (skill reads findings, suggests patches)
   b. Apply patches (Edit tool)
   c. Increment `ITER_ESLINT`, re-run step 1 (new iteration output lands in `eslint-iter{N+1}.sarif`)
3. If `errors == 0`: gate passed — continue to step 6b.
4. **Maximum 5 iterations.** At iteration 5 without green: STOP with a clear note to the
   operator: which findings persist, which fixes were attempted, why they didn't take.
   Operator decides (manual fix, rule exception, or mark the story as carry-over).

**Gate behaviour:**
- **0 errors + 0 warnings:** gate passed — continue to step 6b.
- **Errors + iterations remaining:** keep iterating.
- **Errors + iteration limit reached:** STOP, operator intervention.
- **Warnings only:** operator decides whether acceptable (with justification in Linear comment).
- No `eslint.config.mjs` in the project: skip gate + inform operator the rules file is missing (BOO-2 migration).

**Python equivalent:** same scheme with `npx eslint` -> `ruff check`, `eslint.config.mjs`
-> `pyproject.toml`. Ruff iteration runs with the same 5-iteration limit. SARIF persistence is analogous: `ruff check --output-format sarif --output-file "${RUN_DIR}/ruff-iter${ITER_ESLINT}.sarif"` (Ruff has native SARIF support since `ruff` 0.4.x). The counter variable stays `ITER_ESLINT`; the file name reflects the linter (`ruff-iter{N}.sarif` instead of `eslint-iter{N}.sarif`).

**6a-bis) Security gate — Semgrep (declarative iteration, BOO-4)**

> **Tool chain:** `.semgrep.yml` (manifest from BOO-3) → hook script reads active packs
> and constructs `--config p/...` flags → Semgrep CLI checks → findings in output.
> Second quality gate after ESLint, same iteration mechanics.

**Manifest reader (same logic as the pre-commit hook and the GitHub Action):**

```bash
# Extract active packs from .semgrep.yml
PACKS=$(grep -E '^[[:space:]]*-[[:space:]]+p/' .semgrep.yml | sed -E 's/^[[:space:]]*-[[:space:]]+//')
ARGS=""
for pack in $PACKS; do
    ARGS="$ARGS --config $pack"
done

# Semgrep on changed files — SARIF persistence for the final run
ITER_SEMGREP=$((ITER_SEMGREP + 1))
git diff --name-only HEAD | xargs semgrep $ARGS --error --quiet \
    --sarif --output "${RUN_DIR}/semgrep-final.sarif"
```

> **Semgrep persistence convention:** we write per iteration TO `${RUN_DIR}/semgrep-final.sarif` — the file name `-final` reflects that only the end state matters for sprint-review (Semgrep iterates less often than ESLint and the last file wins by overwrite). The counter `ITER_SEMGREP` is incremented anyway for `meta.json.iterations.semgrep`.

**Iteration loop (same mechanics as 6a):**

1. Manifest reader loads active packs from `.semgrep.yml`.
2. Run Semgrep on changed files with the constructed flags — output overwrites `${RUN_DIR}/semgrep-final.sarif`.
3. If findings exist:
   a. Formulate code fixes based on the output
   b. Apply patches (Edit tool)
   c. Increment `ITER_SEMGREP`, re-run step 2
4. If 0 findings: gate passed — continue to 6b.
5. **Maximum 5 iterations.** At iteration 5 without green: STOP, operator intervention.

**Gate behaviour:**
- 0 findings: gate passed — continue to 6b.
- High/Critical findings + iterations remaining: keep iterating.
- High/Critical findings + iteration limit reached: STOP, operator intervention.
- Medium/Low only: operator decides (with justification in the Linear comment).
- No `.semgrep.yml`: skip gate + inform operator "rules file missing — re-run /bootstrap" (BOO-3 migration).
- No active packs in `.semgrep.yml` (all commented out): skip gate + hint.

**Runtime budget:** must stay under 10 seconds. For larger repos optimize with `--baseline-ref HEAD~1` instead of a full scan.

**6a-tris) Dependency gate — slopsquatting protection (BOO-12)**

> **Tool chain:** `git diff --cached` -> `hooks/dependency-check.sh` -> registry lookup
> (npm view / pip / curl fallback) -> existence + age + CVE check.
> Schrader Code Crash ch. 3-4: AI hallucinations are their own attack vector.

**Trigger:** runs ONLY when `package.json`, `requirements.txt`, `pyproject.toml`, or
`Cargo.toml` is in the diff. Otherwise immediate exit 0 (performance).

**Three checks per newly added dependency:**

1. **Existence check** — registry lookup (npmjs/pypi). 404 → BLOCKED (hallucination?).
2. **Age check** — package <30 days old? Warning (typosquatter risk, manual verification).
3. **CVE check** — `npm audit --audit-level=high` / `pip-audit`. High/Critical → BLOCKED.

**Gate behaviour:**
- 0 findings: gate passed — continue to 6b.
- Existence 404 / High/Critical CVE: gate BLOCKED, operator must verify or remove the package.
- Age warning: gate passed, but a note in the output. Operator decides whether that is a risk.
- Cargo diff: hint "full Cargo support in a future iteration", operator runs `cargo audit` manually.
- Tool fallback: when `npm` / `pip-audit` is missing, the script falls back to curl against the registry.

**Runtime budget:** with the registry lookup typically 2-5 seconds. With many new
dependencies parallelisable — currently a serial implementation, optimisable on demand.

**6a-quart) Coverage gate — diff coverage >=80% for new code (BOO-15)**

> **Tool chain:** test run (c8 / pytest-cov) -> coverage.json -> hooks/coverage-check.sh
> -> correlates `git diff --added` with coverage data -> gate decision.
> Schrader Code Crash ch. 3: total coverage on legacy repos is unfair —
> only diff coverage on newly added lines counts.

**Important:** this step runs inside the skill, NOT in the pre-commit hook (tests
take too long — would blow the hook's 10s budget).

**Iteration loop:**

1. Test run with coverage output and JUnit XML per iteration:
   - Node: `npx c8 --reporter=json --reporter=text-summary npx jest --reporters=default --reporters=jest-junit` with `JEST_JUNIT_OUTPUT_FILE="${RUN_DIR}/tests-iter${ITER_TESTS}.junit.xml"`. Coverage output lands in `coverage/coverage-final.json`.
   - Python: `pytest --cov --cov-report=json --junit-xml="${RUN_DIR}/tests-iter${ITER_TESTS}.junit.xml"`. Coverage output lands in `coverage.json`.
   - Increment the counter beforehand: `ITER_TESTS=$((ITER_TESTS + 1))`.
   - At each iteration: `ITER_COVERAGE=$((ITER_COVERAGE + 1))` in sync.
2. Invoke `bash .claude/hooks/coverage-check.sh` — compares added lines from
   `git diff --cached -U0` against the coverage data.
3. Copy the coverage end state to the run directory (one-time copy at iteration end):
   - Node: `cp coverage/coverage-final.json "${RUN_DIR}/coverage-final.json"`
   - Python: `cp coverage.json "${RUN_DIR}/coverage-final.json"`
4. Gate behaviour:
   - **>=80% (pass):** gate passed — continue to 6b.
   - **60-80% (warn):** operator decides, rationale in the Linear comment.
   - **<60% (block):** add tests + repeat iteration step 1.
5. **Maximum 5 iterations.** On iteration 5 without green: STOP, operator step in
   (manual test-reach plan or split the story).

> **JUnit XML convention:** both pytest (`--junit-xml=...`) and jest-junit (env var `JEST_JUNIT_OUTPUT_FILE`) write JUnit XML — the standard format for test reports, parseable by `/sprint-review`. If the test runner cannot emit JUnit XML (e.g. Mocha without a reporter): test persistence is skipped, `ITER_TESTS` is not incremented, `meta.json.iterations.tests` stays at 0 — the coverage run itself continues.

**Gate behaviour edge cases:**
- No coverage data (no `coverage-final.json` / `coverage.json`): gate skipped
  with a hint to "/bootstrap to set up the test tooling".
- Diff contains only test files / configs / docs: gate skipped.
- Diff has 0 added lines: gate skipped.

**Configuration:** thresholds are constants inside the script (`COVERAGE_PASS=80`,
`COVERAGE_WARN=60`). Operator override via env vars:
`COVERAGE_PASS=90 bash .claude/hooks/coverage-check.sh`.

**Runtime budget:** script run <2 seconds. The test run itself can take several
minutes — that is why it is NOT in the pre-commit hook.

**6a-quint) Anti-placeholder check — test quality instead of just test quantity (BOO-177)**

> **Tool chain:** `git diff --cached --name-only` -> test-file filter -> hooks/anti-placeholder-check.py
> -> deterministic finding (Python AST + JS/TS heuristic) -> gate decision.
> Same root problem as BOO-176 ("agent gamed the gate"), here at the test level:
> trivial/empty tests lift the coverage number without testing anything.

**Important:** runs **after** the coverage run (6a-quart), in the skill — NOT in the pre-commit hook.
Coverage measures *how much* code is tested, the anti-placeholder check whether it is *actually*
tested. It is **not a linter** (ESLint/Ruff check style/types, not test meaningfulness) — a dedicated,
targeted check on test files only.

**Checked** are only the changed test files from `git diff --cached`
(detected by `*.test.{js,ts,jsx,tsx}`, `*.spec.{js,ts}`, `test_*.py`, `*_test.py`, `tests/**`):

```bash
bash -c 'python3 .claude/hooks/anti-placeholder-check.py --strict'
# without arguments the check detects the staged test files itself
```

**Flags two classes:**
1. **Trivial/empty tests** — `expect(true).toBe(true)`, `assert True`, `assert 1 == 1`,
   empty test body (only `pass` / `{}` / docstring).
2. **Unjustified skips** — `it.skip`/`test.skip`/`describe.skip`/`xit`/`xdescribe`,
   `@pytest.mark.skip`/`@pytest.mark.skipif` **without** `reason=` or a justifying comment.

**Gate behavior:**
- **0 findings:** gate passed — proceed to step 2 (syntax & runtime).
- **>=1 finding (block):** gate **fail** — replace the placeholder test with a real assertion or
  justify the skip (`reason=` / comment), then repeat iteration step 1 of 6a-quart.
- **Operator override:** explicit + logged only — record finding + reason as an
  `override_audit` entry in `meta.json` (same discipline as BOO-176: only the operator lowers the
  test bar, never the agent). No test file in `git diff --cached` -> gate skipped
  (`skipped_gates.anti_placeholder`).

**Documentation in `meta.json`:** iterations under `iterations.anti_placeholder`, a skip reason
under `skipped_gates.anti_placeholder` (e.g. `"no test files in diff"`), an operator override
under `override_audit[]`.

**Configuration:** default = warning; `--strict` / `STRICT=1` turns every hit into a hard fail
(always strict inside the gate). Optional project allowlist in
`.claude/anti-placeholder-check.local` (one glob per line; prefix `path:` for additional test
paths). Self-test: `python3 .claude/hooks/anti-placeholder-check.py --self-test`.

**Runtime budget:** <1 second (only the changed test files, dependency-free).

Step 2 — syntax & runtime:
- `node --check` on all changed .js files (syntax errors?)
- If agent: run 1× in DRY_RUN/TEST_MODE — does it run without crashing?
- If library/module: does it import correctly for all consumers?

**Background of the 7 tools:**
| Tool | Role | When active |
|------|------|-------------|
| **ESLint** (`.eslintrc.js`) | Defines + checks coding rules (syntax, security, style) | CLI in step 6a + passively in VS Code |
| **Semgrep** (`.semgrep.yml`) | Pre-commit SAST with pack-based ruleset | CLI in step 6a-bis + pre-commit hook + CI layer |
| **Slopsquatting hook** (`.claude/hooks/dependency-check.sh`) | Supply-chain check (existence + age + CVE) | Pre-commit hook after Semgrep, only on manifest diff |
| **Coverage hook** (`.claude/hooks/coverage-check.sh`) | Diff-coverage gate (>=80% added lines) | When active: /implement step 6a-quart, NOT the pre-commit hook |
| **Anti-placeholder check** (`.claude/hooks/anti-placeholder-check.py`) | Test quality: flags trivial/empty tests + unjustified skips (BOO-177) | When active: /implement step 6a-quint, NOT the pre-commit hook |
| **SonarQube for IDE** (SonarLint) | Deeper security analysis, code smells, bug patterns | Passive in editor while coding |
| **Error Lens** | Shows ESLint + SonarLint findings inline in the line | Passive in editor — no hiding of errors |

**6b) Acceptance criteria + Linear comment** (mandatory)
- Walk through every acceptance criterion from the issue description
- Checkbox by checkbox: is the criterion fulfilled? Note evidence
- If a criterion is NOT fulfilled: implement fix or inform operator
- **Write a Linear comment** with AC verification:
  ```
  ## AC-Verification
  - [x] AC 1: [description] — ✅ [evidence]
  - [x] AC 2: [description] — ✅ [evidence]
  - [ ] AC 3: [description] — ❌ [reason / what's missing]
  ```

**6c) Architecture quick-check**
- Only check the relevant dimensions (see architecture-checklist.en.md)
- Focus: was anything introduced that violates existing patterns?
- Config SSoT violated? Hardcoded values instead of config.js?
- Error handling present where needed? (API calls, file I/O)

**6d) Smoke test**
- Run agent/feature 1× for real (not just syntax check)
- Plausible output? Signal file written correctly?
- No unexpected side effects on other agents/signals?

**6e) Document security and privacy findings**

*Security block (always):*
- What was checked? (from step 3b security checklist)
- What is safe? What was mitigated?
- Open risks that were accepted?
- For LOW-risk stories: "Security: no new attack vectors" is enough
- Cross-check against `## Security Validation` from the story: every promised validation needs evidence or a documented exception.
- **security-architect REVIEW (BOO-424):** On a sensitive-path hit (step 5.5), did the REVIEW mode run? Report path: `journal/reports/local/<run>/security-review.md` — HIGH findings are blockers (fixed or documented as a `review-ok:` exception). Without a sensitive-path hit: `n/a — no sensitive path; deterministic every-change gate = Semgrep (6a-bis)`.
- **Doc artifacts (SSoT-derived, BOO-229):** check which files registered in `ARCHITECTURE_DESIGN.md §References` + `INDEX.md` must be updated by the change — the list comes from the **single source of truth**, NOT from a list hard-coded here (former drift risk: new artifacts like `API_INVENTORY.md` had to be caught up in every skill's list). `bash scripts/doc-drift-check.sh` surfaces the drift (registered file missing, expected artifact unregistered, freshness, local-vs-remote). Additionally check the **non-doc security config** that does not live in the §References/INDEX table: `.semgrep.yml`, `.claude/sensitive-paths.json`, `.codex/hooks.json`.

*Privacy block (MANDATORY on `personal_data: true`, BOO-69):*
- What was checked (data minimisation, pseudonymisation, no PII in logs, deletion mechanics, consent)?
- Was DPO REVIEW mode run? Path to report: `journal/reports/local/<date>_<story>/privacy.md`
- Cross-check against `## Privacy Review` from the spec (Step 5.5b): every documented check needs evidence or a documented exception.
- Check whether `PRIVACY.md`, `personal-data-paths.json`, or a DPIA under `dpia/` must be updated by the change.
- On `personal_data: false` WITHOUT a 5.5b pattern match: close the privacy block briefly with "n/a — story touches no personal data". If there was a match (re-classification stop, BOO-427): document the decision — re-classified OR `privacy-ok: … false positive: …` with justification.
- **Check onboarding/hub impact:** check whether `DEVELOPER_ONBOARDING.md` or the project hub / PMO hub must be updated. Triggers: new runtime/tool notes, changed target architecture, new required reading, changed backlog/issue workflow, new security rules, new implementation starting points, or handover-relevant assumptions. Document the result: updated or "no update needed".

**6f) Result**
- **PASS:** continue to step 7 (Backlog Record / adapter → Done, change log, push)
- **FAIL:** back to step 5, fix, re-validate
- Document validation result as a comment/result note in the Backlog Record or adapter issue

**6g) Learn**
- If a gate failed repeatedly, write a short lesson to the active learning loop (`journal/learnings.md`, L2, or L3 depending on `.learning-loop`).
- If no learning loop is active: note `Learning: SKIP intentional — learning loop not enabled` in the closing report.
- Lesson format: cause, fix tried, future prevention, affected gate/tool category.

After successful validation:
- Backlog Record / adapter → Done + comment/result note (incl. validation result)
- Change-log entry via the backlog adapter (Linear MCP: `save_comment`; a `linear.writeChangeLog()` tool does not exist, BOO-419)

**6f-bis) Write meta.json (BOO-36, extended by BOO-84 for token tracking)**

At the end of the run — pass, fail, or stop — `meta.json` is written into the run directory. Audit trail for `/sprint-review`.

Since BOO-84 the schema additionally contains **three levels of token tracking** (per iteration, per skill invocation, per story) plus **cache hit rate** and an **override audit trail**. Actual token values are ideally captured via a Claude-Code PostToolUse hook into `.claude/last-run-tokens.json` and merged when writing meta.json — **the framework does NOT ship this hook (planned, BOO-419)**; the wired as-measured path is the ccusage snapshot (BOO-189). If the hook is not active: operator pastes the token counts manually (Claude Code shows them at session end), or the fields stay `null` (no cost aggregate in sprint review for this story).

```bash
RUN_COMPLETED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# Set RUN_FINAL_STATUS from step 6f: "passed" | "failed" | "stopped_iteration_limit"
# Load ENVIRONMENT from .claude/environment.json (mac/vps/ci) — default "unknown" if file missing
ENVIRONMENT=$(jq -r .environment .claude/environment.json 2>/dev/null || echo "unknown")
# CHANGE_TYPE from spec frontmatter (step 5.7) — default "none" if missing
# SKIPPED_GATES_JSON is populated by step 5.7 / 6 per skipped gate — default "{}"
# BOO-424: security_review — path to the security-architect REVIEW report on a sensitive-path hit
#   (step 5.5), otherwise "n/a — no sensitive path". Existence is gate-able for /sprint-review.
if [ -f "${RUN_DIR}/security-review.md" ]; then
  SECURITY_REVIEW="${RUN_DIR}/security-review.md"
else
  SECURITY_REVIEW="n/a — no sensitive path; every-change gate = Semgrep"
fi

# BOO-84: load token-tracking data from optional hook cache, else empty skeleton
TOKEN_CACHE=".claude/last-run-tokens.json"
if [ -f "$TOKEN_CACHE" ]; then
  TOKENS_JSON=$(cat "$TOKEN_CACHE")
else
  TOKENS_JSON='{"iterations": [], "skill_invocations": [], "story_totals": null, "cache_hit_rate": null}'
fi

# BOO-84: load override audit trail from optional cache, else empty array
OVERRIDE_CACHE=".claude/last-run-overrides.json"
if [ -f "$OVERRIDE_CACHE" ]; then
  OVERRIDE_JSON=$(cat "$OVERRIDE_CACHE")
else
  OVERRIDE_JSON='[]'
fi

cat > "${RUN_DIR}/meta.json" <<EOF
{
  "story_id": "${STORY_ID}",
  "change_type": "${CHANGE_TYPE:-none}",
  "started_at": "${RUN_STARTED_AT}",
  "completed_at": "${RUN_COMPLETED_AT}",
  "iterations": {
    "eslint": ${ITER_ESLINT},
    "tests": ${ITER_TESTS},
    "semgrep": ${ITER_SEMGREP},
    "coverage": ${ITER_COVERAGE}
  },
  "skipped_gates": ${SKIPPED_GATES_JSON:-"{}"},
  "final_status": "${RUN_FINAL_STATUS}",
  "environment": "${ENVIRONMENT}",
  "security_review": "${SECURITY_REVIEW}",
  "token_tracking": ${TOKENS_JSON},
  "override_audit": ${OVERRIDE_JSON}
}
EOF

# After successful write: clear caches so the next run starts fresh
rm -f "$TOKEN_CACHE" "$OVERRIDE_CACHE"
```

**Schema (extended by BOO-68 change_type + skipped_gates and BOO-84 token_tracking + override_audit):**

```json
{
  "story_id": "BOO-15",
  "change_type": "api",
  "started_at": "2026-04-27T14:30:00Z",
  "completed_at": "2026-04-27T14:34:00Z",
  "iterations": {
    "eslint": 3,
    "tests": 2,
    "semgrep": 1,
    "coverage": 1
  },
  "skipped_gates": {},
  "final_status": "passed",
  "environment": "mac",
  "security_review": "n/a — no sensitive path; every-change gate = Semgrep"
}
```

**Non-code example (`change_type: workflow`):**

```json
{
  "story_id": "BOO-72",
  "change_type": "workflow",
  "started_at": "2026-05-22T10:00:00Z",
  "completed_at": "2026-05-22T10:08:00Z",
  "iterations": {
    "eslint": 0,
    "tests": 0,
    "semgrep": 0,
    "coverage": 0
  },
  "skipped_gates": {
    "eslint": "non-code: change_type=workflow",
    "semgrep": "non-code: change_type=workflow",
    "dependency": "non-code: no manifest in diff",
    "coverage": "non-code: change_type=workflow"
  },
  "final_status": "passed",
  "environment": "mac",
  "token_tracking": {
    "iterations": [
      {
        "iteration_label": "step-6a-eslint-1",
        "skill_invoked": "implement-iterations",
        "model_used": "claude-haiku-4-5-20251001",
        "model_tier": "haiku",
        "input_tokens": 4500,
        "output_tokens": 800,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 12000
      }
    ],
    "skill_invocations": [
      {
        "skill_invoked": "implement-iterations",
        "model_tier_default": "haiku",
        "iterations_count": 3,
        "input_tokens_total": 13500,
        "output_tokens_total": 2400,
        "cache_creation_tokens_total": 0,
        "cache_read_tokens_total": 36000
      }
    ],
    "story_totals": {
      "input_tokens": 28000,
      "output_tokens": 5400,
      "cache_creation_tokens": 4500,
      "cache_read_tokens": 72000,
      "estimated_cost_usd": 0.18
    },
    "cache_hit_rate": 0.85
  },
  "override_audit": [
    {
      "skill": "implement-iterations",
      "recommended_tier": "haiku",
      "actual_model": "claude-sonnet-4-6",
      "override_origin": "cli-flag",
      "operator": "tobias",
      "timestamp": "2026-04-27T14:32:00Z"
    }
  ]
}
```

**Field convention:**
- `story_id`: Backlog Record / adapter issue key (e.g. `BOO-36`)
- `change_type`: from spec frontmatter (step 5.7). Values: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content` (BOO-68)
- `started_at` / `completed_at`: ISO-8601 UTC (`date -u +%Y-%m-%dT%H:%M:%SZ`)
- `iterations.<gate>`: number of iterations per gate, 0 if the gate was skipped
- `skipped_gates.<gate>`: reason per skipped gate (e.g. `"non-code: change_type=workflow"` or `"tools_available.eslint == false"`). Empty `{}` when nothing was skipped.
- `final_status`: `passed` (all gates green) | `failed` (gate blocked without hitting the iteration limit) | `stopped_iteration_limit` (iteration 5 reached without green)
- `environment`: `mac` | `vps` | `ci` | `unknown` (from `.claude/environment.json`)
- `token_tracking.iterations[]`: one entry per iteration — finest drill-down
- `token_tracking.skill_invocations[]`: aggregated per skill invocation
- `token_tracking.story_totals`: total per story + USD cost (pricing from `bootstrap/references/model-tiers.json`)
- `token_tracking.cache_hit_rate`: `cache_read_tokens / (input_tokens + cache_read_tokens)` — optimisation effect
- `override_audit[]`: every time the operator overrides the recommended model (CLI flag or CLAUDE.md), it is logged here
- `override_audit[].override_origin`: `cli-flag` | `claude-md` | `none` (none means: recommended tier was used, normally no entry)

**Responsibilities (BOO-84):**
- Claude-Code PostToolUse hook (optional; **planned, not shipped — BOO-419**) writes `.claude/last-run-tokens.json` and `.claude/last-run-overrides.json` during the run.
- `/implement` step 6f-bis merges these into `meta.json` and clears the caches.
- If the hook is not active: the fields stay empty (`token_tracking: { ... cache_hit_rate: null }` and `override_audit: []`). No story run is blocked, but sprint review shows no cost aggregate for this story.
- USD cost calculation happens OPTIONALLY in the `/sprint-review` skill using `bootstrap/references/model-tiers.json` — pricing is central, not duplicated in every meta.json.

**Important — responsibility separation:**
- `/implement` writes ONLY raw outputs to `journal/reports/local/` — including `meta.json`.
- `/sprint-review` READS `journal/reports/local/` + `ci/` and aggregates into `journal/sprint-{date}.md` (L2). In a second phase `/sprint-review` parses the aggregated data into `journal/learnings.db` (L3).
- **`/implement` does NOT write directly into `learnings.db`.** This separation keeps implement fast (no DB lock, no schema knowledge) and makes sprint-review the single writer of the learnings DB.

**6h) Remote-CI loop — Validate-Fix-Learn against GitHub Actions (BOO-147)**

> **Purpose:** The local gates (6a–6a-quart) only check the local machine (pre-commit hooks, linter, tests). CI-specific failures — wrong token syntax in workflow YAML, container-checkout errors, packages missing in the CI runner, environment drift — only surface in GitHub Actions and otherwise stay undetected until manual debugging. This loop is the **remote pendant to the local Validate-Fix-Learn loop**: after the push it waits for the CI result and, on failure, iterates the same `Validate -> Interpret -> Decide -> Fix -> Re-Validate` loop — just against the remote pipeline instead of the local gates.

> **Anchor:** The code was pushed remotely in Step 5 ("Git commit + push"); spec commits (session reference, possibly human/privacy review) follow as pushes too. This loop runs **after the last push** of this run — i.e. after 6f reported PASS and 6f-bis wrote `meta.json`. If `/implement` ran without a push (pure doc run, daemon dry run, or push was skipped): skip the loop.

**Graceful degradation (no hard fail) — check first:**

1. **`gh` installed?** `command -v gh` empty → skip with note: "Remote-CI loop skipped — GitHub CLI (`gh`) not installed. Recommendation: install `gh` + `gh auth login`, or check CI status manually in GitHub."
2. **`gh` logged in?** `gh auth status` fails → skip with note: "Remote-CI loop skipped — `gh` not logged in (`gh auth login`)."
3. **Remote present + pushed?** No `origin` remote (`git remote get-url origin` empty) or no push happened in this run → skip with note: "Remote-CI loop skipped — no remote / no push."
4. **Workflows present in the repo?** Two cases that must NOT be treated the same (0-checks trap, [HANDBUCH appendix BR §BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.en.md#br-gate-rule-of-thumb-presence-of-green-boo-506)):
   - **No workflows in the repo** (no `.github/workflows/` directory, or no `*.yml`/`*.yaml` files in it) → skip is fine, with note: "Remote-CI loop skipped — no GitHub Actions workflows in the repo."
   - **Workflows present, but 0 runs/checks for the pushed commit** → **NO skip.** This is not a missing precondition, it is a finding: continue to the presence pre-stage below, which handles the case as `RUN_CI_STATUS="no_checks_reported"`.

In the genuine skip cases (1–3 plus "no workflows in the repo"): **no STOP, no FAIL** — note in the output + set `meta.json.skipped_gates.remote_ci` with the reason, then continue to Step 7. `meta.json.skipped_gates.remote_ci` must **NEVER** record the 0-checks case (workflows present, but no checks reported on the commit) as a skip or a pass — that case is logged exclusively as a `no_checks_reported` finding (see presence pre-stage + persistence below).

**Presence pre-stage (mandatory, BEFORE `gh run watch`) — verify that expected checks exist (BOO-510):**

> **Rule of thumb ([HANDBUCH appendix BR §BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.en.md#br-gate-rule-of-thumb-presence-of-green-boo-506)):** "A gate must never test for the absence of red. It must demand the expected checks by name — 'not reported' is an error, not a success." `gh run watch --exit-status` only checks the SUCCESS of a CI run, not its EXISTENCE: if there is no run at all for the pushed commit, the loop can misread that as "no failure" — and waves things through exactly when the checking machinery has failed.

```bash
# Presence pre-stage: are there any checks at all for the pushed commit?
SHA=$(git rev-parse HEAD)
# Absorb trigger latency: poll for up to ~60s before treating 0 as a finding
for i in 1 2 3 4 5 6; do
  CHECK_COUNT=$(gh api "repos/{owner}/{repo}/commits/${SHA}/check-runs" --jq .total_count)
  [ "${CHECK_COUNT:-0}" -ge 1 ] && break
  sleep 10
done
# PR-level alternative: count the lines of `gh pr checks <pr-number>`
if [ "${CHECK_COUNT:-0}" -eq 0 ]; then
  RUN_CI_STATUS="no_checks_reported"   # 0 checks ≠ green — its own state, NEVER pass
fi
```

- **`CHECK_COUNT >= 1`:** checks are present → continue to the iteration loop below. `gh run watch` now checks the success of something that demonstrably exists ("presence of green") instead of the absence of red.
- **`CHECK_COUNT == 0` → `RUN_CI_STATUS="no_checks_reported"`:** NOT green, NO pass, NO skip. Typical causes: **GITHUB_TOKEN anti-recursion** (the push came from a workflow using the built-in token — the resulting state gets no checks, [§BR.6](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.en.md#br-github-token-chain-rule-boo-506)) · **`action_required`** (runs exist but wait for approval) · **miswired triggers** (workflow does not match the push's branch/path/event). Remediation per [HANDBUCH appendix T "0 checks ≠ green"](../docs/handbuch/anhang-t-post-install-verifikation-framework-installiert.en.md#t-0-checks-boo-501): find pending runs (`gh run list --status action_required`) and approve them (`gh api -X POST repos/<owner>/<repo>/actions/runs/<run-id>/approve`) **or** run the checks manually (`gh workflow run <ci>.yml --ref <branch>`), then repeat the pre-stage. If it stays at 0 checks: **operator escalation** with the finding (commit SHA, workflow list, suspected cause) — do NOT continue to Step 7 as if CI were green; `final_status` is carried in 6f-bis like a gate failure until the operator decides.

**Iteration loop (mandatory when preconditions are met and the presence pre-stage has confirmed checks):**

```bash
# Counter analogous to the local gates
ITER_CI=0
RUN_CI_STATUS="in_progress"

# Wait for the CI run of the currently pushed commit (blocks until completion)
ITER_CI=$((ITER_CI + 1))
gh run watch --exit-status \
  --workflow ci.yml 2>/dev/null \
  || gh run watch --exit-status   # fallback without workflow filter: most recent run
```

1. **`gh run watch --exit-status`** waits until the CI run completes. Exit code 0 = CI green, exit code != 0 = CI failed.
2. **CI green (exit 0):** loop passed — `RUN_CI_STATUS="passed"`, continue to Step 7.
3. **CI failure (exit != 0):**
   a. **Interpret:** run `gh run view --log-failed` — prints only the failed steps/jobs (more compact than the full log). Read the output and classify the cause (workflow YAML syntax / token-/secret reference / container checkout / missing package / real test/lint failure that didn't reproduce locally / environment drift).
   b. **Decide + Fix:** formulate a fix only for the **identified cause** (no blind symptom patching — same rule as in the local loop). Workflow/config changes via the Edit tool, code changes analogous to Step 5.
   c. **Re-Validate:** commit + push the fix, increment `ITER_CI`, re-run `gh run watch --exit-status` for the new commit.
4. **Maximum 3 iterations.** At iteration 3 without green: STOP, **operator escalation** with a clear note: which job/step persists, which fixes were attempted, the relevant `gh run view --log-failed` excerpt, and why the fixes didn't take. Operator decides (manual fix, CI-config review, or mark the story as carry-over). `RUN_CI_STATUS="stopped_iteration_limit"`.

**Persistence + meta.json (analogous to 6a / 6f-bis):**
- Per failure iteration, write the `gh run view --log-failed` excerpt to `${RUN_DIR}/ci-iter${ITER_CI}.log` (raw output for `/sprint-review`, same convention as `eslint-iter{N}.sarif`).
- Add `meta.json.iterations.remote_ci` = `${ITER_CI}`; on a genuine skip set `meta.json.skipped_gates.remote_ci` with the reason (e.g. `"gh not installed"`, `"no push in this run"`, `"no workflows in repo"`). **NEVER allowed:** recording the 0-checks case as a skip or a pass — on `RUN_CI_STATUS="no_checks_reported"`, `skipped_gates.remote_ci` stays empty and the state is logged as `meta.json.remote_ci_status = "no_checks_reported"` ([§BR.5](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.en.md#br-gate-rule-of-thumb-presence-of-green-boo-506): "not reported" is an error, not a success).
- On `RUN_CI_STATUS="stopped_iteration_limit"` or `RUN_CI_STATUS="no_checks_reported"`, `final_status` is carried accordingly in 6f-bis (a CI failure and a 0-checks finding block `Done` just like a local gate failure — `Done` is allowed only when CI is demonstrably green or the operator confirms a documented exception).

**Signal-test recipe (documented — no live PR needed, BOO-510):** The dangerous state for this pre-stage can be provoked deliberately; the recipe already exists in the framework: a PR opened by a workflow using the built-in `GITHUB_TOKEN` (e.g. the `*-refresh.yml` bump PRs) gets **no automatic CI** due to GitHub's anti-recursion — 0 checks despite existing workflows (provocation recipe + approve commands: [HANDBUCH appendix T "0 checks ≠ green"](../docs/handbuch/anhang-t-post-install-verifikation-framework-installiert.en.md#t-0-checks-boo-501), BOO-501; state systematics: [appendix BR §BR.2/§BR.6](../docs/handbuch/anhang-br-signal-test-rezept-gefaehrlicher-zustand.en.md#br-github-token-chain-rule-boo-506)). Expected loop behavior in exactly this state: report `RUN_CI_STATUS="no_checks_reported"` — **not** pass, **not** skip. If the loop reports pass, the presence pre-stage is broken.

> **Relation to the local loop:** 6a–6a-quart catch what is locally checkable; 6h catches what only becomes visible in the CI runner. Both use the same mechanics (iterate until green, cause-driven fixes, hard iteration limit, operator escalation). Local loop: max 5 iterations per gate. Remote-CI loop: max 3 iterations (CI runs are costlier/slower — a lower ceiling forces earlier operator escalation instead of an endless push loop).

### Step 7: Backlog update

- Check whether the implementation affects other issues in the backlog
- If yes: update descriptions (new dependencies, changed prerequisites)
- If issues became obsolete: inform the operator

### Step 8: Closing table (mandatory)

After completion ALWAYS print a summary table:

```markdown
| What | Status |
|------|--------|
| Config change | ✅ detail |
| Code change | ✅ detail |
| Tests/verification | ✅ detail |
| Documentation | ✅ detail |
| Onboarding / project hub | ✅ updated or no update needed |
| Git push | ✅ commit hash |
| Backlog Record / adapter → Done | ✅ |
| Obsidian change log | ✅ |
```

Adjust rows depending on the implementation. Each row with checkmark and short detail.
The operator should see at a glance what was done, without asking.

After that: **Fill in `## Summary` in the spec file** (`specs/PREFIX-XXX.md`).
No jargon — explain as if to someone who doesn't know the system.
3 paragraphs: (1) what was the problem? (2) what was built / how does it work? (3) what changes because of it?
Then commit: `git commit -m "docs: specs/PREFIX-XXX.md summary added"`

### Step 9: Cost snapshot (BOO-189)

After story completion, capture the **actual consumption** from the local Claude Code logs — measured
instead of estimated:

- Call: `bash .claude/hooks/ccusage-capture.sh "/implement <story-id>"` (capture template from setup,
  internally `npx --yes ccusage@latest daily`). Appends a token/cost snapshot to
  `docs/financials/sprint-costs.md`.
- **Soft gate:** if the call fails (ccusage/npx not installed, no log), **only warn** and **do not abort**
  the story — the closing table from step 8 stays valid.
- **Complementary to the estimate:** this actual value complements the `token_tracking` in `meta.json`
  (step 6f-bis); it does not replace it.
- **Known limitation:** ccusage may not attribute sub-agent tokens (Task tool) cleanly (issues
  #313/#806/#950) — in heavily sub-agent-driven runs the reported consumption may be incomplete or
  charged to the parent.

## Change checklist (mandatory after every code change)

See [references/change-checklist.en.md](references/change-checklist.en.md)
