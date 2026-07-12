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
- **Konto** = SKR04-`sachkonto` des Belegs · **Gegenkonto** = `firmen.datev_gegenkonto` (Default `1800` Bank)
- **BU-Schlüssel leer** — Steuer läuft über SKR04-Automatikkonten bzw. wird vom StB gesetzt
- **Belegdatum** TTMM · **Belegfeld 1** = Beleg-Nr · **Buchungstext** = Verwendungszweck (60 Zeichen)
- Header-Festschreibung = 0 (Festschreibung passiert beim StB-Import)

## Ablauf

1. `/export`: Zeitraum wählen (Monat/Quartal/Jahr) → **CSV-Download**
2. Serverseitig in einer Transaktion: alle Belege `status = geprueft` mit `beleg_datum` im Zeitraum
   → `datev_exporte`-Zeile (Anzahl, Summen, Dateiname) → Belege `geprueft → exportiert`
   (+ `datev_export_id`, `export_datum`) → Audit `export` je Beleg
3. **Re-Download** über die Export-Liste: Datei wird deterministisch aus den festgeschriebenen
   Belegen regeneriert (kein Datei-Storage nötig; nur der „erzeugt am"-Zeitstempel im Header variiert)

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
