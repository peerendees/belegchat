---
provenance:
  origin: ai-claude
  classification: internal
  status: reviewed
---

# Allowlist — mechanically auto-resolvable conflict classes

> 🇬🇧 **English** (this file) · 🇩🇪 [Deutsch](allowlist.md)

SSoT for [`../SKILL.en.md`](../SKILL.en.md) step 2. **Only** the classes listed here may be resolved automatically. Everything else is a content conflict and goes to the human with a recommendation (step 3). The list is deliberately conservative: when in doubt, a hunk counts as a content conflict.

## Base rule

A class is mechanical only if the correct resolution follows **unambiguously from the structure** — not from a content preference. Auto-resolution almost always means **union** (keep both sides, sort in correctly), never **choice** (discard one side).

## Classes

### K1 — Two-sided append lines in ordered lists

Both branches append one line each to the same ordered list/table.

- **Trigger:** conflict hunk where `ours` and `theirs` each contain one new line at the same anchor, the rest of the context identical.
- **Resolution:** keep both lines, sort them by the list's order (alphabetical / chronological / numeric, as the list dictates).
- **Examples:** `docs/releases/README.md` wave list, HANDBUCH appendix table, `docs/INDEX.md` tables, changelog entries.

### K2 — Wave-index head

Two branches add different wave letters to the wave index.

- **Trigger:** conflict in the wave-index head (`docs/releases/README.md` / `_index.md`), both sides add a wave line.
- **Resolution:** keep both wave lines (union), preserve letter order. **Collision check:** if both sides assign the *same* letter, this is **not** K2 → content conflict (the operator must rename, ADR cross-session-drift).

### K3 — Version bump

Both sides raise the same version number (SKILL.md `version:`, README `**Version:**`, `package.json`).

- **Trigger:** conflict only in a SemVer line.
- **Resolution:** the **higher** version wins. If equal but with different meaning → content conflict.

### K4 — DE/EN parity files

The structurally identical conflict appears in a `.md` and its `.en.md`.

- **Trigger:** the same hunk type in the DE and EN twin.
- **Resolution:** apply the same structural resolution (K1–K3) to both language files — preserve parity so `docs_drift_check.py` stays green.

### K5 — Pure formatting

Whitespace, line endings (CRLF/LF), order of stable, independent blocks.

- **Trigger:** diff content identical except for formatting.
- **Resolution:** enforce the repo's formatting (`.editorconfig`, linter).

## What does NOT belong on the allowlist

- Competing changes to the **same** logic/prose line (not just an append).
- Deleted-vs-modified file/line.
- Anything where the correct side is a **content decision**.
- A duplicate wave letter (see K2) — stays deliberately a content conflict.

## Log

Every auto-resolution is logged: `K<n> | <file> | <short rationale>`. The log is part of the skill output and, under `governance_mode=heavy`, of the audit trail.
