---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Honesty layer (SSoT)

Single source of truth for the discipline layer from v0.2.0: evidence register, confidence tags, grep-back, coverage register, falsification pass. This is the part no examined market product delivers (research 2026-07-01, triple-confirmed) — and the reason this skill exists.

## The four disciplines

| Discipline | Tool | Result |
|---|---|---|
| 1. Evidence per statement | `claims.yml` + `scripts/grep_back.py` | every statement carries `file:line` + quote; the back-check re-reads the location |
| 2. Closed-world coverage | `scripts/coverage_register.py` → `coverage.yml` | "X of Y seen" — gaps named, not smoothed over |
| 3. Confidence tag | tag on every statement | EXTRACTED / INFERRED / UNKNOWN — the reader sees at a glance: seen / assumed / unknown |
| 4. Falsification | check protocol (below) | INFERRED statements are attacked against the fact graph, contradictions reported |

## Confidence tags

- **`EXTRACTED`** — tool fact. Comes from the fact graph and has at least one `evidence` entry. EXTRACTED without evidence is inadmissible (grep_back.py turns the run red).
- **`INFERRED`** — LLM assumption, marked as such. Must (a) name the facts it rests on, (b) have gone through the falsification pass, (c) be worded as an assumption in the finding ("suggests", never "is").
- **`UNKNOWN`** — honest gap. Spelled out ("not determinable, because ...") instead of being filled with a plausible narrative. Speculation is suppressed.

Mapping to the document label (BOO-298, CONVENTIONS §2a): the frontmatter field `confidence:` carries the **lowest** tag occurring in the document (`extracted` > `inferred` > `unknown` in order of trust) — a document with even a single INFERRED statement is `confidence: inferred` as a whole.

## Evidence register: `docs/_intake/brownfield/claims.yml`

```yaml
schema_version: 1
generated_at: <ISO>
claims:
  - id: C-001
    statement: "Das Modul billing haengt direkt an der Persistenz-Schicht."
    confidence: EXTRACTED            # EXTRACTED | INFERRED | UNKNOWN
    evidence:                        # mandatory for EXTRACTED; for INFERRED: the supporting facts
      - file: src/main/java/com/acme/billing/Invoice.java
        line: 7
        quote: "import com.acme.persistence.Db;"
    documents: [00-rohbefund.md]     # where the statement is used
  - id: C-002
    statement: "Die Paket-Struktur deutet auf eine beabsichtigte 3-Schichten-Architektur hin."
    confidence: INFERRED
    evidence:
      - file: src/main/java/com/acme
        line: 1
        quote: ""                    # INFERRED: quote optional, supporting facts via file/claim references
    based_on: [C-001]
    falsification: "Gegen Graph geprueft: 3 von 41 Kanten verletzen die vermutete Schichtung — siehe Widerspruchs-Abschnitt."
```

Rules:
- Every architecture statement in a finding document has a claim with an ID; the ID appears in the document (e.g. `[C-001]`).
- `quote` is the verbatim snippet of the line (whitespace-normalised comparison, ±2 lines of tolerance).
- A claim without verifiable evidence is deleted or downgraded to UNKNOWN — never silently kept.

## Grep-back (discipline 1, deterministic)

```bash
python3 brownfield-onboarding/scripts/grep_back.py \
  --claims docs/_intake/brownfield/claims.yml --src-root "$SRC_ROOT"
```

Exit 0 = all evidence confirmed; exit 1 = at least one evidence entry failed → the finding must not be handed over as is. The run is recorded in the closing block (command + result) so the operator can repeat it. Both scripts canonicalize all paths and reject path traversal: evidence must live inside `SRC_ROOT`, register/graph inside the project (run from the project root).

## Coverage register (discipline 2, deterministic)

```bash
python3 brownfield-onboarding/scripts/coverage_register.py \
  --fact-graph docs/_intake/brownfield/fact-graph.yml \
  --src-root "$SRC_ROOT" --out docs/_intake/brownfield/coverage.yml
```

- Ground truth comes from the **source** (`find` count inside the script), not from the graph — the graph cannot confirm itself.
- Gaps are **not an error** (exit 0 even at 18% coverage) — but **ghost entries** (the graph names files that do not exist) are suspected fabrication and turn the run red (exit 1).
- Every finding document cites the coverage number in its header: "Basis: 340 of 1,900 Java files seen (17.9%)."

## Falsification pass (discipline 4, protocol)

For **every** INFERRED statement, before it may enter a finding:

1. **Derive the implication:** What would have to hold in the fact graph if the assumption is true? (Example: "presentation layer" → no edge `ui.* -> persistence.*`.)
2. **Check against the graph** (deterministically, e.g. `yq`/`grep` on fact-graph.yml) — not against one's own memory.
3. **Contradiction found?** The statement is dropped or reworded AND the contradiction appears as its own point in the finding ("The graph contradicts the assumed layering in 3 places: ...").
4. **Record the result in the claim** (`falsification:` field) — even when the pass was passed.

## Cherry-picking guard

The danger is not only invention but **selective quoting**: adopting favourable evidence while omitting killing caveats (a finding from our own research verification 2026-07-01). Therefore:

- When evidencing a statement, **counter-evidence must be searched for as well** (the same graph query, inverted). If it exists, it appears in the claim (`counter_evidence:`) and in the finding.
- A statement whose counter-evidence exists in the graph but is missing from the claim counts as cherry-picking in review — same severity as a failed grep-back.
- Extractor `limitations` (tiers 2/3) must be repeated in every finding header — a finding based on import edges must not read like one based on resolved references.

## Honest limits of this layer

- Grep-back checks that the cited location exists and carries the quote — not that the statement **interprets** the location correctly. Interpretation errors are only caught by the falsification pass (for INFERRED) or by human review.
- Trust signals are not followed automatically: users sometimes keep using LLM output despite a visible evidence warning (PaperTrail finding, research 2026-07-01). The tags make honesty **visible**, they do not replace review — which is why `status: draft` remains until a human approves.
