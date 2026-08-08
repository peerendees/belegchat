---
type: projekt-hub
tags: [projekt, belegchat, entwicklung]
status: aktiv
phase: post-alpha
erstellt: 2026-07-10
aktualisiert: 2026-08-08
language: de
source: claude
chat_url: unbekannt
governance: "[[Projekt-Governance]]"
related:
  - "[[Research/POST-ALPHA-Implementierungsplan]]"
  - "[[Decisions/ADR-02 Mehrseiten-Fertig-UX]]"
  - "[[Decisions/ADR-03 GoBD-Härtung DB]]"
---

# BelegChat

> Threema-basierter Belegeingang mit OCR, KI-Kontierung (SKR04) und revisionssicherer Speicherung in Supabase.

## Projektziel

Mandanten senden Belegfotos per Threema; der Workflow extrahiert Daten, schlägt ein Sachkonto vor und legt einen Datensatz in Supabase an. Status initial: `vorschlag` (manuell prüfbar nach Alpha).

## Status

| Phase | Stand |
|-------|-------|
| **Beta** | Threema E2E Einzelseite grün (2026-07-10, Beleg `01-2026-0003`) |
| **Alpha** | **E2E grün** (2026-07-11, Beleg `01-2026-0004`, Mehrseiten + GoBD) |
| **Post-Alpha** | **Phase 1 GoBD abgeschlossen** (DB + Edge + n8n live, E2E `01-2026-0005`, 2026-07-11) — PRs offen |
| **Echtbetrieb** | seit 2026-07-15 initialisiert; Stand 2026-08-08: **130 Belege** |

> [!info] Nachtrag 08.08.2026
> Diese Datei endete zuvor am 12.07.2026 — vier Wochen Arbeit (BER-97 bis BER-131) waren
> nie eingetragen. Am 08.08. Issue für Issue nachgezogen aus Linear, den Git-Historien
> beider Repos, `belegchat/journal/daily/` und `docs/audits/`. Die Einträge unten geben
> wieder, was belegt ist; wo eine Aussage nur aus einer Commit-Nachricht stammt, steht es
> dabei.

## Erledigt 2026-07-10 (Beta)

- [x] Auth `DECRYPT_API_TOKEN` an Supabase-Nodes
- [x] `Prüfe Inhalt`: `raw.text` statt `raw.plaintext`
- [x] OCR/Kontierung über Supabase Edge Function
- [x] SOP Threema-Belegeingang im Vault
- [x] Mandanten-Guard, Signaturprüfung, Fehlerpfad

## Erledigt 2026-07-11 (Alpha)

- [x] Mehrseiten-UX: Scan + Scan + **`Fertig`** ([[Decisions/ADR-02 Mehrseiten-Fertig-UX]])
- [x] Threema-Gateway-Split: Dialog *BERENT2* (E2E), Abschluss *BERENT1* (`send_simple`)
- [x] PKCS7-Padding Send + Strip Receive (Edge Function v15)
- [x] n8n-Loop-Fix (leere Delivery-Callbacks)
- [x] GoBD: Storage, `gobd_hash`, `beleg_seiten`, `audit_log`
- [x] Workflow live per n8n API (ID `MYpHUIHNMuIUR1ic`)
- [x] E2E-Test Mehrseiten grün (`01-2026-0004`)

### Alpha Definition of Done

- [x] Mandant kann 1–n Seiten per Threema mit **`Fertig`** abschließen
- [x] Ein `belege`-Satz mit verknüpften Storage-Dateien
- [x] `gobd_hash` und `audit_log` bei Erfassung
- [x] SOP beschreibt Flow inkl. GoBD + Troubleshooting
- [x] Testbeleg Mehrseiten E2E grün

## Erledigt 2026-07-11 (Post-Alpha Phase 1 — BER-92)

- [x] Migration `post_alpha_gobd_hardening` (20260711075401) auf `xuqefeewzdvjhuquciut` angewendet
- [x] `beleg_seiten.archived_at` + Edge `archive-beleg-seite` liefert `archivedAt` (v16 deployed)
- [x] Duplikat-Schutz `UNIQUE (mandant_id, gobd_hash)` + Hash-Format-Checks
- [x] Trigger: Festschreibung ab `geprueft`, `beleg_seiten` unveränderlich, `audit_log` append-only
- [x] RLS aktiv auf `pending_belege` + `beleg_seiten`; offene `audit_insert`-Policy entfernt
- [x] Alpha-Migration nachträglich versioniert (`threema-decrypt/supabase/migrations/`)
- [x] n8n-Export: `archived_at` + `seite_archiviert`-Audit pro Seite ([[Decisions/ADR-03 GoBD-Härtung DB]])
- [x] 12 DB-Tests grün (Duplikat, Hash-Format, Update-/Delete-Sperren)
- [x] Live-n8n per API aktualisiert (Editor-Save scheiterte an Session; `N8N_API_KEY` jetzt in `n8n-workflows/.env`)
- [x] **E2E-Testbeleg `01-2026-0005`** (2-seitig): `archived_at` = echte Upload-Zeitpunkte, 2× `seite_archiviert` im Audit-Log
- [x] 3 PRs gemerged, BER-92 → **Done**

## Erledigt 2026-07-11 (BER-95 — Früher Push)

Folge-Issue zu BER-92: Threema-Rückfrage ~2–6 s früher (direkt nach Integritätsprüfung statt nach Storage-Upload + DB-Write).

- [x] Edge v17: Magic-Byte-Check JPEG/PNG in `decrypt-blob` (+ `detectedMime`)
- [x] RPC `append_pending_seite`: atomarer Seiten-Append, `seite_nr` serverseitig — Race bei schnellen Folgefotos eliminiert
- [x] n8n: Push nach `Blob entschlüsseln` („Seite N erhalten…"), neuer Fehlerpfad „Seite-Fehler melden" (Korrektur-Push)
- [x] Live-Instanz per API aktualisiert + verifiziert
- [x] **E2E-Test grün** (`01-2026-0007`, 2-seitig): Push spürbar früher, Seiten per RPC (`seite_nr` serverseitig), Audit vollständig

## In Arbeit 2026-07-11 (Phase 2 — BER-90 PDF-Batch)

- [x] Migration `eingangskanal_batch` angewendet (`belege.eingangskanal` + `'batch'`)
- [x] Edge v18: `archive-beleg-pdf` (Original-PDF, pdf-lib-Validierung, Hash, pageCount) + `ocr-storage-pdf` (Mistral OCR)
- [x] n8n-Workflow „BelegChat PDF-Import" (`scLbdf5AbS8ojqJD`) — per API angelegt, **aktiv**, Bearer-Auth, Fehlerpfade mit sauberen HTTP-Codes
- [x] CLI `belegchat/scripts/beleg-import/` (`import`, `watch`/Hot-Folder) — Transport getestet
- [x] Doku: `docs/PDF-IMPORT.md`, [[Research/SOP-PDF-Import]], [[Decisions/ADR-04 PDF als GoBD-Original]]
- [x] `IMPORT_API_TOKEN` serverseitig gesetzt (Marcus: docker compose up -d + environment-Passthrough)
- [x] **E2E grün:** Test-PDF → Beleg `01-2026-0008` (batch, SKR04 6930, PDF-Original + Audit) · Duplikat → 409 via Edge-Pre-Check (spart Storage/OCR)

## Erledigt 2026-07-12 (Phase 3 — BER-93 Dashboard)

- [x] Migration `phase3_dashboard_auth` (20260711135520): `mandant_credentials`, `registrierungs_codes`, Freigabe-Audit-Aktionen, Rolle `dashboard_service` + RLS ([[Decisions/ADR-05 Dashboard-Zugriffsmodell]])
- [x] Next.js: Login/Registrierung (Passkey, WebAuthn v13), Belegliste, Detail mit Audit-Trail, Freigabe-UI mit SKR04-Korrektur, Middleware
- [x] Tests grün: Isolation (38 vs 4, Kreuzzugriff 404), Freigabe + Audit, Festschreibung blockt nach `geprueft`, Production-Build ok
- [x] **Deployed:** https://app.belegchat.de (Vercel-Projekt `belegchat`, Auto-Deploy von `main`; belegchat.de bleibt bei `belegchat-landing`)
- [x] **Passkey-E2E bestanden** (2026-07-12): Registrierung + Login auf app.belegchat.de, Belegliste mandantenisoliert — **Phase 3 abgeschlossen**

## Erledigt 2026-07-12 (Phase 4 — BER-96 DATEV-Export)

- [x] EXTF-Buchungsstapel (700/FV9, 120 Spalten, Latin-1) — Layout nach produktiver ERPNext-DATEV-Referenz
- [x] `/export` im Dashboard: Zeitraum → CSV-Download, Belege `geprueft → exportiert` + Audit, Re-Download deterministisch
- [x] Migration `phase4_datev_export`: firmen-DATEV-Stammdaten, Grants/RLS `datev_exporte`
- [x] Tests grün: Export `EXTF_Buchungsstapel_2026_M07.csv` (3 Belege, 46,60 €), Doppel-Export 404, Isolation 404, Re-Download identisch
- [x] BER-91 (RLS) als bereits-erledigt geschlossen (war Teil von BER-92)
- [ ] **Offen:** Berater-/Mandantennummer vom StB in `firmen` · finale Abnahme = realer DATEV-Import

## Erledigt 2026-07-12 (Phase 4 — Abschluss)

- [x] Landing: Anmelden-Link → app.belegchat.de (belegchat-landing#1)
- [x] Secret-Rotation-Audit: `n8n-workflows` privat ✓, Alt-Secrets nur noch in privater Historie, RLS überall ✓; 3 manuelle Verifikationen offen (Threema-/Supabase-/Mistral-Secrets — SICHERHEIT.md Abschnitt 0)
- [x] Gesamt-E2E Batch→Freigabe→Export grün (`01-2026-0039`); Threema-Wiederholung in [[../../TESTPLAN|Testplan]] Phase C
- [x] Testplan Echtstand: `docs/TESTPLAN.md` (A: 2026 freigeben+exportieren · B: 2025 als Kontierungs-Benchmark · C: Echtbetrieb + Threema-Test)

**Post-Alpha-Plan damit vollständig abgearbeitet** — offen nur externe Schritte (StB-Nummern, DATEV-Abnahme, Threema-Foto, Secret-Verifikationen).

## Erledigt 2026-07-13 bis 07-18 (Echtbetrieb-Vorbereitung)

- [x] **BER-97 Proton-Mail-Scan** (13.07.): E-Mail-Rechnungen automatisch in den Beleg-Input
- [x] **BER-99 Bewirtungsbelege + Entwurf löschen** (18.07.): Auto-Erkennung → 6640 + Klärungsbedarf, Pflichtfelder Anlass/Teilnehmer, Trinkgeld-Feld (KI + manuell, Deckblatt + DATEV-Buchungstext), Deckblatt-PDF per Edge-Rendering
- [x] **Initialisierung 15.07.**: alle Testdaten entfernt (44 Belege, 106 Audit-Einträge, 2 Exporte), Schutz-Trigger nur transaktional deaktiviert und verifiziert reaktiviert. **Ab hier Echtbestand**, Nummern ab `01-2026-0001`
- [x] NordPass-Passkey-Fix (`requireUserVerification: false`)

## Erledigt 2026-07-19/20 (Erfassungslücken aus dem Echtbetrieb — BER-107..115)

Neun Befunde aus dem laufenden Erfassen, an zwei Tagen abgearbeitet.

- [x] **BER-107 Termin-Kontext für Auswärts-Belege** (Taxi, Bahn, ÖPNV): Ort, Kunde, Grund + Trinkgeld
- [x] **BER-108 Teilbeträge bei Rechnungsbelegen**: nur einen Teil buchen (brutto **oder** netto); `betrag_*` bleibt Dokumentbetrag (GoBD), `gebucht_*` trägt die Buchung, DATEV bucht `COALESCE(gebucht_*, betrag_*)` mit Buchungstext „(Teilbetrag)"
- [x] **BER-109 Anlagevermögen/AfA erkennen**: Klärungsbedarf + StB-Vermerk im DATEV-Export (Migration `stb_vermerk` + Festschreibung)
- [x] **BER-110 Plausibilitätsprüfung Netto/Brutto** → Klärungsbedarf, plus Konto 6805 Telefon. Prüft bewusst nur `netto + mwst = brutto` — verträgt Mischsätze und wurde deshalb von BER-122 nicht angefasst
- [x] **BER-111 Import-Watcher**: Scan-Lock gegen überlappende Läufe (Rate-Limit + Belegnummern-Kollision)
- [x] **BER-112 Detailansicht**: Navigation vor/zurück per Pfeiltasten — am 20.07. nachgebessert, die Vorgänger-Navigation zeigte auf den Beleg selbst
- [x] **BER-113 Beleg manuell erfassen** + Originaldokument nachreichen (DB-Schicht 20.07.: Grants + RLS) — **später von BER-118 revidiert**
- [x] **BER-114 Zeitanzeige**: serverseitige Formatierung nutzte UTC statt Europe/Berlin (2 Stunden zurück)
- [x] **BER-115 DATEV-Export**: Jahres-Auswahl aus den Belegdaten statt fester Spanne — 2024 fehlte in der Auswahl
- [x] Ohne eigenes Issue: DATEV-Buchungstext Latin-1-sicher gemacht (19.07.)

## Erledigt 2026-07-22/23 (StB-Rückmeldung — Konzeption + Baulauf S0–S7)

Die Rückmeldung der Steuerkanzlei erzeugte sechs zusammenhängende Stories. Erst Konzeption
mit Specs, konsolidierter Migration, Strukturprüfung und Runbook, dann ein **serieller
Baulauf S0–S7** an einem Tag. Abschlussnotiz: `belegchat/journal/daily/2026-07-23-baulauf.md`.

- [x] **S1 Konsolidierte Migration** auf Prod angewendet + **14 Trigger-Tests grün** (Rollback-Transaktion)
- [x] **BER-116 Zahlungsweg am Beleg**: Gegenkonto 1800 (Geschäftskonto) / 1810 (alternativ) / 2100 (privat)
- [x] **BER-117 Vorsteuer im Buchungsstapel**: BU-/Steuerschlüssel pro Beleg in Spalte 9, Konfigurationstabelle `steuerschluessel` mit `mwst_satz`-Schlüssel (Seeds 19→`90`, 7→`80`, kanzleibestätigt). **Diese Tabelle ist die Vorleistung, die BER-122 später additiv möglich gemacht hat**
- [x] **BER-121 DATEV-Exporte nachvollziehbar**: Inhalts-Hash, Versionierung, Korrekturfassungen, Einfrieren
- [x] **BER-119 Altbestand 2024 nacherfassen** und korrigierten Buchungsstapel neu ausliefern
- [x] **BER-118 Beleg ohne Dokument freigeben** + Dokument nach der Festschreibung nachreichen (revidiert BER-113)
- [x] Korrektur des 2024-Altbestands vor der Erstabgabe (6 Fehlkontierungen, Belegnummern 2026→2024) + Verfahrensdoku Ä-5.1
- [x] Audits: `docs/audits/2026-07-22-validierung-ber-116-119.md`, `docs/audits/2026-07-23-strukturpruefung-ausbaustufe.md`

> [!important] Der Trigger-Test hat einen echten Fehler gefunden
> **T10 meldete `42P17 infinite recursion detected in policy for relation "beleg_seiten"`.**
> Die neue Policy `dash_seiten_insert` referenzierte `beleg_seiten` aus einer Policy *auf*
> `beleg_seiten` heraus. Kein Live-Pfad war betroffen (n8n schreibt als `service_role` an RLS
> vorbei, der manuelle Upload-Pfad war noch nicht gebaut), aber die Policy war falsch. Fix als
> eigene Korrektur-Migration: Policy auf reinen Mandanten-Scope reduziert, die fachliche Regel
> in einen `SECURITY DEFINER`-`BEFORE INSERT`-Trigger verlagert.
> **Diese Regel ist seither Projektwissen** — BER-122 hat ihre Policies von Anfang an ohne
> Selbstbezug gebaut, statt erneut hineinzulaufen.

> [!warning] Nicht geprüft im Baulauf
> Die **interaktive E2E-Prüfung hinter dem Passkey-Login ist nicht erfolgt** (in dieser
> Umgebung kein Login möglich). Abgesichert sind die DB-Semantik über die 14 Rollback-Tests
> auf Prod und typecheck/lint/build je PR — nicht die Oberfläche.

## Erledigt 2026-07-30/31 (Revision vor dem 2025/26-Import)

- [x] **Belegnummer nach Belegjahr** statt Erfassungsjahr (`naechste_beleg_nr(uuid, date)`), Konto 6520 deaktiviert — Migration `20260730230148`
- [x] **PDF-Import Einmal-Modus** (`watch --once`) + Doppelklick-Launcher
- [x] **Semgrep-Gate-Hygiene**: vorbestehende Findings bereinigt, Pre-Commit-Hook läuft grün (belegchat #48)
- [x] Übergabe-Stand 31.07.: Revision live, K2 beim Steuerberater

## Erledigt 2026-08-01 (Threema-Befehl + Buchungstext — BER-124, BER-126)

- [x] **BER-124 Threema-Befehl „Belegimport"**: Import vom Handy anstoßen, mit voller Ergebnis-Rückmeldung — Poller, Bilanz-Ausgabe, Import-Sperre, eigene Migration, dritter n8n-Workflow (`6GDS7NzfiTRavKjr`) für die Ergebnismeldung. Freigabe pro Threema-ID über `mandanten.import_befehl_aktiv` (Default `false`)
- [x] **BER-126 DATEV-Buchungstext**: der Termin-Kontext hing hinten am Buchungstext und wurde von der 60-Zeichen-Grenze faktisch immer abgeschnitten. Jetzt in den Zusatzinformations-Feldern mit 210 Zeichen Platz. Dazu die Einmal-Korrektur `termin_ort` an Beleg `01-2026-0035` vor dem ersten Auswärts-Export + Verfahrensdoku Ä-7
- [ ] **BER-125 offen**: Import-Befehl im Dashboard verwalten (berechtigte Threema-IDs, Kommando-Historie, „Import jetzt")

## Erledigt 2026-08-02 (n8n-Instandsetzung + zwei Belegprüfungs-Lücken)

Tagesnotiz: `belegchat/journal/daily/2026-08-02-n8n-instandsetzung-und-belegpruefung.md`.

- [x] **BER-128 n8n-Backup und GitHub-Sync instand gesetzt** (Projekt *n8n und Infrastruktur*): seit Monaten abgeschaltet. Sechs Befunde, darunter zwei mit Schadenspotenzial — der Sync hätte nach jedem Update aktualisierte Workflows **abgeschaltet** (auch den BelegChat-Threema-Eingang), und der Cleanup-Zweig löschte frisch geschriebene Sicherungen. Beide Zweige **stillgelegt statt repariert**. Beide Workflows aktiv seit 13:06, Dauerbetrieb im Regellauf bestätigt
- [x] **BER-129 Freigabe ohne Belegdatum verhindert** — der Export schrieb sonst still den 1. Januar. Server + Oberfläche
- [x] **BER-130 Verwerfen eines Entwurfs wird protokolliert**; Nummernvergabe entschieden (Variante B: Lücke oder Wiederverwendung, beides zulässig) — Verfahrensdoku Ä-8
- [ ] **BER-127 offen**: Threema-Gateway-Secret (*BERENT1) rotieren — lag im Klartext im Backup-Workflow und in der Git-Historie. Node auf `$env` umgestellt, **Rotation ist Betreiber-Sache** (Projekt *n8n und Infrastruktur*)

> [!note] Das Muster des 02.08.: eine Information an zwei Stellen
> Dreimal derselbe Fehlertyp, zweimal mit Schaden — die Workflow-`id` (Datei vs.
> Sync-Erwartung) erzeugte zwei Doppelgänger auf demselben Webhook-Pfad, die
> Dateinamen-Regel (Extrahieren vs. Cleanup) löschte Sicherungen. Konsequenz fürs Projekt:
> vor dem Ändern einer Regel nach weiteren Verwendungen suchen, und Datei-Historie mit
> `git log --name-status` prüfen statt mit `git diff A..B` — ein Bereichs-Diff verschweigt
> Dateien, die im selben Bereich angelegt und wieder gelöscht wurden.

## Erledigt 2026-08-06/07 (Dashboard-Feinschliff — BER-131)

- [x] **BER-131 Original-Beleg als Gesamt-PDF herunterladen** + Deckblatt-Retry
- [x] B+E-Favicon und PWA-Icon-Set im Dashboard, Web-Manifest; `favicon.ico` für Safari nachgezogen
- [x] **Ausbaustufen-Backlog angelegt** (07.08.): BER-132 Mandantenfähigkeit & Abo · BER-133 Mandantentrennung & Betreibersicht · BER-134 Onboarding automatisieren · BER-135 Abo/Abrechnung/Modul-Dashboard · BER-136 Reisekosten-Modul · BER-137 Erlösseite · BER-138 Storno & Generalumkehr · BER-139 Zahlungsabgleich CAMT/MT940 — alle offen

## Erledigt 2026-08-08 (BER-122 Stufe 1 — Mehrere MwSt-Sätze)

Restaurant- und Supermarktbelege führen 7 % und 19 % nebeneinander; `belege` trug bisher
genau einen Satz. Stufe 1 verankert das Datenmodell, **bevor** App und Export darauf
aufsetzen — die riskanteste Entscheidung zuerst.

- [x] Satellitentabelle `beleg_steuerzeilen` (Satz, Netto, MwSt, generiertes Brutto, BU-Schlüssel je Zeile)
- [x] **Additiv:** 0 Zeilen = Ein-Satz-Beleg (gesamter Bestand, keine Rückmigration) · ≥ 2 Zeilen = Mehrsatz · genau 1 Zeile verboten
- [x] Konsistenz-Trigger als **`CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`** — als Row-Trigger hätte er jeden legalen Mehrsatz-Beleg blockiert
- [x] **Zweiter** Konsistenz-Trigger auf `belege` — sonst wäre die Ausschlussregel über die Elterntabelle umgehbar
- [x] Eigener Festschreibungs-Trigger (strenger als `beleg_seiten`: INSERT/UPDATE/DELETE gesperrt); `belege`-Whitelist unberührt
- [x] RLS + 4 Policies, Mandant über den Join auf `belege`, **ohne** Selbstbezug (42P17-Lehre aus Baulauf S1)
- [x] Verhaltenstests T1–T12 gegen das angewendete Schema, Rollback, 0 Rückstände — plus **Signal-Test**, weil ein leeres Ergebnis nur Abwesenheit von Rot beweist
- [x] Angewendet auf Produktion (`20260808190814`); Bestand unverändert: 130 Belege, 0 Steuerzeilen
- [x] **Nachtrag:** Advisor meldete beide neuen `SECURITY DEFINER`-Funktionen als REST-RPC-aufrufbar für `anon`/`authenticated` → `EXECUTE` entzogen (`20260808191128`), Trigger per Signal-Test weiterhin intakt
- [x] Folge-Stories BER-140..143 angelegt und verkettet

**Reihenfolge gegenüber der Spec getauscht:** Export **vor** Erfassung. Könnte die Freigabe
Zeilen schreiben, bevor der Export sie liest, entstünde ein Buchungssatz ohne BU-Schlüssel
und mit dem vollen Belegbetrag — beim Steuerberater eine falsche Vorsteueraufteilung, nach
BER-121 nur per Korrekturfassung behebbar.

| Stufe | Issue | Inhalt | Stand |
|---|---|---|---|
| 1 | [BER-122](https://linear.app/berent/issue/BER-122) | Datenmodell + Trigger + RLS | **angewendet 08.08., Issue Done** |
| 2 | [BER-140](https://linear.app/berent/issue/BER-140) | DATEV-Export `belegRow → belegRows` | **startklar** |
| 3 | [BER-141](https://linear.app/berent/issue/BER-141) | Steuerzeilen-Editor + Freigabe-Route | offen |
| 4 | [BER-142](https://linear.app/berent/issue/BER-142) | n8n: KI-Schema `steuerzeilen[]` | offen |
| 5 | [BER-143](https://linear.app/berent/issue/BER-143) | Abnahme end-to-end, dann v1-Beschränkung entfernen | offen |

## Post-Alpha (P2)

**Implementierungsplan:** [[Research/POST-ALPHA-Implementierungsplan]] · Claude Code: `belegchat/docs/POST-ALPHA-PLAN.md`

Siehe auch [[Research/Post-Alpha-Roadmap]].

| Phase | Thema | Linear | Status |
|-------|-------|--------|--------|
| 0 | Pfad-Migration Shared → `~/Entwicklung/projekte/` | [BER-94](https://linear.app/berent/issue/BER-94) | **erledigt** |
| 1 | GoBD: Zeitstempel, Hash, Unveränderbarkeit | [BER-92](https://linear.app/berent/issue/BER-92) | **erledigt** |
| 2 | PDF-Batch CLI + n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) | **erledigt** |
| 3 | Dashboard Threema-ID + Passkey | [BER-93](https://linear.app/berent/issue/BER-93) | **erledigt** (Passkey-E2E 12.07., deployed) |
| 4 | DATEV, Landing, RLS final | [BER-91](https://linear.app/berent/issue/BER-91), [BER-22](https://linear.app/berent/issue/BER-22) | DATEV-Export gebaut; finale StB-Abnahme offen |

## Kanal-Strategie

| Kanal | Phase |
|-------|-------|
| Threema Foto + **Fertig** | Alpha ✓ |
| Dashboard PDF | Post-Alpha |
| Lokales Skript / Hot-Folder | Post-Alpha |
| Threema PDF | P3 |
| E-Rechnung XML | P4+ |

## Operations / SOPs

- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Research/SOP-Threema-Belegeingang]]
- [[Research/Post-Alpha-Roadmap]]
- `belegchat/SICHERHEIT.md`
- `belegchat/docs/ALPHA-HANDOFF.md`
- `threema-decrypt/DEPLOY.md`

## SOP-Lage

| Ort | Bestand | Hinweis |
|-----|---------|---------|
| Vault BelegChat | `Research/` (4 SOPs + 2 Roadmaps/Pläne) · `Decisions/` (ADR-01..05) | Single Source of Truth |
| Notion | ~49 | Eigenes Migrationsprojekt — **kein Alpha-Blocker** |
| Second Brain | Sync aus Vault | `/Users/kunkel/BERENT-2nd-Brain/02 Projekte/BelegChat/` |

**Research:** [[Research/SOP-Threema-Belegeingang]] · [[Research/SOP-PDF-Import]] · [[Research/SOP-Dashboard-Auth]] · [[Research/SOP-DATEV-Export]] · [[Research/POST-ALPHA-Implementierungsplan]] · [[Research/Post-Alpha-Roadmap]]

**Decisions:** [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded) · [[Decisions/ADR-02 Mehrseiten-Fertig-UX]] · [[Decisions/ADR-03 GoBD-Härtung DB]] · [[Decisions/ADR-04 PDF als GoBD-Original]] · [[Decisions/ADR-05 Dashboard-Zugriffsmodell]]

> Die frühere Fassung dieser Tabelle zählte „2 SOPs/Roadmaps + 2 ADRs" — falsch seit dem
> 12.07. Ein Zähler, der eine Liste beschreibt, veraltet still. Deshalb steht die Liste
> jetzt daneben.

## Erledigt 2026-08-08 (Interaktive E2E hinter dem Passkey-Login)

Seit dem Baulauf am 23.07. offen: die DB-Semantik war über Trigger-Tests abgesichert, die
Oberfläche dahinter nie interaktiv geprüft. Nachgeholt am 08.08. gegen einen lokalen
Dev-Server, der auf die **Produktionsdatenbank** zeigt — deshalb strikt lesend.

**Zugang ohne WebAuthn-Zeremonie:** Die Session ist ein HS256-JWT mit `AUTH_SESSION_SECRET`
(`src/lib/session.ts`). Für den Lauf wurde ein gültiges Token mit derselben Signatur-Logik
erzeugt und als Cookie gesetzt. Das prüft alles **hinter** dem Login, ohne einen Authenticator
zu brauchen. Die Zeremonie selbst ist davon unberührt — sie ist am 12.07. manuell bestanden.

| # | Prüfung | Ergebnis |
|---|---|---|
| T1 | `/belege` ohne Session | Redirect auf `/login` — Middleware greift |
| T2 | Session Firma 99 → Liste | „Testfirma BelegChat · 0 Belege" bei 130 Belegen in der DB — RLS greift |
| T3 | Fremder Beleg per direkter ID (Seite) | **404**, kein Leak |
| T4 | `POST /freigeben` auf fremden Beleg, vollständiger Payload | **404 „Beleg nicht gefunden"** — nicht 409 „bereits exportiert". Die RLS wirkt in der Route selbst |
| T5 | **Signal-Test**: verfälschte JWT-Signatur | abgewiesen (Redirect); gültiges Token 200 — die Prüfung hat Zähne |
| T6 | Session Firma 01 → Liste | 130 Belege, Statusverteilung stimmig (38 + 26 + 1 = 65 zur Freigabe) |
| T7 | Detailseite eines exportierten Belegs | rendert, Audit-Log-Abschnitt vorhanden, **kein** Freigabe-Button (festgeschrieben) |
| T8 | Original-Download (BER-131) | echtes PDF, 1,3 MB, `Original_01-2024-0001.pdf` |
| T9 | Freigabe-Formular (Auswärts-Beleg) | alle Felder aus BER-107/109/110/116/117 vorhanden; `buSchluessel` = genau `90`/`80`; Sachkonten enthalten **6805**, **6520 fehlt** (31.07. deaktiviert); Button gesperrt: „Zahlungsweg wählen, um freizugeben" |
| T10 | Audit-Log auf der Detailseite | Abschnitt rendert, Aktionen erkennbar |
| T11 | Export-Seite (BER-115) | Jahresauswahl **2026 / 2025 / 2024** aus den Belegdaten, Zeitraum monat/quartal/jahr |

**Read-only nachgewiesen:** nach dem Lauf 0 geänderte Belege, 0 neue Audit-Einträge, 0 neue
Exporte (Fenster 2 h). Serverlog ohne Fehler; die Konsolen-404/405/422 sind exakt die eigenen
Negativ-Tests. Session-Token danach gelöscht.

> [!warning] Zwei Reste bleiben offen
> **Freigabe absenden** und **Export erzeugen** wurden bewusst nicht ausgeführt — beide
> schreiben auf Produktion und sind unter GoBD nicht rücknehmbar (Freigabe schreibt fest,
> Export erzeugt eine Fassung mit Inhalts-Hash). Machbar wäre das am Test-Mandanten Firma 99
> mit einem synthetischen Beleg; der bliebe dort dauerhaft stehen.
> **Die WebAuthn-Zeremonie** (Registrierung/Login) ist nicht Teil dieses Laufs — sie braucht
> einen echten Authenticator und wurde am 12.07. manuell bestätigt.

## Offene Punkte (Stand 08.08.2026)

Zusammengezogen aus den Abschnitten oben — Wahrheit bleibt Linear.

| Thema | Issue | Anmerkung |
|---|---|---|
| Mehrsatz-Belege Stufen 2–5 | BER-140..143 | BER-140 startklar, Rest verkettet |
| Import-Befehl im Dashboard verwalten | BER-125 | Ergänzung zu BER-124 |
| Kontenrahmen mandantenfähig, SKR03-Reste | BER-120 | |
| Vollständigkeitsexport (Vertragsende) | BER-123 | |
| Lieferanten-Kontierungsgedächtnis | BER-98 | Anlernen aus 2024 |
| Ausbaustufe Mandantenfähigkeit & Abo | BER-132..139 | Backlog vom 07.08. |
| **Threema-Gateway-Secret rotieren** | BER-127 | Projekt *n8n und Infrastruktur* — **Betreiber-Sache** |
| Supabase-Advisor-Altbefunde | *(kein Issue)* | 3 `SECURITY DEFINER`-Views auf **ERROR**-Level, 3 RPC-exponierte Alt-Funktionen, `pg_trgm` in `public` — am 08.08. aufgefallen |
| Interaktive E2E hinter dem Passkey-Login | *(kein Issue)* | **am 08.08. nachgeholt** — 11 Prüfungen grün, read-only gegen Produktion. Zwei Reste: Freigabe absenden und Export erzeugen (beides irreversibel) |
| Finale DATEV-Abnahme durch den Steuerberater | — | inkl. Notations-Prüfpunkt `90`/`80` vs. `9`/`8`, siehe BER-143 |

## Backlog (Linear)

Projekt: [BelegChat](https://linear.app/berent/project/belegchat-0db7e2580452)

## Verknüpfungen

- [[Projekt-Governance]]
- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Decisions/ADR-02 Mehrseiten-Fertig-UX]]
- [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded)
- [[Research/Post-Alpha-Roadmap]]
