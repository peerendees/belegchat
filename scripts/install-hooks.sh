#!/usr/bin/env bash
# install-hooks.sh — Setzt core.hooksPath=.githooks fuer versionierte Git-Hooks
# Einmal ausfuehren nach git clone.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Pre-Commit ausfuehrbar machen
chmod +x .githooks/pre-commit

# Git konfigurieren
git config core.hooksPath .githooks

echo "Git-Hooks aktiviert: core.hooksPath=.githooks"
echo "Pre-Commit-Hook ist jetzt aktiv (ESLint + Typecheck + Semgrep)."
