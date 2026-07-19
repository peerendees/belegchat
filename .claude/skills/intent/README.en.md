---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent Skill — From Problem to Measurable User Outcome

> 5-step workflow that turns an initiative from "we want to build something" into a measurable, technology-agnostic intent statement — with a two-stage self-check against 8 anti-patterns. End of "solution fetish without problem owner".

**Version:** 1.3.0 · **Command:** `/intent`

> **Claude Code mode:** `/intent` is a pure thinking / interview session → **`plan`** (plan mode): the intent statement emerges in dialogue, files are written only after you approve. No unattended operation. Details: HANDBUCH §6 "Claude Code mode".

---

## What the skill does

The skill operationalizes Matthias Schrader's *Intent before Implementation* principle (*Code Crash* ch. 4) as a repeatable workflow. It runs a 30–60-minute intent session in 5 steps — problem story, baseline, intent brainstorming, two-stage self-check, success metric — and distills a single intent statement against a fixed template:

```
[User group] should achieve [measurable outcome],
without [current problem/friction].
Success = [concrete metric with target value].
```

Output is `intents/INTENT-XX.md` plus `intents/INTENT-XX.validation.md` (self-check report with status `green | yellow | red`). Both files are binding inputs for `/ideation` — there they become stories whose acceptance criteria must be measurable against the intent.

**Perceive mode (from v1.1.0):** Operators starting with raw material (transcripts, notes, customer feedback) can place files in `intents/raw/`. The skill distills them into an `INTENT-DRAFT-XX.md` as a structured starting point for the session — iterable across multiple sessions via the persisted draft artifact.

The skill is sparring partner, not generator. It does not formulate intents for the operator — it asks, validates, compares. Schrader's point: *intent is human compression, not AI output*.

---

## Which problem it solves

Schrader names the core mistake of nearly every product team in the AI era: **speed without direction is not efficiency, it is accelerated failure.** AI tools tempt you to build fast — Cursor, Claude Code, Copilot can ship version 1.0 in minutes. That's exactly where the trap lies: without a clear intent the team produces endless trial-and-error loops, polished code that misses reality.

### The 5 most common mistakes (Schrader §The Most Common Mistakes in Intent Formulation)

1. **Hidden feature intent** — "The user should solve problems with an AI chatbot." The solution is already baked into the intent. Wrong — intent describes *what*, not *how*.
2. **Non-measurable intent** — "The user should have a better experience." What does "better" mean? Without a metric, worthless.
3. **Company intent** — "We want to cut support costs by 30 percent." A business goal, not a user outcome. Optimizing for cost risks degrading the user experience.
4. **Mega intent** — "The user should have the best digital experience in the industry." Too big, too vague, no quarterly progress measurable.
5. **Copy-paste intent** — "The user should get a solution in <60 minutes" (copied from a totally different problem). Intents are context-specific.

Stage 1 of the self-check (deterministic linter) checks mechanically against these 5 patterns.

### The 3 soul killers (Schrader §SOUL — brand promise)

1. **Tech trap** — "We use AI because we can use AI." Technology becomes its own purpose. The brand promise fades behind the tool.
2. **Process trap** — "We optimize the process." Efficiency replaces meaning. The brand becomes a machine — functional but soulless.
3. **Experience trap** — "We improve the experience." But WHICH experience? Without a brand promise, every experience today is at best standardized-good — polished but empty.

Stage 2 of the self-check (LLM stress test) asks one specific check question per soul killer and compares the draft against Schrader's gold-standard examples.

---

## Triggers

- `/intent`
- "new initiative"
- "intent for X"
- "we want Y"
- "sharpen idea"
- "before we build stories"

---

## Workflow at a glance (5 steps)

| # | Step | What happens |
|---|------|--------------|
| 1 | **Understand the problem** | Operator tells 1–2 concrete stories — people not statistics. Skill pushes back on abstractions. |
| 2 | **Quantify the current state** | Hard numbers as baseline (NPS, CSAT, conversion, time-to-solution, ...). If operator has no number, skill suggests proxy metrics. |
| 3 | **Intent brainstorming** | Operator drafts 1–3 candidates against the template. Quantity over quality — no validation in this phase. |
| 4 | **Sharpen the intent** | Two-stage self-check: linter (5 mistakes, deterministic) + LLM stress test (3 soul killers + gold-standard comparison, dialogic). |
| 5 | **Define success metric** | Metric / current value / target value / time frame / measurement method — all mandatory. |

Output at the end: 1 intent statement (1 sentence per template) plus validation report with status green/yellow/red.

---

## Two-stage self-check

**Stage 1 — Linter (deterministic).** Skill checks mechanically against the 5 most common mistakes: word-list match on technology terms (mistake 1), missing metric in success block (mistake 2), company phrasings like "We want" (mistake 3), >40 words or multiple metrics (mistake 4), generic context-free phrasing (mistake 5). Hits = hard warning in validation report with reformulation suggestion.

**Stage 2 — LLM stress test (qualitative).** Skill asks three soul-killer questions (tech trap / process trap / experience trap) and compares the draft against Schrader's London-team gold standard. Hits = follow-up question, not a hard block. Operator decides — knowing confirmation is recorded in the validation report ("why despite warning").

Status logic:
- **green** — stage 1 clean, stage 2 clean → cleared for `/ideation`
- **yellow** — 1+ hits, but operator confirmed with reasoning → cleared for `/ideation` with note
- **red** — multiple unconfirmed hits or open soul-killer question → back to operator

---

## Output

### `intents/INTENT-XX.md`

Frontmatter (`id`, `status`, `created`, optional `linked_initiative`) plus 6 sections:
1. Problem story
2. Baseline (current state)
3. Intent drafts (1–3)
4. Self-check (pointer to validation file)
5. Success metric
6. Intent statement (final, bold)

### `intents/INTENT-XX.validation.md`

Frontmatter (`intent_ref`, `status: green|yellow|red`, `validated_at`) plus 4 sections:
1. Stage 1 — linter (table, 5 rows)
2. Stage 2 — LLM stress test (table, 3 rows)
3. Gold-standard comparison (1–3 improvement suggestions)
4. Recommendation (status with reasoning)

---

## Pipeline position

```
+----------+        +-----------+        +-----------+        +-------------+
| /intent  | -----> | /ideation | -----> | /backlog  | -----> | /implement  |
+----------+        +-----------+        +-----------+        +-------------+
     |                    |
     |                    +-- reads intents/INTENT-XX.md when building stories
     |                         and uses the intent statement as the yardstick
     |                         for every acceptance criterion
     |
     +-- produces intents/INTENT-XX.md + INTENT-XX.validation.md
```

`/intent` is the source. BOO-10 (follow-up story) implements the propagation of the intent through the pipeline — stories measure ACs against the intent, sprint reviews validate against the intent. `/intent` itself only handles the clean creation of the intent artifact.

---

## Background

Matthias Schrader argues in *Code Crash* (2025): once AI turns code into a commodity, scarcity shifts. Writing code costs nothing — *wanting* the right code remains hard. The new scarcity is the ability to develop a clear intent from a unique insight.

Schrader's empirical recommendation: invest 15–25% of project time in intent clarification. For a four-week project, that's at most one week. For a two-day sprint, it's hours. The proportion stays, the tempo accelerates.

Why this seems paradoxical but holds: AI tools tempt you to build fast, but unclear intent leads to countless detours. Imagine giving an AI the task "build me a solution for the complaint problem" — the AI will produce something, probably a chatbot. You look at it, correct, get something new, correct again. Endless trial-and-error loop. A clear intent acts like a laser pointer: every participant — human and machine — knows exactly where the journey is going.

The skill turns this principle into a reproducible workflow. It enforces the conscious pause before development. It prevents "let's just build something quickly" from becoming a multi-week trial-and-error project.

---

## Sources

- **Book:** Matthias Schrader, *Code Crash* (2025), chapter 4 — verbatim quoted sections see [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md) and [references/intent-examples.md](references/intent-examples.md)
- **ADR:** `[[2026-04-26 Anti-Pattern-Self-Check im Intent-Skill]]` — decision on the home of the anti-patterns (intent vs ideation), the two-stage check, and the reference file
- **ADR:** `[[2026-04-26 Abgrenzung Intent vs Ideation vs Design Thinking]]` — intent = convergent (compress), ideation = divergent (explore); no separate design-thinking skill
- **Project hub:** `[[Bootstrapping Evolution - PMO HUB]]`
- **Brainstorming meeting:** see vault under `02 Projekte/Bootstrapping Evolution/Meetings/`

---

## Installation and usage

Skill lives under `~/.claude/skills/intent/` (locally) or `intentron/intent/` in the `vibercoder79/claudecodeskills` repo. After running the setup script (`setup.sh`) it's activated automatically.

Use in chat:

```
/intent
```

Or one of the trigger phrases:

```
new initiative — we want to smooth the onboarding for new operators
```

Skill starts automatically and walks through the 5 steps.

---

## File structure

```
intentron/intent/
├── SKILL.md                          ← Skill definition (DE — primary)
├── SKILL.en.md                       ← Skill definition (EN)
├── README.md                         ← German README
├── README.en.md                      ← This file (EN)
└── references/
    ├── intent-anti-patterns.md          ← 3 sections: template, 8 anti-patterns, gold standard (DE)
    ├── intent-anti-patterns.en.md       ← English mirror
    ├── intent-template.md               ← Copy template for intents/INTENT-XX.md (DE)
    ├── intent-template.en.md            ← English copy template
    ├── intent-draft-template.md         ← Copy template for intents/INTENT-DRAFT-XX.md (perceive output, DE)
    ├── intent-draft-template.en.md      ← English copy template
    ├── intent-examples.md               ← Schrader examples plus project example (DE)
    ├── intent-examples.en.md            ← English mirror
    ├── intent-validation-template.md    ← Template for intents/INTENT-XX.validation.md (DE)
    └── intent-validation-template.en.md ← English mirror
```
