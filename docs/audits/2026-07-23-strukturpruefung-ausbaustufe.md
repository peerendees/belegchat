# Strukturprüfung — Nächste Ausbaustufe BelegChat

> Erstellt am 23.07.2026 · Teil A der Konzeption zur StB-Rückmeldung vom 22.07.2026.
> Grundlage: Prod-DB `xuqefeewzdvjhuquciut` (nur lesend, Stand 23.07.2026), Migrationen in
> `threema-decrypt/supabase/migrations/`, App-Code `belegchat`, n8n-Workflow-Exporte,
> Linear BER-116..123, Validierungsbericht `2026-07-22-validierung-ber-116-119.md`.
>
> provenance: classification internal · status final · source claude

Dieses Dokument bewertet, ob das Datenmodell die neun benannten Richtungen trägt,
beantwortet die vier Pflichtfragen und benennt jede Stelle, an der die Entwurfs-Specs
BER-116..119 eine Richtung blockiert hätten. Es ist die Entscheidungsgrundlage für die
neu geschriebenen Specs BER-116..122.

---

## 0 Verifizierter Ist-Zustand (Kurzreferenz)

| Fakt | Beleg |
|---|---|
| `belege` hat 42 Spalten; 60 Zeilen, alle `exportiert`, Belegdaten 2024 | Prod-Query 23.07.2026 |
| Sachkonten im Bestand: 6805×36, 6890×14, 6520×6, 6640/6810/6930/6990×je 1 | Prod-Query |
| Davon `vorsteuer_relevant=true`: 6805, 6890, 6640, 6930, 6990 → **53 Belege**; `false`: 6520, 6810 → **7 Belege** | `skr04_konten` |
| MwSt: 59×19 %, 1×7 % (der 7 %-Beleg liegt auf 6890) | Prod-Query |
| `fn_belege_festschreibung` Prod = Migration `20260719221107` (Blacklist, 27 Spalten; `bewirtung_anlass/teilnehmer`, `trinkgeld`, `termin_grund/ort/kunde` fehlen) | `pg_get_functiondef`, md5 `4b206ff6…` |
| 1 Export: `EXTF_Buchungsstapel_2024_Jahr.csv`, created 2026-07-20, Status `erstellt`, kein Hash, kein Inhalt | `datev_exporte` |
| `firmen.updated_at` (Firma 01) = 2026-07-14 **<** Export-`created_at` 2026-07-20 → Erstfassung ist heute noch bitgleich regenerierbar | Prod-Query |
| 2 Firmen (01 echt, 99 Test), 2 Mandanten mit **verschiedenen** Threema-IDs, 1 Kunde | Prod-Query |
| `mandanten`: `UNIQUE (threema_id, firma_nr)` — dieselbe ID darf mehreren Firmen zugeordnet sein | `pg_constraint` |
| n8n löst Fotos per `mandanten?threema_id=eq.X&aktiv=…` auf und nimmt die **erste** Zeile — bei geteilter ID nichtdeterministisch | Workflow-Export `MYpHUIHNMuIUR1ic` |
| n8n validiert KI-Konten gegen eine **hartkodierte** Kontenliste in Code-Nodes („bei neuen Konten hier nachziehen") | Workflow-Export, 4 Code-Nodes |
| 125 von 431 `audit_log`-Zeilen (`status_change` vom Trigger `log_beleg_aenderungen`) tragen `mandant_id NULL` → für die mandantenscopierte RLS-Sicht unsichtbar | Prod-Query |
| `dashboard_service`: kein UPDATE auf `datev_exporte`; INSERT auf `belege` nur spaltenweise | `information_schema` |
| `beleg_seiten`: 57×PDF, 6×JPEG; `UNIQUE (beleg_id, seite_nr)`; UPDATE per Trigger generell gesperrt | Prod-Query |

---

## 1 Die neun Richtungen — Tragfähigkeit

### 1.1 Mandantenfähigkeit im Abo-Modell

**Tragfähig:** `kunden → firmen (kunde_id) → mandanten (firma_nr)` bildet die Hierarchie
Kunde/Firma/Zugang bereits korrekt ab; `ist_testfirma` und `mandanten.modus` trennen Test
und Echt; RLS über `app.mandant_id` isoliert sauber pro Session. Nichts davon anfassen.

**Nicht tragfähig / Lücken:**

1. **Kundenübergreifende Verwaltungssicht:** bricht das RLS-Modell konzeptionell (eine
   Session = ein Mandant). Sie braucht einen eigenen Pfad: separate Postgres-Rolle
   `betreiber_service` mit eigenen, explizit kundenübergreifenden SELECT-Policies, eigener
   Auth (Betreiber-Passkey, kein Mandanten-Login), eigenes Deployment-Segment (eigene
   Route-Gruppe `/verwaltung`, nie gemischt mit Mandanten-Routen). **Kein Bestandteil
   dieser Ausbaustufe; als eigene Story anzulegen.** Keine der Stories BER-116..122
   verbaut diesen Pfad — er ist rein additiv (neue Rolle, neue Policies).
2. **Firmenwechsel in der Session:** `Session = { mandantId }` trägt genau einen
   Mandanten. Mehrere Firmen eines Kunden = mehrere Mandanten = heute mehrere Passkeys.
   Additiv lösbar (Credential am Kunden statt am Mandanten + Firmenwahl nach Login);
   nichts in BER-116..122 verbaut das. Nicht Teil dieser Stufe.
3. **Geteilte Threema-ID (Betreiber-Regel: erlaubt für Testfirma, verboten für zweite
   Echtfirma):** Bei geteilter ID liefert der n8n-Lookup zwei Mandanten und nimmt still
   den ersten — Testbelege könnten im Echtbestand landen. **Festgelegte Zuordnungsregel:**
   - DB-Invariante ab jetzt: höchstens **ein produktiver** Mandant je Threema-ID
     (`CREATE UNIQUE INDEX … ON mandanten(threema_id) WHERE modus='produktiv' AND aktiv`,
     Teil der konsolidierten Migration; heute erfüllt, kostet nichts).
   - Bei geteilter ID (Test+Echt) gilt: **Mehrdeutigkeit ist ein Fehler, keine Auswahl.**
     Der n8n-Lookup muss bei >1 Treffer in den Fehlerzweig laufen (Meldung an den
     Absender), statt die erste Zeile zu nehmen. n8n-Anpassung = Betreiber-Schritt im
     Runbook (Live-Patch + Repo-Export), nicht Nachtlauf.
   - Soll eine Testfirma dieselbe ID *aktiv* nutzen, braucht es einen expliziten
     Eingangs-Besitzer je ID (Konzept: `mandanten.threema_eingang boolean`, partieller
     Unique-Index je ID; Betreiber schaltet um). Als Folge-Story vorgeschlagen, nicht
     jetzt gebaut — heute nutzen beide Mandanten getrennte IDs.
4. **Abo/Laufzeiten/Abrechnung:** keine Tabellen vorhanden. Konzept-Skizze (nicht bauen):
   `module (code PK, bezeichnung)` + `abos (id, kunde_id FK, modul_code FK, gebucht_ab date,
   gekuendigt_zum date NULL, konditionen jsonb)`. Rein additiv; keine Story dieser Stufe
   berührt das. Automatisiertes Anlegen (Kunde, Firma, Mandant, Kontenrahmen, Module als
   Datensätze) bleibt mit dem gemeinsamen Schema + RLS uneingeschränkt möglich —
   BER-120 liefert dafür den fehlenden Baustein „Kontenrahmen pro Firma".

### 1.2 Onboarding, weitgehend automatisiert

**Tragfähig:** `registrierungs_codes` (Hash, Ablauf, `used_at`) und der Passkey-Fluss
existieren; „nach Passkey-Erstellung direkt ins Dashboard" ist heute schon das Verhalten
(`/register` → Session-Cookie).

**Lücke, beide Provisionierungsfälle:** `mandanten.threema_id` ist `NOT NULL` — der
Mandant kann heute nicht vor Kenntnis der Threema-ID angelegt werden. Konzept
(Folge-Story, nicht jetzt): `threema_id` nullable + Zustand „wartet auf Threema-Start";
Rückkanal = der Kunde sendet den Einmal-Code als **Textnachricht** über Threema, der
bestehende Text-Zweig des n8n-Workflows matcht den Code-Hash und trägt `threema_id` am
Mandanten nach. Damit übersteht das Konzept beide Fälle: ID vorab bekannt (Betreiber
trägt sie ein) und ID erst nachträglich (Rückkanal). Keine Story dieser Stufe verbaut
das; die Nullable-Änderung ist additiv. **Nicht in die konsolidierte Migration
aufgenommen** — sie gehört zur Onboarding-Story, deren Provisionierungsweg der Betreiber
noch verifiziert.

### 1.3 Reisekosten / Verpflegungsmehraufwand als Modul

**Tragfähig als Erweiterung, nicht im Bestand:** `termin_grund/ort/kunde` sammeln die
Reisedaten am Einzelbeleg; eine Reise ist heute nicht abbildbar (kein Klammer-Objekt,
Export schreibt eine Zeile pro Beleg).

Konzept-Skizze (Folge-Story): `reisen (id, mandant_id, von, bis, grund, ort, kunde,
status)` + `belege.reise_id uuid NULL` (additiv) + `reise_buchungen (id, reise_id,
buchungstext, betrag, sachkonto, gegenkonto, pauschale_art, pauschale_satz numeric,
pauschale_jahr smallint, …)` für die Pauschalen-Sätze — **Satz und Jahr werden am
Datensatz festgeschrieben** (gleiches Muster wie `belege.gegenkonto` in BER-116: der
angewandte Wert steht am Satz, nicht nur die Referenz). VMA ist eine Buchung ohne Beleg
und ohne Vorsteuer — sie läuft bewusst **nicht** durch `belege` (dort würden
Zahlungsweg-Pflicht aus BER-116 und `vorsteuer_relevant`-Gate aus BER-117 stören),
sondern durch den vom Betreiber vorgegebenen **eigenen Export** neben dem
Buchungsstapel. Wechselwirkung geprüft: BER-118 (Beleg ohne Dokument) wird dadurch
NICHT zum VMA-Vehikel — BER-118 bleibt „Buchungsbeleg, dessen Dokument nachkommt".
Keine Festlegung in BER-116..119 blockiert diese Richtung.

### 1.4 Modul-Dashboard

Regel, die alle Stories dieser Stufe bereits einhalten und die festgeschrieben wird:
**Der GoBD-Pfad ist datengetragen, nie flag-getragen.** Export und Re-Download lesen
ausschließlich am Beleg/Export gespeicherte Werte (`gegenkonto`, `bu_schluessel`,
`datei_inhalt`); ein abbestelltes Modul ändert dadurch weder Bestandsdaten noch die
Reproduktion bereits ausgelieferter Stapel, und Löschung findet ohnehin nicht statt
(Trigger). Feature-Flags (künftige `abos`) dürfen nur die **Erfassung** neuer Daten
ein-/ausblenden. Verfahrensdokumentation pro Firma: Konzept `firmen.verfahrensdoku_version`
+ versionierte Dokumente; wird mit dem Modul-Dashboard gebaut, nicht jetzt.

### 1.5 Storno / Korrektur festgeschriebener Belege

Heute kein Weg — bestätigt. Die DATEV-Spalte „Generalumkehr (GU)" liegt ungenutzt im
Export (Spalte 114). Konzept (Folge-Story): neuer `beleg_typ 'storno'` +
`belege.storniert_beleg_id uuid NULL` + Export setzt GU='1' für Storno-Sätze;
der stornierte Beleg bleibt unverändert (append-only bleibt gewahrt), die Korrektur ist
ein neuer Beleg. **Wichtig für diese Stufe:** Die Einmaligkeit `NULL → Wert` in BER-119
ist damit vereinbar — ein *falsch* nacherfasster Wert wird künftig per Storno/Neubeleg
korrigiert, nicht per Wertänderung. Die Nacherfassung bekommt deshalb eine
Batch-Bestätigung vor dem Schreiben (Tippfehler werden VOR dem Commit korrigiert, s.
BER-119). Nichts in BER-116..122 verbaut den Storno-Weg; der Whitelist-Trigger (s. Frage 1)
macht die spätere GU-Erweiterung sogar sicherer.

### 1.6 Zahlungsabgleich per Kontoauszug (CAMT/MT940)

BER-116 speichert **das aufgelöste Konto pro Beleg** (`zahlungsweg` + `gegenkonto`) —
genau die Granularität, die ein späterer automatischer Abgleich braucht. Additiv kommen
dann `bank_transaktionen` + `beleg_zahlungen (beleg_id, transaktion_id, betrag)` als
eigene Tabellen. Ein Boolean hätte diese Richtung verbaut (nur zwei Klassen, kein
Konto); die dreiwertige Fassung mit gespeichertem Konto trägt sie. Nichts weiter nötig.

### 1.7 Erlösseite

`beleg_typ` kennt `ausgangsrechnung`/`gutschrift`, die Soll/Haben-Logik existiert
(`datev.ts`), Erlöskonten 4300/4400 liegen in der Kontentabelle. Zwei Festlegungen dieser
Stufe halten die Tür offen:
- `steuerschluessel.typ ('vorsteuer'|'umsatzsteuer')` — Umsatzsteuerschlüssel (andere
  DATEV-Nummern!) sind später reine Konfigurationszeilen, kein Umbau.
- Das Vorbelegungs-Gate hängt am Konto (`vorsteuer_relevant`), nicht am Beleg-Typ —
  Erlöskonten bekommen schlicht keine Vorsteuer-Vorbelegung; ihr USt-Gate kommt mit der
  Erlösseiten-Story (`mwst_relevant` liegt schon bereit).
Debitoren (Personenkonten) sind Neubau (eigene Tabelle + Gegenkonto-Logik); nichts hier
blockiert ihn — `belege.gegenkonto` ist mit `varchar(10)` breit genug für Personenkonten.

### 1.8 Mehrere MwSt-Sätze pro Beleg (BER-122)

Der kritischste Wechselwirkungspunkt mit BER-117. Festlegung: `belege.bu_schluessel`
bleibt das Feld für den **Ein-Satz-Fall** (der gesamte Bestand und die überwiegende
Mehrheit künftiger Belege); Mehrsätzigkeit kommt als **Satellitentabelle**
`beleg_steuerzeilen` (Design in `specs/BER-122.md`), deren Zeilen mit dem Beleg
festgeschrieben werden. Der Export wechselt dann von „eine Zeile pro Beleg" auf „eine
Zeile pro Steuerzeile, Fallback eine Zeile pro Beleg" — eine Code-Änderung, keine
Migration festgeschriebener Daten. Damit ist BER-122 **additiv**: kein festgeschriebener
Beleg wird angefasst, `mwst_satz/bu_schluessel` am Beleg bleiben für Alt- und
Ein-Satz-Belege gültig. BER-108-Teilbeträge: v1-Restriktion „ein Satz pro Teilbetrag"
bleibt; Mehrsatz+Teilbetrag schließen sich vorerst aus (422), dokumentiert in BER-122.

### 1.9 Vollständigkeitsexport (BER-123, nur geprüft, nicht spezifiziert)

Bausteine (`beleg_seiten.gobd_hash`, `archived_at`, `belege.gobd_hash`, append-only
`audit_log`) tragen. Zwei Befunde für die spätere Story:
- **Gemeinsamer Prüfsummen-Mechanismus mit BER-121: ja.** BER-121 führt SHA-256 über
  Dateiinhalt + DB-seitige Verifizierbarkeit (`sha256(datei_inhalt)`) ein; der
  Vollständigkeitsexport nutzt exakt dasselbe Muster (Manifest mit SHA-256 je Datei).
  Deshalb heißt die Spalte generisch `inhalts_hash`, nicht datev-spezifisch.
- **Audit-Vollständigkeit:** 125 Trigger-Audit-Zeilen tragen `mandant_id NULL`. Ein
  mandantenscopierter Export MUSS Audit über `beleg_id → belege.mandant_id` joinen, nicht
  über `audit_log.mandant_id` filtern. Die konsolidierte Migration stempelt `mandant_id`
  ab jetzt im Trigger mit (Altzeilen bleiben NULL — audit_log ist append-only, ein
  Backfill wäre selbst eine GoBD-Verletzung).

---

## 2 Die vier Pflichtfragen

### 2.1 Sperrliste: Blacklist → **Whitelist. Entschieden.**

`fn_belege_festschreibung` wird auf Whitelist umgestellt: verglichen wird
`to_jsonb(OLD/NEW)` abzüglich einer expliziten Positivliste erlaubter Spalten; jede
Abweichung außerhalb der Liste ist ein Fehler. Begründung:
- Die Blacklist hat nachweislich sechs Spalten verloren (`bewirtung_anlass/teilnehmer`,
  `trinkgeld`, `termin_grund/ort/kunde` — alle exportrelevant). Der Fehlermodus der
  Blacklist ist still (neue Spalte = ungeschützt), der der Whitelist ist laut
  (neue Spalte = zu streng gesperrt, fällt im ersten Test auf).
- Die Funktion wird ohnehin neu geschrieben (drei Stories ändern sie); die Umstellung
  kostet jetzt nichts und macht jede künftige Story (Reise, Storno, Steuerzeilen,
  BER-122) default-sicher.
- Die Positivliste ist klein und fachlich begründbar: `status` (nur
  geprueft→exportiert), `datev_export_id`/`export_datum` (einmalig, Export),
  `updated_at` (technisch), `zahlungsweg`/`gegenkonto`/`bu_schluessel` (einmalig
  NULL→Wert, BER-119), `gobd_hash`/`bild_storage_path` (einmalig NULL→Wert, BER-118),
  `dokument_fehlt` (nur true→false, gekoppelt an `gobd_hash`).
Vollständiger Wortlaut: `specs/migrations/20260723_stb_rueckmeldung_konsolidiert.sql`.

### 2.2 Bleibt die Breite von `belege` tragfähig?

**Für diese Stufe: ja.** Es kommen vier schmale Spalten dazu (42 → 46); alle vier sind
Buchungssatz-Kernfelder (Zahlungsweg, Gegenkonto, Steuerschlüssel, Fehlt-Kennzeichen)
und gehören an den Satz, nicht in Satellitentabellen.

**Als Regel ab jetzt:** `belege` wächst nur noch um Felder des einzelnen
Buchungssatzes. Alles, was eine eigene Kardinalität hat (mehrere Steuerzeilen, mehrere
Belege pro Reise, mehrere Zahlungen pro Beleg) oder einen eigenen Lebenszyklus (Abo,
Modul), wird eine eigene Tabelle: `beleg_steuerzeilen` (BER-122), `reisen`/
`reise_buchungen` (1.3), `bank_transaktionen`/`beleg_zahlungen` (1.6), `abos` (1.1).
Die bestehenden Themenfelder (Bewirtung 2, Termin 3, Teilbetrag 5 Spalten) bleiben, wie
sie sind — Umbau im Bestand brächte Risiko ohne Nutzen. Der Whitelist-Trigger nimmt der
Breite zudem ihr größtes Risiko (unbemerkt ungeschützte Spalten).

### 2.3 Schemadokumentation: Ort und Form

**Entschieden: `docs/SCHEMA.md` im belegchat-Repo** (mit dieser Konzeption angelegt),
eine Tabelle pro DB-Tabelle: Spalte · Typ · Zweck · Story-Referenz · Festschreibungs-
Verhalten (frei / whitelist-Ausnahme / gesperrt). Warum dort: belegchat ist das Repo, in
dem gearbeitet und gelesen wird (CLAUDE.md-Einstieg); die Migrationen bleiben die
Wahrheit im Schwesterrepo, SCHEMA.md ist die lesbare Landkarte mit Verweis auf die
jeweilige Migrationsdatei. **Pflegeregel:** `specs/TEMPLATE.md` erhält in der
Definition-of-Done die Zeile „Schema-Änderungen in `docs/SCHEMA.md` nachgezogen" —
damit wird die Pflege bei jeder künftigen Story vom Spec-Gate miterzwungen. (Der
Nachtlauf ergänzt die DoD-Zeile im Template; SCHEMA.md selbst liegt bereits vor.)

### 2.4 Blockade-Stellen in den Entwürfen BER-116..119

| # | Stelle (Entwurf) | Blockierte Richtung | Korrektur (in den neuen Specs) |
|---|---|---|---|
| 1 | BER-116: `ueber_geschaeftskonto boolean` | StB-Welt mit drei Konten (1800/1810/2100); CAMT-Abgleich (1.6); jede weitere Zahlungsart | `zahlungsweg text` dreiwertig + `gegenkonto varchar(10)` aufgelöst gespeichert |
| 2 | BER-116: „Beide Konten pro Firma konfigurierbar" | 2100-Privatfall fehlt | drei Firmen-Spalten: `datev_gegenkonto`, `_alternativ`, `_privat` |
| 3 | BER-117: Schlüsseltabelle global, ohne Firma und ohne Richtung | Mandantenfähigkeit (1.1), Erlösseite (1.7) | `steuerschluessel (firma_nr, typ, mwst_satz → bu_schluessel)` |
| 4 | BER-117: „6805 ist ein Automatikkonto" als Fakt | — (Falschaussage, kein Blocker) | entschärft zu „möglicherweise; klärt der Testimport" |
| 5 | BER-117/119: Vorbelegung ohne Konto-Gate in der Nacherfassung | 6 GewSt-Belege (6520) + 6810 bekämen fälschlich einen Schlüssel; `mwst_satz` ist eingefroren und teils falsch erfasst | Gate `vorsteuer_relevant = true` gilt in Freigabe **und** Nacherfassung |
| 6 | BER-118: `stb_vermerk` nach Festschreibung fortschreiben | GoBD (dritte, nicht deklarierte Lockerung) | gestrichen; Kennzeichnung läuft über `dokument_fehlt` + Audit; Export-Kennzeichen wird aus `dokument_fehlt` erzeugt, nicht aus dem Vermerk |
| 7 | BER-118: `NOT EXISTS`-Policy schließt Mehrseiten-Nachreichung aus | Mehrseitige Nachreichung | bewusst beibehalten als „genau **eine Datei**" — mehrseitig geht als PDF (eine Datei = eine `beleg_seiten`-Zeile); dokumentiert statt still |
| 8 | BER-118: Lebenszyklus `dokument_fehlt` unspezifiziert | — | vollständig definiert: `true` nur bei Anlage ohne Dokument, `false` nur durch die Upload-Route, Trigger erzwingt Kopplung an `gobd_hash` |
| 9 | BER-119: stille Ersetzung der ausgelieferten Datei (gleiche ID, gleicher Name) | GoBD-Nachweisbarkeit; BER-121 | Kopplung an BER-121: Erstfassung wird vor der ersten Nacherfassung eingefroren (Inhalt + SHA-256), Korrektur ist eine **neue** Export-Zeile mit Referenz |
| 10 | BER-119: Einmaligkeit `NULL → Wert` ohne Review-Schritt | Tippfehler wäre unkorrigierbar bis zum Storno-Konzept | Batch-Commit: Erfassen → Zusammenfassung → ein transaktionaler Commit |
| 11 | BER-117: ein `bu_schluessel` am Beleg | Mehrere MwSt-Sätze (BER-122) | bleibt als Ein-Satz-Feld; Mehrsatz additiv über `beleg_steuerzeilen` (2.8); in BER-117 als Erweiterungspfad dokumentiert |

**Nicht angefasst (tragfähig):** Auflösung der StB-Kurznotation in getrennte
EXTF-Felder; Schlüsselzuordnung als Konfiguration; gespeichertes aufgelöstes Gegenkonto;
Pflichtauswahl ohne Default; eng gefasstes `NULL → Wert`-Prinzip; `kunden→firmen→
mandanten`-Hierarchie; RLS-Modell; `naechste_beleg_nr`; Edge-Archivierung mit Hash.

---

## 3 Widersprüche in der bestehenden Dokumentation (Korrektur im Nachtlauf)

| Datei | Falsche Aussage | Korrektur |
|---|---|---|
| `docs/DATEV.md` Z. 29–31 | „Re-Download … deterministisch … nur der ‚erzeugt am‘-Zeitstempel im Header variiert" | Doppelt falsch: `erzeugtAm` kommt beim Re-Download stabil aus `datev_exporte.created_at`; variabel war stattdessen die **Firmenkonfiguration** (Gegenkonto/Berater-/Mandantennummer werden zur Downloadzeit gelesen). Neuer Text nach BER-116/121: „Re-Download liefert die beim Erzeugen gespeicherte Datei bitgleich aus (`datei_inhalt`, SHA-256 in `inhalts_hash`). Für Alt-Exporte ohne gespeicherten Inhalt wird deterministisch aus den festgeschriebenen Belegen regeneriert; das Gegenkonto kommt seit BER-116 aus dem Beleg." Hinweis ergänzen: der Header-Zeitstempel der **Erstauslieferung** (Erzeugungsmoment) kann von der Regeneration (aus `created_at`) um Sekunden abweichen. |
| `docs/DATEV.md` „Buchungslogik" | „BU-Schlüssel leer — Steuer läuft über SKR04-Automatikkonten bzw. wird vom StB gesetzt" | Widerlegt durch StB-Rückmeldung; neuer Text: „BU-Schlüssel aus `belege.bu_schluessel` (Spalte 9), vorbelegt aus `steuerschluessel`-Konfiguration, Gate `vorsteuer_relevant`" (BER-117). |
| `docs/GOBD.md` „Festschreibung" | „Erlaubt: … Setzen von datev_export_id, export_datum, updated_at" (implizit: sonst nichts) + Sperrlisten-Beschreibung | Nach der Migration: Whitelist-Semantik beschreiben inkl. der drei `NULL → Wert`-Ausnahmen (BER-118/119) und `dokument_fehlt`-Kopplung. |
| `docs/GOBD.md` „Offene Punkte" | „Korrektur nur über Storno/neuen Beleg (Konzept Phase 3/4)" | Präzisieren: Storno weiterhin offen (Richtung 1.5); Nachreichen von Dokument und Nacherfassung neuer Spalten sind jetzt definierte, auditierte Ausnahmen. |
| `CONTEXT.md` Domänen-Tabelle | „Hash-Kette: SHA-256-Verkettung über Beleg-Metadaten + Vorgänger-Hash", „Firma (firma_id)" | Es gibt keine Verkettung und kein `prev_hash` (Einzel-Hashes je Seite/Beleg); Schlüssel der Firma ist `firma_nr`. Nachziehen. |
| `ARCHITECTURE_DESIGN.md` §4 | „Kernentitäten: … threema_contacts, passkey_credentials; GoBD-Felder: hash, prev_hash, beleg_nummer" | Tatsächlich: `mandanten`, `mandant_credentials`, `gobd_hash`, `beleg_nr`, kein `prev_hash`. Nachziehen (Verweis auf `docs/SCHEMA.md`). |
| `docs/UEBERGABE.md` Feature-Stand | „DATEV-Export …, Re-Download deterministisch" | Formulierung an BER-121 anpassen (gespeicherte Datei statt behaupteter Determinismus). |
| Linear BER-113 „Done" vs. Spec `in-progress` | App-Schicht (POST /api/belege, …/dokument) existiert nicht | Bekannt aus Validierungsbericht; BER-118 stellt sie fertig, `specs/BER-113.md` wird als abgelöst markiert. |

Nebenbefund (kein Widerspruch, aber Korrektur wert): `skr04_konten` führt **zwei**
„Bewirtungskosten"-Zeilen (6640 und 6870). 6870 ist im Standard-SKR04 nicht Bewirtung;
keine Belege referenzieren 6870 → Deaktivierung in BER-120 vorgesehen.

---

## 4 Konsequenzen für Zuschnitt und Reihenfolge

Bestätigt aus dem Validierungsbericht, hier verbindlich gemacht:

1. **Eine konsolidierte Migration zu Beginn** (`specs/migrations/20260723_stb_rueckmeldung_konsolidiert.sql`):
   alle Spalten, `steuerschluessel` + Seeds, RLS, Grants, `fn_belege_festschreibung`-Endfassung
   (Whitelist), `fn_datev_exporte_schutz`, Audit-Erweiterungen, Schutz-Indexe. Die vier
   Stories schreiben danach **keine** eigene Trigger-Fassung mehr.
2. **Serielle App-Schichten:** BER-116 → BER-117 → BER-118 → BER-121 → BER-119.
   BER-121 vor BER-119, weil der Nacherfassungs-Commit die Einfrier-Funktion aus BER-121
   aufruft (Linear: BER-121 blocks BER-119 ✓).
3. **BER-120 und BER-122 werden in dieser Stufe nur spezifiziert, nicht gebaut** —
   BER-120 ändert den Konten-PK und die n8n-Codelisten (Betreiber-Schritt am Tag),
   BER-122 ist fürs nächste Release; beides hat keine Abhängigkeit rückwärts.
4. **Nicht im Nachtlauf (Datenveränderung/extern):** Nacherfassung der 60 Belege,
   Einfrieren+Korrekturstapel-Erzeugung, Passkey-E2E, n8n-Patches, Vercel-Env,
   StB-Kommunikation. Alles im Morgen-Runbook (`docs/AUSFUEHRUNGSPLAN-STB-RUECKMELDUNG.md`).
