---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Architecture Review — Architektur-Dimensionen gegen eine Story oder das Gesamtsystem

> Prueft jede Story — oder das gesamte System — gegen die aktiven Architektur-Dimensionen (8 Standard + aktive Add-ons). Findet Risiken, Tech Debt und Skalierungs-Probleme **bevor** sie im Produktivsystem landen.

**Version:** 1.18.0 · **Befehl:** `/architecture-review`

> **Claude-Code-Modus:** `/architecture-review` ist read-only Analyse → **`plan`** (Plan Mode); Befunde/Empfehlungen, kein Code. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Die meisten Teams machen Architektur-Review erst wenn etwas kaputt geht. Dieser Skill macht Review zu einem Routine-Checkpoint — fuer einzelne Stories (Story-Review) oder das Gesamtsystem (System-Review).

Der Skill zwingt Claude, `ARCHITECTURE_DESIGN.md` komplett zu lesen (§1–§6 plus optionale Add-on-Sektionen §7+ und alle ADRs) bevor irgendeine Bewertung erfolgt. Kein Ueberfliegen, kein "ich habe genug gelesen". Diese Regel allein verhindert die meisten Fehleinschaetzungen.

**Zwei Modi:**

| Modus | Ausloeser | Was rauskommt |
|-------|-----------|---------------|
| **A — Story-Review** | Bevor eine Story in `/implement` geht | Status pro Dimension (OK / Warnung / Kritisch), konkrete Empfehlungen, optional Story-Aenderungen |
| **B — System-Review** | Quartalsweise oder vor Refactor | Voll-Audit: Staerken, Risiken, Tech Debt, neue Backlog-Issues |

---

## Die Architektur-Dimensionen

**8 Standard-Dimensionen** (immer aktiv):

| # | Dimension | Was geprueft wird |
|---|-----------|-------------------|
| 1 | **Reliability** | Failure Modes, Retries, Backoff, Circuit Breaker |
| 2 | **Data Integrity** | Schema-Vertraege, Migrations, referentielle Integritaet |
| 3 | **Security** | Auth-Grenzen, Secret-Handling, Angriffsflaeche |
| 4 | **Performance** | Latenz-Budgets, Hot Paths, Bottlenecks |
| 5 | **Observability** | Metrik-Coverage, Logs, Traces, Alert Rules |
| 6 | **Maintainability** | Kopplung, Klarheit, toter Code, Duplikate |
| 7 | **Testability** | Testbarkeit, Coverage, Contract-Tests |
| 8 | **Scalability** | Lastverhalten, horizontale Skalierung, Engpaesse |

**KI-Tauglichkeit** (Standard-Dimension, BOO-7) — siehe eigener Abschnitt unten.

**Add-ons** (nur wenn beim Bootstrap aktiviert): Privacy / DSGVO, Cost Efficiency, Signal Quality, Compliance.

Add-ons werden beim Bootstrap domain-spezifisch aktiviert — die aktive Dimensionsliste steht in `ARCHITECTURE_DESIGN.md §5`. Es werden nie alle Dimensionen pauschal geprueft, sondern die fuer die jeweilige Story relevanten.

---

## KI-Tauglichkeit (Standard, BOO-7)

Eigene Standard-Dimension aus Schrader *Code Crash* Kap. 4. KI-Tauglichkeit ist Grundvoraussetzung fuer KI-gestuetzte Entwicklung und wird bei **jeder** Story geprueft. `/bootstrap` verankert sie proaktiv, `/architecture-review` validiert sie reaktiv.

**8 Checks (4 Prinzipien + 4 Anti-Patterns):**

| Check | Was geprueft wird |
|-------|-------------------|
| **P1 — Kleine, unabhaengige Module** | Module <500 LOC, ein Zweck, kein zirkulaerer Import |
| **P2 — Explizite Interfaces** | Typisierte Grenzen, ADRs vollstaendig, keine Magic Strings |
| **P3 — Testbarkeit als Grundvoraussetzung** | Coverage >=80% auf neuem Code (BOO-15), Contract-Tests vorhanden |
| **P4 — Von Anfang an observable** | JSON-Logging, `/metrics`-Endpoint aktuell, Alert-Rules definiert |
| **AP1 — Gewachsener Monolith** | Kein Monolith-Wachstum, kein Shared-State-Anti-Pattern |
| **AP2 — Implizites Wissen** | Kein `console.log` in Prod, ADRs vollstaendig |
| **AP3 — Keine echten Modulgrenzen** | Kein direkter DB-Zugriff aus falschem Modul, keine zirkulaeren Imports |
| **AP4 — Tests als Nachgedanke** | Tests im selben PR, Coverage-Gate gruen |

Detail-Fragen pro Check: `references/dimensions-detail.md §9.1–§9.8`. Single Source of Truth fuer Prinzipien und Anti-Patterns: `intentron/references/ki-architektur-prinzipien.md`.

---

## Wie er funktioniert

```
Story / System im Review
        │
        ▼
ARCHITECTURE_DESIGN.md §1–§6 (+§7+ Add-ons) + alle ADRs lesen (Pflicht-Checkliste)
        │
        ▼
Aenderung auf betroffene Komponenten mappen
        │
        ▼
Relevante Dimensionen bewerten (Standard + aktive Add-ons, nicht immer alle)
        │
        ▼
Optional: Feature-Flag-Hygiene + SonarQube-Cloud-Findings ergaenzen
        │
        ▼
Output:  Status · Befund · Empfehlung  (pro Dimension)
```

Die Pflicht-Regel zum Doku-Lesen bricht das Anti-Pattern. Ohne sie wird das Review zum Bauchgefuehl. Mit ihr ist jede Bewertung an ein konkretes ADR oder eine Design-Entscheidung gebunden.

---

## Trigger-Phrasen

- `/architecture-review`
- "Architektur pruefen"
- "passt das architektonisch?"
- "Review"
- "Architektur-Audit"

---

## Schnittstellen zu anderen Skills

| Upstream (liefert Input) | Was geliefert wird | Downstream (nutzt das Review) | Was wir liefern |
|--------------------------|--------------------|--------------------------------|------------------|
| `ideation` | Story mit ACs + vorgeschlagene Komponenten | `implement` | Go/No-Go Signal bevor Code geschrieben wird |
| `backlog` | Prio-Liste offener Stories | `sprint-review` | Dimension-Befunde fliessen ins Quartals-Audit |
| `security-architect` (DESIGN-Mode) | Threat Model fuer die Aenderung | `research` | Markiert offene Fragen fuer Deep Research |

---

## Artefakte / Outputs

Pro geprueefter Dimension:

```
### Dimension: Reliability
Status:       WARNUNG
Befund:       Retry-Logik auf Kafka-Consumer ohne exponential Backoff.
              First-Retry-Storm in Staging bei 4× Normallast beobachtet.
Empfehlung:   Jittered Exponential Backoff hinzufuegen (ADR-12 Praezedenzfall).
              Neue Story: "RELI-43 — Add backoff to consumer retries"
```

System-Review zusaetzlich:
- **Staerken** — was laeuft gut
- **Top-3-Risiken** — was zuerst angehen
- **Tech-Debt-Score** — Niedrig / Mittel / Hoch
- **Empfohlene Issues** — neue Linear-Tickets fuer Backlog

---

## Feature-Flag-Hygiene (BOO-17)

Der Skill sucht nach veralteten AI-Code-Feature-Flags. Er grept nach `// AI-generated:` (bzw. `# AI-generated:` fuer Python) in `src/` und `lib/` und prueft pro gefundenem `STORY_ID`-Kommentar:

1. Ist der Feature-Flag `flag.{STORY_ID}` noch aktiv (in `config/flags.json` oder Env)?
2. Wie lange laeuft der Flag bereits (via `git log`)?
3. Wenn >72h stabil in Produktion: Flag entfernen + `// AI-generated:`-Kommentare loeschen als Tech-Debt-Issue anlegen.

**Alarm-Schwelle:** Flag aelter als 7 Tage ohne Entfernung → Tech-Debt-Issue mit Prioritaet High.

---

## SonarQube-Cloud-Lese-Block (BOO-6)

**Read-only.** Falls SonarQube Cloud konfiguriert ist, ruft der Skill die SonarQube-REST-API ab und ergaenzt den Review um Findings — er schreibt **nichts** zurueck. Source of Truth fuer Security-Metriken bleibt SonarQube Cloud.

**Voraussetzungs-Check** (alle drei muessen erfuellt sein):
1. `sonar-project.properties` im Projekt-Root (gesetzt durch `/bootstrap` Block D.5, BOO-5)
2. `SONAR_TOKEN` in `.env` oder als Environment-Variable
3. `tools_available.sonarqube_cloud` in `.claude/environment.json` ist `true`

Fehlt eine Voraussetzung, laeuft der Review ohne SonarQube-Block weiter (kein harter Fehler, nur Hinweis).

**Was abgerufen wird:** Security Hotspots (unresolved, pro Komponente) sowie Technical-Debt-Ratio, Reliability-, Security- und Maintainability-Rating. Die Ergebnisse landen als zusaetzliche Spalte "SonarQube" in der Review-Tabelle. Bei `Hotspots > 5`, `sqale_debt_ratio > 5.0` oder `reliability_rating != "A"` wird ein Empfehlungs-Block mit Link zu den SonarQube-Findings ergaenzt.

---

## Installation

```bash
cp -r architecture-review ~/.claude/skills/architecture-review
```

Aktiviert sich automatisch in der naechsten Claude-Code-Session.

---

## Dateistruktur

```
architecture-review/
├── README.md                        ← Diese Datei
├── SKILL.md                         ← Skill-Definition (wird von Claude Code gelesen)
└── references/
    └── dimensions-detail.md         ← Erweiterte Kriterien pro Dimension
```

---

## Changelog

### v1.18.0 (BOO-444)

Verifikations-Frische im Review: Der Doc-Grounding-Block (BOO-443) prueft die Schnittstellen-Verifikation zusaetzlich auf Frische. Pro Dependency in `ARCHITECTURE_DESIGN.md §Dependencies / Schnittstellen` (dieselbe SSoT) ein REST-Aufruf gegen `context7.com/api/v2/libs/search`: neuere Version in `versions[]` als die gepinnte ODER «Verifiziert am» > 45 Tage → Warnung mit Library, gepinnter und neuester Version. Offline/Fehler → uebersprungen («Frische nicht pruefbar»), Review laeuft immer durch. **Warn-only by design — kein Abbruch-Pfad, kein Hard-Gate** (auch nicht via `compliance_doc_gate`). Reine Skill-Anweisung; Details HANDBUCH Anhang BL.

### v1.12.0

README auf den aktuellen SKILL-Stand gebracht. Dimensionsmodell korrigiert: 8 Standard-Dimensionen (Reliability, Data Integrity, Security, Performance, Observability, Maintainability, Testability, Scalability) + KI-Tauglichkeit als Standard-Dimension + Add-ons (Privacy/DSGVO, Cost Efficiency, Signal Quality, Compliance). Neue Abschnitte dokumentiert: **KI-Tauglichkeit** (8 Checks — 4 Prinzipien + 4 Anti-Patterns, BOO-7), **Feature-Flag-Hygiene** (BOO-17) und **SonarQube-Cloud-Lese-Block** (BOO-6). Lese-Pflicht auf §1–§6 plus optionale Add-on-Sektionen §7+ korrigiert.

### v1.3.0 (BOO-14)

Observability-Invarianten als Pflicht-Pruefpunkte in §5 Qualitaets-Dimensionen verankert. Pflicht-Checkliste in `SKILL.md` erweitert um expliziten Sub-Block "Observability — drei Invarianten": Logging-Schema (6 Pflicht-Felder + Logger-ADR), Metrics-Endpoint (4 Pflicht-Metriken + Port 9090+N), Alert-Rules (3 Pflicht-Alerts `{service}_down` / `{service}_error_rate_high` / `{service}_p95_slow` + Routing + promtool-Validierung). `references/dimensions-detail.md` §5 in drei Sub-Sektionen 5.1/5.2/5.3 mit jeweils 5 Pruef-Fragen strukturiert; bestehende BOO-8-Inhalte als "Allgemeine Hygiene"-Block beibehalten. Schrader Code Crash Kap. 3 + Kap. 4 als Quelle verlinkt.

### v1.2.1 (BOO-43)

Drift-Fix: `architecture-design-template.md` zurueckgezogen auf §-Nummerierung, sodass die §1–§N-Referenzen im Skill aufloesbar sind. Skill-Pflicht-Checkliste auf das tatsaechliche Template-Layout (§1 Big Picture, §2 Design-Rationale, §3 ADR, §4 Komponenten-Uebersicht, §5 Qualitaets-Dimensionen, §6 Referenzen, §7+ optionale Add-ons) angeglichen.
