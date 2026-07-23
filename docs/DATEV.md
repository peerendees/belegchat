# DATEV-Export (Phase 4, BER-96)

> Stand: 2026-07-12 · EXTF-Buchungsstapel aus dem Dashboard · Vault: `Research/SOP-DATEV-Export`

## Format

| Parameter | Wert |
|-----------|------|
| Format | DATEV-Format (EXTF), Version 700, Kategorie 21 „Buchungsstapel", Formatversion 9 |
| Struktur | 120 Spalten, Semikolon-getrennt, Texte in `"…"`, CRLF |
| Codierung | Latin-1 (Windows-ANSI) |
| Beträge | immer positiv, Komma-Dezimaltrenner, `Soll/Haben-Kennzeichen` separat |
| Referenz | Spaltenlayout verifiziert gegen die produktiv genutzte ERPNext-DATEV-Implementierung (alyf-de/erpnext_datev) |

## Buchungslogik (bewusst einfach — StB verarbeitet weiter)

- **Umsatz** = `betrag_brutto` · **S/H**: `S`, bei `gutschrift`/`ausgangsrechnung` `H`
- **Konto** = SKR04-`sachkonto` des Belegs · **Gegenkonto** = `belege.gegenkonto`, bei der Freigabe
  aus dem Zahlungsweg aufgelöst (1800 Geschäftskonto / 1810 andere Karte/Konto / 2100 privat
  verauslagt, BER-116); Fallback auf die Firmenkonstante `firmen.datev_gegenkonto` nur für Altbestand
  ohne Wert (bis BER-119 nacherfasst hat)
- **BU-Schlüssel** = `belege.bu_schluessel` (Spalte 9), vorbelegt aus der `steuerschluessel`-
  Konfiguration je Firma (Seeds `90` für 19 % / `80` für 7 %, kanzleibestätigt 23.07.2026), Gate über
  `skr04_konten.vorsteuer_relevant`; bei der Freigabe änderbar, leer bei Belegen ohne Vorsteuer (BER-117)
- **Belegdatum** TTMM · **Belegfeld 1** = Beleg-Nr · **Buchungstext** = Verwendungszweck (60 Zeichen)
- Header-Festschreibung = 0 (Festschreibung passiert beim StB-Import)

## Ablauf

1. `/export`: Zeitraum wählen (Monat/Quartal/Jahr) → **CSV-Download**
2. Serverseitig in einer Transaktion: alle Belege `status = geprueft` mit `beleg_datum` im Zeitraum
   → `datev_exporte`-Zeile (Anzahl, Summen, Dateiname) → Belege `geprueft → exportiert`
   (+ `datev_export_id`, `export_datum`) → Audit `export` je Beleg
3. **Re-Download** über die Export-Liste: Datei wird deterministisch aus den festgeschriebenen
   Belegen regeneriert. Das Gegenkonto kommt seit BER-116 aus dem Beleg (`belege.gegenkonto`), nicht
   mehr aus der zur Downloadzeit gelesenen Firmenkonfiguration — die frühere Aussage „nur der
   ‚erzeugt am'-Zeitstempel variiert" war falsch (variabel war die Firmenkonfiguration).
   BER-121 speichert zusätzlich den ausgelieferten Dateiinhalt samt SHA-256 und liefert ihn bitgleich aus.

Belege ohne `beleg_datum` werden nicht exportiert (bleiben `geprueft`, im nächsten passenden Zeitraum prüfen).

## Konfiguration (vom Steuerberater zu liefern)

```sql
UPDATE firmen SET datev_berater_nr = <Beraternummer>,
                  datev_mandant_nr = <Mandantennummer>
 WHERE firma_nr = '01';
-- optional: datev_gegenkonto anpassen (Default 1800)
```

Bis dahin exportiert der Header mit `0;0` — DATEV Re:wesen fragt die Nummern beim Import ab.

## Abnahme

- [x] Export/Re-Export/Isolation/Statuswechsel systemseitig getestet (2026-07-12, `EXTF_Buchungsstapel_2026_M07.csv`, 3 Belege)
- [ ] **Realer Import in DATEV Re:wesen beim StB** — finale Format-Abnahme (DATEV validiert strikt;
  bei Beanstandungen Header-/Spaltendetails nachziehen)
