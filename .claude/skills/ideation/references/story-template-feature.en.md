---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Story template: Feature / Agent

Every feature story MUST follow this structure.

## Required sections

### 1. Available APIs & data sources
- API endpoints with URL, auth, rate limits, cost
- Response format (relevant fields)
- Free tier vs. paid — which do we need?

### 2. Code examples (project pattern)
- Concrete fetch functions in project style
- Error handling, timeout, fallback
- No npm if stdlib is enough

### 3. Signal format & config integration
- Signal output JSON (`signals/xyz.json`) in the standard format:
  `{ timestamp, agent, score, signal, components, flags }`
- Config entries: AGENT_WEIGHTS, SIGNAL_FILES
- Tier assignment (fast/medium/slow)
- Scoring logic explained

### 4. Architecture integration
- ASCII diagram: data sources → agent → signal → supervisor
- Weight in supervisor, protected-agents yes/no

### 5. Phased plan
- Phase 1 (free) → Phase 2 (free APIs) → Phase 3 (paid optional)
- **`/ultraplan` output (BOO-207):** when an ultraplan run produces the **code-level plan** (story `>5 SP`
  or architecture break, `prefer_ultraplan`), it lands as its own `## Plan` section in
  `specs/<story>.md` — it complements the phased plan (coarser level), doesn't replace it.

### 6. Dependencies (MANDATORY)
```markdown
## Dependencies
- Needs: [STORY-XX] (must be done first)
- Affects: [STORY-YY] (will be altered by this story)

## Position in overall plan
- Order: #X/Y | Phase: [phase name]
- Predecessor: STORY-XX
- Successor: STORY-ZZ
```

### 7. Acceptance criteria
- Checkboxes, testable, concrete

### 7a. Test block / unit tests (MANDATORY)
Define the concrete unit test cases here while writing the story — the implementation closes
with exactly these tests. (Dedicated section `7a` so the numbering of 8–10 and its cross-references stay stable.)

- **Test cases** (at least 1 happy path + at least 1 error/edge case), each with expected behavior:
  - `[Happy path]` — input → expected result
  - `[Error/edge case]` — input → expected behavior (exception, fallback, boundary value)
- **AC mapping** — which test covers which acceptance criterion (e.g. `Test 1 → AC 7.1`).
- **No placeholder tests:** `assert true`, `expect(true).toBe(true)`, empty test bodies, or
  unjustified `skip`/`xit`/`@pytest.mark.skip` are forbidden — the anti-placeholder check (BOO-177)
  in the implement test gate (`/implement` step 6a-quart) flags them.
- **Scope:** Unit tests only — NOT integration/E2E tests (a separate future topic).

### 8. Security Impact (MANDATORY)
- Change type: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`
- New or changed attack surface?
- Are personal data, secrets, tokens, cookies, or external providers touched?
- Which sections from `SECURITY.md` and which security references must `/implement` read?
- If there is no security impact: explicitly explain why; do not leave this empty.

> **Non-code change types** (`workflow | config | infrastructure | content`):
> These stories do not produce a classic code diff (n8n/Make/Zapier workflow,
> Terraform/Pulumi/CloudFormation, pure config/IAM/DNS/CORS, CMS content). `/implement`
> explicitly skips the code gates (6a/6a-bis/6a-tris/6a-quart) and promotes 6c/6d/6e to
> **hard gates** — no PASS without documented architecture, smoke test, and security evidence.
> Sensitive paths declared in `.claude/sensitive-paths.json` (e.g. `n8n/**`, `infra/**`, `**/*.tf`)
> still trigger the mandatory human review. Details: `implement/references/non-code-flow.md`.

### 9. Security Validation (MANDATORY for code, security, tooling, dependency, CI, or governance changes)
- Which local checks must run? (e.g. Semgrep, dependency-check, tests, manual review)
- Which sensitive paths may be affected?
- What evidence must be documented before `Done`?
- Which risks remain knowingly accepted?

### 10. Dependencies
- Only if stdlib is insufficient
- Reason why
