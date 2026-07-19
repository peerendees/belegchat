---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Betroffenenrechte (Art. 15-22 DSGVO)

## Uebersicht

| Recht | Artikel | Frist | Implementierung |
|-------|---------|-------|-----------------|
| Auskunft | 15 | 1 Monat | GET /api/user/data — alle Daten als JSON |
| Berichtigung | 16 | Unverzueglich | PUT /api/user/profile — Daten aendern |
| Loeschung ("Recht auf Vergessenwerden") | 17 | Unverzueglich | DELETE /api/user — Konto + alle Daten loeschen |
| Einschraenkung | 18 | Unverzueglich | PATCH /api/user/restrict — Verarbeitung einschraenken |
| Datenportabilitaet | 20 | 1 Monat | GET /api/user/export — JSON/CSV-Export |
| Widerspruch | 21 | Unverzueglich | POST /api/user/objection — Opt-Out |
| Automatisierte Entscheidungen | 22 | Unverzueglich | POST /api/user/review — menschliche Pruefung anfordern |

## Fristen

- **Antwortfrist:** 1 Monat ab Eingang
- **Verlaengerung:** Maximal 2 weitere Monate bei Komplexitaet (Betroffenen informieren!)
- **Identitaet pruefen:** Vor Auskunft Identitaet verifizieren (aber nicht uebertrieben)
- **Kostenlos:** Grundsaetzlich kostenlos. Bei offensichtlich unbegruendeten/exzessiven Antraegen: angemessene Gebuehr ODER Ablehnung

## Ausnahmen vom Loeschrecht (Art. 17 Abs. 3)

Loeschung kann verweigert werden bei:
- Gesetzliche Aufbewahrungspflichten (Steuer: 10 Jahre, Handelsrecht: 6 Jahre)
- Rechtsansprueche geltend machen/verteidigen
- Oeffentliches Interesse (Archiv, Forschung, Statistik)
- Meinungsfreiheit und Information

## Implementierungs-Patterns

### Datenexport (Art. 15 + 20)

```
Checkliste fuer Datenexport-Endpoint:
- [ ] Alle Daten des Nutzers erfasst (DB, Logs, Backups, Drittanbieter)
- [ ] Maschinenlesbares Format (JSON bevorzugt, alternativ CSV)
- [ ] Strukturiert und gaengig
- [ ] Keine Daten Dritter im Export enthalten
- [ ] Identitaetspruefung vor Export
- [ ] Download-Link zeitlich begrenzt (z.B. 24h)
```

### Loeschung (Art. 17)

```
Checkliste fuer Loeschung:
- [ ] Primaere Datenbank: Daten geloescht oder anonymisiert
- [ ] Backups: In naechstem Backup-Zyklus ueberschrieben
- [ ] Logs: Personenbezogene Eintraege entfernt
- [ ] Drittanbieter: Loeschanfrage weitergeleitet
- [ ] Suchmaschinen: Delisting beantragt (falls oeffentlich)
- [ ] Abgeleitete Daten: Analytics, ML-Modelle beruecksichtigt
- [ ] Aufbewahrungspflichten geprueft (Steuer, Handelsrecht)
- [ ] Loeschung protokolliert (wann, was, durch wen)
```

### Consent-Widerruf (Art. 7 Abs. 3)

```
Checkliste fuer Widerruf:
- [ ] Widerruf so einfach wie Erteilung (ein Klick genuegt)
- [ ] Widerruf wirkt ab sofort (nicht rueckwirkend)
- [ ] Bereits verarbeitete Daten: Rechtsmaessigkeit bleibt bestehen
- [ ] Kuenftige Verarbeitung: Sofort stoppen
- [ ] Nutzer ueber Konsequenzen informieren
```

## Schweiz (nDSG): Abweichungen

- Auskunftsfrist: **30 Tage** (statt "unverzueglich, spaetestens 1 Monat")
- Datenportabilitaet: Im nDSG explizit geregelt (Art. 28)
- Kein explizites "Recht auf Vergessenwerden" — aber Berichtigungsanspruch (Art. 32)
