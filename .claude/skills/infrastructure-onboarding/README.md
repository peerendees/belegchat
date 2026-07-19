---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# infrastructure-onboarding

> Framework-Bundle-Skill — gefuehrter 13-Layer-Infrastruktur-Abgleich nach dem **propose-and-confirm**-Prinzip. Anlassfall: BOO-223 (2026-06-19), Output von BOO-217.

**Version:** 1.0.0 · **Befehl:** `/infrastructure-onboarding`

> **Claude-Code-Modus:** `/infrastructure-onboarding` schreibt in die §5b-Tabelle des `ARCHITECTURE_DESIGN.md` (und optional Sub-MD-Skelette) → beaufsichtigt **`acceptEdits`** (der Skill bestaetigt jeden Layer-Vorschlag mit dem Operator vor dem Schreiben). Kein unbeaufsichtigter Betrieb. Details: HANDBUCH §6 „Claude-Code-Modus".

## Was der Skill tut

`infrastructure-onboarding` entscheidet die **13 Infrastruktur-Layer** (Frontend, APIs, Database, Caching/CDN, Hosting, Cloud/Compute, CI/CD, Rate Limiting, IAM, Security/RLS, Monitoring, Rollback/Recovery, Audit/SLA) fuer ein konkretes Projekt — gefuehrt, aber ohne 13-Fragen-Grind.

Statt eines leeren Fragebogens **liest der Skill zuerst alles, was das Projekt schon beschreibt** (Intent, `ARCHITECTURE_DESIGN.md` inkl. §5b-Tabelle + §5, `CONVENTIONS.md`, `.claude/environment.json`, `CONTEXT.md` und den stack-neutralen **Katalog** aus BOO-220). Dann macht er **pro Layer einen konkreten Vorschlag** aus der Rolle eines erfahrenen Architekten — Stack-/Intent-aware, gegen die echten Pflichtfragen + Anti-Patterns des Katalogs. Der **Operator bestaetigt oder ueberschreibt**, das Ergebnis landet in der §5b-Tabelle.

**Propose-and-confirm = Modell schlaegt vor (pruefbar), Operator entscheidet, Tabelle protokolliert.**

## Kern-Eigenschaften

- **Lese-Liste vor jedem Vorschlag** (Pflicht) — keine erfundenen Stack-Fakten, fehlende Quellen werden benannt.
- **Konkrete Vorschlaege zur Laufzeit** — Beispiele entstehen aus dem echten Stack und stehen nur in der Projekt-Tabelle, **nie** im Katalog (der bleibt stack-neutral).
- **Idempotenter Re-Run** — Bestehendes (`ok`/`n/a`) wird gespiegelt, nur Deltas werden gefragt.
- **Lazy-Fill** — „spaeter" ist eine gueltige Antwort; `/architecture-review` findet offene Layer wieder.
- **Anti-Fabrikation** — jeder Vorschlag nennt die Katalog-Frage/das Anti-Pattern, gegen das er prueft; Operator bestaetigt immer vor dem Schreiben.

## Drei Momente, drei Werkzeuge

| Moment | Werkzeug |
|---|---|
| Einmaliger / nachgefuehrter Voll-Abgleich der 13 Layer | **dieser Skill** |
| Pro-Feature-Entscheid (Story beruehrt einen Layer), lazy | `/ideation` (`change_type: infrastructure`) |
| Wiederkehrender Drift-Check | `/architecture-review` (§5b) |
| Konkrete VPS-Betriebs-/Haertungs-Pruefung | `/cloud-system-engineer` |

## Workflow (8 Schritte)

1. **Pre-Flight + Lese-Liste laden** — §5b-Tabelle + Katalog vorhanden? Quellen lesen.
2. **Stack-/Intent-Profil bilden** — kompaktes Profil aus environment.json + CONVENTIONS + Intent, Operator bestaetigt.
3. **§5b-Tabelle lesen (Idempotenz-Anker)** — entschiedene Layer spiegeln, offene fuer Vorschlag markieren.
4. **Pro Layer Vorschlag** — Katalog-Frage + Stack-Profil → konkreter Vorschlag + Anti-Pattern-Warnung.
5. **Confirm / Override** — bestaetigen / aendern / n/a (bewusst) / spaeter.
6. **§5b-Tabelle schreiben** — nur bestaetigte Zeilen, §5 unberuehrt.
7. **On-demand Sub-MD-Skelett** — Tiefe nur wo noetig (DB-Schema/IAM/Recovery).
8. **Abschluss + Coverage** — wie viele Layer ok/n/a/offen; Re-Run-Hinweis.

## Dateistruktur

```
infrastructure-onboarding/
├── SKILL.md / SKILL.en.md       ← Skill-Definition (8-Schritte-Workflow, Anti-Fabrikation)
├── README.md / README.en.md     ← diese Datei
├── overview.excalidraw / .png   ← Uebersichts-Sketch (DE)
└── overview.en.excalidraw / .en.png ← Uebersichts-Sketch (EN)
```

## Hintergrund

Der Skill ist die dritte Stufe des Infra-Layer-Blocks: **Katalog** (BOO-220, „was zu fragen ist") → **§5b-Tabelle** (BOO-221, „wo es steht") → **infrastructure-onboarding** (BOO-223, „wie es gefuellt wird"). Geschwister-Skill zu `knowledge-onboarding` (gleiches Muster: lesen → vorschlagen → Operator bestaetigt → Artefakt). Quelle: Klaerungs-Notiz BOO-217 (2026-06-18).
</content>

## Verwandt

- Die Tabelle, die dieser Skill füllt: [architecture-design-template §5b](../bootstrap/references/architecture-design-template.md)
- Der 13-Layer-Katalog dahinter: [infrastructure-dimensions](../cloud-system-engineer/references/infrastructure-dimensions.md)
