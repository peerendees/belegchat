# BelegChat — Übergabe & Systemstand

> **Stand: 15.07.2026** · Abschluss der Aufbau-Session (Post-Alpha Phasen 1–4 + Erweiterungen).
> Neue Arbeits-Session: `CLAUDE.md` lesen → bei Bedarf diese Datei + `docs/TESTPLAN.md`.

---

## System auf einen Blick

**Live:** https://app.belegchat.de (Dashboard) · belegchat.de (Landing, separates Projekt)

```
Threema-Foto (mehrseitig, „Fertig") ─┐
PDF → Belege/Input (Watch-CLI) ──────┼─► n8n ─► Edge (Entschlüsselung, Archiv,
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
| n8n-Workflows | `MYpHUIHNMuIUR1ic` (Threema), `scLbdf5AbS8ojqJD` (PDF) — Live-Updates per API (`n8n-workflows/.env`) | aktiv |
| Edge Function | `threema-decrypt` (Supabase, Deploy via `supabase functions deploy`) | aktuell |
| Dashboard | Vercel-Projekt `belegchat`, Auto-Deploy von `main` | live |
| DB-Zugriff App | Rolle `dashboard_service` via Pooler `aws-1-eu-west-1`, RLS über `app.mandant_id` (ADR-05) | aktiv |
| DATEV | EXTF 700/FV9; Berater 4050 / Mandant 22357; Gegenkonto 1800 (`firmen`) | StB-Abnahme offen |

## Feature-Stand

- Threema-Mehrseiten-Eingang mit frühem Push (BER-95) · PDF-Batch/Hot-Folder (BER-90) · Proton-Mail-Scan → Sichtungsordner (BER-97)
- Dashboard: Passkey-Auth (Multi-Passkey; NordPass-Fix `requireUserVerification:false`), Belegliste, Detail mit Audit-Trail, Freigabe mit SKR04-Korrektur, **Entwurf löschen** (Hash wird frei, Duplikatschutz bleibt)
- **Bewirtung** (§ 4 Abs. 5 Nr. 2 EStG): Auto-Erkennung → Konto 6640 + `klaerungsbedarf`; Pflichtfelder Anlass/Teilnehmer bei Freigabe erzwungen; **Trinkgeld** als eigenes Feld (KI + manuell); **Deckblatt-PDF** (Kopfseite + Originalseiten) per Link in der Detailansicht
- DATEV-Export `/export` (Monat/Quartal/Jahr), Re-Download deterministisch; Trinkgeld erscheint im Buchungstext
- GoBD: Festschreibung ab `geprueft`, append-only Audit, Hash-Duplikatschutz, `archived_at`; Verfahrensdoku: `docs/Verfahrensdokumentation_BelegChat_v1.0.docx` (BERENT-CI)

## Initialisierung 15.07.2026 (dokumentationspflichtig)

Vor dem Echtstart wurden **alle Test-/Aufbaudaten entfernt** (44 Belege, 41 Seiten, 106 Audit-Einträge, 2 Exporte, 4 Pendings) — einmaliger, beauftragter Reset; Schutz-Trigger dafür nur innerhalb einer Transaktion deaktiviert und nachweislich reaktiviert. Storage-Objekte der Testdaten verbleiben als referenzlose Waisen im Bucket (unkritisch). Belegnummern beginnen wieder bei `01-2026-0001`. **Ab jetzt gilt: Alles im System ist Echtbestand.**

## Fahrplan 2024 → 2025 → 2026 (`docs/TESTPLAN.md`)

1. **2024 (jetzt):** PDFs → `Belege/Input`; E-Mail-Rechnungen: `mail-scan.mjs --seit 2024-01-01` → Sichtung → Input; Papier per Threema. Freigeben → `/export` Jahr 2024 → **Stapel + Verfahrensdoku an StB** (= Abnahme). Nachzügler jederzeit (Duplikatschutz).
2. **2025:** identisch; SuSa 2024 vom StB füttert das Kontierungsgedächtnis (BER-98), bevor 2025 freigegeben wird.
3. **2026:** identisch; danach Monatsrhythmus (freigeben → exportieren → senden).

## Offene Punkte

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
