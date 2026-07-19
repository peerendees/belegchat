---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
language: en
---

# Documentation quality rubric (SSoT) — brownfield module docs

Single source of truth for the **content quality** of the module docs (`module-<name>.md`, BOO-489 step 5.5) and the findings (step 6). Changes to the quality rules happen HERE; SKILL.md only references. The rubric applies **per module chunk** — every narration subagent receives it; if an accepted example is present in the few-shot slot [`gold-standard/`](gold-standard/), that additionally (otherwise the structure template §5 applies).

> **In plain terms:** The honesty layer (steps 7–9) ensures **nothing false** ends up in the docs. This rubric ensures the **true is also understandable** — an evidenced fact without explanation is correct and still useless. The rubric does not replace the honesty layer, it wires it to narrative quality.

**Origin:** distilled from the customer run 2026-07-14 (WebConfigCompiler, C/C++), in which customer + engineers rated Qwen3 and Opus outputs live — the target standard and anti-patterns come straight from that rating. The [`gold-standard/`](gold-standard/) slot holds future accepted examples as a few-shot (currently empty; §5 is the binding substitute).

## 1. Audience gate (mandatory, no silent skip)

**Before** writing the module docs, the skill asks **once** and waits for the answer:

> Who is this documented for? (a) **developer onboarding** — someone builds on the code · (b) **knowledge preservation** — capture the state before knowledge is lost · (c) **other** (name it).

The answer drives depth, vocabulary and focus of **every** module doc and is written to the run manifest `journal/brownfield-onboarding-map.yml` (`target_audience: <value>`). It goes into every subagent briefing (BOO-489).

- **No silent skip.** If the question is not answered (autopilot/degradation path), the conservative default `entwickler-onboarding` applies **plus** an `audience_gate_ack: <reason>` note in the manifest — visible, not concealed.
- **Why the strongest lever:** In the customer run the quality jumped visibly as soon as the audience was set ("write for an expert onboarding into the project"). Without an audience the model writes into the void.

## 2. Fact-plus-meaning rule (the core)

**Every fact table and every fact list gets a plain-language meaning line** — what does this mean for the reader of the chosen audience?

- Direct counter to the biggest criticism of the customer run: "those are facts, but what do they tell me?"
- Format: after the table/list a short **Meaning:** … or **Key point:** … line — one or two sentences, not a paragraph.
- Applies to diagrams too (every diagram carries a key-point line).
- The rule applies per fact block, not per document — a catalogue of five tables needs five meaning lines.

## 3. Line-number honesty (hooked to `grep_back.py`)

Line references (`Method | Return | Line | Description`) are valuable for onboarding — but they **rot** after the first edit.

- Take line numbers into the docs **only after passing grep-back** (step 7). What `grep_back.py` does not confirm is **omitted** rather than guessed.
- Every doc with line references carries a **freshness note** at the top: `lines checked against <commit/sha> on <date> — re-verify after edits.`
- Unverifiable line → name the method/symbol without a line (the fact stays, the fragile number goes). Better no line than a wrong one.

## 4. Numeric-value honesty (EXTRACTED requirement)

Constants, opcodes, offsets (`KW_IF 0x38`, `WCT_OP_MUL 0x3B`) are fabrication traps — in the customer run it was unclear whether real or invented.

- Every concrete numeric value is either **EXTRACTED** with `file:line` evidence (grep-back-checked) or it is **not stated**.
- Ordering/pattern without evidence (e.g. "the opcodes are contiguous") is **INFERRED** — mark as an assumption, name supporting facts, run the falsification pass (step 9).
- No plausible-sounding numeric value without a source. That is an anti-fabrication violation (SKILL §anti-fabrication rules, rule 1).

## 5. Module structure template

Every `module-<name>.md` follows this order (a section may be dropped when empty — then as `n/a` with a reason, not silently):

1. **Plain-language overview** — "what this module does", 2–4 sentences for the audience.
2. **Architecture at a glance** — role in the overall system, placement; optionally a diagram with a key-point line.
3. **Method/symbol catalogue** — table `Element | Return/Type | Line | Description`, grouped **by role** (entry points / preprocessor / code block / …), not alphabetically. One meaning line per table (§2).
4. **Call relationships** — "who calls whom" (creates the mental hooks the customer explicitly valued). Evidenced edges from the fact graph.
5. **Risks / technical debt** — descriptive, with evidence; no evaluation (that is what `/architecture-review`, `/security-architect` do).
6. **Glossary terms** — module-specific domain terms explained in one sentence each.

## 6. Anti-pattern list (with a negative example from the run)

| Anti-pattern | Negative example (customer run 2026-07-14) | Countermeasure |
|---|---|---|
| **Facts without explanation** | catalogue tables without meaning — "what do these facts tell me?" | fact-plus-meaning rule (§2) |
| **Rambling / verbose** | Opus redundant and too long in places | information depth without word bloat; a plain line, not a paragraph |
| **Broken table** | a table came out as raw Markdown text | check table syntax; when in doubt a list beats a broken table |
| **Stale line number** | lines no longer match after the first edit | line-number honesty (§3) + freshness note |
| **Unverified ordering error** | "LZMA compression comes AFTER the bytecode output" — nonsensical, the result is already written by then | falsification pass (step 9): check the implication against the graph |
| **Unsupported numeric value** | `KW_IF 0x38` — real or invented? | numeric-value honesty (§4): EXTRACTED or omit |
| **No audience** | without a target the model wrote into the void | audience gate (§1) |

## 7. Interlock with the honesty layer (don't duplicate, don't bypass)

The rubric **builds nothing new** that the honesty layer already provides — it wires it to the narration:

| Anti-pattern | already caught by | rubric adds |
|---|---|---|
| stale lines | `grep_back.py` (step 7) | freshness note + omit rule |
| logic/ordering errors | falsification pass (step 9) | named explicitly as an anti-pattern |
| unsupported numbers | EXTRACTED requirement (step 6) | numeric-value honesty rule |
| facts without explanation | — (gap) | fact-plus-meaning rule (§2) |
| missing audience | — (gap) | audience gate (§1) |

The rubric must **not bypass** the deterministic gates (grep-back, coverage, falsification) — it sits on top.

## References

- [Gold-standard few-shot slot](gold-standard/) (accepted examples as a few-shot; currently empty — §5 as the substitute)
- [Honesty layer (SSoT)](honesty-layer.en.md) · [Fact-graph schema (SSoT)](fact-graph-schema.en.md)
- SKILL.md step 5.5 (map-reduce, BOO-489) + step 6 (findings) · Spec: `specs/BOO-490.md` (epic BOO-483)
