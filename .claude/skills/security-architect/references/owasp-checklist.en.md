---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# OWASP Reference

## OWASP Top 10:2025

| # | Vulnerability | Core mitigation |
|---|---------------|-----------------|
| A01 | Broken Access Control | Deny by default, enforce server-side, check ownership |
| A02 | Security Misconfiguration | Harden configs, disable defaults, minimize features |
| A03 | Software Supply Chain Failures | Lock versions, verify integrity, audit dependencies |
| A04 | Cryptographic Failures | TLS 1.2+, AES-256-GCM, Argon2/bcrypt for passwords |
| A05 | Injection | Parameterized queries, input validation, safe APIs |
| A06 | Insecure Design | Threat model, rate limiting, design security controls |
| A07 | Auth Failures | MFA, breached-password check, secure sessions |
| A08 | Integrity Failures | Signed packages, SRI for CDN, safe serialization |
| A09 | Security Logging and Alerting Failures | Log security events, structured format, alerting |
| A10 | Mishandling of Exceptional Conditions | Fail closed, hide internals, log with context |

## ASVS 5.0 quick reference

### Level 1 (all applications)
- Passwords at least 12 characters
- Check against breached-password lists
- Rate limiting on authentication
- Session tokens with 128+ bit entropy
- HTTPS everywhere

### Level 2 (sensitive data)
- All level-1 requirements plus:
- MFA for sensitive operations
- Cryptographic key management
- Comprehensive security logging
- Input validation on every parameter

### Level 3 (critical systems)
- All level-1/2 requirements plus:
- Hardware security modules for keys
- Threat modeling documentation
- Advanced monitoring and alerting
- Penetration testing validation

## Agentic AI Security (OWASP 2026)

For systems with AI agents (Claude Code, MCP servers, etc.):

| Risk | Description | Countermeasure |
|------|-------------|----------------|
| ASI01 | Goal hijack — prompt injection changes agent goals | Input sanitization, goal boundaries, behavior monitoring |
| ASI02 | Tool misuse — tools used unintentionally | Least privilege, granular permissions, validate I/O |
| ASI03 | Privilege abuse — credential escalation between agents | Short-lived scoped tokens, identity verification |
| ASI04 | Supply chain — compromised plugins / MCP servers | Signature checks, sandbox, plugin allowlist |
| ASI05 | Code execution — unsafe code generation/execution | Sandbox, static analysis, human approval |
| ASI06 | Memory poisoning — corrupted RAG / context data | Validate stored content, segment by trust level |
| ASI07 | Agent comms — spoofing between agents | Authenticate, encrypt, message integrity |
| ASI08 | Cascading failures — errors propagate | Circuit breakers, graceful degradation, isolation |
| ASI09 | Trust exploitation — social engineering via AI | Label AI content, user education, verification steps |
| ASI10 | Rogue agents — compromised agents act maliciously | Behavior monitoring, kill switches, anomaly detection |

### Agent security checklist

- [ ] All agent inputs sanitized and validated
- [ ] Tools operate with minimum permissions
- [ ] Credentials short-lived and scoped
- [ ] Third-party plugins verified and sandboxed
- [ ] Code execution in isolated environment
- [ ] Agent communication authenticated and encrypted
- [ ] Circuit breakers between agent components
- [ ] Human approval for sensitive operations
- [ ] Behavior monitoring for anomaly detection
- [ ] Kill switch available for agent systems
