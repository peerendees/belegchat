---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# DPIA Template (Art. 35 GDPR)

## Threshold Analysis: Is a DPIA Required?

A DPIA is MANDATORY when at least 2 of the following criteria apply:

| # | Criterion | Example |
|---|-----------|----------|
| 1 | Scoring/profiling | Creditworthiness, behaviour prediction |
| 2 | Automated decision with legal effect | Automatic credit granting, applicant screening |
| 3 | Systematic monitoring | CCTV, employee monitoring, GPS tracking |
| 4 | Sensitive data (Art. 9) | Health, biometrics, religion, sex life |
| 5 | Data on a large scale | Customer database > 10,000, user tracking |
| 6 | Combining datasets | CRM + Analytics + Social Media |
| 7 | Vulnerable persons | Children, patients, employees |
| 8 | New technologies | AI, IoT, biometrics, blockchain |
| 9 | Prevention of rights exercise | Data block access to service |

## DPIA Structure

### 1. Description of the Processing

- **Processing activity:** [Name and description]
- **Purpose:** [Why are the data processed?]
- **Legal basis:** [Art. 6(1) lit. a-f + if applicable Art. 9(2)]
- **Controller:** [Organisation + contact details]
- **DPO contact:** [If available]

### 2. Data Inventory

| Data Category | Data Subjects | Source | Recipients | Storage Period | Deletion |
|----------------|-----------|--------|-----------|---------------|-----------|
| [e.g. e-mail] | [Users] | [Registration] | [Internal + mail provider] | [2 years] | [Automatic] |

### 3. Necessity and Proportionality

- Is the processing **necessary** for the purpose?
- Are there **less intrusive means** (less data, shorter storage)?
- Is **data minimisation** complied with?
- Are data subjects **informed** (Art. 13/14)?
- Can data subjects **exercise their rights** (Art. 15-22)?

### 4. Risk Assessment

For each identified risk:

| Risk | Likelihood | Severity | Risk Level | Measure |
|--------|---------------------------|---------|-------------|-----------|
| Unauthorised access | Medium | High | HIGH | Encryption + RBAC |
| Data loss | Low | High | MEDIUM | Backup + Disaster Recovery |
| Purpose limitation breach | Low | Medium | LOW | Access controls + logging |

**Risk matrix:**

| Severity \ Likelihood | Low | Medium | High |
|------------------------------|---------|--------|------|
| High | MEDIUM | HIGH | VERY HIGH |
| Medium | LOW | MEDIUM | HIGH |
| Low | LOW | LOW | MEDIUM |

### 5. Mitigation Measures

| Measure | Type | Implementation | Status |
|-----------|-----|-----------|--------|
| AES-256 encryption | Technical | → Security Architect | [ ] |
| Access concept with RBAC | Technical | → Security Architect | [ ] |
| Update privacy notice | Organisational | Draft text | [ ] |
| Implement deletion policy | Technical + Org. | Define deadlines + cron | [ ] |
| Employee training | Organisational | Training plan | [ ] |

### 6. Result

- **Residual risk after measures:** Low / Medium / High
- **In case of high residual risk:** consultation of supervisory authority required (Art. 36)
- **Approval:** Date, responsible person
- **Next review:** [Date, at the latest 1 year]
