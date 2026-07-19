---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# dpo — Data Protection Officer (Privacy by Design)

**Version:** 1.3.0 · **Command:** `/dpo`

Brings **Privacy by Design** into the development process with Claude Code — from data collection through deletion. The skill asks the right review questions at the right points (legal basis, purpose limitation, deletion concept, data subject rights), so that operators don't need to be GDPR experts. Covers **GDPR (EU)**, **BDSG (DE)** and **nDSG (CH)**. The operator decides — the skill does not invent legal advice.

> **Claude Code mode:** `/dpo` is read-only (ASSESS/REVIEW conversational, AUDIT deterministic) → **`plan`** (plan mode); the AUDIT runner runs unattended with **`dontAsk`** when triggered by `/sprint-review`. Details: HANDBUCH §6 "Claude Code mode".

## Installation

```bash
# Copy from the GitHub repo into the global skill pool
cp -r ~/Documents/GitHub/claudecodeskills/dpo ~/.claude/skills/dpo
```

Within the INTENTRON framework, `dpo` is additionally installed as a bundle skill during `/bootstrap` (Privacy add-on).

## Usage

```text
/dpo                  → Mode is selected automatically based on phase
/dpo audit            → Compliance audit against the control catalogs
```

It is also called automatically by other skills: `/ideation` (ASSESS), `/implement` (REVIEW), `/sprint-review` (AUDIT).

## Feature Scope

### 3 Modes

| Mode | When | What |
|-------|------|-----|
| **ASSESS** | Ideation/planning, new features | Data flow analysis, legal basis (Art. 6), DPIA threshold check |
| **REVIEW** | Code/feature change involving data processing | Privacy check in the code (PII, consent, pseudonymization) |
| **AUDIT** | On demand, before releases, periodically | Work through the control catalog → reproducible report |

### Deterministic Control Catalog (since v1.2.0, BOO-87)

The AUDIT mode works through **versioned YAML control catalogs** instead of free text:

- **Catalogs** `controls/gdpr.yml` (GDPR) + `controls/ndsg.yml` (Swiss nDSG — CH differentiator). Each control with `id/titel/evidenz/check_typ/check_arg/mapsTo/quelle`.
- **Runner** `scripts/dpo-audit.py` (python3 stdlib, **no database**) produces a reproducible report pair `dpo/reports/<date>_audit.md` + `.json`.
- **Honest determinism:** mechanical checks (file present? secret in code? TLS off?) → **PASS/GAP**; judgment checks (purpose limitation, proportionality) → **REVIEW-NEEDED** (human confirms). Since BOO-427 additionally: `grep-review` (PII heuristic, e.g. email columns in migrations → REVIEW-NEEDED as a hint) and `conditional-file` (PII paths declared without the privacy add-on → GAP); Art. 25/35 GDPR and Art. 7 nDSG controls in the catalog.
- **Opt-in gate for heavy (BOO-427):** `--gap-exit` / `DPO_GAP_EXIT=1` turns ≥1 GAP into exit 1 (usable as a required status check); the default remains a report (exit 0).
- **Project overlay** `.claude/dpo/controls/` (BYO, survives updates). OSCAL export as a later expansion stage.

## Background / Motivation

For a long time, privacy was only a loose hint in the framework, while security was fully operationalized (asymmetry). `dpo` closes that gap: Privacy by Design becomes a **framework guarantee**. With BOO-87, the AUDIT evidence was elevated from an AI opinion to **auditor-ready, reproducible** control-by-control evidence — relevant for FINMA/BaFin-regulated target groups. The catalog pattern is modeled on `agentic-security` (JSON control catalogs + OSCAL), **without code reuse** (PolyForm license), and extended with nDSG.

## File Structure

```
dpo/
├─ SKILL.md / SKILL.en.md       Skill definition (DE/EN), 3 modes + control catalogs
├─ README.md                    this file
├─ controls/
│  ├─ gdpr.yml                  GDPR control catalog
│  └─ ndsg.yml                  Swiss nDSG control catalog (CH differentiator)
├─ scripts/
│  └─ dpo-audit.py              deterministic audit runner (report md+json)
└─ references/
   ├─ ndsg-schweiz.md           nDSG specifics, comparison with GDPR, FDPIC
   ├─ verarbeitungsverzeichnis.md  Art. 30 template
   ├─ dpia-template.md          DPIA per Art. 35
   ├─ betroffenenrechte.md      Art. 15-22, deadlines, patterns
   └─ privacy-patterns.md       Privacy-by-Design code patterns
```

## Sources

- GDPR (Regulation (EU) 2016/679), BDSG, nDSG (Switzerland, in force since 2023).
- Control catalog pattern modeled on `agentic-security` (Clear-Capabilities) — pattern only, no code (PolyForm license).
- INTENTRON framework: BOO-69 (DPO adoption), BOO-87 (control catalog).

## Related

- Role runbook: [dpo-privacy](../docs/runbooks/dpo-privacy.en.md)
- Compliance evidence mechanics: [compliance-mechanik](../docs/compliance/compliance-mechanik.en.md)
