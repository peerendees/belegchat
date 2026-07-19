---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Data Subject Rights (Art. 15-22 GDPR)

## Overview

| Right | Article | Deadline | Implementation |
|-------|---------|-------|-----------------|
| Access | 15 | 1 month | GET /api/user/data — all data as JSON |
| Rectification | 16 | Without undue delay | PUT /api/user/profile — change data |
| Erasure ("Right to be forgotten") | 17 | Without undue delay | DELETE /api/user — delete account + all data |
| Restriction | 18 | Without undue delay | PATCH /api/user/restrict — restrict processing |
| Data portability | 20 | 1 month | GET /api/user/export — JSON/CSV export |
| Objection | 21 | Without undue delay | POST /api/user/objection — opt-out |
| Automated decisions | 22 | Without undue delay | POST /api/user/review — request human review |

## Deadlines

- **Response deadline:** 1 month from receipt
- **Extension:** Maximum 2 additional months in complex cases (inform data subject!)
- **Verify identity:** Verify identity before disclosure (but not excessively)
- **Free of charge:** In principle free. For manifestly unfounded/excessive requests: appropriate fee OR refusal

## Exceptions to Right of Erasure (Art. 17(3))

Erasure may be refused for:
- Legal retention obligations (tax: 10 years, commercial: 6 years)
- Establishment, exercise or defence of legal claims
- Public interest (archives, research, statistics)
- Freedom of expression and information

## Implementation Patterns

### Data Export (Art. 15 + 20)

```
Checklist for data export endpoint:
- [ ] All user data captured (DB, logs, backups, third parties)
- [ ] Machine-readable format (JSON preferred, alternatively CSV)
- [ ] Structured and commonly used
- [ ] No third-party data contained in the export
- [ ] Identity verification before export
- [ ] Download link time-limited (e.g. 24h)
```

### Erasure (Art. 17)

```
Checklist for erasure:
- [ ] Primary database: data deleted or anonymised
- [ ] Backups: overwritten in next backup cycle
- [ ] Logs: personal entries removed
- [ ] Third parties: erasure request forwarded
- [ ] Search engines: delisting requested (if public)
- [ ] Derived data: analytics, ML models considered
- [ ] Retention obligations checked (tax, commercial)
- [ ] Erasure logged (when, what, by whom)
```

### Consent Withdrawal (Art. 7(3))

```
Checklist for withdrawal:
- [ ] Withdrawal as easy as granting (one click suffices)
- [ ] Withdrawal effective immediately (not retroactively)
- [ ] Already processed data: lawfulness remains
- [ ] Future processing: stop immediately
- [ ] Inform user about consequences
```

## Switzerland (nDSG): Deviations

- Access deadline: **30 days** (instead of "without undue delay, at the latest 1 month")
- Data portability: Explicitly regulated in nDSG (Art. 28)
- No explicit "right to be forgotten" — but rectification claim (Art. 32)
