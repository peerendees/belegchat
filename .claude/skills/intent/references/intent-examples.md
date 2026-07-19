---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent-Beispiele — Schrader-Goldstandard plus Projekt-Beispiel

Diese Datei wird vom `/intent`-Skill in Schritt 4 (Schaerfen) als Vergleichs-Goldstandard fuer den LLM-Stresstest in Stufe 2 geladen. Sie ergaenzt [intent-anti-patterns.md](intent-anti-patterns.md) §3 — dort sind die Beispiele kompakt referenziert, hier mit voller Begruendung pro Beispiel.

Aufbau pro Beispiel:
- **Hintergrund** — Was war die Ausgangslage?
- **Intent-Statement** — Verbatim oder Konstrukt
- **Drei Eigenschaften nach Schrader** — Nutzergruppe / Ergebnis-Messung / Problem
- **Warum es funktioniert** — Welche Anti-Pattern es vermeidet, welche Soulkiller es ausschliesst

---

## Beispiel 1 — Londoner Team Beschwerde-Management (Schraders Hauptbeispiel)

### Hintergrund

Das Londoner Team hatte unter Zeitdruck einen KI-Chatbot fuer die automatische Beantwortung von Beschwerden eingefuehrt. Technisch anspruchsvoll, Performance-getunt, Antwortvorlagen optimiert. Resultat: Kundenzufriedenheit *sank*. Nutzer fuehlten sich durch standardisierte Antworten abgespeist. Lead Engineer Michael fasste es selbstkritisch zusammen: "Wir hatten einen Loesungsfetisch und keinen Probleminhaber."

Nach diesem Lehrgeld hat das Team bei der zweiten Iteration ZUERST den Intent geklaert.

### Intent-Statement (verbatim Schrader)

> Kunden mit Beschwerden sollen
> innerhalb von 60 Minuten eine hilfreiche Loesung fuer ihr spezifisches Problem erhalten,
> ohne mehrmals nachfragen oder eskalieren zu muessen.
> Erfolg = Kundenzufriedenheit im Beschwerdeprozess steigt innerhalb von 3 Monaten nach Implementierung von 3,0 auf 4,0.

### Drei Eigenschaften nach Schrader

➀ **Nutzergruppe definiert** — Nicht "alle Kunden", sondern explizit "Kunden mit Beschwerden". Schraders Pointe: "Das schafft Fokus." Ohne diese Eingrenzung ist jeder Intent ein Mega-Intent.

➁ **Ergebnis messbar** — "Hilfreiche Loesung in unter 60 Minuten" ist ein konkretes, ueberpruefbares Kriterium. Nicht "schnell", nicht "zufriedenstellend" — sondern *60 Minuten*. Zeitwert ist hart messbar.

➂ **Problem benannt** — "Ohne mehrmals nachfragen oder eskalieren zu muessen" addressiert direkt den Schmerzpunkt der ersten gescheiterten Loesung (Chatbot mit standardisierten Antworten, der Nutzer in Eskalationsschleifen schickt).

### Warum es funktioniert

- **Kein Tech-Trap** — Kein Wort ueber Chatbot, KI, Ticketsystem. Implementierung kann Mensch+Tool, reine Mensch-Eskalation oder pure Self-Service sein. Der Intent legt nicht fest.
- **Kein Process-Trap** — Optimiert nicht "den Beschwerde-Prozess", sondern adressiert das Outcome aus Nutzersicht (eine *hilfreiche* Loesung).
- **Kein Experience-Trap** — "Experience" kommt nicht vor. Stattdessen konkretes Erlebnis: Kunde hat in <60 Min eine Loesung und musste nicht eskalieren.
- **Linter sauber** — Keine Technologiewoerter, klare Metrik (CSAT 3,0 -> 4,0), Zeitrahmen (3 Monate), Nutzer- statt Unternehmensperspektive, unter 40 Woerter, kontextspezifisch.

(Schrader Code Crash Kap. 4 §FORMULATING INTENT — THE PRACTICE, Markdown-Quellzeile ~1374-1399)

---

## Beispiel 2 — Reformulierung Fehler 1 (kein Feature-Intent)

### Hintergrund

Das urspruengliche Statement enthielt die Loesung im Intent ("KI-Chatbot"). Schrader zeigt, wie man das auf die richtige Ebene zurueckdreht.

### Intent-Statement (verbatim Schrader)

> Der Nutzer soll Probleme loesen koennen, ohne auf einen menschlichen Ansprechpartner warten zu muessen.

### Drei Eigenschaften nach Schrader

➀ **Nutzergruppe definiert** — "Der Nutzer" (mit dem Beschwerde-Kontext implizit aus dem Briefing).

➁ **Ergebnis messbar** — "Probleme loesen koennen" + implizite Selbstloesungs-Quote. Im Standalone-Statement fehlt noch der Zeit/Quoten-Wert — fuer eine vollstaendige Form muesste `Erfolg = X % Selbstloesung in <Y Min>` ergaenzt werden.

➂ **Problem benannt** — "Ohne auf einen menschlichen Ansprechpartner warten zu muessen" — Wartezeit und Eskalation sind die Reibung.

### Warum es funktioniert

- **Kein Tech-Trap** — Loesung ist offen. Chatbot, FAQ, Self-Service-Portal, asynchrones E-Mail-Routing — alles kompatibel.
- **Kein Process-Trap** — Adressiert das Wartezeit-Erleben des Nutzers, nicht den Prozess.
- **Linter:** Wuerde nur an Fehler 2 anschlagen weil Erfolgs-Metrik fehlt — das ist im Schrader-Originalbeispiel implizit, fuer ein vollstaendiges INTENT-XX.md muesste `Erfolg = ...` ergaenzt werden.

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1289-1295)

---

## Beispiel 3 — Reformulierung Fehler 2 (messbar gemacht)

### Hintergrund

"Bessere Experience" als Container-Wort wird aufgeloest in eine harte Sterne-Metrik mit Bezugs- und Zielwert.

### Intent-Statement (verbatim Schrader)

> Der Nutzer bewertet das Produkt mit mindestens 4,5 von 5 Sternen (aktuell: 3,8).

### Drei Eigenschaften nach Schrader

➀ **Nutzergruppe definiert** — "Der Nutzer" (allgemein, im Original-Kontext sind alle Produktnutzer gemeint).

➁ **Ergebnis messbar** — Ja: 4,5 von 5 Sternen ist eine harte Schwelle, 3,8 ist der Bezugspunkt.

➂ **Problem benannt** — Implizit: "aktuelle Bewertung 3,8 ist zu niedrig". Im vollstaendigen Statement waere ein expliziter Reibungspunkt zu ergaenzen ("ohne ...").

### Warum es funktioniert

- **Kein Experience-Trap** — "Experience" wird nicht erwaehnt. Stattdessen die operationalisierte Metrik (Sterne-Bewertung) — eindeutig, vergleichbar, ueber Zeit messbar.
- **Linter:** Quasi sauber. Was noch fehlt: Zeitrahmen ("innerhalb von X Monaten") und expliziter Reibungspunkt (`ohne ...`). Im Vollformat muesste das ergaenzt werden.

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1297-1303)

---

## Beispiel 4 — Reformulierung Fehler 3 (Nutzer- statt Unternehmens-Intent)

### Hintergrund

"Supportkosten um 30 % senken" ist Unternehmensziel. Schrader dreht es so um, dass der Nutzer im Mittelpunkt steht *und* die Kosten als Nebeneffekt fallen.

### Intent-Statement (verbatim Schrader)

> Der Nutzer loest 40 Prozent seiner Anliegen selbst, ohne den Support kontaktieren zu muessen — weil er es *will*, nicht weil er *muss*.

### Drei Eigenschaften nach Schrader

➀ **Nutzergruppe definiert** — "Der Nutzer".

➁ **Ergebnis messbar** — "40 Prozent Selbstloesungs-Quote" — harte Quote.

➂ **Problem benannt** — "Ohne den Support kontaktieren zu muessen" — die Reibung. Plus: der Halbsatz "weil er es will, nicht weil er muss" beugt der Ausweich-Strategie vor (Self-Service erzwingen, Nutzer frustrieren).

### Warum es funktioniert

- **Kein Unternehmens-Intent** — Beginnt mit "Der Nutzer", nicht mit "Wir wollen". Die Kostensenkung ist Konsequenz, nicht Ziel.
- **Anti-Erzwingungs-Klausel** — "Weil er es will, nicht weil er muss" ist genial: Es zwingt das Team, nicht nur Quote zu messen, sondern auch CSAT-Stabilitaet (sonst wuerde man ja Self-Service erzwingen und damit die Kunden frustrieren).
- **Linter:** Sauber bis auf fehlenden Zeitrahmen. Im Vollformat muesste `... innerhalb von X Monaten` ergaenzt werden.

(Schrader Code Crash Kap. 4 §THE MOST COMMON MISTAKES, Markdown-Quellzeile ~1305-1311)

---

## Beispiel 5 — Bootstrapping-Evolution-Projektkontext (Meta-Beispiel)

### Hintergrund

Das `/intent`-Skill selbst hat ein klares Outcome-Versprechen: Operatoren sollen am Ende einer Session einen sauberen Intent haben, ohne sich in User-Story-Templates zu verirren oder Goldstandard-Beispiele aus dem Kopf zaubern zu muessen. Dieses Beispiel zeigt einen Intent fuer ein Bootstrapping-Evolution-internes Anliegen.

### Intent-Statement

> Operatoren von Bootstrapping-Evolution-Projekten sollen
> innerhalb von einem Sprint einen Intent fuer eine neue Initiative klar formulieren koennen,
> ohne sich an User-Story-Templates zu orientieren oder Schrader-Beispiele aus dem Kopf rezitieren zu muessen.
> Erfolg = 3 von 3 naechsten Initiativen starten mit einem grun-validierten Intent (Linter sauber, Soulkiller bestanden) innerhalb der naechsten 2 Monate.

### Drei Eigenschaften nach Schrader

➀ **Nutzergruppe definiert** — "Operatoren von Bootstrapping-Evolution-Projekten". Nicht alle Software-Teams, nicht alle Schrader-Leser.

➁ **Ergebnis messbar** — "3 von 3 naechsten Initiativen starten mit gruen-validiertem Intent" ist binaer ueberpruefbar pro Initiative.

➂ **Problem benannt** — "Ohne sich an User-Story-Templates zu orientieren oder Schrader-Beispiele rezitieren zu muessen" — der Schmerzpunkt vor dem Skill: Operatoren landen entweder bei User Stories (zu loesungsorientiert) oder muessen die Goldstandard-Beispiele auswendig haben.

### Warum es funktioniert

- **Kein Tech-Trap** — Kein Wort ueber den Skill selbst, ueber LLMs oder ueber konkrete Tools.
- **Kein Process-Trap** — Optimiert nicht "den Intent-Findungs-Prozess", sondern den Outcome (3 von 3 Initiativen starten gut).
- **Kein Experience-Trap** — "Experience" kommt nicht vor; stattdessen konkretes Verhalten ("klar formulieren koennen") und konkrete Metrik (3/3 Initiativen).
- **Linter:** Sauber. Keine Technologie-Woerter, klare Metrik mit Zielwert (3/3) und Zeitrahmen (2 Monate), Nutzer-Perspektive, unter 40 Woerter im Kern-Statement, kontextspezifisch.

Dieses Beispiel zeigt: Auch interne, prozess-orientierte Initiativen koennen einen sauberen Outcome-Intent bekommen — solange man konsequent fragt: *Was soll der Nutzer am Ende konkret koennen, was er heute nicht kann?*
