---
type: plan
project: "[[BelegChat - PMO HUB]]"
status: aktiv
erstellt: 2026-07-11
aktualisiert: 2026-07-11
tags: [belegchat, post-alpha, gobd, claude-code]
source: claude
chat_url: unbekannt
---

# Post-Alpha Implementierungsplan

> **Claude Code:** Repo-Datei [`belegchat/docs/POST-ALPHA-PLAN.md`](../../../../POST-ALPHA-PLAN.md) (relativ vom Repo-Root).  
> **Einstieg:** `CLAUDE.md` im Repo-Root.

## Status

| Phase | Thema | Linear | Stand |
|-------|-------|--------|-------|
| — | Alpha E2E | [BER-89](https://linear.app/berent/issue/BER-89) | ✓ Done |
| **0** | Pfad-Migration | — | offen |
| **1** | GoBD-Härtung | BER-92 *(in Linear anlegen)* | offen |
| **2** | PDF-Batch CLI | [BER-90](https://linear.app/berent/issue/BER-90) | offen (Batch) |
| **3** | Dashboard Auth | BER-93 *(in Linear anlegen)* | offen |
| **4** | Querschnitt | BER-91, BER-22 | offen |

Details: `belegchat/docs/PFAD-MIGRATION.md`

## Reihenfolge

0. **Pfad-Migration** — Shared → `~/Entwicklung/projekte/` (vor allem anderen)
1. **GoBD** — `archived_at`, Hash-Eindeutigkeit, Trigger, RLS-Basis
2. **Batch** — `scripts/beleg-import/` + n8n Import-Webhook (vor Dashboard)
3. **Dashboard** — Threema-ID + Passkey, `/belege`, Freigabe-UI

## Phase 1 — GoBD (Kurz)

- Migration `post_alpha_gobd_hardening.sql`
- Zeitstempel bei Archivierung (`archived_at`)
- `UNIQUE (mandant_id, gobd_hash)`
- Unveränderbarkeit + `audit_log` append-only
- Doku: `docs/GOBD.md`, ADR-03

## Phase 2 — PDF-Batch (Kurz)

- n8n Webhook `belegchat-import-pdf`
- Edge `archive-pdf-pages`
- CLI Hot-Folder
- Doku: `docs/PDF-IMPORT.md`, ADR-04

## Phase 3 — Dashboard (Kurz)

- WebAuthn Passkey + Threema-ID
- `mandant_credentials`, RLS pro Mandant
- Routes `/belege`, Freigabe-UI
- Doku: `docs/AUTH.md`, ADR-05

## Doku-Ordnung

| Ort | Rolle |
|-----|-------|
| **GitHub** `docs/POST-ALPHA-PLAN.md` | Claude Code — detaillierter Plan mit Checkboxen |
| **Vault** diese Datei | Obsidian — Übersicht + Linear-Links |
| **Vault** [[Research/Post-Alpha-Roadmap]] | Fachliche Roadmap (Features) |
| **Vault** [[BelegChat - PMO HUB]] | Projektstatus |

## Claude Code Start

```text
cd ~/Entwicklung/projekte/belegchat
# Phase 0: PFAD-MIGRATION.md, dann POST-ALPHA-PLAN.md Phase 1
```

## Verknüpfungen

- [[BelegChat - PMO HUB]]
- [[Research/Post-Alpha-Roadmap]]
- [[Projekt-Governance]]
- `belegchat/docs/ALPHA-HANDOFF.md`
