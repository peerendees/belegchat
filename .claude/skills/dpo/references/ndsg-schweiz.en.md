---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# nDSG — Swiss Data Protection Act

In force since 1 September 2023. Applies to all processing with effects in Switzerland.

## Key Differences from GDPR

| Topic | GDPR (EU) | nDSG (Switzerland) |
|-------|-----------|----------------|
| **Scope** | Establishment in EU or offering to EU citizens | Effects principle — effect in CH is sufficient |
| **Personal data** | Only natural persons | Only natural persons (since nDSG, previously also legal persons) |
| **Fines** | Up to EUR 20m / 4% turnover against **companies** | Up to CHF 250,000 against **natural persons** (!) |
| **DPO obligation** | Mandatory in many cases | Voluntary ("data protection advisor"), but recommended |
| **DPIA** | Consult supervisory authority in advance | DPO can be consulted instead of authority |
| **Breach notification** | 72 hours to supervisory authority | "As soon as possible" to EDOEB — no fixed deadline |
| **Access deadline** | "Without undue delay", at the latest 1 month | 30 days |
| **Profiling** | Information obligation | "Profiling with high risk" requires consent |
| **Third country transfer** | Adequacy decision by EU Commission | Country list by Federal Council |
| **Supervisory authority** | National authorities (e.g. BfDI in DE) | EDOEB (Federal Data Protection Commissioner) |
| **RoPA** | Mandatory from 250 employees (or in case of risk) | Mandatory from 250 employees (or in case of risk). SME exemption possible |
| **Consent** | Explicit for special categories | Explicit for particularly sensitive data AND profiling with high risk |

## Particularly Sensitive Data (Art. 5 lit. c nDSG)

Comparison with Art. 9 GDPR:

| nDSG | GDPR Equivalent |
|------|-------------------|
| Religious, philosophical, political views | Art. 9: Religion, political opinion |
| Health data | Art. 9: Health data |
| Genetic data | Art. 9: Genetic data |
| Biometric data for identification | Art. 9: Biometric data |
| Data on racial/ethnic origin | Art. 9: Racial/ethnic origin |
| Data on social assistance | **New in nDSG** — not explicit in GDPR |
| Data on administrative/criminal proceedings | **Broader than GDPR** Art. 10 |
| Trade union membership | Art. 9: Trade union membership |
| Data on sex life/sexual orientation | Art. 9: Sex life/orientation |

## Third Country Transfer under nDSG

1. **Check Federal Council country list** (Annex 1 DSV)
   - EU/EEA states: recognised as adequate
   - UK, Canada, Japan, New Zealand, etc.: recognised
   - USA: **Only with additional safeguards** (no general adequacy decision like EU-US DPF)
2. **If not on the list:** Standard Contractual Clauses or Binding Corporate Rules
3. **Exceptions:** Consent, contract performance, public interest

## Breach Notification Obligation (Art. 24 nDSG)

```
Procedure:
1. Breach identified
2. Risk assessment: is a high risk likely?
   → Yes: notification to EDOEB "as soon as possible"
   → No: internal documentation sufficient
3. If high risk to data subjects:
   → Also inform data subjects
4. Processor:
   → Notifies the controller (not directly to EDOEB)
```

**Important:** No rigid 72-hour deadline like GDPR. But "as soon as possible" means in practice: a few days, not weeks.

## Practical Tips for DE+CH Projects

If a project operates in both the EU and Switzerland:

1. **Use GDPR as baseline** — is stricter in most points
2. **nDSG particularities on top:**
   - Note fines against natural persons (personal risk!)
   - Profiling with high risk: explicit consent
   - Third country transfer: check Swiss country list (deviates from EU)
   - Notification obligation: separate notification to EDOEB (in addition to EU authority)
3. **Privacy notice:** reference both regulations
4. **RoPA:** one record suffices, but supplement with nDSG fields
