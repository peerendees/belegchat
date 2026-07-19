---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

# Research — Deep Research für Claude Code

> Ein Befehl (`/research <frage>`) bringt quellengestützte Tiefenrecherche nach Claude Code: automatisches 2-Tier-Routing zwischen schneller WebSearch und Perplexity `sonar-deep-research`.

**Version:** 1.3.0 · **Befehl:** `/research`

> **English version:** [README.en.md](README.en.md)

> **Claude-Code-Modus:** `/research` ruft externe APIs auf (Perplexity, kostenpflichtig) und liefert Ergebnisse zurück → empfohlen **beaufsichtigt** (`default`). Kein unbeaufsichtigter Betrieb wegen API-Kosten. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut und welches Problem er löst

Claude Code hat **kein eingebautes Deep Research** — nur eine einfache WebSearch. Die Deep-Research-Funktion aus der Claude Web-App ist in Claude Code nicht verfügbar. Dieser Skill schließt die Lücke: Er nutzt **Perplexity `sonar-deep-research`** als Deep-Research-Engine (recherchiert intern über dutzende Quellen, synthetisiert, liefert Citations) und ergänzt sie mit **Claude WebSearch** als schnellem Gegencheck. Ergebnis: zuverlässige, quellengestützte Tiefenrecherche direkt in Claude Code.

---

## Installation

`research` ist ein **vendored Bundle-Skill** des intentron-Frameworks und wird vom Bootstrap (Phase 5) automatisch aus dem `intentron`-Repo nach `~/.claude/skills/research/` installiert. Manuell:

```bash
mkdir -p ~/.claude/skills/research
cp -R research/* ~/.claude/skills/research/
```

**Voraussetzung (nur für DEEP, BOO-452):** EINER der beiden Keys als Umgebungsvariable — `PERPLEXITY_API_KEY` (beginnt mit `pplx-`, Pfad A direkt) ODER `OPENROUTER_API_KEY` (beginnt mit `sk-or-v1-`, Pfad B via OpenRouter, Slugs `perplexity/sonar*`) — siehe [references/perplexity-api.md](references/perplexity-api.md). Ohne Key läuft der QUICK-Tier (WebSearch) weiter; DEEP fällt aus — bewusster Fallback, kein Hard-Gate.

---

## Modi / Features

Der Skill routet automatisch nach Komplexität der Frage:

| Tier | Wann | Engine | Dauer | Kosten |
|------|------|--------|-------|--------|
| **QUICK** (Default) | Fakten-Checks, „Was ist X?", aktuelle Preise/Daten | Claude WebSearch (1-3 parallele Suchen) | Sekunden | $0 |
| **DEEP** | Marktanalysen, Vergleiche, Multi-Aspekt-Fragen, explizit „deep" | Perplexity `sonar-deep-research` + WebSearch-Gegencheck | 10-60 s | ~$0.01-0.05 |

Jede Antwort enthält: **Zusammenfassung**, **Details**, **Quellen** (getrennt nach `[Deep Research]` / `[WebSearch]`), **Confidence** (high/medium/low) und den genutzten **Tier**.

---

## Hintergrund / Motivation

Im intentron-Framework macht Bootstrap **Phase 4.10 (Domain Deep Research)** zur Pflicht: Domainwissen wird persistiert, bevor Stories geschrieben werden — KI-Operator-Teams haben kein verteiltes Fach-Team-Wissen, dieser Schritt kompensiert das systematisch (Schrader Kap. 2). `/research` ist die Engine dieser Pflicht-Phase. Damit ein einziges `git clone` des Frameworks self-contained ist, liegt `research` seit **BOO-219** als vendored Bundle-Skill direkt im `intentron`-Repo (Master bleibt `claudecodeskills`, via `publish_skill.py`).

---

## Quellen

- Perplexity API (`sonar` / `sonar-deep-research`): https://docs.perplexity.ai
- OpenRouter (Sonar-Modelle via `perplexity/`-Slugs, verifiziert 2026-07-12): https://openrouter.ai/docs/api-reference/overview · https://openrouter.ai/perplexity/sonar-deep-research
- Claude Code WebSearch (eingebaut)

---

## Dateistruktur

```
research/
├── README.md                      ← Diese Datei
├── README.en.md                   ← Englische Version
├── SKILL.md                       ← Skill-Definition (DE)
├── SKILL.en.md                    ← Skill-Definition (EN)
├── overview.excalidraw / .png     ← Übersichts-Diagramm (DE)
├── overview.en.excalidraw / .png  ← Übersichts-Diagramm (EN)
└── references/
    ├── perplexity-api.md          ← Perplexity-API-Referenz (DE)
    └── perplexity-api.en.md       ← Perplexity-API-Referenz (EN)
```

---

*Skill Version 1.3.0 | intentron Framework — vendored Bundle-Skill (Master: claudecodeskills)*
