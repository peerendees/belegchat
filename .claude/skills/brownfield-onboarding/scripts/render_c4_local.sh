#!/usr/bin/env bash
# render_c4_local.sh — Offline-C4-Render fuer brownfield-onboarding (BOO-475).
#
# DE: Nimmt die in Schritt 10 selbst erzeugte Structurizr-DSL
#     (docs/_intake/brownfield/architecture/*.dsl) und rendert sie OFFLINE nach
#     Mermaid + eine in Obsidian direkt lesbare `C4-Diagramme.md`. Kein Docker,
#     kein Online-Dienst, kein Structurizr-MCP noetig. Portabel: findet ein lokales
#     JDK ueber JAVA_HOME / /usr/libexec/java_home / PATH / bekannte Keg-Pfade und
#     die structurizr-cli ueber STRUCTURIZR_CLI_HOME / ~/tools / PATH — kein
#     hardcodierter Pfad wie /opt/homebrew.
# EN: Takes the Structurizr DSL self-generated in step 10
#     (docs/_intake/brownfield/architecture/*.dsl) and renders it OFFLINE to Mermaid
#     plus an Obsidian-readable `C4-Diagramme.md`. No Docker, no online service, no
#     Structurizr MCP required. Portable: discovers a local JDK via JAVA_HOME /
#     /usr/libexec/java_home / PATH / known keg paths and the structurizr-cli via
#     STRUCTURIZR_CLI_HOME / ~/tools / PATH — no hardcoded path like /opt/homebrew.
#
# Bash 3.2 kompatibel (macOS System-Bash). Nur Standard-Tools (bash, java, cat, find).
#
# Exit-Codes (fuer den Preflight in Schritt 10b auswertbar):
#   0  Rendering erfolgreich (Mermaid + C4-Diagramme.md geschrieben)
#   2  Render-Tools fehlen (JDK und/oder structurizr-cli) — Hinweis + Runbook-Link
#   3  Keine DSL im Intake-Pfad gefunden (nichts zu rendern)
#   4  Rendering fehlgeschlagen (structurizr-cli lief, aber kein .mmd entstand)
set -euo pipefail

RUNBOOK="docs/runbooks/c4-rendering-setup.md"
# Scan NUR auf den Intake-Pfad — nie das ganze Repo (Constraint BOO-475).
DEFAULT_DSL_DIR="docs/_intake/brownfield/architecture"

usage() {
  cat <<'USAGE'
render_c4_local.sh — Offline-C4-Render (Structurizr-DSL -> Mermaid -> Obsidian-Note)

Usage:
  bash brownfield-onboarding/scripts/render_c4_local.sh [DSL_DIR]

Argumente:
  DSL_DIR   Verzeichnis mit *.dsl (Default: docs/_intake/brownfield/architecture)

Umgebungsvariablen (optional, ueberschreiben die Auto-Erkennung):
  JAVA_HOME              Pfad zu einem JDK (>= 17; getestet mit 21)
  STRUCTURIZR_CLI_HOME   Verzeichnis mit structurizr.sh (structurizr-cli-Entpackung)

Setup / Installation der Tools: siehe docs/runbooks/c4-rendering-setup.md
USAGE
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac

log()  { printf '[c4-render] %s\n' "$*"; }
warn() { printf '[c4-render] %s\n' "$*" >&2; }

# --- JDK-Erkennung: JAVA_HOME -> java_home -> funktionierendes java auf PATH ->
#     bekannte (keg-only) Homebrew-/Linux-Pfade. Gibt einen JAVA_HOME-Pfad aus. ---
find_java_home() {
  # 1) Explizit gesetztes JAVA_HOME (hat Vorrang).
  if [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/java" ]; then
    printf '%s\n' "$JAVA_HOME"; return 0
  fi
  # 2) macOS-Helfer fuer registrierte JDKs (keg-only Homebrew taucht hier NICHT auf).
  if [ -x /usr/libexec/java_home ]; then
    jh="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home 2>/dev/null || true)"
    if [ -n "$jh" ] && [ -x "${jh}/bin/java" ]; then
      printf '%s\n' "$jh"; return 0
    fi
  fi
  # 3) java auf PATH — aber nur, wenn es WIRKLICH laeuft (/usr/bin/java kann ein
  #    Stub ohne Runtime sein). JAVA_HOME = dirname(dirname(java)).
  if command -v java >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
    jbin="$(command -v java)"
    ( cd "$(dirname "$jbin")/.." 2>/dev/null && pwd ) && return 0
  fi
  # 4) Bekannte Standort-Kandidaten (Homebrew ARM + Intel keg-only, Linux-Pakete).
  for c in \
    /opt/homebrew/opt/openjdk@21 /opt/homebrew/opt/openjdk \
    /usr/local/opt/openjdk@21 /usr/local/opt/openjdk \
    /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-21-openjdk-amd64 \
    /usr/lib/jvm/default-java ; do
    if [ -x "${c}/bin/java" ]; then printf '%s\n' "$c"; return 0; fi
  done
  return 1
}

# --- structurizr-cli-Erkennung: STRUCTURIZR_CLI_HOME -> ~/tools (dokumentierte
#     Konvention) -> structurizr.sh auf PATH. Gibt den Pfad zu structurizr.sh aus. ---
find_structurizr() {
  if [ -n "${STRUCTURIZR_CLI_HOME:-}" ] && [ -x "${STRUCTURIZR_CLI_HOME}/structurizr.sh" ]; then
    printf '%s\n' "${STRUCTURIZR_CLI_HOME}/structurizr.sh"; return 0
  fi
  for c in \
    "$HOME/tools/structurizr-cli/structurizr.sh" \
    "$HOME/structurizr-cli/structurizr.sh" \
    "/opt/structurizr-cli/structurizr.sh" ; do
    if [ -x "$c" ]; then printf '%s\n' "$c"; return 0; fi
  done
  if command -v structurizr.sh >/dev/null 2>&1; then
    printf '%s\n' "$(command -v structurizr.sh)"; return 0
  fi
  return 1
}

tools_missing_hint() {
  warn ""
  warn "Offline-Render uebersprungen — die Render-Tools fehlen:"
  [ "${HAVE_JDK:-0}" = "1" ] || warn "  - kein lokales JDK gefunden (JAVA_HOME/java_home/PATH/Keg-Pfade)"
  [ "${HAVE_CLI:-0}" = "1" ] || warn "  - keine structurizr-cli gefunden (STRUCTURIZR_CLI_HOME/~/tools/PATH)"
  warn ""
  warn "Die DSL bleibt das massgebliche Artefakt und ist unveraendert vorhanden."
  warn "Einmalige Einrichtung (einmal online, danach offline): ${RUNBOOK}"
  warn "Danach erneut ausfuehren:"
  warn "  bash brownfield-onboarding/scripts/render_c4_local.sh"
}

DSL_DIR="${1:-$DEFAULT_DSL_DIR}"

# --- Tools pruefen (graceful: fehlen -> Hinweis + Runbook, kein harter Crash) ---
HAVE_JDK=0; HAVE_CLI=0
JAVA_HOME_DETECTED=""; STRUCTURIZR_SH=""
if JAVA_HOME_DETECTED="$(find_java_home)"; then HAVE_JDK=1; fi
if STRUCTURIZR_SH="$(find_structurizr)"; then HAVE_CLI=1; fi

if [ "$HAVE_JDK" != "1" ] || [ "$HAVE_CLI" != "1" ]; then
  tools_missing_hint
  exit 2
fi

log "JDK:          ${JAVA_HOME_DETECTED}"
log "structurizr:  ${STRUCTURIZR_SH}"

# --- DSL im Intake-Pfad suchen (nur dort — kein Repo-weiter Scan) ---
if [ ! -d "$DSL_DIR" ]; then
  warn "Intake-Verzeichnis '${DSL_DIR}' existiert nicht — nichts zu rendern."
  warn "Erwartet: die in Schritt 10 erzeugte workspace.dsl unter ${DEFAULT_DSL_DIR}/."
  exit 3
fi

# Bash-3.2-sicheres Einsammeln der *.dsl (kein mapfile).
DSL_FILES=""
while IFS= read -r f; do
  DSL_FILES="${DSL_FILES}${f}"$'\n'
done <<EOF
$(find "$DSL_DIR" -maxdepth 1 -type f -name '*.dsl' | sort)
EOF
DSL_FILES="$(printf '%s' "$DSL_FILES" | sed '/^$/d')"

if [ -z "$DSL_FILES" ]; then
  warn "Keine *.dsl in '${DSL_DIR}' gefunden — nichts zu rendern (Schritt 10 zuerst?)."
  exit 3
fi

# --- Java fuer die structurizr-cli bereitstellen (die CLI ruft `java` vom PATH) ---
export JAVA_HOME="$JAVA_HOME_DETECTED"
export PATH="${JAVA_HOME}/bin:${PATH}"

OUT_DIR="$DSL_DIR"
NOTE="${OUT_DIR}/C4-Diagramme.md"

# Alte Mermaid-Exporte entfernen, damit die Note nur den aktuellen Stand spiegelt.
find "$OUT_DIR" -maxdepth 1 -type f -name 'structurizr-*.mmd' -exec rm -f {} +

# Render jede DSL einzeln; ein Fehler bei einer DSL bricht nicht alles ab —
# das Endurteil ist, ob ueberhaupt eine *.mmd entstand (sonst Exit 4).
OLD_IFS="$IFS"; IFS='
'
for dsl in $DSL_FILES; do
  [ -n "$dsl" ] || continue
  log "Render: $dsl"
  if ! "$STRUCTURIZR_SH" export -workspace "$dsl" -format mermaid -output "$OUT_DIR" >/dev/null 2>&1; then
    warn "structurizr-cli konnte '${dsl}' nicht rendern (DSL-Syntax pruefen)."
  fi
done
IFS="$OLD_IFS"

# .mmd-Ergebnisse einsammeln (nach der Subshell — daher erneut suchen).
MMD_FILES="$(find "$OUT_DIR" -maxdepth 1 -type f -name 'structurizr-*.mmd' | sort)"
if [ -z "$MMD_FILES" ]; then
  warn "structurizr-cli lief, aber es entstand keine *.mmd — DSL pruefen (Syntax?)."
  exit 4
fi

# --- Obsidian-lesbare Note bauen (Mermaid-Fences, provenance-Etikett fuers
#     Label-Gate im Kundenprojekt). ---
{
  echo "---"
  echo "provenance:"
  echo "  origin: ai-claude"
  echo "  classification: internal"
  echo "  status: draft"
  echo "---"
  echo
  echo "# C4-Diagramme (Brownfield-Befund)"
  echo
  echo "> Offline erzeugt aus der selbst erzeugten Structurizr-DSL via structurizr-cli"
  echo "> + Mermaid. In Obsidian direkt lesbar — kein Online-Dienst, kein Docker."
  echo "> Neu erzeugen: \`bash brownfield-onboarding/scripts/render_c4_local.sh\`."
  echo
  echo "$MMD_FILES" | while IFS= read -r f; do
    [ -n "$f" ] || continue
    name="$(basename "$f" .mmd | sed 's/^structurizr-//')"
    echo "## ${name}"
    echo
    echo '```mermaid'
    awk 1 "$f"   # garantiert einen abschliessenden Zeilenumbruch (mmd endet oft ohne)
    echo '```'
    echo
  done
} > "$NOTE"

COUNT="$(printf '%s\n' "$MMD_FILES" | sed '/^$/d' | wc -l | tr -d ' ')"
log "OK — ${COUNT} Mermaid-Diagramm(e) -> ${NOTE}"
exit 0
