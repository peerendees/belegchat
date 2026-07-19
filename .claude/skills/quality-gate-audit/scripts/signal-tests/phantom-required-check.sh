#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  phantom-required-check.sh — Signal-Test fuer die Phantom-Gate-Probe (BOO-370)
#  DE: Speist SYNTHETISCHE, injizierte Namenslisten in phantom-gate-probe.sh (ohne
#      GitHub-Roundtrip) und prueft die Kern-Klassifikation:
#        Negativ: ein Required-Check, der NIE postet → status=nominell + Exit 1.
#        Positiv: alle Required-Checks posten → alle aktiv + Exit 0.
#  EN: Feeds SYNTHETIC injected name lists into the probe (no network) and verifies
#      the core classification: a required-but-never-posting check → nominell + exit 1;
#      all-posting → aktiv + exit 0.
#
#  Usage:  phantom-required-check.sh [<pfad-zu-phantom-gate-probe.sh>]
#  Exit:   0 wenn beide Faelle wie erwartet, sonst 1.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROBE="${1:-$SCRIPT_DIR/../phantom-gate-probe.sh}"
if [ ! -f "$PROBE" ]; then
    echo "[signal-test] Probe nicht gefunden: $PROBE" >&2
    exit 2
fi

TMPDIR_T="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_T"; }
trap cleanup EXIT

REQ="$TMPDIR_T/required.txt"
OBS_PHANTOM="$TMPDIR_T/observed-phantom.txt"
OBS_HEALTHY="$TMPDIR_T/observed-healthy.txt"

# Ruleset fuehrt zwei Pflicht-Checks (Check-Namen enthalten bewusst Leerzeichen —
# testet die ganze-Zeile-Uebereinstimmung):
printf '%s\n' "docs-drift" "SonarCloud Code Analysis" > "$REQ"

# NEGATIV-Fixture: nur docs-drift hat je gepostet — SonarCloud ist ein Phantom.
printf '%s\n' "docs-drift" > "$OBS_PHANTOM"

# POSITIV-Fixture: beide haben gepostet.
printf '%s\n' "docs-drift" "SonarCloud Code Analysis" > "$OBS_HEALTHY"

fail=0

# ---- Fall 1: Phantom erwartet ----
out1="$(PHANTOM_REQUIRED_FILE="$REQ" PHANTOM_OBSERVED_FILE="$OBS_PHANTOM" \
        bash "$PROBE" --format machine)"
rc1=$?
echo "── Negativ-Fall (Phantom) ──"; printf '%s\n' "$out1"
if ! printf '%s\n' "$out1" | grep -Fq 'check="SonarCloud Code Analysis" status=nominell'; then
    echo "[FAIL] SonarCloud Code Analysis haette 'nominell' sein muessen." >&2; fail=1
fi
if ! printf '%s\n' "$out1" | grep -Fq 'check="docs-drift" status=aktiv'; then
    echo "[FAIL] docs-drift haette 'aktiv' sein muessen." >&2; fail=1
fi
if [ "$rc1" -ne 1 ]; then
    echo "[FAIL] Exit-Code haette 1 (Phantom erkannt) sein muessen, war $rc1." >&2; fail=1
fi

# ---- Fall 2: gesund erwartet ----
out2="$(PHANTOM_REQUIRED_FILE="$REQ" PHANTOM_OBSERVED_FILE="$OBS_HEALTHY" \
        bash "$PROBE" --format machine)"
rc2=$?
echo "── Positiv-Fall (gesund) ──"; printf '%s\n' "$out2"
if printf '%s\n' "$out2" | grep -Fq 'status=nominell'; then
    echo "[FAIL] Kein Check haette 'nominell' sein duerfen." >&2; fail=1
fi
if [ "$rc2" -ne 0 ]; then
    echo "[FAIL] Exit-Code haette 0 (gesund) sein muessen, war $rc2." >&2; fail=1
fi

if [ "$fail" -eq 0 ]; then
    echo "[signal-test] PASS — Phantom-Gate-Probe klassifiziert korrekt (nominell/tot erkannt)."
    exit 0
fi
echo "[signal-test] FAIL." >&2
exit 1
