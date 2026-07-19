---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architektur-Dimensionen

Bei jeder Story die relevanten Dimensionen pruefen. Nicht alle sind immer zutreffend — nur die anwenden die fuer die konkrete Aenderung relevant sind.

**Struktur:** 6 Standard-Dimensionen (immer aktiv) + Optional-Add-ons (nur bei Bedarf, im Bootstrap Block A.7 aktiviert).

## Standard-Dimensionen (immer relevant)

### 1. Reliability

- Kann das Feature ausfallen ohne das System zu blockieren?
- Graceful Degradation implementiert?
- Gibt es einen Retry-Mechanismus bei transienten Fehlern?
- Kill-Switch oder Feature-Flag vorhanden um das Feature schnell zu deaktivieren?
- Wurde getestet was passiert wenn externe Abhaengigkeiten down sind?

### 2. Data Integrity

- Authoritative Datenquelle (SSoT) klar benannt?
- Atomic Writes wo noetig (write-then-rename, Transaktionen)?
- Race Conditions bei parallelen Zugriffen bedacht?
- Idempotenz bei Retries sichergestellt?
- Backups oder Recovery-Strategie fuer kritische Daten?

### 3. Security

- API-Keys und Secrets ausschliesslich in `.env`, nie im Code, nie im Log?
- Inputs validiert (User-Input, Webhooks, externe APIs)?
- Tokens in Logs sanitized?
- Webhooks mit HMAC-Signing, Replay-Schutz?
- Principle of Least Privilege bei Tool-/File-Zugriffen?

### 4. Performance

- Akzeptable Latenz fuer den Use-Case?
- Rate-Limits externer APIs eingehalten und dokumentiert?
- Memory-Verbrauch im Rahmen (kein unbegrenztes Puffern)?
- WebSocket-/Long-Lived-Connection-Stabilitaet?
- Caching wo sinnvoll (semantisch oder TTL-basiert)?

### 5. Observability

- Strukturiertes Logging implementiert?
- Alerts bei kritischen Fehlern?
- Metriken fuer wichtige State-Aenderungen?
- Self-Healing-Check noetig (wenn Self-Healing-Agent aktiv)?
- Tracing fuer verteilte Calls?

### 6. Maintainability

- Code-Duplikation vermieden?
- Konfigurationswerte in SSoT (nicht hardcoded)?
- Doku muss aktualisiert werden — welche Files?
- Verstaendlich ohne zusaetzlichen Kontext (Naming, Kommentare bei nicht-offensichtlichen Stellen)?
- Tests fuer die wichtigsten Pfade?

---

## Optional-Add-ons (nur wenn im Bootstrap aktiviert)

Diese Dimensionen sind projekt-spezifisch und werden im `/bootstrap` Block A.7 aktiviert. Aktive Add-ons stehen in `ARCHITECTURE_DESIGN.md §3 Quality Attributes` und werden bei Story-Planung mitgeprueft.

### 7. Privacy / DSGVO (wenn Privacy-Add-on aktiv)

Fuer Projekte mit personenbezogenen Daten, Voice-Assistants, Tier-Modellen, regulierten Umgebungen.

- Datenflussgrenzen explizit dokumentiert? (Tier 0/1/2 oder analog)
- Vor jedem Cloud-Call: Redaktion von PII (Emails, Tokens, IBANs, Telefonnummern)?
- Betroffenenrechte (Loeschung, Auskunft) implementierbar?
- Audit-Log bei Privacy-Tier-Wechsel?
- Offline-Fallback wenn Privacy-Tier 0 erzwungen?

### 8. Cost Efficiency (wenn Cost-Efficiency-Add-on aktiv)

Fuer Projekte mit LLM-Kosten, SaaS-Subscriptions, Cloud-Ressourcen.

- API-/Token-Kosten pro Call abschaetzbar?
- Cache-Strategie fuer wiederholte Queries?
- Gibt es eine kostenlose oder guenstigere Alternative?
- Rate-Limit-Budget wird nicht unnoetig aufgebraucht?
- Monatliche Kosten-Obergrenze definiert?

### 9. Signal Quality (wenn Signal-Quality-Add-on aktiv)

Fuer ML-, Analytics- oder Signal-Verarbeitungs-Projekte.

- Verbessert das Feature die Vorhersage-/Entscheidungsqualitaet?
- Evaluation-Metrik definiert (Precision, Recall, F1, custom)?
- Feedback-Loop vorhanden (Attribution, Active Learning)?
- False-Positive/False-Negative-Trade-off dokumentiert?
- Backtesting/Validation-Strategie vor Production?

### 10. Compliance (wenn Compliance-Add-on aktiv)

Fuer regulierte Branchen (Gesundheit, Finanz, Legal).

- Gesetzliche Anforderungen identifiziert (DSGVO, HIPAA, SOX, etc.)?
- Audit-Trail fuer kritische Aktionen?
- Data-Retention-Policy eingehalten?
- Verantwortliche Rolle (Data Protection Officer, Compliance Officer) involviert?
- Dokumentation fuer Auditoren pflegbar (z.B. in `compliance/`)?

---

## Domain-spezifische Beispiele (optionaler Anhang)

Diese Beispiele zeigen wie Dimensionen in konkreten Projekt-Domaenen ausgepraegt werden koennen. Nur als Referenz — nicht Default.

### Voice-Assistant (z.B. Jarvis)
- **Privacy** (Tier 0/1/2 schaltbar)
- **Reliability** (Offline-Fallback Pflicht)
- **Performance** (Wake-Word-Latenz < 300ms)
- **Data Integrity** (Memory-Konsolidierung, atomic writes)

### Trading-System
- **Reliability** (Kill-Switch First)
- **Data Integrity** (JSONL als SSoT, Dual-Write)
- **Signal Quality** (Weight-Optimierung, Contrarian vs. Consensus)
- **Cost Efficiency** (LLM-Calls fuer kritische Entscheidungen reservieren)

### Research-Projekt
- **Observability** (Reproduzierbarkeit, Versioning der Prompts)
- **Data Integrity** (Source-Tracking, Zitier-Graph)
- **Cost Efficiency** (API-Budget pro Run)

### Backend-Service
- **Reliability** (SLA, Rate-Limiting)
- **Security** (Auth, Input-Validation)
- **Observability** (Tracing, Alerting)
- **Performance** (Throughput, Latenz-Percentiles)

---

## Verwendung im `/ideation`-Skill

Bei jeder Story:
1. Standard-Dimensionen (1-6) werden erwaehnt mit kurzer Einschaetzung ("Reliability: keine kritische Aenderung")
2. Aktive Add-ons (aus `.bootstrap-config` oder `ARCHITECTURE_DESIGN.md`) werden bei Bedarf angewendet
3. Nicht-aktive Dimensionen werden weggelassen
4. Bei Unsicherheit: lieber einschliessen + kurze Einschaetzung

Output-Format fuer Story (siehe `story-template-feature.md`):
```
## Architektur-Dimensionen (betroffen)

- **Reliability:** [kurz, was geprueft wird, welcher Status]
- **Security:** [kurz]
- [Privacy — wenn aktiv und betroffen]
```
