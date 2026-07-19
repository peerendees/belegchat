---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Validation Checklist — /implement Schritt 6

Referenz-Dokument für alle Post-Implement-Gates. Wird von `/implement` Schritt 6 konsumiert.

## Gate-Übersicht

Das Gate-Verhalten haengt vom `change_type` der Story ab (Schritt 5.7 — BOO-68).
**Code-Strict** ist der Default fuer `change_type ∈ {none, api, auth, data, dependency, ci, governance, external-provider}`.
**Non-Code** gilt fuer `change_type ∈ {workflow, config, infrastructure, content}`.

| Gate | Schritt | Tool | Block-Typ (Code-Strict) | Block-Typ (Non-Code) |
|------|---------|------|-------------------------|----------------------|
| Code Quality — ESLint | 6a | ESLint CLI | Iterations-Loop (max 5) | **Skip — Grund in `meta.json.skipped_gates`** |
| Security — Semgrep | 6a-bis | Semgrep CLI | Iterations-Loop (max 5) | **Skip — Grund in `meta.json.skipped_gates`** |
| Dependency Check | 6a-tris | dependency-check.sh | Hard Block bei 404/High CVE | **Skip ausser Manifest tatsaechlich im Diff** |
| Coverage Gate | 6a-quart | coverage-check.sh | Block bei <60%, Warn 60-80% | **Skip — Grund in `meta.json.skipped_gates`** |
| Akzeptanzkriterien | 6b | Linear Issue | Hard Block (kein Done ohne AC) | Hard Block (unveraendert) |
| Architektur-Quick-Check | 6c | Manuell | Soft Check | **Hard Check — Pflicht-Doku** |
| Smoke Test | 6d | Manuell | Soft Check | **Hard Check — Pflicht-Ausfuehrung in Test-Env** |
| Security-Findings | 6e | Manuell | Dokumentation | **Hard — Pflicht-Doku pro Domain-Risiko** |
| Intent-Verifikation | 6g | intents/INTENT-XX.md | Non-blocking (nur Messen) | Non-blocking (unveraendert) |
| **Domain-Gates (optional)** | 6a-domain | n8n-lint / tfsec / yamllint | n/a | Best-effort, wenn `tools_available.<tool>` aktiv |

> Skips im Non-Code-Modus sind NICHT stillschweigend — sie landen mit Begruendung in
> `meta.json.skipped_gates`. Beispiel: `"eslint": "non-code: change_type=workflow"`.
> Siehe [non-code-flow.md](non-code-flow.md) fuer den vollstaendigen Ablauf-Sketch.

## Review-Evidenz (BOO-18 — Mandatory Human Review)

Wenn `.claude/sensitive-paths.json` vorhanden und ein Treffer in Schritt 5.5 gefunden:

### Pflicht-Einträge im Spec-File

Unter `## Human Review` im Spec-File (`specs/{PREFIX}-XXX.md`) müssen stehen:

```markdown
## Human Review

- **Date:** YYYY-MM-DD
- **Reviewer:** {Name / GitHub-Handle}
- **Comment:** {Was wurde geprüft, worauf wurde besonders geachtet}
- **Sensitive Paths Touched:** {Liste der Dateien die einen sensitiven Pattern getroffen haben}
```

### Checkliste für den Reviewer

Beim Review sensitiver Pfade prüfen:

- [ ] Input-Validierung: Werden alle User-Inputs vor der Verarbeitung validiert?
- [ ] Authentication: Werden Tokens/Sessions korrekt validiert und kein Bypass möglich?
- [ ] Authorization: Werden Berechtigungen auf Ressourcen-Ebene (nicht nur Route-Ebene) geprüft?
- [ ] Secrets: Werden Credentials/Keys ausschliesslich aus Environment-Variablen geladen (nie hardcoded)?
- [ ] Logging: Werden PII-Daten NICHT in Logs geschrieben?
- [ ] Error Handling: Gibt der Fehler-Handler keine sensiblen Details in der API-Response zurück?
- [ ] Crypto: Werden Passwörter mit einem sicheren Hashing-Algorithmus (bcrypt, argon2) gespeichert?
- [ ] MFA: Ist für den betroffenen Auth-Flow ein zweiter Faktor vorhanden — oder ist die Ausnahme dokumentiert? (BOO-426)
- [ ] Rate-Limit: Sind Auth-Endpunkte (Login, Passwort-Reset, Token-Erneuerung) rate-limitiert? (BOO-426)
- [ ] CSRF: Tragen alle State-ändernden Requests einen serverseitig validierten CSRF-Token? (BOO-426; Pattern: secure-code-patterns §CSRF)

### Audit-Trail

Der Review-Kommentar (`review-ok: ...`) wird in zwei Artefakten gespeichert:
1. **Spec-File** (`specs/{PREFIX}-XXX.md §Human Review`) — langfristiger Audit-Trail per Story
2. **Linear-Kommentar** — automatisch von `/implement` nach Schritt 6b gepostet (inkl. Reviewer + Datum)

### Fallback: Keine sensitive-paths.json

Wenn `.claude/sensitive-paths.json` fehlt: Schritt 5.5 wird übersprungen, kein Human Review erzwungen. Empfehlung: `/bootstrap` Phase 4.4i nachziehen oder Datei manuell anlegen.

---

## Validation PASS / FAIL Kriterien

### Code-Strict (Default)

**PASS** (alle müssen erfüllt sein):
- ESLint: 0 Errors
- Semgrep: 0 High/Critical Findings
- Dependency: kein 404, kein High/Critical CVE
- Coverage: ≥80% auf neuen Zeilen (oder Operator-Freigabe mit Begründung)
- AC-Check: alle ACs mit Evidenz abgehakt
- Sensitive Paths: Human Review dokumentiert (falls Treffer)

**FAIL** (einer genügt):
- ESLint Errors nach 5 Iterationen noch vorhanden
- Semgrep High/Critical nach 5 Iterationen
- Dependency 404 oder High/Critical CVE nicht mitigiert
- Coverage <60% ohne Operator-Freigabe
- Sensitive Path ohne `review-ok`-Bestätigung

### Non-Code (`change_type ∈ {workflow, config, infrastructure, content}` — BOO-68)

**PASS** (alle müssen erfüllt sein):
- AC-Check: alle ACs mit Evidenz abgehakt (6b)
- Architektur-Quick-Check: konkreter Befund dokumentiert, nicht leer (6c, Hard)
- Smoke Test: in Test-Env real ausgefuehrt, Output dokumentiert (6d, Hard) — Workflow getriggert / `terraform plan` + `apply` gelaufen / Config angewendet
- Security-Findings: pro Domain-Risiko dokumentiert oder explizit "n/a — Begruendung" (6e, Hard)
  - Webhook-Auth, Credential-Storage, IAM/RBAC, Public Surface, Rate-Limits
- Sensitive Paths: Human Review dokumentiert (falls Treffer in `n8n/**`, `infra/**`, `**/*.tf`, etc.)
- Optionale Domain-Gates (n8n-lint, tfsec, tflint, yamllint): wenn `tools_available.<tool>` aktiv, gruen

**FAIL** (einer genügt):
- 6c leer / "n/a" ohne Begruendung
- 6d nicht ausgefuehrt oder Output nicht dokumentiert
- 6e leer / "keine Pruefung" ohne Begruendung
- Sensitive Path ohne `review-ok`-Bestätigung
- Optionales Domain-Gate aktiviert aber rot ohne dokumentierte Ausnahme
