---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: backlog
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Sprint planning and backlog overview. Loads the backlog once as a local snapshot
  (token-lean, BOO-405), analyzes dependencies and proposes a prioritized order.
  Validates the dual column effort_ai_hours / effort_human_equiv_hours on new stories.
  Writing sprint-plan sync mode (Step 6, manual trigger, dry-run default): writes the approved
  sprint assignment back to Linear as a label and reconciles AC lists against specs.
  Use when the operator says "what's up", "backlog", "sprint planning", "priorities", "/backlog"
  or "sync the sprint plan" / "/backlog sync".
version: 1.10.0
language: en
metadata:
  hermes:
    category: coding
    tags: [linear, m365, intent-label, prioritization]
    requires_toolsets: [linear, github, terminal]
    related_skills: [ideation, intent]
---

# Backlog

Load the backlog once as a local snapshot (snapshot-to-file, BOO-405), sort by dependencies and propose a prioritized order.

> **Context window base (BOO-484, wired through by BOO-486):** sprint sizing and `token_estimate` refer to the served window times its usable share, not to the model maximum — terms and budget formula (`Budget = served_context × effective_fraction × budget_pct`) are **only referenced** here, SSoT: [`docs/standards/context-window-management.en.md`](../docs/standards/context-window-management.en.md). The skill reads the values **fresh** from `.claude/model-profile.yml` (BOO-485) at its decision point (step 2b) — never cache, never hardcode a window size.

## Workflow

### Step 0: Load environment + system context

Order matters: FIRST 0.1 (environment), THEN 0.2 (system context) — the paths from `paths.architecture_design` / `paths.specs` inform where the system-context files live.

#### 0.1 Load environment

1. Read `.claude/environment.json` (if present — otherwise fall back to defaults and log a warning).
2. Extract paths from `paths.*` as needed (e.g. `paths.reports_local`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`).
3. Before any tool invocation, check `tools_available.<tool>`. If `false` or missing, the skill skips the call and notes it in the output.
4. Missing-file fallback: assume the schema defaults (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`) and add a note to the output: "Note: `.claude/environment.json` is missing — defaults active. Recommendation: re-run `/bootstrap` or create the file manually."

#### 0.2 Load system context (in parallel)

Before analyzing issues, understand system state — otherwise blockers that have already been implemented look open, or priorities ignore existing ADR constraints.

1. **Read `CLAUDE.md`** — which stories are mentioned as implemented? (`[PROJECT]-XXX` in
   version descriptions). Current system VERSION. Known discrepancies. These stories are
   effectively "done" even if Linear doesn't mark them as completed yet.

2. **Read `ARCHITECTURE_DESIGN.md` IN FULL** — the lead document with all strategic
   constraints. Read to the last line — don't abort when you think you've read enough.
   The document grows with every new ADR.
   **Mandatory checklist — all sections must be read:**
   - [ ] §1 Architectural Vision + guiding principles
   - [ ] §2 Quality Attributes (availability, latency, security targets)
   - [ ] §3 All existing ADRs in full (ADR-1 through the last one — not just the first 5!)
   - [ ] §4 Layer-to-pipeline mapping
   - [ ] §5 Failure mode analysis
   - [ ] §6 Component relationships
   - [ ] §7 Scalability roadmap
   - [ ] §8 Testing architecture
   - [ ] References section (links to further architecture docs)

3. **Read `SYSTEM_ARCHITECTURE.md`** — agent list, signal flow, Brain DB schema, known
   weak spots. Gives clarity on current state and which paths are already implemented.

4. **Load completed issues (last 30 days)** — update blocker status: if a story is
   "Done" in Linear but still referenced as a blocker in open issues, mark it as
   "unblocked" and call it out explicitly in the presentation. **Narrow query (BOO-405):**
   status filter Done/completed + time window + `limit` (Linear MCP: `list_issues` with
   `state` + `updatedAt: "-P30D"`) — do not pull the entire backlog; the result flows into
   the snapshot file from step 1.

### Step 1: Load backlog (snapshot-to-file, BOO-405)

**Snapshot pattern instead of continuous querying:** The backlog is pulled ONCE, persisted as a local working file, and afterwards read exclusively from that file — not re-fetched via the adapter on every subsequent step. Large adapter responses are the most expensive context item (user feedback 2026-07-08); access contract: [`docs/runbooks/backlog-adapter-inventar.en.md`](../docs/runbooks/backlog-adapter-inventar.en.md) §Access contract.

1. **Pull once, keep responses small:** Load open issues via the backlog adapter (Linear MCP: `list_issues` with `limit` + pagination via `cursor` — keep pages small; other adapters: read equivalent — there is no `linear.getOpenIssues()` tool, BOO-419). **Gitea/Forgejo:** `GET /repos/{owner}/{repo}/issues?state=open&type=issues` (MCP tool `list_issues` or REST, use `limit`/`page` parameters); derive status from the `status/*` labels, sprint from the `milestone` field.
2. **Write the snapshot file:** From each response page carry over only the extract (ID, title, status, priority, labels, effort dual column, `## Dependencies`/`## DB Schema Impact` sections) and write it to `<paths.reports_local>/backlog-snapshot-<YYYY-MM-DD>.md` (default `journal/reports/local/`, gitignored — never commit). Group by status: In Progress > Todo > Backlog > Ideation.
3. **/compact checkpoint (context hygiene):** After the load phase — snapshot file written, before the analysis begins — compact the context (`/compact`; in the autopilot the equivalent context-hygiene step). The raw adapter responses are NOT carried forward; from here on all subsequent steps (2–5) work exclusively from the snapshot file.
4. **SSoT rule — snapshot = working copy ⛔:** The snapshot file is NEVER a third SSoT. The rule stands: **the Backlog Record is the SSoT for a story's STATUS, the spec is the SSoT for its CONTENT** (CONVENTIONS.md §Spec-Gate). The snapshot is a throwaway extract for exactly this run.
5. **Re-sync rule (when to pull fresh):** (a) before every write sync (step 6 — read the affected records fresh by ID, never write from the snapshot), (b) after a session interruption, (c) on suspicion of conflict (parallel sessions clobber descriptions — always read the description fresh before `save_issue`, use comments for additive content).

### Step 2: Analyze dependencies

- Read issue descriptions: `## Dependencies` sections
- Build dependency graph: what blocks what?
- Detect and report circular dependencies
- Identify orphaned issues (referenced issues that don't exist)

**Schema-chain check (mandatory — runs on every backlog pass):**

1. Scan all open issues for `## DB Schema Impact` — which plan a schema update?
2. Build the schema chain: `currentSchemaVersion → targetSchemaVersion` per story
3. Sorting rule: **stories with a lower `targetSchemaVersion` ALWAYS first** — no two schema-update stories should be "In Progress" simultaneously
4. Conflict flag: two stories with the same `targetSchemaVersion` → report immediately as a **critical blocker** (one must be rewritten)
5. Mention explicitly in the priority recommendation: "schema chain: STORY-A (v17→v18) must go before STORY-B (v18→v19)"

**Dual-column check (mandatory — runs on every backlog pass):**

Every **new** story (status `Todo` or `Backlog`, created from the roll-out of this change onward) must carry the two effort fields `effort_ai_hours` (the real estimated AI effort incl. setup, iteration, review) and `effort_human_equiv_hours` (the classic senior-dev effort for the same story without the framework). The check is **rule-guided, LLM-executed** (field present + numeric — simple enough for reliable prompt execution, but no script; honest labeling BOO-419).

1. For each new story, read both fields from the story frontmatter/body.
2. **Pass criterion:** both fields present AND numeric AND `> 0`.
3. If one is missing or non-numeric / `<= 0` → **FLAG the story as a hygiene finding** and do **NOT** treat it as sprint-ready in steps 3/4.
4. Emit a concrete **remediation hint:** "Story X is missing `effort_ai_hours` and/or `effort_human_equiv_hours` (numeric, >0) — add it in the story template (see HANDBUCH Appendix G, dual-column section). Not sprint-ready until added."
5. **Exception (no backfill):** the pre-rollout stories **BOO-183 through BOO-188** are **NOT** flagged — the dual column does not apply to them retroactively.

### Step 2b: Sprint budget from the model profile (BOO-486)

Right before proposing the order, read the model profile **fresh** — on every run, never cached from an earlier session:

1. **Read the profile:** `.claude/model-profile.yml` (BOO-485) → `served_context`, `effective_fraction`, `budget_pct`, `capability_factor`, `reference_model`.
2. **Sprint budget (level B)** = `served_context × effective_fraction × budget_pct` — formula and terms are ONLY referenced, never redefined (SSoT: [`docs/standards/context-window-management.en.md`](../docs/standards/context-window-management.en.md), BOO-484).
3. **Leaf budget (level A) + story-cut cap:** the leaf budget is the same budget applied to the single agent window (level A, SSoT §3). The cap for the story cut is `leaf budget × capability_factor` — every story whose `token_estimate` exceeds it is flagged **"too big — split"** and is **not sprint-ready**, regardless of SP class and priority. A weak model (`capability_factor < 1`) thus automatically leads to more, smaller stories.
4. **ai_hours coupling:** `effort_ai_hours` (dual column, HANDBUCH Appendix G) are normalized to the profile's `reference_model`. If the active model deviates (`capability_factor < 1`), scale the expected actual effort up accordingly (`effort_ai_hours ÷ capability_factor` — `capability_factor` scales effort forecasts, SSoT glossary) and state this in the output.
5. **Budget announcement (mandatory, SSoT §12):** name the concrete token budget AND its origin ("profile" or "default") in the output — planning without a spoken number is the failure BOO-483 eliminates.
6. **Fallback (profile missing):** conservative cloud default from `bootstrap/templates/model-profile.yml` (`served_context=200000`, `effective_fraction=1.0`, `budget_pct=0.80`, `capability_factor=1.0`, `reference_model` = Opus class → budget 160k) + warning: "Model profile missing — cloud default 200k active. Recommendation: run the endpoint probe (HANDBUCH Appendix BP)."

> **Honest limit:** declared once, checked at this named gate — **no full enforcement** (that remains with the daemon, BOO-170). The estimates are warnings with margin, not a precision gate.

### Step 3: Propose order

Sort criteria (in this priority):
1. **In Progress** — finish running work first
2. **Blockers** — issues that block others
3. **Intent label** — `on-intent` BEFORE `neutral` at equal status + equal priority; `off-intent` stories go to the bottom with a warning ("Story X is off-intent — belongs in the backlog, not the sprint")
4. **Priority** — P1 > P2 > P3 > P4
5. **Dependency depth** — issues without dependencies before those with
6. **Age** — older issues before newer ones (same priority)

**Intent-label source:** the label is extracted from the `## Intent-Check` section in the story body (set by `/ideation` step 0.6). If the label is missing, the story is treated as `neutral`. In the output, explain: "Story X prioritized over Y because on-intent at equal points."

**Sprint-ready gate (dual column):** stories flagged by the dual-column check (step 2) count as **not sprint-ready** and are NOT recommended as the next story to implement — even if they would rank first by priority/age. They appear with a hygiene flag until the fields are added.

**Leaf-budget gate (BOO-486):** stories flagged "too big — split" in step 2b (footprint above `leaf budget × capability_factor`) are likewise **not sprint-ready** until they are split (split mechanics: `/ideation` step 5b).

### Step 4: Present

Show the operator:
- Prioritized list with rationale
- Dependency conflicts or gaps
- **Dual-column hygiene findings** — new stories missing `effort_ai_hours` / `effort_human_equiv_hours`, explicitly marked **not sprint-ready**, with a remediation hint
- Issues that may be stale or obsolete
- Recommendation: "I would implement [STORY-XX] next because..."

### Step 4b: Sprint forecast (BOO-192, only when Financials is active)

> **Activation:** this step runs when proposing the sprint order (right after step 4) and makes the
> **expected** ROI of the planned sprint visible in money — estimated per planned story, summed across all
> stories into the **sprint aggregate**. It is the forecast counterpart to the actual report from
> `/sprint-review` step 9b (BOO-191). No new data collection — only estimation from already-present sources
> (`token_estimate`, dual column, baseline rate, tier price).

**Graceful skip (no hard block):** if `docs/financials/worker-equivalent-baseline.md` is missing (Financials
not active) or the planned stories carry no dual column (`effort_ai_hours` / `effort_human_equiv_hours`,
BOO-193) → skip this step with `[!info] Sprint forecast skipped — Financials not active or no dual-column
data`. Prioritization stays valid.

**Inputs (all already present, nothing collected anew):**

| Input | Source |
|---|---|
| `token_estimate` per story | Execution-isolation block of the spec (`specs/<STORY>.md`) or story frontmatter |
| `recommended_model` per story | Spec/story (tier: `haiku` / `sonnet` / `opus`); if absent → `sonnet` default |
| Tier price | `bootstrap/references/model-tiers.json`, `tiers.<tier>.pricing` (USD per million tokens) |
| `effort_human_equiv_hours` / `effort_ai_hours` | Dual column per story (BOO-193) |
| Active billing rate + currency | `docs/financials/worker-equivalent-baseline.md` **section 1** (`rate_per_hour`, `currency`, `geo`, `source`) — internal precedence already applies there (BOO-190) |

**Load the tier price (analogous to `sprint-review` step 2b — graceful skip if not found):**

```bash
# Tier prices: project-local copy first (bootstrap phase 4 / migrate_boo_419 copies model-tiers.json)
TIERS_FILE=".claude/model-tiers.json"
if [ ! -f "$TIERS_FILE" ]; then
  TIERS_FILE="$(git rev-parse --show-toplevel)/../intentron/bootstrap/references/model-tiers.json"
fi
# Last fallback: typical operator setup path (framework-repo neighbourhood only)
if [ ! -f "$TIERS_FILE" ]; then
  TIERS_FILE=$(find ~/Documents/GitHub/intentron -name model-tiers.json -maxdepth 4 2>/dev/null | head -1)
fi
# If not found: drop the AI-cost estimate (graceful skip); the forecast block continues
# with human-equivalent + wall-clock.
```

**Calculation per story (exact — native currency, no FX):**

- **Expected AI cost** = `token_estimate` × tier price from `model-tiers.json`
  (`tiers.<recommended_model>.pricing`, USD per million tokens). Approximation: without an input/output split,
  apply the conservative output rate per million tokens (`output_per_million`), or a 70/30 input/output mix if
  the spec carries a split. The tier price is USD — with a CHF/EUR baseline, do **not** force an FX conversion of
  the AI cost (USD stays USD; flag it in the output).
- **Expected human-equivalent value** = `effort_human_equiv_hours` × `rate_per_hour` (native baseline currency).
- **Expected wall clock** (heuristic) = derived from `effort_ai_hours`: rough rule of thumb
  `wall_clock_days ≈ ceil(Σ effort_ai_hours / 6)` (one AI working day ≈ 6 productive AI hours incl. setup/review).
  Heuristic, not a promise — label it as "expected".
- **ROI factor per story** = expected human-equivalent value ÷ expected AI cost.
  > `effort_ai_hours` does **not** enter the ROI formula — only as context and into the wall-clock heuristic.

**Sprint aggregate** across all planned stories: Σ expected AI cost, Σ expected human-equivalent value,
Σ wall clock (or aggregate heuristic), sprint ROI = Σ human-equivalent ÷ Σ AI cost.

**Output block "Sprint forecast" (DE+EN) — shows when proposing the order:**

```
Sprint forecast (BOO-192) — planned sprint {N}
  Per story:
    {STORY} — AI ~{ki_cost} USD · human-equiv ~{human_equiv} {currency} · wall-clock ~{days} d · ROI ~{roi}×
    ...
  Sprint aggregate:
    - Expected AI cost:           ~{Σ ki_cost} USD   (token_estimate × tier price, approximation)
    - Expected human-equiv:       ~{Σ human_equiv} {currency}
    - Expected wall clock:        ~{Σ days} days  (heuristic from effort_ai_hours)
    - Expected sprint ROI:        ~{roi}×  (human-equiv ÷ AI)
```

**Persist the forecast:** store the forecast under `docs/financials/sprint-XX-forecast.md`
(template schema see [`docs/financials/sprint-XX-forecast.md`](../docs/financials/sprint-XX-forecast.md)).
`XX` = sprint number. Keep the frontmatter **field-identical** to the actual report
(`sprint-XX-worker-equivalent.md`, BOO-191), only `type: worker-equivalent-forecast` and estimated instead of
actual values — otherwise the forecast-vs-actual comparison won't match.

#### Step 4b-2: Forecast-vs-actual comparison (drift)

> Runs on the next planning pass, once **both** files exist for an earlier sprint:
> the persisted forecast (`docs/financials/sprint-XX-forecast.md`) and the actual report
> (`docs/financials/sprint-XX-worker-equivalent.md`, BOO-191). If either is missing → skip with a note.

1. Load both frontmatters and line them up per dimension.
2. Report **drift** per dimension (actual against forecast, in percent):
   - `ki_cost` drift = (actual `ki_cost` − forecast `ki_cost`) ÷ forecast `ki_cost`
   - `human_equiv_cost` drift = (actual − forecast) ÷ forecast
   - `roi_factor` drift = (actual − forecast) ÷ forecast
3. **Drift = quality-gate signal, NOT a hard block.** The drift blocks no sprint; it surfaces
   systematic under/over-estimation (calibration), analogous to the token pre-flight warnings.
   Hook-up: the cost-drift signal feeds `quality-gate-audit` (cf.
   vault decision "Cost-Drift als Quality-Gate-Dimension" (2026-05-06)) — as a **signal**, not a gate block.

**Output block "Forecast-vs-actual" (DE+EN):**

```
Forecast-vs-actual (BOO-192) — Sprint {N}   [signal, no block]
  - AI cost:       forecast ~{f_ki} → actual {a_ki}   (drift {±x}%)
  - human-equiv:   forecast ~{f_he} → actual {a_he}   (drift {±x}%)
  - ROI factor:    forecast ~{f_roi}× → actual {a_roi}×  (drift {±x}%)
  Note: drift is a calibration signal (quality-gate-audit cost-drift), not a sprint block.
```

### Step 5: Backlog hygiene (optional)

If issues are detected:
- Add missing dependencies
- Report orphaned references
- Suggest obsolete issues for the operator to close

### Step 6: Sprint-plan sync (BOO-194 — writing, manual trigger, dry-run default)

> **Boundary vs. the rest of the skill:** Steps 0–5 are **read-only** (read, prioritize, propose — they write nothing). Step 6 is the **only writing mode**: it writes the approved sprint assignment back to the backlog adapter (Linear). It runs **only on an explicit operator trigger** (`/backlog sync`, "sync the sprint plan", "write the sprint assignment") — NEVER automatically in the prioritization run.

**Purpose:** Linear cycles are deliberately not active (no API lever, manual UI step). Instead of clicking per story, this mode sets the sprint assignment **deterministically + repeatably** from an approved sprint plan.

#### 6.1 Read the sprint-plan source

1. The source is a markdown table in `Sprints.md` format (columns incl. `Story`, `Sprint`/slice) — either a **file** (operator names the path, e.g. the vault `Sprints.md`) or the **skill output** of a prior planning run.
2. **Table robustness (MANDATORY):** `Sprints.md` often contains several tables, including stale overview rows. The **authoritative source is the freshly planned detail section** of the target sprint (e.g. "### Sprint 6: …"), NOT the first matching table. When in doubt, have the operator confirm the exact section/file — do not guess.
3. Per row extract: issue ID (`BOO-XXX`) + target sprint (number/name).

#### 6.2 Plan the reconciliation (write nothing yet)

Per story:
1. **Sprint assignment:** determine the target label `sprint-N`. Since Linear has no active cycles, the **label** is the workable lever (use a dedicated sprint custom field only if it genuinely exists in the team — otherwise the label; do not invent a field name). **Append-only:** existing labels stay; a **differing** old `sprint-*` label is replaced only after confirmation.
2. **AC reconciliation (only when a spec is linked):** if the story references a `specs/<id>.md`, diff the spec's `## Acceptance Criteria` list against the Linear description. Show the diff; **never** blindly overwrite the Linear description.
3. **Re-sync before reconciling (BOO-405):** pull the affected records fresh by ID (narrow query) — the snapshot from step 1 is a working copy and may be stale; writes only happen against freshly read state.

#### 6.3 Dry-run preview (default)

- **Default is dry-run:** show all planned changes (sprint labels, AC diffs, replaced old labels) as a list — **without** calling `save_issue`.
- Per story: `BOO-XXX → +sprint-N` · `AC diff: +2/−1` · `replaces sprint-(old)?`.
- Switch to write mode only on explicit operator confirmation (Linear writes need a manual trigger; afterwards no per-story re-prompt).

#### 6.4 Write (after confirmation)

1. Per story `linear.save_issue(id, labels: […, sprint-N])` (append). AC update only for **confirmed** diffs via `description`.
   - **Gitea/Forgejo:** sprint = milestone → `PATCH /repos/{owner}/{repo}/issues/{index}` with `milestone: <milestone_id>` (ensure milestone `sprint-N` first via `GET/POST …/milestones`). Workflow state = label swap via `POST`/`DELETE …/issues/{index}/labels` (remove the old `status/*` label, set the new one); for `Done`/`Cancelled` also `state: closed` in the same PATCH. Append-only for non-status labels.
2. Catch errors per story and record them in the audit log — one failed story does not abort the run.

#### 6.5 Audit log (MANDATORY)

Log every run (dry-run too) under `docs/audits/backlog-sync-YYYY-MM-DD.md` (frontmatter schema analogous to `docs/audits/<date>-quality-gate-audit.md`):

```yaml
---
audit_id: <YYYY-MM-DD>-backlog-sync
triggered_by: <operator>
framework_version: <intentron-version>
plan_source: <path-or-section>
mode: dry-run | write
summary: { stories: N, sprint_labels_set: N, ac_diffs: N, skipped: N, errors: N }
---
```

Body: one table per story (`Issue | Sprint label | AC diff | Status` with `set`/`skip`/`error`), plus replaced old labels and error details. For dry-run, `mode: dry-run` — nothing written, the log documents the preview.

**Backlog-adapter neutrality:** the mechanics are described here for Linear (the active tool); with another adapter (CONVENTIONS.md §3) the same pattern applies with that tool's write call — for **Gitea/Forgejo** the REST/MCP calls above (identical for both forges, shared `/api/v1`; setup: `docs/runbooks/gitea-backlog-setup.md`). Without a reachable adapter (no Linear MCP, no Gitea/Forgejo access) → skip Step 6 with a note; prioritization (Steps 0–5) stays valid.
