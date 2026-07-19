---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Verarbeitungsverzeichnis (Art. 30 DSGVO)

## Pflicht

Ein Verarbeitungsverzeichnis ist PFLICHT fuer:
- Unternehmen mit 250+ Mitarbeitern (immer)
- Alle Unternehmen bei: nicht nur gelegentlicher Verarbeitung, Risiko fuer Betroffene, besondere Datenkategorien (Art. 9)
- **In der Praxis: Quasi immer erforderlich**

## Vorlage — Verzeichnis des Verantwortlichen (Art. 30 Abs. 1)

### Eintrag pro Verarbeitungstaetigkeit

```
---
Verarbeitungstaetigkeit: [z.B. "Nutzerregistrierung"]
Verantwortlicher: [Firma, Adresse, Kontakt]
DPO: [Name, Kontakt]
---

Zweck: [Warum?]
Rechtsgrundlage: [Art. 6 Abs. 1 lit. ?]

Betroffene Personen:
- [ ] Kunden/Nutzer
- [ ] Mitarbeiter
- [ ] Bewerber
- [ ] Lieferanten
- [ ] Sonstige: ___

Datenkategorien:
- [ ] Stammdaten (Name, Adresse)
- [ ] Kontaktdaten (E-Mail, Telefon)
- [ ] Vertragsdaten
- [ ] Zahlungsdaten
- [ ] Nutzungsdaten (Logs, IPs)
- [ ] Besondere Kategorien (Art. 9): ___

Empfaenger:
- Intern: [Abteilungen]
- Extern: [Dienstleister mit AVV]
- Drittland: [Land + Garantie]

Aufbewahrungsfrist: [z.B. "3 Jahre nach Vertragsende"]
Loeschregel: [z.B. "Automatisch nach Fristablauf"]

TOMs (Verweis): [→ Security Architect / TOM-Dokument]
DPIA erforderlich: Ja / Nein
DPIA durchgefuehrt: [Datum] / Entfaellt

Letzte Pruefung: [Datum]
Naechste Pruefung: [Datum]
```

## Beispieleintraege

### 1. Nutzerregistrierung

| Feld | Wert |
|------|------|
| Zweck | Erstellung und Verwaltung von Nutzerkonten |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b (Vertragserfuellung) |
| Betroffene | Registrierte Nutzer |
| Datenkategorien | Name, E-Mail, Passwort (gehasht), Registrierungsdatum |
| Empfaenger | Intern: Entwicklung, Support. Extern: E-Mail-Provider (AVV) |
| Drittland | Nein (EU-Server) |
| Speicherdauer | Bis Kontolöschung + 30 Tage Karenz |
| Loeschung | Automatisch nach Kontolöschung + Karenzzeit |
| DPIA | Nicht erforderlich |

### 2. Newsletter-Versand

| Feld | Wert |
|------|------|
| Zweck | Versand von Marketing-E-Mails |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. a (Einwilligung) + Double Opt-In |
| Betroffene | Newsletter-Abonnenten |
| Datenkategorien | E-Mail, Anmeldedatum, Consent-Nachweis, Oeffnungsrate |
| Empfaenger | Extern: Newsletter-Tool (AVV) |
| Drittland | USA (SCCs + DPF) |
| Speicherdauer | Bis Abmeldung |
| Loeschung | Sofort nach Abmeldung (E-Mail auf Sperrliste) |
| DPIA | Nicht erforderlich |

### 3. Zahlungsabwicklung

| Feld | Wert |
|------|------|
| Zweck | Abwicklung von Zahlungen |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b (Vertragserfuellung) |
| Betroffene | Zahlende Kunden |
| Datenkategorien | Name, Rechnungsadresse, Zahlungsmethode (tokenisiert), Rechnungen |
| Empfaenger | Extern: Payment Provider (AVV), Steuerberater |
| Drittland | USA (Payment Provider — SCCs + DPF) |
| Speicherdauer | Rechnungen: 10 Jahre (§ 147 AO). Zahlungsdaten: bis Vertragsende |
| Loeschung | Automatisch nach Ablauf der Aufbewahrungsfrist |
| DPIA | Nicht erforderlich (Standard-Zahlungsabwicklung) |

## Pflege des Verzeichnisses

- **Aktualisierung:** Bei jeder neuen Verarbeitungstaetigkeit oder Aenderung
- **Review:** Mindestens jaehrlich
- **Format:** Digital, jederzeit der Aufsichtsbehoerde vorzeigbar
- **Verantwortlich:** DPO oder Verantwortlicher
