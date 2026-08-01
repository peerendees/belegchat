# BelegChat — Übergabe & Systemstand

> **Stand: 01.08.2026** · Post-Alpha Phasen 1–4 + Erweiterungen; BER-107/108 live.
> **StB-Rückmeldung 22.07.2026 umgesetzt (Baulauf 23.07.):** BER-116/117/118/119/121 gebaut
> + gemerged, Migration angewendet.
> **2024-Korrekturstapel (K2) beim StB:** Nacherfassung 60 Belege (M4) + Korrekturexport
> `…_K2.csv` versandt (M5, Anschreiben `docs/OFFENE-FRAGEN-STB.md`) — **StB-Bestätigung
> ausstehend**. Verspätete 2024-Rechnung: StB fasst manuell nach (kein BelegChat-Schritt).
> **Revision 30.07.2026 (vor 2025/26-Import, live):** Belegnummer nach **Belegjahr** statt
> Erfassungsjahr (`naechste_beleg_nr(uuid[, date])` + BER-118 + beide n8n-Workflows), Konto
> **6520** (GewSt) in KI + Kontenrahmen gesperrt. Verfahrensdoku Ä-6; Migration
> `20260730230148_…`. 2024-Bestand endet bei `01-2024-0060`.
> **Gate-Hygiene 31.07.2026 (PR #48):** lokaler Pre-Commit-Hook läuft grün ohne `--no-verify` —
> vorbestehende Semgrep-Findings bereinigt (Skill-Fixtures in `.semgrepignore`, mail-scan
> `// nosemgrep`, CI-Action-Tags auf Commit-SHAs gepinnt).
> **2026 live (01.08.):** Erst-Batch importiert — 32 Belege `01-2026-0001…0032`, 2024-Nachzügler
> `01-2024-0061`, 0× auf 6520. Laufende Belege via Threema-Foto.
> **Import-Automatik (01.08., PR #50/#51):** Doppelklick-Launcher + geplanter LaunchAgent
> `de.berent.belegchat.import` (`watch --once` um 11:50/17:50/21:50). Threema-„Belegimport"-Befehl
> + Produkt-Backend **spezifiziert, noch nicht gebaut** → `docs/THREEMA-BELEGIMPORT-BEFEHL.md`
> (Bau im frischen Chat).
> Neue Arbeits-Session: `CLAUDE.md` lesen → bei Bedarf diese Datei + `docs/TESTPLAN.md`.

---

## System auf einen Blick

**Live:** https://app.belegchat.de (Dashboard) · belegchat.de (Landing, separates Projekt)

```
Threema-Foto (mehrseitig, „Fertig") ─┐
PDF → Belege/Input (Launcher/3×Tag) ─┼─► n8n ─► Edge (Entschlüsselung, Archiv,
Proton-Mail-Scan → Sichtung → Input ─┘         OCR, KI-Kontierung SKR04)
                                               ▼
                     Supabase: belege · beleg_seiten (Originale + SHA-256 +
                     archived_at) · audit_log (append-only) · GoBD-Trigger
                                               ▼
        Dashboard: Passkey-Login → Prüfen/Freigeben (Bewirtung: Pflichtangaben)
                     → Festschreibung → DATEV-Export (EXTF) → StB
```

| Komponente | Ort | Stand |
|------------|-----|-------|
| n8n-Workflows | `MYpHUIHNMuIUR1ic` (Threema), `scLbdf5AbS8ojqJD` (PDF) — Live-Updates per API (`n8n-workflows/.env`) | aktiv · Revision 30.07. live (Belegjahr, 6520 raus) |
| Import-Automatik | Mac-lokal: Launcher `belege-importieren.command` + LaunchAgent `de.berent.belegchat.import` (geplant 3×/Tag) → n8n PDF-Webhook | live (01.08.) · Threema-Befehl offen |
| Edge Function | `threema-decrypt` (Supabase, Deploy via `supabase functions deploy`) | aktuell |
| Dashboard | Vercel-Projekt `belegchat`, Auto-Deploy von `main` | live |
| DB-Zugriff App | Rolle `dashboard_service` via Pooler `aws-1-eu-west-1`, RLS über `app.mandant_id` (ADR-05) | aktiv |
| DATEV | EXTF 700/FV9; Berater 4050 / Mandant 22357; Gegenkonto 1800 (`firmen`) | StB-Abnahme offen |

## Feature-Stand

- Threema-Mehrseiten-Eingang mit frühem Push (BER-95) · PDF-Batch/Hot-Folder (BER-90) · Proton-Mail-Scan → Sichtungsordner (BER-97)
- Dashboard: Passkey-Auth (Multi-Passkey; NordPass-Fix `requireUserVerification:false`), Belegliste, Detail mit Audit-Trail, Freigabe mit SKR04-Korrektur, **Entwurf löschen** (Hash wird frei, Duplikatschutz bleibt)
- **Bewirtung** (§ 4 Abs. 5 Nr. 2 EStG): Auto-Erkennung → Konto 6640 + `klaerungsbedarf`; Pflichtfelder Anlass/Teilnehmer bei Freigabe erzwungen; **Trinkgeld** als eigenes Feld (KI + manuell); **Deckblatt-PDF** (Kopfseite + Originalseiten) per Link in der Detailansicht
- **Auswärts-Belege / Termin-Kontext** (BER-107, Verallgemeinerung des Bewirtungs-Musters): Auto-Erkennung Taxi/Bahn/ÖPNV → `beleg_typ auswaerts`, Konto **6860 Reisekosten**; Felder `termin_grund` (Pflicht → sonst `klaerungsbedarf`), `termin_ort`, `termin_kunde`; **Trinkgeld** generisch (Spalte `trinkgeld`, aus `bewirtung_trinkgeld` umbenannt); Termin-Kontext im DATEV-Buchungstext; **Termin-Deckblatt-PDF** (gemeinsamer Renderer mit Bewirtung)
- **Teilbeträge** (BER-108): bei Rechnungsbelegen nur einen Teil buchen (brutto **oder** netto). `betrag_*` bleibt Dokumentbetrag (GoBD); `gebucht_brutto/netto/mwst` + `teilbetrag_basis/grund` tragen die Buchung; Erfassung im Freigabe-Formular mit Live-Split-Vorschau; DATEV bucht `COALESCE(gebucht_*, betrag_*)` mit Buchungstext „(Teilbetrag)"; Audit `teilbetrag_gebucht`; `gebucht_*` nach Festschreibung gesperrt. Ein MwSt-Satz pro Teilbetrag (v1)
- DATEV-Export `/export` (Monat/Quartal/Jahr); **Export-Fassungen mit Inhalt + SHA-256** (BER-121): Re-Download liefert die gespeicherte Datei bitgleich, Korrekturfassung statt stiller Ersetzung
- **StB-Rückmeldung (BER-116/117/118/119):** Zahlungsweg je Beleg → Gegenkonto 1800/1810/2100; Vorsteuerschlüssel 90/80 (Spalte 9, kanzleibestätigt); Beleg ohne Dokument erfass-/freigebbar + Nachreichen (append-only); Nacherfassungs-Ansicht für den 2024-Altbestand
- GoBD: **Whitelist-Festschreibung** ab `geprueft` (löst Blacklist ab; jede künftige Spalte automatisch geschützt), append-only Audit, Hash-Duplikatschutz, `archived_at`; Verfahrensdoku v1.1-Ergänzungen: `docs/verfahrensdoku/AENDERUNGEN-v1.1.md`

## Initialisierung 15.07.2026 (dokumentationspflichtig)

Vor dem Echtstart wurden **alle Test-/Aufbaudaten entfernt** (44 Belege, 41 Seiten, 106 Audit-Einträge, 2 Exporte, 4 Pendings) — einmaliger, beauftragter Reset; Schutz-Trigger dafür nur innerhalb einer Transaktion deaktiviert und nachweislich reaktiviert. Storage-Objekte der Testdaten verbleiben als referenzlose Waisen im Bucket (unkritisch). Belegnummern beginnen wieder bei `01-2026-0001`. **Ab jetzt gilt: Alles im System ist Echtbestand.**

## Fahrplan 2024 → 2025 → 2026 (`docs/TESTPLAN.md`)

1. **2024 (jetzt):** PDFs → `Belege/Input`; E-Mail-Rechnungen: `mail-scan.mjs --seit 2024-01-01` → Sichtung → Input; Papier per Threema. Freigeben → `/export` Jahr 2024 → **Stapel + Verfahrensdoku an StB** (= Abnahme). Nachzügler jederzeit (Duplikatschutz).
2. **2025:** identisch; SuSa 2024 vom StB füttert das Kontierungsgedächtnis (BER-98), bevor 2025 freigegeben wird.
3. **2026:** identisch; danach Monatsrhythmus (freigeben → exportieren → senden).

## Offene Punkte

**StB-Rückmeldung — Betreiber-Schritte (Runbook `docs/AUSFUEHRUNGSPLAN-STB-RUECKMELDUNG.md`):**
✓ **M4** Nacherfassung 60 Belege · ✓ **M5** Korrekturstapel `…_K2.csv` versandt → **StB-Bestätigung
ausstehend**; nach Bestätigung 2024-Export-Status auf `uebertragen` setzen (Dashboard-Button dafür
fehlt noch — kleine Lücke; `/export` erzeugt K2 per Betreiber-Klick). **Offen:** M6 Linear-Status ·
M1 `DECRYPT_API_TOKEN` in Vercel · M3 Passkey-E2E (BER-118, Testfirma 99) · **M2** n8n „Mandant
ermitteln": bei >1 Treffer Fehlerzweig statt erster Zeile — **separat** von der Revision 30.07.
(beide Workflows wurden 30.07. live gepatcht → vor M2 aktuellen Repo-Export ziehen, nicht clobbern).

**Nächster Schritt:** **2026 ist importiert** (32 Belege `01-2026-0001…0032`); der 2024-Nachzügler
wurde bewusst mit übernommen (`01-2024-0061`) — StB bucht ihn manuell, daher **kein separater
2024-Export** dafür. **2025** folgt später (Belege noch nicht vollständig; keine manuelle Erfassung
gewünscht). Import läuft ab jetzt **automatisch (geplant 3×/Tag 11:50/17:50/21:50)** bzw. per
Doppelklick-Launcher — Dateien in `Belege/Input` werden zu den Zeiten verarbeitet (Belegjahr-Nummer,
Fallback `now()` bei fehlendem OCR-Datum). Entwicklungsseitig als Nächstes: **Threema-„Belegimport"-Befehl**
(Teil 2, `docs/THREEMA-BELEGIMPORT-BEFEHL.md`) — in frischem Chat.

Folge-Stories: BER-120 (Kontenrahmen mandantenfähig), BER-122 (mehrere MwSt-Sätze),
Feature-Registry `docs/FEATURE-WUENSCHE.md`.

| Punkt | Referenz |
|-------|----------|
| DATEV-Abnahme: realer Import beim StB (Format validiert die Kanzlei) | BER-96-Kommentare, `docs/DATEV.md` |
| Kontierungsgedächtnis bauen, sobald SuSa/Kontenblätter 2024 vorliegen | [BER-98](https://linear.app/berent/issue/BER-98) |
| Echte Bewirtungs-Muster via Threema testen (Layout/OCR, Deckblatt mit Fotos) | BER-99 |
| Landing-Feinschliff (Texte/Preise) | BER-22 |
| Secret-Verifikationen (Threema-/Supabase-/Mistral-Keys nach Alt-Leak) | `SICHERHEIT.md` §0 |
| Passkey-Selbstverwaltung im Dashboard (nice-to-have) | Chat-Angebot, kein Issue |

## Secrets-Inventar (nur Orte, keine Werte)

`belegchat/.env.local`: IMPORT_*, DASHBOARD_DB_URL, AUTH_SESSION_SECRET, WEBAUTHN_*, DECKBLATT_TOKEN, PROTON_IMAP_* · `n8n-workflows/.env`: N8N_API_KEY · n8n-Server-`.env`: THREEMA_*, SUPABASE_*, IMPORT_API_TOKEN · Supabase Edge Secrets: DECRYPT_API_TOKEN, MISTRAL_API_KEY, DECKBLATT_TOKEN u. a. · Vercel-Env (`belegchat`): wie `.env.local` (Dashboard-Teil, eigenes Prod-Session-Secret)

## Arbeitskonventionen

Branch → PR → Merge (nie direkt auf `main`) · Commits `BER-[Nr]: …` deutsch · Migrationen: anwenden via MCP/CLI **und** in `threema-decrypt/supabase/migrations/` versionieren · n8n: Live per API patchen **und** Repo-Export nachziehen · Session-Übergabe: Plan/PMO/Daily/Linear aktualisieren.
