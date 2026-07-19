# SECURITY.md — BelegChat

> Security-Skelett. Befuellen via `security-architect` (DESIGN-Modus).

---

## Ueberblick

| Aspekt | Status |
|--------|--------|
| Threat Model (STRIDE) | TODO — `security-architect DESIGN` ausfuehren |
| Auth | WebAuthn/Passkey (Phase 3) + Session-JWTs (jose) |
| Secrets Management | `.env.local` lokal, Edge Secrets via Supabase CLI |
| Data at Rest | Supabase Storage + PostgreSQL, GoBD-Hash-Kette |
| Data in Transit | HTTPS (Vercel), E2E-Verschluesselung (Threema) |
| SAST | Semgrep (Layer 2 + 3) |
| SCA | Trivy (ab standard) |
| Secret Scanning | gitleaks (Pre-Commit + CI) |

## Sensitive Paths

Pfade mit Mandatory Human Review — siehe `.claude/sensitive-paths.json`.

## Privacy / DSGVO

Siehe `PRIVACY.md` fuer Datenkategorien und Schutzmassnahmen.

## Compliance / GoBD

- Hash-Kette: SHA-256 ueber Beleg-Metadaten + Vorgaenger-Hash
- Zeitstempel: Server-seitig bei Upload (nicht manipulierbar)
- Unveraenderbarkeit: Keine UPDATE/DELETE auf belege-Tabelle (RLS)
- Verfahrensdokumentation: `docs/Verfahrensdokumentation_BelegChat_v1.0.docx`

## MCP-Server-Vetting

Jeder angebundene MCP-Server braucht einen Vetting-Record unter `docs/mcp-vetting/`.
