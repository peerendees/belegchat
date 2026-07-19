---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architecture Design Document (ADD) — Template

This template is generated on every `/ideation` for feature stories.
It describes the architecture of the planned change completely enough that an architect or
developer can start implementation without follow-up questions.

> **Important:** fill only the relevant sections. Not every story needs every section.
> A simple new agent needs no deployment diagram. But a new trade path needs every layer.
> Mark non-relevant sections with "— not affected —".

---

## Template

```markdown
# ADD: [Story title]

> Version: 1.0 | Created: [date] | Story: [STORY-XX]
> Status: DRAFT → REVIEW → APPROVED

---

## 1. Summary

**What will be built:** [1–2 sentences — what is the result?]
**Why:** [business reason / technical necessity]
**Scope:** [what is included, what explicitly is NOT]

---

## 2. Architecture overview

### 2.1 Affected layers

| Layer | Affected | Change |
|-------|----------|--------|
| L1 — Data ingestion | ✅/❌ | [New agent? New API? New signal file?] |
| L2 — Aggregation | ✅/❌ | [New weight? Supervisor logic? Score calculation?] |
| L3 — Decision / LLM | ✅/❌ | [New decision path? LLM arbiter adjustment?] |
| L4 — Execution | ✅/❌ | [New trade type? Sizing? SL/TP logic?] |
| L5 — Monitoring | ✅/❌ | [New self-healing check? Position monitor?] |
| L6 — Feedback | ✅/❌ | [New feedback loop? Weight-optimizer adjustment?] |
| L7 — Presentation | ✅/❌ | [Dashboard? Telegram? Briefing?] |

### 2.2 Component diagram

Shows the new and affected components and how they interact.

```
[External API]               [Existing component]
      │                              │
      ▼                              ▼
┌──────────────┐  signals/*.json  ┌──────────────┐
│ New          │ ───────────────→ │ Supervisor   │
│ component    │                  │              │
└──────────────┘                  └──────┬───────┘
                                         │
                                         ▼
                                  [Next layer]
```

> Legend: ─── data flow | ═══ control flow | ··· optional/fallback

### 2.3 Sequence diagram (for complex flows)

Shows the temporal order of calls between components.

```
Trigger ──→ Component A ──→ Component B ──→ Result
              │                   │
              │  error case       │
              └──→ Fallback ─────┘
```

---

## 3. Data architecture

### 3.1 Data flow

Describes which data is created where, how it's transformed, and where it ends up.

| Source | Format | Transformation | Target | Frequency |
|--------|--------|----------------|--------|-----------|
| [API/Agent] | [JSON/WebSocket/...] | [normalization/scoring/...] | [signal file/DB/journal] | [5 min/event/...] |

### 3.2 New data structures

Defines new or changed data formats.

**Signal output** (if new agent):
```json
{
  "score": 0.0,
  "signal": "HOLD",
  "confidence": 0.0,
  "timestamp": "ISO8601Z",
  "source": "agent-name",
  "assets": {
    "BTC": { "score": 0.0, "signal": "HOLD", "details": {} }
  }
}
```

**New DB tables** (if database affected):
```sql
-- Table name and purpose
CREATE TABLE IF NOT EXISTS ... (
  ...
);
```

### 3.3 DB Impact (MANDATORY on database changes)

| Question | Answer |
|----------|--------|
| Is a new table needed? | Yes/No — if yes: schema, migration, dedup strategy |
| Is an existing table written to? | Yes/No — if yes: document the writer |
| Is an existing table read from? | Yes/No — if yes: document the reader |
| Does a table's impact profile change? | Yes/No — if yes: update impact matrix |

If everything "No": mark section with "— no DB impact —".

### 3.4 Data consistency

- **SSoT:** which file/table is authoritative?
- **Dual-write:** must JSONL + DB be written together?
- **Atomic writes:** write-then-rename for critical files?
- **Race conditions:** can parallel agents write to the same file?

---

## 4. API and integration design

### 4.1 External APIs (new or changed)

| API | Endpoint | Auth | Rate limit | Cost | Fallback |
|-----|----------|------|------------|------|----------|
| [Name] | [URL] | [Key/OAuth/...] | [X req/min] | [Free/$X/mo] | [Alternative or degradation] |

### 4.2 Internal interfaces

Which existing modules/libraries are used or extended?

| Module | Function | Change |
|--------|----------|--------|
| `lib/config.js` | [AGENT_WEIGHTS/SIGNAL_FILES/...] | [New entry / change] |
| `lib/signals.js` | [readSignal/writeSignal] | [None / extension] |
| `lib/http.js` | [fetchWithRetry] | [None / new endpoint] |

---

## 5. Infrastructure impact

> This section is filled in by the cloud system engineer (agent-team teammate).

### 5.1 Resources

| Resource | Current | After change | Delta |
|----------|---------|--------------|-------|
| CPU | [X%] | [Y%] | [+Z%] |
| RAM | [X MB] | [Y MB] | [+Z MB] |
| Disk | [X GB] | [Y GB] | [+Z GB] |
| Network | [X req/min] | [Y req/min] | [+Z req/min] |

### 5.2 Infrastructure changes

- **Firewall:** [New ports? Egress rules?]
- **Docker:** [New container? Volume? Network?]
- **DNS:** [New subdomains? Records?]
- **Secrets:** [New .env variables? Key rotation?]
- **Dependencies:** [New packages? OS-level?]

### 5.3 Deployment

- **Rollout:** [Rolling? Big-bang? Feature flag?]
- **Rollback:** [How to go back if things fail?]
- **Downtime:** [Expected? How to minimize?]

---

## 6. Quality assessment (8 dimensions)

Each dimension is rated with finding and concrete measure.

### 6.1 Reliability
- **Impact:** [None / Medium / High]
- **Finding:** [What could fail? How does the system react?]
- **Measure:** [Fallback? Kill-switch? New self-healing check?]

### 6.2 Data Integrity
- **Impact:** [None / Medium / High]
- **Finding:** [New writes? SSoT change? Race conditions?]
- **Measure:** [Atomic writes? Locking? Validation?]

### 6.3 Security
- **Impact:** [None / Medium / High]
- **Finding:** [New API keys? External input? Webhooks?]
- **Measure:** [.env? HMAC? Input validation? Rate limit?]

### 6.4 Performance
- **Impact:** [None / Medium / High]
- **Finding:** [Latency? Rate limits? Memory? WebSocket?]
- **Measure:** [Caching? Throttling? Buffer limits?]

### 6.5 Observability
- **Impact:** [None / Medium / High]
- **Finding:** [Can the feature fail silently?]
- **Measure:** [Logging? Alert? Dashboard endpoint?]

### 6.6 Maintainability
- **Impact:** [None / Medium / High]
- **Finding:** [Code duplication? Config hardcodes? Doc updates?]
- **Measure:** [Shared lib? Config SSoT? Which docs to update?]

### 6.7 Cost Efficiency
- **Impact:** [None / Medium / High]
- **Finding:** [API cost? LLM tokens? New dependencies?]
- **Measure:** [Free tier? Caching? Daily limit?]

### 6.8 Signal Quality
- **Impact:** [None / Medium / High]
- **Finding:** [Does it improve decisions? Redundancy?]
- **Measure:** [Weight? Attribution? Correlation check?]

---

## 7. Architecture decisions (ADRs)

Document important design decisions with rationale.

### ADR-1: [decision title]
- **Context:** [Why did we need to decide?]
- **Options:** [A: ... | B: ... | C: ...]
- **Decision:** [Chosen option + reasoning]
- **Consequences:** [What follows? Trade-offs?]

---

## 8. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | [description] | [Low/Medium/High] | [Low/Medium/High] | [Concrete measure] |
| 2 | ... | ... | ... | ... |

---

## 9. Implementation notes

Concrete notes for the `/implement` skill / developer.

### 9.1 Affected files
| File | Change | Complexity |
|------|--------|-------------|
| [Path] | [New/Change/Delete] | [Low/Medium/High] |

### 9.2 Implementation order
1. [First step — e.g. config entries]
2. [Second step — e.g. core logic]
3. [Third step — e.g. integration + tests]

### 9.3 Config changes (config.js)
```javascript
// New entries in config.js
AGENT_WEIGHTS: { ..., 'new-agent': 0.03 },
SIGNAL_FILES: { ..., 'new-agent': 'signals/new-agent-signal.json' },
```

---

## Appendix

### A. References
- [Relevant docs, APIs, RFCs, existing issues]

### B. Glossary
- [Project-specific terms used in the ADD]
```

---

## Usage guidelines for the ideation skill

### When which scope?

| Story type | Required sections | Optional |
|------------|------------------|----------|
| **New agent** | 1, 2.1, 2.2, 3.1, 3.2, 4.1, 6 (all), 9 | 2.3, 5, 7, 8 |
| **New trade path** | 1, 2 (all), 3 (all), 4, 5, 6 (all), 7, 8, 9 | — |
| **API integration** | 1, 2.1, 3.1, 4.1, 6.3+6.4+6.7, 9 | rest |
| **Refactoring** | 1, 2.1, 6.6, 9 | 7, 8 |
| **Bug fix** | No ADD — story template fix is enough | — |
| **Dashboard/UI** | 1, 2.1, 4.2, 6.5, 9 | 5 |

### Agent team workflow

When agent teams are active, the ADD is created collaboratively:
1. **Lead** creates sections 1, 2.1, 9
2. **Architect teammate** creates sections 2.2, 2.3, 3, 4, 6, 7
3. **Cloud system engineer** creates section 5
4. **Everyone** reviews and challenges each other
5. **Lead** consolidates and presents to the operator
