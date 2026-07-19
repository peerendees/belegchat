---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Termination-Phrasen-Bibliothek (`/goal`)

Referenz zu `/sprint-run` Schritt 5. Eine **Termination-Phrase** ist die maschinell pruefbare
Beschreibung des Sprint-Endes, die `/sprint-run` an die native Termination-Engine `/goal` uebergibt.
`/goal` laeuft, bis ein Evaluator die Phrase als erfuellt sieht.

## Was eine gute Phrase ausmacht

Eine Phrase ist gut, wenn jeder ihrer Teilsaetze **objektiv pruefbar** ist — nicht „Sprint fertig",
sondern konkrete, beobachtbare Zustaende:

- **Issue-Status:** „alle Linear-Issues status:done" (pruefbar via Linear-Adapter)
- **Quality-Gates:** „alle Gates gruen (Semgrep, ESLint, Coverage>=80%, GitHub Actions)" (pruefbar
  via Gate-Exit-Codes / `gh run`)
- **Artefakte:** „journal/sprint-<date>.md geschrieben" (pruefbar via Dateisystem)
- **Keine offenen Tasks:** „keine offenen Subagent-Tasks" (pruefbar via `/goal`-interne Task-Liste)

Vermeide vage Begriffe („sauber", „gut", „fertig") ohne messbares Kriterium — der Evaluator kann
sie nicht pruefen und der Loop terminiert nie oder zu frueh.

## Standard-Sprint-Phrase

```
/goal "Sprint <id> closed: alle Linear-Issues status:done, alle Quality-Gates grün
(Semgrep, ESLint, Coverage>=80%, GitHub Actions), journal/sprint-<date>.md geschrieben,
keine offenen Subagent-Tasks"
```

## Varianten

### Python-Stack (pytest + Ruff statt ESLint)

```
/goal "Sprint <id> closed: alle Linear-Issues status:done, alle Quality-Gates grün
(Semgrep, Ruff, pytest, Coverage>=80%, GitHub Actions), journal/sprint-<date>.md geschrieben,
keine offenen Subagent-Tasks"
```

### Einzel-Story-Sprint (E2E-Validierung, siehe goal-e2e-protocol.md)

```
/goal "Story <ISSUE> closed: Linear status:done, alle Quality-Gates grün (Semgrep, ESLint,
Coverage>=80%, GitHub Actions), nach main gemerged, meta.json ohne unbegruendeten skipped_gates"
```

### Mit Token-Boundary als explizitem Terminator

Die 80%-Boundary ist ohnehin Teil der Termination-Logik (siehe `token-boundary.md`); fuer
Klartext kann sie explizit in der Phrase stehen:

```
/goal "Sprint <id> closed: alle Linear-Issues status:done, alle Quality-Gates grün,
journal/sprint-<date>.md geschrieben — ODER Token-Budget (80% Context-Window) erreicht
(dann verbleibende Stories im Backlog belassen)"
```

## Anti-Pattern

- **Unpruefbare Phrase** („Sprint ist fertig") — der Evaluator hat kein Kriterium → kein
  definiertes Ende.
- **Nur Issue-Status, keine Gates** („alle Issues done") — terminiert evtl. auf rotem Code, weil
  die Gate-Bedingung fehlt.
- **Gegensaetzliche Bedingungen** ohne ODER — wenn zwei Teilsaetze sich ausschliessen, terminiert
  `/goal` nie.
- **Manuelle Schritte in der Phrase** („Operator hat reviewed") — Approval-Pausen gehoeren ins
  Gate-Block-Protokoll (`gate-block-handling.md`), nicht in die Termination-Phrase.
