---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# DPIA-Vorlage (Art. 35 DSGVO)

## Schwellwert-Analyse: Ist eine DPIA erforderlich?

Eine DPIA ist PFLICHT wenn mindestens 2 der folgenden Kriterien zutreffen:

| # | Kriterium | Beispiel |
|---|-----------|----------|
| 1 | Scoring/Profiling | Kreditwuerdigkeit, Verhaltensvorhersage |
| 2 | Automatisierte Entscheidung mit Rechtswirkung | Automatische Kreditvergabe, Bewerber-Screening |
| 3 | Systematische Ueberwachung | CCTV, Mitarbeiter-Monitoring, GPS-Tracking |
| 4 | Sensible Daten (Art. 9) | Gesundheit, Biometrie, Religion, Sexualleben |
| 5 | Daten im grossen Umfang | Kundendatenbank > 10.000, Nutzer-Tracking |
| 6 | Zusammenfuehrung von Datensaetzen | CRM + Analytics + Social Media |
| 7 | Schutzbeduertige Personen | Kinder, Patienten, Arbeitnehmer |
| 8 | Neue Technologien | KI, IoT, Biometrie, Blockchain |
| 9 | Verhinderung der Rechteausuebung | Daten sperren Zugang zu Dienstleistung |

## DPIA-Struktur

### 1. Beschreibung der Verarbeitung

- **Verarbeitungstaetigkeit:** [Name und Beschreibung]
- **Zweck:** [Warum werden die Daten verarbeitet?]
- **Rechtsgrundlage:** [Art. 6 Abs. 1 lit. a-f + ggf. Art. 9 Abs. 2]
- **Verantwortlicher:** [Organisation + Kontaktdaten]
- **DPO-Kontakt:** [Falls vorhanden]

### 2. Dateninventar

| Datenkategorie | Betroffene | Quelle | Empfaenger | Speicherdauer | Loeschung |
|----------------|-----------|--------|-----------|---------------|-----------|
| [z.B. E-Mail] | [Nutzer] | [Registrierung] | [Intern + Mailprovider] | [2 Jahre] | [Automatisch] |

### 3. Notwendigkeit und Verhaeltnismaessigkeit

- Ist die Verarbeitung fuer den Zweck **erforderlich**?
- Gibt es **mildere Mittel** (weniger Daten, kuerzere Speicherung)?
- Ist die **Datenminimierung** eingehalten?
- Werden Betroffene **informiert** (Art. 13/14)?
- Koennen Betroffene ihre **Rechte ausueben** (Art. 15-22)?

### 4. Risikobewertung

Fuer jedes identifizierte Risiko:

| Risiko | Eintrittswahrscheinlichkeit | Schwere | Risiko-Level | Massnahme |
|--------|---------------------------|---------|-------------|-----------|
| Unbefugter Zugriff | Mittel | Hoch | HOCH | Verschluesselung + RBAC |
| Datenverlust | Niedrig | Hoch | MITTEL | Backup + Disaster Recovery |
| Zweckentfremdung | Niedrig | Mittel | NIEDRIG | Zugriffskontrollen + Logging |

**Risiko-Matrix:**

| Schwere \ Wahrscheinlichkeit | Niedrig | Mittel | Hoch |
|------------------------------|---------|--------|------|
| Hoch | MITTEL | HOCH | SEHR HOCH |
| Mittel | NIEDRIG | MITTEL | HOCH |
| Niedrig | NIEDRIG | NIEDRIG | MITTEL |

### 5. Abhilfemassnahmen

| Massnahme | Typ | Umsetzung | Status |
|-----------|-----|-----------|--------|
| AES-256 Verschluesselung | Technisch | → Security Architect | [ ] |
| Zugriffskonzept mit RBAC | Technisch | → Security Architect | [ ] |
| Datenschutzerklaerung aktualisieren | Organisatorisch | Text erstellen | [ ] |
| Loeschkonzept implementieren | Technisch + Org. | Fristen definieren + Cron | [ ] |
| Mitarbeiterschulung | Organisatorisch | Schulungsplan | [ ] |

### 6. Ergebnis

- **Restrisiko nach Massnahmen:** Niedrig / Mittel / Hoch
- **Bei hohem Restrisiko:** Konsultation der Aufsichtsbehoerde erforderlich (Art. 36)
- **Freigabe:** Datum, Verantwortlicher
- **Naechste Ueberpruefung:** [Datum, spaetestens 1 Jahr]
