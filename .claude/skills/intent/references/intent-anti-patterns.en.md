---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent — Template, Anti-Patterns, Gold Standard

This file is the single source of truth for the `/intent` skill. It is loaded into working memory in step 0 (briefing) and step 4 (sharpen). Changes here affect both the linter and the LLM stress test.

Three sections:
- §1 Intent statement template
- §2 Anti-patterns — 5 mistakes + 3 soul killers
- §3 Gold-standard examples from Schrader

> **Note on quotes:** Schrader's *Code Crash* originally uses German wording. To preserve fidelity to the source, this English mirror keeps Schrader quotes in their original German with a literal English translation alongside. Where the German wording is short and unambiguous, only the translation is used.

---

## §1 Intent statement template

### Formula

```
[User group] should achieve [measurable outcome],
without [current problem/friction].
Success = [concrete metric with target value].
```

(Schrader Code Crash ch. 4 §FORMULATING INTENT — THE PRACTICE)

### Three elements of an intent (Schrader §WHAT INTENT MEANS)

➀ **Precise** — Not vague, not interpretable. Measurable and unambiguous. Anyone reading the intent can later say without doubt whether it was achieved.

➁ **Outcome** — Not activity, not output. What should be achieved at the end. "We launched a chatbot" is output. "Customers with complaints get a helpful resolution within 60 minutes" is outcome.

➂ **User perspective** — Not what the company wants. What the user experiences. "We want to grow conversion" is company perspective. "The user finds the right product quickly and without frustration" is user perspective.

### Distinction from other concepts (Schrader §WHAT INTENT MEANS)

| Concept | Focus | Difference from intent |
|---------|-------|------------------------|
| **User Story** | "As a [role] I want [feature] so that [benefit]" | A user story prescribes the solution ("I want X"). Intent is *outcome-open* — the agent can find the solution. |
| **OKR** | Objective + measurable Key Results | OKRs are quarterly team goals. Intent is the instruction for a single implementation. OKRs frame, intent instructs. |
| **Jobs-to-be-Done** | Which "job" does the customer want done? | JTBD is a discovery framework, intent is a delivery concept. JTBD helps to understand *what* should be built; intent describes *how the result should look*. |
| **Requirements** | Functional / non-functional requirements | Requirements are solution-oriented ("The system shall do X"). Intent is outcome-oriented ("The user shall achieve Y"). |

### Golden rule

> No technology in the intent. *What*, not *how*.

If the words "chatbot", "app", "dashboard", "AI", "API" or any other technology specification appear in the intent, it is not an intent — it is a solution wearing an intent costume. The linter (stage 1) catches this mechanically.

---

## §2 Anti-patterns

### §2.1 The 5 most common mistakes (Schrader §THE MOST COMMON MISTAKES IN INTENT FORMULATION)

These 5 mistakes are checked deterministically in stage 1 (linter).

#### Mistake 1: Hidden feature intent

**Bad (Schrader, original DE):**

> "Der Nutzer soll mithilfe eines KI-Chatbots Probleme loesen koennen."

(Translation: "The user should be able to solve problems with the help of an AI chatbot.")

**Why wrong:** The "intent" already contains the solution. A chatbot is a technology choice, not a user outcome. Maybe a callback service solves the problem better. Or an improved FAQ. Or a proactive email.

**Better (Schrader, original DE):**

> "Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen."

(Translation: "The user should be able to solve problems without waiting for a human contact.")

**Self-check question for stage 1 linter:** Does the statement contain technology terms from this list — chatbot, app, bot, dashboard, API, tool, AI, platform, system, portal, widget, service?

#### Mistake 2: Non-measurable intent

**Bad (Schrader, original DE):**

> "Der Nutzer soll eine bessere Experience haben."

(Translation: "The user should have a better experience.")

**Why wrong:** What does "better" mean? Faster? Easier? Nicer? Without metrics this intent is worthless. You'll never know if you reached it.

**Better (Schrader, original DE):**

> "Der Nutzer bewertet das Produkt mit mindestens 4,5 von 5 Sternen (aktuell: 3,8)."

(Translation: "The user rates the product at least 4.5 of 5 stars (currently: 3.8).")

**Self-check question for stage 1 linter:** Does a `Success = ...` block exist? Does it contain a number? Or only qualitative terms like "better", "nicer", "friendlier", "modern", "efficient", "intuitive"?

#### Mistake 3: Company intent

**Bad (Schrader, original DE):**

> "Wir wollen unsere Supportkosten um 30 Prozent senken."

(Translation: "We want to cut our support costs by 30 percent.")

**Why wrong:** A legitimate business goal but not a user outcome. If you optimize purely for cost, you risk degrading the user experience.

**Better (Schrader, original DE):**

> "Der Nutzer loest 40 Prozent seiner Anliegen selbst, ohne den Support kontaktieren zu muessen — weil er es *will*, nicht weil er *muss*."

(Translation: "The user solves 40 percent of their cases themselves, without contacting support — because they *want* to, not because they *have* to.")

**Self-check question for stage 1 linter:** Does the statement begin with `We want`, `Our goal is`, `The company wants`, `The team`, `We need to`?

#### Mistake 4: Mega intent

**Bad (Schrader, original DE):**

> "Der Nutzer soll die beste digitale Erfahrung in seiner Branche haben."

(Translation: "The user should have the best digital experience in their industry.")

**Why wrong:** Too big, too vague, too long-term. A good intent is focused enough to show measurable progress within a quarter.

**Better:** Split the mega intent into 3–5 focused, measurable user outcomes. Each gets its own INTENT-XX.md.

**Self-check question for stage 1 linter:** Does the statement have >40 words? Does the `Success = ...` block contain more than one primary metric? (Both heuristics — not hard criteria, but strong signals.)

#### Mistake 5: Copy-paste intent

**Bad (Schrader, original DE):**

> "Der Nutzer soll eine Loesung in <60 Minuten erhalten." (kopiert aus einem voellig anderen Problem)

(Translation: "The user should receive a solution in <60 minutes." — copied from a completely different problem.)

**Why wrong:** Intents are context-specific. What works for complaint management does not automatically fit product consultation or contract closing.

**Better (Schrader):**

> Develop each intent from scratch, based on real user understanding.

**Self-check question for stage 1 linter:** Does the statement contain project- or context-specific wording? Or only generic phrasing that could be dropped 1:1 into any other industry context? (Soft heuristic — hint, not a hard block.)

---

### §2.2 The 3 soul killers (Schrader §SOUL — brand promise)

These 3 patterns are validated qualitatively in stage 2 (LLM stress test). Unlike the 5 mistakes, a word-list match is not enough — the question is about *meaning* behind the intent.

#### Tech trap

**Schrader's definition (original DE):**

> "Wir nutzen KI, weil wir KI nutzen koennen." Technologie wird zum Selbstzweck. Das Markenversprechen verblasst hinter dem Tool.

(Translation: "We use AI because we can use AI." Technology becomes its own purpose. The brand promise fades behind the tool.)

**Why a soul killer:** When the intent assumes a specific technology must be used, the team has stopped asking whether that technology even solves the problem. The brand becomes a demo platform for tools instead of a promise to the user.

**Self-check question for stage 2 LLM stress test:**

> Is technology used here because it solves a problem, or because it's available? What would change about the intent if the AI/tool didn't exist?

**Example — with tech trap:** "The user should solve problems using Generative AI, because the team currently has GPT-4 in hand."

**Example — without tech trap:** "The user should solve problems without waiting for a human contact." (Whether AI, FAQ or callback service — the solution comes later.)

#### Process trap

**Schrader's definition (original DE):**

> "Wir optimieren den Prozess." Effizienz ersetzt Bedeutung. Die Marke wird zur Maschine — funktional, aber seelenlos.

(Translation: "We optimize the process." Efficiency replaces meaning. The brand becomes a machine — functional but soulless.)

**Why a soul killer:** Processes are means to an end. If an intent optimizes the process without asking whether the process is even right, the team optimizes a wrong loop faster.

**Self-check question for stage 2 LLM stress test:**

> Does this intent optimize a process (efficiency) instead of real user value (meaning)? What is the concrete difference between "the process is faster" and "the user experienced something more valuable"?

**Example — with process trap:** "The complaint process should be reduced from 3 days to 6 hours."

**Example — without process trap:** "Customers with complaints should receive a helpful resolution to their specific problem within 60 minutes, without having to follow up multiple times or escalate."

#### Experience trap

**Schrader's definition (original DE):**

> "Wir verbessern die Experience." Aber welche Experience? KI hat Best Practice zur neuen Normalitaet gemacht. Ohne Markenversprechen ist jede Experience heute bestenfalls standardisiert gut — poliert, aber leer.

(Translation: "We improve the experience." But which experience? AI has made best practice the new normal. Without a brand promise, every experience today is at best standardized-good — polished but empty.)

**Why a soul killer:** "Experience" is a container word that means everything and nothing. When an intent wants to "improve the experience", it usually has not defined *which* experience, *for whom*, and *how it will be measured*.

**Self-check question for stage 2 LLM stress test:**

> Which *concrete* experience is being improved — and for whom? Or is "experience" a placeholder without substance?

**Example — with experience trap:** "We improve the customer experience in onboarding."

**Example — without experience trap:** "New customers should complete the first successful use case within 10 minutes after signup, without contacting support. Success = time-to-first-value drops from 45 min to 10 min within 3 months."

---

## §3 Gold-standard examples from Schrader

> These examples are quoted verbatim from Schrader *Code Crash* ch. 4 §FORMULATING INTENT — THE PRACTICE and §THE MOST COMMON MISTAKES IN INTENT FORMULATION. They serve as the gold-standard reference for stage 2 LLM stress test. Schrader's German originals are preserved with English translations alongside.

### Example 1: London team — complaint management (main example)

**Intent statement (Schrader, original DE):**

> Kunden mit Beschwerden sollen
> innerhalb von 60 Minuten eine hilfreiche Loesung fuer ihr spezifisches Problem erhalten,
> ohne mehrmals nachfragen oder eskalieren zu muessen.
> Erfolg = Kundenzufriedenheit im Beschwerdeprozess steigt innerhalb von 3 Monaten nach Implementierung von 3,0 auf 4,0.

(Translation:

> Customers with complaints should
> receive a helpful resolution for their specific problem within 60 minutes,
> without having to follow up multiple times or escalate.
> Success = customer satisfaction in the complaint process rises from 3.0 to 4.0 within 3 months after implementation.)

**Three properties (Schrader):**

➀ User group is defined — "Not all customers, but customers with complaints. That creates focus."

➁ Outcome is measurable — "'Helpful resolution within 60 minutes' — a concrete, verifiable criterion."

➂ Problem is named — "'Without having to follow up multiple times or escalate' — that addresses the actual pain point, not just a target value the team gets measured against."

**What is NOT in the statement (Schrader):**

> "No technology specification. Not a word about chatbot, AI, ticket system or app. That's intentional. Intent describes the *what*, not the *how*. The technology decision comes later — and it will be derived from the intent, not the other way around."

**Why gold standard:** All three Schrader elements satisfied (precise / outcome / user perspective). Time frame explicit (3 months). Baseline (3.0) and target (4.0) equally measurable. No tech trap, no process trap, no experience trap.

(Schrader Code Crash ch. 4 §FORMULATING INTENT — THE PRACTICE, Markdown source line ~1374-1399)

---

### Example 2: Mistake 1 reformulation — without feature intent

**Bad:** "The user should be able to solve problems with the help of an AI chatbot."

**Gold standard (Schrader, original DE):**

> Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen.

(Translation: The user should be able to solve problems without waiting for a human contact.)

**Insight:** The problem ("having to wait") is named without prescribing the solution. The implementation path is open — chatbot, FAQ, self-service portal, async email routing — all would be compatible with this intent. That's the right level.

**Success metric (to be added):** Share of cases solved without human help + time-to-resolution.

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1289-1295)

---

### Example 3: Mistake 2 reformulation — made measurable

**Bad:** "The user should have a better experience."

**Gold standard (Schrader, original DE):**

> Der Nutzer bewertet das Produkt mit mindestens 4,5 von 5 Sternen (aktuell: 3,8).

(Translation: The user rates the product at least 4.5 of 5 stars (currently: 3.8).)

**Insight:** Both current value (3.8) and target value (4.5) are named. The metric (star rating) is unambiguous. The time frame is implicit — in a complete version it should still be added ("within X months").

**Success metric:** 4.5 of 5 stars as a hard threshold, current value 3.8 as reference point.

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1297-1303)

---

### Example 4: Mistake 3 reformulation — user perspective instead of company intent

**Bad:** "We want to cut our support costs by 30 percent."

**Gold standard (Schrader, original DE):**

> Der Nutzer loest 40 Prozent seiner Anliegen selbst, ohne den Support kontaktieren zu muessen — weil er es *will*, nicht weil er *muss*.

(Translation: The user solves 40 percent of their cases themselves, without contacting support — because they *want* to, not because they *have* to.)

**Insight:** Cost reduction becomes a side effect, not the goal. The addition "because they want to, not because they have to" is not decoration — it directly addresses the danger that the team forces a self-service that frustrates the user.

**Success metric:** 40% self-resolution rate *and* CSAT/NPS stability (as a safeguard against "user is forced into self-service").

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1305-1311)
