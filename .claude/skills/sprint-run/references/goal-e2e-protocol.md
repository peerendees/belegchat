---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Manuelles E2E-Validierungs-Protokoll (`/goal`-Sprint)

> **Manuelles Operator-Protokoll.** Dieses Protokoll ist **nicht** als automatisierter CI-Test
> baubar — ein echter autonomer `/goal`-Sprint laesst LLM-Subagents laufen und ist nicht
> skriptbar. Der Operator fuehrt die Schritte manuell aus und protokolliert die beobachteten
> Zustaende. Vorbild: HANDBUCH-Validierungs-Protokolle (vgl. BOO-48, verify-setup + manuelles
> Protokoll).

Zweck: einmal **End-to-End** belegen, dass `/sprint-run` (2.0.0) korrekt vorbereitet, `/goal`
korrekt orchestriert und die Gate-Failure-Recovery greift — an **einer** echten Story.

## Voraussetzungen

- Ein Projekt mit `/bootstrap`-Setup (inkl. `.claude/settings.local.json`-Allowlist, BOO-203).
- `execution_isolation=git-worktree` in `CONVENTIONS.md`.
- `pre-edit-bodyguard`-Hook verdrahtet (Layer-0).
- Eine kleine, abgeschlossene Test-Story mit vollstaendiger Spec (inkl. Subagent-Sektion), z.B. eine
  triviale Funktion + Test. Linear-Status `Todo`/`Backlog`.

## Ablauf (1-Story-Sprint)

| Schritt | Aktion | Erwarteter Zustand (protokollieren) |
|---|---|---|
| 1 | `/sprint-run` mit der Test-Story starten | Pre-Flight gruen; `/quality-gate-audit --trigger pre-sprint` Exit 0 |
| 2 | Drei Sicherheits-Voraussetzungen beobachten | Allowlist da, `execution_isolation=git-worktree` bestaetigt, Bodyguard live — sonst Abbruch/Pause |
| 3 | Vorbereitung beobachten | Worktree `../wt-<ISSUE>` angelegt; `.claude/agents/<story>-<agent>.md` generiert |
| 4 | `/goal`-Aufruf beobachten | `/goal` startet mit der Single-Story-Termination-Phrase (siehe goal-termination-phrases.md) |
| 5 | Subagent-Lauf beobachten | Story-Subagent setzt `/implement` im Worktree um, pusht, wartet auf CI |
| 6 | **Gate-Failure-Recovery provozieren** (s.u.) | Worker fixt das rote Gate, ruft es erneut; Evaluator: „noch nicht erfuellt" → Loop bis gruen |
| 7 | Gate-Assertion beobachten | `meta.json` ohne unbegruendeten `skipped_gates`; Merge erst danach |
| 8 | Termination beobachten | `/goal` terminiert, sobald die Phrase erfuellt ist (Issue done, Gates gruen, gemerged) |
| 9 | Abschluss beobachten | `/sprint-run` aggregiert `journal/sprint-<date>.md`; ccusage-Snapshot laeuft (oder warnt soft) |

## Gate-Failure-Recovery-Schritt (Schritt 6, Pflicht)

Damit das Protokoll die **Recovery-Schleife** wirklich belegt, einen Gate-Failure kuenstlich
ausloesen — eine der beiden Varianten:

- **Semgrep-Failure:** In die Test-Story bewusst ein Semgrep-Finding einbauen (z.B. ein Muster aus
  `.semgrep.yml`, etwa ein hardcodiertes Secret-aehnliches Token in einem Kommentar-freien Pfad).
  Erwartung: Gate rot → Worker-Agent entfernt das Finding → Gate erneut gruen.
- **ESLint-Failure:** Eine bewusst lint-verletzende Zeile (z.B. ungenutzte Variable bei
  `no-unused-vars`). Erwartung: Gate rot → Worker fixt → Gate gruen.

Protokollieren: **(a)** dass der Worker-Agent selbst gefixt hat (kein Operator-Eingriff), **(b)**
dass der Evaluator vor dem Fix „noch nicht erfuellt" lieferte, **(c)** dass nach dem Fix die
Termination-Phrase erfuellt war.

## Abbruch-/Pause-Pfade (mindestens einmal beobachten)

- **Sensitive-Path-Pause:** Eine Story einen Pfad aus `.claude/sensitive-paths.json` beruehren
  lassen → `/goal` pausiert, Operator gibt `review-ok` (auch remote testbar). Siehe
  `gate-block-handling.md`.
- **Fehlende Sicherheits-Voraussetzung:** `execution_isolation` temporaer auf etwas anderes als
  `worktree` setzen → `/sprint-run` bricht **vor** dem `/goal`-Aufruf ab.

## Ergebnis-Notiz

Nach dem Durchlauf den beobachteten Zustand je Schritt festhalten (z.B. als Kommentar an der
Test-Story oder im Sprint-Journal). Ein bestandener Durchlauf belegt: Konfigurator-Phase,
`/goal`-Uebergabe, native Subagent-Ausfuehrung, Gate-Recovery-Loop, Gate-Assertion und Termination
greifen End-to-End.
