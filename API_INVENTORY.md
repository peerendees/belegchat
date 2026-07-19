# API_INVENTORY.md — BelegChat

> Externe + interne Schnittstellen. Keine Secrets in dieser Datei.

---

## Externe APIs

| API | Zweck | Auth | Doku |
|-----|-------|------|------|
| Threema Gateway | Nachrichten empfangen/senden | API-Key + Secret | threema-decrypt/DEPLOY.md |
| Mistral AI | OCR + KI-Kontierung | API-Key | n8n-Workflow |
| Supabase | DB + Storage + Edge Functions | Service Role Key | docs/components/db.md |
| n8n Webhook | Beleg-Import-Trigger | IMPORT_API_TOKEN | docs/PDF-IMPORT.md |

## Interne APIs (Next.js API Routes)

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/auth/register` | POST | Passkey-Registrierung |
| `/api/auth/login` | POST | Passkey-Login |
| `/api/auth/session` | GET | Session pruefen |
| `/api/belege` | GET | Belege abrufen (mandantenfiltriert) |

## Edge Functions

| Function | Zweck | Trigger |
|----------|-------|---------|
| `threema-decrypt` | Threema-Nachrichten entschluesseln | Threema Gateway Callback |
