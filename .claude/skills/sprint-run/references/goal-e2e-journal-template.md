---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# E2E-Journal — `/goal`-Sprint (ausfuellbar)

> **Ausfuellbares Operator-Journal.** Diese Datei spiegelt die Schritte aus
> [`goal-e2e-protocol.md`](goal-e2e-protocol.md) und macht sie protokollierbar. Vor dem Lauf das
> Wegwerf-Test-Projekt nach [`goal-e2e-fixture.md`](goal-e2e-fixture.md) aufsetzen. Der Operator
> fuehrt den `/goal`-Lauf selbst durch und traegt pro Schritt den **beobachteten** Zustand ein.
> Ein echter autonomer Lauf ist **nicht** skriptbar (LLM-Subagents) — dieses Journal ersetzt
> keinen CI-Test, es dokumentiert den manuellen Durchlauf.

| Feld | Wert |
|---|---|
| Datum | ____ |
| Operator | ____ |
| Test-Story (Issue) | ____ |
| Branch | ____ |
| Modell | ____ |
| Sprint-ID | ____ |

---

## Phase A — Vorbereitung (Konfigurator)

### Schritt 1 — `/sprint-run` mit der Test-Story starten

- **Erwartet (Protokoll):** Pre-Flight gruen; `/quality-gate-audit --trigger pre-sprint` Exit `0`.
- Beobachtet: ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 2 — Drei Sicherheits-Voraussetzungen beobachten

- **Erwartet:** Allowlist (`.claude/settings.local.json`) da, `execution_isolation=git-worktree`
  bestaetigt, Layer-0-Bodyguard live — sonst Abbruch/Pause.
- Beobachtet (Allowlist): ____
- Beobachtet (`execution_isolation=git-worktree`): ____
- Beobachtet (Bodyguard live): ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 3 — Vorbereitung beobachten

- **Erwartet:** Worktree `../wt-<ISSUE>` angelegt; `.claude/agents/<story>-<agent>.md` generiert.
- Beobachtet (Worktree-Pfad): ____
- Beobachtet (Agent-Definition-Pfad): ____
- [ ] OK [ ] Abweichung — Notiz: ____

## Phase B — `/goal`-Aufruf

### Schritt 4 — `/goal`-Aufruf beobachten

- **Erwartet:** `/goal` startet mit der Single-Story-Termination-Phrase (siehe
  [`goal-termination-phrases.md`](goal-termination-phrases.md)).
- Beobachtet (verwendete Phrase): ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 5 — Subagent-Lauf beobachten

- **Erwartet:** Story-Subagent setzt `/implement` im Worktree um, pusht, wartet auf CI.
- Beobachtet (Implement im Worktree): ____
- Beobachtet (Push + CI-Warten): ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 6 — Gate-Failure-Recovery provozieren (Pflicht)

Variante aus [`goal-e2e-fixture.md`](goal-e2e-fixture.md) waehlen und eintragen:

- Gewaehlte Variante: [ ] ESLint (`no-unused-vars`) [ ] Semgrep-Finding
- **Erwartet:** Gate rot → Worker-Agent fixt selbst (kein Operator-Eingriff) → Gate erneut gruen;
  der Evaluator lieferte vor dem Fix „noch nicht erfuellt".
- Beobachtet (a) Worker hat selbst gefixt (kein Operator-Eingriff): ____
- Beobachtet (b) Evaluator vor Fix „noch nicht erfuellt": ____
- Beobachtet (c) nach Fix Termination-Phrase erfuellt: ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 7 — Gate-Assertion beobachten

- **Erwartet:** `meta.json` ohne unbegruendeten `skipped_gates`; Merge erst danach.
- Beobachtet (`meta.json` / `skipped_gates`): ____
- [ ] OK [ ] Abweichung — Notiz: ____

### Schritt 8 — Termination beobachten

- **Erwartet:** `/goal` terminiert, sobald die Phrase erfuellt ist (Issue done, Gates gruen,
  gemerged).
- Beobachtet (Termination-Zeitpunkt/Grund): ____
- [ ] OK [ ] Abweichung — Notiz: ____

## Phase C — Abschluss

### Schritt 9 — Abschluss beobachten

- **Erwartet:** `/sprint-run` aggregiert `journal/sprint-<date>.md`; ccusage-Snapshot laeuft (oder
  warnt soft).
- Beobachtet (Sprint-Journal-Pfad): ____
- Beobachtet (ccusage-Snapshot / Soft-Warnung): ____
- [ ] OK [ ] Abweichung — Notiz: ____

---

## Abbruch-/Pause-Pfade (mindestens einmal beobachten)

### Sensitive-Path-Pause

- **Erwartet:** Eine Story beruehrt einen Pfad aus `.claude/sensitive-paths.json` → `/goal`
  pausiert, Operator gibt `review-ok` (auch remote testbar). Siehe
  [`gate-block-handling.md`](gate-block-handling.md).
- Beobachtet (Pause ausgeloest): ____
- Beobachtet (`review-ok` setzt fort): ____
- [ ] OK [ ] Abweichung [ ] nicht getestet — Notiz: ____

### Fehlende Sicherheits-Voraussetzung

- **Erwartet:** `execution_isolation` temporaer auf etwas anderes als `worktree` setzen →
  `/sprint-run` bricht **vor** dem `/goal`-Aufruf ab.
- Beobachtet (Abbruch vor `/goal`): ____
- [ ] OK [ ] Abweichung [ ] nicht getestet — Notiz: ____

---

## Ergebnis / DoD-Abgleich BOO-203

DoD: **„Ein 1-Story-Sprint laeuft mit `/goal` durch."** Jeder Punkt wird gegen die beobachteten
Schritte oben abgehakt:

- [ ] **Konfigurator-Phase** durchlaufen (Pre-Flight + drei Sicherheits-Voraussetzungen gruen) —
  Schritte 1–3
- [ ] **`/goal`-Uebergabe** mit Termination-Phrase erfolgt — Schritt 4
- [ ] **Native Subagent-Ausfuehrung** im Worktree beobachtet — Schritt 5
- [ ] **Gate-Recovery-Loop** belegt: Gate rot → Worker fixt selbst → Evaluator „noch nicht erfuellt"
  → gruen — Schritt 6 (a/b/c)
- [ ] **Gate-Assertion** ohne unbegruendeten Skip vor Merge — Schritt 7
- [ ] **Termination** durch `/goal` bei erfuellter Phrase — Schritt 8

**Gesamt-Ergebnis:** [ ] bestanden [ ] nicht bestanden

**Ablage:** Den ausgefuellten Stand als Kommentar an der Test-Story oder im Sprint-Journal
festhalten (vgl. [`goal-e2e-protocol.md`](goal-e2e-protocol.md), Abschnitt „Ergebnis-Notiz").
</content>
</invoke>
