# INDEX.md — BelegChat

> Doku-Landkarte: Alle Projekt-Dokumente auf einen Blick.

---

## Governance

| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | Projekt-Einstieg, Arbeitsregeln, Infrastruktur |
| `CONVENTIONS.md` | Adapter-Vertrag (Runtime, Gates, Modi) |
| `GOVERNANCE.md` | Governance-Regeln, Quality-Gates, Add-ons |
| `SECURITY.md` | Security-Skelett, Threat Model |
| `PRIVACY.md` | DSGVO-Datenkategorien, Schutzmassnahmen |
| `CONTEXT.md` | Kanonisches Vokabular |
| `SICHERHEIT.md` | Secrets-Uebersicht (bestehend) |

## Architektur

| Datei | Zweck |
|-------|-------|
| `ARCHITECTURE_DESIGN.md` | Zentraler Architektur-Hub |
| `SYSTEM_ARCHITECTURE.md` | Technische Systemarchitektur |
| `API_INVENTORY.md` | Externe + interne Schnittstellen |
| `COMPONENT_INVENTORY.md` | Komponenten-Register |

## Komponenten

| Datei | Zweck |
|-------|-------|
| `docs/components/frontend.md` | Next.js Dashboard |
| `docs/components/backend.md` | API Routes, Server Actions |
| `docs/components/api.md` | Externe APIs (n8n, Threema, Mistral) |
| `docs/components/db.md` | Supabase (PostgreSQL, Storage, RLS) |

## Fach-Dokumentation

| Datei | Zweck |
|-------|-------|
| `docs/GOBD.md` | GoBD-Dokumentation |
| `docs/AUTH.md` | Auth (WebAuthn/Passkey) |
| `docs/PDF-IMPORT.md` | PDF-Batch-Import |
| `docs/DATEV.md` | DATEV-Export (Phase 4) |
| `docs/SCHEMA.md` | DB-Schemaübersicht (Landkarte; Wahrheit: Migrationen im Schwesterrepo) |
| `docs/POST-ALPHA-PLAN.md` | Hauptplan Phasen 0-4 |
| `docs/UEBERGABE.md` | Session-Uebergabe |
| `docs/TESTPLAN.md` | Testplan |
| `docs/PFAD-MIGRATION.md` | Pfad-Migration |
| `docs/ALPHA-HANDOFF.md` | Alpha-Handoff |
| `docs/OFFENE-FRAGEN-STB.md` | Anschreiben an die Steuerkanzlei (Versandteil) + Antwort-Log |
| `docs/FEATURE-WUENSCHE.md` | Feature-Wunsch-Registry (Vorstufe des Feature-Voting-Moduls F-01) |
| `docs/AUSFUEHRUNGSPLAN-STB-RUECKMELDUNG.md` | Nachtlauf S0–S7 + Morgen-Runbook M1–M6 zur StB-Rückmeldung |
| `docs/verfahrensdoku/AENDERUNGEN-v1.1.md` | Ergänzungstexte für Verfahrensdoku v1.1 (entsteht im Nachtlauf, BER-118/119/121) |

## Audits & Konzeption

| Datei | Zweck |
|-------|-------|
| `docs/audits/2026-07-22-validierung-ber-116-119.md` | Validierungsbericht der Entwurfs-Specs (Zweitmodell) |
| `docs/audits/2026-07-23-strukturpruefung-ausbaustufe.md` | Teil-A-Strukturprüfung: 9 Richtungen, 4 Pflichtfragen, Widerspruchsliste |

## Domain

| Datei | Zweck |
|-------|-------|
| `docs/domain/README.md` | Domain-Kontext-Uebersicht |

## Story-Specs

| Pfad | Zweck |
|------|-------|
| `specs/TEMPLATE.md` | Story-Spec-Vorlage |
| `specs/BER-XXX.md` | Einzelne Story-Specs |
| `specs/migrations/20260723_stb_rueckmeldung_konsolidiert.sql` | Konsolidierte Migration BER-116/117/118/119/121 (Spec-Anhang; Anwendung = Nachtlauf S1) |
| `specs/migrations/20260723_trigger_tests.sql` | Verhaltens-Tests zur Migration (Rollback-Transaktion) |

## Journal

| Pfad | Zweck |
|------|-------|
| `journal/learnings.md` | Learning-Loop L1 |
| `journal/daily/` | Tagesnotizen |
