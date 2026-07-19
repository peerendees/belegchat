---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Story template: Fix / Refactor

For bug fixes, refactors, and small changes. Less overhead than the feature template.

## Required sections

### 1. Problem description
- What is broken / suboptimal?
- How does it manifest? (error message, behavior, log entry)
- Since when? (version, commit if known)

### 2. Affected files
- Which files need to change?
- Which components are affected?

### 3. Solution
- Concrete fix approach
- Code example if helpful

### 4. Dependencies (MANDATORY)
```markdown
## Dependencies
- Needs: [STORY-XX] or none
- Affects: [STORY-YY] or none

## Position in overall plan
- Independent / or specify order
```

### 5. Acceptance criteria
- Checkboxes, testable

### 5a. Test block / unit tests (MANDATORY)
Concrete unit test cases the fix closes with. (Section `5a` so 6–7 and cross-references stay stable.)

- **Test cases** (at least a regression/happy path + 1 error/edge case), each with expected behavior.
- **AC mapping** — which test covers which acceptance criterion.
- **No placeholder tests:** `assert true`, `expect(true).toBe(true)`, empty test bodies, or
  unjustified `skip`/`xit`/`@pytest.mark.skip` — the anti-placeholder check (BOO-177) in the
  implement test gate (`/implement` step 6a-quart) flags them.
- **Scope:** Unit tests only — NOT integration/E2E.

### 6. Security Impact (MANDATORY)
- Change type: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`
- Does the fix touch sensitive paths, external inputs, secrets, auth, data storage, or CI/governance?
- Which sections from `SECURITY.md` must `/implement` read?
- If there is no security impact: briefly explain why.

> **Non-code fixes** (`workflow | config | infrastructure | content`): For pure n8n / IaC / config / content fixes,
> `/implement` skips the code gates and promotes 6c/6d/6e to mandatory. Details: `implement/references/non-code-flow.md`.

### 7. Security Validation (MANDATORY for code, security, tooling, dependency, CI, or governance changes)
- Which checks must run before `Done`?
- What evidence belongs in the closing comment?
- Which residual risks remain knowingly accepted?
