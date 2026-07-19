---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architecture Dimensions

For every story, check the relevant dimensions. Not all are always applicable — apply only those relevant to the specific change.

**Structure:** 6 standard dimensions (always active) + optional add-ons (only when needed, activated in bootstrap Block A.7).

## Standard dimensions (always relevant)

### 1. Reliability

- Can the feature fail without blocking the system?
- Graceful degradation implemented?
- Is there a retry mechanism for transient errors?
- Kill-switch or feature flag to quickly disable the feature?
- Tested what happens when external dependencies are down?

### 2. Data Integrity

- Authoritative data source (SSoT) clearly named?
- Atomic writes where needed (write-then-rename, transactions)?
- Race conditions on parallel accesses considered?
- Idempotency on retries ensured?
- Backups or recovery strategy for critical data?

### 3. Security

- API keys and secrets only in `.env`, never in code, never in log?
- Inputs validated (user input, webhooks, external APIs)?
- Tokens sanitized in logs?
- Webhooks with HMAC signing, replay protection?
- Principle of least privilege on tool/file access?

### 4. Performance

- Acceptable latency for the use case?
- Rate limits of external APIs respected and documented?
- Memory usage within bounds (no unbounded buffering)?
- WebSocket/long-lived connection stability?
- Caching where useful (semantic or TTL-based)?

### 5. Observability

- Structured logging implemented?
- Alerts on critical errors?
- Metrics for important state changes?
- Self-healing check needed (if self-healing agent active)?
- Tracing for distributed calls?

### 6. Maintainability

- Code duplication avoided?
- Configuration values in SSoT (not hardcoded)?
- Docs need update — which files?
- Understandable without extra context (naming, comments at non-obvious spots)?
- Tests for the most important paths?

---

## Optional add-ons (only when activated in bootstrap)

These dimensions are project-specific and activated via `/bootstrap` Block A.7. Active add-ons are in `ARCHITECTURE_DESIGN.md §3 Quality Attributes` and are checked during story planning.

### 7. Privacy / GDPR (if Privacy add-on active)

For projects with personal data, voice assistants, tier models, regulated environments.

- Data-flow boundaries explicitly documented? (Tier 0/1/2 or analog)
- Before every cloud call: redaction of PII (emails, tokens, IBANs, phone numbers)?
- Data subject rights (deletion, access) implementable?
- Audit log on privacy-tier change?
- Offline fallback when privacy tier 0 is enforced?

### 8. Cost Efficiency (if Cost-Efficiency add-on active)

For projects with LLM costs, SaaS subscriptions, cloud resources.

- API/token costs per call estimable?
- Cache strategy for repeated queries?
- Is there a free or cheaper alternative?
- Rate-limit budget not used up unnecessarily?
- Monthly cost ceiling defined?

### 9. Signal Quality (if Signal-Quality add-on active)

For ML, analytics or signal-processing projects.

- Does the feature improve prediction/decision quality?
- Evaluation metric defined (precision, recall, F1, custom)?
- Feedback loop present (attribution, active learning)?
- False-positive/false-negative trade-off documented?
- Backtesting/validation strategy before production?

### 10. Compliance (if Compliance add-on active)

For regulated industries (health, finance, legal).

- Legal requirements identified (GDPR, HIPAA, SOX, etc.)?
- Audit trail for critical actions?
- Data retention policy respected?
- Responsible role (Data Protection Officer, Compliance Officer) involved?
- Documentation maintainable for auditors (e.g. in `compliance/`)?

---

## Domain-specific examples (optional appendix)

Examples showing how dimensions may manifest in concrete project domains. Reference only — not default.

### Voice assistant (e.g. Jarvis)
- **Privacy** (Tier 0/1/2 switchable)
- **Reliability** (offline fallback mandatory)
- **Performance** (wake-word latency < 300ms)
- **Data Integrity** (memory consolidation, atomic writes)

### Trading system
- **Reliability** (kill-switch first)
- **Data Integrity** (JSONL as SSoT, dual-write)
- **Signal Quality** (weight optimization, contrarian vs. consensus)
- **Cost Efficiency** (reserve LLM calls for critical decisions)

### Research project
- **Observability** (reproducibility, prompt versioning)
- **Data Integrity** (source tracking, citation graph)
- **Cost Efficiency** (API budget per run)

### Backend service
- **Reliability** (SLA, rate limiting)
- **Security** (auth, input validation)
- **Observability** (tracing, alerting)
- **Performance** (throughput, latency percentiles)

---

## Usage in `/ideation` skill

For every story:
1. Standard dimensions (1-6) are mentioned with brief assessment ("Reliability: no critical change")
2. Active add-ons (from `.bootstrap-config` or `ARCHITECTURE_DESIGN.md`) are applied when relevant
3. Non-active dimensions are omitted
4. When in doubt: better include + brief assessment

Output format for story (see `story-template-feature.en.md`):
```
## Architecture dimensions (affected)

- **Reliability:** [brief, what is checked, what status]
- **Security:** [brief]
- [Privacy — if active and affected]
```
