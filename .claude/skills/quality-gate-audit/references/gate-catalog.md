---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gate-Catalog — quality-gate-audit (BOO-183)

Nachschlagbare Referenz der vier initial geprueften Quality Gates. Jedes Gate wird im
Ziel-Projekt (`$PROJECT_ROOT` = git root des cwd) gegen drei Stufen geprueft: **Existenz** der
Datei(en), **Registrierung/Wiring** (haengt das Gate ueberhaupt im ausfuehrenden Pfad?) und ein
**Signal-Test** (feuert das Gate, wenn man es absichtlich triggert?).

## Status-Werte

| Status | Bedeutung |
|--------|-----------|
| `verdrahtet` | Datei vorhanden **+** registriert **+** Signal-Test triggert. |
| `nominell` | vorhanden, aber Registrierung/Wiring fehlt — das Gate ist konfiguriert, laeuft aber nie. |
| `blind` | behauptet zu pruefen, prueft nichts (Datei fehlt/leer, Schicht haengt nirgends). |

> Die Unterscheidung **nominell vs. blind** ist Pflicht. Sie ist der ganze Punkt des Audits:
> Ein nominell konfiguriertes Gate gibt falsche Sicherheit, ein blindes Gate ist offen sichtbar
> kaputt. Beide sind keine Verdrahtung.

## Gate-Tabelle

### 1. Semgrep-Wiring

| Aspekt | Detail |
|--------|--------|
| Check-Pfade | `.github/workflows/ci-semgrep.yml` **oder** `.github/workflows/semgrep.yml`, `.semgrep/`, `.semgrep.yml`, `.semgrep/test-fixtures/wiring-canary.py` |
| Marker | `# QGAUDIT-CANARY-DO-NOT-REMOVE` (Header), `QGAUDIT-CANARY-TRIPWIRE` (Tripwire-Literal), Custom-Rule `qgaudit-wiring-canary` |
| Signal-Test | `semgrep --config .semgrep/ .semgrep/test-fixtures/wiring-canary.py` muss die Regel `qgaudit-wiring-canary` melden. |
| verdrahtet | Canary feuert **und** ein CI-Workflow uebergibt `--config .semgrep/`. |
| nominell | Canary feuert lokal, aber kein CI-Workflow uebergibt `--config .semgrep/` (Custom-Rules laufen in CI nie). **Oder** semgrep-CLI fehlt → Wiring nicht verifizierbar (kein Hard-Fail, Hinweis im Report). |
| blind | `.semgrep/` leer/fehlt, **oder** Canary-Fixture/Tripwire fehlt, **oder** der Scan meldet die Regel nicht. |

Quelle: `bootstrap/references/file-templates.md` §`.semgrep/custom-rules.yml (BOO-185)` und §`.semgrep/test-fixtures/wiring-canary.py (BOO-185)`.

### 2. Coverage

| Aspekt | Detail |
|--------|--------|
| Check-Pfade | `.claude/hooks/coverage-check.sh` |
| Registrierung | Aufruf in `settings.json` / `.git/hooks/pre-commit` / `.husky/pre-commit` **oder** Implement-Kette (Referenz unter `.claude/`, nicht die Hook-Datei selbst). |
| Schwellwerte | `COVERAGE_PASS=80`, `COVERAGE_WARN=60` (im Skript vorhanden). |
| Signal-Test | indirekt: Schwellwerte vorhanden **und** Hook referenziert (ein voller Test-Lauf sprengt das Audit-Budget — daher Wiring-Beleg statt Live-Coverage). |
| verdrahtet | Script + Schwellwerte vorhanden + referenziert. |
| nominell | Script da, aber nicht referenziert **oder** Schwellwerte fehlen. |
| blind | Script fehlt. |

Quelle: `bootstrap/references/hooks/coverage-check.sh` (kanonisch) und §`hooks/coverage-check.sh (BOO-15)`.

### 3. Slopsquatting

| Aspekt | Detail |
|--------|--------|
| Check-Pfade | `.claude/hooks/slopsquatting/wordlist.txt`, `.claude/hooks/dependency-check.sh` |
| Frische | Wordlist nicht leer **und** Alter ≤ 90 Tage (via `# last_refreshed: YYYY-MM-DD`-Header, sonst Datei-Mtime). |
| Registrierung | `dependency-check.sh` referenziert `slopsquatting/wordlist.txt`. |
| Signal-Test | Smoke-Test: ein bekannter Eintrag (`<ecosystem>:<name>`) wird per `grep` erkannt (gleiche Match-Logik wie `check_wordlist` im Hook). |
| verdrahtet | Wordlist frisch + referenziert + Smoke-Test feuert. |
| nominell | Wordlist da, aber `dependency-check.sh` referenziert sie nicht **oder** kein pruefbarer Eintrag. |
| blind | Wordlist leer/fehlt **oder** > 90 Tage alt. |

Quelle: `bootstrap/references/file-templates.md` §`.claude/hooks/slopsquatting/wordlist.txt (BOO-197)` (Zeile mit dem 90-Tage-Anker fuer BOO-183) und §`hooks/dependency-check.sh (BOO-12, BOO-197)`.

### 4. Layer-0 Bodyguard

| Aspekt | Detail |
|--------|--------|
| Check-Pfade | `.claude/hooks/pre-edit-bodyguard.sh`, `.claude/hooks/bodyguard/patterns/*.yml`, `.claude/bodyguard.local.yml`, `settings.json` (Matcher) |
| Matcher | `Edit\|Write\|MultiEdit` mit Aufruf von `pre-edit-bodyguard.sh` in `settings.json`/`settings.local.json`. |
| Signal-Test | synthetischer Edit mit AWS-Key-Pattern (`AKIA…`) muss vom Hook mit Exit 1 + `[BODYGUARD] BLOCKIERT` geblockt werden (`scripts/signal-tests/bodyguard-canary-edit.sh`). Der AWS-Key ist ein `action: block`-Muster → greift unabhaengig von `BODYGUARD_STRICT`. |
| verdrahtet | Hook + Pattern-Dateien + Matcher vorhanden, Signal-Test blockt. |
| nominell | Hook da, aber Matcher fehlt in `settings.json` (Hook feuert nie) **oder** Signal-Test blockt nicht. |
| blind | Pattern-Dateien leer **oder** Hook fehlt. |

Quelle: `bootstrap/references/file-templates.md` §`hooks/pre-edit-bodyguard.sh (BOO-86)` und `bootstrap/references/hooks-setup.md` (settings.json-Registrierung).

## Engine

Alle vier Gates implementiert die deterministische Bash-Engine `scripts/gate-checks.sh`
(eine Funktion je Gate: `check_semgrep`, `check_coverage`, `check_slopsquatting`,
`check_bodyguard`). Sie ist dependency-frei (bash 3.2-kompatibel, `grep`/`sed`/`awk`/`find`/`date`,
KEIN `jq`/`yq`) und defensiv: fehlende Tools/Dateien fuehren nie zu einem Crash, sondern zu einem
Status mit Begruendung.
