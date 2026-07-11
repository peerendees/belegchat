#!/usr/bin/env bash
# Second Brain: Owner kunkel, Schreibrechte für hpcn (beide in Gruppe staff).
# Einmalig mit sudo ausführen — danach Vault-Sync ohne sudo möglich.
set -euo pipefail

VAULT="/Users/Shared/Projekte/Entwicklung/projekte/berent-2nd-brain"
OWNER="kunkel"
GROUP="staff"

if [[ "$(id -un)" != "root" ]]; then
  echo "Bitte mit sudo ausführen:"
  echo "  sudo $0"
  exit 1
fi

if [[ ! -d "$VAULT" ]]; then
  echo "Vault nicht gefunden: $VAULT"
  exit 1
fi

echo "→ Owner $OWNER:$GROUP für $VAULT"
chown -R "$OWNER:$GROUP" "$VAULT"

echo "→ Verzeichnisse 775, Dateien 664"
find "$VAULT" -type d -exec chmod 775 {} \;
find "$VAULT" -type f -exec chmod 664 {} \;

# Explizite ACL für hpcn (zusätzlich zur staff-Gruppe)
echo "→ ACL: hpcn read/write/delete"
chmod -R +a "hpcn allow read,write,append,execute,delete,file_inherit,directory_inherit" "$VAULT"

echo "→ git core.filemode false (Permission-Noise vermeiden)"
sudo -u "$OWNER" git -C "$VAULT" config core.filemode false 2>/dev/null || true

echo ""
echo "Fertig. Prüfung:"
ls -led "$VAULT"
ls -la "$VAULT/02 Projekte/" | head -6
echo ""
echo "Vault-Sync (ohne sudo):"
echo "  cp -R belegchat/docs/vault/BelegChat berent-2nd-brain/02\\ Projekte/"
