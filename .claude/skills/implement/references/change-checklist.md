---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Aenderungs-Checkliste (generisch)

PFLICHT bei jeder Code-Aenderung, egal wie klein. Durchgehen am Ende von Schritt 5 im `/implement`-Workflow.

## 1. Doku-Impact pro Aenderungs-Typ

Aus dem Linear-Label oder dem geaenderten Bereich den Aenderungs-Typ ableiten. Dann die entsprechenden Docs aktualisieren.

| Aenderungs-Typ | Docs die IMMER geprueft werden |
|----------------|-------------------------------|
| **Neue Komponente / Modul** | `ARCHITECTURE_DESIGN.md §9 Referenzen`, `COMPONENT_INVENTORY.md`, `SYSTEM_ARCHITECTURE.md`, Component-Doc (Obsidian oder `docs/components/`) |
| **API-Integration** (extern) | `SECURITY.md` (Threat-Surface), Component-Doc, `.env.example` (neue Variablen), `CHANGELOG.md` |
| **Konfiguration / Secrets** | `.env.example`, `SECURITY.md` (Secret-Handling), `lib/config.js` (falls SSoT-Werte), `CLAUDE.md` (wenn Systemverhalten sich aendert) |
| **Security-relevante Aenderung** | `SECURITY.md` (immer), `ARCHITECTURE_DESIGN.md §3 Quality Attributes`, ADR falls Architektur-Impact |
| **Doku / Governance-Aenderung** | `GOVERNANCE.md`, `DEVELOPMENT_PROCESS.md`, `CLAUDE.md`, betroffene Skill-Files |
| **Neue Abhaengigkeit** | `package.json` / `pyproject.toml`, `SECURITY.md` (Supply-Chain-Risk), ggf. `SYSTEM_ARCHITECTURE.md` |
| **Neuer ADR** | `ARCHITECTURE_DESIGN.md §7 ADR-Tabelle`, `Decisions/ADR-XX.md` (in Obsidian oder `docs/adr/`), Referenz in betroffenen Component-Docs |
| **Neue Datei** (jede `*.md`) | `ARCHITECTURE_DESIGN.md §9 Referenzen` (erzwungen durch `orphan-check.sh` wenn installiert), `INDEX.md` |
| **Hook / Governance-Hook-Aenderung** | `GOVERNANCE.md`, `.claude/settings.json` + `settings.local.json`, `hooks-setup.md` falls Skill-Teil |
| **Phase-Uebergang** (z.B. Phase 0 → 1) | PMO-Hub (Obsidian), `ARCHITECTURE_DESIGN.md §6 Phasen-Mapping`, alle Component-Docs (Phase-Status), `CHANGELOG.md` |
| **Onboarding-/Handoff-relevante Aenderung** | `DEVELOPER_ONBOARDING.md`, Project Hub / PMO-Hub, `ARCHITECTURE_DESIGN.md` falls Zielarchitektur betroffen, `SECURITY.md` falls Security-Regeln betroffen |
| **Workflow** (n8n / Make / Zapier, `change_type: workflow`) | `SECURITY.md` (Webhook-Auth, Credentials), `ARCHITECTURE_DESIGN.md` (Integration), Workflow-JSON committet, Component-Doc fuer Automation, `.env.example` fuer neue Secrets |
| **Infrastructure** (Terraform / Pulumi / CFN, `change_type: infrastructure`) | `SECURITY.md` (IAM, Public Surface), `ARCHITECTURE_DESIGN.md` (Topologie), `infra/README.md`, `.tfvars.example`, ADR falls Architektur-Drift |
| **Config** (reine Cloud-/App-Configs, `change_type: config`) | `SECURITY.md` (Hardening), `.env.example`, betroffene Komponenten-Doku, `CONVENTIONS.md` wenn projekt-globale Regel betroffen |
| **Content** (CMS-Migrationen, Doku-Bulk, `change_type: content`) | `INDEX.md`, betroffene Component-Doc, `CHANGELOG.md` (Inhalt), bei externer Veroeffentlichung: Freigabe-Verweis |

**Immer gilt:**
- Component-Doc der betroffenen Komponente aktualisieren (Stack, Phase-Status, Verbundene Stories, offene Fragen)
- `lib/config.js` VERSION bumpen wenn DOC_FILES aktualisiert wurden
- Alle DOC_FILES auf neue VERSION bringen (erzwungen durch `doc-version-sync.sh`)
- `CHANGELOG.md` Eintrag mit Version + Beschreibung
- Am Ende jeder Implementation explizit dokumentieren: `DEVELOPER_ONBOARDING.md` aktualisiert oder "keine Aktualisierung noetig"; Project Hub / PMO-Hub aktualisiert oder "keine Aktualisierung noetig"

---

## 2. Privacy-Check (IMMER)

Fuer jede Aenderung pruefen:

- [ ] Wird eine neue Datenflussgrenze zu externem System ueberschritten? (Cloud-API, Third-Party-Service, Webhook)
- [ ] Werden personenbezogene Daten verarbeitet oder uebertragen?
- [ ] Ist das Projekt mit `Privacy`-Add-on konfiguriert? Dann: Datenflusskontrolle pruefen (Redaktion? Tier-Modell?)
- [ ] Werden Secrets im Code oder Log sichtbar? (`.env`-Check, Log-Sanitizing)

Bei Privacy-relevanten Aenderungen: `SECURITY.md` Privacy-Sektion aktualisieren.

---

## 3. Architektur-Konsistenz-Check

- [ ] Keine hardcoded Werte die in `lib/config.js` gehoeren (SSoT respektieren)
- [ ] Config-Werte ueber `.env` konfigurierbar wenn umgebungs-spezifisch
- [ ] Error-Handling vorhanden wo noetig (API-Calls, File-I/O, User-Input)
- [ ] Logging implementiert bei Fehlern und wichtigen State-Aenderungen
- [ ] Bestehende Patterns eingehalten (nicht neue Konventionen einfuehren wenn nicht noetig)
- [ ] Toolwechsel-/Handoff-Kontext weiterhin korrekt? (Claude Code -> Codex/Cursor/GitHub Copilot/Google Antigravity/klassisches Dev-Team)

---

## 4. Git Commit + Push

- Code UND Doku-Aenderungen in einem Commit
- Commit-Message: `feat: <PREFIX>XXX — [Titel]` / `fix: <PREFIX>XXX — [Titel]` / `docs: ...` / `refactor: ...`
- `spec-gate.sh` + `doc-version-sync.sh` muessen gruen sein
- Push nach dem erfolgreichen Commit

---

## Spezial-Checklisten (pro Aenderungs-Typ)

### Neue Komponente / Modul hinzufuegen

- [ ] `ARCHITECTURE_DESIGN.md §9 Referenzen`: neuer Eintrag
- [ ] `COMPONENT_INVENTORY.md`: Zeile mit Status, Pfad, Zweck
- [ ] `SYSTEM_ARCHITECTURE.md`: Tabelle ergaenzen
- [ ] Component-Doc anlegen (Skelett-Struktur aus `bootstrap/references/doc-architecture-proposal.md`)
- [ ] `INDEX.md`: neuer Eintrag
- [ ] `.env.example`: neue Variablen dokumentiert
- [ ] `lib/config.js`: wenn konfigurierbar, VERSION bump

### Neue externe API integrieren

- [ ] Rate-Limit-Handling implementiert
- [ ] Timeout gesetzt
- [ ] Offline-/Error-Fallback (Graceful Degradation)
- [ ] API-Key nur in `.env` (niemals in Git, niemals in Log)
- [ ] Logger sanitized (`logger.sanitize()` fuer Response-Text)
- [ ] `SECURITY.md`: neue Threat-Surface dokumentiert
- [ ] Component-Doc aktualisiert (Stack-Tabelle, offene Fragen)
- [ ] Privacy-Tier-Kompatibilitaet dokumentiert (wenn Privacy-Add-on aktiv)

### Secrets-Management aendern

- [ ] `.env.example` mit Format-Erklaerung (NIE echte Werte)
- [ ] `SECURITY.md §API-Key-Policy` aktualisiert
- [ ] Bestehende `.gitignore`-Eintraege validieren
- [ ] Bei Secret-Rotation: alte Keys deaktivieren, Event-Log schreiben
- [ ] Keine Secrets in Logs (sanitize)

### Neuer ADR

- [ ] ADR-Datei in `Decisions/ADR-XX.md` (Obsidian) oder `docs/adr/ADR-XX.md` mit: Status, Kontext, Entscheidung, Konsequenzen, Alternativen
- [ ] `ARCHITECTURE_DESIGN.md §7 ADR-Tabelle`: Eintrag
- [ ] Betroffene Component-Docs: Referenz zum ADR
- [ ] `CHANGELOG.md`: Eintrag
- [ ] Enforcement-Frage: "Ist die Entscheidung maschinell erzwungen oder nur dokumentiert?" — bei nur dokumentiert: Guard-Story-Kandidat (Hook / Test / Self-Healing-Check)

### Hook / Governance-Aenderung

- [ ] `GOVERNANCE.md` Sektion aktualisieren
- [ ] Hook-Skript in `.claude/hooks/` liegt
- [ ] Hook in `.claude/settings.json` UND `.claude/settings.local.json` registriert (Harness-Fallback)
- [ ] Hook-Test: Manuell ausloesen (z.B. Dummy-Commit) und Blockade pruefen
- [ ] `bootstrap/references/hooks-setup.md` aktualisieren falls generischer Hook
- [ ] `specs/<PREFIX>XXX.md` dokumentiert den neuen Hook

### Security-Feature aendern

- [ ] `SECURITY.md` relevante Sektion aktualisieren (Threat Model, Input-Validation, Auth)
- [ ] Threat-Response-Matrix pruefen — wird bestehende Bedrohung mitigiert?
- [ ] Bei neuem Inbound-Webhook: HMAC-Signierung, Replay-Schutz, Rate-Limit, Body-Limit
- [ ] Bei neuer .env-Variable mit Credential: Sanitize in Logger, Dokumentation in `.env.example`

### Governance / Skill aendern

- [ ] Betroffene `SKILL.md` aktualisieren
- [ ] `references/*.md` nachziehen wenn referenziert
- [ ] `GOVERNANCE.md` aktualisieren wenn projekt-globale Regel betroffen
- [ ] Version im Skill-Frontmatter erhoehen (`version:` in SKILL.md)
- [ ] `publish_skill.py` laufen lassen wenn Skill ins Master-Repo soll

### Workflow aendern / hinzufuegen (n8n / Make / Zapier — `change_type: workflow`, BOO-68)

- [ ] Workflow-JSON exportiert und in `n8n/` / `workflows/` committed (kein "lebt nur in der UI")
- [ ] **Webhook-Auth:** HMAC-Signing oder Header-Token gesetzt — Webhook ist nicht "open"
- [ ] **Credentials:** ueber n8n Credentials-Store referenziert, NICHT als String im Node-Body
- [ ] **Error-Branches:** jeder externe API-Call hat einen Error-Output-Branch (nicht "ignore")
- [ ] **Rate-Limits / Timeouts:** auf jedem HTTP-Node gesetzt
- [ ] Smoke Test: Workflow in Test-Env real getriggert, Output dokumentiert in Spec
- [ ] `SECURITY.md` Sektion fuer Webhook-Inventory aktualisiert
- [ ] Optional: `tools_available.n8n_lint` aktiv und gruen, `tools_available.workflow_jsonschema` aktiv und gruen

### Infrastructure-as-Code aendern (Terraform / Pulumi / CFN — `change_type: infrastructure`, BOO-68)

- [ ] `terraform plan` (oder Equivalent) gelaufen, Diff im Spec dokumentiert
- [ ] **IAM:** keine `*` in Resource-/Action-Statements ohne explizite Begruendung
- [ ] **Public Surface:** S3-Buckets / Storage / Endpoints nicht ungewollt oeffentlich
- [ ] **Secrets:** kein Klartext in `.tfvars` — Secret-Manager oder SOPS
- [ ] **State-File:** nicht in Git, Backend korrekt konfiguriert
- [ ] Smoke Test: `apply` in nicht-produktivem Account/Workspace gelaufen
- [ ] `infra/README.md` und `ARCHITECTURE_DESIGN.md` aktualisiert
- [ ] Optional: `tools_available.tflint`, `tools_available.tfsec`, `tools_available.checkov` aktiv und gruen

### Reine Config-Aenderung (Cloud / App-Configs — `change_type: config`, BOO-68)

- [ ] Diff manuell Zeile-fuer-Zeile reviewed (kein "ist ja nur YAML")
- [ ] **Schema-Validierung:** Config gegen Schema gepruefte (yamllint / jsonschema)
- [ ] **Secrets:** keine Klartext-Credentials in der Config
- [ ] **Rollback-Plan:** dokumentiert, wie die alte Config wiederhergestellt wird
- [ ] Smoke Test: Config in Test-Env angewendet, App startet/laeuft
- [ ] `.env.example` und Component-Doc nachgezogen
- [ ] Optional: `tools_available.yamllint`, `tools_available.jsonschema`, `tools_available.opa` aktiv und gruen

### Content-Migration / Bulk-Doku (`change_type: content`, BOO-68)

- [ ] Vorher-/Nachher-Diff in der Spec dokumentiert (mind. Stichprobe von 3 Seiten)
- [ ] **Broken-Links-Check:** alle internen und externen Links validiert
- [ ] **PII-Check:** kein versehentliches Veroeffentlichen personenbezogener Daten
- [ ] **Freigabe:** bei extern sichtbarer Veroeffentlichung Operator-Freigabe dokumentiert
- [ ] Smoke Test: Inhalt im Ziel-System (CMS / Website) sichtbar und korrekt gerendert
- [ ] `INDEX.md` / Sitemap nachgezogen
- [ ] Optional: `tools_available.markdownlint`, `tools_available.broken_links` aktiv und gruen

---

## 5. Component-Doc-Update (wenn Obsidian aktiv)

Jede Code-Aenderung die eine Komponente beruehrt muss das Component-File aktualisieren:
- `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/<komponente>.md`
- Sektionen: Stack-Tabelle (wenn Tool-Aenderung), Phase-Status, Verbundene Stories (Link zu JAR-XXX + Spec), offene Fragen

Wenn DocSync aktiviert (Block D.2): laeuft automatisch via `node lib/doc-sync.js`.
