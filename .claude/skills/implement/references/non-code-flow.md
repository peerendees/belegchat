---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Non-Code-Flow — `/implement` Schritt 5.7 (BOO-68)

> Referenz-Dokument fuer den Non-Code-Pfad im Implement-Skill. Erklaert, was passiert,
> wenn eine Story `change_type` im Spec-Frontmatter auf `workflow | config | infrastructure | content`
> setzt — also wenn die Story keinen klassischen Code-Diff produziert.

## Warum gibt es das ueberhaupt?

Das INTENTRON Framework ist code-first. Die Quality Gates 6a (ESLint/Ruff), 6a-bis (Semgrep),
6a-tris (Dependency-Check) und 6a-quart (Coverage) sind alle auf Code-Diffs angewiesen.

**Das Problem:** Manche Stories produzieren keinen Code-Diff, sind aber trotzdem echte
Implementierungen mit echten Risiken:

| Story-Typ | `change_type` | Beispiele | Risiken |
|---|---|---|---|
| n8n / Make / Zapier | `workflow` | Webhook-Empfaenger, ETL-Pipelines, Notifications | Webhook-Auth, Credentials, Error-Handling, Rate-Limits |
| Terraform / Pulumi / CFN | `infrastructure` | IAM-Roles, S3-Buckets, VPC, DNS, K8s | Public Surface, IAM-Drift, State-Files, Secrets in `.tfvars` |
| Reine Cloud-/App-Config | `config` | Feature-Flags, CORS-Header, Spam-Filter-Regeln | Hardening, Secrets, Rollback-Pfad |
| Content-Migration / CMS | `content` | Doku-Bulk-Import, CMS-Seiten, Newsletter-Templates | Broken Links, versehentliches Veroeffentlichen, PII |

Ohne Verzweigung wuerden alle vier Story-Typen `/implement` durchlaufen, jeder Code-Gate wuerde
"kein passender Diff" sagen und `final_status: passed` melden — **obwohl niemand die echten
Risiken geprueft hat**. Das verletzt das Schrader-Prinzip: "kein Output ohne Verify".

## Wie der Skill verzweigt

```
                       ┌───────────────────────────────────────┐
                       │  Schritt 5.5 (Sensitive Paths)        │
                       │  - bei Treffer: review-ok Pflicht     │
                       └─────────────────┬─────────────────────┘
                                         │
                                         ▼
                       ┌───────────────────────────────────────┐
                       │  Schritt 5.7 — Change-Type-Verzweigung│
                       │  Liest change_type aus Spec-Frontmatter│
                       └─────────────────┬─────────────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  │                                             │
                  ▼                                             ▼
         ┌────────────────────┐                      ┌─────────────────────┐
         │  Code-Strict       │                      │  Non-Code Modus     │
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

## Was genau passiert in Schritt 5.7

1. **Read** — `change_type` aus dem Spec-Frontmatter lesen. Default wenn fehlt: `none` (= code-strict).
2. **Branch** — In Non-Code-Menge `{workflow, config, infrastructure, content}`? Wenn nein: nichts aendert sich, weiter zu 6.
3. **Set mode** — Wenn ja: Gate-Modus `non-code` setzen. Auswirkungen:
   - Code-Gates (6a/6a-bis/6a-tris/6a-quart) werden in Schritt 6 **explizit** uebersprungen
   - Soft-Gates 6c/6d/6e werden **Hard**
   - 5.5 bleibt unveraendert — Sensitive-Paths-Patterns greifen weiter
4. **Document skip** — Pro uebersprungenem Gate ein Eintrag in `meta.json.skipped_gates`:
   ```json
   "skipped_gates": {
     "eslint": "non-code: change_type=workflow",
     "semgrep": "non-code: change_type=workflow",
     "dependency": "non-code: no manifest in diff",
     "coverage": "non-code: change_type=workflow"
   }
   ```
5. **Domain-Gates (best-effort)** — wenn `tools_available.<tool>` aktiv, laufen die passenden Tool-Gates:
   - `workflow` → `n8n_lint`, `workflow_jsonschema`
   - `infrastructure` → `tflint`, `tfsec`, `checkov`
   - `config` → `yamllint`, `jsonschema`, `opa`
   - `content` → `markdownlint`, `broken_links`

## Was beim Smoke Test (6d) konkret zaehlt

Bei Non-Code-Stories ist Smoke Test KEIN Syntax-Check, sondern eine **echte Ausfuehrung in einer
Test-Umgebung**. Beispiele:

| `change_type` | Smoke Test bedeutet konkret |
|---|---|
| `workflow` | Workflow in n8n manuell oder via Test-Webhook getriggert, End-zu-End-Pfad gelaufen, Output geprueft |
| `infrastructure` | `terraform plan` + `apply` in nicht-produktivem Workspace gelaufen, Ressource sichtbar in Cloud Console |
| `config` | Config in Staging deployed, App-Restart oder Hot-Reload, Smoke-URL antwortet, Logs sauber |
| `content` | Content in Ziel-CMS gepushed, mind. 3 Stichproben-Seiten visuell geprueft, Links validiert |

Output des Smoke Tests **muss im Spec-File unter `## Smoke Test` dokumentiert werden** — kein
"hab's getestet, war ok". Konkrete Belege: Screenshot-Pfad, Log-Auszug, Plan-Diff, URL.

## Security-Findings (6e) bei Non-Code

Hard-Doku pro Domain-Risiko. Mindestens diese Punkte muessen im Spec-File unter
`## Security-Findings` adressiert sein (oder explizit als "n/a — Begruendung" markiert):

- **Webhook-Auth** (bei `workflow`): HMAC / Token / IP-Restriction?
- **Credentials** (alle): Secret-Manager? Env-Variablen? Keine Klartext-Werte?
- **IAM** (bei `infrastructure`, `config`): Keine `*`-Wildcards? Least-Privilege?
- **Public Surface** (bei `infrastructure`): Buckets / Endpoints / DBs nicht ungewollt oeffentlich?
- **Rate-Limits / Timeouts** (bei `workflow`, `config`): Auf externen Calls gesetzt?
- **Rollback** (alle): Wie wird die Aenderung rueckgaengig gemacht, falls produktiv etwas bricht?

## Was passiert wenn `change_type` fehlt

Default = `none` = Code-Strict. Der Skill verhaelt sich wie bisher. Code-Gates greifen, Soft-Gates
bleiben Soft. Das ist absichtlich konservativ — kein Auto-Fallback auf "Non-Code", weil das
ein Audit-Loch waere.

> **Wenn `/ideation` eine Story baut, soll der `change_type` aktiv gesetzt werden** — auch fuer
> Non-Code-Stories. Der Ideation-Skill (siehe `ideation/SKILL.md` Schritt 4) macht den Operator
> darauf aufmerksam, sobald die Story-Description nach Workflow/IaC/Config riecht.

## Was diese Story NICHT macht

- Keine konkreten Tool-Integrationen (n8n-Lint-Wrapper, tfsec-Hook) — eigene Folge-Stories
- Keine Auto-Erkennung des `change_type` aus dem Diff — bewusst manuell vom Operator gesetzt
- Keine Aenderung am Spec-Gate (specs/{PREFIX}-XX.md bleibt Pflicht, egal welcher Typ)
- Kein Auto-Bypass — fehlender `change_type` faellt auf Code-Strict zurueck, nicht auf "skip alles"

## Querverweise

- `implement/SKILL.md` Schritt 5.7 — der Code-Pfad
- `implement/references/validation-checklist.md` — Gate-Tabelle und PASS/FAIL-Kriterien Non-Code
- `implement/references/change-checklist.md` — Spezial-Checklisten pro Non-Code-Typ
- `ideation/references/story-template-feature.md` §8 — wo `change_type` gesetzt wird
- `CONVENTIONS.md` §Story spec frontmatter — vollstaendiges Frontmatter-Schema
- `bootstrap/references/file-templates.md` §`.claude/sensitive-paths.json` — Default-Patterns inkl. Non-Code-Paths
