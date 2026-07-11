#!/usr/bin/env bash
# BelegChat-Stack: Shared/Entwicklung/projekte → ~/Entwicklung/projekte
#
# Voraussetzung (einmalig als admin):
#   su admin
#   sudo .../scripts/fix-shared-ownership.sh
#
# Dann als kunkel:
#   ./scripts/migrate-to-home-entwicklung.sh --yes --remove-stub --fix-permissions
#
set -euo pipefail

SOURCE_ROOT="/Users/Shared/Projekte/Entwicklung/projekte"
STACK_DIRS=(belegchat threema-decrypt n8n-workflows berent-2nd-brain)
OLD_PREFIX="/Users/Shared/Projekte/Entwicklung/projekte"

DRY_RUN=0
ASSUME_YES=0
REMOVE_STUB=0
UPDATE_PATHS=1
FIX_PERMISSIONS=0

RUN_AS_USER="$(id -un)"
DEST_ROOT="/Users/${RUN_AS_USER}/Entwicklung/projekte"

if [[ "$(id -un)" == "root" ]]; then
  echo "✗ Nicht als root. Als kunkel ausführen." >&2
  exit 1
fi

usage() {
  cat <<EOF
migrate-to-home-entwicklung.sh

User: ${RUN_AS_USER}
Von:  ${SOURCE_ROOT}
Nach: ${DEST_ROOT}

Voraussetzung: fix-shared-ownership.sh (einmalig via su admin + sudo)

Optionen:
  --dry-run          Vorschau
  --yes, -y          Ohne Rückfragen
  --remove-stub      belegchat-project im Ziel löschen
  --no-update-paths  Pfade nicht ersetzen
  --fix-permissions  g+rwX auf Ziel
  -h, --help

  ./scripts/migrate-to-home-entwicklung.sh --yes --remove-stub --fix-permissions
EOF
}

log()  { echo "→ $*"; }
warn() { echo "⚠ $*" >&2; }
die()  { echo "✗ $*" >&2; exit 1; }

confirm() {
  local msg="$1"
  [[ "$ASSUME_YES" -eq 1 ]] && return 0
  read -r -p "${msg} [j/N] " ans
  [[ "${ans,,}" == "j" || "${ans,,}" == "ja" || "${ans,,}" == "y" || "${ans,,}" == "yes" ]]
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then echo "[dry-run] $*"; else log "$*"; eval "$@"; fi
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --remove-stub) REMOVE_STUB=1 ;;
    --no-update-paths) UPDATE_PATHS=0 ;;
    --fix-permissions) FIX_PERMISSIONS=1 ;;
    -h|--help) usage; exit 0 ;;
    --copy|--symlinks|--symlinks-only)
      die "Option $arg entfernt — zuerst fix-shared-ownership.sh (admin), dann mv als kunkel."
      ;;
    *) die "Unbekannte Option: $arg" ;;
  esac
done

[[ -d "$SOURCE_ROOT" ]] || die "Quelle fehlt: $SOURCE_ROOT"
mkdir -p "$DEST_ROOT" || die "Ziel nicht anlegbar: $DEST_ROOT"

if [[ ! -w "$SOURCE_ROOT" ]]; then
  die "Kein Schreibrecht auf ${SOURCE_ROOT}. Einmalig als admin:
  su admin
  sudo $(dirname "$0")/fix-shared-ownership.sh"
fi

NEW_PREFIX="$(cd "$DEST_ROOT" && pwd -P)"

echo ""
echo "=== Pfad-Migration BelegChat-Stack ==="
echo "User:   ${RUN_AS_USER}"
echo "Quelle: $SOURCE_ROOT"
echo "Ziel:   $NEW_PREFIX"
echo "Modus:  mv"
[[ "$DRY_RUN" -eq 1 ]] && echo "(dry-run)"
echo ""

for name in "${STACK_DIRS[@]}"; do
  src="${SOURCE_ROOT}/${name}"
  [[ -d "$src/.git" ]] && [[ -n "$(git -C "$src" status --porcelain 2>/dev/null)" ]] && \
    warn "Uncommittete Änderungen: $src"
done

confirm "BelegChat-Stack nach ${NEW_PREFIX} verschieben?" || die "Abgebrochen."

for name in "${STACK_DIRS[@]}"; do
  src="${SOURCE_ROOT}/${name}"
  dst="${DEST_ROOT}/${name}"
  [[ -d "$src" ]] || { warn "Überspringe: $name"; continue; }
  [[ -e "$dst" ]] && die "Ziel existiert: $dst (evtl. --remove-stub für belegchat-project)"
  run "mv $(printf '%q' "$src") $(printf '%q' "$dst")"
done

STUB="${DEST_ROOT}/belegchat-project"
if [[ "$REMOVE_STUB" -eq 1 && -d "$STUB" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] rm -rf $STUB"
  elif [[ "$ASSUME_YES" -eq 1 ]] || confirm "Stub löschen: $STUB ?"; then
    run "rm -rf $(printf '%q' "$STUB")"
  fi
fi

if [[ "$UPDATE_PATHS" -eq 1 ]]; then
  for name in "${STACK_DIRS[@]}"; do
    root="${DEST_ROOT}/${name}"
    [[ -d "$root" ]] || continue
    count=0
    while IFS= read -r -d '' f; do
      if grep -qF "$OLD_PREFIX" "$f" 2>/dev/null; then
        [[ "$DRY_RUN" -eq 1 ]] && echo "[dry-run] sed: $f" || sed -i '' "s|${OLD_PREFIX}|${NEW_PREFIX}|g" "$f"
        count=$((count + 1))
      fi
    done < <(find "$root" -type f \( -name '*.md' -o -name '*.sh' -o -name '*.mjs' -o -name '*.ts' -o -name '*.json' \) \
      ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/*' -print0 2>/dev/null)
    log "Pfade: ${count} Dateien in $name"
  done
fi

if [[ "$FIX_PERMISSIONS" -eq 1 ]]; then
  for name in "${STACK_DIRS[@]}"; do
    d="${DEST_ROOT}/${name}"
    [[ -d "$d" ]] || continue
    [[ "$DRY_RUN" -eq 1 ]] && echo "[dry-run] chmod g+rwX $d" && continue
    find "$d" -type d -exec chmod g+rwx {} + 2>/dev/null || true
    find "$d" -type f -exec chmod g+rw {} + 2>/dev/null || true
    find "$d" -type d -exec chmod g+s {} + 2>/dev/null || true
  done
fi

echo ""
echo "=== Fertig ==="
echo "  cd ${NEW_PREFIX}/belegchat"
echo ""
