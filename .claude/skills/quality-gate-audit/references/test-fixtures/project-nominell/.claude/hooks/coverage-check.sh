#!/usr/bin/env bash
# hooks/coverage-check.sh — Diff-Coverage-Gate (BOO-15)
# coverage-check v2 (BOO-88: Nenner zaehlt nur ausfuehrbare Statement-Zeilen)
# DE: Misst Coverage nur auf NEU hinzugefuegten Zeilen (git diff --added)
#     gegen coverage-final.json (c8) bzw. coverage.json (pytest-cov).
#     Schrader Code Crash Kap. 3: Gesamt-Coverage auf Legacy-Repos ist unfair.
# EN: Measures coverage only on NEWLY added lines (git diff --added) against
#     coverage-final.json (c8) or coverage.json (pytest-cov). Schrader Code
#     Crash ch. 3: total coverage on legacy repos is unfair.
set -euo pipefail

# --- Konfiguration (env-overridable) ---
COVERAGE_PASS="${COVERAGE_PASS:-80}"
COVERAGE_WARN="${COVERAGE_WARN:-60}"

# --- Coverage-File-Detection ---
COVERAGE_FILE=""
COVERAGE_TOOL=""

if [[ -f "coverage/coverage-final.json" ]]; then
    COVERAGE_FILE="coverage/coverage-final.json"
    COVERAGE_TOOL="c8"
elif [[ -f "coverage.json" ]]; then
    COVERAGE_FILE="coverage.json"
    COVERAGE_TOOL="pytest-cov"
elif [[ -f ".coverage" || -f "coverage/.coverage" ]]; then
    echo "[COVERAGE] HINWEIS: pytest-cov-SQLite gefunden, aber kein JSON-Export. Lauf 'pytest --cov --cov-report=json' fuer Diff-Coverage."
    exit 0
else
    echo "[COVERAGE] Keine Coverage-Daten gefunden — Gate uebersprungen."
    echo "[COVERAGE] Hinweis: Test-Setup fehlt — ggf. /bootstrap nachziehen oder 'npx c8 npm test' / 'pytest --cov --cov-report=json' laufen lassen."
    exit 0
fi

echo "[COVERAGE] Tool: $COVERAGE_TOOL, Datei: $COVERAGE_FILE, Schwellwerte: pass=$COVERAGE_PASS%, warn=$COVERAGE_WARN%"

# --- Added-Lines extrahieren (nur "+"-Zeilen, NICHT modifizierte) ---
# git diff -U0 zeigt nur die geanderten Zeilen ohne Kontext.
# diff-filter=A waere strenger (nur neue Files), aber wir wollen auch
# neue Funktionen in alten Files erfassen → wir nehmen alle "+"-Zeilen
# (ohne den +++/--- Header).

# Format: file_path:line_number pro Zeile
extract_added_lines() {
    git diff --cached -U0 --no-color 2>/dev/null \
        | awk '
            /^\+\+\+ b\// { file = substr($0, 7); next }
            /^@@ / {
                # @@ -old,oldcount +new,newcount @@
                n = split($0, parts, " ")
                for (i = 1; i <= n; i++) {
                    if (parts[i] ~ /^\+[0-9]+/) {
                        sub(/^\+/, "", parts[i])
                        split(parts[i], nums, ",")
                        start = nums[1] + 0
                        count = (nums[2] == "") ? 1 : (nums[2] + 0)
                        for (j = 0; j < count; j++) print file ":" (start + j)
                        break
                    }
                }
                next
            }
        '
}

# --- Per-File-Coverage aus JSON parsen (Python-Helper, weil JSON in Bash schmerzhaft) ---
# c8 Format: { "file_path": { "s": {"0": 1, "1": 0, ...}, "statementMap": {"0": {"start": {"line": N}}}}}
# pytest-cov Format: { "files": { "file_path": { "executed_lines": [...], "missing_lines": [...] }}}

parse_covered_lines_c8() {
    local file="$1"
    python3 - "$COVERAGE_FILE" "$file" <<'PYEOF'
import json, sys
cov_file, target = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(cov_file))
except Exception as e:
    sys.exit(0)
target_abs = target.lstrip("./")
for k, v in data.items():
    if k.endswith(target_abs) or k.endswith(target):
        stmts = v.get("statementMap", {})
        counts = v.get("s", {})
        for stmt_id, loc in stmts.items():
            line = loc.get("start", {}).get("line")
            if line and counts.get(stmt_id, 0) > 0:
                print(line)
        break
PYEOF
}

parse_covered_lines_pytest() {
    local file="$1"
    python3 - "$COVERAGE_FILE" "$file" <<'PYEOF'
import json, sys
cov_file, target = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(cov_file))
except Exception:
    sys.exit(0)
files = data.get("files", {})
target_norm = target.lstrip("./")
for k, v in files.items():
    if k.endswith(target_norm) or k.endswith(target):
        for line in v.get("executed_lines", []):
            print(line)
        break
PYEOF
}

# --- NEU (BOO-88): Statement-Zeilen (alle ausfuehrbaren Zeilen, unabhaengig vom Count) ---
parse_statement_lines_c8() {
    local file="$1"
    python3 - "$COVERAGE_FILE" "$file" <<'PYEOF'
import json, sys
cov_file, target = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(cov_file))
except Exception:
    sys.exit(0)
target_abs = target.lstrip("./")
for k, v in data.items():
    if k.endswith(target_abs) or k.endswith(target):
        for stmt_id, loc in v.get("statementMap", {}).items():
            line = loc.get("start", {}).get("line")
            if line:
                print(line)
        break
PYEOF
}

parse_statement_lines_pytest() {
    local file="$1"
    python3 - "$COVERAGE_FILE" "$file" <<'PYEOF'
import json, sys
cov_file, target = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(cov_file))
except Exception:
    sys.exit(0)
files = data.get("files", {})
target_norm = target.lstrip("./")
for k, v in files.items():
    if k.endswith(target_norm) or k.endswith(target):
        for line in v.get("executed_lines", []):
            print(line)
        for line in v.get("missing_lines", []):
            print(line)
        break
PYEOF
}

# --- Hauptlauf ---
ADDED=$(extract_added_lines)

if [[ -z "$ADDED" ]]; then
    echo "[COVERAGE] Keine neu hinzugefuegten Zeilen im Diff — Gate uebersprungen."
    exit 0
fi

TOTAL_ADDED=0
COVERED_ADDED=0

# Per-File aggregieren
declare -A FILES_SEEN
declare -A STMT_SEEN
while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    file="${entry%:*}"
    line="${entry##*:}"

    # Nur Source-Files: js/mjs/ts/tsx/jsx/py — nicht Tests, nicht Configs
    if ! echo "$file" | grep -qE '\.(js|mjs|ts|tsx|jsx|py)$'; then
        continue
    fi
    if echo "$file" | grep -qE '(^test|/test|_test\.|\.test\.|\.spec\.|tests/|__tests__|conftest\.py)'; then
        continue
    fi

    # Per-File einmal Coverage-Daten holen (gedeckte Zeilen + Statement-Zeilen)
    if [[ -z "${FILES_SEEN[$file]:-}" ]]; then
        if [[ "$COVERAGE_TOOL" == "c8" ]]; then
            FILES_SEEN[$file]="$(parse_covered_lines_c8 "$file" | tr '\n' ' ')"
            STMT_SEEN[$file]="$(parse_statement_lines_c8 "$file" | tr '\n' ' ')"
        else
            FILES_SEEN[$file]="$(parse_covered_lines_pytest "$file" | tr '\n' ' ')"
            STMT_SEEN[$file]="$(parse_statement_lines_pytest "$file" | tr '\n' ' ')"
        fi
    fi

    # NEU (BOO-88): Nenner-Guard — nur ausfuehrbare Statement-Zeilen zaehlen.
    # Kommentare/Leerzeilen sind nie Statements → raus aus dem Nenner.
    if ! echo " ${STMT_SEEN[$file]} " | grep -qw "$line"; then
        continue
    fi

    TOTAL_ADDED=$(( TOTAL_ADDED + 1 ))
    if echo " ${FILES_SEEN[$file]} " | grep -qw "$line"; then
        COVERED_ADDED=$(( COVERED_ADDED + 1 ))
    fi
done <<< "$ADDED"

if (( TOTAL_ADDED == 0 )); then
    echo "[COVERAGE] Keine bewertbaren neuen Zeilen (alles Tests/Configs) — Gate uebersprungen."
    exit 0
fi

# --- Verhaeltnis berechnen + Gate ---
PCT=$(( (COVERED_ADDED * 100) / TOTAL_ADDED ))

echo "[COVERAGE] Diff-Coverage: $COVERED_ADDED / $TOTAL_ADDED added lines = ${PCT}%"

if (( PCT >= COVERAGE_PASS )); then
    echo "[COVERAGE] Gate bestanden (>=${COVERAGE_PASS}%)"
    exit 0
elif (( PCT >= COVERAGE_WARN )); then
    echo "[COVERAGE] WARNUNG: Diff-Coverage ${PCT}% liegt unter ${COVERAGE_PASS}% (Pass-Schwelle), aber ueber ${COVERAGE_WARN}% (Warn-Schwelle)."
    echo "[COVERAGE] Operator-Freigabe moeglich mit Begruendung im Linear-Kommentar."
    exit 0
else
    echo "[COVERAGE] Gate BLOCKIERT: Diff-Coverage ${PCT}% liegt unter ${COVERAGE_WARN}% (Warn-Schwelle)."
    echo "[COVERAGE] Tests hinzufuegen oder Story splitten."
    exit 1
fi
