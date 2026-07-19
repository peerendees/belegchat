---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Non-code flow — `/implement` step 5.7 (BOO-68)

> Reference document for the non-code path in the implement skill. Explains what happens when
> a story sets `change_type` in the spec frontmatter to `workflow | config | infrastructure | content`
> — i.e. when the story does not produce a classic code diff.

## Why this exists at all

The INTENTRON framework is code-first. The quality gates 6a (ESLint/Ruff), 6a-bis (Semgrep),
6a-tris (dependency check) and 6a-quart (coverage) all depend on code diffs.

**The problem:** Some stories don't produce a code diff but are still real implementations with
real risks:

| Story type | `change_type` | Examples | Risks |
|---|---|---|---|
| n8n / Make / Zapier | `workflow` | Webhook receivers, ETL pipelines, notifications | Webhook auth, credentials, error handling, rate limits |
| Terraform / Pulumi / CFN | `infrastructure` | IAM roles, S3 buckets, VPC, DNS, K8s | Public surface, IAM drift, state files, secrets in `.tfvars` |
| Pure cloud / app config | `config` | Feature flags, CORS headers, spam filter rules | Hardening, secrets, rollback path |
| Content migration / CMS | `content` | Doc bulk import, CMS pages, newsletter templates | Broken links, accidental publishing, PII |

Without the branch, all four story types would walk through `/implement`, every code gate would
say "no matching diff" and report `final_status: passed` — **even though no one verified the
real risks**. This violates the Schrader principle: "no output without verify".

## How the skill branches

```
                       ┌───────────────────────────────────────┐
                       │  Step 5.5 (Sensitive Paths)           │
                       │  - on hit: review-ok mandatory        │
                       └─────────────────┬─────────────────────┘
                                         │
                                         ▼
                       ┌───────────────────────────────────────┐
                       │  Step 5.7 — change-type branching     │
                       │  Reads change_type from spec frontmatt│
                       └─────────────────┬─────────────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  │                                             │
                  ▼                                             ▼
         ┌────────────────────┐                      ┌─────────────────────┐
         │  Code-strict       │                      │  Non-code mode      │
         │  (default)         │                      │  workflow / config /│
         │  none, api, auth,  │                      │  infrastructure /   │
         │  data, dependency, │                      │  content            │
         │  ci, governance,   │                      │                     │
         │  external-provider │                      │                     │
         └─────────┬──────────┘                      └──────────┬──────────┘
                   │                                            │
                   ▼                                            ▼
   ┌────────────────────────────┐               ┌────────────────────────────┐
   │ 6a  ESLint    Hard         │               │ 6a  ESLint    SKIP+reason  │
   │ 6a' Semgrep   Hard         │               │ 6a' Semgrep   SKIP+reason  │
   │ 6a" Dependency Hard        │               │ 6a" Dependency SKIP/manif  │
   │ 6a‴ Coverage  Hard         │               │ 6a‴ Coverage  SKIP+reason  │
   │ 6b  AC-Check  Hard         │               │ 6b  AC-Check  Hard         │
   │ 6c  Architecture Soft      │               │ 6c  Architecture HARD      │
   │ 6d  Smoke Test  Soft       │               │ 6d  Smoke Test  HARD       │
   │ 6e  Security   Doc only    │               │ 6e  Security   HARD/Domain │
   └────────────┬───────────────┘               │ 6a-domain (n8n-lint, tfsec,│
                │                               │  tflint, yamllint, ...)    │
                │                               │  Best-effort if tools avail│
                │                               └────────────┬───────────────┘
                ▼                                            ▼
        ┌───────────────────┐                       ┌───────────────────┐
        │  meta.json        │                       │  meta.json        │
        │  change_type: X   │                       │  change_type: Y   │
        │  skipped_gates:{} │                       │  skipped_gates:   │
        │  final_status:    │                       │  { eslint: ...,   │
        │   passed/failed   │                       │    semgrep:..., } │
        └───────────────────┘                       │  final_status:    │
                                                    │   passed/failed   │
                                                    └───────────────────┘
```

## What exactly happens in step 5.7

1. **Read** — read `change_type` from the spec frontmatter. Default if missing: `none` (= code-strict).
2. **Branch** — is it in the non-code set `{workflow, config, infrastructure, content}`? If no: nothing changes, continue to step 6.
3. **Set mode** — if yes: set gate mode to `non-code`. Effects:
   - Code gates (6a/6a-bis/6a-tris/6a-quart) are **explicitly** skipped in step 6
   - Soft gates 6c/6d/6e become **hard**
   - 5.5 stays unchanged — sensitive-paths patterns still fire
4. **Document skip** — one entry per skipped gate in `meta.json.skipped_gates`:
   ```json
   "skipped_gates": {
     "eslint": "non-code: change_type=workflow",
     "semgrep": "non-code: change_type=workflow",
     "dependency": "non-code: no manifest in diff",
     "coverage": "non-code: change_type=workflow"
   }
   ```
5. **Domain gates (best-effort)** — when `tools_available.<tool>` is active, the matching tool gates run:
   - `workflow` → `n8n_lint`, `workflow_jsonschema`
   - `infrastructure` → `tflint`, `tfsec`, `checkov`
   - `config` → `yamllint`, `jsonschema`, `opa`
   - `content` → `markdownlint`, `broken_links`

## What the smoke test (6d) really means

For non-code stories, smoke test is NOT a syntax check — it's a **real execution in a test
environment**. Examples:

| `change_type` | What the smoke test means in practice |
|---|---|
| `workflow` | Workflow triggered manually or via test webhook in n8n, end-to-end path ran, output checked |
| `infrastructure` | `terraform plan` + `apply` ran in a non-production workspace, resource visible in cloud console |
| `config` | Config deployed to staging, app restart or hot reload, smoke URL responds, logs clean |
| `content` | Content pushed to target CMS, at least 3 sample pages visually verified, links validated |

The smoke test output **must be documented in the spec file under `## Smoke test`** — not "tested
it, all good". Concrete evidence: screenshot path, log excerpt, plan diff, URL.

## Security findings (6e) for non-code

Hard documentation per domain risk. At least these points must be addressed in the spec file
under `## Security findings` (or explicitly marked "n/a — reason"):

- **Webhook auth** (for `workflow`): HMAC / token / IP restriction?
- **Credentials** (all): Secret manager? Env vars? No plaintext?
- **IAM** (for `infrastructure`, `config`): No `*` wildcards? Least privilege?
- **Public surface** (for `infrastructure`): Buckets / endpoints / DBs not unintentionally public?
- **Rate limits / timeouts** (for `workflow`, `config`): Set on external calls?
- **Rollback** (all): How is the change reverted if something breaks in production?

## What happens when `change_type` is missing

Default = `none` = code-strict. The skill behaves as before. Code gates fire, soft gates stay
soft. This is intentionally conservative — no auto-fallback to "non-code" because that would be
an audit hole.

> **When `/ideation` builds a story, `change_type` should be set actively** — even for non-code
> stories. The ideation skill (see `ideation/SKILL.en.md` step 4) prompts the operator as soon
> as the story description smells like workflow/IaC/config.

## What this story does NOT do

- No concrete tool integrations (n8n-lint wrapper, tfsec hook) — those are follow-up stories
- No auto-detection of `change_type` from the diff — deliberately set manually by the operator
- No change to the spec gate (`specs/{PREFIX}-XX.md` is mandatory regardless of type)
- No auto-bypass — missing `change_type` falls back to code-strict, not "skip everything"

## Cross references

- `implement/SKILL.en.md` step 5.7 — the code path
- `implement/references/validation-checklist.md` — gate table and PASS/FAIL criteria non-code
- `implement/references/change-checklist.en.md` — special checklists per non-code type
- `ideation/references/story-template-feature.en.md` §8 — where `change_type` is set
- `CONVENTIONS.md` §Story spec frontmatter — full frontmatter schema
- `bootstrap/references/file-templates.md` §`.claude/sensitive-paths.json` — default patterns incl. non-code paths
