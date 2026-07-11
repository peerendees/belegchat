---
tags: [adr, belegchat, entscheidung, gobd, pdf]
type: entscheidung
project: "[[BelegChat - PMO HUB]]"
status: entschieden
erstellt: 2026-07-11
entschieden_am: 2026-07-11
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# ADR-04: PDF als GoBD-Original — kein Seiten-Split

## Fragestellung

Der Post-Alpha-Plan sah eine Edge-Action „archive-pdf-pages (PDF → Seiten)" vor. Soll eine importierte PDF in Einzelseiten zerlegt und pro Seite archiviert werden (wie beim Threema-Foto-Kanal) — oder als ganze Datei?

## Entscheidung

**Die PDF wird unverändert als GoBD-Original archiviert** (Edge-Action `archive-beleg-pdf`):

- `gobd_hash` = SHA-256 der **Originaldatei**
- `beleg_seiten`: **eine** Zeile (`seite_nr 1`, `mime_type application/pdf`, `archived_at` = Upload)
- Seitenzahl (pdf-lib) im Audit-Eintrag `seite_archiviert`: `PDF (N Seiten): <pfad> sha256:<hash>`
- OCR über die gesamte PDF via Mistral OCR (`mistral-ocr-latest`), alle Seiten in einem Aufruf

## Begründung

- **GoBD:** Das empfangene Dokument ist die PDF-Datei selbst. Zerlegte Einzelseiten wären *abgeleitete* Dateien — deren Hashes belegen nicht die Unverändertheit des Originals. Beim Threema-Kanal ist das Foto pro Seite das Original; bei PDF ist es die Datei.
- **Einfachheit:** Kein Rendering/Splitting in der Edge Function (Deno ohne PDF-Rasterizer); Mistral OCR verarbeitet mehrseitige PDFs nativ.
- **Duplikat-Erkennung** bleibt trivial: `UNIQUE (mandant_id, gobd_hash)` über den Datei-Hash → HTTP 409.

## Konsequenzen

- `beleg_seiten` bildet beim Batch-Kanal nicht „eine Zeile pro Seite" ab, sondern „eine Zeile pro Originaldatei" — Konsumenten (Dashboard Phase 3) müssen `mime_type` beachten
- Ein Beleg, der über mehrere PDFs verteilt ist, wird als mehrere Belege importiert (bewusst; Zusammenführung wäre Dashboard-Funktion)
- Plan-Abweichung dokumentiert: Edge-Action heißt `archive-beleg-pdf` statt `archive-pdf-pages`

## Verknüpfungen

- [[Decisions/ADR-03 GoBD-Härtung DB]]
- [[Research/SOP-PDF-Import]]
- GitHub: `belegchat/docs/PDF-IMPORT.md`
