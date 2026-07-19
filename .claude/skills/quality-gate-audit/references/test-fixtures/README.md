---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Test-Fixtures — quality-gate-audit (BOO-183)

Mock-Projekt-Setups, gegen die `gate-checks.sh --root <fixture>` deterministisch das erwartete
Wiring-Ergebnis liefert. Jede Fixture ist ein Minimal-`$PROJECT_ROOT` mit genau den Dateien, die
das jeweilige Gate-Ergebnis erzwingen.

| Fixture | Semgrep | Coverage | Slopsquatting | Bodyguard | Exit |
|---------|---------|----------|---------------|-----------|------|
| `project-wired/` | verdrahtet | verdrahtet | verdrahtet | verdrahtet | 0 |
| `project-blind/` | blind | blind | blind | blind | 1 |
| `project-nominell/` | nominell | nominell | nominell | nominell | 0 |

## project-wired/
- `.semgrep/custom-rules.yml` (Canary-Regel `qgaudit-wiring-canary`) + `.semgrep/test-fixtures/wiring-canary.py` (Tripwire) + `.github/workflows/semgrep.yml` **mit** `--config .semgrep/`.
- `.claude/hooks/coverage-check.sh` (kanonische Kopie, Schwellwerte vorhanden) + `.claude/implement-chain.md` (Referenz → registriert).
- `.claude/hooks/slopsquatting/wordlist.txt` (frischer `last_refreshed`-Header) + `.claude/hooks/dependency-check.sh` (referenziert die Wordlist).
- `.claude/hooks/pre-edit-bodyguard.sh` (kanonische Kopie) + `.claude/hooks/bodyguard/patterns/*.yml` + `.claude/settings.json` mit Matcher `Edit|Write|MultiEdit`.

## project-blind/
- `.semgrep/` enthaelt nur `.gitkeep` (keine Regel-Dateien) → blind.
- Kein `coverage-check.sh` → blind.
- Keine Wordlist → blind.
- Kein `pre-edit-bodyguard.sh` → blind.

## project-nominell/
- Semgrep: Canary feuert lokal, aber `.github/workflows/semgrep.yml` **ohne** `--config .semgrep/` → nominell.
- Coverage: Hook + Schwellwerte da, **keine** Referenz → nominell.
- Slopsquatting: Wordlist frisch, aber `dependency-check.sh` referenziert sie **nicht** → nominell.
- Bodyguard: Hook + Pattern-Dateien da, **kein** settings.json-Matcher → nominell.

> Reproduktion + Determinismus-Hinweise: siehe `../test-plan.md`.
