---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Story-Template: Fix / Refactoring

Fuer Bug-Fixes, Refactorings und kleine Aenderungen. Weniger Overhead als Feature-Template.

## Pflicht-Sektionen

### 1. Problem-Beschreibung
- Was ist kaputt / suboptimal?
- Wie aeussert sich das? (Fehlermeldung, Verhalten, Log-Eintrag)
- Seit wann? (Version, Commit wenn bekannt)

### 2. Betroffene Dateien
- Welche Dateien muessen geaendert werden?
- Welche Komponenten sind betroffen?

### 3. Loesung
- Konkreter Fix-Ansatz
- Code-Beispiel wenn hilfreich

### 4. Abhaengigkeiten (PFLICHT)
```markdown
## Abhaengigkeiten
- Benoetigt: [STORY-XX] oder keine
- Beeinflusst: [STORY-YY] oder keine

## Position im Gesamtplan
- Unabhaengig / oder Reihenfolge angeben
```

### 5. Acceptance Criteria
- Checkboxen, testbar

### 5a. Test-Block / Unit-Tests (PFLICHT)
Konkrete Unit-Testfaelle, mit denen der Fix abschliesst. (Sektion `5a`, damit 6–7 + Verweise stabil bleiben.)

- **Testfaelle** (mind. Regressions-/Happy-Path + 1 Fehlerfall/Edge-Case), je mit erwartetem Verhalten.
- **AC-Bezug** — welcher Test deckt welches Acceptance Criterion ab.
- **Keine Platzhalter-Tests:** `assert true`, `expect(true).toBe(true)`, leere Testkoerper oder
  unbegruendetes `skip`/`xit`/`@pytest.mark.skip` — der Anti-Platzhalter-Check (BOO-177) im
  implement-Test-Gate (`/implement` Schritt 6a-quart) flaggt sie.
- **Abgrenzung:** Nur Unit-Tests — NICHT Integration/E2E.

### 6. Security Impact (PFLICHT)
- Change-Type: `none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`
- Beruehrt der Fix sensible Pfade, externe Inputs, Secrets, Auth, Datenhaltung oder CI/Governance?
- Welche Sektionen aus `SECURITY.md` muessen in `/implement` gelesen werden?
- Falls kein Security-Impact: kurz begruenden.

> **Non-Code Fixes** (`workflow | config | infrastructure | content`): Bei reinen n8n-/IaC-/Config-/Content-Fixes
> skippt `/implement` die Code-Gates und macht 6c/6d/6e zur Pflicht. Details: `implement/references/non-code-flow.md`.

### 7. Security Validation (PFLICHT bei Code-, Security-, Tooling-, Dependency-, CI- oder Governance-Aenderungen)
- Welche Checks muessen vor `Done` laufen?
- Welche Evidenz gehoert in den Abschlusskommentar?
- Welche Restrisiken bleiben bewusst akzeptiert?
