---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Privacy by Design — Code Patterns

## Data Minimisation

### Only Collect What Is Necessary

```javascript
// BAD: Store everything
const user = {
  name, email, phone, birthday, address,
  ipAddress, userAgent, referrer, screenResolution
}

// GOOD: Only what is needed for the purpose
const user = { name, email }  // Registration only needs that
```

### Pseudonymisation

```python
import hashlib, uuid

def pseudonymize_user_id(user_id: str, salt: str) -> str:
    """Pseudonymises user ID for analytics"""
    return hashlib.sha256(f"{salt}{user_id}".encode()).hexdigest()[:16]

# Mapping only in separate, access-restricted table
# Analytics works only with pseudonymised IDs
```

### Aggregation Instead of Individual Data

```python
# BAD: store individual page views per user
log_pageview(user_id=123, page="/products", timestamp=now)

# GOOD: only aggregated statistics
increment_counter(page="/products", date=today)
# No personal reference, no privacy issue
```

## Consent Management

### Cookie Consent (TTDSG § 25 / ePrivacy)

```
Requirements:
- [ ] No tracking BEFORE consent granted
- [ ] Granular choice (not only "accept all")
- [ ] "Reject" as easy as "Accept"
- [ ] Technically necessary cookies allowed WITHOUT consent
- [ ] Store consent decision (with timestamp + version)
- [ ] Consent changeable at any time
- [ ] No cookie walls (access must not depend on consent)
```

### Consent Storage Pattern

```javascript
const consentRecord = {
  userId: "uuid-...",
  timestamp: "2026-03-09T14:30:00Z",
  version: "2.1",           // Privacy notice version
  purposes: {
    necessary: true,         // Always true, no consent needed
    analytics: false,        // User rejected
    marketing: false,        // User rejected
    personalisation: true    // User accepted
  },
  source: "cookie-banner",   // Where was consent granted
  ipHash: "a1b2c3..."        // Pseudonymised, not clear-text IP
}
```

## Deletion Policy

### Retention Periods (Germany)

| Data Type | Period | Legal Basis |
|----------|-------|-----------------|
| Commercial letters | 6 years | § 257 HGB |
| Accounting vouchers | 10 years | § 257 HGB, § 147 AO |
| Invoices | 10 years | § 14b UStG |
| Application documents | 6 months | AGG deadline |
| Payroll records | 6 years | § 257 HGB |
| Contract data | 3 years after end | § 195 BGB statute of limitations |
| User accounts | After account deletion | Immediately (if no other obligation) |
| Server logs | Max. 7 days | Legitimate interest, but minimise |
| Analytics | Max. 26 months | Google Analytics default — better shorter |

### Automatic Deletion

```python
# Cron job / scheduled task
def cleanup_expired_data():
    # Accounts marked for deletion
    delete_marked_accounts(older_than=days(30))  # 30 days grace period

    # Server logs older than 7 days
    purge_logs(older_than=days(7))

    # Expired sessions
    delete_expired_sessions()

    # Applications older than 6 months
    anonymize_applications(older_than=months(6))
```

## Third-Party Integration

### Pre-Integration Checklist

```
- [ ] DPA (Data Processing Agreement) concluded
- [ ] Server location known (EU/EEA preferred)
- [ ] If third country: adequacy decision or SCCs
- [ ] Data categories defined that are transmitted
- [ ] Deletion at end of contract regulated
- [ ] Sub-processors known and documented
- [ ] Listed in privacy notice
```

### Common Service Providers — Privacy Status

| Provider | Location | DPA | Note |
|----------|----------|-----|---------|
| AWS | EU region selectable | Yes | Prefer Frankfurt (eu-central-1) |
| Google Cloud | EU region selectable | Yes | Belgium/Frankfurt selectable |
| Hetzner | Germany | Yes | GDPR-compliant, EU-only |
| Vercel | USA | Yes | EU data possible, but US company |
| Stripe | USA + EU | Yes | EU entity available |
| Mailgun/Sendgrid | USA | Yes | Check SCCs |

## Privacy Notice — Mandatory Contents (Art. 13)

```
Every privacy notice MUST contain:
- [ ] Name + contact of the controller
- [ ] Contact of the DPO (if available)
- [ ] Purposes + legal basis per processing
- [ ] Legitimate interests (if Art. 6(1)(f))
- [ ] Recipients / categories of recipients
- [ ] Third country transfers + safeguards
- [ ] Storage period / criteria for determination
- [ ] Data subject rights (Art. 15-22)
- [ ] Right of withdrawal for consent
- [ ] Right to lodge a complaint with supervisory authority
- [ ] Whether provision is required by law/contract
- [ ] Automated decision-making (if any)
```
