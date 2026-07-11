---
type: sop
project: "[[BelegChat - PMO HUB]]"
status: aktiv
erstellt: 2026-07-10
aktualisiert: 2026-07-11
tags: [sop, belegchat, n8n, threema, ops, gobd]
source: claude
chat_url: unbekannt
---

# SOP: Threema-Belegeingang (BelegChat)

> **Zweck:** Beleg per Threema verarbeiten, Mehrseiten per Scan + „Fertig“, GoBD-konforme Ablage.  
> **Stand:** 2026-07-11 — Alpha E2E grün.

## Architektur

```
Threema → Webhook → Signatur → Mandant → Entschlüsseln → Prüfe Inhalt
  → Pending laden → Routing
  → [Bild] Seite archivieren (Storage+Hash) → Rückfrage
  → [weiteres Foto] nächste Seite archivieren → Rückfrage
  → [Fertig] OCR aller Seiten → KI → belege + beleg_seiten + audit_log
```

## Mehrseiten-UX (Mandant)

Nach jeder erfassten Seite:

> **Scanne eine weitere Seite oder antworte mit Fertig.**

| Eingabe | Aktion |
|---------|--------|
| weiteres Foto | nächste Seite archivieren, erneute Rückfrage |
| `Fertig` (Groß/Klein egal) | OCR über alle Seiten, Beleg anlegen, Bestätigung |
| anderes | erneute Rückfrage |

## Threema-Gateways (Antwort-Routing)

| Phase | Gateway | `from` / Secret |
|-------|---------|-----------------|
| Dialog (Rückfrage, Fehler, Text ignorieren) | **\*BERENT2** (E2E) | `send_e2e` via Edge Function `action: send` — **nicht** `send_simple` |
| Abschluss (Beleg erfasst, OCR fertig) | **\*BERENT1** | `send_simple` per POST-Form (`threemaFrom` / `secret1`) |

Eingehende Belegfotos kommen über E2E — der Dialog muss auf demselben Kanal antworten. `send_simple` von \*BERENT2 liefert HTTP 400.

**Wichtig:** Der Mandant sieht Dialog und Abschluss in **zwei verschiedenen Threema-Chats** (*BERENT2* vs. *BERENT1*).

## Troubleshooting

| Symptom | Ursache | Fix |
|---------|---------|-----|
| HTTP 400 „Threema Ungültig“ bei Dialog | `send_simple` mit *BERENT2* | Edge `action: send` (E2E) nutzen |
| Abgeschnittene Dialogtexte (endet bei `.`) | Fehlendes PKCS7-Padding beim Senden | `padThreemaInnerMessage()` in Edge Function |
| `Fertig` wird nicht erkannt | PKCS7-Restbytes + Text-Typ `0x01`/`0x02` | `stripPkcs7` in `Prüfe Inhalt`, `startsWith('fertig')` |
| Endlosschleife / doppelte Nachrichten | Leere `box`-Delivery-Callbacks | Routing → Stille ignorieren (kein erneuter Send) |
| JSON Body not valid JSON (n8n) | Array im JSON-Body (n8n 2.x) | Raw-Body als Objekt `{ rows: [...] }` |
| Kein Abschluss-Push | Falscher Gateway oder Body-Format | *BERENT1* + `send_simple` form-urlencoded |
| Bild statt Text ignoriert | `bild_unerwartet` auf Stille | Hinweis via `Threema Ungültig` (E2E) |

Patch-Skripte (Referenz): `projekte/n8n-workflows/scripts/fix-*.mjs`

## GoBD-Schritte (Alpha)

1. **Jede Seite sofort** unverändert in `belege-archiv` (kein Überschreiben)
2. **SHA-256** → `gobd_hash` pro Seite in `beleg_seiten`
3. **`belege.bild_storage_path`** = Pfad Seite 1; **`belege.gobd_hash`** = Hash Seite 1 (Referenz)
4. **`audit_log`**: `beleg_erfasst` bei Insert
5. OCR/KI = abgeleitete Schicht, nicht Originalersatz

## Voraussetzungen

| Check | Wo |
|-------|-----|
| Workflow aktiv | n8n |
| `DECRYPT_API_TOKEN` | Supabase Secrets = n8n env |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Secrets |
| `MISTRAL_API_KEY` | Supabase Edge Secrets |
| Tabelle `pending_belege`, `beleg_seiten` | Migration angewendet |

## SQL-Schnellcheck

```sql
SELECT beleg_nr, gobd_hash, bild_storage_path, status, created_at
FROM public.belege ORDER BY created_at DESC LIMIT 1;

SELECT * FROM public.beleg_seiten WHERE beleg_id = (
  SELECT id FROM public.belege ORDER BY created_at DESC LIMIT 1
);

SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 3;
```

## Deploy

```bash
cd threema-decrypt
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref xuqefeewzdvjhuquciut
supabase functions deploy threema-decrypt --project-ref xuqefeewzdvjhuquciut --no-verify-jwt
```

Workflow-JSON live per n8n API oder importieren aus  
`n8n-workflows/n8n/MYpHUIHNMuIUR1ic/BelegChat mit Threema Beleg-Eingang.json` → Replace → Active.

## Referenzen

- Workflow-ID: `MYpHUIHNMuIUR1ic`
- [[Decisions/ADR-02 Mehrseiten-Fertig-UX]]
- [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded)
- [[Research/Post-Alpha-Roadmap]]
