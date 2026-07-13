# Testplan → verlässlicher Echtstand (2025 + 2026)

> Stand: 2026-07-12 · Ziel: schnellstmöglich belastbarer Produktivbetrieb.
> Grundsatz: **2026 ist der Echtbestand, 2025 ist der Benchmark** (liegt bereits beim StB — ideale Referenz, kein Doppel-Export dorthin).

## Phase A — 2026 produktiv machen (heute, ~1–2 h)

1. **Freigeben:** https://app.belegchat.de/belege — alle offenen Vorschläge (29 Stück) prüfen.
   Besonderes Augenmerk: 6 Eingangsrechnungen mit Erlöskonto `4300` → im Detail auf das
   richtige Aufwandskonto korrigieren (Dropdown), dann freigeben.
2. **Exportieren:** `/export` — je Monat 01–07/2026 einen Stapel erzeugen (oder pragmatisch
   je Quartal). Die Test-Stapel M07 (Belege 0008–0010, 0039) sind bereits erzeugt — beim StB
   als „Testdaten, bitte ignorieren" kennzeichnen oder nur die neuen Stapel senden.
3. **An StB senden** mit zwei Fragen:
   - **Beraternummer** (für den EXTF-Header; Mandantennummer liegt vor) — steht meist auch
     auf jeder BWA/SuSa-Kopfzeile
   - **Gegenkonto-Präferenz** für den Stapel (aktuell 1800 Bank; manche Kanzleien wollen
     ein Verrechnungs-/Interimskonto oder Kreditoren) → Antwort in `firmen.datev_gegenkonto`

**Erfolgskriterium:** StB importiert einen Stapel fehlerfrei in Re:wesen und gibt Feedback zu Gegenkonto/Format.

## Phase B — 2025 als Kontierungs-Benchmark (parallel, ~30 Min Maschinenzeit)

2025 ist beim StB in Arbeit/gebucht → perfekter Soll-Ist-Vergleich für die KI-Kontierung, ohne Risiko.

1. Alle PDFs aus `Belege/StB Belege 2025/` (~100 Dateien) **kopieren** nach `Belege/Input/`
   (kopieren, nicht verschieben — die Ablage bleibt unangetastet; nach Import landen die
   Kopien automatisch wieder in `StB Belege 2025/` mit ` (2)`-Suffix → Duplikat-Kopien danach löschen,
   oder Import-Ergebnis direkt aus der Belegliste prüfen)
2. `node scripts/beleg-import/beleg-import.mjs watch` laufen lassen (3-s-Pacing, Fehler landen in `Fehler Import/`)
3. **Nicht exportieren, nicht freigeben** — die 2025er bleiben im Status `vorschlag`
4. **Abgleich:** Kontenblätter/SuSa 2025 vom StB gegen die BelegChat-Kontierung halten.
   Abweichungsquote > ~20 % → SKR04-Hinweise im KI-Prompt nachschärfen (BER-Backlog)

**Erfolgskriterium:** Erfassungsquote (wie viele PDFs sauber durchlaufen) + Kontierungstrefferquote sind bekannt; daraus abgeleitete Prompt-Verbesserungen.

## Phase C — Echtbetrieb + Threema-Abschlusstest (laufend)

1. **Threema-E2E** (letzter offener Baustein des Gesamt-E2E): 1 Mehrseiten-Beleg als Foto
   via Threema (`BUMFMZ39`) senden → „Seite 1 erhalten…" → `Fertig` → im Dashboard prüfen
2. Ab sofort: neue Belege per Threema-Foto oder `Belege/Input/`
3. **Monatsrhythmus:** Monatsanfang → Vormonat freigeben → `/export` → CSV an StB

## Statusmatrix Gesamt-E2E

| Baustein | Status |
|----------|--------|
| Batch-PDF → Beleg | ✅ getestet (28er-Backfill + `01-2026-0039`) |
| Dashboard Freigabe + Audit | ✅ getestet |
| DATEV-Export + Re-Download | ✅ getestet (`EXTF_Buchungsstapel_2026_M07.csv`) |
| Threema Mehrseiten | ✅ Phase 1/95 (`01-2026-0007`) — nach den Workflow-Updates 1× wiederholen (Phase C.1) |
| DATEV-Import beim StB | ⬜ finale Abnahme |
