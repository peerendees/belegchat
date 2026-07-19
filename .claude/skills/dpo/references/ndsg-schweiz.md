---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# nDSG — Schweizer Datenschutzgesetz

In Kraft seit 1. September 2023. Gilt fuer alle Verarbeitungen mit Auswirkung in der Schweiz.

## Wesentliche Unterschiede zur DSGVO

| Thema | DSGVO (EU) | nDSG (Schweiz) |
|-------|-----------|----------------|
| **Geltungsbereich** | Sitz in EU oder Angebot an EU-Buerger | Auswirkungsprinzip — Auswirkung in CH genuegt |
| **Personenbezug** | Nur natuerliche Personen | Nur natuerliche Personen (seit nDSG, vorher auch juristische) |
| **Bussen** | Bis 20 Mio. EUR / 4% Umsatz gegen **Unternehmen** | Bis CHF 250.000 gegen **natuerliche Personen** (!) |
| **DPO-Pflicht** | Pflicht in vielen Faellen | Freiwillig ("Datenschutzberater"), aber empfohlen |
| **DPIA** | Bei Aufsichtsbehoerde vorab konsultieren | DPO kann statt Behoerde konsultiert werden |
| **Meldepflicht Breach** | 72 Stunden an Aufsichtsbehoerde | "So rasch als moeglich" an EDOEB — keine fixe Frist |
| **Auskunftsfrist** | "Unverzueglich", spaetestens 1 Monat | 30 Tage |
| **Profiling** | Informationspflicht | "Profiling mit hohem Risiko" braucht Einwilligung |
| **Drittlandtransfer** | Angemessenheitsbeschluss der EU-Kommission | Laenderliste des Bundesrats |
| **Aufsichtsbehoerde** | Nationale Behoerden (z.B. BfDI in DE) | EDOEB (Eidg. Datenschutzbeauftragter) |
| **Verarbeitungsverzeichnis** | Pflicht ab 250 MA (oder bei Risiko) | Pflicht ab 250 MA (oder bei Risiko). KMU-Ausnahme moeglich |
| **Einwilligung** | Ausdruecklich bei besonderen Kategorien | Ausdruecklich bei besonders schuetzenswerten Daten UND Profiling mit hohem Risiko |

## Besonders schuetzenswerte Daten (Art. 5 lit. c nDSG)

Vergleich zu Art. 9 DSGVO:

| nDSG | DSGVO Entsprechung |
|------|-------------------|
| Religioese, weltanschauliche, politische Ansichten | Art. 9: Religion, politische Meinung |
| Gesundheitsdaten | Art. 9: Gesundheitsdaten |
| Genetische Daten | Art. 9: Genetische Daten |
| Biometrische Daten zur Identifizierung | Art. 9: Biometrische Daten |
| Daten ueber Rassenzugehoerigkeit/Ethnizitaet | Art. 9: Rassische/ethnische Herkunft |
| Daten ueber Sozialhilfe | **Neu im nDSG** — in DSGVO nicht explizit |
| Daten ueber verwaltungs-/strafrechtliche Verfolgungen | **Breiter als DSGVO** Art. 10 |
| Gewerkschaftszugehoerigkeit | Art. 9: Gewerkschaftszugehoerigkeit |
| Daten ueber Sexualleben/sexuelle Orientierung | Art. 9: Sexualleben/Orientierung |

## Drittlandtransfer nach nDSG

1. **Laenderliste des Bundesrats pruefen** (Anhang 1 DSV)
   - EU/EWR-Staaten: Als angemessen anerkannt
   - UK, Kanada, Japan, Neuseeland u.a.: Anerkannt
   - USA: **Nur mit zusaetzlichen Garantien** (kein genereller Angemessenheitsbeschluss wie EU-US DPF)
2. **Falls nicht auf Liste:** Standardvertragsklauseln oder verbindliche Unternehmensregeln
3. **Ausnahmen:** Einwilligung, Vertragserfuellung, oeffentliches Interesse

## Meldepflicht bei Datenschutzverletzungen (Art. 24 nDSG)

```
Ablauf:
1. Verletzung erkannt
2. Risikobewertung: Besteht voraussichtlich ein hohes Risiko?
   → Ja: Meldung an EDOEB "so rasch als moeglich"
   → Nein: Interne Dokumentation genuegt
3. Falls hohes Risiko fuer Betroffene:
   → Auch Betroffene informieren
4. Auftragsbearbeiter:
   → Meldet an den Verantwortlichen (nicht direkt an EDOEB)
```

**Wichtig:** Keine starre 72-Stunden-Frist wie DSGVO. Aber "so rasch als moeglich" bedeutet in der Praxis: wenige Tage, nicht Wochen.

## Praxis-Tipps fuer DE+CH Projekte

Wenn ein Projekt sowohl in der EU als auch in der Schweiz operiert:

1. **DSGVO als Basis verwenden** — ist in den meisten Punkten strenger
2. **nDSG-Besonderheiten obendrauf:**
   - Bussen gegen natuerliche Personen beachten (persoenliches Risiko!)
   - Profiling mit hohem Risiko: Ausdrueckliche Einwilligung
   - Drittlandtransfer: Schweizer Laenderliste pruefen (weicht von EU ab)
   - Meldepflicht: Separate Meldung an EDOEB (zusaetzlich zu EU-Behoerde)
3. **Datenschutzerklaerung:** Beide Regelwerke referenzieren
4. **Verarbeitungsverzeichnis:** Ein Verzeichnis genuegt, aber nDSG-Felder ergaenzen
