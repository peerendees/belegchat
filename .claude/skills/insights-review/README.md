---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Insights-Review — Operator-Reflexion als Sprint-Review-Begleitung

> Ruft Anthropics natives `/insights` auf und integriert einen klar abgegrenzten Operator-Reflexions-Block in `journal/sprint-{date}.md`. Grenze (ADR-3): `/sprint-review` = was hat das **Projekt** gelernt (Repo-versioniert), `/insights` = wie hat der **Operator** gearbeitet (lokal).

**Version:** 1.0.1 · **Befehl:** `/insights-review`

## Was der Skill tut

`/insights` ist eine native Claude-Code-Engine für Operator-Arbeitsmuster. Ohne Anbindung an den Sprint-Rhythmus bleibt sie ungenutzt — oder ihre Erkenntnisse landen versehentlich im Projekt-Learning-Loop und vermischen Operator-Reflexion mit Projekt-Wissen. Dieser schlanke Skill knüpft `/insights` an `/sprint-review` und hält die Grenze (ADR-3) sauber: er baut nichts nach (Build-vs-Buy), er ruft auf und integriert einen abgegrenzten Meta-Block.

## Aktivierung

- Flag `complement_insights: true` im `native_paths`-Block der Projekt-`CLAUDE.md` (BOO-199, Schalter B). Default `true`, nur aktiv bei `runtime_target: claude-code`.
- Aufgerufen aus `/sprint-review` **Schritt 7d** (nur bei aktivem Flag) oder direkt vom Operator.

## Abgrenzung

- `/sprint-review` schreibt den Projekt-Learning-Loop-Eintrag; `insights-review` ergänzt nur den Operator-Reflexions-Block.
- Vergleichs-Doku „Sprint Review vs /insights": HANDBUCH **Anhang AO** (BOO-211).

Details + Meta-Block-Template: [SKILL.md](SKILL.md). Englisch: [README.en.md](README.en.md).
