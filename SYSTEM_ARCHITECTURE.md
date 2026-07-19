# SYSTEM_ARCHITECTURE.md — BelegChat

> Technische Systemarchitektur. Detaillierte Sicht auf Schichten und Datenfluss.

---

## Schichten

```
┌─────────────────────────────────────┐
│  Presentation Layer                 │
│  Next.js 15 (App Router, RSC)       │
│  Vercel (Production + Preview)      │
├─────────────────────────────────────┤
│  Application Layer                  │
│  API Routes / Server Actions        │
│  Auth (WebAuthn + Session-JWTs)     │
├─────────────────────────────────────┤
│  Integration Layer                  │
│  n8n Workflows (Threema + PDF)      │
│  Edge Functions (threema-decrypt)   │
│  Mistral AI (OCR + Kontierung)      │
├─────────────────────────────────────┤
│  Data Layer                         │
│  Supabase PostgreSQL (RLS)          │
│  Supabase Storage (Beleg-Dateien)   │
│  GoBD Hash-Kette                    │
└─────────────────────────────────────┘
```

## Datenfluss: Beleg-Eingang (Threema)

1. Mandant sendet Foto via Threema an Gateway-ID
2. Threema Gateway ruft Edge Function `threema-decrypt`
3. Edge Function entschluesselt, speichert in Supabase Storage
4. n8n Workflow wird getriggert
5. Mistral OCR extrahiert Belegdaten
6. KI-Kontierung ordnet SKR04-Konten zu
7. Beleg + Kontierung landen in PostgreSQL (mit Hash-Kette)
8. Bestaetigungs-Nachricht an Mandant via Threema

## Datenfluss: Beleg-Eingang (PDF-Batch)

1. PDF-Dateien in Watch-Verzeichnis ablegen
2. CLI-Tool erkennt neue Dateien
3. Upload via n8n-Webhook (IMPORT_API_TOKEN)
4. Ab Schritt 5 wie Threema-Fluss

## Datenfluss: Dashboard

1. Mandant oeffnet Dashboard (app.belegchat.de)
2. Passkey-Login (WebAuthn)
3. Session-JWT wird gesetzt
4. API Routes liefern mandantenfiltrierte Belege (RLS)
