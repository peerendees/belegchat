---
type: governance
project: "[[BelegChat - PMO HUB]]"
language: de
backlog_tool: linear
backlog_url: "https://linear.app/berent/project/belegchat-0db7e2580452"
backlog_filter: "project:BelegChat"
backlog_id_prefix: BER
risk_register: disabled
financials_tool: none
financials_url: ""
pipeline_workflow_id: "MYpHUIHNMuIUR1ic"
erstellt: 2026-07-10
aktualisiert: 2026-07-11
source: claude
chat_url: unbekannt
---

# Projekt-Governance — BelegChat

> Tool-Stack und Konventionen für BelegChat. Single Source of Truth für Ops, Deploy und Backlog-Bezug.

## Tool-Stack

| Funktion | Tool | URL / Pfad |
|----------|------|-----------|
| Backlog | Linear | [BelegChat-Projekt](https://linear.app/berent/project/belegchat-0db7e2580452) |
| Code App | GitHub / lokal | `belegchat/` |
| Landing | Vercel | belegchat.de |
| Workflow | n8n (Hostinger) | https://n8n.srv1098810.hstgr.cloud |
| Edge Functions | Supabase | `xuqefeewzdvjhuquciut` |
| Datenbank | Supabase Postgres | `public.belege`, `public.mandanten` |
| Threema Dialog | Gateway *BERENT2* (E2E) | msgapi.threema.ch — `send_e2e` |
| Threema Abschluss | Gateway *BERENT1* | msgapi.threema.ch — `send_simple` |
| KI (OCR + Kontierung) | Mistral via Supabase | Secrets in Edge Function |
| Doku Vault (Staging) | `belegchat/docs/vault/` | Vor Sync ins Second Brain |
| Doku Second Brain | Obsidian | `berent-2nd-brain/02 Projekte/BelegChat/` |
| Doku Claude Code | `belegchat/CLAUDE.md` + `docs/POST-ALPHA-PLAN.md` |

## n8n-Workflow

| Feld | Wert |
|------|------|
| Name | BelegChat mit Threema Beleg-Eingang |
| ID | `MYpHUIHNMuIUR1ic` |
| Export (Repo) | `n8n-workflows/n8n/MYpHUIHNMuIUR1ic/` |
| Patch-Skripte | `n8n-workflows/scripts/fix-*.mjs` |

## Secrets (Übersicht — Werte nie hier eintragen)

| Variable | Wo |
|----------|-----|
| `DECRYPT_API_TOKEN` | Supabase Edge Secrets + n8n env |
| `MISTRAL_API_KEY` | Supabase Edge Secrets only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Secrets |
| `SUPABASE_SERVICE_KEY` | n8n env |
| Threema *BERENT2* | n8n env (`THREEMA_*`, E2E) |
| Threema *BERENT1* | n8n env (`secret1`, `threemaFrom`) |

## Verantwortliche

- Owner: Peer
- Beta-Mandant Test: Threema-ID `BUMFMZ39` (Firma 01)

## Phasen

| Phase | Status | Meilenstein |
|-------|--------|-------------|
| Beta | ✓ | Einzelseite `01-2026-0003` |
| Alpha | ✓ | Mehrseiten `01-2026-0004` |
| Post-Alpha | Plan steht | `docs/POST-ALPHA-PLAN.md` — Phase 1 GoBD offen |
