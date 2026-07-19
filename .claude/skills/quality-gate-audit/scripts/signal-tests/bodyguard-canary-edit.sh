#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  bodyguard-canary-edit.sh — Signal-Test fuer das Layer-0-Bodyguard-Gate (BOO-183)
#  DE: Faehrt einen SYNTHETISCHEN Edit mit einem AWS-Access-Key-Pattern gegen den
#      pre-edit-bodyguard.sh-Hook und prueft, ob der Hook hart blockt
#      (Exit 1 + "[BODYGUARD] BLOCKIERT"). Der AWS-Key ist ein `action: block`-Muster
#      (_universal.yml), greift also unabhaengig von BODYGUARD_STRICT.
#  EN: Feeds a SYNTHETIC AWS access-key edit into the bodyguard hook and verifies a
#      hard block (exit 1 + "[BODYGUARD] BLOCKIERT").
#
#  Usage:  bodyguard-canary-edit.sh <pfad-zu-pre-edit-bodyguard.sh>
#  Exit:   reicht den Exit-Code des Hooks 1:1 durch (1 = geblockt = erwuenscht).
#  Hinweis: Der Key ist ein bekanntes, NICHT echtes Test-Pattern (AKIA + 16x A).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

HOOK="${1:-}"
if [ -z "$HOOK" ] || [ ! -f "$HOOK" ]; then
    echo "[signal-test] Hook-Pfad fehlt oder existiert nicht: ${HOOK:-<leer>}" >&2
    exit 2
fi

# Synthetischer, BEWUSST nicht echter AWS-Key (Format AKIA + 16 Grossbuchstaben/Ziffern).
# Wird als Edit-Content via stdin-JSON an den PreToolUse-Hook uebergeben.
SYNTH_KEY="AKIAAAAAAAAAAAAAAAAA"
PAYLOAD='{"tool_input":{"file_path":"signal-test-canary.py","content":"aws_key = \"'"$SYNTH_KEY"'\"\n"}}'

printf '%s' "$PAYLOAD" | bash "$HOOK"
