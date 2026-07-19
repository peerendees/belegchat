---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Copy template: `intents/INTENT-XX.validation.md`

This file is filled in by the `/intent` skill at the end of step 4 (Sharpening). The operator copies it to `intents/INTENT-XX.validation.md` in the project repo.

Status symbols:
- `[OK]` Pass — no hit / clean
- `[X]` Fail — linter hit (stage 1)
- `[?]` Open — soul-killer question open or operator reasoning pending (stage 2)

---

## English template

```markdown
---
intent_ref: INTENT-XX
status: green | yellow | red
validated_at: YYYY-MM-DD
---

# Validation report INTENT-XX

Source file: [INTENT-XX.md](INTENT-XX.md)

## Stage 1 — Linter (deterministic)

| Pattern | Status | Hit-quote | Suggestion |
|---------|--------|-----------|------------|
| Mistake 1 — Hidden feature intent | [OK] / [X] | <If [X]: quote the passage verbatim, e.g. "...using an AI chatbot..."> | <Concrete reformulation; e.g. "replace 'using an AI chatbot' with 'without waiting for a human contact'"> |
| Mistake 2 — Non-measurable intent | [OK] / [X] | <If [X]: show the qualitative phrase without number, e.g. "...better experience..."> | <Concrete metric recommendation; e.g. "add 'Success = NPS rises from X to Y within Z months'"> |
| Mistake 3 — Company intent | [OK] / [X] | <If [X]: opening phrase, e.g. "We want..."> | <Reformulation toward user perspective; e.g. "replace 'We want to cut support costs' with 'The user solves X% of cases themselves'"> |
| Mistake 4 — Mega intent | [OK] / [X] | <If [X]: word count + multiple metrics in success block> | <Splitting suggestion; e.g. "split into 3 sub-intents: onboarding, self-service, support routing"> |
| Mistake 5 — Copy-paste intent | [OK] / [X] | <If [X]: show the generic phrases> | <Context specification; e.g. "replace 'the user' with concrete role, add project-specific friction"> |

**Stage 1 finding:** <0 hits | 1 hit | 2+ hits> — at 0 hits stage 1 is green; at 1+ hits, operator has either reformulated or documented reasoning in §Recommendation.

## Stage 2 — LLM stress test (qualitative)

| Soul killer | Status | Operator reasoning |
|-------------|--------|--------------------|
| Tech trap | [OK] / [?] | <If [?]: how did the operator answer "Is technology used because available?" If the question stayed open, enter "OPEN" here.> |
| Process trap | [OK] / [?] | <If [?]: how did the operator answer "Does intent optimize process instead of value?"> |
| Experience trap | [OK] / [?] | <If [?]: how did the operator answer "Which concrete experience for whom?"> |

**Stage 2 finding:** <All 3 OK | 1 open | 2+ open> — at all OK stage 2 is green; with open questions, the operator must justify in §Recommendation why released or rejected anyway.

## Gold-standard comparison

Comparison of the draft against the London-team complaint example (see [intent-examples.md](../intentron/intent/references/intent-examples.md) §1).

Three concrete improvement suggestions:

1. **<Improvement 1>** — <e.g. "narrow user group: instead of 'operators' -> 'operators in the first sprint session'"> — reasoning with reference to the gold standard.
2. **<Improvement 2>** — <e.g. "name friction point more concretely"> — reasoning.
3. **<Improvement 3>** — <e.g. "shorten or extend the time frame"> — reasoning.

(If the draft is already very close to the gold standard: replace 3 improvements with 1-2 refinement suggestions or the note "Draft is at gold-standard level".)

## Recommendation

**Status:** <green | yellow | red>

**Reasoning:**

<2-4 sentences. For green: why clean, what was particularly good. For yellow: which warning was knowingly accepted, with what operator reasoning. For red: what must be improved concretely, in what order.>

**Next step:**
- green -> `intents/INTENT-XX.md` is input for `/ideation`
- yellow -> `intents/INTENT-XX.md` is input for `/ideation`, operator note is included
- red -> operator reformulates, skill restarts step 4

```
