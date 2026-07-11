---
tags: [adr, belegchat, entscheidung, gobd]
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

# ADR-03: GoBD-Härtung in der Datenbank (Trigger statt App-Logik)

## Fragestellung

Wo wird die GoBD-Unveränderbarkeit durchgesetzt — in der Anwendungsschicht (n8n / Dashboard) oder in der Datenbank selbst?

## Entscheidung

**In der Datenbank**, per Migration `post_alpha_gobd_hardening`:

| Baustein | Mechanik |
|----------|----------|
| Zeitstempel | `beleg_seiten.archived_at` (Upload-Zeitpunkt aus Edge `archive-beleg-seite`, Default `now()`) |
| Hash-Eindeutigkeit | Unique-Index `belege (mandant_id, gobd_hash)` + Format-Check `^[0-9a-f]{64}$` (belege + beleg_seiten) |
| Festschreibung | Trigger auf `belege`: ab `geprueft` nur noch `geprueft → exportiert` + Export-Felder; kein DELETE |
| Originale | Trigger auf `beleg_seiten`: kein UPDATE; DELETE nur bei nicht festgeschriebenem Beleg |
| Protokoll | Trigger auf `audit_log`: append-only; neue Aktion `seite_archiviert` (ein Eintrag pro Seite aus n8n) |
| Zugriff | RLS aktiv auf `pending_belege` + `beleg_seiten` (ohne Policies → nur Service Role); offene `audit_insert`-Policy entfernt |

## Begründung

- Trigger wirken für **jeden** Schreibweg (n8n, Edge, künftiges Dashboard, SQL-Konsole) — App-Logik nur für den jeweiligen Kanal
- Service Role bypassed RLS, aber **nicht** Trigger → auch Admin-Fehlbedienung kann festgeschriebene Belege nicht ändern
- Duplikat-Erkennung als Unique-Index ist race-frei (parallel eingehende Threema-Nachrichten)

## Konsequenzen

- Duplikat-Beleg (gleiche Seite 1, gleicher Mandant) → Unique-Violation → n8n-Fehlerzweig meldet dem Mandanten
- Korrektur festgeschriebener Belege nur über Storno/Neuerfassung (Konzept folgt, Phase 3/4)
- Alpha-Migration `alpha_multipage_gobd` nachträglich im Repo versioniert (`threema-decrypt/supabase/migrations/`)
- Mandanten-Policies für Dashboard-User bewusst auf Phase 3 (BER-93) verschoben

## Verknüpfungen

- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Research/SOP-Threema-Belegeingang]]
- GitHub: `belegchat/docs/GOBD.md`, `threema-decrypt/supabase/migrations/`
