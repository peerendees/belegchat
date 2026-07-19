---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Threat Modeling — Detail Reference

## STRIDE per element matrix

| DFD element | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|-------------|----------|-----------|-------------|-----------------|-----|-----------|
| External actor | X | | X | | | |
| Process | X | X | X | X | X | X |
| Data store | | X | X | X | X | |
| Data flow | | X | | X | X | |

## DREAD scoring

Score each threat on a 1–10 scale:

| Criterion | 1–3 (Low) | 4–6 (Medium) | 7–10 (High) |
|-----------|-----------|--------------|-------------|
| Damage | Minimal impact | Partial data loss | Full compromise |
| Reproducibility | Hard, timing-dependent | Reproducible with effort | Every time |
| Exploitability | Requires expert + tools | Requires some skill | Script-kiddie level |
| Affected Users | Single user | Subset of users | All users |
| Discoverability | Not publicly known | Findable with effort | Auto-discoverable |

**Risk score** = average of the 5 values. ≥ 7.0 = critical, ≥ 5.0 = high.

## Authentication pattern selection

| Use case | Recommended pattern |
|----------|---------------------|
| Web application | OAuth 2.0 + PKCE with OIDC |
| API authentication | JWT with short lifetime (15 min) + refresh token |
| Service-to-service | mTLS with certificate rotation |
| CLI / automation | API keys with IP allowlisting |
| High security | FIDO2 / WebAuthn hardware keys |

## Defense-in-depth layers

```
Layer 1: PERIMETER
  WAF, DDoS protection, DNS filtering, rate limiting

Layer 2: NETWORK
  Segmentation, IDS/IPS, network monitoring, VPN, mTLS

Layer 3: HOST
  Endpoint protection, OS hardening, patching, logging

Layer 4: APPLICATION
  Input validation, authentication, secure coding, SAST

Layer 5: DATA
  Encryption at rest/in transit, access controls, backup
```

## Zero Trust principles

1. **Verify explicitly** — authenticate and authorize every request
2. **Least privilege** — just-in-time and just-enough access
3. **Assume breach** — segment, monitor, minimize blast radius

## Cryptography selection

| Purpose | Algorithm | Key size |
|---------|-----------|----------|
| Symmetric encryption | AES-256-GCM | 256 bit |
| Password hashing | Argon2id | use defaults |
| Message authentication | HMAC-SHA256 | 256 bit |
| Digital signatures | Ed25519 | 256 bit |
| Key exchange | X25519 | 256 bit |
| Transport | TLS 1.3 | — |

**Never use:** MD5, SHA1, DES, RC4, ECB mode.
