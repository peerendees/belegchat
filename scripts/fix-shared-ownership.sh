#!/usr/bin/env bash
# Einmalig als admin/root ausführen — setzt Owner kunkel auf Shared-Entwicklung.
#
#   su admin
#   sudo /Users/Shared/Projekte/Entwicklung/projekte/belegchat/scripts/fix-shared-ownership.sh
#
# Danach als kunkel: migrate-to-home-entwicklung.sh (ohne Benutzerwechsel)
#
set -euo pipefail

OWNER="kunkel"
GROUP="staff"

PATHS=(
  "/Users/Shared/Projekte/Entwicklung/projekte"
  "/Users/Shared/Entwicklung/n8n-workflows"
  "/Users/Shared/Projekte/Entwicklung"
  "/Users/Shared/Projekte/Entwicklung/Projekte"
)

if [[ "$(id -un)" != "root" ]]; then
  echo "✗ Muss als root laufen. Als admin:" >&2
  echo "  su admin" >&2
  echo "  sudo $0" >&2
  exit 1
fi

echo "=== Ownership → ${OWNER}:${GROUP} ==="
echo ""

for base in "${PATHS[@]}"; do
  [[ -e "$base" ]] || { echo "⊘ übersprungen (fehlt): $base"; continue; }
  echo "→ chown -R ${OWNER}:${GROUP} $base"
  chown -R "${OWNER}:${GROUP}" "$base"

  echo "→ chmod: Verzeichnisse 775, Dateien 664, SetGID"
  find "$base" -type d -exec chmod 775 {} \;
  find "$base" -type f -exec chmod 664 {} \;
  find "$base" -type d -exec chmod g+s {} \;
  # Shell-Skripte ausführbar halten
  find "$base" -type f \( -name '*.sh' -o -path '*/.git/hooks/*' \) -exec chmod 775 {} \; 2>/dev/null || true

  # hpcn weiterhin Schreibzugriff (staff + explizite ACL)
  if id hpcn &>/dev/null; then
    echo "→ ACL hpcn auf $base"
    chmod -R +a "hpcn allow read,write,append,execute,delete,file_inherit,directory_inherit" "$base" 2>/dev/null || true
  fi

  # git: Permission-Noise vermeiden
  if [[ -d "$base/.git" ]]; then
    sudo -u "$OWNER" git -C "$base" config core.filemode false 2>/dev/null || true
  fi
  # git in Unterrepos
  while IFS= read -r -d '' gitdir; do
    repo="${gitdir%/.git}"
    sudo -u "$OWNER" git -C "$repo" config core.filemode false 2>/dev/null || true
  done < <(find "$base" -name .git -type d -print0 2>/dev/null)

  echo "✓ $base"
  echo ""
done

echo "=== Prüfung ==="
ls -led /Users/Shared/Projekte/Entwicklung/projekte
ls -la /Users/Shared/Projekte/Entwicklung/projekte/ | head -8
echo ""
echo "Fertig. Als kunkel:"
echo "  cd /Users/Shared/Projekte/Entwicklung/projekte/belegchat"
echo "  ./scripts/migrate-to-home-entwicklung.sh --yes --remove-stub --fix-permissions"
echo ""
