# BER-0: Governance-Bootstrap

> **Pre-Flight:** Lies `CLAUDE.md`, dann `docs/UEBERGABE.md`.

## Kontext

Das Projekt BelegChat hat bisher ohne formale Governance-Struktur gearbeitet. Fuer die naechsten Phasen (Dashboard-Deploy, DATEV-Export, RLS) braucht es ein systematisches Framework mit Quality-Gates, Story-Specs und Architektur-Dokumentation.

## Anforderung

Governance-Framework (intentron) auf dem bestehenden Projekt aufsetzen:
- Standard-Modus mit Privacy/DSGVO + Compliance Add-ons
- 16 Framework-Skills (Standard-Tier)
- Quality-Gates Layer 0-3
- Architektur-Hub mit Referenzen-Landkarte
- Domain-Kontext und Component-Docs

## Akzeptanzkriterien

- [x] CONVENTIONS.md, GOVERNANCE.md, SECURITY.md, PRIVACY.md angelegt
- [x] ARCHITECTURE_DESIGN.md mit vollstaendiger Referenzen-Landkarte
- [x] 16 Skills unter .claude/skills/ installiert
- [x] Hooks (spec-gate, bodyguard, doc-version-sync) registriert
- [x] CI-Workflows (ESLint, Typecheck, Semgrep) angelegt
- [x] Learning-Loop L1 aktiviert
- [x] Bestehende Dateien nicht ueberschrieben (Merge-Modus)

## Technische Notizen

- `next lint` → `eslint .` geaendert (ESLint v9 Flat Config Kompatibilitaet)
- `typecheck` Script ergaenzt (`tsc --noEmit`)
- Git-Hooks via `.githooks/` versioniert (install: `bash scripts/install-hooks.sh`)

## Status

`done`
