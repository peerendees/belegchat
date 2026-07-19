---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Privacy by Design — Code-Patterns

## Datenminimierung

### Nur erheben was noetig ist

```javascript
// SCHLECHT: Alles speichern
const user = {
  name, email, phone, birthday, address,
  ipAddress, userAgent, referrer, screenResolution
}

// GUT: Nur was fuer den Zweck noetig ist
const user = { name, email }  // Registrierung braucht nur das
```

### Pseudonymisierung

```python
import hashlib, uuid

def pseudonymize_user_id(user_id: str, salt: str) -> str:
    """Pseudonymisiert User-ID fuer Analytics"""
    return hashlib.sha256(f"{salt}{user_id}".encode()).hexdigest()[:16]

# Mapping nur in separater, zugriffsgeschuetzter Tabelle
# Analytics arbeitet nur mit pseudonymisierten IDs
```

### Aggregation statt Einzeldaten

```python
# SCHLECHT: Einzelne Seitenaufrufe pro User speichern
log_pageview(user_id=123, page="/products", timestamp=now)

# GUT: Nur aggregierte Statistiken
increment_counter(page="/products", date=today)
# Kein Personenbezug, kein Datenschutzproblem
```

> **Automatische Enforcement-Schicht (optional, BOO-93):** Die obige Regel „kein Roh-/Klartext-PII
> in Logs" lässt sich automatisch durchsetzen mit dem optionalen `raw-pii-guard.py` — einem
> statischen AST-Check, der verbotene Felder (`original_value`, `plaintext`, `raw_value` …) in
> Log-/Audit-Senken meldet (Default = Warnung, `--strict` blockt). Einrichtung:
> `bootstrap/references/hooks-setup.md` §„Optional: raw-pii-guard.py". Dieser Skill (`dpo`) liefert
> die Review-Guidance, der Guard die automatische Prüfung.

## Consent-Management

### Cookie-Consent (TTDSG § 25)

```
Anforderungen:
- [ ] Kein Tracking BEVOR Consent erteilt
- [ ] Granulare Auswahl (nicht nur "Alle akzeptieren")
- [ ] "Ablehnen" genauso einfach wie "Akzeptieren"
- [ ] Technisch notwendige Cookies OHNE Consent erlaubt
- [ ] Consent-Entscheidung speichern (mit Timestamp + Version)
- [ ] Consent jederzeit aenderbar
- [ ] Keine Cookie-Walls (Zugang darf nicht von Consent abhaengen)
```

### Consent-Storage Pattern

```javascript
const consentRecord = {
  userId: "uuid-...",
  timestamp: "2026-03-09T14:30:00Z",
  version: "2.1",           // Version der Datenschutzerklaerung
  purposes: {
    necessary: true,         // Immer true, kein Consent noetig
    analytics: false,        // Nutzer hat abgelehnt
    marketing: false,        // Nutzer hat abgelehnt
    personalisation: true    // Nutzer hat zugestimmt
  },
  source: "cookie-banner",   // Wo wurde Consent erteilt
  ipHash: "a1b2c3..."       // Pseudonymisiert, nicht Klartext-IP
}
```

## Loeschkonzept

### Aufbewahrungsfristen (Deutschland)

| Datenart | Frist | Rechtsgrundlage |
|----------|-------|-----------------|
| Handelsbriefe | 6 Jahre | § 257 HGB |
| Buchungsbelege | 10 Jahre | § 257 HGB, § 147 AO |
| Rechnungen | 10 Jahre | § 14b UStG |
| Bewerbungsunterlagen | 6 Monate | AGG Frist |
| Lohnabrechnungen | 6 Jahre | § 257 HGB |
| Vertragsdaten | 3 Jahre nach Ende | § 195 BGB Verjaehrung |
| Nutzeraccounts | Nach Kontolöschung | Sofort (sofern keine andere Pflicht) |
| Server-Logs | Max. 7 Tage | Berechtigtes Interesse, aber minimieren |
| Analytics | Max. 26 Monate | Google Analytics Default — besser kuerzer |

### Automatische Loeschung

```python
# Cron-Job / Scheduled Task
def cleanup_expired_data():
    # Accounts die zur Loeschung markiert sind
    delete_marked_accounts(older_than=days(30))  # 30 Tage Karenzzeit

    # Server-Logs aelter als 7 Tage
    purge_logs(older_than=days(7))

    # Abgelaufene Sessions
    delete_expired_sessions()

    # Bewerbungen aelter als 6 Monate
    anonymize_applications(older_than=months(6))
```

## Drittanbieter-Integration

### Checkliste vor Integration

```
- [ ] AVV/DPA (Auftragsverarbeitungsvertrag) abgeschlossen
- [ ] Serverstandort bekannt (EU/EWR bevorzugt)
- [ ] Bei Drittland: Angemessenheitsbeschluss oder SCCs
- [ ] Datenkategorien definiert die uebermittelt werden
- [ ] Loeschung bei Vertragsende geregelt
- [ ] Unterauftragnehmer bekannt und dokumentiert
- [ ] In Datenschutzerklaerung aufgefuehrt
```

### Gaengige Dienstleister — Datenschutz-Status

| Anbieter | Standort | AVV | Hinweis |
|----------|----------|-----|---------|
| AWS | EU-Region waehlbar | Ja | Frankfurt (eu-central-1) bevorzugen |
| Google Cloud | EU-Region waehlbar | Ja | Belgien/Frankfurt waehlbar |
| Hetzner | Deutschland | Ja | DSGVO-konform, EU-only |
| Vercel | USA | Ja | EU-Daten moeglich, aber US-Firma |
| Stripe | USA + EU | Ja | EU-Entitaet vorhanden |
| Mailgun/Sendgrid | USA | Ja | SCCs pruefen |

## Datenschutzerklaerung — Pflichtinhalte (Art. 13)

```
Jede Datenschutzerklaerung MUSS enthalten:
- [ ] Name + Kontakt des Verantwortlichen
- [ ] Kontakt des DPO (falls vorhanden)
- [ ] Zwecke + Rechtsgrundlage pro Verarbeitung
- [ ] Berechtigte Interessen (falls Art. 6 Abs. 1 f)
- [ ] Empfaenger / Kategorien von Empfaengern
- [ ] Drittlandtransfers + Garantien
- [ ] Speicherdauer / Kriterien fuer Festlegung
- [ ] Betroffenenrechte (Art. 15-22)
- [ ] Widerrufsrecht bei Einwilligung
- [ ] Beschwerderecht bei Aufsichtsbehoerde
- [ ] Ob Bereitstellung gesetzlich/vertraglich vorgeschrieben
- [ ] Automatisierte Entscheidungsfindung (falls vorhanden)
```
