#!/usr/bin/env python3
"""Intake-Gate — erzwingt, dass der Brownfield-Intake nicht still uebersprungen wird (BOO-481).

Hintergrund: BOO-474 sollte erzwingen, dass `brownfield-onboarding` nach dem Einlesen
des Codes die interaktiven Fragen stellt. Umgesetzt wurde das aber nur als Prosa im
SKILL — kein Skript prueft es. Genau deshalb ist der Skip mehrfach wieder aufgetreten
(Testlaeufe 2026-07-13 und -14). Prosa ist keine Erzwingung; dieses Skript ist es.

Prinzip (deterministisch, nicht LLM-Ermessen):
  Wenn ein Brownfield-Lauf stattfand (workspace.dsl ODER fact-graph.yml existiert),
  DANN muessen die Intake-Artefakte existieren UND ueber den Template-Kopf hinaus
  Inhalt haben — sonst FAIL (blockiert Commit / Abschluss).

Ehrlichkeits-Grenze (bewusst, kein Fake-Haerte-Versprechen):
  Das Gate erzwingt, dass die Fragen FESTGEHALTEN wurden — nicht, dass sie einem
  Menschen echt gestellt und durchdacht beantwortet wurden (Wahrheit != Anwesenheit).
  Es hebt den Boden (kein stiller Skip), nicht die Decke (Qualitaet).

Ausnahme-Pfad (dokumentierte Wahl, kein stiller Sprung):
  Enthaelt das Lauf-Manifest journal/brownfield-onboarding-map.yml eine Zeile
  `intake_gate_ack: <begruendung>` (z.B. dokumentierter Degradations-Pfad,
  Zeitkritik-Regel BOO-301), wird FAIL zu WARN herabgestuft — der Lauf bleibt gruen,
  aber die Ausnahme steht belegt im Manifest.

Aufruf:
    python3 check_intake_complete.py [--root .] [--quiet]

Exit-Codes:
    0  ok  — kein Lauf erkannt (n/a), oder Intake vollstaendig, oder Ausnahme belegt (WARN)
    1  FAIL — Lauf erkannt, aber Intake fehlt/leer und keine belegte Ausnahme (blockiert)
    2  Umgebungsfehler
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Relative Pfade unter dem Projekt-Root.
DSL_GLOB = "docs/_intake/brownfield/architecture/*.dsl"
FACT_GRAPH = "docs/_intake/brownfield/fact-graph.yml"
MANIFEST = "journal/brownfield-onboarding-map.yml"

# Pflicht-Artefakte nach erkanntem Lauf: (Pfad, Klartext-Rolle).
REQUIRED = [
    ("docs/_intake/brownfield/why/frageliste.md", "priorisierte Frageliste (Fragen erzeugt)"),
    ("docs/_intake/brownfield/intake-antworten.md", "Intake-Antworten (Antworten festgehalten)"),
]

# Greedy-Capture (kein backtracking-anfaelliges `.*?...\s*$`); der Wert wird in Python gestrippt.
ACK_RE = re.compile(r"^[ \t]*intake_gate_ack[ \t]*:[ \t]*(.*)$", re.MULTILINE)

_PLACEHOLDER_RE = re.compile(r"(?i)^(todo|tbd|platzhalter|n/?a|\.\.\.|-+)$")
_ONLY_TOKEN_RE = re.compile(r"^[<{].*[>}]$")  # eine Zeile, die nur aus einem Ersetzungs-Token besteht


def _strip_frontmatter(lines: list[str]) -> list[str]:
    """YAML-Frontmatter am Anfang (--- ... ---) abtrennen."""
    if not lines or lines[0].strip() != "---":
        return lines
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return lines[i + 1:]
    return lines


def _is_scaffold(line: str) -> bool:
    """True fuer Geruest-/Platzhalter-Zeilen, die nicht als echter Inhalt zaehlen."""
    if line.startswith(("#", ">")):  # Ueberschrift oder Callout/Zitat
        return True
    if line in ("---", "|---|", "|---|---|"):  # Trenner / Tabellen-Trennzeile
        return True
    core = line.strip("|").strip()
    if not core:
        return True
    return bool(_PLACEHOLDER_RE.match(core) or _ONLY_TOKEN_RE.match(core))


def substantive_lines(text: str) -> list[str]:
    """Zeilen mit echtem Inhalt — ohne Frontmatter, Ueberschriften, Platzhalter, Leerzeilen."""
    result = []
    for raw in _strip_frontmatter(text.splitlines()):
        s = raw.strip()
        if s and not _is_scaffold(s):
            result.append(s)
    return result


def run_detected(root: Path) -> bool:
    if list(root.glob(DSL_GLOB)):
        return True
    return (root / FACT_GRAPH).is_file()


def manifest_ack(root: Path) -> str | None:
    m = root / MANIFEST
    if not m.is_file():
        return None
    try:
        text = m.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    hit = ACK_RE.search(text)
    return hit.group(1).strip() if hit else None


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Erzwingt, dass der Brownfield-Intake nach einem Lauf nicht leer ist (BOO-481)."
    )
    ap.add_argument("--root", default=".", help="Projekt-Root (Default: aktuelles Verzeichnis)")
    ap.add_argument("--quiet", action="store_true", help="Nur bei FAIL/WARN ausgeben")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"FEHLER: --root '{root}' ist kein Verzeichnis.", file=sys.stderr)
        return 2

    if not run_detected(root):
        if not args.quiet:
            print("intake-gate: kein Brownfield-Lauf erkannt (keine workspace.dsl / fact-graph.yml) — n/a.")
        return 0

    # Ein Lauf fand statt -> Intake-Artefakte pruefen.
    problems = []
    for rel, role in REQUIRED:
        p = root / rel
        if not p.is_file():
            problems.append(f"FEHLT:  {rel}  — {role}")
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            print(f"FEHLER: {rel} nicht lesbar: {exc}", file=sys.stderr)
            return 2
        if not substantive_lines(content):
            problems.append(f"LEER:   {rel}  — {role} (nur Template-Kopf, kein Inhalt)")

    if not problems:
        if not args.quiet:
            print("intake-gate: OK — Brownfield-Lauf erkannt, Intake-Artefakte vorhanden und nicht leer.")
        return 0

    ack = manifest_ack(root)
    header = "intake-gate: Brownfield-Lauf erkannt, aber der Intake ist unvollstaendig:"
    body = "\n".join(f"  - {p}" for p in problems)

    if ack:
        # Belegte Ausnahme -> WARN statt FAIL (Lauf bleibt gruen).
        print(f"WARN — {header}\n{body}", file=sys.stderr)
        print(f"       Ausnahme belegt in {MANIFEST}: intake_gate_ack: {ack}", file=sys.stderr)
        return 0

    print(f"FAIL — {header}\n{body}", file=sys.stderr)
    print(
        "\nDer Intake wurde nach dem Einlesen des Codes still uebersprungen (BOO-481).\n"
        "Stelle die Fragen aus der Frageliste und halte die Antworten fest, ODER dokumentiere\n"
        f"eine belegte Ausnahme im Lauf-Manifest ({MANIFEST}) mit einer Zeile:\n"
        "    intake_gate_ack: <Grund, z.B. Degradations-Pfad / Zeitkritik-Regel BOO-301>",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
