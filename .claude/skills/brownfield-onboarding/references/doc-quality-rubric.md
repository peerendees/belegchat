---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Doku-Qualitätsrubrik (SSoT) — brownfield-Modul-Dokus

Single Source of Truth für die **inhaltliche Qualität** der Modul-Dokus (`module-<name>.md`, BOO-489 Schritt 5.5) und der Befunde (Schritt 6). Änderungen an den Qualitätsregeln passieren HIER; SKILL.md verweist nur. Die Rubrik gilt **pro Modul-Chunk** — jeder Narrations-Subagent bekommt sie mit; liegt im Few-Shot-Slot [`gold-standard/`](gold-standard/) ein abgenommenes Beispiel, zusätzlich dieses (sonst gilt das Struktur-Template §5).

> **Klartext:** Die Ehrlichkeits-Schicht (Schritte 7–9) sorgt dafür, dass **nichts Falsches** in der Doku steht. Diese Rubrik sorgt dafür, dass das **Wahre auch verständlich** ist — ein belegter Fakt ohne Erklärung ist korrekt und trotzdem nutzlos. Die Rubrik ersetzt die Ehrlichkeits-Schicht nicht, sie verdrahtet sie mit der Narrativ-Qualität.

**Herkunft:** destilliert aus dem Kundenlauf 2026-07-14 (WebConfigCompiler, C/C++), in dem Kunde + Techniker Qwen3- und Opus-Outputs live bewertet haben — Soll-Standard und Anti-Patterns kommen direkt aus dieser Bewertung. Der [`gold-standard/`](gold-standard/)-Slot nimmt künftige abgenommene Beispiele als Few-Shot auf (aktuell leer; §5 ist der verbindliche Ersatz).

## 1. Zielgruppen-Gate (verpflichtend, kein stiller Skip)

**Vor** dem Schreiben der Modul-Dokus fragt der Skill **einmal** und wartet auf Antwort:

> Für wen wird dokumentiert? (a) **Entwickler-Onboarding** — jemand baut auf dem Code auf · (b) **Wissenssicherung** — Bestand festhalten, bevor Wissen verloren geht · (c) **andere** (frei benennen).

Die Antwort steuert Tiefe, Vokabular und Fokus **jeder** Modul-Doku und wird ins Lauf-Manifest `journal/brownfield-onboarding-map.yml` (`target_audience: <wert>`) geschrieben. Sie geht in jedes Subagent-Briefing (BOO-489).

- **Kein stiller Skip.** Wird die Frage nicht beantwortet (Autopilot/Degradations-Pfad), gilt der konservative Default `entwickler-onboarding` **und** ein `audience_gate_ack: <grund>`-Vermerk im Manifest — sichtbar, nicht verschwiegen.
- **Warum der stärkste Hebel:** Im Kundenlauf sprang die Qualität sichtbar, sobald die Zielgruppe vorgegeben war („schreib für einen Fachmann, der ins Projekt onboardet"). Ohne Zielgruppe schreibt das Modell ins Leere.

## 2. Fakt-plus-Bedeutung-Regel (der Kern)

**Jede Fakten-Tabelle und jede Fakten-Liste bekommt eine Klartext-Bedeutungszeile** — was heißt das für den Leser der gewählten Zielgruppe?

- Direkter Konter gegen den größten Kritikpunkt des Kundenlaufs: „das sind Fakten, aber was sagen sie mir?"
- Format: nach der Tabelle/Liste eine kurze Zeile **Bedeutung:** … oder **Kernaussage:** … — ein bis zwei Sätze, kein Absatz.
- Gilt auch für Diagramme (jedes Diagramm trägt eine Kernaussage-Zeile).
- Die Regel gilt pro Fakten-Block, nicht pro Dokument — ein Katalog aus fünf Tabellen braucht fünf Bedeutungszeilen.

## 3. Zeilennummer-Ehrlichkeit (an `grep_back.py` angeschlossen)

Zeilenangaben (`Methode | Rückgabe | Zeile | Beschreibung`) sind wertvoll fürs Onboarding — aber sie **verrotten** nach dem ersten Edit.

- Zeilennummern **nur nach bestandenem Grep-Back** (Schritt 7) in die Doku übernehmen. Was `grep_back.py` nicht bestätigt, wird **weggelassen** statt geraten.
- Jede Doku mit Zeilenangaben trägt oben einen **Freshness-Hinweis**: `Zeilen geprüft gegen <commit/sha> am <datum> — nach Edits neu verifizieren.`
- Nicht verifizierbare Zeile → Methode/Symbol ohne Zeile nennen (der Fakt bleibt, die fragile Zahl fällt weg). Lieber keine Zeile als eine falsche.

## 4. Zahlenwert-Ehrlichkeit (EXTRACTED-Pflicht)

Konstanten, Opcodes, Offsets (`KW_IF 0x38`, `WCT_OP_MUL 0x3B`) sind Fabrikations-Fallen — im Kundenlauf war unklar, ob echt oder erfunden.

- Jeder konkrete Zahlenwert ist entweder **EXTRACTED** mit `datei:zeile`-Beleg (Grep-Back-geprüft) oder er wird **nicht genannt**.
- Reihung/Muster ohne Beleg (z. B. „die Opcodes liegen zusammenhängend") ist **INFERRED** — als Vermutung kennzeichnen, Stützfakten nennen, Falsifikations-Pass (Schritt 9) durchlaufen.
- Kein plausibel klingender Zahlenwert ohne Quelle. Das ist ein Anti-Fabrikations-Verstoß (SKILL §Anti-Fabrikations-Regeln, Regel 1).

## 5. Modul-Struktur-Template

Jede `module-<name>.md` folgt dieser Reihenfolge (weglassbar, wenn ein Abschnitt leer ist — dann als `n/a` mit Begründung, nicht still):

1. **Klartext-Überblick** — „was macht dieses Modul", 2–4 Sätze für die Zielgruppe.
2. **Architektur auf einen Blick** — Rolle im Gesamtsystem, Einordnung; optional ein Diagramm mit Kernaussage-Zeile.
3. **Methoden-/Symbol-Katalog** — Tabelle `Element | Rückgabe/Typ | Zeile | Beschreibung`, gruppiert **nach Rolle** (Entry Points / Preprocessor / Code-Block / …), nicht alphabetisch. Pro Tabelle eine Bedeutungszeile (§2).
4. **Aufrufbeziehungen** — „wer ruft wen" (schafft die mentalen Haken, die der Kunde explizit schätzte). Belegte Kanten aus dem Faktengraphen.
5. **Risiken / technische Schulden** — deskriptiv, mit Beleg; keine Bewertung (die machen `/architecture-review`, `/security-architect`).
6. **Glossar-Begriffe** — modul-spezifische Fachbegriffe in je einem Satz erklärt.

## 6. Anti-Pattern-Liste (mit Negativbeispiel aus dem Lauf)

| Anti-Pattern | Negativbeispiel (Kundenlauf 2026-07-14) | Gegenmittel |
|---|---|---|
| **Fakten ohne Erklärung** | Katalog-Tabellen ohne Bedeutung — „was sagen mir diese Fakten?" | Fakt-plus-Bedeutung-Regel (§2) |
| **Durchschwafeln / verbose** | Opus stellenweise redundant und zu lang | Informationstiefe ohne Wortfülle; Klartext-Zeile statt Absatz |
| **Kaputte Tabelle** | eine Tabelle kam als Roh-Markdown-Text heraus | Tabellen-Syntax prüfen; im Zweifel Liste statt kaputter Tabelle |
| **Stale Zeilennummer** | Zeilen stimmen nach dem ersten Edit nicht mehr | Zeilennummer-Ehrlichkeit (§3) + Freshness-Hinweis |
| **Ungeprüfter Reihenfolge-Fehler** | „LZMA-Kompression kommt NACH der Bytecode-Ausgabe" — sinnfrei, das Resultat ist dann schon geschrieben | Falsifikations-Pass (Schritt 9): Implikation gegen den Graph prüfen |
| **Unbelegter Zahlenwert** | `KW_IF 0x38` — echt oder erfunden? | Zahlenwert-Ehrlichkeit (§4): EXTRACTED oder weglassen |
| **Keine Zielgruppe** | ohne Vorgabe schrieb das Modell ins Leere | Zielgruppen-Gate (§1) |

## 7. Verzahnung mit der Ehrlichkeits-Schicht (nicht doppeln, nicht umgehen)

Die Rubrik **baut nichts neu**, was die Ehrlichkeits-Schicht schon leistet — sie verdrahtet es mit der Erzählung:

| Anti-Pattern | fängt bereits ab | Rubrik ergänzt |
|---|---|---|
| stale Zeilen | `grep_back.py` (Schritt 7) | Freshness-Hinweis + Weglass-Regel |
| Logik-/Reihenfolge-Fehler | Falsifikations-Pass (Schritt 9) | explizit als Anti-Pattern benannt |
| unbelegte Zahlen | EXTRACTED-Pflicht (Schritt 6) | Zahlenwert-Ehrlichkeit-Regel |
| Fakten ohne Erklärung | — (Lücke) | Fakt-plus-Bedeutung-Regel (§2) |
| fehlende Zielgruppe | — (Lücke) | Zielgruppen-Gate (§1) |

Die Rubrik darf die deterministischen Gates (Grep-Back, Coverage, Falsifikation) **nicht umgehen** — sie sitzt obenauf.

## Verweise

- [Gold-Standard Few-Shot-Slot](gold-standard/) (abgenommene Beispiele als Few-Shot; aktuell leer — §5 als Ersatz)
- [Ehrlichkeits-Schicht (SSoT)](honesty-layer.md) · [Faktengraph-Schema (SSoT)](fact-graph-schema.md)
- SKILL.md Schritt 5.5 (Map-Reduce, BOO-489) + Schritt 6 (Befunde) · Spec: `specs/BOO-490.md` (Epic BOO-483)
