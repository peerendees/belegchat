#!/usr/bin/env python3
"""Grep-Back — deterministische Rueckpruefung aller Belege (BOO-297, Phase 2).

Liest das Beleg-Register (claims.yml) und prueft jeden Beleg gegen die Quelle:
Datei oeffnen, Zeile lesen, Zitat-Schnipsel vergleichen (whitespace-normalisiert).
Ein Beleg, der nicht bestaetigt werden kann, macht den Lauf rot — Unbelegtes
fliegt raus oder wird UNKNOWN, aber es bleibt nie still im Befund stehen.

Aufruf:
    python3 grep_back.py --claims docs/_intake/brownfield/claims.yml --src-root /pfad/zur/quelle

Exit-Codes: 0 = alle Belege bestaetigt · 1 = mindestens ein Beleg gescheitert ·
2 = Aufruf-/Umgebungsfehler (z.B. PyYAML fehlt, Datei fehlt).
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("FEHLER: PyYAML fehlt. Installieren mit: python3 -m pip install pyyaml", file=sys.stderr)
    sys.exit(2)


def normalize(s: str) -> str:
    return " ".join(s.split())


def resolve_contained(base: Path, candidate: Path) -> "Path | None":
    """Kanonisiert candidate und gibt den aufgeloesten Pfad zurueck, wenn er innerhalb
    von base liegt — sonst None (Schutz gegen Path-Traversal). Alle Datei-Operationen
    laufen ausschliesslich auf dem hier zurueckgegebenen, validierten Pfad."""
    base_real = Path(os.path.realpath(base))
    cand_real = Path(os.path.realpath(candidate))
    if cand_real != base_real and not cand_real.is_relative_to(base_real):
        return None
    return cand_real


def check_evidence(ev: dict, cid: str, src_root: Path) -> "str | None":
    """Prueft einen einzelnen Beleg. Gibt Fehlertext oder None (bestanden) zurueck."""
    f, line, quote = ev.get("file"), ev.get("line"), ev.get("quote", "")
    label = f"{cid} -> {f}:{line}"
    if not f or not isinstance(line, int) or line < 1:
        return f"{label}: evidence unvollstaendig (file/line Pflicht)"
    path = resolve_contained(src_root, src_root / f)
    if path is None:
        return f"{label}: Pfad verlaesst SRC_ROOT (Path-Traversal-Verdacht) — abgelehnt"
    if not path.is_file():
        return f"{label}: Datei nicht gefunden"
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as e:
        return f"{label}: nicht lesbar ({e})"
    if line > len(lines):
        return f"{label}: Zeile {line} existiert nicht (Datei hat {len(lines)})"
    if quote:
        # Zitat muss auf der Zeile (+/- 2 Zeilen Toleranz fuer Umbrueche) vorkommen
        window = " ".join(lines[max(0, line - 3):min(len(lines), line + 2)])
        if normalize(quote) not in normalize(window):
            return f"{label}: Zitat nicht bestaetigt: {quote[:60]!r}"
    return None


def check_claim(claim: dict, src_root: Path) -> list:
    """Prueft alle evidence-Eintraege eines Claims. Gibt Fehler-Liste zurueck."""
    cid = claim.get("id", "<ohne-id>")
    confidence = claim.get("confidence", "")
    evidence = claim.get("evidence") or []

    if confidence == "EXTRACTED" and not evidence:
        return [f"{cid}: confidence EXTRACTED ohne evidence — nicht zulaessig"]
    if confidence == "UNKNOWN":
        return []  # UNKNOWN behauptet nichts — nichts zu pruefen

    results = (check_evidence(ev, cid, src_root) for ev in evidence)
    return [r for r in results if r is not None]


def main() -> int:
    ap = argparse.ArgumentParser(description="Grep-Back: Belege gegen die Quelle rueckpruefen")
    ap.add_argument("--claims", required=True, help="Pfad zu claims.yml")
    ap.add_argument("--src-root", required=True, help="Quell-Root (SRC_ROOT, read-only)")
    args = ap.parse_args()

    src_root = Path(os.path.realpath(args.src_root))
    # Schutz gegen Path-Traversal via CLI: das Register muss im aktuellen Projekt liegen
    # (Aufruf aus dem Projekt-Root, Artefakte entstehen nur im Projekt — Anti-Fabrikations-Regel 4).
    claims_path = resolve_contained(Path.cwd(), Path(args.claims))
    if claims_path is None:
        print(f"FEHLER: {args.claims} liegt ausserhalb des Projekts (cwd) — abgelehnt", file=sys.stderr)
        return 2
    if not claims_path.is_file():
        print(f"FEHLER: {claims_path} nicht gefunden", file=sys.stderr)
        return 2
    if not src_root.is_dir():
        print(f"FEHLER: SRC_ROOT {src_root} ist kein Verzeichnis", file=sys.stderr)
        return 2

    data = yaml.safe_load(claims_path.read_text(encoding="utf-8")) or {}
    claims = data.get("claims") or []
    if not claims:
        print("FEHLER: keine claims[] im Register — leeres Register ist kein bestandener Check", file=sys.stderr)
        return 2

    all_errors, checked = [], 0
    for claim in claims:
        checked += 1
        all_errors.extend(check_claim(claim, src_root))

    print(f"grep-back: {checked} Claims geprueft, {len(all_errors)} Beleg-Fehler.")
    for e in all_errors:
        print(f"  FAIL {e}")
    if all_errors:
        print("Ergebnis: ROT — unbelegte Aussagen entfernen oder auf UNKNOWN stufen, dann erneut pruefen.")
        return 1
    print("Ergebnis: alle Belege bestaetigt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
