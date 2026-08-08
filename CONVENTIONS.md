# CONVENTIONS.md — BelegChat

> Adapter-Vertrag: Runtime, Backlog-Adapter, Governance-Modus, Execution-Isolation, aktive Gates.

---

## 1 Projekt-Identitaet

| Feld | Wert |
|------|------|
| `project_name` | BelegChat |
| `issue_prefix` | BER- |
| `version` | 0.1.0 |
| `documentation_language` | de |
| `code_language` | en |
| `classification` | internal |

## 1a Vertraulichkeitsstufe

`classification: internal` — nur fuer Projekt-Team und Auftraggeber bestimmt.

## 2 Runtime + Adapter

| Feld | Wert |
|------|------|
| `runtime_target` | claude-code |
| `backlog_adapter` | linear |
| `governance_mode` | standard |
| `execution_isolation` | write-scope |
| `ci_mode` | hybrid |
| `deployment_scenario` | solo-mac |
| `llm_provider` | anthropic |

## 2a Dokument-Etiketten (Provenance)

Jedes Dokument traegt ein `provenance:`-Etikett im Frontmatter:
- `classification`: Projekt-Default `internal`, pro Dokument ueberschreibbar
- `status`: draft | review | final
- `source`: human | claude | mixed

## 3 Aktive Gates

> **Stand 08.08.2026.** Diese Tabelle unterscheidet **verdrahtet** (Skript
> existiert und laeuft) von **deklariert** (steht hier, greift aber nicht).
> Vorher standen `dependency-check` und `coverage-check` als AN, ohne dass es
> sie gab, und der CI-Semgrep lief mit `continue-on-error` — ein Gruen, das nie
> rot werden konnte. Befunde und Korrekturen:
> `docs/audits/2026-08-08-gate-verdrahtung.md`.

| Gate | Status | Umsetzung | Bemerkung |
|------|--------|-----------|-----------|
| spec-gate | **verdrahtet** | `.claude/hooks/spec-gate.sh` | Kein Commit mit BER-XXX ohne specs/BER-XXX.md |
| doc-version-sync | **verdrahtet** | `.claude/hooks/doc-version-sync.sh` | VERSION muss mit DOC_FILES synchron sein |
| pre-edit-bodyguard | **verdrahtet** | `.claude/hooks/pre-edit-bodyguard.sh` | Layer 0: faengt Secrets/Unsafe vor dem Schreiben ab |
| pre-commit ESLint + Typecheck | **verdrahtet** | `.githooks/pre-commit` | Layer 2, blockierend |
| pre-commit Semgrep | **verdrahtet** | `.githooks/pre-commit` | Packs aus `.semgrep.yml`; ohne lokale Semgrep-Installation WARN statt Block |
| CI Semgrep | **verdrahtet** | `.github/workflows/semgrep.yml` | Layer 3, **blockierend seit 08.08.2026**; Packs aus `.semgrep.yml` |
| CI ESLint + Typecheck | **verdrahtet** | `.github/workflows/eslint.yml` | Layer 3, blockierend |
| schrader-check | **verdrahtet** | `.claude/scripts/schrader_check.py` | Story-Prompt-Vollstaendigkeit, `--self-test` vorhanden |
| doc-drift-check | **verdrahtet** | `scripts/doc-drift-check.sh` | warn-only, `--strict` optional |
| dependency-check | **deklariert, nicht verdrahtet** | — | Slopsquatting-Schutz. Kein Skript vorhanden. Solange kein Manifest-Diff ansteht, geringes Risiko |
| coverage-check | **deklariert, nicht verdrahtet** | — | Es gibt **keine Tests und keinen Test-Runner** im Projekt. Ein Diff-Coverage-Gate waere ohne Testsuite sinnlos. Verifiziert wird stattdessen ueber Rollback-Trigger-Tests auf der DB und manuelle E2E-Laeufe. Folge-Story fuer Test-Setup offen |
| compliance_doc_gate | false | — | Doku-Drift = WARN (nicht BLOCK) |
| learning_loop | L1 | `journal/learnings.md` | Einfacher Loop: Bullet-Points |

## 4 Ubiquitous Language

Siehe `CONTEXT.md` fuer das kanonische Vokabular.

## 5 Commit-Konvention

Format: `BER-[Issue-Nr]: [Was wurde gemacht]`
Kein direkter Push auf `main` — Branch -> PR -> Merge.

## 6 Add-ons

- Privacy / DSGVO (aktiv)
- Compliance (aktiv)
