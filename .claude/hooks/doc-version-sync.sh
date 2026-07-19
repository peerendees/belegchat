#!/usr/bin/env bash
# doc-version-sync.sh — Blockiert wenn VERSION geaendert aber Docs nicht synchron
# Registriert als PreToolUse Hook auf Bash (git commit Aufrufe)

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o 'git commit' || true)
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Pruefen ob lib/config.js oder package.json VERSION geaendert wurde
STAGED=$(cd "$CLAUDE_PROJECT_DIR" && git diff --cached --name-only 2>/dev/null || true)
if echo "$STAGED" | grep -qE '(lib/config\.(js|ts)|package\.json)'; then
  # Pruefen ob CHANGELOG.md auch gestaged ist
  if ! echo "$STAGED" | grep -q 'CHANGELOG.md'; then
    echo "WARNING: VERSION scheint geaendert, aber CHANGELOG.md ist nicht gestaged."
    echo "Bitte CHANGELOG.md aktualisieren und mit-stagen."
  fi
fi

exit 0
