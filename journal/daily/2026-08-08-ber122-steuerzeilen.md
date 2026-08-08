# 08.08.2026 — Mehrere MwSt-Sätze: Datenmodell steht auf Produktion

> BER-122 war seit dem 23.07. eine baureife Spec ohne Umsetzung. Heute ist Stufe 1 gebaut,
> verifiziert und angewendet: die Satellitentabelle `beleg_steuerzeilen` mit Konsistenz-,
> Festschreibungs- und RLS-Absicherung. Die Kette dahinter (Export, Erfassung, n8n, Abnahme)
> liegt als BER-140..143 im Backlog. Diese Notiz hält fest, was dabei gegen den Entwurf
> entschieden wurde und was erst nach dem Anwenden aufgefallen ist.

## Ergebnis

| Strang | Ergebnis | Referenz |
|---|---|---|
| Datenmodell + Trigger + RLS | angewendet auf Produktion, Version `20260808190814` | [BER-122](https://linear.app/berent/issue/BER-122) |
| Verhaltenstests T1–T12 | grün gegen das angewendete Schema, Rollback, 0 Rückstände | `specs/migrations/20260808_ber122_trigger_tests.sql` |
| REST-RPC-Exposition der Trigger-Funktionen | entzogen, Nachtrags-Migration `20260808191128` | belegchat#70, threema-decrypt#33 |
| Folge-Stories | BER-140..143 angelegt und verkettet | [BER-140](https://linear.app/berent/issue/BER-140) |

Bestand nach dem Anwenden: 130 Belege, 0 Steuerzeilen. Das Systemverhalten ist unverändert —
bis Stufe 3 schreibt niemand Zeilen.

## Zwei Entscheidungen gegen den Entwurf

**Der Konsistenz-Trigger musste deferred werden.** Die Spec sagte nur „Konsistenz-Trigger".
Ein gewöhnlicher Row-Trigger kann die Regeln aber gar nicht ausdrücken: beim Einfügen von zwei
Zeilen existiert nach der ersten genau 1 Zeile — laut Regel verboten — und die Summe stimmt
noch nicht. Jeder legale Mehrsatz-Beleg wäre blockiert worden. Richtig ist
`CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`, der am Transaktionsende gegen den
Endzustand prüft. Das zieht sich in die Tests durch: in einer Rollback-Transaktion gibt es kein
COMMIT, also muss jeder Testfall die Prüfung mit `SET CONSTRAINTS … IMMEDIATE` gezielt auslösen.

**Es braucht einen zweiten Trigger auf `belege`.** Ein Trigger nur auf der Satellitentabelle
feuert nicht, wenn jemand `belege.mwst_satz` setzt, während Zeilen existieren — die
Ausschlussregel wäre über die Elterntabelle umgehbar gewesen. Eine Invariante über zwei
Tabellen braucht Absicherung auf beiden Schreibpfaden.

## Reihenfolge getauscht: Export vor Erfassung

Die Spec sah „Migration → App → n8n" vor. Beim Zerlegen in Folge-Stories fiel auf, dass diese
Reihenfolge einen fehlerhaften Zwischenzustand erzeugt: könnte das Freigabe-Formular
Steuerzeilen schreiben, bevor der Export sie liest, verarbeitet `belegRow` einen
Mehrsatz-Beleg mit `mwst_satz`/`bu_schluessel` = NULL — ein Buchungssatz ohne BU-Schlüssel und
mit dem vollen Belegbetrag statt der Zeilenbeträge. Beim Steuerberater wäre das eine falsche
Vorsteueraufteilung, nach BER-121 nur per Korrekturfassung behebbar.

Deshalb: BER-140 (Export) vor BER-141 (Erfassung). Solange die Tabelle leer ist, ist der
Export-Umbau ein No-op-Refactor mit Regressionsnachweis — der risikoärmste Zeitpunkt dafür.

## Was ich falsch gemacht habe

**Ich habe eine Sektion dupliziert, weil ich auf einem alten Lesestand gearbeitet habe.**
Der erste `get_issue`-Aufruf lieferte BER-122 mit Status `Backlog` und ohne Schrader-Block.
Parallel zur Session wurde der Issue bearbeitet — Status `In Progress`, Schrader-Block
vorhanden. Mein Append hat den Block ein zweites Mal angehängt. Korrigiert, aber vermeidbar:
vor schreibenden Backlog-Operationen frisch lesen.

**Mein eigener 42P17-Check hat falsch-positiv angeschlagen.** Ich prüfte mit einem
LIKE-Muster `%FROM%beleg_steuerzeilen%` auf Policy-Selbstbezug — das trifft auch den
harmlosen Spaltenbezug `beleg_steuerzeilen.beleg_id` hinter `FROM belege b`. Zwei Sekunden
Schreck, bis der Blick in `pg_policies` zeigte, dass alle vier Policies sauber sind. Der Check
in der Testdatei nutzt jetzt `~* 'from\s+(public\.)?beleg_steuerzeilen'`.

**Die Security Validation der Story hat einen Punkt beschrieben, den die Migration nicht
erfüllte.** „Kein Zugriff für `anon`/`authenticated`" stand in der Checkliste — trotzdem waren
beide neuen `SECURITY DEFINER`-Funktionen über `/rest/v1/rpc/<name>` aufrufbar. Gefunden hat
das nicht ich, sondern der Supabase-Advisor direkt nach dem Anwenden. Praktisch harmlos, weil
Trigger-Funktionen bei direktem Aufruf abbrechen — aber die Checkliste abzuhaken, ohne sie zu
prüfen, ist genau der Fehler, den sie verhindern soll.

## Das Muster des Tages: Abwesenheit von Rot ist kein Grün

Der Testlauf gegen das angewendete Schema lieferte `[]` — kein Fehler. Das beweist aber nur,
dass nichts geworfen wurde, nicht dass die Prüfmaschinerie überhaupt greift. Erst ein
absichtlich fehlschlagender Lauf zeigte, dass die Exception den Aufrufer erreicht:

```
ERROR: Beleg 99-2097-9702: genau eine Steuerzeile ist nicht zulaessig (BER-122)
```

Dasselbe nach dem `REVOKE EXECUTE`: dass die Trigger danach noch feuern, war eine plausible
Annahme (Trigger laufen im Kontext des Tabellen-Eigentümers) — belegt war sie erst durch einen
zweiten Signal-Test. Bei Rechteänderungen an Trigger-Funktionen ist Plausibilität zu wenig.

## Nachtrag: die interaktive E2E hinter dem Passkey-Login

Beim Nachtragen der Vault-Lücke fiel auf, dass dieser Punkt seit dem Baulauf am 23.07. offen
stand — die DB-Semantik war über Trigger-Tests abgesichert, die Oberfläche dahinter nie
geprüft. Nachgeholt am selben Tag.

**Der Trick, der es möglich macht:** Die Session ist ein schlichtes HS256-JWT mit
`AUTH_SESSION_SECRET`. Ein gültiges Token lässt sich mit derselben Signatur-Logik erzeugen und
als Cookie setzen — damit ist alles hinter dem Login prüfbar, ohne einen WebAuthn-Authenticator
zu brauchen. Die Zeremonie selbst bleibt außen vor; sie ist am 12.07. manuell bestanden. Wichtig
ist die Unterscheidung: „E2E hinter dem Login" und „Passkey-Ceremony" sind zwei verschiedene
Dinge, und nur das erste war offen.

11 Prüfungen, alle grün. Die drei, die etwas wert sind:

- **Der Freigabe-Versuch auf einen fremden Beleg antwortet 404, nicht 409.** Hätte die Route
  mit „Beleg ist bereits exportiert" geantwortet, wäre der fremde Datensatz sichtbar gewesen —
  ein Leak. Das 404 beweist, dass die RLS in der Route selbst greift, nicht erst im Trigger.
- **Der Signal-Test.** Dass mein selbstgebautes Token funktioniert, beweist noch nicht, dass die
  Prüfung greift — es könnte auch sein, dass gar nicht geprüft wird. Erst die verfälschte
  Signatur, die abgewiesen wird, zeigt den Unterschied. Gleiche Lehre wie bei den Triggern
  heute Vormittag.
- **Das Freigabe-Formular trägt sichtbar alles, was seit dem 19.07. gebaut wurde:**
  Termin-Kontext, Zahlungsweg mit drei Gegenkonten, Steuerschlüssel `90`/`80` aus
  `steuerschluessel`, StB-Vermerk. Und: Konto **6520 fehlt** in der Auswahl — die Sperre vom
  31.07. ist in der Oberfläche angekommen, nicht nur in der DB.

Ein Zwischenbefund, der keiner war: die Freigabe-Route antwortet auf einen unvollständigen
Payload mit 422 „Zahlungsweg ist Pflicht", **bevor** sie die Zugehörigkeit prüft. Das sah kurz
nach falscher Reihenfolge aus. Ein Blick in den Code zeigt: jeder DB-Zugriff läuft in
`withMandant(...)`, die Zugehörigkeitsprüfung ist die erste Anweisung darin, und sie läuft vor
jeder Mutation. Die Payload-Validierung vorzuziehen ist sogar günstig — sie antwortet für jede
ID gleich und verrät damit nicht, ob ein Beleg existiert.

**Zunächst nicht getan:** Freigabe absenden und Export erzeugen. Beides schreibt auf Produktion
und ist unter GoBD nicht rücknehmbar. Nachweis für den lesenden Teil: 0 geänderte Belege, 0 neue
Audit-Einträge, 0 neue Exporte.

### Nachgeholt am Test-Mandanten (Firma 99)

Synthetischer Beleg `99-2026-0001` (119,00 € / 19 %, Sachkonto 6890, `dokument_fehlt`), dann
die volle Kette durch die Oberfläche. Sechs weitere Prüfungen, alle grün.

Was die Freigabe **von selbst** richtig gemacht hat, ohne dass ich es eingegeben hätte:
Gegenkonto `1800` aus dem gewählten Zahlungsweg (BER-116) und BU-Schlüssel `90` aus dem
19-%-Mapping in `steuerschluessel` (BER-117). Der Steuerschlüssel war im Formular sogar schon
vorbelegt. Die Audit-Kette ist vollständig — fünf Einträge von `steuerschluessel_gesetzt` bis
`dokumentation_bestaetigt`.

Der Export erzeugte genau eine Datenzeile, und die stimmt Feld für Feld:

```
119,00;"S";"EUR";;;;6890;1800;90;0808;"99-2026-0001";;;"E2E-TEST …";…;"Beleg";"fehlt bei Übergabe"
```

Konto, Gegenkonto, BU-Schlüssel in Spalte 9, Belegdatum als TTMM, Belegfeld 1 — und hinten die
Zusatzinformation aus BER-118. Danach: Doppel-Export wird mit 404 abgelehnt, Re-Download ist
byte-identisch, und **der SHA-256 der ausgelieferten Datei ist derselbe wie der `inhalts_hash`
in der Datenbank**. Damit ist die Integritätskette aus BER-121 nicht mehr nur konstruiert,
sondern gemessen.

Firma 01 blieb unberührt: 130 Belege, 65 offen, 0 Änderungen.

### Ein Befund, in den ich selbst hineingelaufen bin

Beim Anlegen des Testbelegs rief ich `naechste_beleg_nr(...)` direkt im INSERT auf. Die Funktion
liefert aber **`json`**, nicht `text` — die Belegnummer landete als `{"beleg_nr" : "99-2026-0001"}`
in der Spalte. Die App macht es richtig (`(nr[0].r as {beleg_nr}).beleg_nr`), mein SQL nicht.

Das ist mehr als mein Fehler: `belege.beleg_nr` hat **keinen Format-CHECK**. Ein Aufrufer, der
das `->> 'beleg_nr'` vergisst, schreibt still einen JSON-Blob als Belegnummer — und die wandert
als **Belegfeld 1** in den Buchungsstapel, über das DATEV die Sätze gruppiert. Beim Testbeleg
war es korrigierbar, weil er noch offen war; nach der Freigabe wäre es festgeschrieben gewesen.
Als offener Punkt im HUB vermerkt.

## Offen

- **Format-CHECK auf `belege.beleg_nr`** bzw. `naechste_beleg_nr` auf `text` umstellen — siehe
  Befund oben. Eine kaputte Belegnummer wird heute nirgends abgefangen.
- **BER-140 ist startklar** — Blockade aufgelöst, Tabelle steht und ist leer.
- **Altbefunde des Security-Advisors**, nicht von BER-122 verursacht: drei `SECURITY DEFINER`-Views
  auf **ERROR**-Level (`v_inbox`, `v_monatsübersicht`, `v_export_bereit`), drei RPC-exponierte
  Alt-Funktionen (`fn_beleg_seiten_insert_guard`, `log_beleg_aenderungen`, `naechste_beleg_nr`),
  `pg_trgm` im `public`-Schema. Eigene Story wert.
- **`docs/UEBERGABE.md` bleibt unverändert** — die v1-Beschränkung ist noch wahr, solange die
  App keine Zeilen schreibt. Sie fällt erst mit BER-143 nach der Abnahme durch den Steuerberater.
- **Vault-Drift:** der PMO HUB im Second Brain steht auf 2026-07-11, die Staging-Fassung auf
  2026-07-12. Die Arbeit von BER-116 bis BER-139 (19.07.–02.08.) ist dort nie nachgetragen
  worden. Heute ist ergänzt, die Lücke davor bleibt offen.
