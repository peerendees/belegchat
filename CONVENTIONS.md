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

| Gate | Status | Bemerkung |
|------|--------|-----------|
| spec-gate | AN | Kein Commit mit BER-XXX ohne specs/BER-XXX.md |
| doc-version-sync | AN | VERSION in lib/config.js muss mit DOC_FILES synchron sein |
| pre-edit-bodyguard | AN | Layer 0: faengt Secrets/Unsafe vor dem Schreiben ab |
| pre-commit (ESLint + Semgrep) | AN | Layer 2: lokales Quality-Gate |
| dependency-check | AN | Slopsquatting-Schutz im Pre-Commit |
| coverage-check | AN | >=80% Diff-Coverage auf neuem Code |
| compliance_doc_gate | false | Doku-Drift = WARN (nicht BLOCK) |
| learning_loop | L1 | Einfacher Loop: learnings.md, Bullet-Points |

## 4 Ubiquitous Language

Siehe `CONTEXT.md` fuer das kanonische Vokabular.

## 5 Commit-Konvention

Format: `BER-[Issue-Nr]: [Was wurde gemacht]`
Kein direkter Push auf `main` — Branch -> PR -> Merge.

## 6 Add-ons

- Privacy / DSGVO (aktiv)
- Compliance (aktiv)
