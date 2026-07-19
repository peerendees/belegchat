# GOVERNANCE.md — BelegChat

> Projekt-Governance: Regeln, Gates, Verantwortlichkeiten.

---

## Governance-Modus

**Standard** — Security-Gates, CI-Lint/SAST, Sensitive-Paths, Learning-Loop L1.

## Issue-Prefix

`BER-`

## Arbeitsregeln

1. **Spec-Pflicht:** Jede Code-Aenderung braucht ein Spec-File unter `specs/BER-XXX.md`.
2. **Branch-Workflow:** `main` ist geschuetzt — Branch -> PR -> Merge.
3. **Commit-Format:** `BER-[Nr]: [Kurzbeschreibung]`
4. **Code-Sprache:** Englisch. **Doku-Sprache:** Deutsch.
5. **DSGVO:** Keine personenbezogenen Daten in Logs, Commits oder Chat.
6. **Secrets:** Nie committen. Uebersicht in `SICHERHEIT.md`.

## Quality-Gates (4 Layer)

| Layer | Gate | Wann | Was |
|-------|------|------|-----|
| 0 | pre-edit-bodyguard | Vor jedem Edit/Write | Secrets + Unsafe Patterns abfangen |
| 1 | spec-gate | Vor git commit | Spec-File-Pflicht pruefen |
| 2 | pre-commit | git commit | ESLint + Semgrep + Dependency-Check |
| 3 | CI | Push/PR | ESLint-CI + Semgrep-CI + Typecheck |

## Add-ons

### Privacy / DSGVO

- Personenbezogene Daten: Threema-IDs, Mandanten-Zuordnung, Belegdaten
- `PRIVACY.md` definiert Datenkategorien und Schutzmassnahmen
- `personal-data-paths.json` listet betroffene Pfade
- DPO-Skill: ASSESS / REVIEW / AUDIT Modi

### Compliance

- GoBD: Zeitstempel, Hash-Kette, Unveraenderbarkeit (Phase 1 abgeschlossen)
- Revisionssichere Ablage in Supabase Storage + PostgreSQL
- Verfahrensdokumentation: `docs/Verfahrensdokumentation_BelegChat_v1.0.docx`

## Learning-Loop

Level: **L1 (Einfach)** — `journal/learnings.md`, Bullet-Points.
Trigger: `/sprint-review`. Speicherort: `journal/` + Obsidian.

## Audit-Trail

Aktiviert (standard). Evidence unter `journal/reports/`.
