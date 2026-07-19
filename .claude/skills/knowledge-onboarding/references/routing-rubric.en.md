---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Routing rubric — SSoT for knowledge-onboarding

> This file is the **Single Source of Truth** for routing in `knowledge-onboarding/SKILL.md`. Changes here directly affect the skill's behaviour. Versioning via repo git history.

## Tier logic (short)

- **Tier 0** — exclusion. Framework-owned artefacts and code. Never routed.
- **Tier 1** — filename / path match (deterministic). Exactly one category match in the filename signals → classification is set.
- **Tier 2** — content signals (rule-bound). No Tier-1 match, but content contains keywords from exactly one category.
- **Tier 3** — ambiguous. ≥ 2 categories match OR no match. Operator is asked; answer is `pinned`.

**Priority:** Tier 0 beats everything. Otherwise Tier 1 before Tier 2. Multiple hits on the same tier → Tier 3.

## Tier 0 — exclusion list

These files / paths are **never routed** and appear in the manifest only as `tier: 0, action: skip`.

### Framework generator artefacts (repo root)

```
CLAUDE.md
AGENTS.md
CONVENTIONS.md
ARCHITECTURE_DESIGN.md
SECURITY.md
GOVERNANCE.md
INDEX.md
DEVELOPER_ONBOARDING.md
CONTEXT.md
PRIVACY.md
AI_SYSTEM.md
README.md             # Note: README in the target repo is NOT routed as a source (would be self-routing). Tier-1 entry in source repo remains.
LICENSE.md
LICENSE
NOTICE
```

### Skill bundle directories (repo root)

```
architecture-review/
backlog/
bootstrap/
cloud-system-engineer/
dpo/
grafana/
ideation/
implement/
intent/
knowledge-onboarding/
pitch/
security-architect/
sprint-review/
visualize/
references/
```

### Code directories (heuristic)

- File extensions: `*.{ts,tsx,js,jsx,mjs,cjs,py,go,rb,java,rs,cs,kt,swift,php,sh,bash,zsh,fish,lua,sql,proto,graphql}`
- Config files: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `pyproject.toml`, `Gemfile`, `Gemfile.lock`, `Cargo.toml`, `Cargo.lock`, `go.mod`, `go.sum`, `pom.xml`, `build.gradle`, `*.config.{js,ts,mjs}`, `tsconfig.json`, `eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `postcss.config.*`, `tailwind.config.*`, `vite.config.*`, `next.config.*`, `vercel.json`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/*`
- Paths in `.gitignore` (lookup) — if a file matches → Tier 0.

### Generated / temporary paths

```
node_modules/
.next/
dist/
build/
.cache/
coverage/
journal/
.claude/
.codex/
.git/
```

## Tier 1 — filename/path signals + Tier 2 — content signals

| # | Category | Tier-1 signals (filename/path — case-insensitive) | Tier-2 signals (content keywords) | Target artefact | Default action |
|---|---|---|---|---|---|
| 1 | `intent-gap-scope` | `gap`, `scope`, `intent`, `requirements`, `anforderung` | "is/should", "gap", "requirement", "stakeholder need", "target state" | `intents/INTENT-XX.md` + `ARCHITECTURE_DESIGN.md §1` | `extract` |
| 2 | `legal-compliance` | `legal`, `recht`, `dsgvo`, `gdpr`, `compliance`, `governance`, `audit` | GDPR, "§", "law", "regulator", "liability", "deadline", "regulator", "FINMA", "BaFin", "data protection" | `SECURITY.md` / `GOVERNANCE.md` + DPO (`PRIVACY.md` / `AI_SYSTEM.md` if personal data / AI) + ADR | `extract` |
| 3 | `design-ui-visual` | `design`, `mockup`, `wireframe`, `figma`, `ui`, `style-guide`, `style_guide`, `DESIGN.md` | Hex color pattern (`#[0-9A-Fa-f]{3,6}`), "typography", "component library", "wireframe", "mockup", "atomic design" | `ARCHITECTURE_DESIGN.md §5` + `DESIGN.md` + ADR (linked to BOO-126) | `reference` |
| 4 | `decision-adr` | `decision`, `adr`, `entscheidung`, `decisions/` (path) | "decided for", "tradeoff", "alternative rejected", "because", "therefore", "decided to", "rejected alternative" | ADR `docs/domain/adrs/ADR-XX.md` | `extract` |
| 5 | `architecture-plan` | `architektur`, `architecture`, `plan`, `roadmap`, `README`, `PLAN`, `OVERVIEW` | "components", "tech stack", "roadmap", "architecture diagram", "C4 model", "system diagram" | `ARCHITECTURE_DESIGN.md` + Backlog (plan → stories) | `reference` |
| 6 | `vocabulary-context` | `context`, `glossar`, `glossary`, `terms`, `terminologie` | "means", "definition", terms tables (table with ≥ 2 term:definition pairs), "ubiquitous language" | `CONTEXT.md` + Component-Docs | `extract` |
| 7 | `research` | `research`, `recherche`, `analyse`, `analysis`, `study` | External sources / URLs in bulk (≥ 3 links), "see source", "literature review" | `docs/project/research/<topic>.md` or vault | `reference` |
| 8 | `demo-storyboard-pitch` | `demo`, `choreographie`, `choreography`, `pitch`, `storyboard`, `script` | "demo flow", "storyboard", "pitch slide", "user journey demo" | `docs/project/demo/<name>.md` or `/pitch` material | `reference` |
| 9 | `onboarding-handover` | `onboarding`, `handover`, `welcome`, `getting-started`, `quickstart` | "new developer", "handover", "induction", "where to find what" | `DEVELOPER_ONBOARDING.md` | `extract` |
| 10 | `prompt-library` | `prompts/` (path), `*.prompt.md`, `prompts.md` | "You are a …", "task:", "example:", "format:", LLM prompt structures (System/User/Assistant) | `docs/project/prompts/<name>.md` | `reference` |
| 11 | `infra-layer` | `infra`, `deployment`, `db-schema`, `schema`, `iam`, `rbac`, `runbook`, `sla`, `backup`, `recovery`, `terraform`, `k8s`, `ci-cd` | "RTO/RPO", "replication", "rate limit", "RLS", "row-level security", "shard", "deployment strategy", "failover", "backup strategy", "SLA" | `ARCHITECTURE_DESIGN.md §5b` (infra-layer table, BOO-221) + optional sub-MD (`DB_SCHEMA.md` / `IAM_POLICY.md` / `RECOVERY_PLAN.md`); catalog `cloud-system-engineer/references/infrastructure-dimensions.en.md` | `reference` |

## Tier 3 — ambiguity rule

A file lands in Tier 3 if:

1. **Multiple categories match** on the same tier (e.g. `LEGAL_SKILLS_RECHERCHE.md` → Tier-1 match `legal` AND `research`).
2. **No match** in Tier 1 AND Tier 2 (no filename signal, no content signal).

Operator question (see SKILL.en.md step 4.4). Answer becomes `pinned: true` in manifest → follow-up scans don't ask again.

## Example classifications (from BKO validation 2026-06-03)

| Source file | Tier | Match signal | Category | Target |
|---|---|---|---|---|
| `GAP_ANALYSE.md` | 1 | `filename:gap` | intent-gap-scope | `intents/INTENT-XX.md` + `ARCHITECTURE_DESIGN.md §1` |
| `README.md` (source repo) | 1 | `filename:README` | architecture-plan | `ARCHITECTURE_DESIGN.md` + Backlog |
| `docs/Plan.md` | 1 | `filename:Plan` | architecture-plan | `ARCHITECTURE_DESIGN.md` + Backlog |
| `docs/CONTEXT.md` | 1 | `filename:context` | vocabulary-context | `CONTEXT.md` |
| `docs/STYLE_GUIDE.md` | 1 | `filename:style_guide` | design-ui-visual | `ARCHITECTURE_DESIGN.md §5` + `DESIGN.md` |
| `LEGAL_SKILLS_RECHERCHE.md` | 3 | `filename:legal+research` | ambiguous | (operator question) |
| `DEMO_CHOREOGRAPHIE.md` | 1 | `filename:choreographie` | demo-storyboard-pitch | `docs/project/demo/widerspruch-demo.md` |
| `docs/HANDOVER.md` | 1 | `filename:handover` | onboarding-handover | `DEVELOPER_ONBOARDING.md` |
| `prompts/widerspruch.prompt.md` | 1 | `path:prompts/` | prompt-library | `docs/project/prompts/widerspruch.md` |
| `AGENTS.md` | 0 | `tier-0-list` | framework-artefact | skip |

## Manifest schema (complete)

```yaml
schema_version: 1
generated_at: 2026-06-03T15:00:00Z         # ISO-8601 UTC
generator: knowledge-onboarding/SKILL.md v1.0.0
source:
  adapter: github-repo                      # github-repo | local-folder | chat
  identifier: example-org/example-project     # URL / path / "chat"
  branch: main                              # optional, only for adapter:github-repo
  scanned_at: 2026-06-03T15:00:00Z
items:
  - source_path: GAP_ANALYSE.md             # relative path in source
    source_hash: sha256:abc123…             # over content; recomputed on change
    size_bytes: 12345
    tier: 1                                 # 0 | 1 | 2 | 3
    category: intent-gap-scope              # one of the category slugs above
    match_signal: "filename:gap"            # textual description of the match
    target_artefacts:
      - intents/INTENT-01.md
      - ARCHITECTURE_DESIGN.md#§1
    action: extract                         # reference | extract | skip | ask
    pinned: false                           # true → operator correction, never overwrite
    operator_note: null                     # null or string with reason
    status: active                          # active | removed (if source gone)
    applied_at: 2026-06-03T15:02:00Z        # timestamp of apply (not of scan)
  - source_path: LEGAL_SKILLS_RECHERCHE.md
    source_hash: sha256:def456…
    size_bytes: 8765
    tier: 3
    category: ambiguous
    match_signal: "filename:legal+research"
    target_artefacts:
      - docs/project/research/legal-skills.md
    action: reference
    pinned: true
    operator_note: "content is research, not compliance — pinned 2026-06-03"
    status: active
    applied_at: 2026-06-03T15:03:00Z
  - source_path: AGENTS.md
    source_hash: sha256:ghi789…
    size_bytes: 4321
    tier: 0
    category: framework-artefact
    match_signal: "tier-0-list"
    action: skip
    pinned: false
    operator_note: null
    status: active
coverage:
  total_files: 18
  classified: 14
  tier_0_skip: 3
  tier_1: 10
  tier_2: 3
  tier_3_resolved: 1
  operator_pinned: 1
  skip_rate_percent: 22
  ambiguity_rate_percent: 7
warnings: []                                 # empty when all within thresholds
```

**Thresholds for `warnings[]`:**
- `skip_rate_percent > 50` → `"high skip rate, rubric may not fit source"`
- `ambiguity_rate_percent > 30` → `"high tier-3 rate, rubric may be too fuzzy"`

## Reference block format (in target artefacts)

Every block inserted by the skill into a target artefact carries a standardised reference:

```markdown
<!-- knowledge-onboarding · BOO-137 · source:<path> · as-of:<YYYY-MM-DD> -->
> **Source:** [<file>](<relative-path>) · Signal: `<match-signal>` · Tier <N> · As-of: <date>
>
> _<Short anchor excerpt max. 5 lines OR table of contents>_
```

For `extract` action: extracted content follows below (operator diff-approved). For `reference`: reference block alone — no full-text copy.

## Change discipline

When the rubric is extended (new category, new signals):

1. Update this file (+ DE variant).
2. Update `SKILL.md` + `.en.md` workflow table.
3. Update `README.md` + `.en.md` short-form table.
4. If existing manifest affected (e.g. new Tier-0 entries): operator hint on next skill run that manifest should be rebuilt.
5. Create spec file (BOO-XX) per Code-Crash convention.
6. Adjust Excalidraw sketch (category box) if applicable.
