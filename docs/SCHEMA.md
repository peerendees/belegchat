# SCHEMA.md — Datenbankübersicht BelegChat

> Stand: 23.07.2026 · beschreibt den Zielzustand NACH der konsolidierten Migration
> `20260723_stb_rueckmeldung_konsolidiert.sql` (Spalten daraus mit ◆ markiert).
> Wahrheit sind die Migrationen in `threema-decrypt/supabase/migrations/`; diese
> Datei ist die lesbare Landkarte. **Pflegeregel:** Jede Story, die das Schema
> ändert, zieht diese Datei nach (DoD-Zeile in `specs/TEMPLATE.md`).
>
> Festschreibungs-Legende (Spalte „FS" für `belege`): 🔒 = ab Status
> `geprueft`/`exportiert` eingefroren (Whitelist-Trigger) · ➕ = einmalig
> NULL → Wert auch danach · 🔓 = frei · Sonderregeln als Fußnote.

## belege (Kern; 46 Spalten)

| Spalte | Typ | FS | Zweck / Story |
|---|---|---|---|
| id | uuid PK | 🔒 | |
| beleg_nr | text UNIQUE | 🔒 | `FF-JJJJ-NNNN` via `naechste_beleg_nr(uuid)` |
| buchungsjahr/-quartal/-monat | smallint generiert | (folgt beleg_datum) | aus `beleg_datum`; vom Trigger-Vergleich ausgenommen |
| eingangskanal | text CHECK threema\|frontend_upload\|batch | 🔒 | |
| threema_sender_id | text | 🔒 | bei frontend_upload = Session-Threema-ID |
| beleg_datum | date | 🔒 | Export-Zeitraumfilter; Pflicht bei manueller Erfassung (BER-118) |
| betrag_brutto/-netto, mwst_satz, mwst_betrag | numeric | 🔒 | Dokumentbeträge (OCR bzw. manuell) |
| beleg_typ | text CHECK (7 Werte) | 🔒 | steuert S/H, Pflichtfelder, Deckblatt |
| verwendungszweck | text | 🔒 | DATEV-Buchungstext |
| sachkonto | varchar FK skr04_konten | 🔒 | SKR04; FK entfällt mit BER-120 (Trigger-Ersatz) |
| sachkonto_ki_vorschlag, sachkonto_manuell_geaendert | varchar / bool | 🔒 | KI-Nachvollzug |
| vendor_id | uuid | 🔒 | Alt (kein FK-Ziel mehr aktiv) |
| status | text CHECK neu\|in_verarbeitung\|vorschlag\|klaerungsbedarf\|geprueft\|exportiert | nur geprueft→exportiert | |
| ablehnungsgrund, ocr_konfidenz | text / numeric | 🔒 | |
| gobd_hash | text CHECK hex64, UNIQUE (mandant_id, gobd_hash) | ➕¹ | SHA-256 Seite 1 bzw. PDF (BER-92/118) |
| bild_storage_path | text | ➕¹ | Storage-Pfad Original |
| datev_export_id | uuid FK datev_exporte | ➕ | Wurzel-Export; bleibt bei Korrekturfassungen unverändert (BER-121) |
| export_datum | timestamptz | ➕ | |
| geprueft_am, geprueft_von, created_at | | 🔒 | geprueft_von ungenutzt (auth.users-FK) |
| updated_at | timestamptz | 🔓 | Trigger `belege_updated_at` |
| mandant_id | uuid FK mandanten | 🔒 | RLS-Anker (`app.mandant_id`) |
| bewirtung_anlass, bewirtung_teilnehmer | text | 🔒² | § 4(5) Nr. 2 EStG (BER-99) |
| trinkgeld | numeric | 🔒² | BER-107; im Buchungstext |
| termin_grund/-ort/-kunde | text | 🔒² | BER-107; im Buchungstext |
| gebucht_brutto/-netto/-mwst, teilbetrag_basis, teilbetrag_grund | numeric/text | 🔒 | Teilbeträge (BER-108) |
| stb_vermerk | text | 🔒³ | DATEV-Zusatzinfo 1 (BER-109) |
| ◆ zahlungsweg | text CHECK geschaeftskonto\|alternativkonto\|privat | ➕⁴ | Pflichtauswahl Freigabe (BER-116) |
| ◆ gegenkonto | varchar(10) CHECK numerisch | ➕⁴ | aufgelöstes DATEV-Gegenkonto, EXTF Spalte 8 (BER-116) |
| ◆ bu_schluessel | varchar(4) CHECK numerisch | ➕ | EXTF Spalte 9, Gate `vorsteuer_relevant` (BER-117) |
| ◆ dokument_fehlt | boolean NOT NULL DEFAULT false | true→false⁵ | Kennzeichen „ohne Beleg erfasst" (BER-118); Export-Zusatzinfo 2 |

¹ nur gemeinsam (Kopplung im Trigger) · ² seit 20260723 geschützt (vorher
Sperrlisten-Lücke) · ³ ausdrücklich KEINE Fortschreibung nach Festschreibung ·
⁴ nur gemeinsam; CHECK erzwingt Paar auch im offenen Zustand · ⁵ nur im selben
UPDATE wie `gobd_hash` NULL → Wert.

Indexe: PK, beleg_nr unique, status, beleg_datum, Zeitraum, datev_export_id,
(mandant_id, gobd_hash) partial-unique, ◆ dokument_fehlt partial,
◆ Nacherfassung partial (status='exportiert' AND zahlungsweg IS NULL).

## steuerschluessel ◆ (BER-117)

`id uuid PK · firma_nr char(2) FK firmen · typ vorsteuer|umsatzsteuer ·
mwst_satz numeric(5,2) · bu_schluessel varchar(4) · bezeichnung · bestaetigt bool
(true = kanzleibestätigt) · aktiv · created_at · UNIQUE (firma_nr, typ,
mwst_satz)`. Seeds: 19→`90`, 7→`80` je Firma 01/99 (typ vorsteuer; kanzleibestätigt
23.07.2026; DATEV-Standardnotation wäre 9/8 — Prüfpunkt Testimport). Pflege per SQL.
RLS: nur `dash_steuerschluessel_select` (true).

## datev_exporte (+ BER-121 ◆)

Bestand: id, buchungsjahr, monat, quartal, zeitraum_von/bis/typ, anzahl_belege,
Summen, datei_pfad, datei_groesse_bytes, status (CHECK ◆ +'ersetzt'),
fehler_details, erstellt_von, created_at, mandant_id.
◆ Neu: `version` (≥1), `wurzel_export_id` (NULL = Wurzel; Code liest
COALESCE(wurzel,id)), `ersetzt_export_id` (partial-UNIQUE — je Fassung genau eine
Korrektur), `korrektur_grund` (Pflicht bei Korrektur, CHECK), `inhalts_hash`
(hex64, == encode(sha256(datei_inhalt),'hex'), Trigger-geprüft), `datei_inhalt`
(bytea, die ausgelieferte EXTF-Datei), `eingefroren_am`.
Trigger `trg_datev_exporte_schutz`: DELETE nie; nach Einfrieren nur noch status
(erstellt→validiert|uebertragen|fehler|ersetzt) + fehler_details.

## beleg_seiten

id, beleg_id FK, seite_nr (>0, UNIQUE je Beleg), storage_path, gobd_hash (hex64),
mime_type, created_at, archived_at (GoBD-Zeitstempel). UPDATE generell verboten;
DELETE nur bei offenem Beleg. RLS-INSERT (`dash_seiten_insert`, ◆ Neufassung TO
dashboard_service): offener Beleg ODER festgeschrieben + noch keine Seite
(= Nachreichung genau EINER Datei, BER-118).

## mandanten · firmen · kunden

- `kunden`: id, name, email, telefon, adresse, aktiv, notizen. RLS service_role.
- `firmen`: firma_nr char(2) PK, firma_name varchar(120), kunde_id FK,
  ist_testfirma, aktiv, datev_berater_nr/-mandant_nr,
  datev_gegenkonto ('1800') · ◆ datev_gegenkonto_alternativ ('1810') ·
  ◆ datev_gegenkonto_privat ('2100'). BER-120 ergänzt kontenrahmen_code.
- `mandanten`: id, threema_id, firma_nr FK, modus test|produktiv, bezeichnung,
  aktiv. UNIQUE (threema_id, firma_nr); ◆ partial-UNIQUE (threema_id) WHERE
  produktiv AND aktiv — höchstens EIN produktiver Mandant je Threema-ID.
  n8n-Lookup: bei >1 Treffer Fehler statt erster Zeile (Runbook M2).

## skr04_konten

konto_nr varchar PK (BER-120: Surrogat-PK + kontenrahmen_code + firma_nr),
bezeichnung, konto_klasse, konto_typ, bilanz_position, mwst_relevant,
**vorsteuer_relevant** (Gate BER-117), typische_verwendung, ist_aktiv, gueltig_ab.
35 Zeilen; bekannte Altlasten (SKR03-Reste 1000/1200/157x, 6520/6300/6870) →
`specs/BER-120.md`. n8n hält eine HARTKODIERTE Kopie der Kontoliste in 4
Code-Nodes — bei Kontenänderungen nachziehen!

## audit_log (append-only)

id bigserial, beleg_id (◆ nullable — NULL nur für export_eingefroren/
export_ersetzt, CHECK), aktion (CHECK, 16 Werte — s. Migration §5), alter_wert,
neuer_wert, user_id, created_at, mandant_id. Trigger verbietet UPDATE/DELETE.
Achtung Altdaten: 125 `status_change`-Zeilen tragen mandant_id NULL (Trigger
stempelte bis 20260723 nicht) — mandantenscopierte Auswertungen über
beleg_id→belege joinen.

## mandant_credentials · registrierungs_codes · pending_belege · kontierungs_lerndata

- `mandant_credentials`: WebAuthn-Passkeys je Mandant (credential_id UNIQUE,
  public_key, counter, transports, bezeichnung, last_used_at).
- `registrierungs_codes`: Einmal-Codes (SHA-256-Hash, expires_at, used_at) für die
  Passkey-Registrierung; Basis für das künftige Onboarding (Strukturprüfung §1.2).
- `pending_belege`: Threema-Mehrseiten-Zwischenstand (seiten jsonb, status, ein
  offener Vorgang je Mandant via partial-UNIQUE); RPC `append_pending_seite`.
- `kontierungs_lerndata`: leer; Kontierungsgedächtnis (BER-98), mandantenfähig.

## Funktionen & Trigger (fachlich)

| Objekt | Zweck |
|---|---|
| `fn_belege_festschreibung` | ◆ WHITELIST-Endfassung (Migration §7): alles eingefroren außer status-Übergang, Export-Metadaten (einmalig), updated_at, den ➕-Spalten samt Kopplungen |
| `fn_beleg_seiten_unveraenderbar` | Seiten: kein UPDATE; DELETE nur bei offenem Beleg |
| `fn_audit_log_append_only` | Audit unveränderlich |
| ◆ `fn_datev_exporte_schutz` | Export-Fassungen unveränderlich + Hash-Integrität |
| `log_beleg_aenderungen` | auto-Audit status/sachkonto; ◆ stempelt mandant_id |
| `update_updated_at` | belege/firmen/mandanten |
| `naechste_beleg_nr(uuid)` | Belegnummern-Vergabe je Mandant/Jahr |
| `append_pending_seite` | atomares Seiten-Anhängen (nur Service Role) |
| `zeitraum_grenzen` | Zeitraum-Helfer |

## Rollen & RLS-Modell (Kurzfassung)

`dashboard_service` (kein BYPASSRLS): SELECT beleg-nah RLS-scoped über
`app.mandant_id` (`withMandant`), Schreibrechte spaltenweise (Wahrheit:
`information_schema.column_privileges`); `service_role` (n8n/Edge) an RLS vorbei;
`admin`-JWT-Policies für Alt-Pfade. Details: `docs/AUTH.md` (ADR-05).

## Fremdkörper

`workshop_vorbereitung` gehört nicht zu BelegChat (HEDY-Workshop-Anmeldungen im
selben Supabase-Projekt). Nicht anfassen; bei Gelegenheit in ein eigenes Projekt
umziehen (Betreiber-Entscheidung).
