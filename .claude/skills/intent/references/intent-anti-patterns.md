---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent — Template, Anti-Patterns, Goldstandard

Diese Datei ist die einzige Quelle der Wahrheit fuer den `/intent`-Skill. Sie wird in Schritt 0 (Briefing) und in Schritt 4 (Schaerfen) ins Working Memory gelesen. Aenderungen hier wirken auf den Linter und den LLM-Stresstest.

Drei Sektionen:
- §1 Intent-Statement-Template
- §2 Anti-Patterns — 5 Fehler + 3 Soulkiller
- §3 Goldstandard-Beispiele aus Schrader

---

## §1 Intent-Statement-Template

### Formel

```
[Nutzergruppe] soll [messbares Ergebnis] erreichen,
ohne [aktuelles Problem/Reibung].
Erfolg = [konkrete Metrik mit Zielwert].
```

(Schrader Code Crash Kap. 4 §FORMULATING INTENT — THE PRACTICE)

### Drei Elemente eines Intents (Schrader §WHAT INTENT MEANS)

➀ **Praezise** — Nicht vage, nicht interpretierbar. Messbar und eindeutig. Wer den Intent liest, kann *am Ende* zweifelsfrei sagen, ob er erreicht wurde oder nicht.

➁ **Ergebnis** — Nicht Aktivitaet, nicht Output. Was am Ende erreicht werden soll. "Wir haben einen Chatbot gelauncht" ist Output. "Kunden mit Beschwerden bekommen in unter 60 Minuten eine hilfreiche Loesung" ist Outcome.

➂ **Nutzerperspektive** — Nicht was das Unternehmen will. Was der Nutzer erlebt. "Wir wollen Conversion steigern" ist Unternehmens-Sicht. "Der Nutzer findet schnell und ohne Frustration das richtige Produkt" ist Nutzer-Sicht.

### Abgrenzung zu anderen Konzepten (Schrader §WHAT INTENT MEANS)

| Konzept | Fokus | Unterschied zu Intent |
|---------|-------|------------------------|
| **User Story** | "Als [Rolle] moechte ich [Feature], damit [Nutzen]" | User Story schreibt die Loesung schon vor ("Ich will X"). Intent ist *ergebnisoffen* — der Agent kann die Loesung finden. |
| **OKR** | Objective + messbare Key Results | OKRs sind Quartalsziele fuer Teams. Intent ist die Anweisung fuer eine einzelne Implementierung. OKRs rahmen, Intent instruiert. |
| **Jobs-to-be-Done** | Welchen "Job" will der Kunde erledigen? | JTBD ist Discovery-Framework, Intent ist Delivery-Konzept. JTBD hilft zu verstehen *was* gebaut werden soll, Intent beschreibt *wie das Ergebnis aussehen soll*. |
| **Anforderungen** | Funktionale/nicht-funktionale Anforderungen | Anforderungen sind loesungsorientiert ("Das System soll X koennen"). Intent ist ergebnisorientiert ("Der Nutzer soll Y erreichen"). |

### Goldene Regel

> Keine Technologie im Intent. Was, nicht Wie.

Wenn das Wort "Chatbot", "App", "Dashboard", "KI", "API" oder eine andere Technologie-Spezifikation im Intent auftaucht, ist es kein Intent — es ist eine Loesung im Intent-Mantel. Der Linter (Stufe 1) faengt das mechanisch ab.

---

## §2 Anti-Patterns

### §2.1 Die 5 haeufigsten Fehler (Schrader §THE MOST COMMON MISTAKES IN INTENT FORMULATION)

Diese 5 Fehler werden in Stufe 1 (Linter) deterministisch geprueft.

#### Fehler 1: Versteckter Feature-Intent

**Schlecht (verbatim Schrader):**

> "Der Nutzer soll mithilfe eines KI-Chatbots Probleme loesen koennen."

**Warum falsch:** Der "Intent" enthaelt bereits die Loesung. Ein Chatbot ist eine Technologieentscheidung, kein User Outcome. Vielleicht loest ein Rueckrufservice das Problem besser. Oder ein verbessertes FAQ. Oder eine proaktive E-Mail.

**Besser (verbatim Schrader):**

> "Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen."

**Self-Check-Frage fuer Stufe 1 Linter:** Enthaelt das Statement Technologiewoerter aus dieser Liste — Chatbot, App, Bot, Dashboard, API, Tool, KI, AI, Plattform, System, Portal, Widget, Service?

#### Fehler 2: Nicht messbarer Intent

**Schlecht (verbatim Schrader):**

> "Der Nutzer soll eine bessere Experience haben."

**Warum falsch:** Was bedeutet "besser"? Schneller? Einfacher? Schoener? Ohne Metriken ist dieser Intent wertlos. Du wirst nie wissen, ob du ihn erreicht hast.

**Besser (verbatim Schrader):**

> "Der Nutzer bewertet das Produkt mit mindestens 4,5 von 5 Sternen (aktuell: 3,8)."

**Self-Check-Frage fuer Stufe 1 Linter:** Existiert ein `Erfolg = ...`-Block? Enthaelt er eine Zahl? Oder nur qualitative Begriffe wie "besser", "schoener", "freundlicher", "modern", "effizient", "intuitiv"?

#### Fehler 3: Unternehmens-Intent

**Schlecht (verbatim Schrader):**

> "Wir wollen unsere Supportkosten um 30 Prozent senken."

**Warum falsch:** Ein legitimes Geschaeftsziel, aber kein User Outcome. Wenn du ausschliesslich auf Kosten optimierst, riskierst du, die Nutzererfahrung zu verschlechtern.

**Besser (verbatim Schrader):**

> "Der Nutzer loest 40 Prozent seiner Anliegen selbst, ohne den Support kontaktieren zu muessen — weil er es *will*, nicht weil er *muss*."

(Die Kostensenkung ist dann ein Nebeneffekt, keine Zielmetrik.)

**Self-Check-Frage fuer Stufe 1 Linter:** Beginnt das Statement mit `Wir wollen`, `Unser Ziel ist`, `Die Firma moechte`, `Das Unternehmen`, `Das Team`, `Wir muessen`?

#### Fehler 4: Mega-Intent

**Schlecht (verbatim Schrader):**

> "Der Nutzer soll die beste digitale Erfahrung in seiner Branche haben."

**Warum falsch:** Zu gross, zu vage, zu langfristig. Ein guter Intent ist fokussiert genug, um in einem Quartal messbaren Fortschritt zu erzielen.

**Besser:** Den Mega-Intent in 3–5 fokussierte, messbare User Outcomes aufteilen. Jeder davon bekommt sein eigenes INTENT-XX.md.

**Self-Check-Frage fuer Stufe 1 Linter:** Hat das Statement >40 Woerter? Enthaelt der `Erfolg = ...`-Block mehr als eine primaere Metrik? (Beides Heuristiken — kein hartes Kriterium, aber starker Hinweis.)

#### Fehler 5: Copy-Paste-Intent

**Schlecht (verbatim Schrader):**

> "Der Nutzer soll eine Loesung in <60 Minuten erhalten." (kopiert aus einem voellig anderen Problem)

**Warum falsch:** Intents sind kontextspezifisch. Was beim Beschwerdemanagement funktioniert, passt nicht automatisch zur Produktberatung oder zum Vertragsabschluss.

**Besser (verbatim Schrader):**

> Jeden Intent von Grund auf neu entwickeln, basierend auf echtem Nutzerverstaendnis.

**Self-Check-Frage fuer Stufe 1 Linter:** Enthaelt das Statement projekt- oder kontextspezifischen Wortlaut? Oder nur generisches Phrasing, das 1:1 in beliebigem anderen Branchen-Kontext eingesetzt werden koennte? (Weiche Heuristik — Hinweis, kein harter Block.)

---

### §2.2 Die 3 Soulkiller (Schrader §SOUL — Markenversprechen)

Diese 3 Pattern werden in Stufe 2 (LLM-Stresstest) qualitativ geprueft. Anders als bei den 5 Fehlern reicht hier kein Wortlisten-Match — es geht um den *Sinn* hinter dem Intent.

#### Tech-Trap (Technologie-Falle)

**Schraders Definition (verbatim):**

> "Wir nutzen KI, weil wir KI nutzen koennen." Technologie wird zum Selbstzweck. Das Markenversprechen verblasst hinter dem Tool.

**Warum Soulkiller:** Wenn der Intent davon ausgeht, dass eine bestimmte Technologie eingesetzt werden muss, hat das Team aufgehoert, sich zu fragen, ob diese Technologie ueberhaupt das Problem loest. Die Marke wird zur Demo-Plattform fuer Tools statt zum Versprechen an den Nutzer.

**Self-Check-Frage fuer Stufe 2 LLM-Stresstest:**

> Wird hier Technologie genutzt, weil sie ein Problem loest, oder weil sie verfuegbar ist? Was am Intent waere anders, wenn die KI / das Tool nicht existieren wuerde?

**Beispiel — mit Tech-Trap:** "Der Nutzer soll mithilfe von Generative AI Probleme loesen koennen, weil das Team gerade GPT-4 in der Hand hat."

**Beispiel — ohne Tech-Trap:** "Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen." (Ob KI, FAQ oder Rueckrufservice — die Loesung kommt erst spaeter.)

#### Process-Trap (Prozess-Falle)

**Schraders Definition (verbatim):**

> "Wir optimieren den Prozess." Effizienz ersetzt Bedeutung. Die Marke wird zur Maschine — funktional, aber seelenlos.

**Warum Soulkiller:** Prozesse sind Mittel zum Zweck. Wenn ein Intent den Prozess optimiert, ohne sich zu fragen, ob der Prozess ueberhaupt der richtige ist, optimiert das Team einen falschen Loop schneller.

**Self-Check-Frage fuer Stufe 2 LLM-Stresstest:**

> Optimiert dieser Intent einen Prozess (Effizienz) statt echten Nutzen (Bedeutung)? Was ist der konkrete Unterschied zwischen "der Prozess ist schneller" und "der Nutzer hat etwas Wertvolleres erlebt"?

**Beispiel — mit Process-Trap:** "Der Beschwerde-Prozess soll von 3 Tagen auf 6 Stunden reduziert werden."

**Beispiel — ohne Process-Trap:** "Kunden mit Beschwerden sollen innerhalb von 60 Minuten eine hilfreiche Loesung fuer ihr spezifisches Problem erhalten, ohne mehrmals nachfragen oder eskalieren zu muessen."

#### Experience-Trap (Experience-Falle)

**Schraders Definition (verbatim):**

> "Wir verbessern die Experience." Aber welche Experience? KI hat Best Practice zur neuen Normalitaet gemacht. Ohne Markenversprechen ist jede Experience heute bestenfalls standardisiert gut — poliert, aber leer.

**Warum Soulkiller:** "Experience" ist ein Container-Wort, das alles und nichts bedeutet. Wenn ein Intent "die Experience verbessern" will, hat er meist nicht definiert, *welche* Experience, *fuer wen* und *woran man es merkt*.

**Self-Check-Frage fuer Stufe 2 LLM-Stresstest:**

> Welches *konkrete* Erlebnis wird verbessert — und fuer wen? Oder ist "Experience" hier Platzhalter ohne Substanz?

**Beispiel — mit Experience-Trap:** "Wir verbessern die Customer Experience im Onboarding."

**Beispiel — ohne Experience-Trap:** "Neue Kunden sollen innerhalb von 10 Minuten nach Anmeldung den ersten erfolgreichen Anwendungsfall durchlaufen, ohne den Support kontaktieren zu muessen. Erfolg = Time-to-First-Value sinkt von 45 Min auf 10 Min innerhalb von 3 Monaten."

---

## §3 Goldstandard-Beispiele aus Schrader

> Diese Beispiele sind verbatim aus Schrader *Code Crash* Kap. 4 §FORMULATING INTENT — THE PRACTICE und §THE MOST COMMON MISTAKES IN INTENT FORMULATION zitiert. Sie dienen dem LLM-Stresstest in Stufe 2 als Vergleichs-Goldstandard.

### Beispiel 1: Londoner Team — Beschwerde-Management (Hauptbeispiel)

**Intent-Statement (verbatim):**

> Kunden mit Beschwerden sollen
> innerhalb von 60 Minuten eine hilfreiche Loesung fuer ihr spezifisches Problem erhalten,
> ohne mehrmals nachfragen oder eskalieren zu muessen.
> Erfolg = Kundenzufriedenheit im Beschwerdeprozess steigt innerhalb von 3 Monaten nach Implementierung von 3,0 auf 4,0.

**Drei Eigenschaften (verbatim Schrader):**

➀ Die Nutzergruppe ist definiert — "Nicht alle Kunden, sondern Kunden mit Beschwerden. Das schafft Fokus."

➁ Das Ergebnis ist messbar — "'Hilfreiche Loesung in unter 60 Minuten' — ein konkretes, ueberpruefbares Kriterium."

➂ Das Problem ist benannt — "'Ohne mehrmals nachfragen oder eskalieren zu muessen' — das adressiert den eigentlichen Schmerzpunkt, nicht nur einen Zielwert, an dem das Team gemessen werden kann."

**Was nicht im Statement steht (verbatim Schrader):**

> "Keine Technologiespezifikation. Kein Wort ueber Chatbot, KI, Ticketsystem oder App. Das ist Absicht. Der Intent beschreibt das *Was*, nicht das *Wie*. Die Technologieentscheidung kommt spaeter — und sie wird sich aus dem Intent ableiten, nicht umgekehrt."

**Warum Goldstandard:** Alle drei Schrader-Elemente erfuellt (praezise / Ergebnis / Nutzerperspektive). Zeitrahmen explizit (3 Monate). Baseline (3,0) und Ziel (4,0) gleichermassen messbar. Kein Tech-Trap, kein Process-Trap, kein Experience-Trap.

(Schrader Code Crash Kap. 4 §FORMULATING INTENT — THE PRACTICE, Markdown-Quellzeile ~1374-1399)

---

### Beispiel 2: Reformulierung Fehler 1 — ohne Feature-Intent

**Schlecht:** "Der Nutzer soll mithilfe eines KI-Chatbots Probleme loesen koennen."

**Goldstandard (verbatim Schrader):**

> Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen.

**Insight:** Das Problem ("warten muessen") wird benannt, ohne die Loesung vorwegzunehmen. Der Implementierungsweg ist offen — Chatbot, FAQ, Self-Service-Portal, asynchrone E-Mail-Routing — alles waere kompatibel mit diesem Intent. Das ist die richtige Ebene.

**Erfolgskriterium (zu ergaenzen):** Quote der ohne menschliche Hilfe geloesten Anliegen + Zeit bis Loesung.

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1289-1295)

---

### Beispiel 3: Reformulierung Fehler 2 — messbar gemacht

**Schlecht:** "Der Nutzer soll eine bessere Experience haben."

**Goldstandard (verbatim Schrader):**

> Der Nutzer bewertet das Produkt mit mindestens 4,5 von 5 Sternen (aktuell: 3,8).

**Insight:** Sowohl Istwert (3,8) als auch Zielwert (4,5) sind genannt. Die Metrik (Sterne-Bewertung) ist eindeutig. Implizit ist der Zeitrahmen — der waere in einer vollstaendigen Version noch zu ergaenzen ("innerhalb von X Monaten").

**Erfolgskriterium:** 4,5 von 5 Sterne als harte Schwelle, Istwert 3,8 als Bezugspunkt.

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1297-1303)

---

### Beispiel 4: Reformulierung Fehler 3 — Nutzerperspektive statt Unternehmens-Intent

**Schlecht:** "Wir wollen unsere Supportkosten um 30 Prozent senken."

**Goldstandard (verbatim Schrader):**

> Der Nutzer loest 40 Prozent seiner Anliegen selbst, ohne den Support kontaktieren zu muessen — weil er es *will*, nicht weil er *muss*.

**Insight:** Die Kostensenkung wird zum Nebeneffekt, nicht zum Ziel. Der Zusatz "weil er es will, nicht weil er muss" ist kein Schmuckwerk — er addressiert direkt die Gefahr, dass das Team einen Self-Service erzwingt, der den Nutzer frustriert.

**Erfolgskriterium:** 40 % Selbstloesungsquote *und* CSAT/NPS-Stabilitaet (zur Absicherung gegen "Nutzer wird in Self-Service gezwungen").

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1305-1311)
