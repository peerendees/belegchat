---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gate-Block-Handling — /goal-Pause/Resume bei Sensitive-Path

Referenz zu `/sprint-run` Schritt 6 (Ausfuehrung durch `/goal`). Sicherheitskritisch: `/goal` darf
Governance-Gates **niemals** automatisch ueberbruecken. Seit 2.0.0 (ADR-4) gehoert diese Pause
`/goal`, nicht mehr einem skill-eigenen Daemon-Loop.

## Welche Gates pausieren `/goal`?

| Gate | Quelle (`/implement`) | Ausloeser | Freigabe-Token |
|---|---|---|---|
| Sensitive-Paths | Schritt 5.5 (BOO-18) | geaenderte Datei matcht `.claude/sensitive-paths.json` | `review-ok: <name> - <kommentar>` |
| Personal-Data | Schritt 5.5b (BOO-69) | `personal_data: true` + Match in `.claude/personal-data-paths.json` | `privacy-ok: <name> - <kommentar>` (DSGVO Art. 25) |
| Doku-Drift (Compliance) | Pre-Flight (BOO-229) | `compliance_doc_gate: true` + Checker-FAIL (`scripts/doc-drift-check.sh`) | meist Worker-Selbstheilung; bei `lokal≠remote`: `doc-drift-ok: <name> - <kommentar>` |

Beide koennen gleichzeitig zuschlagen — dann erst `review-ok` (technisch), dann `privacy-ok`
(rechtlich). Keine Bestaetigung ersetzt die andere.

## Sonderfall Doku-Drift-Gate (BOO-229)

Anders als Sensitive-Paths/Personal-Data ist Doku-Drift teilweise **sicher selbst-aufloesbar**. Nur aktiv bei `compliance_doc_gate: true`. Verhalten im Autopilot:

- **Sicher (kein Stopp noetig):** fehlende Registrierung in §Referenzen/INDEX → der Worker traegt die Datei selbst nach (mechanisch, keine Echt-Entscheidung), protokolliert es und faehrt fort.
- **Echt-Entscheidung (pausiert):** `lokal ≠ remote` (eine getrackte Doku haengt hinter `origin`) — der Operator entscheidet, welche Version gilt (`git pull` vs. lokal behalten). Freigabe-Token `doc-drift-ok: <name> - <kommentar>`.

Im **Standard-Modus** (`compliance_doc_gate: false`) pausiert nichts — der Drift ist WARN, der Lauf laeuft durch.

## Protokoll

1. **Pause.** `/implement` (im Story-Subagent) stoppt an seinem Gate. `/goal` faehrt fuer diese
   Story **nicht** fort — kein Merge, kein Worktree-Cleanup. Andere Stories koennen weiterlaufen.
2. **Notify.** Operator-Hinweis mit **Story-ID**, **Gate-Typ** und **konkretem Pfad/Grund** —
   persistente Notiz (z.B. Linear-Kommentar), damit der Operator auch remote antworten kann.
3. **Warten.** `/goal` haelt diese Story blockiert, bis der Operator das passende Freigabe-Token
   liefert. **Kein** Timeout-Resume.
4. **Resume.** Nach Freigabe traegt `/implement` den Block ins Spec-File (`## Human Review`
   bzw. `## Privacy Review`) und faehrt fort; `/goal` nimmt den Story-Subagent wieder auf.
5. **Abbruch (optional).** Will der Operator nicht freigeben: Story zurueck auf `Backlog`,
   Worktree entfernen.

## Verbote

- ❌ Kein automatischer Bypass eines Gates.
- ❌ Kein Timeout-basiertes Auto-Resume.
- ❌ Keine Freigabe „im Voraus" fuer kommende Stories — jede Freigabe gilt fuer genau einen Block.

## Zustandsmaschine

```text
laufend ──(Gate-Treffer)──▶ pausiert ──(review-ok / privacy-ok / doc-drift-ok)──▶ resumed ──▶ laufend
                              │
                              └──(Operator lehnt ab)──▶ abgebrochen (Story → Backlog)
```

Sketch: `docs/gate-block-handling.png` (HANDBUCH Anhang AD).
