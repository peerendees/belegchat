# CLAUDE.md — BelegChat

> Lies diese Datei zu Beginn jeder Session. Danach: `docs/UEBERGABE.md` (Systemstand + offene Punkte) und `docs/TESTPLAN.md`.

---

## Projekt

| | |
|---|---|
| **Name** | BelegChat |
| **Linear** | https://linear.app/berent/project/belegchat-0db7e2580452 |
| **GitHub** | https://github.com/peerendees/belegchat |
| **Live** | https://belegchat.de (Landing, Template) |
| **Stack** | Next.js 15 · Supabase · Vercel · n8n · Threema · Mistral |

---

## Worum geht es

Mandanten senden Belegfotos per Threema (Alpha grün) oder später per PDF-Batch/Dashboard. n8n orchestriert OCR und KI-Kontierung (SKR04); Belege landen revisionssicher in Supabase. Post-Alpha: GoBD-Härtung, PDF-Import, Dashboard mit Threema-ID + Passkey.

---

## Arbeitsregeln

- Sprache im Code: Englisch
- Sprache in Dokumentation / Commits: Deutsch
- Commit-Format: `BER-[Issue-Nr]: [Was wurde gemacht]`
- Kein direkter Push auf `main` — Branch → PR → Merge
- DSGVO: keine personenbezogenen Daten in Logs oder Commits
- Secrets nie committen (siehe `SICHERHEIT.md`)

---

## Projektstruktur

```
belegchat/
├── CLAUDE.md                 ← diese Datei
├── docs/
│   ├── POST-ALPHA-PLAN.md    ← HAUPTPLAN — Phasen 1–4
│   ├── ALPHA-HANDOFF.md      ← Alpha-Stand (E2E grün)
│   └── vault/                ← Obsidian-Staging (PMO, ADRs, SOPs)
├── src/app/                  ← Next.js (noch Template)
├── scripts/beleg-import/     ← PDF-Batch CLI (import, watch) — docs/PDF-IMPORT.md
└── SICHERHEIT.md

threema-decrypt/              ← Edge Function (Schwester-Repo im Monorepo)
n8n-workflows/n8n/MYpHUIHNMuIUR1ic/  ← Threema-Workflow-Export
n8n-workflows/n8n/scLbdf5AbS8ojqJD/  ← PDF-Import-Workflow-Export
```

---

## Post-Alpha — Nächste Schritte

**Plan:** [`docs/POST-ALPHA-PLAN.md`](docs/POST-ALPHA-PLAN.md) · **Pfade:** [`docs/PFAD-MIGRATION.md`](docs/PFAD-MIGRATION.md)

| Phase | Thema | Linear | Status |
|-------|-------|--------|--------|
| **0** | Pfad-Migration → `~/Entwicklung/projekte/` | [BER-94](https://linear.app/berent/issue/BER-94) | ✓ |
| **1** | GoBD: Zeitstempel, Hash, Unveränderbarkeit | [BER-92](https://linear.app/berent/issue/BER-92) | ✓ |
| **2** | PDF-Batch CLI + n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) | ✓ |
| **3** | Dashboard Threema-ID + Passkey | [BER-93](https://linear.app/berent/issue/BER-93) | **aktuell** — gebaut, Passkey-E2E + Deploy offen |
| 4 | DATEV, Landing, RLS final | [BER-91](https://linear.app/berent/issue/BER-91), [BER-22](https://linear.app/berent/issue/BER-22) | offen |

**Doku:** GoBD `docs/GOBD.md` · PDF-Import `docs/PDF-IMPORT.md` · Auth `docs/AUTH.md`

---

## Infrastruktur

| Ressource | Wert |
|-----------|------|
| Supabase-Projekt | `xuqefeewzdvjhuquciut` |
| n8n | `https://n8n.srv1098810.hstgr.cloud` |
| Workflow-ID | `MYpHUIHNMuIUR1ic` |
| Test-Mandant | Threema-ID `BUMFMZ39` (Firma 01) |
| Threema Dialog | *BERENT2* (E2E) |
| Threema Abschluss | *BERENT1* (`send_simple`) |

---

## Umgebung & Secrets

- `.env.local` liegt lokal, nie committen
- Übersicht: `SICHERHEIT.md`, `threema-decrypt/DEPLOY.md`

```
DECRYPT_API_TOKEN=          # Edge + n8n
SUPABASE_SERVICE_ROLE_KEY=  # Edge Secrets (nur Edge — nie im Dashboard!)
IMPORT_API_TOKEN=           # Phase 2 n8n-Webhook (auch in n8n-Server-.env)
IMPORT_WATCH_DIR=           # Phase 2 CLI: Belege/Input
IMPORT_ARCHIVE_DIR=         # Phase 2 CLI: Belege/StB Belege {jahr}
IMPORT_ERROR_DIR=           # Phase 2 CLI: Belege/Fehler Import
DASHBOARD_DB_URL=           # Phase 3: Rolle dashboard_service via Pooler (ADR-05)
AUTH_SESSION_SECRET=        # Phase 3: Session-/Challenge-JWTs
WEBAUTHN_RP_ID=             # Phase 3: localhost | app.belegchat.de
WEBAUTHN_ORIGIN=            # Phase 3: http://localhost:3000 | https://…
```

---

## Obsidian / Vault

PMO und SOPs: `docs/vault/BelegChat/` → Sync nach `berent-2nd-brain/02 Projekte/BelegChat/`  
Sync-Anleitung: `docs/vault/README.md`

---

## Session-Übergabe

Am Ende jeder Arbeitseinheit:

1. `docs/POST-ALPHA-PLAN.md` — erledigte Checkboxen abhaken
2. Vault PMO HUB + Daily Note aktualisieren
3. Linear-Issue Status setzen
4. Committen: `BER-[Nr]: [Kurzbeschreibung]`

---

*BERENT.AI · Beratung + Entwicklung · berent.ai*
