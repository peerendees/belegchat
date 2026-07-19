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

# Issue-Nummer NUR aus der Commit-Subject-Konvention "BER-NNN:" extrahieren
# (CLAUDE.md-Format: "BER-[Nr]: [Was]"). Dadurch loest eine beilaeufige
# Erwaehnung wie "kein BER-107-Regressionsfehler" die Spec-Pflicht NICHT aus.
ISSUE=$(echo "$INPUT" | grep -oE 'BER-[0-9]+:' | head -1 | tr -d ':' || true)
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
