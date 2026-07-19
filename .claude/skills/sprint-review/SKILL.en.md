---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: sprint-review
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Periodic audit for architectural health, tech debt and backlog hygiene — plus
  a mandatory learning-loop entry (L1/L2/L3). Use for periodic reviews or when
  the operator says "sprint review", "architecture audit", "tech debt", "clean up"
  or "/sprint-review".
version: 2.11.0
language: en
metadata:
  hermes:
    category: governance
    tags: [retro, lessons-loop, anti-pattern-check]
    requires_toolsets: [terminal, git, sonarqube, linear]
    related_skills: [implement, architecture-review]
---

# Sprint Review

Periodic audit of the whole system plus learning-loop entry. The skill closes the learning loop by capturing lessons-learned at the end (level L1/L2/L3 depending on project configuration).

## Workflow (10 steps)

### Step 0: Load environment

1. Read `.claude/environment.json` (if present — otherwise fall back to defaults and log a warning).
2. Read project-local `CONVENTIONS.md` if present. Extract `governance_mode` and `execution_isolation`. Fallback: `governance_mode: standard`, `execution_isolation: write-scope`. Additionally extract the active gates.
3. Extract paths from `paths.*` as needed (e.g. `paths.reports_local`, `paths.lessons_l1`, `paths.lessons_l2_dir`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`, `paths.conventions`).
4. Before any tool invocation, check `tools_available.<tool>`. If `false` or missing, the skill skips the call and notes it in the output.
5. Missing-file fallback: assume the schema defaults (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`, `CONVENTIONS.md`) and add a note to the output: "Note: `.claude/environment.json` is missing — defaults active. Recommendation: re-run `/bootstrap` or create the file manually."

### Step 1: System snapshot

Load in parallel:
1. Full backlog (all statuses, Linear/M365/GitHub depending on tool)
2. **Read `ARCHITECTURE_DESIGN.md` IN FULL** — to the last line — all sections and ADRs.
   **Mandatory checklist:**
   - [ ] §1 Architectural Vision + guiding principles
   - [ ] §3 Quality Attributes (active standard dimensions + add-ons)
   - [ ] §4 Component references
   - [ ] §6 Phase mapping
   - [ ] §7 ADR table in full
   - [ ] §9 References (know all linked docs)
3. Read `SYSTEM_ARCHITECTURE.md` in full
4. Version-SSoT file, **if present** (e.g. `lib/config.js` with the Node scaffold: configuration, DOC_FILES list — BOO-419)
5. Git log of the last period (commits, branches, new files)
6. If self-healing active: check self-healing logs (most frequent warnings)
7. If learning loop active: read previous `journal/` entries (context for step 8)

### Step 1b: Governance-convention drift

Check whether project practice matches `CONVENTIONS.md`:

| Convention | Review question |
|---|---|
| `governance_mode: lite` | Are only baseline gates active, without heavy reports being forced? |
| `governance_mode: standard` | Are spec gate, baseline security check, tests/lint and sprint-review traces present? |
| `governance_mode: heavy` | Are extended security/compliance/architecture gates, reports and review evidence present? |
| `execution_isolation: write-scope` | Did parallel stories/sub-agents use clear `write_scopes`? |
| `execution_isolation: git-worktree` | Did parallel agents/agentic runs execute in separate worktrees or branches? |

Document deviations in the sprint report as `Governance Drift` and propose a backlog issue when the pattern repeats.

### Step 2: Architecture review (active dimensions)

Read the **active dimensions** from `ARCHITECTURE_DESIGN.md §3 Quality Attributes`. These are the 7 standard dimensions + all add-ons activated in bootstrap block A.4.

Per active dimension: status (OK / warning / critical) + finding + recommendation.

**Standard dimensions:** Reliability, Data Integrity, Security, Performance, Observability, Maintainability, Testability

**Add-ons (if active):** Privacy / Cost Efficiency / Signal Quality / Compliance

**Testability-specific metrics in sprint review:**
- Coverage on new code (change value, BOO-15 hook): trend across the sprint?
- Test-suite pass rate: stable green or flaky / red?
- Number of newly added contract tests on external interfaces?

Detail questions per dimension: see `architecture-review/references/dimensions-detail.en.md`.

### Step 2b: Reports aggregation + metrics (BOO-6)

Sprint Review aggregates four sources per sprint and writes the results as frontmatter into the sprint file.

**Read sources (all optional, graceful skip on missing source):**

| Source | Path | What gets read |
|---|---|---|
| Local implement reports | `journal/reports/local/{date}_{story}/` | iteration counts per tool from `meta.json`, iter-N SARIF files for pattern detection |
| CI reports | `journal/reports/ci/run-{id}/` | CI success rates, common failures (BOO-32 convention) |
| SonarQube Cloud API | `https://sonarcloud.io/api/` | new hotspots in the sprint, coverage trend, cognitive-complexity trend |
| L3 DB | `journal/learnings.db` | cross-sprint trends (only when level L3 active, otherwise skip) |

**SonarQube API read block (analogous to architecture-review BOO-6):**

```bash
# Precondition check (see architecture-review SKILL.en.md BOO-6 block)
# When SONAR_TOKEN + sonar-project.properties + tools_available.sonarqube_cloud == true:

# New findings in the current sprint window (SPRINT_START_ISO -> today)
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/issues/search?componentKeys=${PROJECT_KEY}&createdAfter=${SPRINT_START_ISO}&ps=100" \
  | jq '.issues | length'

# Coverage and complexity trend (history API)
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/measures/search_history?component=${PROJECT_KEY}&metrics=coverage,cognitive_complexity&from=${SPRINT_START_ISO}" \
  | jq '.measures'
```

On missing precondition: graceful skip with `[!info] SonarQube block skipped — metrics unavailable`.

**Local reports aggregation:**

```bash
# Read all meta.json files from the last N days (N = sprint length)
find journal/reports/local -name "meta.json" -mtime -${SPRINT_DAYS} | while read m; do
  jq '. | {story_id, iterations, final_status, pre_flight_warning}' "$m"
done | jq -s '
  {
    eslint_iterations_avg: (map(.iterations.eslint) | add / length),
    semgrep_findings_total: (map(.iterations.semgrep) | add),
    pre_flight_warnings_count: (map(select(.pre_flight_warning != null)) | length)
  }
'
```

**Cost aggregation (BOO-84):**

Read `token_tracking` from all sprint meta.json files and compute cost aggregates via `bootstrap/references/model-tiers.json` (pricing is central, not duplicated per meta.json).

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

if [ -n "$TIERS_FILE" ] && [ -f "$TIERS_FILE" ]; then
  # Cost per story comes from token_tracking.story_totals.estimated_cost_usd (already populated by implement skill when hook active)
  find journal/reports/local -name "meta.json" -mtime -${SPRINT_DAYS} | while read m; do
    jq -r '
      if .token_tracking and .token_tracking.story_totals
      then
        {
          story_id: .story_id,
          model_breakdown: (
            (.token_tracking.skill_invocations // [])
            | group_by(.model_tier_default)
            | map({tier: .[0].model_tier_default, input: (map(.input_tokens_total) | add), output: (map(.output_tokens_total) | add)})
          ),
          cache_hit_rate: .token_tracking.cache_hit_rate,
          estimated_cost_usd: .token_tracking.story_totals.estimated_cost_usd,
          override_count: (.override_audit // [] | length)
        }
      else
        {story_id: .story_id, model_breakdown: null, cache_hit_rate: null, estimated_cost_usd: null, override_count: 0}
      end
    ' "$m"
  done | jq -s '
    {
      total_cost_usd: (map(.estimated_cost_usd // 0) | add),
      stories_with_token_data: (map(select(.estimated_cost_usd != null)) | length),
      stories_without_token_data: (map(select(.estimated_cost_usd == null)) | length),
      cache_hit_rate_avg: (map(.cache_hit_rate) | map(select(. != null)) | if length > 0 then add / length else null end),
      override_count_total: (map(.override_count) | add),
      tier_breakdown: (
        map(.model_breakdown // []) | flatten
        | group_by(.tier)
        | map({tier: .[0].tier, input_tokens: (map(.input) | add), output_tokens: (map(.output) | add)})
      )
    }
  '
fi
```

If `model-tiers.json` is not found or no story contains token data: graceful skip with `[!info] Cost aggregate skipped — model-tiers.json missing or token-tracking hook not active`.

**CI reports aggregation:**

```bash
# Read SARIF + JUnit XML files from journal/reports/ci/run-*/
# CI failure patterns from the last sprint:
find journal/reports/ci -name "*.sarif" -mtime -${SPRINT_DAYS} | xargs jq -s '
  [.[] | .runs[].results[] | .ruleId] | group_by(.) | map({rule: .[0], count: length}) | sort_by(-.count) | .[0:5]
'
```

**L3 DB read (when active):**

```sql
-- Trend across last 5 sprints
SELECT sprint_number, eslint_iterations_avg, coverage_trend, sonarqube_hotspots_new
FROM sprint_metrics
ORDER BY sprint_number DESC
LIMIT 5;
```

**Aggregate metrics into the sprint-file frontmatter:**

Extend `journal/sprint-{date}.md` frontmatter (in addition to existing fields):

```yaml
---
sprint: 12
stories: [BOO-15, BOO-16, BOO-17]
metrics:
  eslint_iterations_avg: 2.3
  eslint_recurring_rules:
    - "no-unused-vars (4x)"
    - "react-hooks/exhaustive-deps (3x)"
  semgrep_findings_total: 0
  coverage_trend: "82% -> 84% (+2pp)"
  pre_flight_warnings_count: 1
  ci_failures_top5:
    - "BOO-15: SonarQube hotspot in auth.ts"
  sonarqube_hotspots_new: 1
  sonarqube_hotspots_resolved: 3
  sonarqube_cognitive_complexity_trend: "stable"
  # BOO-84 token-efficiency metrics (all optional, empty when hook not active)
  cost_breakdown:
    total_cost_usd: 1.23
    stories_with_token_data: 3
    stories_without_token_data: 0
    cache_hit_rate_avg: 0.78
    override_count_total: 0
    tier_breakdown:
      - tier: haiku
        input_tokens: 45000
        output_tokens: 8000
      - tier: sonnet
        input_tokens: 85000
        output_tokens: 18000
      - tier: opus
        input_tokens: 12000
        output_tokens: 4000
---
```

**What sprint review additionally detects:**

- Recurring iteration patterns: "ESLint rule X blocked in 4 out of 5 stories"
- Coverage drift across multiple sprints
- CI failure patterns (which checks fail most often)
- Token pre-flight warnings (BOO-40): when the operator regularly proceeded despite warnings → calibration input for BOO-39

Results flow into step 6 (report) and step 8 (learning loop) — e.g. when ESLint rule X failed 4×, lesson "consider ESLint rule X as a custom rule for the skill generator".

### Step 2c: Project-index sensor (BOO-471, read-only observation — not a gate)

> **Sensor, not enforcement.** This step only MEASURES whether a project index
> exists and whether its stamp is fresh, and writes the observation into the sprint
> journal. It never blocks and never FAILs — with no index (lite/not built) it is
> **neutrally skipped**. Rationale: a hard read-gate would be trivially gameable
> ("fake hardness", [ADR knowledge-graph-strategie](../docs/domain/adrs/knowledge-graph-strategie.md));
> only presence + freshness are provable (anti-fabrication — **no** invented
> "usage rate").

**What is measured (provable from the filesystem alone):**

- **Presence** — do `graphify-out/graph.json` **and** `graphify-out/index-stamp.json` exist?
- **Freshness** — stamp `head_sha` == current git `HEAD`?

That is an **availability/maintenance signal**: a stale stamp means "built, but
nobody rebuilds it" → weak signal that the index is used. It is **not** a claim that
"it was queried this session" — that could only be asserted via a gameable usage log
and is deliberately not fabricated.

**Execution (read-only, exit code always 0):** the sensor travels inside the skill
folder (`<sprint-review-skill>/scripts/project_index_sensor.py`, `<sprint-review-skill>`
= standalone under `~/.claude/skills/sprint-review/` — same pattern as dpo-audit in
step 7c). No project-local copy needed.

```bash
SENSOR="<sprint-review-skill>/scripts/project_index_sensor.py"   # ~/.claude/skills/sprint-review/scripts/…
if [ -f "$SENSOR" ]; then
  python3 "$SENSOR" --root . --format line          # observation line for the report (step 6)
  python3 "$SENSOR" --root . --format frontmatter    # YAML fragment for the journal
else
  echo "[SKIP] Project-index sensor not found — skipped (not an error)."
fi
```

**Tier awareness:** `graphify-out/graph.json` does not exist at all under
`governance_mode: lite` (index deliberately omitted) → the sensor reports
`status: absent` and skips neutrally, **no WARN**. Under `standard`/`enterprise`
without a built index, `absent` is a gentle hint, not a block.

**Fold into the sprint-journal frontmatter** (`journal/sprint-{date}.md`, in addition
to the metrics from step 2b):

```yaml
project_index:          # code graph (BOO-448): graph.json + index-stamp.json
  present: true
  fresh: true           # stamp head_sha == HEAD  (null = not determinable, never a fabricated false)
  status: fresh         # fresh | stale | unstamped | unknown | absent
doc_index:              # docs index (BOO-476): docs-index.json (head_sha embedded)
  present: true
  fresh: true
  status: fresh
```

**Status meaning (observation, never a block):**

| status | meaning | journal marker |
|---|---|---|
| `fresh` | index present, stamp == HEAD | `[OK]` |
| `stale` | index present, stamp outdated — built, not rebuilt | `[WARN]` |
| `unstamped` | graph present, stamp missing/unreadable — freshness undeterminable | `[WARN]` |
| `unknown` | graph + stamp present, but no git HEAD — not comparable | `[INFO]` |
| `absent` | no index (lite/not built) — **neutrally skipped** | `[SKIP]` |

**Both indexes (BOO-476/BOO-477):** with `--which both` (default) the sensor measures **two** indexes under the same schema — the **code graph** (`project_index`, `graphify-out/graph.json` + separate stamp) and the **docs index** (`doc_index`, `docs-index.json` with an embedded `head_sha`). Each is judged independently; `--which code` / `--which docs` measures only one. How the sensor works — jargon-free: **runbook [«How the index sensor works»](../docs/runbooks/index-sensor.en.md)** (DE/EN).

The observation line flows into **step 6 (report)**. Across sprints the frontmatter
field makes it analyzable whether projects keep their index built (number discipline
instead of stale prose counters) — the **evidence** to later decide whether anything
more is even needed (decision-validity: measure first, act on proof).

> **Docs:** sensor script `sprint-review/scripts/project_index_sensor.py` (+ test).
> The sensor is the **feedback loop** to the query-first rule (global
> CLAUDE.md/AGENTS.md + `/implement` step 0c, BOO-445) — it enforces nothing, it
> makes things visible. Background: [ADR knowledge-graph-strategie](../docs/domain/adrs/knowledge-graph-strategie.md)
> and [HANDBUCH appendix BM (Token: graph query vs. grep)](../docs/handbuch/anhang-bm-token-optimierung-graph-query-vs-grep.md).
> The query layer itself (appendix BN) arrives with BOO-448; the sensor works
> without it too (then only measures `absent`).

### Step 3: Tech-debt inventory

- Identify code duplication (same functions in multiple files)
- Hardcoded values that belong in the version/config SSoT (e.g. `lib/config.js`, if present)
- Deprecated features not yet removed
- Count and assess open code markers (unfinished spots, workarounds, TODOs)
- Stale dependencies or outdated API versions

### Step 4: Backlog hygiene

- Orphaned issues (referenced issues that don't exist)
- Issues without dependencies that should have some
- Obsolete issues (superseded by other work)
- Missing issues (tech debt without a ticket)
- Priorities still up-to-date?

### Step 5: Process compliance

- Do all recent issues have the mandatory template?
- Were dependencies documented bidirectionally?
- Are all doc files on the same VERSION (version SSoT vs. DOC_FILES — e.g. `lib/config.js`, if present)?
- Were Obsidian change logs written?
- Are component docs (Obsidian or `docs/components/`) up-to-date for all active components?
- Are all new `*.md` files registered in `ARCHITECTURE_DESIGN.md §9`? (orphan-check)

### Step 6: Report + actions

Present to the operator:
- **Summary**: 3–5 sentences, overall assessment
- **Top 3 risks**: what should be tackled next?
- **Tech-debt score**: low / medium / high
- **Recommended issues**: new stories for identified tech debt
- **Backlog cleanup**: issues to close/adjust
- **Worker-equivalent** (if Financials active, BOO-191): AI cost, human-equivalent cost, ROI factor and wall clock — the sprint's output ROI in money (details + calculation see step 9b). With Financials inactive or no dual column: omit the line (graceful skip).

### Step 7: Anti-Pattern Self-Diagnosis (BOO-26)

> Reads `intentron/references/anti-pattern-katalog.en.md` and asks a brief Yes/No/Unclear question per AP.
> No hard block — this step is reflection, not a gate.
> Duration: approx. 5 minutes.

**Technical APs (Process + Quality — skill-detectable):**

| AP | Diagnostic question | Yes/No/Unclear |
|----|---------------------|----------------|
| AP1 Tool chaos | More than 2 different AI coding tools in use — without central evaluation? | |
| AP2 Review overload | Did PR reviews regularly take >24h in the last sprint? | |
| AP3 Feature inflation | Were features built without intent-linkage — just because they were "quick to do"? | |
| AP4 Security as finish line | Are security checks done as the last step before deployment rather than in the pipeline? | |
| AP5 Technical debt in turbo mode | Are duplication rates or conflicting architecture patterns rising in the code? | |
| AP6 Experience debt | Were features shipped without a UX/design review — "design comes later"? | |
| AP8 Speed without system | More than 1 rollback in the last sprint due to missing tests or observability? | |
| AP10 Slopware | More features than previous sprints — but declining outcome measurement? | |

**Culture APs (reflection only — not skill-detectable):**

| AP | Diagnostic question | Yes/No/Unclear |
|----|---------------------|----------------|
| AP7 Responsibility diffusion | Did anyone say "the AI did it that way" when something went wrong? | |
| AP9 Individual-first as isolation | Is there duplicate work because architecture decisions were not shared? | |
| AP11 Political saboteurs | Is there a pattern of systematic blockers from the same people? | |

**Evaluation:**
- **All No:** No acute AP problem — brief note in learning loop
- **1-2 Yes/Unclear:** Entry in sprint retro with concrete countermeasure from `anti-pattern-katalog.en.md`
- **3+ Yes/Unclear:** Propose an ADR (`docs/domain/adrs/`) + issue in backlog for the countermeasure

Full symptoms + countermeasures: `intentron/references/anti-pattern-katalog.en.md`

### Step 7c: DPO audit trigger + re-classification check (BOO-69/BOO-427)

> **Activation:** the **re-classification check (item 0)** runs in EVERY sprint review — even
> without `PRIVACY.md` (BOO-427; previously everything was inactive without the add-on and
> nothing challenged the old classification, finding B3-03). The **catalog audit (items 1-5)**
> runs only if `PRIVACY.md` exists in the project root AND the sprint counter has reached the
> `privacy_audit_cadence` threshold (from `environment.json`, default: every 4 sprints).

**Item 0 — re-classification check (ALWAYS runs, BOO-427):**

a. **Mechanical:** does `.claude/personal-data-paths.json` exist, but NO `PRIVACY.md`?
   → report a GAP: "PII-typical paths declared, but privacy add-on inactive" and
   **propose add-on activation as a blocker** (`intentron migrate BOO-69` or bootstrap
   privacy add-on). The catalog control `GDPR-Art25-003` (conditional-file) delivers the
   same signal once the audit runs.
b. **Ask the operator:** "Has the data footprint changed since the last review — does the
   project now process personal data (new data categories, new columns like
   email/phone/birthdate, new third-party data flows)? y/n"
c. **On "yes" without an active add-on:** propose add-on activation as a blocker (as in a).
   On "yes" with an active add-on: check `personal-data-paths.json` for new paths.
   No hard stop — but document the proposal and the operator's answer in the sprint report.

**Purpose:** periodic privacy compliance check via a **deterministic control catalog** (BOO-87) instead of free-text assessment. The catalog runner works through the YAML catalogs under `dpo/controls/` control by control and produces a reproducible, auditor-ready report pair.

**Steps:**

1. **Cadence check:** compare sprint counter (e.g. via count of `journal/sprints/` directory) against `environment.json.privacy_audit_cadence`. If not reached: skip with log entry "BOO-69 DPO audit: cadence not reached (sprint {{N}} of {{CADENCE}})".
2. **Run the catalog runner** (deterministic, BOO-87): from the project root
   `DPO_PROJECT_ROOT=. python3 <dpo-skill>/scripts/dpo-audit.py`
   (`<dpo-skill>` = path of the dpo skill, standalone under `~/.claude/skills/dpo/`). The runner reads `dpo/controls/gdpr.yml` + `ndsg.yml` plus optional project overlays under `.claude/dpo/controls/`.
3. **Generated report pair** under `dpo/reports/<date>_audit.md` (human-readable) + `.json` (machine-readable). Each control carries a status:
   - **PASS** — mechanical check satisfied (reproducible)
   - **GAP** — mechanical check failed, concrete gap (see `mapsTo`)
   - **REVIEW-NEEDED** — judgment check that the operator confirms manually (no auto-verdict, no legal advice)
4. **Aggregation into the sprint report:** section `## Privacy Audit (BOO-69/BOO-87)` referencing `dpo/reports/<date>_audit.md`, the PASS/GAP/REVIEW-NEEDED summary, plus the **GAP list** and the **REVIEW-NEEDED items** the operator works through.
5. **Create backlog follow-up stories** (per open GAP and per open REVIEW-NEEDED item): one story each in the backlog adapter with label `privacy`.

**Skip case:** if `PRIVACY.md` is missing or cadence not reached → skip only the **catalog audit** (items 1-5). The re-classification check (item 0) still runs — it is exactly what catches the case "the project now processes PII, but nobody retrofitted the add-on" (BOO-427).

> **Issue reference:** BOO-69 (trigger) + BOO-87 (deterministic control catalog). DPO skill as standalone under `~/.claude/skills/dpo/`. Catalogs: `dpo/controls/`. Configuration: `environment.json.privacy_audit_cadence` (default 4). HANDBUCH background: Appendix O Privacy by Design §AUDIT mode + §Deterministic control catalog (BOO-87).

### Step 7d: Operator reflection via insights-review (BOO-206, only if complement_insights active)

> **Activation:** only when `native_paths.complement_insights: true` in the project `CLAUDE.md` (BOO-199) AND `runtime_target: claude-code` (switch-A coupling). Default `true`. Otherwise skip with a log note.

**Purpose:** capture this sprint period's operator working patterns as a separated reflection — complementary to the learning loop (project knowledge), not mixed (ADR-3).

**Steps:**

1. Check flag + `runtime_target`. Not met → skip step 7d.
2. Trigger the **`insights-review`** skill: it calls Anthropic's native `/insights` (operator confirms; operator-local data) and integrates the **operator-reflection meta block** into `journal/sprint-{date}.md` — separate from the learning-loop entry (step 8). If `/insights` fails or the operator declines → skip, no hard block.
3. Reference the meta block in the sprint report (step 6).

Boundary: `/sprint-review` = project lesson (repo); `/insights` = operator reflection (local). Docs: HANDBUCH Appendix AO (BOO-211); skill: `insights-review/SKILL.en.md`.

### Step 8: Learning-loop entry (mandatory if learning loop active)

> **Activation:** this step only runs if `{PROJECT_PATH}/.learning-loop` exists (contents: `L1`, `L2` or `L3`).
> If the file is missing: the skill skips step 7 and ends after step 6.
>
> **Loud instead of silent (BOO-468):** if the declaration (`learning_loop` in `CONVENTIONS.md` §3 or `.claude/environment.json` `governance.learning_loop`) names a level `L1|L2|L3` but the activation file is missing → emit exactly **one** warning line instead of skipping without comment: `Warning: learning loop {LEVEL} declared, but .learning-loop is missing — reconciliation: migrate-to-v2.sh --issue BOO-468.` Then skip as before. Projects without a declaration keep skipping silently.

The learning loop captures systematically **three categories**: what worked, what didn't work, next experiment. Details see `bootstrap/references/learning-loop.en.md`.

#### Level L1 — Simple (learnings.md)

The skill asks:
```
Sprint review complete. Now the learning-loop entry:

1. WHAT WORKED in this period? (3 bullets, with story link if relevant)
2. WHAT DIDN'T WORK (+ root cause if known)? (3 bullets)
3. NEXT EXPERIMENT / CHANGE? (3 bullets, concrete and measurable)
```

The skill appends the entry with a date header to:
- `{PROJECT_PATH}/journal/learnings.md`
- If Obsidian active: mirror in `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/learnings.md`

Commit: `docs: sprint-review learnings {TODAY}`

#### Level L2 — Structured (sprint journal)

The skill prepares frontmatter from git log + backlog API (sprint number, story counts, velocity, period).

The skill asks the 4 qualitative sections:
1. What worked (with tag list)
2. What didn't (+ root cause, with tag list)
3. Next experiment (idea + measurement criterion + assigned story)
4. Learnings for upcoming sprints (meta rules)

The skill saves:
- Primary: `{PROJECT_PATH}/journal/sprint-{YYYY-MM-XX}.md` with full frontmatter
- Mirror (if Obsidian active): `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/sprints/sprint-{YYYY-MM-XX}.md`

Commit: `docs: sprint-retro {SPRINT_NUMBER} ({TODAY})`

**Quarterly meta-retro:** on every 4th sprint review, the skill consolidates the last 4 sprint retros and writes `{PROJECT_PATH}/journal/quarterly-{YYYY-QX}.md` with trends, top anti-patterns, successful experiments.

#### Level L3 — SQLite + MD (only when active)

In addition to L2:
- Parse the L2 frontmatter + bullets
- Insert into `{PROJECT_PATH}/journal/learnings.db` — `journal/write_sprint.py` is **planned, not shipped (BOO-419)**; until then insert directly via `sqlite3` (schema: `bootstrap/references/learning-loop.en.md`)
- Tables: `sprints`, `events`, `metrics`, `experiments` (schema see `bootstrap/references/learning-loop.en.md`)

The skill optionally asks for additional metrics (e.g. `avg_story_time_days`, `api_cost_total`).

### Step 9: Cost snapshot (BOO-189)

At review close, capture the **actual consumption** from the local Claude Code logs — as a measured
quantity, complementary to the estimated `token_tracking` cost aggregate from step 2b:

- Call: `bash .claude/hooks/ccusage-capture.sh "/sprint-review <sprint>"` (capture template from setup,
  internally `npx --yes ccusage@latest daily`). Appends a token/cost snapshot to
  `docs/financials/sprint-costs.md`.
- **Soft gate:** if the call fails (ccusage/npx not installed, no log), **only warn** and **do not abort**
  the review — the report stays valid.
- **Complementary to the estimate:** the actual value complements the aggregated `token_tracking` from the
  story `meta.json` (step 2b); it does not replace it — estimate (`meta.json`) vs. measurement (ccusage)
  side by side.
- **Known limitation:** ccusage may not attribute sub-agent tokens (Task tool) cleanly (issues
  #313/#806/#950) — in heavily sub-agent-driven runs the reported consumption may be incomplete or
  charged to the parent.

### Step 9b: Worker-Equivalent report (BOO-191, only if Financials active)

> **Activation:** this step runs right after step 9 — the actual consumption (ccusage, `sprint-costs.md`) is
> already available there. It surfaces the **output ROI** of the sprint in money: what it actually cost (AI),
> what it would have cost the classic way (human equivalent), how fast we were (wall clock). No new data
> collection — only aggregation of already-present sources.

**Graceful skip (no hard block):** if `docs/financials/worker-equivalent-baseline.md` is missing (Financials not
active) or the stories completed in the sprint carry no dual column (`effort_ai_hours` /
`effort_human_equiv_hours`, BOO-193) → skip this step with `[!info] Worker-Equivalent report skipped — Financials
not active or no dual-column data`. The review stays valid.

**Inputs (all already present, collect nothing new):**

| Input | Source |
|---|---|
| Active billing rate + currency | `docs/financials/worker-equivalent-baseline.md` **section 1** (`rate_per_hour`, `currency`, `geo`, `source`) — internal precedence already applies there (BOO-190) |
| Σ `effort_ai_hours` (context) | Execution-isolation block of the stories completed in the sprint (dual column, BOO-193) |
| Σ `effort_human_equiv_hours` | Execution-isolation block of the stories completed in the sprint (dual column, BOO-193) |
| AI cost | Cost aggregate from step 2b (`cost_breakdown.total_cost_usd`); complemented by the ccusage actual snapshot from step 9 (`sprint-costs.md`, BOO-189) |
| Wall clock | Sprint log / git window (first to last sprint commit) |

**Calculation (exact):**

- **Human-equivalent cost** = Σ `effort_human_equiv_hours` × `rate_per_hour` (native currency from the baseline,
  **no** FX conversion).
- **ROI factor** = human-equivalent cost ÷ AI cost.
  > Σ `effort_ai_hours` is reported **as context only** — **not** part of the ROI formula.
- **AI cost** comes from the cost aggregate (step 2b) or ccusage; native, no conversion. Note: ccusage may not
  attribute sub-agent tokens (Task tool) cleanly (issues #313/#806/#950) — flag the AI-cost value in the report as an
  **approximation**.

**Output block "Worker-Equivalent" (DE+EN) — shown in the review:**

```
Worker-Equivalent (BOO-191) — Sprint {N}
  - AI cost:                  {ki_cost} {currency}   (approximation, ccusage sub-agent limit)
  - Σ effort_ai_hours:        {sum_ai} h  (context, not in ROI)
  - Σ effort_human_equiv_h:   {sum_human} h
  - Billing rate:             {rate_per_hour} {currency}/h  ({source})
  - Human-equivalent cost:    {human_equiv_cost} {currency}
  - ROI factor:               {roi_factor}×  (human equiv ÷ AI)
  - Wall clock:               {wall_clock_days} days
```

**Persist the report file:** `docs/financials/sprint-XX-worker-equivalent.md` (template schema see
[`docs/financials/sprint-XX-worker-equivalent.md`](../docs/financials/sprint-XX-worker-equivalent.md)). `XX` =
sprint number. Keep the frontmatter structured so BOO-192 (forecast-vs-actual) can read it back machine-side.

**Visibility:** also surface the worker-equivalent block in **step 6 (report)** and the **conclusion summary**
(see below). ROI language stays **internal** for now (ADR-D §Open) until ≥3 sprints of data exist.

### Conclusion

After step 9b (or step 8 with learning loop, otherwise step 7):

```
Sprint review complete.

Report:
  - Architecture: {n} OK / {n} warnings / {n} critical
  - Tech debt: {score}
  - Backlog cleanup: {n} recommendations
  - Anti-pattern self-diagnosis: {n} Yes hits — {action}
  - Worker-equivalent: ROI {roi_factor}× (human equiv {human_equiv_cost} {currency} ÷ AI {ki_cost} {currency}) — or: skipped
  - Learning loop: {level} → {n} entries saved

Commits:
  - sprint-review report (if saved as MD)
  - learnings entry (step 8)

Next steps:
  1. Review recommended issues in backlog
  2. Quarterly meta-retro if sprint number % 4 == 0
```

## Integration with other skills

- **`/ideation`** reads the last 3 learning-loop entries at every story creation (step 0.5) and warns on anti-pattern match.
- **`/architecture-review --system`** can run the sprint review at system scope (all active dimensions).
- **`/breakfix`** writes breakfix learnings into the loop in parallel as `what_didnt` with root cause.

## Triggers

- Operator says: "sprint review", "architecture audit", "tech debt", "clean up", "retro"
- Slash command: `/sprint-review`
- Cron (optional): weekly / monthly — sends reminder: "time for sprint-review"
- After every 4th sprint: quarterly meta-retro trigger

## Configuration

Learning-loop activation: `{PROJECT_PATH}/.learning-loop` file with contents `L1`, `L2` or `L3`. Derived by bootstrap (phase 7.3c) from the `learning_loop` declaration in `CONVENTIONS.md` §3 (block D.4 = override question); existing projects: `migrate-to-v2.sh --issue BOO-468`.
