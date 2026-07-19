---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: quality-gate-audit
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Quality-Gate-Audit: prueft, ob die deklarierten Quality Gates eines Projekts tatsaechlich
  VERDRAHTET sind — nicht nur nominell konfiguriert. Vier Gates (Semgrep-Wiring, Coverage,
  Slopsquatting, Layer-0 Bodyguard) werden je gegen Existenz + Registrierung + Signal-Test
  geprueft und als `verdrahtet` / `nominell` / `blind` eingestuft. Schreibt einen Audit-Report
  nach `docs/audits/`. Diagnostiziert, repariert NICHT. Hard-Hook in `/sprint-run` Schritt 1
  (≥1 Gate blind → Sprint-STOPP) und letzter Schritt in `/bootstrap` (Baseline-Report).
  Verwenden wenn der Operator "quality gate audit", "sind die gates verdrahtet", "pruef die
  quality gates", "gate wiring check" oder "/quality-gate-audit" sagt. Auch automatisch via
  Trigger post-install / pre-sprint / post-update.
version: 1.3.0
metadata:
  hermes:
    category: governance
    tags: [quality-gates, wiring-verification, semgrep-canary, slopsquatting, bodyguard, audit-trail]
    requires_toolsets: [terminal, git]
    related_skills: [sprint-run, bootstrap, slopsquatting-deep-refresh, implement]
---

# Quality-Gate-Audit

Prueft, ob die deklarierten Quality Gates eines Projekts **tatsaechlich verdrahtet** sind — also
ob sie im ausfuehrenden Pfad haengen und beim gezielten Trigger feuern — statt nur nominell in
einer Config zu stehen. Der Skill **diagnostiziert**, er **repariert nicht**: er stellt fest, ob
ein Gate `verdrahtet`, `nominell` oder `blind` ist, und schreibt das Ergebnis als Audit-Report.

> **Warum:** Ein Custom-Rule-Verzeichnis, das nie via `--config` an die CLI uebergeben wird, ist
> faktisch blind — die Regeln laufen schlicht nie (ADR „Semgrep Custom-Rule-Wiring", 2026-06-11).
> Genau diese Luecke zwischen *konfiguriert* und *wirksam* schliesst dieser Audit.

> **Abgrenzung zu `/security-architect` und `/implement`:** Die anderen Skills **fuehren** Gates
> aus (Security-Scan, Coverage-Check beim Umsetzen). `/quality-gate-audit` prueft **eine Ebene
> hoeher**: ob die Gates ueberhaupt verdrahtet sind, sodass sie feuern *koennen*. Es ersetzt keinen
> Gate-Lauf — es verifiziert die Verdrahtung.

## CLI-Interface

| Aufruf | Wirkung |
|--------|---------|
| `/quality-gate-audit` | interaktiver Lauf, Default-Trigger `manual`. |
| `--trigger {post-install\|pre-sprint\|post-update\|manual}` | Trigger-Kontext (steuert Frontmatter `triggered_by` + Trigger-Mechanik). |
| `--override-gate <name>[,<name>...] --reason "..."` | ein/mehrere `blind`-Gates transient akzeptieren. `--reason` ist **Pflicht**. |
| `--report-only` | nur den letzten Report ausgeben, **kein** neuer Lauf. |
| `--trigger post-update --force` | manueller Post-Update-Trigger (Fallback, wenn der Versions-Marker nicht greift). |

**Exit-Code:** `0` wenn alle Gates `verdrahtet` **oder** akzeptiert ueberschrieben sind; `1` wenn
≥1 Gate `blind` ist ohne Override. (Die Engine `scripts/gate-checks.sh` implementiert exakt diese
Regel.)

## Gate-Catalog (vier Gates initial)

Geprueft im Ziel-Projekt (`$PROJECT_ROOT` = git root des cwd). Volle Tabelle mit Pfaden, Markern
und nominell-vs-blind-Kriterien: [references/gate-catalog.md](references/gate-catalog.md).

| # | Gate | Check-Pfad (Kern) | Signal-Test |
|---|------|-------------------|-------------|
| 1 | **Semgrep-Wiring** | `.semgrep/`, `.semgrep/test-fixtures/wiring-canary.py`, `.github/workflows/{ci-,}semgrep.yml` | `semgrep --config .semgrep/ …/wiring-canary.py` muss `qgaudit-wiring-canary` melden. |
| 2 | **Coverage** | `.claude/hooks/coverage-check.sh` (+ `COVERAGE_PASS=80`/`COVERAGE_WARN=60`) | Schwellwerte vorhanden **und** Hook registriert (settings.json / pre-commit / implement-Kette). |
| 3 | **Slopsquatting** | `.claude/hooks/slopsquatting/wordlist.txt`, `.claude/hooks/dependency-check.sh` | Wordlist ≤ 90 Tage + von `dependency-check.sh` referenziert + bekannter Eintrag per `grep` erkannt. |
| 4 | **Layer-0 Bodyguard** | `.claude/hooks/pre-edit-bodyguard.sh`, `bodyguard/patterns/*.yml`, `settings.json` (Matcher `Edit\|Write\|MultiEdit`) | synthetischer AWS-Key-Edit → Hook blockt mit Exit 1 + `[BODYGUARD] BLOCKIERT`. |

## Status-Werte

| Status | Bedeutung |
|--------|-----------|
| `verdrahtet` | Datei vorhanden + registriert + Signal-Test triggert. |
| `nominell` | vorhanden, aber Registrierung/Wiring fehlt — konfiguriert, laeuft aber nie. |
| `blind` | behauptet zu pruefen, prueft nichts (Datei fehlt/leer, Schicht haengt nirgends). |

Die Unterscheidung **nominell vs. blind ist Pflicht** — sie ist der Kern des Audits. `nominell`
gibt falsche Sicherheit, `blind` ist offen kaputt; keiner von beiden ist Verdrahtung.

## Output / Report

- **Default-Pfad:** `docs/audits/YYYY-MM-DD-quality-gate-audit.md`, konfigurierbar via
  `.claude/environment.json` Feld `paths.audits`. In Git eingecheckt, **NICHT** unter Drift-Watch.
- **Frontmatter (Pflicht):** `audit_id` (z.B. `2026-06-14-001`), `triggered_by`,
  `framework_version`, `overrides: []`, `summary: {verdrahtet, nominell, blind}`.
- **Body:**
  1. Zusammenfassung — Status-Tabelle pro Gate.
  2. Pro Gate — Check-Pfad, inspizierte Dateien, Signal-Test-Output, Status, Reparatur-Hinweis bei `nominell`/`blind`.
  3. Diff zur letzten Pruefung (ab dem 2. Lauf).
  4. Naechste Schritte.
- **CLI-Output:** Status-Tabelle pro Gate, **gelbe Warnung** bei aktiven Overrides, Pfad zum Report.

Beispiel-Report: [docs/audits/2026-06-14-quality-gate-audit.md](../docs/audits/2026-06-14-quality-gate-audit.md).

## Workflow

### Schritt 0: Environment + Trigger laden
- `.claude/environment.json` lesen: `paths.audits` (Default `docs/audits/`), `tools_available.semgrep`.
- `$PROJECT_ROOT` = `git rev-parse --show-toplevel` (Fallback: cwd).
- Trigger aus `--trigger` (Default `manual`). `--report-only` → direkt Schritt 4 (letzten Report ausgeben).

### Schritt 1: Engine laufen lassen
- `bash <skill-dir>/scripts/gate-checks.sh --gate all --root "$PROJECT_ROOT" --format machine`.
- Pro Gate fallen Zeilen `gate=<name> status=<status> note="..."` an. Overrides via
  `--override-gate <liste>` durchreichen (aus `--override-gate ... --reason` der CLI).
- Die Engine fuehrt die Signal-Tests selbst aus (Semgrep-Scan der Canary, Bodyguard-Canary-Edit
  via `scripts/signal-tests/bodyguard-canary-edit.sh`).

### Schritt 2: Report schreiben
- Frontmatter + Body nach obigem Schema rendern, nach `paths.audits/YYYY-MM-DD-quality-gate-audit.md`.
- `audit_id` = `YYYY-MM-DD-NNN` (laufende Nummer des Tages). `summary` aus den Status-Zaehlern.
- Ab dem 2. Lauf: Diff gegen den letzten Report im selben Verzeichnis (welches Gate hat den Status gewechselt).

### Schritt 3: CLI-Ausgabe
- Status-Tabelle anzeigen. Bei aktiven Overrides eine **gelbe Warnung** ("Gate X blind, akzeptiert: <reason>").
- Pfad zum Report nennen.

### Schritt 4: Eskalation bei `blind`
- ≥1 Gate `blind` ohne Override → Exit 1. Im Report unter „Naechste Schritte" pro blindem Gate der
  konkrete Reparatur-Hinweis (welche Datei fehlt/haengt nicht). **Reparatur selbst macht der Skill
  nicht** — er verweist auf `/bootstrap` (Gate-Scaffold) bzw. die jeweilige Hook-Quelle.

## Trigger-Mechanik

| Trigger | Wer loest aus | Verhalten |
|---------|---------------|-----------|
| `post-install` | letzter Schritt in `/bootstrap` | Baseline-Report. Stellt die Wiring-Wahrheit direkt nach dem Setup fest. |
| `pre-sprint` | **HARD-HOOK** in `/sprint-run` Schritt 1 | alle `verdrahtet` → Sprint startet; ≥1 `blind` → **STOPP**. Override **nur transient** via `--override-gate … --reason` (pro Lauf; unattended gibt der Operator das Flag im Aufruf mit). Daemon (`--auto`) ohne Override → Abbruch. Der persistente Frontmatter-Override `override_blind` ist mit BOO-418 gestrichen (existierte in keinem Schema, wurde nie ausgewertet). |
| `post-update` | Marker `.claude/.last-framework-version` (in `.gitignore`) | Vergleich mit Framework-`version`; Mismatch → Auto-Trigger, danach Marker aktualisieren. `--force` als manueller Fallback. |
| `manual` | Operator (`/quality-gate-audit`) | Default. Interaktiver Lauf. |

> **Sicherheits-Eigenschaft:** Der `pre-sprint`-Hook ist die Bremse, die verhindert, dass ein
> Sprint auf einem Projekt mit blinden Gates losfaehrt. Ein `blind`-Override ist immer
> begruendungspflichtig (`--reason`) und landet im Audit-Trail (Frontmatter `overrides`).

## Native-Feature-Beobachtung — ADR-5 Re-Eval-Trigger (monatlich, BOO-202)

Zusaetzlich zum Wiring-Audit traegt der **monatliche** Lauf (Routine „Hermes-Health" in `docs/runbooks/routinen-vernetzen.md`) eine **Beobachtung** statt eines Gates: Ist Anthropics **Agent Teams** noch *experimentell*? ADR-5 (Vault: *Hermes-Layer vs Agent Teams — Re-Evaluations-Trigger*) haelt Hermes nur so lange fuer differenzierend, wie Agent Teams experimentell sind — **Re-Eval-Trigger 1** ist erfuellt, sobald sie auf [code.claude.com](https://code.claude.com) auf *stable* wechseln.

**Verhalten:**

- Der Lauf **erinnert** an die Pruefung des Agent-Teams-Status (code.claude.com / Release-Notes). Ob die Feststellung manuell (Operator schaut) oder via WebFetch passiert, bleibt leichtgewichtig offen — **nicht hart verdrahtet**.
- **Trigger 1 erfuellt (stable)** → Meldung „ADR-5 Re-Eval-Trigger 1 erfuellt — neue ADR (ADR-6) zwischen Optionen A/B/C entscheiden". Kein Hard-Block.
- **Unveraendert experimentell** → Notiz „Agent Teams unveraendert experimentell, Stand <Datum>" (kein Status erfinden — der Lauf prueft, er behauptet nicht).
- Die zwei weiteren ADR-5-Trigger (Q4 2026 Soft-Deadline · Operator-Bedarf aus Konzern-Pilot) sind kalendarisch/bedarfsgetrieben und brauchen keinen Skill-Check.

**Abgrenzung:** Dies ist ein **Watch**, kein Wiring-Gate — fliesst NICHT in die `verdrahtet`/`nominell`/`blind`-Wertung ein und blockt keinen Sprint. Phase-7-Stories (Hermes, BOO-31/32/33) bleiben „in Vorbereitung", nicht „in Umsetzung".

## Phantom-Gate-Probe (BOO-370)

Ein **Required-Check, der nie postet**, ist ein totes Pflicht-Gate: er blockiert jeden PR, ohne je etwas zu prüfen — und erzieht zum Routine-Override, was die Autor≠Merger-Disziplin aushöhlt. Konkreter Anlass: nach dem Repo-Transfer `vibercoder79` → Org `Vibecoder79` riss die SonarCloud-Projekt-Bindung ab, der Pflicht-Check `SonarCloud Code Analysis` postete nichts mehr, blockierte aber weiter. Das war rein **GitHub-seitig** erkennbar (Branch-Ruleset + Check-Suites/Commit-Status) — **kein Sonar-Zugang nötig**. Genau das automatisiert die Probe.

> **Klartext:** Ein Rauchmelder-Test für Pflicht-Prüfungen. Der Melder hängt an der Decke (Required-Check), aber piept er noch, wenn es brennt? Die Probe drückt den Testknopf: Hat dieser Pflicht-Check auf den letzten Commits überhaupt je ein Signal gegeben? Wenn nie → toter Melder, nur Deko.

**Aufruf:**

```
bash quality-gate-audit/scripts/phantom-gate-probe.sh [--repo owner/repo] [--branch <name>] [--last N] [--format table|machine]
```

- `--repo owner/repo` (Default: Auto-Erkennung aus `git remote`), `--branch` (Default: Default-Branch), `--last N` (Default 20), `--format table|machine`.
- Die Probe liest die Pflicht-Checks aus dem Branch-Ruleset (`required_status_checks`) und die tatsächlich geposteten Signale als **Vereinigung** aus Check-Runs und Commit-Status über die letzten N Commits. Ein Required-Check, der in dieser Vereinigung nie auftaucht → Phantom.

**Status-Vokabular (Mapping auf die Rubrik):**

| Status | Bedeutung | Analog zur Wiring-Rubrik |
|--------|-----------|--------------------------|
| `aktiv` | Required-Check hat im Fenster (letzte N Commits) mindestens einmal gepostet — lebt. | wie `verdrahtet` |
| `nominell` | Required-Check ist im Ruleset geführt, hat aber im Fenster **nie** gepostet → Phantom-Gate/tot. | wie `nominell` (falsche Sicherheit) |
| (keine) | Kein Required-Check im Ruleset → informativer Hinweis, kein Fehler. | — |

**Exit-Code:** `0` wenn alle Required-Checks `aktiv` (oder keine geführt); `1` wenn ≥1 `nominell` (Phantom erkannt); `2` bei Umgebungsproblem (`gh` fehlt/unauth/Repo unbestimmbar).

**`gh`-Vorbedingung + Graceful Degradation:** Einzige Netz-Abhängigkeit ist `gh` (mit dessen eingebautem `--jq`, **kein** system-`jq`). Fehlt `gh` oder ist die Auth ungültig, meldet die Probe das klar und beendet mit Exit 2 (Umgebungsproblem) statt ein Gate-Verdikt zu fälschen.

**Abgrenzung:** Die Probe **meldet, repariert nicht** — die Entscheidung (Bindung reparieren / Check entfernen) bleibt beim Operator (analog `gate-checks.sh`). **Kein Sonar-Zugang** und **kein Sonar-MCP** (separate Story BOO-371) — reine GitHub-seitige Erkennung. Für den Org-Transfer-Fall inkl. Fix siehe HANDBUCH **Anhang AA**.

## Engine + Referenzen

- **Engine:** [scripts/gate-checks.sh](scripts/gate-checks.sh) — deterministische Bash-Engine
  (bash 3.2-kompatibel, dependency-frei, KEIN `jq`/`yq`). Eine Funktion je Gate
  (`check_semgrep`, `check_coverage`, `check_slopsquatting`, `check_bodyguard`).
  CLI: `--gate <name>|all`, `--format {table|machine}`, `--root <pfad>`, `--override-gate <liste>`.
- **Phantom-Gate-Probe:** [scripts/phantom-gate-probe.sh](scripts/phantom-gate-probe.sh) — GitHub-seitige
  Erkennung toter Required-Checks (`gh` als einzige Netz-Abhängigkeit, kein Sonar-Zugang). Siehe Abschnitt
  „Phantom-Gate-Probe (BOO-370)".
- **Signal-Tests:** [scripts/signal-tests/](scripts/signal-tests/) — `bodyguard-canary-edit.sh`
  (synthetischer AWS-Key-Edit gegen den Bodyguard-Hook) und `phantom-required-check.sh` (Offline-Fixture-Test
  der Phantom-Klassifikation: required=`docs-drift`+`SonarCloud Code Analysis`, observed=nur `docs-drift` →
  `nominell`/`aktiv`, Exit 1). Der Semgrep-Canary-Scan laeuft direkt in `gate-checks.sh`.
- **Gate-Catalog:** [references/gate-catalog.md](references/gate-catalog.md) — alle Pfade, Marker, Kriterien.
- **Test-Plan:** [references/test-plan.md](references/test-plan.md) — Positiv-/Negativ-Cases je Gate.
- **Fixtures:** [references/test-fixtures/](references/test-fixtures/) — `project-wired` / `project-blind` / `project-nominell`.

## Trigger-Phrasen

- `/quality-gate-audit`
- "sind die quality gates verdrahtet"
- "pruef die quality gates"
- "gate wiring check"
- "quality gate audit"

## Konfiguration

| Feld | Bedeutung | Default |
|------|-----------|---------|
| `paths.audits` (in `.claude/environment.json`) | Report-Verzeichnis | `docs/audits/` |
| `tools_available.semgrep` | semgrep-CLI vorhanden? Fehlt sie, faellt das Semgrep-Gate auf `nominell` (kein Hard-Fail). | autodetektiert |
| `.claude/.last-framework-version` | Versions-Marker fuer `post-update`-Trigger (in `.gitignore`). | — |

## Dateistruktur

```
quality-gate-audit/
├── SKILL.md                              ← Skill-Definition (1.2.0, DE)
├── scripts/
│   ├── gate-checks.sh                    ← deterministische Audit-Engine (4 Gates)
│   ├── phantom-gate-probe.sh             ← Phantom-Gate-Erkennung (Required-Check postet wirklich?)
│   └── signal-tests/
│       ├── bodyguard-canary-edit.sh      ← AWS-Key-Edit gegen den Bodyguard-Hook
│       └── phantom-required-check.sh     ← Offline-Fixture-Test der Phantom-Klassifikation
└── references/
    ├── gate-catalog.md                   ← Gate-Tabelle (Pfade, Marker, Kriterien)
    ├── test-plan.md                      ← Positiv-/Negativ-Cases je Gate
    └── test-fixtures/                    ← project-wired / project-blind / project-nominell
```

> **EN-Mirror + READMEs:** Folge-Story (SKILL.en.md, README.md/.en.md, Overview-Sketch).
