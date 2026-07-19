---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: research
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Deep Research Skill: Bringt Deep-Research-Faehigkeiten nach Claude Code. Da Claude Code
  kein eingebautes Deep Research hat (nur einfache WebSearch), nutzt dieser Skill Perplexity
  sonar-deep-research als Deep-Research-Engine — kombiniert mit WebSearch fuer Gegencheck und
  Ergaenzung. Automatisches 2-Tier-Routing: QUICK (WebSearch) fuer einfache Fakten, DEEP
  (Perplexity Deep Research + WebSearch Validierung) fuer komplexe Analysen.
  Verwenden wenn der Nutzer "research", "recherchiere", "finde heraus", "was wissen wir ueber",
  "deep research", "analysiere" oder "/research" sagt.
version: 1.3.0
metadata:
  requires_secrets:
    # BOO-452: EINER der beiden Keys genuegt (Alternativen fuer den DEEP-Tier).
    # Ohne beide: QUICK-only-Fallback (WebSearch), kein Hard-Gate.
    - key: PERPLEXITY_API_KEY
      service: Perplexity AI
      url: https://www.perplexity.ai/settings/api
      description: API Key fuer Perplexity sonar/sonar-deep-research Modelle (Pfad A — direkt)
      hint: "Beginnt mit 'pplx-', 40+ Zeichen"
      required: false
    - key: OPENROUTER_API_KEY
      service: OpenRouter
      url: https://openrouter.ai/keys
      description: Alternative zu PERPLEXITY_API_KEY — Sonar-Modelle via OpenRouter (Pfad B, Slugs perplexity/sonar*)
      hint: "Beginnt mit 'sk-or-v1-'"
      required: false
  hermes:
    category: research
    tags: [deep-research, web-search, perplexity, two-tier-routing]
    requires_toolsets: [terminal]
    related_skills: [ideation, slopsquatting-deep-refresh]
---

# Deep Research fuer Claude Code

## Warum dieser Skill?

Claude Code hat **kein eingebautes Deep Research** — nur eine einfache WebSearch.
Die Deep-Research-Funktion aus der Claude Web-App ist in Claude Code nicht verfuegbar.

Dieser Skill schliesst diese Luecke:
- **Perplexity sonar-deep-research** dient als Deep-Research-Engine (recherchiert intern ueber dutzende Quellen, synthetisiert, liefert Quellenangaben)
- **Claude WebSearch** ergaenzt als schnelle Validierung und Gegencheck
- Zusammen ergibt das eine zuverlaessige, quellengestuetzte Tiefenrecherche direkt in Claude Code

## 2-Tier-Routing

Komplexitaet der Frage analysieren, dann automatisch routen:

### QUICK (Default)
- **Wann:** Fakten-Checks, aktuelle Preise/Daten, "Was ist X?", kurze Antworten
- **Was passiert:** Claude WebSearch mit 1-3 parallelen Suchen
- **Dauer:** Sekunden
- **Kosten:** $0 (eingebaut)

### DEEP (bei komplexen Fragen oder explizit "/research deep ...")
- **Wann:** Marktanalysen, Vergleiche, "Wie funktioniert X im Detail?", Multi-Aspekt-Fragen, alles wo der Nutzer explizit "deep" sagt
- **Provider (BOO-452):** braucht `PERPLEXITY_API_KEY` (`pplx-…`, direkt) ODER `OPENROUTER_API_KEY` (`sk-or-v1-…`, via OpenRouter, Slugs `perplexity/sonar*`) — Details: [references/perplexity-api.md](references/perplexity-api.md)
- **Was passiert:**
  1. **Perplexity sonar-deep-research** fuehrt die Hauptrecherche durch — durchsucht intern viele Quellen, synthetisiert Ergebnisse, liefert Quellenangaben mit Citations
  2. **Claude WebSearch** laeuft parallel mit anderen Suchbegriffen als Gegencheck und Ergaenzung
  3. Ergebnisse werden zusammengefuehrt, Widersprueche markiert
- **Dauer:** 10-60 Sekunden
- **Kosten:** ~$0.01-0.05 pro Anfrage

### Routing-Entscheidung
Automatisch DEEP waehlen wenn:
- Frage enthaelt Vergleiche ("X vs Y", "Alternativen zu")
- Frage erfordert Multi-Aspekt-Analyse ("Vor- und Nachteile", "Architektur von")
- Frage betrifft aktuelle Marktdaten mit Kontext ("Wie entwickelt sich X und warum")
- Nutzer sagt explizit "deep", "ausfuehrlich", "im Detail"

### Fallback ohne Provider (BOO-452)

Ist **kein Provider konfiguriert** (weder `PERPLEXITY_API_KEY` noch `OPENROUTER_API_KEY` noch ein Perplexity-MCP), laeuft das 2-Tier-Routing nur im **QUICK-Modus** (WebSearch); der **DEEP-Tier ist nicht verfuegbar**. Kein Hard-Gate — der Skill bleibt ohne Key nutzbar. Bei einer DEEP-wuerdigen Frage den Nutzer auf den fehlenden Provider hinweisen (Key-Beschaffung: HANDBUCH «API Keys — Uebersicht» + [references/perplexity-api.md](references/perplexity-api.md)) und mit QUICK weiterarbeiten.

## Workflow

### Schritt 1: Fragestellung schaerfen
- Was genau soll recherchiert werden?
- Welcher Kontext ist relevant?
- Falls unklar: Rueckfrage an den Nutzer

### Schritt 2: Tier waehlen + recherchieren

**QUICK:**
1. WebSearch mit 1-3 gezielten Suchbegriffen (parallel)
2. Relevante Ergebnisse extrahieren und zusammenfuehren

**DEEP:**
1. Perplexity API Call mit `sonar-deep-research` ausfuehren (siehe [references/perplexity-api.md](references/perplexity-api.md))
   - Perplexity recherchiert intern ueber viele Quellen und liefert eine synthetisierte Antwort mit Quellenverweisen
2. Parallel: WebSearch fuer Gegencheck/Ergaenzung (bewusst andere Suchbegriffe als die Perplexity-Anfrage)
3. Ergebnisse zusammenfuehren:
   - Uebereinstimmungen staerken die Confidence
   - Widersprueche explizit markieren
   - Ergaenzende Infos aus WebSearch hinzufuegen

### Schritt 3: Ergebnis strukturieren

Jede Research-Antwort MUSS enthalten:

1. **Zusammenfassung** — 2-3 Saetze, direkte Antwort auf die Frage
2. **Details** — Strukturiert nach Aspekten der Frage. Bei APIs: Endpoints, Auth, Rate Limits, Kosten. Bei Technologien: Architektur, Vor/Nachteile, Alternativen.
3. **Quellen** — URLs mit Titel, getrennt nach Herkunft:
   - `[Deep Research]` Titel — URL (aus Perplexity Citations)
   - `[WebSearch]` Titel — URL (aus Claude WebSearch)
4. **Confidence** — high / medium / low (basierend auf Quellenueberein­stimmung zwischen Deep Research und WebSearch)
5. **Tier** — Welcher Tier genutzt wurde und warum

### Schritt 4: Kontext bewahren
- Research-Ergebnisse als Rohdaten + Synthese liefern
- Den laufenden Kontext der uebergeordneten Aufgabe NICHT ueberschreiben
- Ergebnisse zurueckgeben, nicht eigenstaendig weiterverarbeiten
