# GoBD — Technische Umsetzung (Phase 1, BER-92)

> Stand: 2026-07-11 · Migration `post_alpha_gobd_hardening` · Vault: `Decisions/ADR-03 GoBD-Härtung DB`

Dieses Dokument beschreibt die **technische** GoBD-Grundlage von BelegChat.
Die formale BMF-Verfahrensdokumentation ist nicht Teil von Phase 1.

---

## Überblick

| GoBD-Anforderung | Umsetzung |
|------------------|-----------|
| Unveränderbarkeit Original | `beleg_seiten` (Storage `belege-archiv`, `x-upsert: false`) + DB-Trigger: kein UPDATE, kein DELETE bei festgeschriebenem Beleg |
| Unveränderbarkeit Beleg | Trigger `trg_belege_festschreibung`: ab Status `geprueft` sind alle GoBD-relevanten Felder eingefroren |
| Zeitstempel | `beleg_seiten.archived_at` = Upload-Zeitpunkt (Edge-Action `archive-beleg-seite`) |
| Integrität | SHA-256 pro Seite (`beleg_seiten.gobd_hash`) und pro Beleg (`belege.gobd_hash` = Hash Seite 1), Format-Constraint `^[0-9a-f]{64}$` |
| Duplikat-Schutz | Unique-Index `idx_belege_mandant_gobd_hash` auf `belege (mandant_id, gobd_hash)` |
| Protokollierung | `audit_log` append-only (Trigger), Aktionen `erstellt` + `seite_archiviert` pro Seite aus n8n |
| Zugriffsschutz | RLS aktiv auf `belege`, `beleg_seiten`, `pending_belege`; Schreibzugriff nur Service Role (n8n, Edge) |

---

## Datenfluss Zeitstempel (`archived_at`)

```
Edge archive-beleg-seite          → Response enthält archivedAt (Upload-Zeitpunkt)
n8n „Pending Body"                → Seiten-Objekt mit archived_at in pending_belege.seiten
n8n „Beleg-Seiten speichern"      → INSERT beleg_seiten inkl. archived_at
```

Fallback: Spalten-Default `now()`, falls `archived_at` im Insert fehlt (ältere Pending-Einträge).

## Festschreibung (`trg_belege_festschreibung`)

Ab Status `geprueft`:

- **Erlaubt:** Statuswechsel `geprueft → exportiert`, Setzen von `datev_export_id`, `export_datum`, `updated_at`
- **Verboten:** jede Änderung an Beträgen, Datum, Sachkonto, Hash, Storage-Pfad usw.; DELETE
- Rückwärts-Statuswechsel gibt es nicht — Korrektur nur über Storno/neuen Beleg (Konzept Phase 3/4)

`beleg_seiten`: UPDATE generell verboten; DELETE nur solange der zugehörige Beleg **nicht** festgeschrieben ist (damit bleibt das Löschen offener Test-Belege inkl. Kaskade möglich).

`audit_log`: UPDATE/DELETE generell verboten (`trg_audit_log_append_only`). Die frühere Public-INSERT-Policy (`audit_insert`) wurde entfernt.

## Duplikat-Verhalten

Sendet ein Mandant denselben Beleg erneut (Seite 1 identisch), schlägt der INSERT auf `belege` mit Unique-Violation fehl → n8n läuft in den `Fehler melden`-Zweig und der Mandant erhält eine Fehlermeldung. Bewusst so gewählt: kein stilles Verwerfen.

## Offene Punkte (nicht Phase 1)

- Mandanten-RLS-Policies für Dashboard-User → Phase 3 (BER-93); bis dahin liest `belege_authenticated_lesen` für alle authenticated User — es existieren aber noch keine User-Accounts
- Aufbewahrungsfristen / Löschkonzept nach Fristablauf
- BMF-Verfahrensdokumentation
- Storage-Bucket: Objekt-Versionierung/WORM prüfen

## Nachweise / Tests

Siehe PR BER-92: Trigger- und Constraint-Tests (Duplikat, Hash-Format, Update-Sperren) per SQL in Rollback-Transaktion gegen `xuqefeewzdvjhuquciut` ausgeführt.
