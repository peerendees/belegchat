# Datenbank — BelegChat (Supabase)

> PostgreSQL via Supabase Cloud mit RLS und Storage.

## Projekt

- **Supabase-ID:** `xuqefeewzdvjhuquciut`
- **Zugriff Dashboard:** Pooler-Verbindung (dashboard_service Rolle, ADR-05)

## Kernentitaeten

| Tabelle | Zweck | GoBD |
|---------|-------|------|
| `belege` | Beleg-Metadaten + Kontierung | Hash-Kette, immutable |
| `firmen` | Mandanten / Firmen | — |
| `threema_contacts` | Threema-ID-Zuordnung | — |
| `passkey_credentials` | WebAuthn Public Keys | — |

## GoBD-Sicherung

- SHA-256 Hash-Kette (`hash`, `prev_hash`)
- `created_at` immutable (kein UPDATE erlaubt)
- Kein DELETE auf `belege` (RLS-Policy)

## Storage

- Beleg-Dateien (Fotos, PDFs) in Supabase Storage Buckets
- Bucket-Policy: mandantenfiltriert

## Offene Fragen

- [ ] RLS-Policies finalisieren (Multi-Mandant)
- [ ] Backup-Strategie dokumentieren
