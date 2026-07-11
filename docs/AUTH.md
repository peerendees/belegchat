# Dashboard-Auth: Threema-ID + Passkey (Phase 3, BER-93)

> Stand: 2026-07-11 · Vault: `Decisions/ADR-05 Dashboard-Zugriffsmodell` + `Research/SOP-Dashboard-Auth`

## Auth-Modell

| Komponente | Umsetzung |
|------------|-----------|
| Identität | Threema-ID (= `mandanten.threema_id`) |
| Login | Passkey (WebAuthn, `@simplewebauthn` v13) — keine Passwörter |
| Registrierung | Einmal-Code (SHA-256-Hash in `registrierungs_codes`, 24–48 h gültig; MVP: Admin-Provisioning) |
| Session | Eigenes HS256-JWT (`jose`) im httpOnly-Cookie `belegchat_session`, 8 h |
| Credentials | `mandant_credentials` (credential_id, public_key, counter, transports) |
| Middleware | `src/middleware.ts` schützt `/belege*` → Redirect `/login` |

## DB-Zugriffsmodell (ADR-05)

Der Next.js-Server verbindet sich als Postgres-Rolle **`dashboard_service`**
(Supabase Session-Pooler, `DASHBOARD_DB_URL`) — **ohne** Service-Role-Key und ohne
`BYPASSRLS`:

- Beleg-Daten (`belege`, `beleg_seiten`, `audit_log`) sind per **RLS** auf
  `current_setting('app.mandant_id')` beschränkt. Jede Abfrage läuft über
  `withMandant(session.mandantId, …)` — eine Transaktion, die den Kontext per
  `set_config(…, true)` setzt. Ohne Kontext: 0 Zeilen.
- Schreibrechte sind minimal: `UPDATE` nur auf `status`, `sachkonto`,
  `sachkonto_manuell_geaendert`, `geprueft_am`, `updated_at`; kein `INSERT`/`DELETE`
  auf `belege`. Die GoBD-Festschreibung (Phase-1-Trigger) gilt zusätzlich.
- Auth-Tabellen (`mandanten` lesend, `mandant_credentials`, `registrierungs_codes`)
  sind rollenweit zugänglich (Login läuft vor der Session).
- Die alte Policy `belege_authenticated_lesen` (alle Belege für jeden
  authenticated User) ist entfernt.

## Routen

```
/login, /register                         Client-Seiten (WebAuthn-Ceremony)
/belege, /belege/[id]                     Server Components (Liste, Detail, Audit)
POST /api/auth/register/options|verify    Registrierung (Code → Passkey)
POST /api/auth/login/options|verify       Login
POST /api/auth/logout
POST /api/belege/[id]/freigeben           vorschlag|klaerungsbedarf → geprueft
```

**Freigabe:** optional mit Sachkonto-Korrektur (validiert gegen `skr04_konten`).
Audit: `konto_geaendert` + `status_change` kommen vom DB-Trigger `belege_audit`;
die App schreibt zusätzlich `beleg_freigegeben` + `dokumentation_bestaetigt`.
Ab `geprueft` greift die Festschreibung — weitere Änderungen blockt die DB.

## Konfiguration (`.env.local`)

```
DASHBOARD_DB_URL=postgres://dashboard_service.<ref>:…@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
AUTH_SESSION_SECRET=…          # HS256-Secret für Session + Challenge-Cookies
WEBAUTHN_RP_ID=localhost       # produktiv: app.belegchat.de
WEBAUTHN_ORIGIN=http://localhost:3000
```

## Registrierungscode ausstellen (Admin)

```sql
-- Code würfeln, SHA-256-Hash eintragen:
INSERT INTO registrierungs_codes (mandant_id, code_hash, expires_at)
VALUES ('<mandant-uuid>', encode(digest('123456', 'sha256'), 'hex'), now() + interval '24 hours');
```

Der Klartext-Code geht an den Mandanten (später automatisch via Threema *BERENT2*).

## Offene Punkte (Deployment)

- Vercel: Env-Variablen setzen, `WEBAUTHN_RP_ID`/`ORIGIN` auf die echte Domain
- Code-Versand per Threema statt Admin-Provisioning
- Signed URLs für Beleg-Vorschau (Storage) — bewusst noch nicht im MVP
- PDF-Upload im Dashboard (nutzt den Batch-Webhook aus Phase 2)
