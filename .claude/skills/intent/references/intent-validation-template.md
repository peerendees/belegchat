---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Kopiervorlage: `intents/INTENT-XX.validation.md`

Diese Datei wird vom `/intent`-Skill am Ende von Schritt 4 (Schaerfen) ausgefuellt. Operator kopiert sie nach `intents/INTENT-XX.validation.md` im Projekt-Repo.

Status-Symbole:
- `[OK]` Pass — kein Treffer / sauber
- `[X]` Fail — Linter-Treffer (Stufe 1)
- `[?]` Open — Soulkiller-Frage offen oder Operator-Begruendung steht aus (Stufe 2)

---

## Deutsche Vorlage

```markdown
---
intent_ref: INTENT-XX
status: gruen | gelb | rot
validated_at: YYYY-MM-DD
---

# Validation-Report INTENT-XX

Bezugs-Datei: [INTENT-XX.md](INTENT-XX.md)

## Stufe 1 — Linter (deterministisch)

| Pattern | Status | Treffer-Zitat | Vorschlag |
|---------|--------|---------------|-----------|
| Fehler 1 — Versteckter Feature-Intent | [OK] / [X] | <Falls [X]: zitiere die Stelle wortwoertlich, z.B. "...mithilfe eines KI-Chatbots..."> | <Konkrete Umformulierung; z.B. "ersetze 'mithilfe eines KI-Chatbots' durch 'ohne menschlichen Ansprechpartner warten zu muessen'"> |
| Fehler 2 — Nicht messbarer Intent | [OK] / [X] | <Falls [X]: zeig welche qualitative Phrase ohne Zahl drin ist, z.B. "...bessere Experience..."> | <Konkrete Metrik-Empfehlung; z.B. "ergaenze 'Erfolg = NPS steigt von X auf Y innerhalb Z Monaten'"> |
| Fehler 3 — Unternehmens-Intent | [OK] / [X] | <Falls [X]: Anfangs-Phrase, z.B. "Wir wollen..."> | <Umformulierung Richtung Nutzer-Perspektive; z.B. "ersetze 'Wir wollen Supportkosten senken' durch 'Der Nutzer loest X % seiner Anliegen selbst'"> |
| Fehler 4 — Mega-Intent | [OK] / [X] | <Falls [X]: Wortzahl + ggf. mehrere Metriken im Erfolgs-Block> | <Splitting-Vorschlag; z.B. "Teile in 3 Sub-Intents: Onboarding, Self-Service, Support-Routing"> |
| Fehler 5 — Copy-Paste-Intent | [OK] / [X] | <Falls [X]: zeig die generischen Phrasen> | <Kontext-Spezifizierung; z.B. "ersetze 'der Nutzer' durch konkrete Rolle, ergaenze projekt-spezifische Reibung"> |

**Stufe-1-Befund:** <0 Treffer | 1 Treffer | 2+ Treffer> — bei 0 Treffern Stufe 1 gruen, bei 1+ Treffern hat Operator entweder umformuliert oder Begruendung in §Empfehlung dokumentiert.

## Stufe 2 — LLM-Stresstest (qualitativ)

| Soulkiller | Status | Operator-Begruendung |
|------------|--------|----------------------|
| Tech-Trap | [OK] / [?] | <Falls [?]: Wie hat der Operator die Frage "Wird Technologie genutzt weil verfuegbar?" beantwortet? Wenn die Frage offen blieb, hier "OFFEN" eintragen.> |
| Process-Trap | [OK] / [?] | <Falls [?]: Wie hat der Operator die Frage "Optimiert Intent Prozess statt Nutzen?" beantwortet?> |
| Experience-Trap | [OK] / [?] | <Falls [?]: Wie hat der Operator die Frage "Welche konkrete Experience fuer wen?" beantwortet?> |

**Stufe-2-Befund:** <Alle 3 OK | 1 offen | 2+ offen> — bei allen OK Stufe 2 gruen, bei offenen Fragen muss Operator in §Empfehlung begruenden warum trotzdem freigegeben oder zurueckgewiesen.

## Goldstandard-Vergleich

Vergleich des Drafts gegen das Londoner-Team-Beschwerde-Beispiel (siehe [intent-examples.md](../intentron/intent/references/intent-examples.md) §1).

Drei konkrete Verbesserungsvorschlaege:

1. **<Verbesserung 1>** — <z.B. "Nutzergruppe enger fassen: statt 'Operatoren' -> 'Operatoren in der ersten Sprint-Session'"> — Begruendung mit Bezug zum Goldstandard.
2. **<Verbesserung 2>** — <z.B. "Reibungspunkt konkreter benennen"> — Begruendung.
3. **<Verbesserung 3>** — <z.B. "Zeitrahmen verkuerzen oder verlaengern"> — Begruendung.

(Falls der Draft bereits sehr nahe am Goldstandard ist: hier statt 3 Verbesserungen 1-2 Verfeinerungs-Vorschlaege oder die Begruendung "Draft ist auf Goldstandard-Niveau".)

## Empfehlung

**Status:** <gruen | gelb | rot>

**Begruendung:**

<2-4 Saetze. Bei gruen: warum sauber, was war besonders gut. Bei gelb: welche Warnung wurde bewusst akzeptiert, mit welcher Begruendung des Operators. Bei rot: was muss konkret nachgebessert werden, in welcher Reihenfolge.>

**Naechster Schritt:**
- gruen -> `intents/INTENT-XX.md` ist Input fuer `/ideation`
- gelb -> `intents/INTENT-XX.md` ist Input fuer `/ideation`, Operator-Notiz wird mitgegeben
- rot -> Operator formuliert neu, Skill startet Schritt 4 erneut

```

---

## English template

```markdown
---
intent_ref: INTENT-XX
status: green | yellow | red
validated_at: YYYY-MM-DD
---

# Validation report INTENT-XX

Source file: [INTENT-XX.md](INTENT-XX.md)

## Stage 1 — Linter (deterministic)

| Pattern | Status | Hit-quote | Suggestion |
|---------|--------|-----------|------------|
| Mistake 1 — Hidden feature intent | [OK] / [X] | <If [X]: quote the passage verbatim, e.g. "...using an AI chatbot..."> | <Concrete reformulation; e.g. "replace 'using an AI chatbot' with 'without waiting for a human contact'"> |
| Mistake 2 — Non-measurable intent | [OK] / [X] | <If [X]: show the qualitative phrase without number, e.g. "...better experience..."> | <Concrete metric recommendation; e.g. "add 'Success = NPS rises from X to Y within Z months'"> |
| Mistake 3 — Company intent | [OK] / [X] | <If [X]: opening phrase, e.g. "We want..."> | <Reformulation toward user perspective; e.g. "replace 'We want to cut support costs' with 'The user solves X% of cases themselves'"> |
| Mistake 4 — Mega intent | [OK] / [X] | <If [X]: word count + multiple metrics in success block> | <Splitting suggestion; e.g. "split into 3 sub-intents: onboarding, self-service, support routing"> |
| Mistake 5 — Copy-paste intent | [OK] / [X] | <If [X]: show the generic phrases> | <Context specification; e.g. "replace 'the user' with concrete role, add project-specific friction"> |

**Stage 1 finding:** <0 hits | 1 hit | 2+ hits> — at 0 hits stage 1 is green; at 1+ hits, operator has either reformulated or documented reasoning in §Recommendation.

## Stage 2 — LLM stress test (qualitative)

| Soul killer | Status | Operator reasoning |
|-------------|--------|--------------------|
| Tech trap | [OK] / [?] | <If [?]: how did the operator answer "Is technology used because available?" If the question stayed open, enter "OPEN" here.> |
| Process trap | [OK] / [?] | <If [?]: how did the operator answer "Does intent optimize process instead of value?"> |
| Experience trap | [OK] / [?] | <If [?]: how did the operator answer "Which concrete experience for whom?"> |

**Stage 2 finding:** <All 3 OK | 1 open | 2+ open> — at all OK stage 2 is green; with open questions, the operator must justify in §Recommendation why released or rejected anyway.

## Gold-standard comparison

Comparison of the draft against the London-team complaint example (see [intent-examples.md](../intentron/intent/references/intent-examples.md) §1).

Three concrete improvement suggestions:

1. **<Improvement 1>** — <e.g. "narrow user group: instead of 'operators' -> 'operators in the first sprint session'"> — reasoning with reference to the gold standard.
2. **<Improvement 2>** — <e.g. "name friction point more concretely"> — reasoning.
3. **<Improvement 3>** — <e.g. "shorten or extend the time frame"> — reasoning.

(If the draft is already very close to the gold standard: replace 3 improvements with 1-2 refinement suggestions or the note "Draft is at gold-standard level".)

## Recommendation

**Status:** <green | yellow | red>

**Reasoning:**

<2-4 sentences. For green: why clean, what was particularly good. For yellow: which warning was knowingly accepted, with what operator reasoning. For red: what must be improved concretely, in what order.>

**Next step:**
- green -> `intents/INTENT-XX.md` is input for `/ideation`
- yellow -> `intents/INTENT-XX.md` is input for `/ideation`, operator note is included
- red -> operator reformulates, skill restarts step 4

```
