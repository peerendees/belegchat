---
tags: [sop, belegchat, pdf, batch]
type: sop
project: "[[BelegChat - PMO HUB]]"
erstellt: 2026-07-11
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# SOP: PDF-Batch-Import

> Zweiter Eingangskanal (BER-90): PDFs per CLI oder Hot-Folder → n8n → GoBD-Archiv.
> Technik-Doku: `belegchat/docs/PDF-IMPORT.md` · Entscheidung: [[Decisions/ADR-04 PDF als GoBD-Original]]

## Voraussetzungen

1. `IMPORT_API_TOKEN` in `belegchat/.env.local` **und** identisch in der `.env` der n8n-Instanz (`srv1098810`), danach n8n-Neustart
2. n8n-Workflow „BelegChat PDF-Import" (`scLbdf5AbS8ojqJD`) aktiv
3. Mandant existiert in `mandanten` (Threema-ID, `aktiv = true`) — Test: `BUMFMZ39`

## Bedienung

```bash
cd ~/Entwicklung/projekte/belegchat

# Einzelne PDFs
node scripts/beleg-import/beleg-import.mjs import rechnung.pdf

# Hot-Folder (Dauerbetrieb)
node scripts/beleg-import/beleg-import.mjs watch ~/BelegChat-Eingang
```

Hot-Folder-Verhalten: alle 5 s Scan; Erfolg → `importiert/`, Fehler → `fehler/` + `<name>.err.txt`.

## Was passiert pro PDF

1. Webhook prüft Bearer-Token, Pflichtfelder, Größe (max 15 MB)
2. Mandant-Lookup über `threema_id`
3. Edge `archive-beleg-pdf`: Original-PDF → Storage `belege-archiv`, SHA-256, Seitenzahl (pdf-lib)
4. Edge `ocr-storage-pdf`: Mistral OCR über alle Seiten
5. KI-Kontierung (SKR04) — identischer Prompt wie Threema-Kanal
6. `belege` (`eingangskanal: batch`, `status: vorschlag`) + `beleg_seiten` (1× `application/pdf`, `archived_at`) + `audit_log` (`erstellt` + `seite_archiviert`)

## Troubleshooting

| Symptom | Ursache / Abhilfe |
|---------|-------------------|
| `503 IMPORT_API_TOKEN … nicht konfiguriert` | Token fehlt in n8n-`.env` → setzen, n8n neu starten |
| `401 Unauthorized` | Token in `.env.local` ≠ n8n-`.env` |
| `406/404` | Threema-ID nicht in `mandanten` oder `aktiv = false` |
| `409` | Duplikat — dieselbe PDF wurde für den Mandanten schon importiert |
| `422` | Datei beschädigt oder kein PDF |
| CLI: `IMPORT_API_TOKEN fehlt` | `belegchat/.env.local` anlegen (Vorlage in `docs/PDF-IMPORT.md`) |

## Verknüpfungen

- [[Decisions/ADR-04 PDF als GoBD-Original]]
- [[Research/SOP-Threema-Belegeingang]]
- [[BelegChat - PMO HUB]]
