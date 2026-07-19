---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: intent
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Operationalizes Schrader's "Intent before Implementation" (Code Crash ch. 4) — a 5-step session
  distills the desired user outcome into a measurable intent statement, which then feeds /ideation.
  Validates the statement in two stages against 8 anti-patterns (5 mistakes + 3 soul killers).
  Use when the operator starts a new initiative, says "/intent", or wants to sharpen an idea
  before /ideation builds stories. Triggers: "new initiative", "intent for X", "we want Y",
  "/intent".
version: 1.3.0
metadata:
  hermes:
    category: governance
    tags: [intent-definition, perceive, anti-pattern-check]
    requires_toolsets: [terminal, obsidian]
    related_skills: [ideation, backlog]
---

# Intent — From Problem to Measurable User Outcome

> "Speed without direction is not efficiency. It is accelerated failure." — Matthias Schrader, *Code Crash* ch. 4

This skill operationalizes Schrader's *Intent before Implementation* principle. It runs a focused 5-step session, distills a measurable intent statement from the user's perspective, and validates it against 8 anti-patterns (5 common mistakes + 3 soul killers). The final intent is the binding input artifact for `/ideation` — there it becomes stories whose acceptance criteria must be measurable against the intent.

Pipeline position: `/intent` -> `/ideation` -> `/backlog` -> `/implement`.

## When to use / When not to use

**Use `/intent` when:**
- Starting a new initiative or feature where the *desired user outcome* is not yet clear
- Before any new wave of stories where the *what* still needs to be thought through
- An existing idea needs sharpening before `/ideation` turns it into stories
- Onboarding a new initiative phase
- Raw material is available (transcripts, notes, customer feedback, research excerpts) and a structured starting point is needed — use **Perceive mode** (step 0.3)

**Do NOT use `/intent` when:**
- It's pure refactoring (no user outcome shifts)
- Bug fix or minor adjustment without outcome impact
- Continuing an existing initiative with an already-valid intent (go directly to `/ideation`)
- Pure hygiene tasks (Schrader ch. 4 §SOUL — *Hygiene vs. Differentiation*)

## Output artifact

Each initiative produces up to three files in the project repo:

- `intents/INTENT-DRAFT-XX.md` — Perceive output (optional). Working artifact from step 0.3, refined into the final intent through steps 1–5. Not a valid intent — intermediate state only. Template: [references/intent-draft-template.md](references/intent-draft-template.md).
- `intents/INTENT-XX.md` — the intent statement plus context (problem story, baseline, drafts, final success metric). XX = sequential number with leading zeros (`INTENT-01`, `INTENT-02`, ...).
- `intents/INTENT-XX.validation.md` — the self-check report from step 4 with status `green | yellow | red`.

Raw material provided by the operator lives in `intents/raw/` (read-only input, not produced by the skill).

`INTENT-XX.md` and `INTENT-XX.validation.md` are binding inputs for `/ideation`.

## Workflow (5 steps from Schrader §The Intent Session)

### Step 0: Load environment + briefing/context

Order matters: FIRST 0.1 (environment), THEN 0.2 (briefing/context) — the paths from `paths.*` inform where the references and the `intents/` directory live.

#### 0.1 Load environment

1. Read `.claude/environment.json` (if present — otherwise fall back to defaults and log a warning).
2. Extract paths from `paths.*` as needed (e.g. `paths.reports_local`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`).
3. Before any tool invocation, check `tools_available.<tool>`. If `false` or missing, the skill skips the call and notes it in the output.
4. Missing-file fallback: assume the schema defaults (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`) and add a note to the output: "Note: `.claude/environment.json` is missing — defaults active. Recommendation: re-run `/bootstrap` or create the file manually."

#### 0.2 Briefing + load context

On start, the skill reads:
- [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md) — template, 8 anti-patterns, gold-standard examples
- [references/intent-examples.md](references/intent-examples.md) — Schrader examples plus project-context example

The skill asks: "What's the topic? Which initiative is starting?"

The skill also checks: does a file `intents/INTENT-DRAFT-XX.md` already exist? If yes: load it and inform the operator —

> I found an intent draft from a previous session (`INTENT-DRAFT-XX.md`). Would you like to continue from there or start fresh?

If operator continues → load draft, proceed directly to step 1 with the draft as starting point. If starting fresh → ignore draft, normal flow from step 1.

Operator note (output verbatim):

> This session needs 30–60 minutes of focus. The AI is sparring partner here, not generator. You formulate — I test, push back, compare against the gold standard. Schrader's point: intent is human compression, not AI output.

### Step 0.3: Perceive — process raw material (optional)

Skill asks the operator:

> Do you have raw material that could help formulate the intent? Transcripts, notes, meeting minutes, customer feedback, research excerpts? If yes: place all readable text files (.md, .txt) in `intents/raw/` — I'll read them and distill a starting point for our session.

If the operator provides raw material, the skill runs the **Perceive pass**:

1. Read all files in `intents/raw/`
2. Extract and structure:
   - **Problem signals** — What is described as broken, bad, or missing?
   - **User groups** — Which roles or target audiences are mentioned?
   - **Metric candidates** — What measurement dimensions or success criteria appear (explicit or implied)?
   - **Constraints** — Which boundary conditions or non-options are named?
3. Creates `intents/INTENT-DRAFT-XX.md` with the extracted elements and a preliminary intent hypothesis (explicitly marked as such)
4. Skill presents the draft and asks:

> Here is what I read from your material. Does this hit the core? If yes, we'll start step 1 with this draft. If you'd like to adjust, do that now — then we start step 1 with the corrected draft.

**Limits of Perceive mode:**
- Perceive *distills*, does not formulate. The final intent statement is written by the operator in steps 1–5.
- `INTENT-DRAFT-XX.md` is a working artifact, not a valid intent. Only `INTENT-XX.md` after step 5 is valid.
- If no raw material is available or the operator skips: skill starts directly with step 1.

**Output:** `intents/INTENT-DRAFT-XX.md` (template: [references/intent-draft-template.md](references/intent-draft-template.md)).

### Step 1: Understand the problem — concrete stories

Skill asks for 1–2 concrete cases:

> Tell me the most recent case where a user experienced X. Who was that (name, role), when, what exactly happened, how did it end?

Anti-pattern in step 1: abstract descriptions like "the customers are unhappy" or "things go badly". Skill pushes back:

> Which customer, when, doing what exactly? A story with names, dates, and outcome — Schrader §The Intent Session §Step 1: "people, not statistics".

**Output:** Story block in `intents/INTENT-XX.md` under `## 1. Problem story`. At least one concrete story. No statistic without a person.

### Step 2: Quantify the current state — baseline

Skill asks for hard numbers:

> What metrics do we already have today? NPS, CSAT, conversion, bounce rate, average time-to-solution, escalation rate, drop-off rate? What is the current value?

If the operator has no number: skill suggests 2–3 sensible proxy metrics and asks which one the operator could measure within 1–2 weeks. Without a baseline, no further progress — the later target value needs a reference point.

**Output:** Table in `intents/INTENT-XX.md` under `## 2. Baseline (current state)` with columns `Metric | Current value | Source | Date measured`.

### Step 3: Intent brainstorming

Skill presents the template from [references/intent-template.en.md](references/intent-template.en.md):

```
[User group] should achieve [measurable outcome],
without [current problem/friction].
Success = [concrete metric with target value].
```

Operator formulates 1–3 drafts. Skill may add suggestions ("Did you also consider X as an alternative user group?") but does **not** validate yet — validation happens exclusively in step 4. Quantity over quality at this stage (Schrader §Step 3: "everyone formulates against the template, then cluster").

**Output:** 1–3 drafts in `intents/INTENT-XX.md` under `## 3. Intent drafts`, numbered.

### Step 4: Sharpen the intent — the two-stage self-check

Skill validates each draft in two stages. Both stages produce entries in the validation report — stage 1 deterministic, stage 2 dialogic.

#### Stage 1: Linter (deterministic, rule-based)

Skill checks mechanically against the 5 mistakes from [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md) §2.1:

| Mistake | Check | Trigger |
|---------|-------|---------|
| Mistake 1 — Hidden feature intent | Word-list match on `chatbot, app, bot, dashboard, API, tool, AI, platform, system, portal, widget, service` | One match = hard warning |
| Mistake 2 — Non-measurable intent | `Success = ...` block missing OR contains only qualitative terms (`better`, `nicer`, `friendlier`, `modern`, `efficient`, `intuitive`) without a number | Match = hard warning |
| Mistake 3 — Company intent | Starts with `We want`, `Our goal is`, `The company wants`, `The team`, `We need to` | Match = hard warning |
| Mistake 4 — Mega intent | >40 words in the statement OR more than one primary metric in `Success = ...` | Match = hard warning |
| Mistake 5 — Copy-paste intent | No project- or context-specific wording, only generic phrasing (heuristic: could be dropped 1:1 into any other industry context) | Match = soft warning |

Stage 1 hits create a hard warning in the validation report — with a concrete reformulation suggestion. Operator decides whether to reformulate or knowingly accept the warning.

#### Stage 2: LLM stress test (qualitative, dialogic)

Skill asks three soul-killer questions from [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md) §2.2:

1. **Tech trap** — Is technology being used because it solves a problem, or because it's available? What would change about the intent if the AI/tool didn't exist?
2. **Process trap** — Does this intent optimize a process (efficiency) instead of real user value (meaning)? What's the concrete difference between "the process is faster" and "the user experienced something more valuable"?
3. **Experience trap** — Which *concrete* experience is being improved — and for whom? Or is "experience" a placeholder without substance?

Plus: skill loads [references/intent-examples.md](references/intent-examples.md) and runs the gold-standard comparison:

> Now compare your draft against the London team example (complaint management). Does your intent behave more like the gold standard or like one of the anti-examples? What are 3 concrete improvements that would move it closer to the gold standard?

Stage 2 hits = follow-up question to operator, **not a block**. If the operator dismisses the hint deliberately, the reasoning is recorded in the validation report ("why despite warning").

#### Status logic

| Status | Meaning | Consequence |
|--------|---------|-------------|
| **green** | No stage-1 hits and no open stage-2 questions | Cleared for `/ideation` |
| **yellow** | 1+ hits, but operator confirmed with reasoning ("why despite warning" documented) | Cleared for `/ideation` with documented operator note |
| **red** | Multiple unconfirmed hits OR open soul-killer question | Back to operator, reformulate |

**Output:** Self-check report in `intents/INTENT-XX.validation.md` (template: [references/intent-validation-template.md](references/intent-validation-template.md)).

### Step 5: Define success metric

Operator commits to:

| Metric | Current value | Target value | Time frame | Measurement method |
|--------|---------------|--------------|------------|--------------------|

Skill pushes back when:
- Target value without time frame ("4.5 stars" — by when?)
- Measurement method unclear ("CSAT" — collected how exactly? automated? manual? all tickets or sample?)
- Target value implausible ("from 3.0 to 5.0 in 4 weeks" — sporty, but justify it)

**Output:** Table in `intents/INTENT-XX.md` under `## 5. Success metric`. Plus: the final intent statement (1 sentence per template) as a bold block at the end of the document under `## Intent statement (final)`.

## Output format `intents/INTENT-XX.md`

Frontmatter:

```yaml
---
id: INTENT-XX
status: draft | active | archived
created: YYYY-MM-DD
linked_initiative: BOO-XX | optional
---
```

Sections (in this order, all mandatory):
1. `## 1. Problem story` — concrete story from step 1
2. `## 2. Baseline (current state)` — table from step 2
3. `## 3. Intent drafts` — 1–3 variants from step 3
4. `## 4. Self-check` — pointer to `INTENT-XX.validation.md` with status summary
5. `## 5. Success metric` — table from step 5
6. `## Intent statement (final)` — the one sentence, bold, in the template format

Full copy template: [references/intent-template.en.md](references/intent-template.en.md).

## Output format `intents/INTENT-XX.validation.md`

Frontmatter:

```yaml
---
intent_ref: INTENT-XX
status: green | yellow | red
validated_at: YYYY-MM-DD
---
```

Sections:
1. `## Stage 1 — Linter (deterministic)` — table with all 5 mistakes, columns `Pattern | Status | Hit-quote | Suggestion`
2. `## Stage 2 — LLM stress test (qualitative)` — table with all 3 soul killers, columns `Soul killer | Status | Operator reasoning`
3. `## Gold-standard comparison` — 1–3 concrete improvement suggestions versus the London team example
4. `## Recommendation` — status (green/yellow/red) with brief reasoning

Status symbols:
- `[OK]` pass (green)
- `[X]` fail (red) — linter hit
- `[?]` open (yellow) — soul-killer question open or operator reasoning pending

Full copy template: [references/intent-validation-template.md](references/intent-validation-template.md).

## Sparring-partner principle

The skill does NOT formulate intents itself. It asks questions, validates, suggests improvements — but the operator writes the actual statement.

Reasoning (Schrader ch. 4 §FORMULATING INTENT — THE PRACTICE): if the AI writes intents, the operator risks adopting alien assumptions without thinking them through. Schrader's point: *intent is human compression, not AI output*. The new scarcity is not code — it's the ability to develop a clear intent from a unique insight. That insight must come from the human.

What the skill is allowed to do:
- Ask questions
- Identify and name anti-patterns
- Offer gold-standard comparison
- Suggest reformulations ("instead of X you could write Y — adapt to your context")

What the skill does NOT do:
- Formulate the intent for the operator
- Make the final call ("your intent is green/red")
- Embed assumptions about the usage context without explicit operator confirmation

## Pipeline position

```
/intent  ->  /ideation  ->  /backlog  ->  /implement
   |              |
   |              +-- reads intents/INTENT-XX.md in step 2 (load context)
   |                   uses the intent statement as yardstick for every AC
   |
   +-- produces intents/INTENT-XX.md + INTENT-XX.validation.md
```

`/intent` is the source. The downstream propagation of the intent through the pipeline (stories, ACs, end-of-sprint validation) is implemented by follow-up story BOO-10 — `/intent` only handles producing the clean intent artifact.

If `/ideation` starts without an existing intent file, it should explicitly point the operator to `/intent` (after BOO-10 ships).

## Relation to Schrader

The skill operationalizes chapter 4 of *Code Crash* (Matthias Schrader, 2025) one-to-one:
- §WHAT INTENT MEANS — definition of three elements: precise / outcome / user perspective
- §INTENT BEFORE IMPLEMENTATION — invest 15–25% of project time in intent clarification
- §THE MOST COMMON MISTAKES — the 5 mistakes in linter stage 1
- §SOUL — brand promise — the 3 soul killers in stress-test stage 2
- §THE INTENT SESSION COMPACT — the 5 workflow steps
- §FORMULATING INTENT — THE PRACTICE — template plus London-team gold standard

Full background explanation: see README.en.md.

## References

- [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md) — 3 sections: template, 8 anti-patterns (5 mistakes + 3 soul killers), gold-standard examples
- [references/intent-template.en.md](references/intent-template.en.md) — copy template for `intents/INTENT-XX.md`
- [references/intent-draft-template.md](references/intent-draft-template.md) — copy template for `intents/INTENT-DRAFT-XX.md` (Perceive output)
- [references/intent-examples.md](references/intent-examples.md) — Schrader gold-standard examples plus project-context example
- [references/intent-validation-template.md](references/intent-validation-template.md) — template for `intents/INTENT-XX.validation.md`

DE counterpart: [SKILL.md](SKILL.md), [references/intent-anti-patterns.md](references/intent-anti-patterns.md), [references/intent-template.md](references/intent-template.md).

ADR sources:
- `[[2026-04-26 Anti-Pattern-Self-Check im Intent-Skill]]`
- `[[2026-04-26 Abgrenzung Intent vs Ideation vs Design Thinking]]`

Project hub: `[[Bootstrapping Evolution - PMO HUB]]`.
