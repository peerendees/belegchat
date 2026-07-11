# PDF-Batch-Import (Phase 2, BER-90)

> Stand: 2026-07-11 · Zweiter Eingangskanal neben Threema — CLI/Hot-Folder → n8n-Webhook → GoBD-Archiv
> Vault: `Research/SOP-PDF-Import` · Entscheidung: `Decisions/ADR-04 PDF als GoBD-Original`

## Architektur

```
CLI beleg-import ──POST──► n8n Webhook belegchat-import-pdf (Bearer IMPORT_API_TOKEN)
                              │  Mandant via threema_id (mandanten-Tabelle)
                              ▼
                   Edge archive-beleg-pdf   → Original-PDF nach belege-archiv, SHA-256, pageCount
                   Edge ocr-storage-pdf     → Mistral OCR (mistral-ocr-latest) über alle Seiten
                   Edge mistral-chat        → KI-Kontierung (SKR04, wie Threema-Kanal)
                              ▼
                   belege (eingangskanal: batch) + beleg_seiten (1× application/pdf) + audit_log
```

**Workflow-ID:** `scLbdf5AbS8ojqJD` („BelegChat PDF-Import") · Export: `n8n-workflows/n8n/scLbdf5AbS8ojqJD/`

## GoBD (ADR-04)

Die PDF wird **unverändert als Original** archiviert — `gobd_hash` = SHA-256 der Originaldatei,
`beleg_seiten` erhält **eine** Zeile (`seite_nr 1`, `mime_type application/pdf`, `archived_at` = Upload-Zeitpunkt).
Kein Seiten-Split: zerlegte Einzelseiten wären abgeleitete Dateien, deren Hashes das Original nicht belegen.
Die Seitenzahl steht im `seite_archiviert`-Audit-Eintrag (`PDF (N Seiten): …`).

Duplikat-Schutz wie Threema-Kanal: `UNIQUE (mandant_id, gobd_hash)` → erneuter Import derselben Datei
liefert HTTP 409.

## CLI

```bash
# Einzelimport
node scripts/beleg-import/beleg-import.mjs import rechnung.pdf [weitere.pdf ...]

# Hot-Folder (alle 5 s; erledigt → importiert/, Fehler → fehler/ + .err.txt)
node scripts/beleg-import/beleg-import.mjs watch ~/BelegChat-Eingang
```

Konfiguration in `belegchat/.env.local` (nie committen):

```
IMPORT_API_TOKEN=…      # muss identisch in der n8n-Instanz gesetzt sein
IMPORT_WEBHOOK_URL=https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf
IMPORT_THREEMA_ID=BUMFMZ39
```

Limits: max. 15 MB pro PDF, nur `%PDF-`-Dateien; Edge validiert zusätzlich per pdf-lib.

## Server-Voraussetzung (einmalig)

In der `.env` der n8n-Instanz (`srv1098810.hstgr.cloud`) muss stehen:

```
IMPORT_API_TOKEN=<gleicher Wert wie in belegchat/.env.local>
```

Danach n8n neu starten. Ohne den Wert antwortet der Webhook mit `503 IMPORT_API_TOKEN … nicht konfiguriert`
(bewusst: kein Fallback, kein unauthentifizierter Betrieb).

## Fehlerverhalten

| HTTP | Bedeutung |
|------|-----------|
| 401 | Token falsch |
| 400 | `threemaId`/`pdfBase64` fehlt |
| 404/406 | Mandant unbekannt oder inaktiv |
| 409 | Duplikat (gleiche PDF für diesen Mandanten bereits archiviert) |
| 413 | PDF zu groß |
| 422 | Keine valide PDF (Magic Bytes / pdf-lib) |
| 503 | Token serverseitig nicht konfiguriert |

## DoD-Nachweis

- [ ] `IMPORT_API_TOKEN` in n8n-Instanz gesetzt (manuell)
- [ ] CLI importiert Test-PDF → Beleg `eingangskanal: batch`, `beleg_seiten` + `audit_log` wie Threema-Kanal
- [ ] Duplikat-Test: zweiter Import derselben PDF → 409
