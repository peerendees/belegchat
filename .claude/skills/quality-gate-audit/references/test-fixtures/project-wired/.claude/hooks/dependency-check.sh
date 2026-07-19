#!/usr/bin/env bash
# hooks/dependency-check.sh — Slopsquatting-Schutz (BOO-12, BOO-197)  [Fixture-Stub]
# Stub fuer den Wiring-Test: referenziert die Wordlist (offline-faehige erste Schicht).
set -euo pipefail
WORDLIST=".claude/hooks/slopsquatting/wordlist.txt"
check_wordlist() {
    local ecosystem="$1" pkg="$2"
    [[ -f "$WORDLIST" ]] || return 0
    if grep -vE '^[[:space:]]*#' "$WORDLIST" 2>/dev/null \
        | grep -qiE "^[[:space:]]*${ecosystem}:${pkg}[[:space:]]*$"; then
        return 1
    fi
    return 0
}
exit 0
