---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: resolve-conflict
recommended_model: opus  # BOO-170 — Konflikt-Auflösung ist Urteilsarbeit; mechanische Klassen dürfen haiku, inhaltliche Empfehlung opus
description: |
  Assistierte Auflösung von Merge-Konflikten. Liest den Konflikt (PR via `gh` oder lokalen
  Merge-Zustand), meldet das Problem in Klartext, löst mechanische Konflikte über eine geprüfte
  Allowlist selbst auf und legt inhaltliche Konflikte nur mit Empfehlung vor. Gates laufen vor
  jeder Freigabe — kein stiller Merge. Verwenden wenn der Operator "löse den Merge-Konflikt",
  "resolve conflict", "der PR hat Konflikte", "merge blockiert" sagt oder "/resolve-conflict" ausführt.
version: 1.2.0
metadata:
  hermes:
    category: coding
    tags: [merge-konflikt, git, quality-gates, kollisionsschutz, allowlist]
    requires_toolsets: [terminal, git, gh]
    related_skills: [implement, sprint-run]
  effort_ai_hours: 5
  effort_human_equiv_hours: 20
---

# Resolve-Conflict

Merge-Konflikte assistiert auflösen — der Konflikt-Handler, den `sprint-run` heute nicht hat.

> **Klartext:** Bisher lässt dich das Framework beim Merge-Konflikt allein (`git merge --no-ff` fällt still auf «Git nativ, Mensch löst» zurück). Dieser Skill liest den Konflikt, löst das Mechanische selbst und legt dir das Inhaltliche mit Empfehlung vor. Er erfindet keine neue Fähigkeit — er codifiziert die Routine, die du sonst bei jedem Konflikt neu promptest.

Dieser Skill ist ein **Framework-Skill** (wie `implement`/`goal`): Er wird auch an den Kunden ausgeliefert. Er gehört zur **Konflikt-Auflösung**; die Konflikt-*Vermeidung* liegt auf den anderen Ebenen des Kollisionsschutzes → [`docs/kollisionsschutz-drei-ebenen.md`](../docs/kollisionsschutz-drei-ebenen.md).

## Wann diesen Skill nutzen

- Ein `git merge`/`git rebase` oder ein PR-Merge meldet Konflikte, und du willst sie geführt auflösen statt manuell in den Markern zu wühlen.
- Zwei parallele Branches haben dieselbe Append-Ziel-Datei angefasst (`docs/INDEX.md`, `HANDBUCH.md`, `docs/releases/README.md`, Changelog) — der klassische mechanische Konflikt.
- **Nicht** für Konflikt-*Vermeidung*: das sind Ebene 1/2/3 des Kollisionsschutzes (eigener Klon / Worktree / Write-Scopes) und BOO-353/BOO-354.
- **Nicht** als stiller Auto-Merger: inhaltliche Konflikte werden nie selbst aufgelöst, Gates nie übersprungen.

## Workflow (6 Schritte)

### Schritt 0: Environment + Autonomie laden

1. Lese `CONVENTIONS.md` (`governance_mode`) — er steuert die **Autonomie-Stufe** (Schritt 2). Fallback: `governance_mode=standard`.
2. Lese `.claude/environment.json` für `paths.*` und `tools_available.*` (`gh`, `git`). Fehlt ein Tool, wird der zugehörige Pfad übersprungen und im Output vermerkt.
3. Quelle bestimmen: **PR-Modus** (Argument ist eine PR-Nummer/-URL → `gh pr checkout`) oder **lokaler Modus** (ein laufender Merge/Rebase mit Konfliktmarkern im Working Tree).

### Schritt 1: Konflikt lesen und in Klartext benennen

**Klartext-Pflicht (BOO-372):** Der Adressat ist oft **kein GitHub-Profi**. Darum **immer zuerst bildlich in Alltagssprache** erklären, **was** das Problem ist — mit einer Analogie — **bevor** technische Details (Dateinamen, Marker, «DIRTY») kommen. Jargon wird sofort erklärt oder vermieden.

> **Alltags-Bild (Standard-Einstieg):** «Zwei Leute bearbeiten dasselbe Word-Dokument, beide ändern Satz 5 anders → der Computer weiss nicht, welche Version stimmt, und fragt dich.» So — und erst danach die technische Zuordnung.

**Ablauf:**

1. **Zuerst das Alltags-Bild** (Analogie oben): Was ist überhaupt passiert, ohne Fachwörter.
2. Konfliktdateien auflisten: `git diff --name-only --diff-filter=U` (lokal) bzw. aus dem PR-Merge-Zustand.
3. Pro Datei die Konflikt-Hunks (`<<<<<<< / ======= / >>>>>>>`) auswerten: *unsere* Seite (HEAD/`ours`) vs. *ihre* Seite (`theirs`).
4. **Dann die konkrete Klartext-Meldung** pro Hunk — in Alltagssprache, nicht als rohe Marker: «Beide Seiten haben in `datei` dieselbe Stelle geändert: wir → A, sie → B.»
5. **Nächster-Schritt-Pflicht:** Jede Meldung endet mit **einem klaren nächsten Schritt** in Alltagssprache — nicht nur einer Statusdiagnose. Z. B. «Sag ‹ja›, dann führe ich die harmlosen Fälle zusammen» oder «Bei diesem einen musst du entscheiden — A oder B?».

### Schritt 2: Mechanische Konflikte auto-auflösen (Allowlist)

Nur **bekannte, sichere Muster** werden automatisch aufgelöst. Die vollständige Klassen-Liste ist die SSoT in [`references/allowlist.md`](references/allowlist.md). Kern:

- **Beidseitige Append-Zeilen** in geordneten Listen/Tabellen (Changelog, Release-Wave-Liste, Anhang-Tabelle, `docs/INDEX.md`): beide Zeilen behalten, korrekt einsortieren (Union statt Wahl).
- **Wave-Index-Kopf / Versions-Bump:** höhere Version bzw. beide Wave-Einträge behalten.
- **DE/EN-Paritätsdateien:** dieselbe strukturelle Auflösung auf beiden Sprachdateien anwenden.
- **Reine Formatierung** (Whitespace, Zeilenende, Reihenfolge stabiler Blöcke).

Jede Auto-Auflösung wird protokolliert (welche Klasse, welche Datei). Passt ein Hunk in **keine** Allowlist-Klasse → er ist inhaltlich (Schritt 3).

### Schritt 3: Inhaltliche Konflikte nur mit Empfehlung

**Mechanisch vs. inhaltlich — in Laienworten trennen (BOO-372):** Nicht als «K1/K2-Allowlist-Klasse» melden, sondern als Alltags-Unterscheidung:

- **Mechanisch** = «Das ist reine Buchführung, das räume ich selbst weg» (z. B. beide Seiten haben je eine Zeile unten angehängt — man behält einfach beide).
- **Inhaltlich** = «Hier musst **du** entscheiden, weil es eine inhaltliche Aussage ist» (beide Seiten sagen an derselben Stelle etwas Verschiedenes — nur ein Mensch weiss, was gemeint ist).

**Ablauf:**

1. Für jeden nicht-mechanischen Hunk: Diff beider Seiten + **Begründung in Alltagssprache** (was jede Seite bezweckt) + **Vorschlag** (welche Seite bzw. welche Kombination, mit Warum) + **klarer nächster Schritt** («Welche Version soll rein — deine oder ihre?»).
2. **NICHT selbst auflösen.** Der Mensch entscheidet. Der Skill schreibt erst nach expliziter Freigabe.

### Schritt 4: Gates als Pflicht-Netz (kein stiller Merge)

Vor jeder Merge-Freigabe laufen die bestehenden Quality-Gates (Anschluss an [`sprint-run/references/gate-assertion.md`](../sprint-run/references/gate-assertion.md)): Lint/Test/Security je nach `change_type`, plus die Merge-Gate-Regel aus [`sprint-run/references/worktree-flow.md`](../sprint-run/references/worktree-flow.md) (kein Merge ohne grüne Remote-CI + grüne Gate-Assertion, nie auf dirty `main`).

**Negativ-Regel:** Ist ein Gate rot, gibt es **keine** Freigabe — der Skill stoppt und meldet das rote Gate. Ein roter Gate-Zustand ist nie durch eine Konflikt-Auflösung übersteuerbar.

### Schritt 5: Autonomie dialbar (Solo → Konzern)

Wie weit «mechanisch = automatisch» reicht, hängt an `governance_mode` (analog zur Gate-Staffelung):

| `governance_mode` | Mechanische Klassen | Inhaltliche Konflikte |
|---|---|---|
| `lite` (Solo) | alle Allowlist-Klassen auto | Vorschlag, Freigabe kann knapp sein |
| `standard` | Append-/Format-Klassen auto, Versions-/Wave-Kopf mit kurzer Bestätigung | Vorschlag + explizite Freigabe |
| `heavy` (Konzern) | jede Auto-Auflösung wird einzeln bestätigt | Vorschlag + explizite Freigabe + Audit-Eintrag |

Default ohne `CONVENTIONS.md`: `standard`.

### Beispiel-Klartext-Dialog (Ton-Muster, BOO-372)

So klingt eine gute Meldung — Analogie → was ist «boring» → wo brauchst du eine Entscheidung → nächster Schritt:

> **Was los ist:** Stell dir vor, zwei Leute bearbeiten dasselbe Word-Dokument und ändern beide Satz 5 — der Computer weiss nicht, welche Version stimmt, und fragt dich. Genau das ist hier bei deinem Pull Request passiert.
>
> **Was ich selbst wegräume (reine Buchführung):** In der Änderungs-Liste haben beide Seiten je eine neue Zeile unten angehängt. Da gibt es nichts zu entscheiden — ich behalte einfach beide. (3 solche Fälle.)
>
> **Wo ich dich brauche (eine echte Entscheidung):** In einer Datei sagt **deine** Version «Preis = 99», die **andere** «Preis = 89». Beides kann richtig sein — das weiss nur ein Mensch.
>
> **Dein nächster Schritt:** Sag mir bei diesem einen Fall: **99 oder 89?** Den Rest (die 3 Buchführungs-Fälle) räume ich weg, sobald du «mach» sagst.

Kein Fachchinesisch als Ergebnis; jede Meldung endet mit genau einem klaren nächsten Schritt.

## Abgrenzung

- **Keine neue Fähigkeit** — codifiziert den wiederkehrenden Prompt plus geprüfte Routine.
- **Kein Auto-Merge inhaltlicher Konflikte, nie stiller Merge.**
- **Keine Konflikt-Vermeidung** — das sind BOO-353 (Multi-Session-Schutz) und BOO-354 (Rebase-Härtung in `sprint-run`).
- **Verdrahtung als `sprint-run`-Merge-Handler:** eigenständig aufrufbar **und** seit **BOO-354** fest in `sprint-run` eingebunden — der Rebase-vor-Merge-Schritt übergibt Rebase-Konflikte an diesen Skill ([`sprint-run/references/worktree-flow.md`](../sprint-run/references/worktree-flow.md)).

## Verweise

- Kollisionsschutz-Hub: [`docs/kollisionsschutz-drei-ebenen.md`](../docs/kollisionsschutz-drei-ebenen.md) (Auflösung ↔ Vermeidung)
- `sprint-run`: [`sprint-run/references/worktree-flow.md`](../sprint-run/references/worktree-flow.md) · [`sprint-run/references/gate-assertion.md`](../sprint-run/references/gate-assertion.md)
- HANDBUCH **Anhang BC** · User-FAQ §12 «Wie löst das Framework Merge-Konflikte auf?»
- Spec: [`specs/BOO-352.md`](../specs/BOO-352.md) · Allowlist: [`references/allowlist.md`](references/allowlist.md)
