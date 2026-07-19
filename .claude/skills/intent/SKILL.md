---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: intent
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Operationalisiert Schraders "Intent before Implementation" (Code Crash Kap. 4) — eine 5-stufige
  Session destilliert das gewuenschte User Outcome zu einem messbaren Intent-Statement, der dann als
  Input fuer /ideation dient. Prueft das Statement zweistufig gegen 8 Anti-Pattern (5 Fehler +
  3 Soulkiller). Verwenden wenn der Operator eine neue Initiative beginnt, "/intent" sagt oder
  eine Idee schaerfen will, bevor /ideation Stories baut. Ausloeser sind Anfragen wie "neue
  Initiative", "Intent fuer X", "wir wollen Y", "/intent".
version: 1.3.0
metadata:
  hermes:
    category: governance
    tags: [intent-definition, perceive, anti-pattern-check]
    requires_toolsets: [terminal, obsidian]
    related_skills: [ideation, backlog]
---

# Intent — vom Problem zum messbaren User Outcome

> "Geschwindigkeit ohne Richtung ist keine Effizienz. Es ist beschleunigtes Scheitern." — Matthias Schrader, *Code Crash* Kap. 4

Der Skill operationalisiert Schraders Prinzip *Intent before Implementation*. Er fuehrt eine konzentrierte 5-Schritte-Session, destilliert ein messbares Intent-Statement aus Nutzerperspektive und prueft es gegen 8 Anti-Pattern (5 haeufige Fehler + 3 Soulkiller). Der finale Intent ist das verbindliche Eingangs-Artefakt fuer `/ideation` — dort wird er zu Stories, deren Acceptance Criteria sich gegen den Intent messen lassen muessen.

Pipeline-Verortung: `/intent` -> `/ideation` -> `/backlog` -> `/implement`.

## Wann nutzen / Wann nicht nutzen

**Nutze `/intent` wenn:**
- Eine neue Initiative oder ein neues Feature startet und das *gewuenschte User Outcome* noch nicht klar ist
- Vor jeder neuen Story-Welle wenn der Operator den eigentlichen *Was*-Frage-Anteil noch nicht durchgedacht hat
- Eine bestehende Idee geschaerft werden soll, bevor `/ideation` daraus Stories baut
- Im Onboarding einer neuen Initiative-Phase
- Rohmaterial vorhanden ist (Transkripte, Notizen, Kundenfeedback, Forschungsauszuege) und ein strukturierter Startpunkt gebraucht wird — dann den **Perceive-Modus** nutzen (Schritt 0.3)

**Nutze `/intent` NICHT wenn:**
- Es um reines Refactoring geht (kein User Outcome aenderbar)
- Bug-Fix oder kleinere Anpassung ohne Outcome-Verschiebung
- Eine bestehende Initiative mit bereits validem Intent fortgefuehrt wird (dann direkt `/ideation`)
- Reine Hygiene-Tasks (Schrader Kap. 4 §SOUL — *Hygiene vs. Differenzierung*)

## Output-Artefakt

Pro Initiative entstehen bis zu drei Dateien im Projekt-Repo:

- `intents/INTENT-DRAFT-XX.md` — Perceive-Output (optional). Arbeitsartefakt aus Schritt 0.3, wird in den Schritten 1–5 zum finalen Intent verfeinert. Kein valider Intent — nur Zwischenstand. Template: [references/intent-draft-template.md](references/intent-draft-template.md).
- `intents/INTENT-XX.md` — das Intent-Statement plus Kontext (Problem-Story, Baseline, Drafts, finale Erfolgsmetrik). XX = laufende Nummer mit fuehrenden Nullen (`INTENT-01`, `INTENT-02`, ...).
- `intents/INTENT-XX.validation.md` — der Self-Check-Report aus Schritt 4 mit Status `gruen | gelb | rot`.

Rohmaterial des Operators liegt in `intents/raw/` (wird nur gelesen, nicht als Skill-Output erzeugt).

`INTENT-XX.md` und `INTENT-XX.validation.md` sind verbindlicher Input fuer `/ideation`. `/ideation` liest sie in Schritt 2 (Kontext laden) und nutzt das Intent-Statement als Pruef-Massstab fuer jede Acceptance Criterion.

## Workflow (5 Schritte aus Schrader §The Intent Session)

### Schritt 0: Environment + Briefing/Kontext laden

Reihenfolge wichtig: ZUERST 0.1 (Environment), dann 0.2 (Briefing/Kontext) — die Pfade aus `paths.*` informieren, wo die References und das `intents/`-Verzeichnis liegen.

#### 0.1 Environment laden

1. Lese `.claude/environment.json` (falls vorhanden — sonst Defaults verwenden + Warnung loggen).
2. Bei Bedarf Pfade extrahieren aus `paths.*` (z.B. `paths.reports_local`, `paths.lessons_l3`, `paths.specs`, `paths.architecture_design`).
3. Bei Tool-Aufruf pruefen: ist Tool in `tools_available.<tool>` aktiv? Bei `false` oder fehlendem Eintrag: Skill ueberspringt den Aufruf und gibt einen Hinweis im Output.
4. Fallback bei fehlender Datei: Standard-Pfade aus dem Schema annehmen (`journal/`, `journal/reports/local/`, `specs/`, `ARCHITECTURE_DESIGN.md`) und im Output vermerken: "Hinweis: `.claude/environment.json` fehlt — Defaults aktiv. Empfehlung: `/bootstrap` re-rennen oder die Datei manuell anlegen."

#### 0.2 Briefing + Kontext laden

Skill liest beim Start:
- [references/intent-anti-patterns.md](references/intent-anti-patterns.md) — Template, 8 Anti-Pattern, Goldstandard-Beispiele
- [references/intent-examples.md](references/intent-examples.md) — Schrader-Beispiele plus Projekt-Kontext-Beispiel

Skill fragt: "Worum geht's? Welche Initiative startet hier?"

Skill prueft ausserdem: Existiert bereits eine Datei `intents/INTENT-DRAFT-XX.md`? Falls ja: laden und Operator informieren —

> Ich habe einen Intent-Draft aus einer frueheren Session gefunden (`INTENT-DRAFT-XX.md`). Moechtest du dort weitermachen oder neu starten?

Wenn Operator weitermachen will → Draft laden, direkt zu Schritt 1 mit Draft als Startpunkt. Wenn neu starten → Draft ignorieren, normaler Flow ab Schritt 1.

Operator-Hinweis (verbatim ausgeben):

> Diese Session braucht 30–60 Minuten Fokus. KI ist hier Sparringspartner, nicht Generator. Du formulierst — ich teste, schiebe zurueck, vergleiche mit dem Goldstandard. Schraders Pointe: Intent ist menschliche Verdichtung, nicht KI-Output.

### Schritt 0.3: Perceive — Rohmaterial verarbeiten (optional)

Skill fragt den Operator:

> Hast du Rohmaterial, das bei der Intent-Formulierung helfen kann? Transkripte, Notizen, Meeting-Mitschriften, Kundenfeedback, Forschungsauszuege? Wenn ja: lege alle lesbaren Textdateien (.md, .txt) in `intents/raw/` ab — ich lese sie und destilliere einen Startpunkt fuer unsere Session.

Wenn der Operator Rohmaterial bereitstellt, fuehrt der Skill den **Perceive-Durchlauf** aus:

1. Alle Dateien in `intents/raw/` lesen
2. Extrahieren und strukturieren:
   - **Problem-Signale** — Was wird als schlecht, kaputt oder fehlend beschrieben?
   - **Nutzergruppen** — Welche Rollen oder Zielgruppen werden erwaehnt?
   - **Metriken-Kandidaten** — Welche Messgroessen oder Erfolgskriterien tauchen auf (explizit oder implizit)?
   - **Constraints** — Welche Randbedingungen oder Nicht-Optionen werden genannt?
3. Erstellt `intents/INTENT-DRAFT-XX.md` mit den extrahierten Elementen und einem vorlaeu figen Intent-Versuch (explizit als Hypothese markiert)
4. Skill zeigt den Draft und fragt:

> Hier ist was ich aus deinem Material herausgelesen habe. Trifft das den Kern? Falls ja, starten wir mit diesem Draft in Schritt 1. Falls du anpassen moechtest, mach das jetzt — dann starten wir in Schritt 1 mit dem korrigierten Draft.

**Wichtige Grenzen des Perceive-Modus:**
- Perceive *destilliert*, formuliert nicht. Das finale Intent-Statement schreibt der Operator in den Schritten 1–5.
- `INTENT-DRAFT-XX.md` ist ein Arbeitsartefakt, kein valider Intent. Erst `INTENT-XX.md` nach Schritt 5 ist valide.
- Wenn kein Rohmaterial vorhanden oder Operator ueberspringt: Skill startet direkt mit Schritt 1.

**Output:** `intents/INTENT-DRAFT-XX.md` (Template: [references/intent-draft-template.md](references/intent-draft-template.md)).

### Schritt 1: Problem verstehen — konkrete Geschichten

Skill bittet um 1–2 konkrete Faelle aus dem Kontext:

> Erzaehl mir den letzten Fall, wo ein Nutzer X erlebt hat. Wer war das (Name, Rolle), wann war's, was ist konkret passiert, wie ist es ausgegangen?

Anti-Pattern in Schritt 1: abstrakte Beschreibungen wie "die Kunden sind unzufrieden" oder "es laeuft schlecht". Skill schiebt zurueck:

> Welcher Kunde, wann, wobei genau? Eine Geschichte mit Namen, Datum und Ausgang — Schrader §The Intent Session §Schritt 1: "Menschen statt Statistiken".

**Output:** Story-Block in `intents/INTENT-XX.md` unter `## 1. Problem-Story`. Mindestens eine konkrete Geschichte. Keine Statistik ohne Person.

### Schritt 2: Istzustand quantifizieren — Baseline

Skill fragt nach harten Zahlen:

> Welche Metriken haben wir heute schon? NPS, CSAT, Konversion, Bounce-Rate, durchschnittliche Time-to-Solution, Eskalations-Rate, Abbruchquote? Was ist der aktuelle Stand?

Wenn der Operator keine Zahl liefert: Skill schlaegt 2–3 sinnvolle Proxy-Metriken vor und fragt, welche der Operator in 1–2 Wochen messen koennte. Ohne Baseline geht's nicht weiter — der spaetere Ziel-Wert braucht einen Bezugspunkt.

**Output:** Tabelle in `intents/INTENT-XX.md` unter `## 2. Baseline (Istzustand)` mit den Spalten `Metrik | Aktueller Wert | Quelle | Erhebungsdatum`.

### Schritt 3: Intent-Brainstorming

Skill praesentiert das Template aus [references/intent-template.md](references/intent-template.md):

```
[Nutzergruppe] soll [messbares Ergebnis] erreichen,
ohne [aktuelles Problem/Reibung].
Erfolg = [konkrete Metrik mit Zielwert].
```

Operator formuliert 1–3 Drafts. Skill darf ergaenzen ("Hast du auch X als alternative Nutzergruppe in Betracht gezogen?"), prueft aber **noch nicht** — Pruefung passiert ausschliesslich in Schritt 4. Hier zaehlt Quantitaet vor Qualitaet (Schrader §Schritt 3: "alle formulieren nach Vorlage, dann clustern").

**Output:** 1–3 Drafts in `intents/INTENT-XX.md` unter `## 3. Intent-Drafts`, durchnummeriert.

### Schritt 4: Intent schaerfen — der zweistufige Self-Check

Skill prueft jeden Draft in zwei Stufen. Beide Stufen produzieren Eintraege im Validation-Report — Stufe 1 deterministisch, Stufe 2 dialogisch.

#### Stufe 1: Linter (deterministisch, regelbasiert)

Skill prueft mechanisch nach den 5 Fehlern aus [references/intent-anti-patterns.md](references/intent-anti-patterns.md) §2.1:

| Fehler | Pruefung | Trigger |
|--------|----------|---------|
| Fehler 1 — Versteckter Feature-Intent | Wortliste-Match auf `Chatbot, App, Bot, Dashboard, API, Tool, KI, AI, Plattform, System, Portal, Widget, Service` | Ein Treffer = harter Hinweis |
| Fehler 2 — Nicht messbarer Intent | `Erfolg = ...`-Block fehlt ODER enthaelt nur qualitative Begriffe (`besser`, `schoener`, `freundlicher`, `modern`, `effizient`, `intuitiv`) ohne Zahl | Treffer = harter Hinweis |
| Fehler 3 — Unternehmens-Intent | Beginnt mit `Wir wollen`, `Unser Ziel ist`, `Die Firma moechte`, `Das Unternehmen`, `Das Team`, `Wir muessen` | Treffer = harter Hinweis |
| Fehler 4 — Mega-Intent | >40 Woerter im Statement ODER mehr als eine primaere Metrik im `Erfolg = ...`-Block | Treffer = harter Hinweis |
| Fehler 5 — Copy-Paste-Intent | Kein projekt-/kontextspezifischer Wortlaut, nur generisches Phrasing (Heuristik: Wortlaut koennte 1:1 in beliebigen anderen Branchen-Kontext eingesetzt werden) | Treffer = weicher Hinweis |

Treffer in Stufe 1 erzeugen einen harten Hinweis im Validation-Report — mit konkretem Umformulierungs-Vorschlag. Operator entscheidet ob er umformuliert oder die Warnung bewusst akzeptiert.

#### Stufe 2: LLM-Stresstest (qualitativ, dialogisch)

Skill stellt drei Soulkiller-Fragen aus [references/intent-anti-patterns.md](references/intent-anti-patterns.md) §2.2:

1. **Tech-Trap** — Wird hier Technologie genutzt, weil sie ein Problem loest, oder weil sie verfuegbar ist? Was am Intent waere anders, wenn die KI/das Tool nicht existieren wuerde?
2. **Process-Trap** — Optimiert dieser Intent einen Prozess (Effizienz) statt echten Nutzen (Bedeutung)? Was ist der konkrete Unterschied zwischen "der Prozess ist schneller" und "der Nutzer hat etwas Wertvolleres erlebt"?
3. **Experience-Trap** — Welches *konkrete* Erlebnis wird verbessert — und fuer wen? Oder ist "Experience" hier Platzhalter ohne Substanz?

Plus: Skill laedt [references/intent-examples.md](references/intent-examples.md) und stellt den Goldstandard-Vergleich:

> Vergleiche jetzt deinen Draft mit dem Londoner-Team-Beispiel (Beschwerde-Management). Verhaelt sich dein Intent eher wie der Goldstandard oder wie eines der Anti-Beispiele? Was sind 3 konkrete Verbesserungen, die ihn naeher an den Goldstandard bringen?

Treffer in Stufe 2 = Rueckfrage an Operator, **kein Block**. Wenn der Operator den Hinweis bewusst verwirft, wird die Begruendung im Validation-Report festgehalten ("warum trotz Warnung").

#### Status-Logik

| Status | Bedeutung | Folge |
|--------|-----------|-------|
| **gruen** | Stufe 1 ohne Treffer und Stufe 2 ohne offene Soulkiller-Fragen | Darf in `/ideation` |
| **gelb** | 1+ Treffer, aber Operator hat begruendet bestaetigt ("warum trotz Warnung" dokumentiert) | Darf in `/ideation` mit dokumentierter Operator-Notiz |
| **rot** | Mehrere unbestaetigte Treffer ODER Soulkiller-Frage offen | Zurueck zum Operator, neu formulieren |

**Output:** Self-Check-Report in `intents/INTENT-XX.validation.md` (Template: [references/intent-validation-template.md](references/intent-validation-template.md)).

### Schritt 5: Erfolgsmetrik festlegen

Operator legt fest:

| Metrik | Istwert | Zielwert | Zeitrahmen | Messverfahren |
|--------|---------|----------|------------|---------------|

Skill schiebt zurueck wenn:
- Zielwert ohne Zeitrahmen ("4,5 Sterne" — bis wann?)
- Messverfahren unklar ("CSAT" — wie genau erhoben? automatisch? manuell? alle Tickets oder Stichprobe?)
- Zielwert nicht plausibel ("von 3,0 auf 5,0 in 4 Wochen" — sportlich, aber begruende es)

**Output:** Tabelle in `intents/INTENT-XX.md` unter `## 5. Erfolgsmetrik`. Plus: das finale Intent-Statement (1 Satz nach Template) als fett hervorgehobener Block am Ende des Dokuments unter `## Intent-Statement (final)`.

## Output-Format `intents/INTENT-XX.md`

Frontmatter:

```yaml
---
id: INTENT-XX
status: draft | active | archived
created: YYYY-MM-DD
linked_initiative: BOO-XX | optional
---
```

Sektionen (in dieser Reihenfolge, alle Pflicht):
1. `## 1. Problem-Story` — Konkrete Geschichte aus Schritt 1
2. `## 2. Baseline (Istzustand)` — Tabelle aus Schritt 2
3. `## 3. Intent-Drafts` — 1–3 Varianten aus Schritt 3
4. `## 4. Self-Check` — Verweis auf `INTENT-XX.validation.md` mit Status-Zusammenfassung
5. `## 5. Erfolgsmetrik` — Tabelle aus Schritt 5
6. `## Intent-Statement (final)` — Der eine Satz, fett, im Template-Format

Vollstaendige Kopiervorlage: [references/intent-template.md](references/intent-template.md).

## Output-Format `intents/INTENT-XX.validation.md`

Frontmatter:

```yaml
---
intent_ref: INTENT-XX
status: gruen | gelb | rot
validated_at: YYYY-MM-DD
---
```

Sektionen:
1. `## Stufe 1 — Linter (deterministisch)` — Tabelle mit allen 5 Fehlern, Spalten `Pattern | Status | Treffer-Zitat | Vorschlag`
2. `## Stufe 2 — LLM-Stresstest (qualitativ)` — Tabelle mit allen 3 Soulkillern, Spalten `Soulkiller | Status | Operator-Begruendung`
3. `## Goldstandard-Vergleich` — 1–3 konkrete Verbesserungsvorschlaege gegenueber dem Londoner-Team-Beispiel
4. `## Empfehlung` — Status (gruen/gelb/rot) mit kurzer Begruendung

Status-Symbole:
- `[OK]` Pass (gruen) — kein Treffer, alles sauber
- `[X]` Fail (rot) — Treffer in Linter
- `[?]` Open (gelb) — Soulkiller-Frage offen oder Operator-Begruendung steht noch aus

Vollstaendige Kopiervorlage: [references/intent-validation-template.md](references/intent-validation-template.md).

## Sparringspartner-Prinzip

Der Skill formuliert NICHT selbst Intents. Er stellt Fragen, prueft, schlaegt Verbesserungen vor — aber das eigentliche Statement schreibt der Operator.

Begruendung (Schrader Kap. 4 §FORMULATING INTENT — THE PRACTICE): Wenn die KI Intents schreibt, laeuft der Operator Gefahr, fremde Annahmen zu uebernehmen ohne sie selbst durchgedacht zu haben. Schraders Pointe: *Intent ist menschliche Verdichtung, nicht KI-Output*. Die Knappheit der Zukunft ist nicht Code — es ist die Faehigkeit, einen klaren Intent aus einer einzigartigen Erkenntnis heraus zu entwickeln. Diese Erkenntnis muss vom Menschen kommen.

Was der Skill darf:
- Fragen stellen
- Anti-Pattern erkennen und benennen
- Goldstandard-Vergleich anbieten
- Umformulierungs-Vorschlaege machen ("statt X koenntest du Y schreiben — pass das aber an deinen Kontext an")

Was der Skill NICHT tut:
- Den Intent fuer den Operator formulieren
- Die finale Entscheidung treffen ("dein Intent ist gruen/rot")
- Annahmen ueber den Nutzungskontext ohne Rueckfrage einbauen

## Pipeline-Verortung

```
/intent  ->  /ideation  ->  /backlog  ->  /implement
   |              |
   |              +-- liest intents/INTENT-XX.md in Schritt 2 (Kontext laden)
   |                   nutzt das Intent-Statement als Massstab fuer jede AC
   |
   +-- erzeugt intents/INTENT-XX.md + INTENT-XX.validation.md
```

`/intent` ist die Quelle. Die nachgelagerte Verbreitung des Intents durch die Pipeline (Stories, ACs, Validation am Sprint-Ende) wird durch die Folge-Story BOO-10 implementiert — `/intent` kuemmert sich nur um die Erzeugung des sauberen Intent-Artefakts.

Wenn `/ideation` startet ohne dass ein Intent-File existiert, sollte es den Operator dezidiert nach BOO-10-Implementation auf `/intent` verweisen.

## Bezug zu Schrader

Der Skill operationalisiert Kapitel 4 von *Code Crash* (Matthias Schrader, 2025) fuenf zu eins:
- §WHAT INTENT MEANS — Definition der drei Elemente: praezise / Ergebnis / Nutzerperspektive
- §INTENT BEFORE IMPLEMENTATION — 15–25 % der Projektzeit in Intent-Klaerung investieren
- §THE MOST COMMON MISTAKES — die 5 Fehler in Stufe 1 des Linters
- §SOUL Markenversprechen — die 3 Soulkiller in Stufe 2 des Stresstests
- §THE INTENT SESSION COMPACT — die 5 Workflow-Schritte
- §FORMULATING INTENT — THE PRACTICE — Template plus Londoner-Team-Goldstandard

Vollstaendige Hintergrund-Erklaerung: siehe README.md.

## Referenzen

- [references/intent-anti-patterns.md](references/intent-anti-patterns.md) — 3 Sektionen: Template, 8 Anti-Pattern (5 Fehler + 3 Soulkiller), Goldstandard-Beispiele
- [references/intent-template.md](references/intent-template.md) — Kopiervorlage fuer `intents/INTENT-XX.md`
- [references/intent-draft-template.md](references/intent-draft-template.md) — Kopiervorlage fuer `intents/INTENT-DRAFT-XX.md` (Perceive-Output)
- [references/intent-examples.md](references/intent-examples.md) — Schrader-Goldstandard-Beispiele plus Projekt-Kontext-Beispiel
- [references/intent-validation-template.md](references/intent-validation-template.md) — Template fuer `intents/INTENT-XX.validation.md`

EN-Spiegel: [SKILL.en.md](SKILL.en.md), [references/intent-anti-patterns.en.md](references/intent-anti-patterns.en.md), [references/intent-template.en.md](references/intent-template.en.md).

ADR-Quellen:
- `[[2026-04-26 Anti-Pattern-Self-Check im Intent-Skill]]`
- `[[2026-04-26 Abgrenzung Intent vs Ideation vs Design Thinking]]`

Projekt-Hub: `[[Bootstrapping Evolution - PMO HUB]]`.
