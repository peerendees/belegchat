---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: dpo
description: |
  Data Protection Officer: Privacy by Design for the development process.
  3 modes: ASSESS (legal basis and DPIA at planning), REVIEW (privacy check on
  code/feature changes), AUDIT (Records of Processing Activities and compliance status).
  Covers GDPR/DSGVO (EU), BDSG (DE), and nDSG (CH).
  Use when the user says "datenschutz", "DSGVO", "GDPR", "privacy", "DPIA",
  "personal data", "personenbezogene Daten", "consent", "Einwilligung",
  "Records of Processing", "Verarbeitungsverzeichnis", "data subject rights",
  "Betroffenenrechte", "deletion policy", "Loeschkonzept", "/dpo" — or automatically
  when other skills plan or implement features with personal data.
version: 1.3.0
recommended_model: opus  # BOO-69 — compliance-critical, audit-relevant
language: en
metadata:
  hermes:
    category: governance
    tags: [privacy, gdpr, dsgvo, ndsg, compliance]
    requires_toolsets: [terminal]
    related_skills: [security-architect, architecture-review]
---

# Data Protection Officer

Privacy by Design for Claude Code — from data collection to deletion.

## Principles (Art. 5 GDPR)

Every processing of personal data MUST satisfy these principles:

| Principle | Meaning | Probing Question |
|---------|-----------|------------|
| **Lawfulness** | Legal basis required | Which Art. 6(1) letter applies? |
| **Purpose Limitation** | Only for the specified purpose | What exactly are the data collected for? |
| **Data Minimisation** | Only what is necessary | Do we really need ALL these fields? |
| **Accuracy** | Data must be correct | Are there update mechanisms? |
| **Storage Limitation** | Delete when no longer necessary | When are the data deleted? |
| **Integrity & Confidentiality** | Appropriate protection (→ Security Architect) | Are TOMs defined? |
| **Accountability** | Must be able to demonstrate compliance | Is everything documented? |

---

## 3 Modes

### Mode Selection (automatic)

```
User plans new feature with data?         → ASSESS
User changes code with data processing?   → REVIEW
User says "privacy audit"?                → AUDIT
Another skill calls DPO?                  → ASSESS or REVIEW (depending on phase)
```

---

### ASSESS Mode (Data Protection Impact Assessment)

**When:** At ideation, planning, new features — BEFORE personal data are processed.

**Workflow:**

1. **Data flow analysis**
   - Which personal data are collected?
   - Determine categories:

   | Category | Examples | Sensitivity |
   |-----------|-----------|---------------|
   | Master Data | Name, address, date of birth | Standard |
   | Contact Data | E-mail, phone | Standard |
   | Usage Data | IP, logs, click behaviour | Standard |
   | Financial Data | IBAN, credit card, transactions | Elevated |
   | Health Data | Diagnoses, medication | Special (Art. 9) |
   | Biometric Data | Fingerprint, face recognition | Special (Art. 9) |
   | Location Data | GPS, movement profiles | Elevated |
   | Minors | Data of under-16s | Special (Art. 8) |

   - Where do the data come from? (Directly from user, from third parties, automatically collected)
   - Where do they flow? (Internal, processor, third countries)

2. **Determine legal basis (Art. 6(1) GDPR)**

   | Letter | Legal Basis | Typical Use |
   |-----------|----------------|-------------------|
   | a) | **Consent** | Newsletter, tracking, cookies |
   | b) | **Contract performance** | Order processing, account management |
   | c) | **Legal obligation** | Tax retention, reporting obligations |
   | d) | **Vital interests** | Emergency contact (rare) |
   | e) | **Public interest** | Authorities, research |
   | f) | **Legitimate interest** | Fraud protection, direct marketing (with balancing test!) |

   For Art. 9 data (special categories): additionally check Art. 9(2).

3. **Conduct DPIA (Art. 35 GDPR)**
   DPIA MANDATORY when:
   - Scoring/profiling with legal effect
   - Automated decisions
   - Systematic monitoring of public areas
   - Processing special categories on a large scale
   - Combining datasets
   - Data of vulnerable persons (children, employees)
   - New technologies (AI, biometrics)

   → [references/dpia-template.en.md](references/dpia-template.en.md)

4. **Check third country transfer**
   - Data to USA/UK/other third countries?
   - Adequacy decision in place? (e.g. EU-US Data Privacy Framework)
   - If not: Standard Contractual Clauses (SCCs) + Transfer Impact Assessment
   - Cloud providers: where are the servers?

**Output:** Privacy assessment with:
- Data inventory (what data, what category)
- Legal basis per processing purpose
- DPIA (if required)
- Third country transfer assessment
- Concrete requirements for implementation

---

### REVIEW Mode (Privacy Check on Code Changes)

**When:** On code changes that affect personal data.

**Workflow:**

1. **Check data minimisation**
   - Are only the fields collected that are needed for the purpose?
   - Are data aggregated/pseudonymised where possible?
   - No unnecessary storage in logs, caches, analytics?

2. **Check consent implementation** (if consent = legal basis)
   ```
   Checklist:
   - [ ] Consent obtained BEFORE data collection
   - [ ] Freely given (no coupling-prohibition violation)
   - [ ] Informed (purpose, recipients, duration named)
   - [ ] Specific (for each purpose separately)
   - [ ] Withdrawable (as easy as granting)
   - [ ] Provable (timestamp + version stored)
   - [ ] No pre-checked checkbox
   - [ ] Double opt-in for e-mail marketing
   ```

3. **Check data subject rights**
   → [references/betroffenenrechte.en.md](references/betroffenenrechte.en.md)

   | Right | Art. | Implemented? |
   |-------|------|----------------|
   | Access | 15 | Can the user export all their data? |
   | Rectification | 16 | Can the user change their data? |
   | Erasure | 17 | Can the user request deletion? |
   | Restriction | 18 | Can processing be restricted? |
   | Data portability | 20 | Export in machine-readable format (JSON/CSV)? |
   | Objection | 21 | Opt-out for legitimate interest? |
   | Automated decisions | 22 | Right to human review? |

4. **Check deletion policy**
   - Are there defined retention periods?
   - Are data automatically deleted after expiry?
   - Are backups considered in the deletion policy?
   - Are derived data (analytics, ML models) also deleted?

4b. **Data-frugal default settings? (Art. 25(2) GDPR / Art. 7 nDSG, BOO-427)**
   - Are the defaults the most data-frugal variant (opt-in instead of opt-out)?
   - No pre-checked consent, no tracking active by default?
   - Does the feature in its default state collect only what the purpose requires?

5. **Privacy by Design Patterns**
   → [references/privacy-patterns.en.md](references/privacy-patterns.en.md)

**Output:** Privacy review report

```
### Privacy Review: [Feature/Change]

| # | Finding | Severity | Regulation | Recommendation |
|---|--------|---------|-----------|------------|
| 1 | E-mail logged without consent | HIGH | Art. 5/6 GDPR | Remove logging or obtain consent |
| 2 | No deletion mechanism for user data | HIGH | Art. 17 GDPR | Implement DELETE endpoint |
| 3 | Missing privacy notice for new feature | MEDIUM | Art. 13 GDPR | Update notice |

**Compliance Status:** NOT COMPLIANT / PARTIALLY COMPLIANT / COMPLIANT
**Blocker:** Yes (HIGH findings must be resolved before release)
```

---

### AUDIT Mode (Compliance Audit)

**When:** On demand ("/dpo audit"), before releases, periodically, on supervisory authority requests.

AUDIT mode is **catalogue-driven and deterministic**: instead of a free-form LLM assessment, a
runner works through the versioned control catalogues under `dpo/controls/*.yml`. Same project
state = same result — reproducible and Git-traceable.

**Workflow:**

1. **Work through the catalogues (deterministic runner)**

   The runner reads the framework catalogues `dpo/controls/*.yml` (`gdpr`, `ndsg`,
   planned, not included: `nist-ai-600`, BOO-419) plus an optional **project overlay** under
   `.claude/dpo/controls/` (`.yml` + `.json`) and executes each control check mechanically:

   ```bash
   DPO_PROJECT_ROOT=. python3 <skill-dir>/scripts/dpo-audit.py
   ```

   (`<skill-dir>` is this skill's directory. The call is dependency-free —
   pure python3 stdlib, no PyYAML, no database.)

   **Opt-in gate for `governance_mode = heavy` (BOO-427):** the default stays exit 0 — the audit
   is a report, not a gate. With `--gap-exit` (or `DPO_GAP_EXIT=1`), ≥1 GAP becomes exit 1 —
   making the runner usable as a **required status check**. Additionally the audit trigger can
   run as a **CI schedule** (GitHub Actions `schedule:` + `workflow_dispatch:`, invocation as
   above with `--gap-exit`); prerequisite stated honestly: the dpo skill must be available in
   the CI checkout (e.g. as a committed `.claude/skills/dpo/` or its own checkout step) — the
   runner does not live in the target project.

2. **Report is generated deterministically**

   The runner writes the report pair under `dpo/reports/`:
   - `dpo/reports/<date>_audit.md` — human-readable: pass/gap table, fix hint per GAP (`mapsTo`)
   - `dpo/reports/<date>_audit.json` — machine-readable: the same data, structured

   Each row carries the control ID, title, `quelle` (GDPR/nDSG article as audit evidence), status and detail.

3. **Honest determinism — mechanical vs. judgement**

   The runner cleanly separates two classes of checks and does NOT fake full automation:

   | Check class | check_typ | Result | Who decides |
   |-------------|-----------|--------|-------------|
   | **Mechanical** | `file-exists`, `file-contains`, `grep-absent`, `conditional-file` (BOO-427: IF file without THEN file → GAP) | **PASS / GAP** (reproducible) | Machine |
   | **Heuristic** | `grep-review` (BOO-427: PII-indicator grep, e.g. email columns in migrations — deliberately a hint, not a verdict) | **REVIEW-NEEDED** on hit, PASS without | Machine flags, operator judges |
   | **Judgement** | `review` (purpose limitation, proportionality, third country, DPA) | **REVIEW-NEEDED** | Operator/skill — manually afterwards |

   Mechanical checks return PASS/GAP reproducibly. Judgement checks deliberately return
   **REVIEW-NEEDED** — the operator (or the skill afterwards) works these off using the
   guiding questions below and records the outcome back into the report. No invented legal
   advice — the skill poses the probing question, the operator decides.

4. **REVIEW-NEEDED guiding questions (bound to control IDs)**

   The existing substantive checkpoints remain as guiding questions — they are now each bound to
   a control ID and surfaced into the report via the `review` type:

   - **Records of Processing Activities (Art. 30)** — `GDPR-Art30-001`, `NDSG-Art12-001`
     → [references/verarbeitungsverzeichnis.en.md](references/verarbeitungsverzeichnis.en.md)
     Per processing activity: designation/purpose, categories of data subjects and data,
     recipients (internal + external), third country transfers, retention periods, TOMs (→ Security Architect).
   - **Information duties (Art. 13/14)** — `GDPR-Art13-001`, `NDSG-Art19-001`
     Privacy notice complete/up to date? All purposes and legal bases named?
     Data subject rights explained? Contact details of controller/DPO?
   - **Legal basis & purpose limitation (Art. 6 / Art. 5)** — `GDPR-Art6-001`, `GDPR-Art5-001`, `GDPR-Art5-002`
     Does each processing have a legal basis? A fixed, documented purpose? Is data minimisation met?
   - **Processor agreements (Art. 28)** — `GDPR-Art28-001`
     All service providers with DPA captured? Sub-processors documented? Instruction-bound nature?
   - **Third country transfer (nDSG effects principle)** — `NDSG-Art16-001`
     Transfers checked against the Federal Council country list? Proportionality?
   - **TOMs (Art. 32 / nDSG Art. 8)** — `GDPR-Art32-001`, `GDPR-Art32-002`, `NDSG-Art8-001`
     Encryption at rest/in transit, pseudonymisation, access control, backup, regular testing
     (→ Security Architect). The secret/TLS checks already run mechanically here as `grep-absent`.

**Output:** The deterministic report pair `dpo/reports/<date>_audit.{md,json}` —
pass/gap table with fix hints and the open REVIEW-NEEDED list for the operator.

> An **OSCAL export** of the results is planned as an optional later build stage (not part of this
> story). Determinism comes from the versioned Git YAML catalogues — deliberately NO database.

---

## Control Catalogues

AUDIT mode is fed by flat, versioned YAML catalogues. Each control is a mapping with a fixed schema:

| Field | Meaning |
|-------|---------|
| `id` | Control ID (e.g. `GDPR-Art30-001`) |
| `titel` | Plain-text label |
| `evidenz` | Required evidence |
| `check_typ` | `file-exists` \| `file-contains` \| `grep-absent` \| `grep-review` \| `conditional-file` \| `review` |
| `check_arg` | `file-exists` → path · `file-contains` → `path::needle` · `grep-absent` → regex (GAP if found in source) · `grep-review` → `[pathfilter::]regex` (REVIEW-NEEDED on hit — hint, not verdict; BOO-427) · `conditional-file` → `IF::THEN` (GAP if IF file exists without THEN file; BOO-427) · `review` → empty |
| `mapsTo` | Reference to check/artefact/fix hint |
| `quelle` | **Mandatory** — origin (GDPR/nDSG article), audit evidence |
| `ergebnis` | set during the run (PASS \| GAP \| REVIEW-NEEDED), empty in the catalogue |

**Framework catalogues** (`dpo/controls/`):

| Catalogue | Content |
|-----------|---------|
| `gdpr.yml` | GDPR controls (Art. 5/6/13/17/25/28/30/32/35 — Art. 25 privacy by design/default + Art. 35 DPIA since BOO-427) |
| `ndsg.yml` | Swiss nDSG controls (Art. 7/8/12/16/19/22/24/25 — Art. 7 data protection by technology/defaults since BOO-427) — CH differentiator |
| `nist-ai-600.yml` | **planned, not included** (BOO-419) — for AI processing; use a project overlay until then |
| `optional/eu-ai-act.yml` | EU AI Act (Reg. (EU) 2024/1689) — risk class, transparency, human oversight, logging, GPAI. **Not auto-loaded** (lives under `controls/optional/`): copied into the project overlay by the EU AI Act add-on (BOO-105) and only loaded then; checks `AI_SYSTEM.md` |

**Project overlay (BYO framework):** A project can place its own catalogues under
`.claude/dpo/controls/` (`.yml` + `.json`, same schema). The runner automatically merges them
with the framework catalogues. This way project-specific controls survive a framework update —
they live in the project repo, not in the skill.

---

## Country-Specific Regulations

### GDPR/DSGVO (EU) — Baseline

GDPR is the foundation. All checks are based primarily on it.

### BDSG (Germany) — Additions

| Topic | BDSG Particularity |
|-------|-------------------|
| DPO obligation | From 20 persons with regular data processing (§ 38) |
| Employee data protection | § 26 BDSG — own legal basis |
| Video surveillance | § 4 BDSG — stricter rules |
| Scoring | § 31 BDSG — additional requirements |
| Fines | Up to EUR 50,000 for administrative offences (in addition to GDPR) |

### nDSG (Switzerland) — Differences

→ [references/ndsg-schweiz.en.md](references/ndsg-schweiz.en.md)

| Topic | nDSG Particularity |
|-------|-------------------|
| Scope | Effects principle — also applies to Swiss data abroad |
| DPIA | "Datenschutz-Folgenabschaetzung" — similar, but DPO can be consulted instead of authority |
| Reporting obligation | "As soon as possible" to EDOEB (no 72h limit like GDPR) |
| Criminal law | Fines up to CHF 250,000 against **natural persons** (not companies!) |
| Right of access | Within 30 days (GDPR: "without undue delay", in practice 1 month) |
| Profiling | "Profiling with high risk" requires consent or law |
| Data transfer | Country list by Federal Council (not EU adequacy decisions) |

---

## Integration with Other Skills

| Calling Skill | DPO Mode | What Happens |
|-------------------|-----------|-------------|
| **Ideation** | ASSESS | Privacy assessment parallel to the story |
| **Implement** | REVIEW | Check data processing in code |
| **Security Architect** | Bidirectional | Security → provides TOMs; DPO → defines protection requirement |
| **Sprint Review** | AUDIT | Periodic privacy compliance check |

### Interplay Security Architect ↔ DPO

```
Security Architect                    DPO
       |                               |
  "What protection level?" ←──────── "Art. 9 data = HIGH"
       |                               |
  "TOMs: AES-256, RBAC,    ────────→ "TOMs for Art. 32
   Backup, Monitoring"                 documented ✓"
```

---

## References

| Document | Content |
|----------|--------|
| [dpia-template.en.md](references/dpia-template.en.md) | DPIA template per Art. 35, threshold analysis, risk assessment |
| [betroffenenrechte.en.md](references/betroffenenrechte.en.md) | Art. 15-22 in detail, deadlines, implementation patterns |
| [privacy-patterns.en.md](references/privacy-patterns.en.md) | Privacy by Design code patterns, pseudonymisation, consent flows |
| [verarbeitungsverzeichnis.en.md](references/verarbeitungsverzeichnis.en.md) | Art. 30 template, example entries, mandatory fields |
| [ndsg-schweiz.en.md](references/ndsg-schweiz.en.md) | Swiss nDSG particularities, comparison with GDPR, EDOEB |
| [controls/gdpr.yml](controls/gdpr.yml), [controls/ndsg.yml](controls/ndsg.yml) | Deterministic control catalogues (schema: id/titel/evidenz/check_typ/check_arg/mapsTo/quelle/ergebnis); project overlay under `.claude/dpo/controls/` |
| [ADR LLM gateway and model routing](../docs/domain/adrs/llm-gateway.en.md) (BOO-320) | DPO-relevant when an LLM gateway is used and for model choice: prompts pass through the gateway host in cleartext (processor/TOMs), message redaction for confidential projects, Fable 5 retention caveat (no ZDR, Appendix Q); hardening/operations baseline in the runbook `docs/runbooks/llm-gateway.en.md` (BOO-318) |
| [scripts/dpo-audit.py](scripts/dpo-audit.py) | Deterministic AUDIT runner (python3 stdlib, dependency-free); produces `dpo/reports/<date>_audit.{md,json}` |
