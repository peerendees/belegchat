---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Threat Modeling — Detail-Referenz

## STRIDE per Element Matrix

| DFD-Element | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|-------------|----------|-----------|-------------|-----------------|-----|-----------|
| Externer Akteur | X | | X | | | |
| Prozess | X | X | X | X | X | X |
| Datenspeicher | | X | X | X | X | |
| Datenfluss | | X | | X | X | |

## DREAD Scoring

Jede Bedrohung auf 1-10 bewerten:

| Kriterium | 1-3 (Niedrig) | 4-6 (Mittel) | 7-10 (Hoch) |
|-----------|---------------|--------------|-------------|
| Damage | Minimaler Impact | Teilweiser Datenverlust | Vollstaendige Kompromittierung |
| Reproducibility | Schwer, Timing-abhaengig | Mit Aufwand reproduzierbar | Jedes Mal reproduzierbar |
| Exploitability | Erfordert Experten + Tools | Erfordert etwas Skill | Script-Kiddie-Level |
| Affected Users | Einzelner Nutzer | Teilmenge der Nutzer | Alle Nutzer |
| Discoverability | Nicht oeffentlich bekannt | Mit Aufwand findbar | Automatisch auffindbar |

**Risiko-Score** = Durchschnitt aller 5 Werte. Ab 7.0 = Kritisch, ab 5.0 = Hoch.

## Authentication Pattern Auswahl

| Anwendungsfall | Empfohlenes Pattern |
|----------------|---------------------|
| Web-Anwendung | OAuth 2.0 + PKCE mit OIDC |
| API-Authentifizierung | JWT mit kurzer Laufzeit (15 Min) + Refresh Token |
| Service-zu-Service | mTLS mit Zertifikat-Rotation |
| CLI/Automation | API Keys mit IP-Allowlisting |
| Hohe Sicherheit | FIDO2/WebAuthn Hardware-Keys |

## Defense-in-Depth Schichten

```
Schicht 1: PERIMETER
  WAF, DDoS-Schutz, DNS-Filterung, Rate Limiting

Schicht 2: NETZWERK
  Segmentierung, IDS/IPS, Netzwerk-Monitoring, VPN, mTLS

Schicht 3: HOST
  Endpoint Protection, OS-Haertung, Patching, Logging

Schicht 4: APPLIKATION
  Input Validation, Authentifizierung, Secure Coding, SAST

Schicht 5: DATEN
  Verschluesselung at rest/in transit, Zugriffskontrollen, Backup
```

## Zero Trust Prinzipien

1. **Verify Explicitly** — Jeden Request authentifizieren und autorisieren
2. **Least Privilege** — Just-in-Time und Just-Enough-Access
3. **Assume Breach** — Segmentieren, monitoren, Blast Radius minimieren

## Kryptografie-Auswahl

| Einsatzzweck | Algorithmus | Schluesselgroesse |
|-------------|-------------|-------------------|
| Symmetrische Verschluesselung | AES-256-GCM | 256 Bit |
| Passwort-Hashing | Argon2id | Defaults verwenden |
| Message Authentication | HMAC-SHA256 | 256 Bit |
| Digitale Signaturen | Ed25519 | 256 Bit |
| Key Exchange | X25519 | 256 Bit |
| Transport | TLS 1.3 | — |

**Niemals verwenden:** MD5, SHA1, DES, RC4, ECB-Modus.
