---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Story-Template: Feature / Agent

Jede Feature-Story MUSS folgende Struktur haben.

## Pflicht-Sektionen

### 1. Verfuegbare APIs & Datenquellen
- API-Endpunkte mit URL, Auth, Rate Limits, Kosten
- Response-Format (relevante Felder)
- Free Tier vs. Paid — was brauchen wir?

### 2. Code-Beispiele (Projekt-Pattern)
- Konkrete Abruf-Funktionen im Projekt-Stil
- Error Handling, Timeout, Fallback
- Kein npm wenn stdlib reicht

### 3. Signal-Format & Config-Integration
- Signal-Output JSON (`signals/xyz.json`) im Standard-Format:
  `{ timestamp, agent, score, signal, components, flags }`
- Config-Eintraege: AGENT_WEIGHTS, SIGNAL_FILES
- Tier-Zuordnung (fast/medium/slow)
- Scoring-Logik erklaert

### 4. Architektur-Integration
- ASCII-Diagramm: Datenquellen → Agent → Signal → Supervisor
- Weight im Supervisor, Protected-Agents ja/nein

### 5. Phasen-Plan
- Phase 1 (kostenlos) → Phase 2 (Free APIs) → Phase 3 (Paid optional)
- **`/ultraplan`-Output (BOO-207):** Wird bei einem Ultraplan-Lauf (Story `>5 SP` oder Architektur-Bruch,
  `prefer_ultraplan`) der **Code-Level-Plan** erzeugt, landet er als eigene `## Plan`-Sektion in
  `specs/<story>.md` — er ergaenzt den Phasen-Plan (gröbere Ebene), ersetzt ihn nicht.

### 6. Abhaengigkeiten (PFLICHT)
```markdown
## Abhaengigkeiten
- Benoetigt: [STORY-XX] (muessen vorher fertig sein)
- Beeinflusst: [STORY-YY] (werden durch diese Story veraendert)

## Position im Gesamtplan
- Reihenfolge: #X/Y | Phase: [Phase-Name]
- Vorgaenger: STORY-XX
- Nachfolger: STORY-ZZ
```

### 7. Acceptance Criteria
- Checkboxen, testbar, konkret

### 7a. Test-Block / Unit-Tests (PFLICHT)
Hier werden beim Story-Schreiben die konkreten Unit-Testfaelle definiert, mit denen die
Implementation abschliesst. (Eigene Sektion `7a`, damit die Nummerierung 8–10 + Verweise stabil bleibt.)

- **Testfaelle** (mind. 1 Happy-Path + mind. 1 Fehlerfall/Edge-Case), je mit erwartetem Verhalten:
  - `[Happy-Path]` — Eingabe → erwartetes Ergebnis
  - `[Fehlerfall/Edge-Case]` — Eingabe → erwartetes Verhalten (Exception, Fallback, Grenzwert)
- **AC-Bezug** — welcher Test deckt welches Acceptance Criterion ab (z.B. `Test 1 → AC 7.1`).
- **Keine Platzhalter-Tests:** `assert true`, `expect(true).toBe(true)`, leere Testkoerper oder
  unbegruendetes `skip`/`xit`/`@pytest.mark.skip` sind verboten — der Anti-Platzhalter-Check (BOO-177)
  im implement-Test-Gate (`/implement` Schritt 6a-quart) flaggt sie.
- **Abgrenzung:** Nur Unit-Tests — NICHT Integration-/E2E-Tests (eigenes kuenftiges Thema).

### 8. Security Impact (PFLICHT)
- Change-Type: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`
- Neue oder veraenderte Angriffsoberflaeche?
- Werden personenbezogene Daten, Secrets, Tokens, Cookies oder externe Provider beruehrt?
- Welche Sektionen aus `SECURITY.md` und welche Security-Referenzen muessen in `/implement` gelesen werden?
- Falls kein Security-Impact: explizit begruenden, nicht nur leer lassen.

> **Non-Code Change-Types** (`workflow | config | infrastructure | content`):
> Bei diesen Typen produziert die Story keinen klassischen Code-Diff (n8n/Make/Zapier-Workflow,
> Terraform/Pulumi/CloudFormation, reine Configs/IAM/DNS/CORS, CMS-Content). `/implement` skippt
> die Code-Gates (6a/6a-bis/6a-tris/6a-quart) explizit und hebt 6c/6d/6e auf **Hard Gate** —
> kein PASS ohne dokumentierte Architektur-, Smoke-Test- und Security-Evidenz. Sensitive-Paths
> in `.claude/sensitive-paths.json` (z.B. `n8n/**`, `infra/**`, `**/*.tf`) loesen weiterhin den
> Mandatory Human Review aus. Details: `implement/references/non-code-flow.md`.

### 9. Security Validation (PFLICHT bei Code-, Security-, Tooling-, Dependency-, CI- oder Governance-Aenderungen)
- Welche lokalen Checks muessen laufen? (z.B. Semgrep, dependency-check, tests, manuelle Review)
- Welche sensiblen Pfade koennen betroffen sein?
- Welche Evidenz muss vor `Done` dokumentiert werden?
- Welche Risiken bleiben bewusst akzeptiert?

### 10. Dependencies
- Nur wenn stdlib nicht reicht
- Begruendung warum
