# ARCHITECTURE_DESIGN.md — BelegChat

> Zentraler Hub fuer Architektur-Entscheidungen. Einstiegspunkt fuer /ideation, /architecture-review, /implement.

---

## 1 Systemueberblick

BelegChat digitalisiert den Beleg-Eingang fuer Steuerberater-Mandanten. Mandanten senden Belegfotos per Threema; n8n orchestriert OCR (Mistral) und KI-Kontierung (SKR04); Belege landen revisionssicher in Supabase.

### Architektur-Diagramm (High-Level)

```
Mandant (Threema) --> Threema Gateway --> Edge Function (Decrypt)
                                              |
                                              v
                                         n8n Workflow
                                         /         \
                                   Mistral OCR    Supabase Storage
                                        \         /
                                     KI-Kontierung (SKR04)
                                              |
                                              v
                                    Supabase PostgreSQL
                                              |
                                              v
                                   Next.js Dashboard (Vercel)
```

## 2 Design-Rationale

### Stack-Entscheidungen

| Komponente | Wahl | Begruendung |
|-----------|------|-------------|
| Frontend | Next.js 15 (App Router) | SSR, API Routes, Vercel-Deploy |
| Auth | WebAuthn/Passkey + Session-JWTs | Passwordless, Phishing-resistent |
| DB | Supabase (PostgreSQL) | RLS, Storage, Edge Functions |
| OCR | Mistral | Kosteneffizient, gute Beleg-Erkennung |
| Messaging | Threema | E2E-verschluesselt, DSGVO-konform |
| Workflow | n8n (self-hosted) | Orchestrierung, Webhook-API |
| Deploy | Vercel | Next.js-nativ, Preview Deployments |

### KI-Architektur-Prinzipien

1. **Prompt-Versionierung:** OCR- und Kontierungs-Prompts sind versioniert
2. **Determinismus:** Gleicher Beleg = gleiche Kontierung (Temperature 0)
3. **Fallback:** Bei KI-Unsicherheit: Mandant wird gefragt (kein stilles Raten)
4. **Kostendeckel:** Token-Budget pro Beleg, Monitoring via n8n
5. **Datensparsamkeit:** Nur notwendige Felder an LLM, keine PII
6. **Audit-Trail:** Jede KI-Entscheidung ist nachvollziehbar (Hash-Kette)
7. **Modell-Agnostik:** Mistral austauschbar (API-Adapter-Pattern)
8. **Human-in-the-Loop:** Kontierungs-Vorschlaege, keine Auto-Buchung

## 3 Komponenten

| Komponente | Doku | Status |
|-----------|------|--------|
| Frontend (Dashboard) | `docs/components/frontend.md` | Phase 3 |
| Backend (API Routes) | `docs/components/backend.md` | Phase 3 |
| Externe APIs (n8n, Threema, Mistral) | `docs/components/api.md` | Alpha |
| Datenbank (Supabase) | `docs/components/db.md` | Alpha |

## 4 Datenmodell

Kernentitaeten: `belege`, `firmen`, `threema_contacts`, `passkey_credentials`.
GoBD-Felder: `hash`, `prev_hash`, `created_at` (immutable), `beleg_nummer`.

## 5 Security

Siehe `SECURITY.md` fuer Threat Model und Schutzmassnahmen.

## 6 Schnittstellen

Siehe `API_INVENTORY.md` fuer externe + interne Schnittstellen.

## 7 Deployment

- **Production:** Vercel (Next.js) + Supabase Cloud + n8n (Hostinger VPS)
- **Preview:** Vercel Preview Deployments pro PR
- **Edge Functions:** Supabase Edge (threema-decrypt)

## 8 Offene Architektur-Fragen

- [ ] DATEV-Export-Format (Phase 4)
- [ ] RLS-Finalisierung fuer Multi-Mandanten
- [ ] Passkey-E2E + Deploy (Phase 3 offen)

## 9 Referenzen

| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | Projekt-Einstieg + Arbeitsregeln |
| `CONVENTIONS.md` | Adapter-Vertrag (Runtime, Gates, Modi) |
| `GOVERNANCE.md` | Governance-Regeln + Quality-Gates |
| `SECURITY.md` | Security-Skelett + Threat Model |
| `CONTEXT.md` | Kanonisches Vokabular |
| `PRIVACY.md` | DSGVO-Datenkategorien |
| `API_INVENTORY.md` | Externe + interne Schnittstellen |
| `COMPONENT_INVENTORY.md` | Komponenten-Register |
| `INDEX.md` | Doku-Landkarte |
| `SICHERHEIT.md` | Secrets-Uebersicht (bestehend) |
| `docs/GOBD.md` | GoBD-Dokumentation |
| `docs/AUTH.md` | Auth-Dokumentation |
| `docs/PDF-IMPORT.md` | PDF-Import-Dokumentation |
| `docs/POST-ALPHA-PLAN.md` | Hauptplan Phasen 0-4 |
| `docs/UEBERGABE.md` | Session-Uebergabe |
| `docs/TESTPLAN.md` | Testplan |
| `docs/components/frontend.md` | Frontend-Komponente |
| `docs/components/backend.md` | Backend-Komponente |
| `docs/components/api.md` | API-Komponente |
| `docs/components/db.md` | Datenbank-Komponente |
| `specs/TEMPLATE.md` | Story-Spec-Template |
| `docs/SCHEMA.md` | DB-Schemaübersicht (Landkarte zu den Migrationen im Schwesterrepo) |
| `docs/OFFENE-FRAGEN-STB.md` | Anschreiben Steuerkanzlei (Versandteil) + Antwort-Log |
| `docs/FEATURE-WUENSCHE.md` | Feature-Wunsch-Registry (Vorstufe Feature-Voting-Modul) |
| `docs/AUSFUEHRUNGSPLAN-STB-RUECKMELDUNG.md` | Nachtlauf + Morgen-Runbook StB-Rückmeldung |
| `docs/audits/2026-07-22-validierung-ber-116-119.md` | Validierungsbericht Entwurfs-Specs |
| `docs/audits/2026-07-23-strukturpruefung-ausbaustufe.md` | Strukturprüfung nächste Ausbaustufe (Teil A) |
| `docs/verfahrensdoku/AENDERUNGEN-v1.1.md` | Verfahrensdoku-Ergänzungen v1.1 (entsteht im Nachtlauf) |
| `specs/migrations/20260723_stb_rueckmeldung_konsolidiert.sql` | Konsolidierte Migration BER-116..119/121 (Spec-Anhang) |
| `specs/migrations/20260723_trigger_tests.sql` | Trigger-Verhaltenstests (Rollback-Transaktion) |
