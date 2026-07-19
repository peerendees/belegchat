---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architecture Design Document (ADD) — Template

Dieses Template wird bei jeder `/ideation` fuer Feature-Stories erstellt.
Es beschreibt die Architektur der geplanten Aenderung so vollstaendig,
dass ein Architekt oder Entwickler die Umsetzung ohne Rueckfragen starten kann.

> **Wichtig:** Nur relevante Sektionen ausfuellen. Nicht jede Story braucht jede Sektion.
> Ein einfacher neuer Agent braucht kein Deployment-Diagramm. Aber ein neuer Trade-Pfad
> braucht alle Layer. Markiere nicht-relevante Sektionen mit "— Nicht betroffen —".

---

## Template

```markdown
# ADD: [Story-Titel]

> Version: 1.0 | Erstellt: [Datum] | Story: [STORY-XX]
> Status: DRAFT → REVIEW → APPROVED

---

## 1. Zusammenfassung

**Was wird gebaut:** [1-2 Saetze — was ist das Ergebnis?]
**Warum:** [Business-Grund / technische Notwendigkeit]
**Scope:** [Was gehoert dazu, was explizit NICHT]

---

## 2. Architektur-Uebersicht

### 2.1 Betroffene Layer

| Layer | Betroffen | Aenderung |
|-------|-----------|-----------|
| L1 — Data Ingestion | ✅/❌ | [Neuer Agent? Neue API? Neues Signal-File?] |
| L2 — Aggregation | ✅/❌ | [Neues Weight? Supervisor-Logik? Score-Berechnung?] |
| L3 — Decision / LLM | ✅/❌ | [Neuer Entscheidungspfad? LLM-Arbiter-Anpassung?] |
| L4 — Execution | ✅/❌ | [Neuer Trade-Typ? Sizing? SL/TP-Logik?] |
| L5 — Monitoring | ✅/❌ | [Neuer Self-Healing-Check? Position-Monitor?] |
| L6 — Feedback | ✅/❌ | [Neuer Feedback-Loop? Weight-Optimizer-Anpassung?] |
| L7 — Presentation | ✅/❌ | [Dashboard? Telegram? Briefing?] |

### 2.2 Komponenten-Diagramm

Zeigt die neuen und betroffenen Komponenten und wie sie zusammenspielen.

```
[Externe API]                [Bestehende Komponente]
      │                              │
      ▼                              ▼
┌──────────────┐  signals/*.json  ┌──────────────┐
│ Neue         │ ───────────────→ │ Supervisor   │
│ Komponente   │                  │              │
└──────────────┘                  └──────┬───────┘
                                         │
                                         ▼
                                  [Naechster Layer]
```

> Legende: ─── Datenfluss | ═══ Kontrollfluss | ··· Optional/Fallback

### 2.3 Sequenz-Diagramm (bei komplexen Ablaeufen)

Zeigt die zeitliche Abfolge von Aufrufen zwischen Komponenten.

```
Trigger ──→ Komponente A ──→ Komponente B ──→ Ergebnis
              │                   │
              │  Fehlerfall       │
              └──→ Fallback ─────┘
```

---

## 3. Datenarchitektur

### 3.1 Datenfluss

Beschreibt welche Daten wo entstehen, wie sie transformiert werden und wo sie landen.

| Quelle | Format | Transformation | Ziel | Frequenz |
|--------|--------|---------------|------|----------|
| [API/Agent] | [JSON/WebSocket/...] | [Normalisierung/Scoring/...] | [Signal-File/DB/Journal] | [5min/Event/...] |

### 3.2 Neue Datenstrukturen

Definiert neue oder geaenderte Datenformate.

**Signal-Output** (falls neuer Agent):
```json
{
  "score": 0.0,
  "signal": "HOLD",
  "confidence": 0.0,
  "timestamp": "ISO8601Z",
  "source": "agent-name",
  "assets": {
    "BTC": { "score": 0.0, "signal": "HOLD", "details": {} }
  }
}
```

**Neue DB-Tabellen** (falls Datenbank betroffen):
```sql
-- Tabellenname und Zweck
CREATE TABLE IF NOT EXISTS ... (
  ...
);
```

### 3.3 DB Impact (PFLICHT bei Datenbank-Aenderungen)

| Frage | Antwort |
|-------|---------|
| Wird eine neue Tabelle benoetigt? | Ja/Nein — falls ja: Schema, Migration, Dedup-Strategie |
| Wird in eine bestehende Tabelle geschrieben? | Ja/Nein — falls ja: Writer dokumentieren |
| Wird aus einer bestehenden Tabelle gelesen? | Ja/Nein — falls ja: Reader dokumentieren |
| Aendert sich das Impact-Profil einer Tabelle? | Ja/Nein — falls ja: Impact-Matrix aktualisieren |

Falls alles "Nein": Sektion mit "— Kein DB Impact —" markieren.

### 3.4 Datenkonsistenz

- **SSoT:** Welche Datei/Tabelle ist authoritativ?
- **Dual-Write:** Muss JSONL + DB synchron geschrieben werden?
- **Atomic Writes:** Write-then-rename fuer kritische Dateien?
- **Race Conditions:** Koennen parallele Agents die gleiche Datei schreiben?

---

## 4. API- und Integrations-Design

### 4.1 Externe APIs (neue oder geaenderte)

| API | Endpoint | Auth | Rate Limit | Kosten | Fallback |
|-----|----------|------|-----------|--------|----------|
| [Name] | [URL] | [Key/OAuth/...] | [X req/min] | [Free/$X/mo] | [Alternative oder Degradation] |

### 4.2 Interne Schnittstellen

Welche bestehenden Module/Libraries werden genutzt oder erweitert?

| Modul | Funktion | Aenderung |
|-------|----------|-----------|
| `lib/config.js` | [AGENT_WEIGHTS/SIGNAL_FILES/...] | [Neuer Eintrag / Aenderung] |
| `lib/signals.js` | [readSignal/writeSignal] | [Keine / Erweiterung] |
| `lib/http.js` | [fetchWithRetry] | [Keine / Neuer Endpoint] |

---

## 5. Infrastruktur-Impact

> Diese Sektion wird vom Cloud System Engineer ausgefuellt (Agent Team Teammate).

### 5.1 Ressourcen

| Ressource | Aktuell | Nach Aenderung | Delta |
|-----------|---------|---------------|-------|
| CPU | [X%] | [Y%] | [+Z%] |
| RAM | [X MB] | [Y MB] | [+Z MB] |
| Disk | [X GB] | [Y GB] | [+Z GB] |
| Netzwerk | [X req/min] | [Y req/min] | [+Z req/min] |

### 5.2 Infrastruktur-Aenderungen

- **Firewall:** [Neue Ports? Egress-Regeln?]
- **Docker:** [Neuer Container? Volume? Netzwerk?]
- **DNS:** [Neue Subdomains? Records?]
- **Secrets:** [Neue .env-Variablen? Key-Rotation?]
- **Dependencies:** [Neue Packages? OS-Level?]

### 5.3 Deployment

- **Rollout:** [Rolling? Big-Bang? Feature-Flag?]
- **Rollback:** [Wie zurueck wenn es schiefgeht?]
- **Downtime:** [Erwartet? Wie minimieren?]

---

## 6. Qualitaets-Bewertung (8 Dimensionen)

Jede Dimension wird bewertet mit Befund und konkreter Massnahme.

### 6.1 Reliability
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Was koennte ausfallen? Wie reagiert das System?]
- **Massnahme:** [Fallback? Kill-Switch? Neuer Self-Healing-Check?]

### 6.2 Data Integrity
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Neue Schreibzugriffe? SSoT-Aenderung? Race Conditions?]
- **Massnahme:** [Atomic Writes? Locking? Validation?]

### 6.3 Security
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Neue API-Keys? Externer Input? Webhooks?]
- **Massnahme:** [.env? HMAC? Input-Validation? Rate-Limit?]

### 6.4 Performance
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Latenz? Rate Limits? Memory? WebSocket?]
- **Massnahme:** [Caching? Throttling? Buffer-Limits?]

### 6.5 Observability
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Kann das Feature stumm fehlschlagen?]
- **Massnahme:** [Logging? Alert? Dashboard-Endpoint?]

### 6.6 Maintainability
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Code-Duplikation? Config-Hardcodes? Doc-Updates?]
- **Massnahme:** [Shared Lib? Config-SSoT? Welche Docs updaten?]

### 6.7 Cost Efficiency
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [API-Kosten? LLM-Token? Neue Dependencies?]
- **Massnahme:** [Free Tier? Caching? Daily-Limit?]

### 6.8 Signal Quality
- **Impact:** [Kein / Mittel / Hoch]
- **Befund:** [Verbessert das die Entscheidungen? Redundanz?]
- **Massnahme:** [Weight? Attribution? Correlation-Check?]

---

## 7. Architektur-Entscheidungen (ADRs)

Dokumentiert wichtige Design-Entscheidungen mit Begruendung.

### ADR-1: [Entscheidungstitel]
- **Kontext:** [Warum musste entschieden werden?]
- **Optionen:** [A: ... | B: ... | C: ...]
- **Entscheidung:** [Gewaehlte Option + Begruendung]
- **Konsequenzen:** [Was folgt daraus? Trade-offs?]

---

## 8. Risiken und Mitigationen

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|-------------------|--------|------------|
| 1 | [Beschreibung] | [Niedrig/Mittel/Hoch] | [Niedrig/Mittel/Hoch] | [Konkrete Massnahme] |
| 2 | ... | ... | ... | ... |

---

## 9. Implementierungs-Hinweise

Konkrete Hinweise fuer den `/implement`-Skill bzw. den Entwickler.

### 9.1 Betroffene Dateien
| Datei | Aenderung | Komplexitaet |
|-------|-----------|-------------|
| [Pfad] | [Neu/Aendern/Loeschen] | [Niedrig/Mittel/Hoch] |

### 9.2 Reihenfolge der Implementierung
1. [Erster Schritt — z.B. Config-Eintraege]
2. [Zweiter Schritt — z.B. Core-Logik]
3. [Dritter Schritt — z.B. Integration + Tests]

### 9.3 Config-Aenderungen (config.js)
```javascript
// Neue Eintraege in config.js
AGENT_WEIGHTS: { ..., 'neuer-agent': 0.03 },
SIGNAL_FILES: { ..., 'neuer-agent': 'signals/neuer-agent-signal.json' },
```

---

## Anhang

### A. Referenzen
- [Relevante Docs, APIs, RFCs, bestehende Issues]

### B. Glossar
- [Projektspezifische Begriffe die im ADD verwendet werden]
```

---

## Anwendungshinweise fuer den Ideation-Skill

### Wann welchen Umfang?

| Story-Typ | Pflicht-Sektionen | Optional |
|-----------|------------------|----------|
| **Neuer Agent** | 1, 2.1, 2.2, 3.1, 3.2, 4.1, 6 (alle), 9 | 2.3, 5, 7, 8 |
| **Neuer Trade-Pfad** | 1, 2 (alle), 3 (alle), 4, 5, 6 (alle), 7, 8, 9 | — |
| **API-Integration** | 1, 2.1, 3.1, 4.1, 6.3+6.4+6.7, 9 | Rest |
| **Refactoring** | 1, 2.1, 6.6, 9 | 7, 8 |
| **Bug Fix** | Kein ADD — Story-Template-Fix reicht | — |
| **Dashboard/UI** | 1, 2.1, 4.2, 6.5, 9 | 5 |

### Agent Team Workflow

Wenn Agent Teams aktiv sind, wird das ADD kollaborativ erstellt:
1. **Lead** erstellt Sektionen 1, 2.1, 9
2. **Architekt-Teammate** erstellt Sektionen 2.2, 2.3, 3, 4, 6, 7
3. **Cloud System Engineer** erstellt Sektion 5
4. **Alle** reviewen und challengen gegenseitig
5. **Lead** konsolidiert und praesentiert dem Operator
