---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Routing-Rubrik — SSoT fuer knowledge-onboarding

> Diese Datei ist die **Single Source of Truth** fuer das Routing in `knowledge-onboarding/SKILL.md`. Aenderungen hier wirken sich direkt auf das Verhalten des Skills aus. Versionierung via Repo-Git-History.

## Tier-Logik (Kurz)

- **Tier 0** — Ausschluss. Framework-eigene Artefakte und Code. Werden **nie** geroutet.
- **Tier 1** — Dateiname / Pfad-Match (deterministisch). Genau ein Kategorie-Match in den Filename-Signalen → Klassifikation steht.
- **Tier 2** — Inhalts-Signale (regelgebunden). Kein Tier-1-Match, aber Inhalt enthaelt Stichworte aus genau einer Kategorie.
- **Tier 3** — Mehrdeutig. ≥ 2 Kategorien matchen ODER kein Match. Operator wird gefragt, Antwort wird `pinned`.

**Priorisierung:** Tier 0 schlaegt alles. Sonst Tier 1 vor Tier 2. Mehrere Treffer auf gleichem Tier → Tier 3.

## Tier 0 — Ausschluss-Liste

Diese Files / Pfade werden **niemals geroutet** und tauchen im Manifest nur als `tier: 0, action: skip` auf.

### Framework-Generator-Artefakte (Repo-Root)

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
README.md             # Hinweis: README im Ziel-Repo wird NICHT als Quelle geroutet (waere Eigen-Routing). Tier-1-Eintrag im Quell-Repo bleibt erhalten.
LICENSE.md
LICENSE
NOTICE
```

### Skill-Bundle-Verzeichnisse (Repo-Root)

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

### Code-Verzeichnisse (Heuristik)

- Dateiendungen: `*.{ts,tsx,js,jsx,mjs,cjs,py,go,rb,java,rs,cs,kt,swift,php,sh,bash,zsh,fish,lua,sql,proto,graphql}`
- Konfig-Files: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `pyproject.toml`, `Gemfile`, `Gemfile.lock`, `Cargo.toml`, `Cargo.lock`, `go.mod`, `go.sum`, `pom.xml`, `build.gradle`, `*.config.{js,ts,mjs}`, `tsconfig.json`, `eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `postcss.config.*`, `tailwind.config.*`, `vite.config.*`, `next.config.*`, `vercel.json`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/*`
- Pfade in `.gitignore` (Lookup) — wenn ein File matcht → Tier 0.

### Generierte / temporaere Pfade

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

## Tier 1 — Filename/Pfad-Signale + Tier 2 — Inhalts-Signale

| # | Kategorie | Tier-1-Signale (Filename/Pfad — case-insensitive) | Tier-2-Signale (Inhalts-Stichworte) | Ziel-Artefakt | Default-Aktion |
|---|---|---|---|---|---|
| 1 | `intent-gap-scope` | `gap`, `scope`, `intent`, `requirements`, `anforderung` | "Ist/Soll", "Luecke", "Anforderung", "Stakeholder-Bedarf", "Soll-Zustand" | `intents/INTENT-XX.md` + `ARCHITECTURE_DESIGN.md §1` | `extrahieren` |
| 2 | `legal-compliance` | `legal`, `recht`, `dsgvo`, `gdpr`, `compliance`, `governance`, `audit` | DSGVO, GDPR, "§", "Gesetz", "Aufsicht", "Haftung", "Frist", "Auflagen", "Regulator", "FINMA", "BaFin", "Datenschutz" | `SECURITY.md` / `GOVERNANCE.md` + DPO (`PRIVACY.md` / `AI_SYSTEM.md` falls personenbezogen / KI) + ADR | `extrahieren` |
| 3 | `design-ui-visual` | `design`, `mockup`, `wireframe`, `figma`, `ui`, `style-guide`, `style_guide`, `DESIGN.md` | Farbcode-Hex-Pattern (`#[0-9A-Fa-f]{3,6}`), "Typografie", "Komponenten-Library", "Wireframe", "Mockup", "Atomic Design" | `ARCHITECTURE_DESIGN.md §5` + `DESIGN.md` + ADR (verzahnt mit BOO-126) | `referenzieren` |
| 4 | `decision-adr` | `decision`, `adr`, `entscheidung`, `decisions/` (Pfad) | "entschieden fuer", "Tradeoff", "Alternative verworfen", "weil", "deshalb", "decided to", "rejected alternative" | ADR `docs/domain/adrs/ADR-XX.md` | `extrahieren` |
| 5 | `architektur-plan` | `architektur`, `architecture`, `plan`, `roadmap`, `README`, `PLAN`, `OVERVIEW` | "Komponenten", "Tech-Stack", "Roadmap", "Architektur-Diagramm", "C4-Modell", "System-Diagramm" | `ARCHITECTURE_DESIGN.md` + Backlog (Plan → Stories) | `referenzieren` |
| 6 | `vokabular-kontext` | `context`, `glossar`, `glossary`, `terms`, `terminologie` | "bedeutet", "Definition", Begriffs-Tabellen (Tabelle mit ≥ 2 Begriff:Definition-Paaren), "Ubiquitous Language" | `CONTEXT.md` + Component-Docs | `extrahieren` |
| 7 | `recherche` | `research`, `recherche`, `analyse`, `analysis`, `study` | Externe Quellen / URLs in Mengen (≥ 3 Links), "siehe Quelle", "literature review" | `docs/project/research/<topic>.md` bzw. Vault | `referenzieren` |
| 8 | `demo-storyboard-pitch` | `demo`, `choreographie`, `choreography`, `pitch`, `storyboard`, `script` | "Demo-Ablauf", "Storyboard", "Pitch-Folie", "Spielzug", "User Journey Demo" | `docs/project/demo/<name>.md` bzw. `/pitch`-Material | `referenzieren` |
| 9 | `onboarding-handover` | `onboarding`, `handover`, `welcome`, `getting-started`, `quickstart` | "neuer Entwickler", "Uebergabe", "Einarbeitung", "Wo finde ich was" | `DEVELOPER_ONBOARDING.md` | `extrahieren` |
| 10 | `prompt-library` | `prompts/` (Pfad), `*.prompt.md`, `prompts.md` | "Du bist ein …", "Aufgabe:", "Beispiel:", "Format:", LLM-Prompt-Strukturen (System/User/Assistant) | `docs/project/prompts/<name>.md` | `referenzieren` |
| 11 | `infra-layer` | `infra`, `deployment`, `db-schema`, `schema`, `iam`, `rbac`, `runbook`, `sla`, `backup`, `recovery`, `terraform`, `k8s`, `ci-cd` | "RTO/RPO", "Replikation", "Rate Limit", "RLS", "Row-Level Security", "Shard", "Deployment-Strategie", "Failover", "Backup-Strategie", "SLA" | `ARCHITECTURE_DESIGN.md §5b` (Infra-Layer-Tabelle, BOO-221) + optional Sub-MD (`DB_SCHEMA.md` / `IAM_POLICY.md` / `RECOVERY_PLAN.md`); Katalog `cloud-system-engineer/references/infrastructure-dimensions.md` | `referenzieren` |

## Tier 3 — Mehrdeutigkeit-Regel

Eine Datei landet in Tier 3, wenn:

1. **Mehrere Kategorien matchen** auf dem gleichen Tier (z.B. `LEGAL_SKILLS_RECHERCHE.md` → Tier-1-Match `legal` UND `research`).
2. **Kein Match** in Tier 1 UND Tier 2 (kein Filename-Signal, kein Inhalts-Signal).

Operator-Frage (siehe SKILL.md Schritt 4.4). Antwort wird `pinned: true` im Manifest → Folge-Scans fragen nicht mehr.

## Beispiel-Klassifikationen (aus BKO-Validierung 2026-06-03)

| Quell-Datei | Tier | Match-Signal | Kategorie | Ziel |
|---|---|---|---|---|
| `GAP_ANALYSE.md` | 1 | `filename:gap` | intent-gap-scope | `intents/INTENT-XX.md` + `ARCHITECTURE_DESIGN.md §1` |
| `README.md` (Quell-Repo) | 1 | `filename:README` | architektur-plan | `ARCHITECTURE_DESIGN.md` + Backlog |
| `docs/Plan.md` | 1 | `filename:Plan` | architektur-plan | `ARCHITECTURE_DESIGN.md` + Backlog |
| `docs/CONTEXT.md` | 1 | `filename:context` | vokabular-kontext | `CONTEXT.md` |
| `docs/STYLE_GUIDE.md` | 1 | `filename:style_guide` | design-ui-visual | `ARCHITECTURE_DESIGN.md §5` + `DESIGN.md` |
| `LEGAL_SKILLS_RECHERCHE.md` | 3 | `filename:legal+research` | mehrdeutig | (Operator-Frage) |
| `DEMO_CHOREOGRAPHIE.md` | 1 | `filename:choreographie` | demo-storyboard-pitch | `docs/project/demo/widerspruch-demo.md` |
| `docs/HANDOVER.md` | 1 | `filename:handover` | onboarding-handover | `DEVELOPER_ONBOARDING.md` |
| `prompts/widerspruch.prompt.md` | 1 | `path:prompts/` | prompt-library | `docs/project/prompts/widerspruch.md` |
| `AGENTS.md` | 0 | `tier-0-list` | framework-artefact | skip |

## Manifest-Schema (vollstaendig)

```yaml
schema_version: 1
generated_at: 2026-06-03T15:00:00Z         # ISO-8601 UTC
generator: knowledge-onboarding/SKILL.md v1.0.0
source:
  adapter: github-repo                      # github-repo | local-folder | chat
  identifier: beispiel-org/beispiel-projekt   # URL / Pfad / "chat"
  branch: main                              # optional, nur bei adapter:github-repo
  scanned_at: 2026-06-03T15:00:00Z
items:
  - source_path: GAP_ANALYSE.md             # relativer Pfad in der Quelle
    source_hash: sha256:abc123…             # ueber Inhalt; bei Aenderung neu berechnet
    size_bytes: 12345
    tier: 1                                 # 0 | 1 | 2 | 3
    category: intent-gap-scope              # eine der Kategorie-Slugs aus Tabelle oben
    match_signal: "filename:gap"            # textuelle Beschreibung des Matches
    target_artefacts:
      - intents/INTENT-01.md
      - ARCHITECTURE_DESIGN.md#§1
    action: extrahieren                     # referenzieren | extrahieren | skip | fragen
    pinned: false                           # true → Operator-Korrektur, niemals ueberschreiben
    operator_note: null                     # null oder String mit Begruendung
    status: active                          # active | removed (wenn Quelle weg ist)
    applied_at: 2026-06-03T15:02:00Z        # Zeitstempel des Apply (nicht des Scans)
  - source_path: LEGAL_SKILLS_RECHERCHE.md
    source_hash: sha256:def456…
    size_bytes: 8765
    tier: 3
    category: ambivalent
    match_signal: "filename:legal+research"
    target_artefacts:
      - docs/project/research/legal-skills.md
    action: referenzieren
    pinned: true
    operator_note: "Inhalt ist Recherche, nicht Compliance — gepinnt 2026-06-03"
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
warnings: []                                 # leer wenn alles innerhalb Schwellen
```

**Schwellen fuer `warnings[]`:**
- `skip_rate_percent > 50` → `"Skip-Quote hoch, Rubrik passt evtl. nicht zur Quelle"`
- `ambiguity_rate_percent > 30` → `"Tier-3-Quote hoch, Rubrik koennte zu unscharf sein"`

## Verweis-Block-Format (in Ziel-Artefakten)

Jeder vom Skill in ein Ziel-Artefakt eingefuegte Block traegt einen standardisierten Verweis:

```markdown
<!-- knowledge-onboarding · BOO-137 · source:<path> · stand:<YYYY-MM-DD> -->
> **Quelle:** [<file>](<relative-path>) · Signal: `<match-signal>` · Tier <N> · Stand: <date>
>
> _<Kurzer Anker-Auszug max. 5 Zeilen ODER Inhaltsverzeichnis>_
```

Bei `extrahieren` darunter zusaetzlich der extrahierte Inhalt (Operator-Diff-approved). Bei `referenzieren` reicht der Verweis-Block — keine Volltext-Kopie.

## Aenderungs-Disziplin

Wenn die Rubrik erweitert wird (neue Kategorie, neue Signale):

1. Diese Datei aktualisieren (+ EN-Variante).
2. `SKILL.md` + `.en.md` Workflow-Tabelle nachziehen.
3. `README.md` + `.en.md` Kurzform-Tabelle nachziehen.
4. Wenn bestehendes Manifest betroffen (z.B. neue Tier-0-Eintraege): Operator-Hinweis im naechsten Skill-Lauf, dass Manifest gerebuilt werden sollte.
5. Spec-File anlegen (BOO-XX) gemaess Code-Crash-Konvention.
6. Excalidraw-Sketch ggf. anpassen (Kategorien-Box).
