# Pfad-Migration: Shared → ~/Entwicklung

> **Stand:** 2026-07-11  
> **Prinzip:** Alles unter **kunkel** — einmalig **admin + sudo**, danach kein Benutzerwechsel.

## Zwei Schritte

### Schritt 1 — Ownership (einmalig, als `admin`)

```bash
su admin
sudo /Users/Shared/Projekte/Entwicklung/projekte/belegchat/scripts/fix-shared-ownership.sh
exit
```

Setzt Owner `kunkel:staff` auf:

- `/Users/Shared/Projekte/Entwicklung/projekte`
- `/Users/Shared/Entwicklung/n8n-workflows`
- `/Users/Shared/Projekte/Entwicklung` (+ `Projekte/`)

`hpcn` behält Schreibzugriff via Gruppe `staff` + ACL.

### Schritt 2 — Migration (als `kunkel`, ohne sudo)

```bash
cd /Users/Shared/Projekte/Entwicklung/projekte/belegchat
./scripts/migrate-to-home-entwicklung.sh --dry-run
./scripts/migrate-to-home-entwicklung.sh --yes --remove-stub --fix-permissions
```

Verschiebt per `mv` nach `~/Entwicklung/projekte/` (= `/Users/Shared/Projekte/Entwicklung/Projekte/`).

## Warum admin nötig war

| Problem | Lösung |
|---------|--------|
| `/Users/Shared/Projekte/Entwicklung/projekte` gehörte `hpcn` | `chown kunkel:staff` via admin |
| kunkel nicht in admin-Gruppe → kein sudo | `su admin` + `sudo fix-shared-ownership.sh` |
| `mv` braucht Schreibrecht im Parent | Nach Schritt 1 erledigt |

**Kein** Benutzerwechsel zu hpcn, **kein** Copy-Workaround.

## Ziel-Layout

```
~/Entwicklung/projekte/          # Owner kunkel
├── belegchat/
├── threema-decrypt/
├── n8n-workflows/
└── berent-2nd-brain/
```

## n8n-Duplikate (nach Migration)

Alte Kopien manuell prüfen/löschen:

- `/Users/Shared/Entwicklung/n8n-workflows` (nach fix-shared-ownership auch kunkel)
- `/Users/Shared/n8n-workflows` (Symlink-Ziel)

Kanonisch: `~/Entwicklung/projekte/n8n-workflows`

## DoD Phase 0

- [ ] `fix-shared-ownership.sh` ausgeführt
- [ ] Stack unter `~/Entwicklung/projekte/`
- [ ] Claude Code / Cursor am neuen Pfad
