---
tags: [projekt, belegchat, entwicklung]
status: aktiv
phase: post-alpha
erstellt: 2026-07-10
aktualisiert: 2026-07-11
language: de
source: claude
chat_url: unbekannt
governance: "[[Projekt-Governance]]"
related:
  - "[[Research/POST-ALPHA-Implementierungsplan]]"
  - "[[Decisions/ADR-02 Mehrseiten-Fertig-UX]]"
  - "[[Decisions/ADR-03 GoBD-Härtung DB]]"
---

# BelegChat

> Threema-basierter Belegeingang mit OCR, KI-Kontierung (SKR04) und revisionssicherer Speicherung in Supabase.

## Projektziel

Mandanten senden Belegfotos per Threema; der Workflow extrahiert Daten, schlägt ein Sachkonto vor und legt einen Datensatz in Supabase an. Status initial: `vorschlag` (manuell prüfbar nach Alpha).

## Status

| Phase | Stand |
|-------|-------|
| **Beta** | Threema E2E Einzelseite grün (2026-07-10, Beleg `01-2026-0003`) |
| **Alpha** | **E2E grün** (2026-07-11, Beleg `01-2026-0004`, Mehrseiten + GoBD) |
| **Post-Alpha** | **Phase 1 GoBD abgeschlossen** (DB + Edge + n8n live, E2E `01-2026-0005`, 2026-07-11) — PRs offen |

## Erledigt 2026-07-10 (Beta)

- [x] Auth `DECRYPT_API_TOKEN` an Supabase-Nodes
- [x] `Prüfe Inhalt`: `raw.text` statt `raw.plaintext`
- [x] OCR/Kontierung über Supabase Edge Function
- [x] SOP Threema-Belegeingang im Vault
- [x] Mandanten-Guard, Signaturprüfung, Fehlerpfad

## Erledigt 2026-07-11 (Alpha)

- [x] Mehrseiten-UX: Scan + Scan + **`Fertig`** ([[Decisions/ADR-02 Mehrseiten-Fertig-UX]])
- [x] Threema-Gateway-Split: Dialog *BERENT2* (E2E), Abschluss *BERENT1* (`send_simple`)
- [x] PKCS7-Padding Send + Strip Receive (Edge Function v15)
- [x] n8n-Loop-Fix (leere Delivery-Callbacks)
- [x] GoBD: Storage, `gobd_hash`, `beleg_seiten`, `audit_log`
- [x] Workflow live per n8n API (ID `MYpHUIHNMuIUR1ic`)
- [x] E2E-Test Mehrseiten grün (`01-2026-0004`)

### Alpha Definition of Done

- [x] Mandant kann 1–n Seiten per Threema mit **`Fertig`** abschließen
- [x] Ein `belege`-Satz mit verknüpften Storage-Dateien
- [x] `gobd_hash` und `audit_log` bei Erfassung
- [x] SOP beschreibt Flow inkl. GoBD + Troubleshooting
- [x] Testbeleg Mehrseiten E2E grün

## Erledigt 2026-07-11 (Post-Alpha Phase 1 — BER-92)

- [x] Migration `post_alpha_gobd_hardening` (20260711075401) auf `xuqefeewzdvjhuquciut` angewendet
- [x] `beleg_seiten.archived_at` + Edge `archive-beleg-seite` liefert `archivedAt` (v16 deployed)
- [x] Duplikat-Schutz `UNIQUE (mandant_id, gobd_hash)` + Hash-Format-Checks
- [x] Trigger: Festschreibung ab `geprueft`, `beleg_seiten` unveränderlich, `audit_log` append-only
- [x] RLS aktiv auf `pending_belege` + `beleg_seiten`; offene `audit_insert`-Policy entfernt
- [x] Alpha-Migration nachträglich versioniert (`threema-decrypt/supabase/migrations/`)
- [x] n8n-Export: `archived_at` + `seite_archiviert`-Audit pro Seite ([[Decisions/ADR-03 GoBD-Härtung DB]])
- [x] 12 DB-Tests grün (Duplikat, Hash-Format, Update-/Delete-Sperren)
- [x] Live-n8n per API aktualisiert (Editor-Save scheiterte an Session; `N8N_API_KEY` jetzt in `n8n-workflows/.env`)
- [x] **E2E-Testbeleg `01-2026-0005`** (2-seitig): `archived_at` = echte Upload-Zeitpunkte, 2× `seite_archiviert` im Audit-Log
- [x] 3 PRs gemerged, BER-92 → **Done**

## Erledigt 2026-07-11 (BER-95 — Früher Push)

Folge-Issue zu BER-92: Threema-Rückfrage ~2–6 s früher (direkt nach Integritätsprüfung statt nach Storage-Upload + DB-Write).

- [x] Edge v17: Magic-Byte-Check JPEG/PNG in `decrypt-blob` (+ `detectedMime`)
- [x] RPC `append_pending_seite`: atomarer Seiten-Append, `seite_nr` serverseitig — Race bei schnellen Folgefotos eliminiert
- [x] n8n: Push nach `Blob entschlüsseln` („Seite N erhalten…"), neuer Fehlerpfad „Seite-Fehler melden" (Korrektur-Push)
- [x] Live-Instanz per API aktualisiert + verifiziert
- [x] **E2E-Test grün** (`01-2026-0007`, 2-seitig): Push spürbar früher, Seiten per RPC (`seite_nr` serverseitig), Audit vollständig

## In Arbeit 2026-07-11 (Phase 2 — BER-90 PDF-Batch)

- [x] Migration `eingangskanal_batch` angewendet (`belege.eingangskanal` + `'batch'`)
- [x] Edge v18: `archive-beleg-pdf` (Original-PDF, pdf-lib-Validierung, Hash, pageCount) + `ocr-storage-pdf` (Mistral OCR)
- [x] n8n-Workflow „BelegChat PDF-Import" (`scLbdf5AbS8ojqJD`) — per API angelegt, **aktiv**, Bearer-Auth, Fehlerpfade mit sauberen HTTP-Codes
- [x] CLI `belegchat/scripts/beleg-import/` (`import`, `watch`/Hot-Folder) — Transport getestet
- [x] Doku: `docs/PDF-IMPORT.md`, [[Research/SOP-PDF-Import]], [[Decisions/ADR-04 PDF als GoBD-Original]]
- [x] `IMPORT_API_TOKEN` serverseitig gesetzt (Marcus: docker compose up -d + environment-Passthrough)
- [x] **E2E grün:** Test-PDF → Beleg `01-2026-0008` (batch, SKR04 6930, PDF-Original + Audit) · Duplikat → 409 via Edge-Pre-Check (spart Storage/OCR)

## Erledigt 2026-07-12 (Phase 3 — BER-93 Dashboard)

- [x] Migration `phase3_dashboard_auth` (20260711135520): `mandant_credentials`, `registrierungs_codes`, Freigabe-Audit-Aktionen, Rolle `dashboard_service` + RLS ([[Decisions/ADR-05 Dashboard-Zugriffsmodell]])
- [x] Next.js: Login/Registrierung (Passkey, WebAuthn v13), Belegliste, Detail mit Audit-Trail, Freigabe-UI mit SKR04-Korrektur, Middleware
- [x] Tests grün: Isolation (38 vs 4, Kreuzzugriff 404), Freigabe + Audit, Festschreibung blockt nach `geprueft`, Production-Build ok
- [x] **Deployed:** https://app.belegchat.de (Vercel-Projekt `belegchat`, Auto-Deploy von `main`; belegchat.de bleibt bei `belegchat-landing`)
- [x] **Passkey-E2E bestanden** (2026-07-12): Registrierung + Login auf app.belegchat.de, Belegliste mandantenisoliert — **Phase 3 abgeschlossen**

## Post-Alpha (P2)

**Implementierungsplan:** [[Research/POST-ALPHA-Implementierungsplan]] · Claude Code: `belegchat/docs/POST-ALPHA-PLAN.md`

Siehe auch [[Research/Post-Alpha-Roadmap]].

| Phase | Thema | Linear | Status |
|-------|-------|--------|--------|
| 0 | Pfad-Migration Shared → `~/Entwicklung/projekte/` | — | offen |
| 1 | GoBD: Zeitstempel, Hash, Unveränderbarkeit | BER-92 | **umgesetzt** — n8n-Import + E2E offen |
| 2 | PDF-Batch CLI + n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) | offen |
| 3 | Dashboard Threema-ID + Passkey | BER-93 *(anlegen)* | offen |
| 4 | RLS final, DATEV, Landing | BER-91, BER-22 | offen |

## Kanal-Strategie

| Kanal | Phase |
|-------|-------|
| Threema Foto + **Fertig** | Alpha ✓ |
| Dashboard PDF | Post-Alpha |
| Lokales Skript / Hot-Folder | Post-Alpha |
| Threema PDF | P3 |
| E-Rechnung XML | P4+ |

## Operations / SOPs

- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Research/SOP-Threema-Belegeingang]]
- [[Research/Post-Alpha-Roadmap]]
- `belegchat/SICHERHEIT.md`
- `belegchat/docs/ALPHA-HANDOFF.md`
- `threema-decrypt/DEPLOY.md`

## SOP-Lage

| Ort | Anzahl | Hinweis |
|-----|--------|---------|
| Vault BelegChat | 2 SOPs/Roadmaps + 2 ADRs | Single Source of Truth |
| Notion | ~49 | Eigenes Migrationsprojekt — **kein Alpha-Blocker** |
| Second Brain | Sync aus Vault | `berent-2nd-brain/02 Projekte/BelegChat/` |

## Backlog (Linear)

Projekt: [BelegChat](https://linear.app/berent/project/belegchat-0db7e2580452)

## Verknüpfungen

- [[Projekt-Governance]]
- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Decisions/ADR-02 Mehrseiten-Fertig-UX]]
- [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded)
- [[Research/Post-Alpha-Roadmap]]
