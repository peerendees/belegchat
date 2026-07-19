---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Test-Plan — quality-gate-audit (BOO-183)

Pro Gate ein deterministischer **Positiv-Case** (verdrahtet) und ein **Negativ-Case**
(nominell/blind). Alle Cases laufen gegen die Mock-Projekt-Fixtures unter
`references/test-fixtures/` — `gate-checks.sh --root <fixture>` liefert deterministisch das
erwartete Ergebnis (gleicher Input → gleiches Ergebnis, kein Netz-Roundtrip noetig ausser dem
lokalen semgrep-Scan der Canary-Datei).

## Fixtures

| Fixture | Zweck |
|---------|-------|
| `project-wired/` | alle vier Gates **verdrahtet** (Exit 0) |
| `project-blind/` | alle vier Gates **blind** (Exit 1) |
| `project-nominell/` | alle vier Gates **nominell** (Exit 0) |

## Cases

### Semgrep-Wiring

| Case | Fixture | Erwartung |
|------|---------|-----------|
| Positiv (verdrahtet) | `project-wired` | `.semgrep/custom-rules.yml` + Canary-Fixture + CI-Workflow mit `--config .semgrep/` → Canary feuert, CI verdrahtet → `verdrahtet`. |
| Negativ (nominell) | `project-nominell` | Canary feuert lokal, aber CI-Workflow ohne `--config .semgrep/` → `nominell`. |
| Negativ (blind) | `project-blind` | `.semgrep/` enthaelt nur `.gitkeep`, keine Regel-Dateien → `blind`. |

### Coverage

| Case | Fixture | Erwartung |
|------|---------|-----------|
| Positiv (verdrahtet) | `project-wired` | Hook + Schwellwerte + Referenz in `.claude/implement-chain.md` → `verdrahtet`. |
| Negativ (nominell) | `project-nominell` | Hook + Schwellwerte da, aber keine Referenz → `nominell`. |
| Negativ (blind) | `project-blind` | Hook `coverage-check.sh` fehlt → `blind` (Existenz-Negativ-Case). |

### Slopsquatting

| Case | Fixture | Erwartung |
|------|---------|-----------|
| Positiv (verdrahtet) | `project-wired` | frische Wordlist (`last_refreshed: 2026-06-14`) + `dependency-check.sh` referenziert sie + Smoke-Test feuert → `verdrahtet`. |
| Negativ (nominell) | `project-nominell` | Wordlist frisch, aber `dependency-check.sh` referenziert sie nicht → `nominell`. |
| Negativ (blind) | `project-blind` | Wordlist fehlt → `blind`. (Alternativer blind-Pfad: Wordlist > 90 Tage alt.) |

### Layer-0 Bodyguard

| Case | Fixture | Erwartung |
|------|---------|-----------|
| Positiv (verdrahtet) | `project-wired` | Hook + Pattern-Dateien + `settings.json`-Matcher `Edit\|Write\|MultiEdit` → Signal-Test blockt AWS-Key-Edit (Exit 1) → `verdrahtet`. |
| Negativ (nominell) | `project-nominell` | Hook + Pattern-Dateien da, aber kein settings.json-Matcher → Hook feuert nie → `nominell`. |
| Negativ (blind) | `project-blind` | Hook `pre-edit-bodyguard.sh` fehlt → `blind` (Existenz-Negativ-Case). |

## Reproduktion

```bash
# alle Gates, alle Fixtures (maschinenlesbar)
bash scripts/gate-checks.sh --gate all --root references/test-fixtures/project-wired    --format machine   # alle verdrahtet, exit 0
bash scripts/gate-checks.sh --gate all --root references/test-fixtures/project-blind    --format machine   # alle blind,      exit 1
bash scripts/gate-checks.sh --gate all --root references/test-fixtures/project-nominell --format machine   # alle nominell,   exit 0

# Override: blind-Gate als akzeptiert markieren -> exit 0
bash scripts/gate-checks.sh --gate all --root references/test-fixtures/project-blind \
     --override-gate semgrep,coverage,slopsquatting,bodyguard --format machine

# Bodyguard-Signal-Test isoliert
bash scripts/signal-tests/bodyguard-canary-edit.sh \
     references/test-fixtures/project-wired/.claude/hooks/pre-edit-bodyguard.sh   # exit 1, [BODYGUARD] BLOCKIERT
```

## Determinismus-Hinweise

- Der Semgrep-Signal-Test ruft die lokale `semgrep`-CLI gegen genau eine Fixture-Datei — kein
  Netz, kein Registry-Roundtrip. Fehlt die CLT, faellt der Status auf `nominell` (kein Hard-Fail),
  damit der Test auch ohne semgrep-Installation deterministisch durchlaeuft.
- Die Slopsquatting-Frische nutzt den `last_refreshed`-Header (festes Datum in der Fixture), nicht
  die Datei-Mtime — so bleibt der Positiv-Case unabhaengig vom Checkout-Zeitpunkt reproduzierbar.
  **Hinweis:** der `2026-06-14`-Header altert; ab ~September 2026 kippt der Positiv-Case auf `blind`
  (> 90 Tage). Beim Wartungs-Pass den Header in `project-wired`/`project-nominell` nachziehen.
