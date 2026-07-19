#!/usr/bin/env bash
# hooks/dependency-check.sh — Slopsquatting-Schutz (BOO-12)  [Fixture-Stub, NOMINELL]
# NOMINELL: dieser Stub referenziert die Wordlist BEWUSST NICHT — nur Live-Registry-Query.
# Die Offline-Schicht (wordlist.txt) haengt damit nicht im Hook -> Gate "nominell".
set -euo pipefail
check_npm_existence() {
    local pkg="$1"
    npm view "$pkg" name >/dev/null 2>&1
}
exit 0
