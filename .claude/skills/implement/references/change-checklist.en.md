---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Change Checklist (generic)

MANDATORY on every code change, however small. Go through at the end of Step 5 in the `/implement` workflow.

## 1. Doc impact per change type

Derive the change type from the Linear label or the affected area. Then update the corresponding docs.

| Change type | Docs to ALWAYS check |
|-------------|---------------------|
| **New component / module** | `ARCHITECTURE_DESIGN.md §9 References`, `COMPONENT_INVENTORY.md`, `SYSTEM_ARCHITECTURE.md`, component doc (Obsidian or `docs/components/`) |
| **API integration** (external) | `SECURITY.md` (threat surface), component doc, `.env.example` (new variables), `CHANGELOG.md` |
| **Configuration / secrets** | `.env.example`, `SECURITY.md` (secret handling), `lib/config.js` (if SSoT values), `CLAUDE.md` (if system behavior changes) |
| **Security-relevant change** | `SECURITY.md` (always), `ARCHITECTURE_DESIGN.md §3 Quality Attributes`, ADR if architecture impact |
| **Doc / governance change** | `GOVERNANCE.md`, `DEVELOPMENT_PROCESS.md`, `CLAUDE.md`, affected skill files |
| **New dependency** | `package.json` / `pyproject.toml`, `SECURITY.md` (supply-chain risk), possibly `SYSTEM_ARCHITECTURE.md` |
| **New ADR** | `ARCHITECTURE_DESIGN.md §7 ADR table`, `Decisions/ADR-XX.md` (in Obsidian or `docs/adr/`), reference in affected component docs |
| **New file** (every `*.md`) | `ARCHITECTURE_DESIGN.md §9 References` (enforced by `orphan-check.sh` if installed), `INDEX.md` |
| **Hook / governance hook change** | `GOVERNANCE.md`, `.claude/settings.json` + `settings.local.json`, `hooks-setup.md` if skill-level |
| **Phase transition** (e.g. Phase 0 → 1) | PMO hub (Obsidian), `ARCHITECTURE_DESIGN.md §6 phase mapping`, all component docs (phase status), `CHANGELOG.md` |
| **Onboarding/handoff-relevant change** | `DEVELOPER_ONBOARDING.md`, project hub / PMO hub, `ARCHITECTURE_DESIGN.md` if target architecture is affected, `SECURITY.md` if security rules are affected |
| **Workflow** (n8n / Make / Zapier, `change_type: workflow`) | `SECURITY.md` (webhook auth, credentials), `ARCHITECTURE_DESIGN.md` (integration), workflow JSON committed, component doc for automation, `.env.example` for new secrets |
| **Infrastructure** (Terraform / Pulumi / CFN, `change_type: infrastructure`) | `SECURITY.md` (IAM, public surface), `ARCHITECTURE_DESIGN.md` (topology), `infra/README.md`, `.tfvars.example`, ADR for architecture drift |
| **Config** (pure cloud/app configs, `change_type: config`) | `SECURITY.md` (hardening), `.env.example`, affected component doc, `CONVENTIONS.md` if a project-wide rule is touched |
| **Content** (CMS migrations, doc bulk, `change_type: content`) | `INDEX.md`, affected component doc, `CHANGELOG.md` (content), for external publishing: release sign-off reference |

**Always:**
- Update the affected component's component doc (stack, phase status, linked stories, open questions)
- Bump `lib/config.js` VERSION if DOC_FILES were updated
- Bring all DOC_FILES to new VERSION (enforced by `doc-version-sync.sh`)
- `CHANGELOG.md` entry with version + description
- At the end of every implementation, explicitly document: `DEVELOPER_ONBOARDING.md` updated or "no update needed"; project hub / PMO hub updated or "no update needed"

---

## 2. Privacy check (ALWAYS)

For every change, check:

- [ ] Is a new data-flow boundary to an external system being crossed? (cloud API, third-party service, webhook)
- [ ] Are personal data being processed or transmitted?
- [ ] Is the project configured with the `Privacy` add-on? If so: verify data-flow control (redaction? tier model?)
- [ ] Are secrets visible in code or log? (`.env` check, log sanitizing)

For privacy-relevant changes: update the Privacy section of `SECURITY.md`.

---

## 3. Architecture consistency check

- [ ] No hardcoded values that belong in `lib/config.js` (respect SSoT)
- [ ] Config values configurable via `.env` if environment-specific
- [ ] Error handling present where needed (API calls, file I/O, user input)
- [ ] Logging implemented on errors and important state changes
- [ ] Existing patterns respected (don't introduce new conventions unless necessary)
- [ ] Tool-switch/handoff context still correct? (Claude Code -> Codex/Cursor/GitHub Copilot/Google Antigravity/classic development team)

---

## 4. Git commit + push

- Code AND doc changes in one commit
- Commit message: `feat: <PREFIX>XXX — [Title]` / `fix: <PREFIX>XXX — [Title]` / `docs: ...` / `refactor: ...`
- `spec-gate.sh` + `doc-version-sync.sh` must be green
- Push after successful commit

---

## Special checklists (per change type)

### Add new component / module

- [ ] `ARCHITECTURE_DESIGN.md §9 References`: new entry
- [ ] `COMPONENT_INVENTORY.md`: row with status, path, purpose
- [ ] `SYSTEM_ARCHITECTURE.md`: extend table
- [ ] Create component doc (skeleton from `bootstrap/references/doc-architecture-proposal.en.md`)
- [ ] `INDEX.md`: new entry
- [ ] `.env.example`: new variables documented
- [ ] `lib/config.js`: bump VERSION if configurable

### Integrate new external API

- [ ] Rate-limit handling implemented
- [ ] Timeout set
- [ ] Offline/error fallback (graceful degradation)
- [ ] API key only in `.env` (never in Git, never in log)
- [ ] Logger sanitized (`logger.sanitize()` for response text)
- [ ] `SECURITY.md`: new threat surface documented
- [ ] Component doc updated (stack table, open questions)
- [ ] Privacy-tier compatibility documented (if Privacy add-on active)

### Change secrets management

- [ ] `.env.example` with format explanation (NEVER real values)
- [ ] `SECURITY.md §API Key Policy` updated
- [ ] Existing `.gitignore` entries validated
- [ ] On secret rotation: deactivate old keys, write event log
- [ ] No secrets in logs (sanitize)

### New ADR

- [ ] ADR file in `Decisions/ADR-XX.md` (Obsidian) or `docs/adr/ADR-XX.md` with: Status, Context, Decision, Consequences, Alternatives
- [ ] `ARCHITECTURE_DESIGN.md §7 ADR table`: entry
- [ ] Affected component docs: reference to ADR
- [ ] `CHANGELOG.md`: entry
- [ ] Enforcement question: "Is the decision machine-enforced or only documented?" — if only documented: guard-story candidate (hook / test / self-healing check)

### Hook / governance change

- [ ] `GOVERNANCE.md` section updated
- [ ] Hook script lives in `.claude/hooks/`
- [ ] Hook registered in `.claude/settings.json` AND `.claude/settings.local.json` (harness fallback)
- [ ] Hook test: trigger manually (e.g. dummy commit) and check block
- [ ] `bootstrap/references/hooks-setup.md` updated if generic hook
- [ ] `specs/<PREFIX>XXX.md` documents the new hook

### Security feature change

- [ ] `SECURITY.md` relevant section updated (threat model, input validation, auth)
- [ ] Threat response matrix reviewed — is existing threat mitigated?
- [ ] On new inbound webhook: HMAC signing, replay protection, rate limit, body limit
- [ ] On new .env variable with credential: sanitize in logger, documentation in `.env.example`

### Governance / skill change

- [ ] Affected `SKILL.md` updated
- [ ] `references/*.md` pulled along if referenced
- [ ] `GOVERNANCE.md` updated if project-global rule affected
- [ ] Bump version in skill frontmatter (`version:` in SKILL.md)
- [ ] Run `publish_skill.py` if skill should go into master repo

### Add / change workflow (n8n / Make / Zapier — `change_type: workflow`, BOO-68)

- [ ] Workflow JSON exported and committed to `n8n/` / `workflows/` (not "lives in the UI only")
- [ ] **Webhook auth:** HMAC signing or header token set — the webhook is not "open"
- [ ] **Credentials:** referenced via the n8n credentials store, NOT as a literal string in a node body
- [ ] **Error branches:** every external API call has an error output branch (no silent ignore)
- [ ] **Rate limits / timeouts:** set on every HTTP node
- [ ] Smoke test: workflow triggered for real in a test environment, output documented in the spec
- [ ] `SECURITY.md` webhook inventory section updated
- [ ] Optional: `tools_available.n8n_lint` active and green, `tools_available.workflow_jsonschema` active and green

### Change Infrastructure-as-Code (Terraform / Pulumi / CFN — `change_type: infrastructure`, BOO-68)

- [ ] `terraform plan` (or equivalent) executed, diff documented in the spec
- [ ] **IAM:** no `*` in resource/action statements without an explicit justification
- [ ] **Public surface:** S3 buckets / storage / endpoints not unintentionally public
- [ ] **Secrets:** no plaintext in `.tfvars` — use a secret manager or SOPS
- [ ] **State file:** not in Git, backend configured correctly
- [ ] Smoke test: `apply` executed in a non-production account / workspace
- [ ] `infra/README.md` and `ARCHITECTURE_DESIGN.md` updated
- [ ] Optional: `tools_available.tflint`, `tools_available.tfsec`, `tools_available.checkov` active and green

### Pure config change (cloud / app configs — `change_type: config`, BOO-68)

- [ ] Diff reviewed line-by-line (not "it's just YAML")
- [ ] **Schema validation:** config checked against schema (yamllint / jsonschema)
- [ ] **Secrets:** no plaintext credentials in the config
- [ ] **Rollback plan:** documented how to restore the old config
- [ ] Smoke test: config applied in a test environment, app starts/runs
- [ ] `.env.example` and component doc updated
- [ ] Optional: `tools_available.yamllint`, `tools_available.jsonschema`, `tools_available.opa` active and green

### Content migration / doc bulk (`change_type: content`, BOO-68)

- [ ] Before/after diff documented in the spec (at least a sample of 3 pages)
- [ ] **Broken-link check:** all internal and external links validated
- [ ] **PII check:** no accidental publication of personal data
- [ ] **Sign-off:** for externally visible publication, operator sign-off documented
- [ ] Smoke test: content visible and rendered correctly in the target system (CMS / website)
- [ ] `INDEX.md` / sitemap updated
- [ ] Optional: `tools_available.markdownlint`, `tools_available.broken_links` active and green

---

## 5. Component doc update (if Obsidian active)

Every code change touching a component must update the component file:
- `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/<component>.md`
- Sections: stack table (if tool change), phase status, linked stories (link to JAR-XXX + spec), open questions

If DocSync activated (Block D.2): runs automatically via `node lib/doc-sync.js`.
