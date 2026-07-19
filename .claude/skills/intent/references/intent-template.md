---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Kopiervorlage: `intents/INTENT-XX.md`

Diese Datei wird vom `/intent`-Skill am Ende der 5-Schritte-Session ausgefuellt. Operator kopiert sie nach `intents/INTENT-XX.md` im Projekt-Repo (XX = naechste freie Nummer mit fuehrenden Nullen, z.B. `INTENT-01.md`).

---

```markdown
---
id: INTENT-XX
status: draft
created: YYYY-MM-DD
linked_initiative: BOO-XX  # optional, Linear-Issue-Key der zugehoerigen Initiative
---

# INTENT-XX — <Kurz-Titel der Initiative>

<!-- Kurz-Titel: 4-7 Woerter, beschreibt die Initiative auf einen Blick.
     Beispiel: "Onboarding fuer neue Operatoren" oder "Beschwerde-Loesung in unter 60 Min". -->

## 1. Problem-Story

<!-- Aus Schritt 1: 1-2 konkrete Geschichten. Menschen statt Statistiken.
     Wer war es, wann war es, was ist konkret passiert, wie ist es ausgegangen?
     Keine Abstraktion. Wenn du "die Kunden sind unzufrieden" schreibst, hat der Skill versagt. -->

<!-- Beispiel:
Maria K., Operatorin bei Kunde Y, am 14. April 2026: Sie hatte 3 Tage gebraucht,
um den ersten Sprint-Backlog im Tool zu erfassen. Hatte 4-mal beim Support
nachgefragt, weil unklar war, wie Sprint-Capacity zu kalkulieren ist. Hat am
Ende den Sprint mit halber Capacity gestartet, weil ihr die Geduld ausging.
-->

## 2. Baseline (Istzustand)

<!-- Aus Schritt 2: Tabelle mit den Metriken, die heute gemessen werden.
     Mindestens eine Metrik. Wenn keine vorhanden, fuehre Proxy-Metriken ein
     und dokumentiere, wann der erste Wert erhoben wird. -->

| Metrik | Aktueller Wert | Quelle | Erhebungsdatum |
|--------|----------------|--------|----------------|
| <z.B. Time-to-First-Sprint-Setup> | <z.B. 3 Tage> | <z.B. Support-Ticket-Datenbank> | <YYYY-MM-DD> |
| <weitere Metrik> | <Wert> | <Quelle> | <Datum> |

## 3. Intent-Drafts

<!-- Aus Schritt 3: 1-3 Varianten nach Template.
     Quantitaet vor Qualitaet. Pruefung kommt erst in Schritt 4. -->

### Draft A

> [Nutzergruppe] soll [messbares Ergebnis] erreichen,
> ohne [aktuelles Problem/Reibung].
> Erfolg = [konkrete Metrik mit Zielwert].

<!-- Beispiel Draft A:
Neue Operatoren sollen ihren ersten Sprint innerhalb von 4 Stunden vollstaendig
einrichten koennen, ohne den Support kontaktieren zu muessen.
Erfolg = Time-to-First-Sprint-Setup sinkt innerhalb von 2 Monaten von 3 Tagen auf 4 Stunden.
-->

### Draft B

> [Nutzergruppe] soll [messbares Ergebnis] erreichen,
> ohne [aktuelles Problem/Reibung].
> Erfolg = [konkrete Metrik mit Zielwert].

### Draft C (optional)

> [Nutzergruppe] soll [messbares Ergebnis] erreichen,
> ohne [aktuelles Problem/Reibung].
> Erfolg = [konkrete Metrik mit Zielwert].

## 4. Self-Check

<!-- Aus Schritt 4: Verweis auf Validation-Datei plus Status-Zusammenfassung. -->

Vollstaendiger Self-Check: siehe [INTENT-XX.validation.md](INTENT-XX.validation.md).

**Status:** gruen | gelb | rot

**Kurzfassung:** <1-2 Saetze warum dieser Status; bei gelb: welche Warnung wurde bewusst akzeptiert; bei rot: warum.>

## 5. Erfolgsmetrik

<!-- Aus Schritt 5: Eine Zeile, alle Spalten gefuellt. Bei mehreren Metriken: eine pro Zeile. -->

| Metrik | Istwert | Zielwert | Zeitrahmen | Messverfahren |
|--------|---------|----------|------------|---------------|
| <z.B. Time-to-First-Sprint-Setup> | <z.B. 3 Tage> | <z.B. 4 Stunden> | <z.B. innerhalb 2 Monaten nach Launch> | <z.B. automatisch via Onboarding-Telemetrie, gemessen ab "Konto erstellt" bis "erster Sprint mit Stories gestartet"> |

## Intent-Statement (final)

<!-- Der eine Satz, der nach dem Schaerfen uebrig bleibt.
     Wird in /ideation als Pruef-Massstab fuer jede Acceptance Criterion genutzt. -->

> **<Nutzergruppe> sollen <messbares Ergebnis> erreichen, ohne <aktuelles Problem/Reibung>. Erfolg = <konkrete Metrik mit Zielwert und Zeitrahmen>.**

<!-- Beispiel:
**Neue Operatoren sollen ihren ersten Sprint innerhalb von 4 Stunden vollstaendig einrichten koennen, ohne den Support kontaktieren zu muessen. Erfolg = Time-to-First-Sprint-Setup sinkt innerhalb von 2 Monaten von 3 Tagen auf 4 Stunden.**
-->
```
