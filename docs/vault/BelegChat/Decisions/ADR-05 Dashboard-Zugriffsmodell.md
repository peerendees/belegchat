---
tags: [adr, belegchat, entscheidung, auth, dashboard]
type: entscheidung
project: "[[BelegChat - PMO HUB]]"
status: entschieden
erstellt: 2026-07-11
entschieden_am: 2026-07-11
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# ADR-05: Dashboard-Zugriff über dedizierte DB-Rolle statt Service-Key

## Fragestellung

Wie greift das Next.js-Dashboard auf Supabase zu — und wo wird die Mandanten-Isolation durchgesetzt?

## Entscheidung

**Eigene Postgres-Rolle `dashboard_service`** (Session-Pooler, kein `BYPASSRLS`) statt Supabase Service-Role-Key:

| Aspekt | Umsetzung |
|--------|-----------|
| Isolation | RLS-Policies auf `current_setting('app.mandant_id')`; App setzt den Kontext pro Request via `set_config` in einer Transaktion (`withMandant`) |
| Rechte | Minimal: Belege lesen + `UPDATE` auf 5 Spalten; kein INSERT/DELETE; Audit nur INSERT/SELECT |
| Session | Eigenes HS256-JWT (httpOnly-Cookie), Login per WebAuthn/Passkey gegen `mandant_credentials` |
| Registrierung | Einmal-Code (Hash in `registrierungs_codes`), MVP Admin-Provisioning |

## Begründung

- **Kein Service-Role-Key im App-Server:** Der Key wäre Full-Access auf alles (Security-No-Go Nr. 1); die Rolle kann nur, was das Dashboard braucht — selbst bei Kompromittierung des Servers bleibt die GoBD-Festschreibung (Trigger) und das Rechte-Minimum bestehen.
- **Isolation in der DB, nicht in App-Code:** `mandant_id`-Filter können in Queries vergessen werden — RLS nicht. Test: ohne Kontext 0 Zeilen, BUMFMZ39 38, VDUZ9S7E 4, Kreuzzugriff 404.
- Der Plan-Ansatz `auth.jwt()->>'mandant_id'` hätte das Supabase-JWT-Secret im App-Server erfordert (nicht verfügbar, gleiche Key-Problematik); `current_setting` erreicht dasselbe DB-seitig.

## Konsequenzen

- `DASHBOARD_DB_URL` (Pooler `aws-1-eu-west-1`, Port 5432) + `AUTH_SESSION_SECRET` in `.env.local` bzw. Vercel-Env
- Rollen-Passwort wird per `ALTER ROLE` gesetzt — nie in Migrationen
- Audit: `konto_geaendert`/`status_change` schreibt der bestehende DB-Trigger `belege_audit`; App ergänzt `beleg_freigegeben` + `dokumentation_bestaetigt`
- Policy `belege_authenticated_lesen` (Catch-all) entfernt

## Verknüpfungen

- [[Decisions/ADR-03 GoBD-Härtung DB]]
- [[Research/SOP-Dashboard-Auth]]
- GitHub: `belegchat/docs/AUTH.md`, Migration `20260711135520_phase3_dashboard_auth`
