---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# OWASP Referenz

## OWASP Top 10:2025

| # | Schwachstelle | Kernmassnahme |
|---|---------------|---------------|
| A01 | Broken Access Control | Deny by Default, serverseitig erzwingen, Ownership pruefen |
| A02 | Security Misconfiguration | Configs haerten, Defaults deaktivieren, Features minimieren |
| A03 | Software Supply Chain Failures | Versionen locken, Integritaet pruefen, Dependencies auditieren |
| A04 | Cryptographic Failures | TLS 1.2+, AES-256-GCM, Argon2/bcrypt fuer Passwoerter |
| A05 | Injection | Parameterized Queries, Input Validation, Safe APIs |
| A06 | Insecure Design | Threat Model, Rate Limiting, Security Controls designen |
| A07 | Auth Failures | MFA, Breached-Password-Check, sichere Sessions |
| A08 | Integrity Failures | Signierte Pakete, SRI fuer CDN, sichere Serialisierung |
| A09 | Security Logging and Alerting Failures | Security Events loggen, strukturiertes Format, Alerting |
| A10 | Mishandling of Exceptional Conditions | Fail-Closed, Internals verbergen, mit Kontext loggen |

## ASVS 5.0 Kurzreferenz

### Level 1 (Alle Anwendungen)
- Passwoerter mindestens 12 Zeichen
- Gegen Breached-Password-Listen pruefen
- Rate Limiting auf Authentifizierung
- Session Tokens 128+ Bit Entropie
- HTTPS ueberall

### Level 2 (Sensible Daten)
- Alle Level-1-Anforderungen plus:
- MFA fuer sensible Operationen
- Kryptographisches Key Management
- Umfassendes Security Logging
- Input Validation auf allen Parametern

### Level 3 (Kritische Systeme)
- Alle Level-1/2-Anforderungen plus:
- Hardware Security Modules fuer Keys
- Threat Modeling Dokumentation
- Advanced Monitoring und Alerting
- Penetration Testing Validierung

## Agentic AI Security (OWASP 2026)

Fuer Systeme mit AI-Agenten (Claude Code, MCP Server, etc.):

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| ASI01 | Goal Hijack — Prompt Injection aendert Agent-Ziele | Input-Sanitisierung, Ziel-Boundaries, Verhaltens-Monitoring |
| ASI02 | Tool Misuse — Tools unbeabsichtigt genutzt | Least Privilege, granulare Berechtigungen, I/O validieren |
| ASI03 | Privilege Abuse — Credential-Eskalation zwischen Agents | Kurzlebige Scoped Tokens, Identity Verification |
| ASI04 | Supply Chain — Kompromittierte Plugins/MCP Server | Signaturen pruefen, Sandbox, Plugin-Allowlist |
| ASI05 | Code Execution — Unsichere Code-Generierung/-Ausfuehrung | Sandbox, statische Analyse, Human Approval |
| ASI06 | Memory Poisoning — Korrumpierte RAG/Kontext-Daten | Gespeicherte Inhalte validieren, nach Trust-Level segmentieren |
| ASI07 | Agent Comms — Spoofing zwischen Agents | Authentifizieren, verschluesseln, Nachrichten-Integritaet |
| ASI08 | Cascading Failures — Fehler pflanzen sich fort | Circuit Breakers, Graceful Degradation, Isolation |
| ASI09 | Trust Exploitation — Social Engineering via AI | AI-Inhalte labeln, User Education, Verifikationsschritte |
| ASI10 | Rogue Agents — Kompromittierte Agents agieren boesartig | Verhaltens-Monitoring, Kill Switches, Anomalie-Erkennung |

### Agent Security Checkliste

- [ ] Alle Agent-Inputs sanitisiert und validiert
- [ ] Tools arbeiten mit minimalen Berechtigungen
- [ ] Credentials kurzlebig und scoped
- [ ] Third-Party Plugins verifiziert und sandboxed
- [ ] Code-Ausfuehrung in isolierter Umgebung
- [ ] Agent-Kommunikation authentifiziert und verschluesselt
- [ ] Circuit Breakers zwischen Agent-Komponenten
- [ ] Human Approval fuer sensible Operationen
- [ ] Verhaltens-Monitoring fuer Anomalie-Erkennung
- [ ] Kill Switch fuer Agent-Systeme verfuegbar
