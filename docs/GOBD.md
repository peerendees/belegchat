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

## Festschreibung (`trg_belege_festschreibung`, Whitelist ab 23.07.2026)

Ab Status `geprueft`/`exportiert` sind **alle** Spalten eingefroren (Whitelist-Vergleich über
`to_jsonb(OLD/NEW)` minus einer kleinen Positivliste), außer den ausdrücklich freigegebenen:

- **Frei:** Statuswechsel `geprueft → exportiert`; einmaliges Setzen von `datev_export_id`,
  `export_datum`; `updated_at`.
- **Einmalig `NULL → Wert`** (append-only, danach unveränderlich):
  `zahlungsweg`+`gegenkonto` (gemeinsam, BER-116/119), `bu_schluessel` (BER-117/119),
  `gobd_hash`+`bild_storage_path` (gemeinsam, BER-118); `dokument_fehlt` nur `true → false`
  zusammen mit dem Nachreichen des Dokuments.
- **Verboten:** jede andere Änderung; DELETE. Die frühere Blacklist hatte sechs
  exportrelevante Spalten ungeschützt gelassen (`bewirtung_anlass/-teilnehmer`, `trinkgeld`,
  `termin_grund/-ort/-kunde`) — die Whitelist schützt jede bestehende und künftige Spalte
  automatisch.
- Rückwärts-Statuswechsel gibt es nicht. Inhaltliche Korrektur weiterhin nur über Storno/neuen
  Beleg (Konzept, `docs/FEATURE-WUENSCHE.md` F-06); das einmalige Nacherfassen neuer Felder
  (BER-119) und das Nachreichen des Dokuments (BER-118) sind eng gefasste, auditierte Ausnahmen.

`beleg_seiten`: UPDATE generell verboten; DELETE nur solange der zugehörige Beleg **nicht** festgeschrieben ist (damit bleibt das Löschen offener Test-Belege inkl. Kaskade möglich).

`audit_log`: UPDATE/DELETE generell verboten (`trg_audit_log_append_only`). Die frühere Public-INSERT-Policy (`audit_insert`) wurde entfernt.

## Duplikat-Verhalten

Sendet ein Mandant denselben Beleg erneut (Seite 1 identisch), schlägt der INSERT auf `belege` mit Unique-Violation fehl → n8n läuft in den `Fehler melden`-Zweig und der Mandant erhält eine Fehlermeldung. Bewusst so gewählt: kein stilles Verwerfen.

## Export-Fassungen und Inhalts-Hash (BER-121)

`datev_exporte` speichert seit 23.07.2026 den ausgelieferten Dateiinhalt (`datei_inhalt`) samt
SHA-256 (`inhalts_hash`); der Re-Download liefert diese Bytes bitgleich. Der Trigger
`fn_datev_exporte_schutz` macht eine eingefrorene Fassung unveränderlich (kein UPDATE der
Metadaten/des Inhalts, kein DELETE; DB-verifizierbar über
`encode(sha256(datei_inhalt),'hex') = inhalts_hash`).

Eine **Korrekturfassung** (z. B. der nacherfasste 2024-Stapel, BER-119) ist eine neue Zeile mit
`version = n+1`, `wurzel_export_id`/`ersetzt_export_id` und Pflicht-`korrektur_grund`; die
bisherige Fassung wird `ersetzt`, bleibt aber eingefroren abrufbar. Kein stilles Überschreiben.
Einfrier- und Ersetzungs-Ereignisse stehen im append-only `audit_log` (`export_eingefroren`,
`export_ersetzt`).

Bekannte Einschränkung für die **Alt-Erstfassung** (2024, vor BER-121 erzeugt): Ihr Inhalt wird
beim Einfrieren aus den festgeschriebenen Belegen mit `datev_exporte.created_at` als
Header-Zeitstempel regeneriert; die ursprünglich ausgelieferte Datei trug den Erzeugungs-
Zeitstempel und kann im Header-Feld um Sekunden abweichen. Für alle ab BER-121 erzeugten Exporte
sind Header- und DB-Zeitstempel identisch (bitgleiche Auslieferung).

## Offene Punkte (nicht Phase 1)

- Mandanten-RLS-Policies für Dashboard-User → Phase 3 (BER-93); bis dahin liest `belege_authenticated_lesen` für alle authenticated User — es existieren aber noch keine User-Accounts
- Aufbewahrungsfristen / Löschkonzept nach Fristablauf
- BMF-Verfahrensdokumentation
- Storage-Bucket: Objekt-Versionierung/WORM prüfen

## Nachweise / Tests

Siehe PR BER-92: Trigger- und Constraint-Tests (Duplikat, Hash-Format, Update-Sperren) per SQL in Rollback-Transaktion gegen `xuqefeewzdvjhuquciut` ausgeführt.
