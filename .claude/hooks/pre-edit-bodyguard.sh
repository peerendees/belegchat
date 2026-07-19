#!/usr/bin/env bash
# pre-edit-bodyguard.sh — Layer 0: Faengt Secrets/Unsafe-Patterns vor dem Schreiben ab
# Registriert als PreToolUse Hook auf Edit|Write|MultiEdit

set -euo pipefail

INPUT=$(cat)

# Patterns pruefen (Secrets, API-Keys, Tokens)
PATTERNS=(
  'SUPABASE_SERVICE_ROLE_KEY\s*='
  'DECRYPT_API_TOKEN\s*='
  'IMPORT_API_TOKEN\s*='
  'AUTH_SESSION_SECRET\s*='
  'sk-[a-zA-Z0-9]{20,}'
  'eyJ[a-zA-Z0-9_-]{50,}'
  'ghp_[a-zA-Z0-9]{36}'
  'password\s*=\s*["\x27][^"\x27]+'
)

for PATTERN in "${PATTERNS[@]}"; do
  if echo "$INPUT" | grep -qEi "$PATTERN"; then
    if [[ "${BODYGUARD_STRICT:-0}" == "1" ]]; then
      echo "BLOCKED: Potentielles Secret/Unsafe-Pattern erkannt."
      echo "Pattern: $PATTERN"
      echo "BODYGUARD_STRICT=1 — Hard-Block aktiv."
      exit 2
    else
      echo "WARNING: Potentielles Secret/Unsafe-Pattern erkannt."
      echo "Pattern: $PATTERN"
      echo "Pruefe ob das beabsichtigt ist. (BODYGUARD_STRICT=1 fuer Hard-Block)"
      exit 0
    fi
  fi
done

exit 0
