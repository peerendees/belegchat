---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Token heuristic for /ideation step 5b (BOO-39)

Detailed heuristic signals that `/ideation` step 5b uses to estimate token usage for a story. The signals are extracted from the story description (step 4 draft + step 5 alignment) and documented in `estimation_basis` as prose.

## Signal table

| Signal | Token impact | How it shows up in the story |
|--------|---|---|
| **Number of affected files** | linear ~2k per file | "files:" section in the spec, or path enumeration in the body |
| **Expected diff size** | ~100 tokens per 50 lines | operator estimate, otherwise heuristic from file list |
| **Test effort** | new tests +20–50% tool output, extended tests +10–20% | "Tests:" bullet in AC, or context hint "incl. tests" |
| **Documentation effort** | HANDBUCH update +10–30%, README update +5–15%, Excalidraw +10–20% | "HANDBUCH" mention, "docs" bullet, new skill |
| **Cross-skill touchpoints** | +1k per affected skill (read overhead) | "Skill:" mentions in the spec, bundle skill names (bootstrap, implement, ...) |
| **Reference-file read overhead** | +500–2000 per reference | "see `references/X.md`" pointers in the spec |
| **Experience factor (L3)** | multiplier 0.8–1.2 based on similar stories | `journal/learnings.db` (when level L3 is active) |

## Worked example

Story BOO-39 itself (this very story):

| Item | Value |
|---|---|
| Files: 4 (ideation/SKILL.md + .en.md, references/token-heuristik.md NEW + .en.md) | 4 × 2k = 8k |
| Diff: ~250 lines of new logic | 250/50 × 100 = 500 |
| Tests: no new tests (skill change, no code) | 0 |
| Docs: HANDBUCH Appendix G already existed, untouched; reference file NEW = +20% | (8k + 500) × 0.2 = 1.7k |
| Cross-skill: implement (BOO-40), backlog, sprint-review | 3 × 1k = 3k |
| References: 2 (token-heuristik.md DE + EN — created in-place) | 0 |
| L3 factor: not active | 1.0 |
| **Total** | **~13k tokens** |

= ~7% of the sprint budget (example: cloud default profile 200k → budget 160k) → **2 SP**, mode `linear`.

## L3 calibration (optional)

If `.learning-loop` is set to `L3` and `journal/learnings.db` exists:

```sql
SELECT AVG(actual_tokens) / AVG(estimated_tokens) AS calibration_factor
FROM stories
WHERE skills_touched IN (desired_skill_list)
  AND diff_size_lines BETWEEN (story_diff * 0.7) AND (story_diff * 1.3)
LIMIT 10;
```

If 5+ hits and `calibration_factor` is between 0.7 and 1.5: estimate × `calibration_factor`. Otherwise: unweighted heuristic.

Default threshold: 5 similar stories (configurable in `environment.json` as `thresholds.l3_calibration_min_matches` — optional, BOO-39 itself does not enforce the field).

## Calibration loop

After every story `/sprint-review` writes `actual_tokens` back to L3 (from `journal/reports/local/{date}_{story}/meta.json` step count + skill output volume). Self-correcting over time — after 10–20 sprints the heuristic should be calibrated project-specifically.

## SP classification

The heuristic's token estimate maps to an SP class (HANDBUCH Appendix G). The percentage base is
the budget from the **freshly read** model profile `.claude/model-profile.yml`
(`served_context × effective_fraction × budget_pct`, SSoT BOO-484 — reference only; without a
profile: cloud default 200k + warning, BOO-486). Additional hard cap: `token_estimate` above
`leaf budget × capability_factor` → split the story, regardless of SP class:

| Token estimate | Share of 80% budget | SP | Execution mode |
|---|---|---|---|
| < 8k | ~5% | 1 | linear |
| 8–24k | ~10–15% | 2 | linear / sub-agents |
| 24–48k | ~20–30% | 3 | sub-agents |
| 48–96k | ~40–60% | 5 | agentic |
| > 96k | over 60% | 8 | **split the story** |

## Operator override

`/ideation` shows the estimate + derived SP + mode, prompts: "Override? [y/n]". On `y`, the operator enters a new SP value. The mode is re-derived automatically from the table — the operator only adjusts SP.

Manual overrides are also written to L3 (with marker `override=true`) so calibration knows: "operator corrected manually upward, heuristic underestimated".

## Related

- Convention: HANDBUCH Appendix G (BOO-38)
- Consumed by: `/implement` step 0b pre-flight (BOO-40) reads `token_estimate` from the spec frontmatter
- L3 source: `journal/learnings.db` (learning loop level 3, see `bootstrap/references/learning-loop.md`)
- environment.json: `thresholds.token_warn_threshold` (default 70) + `thresholds.token_hard_threshold` (default 80)
