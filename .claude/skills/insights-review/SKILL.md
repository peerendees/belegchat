---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: insights-review
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Ruft Anthropics natives /insights als Operator-Reflexions-Begleitung zum Sprint-Review auf und
  integriert einen klar abgegrenzten Meta-Block in journal/sprint-{date}.md. Grenze (ADR-3):
  /sprint-review = was hat das PROJEKT gelernt (Repo-versioniert); /insights = wie hat der OPERATOR
  gearbeitet (lokal). Aktiviert ueber complement_insights: true im native_paths-Block der CLAUDE.md
  (BOO-199, Schalter B). Verwenden wenn der Operator "insights-review", "Operator-Reflexion" oder die
  complement_insights-Begleitung zum Sprint-Review will.
version: 1.0.1
metadata:
  hermes:
    category: governance
    tags: [insights, sprint-review, operator-reflexion, complement-insights]
    related_skills: [sprint-review, bootstrap]
---

# Insights-Review

Schlanke Begleitung zum `/sprint-review`: ruft Anthropics natives `/insights` auf und integriert dessen
Operator-Reflexion als klar abgegrenzten Meta-Block in den Sprint-Report. Der Skill **baut `/insights`
nicht nach** (Build-vs-Buy, ADR-1) — er knuepft es an den Sprint-Rhythmus und haelt die Grenze sauber.

## Die Grenze (ADR-3) — warum getrennt

| Dimension | `/sprint-review` (Framework) | `/insights` (Anthropic-nativ) |
|---|---|---|
| Frage | Was hat das **Projekt** gelernt? | Wie hat der **Operator** gearbeitet? |
| Quelle | Story-Outputs, Learning-Loop L1/L2/L3 | Lokale Usage-Logs |
| Output | `journal/sprint-{date}.md`, Audit-faehig | Pattern-Report, sessionbasiert |
| Persistenz | Im Repo, versioniert | Lokal |
| Frequenz | Pro Sprint | Pro Monat oder auf Abruf |

Projekt-Lesson → Learning-Loop (Repo). Operator-Reflexion → dieser Meta-Block (aus `/insights`, lokal).
Nie vermischen — siehe ADR-3 (Automemory vs Learning-Loop).

## Aktivierung

- Flag `complement_insights` aus dem `native_paths`-Block der Projekt-`CLAUDE.md` (BOO-199). Default
  `true`. **Schalter-A-Kopplung:** nur aktiv bei `runtime_target: claude-code`.
- Aufgerufen aus `/sprint-review` **Schritt 7d** (nur wenn das Flag aktiv ist), oder direkt vom Operator.

## Workflow

1. **Flag pruefen** — `complement_insights: true` und `runtime_target: claude-code`? Sonst Skip mit
   Log-Hinweis.
2. **`/insights` aufrufen** — Anthropics native Engine; der Operator bestaetigt den Aufruf (Operator-
   lokale Daten). Faellt `/insights` aus oder lehnt der Operator ab → Skip, kein Hard-Block.
3. **Meta-Block integrieren** — den unten stehenden Block in `journal/sprint-{date}.md` schreiben,
   **getrennt** vom Learning-Loop-Eintrag (Schritt 8 des Sprint-Reviews). Der Block ist als
   Operator-Reflexion markiert, nicht als Projekt-Lesson.

## Meta-Block-Template (`journal/sprint-{date}.md`)

```markdown
## Operator-Reflexion (/insights — complement_insights)

> Operator-Arbeitsmuster dieser Sprint-Periode — lokal aus /insights, **kein** Projekt-Wissen
> (Abgrenzung ADR-3). Reist nicht als Lesson ins Team-Wissen.

- **Arbeitsmuster:** <was /insights ueber die Arbeitsweise zeigt>
- **Reibungspunkte:** <wo Zeit/Token/Kontext verloren ging>
- **Naechster Operator-Change:** <eine konkrete, persoenliche Anpassung>
```

## Abgrenzung

- **`/sprint-review`** schreibt den Projekt-Learning-Loop-Eintrag (Schritt 8). `insights-review` ergaenzt
  nur den Operator-Reflexions-Block — es ersetzt oder veraendert den Learning-Loop nicht.
- **Vergleichs-Doku** „Sprint Review vs /insights" im HANDBUCH = BOO-211 (Anhang AO).
- **Flag-Definition** `complement_insights` = BOO-199 (5a), `native_paths`-Block der CLAUDE.md.
