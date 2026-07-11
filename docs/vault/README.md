# BelegChat → Second Brain Import

Diese Dateien sind für `berent-2nd-brain/02 Projekte/BelegChat/` vorbereitet.

## Rechte-Modell (Second Brain)

| Rolle | User | Rechte |
|-------|------|--------|
| **Owner** | `kunkel` | Lesen, Schreiben, Löschen |
| **Mitbearbeiter** | `hpcn` | Schreiben (Gruppe `staff` + ACL) |

Einmalig einrichten (Passwort für sudo):

```bash
sudo /Users/Shared/Entwicklung/projekte/belegchat/scripts/set-2nd-brain-permissions.sh
```

Danach Sync **ohne** sudo.

## Vault kopieren

```bash
cp -R "/Users/Shared/Entwicklung/projekte/belegchat/docs/vault/BelegChat" \
  "/Users/Shared/Entwicklung/projekte/berent-2nd-brain/02 Projekte/"
```

Daily Notes separat:

```bash
cp "/Users/Shared/Entwicklung/projekte/belegchat/docs/vault/05 Daily Notes/2026-07-11.md" \
  "/Users/Shared/Entwicklung/projekte/berent-2nd-brain/05 Daily Notes/"
```

Danach in Obsidian öffnen und Wikilinks prüfen.
