---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gate-Assertion — Post-Story-Verifikation gegen meta.json

Referenz zu `/sprint-run` Schritt 6 (Ausfuehrung durch `/goal`). Maschinelle Verifikation, dass
`/implement` pro Story alle Pflicht-Gates ausgefuehrt (oder nur legitim uebersprungen) hat — die
Absicherung gegen einen **still** uebersprungenen Lint-/Test-/Security-Check. Seit 2.0.0 (ADR-4)
fuehrt `/goal` diese Assertion vor jedem Story-Merge aus (das Regelwerk selbst ist unveraendert).

## Quelle: meta.json (BOO-36/84)

`/implement` schreibt in Schritt 6f-bis `journal/reports/local/<YYYY-MM-DD_HHMM>_<STORY>/meta.json`.
Relevante Felder:

- `change_type` — Enum aus `CONVENTIONS.md` (`none | api | auth | data | dependency | ci | governance | external-provider | workflow | config | infrastructure | content`, BOO-68); Default wenn das Feld fehlt: `none` (= Code-Gates laufen). Non-Code-Teilmenge: `workflow | config | infrastructure | content`
- `skipped_gates` — Liste uebersprungener Gates (mit Grund)
- `override_audit` — dokumentierte Operator-Overrides (z.B. Coverage < 80 % mit Begruendung).
  **Erweitert durch BOO-176:** deckt auch eine bewusst gesenkte Quality-Schwelle ab — ein Eintrag
  nennt die Gate-Config-Datei, die Schwelle (alt→neu bzw. deaktivierte Regel) und die
  Operator-Begruendung. Dies ist der **einzige** legitime Weg, eine Messlatte abzusenken.
- `iterations` — Iterationen pro Gate

### Story-Diff als Eingabe (BOO-176)

Die beiden BOO-176-Pruefungen unten brauchen den **Story-Diff** — nicht nur `meta.json`. Quelle ist
der Diff des Story-Branch gegen seinen Merge-Base: `git diff <base>..<head>` (bzw.
`git diff <base>..<head> -- <pfad>` fuer eine einzelne Config-Datei). `<base>` = Merge-Base zu
`main`, `<head>` = HEAD des Story-Branch (derselbe Diff, den `/implement` bereits gegen die Gates
fuhrt). Daraus lesen wir (a) **welche** Dateien geaendert wurden und (b) den **alt→neu**-Inhalt der
Gate-Config-Dateien.

## Legitimitaets-Regel

Ein Eintrag in `skipped_gates` ist **legitim** genau dann, wenn:

1. er durch `change_type` gedeckt ist — im Non-Code-Modus (`/implement` Schritt 5.7) sind die
   Code-Gates 6a/6a-bis/6a-tris/6a-quart legitim uebersprungen; **oder**
2. er in `override_audit` mit Begruendung belegt ist (Operator-Override).

Sonst → **unbegruendeter Skip → Story-Fail**.

Zusatz fuer Non-Code-Stories: die in Non-Code **harten** Gates 6c (Architektur-Quick-Check),
6d (Smoke Test), 6e (Security-Findings) muessen Evidenz tragen — fehlt sie → Fail.

Fehlt `meta.json` komplett → Fail (Gate-Lauf nicht nachweisbar, kein „leise gruen").

### Regel AC3a — Gate-Config-Diff (Schwellen-Senkung) (BOO-176)

Die Skip-Pruefung oben sieht nur, **ob** ein Gate lief — nicht, ob jemand die **Messlatte gesenkt**
hat. AC3a schliesst diese Luecke: Wenn der Story-Diff eine **Gate-Config-Datei** anfasst und dabei
eine **Schwelle senkt** oder eine **Regel deaktiviert**, ist das nur mit dokumentiertem
`override_audit`-Eintrag legitim.

Gate-Config-Dateien (stack-uebergreifend):
`eslint.config.*`, `.eslintrc*`, `ruff.toml`, `pyproject.toml`, `.semgrep.yml`, `phpstan.neon*`,
`.coveragerc`, `jest.config.*`, `vitest.config.*`, `sonar-project.properties`.

Als **Senkung / Deaktivierung** zaehlt (alt→neu aus `git diff` der Config-Datei verglichen):

- PHPStan `level:` **kleiner** (z.B. 7→5),
- Coverage-Schwelle **kleiner** — `fail_under` (`.coveragerc`/`pyproject.toml`),
  `coverageThreshold` (`jest.config.*`/`vitest.config.*`), `sonar.coverage`-Mindestwert,
- eine **Regel entfernt / deaktiviert** — aus `rules` (ESLint), `select` (Ruff), Semgrep-Regelmenge,
  oder per breitem `eslint-disable` / `# noqa` (vgl. Bodyguard-Muster, BOO-176 AC2).

Verglichen wird **alt→neu** (`git diff <base>..<head> -- <config-datei>`): nur eine echte
Verschlechterung (Schwelle runter / Regel weg) loest die Regel aus — eine Anhebung oder reine
Umformatierung nicht. Ohne passenden `override_audit`-Eintrag (Config-Datei + Schwelle alt→neu +
Operator-Begruendung) → **Fail**. `override_audit` ist der **einzige** legitime Weg; `change_type`
deckt eine Schwellen-Senkung **nicht** ab.

### Regel AC3b — change_type-Plausibilitaet (BOO-176)

`change_type` setzt der Agent im Spec-Frontmatter selbst (siehe `implement/references/non-code-flow.md`).
Im Non-Code-Modus werden die Code-Gates 6a/6a-bis/6a-tris/6a-quart legitim uebersprungen — ein Agent
koennte also `change_type: config|workflow|…` setzen, um Code-Gates zu umgehen, **obwohl** der Diff
echten Code enthaelt. AC3b prueft die Plausibilitaet:

Wenn `meta.change_type ∈ {workflow, config, infrastructure, content}` (Non-Code) **aber** der
Story-Diff echte **Code-Dateien** enthaelt — Anwendungs-Code wie `*.ts`/`*.tsx`/`*.js`/`*.py`/
`*.php`/`*.go`/`*.rs`/`*.java` unter `src/`, `lib/` o.ae. App-Code, **nicht** reine Config/Doku —
→ **Fail** („`change_type` behauptet Non-Code, Diff enthaelt Code → Code-Gates duerfen nicht
uebersprungen werden"). Einziger legitimer Ausweg: ein expliziter `override_audit`-Eintrag mit
Operator-Begruendung. Gate-Config-Dateien selbst zaehlen hier **nicht** als App-Code (sie sind
Config) — ihre Absenkung faengt bereits AC3a.

## Implementierung (BOO-418)

Das Regelwerk ist als deterministisches Skript implementiert: `gate_assertion.py`
(kanonisch `bootstrap/scripts/`, ausgeliefert nach `.claude/scripts/`, Unit-Tests
`test_gate_assertion.py`). Aufruf durch `/goal` vor jedem Story-Merge:

```bash
python3 .claude/scripts/gate_assertion.py \
  --meta journal/reports/local/<run>/meta.json \
  --base <merge-base> --head <story-head>
```

Exit 0 = PASS, Exit 1 = Story-FAIL. Deterministisch gedeckt: Skip-Legitimitaet,
Non-Code-Hard-Gate-Skips (6c/6d/6e), Gate-Config-Downgrade (AC3a), change_type-
Plausibilitaet (AC3b), fehlende meta.json. **Ehrliche Grenze:** die inhaltliche
Evidenz-Pruefung der Non-Code-Hard-Gates bleibt regelgeleitet, LLM-ausgefuehrt —
meta.json traegt keine Evidenz-Felder.

## Pseudocode (Lesefassung)

```text
meta = read(journal/reports/local/<run>/meta.json)        # fehlt -> FAIL
diff = git_diff(<base>..<head>)                           # Story-Branch gg. Merge-Base (BOO-176)

# --- Skip-Legitimitaet (BOO-165) ---
for g in meta.skipped_gates:
    if g.gate in CODE_GATES and meta.change_type in {workflow,config,infrastructure,content}: ok
    elif g.gate in meta.override_audit: ok
    else: FAIL(story, gate=g)

# --- Non-Code-Evidenz (BOO-165) ---
if meta.change_type in {workflow,config,infrastructure,content}:   # Non-Code (Schritt 5.7)
    for g in [6c, 6d, 6e]:
        if not has_evidence(meta, g): FAIL(story, gate=g)

# --- AC3a: Gate-Config-Diff / Schwellen-Senkung (BOO-176) ---
GATE_CONFIGS = {eslint.config.*, .eslintrc*, ruff.toml, pyproject.toml, .semgrep.yml,
                phpstan.neon*, .coveragerc, jest.config.*, vitest.config.*,
                sonar-project.properties}
for f in changed_files(diff):
    if f matches GATE_CONFIGS:
        old, new = git_show(<base>:f), git_show(<head>:f)   # alt -> neu
        if threshold_lowered(old, new) or rule_disabled(old, new):
            # phpstan level kleiner | fail_under/coverageThreshold kleiner | Regel aus rules/select entfernt
            if not override_audit_covers(meta, f): FAIL(story, gate="gate-config-downgrade", file=f)

# --- AC3b: change_type-Plausibilitaet (BOO-176) ---
if meta.change_type in {workflow,config,infrastructure,content}:
    if has_app_code(diff):    # *.ts/*.tsx/*.js/*.py/*.php/*.go/*.rs/*.java unter src/|lib/, kein reines Config/Doku
        if not override_audit_covers(meta, "change_type"):
            FAIL(story, gate="change_type-implausible")   # Non-Code behauptet, Diff enthaelt Code

PASS   # erst dann Merge (Schritt 4.6)
```

## Bei Fail

- Story zurueck auf `Backlog` (In Progress → Backlog).
- Operator-Notify: Story-ID + welches Gate + Grund.
- Kein Merge. `/goal` setzt die Story-Termination auf „nicht erfuellt"; die uebrigen Stories
  laufen unabhaengig weiter (bzw. `/goal` terminiert, wenn nur diese eine Story offen war).

## Einordnung der drei Ebenen

- **Ebene 1** — `/implement`-Gates (Schritt 6): prompt-getrieben.
- **Ebene 2** — Remote-CI-Gate vor Merge (BOO-148): mechanisch.
- **Die Gate-Assertion ist die maschinelle Bruecke:** `/goal` verifiziert Ebene 1 gegen den
  Maschinen-Output (`meta.json`), **bevor** Ebene 2 merged. Aendert `/implement` nicht — liest nur
  dessen `meta.json`.

Sketch: `docs/sprint-run-flow.png` + `docs/story-breakdown.png` (HANDBUCH Anhang AD).
