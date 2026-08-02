# Verfahrensdokumentation — Ergänzungen v1.1

> Stand: 23.07.2026 · Vorlage für die Übernahme in die formale
> BMF-Verfahrensdokumentation (`docs/Verfahrensdokumentation_BelegChat_v1.0.docx` → v1.1).
> Anlass: Rückmeldung der Steuerkanzlei vom 22.07.2026 und die daraus gebauten Stories
> BER-116..121. Der Betreiber übernimmt diese Abschnitte redaktionell in die Word-Fassung.
>
> provenance: classification internal · status final · source claude

## Ä-1 · Export-Fassungen und Nachweis des ausgelieferten Inhalts (BER-121)

Jeder DATEV-Buchungsstapel wird beim Erzeugen mit seinem vollständigen Dateiinhalt und einer
SHA-256-Prüfsumme gespeichert und sofort „eingefroren". Ein erneuter Download liefert exakt die
ausgelieferten Bytes; die Prüfsumme lässt sich jederzeit gegen den gespeicherten Inhalt
verifizieren. Eine eingefrorene Fassung ist technisch unveränderlich (Datenbank-Trigger).

Wird ein Stapel korrigiert (siehe Ä-2), entsteht eine **neue Fassung** mit eigener
Versionsnummer, Verweis auf die ersetzte Fassung und einem Pflicht-Korrekturgrund. Die
bisherige Fassung bleibt als „ersetzt" erhalten und abrufbar — es gibt kein stilles
Überschreiben. Einfrieren und Ersetzen werden im unveränderlichen Audit-Protokoll festgehalten.

## Ä-2 · Nacherfassung neuer Buchungssatz-Felder bei festgeschriebenen Belegen (BER-119)

Die Kanzlei-Rückmeldung erforderte an bereits festgeschriebenen Belegen des Stapels 2024 die
Ergänzung von Angaben, die es im System zum Zeitpunkt der Festschreibung nicht gab: Zahlungsweg
mit aufgelöstem Gegenkonto (BER-116) und Vorsteuerschlüssel (BER-117). Diese Felder dürfen bei
festgeschriebenen Belegen **einmalig** von „leer" auf einen Wert gesetzt werden; die Buchung
selbst (Beträge, Datum, Sachkonto, Belegnummer) bleibt unverändert. Jede Ergänzung ist im
Audit-Protokoll mit Anlass („StB-Rückmeldung 22.07.2026") festgehalten und technisch auf ein
einziges Mal begrenzt. Vor der ersten Nacherfassung wird die Erstfassung des betroffenen Stapels
eingefroren (Ä-1), damit nachweisbar bleibt, was ursprünglich ausgeliefert wurde.

## Ä-3 · Whitelist-Festschreibung (BER-116..121)

Die Unveränderbarkeit festgeschriebener Belege wird ab 23.07.2026 über eine Positivliste
(„Whitelist") erzwungen: Alle Felder sind nach der Festschreibung gesperrt, außer einer klar
benannten, kleinen Ausnahmeliste (Statuswechsel zur Exportkennzeichnung, die genannten
einmaligen Ergänzungen). Damit ist auch jedes künftig hinzukommende Feld automatisch geschützt.

## Ä-4 · Buchungsbeleg ohne Originaldokument erfassen und nachreichen (BER-118)

Ein Buchungsbeleg kann ohne vorliegendes Originaldokument erfasst und freigegeben werden, damit
ein Stapel übergeben werden kann, in dem noch auf einzelne Belege gewartet wird. Solche Belege
sind als „Dokument fehlt" gekennzeichnet — im Dashboard sichtbar/filterbar und im DATEV-Stapel in
den Zusatzinformations-Feldern als „Beleg: fehlt bei Übergabe".

Das Originaldokument wird später nachgereicht: genau **eine** Datei (mehrseitig als PDF), die über
denselben revisionssicheren Weg wie der automatische Eingang archiviert wird (SHA-256, Storage,
Duplikatprüfung). Das Nachreichen ist auch nach Freigabe/Export möglich (der Beleg-Trigger erlaubt
`gobd_hash`/`bild_storage_path` einmalig von „leer" auf einen Wert); ein bereits hinterlegtes
Dokument lässt sich nicht ersetzen. Jede Nachreichung steht im unveränderlichen Audit-Protokoll
(`dokument_nachgereicht`). Der Steuerberater-Vermerk am Beleg bleibt nach der Festschreibung
unverändert — die Nachreichung wird nicht in den Vermerk fortgeschrieben, sondern über Kennzeichen
und Protokoll dokumentiert.

## Ä-5 · Einmal-Korrektur des 2024-Altbestands vor Erstabgabe (23.07.2026)

Der am 20.07.2026 an die Kanzlei übergebene 2024-Stapel wurde beanstandet und **nicht importiert**.
Vor der korrigierten Neuabgabe wurden am festgeschriebenen Bestand zwei Berichtigungen vorgenommen
(Weisung des Betreibers, eng begrenzt, vollständig protokolliert):

1. **Sechs Fehlkontierungen** — durch die automatische Kontierung fälschlich auf 6520
   (Gewerbesteuer) gelegt — auf **6830** (5× Steuerberater-Honorar) bzw. **6880** (1× Werbung)
   umkontiert. Als Freiberufler fällt keine Gewerbesteuer an; die neuen Konten sind
   vorsteuerrelevant, sodass die Sätze im Korrekturstapel korrekt den Vorsteuerschlüssel tragen.
2. **Belegnummern-Präfix** von `01-2026-` (Erfassungsjahr) auf `01-2024-` (Belegjahr) umgestellt —
   rein die Darstellung; gebucht wurde ohnehin über das Belegdatum.

Umsetzung: ein transaktionaler Eingriff, der den Festschreibungs-Schutz nur innerhalb der
Transaktion ausgesetzt und nachweislich wieder aktiviert hat. Jede Änderung ist im
append-only-Protokoll mit altem und neuem Wert festgehalten (66 Einträge, Aktion
`korrektur_vorabgabe`). SQL-Abbild: `specs/migrations/20260723_korrektur_2024_vorabgabe.sql`.

**Konsequenz für die Nachvollziehbarkeit (bewusst getragen):** Der Inhalt der am 20.07.2026
übergebenen Erstfassung war nicht als Datei gespeichert (die Inhalts-/Hash-Speicherung, BER-121,
kam erst am 23.07.). Da die zugrunde liegenden Belege nun korrigiert sind, ist die Erstfassung
nicht mehr bitgenau reproduzierbar. Das ist vertretbar, weil sie verworfen wird und nie importiert
wurde; **was sich geändert hat, ist über das Korrektur-Protokoll lückenlos belegt.** Der ab jetzt
erzeugte Korrekturstapel wird mit Inhalt und SHA-256 revisionssicher gespeichert (BER-121). Für
2025/2026 wird zusätzlich die Belegnummern-Vergabe auf das Belegjahr umgestellt, sodass der Versatz
gar nicht mehr entsteht.

### Ä-5.1 · Angleich an die geprüften Rechnungssätze + Zahlungsweg-Zuordnung (23.07.2026)

Auf Basis einer vom Betreiber geführten, geprüften Referenzliste (`Rechnungssaetze_2024.csv`, je
Beleg über den GoBD-Hash eindeutig zugeordnet) wurden zwei weitere Berichtigungen am 2024-Bestand
vorgenommen:

1. **OCR-Korrekturen** an 9 Beträgen und 5 Sachkonten, die von der geprüften Referenz abwichen
   (u. a. zwei Vodafone-DSL-Belege, deren Betrag die OCR negativ und falsch erfasst hatte; mehrere
   Mobilfunk-Belege 42,13 € → 37,13 €). Kontrollierter Eingriff wie in Ä-5, `korrektur_vorabgabe`
   im Protokoll (alter → neuer Wert je Beleg).
2. **Zahlungsweg-Zuordnung** aller 60 Belege (Nacherfassung, `NULL → Wert`, Schutz-Trigger aktiv):
   36 Geschäftskonto (1800), 24 Alternativkonto (1810, Abgrenzung: private Karte/Barzahlung),
   Steuerschlüssel je MwSt-Satz (90/80). `nacherfassung_zahlungsweg`/`_steuerschluessel` im Protokoll.

Abgrenzung: Die 16 Belege außerhalb der Referenzliste wurden nur im Zahlungsweg zugeordnet; ihre
Beträge stammen aus der OCR-Erfassung und sind vom Betreiber gegen die Originalbelege zu
plausibilisieren. Insgesamt 199 Protokolleinträge; der Bestand ist danach deckungsgleich mit der
geprüften Referenz.

## Ä-6 · Revision der Nummernvergabe (Belegjahr) und Konto-Sperre 6520 vor dem 2025/26-Import (30.07.2026)

Vor dem Einlesen der 2025er- und 2026er-Belege wurden zwei prospektive Änderungen umgesetzt, damit
die beim 2024-Altbestand nachträglich korrigierten Punkte (Ä-5) gar nicht erst wieder entstehen:

1. **Belegnummer nach Belegjahr statt Erfassungsjahr.** Die Nummernvergabe leitet das Jahr im
   Präfix `FF-JJJJ-NNNN` jetzt aus dem Belegdatum ab (Fallback: Erfassungsjahr, wenn kein Datum
   erkannt wurde). So werden 2025 (`01-2025-…`) und 2026 (`01-2026-…`) getrennt und fortlaufend
   nummeriert; der 2024-Bestand endet bei `01-2024-0060`. Die Änderung ist rückwärtskompatibel
   (optionaler Datumsparameter), umgesetzt in der Datenbankfunktion `naechste_beleg_nr`, in der
   manuellen Erfassung (BER-118) und in beiden Eingangs-Workflows (Threema, PDF-Import), die das
   Belegdatum nun an die Nummernvergabe übergeben.

2. **Konto 6520 (Gewerbesteuer) gesperrt.** Als Freiberufler fällt keine Gewerbesteuer an; 6520
   war 2024 die Quelle der sechs KI-Fehlkontierungen (Ä-5). Das Konto wurde in der automatischen
   Kontierung (KI-Kontenliste **und** Validierungs-Set beider Workflows) entfernt und im Kontenrahmen
   deaktiviert (im Dashboard ausgeblendet). Eine irrtümliche Neuvergabe auf 6520 ist damit
   ausgeschlossen; Vorschläge fallen auf das Standard-Sammelkonto zurück und werden bei der Freigabe
   geprüft.

Umsetzung als reguläre, versionierte Datenbank-Migration
(`threema-decrypt/supabase/migrations/20260730230148_revision_belegnummer_belegjahr_und_6520_deaktivieren.sql`)
plus Live-Aktualisierung beider n8n-Workflows über die n8n-API (aktiver Zustand unverändert,
Repo-Export deckungsgleich nachgezogen). Bestandsdaten wurden nicht verändert; die Revision wirkt
ausschließlich auf künftig erfasste Belege. Der breitere mandantenfähige Kontenrahmen (BER-120)
bleibt davon unberührt und weiterhin offen.

---

## Ä-7 · Termin-Kontext im Buchungsstapel + Einzelkorrektur eines Ortsfelds (01.08.2026)

Beim Erfassen der ÖPNV-Tickets fiel zweierlei auf; beides betrifft den Nachweis der
betrieblichen Veranlassung bei Auswärts-Belegen und wurde **vor dem ersten Export** dieser
Belege bereinigt.

**1. Der Termin-Kontext erreichte den Buchungsstapel nicht (BER-126).** Grund, Ort und Kunde
wurden an den Verwendungszweck angehängt und beim DATEV-Feldlimit von 60 Zeichen
abgeschnitten. Da der Verwendungszweck allein 37–71 Zeichen belegte, blieb vom Kontext bei
keinem der sechs Auswärts-Belege etwas übrig. Der Kontext steht jetzt in einem eigenen
Zusatzinformations-Feld (`Art 3` „Termin", bis 210 Zeichen) — dasselbe Verfahren, das schon
für den Vermerk an die Kanzlei (Ä-1-Umfeld, BER-109) und die Kennzeichnung fehlender
Dokumente (Ä-4, BER-118) genutzt wird. Zusätzlich behalten die buchungsrelevanten Zusätze
„(Teilbetrag)" und der Trinkgeld-Hinweis Vorrang vor der Kürzung, und die Feldlänge wird an
der tatsächlich geschriebenen (Latin-1-)Fassung gemessen — zuvor konnten Sätze mit 61 Zeichen
entstehen, weil Ersatzzeichen wie „→" → „->" nach dem Kürzen verlängern.

**2. Einzelkorrektur `termin_ort` an 01-2026-0035.** Bei der Erfassung war die
Zielhaltestellen-/Zonennummer des Tickets („5101") als Ort übernommen worden statt
„Bad Homburg". Der Beleg stand bereits auf `geprueft`; `termin_ort` gehört nicht zu den nach
der Festschreibung änderbaren Feldern. Weil der Kontext mit der Änderung aus Punkt 1
künftig vollständig im Stapel ankommt, wurde der Wert auf ausdrückliche Weisung des
Betreibers berichtigt — eng begrenzt auf **ein Feld an einem nicht exportierten Beleg**.

Umsetzung wie bei Ä-5: ein transaktionaler Eingriff mit vorgeschalteter Prüfung der
Vorbedingungen, der den Festschreibungs-Schutz nur innerhalb der Transaktion ausgesetzt und
danach nachweislich wieder aktiviert hat; gegengeprüft mit einer verworfenen Probe-Änderung,
die korrekt abgewiesen wurde. Die Änderung ist im append-only-Protokoll mit altem und neuem
Wert festgehalten (Aktion `korrektur_vorabgabe`). Das Protokoll der automatischen
Änderungsaufzeichnung blieb dabei aktiv — es erfasst Status und Sachkonto, hier war beides
unberührt. SQL-Abbild: `specs/migrations/20260801_korrektur_termin_ort_0035.sql`.

Der Verwendungszweck des Belegs wurde **nicht** angefasst: „…nach 5101 (Linie 2)" gibt
wieder, was auf dem Ticket steht, und beschreibt das Dokument weiterhin zutreffend.

---

## Ä-8 · Belegnummern verworfener Entwürfe (Betreiber-Entscheidung 02.08.2026)

Ein Beleg erhält seine Nummer bereits bei der Erfassung — also bevor feststeht, ob er
gebucht wird. Wird der Entwurf verworfen (Status `neu`, `vorschlag` oder
`klaerungsbedarf`; freigegebene Belege sind unlöschbar), kann seine Nummer entweder
erneut vergeben werden oder als Lücke bestehen bleiben. Welcher Fall eintritt, hängt
von der Reihenfolge ab: die Vergabe bildet die nächste Nummer aus dem Höchstwert der
**vorhandenen** Belege. War der verworfene Entwurf der höchste, bekommt der nächste
Beleg dieselbe Nummer; existieren bereits höhere, bleibt die Lücke.

**Festlegung des Betreibers: beides ist zulässig.** Ein verworfener Entwurf war zu
keinem Zeitpunkt gebucht, festgeschrieben oder exportiert; er hat weder einen
Buchungssatz erzeugt noch die Kanzlei erreicht. Eine Nummer für einen solchen Entwurf
dauerhaft zu sperren, brächte keinen Erkenntnisgewinn.

**Was die Nachvollziehbarkeit sichert, ist nicht die Nummer, sondern das Protokoll.**
Seit dem 02.08.2026 schreibt das Verwerfen einen eigenen, unveränderlichen Eintrag
(`entwurf_verworfen`) mit Belegnummer, Status und Seitenzahl. Damit ist jeder der
beiden Fälle aus dem append-only-Protokoll heraus erklärbar:

| Verlauf im Protokoll | Bedeutung |
|---|---|
| `erstellt` → `entwurf_verworfen`, Nummer fehlt im Bestand | Entwurf verworfen, Nummer blieb unbesetzt |
| `erstellt` → `entwurf_verworfen` → `erstellt` | Entwurf verworfen, Nummer neu vergeben |

Die Einträge überdauern den Beleg, weil das Protokoll keinen Fremdschlüssel auf den
Belegbestand hält und weder geändert noch gelöscht werden kann. Eine fehlende oder
doppelt auftretende Nummer lässt sich damit immer auf einen konkreten Vorgang
zurückführen — das ist der Nachweis, den die Nummernfolge tragen muss.

Bewusst nicht geregelt wurde, Lücken aktiv aufzufüllen: eine später wieder belegte
Lücke wäre schwerer zu lesen als eine, die offen bleibt.
