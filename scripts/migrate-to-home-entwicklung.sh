#!/usr/bin/env bash
# Phase 0: BelegChat-Stack von Shared/Entwicklung/projekte nach ~/Entwicklung/projekte.
#
# Verwendung:
#   ./scripts/migrate-to-home-entwicklung.sh --dry-run
#   ./scripts/migrate-to-home-entwicklung.sh --yes --symlinks --remove-stub --fix-permissions
#
set -euo pipefail

SOURCE_ROOT="/Users/Shared/Entwicklung/projekte"
DEST_ROOT="${HOME}/Entwicklung/projekte"

STACK_DIRS=(belegchat threema-decrypt n8n-workflows berent-2nd-brain)

DRY_RUN=0
ASSUME_YES=0
CREATE_SYMLINKS=0
REMOVE_STUB=0
UPDATE_PATHS=1
FIX_PERMISSIONS=0

OLD_PREFIX="/Users/Shared/Entwicklung/projekte"

usage() {
  cat <<'EOF'
migrate-to-home-entwicklung.sh — Shared → ~/Entwicklung/projekte

Optionen:
  --dry-run          Nur anzeigen, nichts ändern
  --yes, -y          Bestätigungen überspringen
  --symlinks         Legacy-Symlinks unter Shared/.../projekte/<name> anlegen
  --remove-stub      ~/Entwicklung/projekte/belegchat-project löschen
  --no-update-paths  Hardcodierte Pfade in Doku/Skripten nicht ersetzen
  --fix-permissions  chown/chmod auf Ziel (owner:staff, g+rwX)
  -h, --help         Diese Hilfe

Verschiebt: belegchat, threema-decrypt, n8n-workflows, berent-2nd-brain

Vorher: git status in jedem Repo prüfen
Danach: Cursor/Claude Code auf ~/Entwicklung/projekte/belegchat öffnen
EOF
}

log()  { echo "→ $*"; }
warn() { echo "⚠ $*" >&2; }
die()  { echo "✗ $*" >&2; exit 1; }

confirm() {
  local msg="$1"
  if [[ "$ASSUME_YES" -eq 1 ]]; then return 0; fi
  read -r -p "${msg} [j/N] " ans
  [[ "${ans,,}" == "j" || "${ans,,}" == "ja" || "${ans,,}" == "y" || "${ans,,}" == "yes" ]]
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    log "$*"
    eval "$@"
  fi
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --symlinks) CREATE_SYMLINKS=1 ;;
    --remove-stub) REMOVE_STUB=1 ;;
    --no-update-paths) UPDATE_PATHS=0 ;;
    --fix-permissions) FIX_PERMISSIONS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unbekannte Option: $arg (siehe --help)" ;;
  esac
done

[[ -d "$SOURCE_ROOT" ]] || die "Quelle fehlt: $SOURCE_ROOT"
mkdir -p "$DEST_ROOT" 2>/dev/null || true
[[ -d "$DEST_ROOT" ]] || die "Ziel nicht beschreibbar: $DEST_ROOT"

NEW_PREFIX="$(cd "$DEST_ROOT" && pwd -P)"

echo ""
echo "=== Pfad-Migration BelegChat-Stack ==="
echo "Quelle:  $SOURCE_ROOT"
echo "Ziel:    $NEW_PREFIX"
echo "Ersetze: $OLD_PREFIX → $NEW_PREFIX"
[[ "$DRY_RUN" -eq 1 ]] && echo "Modus:   DRY-RUN"
echo ""

check_git_clean() {
  local dir="$1"
  [[ -d "$dir/.git" ]] || return 0
  if [[ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]]; then
    warn "Uncommittete Änderungen in: $dir"
    return 1
  fi
  return 0
}

git_dirty=0
for name in "${STACK_DIRS[@]}"; do
  src="${SOURCE_ROOT}/${name}"
  [[ -d "$src" ]] && check_git_clean "$src" || git_dirty=1
done

if [[ "$git_dirty" -eq 1 ]] && [[ "$ASSUME_YES" -eq 0 ]]; then
  confirm "Trotz uncommitteter Änderungen fortfahren?" || die "Abgebrochen."
fi

if ! confirm "BelegChat-Stack nach ${NEW_PREFIX} verschieben?"; then
  die "Abgebrochen."
fi

move_dir() {
  local name="$1"
  local src="${SOURCE_ROOT}/${name}"
  local dst="${DEST_ROOT}/${name}"

  if [[ ! -d "$src" ]]; then
    warn "Überspringe (Quelle fehlt): $name"
    return 0
  fi

  if [[ -e "$dst" && ! -L "$dst" ]]; then
    die "Ziel existiert bereits: $dst — bitte manuell klären"
  fi

  run "mv $(printf '%q' "$src") $(printf '%q' "$dst")"
}

for name in "${STACK_DIRS[@]}"; do
  move_dir "$name"
done

if [[ "$CREATE_SYMLINKS" -eq 1 ]]; then
  for name in "${STACK_DIRS[@]}"; do
    local_src="${SOURCE_ROOT}/${name}"
    local_dst="${DEST_ROOT}/${name}"
    if [[ -e "$local_src" && ! -L "$local_src" ]]; then
      warn "Symlink übersprungen — Quelle noch vorhanden: $local_src"
      continue
    fi
    if [[ -d "$local_dst" ]]; then
      run "ln -sfn $(printf '%q' "$local_dst") $(printf '%q' "$local_src")"
    fi
  done
fi

STUB="${DEST_ROOT}/belegchat-project"
if [[ "$REMOVE_STUB" -eq 1 && -d "$STUB" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] rm -rf $(printf '%q' "$STUB")"
  elif confirm "Veralteten Stub löschen: $STUB ?"; then
    run "rm -rf $(printf '%q' "$STUB")"
  fi
fi

update_paths_in_tree() {
  local root="$1"
  [[ -d "$root" ]] || return 0

  local count=0
  while IFS= read -r -d '' f; do
    if grep -qF "$OLD_PREFIX" "$f" 2>/dev/null; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "[dry-run] sed in: $f"
      else
        sed -i '' "s|${OLD_PREFIX}|${NEW_PREFIX}|g" "$f"
      fi
      count=$((count + 1))
    fi
  done < <(
    find "$root" -type f \( \
      -name '*.md' -o -name '*.sh' -o -name '*.mjs' -o -name '*.ts' -o -name '*.json' \
    \) ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/*' \
    -print0 2>/dev/null
  )
  log "Pfade aktualisiert in ${count} Dateien unter $(basename "$root")"
}

if [[ "$UPDATE_PATHS" -eq 1 ]]; then
  for name in "${STACK_DIRS[@]}"; do
    update_paths_in_tree "${DEST_ROOT}/${name}"
  done
fi

if [[ "$FIX_PERMISSIONS" -eq 1 ]]; then
  for name in "${STACK_DIRS[@]}"; do
    d="${DEST_ROOT}/${name}"
    [[ -d "$d" ]] || continue
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] chown -R $(id -un):staff $d; chmod g+rwX $d"
    else
      chown -R "$(id -un):staff" "$d" 2>/dev/null || warn "chown fehlgeschlagen für $d"
      find "$d" -type d -exec chmod g+rwx {} + 2>/dev/null || true
      find "$d" -type f -exec chmod g+rw {} + 2>/dev/null || true
      find "$d" -type d -exec chmod g+s {} + 2>/dev/null || true
    fi
  done
fi

echo ""
echo "=== Fertig ==="
echo "  cd ${NEW_PREFIX}/belegchat"
echo "  Cursor/Claude Code Workspace dort öffnen"
echo "  Doku: docs/PFAD-MIGRATION.md"
echo ""
