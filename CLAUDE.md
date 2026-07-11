# CLAUDE.md — BelegChat

> Lies diese Datei zu Beginn jeder Session. Danach: `docs/POST-ALPHA-PLAN.md` und ggf. `docs/ALPHA-HANDOFF.md`.

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
├── scripts/                  ← beleg-import CLI (Phase 2, noch leer)
└── SICHERHEIT.md

threema-decrypt/              ← Edge Function (Schwester-Repo im Monorepo)
n8n-workflows/n8n/MYpHUIHNMuIUR1ic/  ← Live-Workflow-Export
```

---

## Post-Alpha — Nächste Schritte

**Plan:** [`docs/POST-ALPHA-PLAN.md`](docs/POST-ALPHA-PLAN.md) · **Pfade:** [`docs/PFAD-MIGRATION.md`](docs/PFAD-MIGRATION.md)

| Phase | Thema | Linear | Status |
|-------|-------|--------|--------|
| **0** | Pfad-Migration Shared → `~/Entwicklung/projekte/` | — | offen |
| **1** | GoBD: Zeitstempel, Hash, Unveränderbarkeit | BER-92 *(anlegen)* | offen |
| 2 | PDF-Batch CLI + n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) | offen |
| 3 | Dashboard Threema-ID + Passkey | BER-93 *(anlegen)* | offen |
| 4 | DATEV, Landing, RLS final | BER-91, BER-22 | offen |

**Start:** Phase 0 — `./scripts/migrate-to-home-entwicklung.sh --dry-run` (siehe `docs/PFAD-MIGRATION.md`)

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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DECRYPT_API_TOKEN=          # Edge + n8n
SUPABASE_SERVICE_ROLE_KEY=  # Edge Secrets
IMPORT_API_TOKEN=           # Phase 2 n8n-Webhook
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
