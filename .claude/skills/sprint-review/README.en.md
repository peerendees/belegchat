---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="english"></a>

# Sprint Review — Periodic Audit of Architecture, Tech Debt, Backlog + Learning Loop

> Periodic system health check: active architecture dimensions · reports aggregation + metrics · tech debt inventory · backlog hygiene · process compliance · anti-pattern self-diagnosis · optional DPO audit trigger · learning-loop entry (L1/L2/L3). One run, one report, one action list — and a closed learning loop.

**Version:** 2.11.0 · **Command:** `/sprint-review`

> 🔗 Sprint automation: **`/sprint-run`** runs a whole sprint and orchestrates the chain `backlog → implement → sprint-review`. See [`sprint-run/`](../sprint-run/README.en.md) · HANDBUCH Appendix AD.

> **Claude Code mode:** `/sprint-review` writes audit reports → supervised **`acceptEdits`**; unattended (triggered by the `/sprint-run` daemon) **`dontAsk`** + allowlist. Details: HANDBUCH §6 "Claude Code mode".

---

## What It Does

Most teams review "how did the sprint go" by looking at velocity. That's a symptom. This skill audits the system itself: Is the architecture still healthy? Is tech debt growing? Are issues being written with dependencies? Are docs in sync? Does the project's practice match `CONVENTIONS.md`?

In addition, the skill closes the **learning loop**: at the end it captures lessons learned (level L1/L2/L3, depending on project configuration).

The output is actionable: Top-3 risks, a tech debt score (Low / Medium / High), recommended new issues, backlog cleanup suggestions, anti-pattern self-diagnosis, and — if the privacy add-on is active — a deterministic data-protection audit.

---

## How It Works (Steps 0–9b)

```
Step 0: Load environment
   · .claude/environment.json + CONVENTIONS.md (governance_mode, execution_isolation, gates)
   · Paths from paths.* (reports_local, lessons_l1/l2/l3, specs, ...)
   · Check tool availability via tools_available.<tool> (graceful skip)
   · If file missing: assume default paths + note in output

Step 1: System snapshot (parallel)
   · Backlog (all statuses, Linear/M365/GitHub)
   · ARCHITECTURE_DESIGN.md (FULL read, §1/§3/§4/§6/§7/§9 checklist + all ADRs)
   · SYSTEM_ARCHITECTURE.md · lib/config.js · git log of the period
   · Self-healing logs (if active) · prior journal/ entries (if learning loop active)

Step 1b: Governance convention drift
   · Practice vs. CONVENTIONS.md (governance_mode lite/standard/heavy, execution_isolation)
   · Document deviations as "Governance Drift"

Step 2: Architecture review (active dimensions)
   Standard: Reliability · Data Integrity · Security · Performance
             Observability · Maintainability · Testability
   Add-ons (if active): Privacy · Cost Efficiency · Signal Quality · Compliance
   + Testability metrics (coverage on new code, pass rate, contract tests)

Step 2b: Reports aggregation + metrics (BOO-6)
   · Local implement reports (meta.json: iteration counts, SARIF patterns)
   · CI reports (success rates, frequent failures) · SonarQube Cloud API (hotspots, trends)
   · Cost aggregation (BOO-84: token_tracking + model-tiers.json, tier breakdown, cache hit rate)
   · L3-DB trends (if active) → aggregate metrics into the sprint-file frontmatter

Step 2c: Project-index sensor (BOO-471) — read-only, not a gate
   · measures presence (graph.json + index-stamp.json) + freshness (stamp head_sha == HEAD)
   · observation/WARN into the journal, never FAIL; lite/no index = neutral skip
   · frontmatter project_index:{present,fresh,status} (anti-fabrication: no invented usage rate)

Step 3: Tech debt inventory
   · Code duplication · hardcoded values · deprecated features
   · Open code markers · stale dependencies

Step 4: Backlog hygiene
   · Orphans · missing dependencies · obsolete issues · missing issues · stale priorities

Step 5: Process compliance
   · Mandatory template on new issues? · Bidirectional dependency docs?
   · Doc versions in sync? · Obsidian change-logs? · Component docs current?
   · New *.md registered in ARCHITECTURE_DESIGN.md §9? (orphan check)

Step 6: Report + actions
   · 3–5 sentence summary · Top 3 risks · tech debt score
   · recommended new issues · backlog cleanup suggestions

Step 7: Anti-pattern self-diagnosis (BOO-26)
   · reads anti-pattern-katalog.md, Yes/No/Unclear per AP — reflection, not a gate (~5 min)
   · technical APs (skill-detectable) + culture APs (reflection only)
   · evaluation: all No = note · 1-2 Yes = retro entry · 3+ Yes = ADR proposal + issue

Step 7c: DPO audit trigger (BOO-69/BOO-87, only if privacy add-on active)
   · Activation: PRIVACY.md exists AND sprint counter reaches privacy_audit_cadence (default 4)
   · deterministic control-catalog runner (dpo/scripts/dpo-audit.py) over dpo/controls/*.yml
   · report pair dpo/reports/<date>_audit.md + .json with status PASS/GAP/REVIEW-NEEDED
   · aggregation into sprint report + backlog follow-up stories (label privacy) per GAP/REVIEW-NEEDED

Step 8: Learning-loop entry (MANDATORY when learning loop active)
   · Activated via .learning-loop (L1/L2/L3) — otherwise skipped
   · L1: learnings.md (3x what worked / didn't / next experiment)
   · L2: structured sprint journal + quarterly meta-retro on every 4th sprint
   · L3: additionally SQLite insert (journal/learnings.db)

Step 9: Cost snapshot (BOO-189) — append ccusage actuals to sprint-costs.md (soft gate)

Step 9b: Worker-equivalent report (BOO-191, only if Financials active)
   · reads the active billing rate from worker-equivalent-baseline.md section 1
   · aggregates Σ effort_ai_hours (context) + Σ effort_human_equiv_hours of the sprint stories (dual column, BOO-193)
   · AI cost from cost aggregate (step 2b) or ccusage; wall clock from sprint log/git
   · ROI = Σ(effort_human_equiv_hours) × rate ÷ AI cost (Σ effort_ai_hours context only)
   · report file docs/financials/sprint-XX-worker-equivalent.md; native currency, no FX conversion
   · graceful skip without baseline/dual column; block also visible in step 6 + conclusion
```

---

## Trigger Phrases

- `/sprint-review`
- "sprint review"
- "architecture audit"
- "tech debt"
- "cleanup"
- "retro"

---

## Interfaces with Other Skills

| Skill | Relationship |
|-------|--------------|
| `ideation` | On every story creation reads the last 3 learning-loop entries and warns on anti-pattern match |
| `architecture-review --system` | Can run the sprint review in system-wide scope (all active dimensions) |
| `breakfix` | Writes breakfix learnings into the loop in parallel as `what_didnt` with root cause |
| `implement` | Provides the local reports (meta.json, token tracking) for reports aggregation |
| `dpo` (standalone) | Provides the deterministic control-catalog runner for the DPO audit trigger (step 7c) |

---

## Artifacts / Outputs

- **Summary** — 3–5 sentence top-level assessment
- **Top 3 Risks** — what to fix first, with rationale
- **Tech Debt Score** — Low / Medium / High, plus reason
- **Recommended Issues** — new tickets, ready to create via `/ideation`
- **Backlog Cleanup** — issues to close, re-prioritize, or merge
- **Aggregate Metrics** — into the sprint-file frontmatter (iterations, coverage trend, SonarQube hotspots, cost/tier breakdown)
- **Project-index sensor** (BOO-471) — `project_index:{present,fresh,status}` in the frontmatter + an observation line in the report (not a gate)
- **Anti-Pattern Self-Diagnosis** — Yes/No/Unclear matrix with countermeasures
- **Privacy Audit** (if active) — `dpo/reports/<date>_audit.md` + `.json` with PASS/GAP/REVIEW-NEEDED list
- **Worker-Equivalent Report** (if Financials active, BOO-191) — `docs/financials/sprint-XX-worker-equivalent.md` with AI cost, human-equivalent cost, ROI factor and wall clock (native currency)
- **Learning-Loop Entries** — `journal/learnings.md` (L1), sprint journal (L2), SQLite DB (L3)

---

## Configuration

Learning-loop activation: `{PROJECT_PATH}/.learning-loop` file containing `L1`, `L2`, or `L3`. Created in bootstrap block D.4 or manually later.

DPO audit trigger (step 7c): `PRIVACY.md` in the project root + `environment.json.privacy_audit_cadence` (default 4 sprints). DPO skill is standalone under `~/.claude/skills/dpo/`, catalogs under `dpo/controls/`.

---

## Installation

```bash
cp -r sprint-review ~/.claude/skills/sprint-review
```

---

## File Structure

```
sprint-review/
├── SKILL.md                            ← Skill definition (DE)
├── SKILL.en.md                         ← Skill definition (EN)
├── README.md / README.en.md            ← this overview
└── scripts/
    ├── project_index_sensor.py         ← project-index sensor (BOO-471, read-only)
    └── test_project_index_sensor.py    ← stdlib unittest regression
```

---

---

