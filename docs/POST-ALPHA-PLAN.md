# BelegChat Post-Alpha — Implementierungsplan

> **Claude Code Einstieg:** Lies zuerst [`CLAUDE.md`](../CLAUDE.md), dann diese Datei.  
> **Stand:** 2026-07-11 · Alpha E2E grün (`01-2026-0004`)

## Ausgangslage

| Bereich | Stand |
|---------|-------|
| **Alpha** | Threema Mehrseiten E2E grün (`01-2026-0004`) |
| **GoBD-Basis** | SHA-256, Storage `belege-archiv`, `beleg_seiten`, `audit_log` — Lücken bei Zeitstempel, Hash-Eindeutigkeit, Unveränderbarkeit |
| **App** | Next.js-Template ohne Routen, ohne Auth |
| **PDF/Batch** | Nur in Roadmap beschrieben |
| **Mandantenfähigkeit** | Backend: `mandanten.threema_id`; Frontend: fehlt |

## Phasen-Übersicht

```
Phase 0 Pfad-Migration → Phase 1 GoBD → Phase 2 Batch → Phase 3 Dashboard → Phase 4 Querschnitt
```

| Phase | Ziel | Doku |
|-------|------|------|
| **0** | Shared → `~/Entwicklung/projekte/` | [`PFAD-MIGRATION.md`](PFAD-MIGRATION.md) · `scripts/migrate-to-home-entwicklung.sh` |
| **1** | Zeitstempel, Hash-Eindeutigkeit, Unveränderbarkeit | BER-92 *(in Linear anlegen)* |
| **2** | CLI/Hot-Folder PDF-Import via n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) (Batch) |
| **3** | Dashboard Auth + Freigabe-UI | BER-93 *(in Linear anlegen)* |
| **4** | DATEV, Landing, Tests | [BER-22](https://linear.app/berent/issue/BER-22), [BER-91](https://linear.app/berent/issue/BER-91) |

---

## Phase 0 — Pfad-Migration (vor Phase 1)

**Ziel:** BelegChat-Stack von `/Users/Shared/Projekte/Entwicklung/projekte/` nach `~/Entwicklung/projekte/`.

Details: [`PFAD-MIGRATION.md`](PFAD-MIGRATION.md)

```bash
# 1. Einmalig als admin:
su admin
sudo /Users/Shared/Projekte/Entwicklung/projekte/belegchat/scripts/fix-shared-ownership.sh

# 2. Als kunkel:
./scripts/migrate-to-home-entwicklung.sh --yes --remove-stub --fix-permissions
```

### Kurzfassung

- `~/Entwicklung` ≠ `/Users/Shared/Projekte/Entwicklung/projekte` — zwei Bäume
- **Kanonisch heute:** Shared (Alpha, POST-ALPHA-PLAN)
- **Ziel:** `~/Entwicklung/projekte/` (laut `cursor-workspaces.txt`)
- **Löschen:** `~/Entwicklung/projekte/belegchat-project` (veralteter Stub)
- **Konsolidieren:** 3× n8n-workflows → eine Kopie
- **Danach:** Pfade in Doku/Skripten aktualisieren

### DoD Phase 0

- [ ] BelegChat-Stack unter `~/Entwicklung/projekte/`
- [ ] Claude Code + Cursor Workspace am neuen Pfad
- [ ] Optional: Symlink Legacy → neu für Übergang


## Phase 1 — GoBD: Zeitstempel, Hash, Unveränderbarkeit

**Ziel:** Technische GoBD-Grundlage vervollständigen (keine formale BMF-Verfahrensdokumentation in dieser Phase).

### Aufgaben

- [x] Migration `post_alpha_gobd_hardening.sql` in `threema-decrypt/supabase/migrations/` (`20260711075401`)
- [x] Alpha-Migration `alpha_multipage_gobd` versionieren (fehlt im Repo)
- [x] `archived_at` in Edge `archive-beleg-seite` + `beleg_seiten` (Edge v16 deployed)
- [x] Audit `seite_archiviert` pro Seite in n8n — *Export + Live-Instanz (per API, 2026-07-11)*
- [x] `UNIQUE (mandant_id, gobd_hash)` + Hash-Format-Constraint
- [x] DB-Trigger: Unveränderbarkeit bei `geprueft`, `audit_log` append-only
- [x] RLS auf `pending_belege`, `beleg_seiten`, `belege` (User-Policy Phase 3)
- [x] `docs/GOBD.md` + Vault ADR-03

### DoD

- [x] Testbeleg mit `archived_at` pro Seite, Duplikat-Test, Audit `seite_archiviert`
  - 12 Trigger-/Constraint-Tests grün (inkl. Duplikat) + E2E-Testbeleg `01-2026-0005` (2-seitig, echte Upload-Zeitstempel, 2× `seite_archiviert`) — 2026-07-11
- [x] Migration angewendet auf Supabase `xuqefeewzdvjhuquciut`

**Phase 1 DoD erfüllt** — Rest: PRs mergen (threema-decrypt#2, n8n-workflows#11, belegchat#1)

**Repo-Pfade:** `threema-decrypt/supabase/functions/threema-decrypt/index.ts`, `n8n-workflows/n8n/MYpHUIHNMuIUR1ic/`

---

## Phase 2 — PDF-Batch-Import (CLI zuerst)

**Ziel:** Zweiter Eingangskanal ohne UI — Hot-Folder/CLI, Pipeline ab Archiv/OCR wie Alpha.

### Aufgaben

- [x] n8n-Webhook `belegchat-import-pdf` (Bearer `IMPORT_API_TOKEN`) — Workflow `scLbdf5AbS8ojqJD`, aktiv
- [x] Edge Action `archive-beleg-pdf` — *statt `archive-pdf-pages`: PDF bleibt ungeteiltes GoBD-Original, siehe ADR-04* (+ `ocr-storage-pdf`, Edge v18)
- [x] `eingangskanal: batch` in Beleg-Metadaten (Migration `eingangskanal_batch`)
- [x] CLI `scripts/beleg-import/` (`import`, `watch`)
- [x] `docs/PDF-IMPORT.md` + Vault SOP-PDF-Import + ADR-04

### DoD

- [x] CLI importiert Test-PDF → Beleg `01-2026-0008` mit `eingangskanal: batch` (2026-07-11)
- [x] GoBD-Felder wie Threema-Kanal — PDF-Original mit Hash + `archived_at`, Audit vollständig, Duplikat → 409 (Edge-Pre-Check)

**Phase 2 DoD erfüllt** — Rest: PRs mergen (threema-decrypt#4, n8n-workflows#13, belegchat#3)

---

## Phase 3 — Dashboard: Threema-ID + Passkey

**Ziel:** Web-UI für Belegliste, Freigabe, optional PDF-Upload — mandantenisoliert.

### Auth-Modell

| Komponente | Technik |
|------------|---------|
| Login | Threema-ID → Passkey (WebAuthn) |
| Verifikation | 6-stelliger Code per Threema *BERENT2* (MVP: Admin-Provisioning für BUMFMZ39) |
| Session | JWT/Cookie mit `mandant_id` |
| DB | `mandant_credentials` |

### App-Routen (neu)

- `src/app/login/`, `src/app/register/`
- `src/app/belege/`, `src/app/belege/[id]/`
- `src/app/api/auth/*`, `src/middleware.ts`

### Aufgaben

- [x] `@simplewebauthn/server` + `@simplewebauthn/browser` v13, `jose`, `postgres` — *statt `@supabase/supabase-js`: dedizierte DB-Rolle `dashboard_service`, siehe ADR-05*
- [x] RLS mandantenisoliert — *via `current_setting('app.mandant_id')` statt `auth.jwt()`: kein Supabase-Key im App-Server nötig (ADR-05); Catch-all-Policy `belege_authenticated_lesen` entfernt*
- [x] Freigabe-UI + `audit_log` (`beleg_freigegeben`, `dokumentation_bestaetigt`; `konto_geaendert`/`status_change` via Bestands-Trigger `belege_audit`)
- [x] `docs/AUTH.md` + Vault SOP-Dashboard-Auth + ADR-05

### DoD

- [ ] Passkey-Login für Test-Mandant `BUMFMZ39` — *API-seitig getestet (Optionen/Challenges); echte Passkey-Zeremonie: Nutzer-Test auf `/register` mit provisioniertem Code offen*
- [x] Nur eigene Belege sichtbar (BUMFMZ39: 38, VDUZ9S7E: 4, Kreuzzugriff 404); Freigabe gesperrt durch Phase-1-Trigger (Update nach `geprueft` blockiert)

**Deploy offen:** Vercel-Envs + `WEBAUTHN_RP_ID`/`ORIGIN` auf Produktions-Domain

---

## Phase 4 — Querschnitt

- DATEV-Export (eigenes Issue nach Phase 3)
- Landing Page BER-22
- Secret-Rotation (`SICHERHEIT.md`)
- E2E: Threema + Batch-PDF + Dashboard-Freigabe

---

## Dokumentations-Ordnung

| Inhalt | Obsidian Vault | GitHub `belegchat/` |
|--------|----------------|---------------------|
| PMO, Status | `docs/vault/BelegChat/BelegChat - PMO HUB.md` | — |
| Dieser Plan | `docs/vault/BelegChat/Research/POST-ALPHA-Implementierungsplan.md` | `docs/POST-ALPHA-PLAN.md` |
| Claude Code | — | `CLAUDE.md` |
| GoBD | `Research/GOBD-Technische-Anforderungen.md` (Phase 1) | `docs/GOBD.md` |
| PDF-Import | `Research/SOP-PDF-Import.md` (Phase 2) | `docs/PDF-IMPORT.md` |
| Auth | `Research/SOP-Dashboard-Auth.md` (Phase 3) | `docs/AUTH.md` |

**Regel:** Vault = PMO/Entscheidungen/SOPs · GitHub = Implementierung + Claude Code

---

## Claude Code — Startprompt

```
cd ~/Entwicklung/projekte/belegchat
# Phase 0 zuerst (PFAD-MIGRATION.md), dann Phase 1 GoBD
Lies CLAUDE.md und docs/POST-ALPHA-PLAN.md
```

Geschätzter Umfang: Phase 1 ≈ 1 Session · Phase 2 ≈ 1–2 · Phase 3 ≈ 2–3
