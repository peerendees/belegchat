# Feature-Wünsche — Registry

> Angelegt 23.07.2026 auf Betreiber-Wunsch: zentrale, gepflegte Liste aller
> Feature-Wünsche als Quelle für Release-Planung. Später abgelöst durch das
> **Feature-Voting-Modul** (F-01): Nutzer pflegen Wünsche selbst im Dashboard und
> bewerten sie; die beliebtesten werden zuerst umgesetzt. Bis dahin: Einträge hier
> ergänzen (fortlaufende F-Nummer), bei Umsetzungsentscheidung Linear-Issue
> anlegen und hier verlinken.
>
> provenance: classification internal · status final · source mixed

| Nr | Wunsch | Quelle / Datum | Status | Bezug |
|----|--------|----------------|--------|-------|
| F-01 | **Feature-Voting-Modul**: Wünsche im Dashboard erfassen, kommentieren, bewerten (Stimmen je Mandant); Betreiber-Sicht mit Ranking. Skizze: Tabellen `feature_wuensche (id, titel, beschreibung, status, erstellt_von_mandant)` + `feature_stimmen (wunsch_id, mandant_id, UNIQUE)`; RLS lesend für alle Mandanten des Betreibers, schreibend je Mandant | Betreiber, 23.07.2026 | gemerkt | ersetzt diese Datei |
| F-02 | **Kassenbuch-Modul** für Barzahlungen (SKR04 1600, laufende Kassenführung). Bis dahin: Barbelege als Scan mit Zahlungsweg `privat` bzw. `alternativkonto` | Betreiber, 23.07.2026 (StB-Fragenliste Alt-8) | gemerkt | BER-116; Modul-Muster Strukturprüfung §1.4 |
| F-03 | **Gewerbesteuer-Unterstützung** für gewerbliche Kunden (Produkt-Betatest): Konto 7610 im SKR04-Seed, Kontierungsregeln, keine Vorsteuer (Gate vorhanden). Für den Betreiber selbst gegenstandslos (Freiberufler) | Betreiber, 23.07.2026 | gemerkt | [BER-120](../specs/BER-120.md) Seeds |
| F-04 | **Lohnkonten** (SKR04 60xx statt 6300) sobald erstmals Lohnbelege anfallen; Kontenbereinigung | Betreiber, 23.07.2026 (Alt-9) | gemerkt | [BER-120](../specs/BER-120.md) |
| F-05 | **Onboarding-Automatisierung** (Einmal-Code, Threema-ID-Rückkanal, Passkey → Dashboard) | Strukturprüfung §1.2, 23.07.2026 | gemerkt (Provisionierungsweg verifiziert Betreiber) | `registrierungs_codes` |
| F-06 | **Storno/Korrektur** festgeschriebener Belege (beleg_typ `storno`, GU-Spalte) | Strukturprüfung §1.5 | gemerkt | löst Einmaligkeits-Grenze aus BER-119 ab |
| F-07 | **Zahlungsabgleich CAMT/MT940** (`bank_transaktionen`, Matching gegen `belege.gegenkonto`) | Strukturprüfung §1.6 | gemerkt | BER-116 ist die manuelle Vorstufe |
| F-08 | **Erlösseite** (Ausgangsrechnungen, Erlöskonten, Debitoren, USt-Schlüssel `typ='umsatzsteuer'`) | Strukturprüfung §1.7 | gemerkt | `steuerschluessel.typ` vorbereitet |
| F-09 | **Reisekosten/VMA-Modul** (Reise klammert Belege, Pauschalen festgeschrieben, eigener Export) | Strukturprüfung §1.3 | gemerkt | Betreiber-Vorgabe: Export NEBEN dem Stapel |
| F-10 | **Betreiber-Verwaltungssicht** (kundenübergreifend, eigene Rolle `betreiber_service`, strikt getrennter Pfad) | Strukturprüfung §1.1 | gemerkt — datenschutzkritisch | Abo-Modell |
| F-11 | **Threema-Eingangs-Besitzer** je geteilter ID (`threema_eingang`-Mechanik), falls Testfirma dieselbe Work-ID nutzen soll | Strukturprüfung §1.1 | gemerkt (Betreiber entscheidet Bedarf) | Schutzindex seit 20260723 aktiv |
| F-12 | **Mehrere MwSt-Sätze pro Beleg** | BER-122 (Spec fertig) | eingeplant: nächstes Release | [BER-122](../specs/BER-122.md) |
| F-13 | **Vollständigkeitsexport** (Vertragsende/Aufbewahrung) | BER-123 (Linear) | gemerkt | nutzt Hash-Mechanik aus BER-121 |
