---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Records of Processing Activities (Art. 30 GDPR)

## Obligation

A record of processing activities (RoPA) is MANDATORY for:
- Companies with 250+ employees (always)
- All companies in case of: not only occasional processing, risk to data subjects, special categories of data (Art. 9)
- **In practice: almost always required**

## Template — Controller's Record (Art. 30(1))

### Entry per Processing Activity

```
---
Processing activity: [e.g. "User registration"]
Controller: [Company, address, contact]
DPO: [Name, contact]
---

Purpose: [Why?]
Legal basis: [Art. 6(1) lit. ?]

Data subjects:
- [ ] Customers/users
- [ ] Employees
- [ ] Applicants
- [ ] Suppliers
- [ ] Other: ___

Data categories:
- [ ] Master data (name, address)
- [ ] Contact data (e-mail, phone)
- [ ] Contract data
- [ ] Payment data
- [ ] Usage data (logs, IPs)
- [ ] Special categories (Art. 9): ___

Recipients:
- Internal: [Departments]
- External: [Service providers with DPA]
- Third country: [Country + safeguard]

Retention period: [e.g. "3 years after end of contract"]
Deletion rule: [e.g. "Automatically after expiry"]

TOMs (reference): [→ Security Architect / TOM document]
DPIA required: Yes / No
DPIA conducted: [Date] / Not applicable

Last review: [Date]
Next review: [Date]
```

## Example Entries

### 1. User Registration

| Field | Value |
|------|------|
| Purpose | Creation and management of user accounts |
| Legal basis | Art. 6(1)(b) (contract performance) |
| Data subjects | Registered users |
| Data categories | Name, e-mail, password (hashed), registration date |
| Recipients | Internal: development, support. External: e-mail provider (DPA) |
| Third country | No (EU servers) |
| Storage period | Until account deletion + 30 days grace |
| Deletion | Automatically after account deletion + grace period |
| DPIA | Not required |

### 2. Newsletter Sending

| Field | Value |
|------|------|
| Purpose | Sending marketing e-mails |
| Legal basis | Art. 6(1)(a) (consent) + double opt-in |
| Data subjects | Newsletter subscribers |
| Data categories | E-mail, subscription date, consent proof, open rate |
| Recipients | External: newsletter tool (DPA) |
| Third country | USA (SCCs + DPF) |
| Storage period | Until unsubscription |
| Deletion | Immediately after unsubscription (e-mail on suppression list) |
| DPIA | Not required |

### 3. Payment Processing

| Field | Value |
|------|------|
| Purpose | Processing of payments |
| Legal basis | Art. 6(1)(b) (contract performance) |
| Data subjects | Paying customers |
| Data categories | Name, billing address, payment method (tokenised), invoices |
| Recipients | External: payment provider (DPA), tax advisor |
| Third country | USA (Payment provider — SCCs + DPF) |
| Storage period | Invoices: 10 years (§ 147 AO). Payment data: until end of contract |
| Deletion | Automatically after expiry of retention period |
| DPIA | Not required (standard payment processing) |

## Maintenance of the Record

- **Update:** With every new processing activity or change
- **Review:** At least annually
- **Format:** Digital, presentable to the supervisory authority at any time
- **Responsible:** DPO or controller
