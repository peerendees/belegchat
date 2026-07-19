#!/usr/bin/env python3
"""model-drift-report.py — BOO-362 Audit-Auswertung.

Macht die interaktive Modell-Abweichung sichtbar: wo lief eine Story auf einem
anderen Modell als vom Skill empfohlen? Der unbeaufsichtigte Lauf (`/sprint-run --auto`,
Schleife via /goal) erzwingt die Policy hart (resolve-model.py --full); interaktiv bleibt
sie Empfehlung. Dieser
Report ist das Audit-Gegenstueck — er liest die Ist-Werte aus den Story-`meta.json`
und meldet den Drift.

Zwei bereits existierende, NICHT erfundene Quellen (Schema: implement/SKILL.md, BOO-84):
  1. `override_audit[]`            — pro Operator-Override eine Zeile mit
                                     `recommended_tier` vs `actual_model` (+ origin/operator).
  2. `token_tracking.iterations[]` — pro Iteration `model_tier` (empfohlen) vs
                                     `model_used` (tatsaechlich). Rekonstruiert Drift auch
                                     ohne expliziten Override-Eintrag.

`actual_model` -> Tier wird ueber `bootstrap/references/model-tiers.json`
(`current_version` je Tier, Prefix-Match wegen Datums-Suffix wie `-20251001`) aufgeloest.
Unbekannte Modelle werden als Tier `?` gefuehrt und ebenfalls gemeldet (kein stiller Drop).

Ehrliche Grenze: Ist der optionale Token-Capture-Hook nicht aktiv, bleiben die Felder
leer — dann meldet der Report schlicht „keine Tracking-Daten" statt Drift zu erfinden.

Sicherheit: Der Report scannt bewusst nur meta.json **unter der Scan-Wurzel** — jeder
Kandidat wird kanonisiert (`realpath`) und auf die Wurzel begrenzt (`_confine`), bevor eine
Datei-Op laeuft (Path-Injection-Guard S2083). Das Scan-Muster ist konstant
(`journal/reports/local/*/meta.json`).

stdlib-only. Usage:
  model-drift-report.py [--root PATH] [--json] [PATH ...]
    PATH ...     explizite meta.json-Dateien (unter der Wurzel; sonst Auto-Scan des Musters)
    --root       Repo-/Scan-Wurzel (Default: Auto-Discovery)
    --json       Maschinenlesbare Ausgabe statt Text
  Exit-Code: 0 immer (Report, kein Gate) — ausser Nutzungsfehler (2).
"""
import argparse
import glob as globmod
import json
import os
import sys

TIERS_REL = os.path.join("bootstrap", "references", "model-tiers.json")
DEFAULT_GLOB = os.path.join("journal", "reports", "local", "*", "meta.json")


def find_repo_root(start):
    d = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(d, TIERS_REL)):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def build_version_index(tiers):
    """{current_version: tier} — fuer Prefix-Aufloesung Modell -> Tier."""
    idx = {}
    for tier, spec in (tiers or {}).items():
        ver = spec.get("current_version")
        if ver:
            idx[ver] = tier
    return idx


def model_to_tier(model, version_index):
    """Loest einen Modell-Bezeichner (Version ODER Tier-Alias) auf sein Tier auf.

    Exakter Match -> Prefix-Match (Datums-Suffix wie -20251001) -> Alias-Match
    (der String IST schon ein Tier-Name). Sonst '?'.
    """
    if not model:
        return "?"
    if model in version_index:
        return version_index[model]
    for ver, tier in version_index.items():
        if model.startswith(ver):
            return tier
    if model in set(version_index.values()):
        return model
    return "?"


def drift_rows_for_meta(meta, version_index):
    """Liste von Drift-Zeilen (dict) fuer eine geladene meta.json.

    Eine Zeile = eine Abweichung recommended_tier != actual_tier. Quellen getrennt
    ('override_audit' | 'token_tracking'), damit klar bleibt, woher der Befund kommt.
    """
    rows = []
    story = meta.get("story_id", "?")

    # Quelle 1: expliziter Override-Audit-Trail.
    for entry in meta.get("override_audit") or []:
        rec = entry.get("recommended_tier")
        actual_model = entry.get("actual_model")
        actual_tier = model_to_tier(actual_model, version_index)
        if rec and actual_tier != rec:
            rows.append({
                "story_id": story,
                "skill": entry.get("skill", "?"),
                "recommended_tier": rec,
                "actual_model": actual_model or "?",
                "actual_tier": actual_tier,
                "source": "override_audit",
                "origin": entry.get("override_origin", "?"),
            })

    # Quelle 2: Iterations-Tracking (rekonstruiert Drift ohne Override-Eintrag).
    tt = meta.get("token_tracking") or {}
    for it in tt.get("iterations") or []:
        rec = it.get("model_tier")
        actual_model = it.get("model_used")
        actual_tier = model_to_tier(actual_model, version_index)
        if rec and actual_tier != rec:
            rows.append({
                "story_id": story,
                "skill": it.get("skill_invoked", "?"),
                "recommended_tier": rec,
                "actual_model": actual_model or "?",
                "actual_tier": actual_tier,
                "source": "token_tracking",
                "origin": it.get("iteration_label", "?"),
            })
    return rows


def load_meta(path):
    # Path-Injection-Guard (S2083): Datei-Op auf dem kanonisierten Pfad, nicht dem Rohwert.
    try:
        with open(os.path.realpath(path), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _confine(candidates, base):
    """Kanonisiert Kandidaten-Pfade und behaelt nur die unter `base` (Path-Injection-Guard).

    realpath() + startswith(base)-Containment ist das von S2083 anerkannte Sanitizer-Muster;
    die anschliessende Datei-Op laeuft auf dem kanonischen Rueckgabewert. Pfade ausserhalb der
    Scan-Wurzel werden verworfen (der Report scannt bewusst nur das Projekt).
    """
    base = os.path.realpath(base)
    kept = []
    for p in candidates:
        rp = os.path.realpath(p)
        if rp == base or rp.startswith(base + os.sep):
            kept.append(rp)
    return kept


def scan(paths, version_index):
    """-> (rows, scanned_count, unreadable_count)."""
    rows = []
    scanned = 0
    unreadable = 0
    for p in paths:
        meta = load_meta(p)
        if meta is None:
            unreadable += 1
            continue
        scanned += 1
        rows.extend(drift_rows_for_meta(meta, version_index))
    return rows, scanned, unreadable


def _format_text(rows, scanned, unreadable):
    lines = []
    lines.append("=" * 64)
    lines.append("  MODELL-DRIFT-REPORT (BOO-362)")
    lines.append("=" * 64)
    lines.append("  meta.json gelesen : %d (unlesbar/uebersprungen: %d)" % (scanned, unreadable))
    lines.append("  Drift-Zeilen      : %d" % len(rows))
    lines.append("")
    if not rows:
        lines.append("  Kein Drift — jede Story lief auf dem empfohlenen Tier")
        lines.append("  (oder es liegen keine Tracking-Daten vor: Capture-Hook inaktiv).")
        lines.append("=" * 64)
        return "\n".join(lines)
    header = "  {:<12} {:<26} {:<10} -> {:<22} {:<14} {}".format(
        "Story", "Skill", "empfohlen", "genutzt (Modell)", "= Tier", "Quelle/Origin")
    lines.append(header)
    lines.append("  " + "-" * 96)
    for r in rows:
        lines.append("  {:<12} {:<26} {:<10} -> {:<22} {:<14} {}/{}".format(
            r["story_id"], r["skill"][:26], r["recommended_tier"],
            r["actual_model"][:22], r["actual_tier"], r["source"], r["origin"]))
    lines.append("=" * 64)
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Modell-Drift-Report (BOO-362): recommended_tier vs actual_model.")
    parser.add_argument("paths", nargs="*", help="Explizite meta.json-Dateien (unter der Wurzel).")
    parser.add_argument("--root", default=None, help="Repo-/Scan-Wurzel.")
    parser.add_argument("--json", action="store_true", help="Maschinenlesbare Ausgabe.")
    args = parser.parse_args(argv)

    root = (args.root
            or find_repo_root(os.getcwd())
            or find_repo_root(os.path.dirname(os.path.abspath(__file__))))
    base = os.path.realpath(root or os.getcwd())

    tiers = {}
    # Kanonisierter Pfad in die Datei-Op (S2083); TIERS_REL ist konstant.
    tiers_path = os.path.realpath(os.path.join(base, TIERS_REL))
    if os.path.exists(tiers_path):
        try:
            with open(tiers_path, encoding="utf-8") as fh:
                tiers = json.load(fh).get("tiers", {})
        except (OSError, ValueError):
            tiers = {}
    version_index = build_version_index(tiers)

    # Kandidaten: explizite Pfade ODER der konstante Default-Glob unter der Wurzel.
    # Beide werden via _confine kanonisiert + auf die Scan-Wurzel begrenzt (Path-Injection-Guard).
    candidates = args.paths or sorted(globmod.glob(os.path.join(base, DEFAULT_GLOB)))
    paths = _confine(candidates, base)

    rows, scanned, unreadable = scan(paths, version_index)

    if args.json:
        print(json.dumps({
            "scanned": scanned,
            "unreadable": unreadable,
            "drift_count": len(rows),
            "drift": rows,
        }, indent=2, ensure_ascii=False))
    else:
        print(_format_text(rows, scanned, unreadable))
    return 0


if __name__ == "__main__":
    sys.exit(main())
