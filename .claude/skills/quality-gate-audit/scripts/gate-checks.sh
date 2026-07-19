#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  gate-checks.sh — Quality-Gate-Audit-Engine (BOO-183)
#  DE: Prueft, ob die vier deklarierten Quality Gates im Ziel-Projekt tatsaechlich
#      VERDRAHTET sind (Datei vorhanden + registriert + Signal-Test feuert) — nicht
#      nur nominell konfiguriert. Diagnostiziert, repariert NICHT.
#  EN: Checks whether the four declared quality gates in the target project are
#      actually WIRED (file present + registered + signal test fires) — not merely
#      nominally configured. Diagnoses, does NOT repair.
#
#  Status je Gate:
#    verdrahtet  — Datei vorhanden + registriert + Signal-Test triggert
#    nominell    — vorhanden, aber Registrierung/Wiring fehlt
#    blind       — behauptet zu pruefen, prueft nichts (Datei fehlt/leer)
#
#  Bewusst dependency-frei: nur bash (3.2-kompatibel), grep/sed/awk, find, date.
#  KEIN jq, KEIN yq. Defensiv: fehlende Tools/Dateien fuehren nie zu einem Crash.
#
#  Exit-Code: 0 wenn alle Gates verdrahtet oder akzeptiert ueberschrieben sind;
#             1 wenn >=1 Gate blind ist ohne Override.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail   # bewusst KEIN -e: einzelne Checks duerfen ohne Abbruch fehlschlagen

# ---------------------------------------------------------------------------
# CLI-Parsing
# ---------------------------------------------------------------------------
GATE="all"
FORMAT="table"
ROOT=""
OVERRIDE_GATES=""   # komma-separierte Liste akzeptierter blind-Overrides (optional)

usage() {
    cat <<'HLP'
gate-checks.sh — Quality-Gate-Audit-Engine (BOO-183)

Usage:
  gate-checks.sh [--gate <name>|all] [--format table|machine] [--root <pfad>]
                 [--override-gate <name>[,<name>...]]

Optionen:
  --gate <name>|all     Einzelnes Gate (semgrep|coverage|slopsquatting|bodyguard)
                        oder alle vier (Default: all).
  --format table        Menschenlesbare Tabelle (Default).
  --format machine      Parsebare Zeilen: gate=<name> status=<status> note="..."
  --root <pfad>         Ziel-Projekt-Root (Default: git root des cwd, sonst cwd).
  --override-gate <l>   Komma-Liste von Gates, deren "blind"-Status als akzeptiert
                        gilt (Exit-Code bleibt 0). Begruendung gehoert in den Report,
                        nicht hierher.
  -h, --help            Diese Hilfe.

Status:
  verdrahtet  Datei vorhanden + registriert + Signal-Test feuert
  nominell    vorhanden, aber Registrierung/Wiring fehlt
  blind       behauptet zu pruefen, prueft nichts

Exit: 0 alle verdrahtet oder akzeptiert ueberschrieben; 1 wenn >=1 blind ohne Override.
HLP
}

while [ $# -gt 0 ]; do
    case "$1" in
        --gate)            GATE="${2:-all}"; shift 2 ;;
        --format)          FORMAT="${2:-table}"; shift 2 ;;
        --root)            ROOT="${2:-}"; shift 2 ;;
        --override-gate)   OVERRIDE_GATES="${2:-}"; shift 2 ;;
        -h|--help)         usage; exit 0 ;;
        *) echo "[gate-checks] Unbekanntes Argument: $1" >&2; usage >&2; exit 2 ;;
    esac
done

# ---------------------------------------------------------------------------
# PROJECT_ROOT bestimmen
# ---------------------------------------------------------------------------
if [ -n "$ROOT" ]; then
    PROJECT_ROOT="$ROOT"
else
    PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "[gate-checks] PROJECT_ROOT existiert nicht: $PROJECT_ROOT" >&2
    exit 2
fi

# Skript-Verzeichnis (fuer signal-tests) — robust gegen Symlinks nicht noetig hier.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

# file_age_days <pfad> -> Alter der Datei in Tagen (ganzzahlig), "" wenn nicht da.
# BSD (stat -f %m) und GNU (stat -c %Y) kompatibel.
file_age_days() {
    local f="$1" mtime now
    [ -f "$f" ] || { echo ""; return; }
    mtime="$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo "")"
    [ -n "$mtime" ] || { echo ""; return; }
    now="$(date +%s)"
    echo $(( (now - mtime) / 86400 ))
}

# nonempty_file <pfad> -> 0 wenn Datei existiert und nicht leer (ignoriert Kommentar/Leerzeilen).
nonempty_file() {
    local f="$1"
    [ -f "$f" ] || return 1
    grep -qvE '^[[:space:]]*(#|$)' "$f" 2>/dev/null
}

# Ergebnis-Sammlung (parallele Arrays — bash-3.2-kompatibel, keine assoc. Arrays)
declare -a R_NAME=()
declare -a R_STATUS=()
declare -a R_NOTE=()
declare -a R_PATHS=()
declare -a R_SIGNAL=()

record() {
    # record <name> <status> <note> <inspected-paths> <signal-output>
    R_NAME+=("$1")
    R_STATUS+=("$2")
    R_NOTE+=("$3")
    R_PATHS+=("$4")
    R_SIGNAL+=("$5")
}

# ---------------------------------------------------------------------------
# Gate 1: Semgrep-Wiring (BOO-185 Canary)
# ---------------------------------------------------------------------------
check_semgrep() {
    local sd="$PROJECT_ROOT/.semgrep"
    local canary="$sd/test-fixtures/wiring-canary.py"
    local wf1="$PROJECT_ROOT/.github/workflows/ci-semgrep.yml"
    local wf2="$PROJECT_ROOT/.github/workflows/semgrep.yml"
    local paths=".semgrep/  .semgrep.yml  .github/workflows/{ci-semgrep,semgrep}.yml  .semgrep/test-fixtures/wiring-canary.py"
    local note="" signal=""

    # blind: .semgrep/ fehlt oder leer (keine Regel-Dateien)
    if [ ! -d "$sd" ] || ! find "$sd" -maxdepth 2 -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null | grep -q .; then
        record "semgrep" "blind" "Verzeichnis .semgrep/ fehlt oder enthaelt keine Regel-Dateien — Custom-Rule-Schicht prueft nichts." "$paths" ""
        return
    fi

    # Canary-Fixture + Marker pruefen
    local canary_ok=1
    if [ ! -f "$canary" ]; then
        canary_ok=0
        note="Canary-Fixture .semgrep/test-fixtures/wiring-canary.py fehlt. "
    else
        grep -q 'QGAUDIT-CANARY-DO-NOT-REMOVE' "$canary" 2>/dev/null || { canary_ok=0; note="${note}Canary-Marker fehlt. "; }
        grep -q 'QGAUDIT-CANARY-TRIPWIRE' "$canary" 2>/dev/null || { canary_ok=0; note="${note}Tripwire-Literal fehlt. "; }
    fi

    # CI-Workflow verdrahtet das Verzeichnis via --config .semgrep/ ?
    local ci_wired=0 ci_present=0 wf=""
    for wf in "$wf1" "$wf2"; do
        if [ -f "$wf" ]; then
            ci_present=1
            # Nur Nicht-Kommentar-Zeilen werten (ein Kommentar, der "--config .semgrep/"
            # erwaehnt, verdrahtet nichts).
            if grep -vE '^[[:space:]]*#' "$wf" 2>/dev/null \
                 | grep -qE -- '--config[[:space:]]+\.semgrep/'; then
                ci_wired=1
            fi
        fi
    done

    # Signal-Test: gezielter Scan der Canary-Datei mit --config .semgrep/
    if command -v semgrep >/dev/null 2>&1; then
        if [ "$canary_ok" = "1" ]; then
            signal="$(cd "$PROJECT_ROOT" && semgrep --config .semgrep/ .semgrep/test-fixtures/wiring-canary.py 2>/dev/null \
                       | grep -o 'qgaudit-wiring-canary' | head -1)"
            if [ "$signal" = "qgaudit-wiring-canary" ]; then
                if [ "$ci_wired" = "1" ]; then
                    record "semgrep" "verdrahtet" "Canary feuert (qgaudit-wiring-canary) und CI verdrahtet --config .semgrep/." "$paths" "rule fired: qgaudit-wiring-canary"
                else
                    # Custom-Rules feuern lokal, aber CI laedt das Verzeichnis nicht -> nominell
                    local m="Canary feuert lokal, aber kein CI-Workflow uebergibt --config .semgrep/ (Custom-Rules laufen in CI nie)."
                    [ "$ci_present" = "0" ] && m="Canary feuert lokal, aber es existiert kein Semgrep-CI-Workflow."
                    record "semgrep" "nominell" "$m" "$paths" "rule fired: qgaudit-wiring-canary"
                fi
                return
            else
                record "semgrep" "blind" "Custom-Rules vorhanden, aber Canary-Scan meldet qgaudit-wiring-canary NICHT — Regel feuert nicht. ${note}" "$paths" "rule NOT fired"
                return
            fi
        else
            record "semgrep" "blind" "Custom-Rule-Verzeichnis da, aber Canary unbrauchbar: ${note}" "$paths" "canary invalid"
            return
        fi
    else
        # CLI fehlt: Status NICHT hart blind — nominell mit Hinweis (Spec).
        local m="semgrep-CLI fehlt — Wiring nicht verifizierbar. "
        [ "$ci_wired" = "1" ] && m="${m}CI verdrahtet --config .semgrep/ (statisch erkannt)." || m="${m}Kein CI-Wiring (--config .semgrep/) gefunden."
        record "semgrep" "nominell" "$m ${note}" "$paths" "CLI missing"
        return
    fi
}

# ---------------------------------------------------------------------------
# Gate 2: Coverage
# ---------------------------------------------------------------------------
check_coverage() {
    local hook="$PROJECT_ROOT/.claude/hooks/coverage-check.sh"
    local paths=".claude/hooks/coverage-check.sh  (Registrierung: settings.json / pre-commit / implement-Kette)"

    if [ ! -f "$hook" ]; then
        record "coverage" "blind" "Hook .claude/hooks/coverage-check.sh fehlt — Coverage-Gate prueft nichts." "$paths" ""
        return
    fi

    # Schwellwerte vorhanden?
    local thr_ok=1
    grep -qE 'COVERAGE_PASS' "$hook" 2>/dev/null || thr_ok=0
    grep -qE 'COVERAGE_WARN' "$hook" 2>/dev/null || thr_ok=0

    # Registrierung/Aufruf: irgendwo im Projekt referenziert (settings.json, pre-commit,
    # implement-Kette). Wir suchen den Hook-Aufruf ausserhalb der Hook-Datei selbst.
    local referenced=0 ref_in=""
    local candidates=""
    candidates="$candidates $PROJECT_ROOT/.claude/settings.json"
    candidates="$candidates $PROJECT_ROOT/.claude/settings.local.json"
    candidates="$candidates $PROJECT_ROOT/.git/hooks/pre-commit"
    candidates="$candidates $PROJECT_ROOT/.husky/pre-commit"
    local c
    for c in $candidates; do
        if [ -f "$c" ] && grep -q 'coverage-check.sh' "$c" 2>/dev/null; then
            referenced=1; ref_in="$ref_in $(basename "$c")"
        fi
    done
    # Implement-Kette: irgendeine Datei unter .claude referenziert coverage-check.sh —
    # ABER die Hook-Datei selbst zaehlt nicht (eine Selbst-Referenz ist keine Registrierung).
    if [ "$referenced" = "0" ]; then
        local hit
        hit="$(grep -rls 'coverage-check.sh' "$PROJECT_ROOT/.claude" 2>/dev/null \
                | grep -v "/coverage-check.sh$" | head -1)"
        if [ -n "$hit" ]; then
            referenced=1; ref_in="$ref_in ${hit#$PROJECT_ROOT/}"
        fi
    fi

    if [ "$thr_ok" = "1" ] && [ "$referenced" = "1" ]; then
        record "coverage" "verdrahtet" "Hook + Schwellwerte (COVERAGE_PASS/WARN) vorhanden, referenziert in:${ref_in}." "$paths" "thresholds present; referenced"
    elif [ "$thr_ok" = "1" ] && [ "$referenced" = "0" ]; then
        record "coverage" "nominell" "Hook + Schwellwerte vorhanden, aber nirgends registriert/aufgerufen (settings.json / pre-commit / implement-Kette)." "$paths" "thresholds present; NOT referenced"
    else
        record "coverage" "nominell" "Hook vorhanden, aber Schwellwerte COVERAGE_PASS/COVERAGE_WARN fehlen im Skript." "$paths" "thresholds missing"
    fi
}

# ---------------------------------------------------------------------------
# Gate 3: Slopsquatting
# ---------------------------------------------------------------------------
check_slopsquatting() {
    local wl="$PROJECT_ROOT/.claude/hooks/slopsquatting/wordlist.txt"
    local dc="$PROJECT_ROOT/.claude/hooks/dependency-check.sh"
    local paths=".claude/hooks/slopsquatting/wordlist.txt  .claude/hooks/dependency-check.sh"

    # blind: Wordlist fehlt oder leer
    if ! nonempty_file "$wl"; then
        record "slopsquatting" "blind" "Wordlist fehlt oder ist leer (.claude/hooks/slopsquatting/wordlist.txt) — Offline-Schicht prueft nichts." "$paths" ""
        return
    fi

    # Alter: last_refreshed-Header ODER Datei-Mtime <= 90 Tage
    local header_days=""
    header_days="$(grep -E '^#[[:space:]]*last_refreshed:' "$wl" 2>/dev/null \
                    | sed -E 's/^#[[:space:]]*last_refreshed:[[:space:]]*//' | head -1)"
    local age_days="" via=""
    if [ -n "$header_days" ]; then
        # Header-Datum in Sekunden (BSD + GNU date)
        local hdr_epoch
        hdr_epoch="$(date -j -f '%Y-%m-%d' "$header_days" +%s 2>/dev/null || date -d "$header_days" +%s 2>/dev/null || echo "")"
        if [ -n "$hdr_epoch" ]; then
            age_days=$(( ( $(date +%s) - hdr_epoch ) / 86400 )); via="last_refreshed=$header_days"
        fi
    fi
    if [ -z "$age_days" ]; then
        age_days="$(file_age_days "$wl")"; via="mtime"
    fi

    # Registrierung: dependency-check.sh referenziert die Wordlist
    local registered=0
    if [ -f "$dc" ] && grep -q 'slopsquatting/wordlist.txt' "$dc" 2>/dev/null; then
        registered=1
    fi

    # Smoke-Test (Signal): ein bekannter Eintrag aus der Wordlist wird per grep erkannt
    # (gleiche Match-Logik wie dependency-check.sh check_wordlist).
    local entry signal=""
    entry="$(grep -vE '^[[:space:]]*#' "$wl" 2>/dev/null | grep -E '^[[:space:]]*[a-z]+:[^[:space:]]+' | head -1 | tr -d '[:space:]')"
    if [ -n "$entry" ]; then
        local eco pkg
        eco="${entry%%:*}"; pkg="${entry#*:}"
        if grep -vE '^[[:space:]]*#' "$wl" 2>/dev/null | grep -qiE "^[[:space:]]*${eco}:${pkg}[[:space:]]*$"; then
            signal="wordlist match: ${eco}:${pkg}"
        fi
    fi

    # Alters-Bewertung
    if [ -n "$age_days" ] && [ "$age_days" -gt 90 ]; then
        record "slopsquatting" "blind" "Wordlist ueberaltert (${age_days} Tage via ${via}, >90) — Refresh-Workflow laeuft nicht mehr." "$paths" "$signal"
        return
    fi

    if [ "$registered" = "1" ] && [ -n "$signal" ]; then
        record "slopsquatting" "verdrahtet" "Wordlist frisch (${age_days}d via ${via}) + von dependency-check.sh referenziert + Smoke-Test feuert." "$paths" "$signal"
    elif [ "$registered" = "0" ]; then
        record "slopsquatting" "nominell" "Wordlist da und frisch, aber dependency-check.sh referenziert sie nicht (Offline-Schicht haengt nicht im Hook)." "$paths" "$signal"
    else
        record "slopsquatting" "nominell" "Wordlist referenziert, aber Smoke-Test fand keinen pruefbaren Eintrag (<ecosystem>:<name>)." "$paths" "$signal"
    fi
}

# ---------------------------------------------------------------------------
# Gate 4: Layer-0 Bodyguard
# ---------------------------------------------------------------------------
check_bodyguard() {
    local hook="$PROJECT_ROOT/.claude/hooks/pre-edit-bodyguard.sh"
    local patt_dir="$PROJECT_ROOT/.claude/hooks/bodyguard/patterns"
    local settings1="$PROJECT_ROOT/.claude/settings.json"
    local settings2="$PROJECT_ROOT/.claude/settings.local.json"
    local paths=".claude/hooks/pre-edit-bodyguard.sh  .claude/hooks/bodyguard/patterns/*.yml  .claude/bodyguard.local.yml  settings.json(Edit|Write|MultiEdit)"

    # blind: Hook fehlt ODER Pattern-Dateien fehlen/leer
    if [ ! -f "$hook" ]; then
        record "bodyguard" "blind" "Hook .claude/hooks/pre-edit-bodyguard.sh fehlt — Layer-0 prueft nichts." "$paths" ""
        return
    fi
    local has_patterns=0
    if [ -d "$patt_dir" ]; then
        local pf
        for pf in "$patt_dir"/*.yml; do
            [ -f "$pf" ] || continue
            if nonempty_file "$pf"; then has_patterns=1; break; fi
        done
    fi
    if [ "$has_patterns" = "0" ]; then
        record "bodyguard" "blind" "Pattern-Dateien .claude/hooks/bodyguard/patterns/*.yml fehlen oder sind leer — Hook hat keine Muster." "$paths" ""
        return
    fi

    # Matcher in settings.json: Edit|Write|MultiEdit + pre-edit-bodyguard.sh referenziert
    local matcher_ok=0 sf
    for sf in "$settings1" "$settings2"; do
        [ -f "$sf" ] || continue
        if grep -q 'pre-edit-bodyguard.sh' "$sf" 2>/dev/null \
           && grep -qE 'Edit\|Write\|MultiEdit|Edit\|Write|"Edit"' "$sf" 2>/dev/null; then
            matcher_ok=1
        fi
    done

    if [ "$matcher_ok" = "0" ]; then
        record "bodyguard" "nominell" "Hook + Pattern-Dateien vorhanden, aber kein Edit|Write|MultiEdit-Matcher in settings.json registriert — Hook feuert nie." "$paths" ""
        return
    fi

    # Signal-Test: synthetischer AWS-Key-Edit muss geblockt werden (Exit 1 + [BODYGUARD] BLOCKIERT).
    local signal="" st="$SCRIPT_DIR/signal-tests/bodyguard-canary-edit.sh"
    if [ -f "$st" ]; then
        local out rc
        out="$(bash "$st" "$hook" 2>&1)"; rc=$?
        if [ "$rc" = "1" ] && printf '%s' "$out" | grep -q '\[BODYGUARD\] BLOCKIERT'; then
            signal="blocked: [BODYGUARD] BLOCKIERT (exit 1)"
            record "bodyguard" "verdrahtet" "Hook + Pattern-Dateien + Matcher vorhanden, Signal-Test (AWS-Key-Edit) wird hart geblockt." "$paths" "$signal"
        else
            signal="NOT blocked (rc=$rc)"
            record "bodyguard" "nominell" "Hook registriert, aber Signal-Test blockt synthetischen AWS-Key-Edit NICHT (rc=$rc) — Muster greifen nicht." "$paths" "$signal"
        fi
    else
        record "bodyguard" "nominell" "Hook + Matcher vorhanden, aber Signal-Test-Helfer fehlt — Wiring nicht hart verifiziert." "$paths" "signal-test missing"
    fi
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
run_gate() {
    case "$1" in
        semgrep)        check_semgrep ;;
        coverage)       check_coverage ;;
        slopsquatting)  check_slopsquatting ;;
        bodyguard)      check_bodyguard ;;
        *) echo "[gate-checks] Unbekanntes Gate: $1" >&2; exit 2 ;;
    esac
}

case "$GATE" in
    all)
        check_semgrep
        check_coverage
        check_slopsquatting
        check_bodyguard
        ;;
    *) run_gate "$GATE" ;;
esac

# ---------------------------------------------------------------------------
# Override-Auswertung + Exit-Code
# ---------------------------------------------------------------------------
is_overridden() {
    local name="$1"
    case ",$OVERRIDE_GATES," in
        *,"$name",*) return 0 ;;
        *) return 1 ;;
    esac
}

EXIT=0
i=0
while [ $i -lt ${#R_NAME[@]} ]; do
    if [ "${R_STATUS[$i]}" = "blind" ] && ! is_overridden "${R_NAME[$i]}"; then
        EXIT=1
    fi
    i=$((i+1))
done

# ---------------------------------------------------------------------------
# Ausgabe
# ---------------------------------------------------------------------------
if [ "$FORMAT" = "machine" ]; then
    i=0
    while [ $i -lt ${#R_NAME[@]} ]; do
        ov=""
        is_overridden "${R_NAME[$i]}" && ov=" override=accepted"
        # note maschinenfreundlich: doppelte Anfuehrungszeichen entschaerfen
        n="$(printf '%s' "${R_NOTE[$i]}" | sed 's/"/'"'"'/g')"
        printf 'gate=%s status=%s%s note="%s"\n' "${R_NAME[$i]}" "${R_STATUS[$i]}" "$ov" "$n"
        i=$((i+1))
    done
else
    printf '\n  Quality-Gate-Audit — Wiring-Status (PROJECT_ROOT: %s)\n\n' "$PROJECT_ROOT"
    printf '  %-14s | %-11s | %s\n' "GATE" "STATUS" "BEGRUENDUNG"
    printf '  %s\n' "---------------+-------------+------------------------------------------------"
    i=0
    while [ $i -lt ${#R_NAME[@]} ]; do
        mark=""
        is_overridden "${R_NAME[$i]}" && [ "${R_STATUS[$i]}" = "blind" ] && mark=" (override)"
        printf '  %-14s | %-11s | %s%s\n' "${R_NAME[$i]}" "${R_STATUS[$i]}" "${R_NOTE[$i]}" "$mark"
        i=$((i+1))
    done
    printf '\n  Exit: %s  (0=alle verdrahtet/akzeptiert ueberschrieben, 1=>=1 blind ohne Override)\n\n' "$EXIT"
fi

exit "$EXIT"
