#!/usr/bin/env bash
# spec-gate.sh — Layer 1: Blockiert git commit mit BER-XXX wenn Spec-File fehlt
# Registriert als PreToolUse Hook auf Bash (git commit Aufrufe)

set -euo pipefail

# Nur auf git commit reagieren
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o 'git commit' || true)
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Issue-Nummer aus der Commit-Message extrahieren
ISSUE=$(echo "$INPUT" | grep -oE 'BER-[0-9]+' | head -1 || true)
if [[ -z "$ISSUE" ]]; then
  exit 0
fi

# Spec-File pruefen
SPEC_FILE="$CLAUDE_PROJECT_DIR/specs/${ISSUE}.md"
if [[ ! -f "$SPEC_FILE" ]]; then
  echo "BLOCKED: Spec-File fehlt: specs/${ISSUE}.md"
  echo "Erstelle das Spec-File aus specs/TEMPLATE.md bevor du committest."
  exit 2
fi

exit 0
