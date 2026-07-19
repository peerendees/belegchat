---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent-Skill — Vom Problem zum messbaren User Outcome

> 5-Schritte-Workflow der eine Initiative von "wir wollen was bauen" zu einem messbaren, technologie-agnostischen Intent-Statement bringt — mit zweistufigem Self-Check gegen 8 Anti-Pattern. Schluss mit Loesungs-Fetisch ohne Probleminhaber.

**Version:** 1.3.0 · **Befehl:** `/intent`

> **Claude-Code-Modus:** `/intent` ist eine reine Denk-/Interview-Session → **`plan`** (Plan Mode): das Intent-Statement entsteht im Dialog, geschrieben wird erst nach deiner Freigabe. Kein unbeaufsichtigter Betrieb. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Der Skill operationalisiert Matthias Schraders Prinzip *Intent before Implementation* (Code Crash Kap. 4) als wiederholbaren Workflow. Er fuehrt eine 30–60-minuetige Intent-Session in 5 Schritten — Problem-Story, Baseline, Intent-Brainstorming, zweistufiger Self-Check, Erfolgsmetrik — und destilliert daraus ein einziges Intent-Statement nach festem Template:

```
[Nutzergruppe] soll [messbares Ergebnis] erreichen,
ohne [aktuelles Problem/Reibung].
Erfolg = [konkrete Metrik mit Zielwert].
```

Output ist `intents/INTENT-XX.md` plus `intents/INTENT-XX.validation.md` (Self-Check-Report mit Status `gruen | gelb | rot`). Beide Dateien sind verbindlicher Input fuer `/ideation` — dort werden sie zu Stories, deren Acceptance Criteria am Intent gemessen werden muessen.

**Perceive-Modus (ab v1.1.0):** Wer mit Rohmaterial startet (Transkripte, Notizen, Kundenfeedback), kann diese in `intents/raw/` ablegen. Der Skill destilliert daraus einen `INTENT-DRAFT-XX.md` als strukturierten Startpunkt fuer die Session — iterierbar ueber mehrere Sessions via persistiertem Draft-Artefakt.

Der Skill ist Sparringspartner, nicht Generator. Er formuliert keinen Intent fuer den Operator — er fragt, prueft, vergleicht. Schraders Pointe: *Intent ist menschliche Verdichtung, nicht KI-Output*.

---

## Welches Problem er loest

Schrader benennt den Kernfehler fast aller Produktteams im KI-Zeitalter: **Geschwindigkeit ohne Richtung ist keine Effizienz, es ist beschleunigtes Scheitern.** KI-Tools verfuehren zum schnellen Bauen — Cursor, Claude Code, Copilot machen Version 1.0 in Minuten moeglich. Genau hier lauert die Falle: ohne klaren Intent produziert das Team Endlosschleifen aus Trial and Error, polierten Code an der Realitaet vorbei.

### Die 5 haeufigsten Fehler (Schrader §The Most Common Mistakes in Intent Formulation)

1. **Versteckter Feature-Intent** — "Der Nutzer soll mithilfe eines KI-Chatbots Probleme loesen koennen." Die Loesung steckt schon im Intent. Falsch — Intent beschreibt das *Was*, nicht das *Wie*.
2. **Nicht messbarer Intent** — "Der Nutzer soll eine bessere Experience haben." Was bedeutet "besser"? Ohne Metrik wertlos.
3. **Unternehmens-Intent** — "Wir wollen Supportkosten um 30 Prozent senken." Geschaeftsziel, kein User Outcome. Wer auf Kosten optimiert, riskiert die Nutzererfahrung zu verschlechtern.
4. **Mega-Intent** — "Der Nutzer soll die beste digitale Erfahrung in seiner Branche haben." Zu gross, zu vage, kein Quartals-Fortschritt messbar.
5. **Copy-Paste-Intent** — "Der Nutzer soll eine Loesung in <60 Minuten erhalten" (kopiert aus voellig anderem Problem). Intents sind kontextspezifisch.

Stufe 1 des Self-Checks (deterministischer Linter) prueft mechanisch auf diese 5 Pattern.

### Die 3 Soulkiller (Schrader §SOUL — Markenversprechen)

1. **Tech-Trap** — "Wir nutzen KI, weil wir KI nutzen koennen." Technologie wird zum Selbstzweck. Markenversprechen verblasst hinter dem Tool.
2. **Process-Trap** — "Wir optimieren den Prozess." Effizienz ersetzt Bedeutung. Marke wird zur Maschine, funktional aber seelenlos.
3. **Experience-Trap** — "Wir verbessern die Experience." Aber WELCHE Experience? Ohne Markenversprechen ist jede Experience heute bestenfalls standardisiert gut — poliert, aber leer.

Stufe 2 des Self-Checks (LLM-Stresstest) stellt zu jedem Soulkiller eine konkrete Pruef-Frage und vergleicht den Draft mit Schraders Goldstandard-Beispielen.

---

## Trigger

- `/intent`
- "neue Initiative"
- "Intent fuer X"
- "wir wollen Y"
- "Idee schaerfen"
- "bevor wir Stories bauen"

---

## Workflow im Ueberblick (5 Schritte)

| # | Schritt | Was passiert |
|---|---------|--------------|
| 1 | **Problem verstehen** | Operator erzaehlt 1–2 konkrete Geschichten — Menschen statt Statistiken. Skill schiebt zurueck bei abstrakten Beschreibungen. |
| 2 | **Istzustand quantifizieren** | Harte Zahlen als Baseline (NPS, CSAT, Konversion, Time-to-Solution, ...). Wenn Operator keine Zahl hat: Skill schlaegt Proxy-Metriken vor. |
| 3 | **Intent-Brainstorming** | Operator formuliert 1–3 Drafts nach Template. Quantitaet vor Qualitaet — keine Pruefung in dieser Phase. |
| 4 | **Intent schaerfen** | Zweistufiger Self-Check: Linter (5 Fehler, deterministisch) + LLM-Stresstest (3 Soulkiller + Goldstandard-Vergleich, dialogisch). |
| 5 | **Erfolgsmetrik definieren** | Metrik / Istwert / Zielwert / Zeitrahmen / Messverfahren — alles Pflicht. |

Output am Ende: 1 Intent-Statement (1 Satz nach Template) plus Validation-Report mit Status gruen/gelb/rot.

---

## Self-Check zweistufig

**Stufe 1 — Linter (deterministisch).** Skill prueft mechanisch nach den 5 haeufigsten Fehlern: Wortliste-Match auf Technologiebegriffe (Fehler 1), fehlende Metrik im Erfolgs-Block (Fehler 2), Unternehmens-Phrasen wie "Wir wollen" (Fehler 3), >40 Woerter oder mehrere Metriken (Fehler 4), generisches kontextfreies Phrasing (Fehler 5). Treffer = harter Hinweis im Validation-Report mit Umformulierungs-Vorschlag.

**Stufe 2 — LLM-Stresstest (qualitativ).** Skill stellt drei Soulkiller-Fragen (Tech-Trap / Process-Trap / Experience-Trap) und vergleicht den Draft mit Schraders Londoner-Team-Goldstandard. Treffer = Rueckfrage, kein harter Block. Operator entscheidet — bewusste Bestaetigung wird im Validation-Report festgehalten ("warum trotz Warnung").

Status-Logik:
- **gruen** — Stufe 1 sauber, Stufe 2 sauber → darf in `/ideation`
- **gelb** — 1+ Treffer, aber Operator hat begruendet bestaetigt → darf in `/ideation` mit Notiz
- **rot** — mehrere unbestaetigte Treffer oder offene Soulkiller-Frage → zurueck zum Operator

---

## Output

### `intents/INTENT-XX.md`

Frontmatter (`id`, `status`, `created`, optional `linked_initiative`) plus 6 Sektionen:
1. Problem-Story
2. Baseline (Istzustand)
3. Intent-Drafts (1–3)
4. Self-Check (Verweis auf Validation-File)
5. Erfolgsmetrik
6. Intent-Statement (final, fett)

### `intents/INTENT-XX.validation.md`

Frontmatter (`intent_ref`, `status: gruen|gelb|rot`, `validated_at`) plus 4 Sektionen:
1. Stufe 1 — Linter (Tabelle, 5 Zeilen)
2. Stufe 2 — LLM-Stresstest (Tabelle, 3 Zeilen)
3. Goldstandard-Vergleich (1–3 Verbesserungsvorschlaege)
4. Empfehlung (Status mit Begruendung)

---

## Pipeline-Position

```
+----------+        +-----------+        +-----------+        +-------------+
| /intent  | -----> | /ideation | -----> | /backlog  | -----> | /implement  |
+----------+        +-----------+        +-----------+        +-------------+
     |                    |
     |                    +-- liest intents/INTENT-XX.md beim Story-Bau
     |                         und nutzt das Intent-Statement als
     |                         Pruef-Massstab fuer jede Acceptance Criterion
     |
     +-- erzeugt intents/INTENT-XX.md + INTENT-XX.validation.md
```

`/intent` ist die Quelle. BOO-10 (Folge-Story) implementiert die Verbreitung des Intents durch die Pipeline — Stories messen ACs gegen den Intent, Sprint-Reviews validieren am Intent. `/intent` selbst kuemmert sich nur um die saubere Erzeugung des Intent-Artefakts.

---

## Hintergrund

Matthias Schrader argumentiert in *Code Crash* (2025): Wenn KI Code zur Commodity macht, verschiebt sich die Knappheit. Code zu schreiben kostet nichts mehr — den richtigen Code zu *wollen* bleibt schwer. Die neue Knappheit ist die Faehigkeit, einen klaren Intent aus einer einzigartigen Erkenntnis heraus zu entwickeln.

Schraders empirische Empfehlung: 15–25 % der Projektzeit in Intent-Klaerung investieren. Bei einem Vier-Wochen-Projekt ist das maximal eine Woche. Bei einem Zwei-Tage-Sprint sind es Stunden. Die Proportion bleibt, das Tempo steigt.

Warum das paradox erscheint, aber stimmt: KI-Tools verfuehren zum schnellen Bauen, aber unklarer Intent fuehrt zu zahllosen Umwegen. Stell dir vor, du gibst einer KI die Aufgabe "Bau mir eine Loesung fuer das Beschwerdeproblem" — die KI produziert etwas, wahrscheinlich einen Chatbot. Du schaust dir das Ergebnis an, korrigierst, bekommst etwas Neues, korrigierst wieder. Endlose Trial-and-Error-Schleife. Klarer Intent dagegen wirkt wie ein Laserpointer: alle Beteiligten — Mensch und Maschine — wissen genau, wohin die Reise geht.

Der Skill macht aus diesem Prinzip einen reproduzierbaren Workflow. Er erzwingt die bewusste Pause vor der Entwicklung. Er verhindert, dass aus "lass uns schnell etwas zusammenbauen" ein ueber Wochen verteiltes Trial-and-Error-Projekt wird.

---

## Quellen

- **Buch:** Matthias Schrader, *Code Crash* (2025), Kapitel 4 — verbatim zitierte Sektionen siehe [references/intent-anti-patterns.md](references/intent-anti-patterns.md) und [references/intent-examples.md](references/intent-examples.md)
- **ADR:** `[[2026-04-26 Anti-Pattern-Self-Check im Intent-Skill]]` — Entscheidung zum Wohnort der Anti-Pattern (Intent statt Ideation), zum zweistufigen Check und zur Reference-Datei
- **ADR:** `[[2026-04-26 Abgrenzung Intent vs Ideation vs Design Thinking]]` — Intent = konvergent (verdichten), Ideation = divergent (explorieren); kein eigener Design-Thinking-Skill
- **Projekt-Hub:** `[[Bootstrapping Evolution - PMO HUB]]`
- **Brainstorming-Meeting:** Findet sich im Vault unter `02 Projekte/Bootstrapping Evolution/Meetings/`

---

## Installation und Nutzung

Skill liegt unter `~/.claude/skills/intent/` (lokal) bzw. `intentron/intent/` im Repo `vibercoder79/claudecodeskills`. Nach dem Setup-Script (`setup.sh`) ist er automatisch aktiviert.

Verwendung im Chat:

```
/intent
```

Oder eines der Trigger-Phrasen:

```
neue Initiative — wir wollen das Onboarding fuer neue Operatoren glattziehen
```

Skill startet automatisch und fuehrt durch die 5 Schritte.

---

## Dateistruktur

```
intentron/intent/
├── SKILL.md                          ← Skill-Definition (DE — primaer)
├── SKILL.en.md                       ← Skill-Definition (EN)
├── README.md                         ← Diese Datei (DE)
├── README.en.md                      ← Englisches README
└── references/
    ├── intent-anti-patterns.md          ← 3 Sektionen: Template, 8 Anti-Pattern, Goldstandard (DE)
    ├── intent-anti-patterns.en.md       ← Englische Spiegelung
    ├── intent-template.md               ← Kopiervorlage fuer intents/INTENT-XX.md (DE)
    ├── intent-template.en.md            ← Englische Kopiervorlage
    ├── intent-draft-template.md         ← Kopiervorlage fuer intents/INTENT-DRAFT-XX.md (Perceive-Output, DE)
    ├── intent-draft-template.en.md      ← Englische Kopiervorlage
    ├── intent-examples.md               ← Schrader-Beispiele plus Projekt-Beispiel (DE)
    ├── intent-examples.en.md            ← Englische Spiegelung
    ├── intent-validation-template.md    ← Template fuer intents/INTENT-XX.validation.md (DE)
    └── intent-validation-template.en.md ← Englische Spiegelung
```
