---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent draft template (Perceive output)

This template is the copy template for `intents/INTENT-DRAFT-XX.md` — the working artifact from Perceive mode (step 0.3 of the `/intent` skill).

> [!warning] Not a valid intent
> This file is a distillate of the Perceive phase from raw material. It is the starting point for the intent session, not its result. Only `INTENT-XX.md` after step 5 is valid.

---

## Copy template

```markdown
---
id: INTENT-DRAFT-XX
status: perceive-draft
created: YYYY-MM-DD
raw_sources:
  - intents/raw/filename1.md
  - intents/raw/filename2.txt
linked_initiative: BOO-XX | optional
---

# Intent draft XX (Perceive phase)

> [!warning] Working artifact — not a valid intent
> Distillate from raw material. Refine into the final INTENT-XX.md in steps 1–5 of the /intent skill.

## Extracted elements

### Problem signals
- [What the raw files describe as bad, broken or missing]

### User groups (identified)
- [Named or implied roles / target groups]

### Metric candidates (mentioned)
- [Measures or success criteria — explicitly or implicitly mentioned]

### Constraints (identified)
- [Boundary conditions, non-options, framework requirements]

## Preliminary intent attempt

> ⚠️ Hypothesis — to be verified and refined by the operator

[User group] should achieve [measurable outcome],
without [current problem/friction].
Success = [if recognizable from raw files — otherwise: TBD in step 5]

## Open questions from the raw material

- [What remained unclear or needs further clarification]

---
*Next step: refine these elements in step 1 of the /intent skill.*
```

---

## Fields

| Field | Meaning |
|------|-----------|
| `id` | `INTENT-DRAFT-XX` — same numbering as the later `INTENT-XX.md` |
| `status` | Always `perceive-draft` as long as the intent session is not completed |
| `raw_sources` | List of raw files read from `intents/raw/` |
| `linked_initiative` | Optional — Linear issue reference if present |

## Lifecycle

```
intents/raw/*.md/.txt
        ↓ (Perceive run, step 0.3)
intents/INTENT-DRAFT-XX.md   ← this file
        ↓ (Intent session, steps 1–5)
intents/INTENT-XX.md         ← valid intent
intents/INTENT-XX.validation.md
```

`INTENT-DRAFT-XX.md` is not deleted after step 5 completes successfully — it documents the Perceive starting point for later retrospectives.
