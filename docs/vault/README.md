# BelegChat → Second Brain Import

Diese Dateien sind für `berent-2nd-brain/02 Projekte/BelegChat/` vorbereitet.

## Rechte-Modell (Second Brain)

| Rolle | User | Rechte |
|-------|------|--------|
| **Owner** | `kunkel` | Lesen, Schreiben, Löschen |
| **Mitbearbeiter** | `hpcn` | Schreiben (Gruppe `staff` + ACL) |

Einmalig einrichten (Passwort für sudo):

```bash
sudo /Users/Shared/Projekte/Entwicklung/Projekte/belegchat/scripts/set-2nd-brain-permissions.sh
```

Danach Sync **ohne** sudo.

## Pfade

> Korrigiert am 08.08.2026 — die frühere Fassung zeigte noch auf
> `Projekte/Entwicklung/projekte/berent-2nd-brain`, also auf den Stand vor der
> Pfad-Migration (BER-94). Maßgeblich ist `paths.obsidian_vault` in
> `.claude/environment.json`.

| Rolle | Pfad |
|---|---|
| Projekt (Staging) | `/Users/Shared/Projekte/Entwicklung/Projekte/belegchat/docs/vault/` |
| Second Brain (Ziel) | `/Users/kunkel/BERENT-2nd-Brain/` |

## Vault kopieren

```bash
cp -R "/Users/Shared/Projekte/Entwicklung/Projekte/belegchat/docs/vault/BelegChat" "/Users/kunkel/BERENT-2nd-Brain/02 Projekte/"
```

Daily Notes separat (Beispiel):

```bash
cp "/Users/Shared/Projekte/Entwicklung/Projekte/belegchat/docs/vault/05 Daily Notes/2026-08-08.md" "/Users/kunkel/BERENT-2nd-Brain/05 Daily Notes/"
```

Danach in Obsidian öffnen und Wikilinks prüfen.

## Richtung des Syncs

Staging → Second Brain, **nie zurück**. Wird im Vault direkt editiert, geht die Änderung
beim nächsten `cp -R` verloren. Der Ordner `Archive/` und `Components/` existieren nur im
Vault und werden vom Kopieren nicht berührt.
