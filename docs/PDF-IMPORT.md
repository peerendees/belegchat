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

# Watch auf den Input-Ordner (Standard aus IMPORT_WATCH_DIR)
node scripts/beleg-import/beleg-import.mjs watch
```

**Watch-Konzept (StB-Ablage in iCloud):**

```
Belege/Input/               ← hier PDFs ablegen (Hot-Folder, 5-s-Scan)
Belege/StB Belege {jahr}/   ← Erfolg: Datei wandert in die Jahres-Ablage
Belege/Fehler Import/       ← Fehler & Duplikate, jeweils mit <name>.err.txt
```

Das `{jahr}` ist das **Belegjahr**: primär das KI-erkannte `beleg_datum`, sonst das Jahr aus der Beleg-Nr, sonst das aktuelle Jahr. Bei Namenskollision im Ziel wird ` (2)` angehängt, nichts wird überschrieben.

iCloud-Besonderheiten: `.icloud`-Platzhalter werden per `brctl download` angestoßen; eine Datei wird erst importiert, wenn ihre Größe über zwei Scans (≈5 s) stabil ist.

Konfiguration in `belegchat/.env.local` (nie committen):

```
IMPORT_API_TOKEN=…      # muss identisch in der n8n-Instanz gesetzt sein
IMPORT_WEBHOOK_URL=https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf
IMPORT_THREEMA_ID=BUMFMZ39
IMPORT_WATCH_DIR=…/Papierlos/Steuerberater/Belege/Input
IMPORT_ARCHIVE_DIR=…/Papierlos/Steuerberater/Belege/StB Belege {jahr}
IMPORT_ERROR_DIR=…/Papierlos/Steuerberater/Belege/Fehler Import
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

## DoD-Nachweis (2026-07-11)

- [x] `IMPORT_API_TOKEN` in n8n-Instanz gesetzt (docker compose up -d + environment-Passthrough)
- [x] CLI importiert Test-PDF → Beleg `01-2026-0008` (`eingangskanal: batch`, SKR04 `6930`, `beleg_seiten` 1× `application/pdf` mit `archived_at`, Audit `erstellt` + `seite_archiviert`)
- [x] Duplikat-Test: zweiter Import derselben PDF → `409 Duplikat: bereits archiviert als 01-2026-0008` (Edge-Pre-Check vor Upload/OCR — keine Storage-/OCR-Kosten für Duplikate)
