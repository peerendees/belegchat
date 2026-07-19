---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Token-Boundary — 80%-Logik + Sprint-Budget

Referenz zu `/sprint-run` Schritt 3 (Budget-Planung) und der `/goal`-Termination (die
80%-Boundary ist seit 2.0.0 Teil der Termination-Logik von `/goal`, nicht mehr eines skill-eigenen
Loops). Grundlage: HANDBUCH Anhang G (Sprint-Sizing-Mechanik, BOO-38/39/40).

## Prinzip: Token-Box statt Zeit-Box

Ein Sprint ist **80 % des Context-Windows** des verwendeten Modells — modellunabhaengig.
Kein Burndown, keine Velocity, keine Story-Points-pro-Sprint-Statistik. Outcome wird ueber
Intent-Erfuellung gemessen, nicht ueber Token-Verbrauch.

| Schwelle | Quelle (`environment.json`) | Wirkung |
|---|---|---|
| `token_warn_threshold` | Default `70` | Soft-Warnung: Sprint neigt sich dem Ende |
| `token_hard_threshold` | Default `80` | **Hard Stop**: Sprint-Boundary → `/sprint-review` |

## Budget-Planung (Schritt 3)

1. **Modell-Profil frisch lesen (BOO-486):** `.claude/model-profile.yml` (BOO-485) →
   `served_context`, `effective_fraction`, `budget_pct`, `capability_factor` — bei jedem Lauf,
   nie cachen, keine Fenstergroesse hardcoden.
2. Sprint-Budget = `served_context × effective_fraction × budget_pct` (Formel-SSoT:
   `docs/standards/context-window-management.md`, BOO-484 — nur referenzieren). Beispiel mit
   Cloud-Default-Profil: 200k × 1.0 × 0.80 = 160k. **Fallback ohne Profil:** genau dieser
   Cloud-Default aus `bootstrap/templates/model-profile.yml` + Warnung im Output.
3. `token_estimate` aller Kandidaten-Stories summieren (aus dem Spec-`Execution Isolation`-Block).
4. Stories, die das Budget sprengen, in den naechsten Sprint verschieben — **Hinweis, kein
   Abbruch**. Keine Story wird heimlich gekuerzt. **Ausnahme (Blatt-Budget, Ebene A):** liegt der
   `token_estimate` einer einzelnen Story ueber `Blatt-Budget × capability_factor`, hilft kein
   Verschieben — Story ist **zu gross → splitten** (`/ideation` Schritt 5b).
5. Reihenfolge: `blockedBy` zuerst, dann Prioritaet.
6. Budget-Ansage: konkrete Token-Zahl + Herkunft (Profil oder Default) nennen (SSoT §12).

## Boundary-Check (Teil der `/goal`-Termination)

`/goal` projiziert den kumulierten Verbrauch laufend gegen `token_hard_threshold`. Die Boundary ist
**Teil der Termination-Phrase/-Logik** — `/goal` terminiert den Sprint auch dann, wenn die
inhaltliche Phrase noch nicht erfuellt ist:

- **< 80 %:** weiterlaufen (naechste/parallele Stories).
- **≥ 80 %:** `/goal` terminiert → `/sprint-run` aggregiert das Journal und triggert
  `/sprint-review`, Operator-Hinweis **"Sprint-Boundary erreicht"**. Verbleibende Stories bleiben
  im Backlog fuer den naechsten Sprint.

> Die Boundary ist **konservativ**: lieber eine Story frueher stoppen als mitten in einer Story
> ins Kontext-Limit laufen. Eine angefangene, nicht fertig getestete Story ist teurer als eine
> verschobene.

## Bezug zu Story-Points

Prozent-Anteile beziehen sich auf das Profil-Budget (BOO-486); die Beispielspalte gilt fuer das
Cloud-Default-Profil (200k):

| SP | Budget-Anteil (Beispiel @200k-Profil) | Ausfuehrungsmodus |
|---|---|---|
| 1 | ~5 % | linear |
| 2 | ~10–15 % | linear / sub-agents |
| 3 | ~20–30 % | sub-agents |
| 5 | ~40–60 % | agentic |
| 8 | >60 % | **aufteilen** |

`/sprint-run` nutzt diese Schaetzung nur zur **Reihenfolge und Boundary** — die eigentliche
Modus-Wahl pro Story trifft `/implement` (Schritt 0c) anhand des Spec-Blocks.

Sketch: `docs/sprint-run-flow.png` (HANDBUCH Anhang AD).
