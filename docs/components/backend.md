# Backend — BelegChat API Routes

> Next.js API Routes und Server Actions.

## Stack

- Next.js 15 API Routes
- jose (JWT Session-Management)
- @simplewebauthn/server (Passkey-Verifikation)
- postgres (Supabase Pooler-Verbindung)

## Status

Phase 3 — Auth-Routes gebaut.

## Architektur

- `/api/auth/register` — Passkey-Registrierung
- `/api/auth/login` — Passkey-Login
- `/api/auth/session` — Session-Pruefung
- `/api/belege` — Beleg-Abfrage (mandantenfiltriert)
- Dashboard-Service-Rolle via Supabase Pooler (ADR-05)

## Offene Fragen

- [ ] RLS-Finalisierung
- [ ] DATEV-Export-Route (Phase 4)
