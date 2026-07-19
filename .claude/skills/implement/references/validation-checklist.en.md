---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Validation Checklist — /implement Step 6

Reference document for all post-implement gates. Consumed by `/implement` step 6.

## Gate Overview

Gate behavior depends on the story's `change_type` (step 5.7 — BOO-68).
**Code-Strict** is the default for `change_type ∈ {none, api, auth, data, dependency, ci, governance, external-provider}`.
**Non-Code** applies to `change_type ∈ {workflow, config, infrastructure, content}`.

| Gate | Step | Tool | Block type (Code-Strict) | Block type (Non-Code) |
|------|------|------|--------------------------|------------------------|
| Code Quality — ESLint | 6a | ESLint CLI | Iteration loop (max 5) | **Skip — reason in `meta.json.skipped_gates`** |
| Security — Semgrep | 6a-bis | Semgrep CLI | Iteration loop (max 5) | **Skip — reason in `meta.json.skipped_gates`** |
| Dependency Check | 6a-tris | dependency-check.sh | Hard block on 404/high CVE | **Skip unless manifest actually in diff** |
| Coverage Gate | 6a-quart | coverage-check.sh | Block at <60%, warn 60-80% | **Skip — reason in `meta.json.skipped_gates`** |
| Acceptance Criteria | 6b | Linear Issue | Hard block (no Done without AC) | Hard block (unchanged) |
| Architecture Quick-Check | 6c | Manual | Soft check | **Hard check — mandatory doc** |
| Smoke Test | 6d | Manual | Soft check | **Hard check — mandatory execution in test env** |
| Security Findings | 6e | Manual | Documentation | **Hard — mandatory doc per domain risk** |
| Intent verification | 6g | intents/INTENT-XX.md | Non-blocking (measure only) | Non-blocking (unchanged) |
| **Domain gates (optional)** | 6a-domain | n8n-lint / tfsec / yamllint | n/a | Best-effort, if `tools_available.<tool>` active |

> Skips in non-code mode are NOT silent — they land with a reason in
> `meta.json.skipped_gates`. Example: `"eslint": "non-code: change_type=workflow"`.
> See [non-code-flow.md](non-code-flow.md) for the complete flow sketch.

## Review Evidence (BOO-18 — Mandatory Human Review)

If `.claude/sensitive-paths.json` is present and a match was found in step 5.5:

### Mandatory entries in the spec file

Under `## Human Review` in the spec file (`specs/{PREFIX}-XXX.md`) the following must be present:

```markdown
## Human Review

- **Date:** YYYY-MM-DD
- **Reviewer:** {Name / GitHub handle}
- **Comment:** {What was checked, what was paid special attention to}
- **Sensitive Paths Touched:** {List of files that matched a sensitive pattern}
```

### Checklist for the reviewer

When reviewing sensitive paths, check:

- [ ] Input validation: Are all user inputs validated before processing?
- [ ] Authentication: Are tokens/sessions validated correctly and no bypass possible?
- [ ] Authorization: Are permissions checked at the resource level (not just route level)?
- [ ] Secrets: Are credentials/keys loaded exclusively from environment variables (never hardcoded)?
- [ ] Logging: Is PII data NOT written to logs?
- [ ] Error Handling: Does the error handler return no sensitive details in the API response?
- [ ] Crypto: Are passwords stored with a secure hashing algorithm (bcrypt, argon2)?
- [ ] MFA: Does the affected auth flow have a second factor — or is the exception documented? (BOO-426)
- [ ] Rate limit: Are auth endpoints (login, password reset, token renewal) rate-limited? (BOO-426)
- [ ] CSRF: Does every state-changing request carry a server-side-validated CSRF token? (BOO-426; pattern: secure-code-patterns §CSRF)

### Audit Trail

The review comment (`review-ok: ...`) is stored in two artifacts:
1. **Spec file** (`specs/{PREFIX}-XXX.md §Human Review`) — long-term audit trail per story
2. **Linear comment** — posted automatically by `/implement` after step 6b (incl. reviewer + date)

### Fallback: No sensitive-paths.json

If `.claude/sensitive-paths.json` is missing: step 5.5 is skipped, no human review enforced. Recommendation: catch up on `/bootstrap` phase 4.4i or create the file manually.

---

## Validation PASS / FAIL Criteria

### Code-Strict (Default)

**PASS** (all must be met):
- ESLint: 0 errors
- Semgrep: 0 high/critical findings
- Dependency: no 404, no high/critical CVE
- Coverage: ≥80% on new lines (or operator approval with justification)
- AC check: all ACs ticked off with evidence
- Sensitive Paths: human review documented (if a match)

**FAIL** (one is enough):
- ESLint errors still present after 5 iterations
- Semgrep high/critical after 5 iterations
- Dependency 404 or high/critical CVE not mitigated
- Coverage <60% without operator approval
- Sensitive path without `review-ok` confirmation

### Non-Code (`change_type ∈ {workflow, config, infrastructure, content}` — BOO-68)

**PASS** (all must be met):
- AC check: all ACs ticked off with evidence (6b)
- Architecture quick-check: concrete finding documented, not empty (6c, hard)
- Smoke test: actually executed in test env, output documented (6d, hard) — workflow triggered / `terraform plan` + `apply` ran / config applied
- Security findings: documented per domain risk or explicitly "n/a — justification" (6e, hard)
  - Webhook auth, credential storage, IAM/RBAC, public surface, rate limits
- Sensitive Paths: human review documented (if a match in `n8n/**`, `infra/**`, `**/*.tf`, etc.)
- Optional domain gates (n8n-lint, tfsec, tflint, yamllint): green if `tools_available.<tool>` active

**FAIL** (one is enough):
- 6c empty / "n/a" without justification
- 6d not executed or output not documented
- 6e empty / "no check" without justification
- Sensitive path without `review-ok` confirmation
- Optional domain gate activated but red without documented exception
