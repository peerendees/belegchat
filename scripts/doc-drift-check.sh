#!/usr/bin/env bash
# doc-drift-check.sh — Doku-Drift gegen die deklarierte Single Source of Truth
#
# SSoT sind zwei Tabellen: ARCHITECTURE_DESIGN.md §9 Referenzen und INDEX.md.
# Geprueft wird in beide Richtungen:
#   1. Registriert, aber nicht vorhanden  -> tote Referenz
#   2. Vorhanden, aber nicht registriert  -> unsichtbares Artefakt
#   3. Wesentlich aelter als der Code, den es beschreibt -> Frischehinweis
#
# Warn-only: Exit 0 auch bei Befunden, solange nicht --strict gesetzt ist.
# CONVENTIONS.md fuehrt `compliance_doc_gate: false` — der Aufrufer (z. B.
# /implement Schritt 0e) entscheidet, ob ein FAIL blockt.
#
# Angelegt am 08.08.2026: das Skript fehlte, der Drift-Check lief nie
# (docs/audits/2026-08-08-gate-verdrahtung.md).

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 2

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

ADD="ARCHITECTURE_DESIGN.md"
IDX="INDEX.md"
WARN=0
FAIL=0

echo "=== Doku-Drift-Check ==="

for datei in "$ADD" "$IDX"; do
  if [ ! -f "$datei" ]; then
    echo "FAIL: SSoT-Datei fehlt: $datei"
    FAIL=$((FAIL + 1))
  fi
done
[ "$FAIL" -gt 0 ] && { echo "=== Abbruch: SSoT unvollstaendig ==="; exit $([ "$STRICT" = 1 ] && echo 1 || echo 0); }

# Pfade aus beiden Tabellen einsammeln: erste Backtick-Zelle jeder Tabellenzeile.
registriert="$(grep -hoE '^\| *`[^`]+`' "$ADD" "$IDX" 2>/dev/null \
  | sed -E 's/^\| *`//; s/`$//' | sort -u)"

anzahl=$(printf '%s\n' "$registriert" | grep -c . || true)
echo "Registrierte Artefakte: $anzahl"

# --- 1. Tote Referenzen -------------------------------------------------------
echo
echo "[1/3] Registriert, aber nicht vorhanden"
tot=0
while IFS= read -r pfad; do
  [ -z "$pfad" ] && continue
  # Platzhalter und Nicht-Pfade ueberspringen
  case "$pfad" in
    *"XXX"*|*"<"*|*" "*) continue ;;
  esac
  # Pfade in Schwester-Repos relativ zum Elternverzeichnis pruefen
  if [ -e "$pfad" ]; then continue; fi
  if [ -e "../$pfad" ]; then continue; fi
  echo "  WARN: $pfad"
  tot=$((tot + 1))
done <<< "$registriert"
[ "$tot" -eq 0 ] && echo "  keine" || WARN=$((WARN + tot))

# --- 2. Unregistrierte, erwartbare Artefakte ---------------------------------
echo
echo "[2/3] Vorhanden, aber nicht registriert"
unreg=0
kandidaten="$(find docs specs -maxdepth 2 -name '*.md' -not -path '*/vault/*' 2>/dev/null | sort)"
kandidaten="$kandidaten
$(find specs/migrations -name '*.sql' 2>/dev/null | sort)"
# Sammel-Registrierungen aufloesen: `specs/BER-XXX.md` deckt jede konkrete
# Story-Spec ab, ein registriertes README deckt sein Verzeichnis ab. Ohne das
# meldet der Check jede Spec einzeln und das echte Signal geht unter.
abgedeckt() {
  local pfad="$1" eintrag muster
  while IFS= read -r eintrag; do
    [ -z "$eintrag" ] && continue
    [ "$eintrag" = "$pfad" ] && return 0
    case "$eintrag" in
      *XXX*|*"*"*)
        muster="${eintrag//XXX/*}"
        # shellcheck disable=SC2254
        case "$pfad" in $muster) return 0 ;; esac
        ;;
      */README.md)
        [ "${pfad#"${eintrag%README.md}"}" != "$pfad" ] && return 0
        ;;
    esac
  done <<< "$registriert"
  return 1
}

while IFS= read -r pfad; do
  [ -z "$pfad" ] && continue
  case "$pfad" in
    docs/vault/*|*TEMPLATE.md) continue ;;
  esac
  if ! abgedeckt "$pfad"; then
    echo "  WARN: $pfad"
    unreg=$((unreg + 1))
  fi
done <<< "$kandidaten"
[ "$unreg" -eq 0 ] && echo "  keine" || WARN=$((WARN + unreg))

# --- 3. Frische --------------------------------------------------------------
echo
echo "[3/3] Frische der Kern-Doku (letzte Aenderung)"
for datei in "$ADD" "$IDX" CLAUDE.md CONVENTIONS.md docs/SCHEMA.md docs/UEBERGABE.md; do
  [ -f "$datei" ] || continue
  letzte="$(git log -1 --format=%cs -- "$datei" 2>/dev/null || echo '?')"
  echo "  $datei: $letzte"
done

# --- Bilanz ------------------------------------------------------------------
echo
if [ "$WARN" -eq 0 ]; then
  echo "=== Doku-Drift-Check: PASS ==="
  exit 0
fi
echo "=== Doku-Drift-Check: $WARN Befund(e) ==="
if [ "$STRICT" = 1 ]; then
  echo "    --strict gesetzt -> Exit 1"
  exit 1
fi
echo "    warn-only (compliance_doc_gate: false) -> Exit 0"
exit 0
