---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Implement — 8-Schritte-Protokoll vom Issue zum Shipped Code

> Macht aus einem Linear-Issue produktionsreifen Code ueber ein nicht-ueberspringbares 8-Schritte-Protokoll: Identifizieren → Abhaengigkeiten → Kontext → Governance-Validation → Spec-Gate → Plan → Implementieren → Post-Validation. Kein Schritt optional, keine Abkuerzungen. Auch vom Automation-Daemon ohne Human-in-the-Loop nutzbar.

**Version:** 2.27.0 · **Befehl:** `/implement`

> **Neu in 2.27.0 (BOO-510):** Remote-CI-Loop (Schritt 6h) auf Anwesenheits-Prüfung gehärtet — 0-Checks-Falle nach HANDBUCH Anhang BR §BR.5/BR.6 geschlossen: Vor `gh run watch` prüft eine Pflicht-Vorstufe die EXISTENZ erwarteter Checks (`gh api .../check-runs --jq .total_count`); 0 Checks trotz vorhandener Workflows ist jetzt ein eigener Zustand `no_checks_reported` (nie pass, nie Skip) mit Ursachen-Hinweis (GITHUB_TOKEN-Anti-Rekursion / `action_required` / Trigger-Verdrahtung) und Remediation nach Anhang T «0 Checks ≠ grün».

> **Neu in 2.25.0 (BOO-486):** Token-Pre-Flight (Schritt 0b) und Subagent-Generierung (Schritt 4b) lesen `.claude/model-profile.yml` frisch (Budget = `served_context × effective_fraction × budget_pct`, SSoT BOO-484): harter Story-Deckel am Blatt-Budget (`× capability_factor`) und Fan-out-Verweigerung bei 80 % Orchestrator-Auslastung; ohne Profil Cloud-Default 200k + Warnung.

> **Native Subagents (BOO-204, Schalter B):** Bei `prefer_native_subagents: true` generiert `/implement` aus der `## Subagents`-Sektion der Spec echte `.claude/agents/<story>-<agent>.md` — jeder Subagent mit eigenem Kontextfenster (Blatt-Budget aus dem Modell-Profil, BOO-486), eigenen Tools/Permissions, optional eigenem Modell (Schritt 0d + 4b). Ohne Flag/Sektion: bisheriges Text-Block-Pattern im gleichen Fenster.

> 🔗 Sprint-Automation: **`/sprint-run`** faehrt einen ganzen Sprint und orchestriert die Kette `backlog → implement → sprint-review`. Siehe [`sprint-run/`](../sprint-run/README.md) · HANDBUCH Anhang AD.

> **Claude-Code-Modus:** `/implement` setzt um → beaufsichtigt `acceptEdits`, unbeaufsichtigt (Daemon/Auto-Execute) `dontAsk` + Allowlist; **nicht** Plan Mode (read-only, blockiert die Umsetzung). Der „Plan" in Schritt 4 ist der Implementierungsplan des Skills, nicht der Claude-Code-Planungsmodus. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Die meisten "AI Pair Programmer" springen vom "hier ist das Ticket" zum "hier ist der Code". Dazwischen ueberspringen sie: Architektur lesen, Abhaengigkeiten validieren, nach existierendem Spec schauen, Governance-Artefakte pruefen und ACs gegen den echten Output verifizieren.

Der Skill laeuft das volle 8-Schritte-Protokoll. Jeder Schritt hat einen expliziten Zweck und ein Gate zum naechsten. Ueberspringen geht nicht — die Governance-Hooks (spec-gate, doc-version-sync) erzwingen es maschinell bei `git commit` und `git push`.

---

## Die Schritte

Das Protokoll ist seit v1.5.0 deutlich gewachsen — vor den 8 Kern-Schritten laufen drei Pre-Flight-Checks (Schritt 0/0b/0c), und mehrere Hard Gates wurden ergaenzt.

| # | Schritt | Gate |
|---|---------|------|
| 0 | **Environment laden** | `.claude/environment.json`, `CONVENTIONS.md`, `SECURITY.md`, `DEVELOPER_ONBOARDING.md` lesen; `tools_available.*` pruefen; `llm_proxy_url` als Audit-Spur erfassen (BOO-71, read-only) |
| 0b | **Token-Window-Pre-Flight** (BOO-40, weich) | Projektion `aktuell + story_estimate` gegen `token_warn`/`token_hard`-Schwellen; Soft-Warnung + Sprint-Wechsel-Hinweis |
| 0c | **Execution-Isolation-Pre-Flight** (BOO-52, hart bei Parallelitaet) | `execution_mode` (linear/sub-agents/agentic) muss zu `execution_isolation` + `worktree_strategy` + `write_scopes` passen; Codex-Adapter nur beratend |
| 1 | **Issue identifizieren** | Backlog: "In Progress"-Issue ist eindeutig; **Status-Guard (BOO-319):** expliziter Key mit Status Done/Canceled → harter STOPP (Folge-Story statt Re-Implementierung) |
| 1b | **Schrader-Bestandteile-Gate** ⛔ HARD GATE | Issue muss vollstaendiger Schrader-Prompt sein: Insight, Constraints, Erfolgskriterien, Gewuenschtes Ergebnis (je ≥20 Zeichen, kein Placeholder) |
| 2 | **Abhaengigkeits-Check** | Blocker geloest? Siblings aligned? |
| 3 | **Kontext aufbauen** | `CLAUDE.md`, `DEVELOPER_ONBOARDING.md`, `ARCHITECTURE_DESIGN.md` (ADRs/Quality Attributes), betroffene Dateien, `docs/domain/*` |
| 3b | **Governance-Validation** | 8-Dimensionen-Tabelle? `## Security Impact` (immer) + `## Security Validation` (bei Code/Security/Tooling/Dependency/CI/Governance) vorhanden? Security-Referenzstack nach Change-Type laden; ADD valide? |
| 3c | **Spec-File-Gate** ⛔ HARD GATE | `specs/ISSUE-XX.md` existiert? Erzwungen durch `.claude/hooks/spec-gate.sh`; Spec zu abgeschlossener Story = Audit-Artefakt, kein Auftrag (BOO-319) |
| 4 | **Plan + Operator-Freigabe** | Human-in-the-Loop (Auto-Execute ueberspringt) |
| 5 | **Implementation** | Secure-Coding-by-default (Layer-0-Edit-Bodyguard BOO-86); `// AI-generated: {STORY_ID}`-Marker (BOO-17); Doku aktualisiert; Git commit + push; **Session-Referenz + Audit-Trace ins Spec-File** (BOO-19) |
| 5.5 | **Sensitive-Paths-Gate** ⛔ STOP bei Treffer (BOO-18) | Nur wenn `.claude/sensitive-paths.json` existiert; Glob-Match auf geaenderte Dateien → Mandatory Human Review (`review-ok: ...`) |
| 5.5b | **Personal-Data-Paths-Gate** ⛔ STOP bei Treffer (BOO-69) | Nur bei `personal_data: true` + `.claude/personal-data-paths.json`; Glob-Match → DPO/Privacy Review (`privacy-ok: ...`, DSGVO Art. 25) |
| 5.7 | **Change-Type-Verzweigung** (BOO-68) | `change_type` aus Spec-Frontmatter → Code-Strict oder Non-Code-Modus (siehe unten) |
| 6 | **Post-Implement Validation** | Siehe Unter-Schritte |
| 7 | **Backlog-Update** | Andere betroffene Issues aktualisieren |
| 8 | **Ergebnis-Tabelle** (Pflicht) | Summary + `specs/ISSUE-XX.md` Zusammenfassung |

> Schritt 0c-Hinweis: Sub-Agents duerfen nur mit disjunktem Write-Scope starten; Mini-Briefings muessen Rolle, Aufgabe, erlaubte/verbotene Pfade, Integrationsregel und die Index-Regel (Query-first falls Projekt-Index existiert, BOO-445) enthalten.

> **Cross-Session-Hinweis (Schritt 0c, BOO-154):** Dieser Pre-Flight isoliert parallele **Agenten EINER Story** (Ebene 3). Arbeiten **mehrere Menschen/Sessions** gleichzeitig am selben Repo, ist das ein **anderer** Mechanismus: **eigener Klon pro Person** bzw. **`git worktree` pro Session** (Ebene 1/2) — sonst wandert der lokale `main`/Branch unter einem weg und Nummern/Waves kollidieren. Die drei Ebenen des Kollisionsschutzes: `docs/kollisionsschutz-drei-ebenen.md`.

### Post-Implement Validation (Schritt 6)

Schritt 6 ist eine Schleife, kein Einmal-Check: `Validate → Interpret → Decide → Fix → Re-Validate → PASS/FAIL → Learn`. Pro Run wird einmal ein gitignored Persistenz-Verzeichnis `journal/reports/local/{YYYY-MM-DD_HHMM}_{STORY-ID}/` fuer raw Tool-Outputs angelegt (BOO-36). `/implement` schreibt nur raw Outputs; `/sprint-review` aggregiert spaeter (harte Trennung — kein direkter `learnings.db`-Schreibzugriff).

| Sub | Check | Tool |
|-----|-------|------|
| 6a | **Code-Quality-Gate** (deklarative Iteration, max 5) | ESLint (`eslint.config.mjs`) / Ruff · SonarLint (IDE) · Error Lens (inline); SARIF/JSON-Persistenz pro Iteration |
| 6a-bis | **Security-Gate — Semgrep** (BOO-4, max 5 Iter., <10s) | `.semgrep.yml`-Pack-Reader → Semgrep CLI → `semgrep-final.sarif` |
| 6a-tris | **Dependency-Gate — Slopsquatting-Schutz** (BOO-12) | Nur bei Manifest-Diff: Existenz-Check (404 → Block), Age-Check (<30 Tage → Warn), CVE-Check (High/Critical → Block) |
| 6a-quart | **Coverage-Gate — Diff-Coverage ≥80%** (BOO-15, max 5 Iter.) | c8 / pytest-cov → `coverage-check.sh`; <60% Block, 60-80% Warn; JUnit-XML-Persistenz |
| 6b | **Acceptance Criteria + Linear-Kommentar** | Jedes AC pruefen, Evidenz loggen |
| 6c | **Architektur-Quick-Check** | Relevante Dimensionen — Config-SSoT? Hardcoded Werte? Error-Handling? |
| 6d | **Smoke Test** | Echte Ausfuehrung — nicht nur Syntax |
| 6e | **Security- und Privacy-Findings** | Security immer; Privacy-Block Pflicht bei `personal_data: true` (BOO-69); Onboarding-/Hub-Impact pruefen |
| 6f | **Ergebnis: PASS / FAIL** | PASS → Backlog Done + Changelog + Obsidian-Sync |
| 6f-bis | **meta.json schreiben** (BOO-36 + BOO-84) | Run-Metadaten inkl. `change_type`, `iterations`, `skipped_gates`, `environment`, 3-Ebenen-`token_tracking`, `cache_hit_rate`, `override_audit` |
| 6g | **Intent-Verifikation** (non-blocking) | Nur wenn `intents/INTENT-XX.md` existiert — Metriken messen, ins Spec eintragen, nie blockieren |

> Wie diese Gates lokal (Pre-Commit) und in CI dieselbe Config-Reader-Logik teilen, zeigt HANDBUCH-Kapitel 8d-quart.

### Non-Code-Stories (Schritt 5.7 — BOO-68)

Nicht jede Story produziert Code. n8n-/Make-/Zapier-Workflows, Terraform/Pulumi/IaC, reine
Cloud- oder App-Configs und CMS-Content sind echte Implementierungen mit echten Risiken,
aber ohne klassischen Code-Diff.

Vor Schritt 6 liest der Skill `change_type` aus dem Spec-Frontmatter. Liegt der Wert in
`{workflow, config, infrastructure, content}`, schaltet er auf **Non-Code-Modus**:

- Code-Gates 6a / 6a-bis / 6a-tris / 6a-quart werden **explizit** uebersprungen
  (nicht stillschweigend) — der Grund landet in `meta.json.skipped_gates`
- Soft-Gates 6c / 6d / 6e werden zu **Hard Gates** mit Pflicht-Evidenz
- Sensitive-Paths-Gate 5.5 greift weiterhin — die Patterns sollten `n8n/**`, `infra/**`,
  `**/*.tf`, `workflows/**/*.json` umfassen
- Optionale Domain-Gates (n8n-Lint, tfsec, tflint, yamllint) laufen, wenn `tools_available.<tool>`
  aktiv ist

Vollstaendige Erklaerung inkl. Ablauf-Sketch: [references/non-code-flow.md](references/non-code-flow.md).

---

## Das Spec-File-Gate (Hard Gate)

Das ist die Governance-Firewall. Jede Code-Aenderung braucht ein Spec-File unter `specs/ISSUE-XX.md` **bevor** die Plan-Phase beginnt.

- Spec existiert → lesen, mit aktuellem Issue abgleichen, weiter
- Fehlt → **STOPP**. Spec aus `specs/TEMPLATE.md` erstellen, committen, auf Operator-Bestaetigung warten
- Keine Ausnahmen — kein Hotfix, keine Config-Aenderung. Nur reine Doku-Commits sind exempt.

Maschinell erzwungen durch `.claude/hooks/spec-gate.sh`, der jeden `git commit ISSUE-XXX` blockiert wenn `specs/ISSUE-XXX.md` fehlt.

---

## Sensitive- und Personal-Data-Gates

Zwei zusaetzliche STOP-Gates greifen vor den Quality Gates, sobald geaenderte Dateien sensible bzw. personenbezogene Bereiche beruehren:

- **Sensitive-Paths-Gate (Schritt 5.5, BOO-18)** — laeuft nur wenn `.claude/sensitive-paths.json` existiert. Geaenderte Dateien (`git diff --name-only HEAD`) werden gegen die `patterns` (Glob, `**` rekursiv) geprueft. Treffer → PFLICHT-STOPP mit vollstaendigem Diff und Mandatory Human Review. Operator bestaetigt mit `review-ok: {name} - {kommentar}`, der Block landet im Spec-File unter `## Human Review`.
- **Personal-Data-Paths-Gate (Schritt 5.5b, BOO-69)** — laeuft nur bei Story-Frontmatter `personal_data: true` UND vorhandener `.claude/personal-data-paths.json` (oder `.codex/...`). Treffer → PFLICHT-STOPP + DPO/Privacy Review (DSGVO Art. 25). Operator bestaetigt mit `privacy-ok: ...` oder der `/dpo`-Skill legt einen REVIEW-Report unter `journal/reports/local/<date>_<story>/privacy.md` ab; der Block landet im Spec-File unter `## Privacy Review`.

Beide Gates koennen gleichzeitig zuschlagen — dann erst `review-ok` (technisch), dann `privacy-ok` (rechtlich). Keine Bestaetigung ersetzt die andere, kein Auto-Bypass.

---

## Audit-Trail (BOO-19)

In Schritt 5 wird nach dem Commit eine **Session-Referenz** ins Spec-File unter `## Session-Referenz` geschrieben: Session-Timestamp, best-effort Session-ID, Pfad zum Session-Log (`~/.claude/projects/.../sessions/{ID}.jsonl`), Commit-SHA und ein Audit-Trace-Befehl (`bash .claude/scripts/audit-trace.sh {SPEC_ID}`). Bleibt die Session-Datei unauffindbar, werden nur Commit-SHA + Timestamp eingetragen (kein STOPP).

---

## Trigger-Phrasen

- `/implement`
- "los"
- "implementiere die Story"
- "bau das"

Laeuft automatisch unter dem Linear-Automation-Daemon wenn ein Webhook feuert.

---

## Schnittstellen zu anderen Skills

| Upstream | Was geliefert wird | Downstream | Was wir liefern |
|----------|--------------------|------------|------------------|
| `backlog` | Top-Story | `security-architect` (REVIEW) | Pflicht-Review bei Sensitive-Path-Treffer (Schritt 5.5), gate-barer Report; sonst auf Abruf. Every-Change-SAST = Semgrep |
| `ideation` | Story + ADD + Spec-Placeholder | `architecture-review` | Impact auf betroffene Dimensionen |
| `architecture-review` (Pre-Check) | Go/No-Go-Signal | `grafana` | Neue Metriken → Dashboards |
| `research` (on-demand) | Fakten-Checks waehrend Umsetzung | `sprint-review` | Kumulierte Change-History |
| `cloud-system-engineer` | Deployment-Guidance | | |

---

## Artefakte / Outputs

- **Code-Aenderungen** — committed mit korrektem ISSUE-XX Message-Format
- **Aktualisierte Doku** — `CLAUDE.md`, `SYSTEM_ARCHITECTURE.md`, etc., Version synchron
- **Linear-Kommentare** — AC-Verifikation, Validation-Ergebnis
- **`specs/ISSUE-XX.md`** — mit Zusammenfassung (3 Absaetze, Laien-Sprache)
- **Changelog-Eintrag** — CHANGELOG.md + Obsidian-Sync
- **Ergebnis-Tabelle** — Pflicht-Summary

---

## Installation

```bash
cp -r implement ~/.claude/skills/implement
```

Auch pruefen dass Governance-Hooks installiert sind (macht `/bootstrap`):
```bash
ls .claude/hooks/spec-gate.sh .claude/hooks/doc-version-sync.sh
```

---

## Dateistruktur

```
implement/
├── SKILL.md                                    ← Skill-Definition
└── references/
    ├── architecture-checklist.md               ← Relevant-Dimensionen-Checkliste (+ .en.md)
    ├── change-checklist.md                     ← Pro-Aenderung-Validation (+ .en.md)
    ├── non-code-flow.md                        ← Schritt 5.7: Non-Code-Verzweigung (BOO-68) (+ .en.md)
    └── validation-checklist.md                 ← Post-Implement-Subschritte (+ .en.md)
```
