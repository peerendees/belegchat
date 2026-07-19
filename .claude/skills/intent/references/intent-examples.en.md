---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent examples — Schrader gold standard plus project example

This file is loaded by the `/intent` skill in step 4 (Sharpening) as the comparison gold standard for the LLM stress test in stage 2. It complements [intent-anti-patterns.md](intent-anti-patterns.md) §3 — there the examples are referenced compactly, here with full reasoning per example.

Structure per example:
- **Background** — What was the starting situation?
- **Intent statement** — Verbatim or construct
- **Three properties per Schrader** — User group / outcome measurement / problem
- **Why it works** — Which anti-patterns it avoids, which soul killers it rules out

---

## Example 1 — London team complaint management (Schrader's main example)

### Background

Under time pressure, the London team had introduced an AI chatbot for the automatic answering of complaints. Technically demanding, performance-tuned, response templates optimized. Result: customer satisfaction *dropped*. Users felt fobbed off by standardized answers. Lead engineer Michael summed it up self-critically: "We had a solution fetish and no problem owner."

After this hard lesson, the team clarified the intent FIRST in the second iteration.

### Intent statement (verbatim Schrader)

> Customers with complaints should
> receive a helpful solution for their specific problem within 60 minutes,
> without having to ask multiple times or escalate.
> Success = customer satisfaction in the complaint process rises from 3.0 to 4.0 within 3 months after implementation.

### Three properties per Schrader

➀ **User group defined** — Not "all customers", but explicitly "customers with complaints". Schrader's point: "This creates focus." Without this narrowing, every intent is a mega intent.

➁ **Outcome measurable** — "Helpful solution in under 60 minutes" is a concrete, verifiable criterion. Not "fast", not "satisfactory" — but *60 minutes*. A time value is hard-measurable.

➂ **Problem named** — "Without having to ask multiple times or escalate" directly addresses the pain point of the first failed solution (chatbot with standardized answers that sends users into escalation loops).

### Why it works

- **No tech trap** — Not a word about chatbot, AI, ticketing system. The implementation can be human+tool, pure human escalation or pure self-service. The intent does not fix it.
- **No process trap** — Does not optimize "the complaint process", but addresses the outcome from the user's perspective (a *helpful* solution).
- **No experience trap** — "Experience" does not appear. Instead, a concrete experience: customer has a solution in <60 min and did not have to escalate.
- **Linter clean** — No technology words, clear metric (CSAT 3.0 -> 4.0), time frame (3 months), user instead of company perspective, under 40 words, context-specific.

(Schrader Code Crash ch. 4 §FORMULATING INTENT — THE PRACTICE, Markdown source line ~1374-1399)

---

## Example 2 — Reformulation mistake 1 (no feature intent)

### Background

The original statement contained the solution in the intent ("AI chatbot"). Schrader shows how to turn it back to the right level.

### Intent statement (verbatim Schrader)

> The user should be able to solve problems without having to wait for a human contact.

### Three properties per Schrader

➀ **User group defined** — "The user" (with the complaint context implicit from the briefing).

➁ **Outcome measurable** — "Be able to solve problems" + implicit self-solution rate. In the standalone statement, the time/rate value is still missing — for a complete form, `Success = X % self-solution in <Y min>` would have to be added.

➂ **Problem named** — "Without having to wait for a human contact" — wait time and escalation are the friction.

### Why it works

- **No tech trap** — The solution is open. Chatbot, FAQ, self-service portal, asynchronous email routing — all compatible.
- **No process trap** — Addresses the user's experience of wait time, not the process.
- **Linter:** Would only flag mistake 2 because the success metric is missing — this is implicit in the Schrader original example; for a complete INTENT-XX.md, `Success = ...` would have to be added.

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1289-1295)

---

## Example 3 — Reformulation mistake 2 (made measurable)

### Background

"Better experience" as a container word is resolved into a hard star metric with reference and target value.

### Intent statement (verbatim Schrader)

> The user rates the product with at least 4.5 of 5 stars (currently: 3.8).

### Three properties per Schrader

➀ **User group defined** — "The user" (general; in the original context all product users are meant).

➁ **Outcome measurable** — Yes: 4.5 of 5 stars is a hard threshold, 3.8 is the reference point.

➂ **Problem named** — Implicit: "current rating 3.8 is too low". In the complete statement, an explicit friction point would have to be added ("without ...").

### Why it works

- **No experience trap** — "Experience" is not mentioned. Instead the operationalized metric (star rating) — unambiguous, comparable, measurable over time.
- **Linter:** Practically clean. What is still missing: time frame ("within X months") and explicit friction point (`without ...`). In the full format this would have to be added.

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1297-1303)

---

## Example 4 — Reformulation mistake 3 (user instead of company intent)

### Background

"Cut support costs by 30 %" is a company goal. Schrader turns it around so that the user is at the center *and* the costs drop as a side effect.

### Intent statement (verbatim Schrader)

> The user solves 40 percent of their concerns themselves, without having to contact support — because they *want* to, not because they *have* to.

### Three properties per Schrader

➀ **User group defined** — "The user".

➁ **Outcome measurable** — "40 percent self-solution rate" — a hard rate.

➂ **Problem named** — "Without having to contact support" — the friction. Plus: the clause "because they want to, not because they have to" prevents the evasion strategy (forcing self-service, frustrating users).

### Why it works

- **No company intent** — Begins with "The user", not with "We want". The cost reduction is a consequence, not a goal.
- **Anti-coercion clause** — "Because they want to, not because they have to" is brilliant: it forces the team not only to measure the rate, but also CSAT stability (otherwise one would force self-service and thereby frustrate customers).
- **Linter:** Clean except for the missing time frame. In the full format, `... within X months` would have to be added.

(Schrader Code Crash ch. 4 §THE MOST COMMON MISTAKES, Markdown source line ~1305-1311)

---

## Example 5 — Bootstrapping Evolution project context (meta example)

### Background

The `/intent` skill itself has a clear outcome promise: at the end of a session, operators should have a clean intent without getting lost in user-story templates or having to conjure gold-standard examples from memory. This example shows an intent for a Bootstrapping-Evolution-internal concern.

### Intent statement

> Operators of Bootstrapping Evolution projects should
> be able to clearly formulate an intent for a new initiative within one sprint,
> without orienting themselves on user-story templates or having to recite Schrader examples from memory.
> Success = 3 of 3 next initiatives start with a green-validated intent (linter clean, soul killer passed) within the next 2 months.

### Three properties per Schrader

➀ **User group defined** — "Operators of Bootstrapping Evolution projects". Not all software teams, not all Schrader readers.

➁ **Outcome measurable** — "3 of 3 next initiatives start with a green-validated intent" is binarily verifiable per initiative.

➂ **Problem named** — "Without orienting themselves on user-story templates or having to recite Schrader examples" — the pain point before the skill: operators either end up at user stories (too solution-oriented) or must know the gold-standard examples by heart.

### Why it works

- **No tech trap** — Not a word about the skill itself, about LLMs or about concrete tools.
- **No process trap** — Does not optimize "the intent-finding process", but the outcome (3 of 3 initiatives start well).
- **No experience trap** — "Experience" does not appear; instead concrete behavior ("be able to clearly formulate") and a concrete metric (3/3 initiatives).
- **Linter:** Clean. No technology words, clear metric with target value (3/3) and time frame (2 months), user perspective, under 40 words in the core statement, context-specific.

This example shows: even internal, process-oriented initiatives can get a clean outcome intent — as long as one consistently asks: *What should the user concretely be able to do at the end that they cannot do today?*
