---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Copy template: `intents/INTENT-XX.md`

This file is filled in by the `/intent` skill at the end of the 5-step session. Operator copies it to `intents/INTENT-XX.md` in the project repo (XX = next free number with leading zeros, e.g. `INTENT-01.md`).

---

```markdown
---
id: INTENT-XX
status: draft
created: YYYY-MM-DD
linked_initiative: BOO-XX  # optional, Linear issue key for the related initiative
---

# INTENT-XX — <short title of the initiative>

<!-- Short title: 4-7 words describing the initiative at a glance.
     Example: "Onboarding for new operators" or "Complaint resolution under 60 min". -->

## 1. Problem story

<!-- From step 1: 1-2 concrete stories. People not statistics.
     Who was it, when, what exactly happened, how did it end?
     No abstraction. If you write "the customers are unhappy", the skill has failed. -->

<!-- Example:
Maria K., operator at customer Y, on April 14, 2026: she needed 3 days to set up
her first sprint backlog in the tool. She asked support 4 times because it was
unclear how to calculate sprint capacity. Eventually started the sprint with
half the capacity because she ran out of patience.
-->

## 2. Baseline (current state)

<!-- From step 2: table with the metrics measured today.
     At least one metric. If none exist, introduce proxy metrics and document
     when the first value will be measured. -->

| Metric | Current value | Source | Date measured |
|--------|---------------|--------|---------------|
| <e.g. time-to-first-sprint-setup> | <e.g. 3 days> | <e.g. support ticket DB> | <YYYY-MM-DD> |
| <additional metric> | <value> | <source> | <date> |

## 3. Intent drafts

<!-- From step 3: 1-3 variants per template.
     Quantity over quality. Validation comes in step 4. -->

### Draft A

> [User group] should achieve [measurable outcome],
> without [current problem/friction].
> Success = [concrete metric with target value].

<!-- Example draft A:
New operators should be able to fully set up their first sprint within 4 hours,
without contacting support.
Success = time-to-first-sprint-setup drops from 3 days to 4 hours within 2 months.
-->

### Draft B

> [User group] should achieve [measurable outcome],
> without [current problem/friction].
> Success = [concrete metric with target value].

### Draft C (optional)

> [User group] should achieve [measurable outcome],
> without [current problem/friction].
> Success = [concrete metric with target value].

## 4. Self-check

<!-- From step 4: pointer to validation file plus status summary. -->

Full self-check: see [INTENT-XX.validation.md](INTENT-XX.validation.md).

**Status:** green | yellow | red

**Short version:** <1-2 sentences why this status; for yellow: which warning was knowingly accepted; for red: why.>

## 5. Success metric

<!-- From step 5: one row, all columns filled. Multiple metrics = one per row. -->

| Metric | Current value | Target value | Time frame | Measurement method |
|--------|---------------|--------------|------------|--------------------|
| <e.g. time-to-first-sprint-setup> | <e.g. 3 days> | <e.g. 4 hours> | <e.g. within 2 months after launch> | <e.g. automatic via onboarding telemetry, measured from "account created" to "first sprint with stories started"> |

## Intent statement (final)

<!-- The one sentence that survives the sharpening.
     Used in /ideation as the yardstick for every acceptance criterion. -->

> **<User group> should achieve <measurable outcome>, without <current problem/friction>. Success = <concrete metric with target value and time frame>.**

<!-- Example:
**New operators should be able to fully set up their first sprint within 4 hours, without contacting support. Success = time-to-first-sprint-setup drops from 3 days to 4 hours within 2 months.**
-->
```
