---
tags: [sop, belegchat, dashboard, auth, passkey]
type: sop
project: "[[BelegChat - PMO HUB]]"
erstellt: 2026-07-11
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# SOP: Dashboard-Auth (Threema-ID + Passkey)

> Technik: `belegchat/docs/AUTH.md` · Entscheidung: [[Decisions/ADR-05 Dashboard-Zugriffsmodell]]

## Mandant onboarden

1. Mandant existiert in `mandanten` (`threema_id`, `aktiv = true`)
2. Registrierungscode ausstellen (SQL in `docs/AUTH.md`) und dem Mandanten mitteilen
3. Mandant: `/register` → Threema-ID + Code → Passkey erstellen (Face ID / Touch ID / Sicherheitsschlüssel)
4. Danach: `/login` → Threema-ID → Passkey

## Lokal starten

```bash
cd ~/Entwicklung/projekte/belegchat
node node_modules/next/dist/bin/next dev   # oder npm run dev
# http://localhost:3000 → /login
```

Benötigte `.env.local`-Werte: `DASHBOARD_DB_URL`, `AUTH_SESSION_SECRET`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` (siehe `docs/AUTH.md`).

## Freigabe-Ablauf (Mandant)

1. `/belege` — Liste, Status-Badge (Vorschlag/Geprüft), offene Freigaben im Kopf
2. Beleg öffnen → Daten prüfen, ggf. Sachkonto korrigieren (SKR04-Auswahl)
3. **Beleg freigeben** → Status `geprueft`, GoBD-Festschreibung aktiv
4. Audit-Log am Beleg zeigt jede Aktion (`beleg_freigegeben`, `dokumentation_bestaetigt`, `konto_geaendert`, …)

## Troubleshooting

| Symptom | Ursache / Abhilfe |
|---------|-------------------|
| Redirect-Schleife auf `/login` | Session-Cookie fehlt/abgelaufen (8 h) → neu anmelden |
| „Login nicht möglich" | Threema-ID unbekannt/inaktiv **oder** kein Passkey registriert (bewusst generisch) |
| „Registrierung abgelaufen" | Challenge-Cookie (5 min) abgelaufen → Formular erneut absenden |
| Passkey-Dialog erscheint nicht | Browser ohne WebAuthn oder `WEBAUTHN_RP_ID` ≠ Domain |
| „Beleg ist bereits geprueft" | Festschreibung — Korrekturen nur via Storno/Neuerfassung |
| DB-Fehler `app.mandant_id` | Abfrage lief außerhalb `withMandant` — Code-Fehler, melden |

## Verknüpfungen

- [[Decisions/ADR-05 Dashboard-Zugriffsmodell]]
- [[Research/SOP-PDF-Import]] · [[Research/SOP-Threema-Belegeingang]]
- [[BelegChat - PMO HUB]]
