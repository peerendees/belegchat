#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  phantom-gate-probe.sh — Phantom-Gate-Erkennung (BOO-370)
#  DE: Prueft rein GitHub-API-seitig, ob jeder im Branch-Ruleset als *required*
#      gefuehrte Status-Check auf den letzten N Commits TATSAECHLICH gepostet hat.
#      Ein Required-Check, der nie postet, ist ein PHANTOM-GATE: er blockt jeden PR,
#      ohne je zu pruefen (Beispiel: SonarCloud nach Org-Transfer, Session 04.07.).
#      Meldet — repariert NICHT. Kein Sonar-Zugang noetig.
#  EN: Purely GitHub-API-side check whether every status check declared *required*
#      in the branch ruleset ACTUALLY posted on the last N commits. A required check
#      that never posts is a PHANTOM GATE: it blocks every PR without ever checking.
#      Reports — does NOT repair. No Sonar access needed.
#
#  Status je Required-Check (spiegelt die verdrahtet/nominell/blind-Rubrik der Engine):
#    aktiv     — hat im Fenster (letzte N Commits) mindestens einmal gepostet
#    nominell  — required, aber im Fenster NIE gepostet  → Phantom-Gate / tot
#
#  Verifizierte API-Fakten (live gegen Vibecoder79/intentron, gh 2.87.3, 05.07.):
#    required : GET /repos/{o}/{r}/rules/branches/{b}
#               .[] | select(.type=="required_status_checks")
#                   | .parameters.required_status_checks[].context
#    check-runs: GET /repos/{o}/{r}/commits/{ref}/check-runs   → .check_runs[].name
#    status    : GET /repos/{o}/{r}/commits/{ref}/status       → .statuses[].context
#  Der beobachtete Namensraum ist die VEREINIGUNG aus Check-Run-name und Status-context.
#
#  Netz-Abhaengigkeit: nur `gh` (dessen eingebautes --jq; KEIN system-jq). bash-3.2.
#  Testbarkeit: sind PHANTOM_REQUIRED_FILE und PHANTOM_OBSERVED_FILE gesetzt, wird der
#  Netz-Fetch uebersprungen und die beiden Namenslisten (eine pro Zeile) aus diesen
#  Dateien gelesen — deterministischer Offline-Signal-Test ohne GitHub-Roundtrip.
#
#  Exit: 0 alle Required aktiv (oder keine geführt); 1 wenn >=1 nominell (Phantom);
#        2 Umgebungsproblem (gh fehlt/unauth, Repo unbestimmbar).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail   # bewusst KEIN -e: einzelne Fetches duerfen ohne Abbruch scheitern

REPO=""
BRANCH=""
LAST=20
FORMAT="table"

usage() {
    cat <<'HLP'
phantom-gate-probe.sh — Phantom-Gate-Erkennung (BOO-370)

Usage:
  phantom-gate-probe.sh [--repo owner/repo] [--branch <name>] [--last N]
                        [--format table|machine]

Optionen:
  --repo owner/repo   Ziel-Repo (Default: Auto-Erkennung aus `git remote`).
  --branch <name>     Branch (Default: Default-Branch des Repos via gh).
  --last N            Anzahl juengster Commits, ueber die "hat gepostet?" geprueft
                      wird (Default: 20).
  --format table      Menschenlesbare Tabelle (Default).
  --format machine    Parsebare Zeilen: check="<context>" status=<status>
  -h, --help          Diese Hilfe.

Status:
  aktiv     Required-Check hat im Fenster mindestens einmal gepostet.
  nominell  Required-Check hat im Fenster NIE gepostet  → Phantom-Gate / tot.

Exit: 0 alle aktiv (oder keine Required); 1 >=1 nominell; 2 Umgebungsproblem.
HLP
}

while [ $# -gt 0 ]; do
    case "$1" in
        --repo)   REPO="${2:-}"; shift 2 ;;
        --branch) BRANCH="${2:-}"; shift 2 ;;
        --last)   LAST="${2:-20}"; shift 2 ;;
        --format) FORMAT="${2:-table}"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "[phantom-gate] Unbekanntes Argument: $1" >&2; usage >&2; exit 2 ;;
    esac
done

# ---------------------------------------------------------------------------
# Reiner Kern: Klassifikation (netzfrei, testbar)
#   classify_phantom <required-file> <observed-file>
#   Beide Dateien: ein Check-Name/Context pro Zeile. Gibt Zeilen auf stdout aus:
#     <status>\t<context>
#   Zaehler werden im Parent-Shell AUS dem Ergebnis abgeleitet (nicht hier gesetzt),
#   weil der Aufrufer die Funktion in einer Command-Substitution ($(...)) nutzt und
#   Variablen-Zuweisungen aus einer Subshell nicht in den Parent zurueckwirken.
# ---------------------------------------------------------------------------
PHANTOM_COUNT=0
REQUIRED_COUNT=0
classify_phantom() {
    local req_file="$1" obs_file="$2"
    # Leerzeilen ignorieren; exakte, ganze-Zeile Uebereinstimmung (Check-Namen
    # enthalten Leerzeichen, daher zeilenweise + fgrep -x).
    local ctx status
    while IFS= read -r ctx || [ -n "$ctx" ]; do
        [ -n "$ctx" ] || continue
        if grep -Fxq -- "$ctx" "$obs_file" 2>/dev/null; then
            status="aktiv"
        else
            status="nominell"
        fi
        printf '%s\t%s\n' "$status" "$ctx"
    done < "$req_file"
}

# ---------------------------------------------------------------------------
# Netz-Fetch (nur wenn nicht injiziert)
# ---------------------------------------------------------------------------
detect_repo() {
    local url
    url="$(git remote get-url origin 2>/dev/null || echo "")"
    [ -n "$url" ] || return 1
    # git@github.com:owner/repo.git  ODER  https://github.com/owner/repo(.git)
    echo "$url" | sed -E 's#^git@[^:]+:##; s#^https?://[^/]+/##; s#\.git$##'
}

fetch_required_contexts() {
    # -> Zeilen: ein Required-Context pro Zeile
    gh api "/repos/$REPO/rules/branches/$BRANCH" \
        --jq '.[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context' \
        2>/dev/null
}

fetch_observed_signals() {
    # -> Zeilen: jeder je gepostete Check-Name/Context ueber die letzten N Commits
    local shas sha
    shas="$(gh api "/repos/$REPO/commits?sha=$BRANCH&per_page=$LAST" --jq '.[].sha' 2>/dev/null)"
    [ -n "$shas" ] || return 0
    for sha in $shas; do
        gh api "/repos/$REPO/commits/$sha/check-runs" --jq '.check_runs[].name' 2>/dev/null
        gh api "/repos/$REPO/commits/$sha/status"     --jq '.statuses[].context' 2>/dev/null
    done | sort -u
}

# ---------------------------------------------------------------------------
# Ablauf
# ---------------------------------------------------------------------------
TMP_REQ=""
TMP_OBS=""
cleanup() { [ -n "$TMP_REQ" ] && rm -f "$TMP_REQ"; [ -n "$TMP_OBS" ] && rm -f "$TMP_OBS"; }
trap cleanup EXIT

if [ -n "${PHANTOM_REQUIRED_FILE:-}" ] && [ -n "${PHANTOM_OBSERVED_FILE:-}" ]; then
    # --- Injektionsmodus (Offline-Test) ---
    [ -f "$PHANTOM_REQUIRED_FILE" ] || { echo "[phantom-gate] PHANTOM_REQUIRED_FILE nicht gefunden" >&2; exit 2; }
    [ -f "$PHANTOM_OBSERVED_FILE" ] || { echo "[phantom-gate] PHANTOM_OBSERVED_FILE nicht gefunden" >&2; exit 2; }
    TMP_REQ="$PHANTOM_REQUIRED_FILE"
    TMP_OBS="$PHANTOM_OBSERVED_FILE"
    trap - EXIT   # nicht die injizierten Fixtures loeschen
else
    # --- Netzmodus ---
    if ! command -v gh >/dev/null 2>&1; then
        echo "[phantom-gate] gh (GitHub CLI) nicht gefunden — Probe braucht gh. Siehe docs/handbuch/anhang-aa-*." >&2
        exit 2
    fi
    if ! gh auth status >/dev/null 2>&1; then
        echo "[phantom-gate] gh ist nicht authentifiziert (gh auth login). Probe abgebrochen." >&2
        exit 2
    fi
    [ -n "$REPO" ] || REPO="$(detect_repo || echo "")"
    if [ -z "$REPO" ]; then
        echo "[phantom-gate] Repo unbestimmbar — kein 'origin'-Remote und kein --repo owner/repo." >&2
        exit 2
    fi
    [ -n "$BRANCH" ] || BRANCH="$(gh api "/repos/$REPO" --jq '.default_branch' 2>/dev/null || echo "main")"

    TMP_REQ="$(mktemp)"; TMP_OBS="$(mktemp)"
    fetch_required_contexts > "$TMP_REQ"
    fetch_observed_signals  > "$TMP_OBS"
fi

# Klassifizieren (Command-Substitution → Zaehler danach aus RESULT ableiten)
RESULT="$(classify_phantom "$TMP_REQ" "$TMP_OBS")"
if [ -n "$RESULT" ]; then
    REQUIRED_COUNT="$(printf '%s\n' "$RESULT" | grep -c .)"
    PHANTOM_COUNT="$(printf '%s\n' "$RESULT" | grep -c '^nominell	')"
else
    REQUIRED_COUNT=0
    PHANTOM_COUNT=0
fi

# ---------------------------------------------------------------------------
# Ausgabe
# ---------------------------------------------------------------------------
if [ "$REQUIRED_COUNT" -eq 0 ]; then
    if [ "$FORMAT" = "machine" ]; then
        echo "required=0 note=\"kein Required-Status-Check im Ruleset\""
    else
        echo "Kein Required-Status-Check im Branch-Ruleset gefunden — nichts zu pruefen."
        echo "(Ist Branch-Protection gesetzt? Siehe setup-branch-protection.sh / Anhang AV.)"
    fi
    exit 0
fi

if [ "$FORMAT" = "machine" ]; then
    printf '%s\n' "$RESULT" | while IFS=$'\t' read -r status ctx; do
        [ -n "$ctx" ] || continue
        printf 'check="%s" status=%s\n' "$ctx" "$status"
    done
    echo "phantom_count=$PHANTOM_COUNT required_count=$REQUIRED_COUNT"
else
    echo "Phantom-Gate-Probe — Repo: ${REPO:-<injiziert>}  Branch: ${BRANCH:-<injiziert>}  Fenster: letzte ${LAST} Commits"
    echo "─────────────────────────────────────────────────────────────"
    printf '%s\n' "$RESULT" | while IFS=$'\t' read -r status ctx; do
        [ -n "$ctx" ] || continue
        case "$status" in
            aktiv)    printf '  ✅ aktiv     %s\n' "$ctx" ;;
            nominell) printf '  ☠️  nominell  %s   ← PHANTOM-GATE: required, aber postet nie\n' "$ctx" ;;
        esac
    done
    echo "─────────────────────────────────────────────────────────────"
    if [ "$PHANTOM_COUNT" -gt 0 ]; then
        echo "⚠️  $PHANTOM_COUNT Phantom-Gate(s) erkannt. Diese Checks blocken PRs, ohne zu pruefen."
        echo "    → Reparieren (App/Integration neu binden) ODER aus dem Ruleset entfernen. Operator-Entscheid."
        echo "    Org-Transfer-Fall (SonarCloud): docs/handbuch/anhang-aa-sonarcloud-setup-runbook-zwei-szenarien.md"
    else
        echo "✅ Alle $REQUIRED_COUNT Required-Checks haben im Fenster gepostet — keine Phantom-Gates."
    fi
fi

[ "$PHANTOM_COUNT" -gt 0 ] && exit 1
exit 0
