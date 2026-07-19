#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""project_index_sensor.py — Sprint-Review-Sensor fuer den Projekt-Index (BOO-471).

DE: MISST, ob im Projekt ein Projekt-Index existiert und ob sein Stempel frisch
    ist — als SENSOR, nicht als Zwang. Rein LESEND: keine Datei wird geschrieben,
    kein Prozess blockiert. Der `sprint-review`-Skill ruft dieses Script am Ende
    einer Review-Periode auf und faltet die Beobachtung in das Sprint-Journal
    (Frontmatter `project_index: {present, fresh}` + eine Beobachtungszeile).

    WARUM nur Anwesenheit + Frische (Anti-Fabrikation): «wurde der Index in der
    Session tatsaechlich abgefragt» liesse sich nur ueber ein Nutzungs-Log belegen,
    das trivial austrickbar waere (einmal abfragen, Ergebnis ignorieren) — dieselbe
    «Fake-Haerte», die die ADR knowledge-graph-strategie fuer Lese-Gates ablehnt.
    Darum misst dieser Sensor ausschliesslich, was am Dateisystem BELEGBAR ist:
      * Anwesenheit  — existieren graph.json + index-stamp.json?
      * Frische      — Stempel `head_sha` == aktueller git HEAD?
    Das ist ein VERFUEGBARKEITS-/WARTUNGSSIGNAL (ein veralteter Stempel heisst:
    gebaut, aber niemand baut neu -> schwaches Signal, dass er genutzt wird), KEINE
    erfundene «Nutzungsquote».

    Ausgabe ist BEOBACHTUNG/WARN, NIE FAIL: der Exit-Code ist immer 0. «Kein
    Index» (lite / nicht gebaut) ist ein NEUTRALES Ueberspringen, kein Fehler.

EN: MEASURES whether a project index exists and whether its stamp is fresh — a
    SENSOR, not a gate. Read-only: writes nothing, blocks nothing. The
    `sprint-review` skill calls this at the end of a review period and folds the
    observation into the sprint journal (frontmatter `project_index:
    {present, fresh}` + one observation line).

    Why presence + freshness only (anti-fabrication): "was the index actually
    queried this session" could only be shown via a usage log that is trivially
    gameable (query once, ignore the result) — the same "fake hardness" the ADR
    rejects for read-gates. So this sensor measures only what is PROVABLE from the
    filesystem: presence (graph.json + index-stamp.json) and freshness (stamp
    `head_sha` == current git HEAD). That is an AVAILABILITY/MAINTENANCE signal,
    not an invented "usage rate". Output is OBSERVATION/WARN, never FAIL: exit code
    is always 0. "No index" (lite / not built) is a neutral skip, not an error.

Engine-Neutralitaet: dieses Script kennt nur die Datei-Konvention des Index
    (`graphify-out/graph.json` + `graphify-out/index-stamp.json`, Stempel-Schema
    {head_sha, built_at, engine}). Die Regeln nennen es «Projekt-Index», nie den
    Extraktor-Produktnamen — die Engine ist austauschbar (ADR-Entscheid 3).

Stempel-Schema (von project_index_build.sh geschrieben, BOO-448):
    {"head_sha": "...", "built_at": "...", "engine": "..."}.

Verwandt: project_index_query.py (Abfrage-Layer, BOO-448) nutzt dieselbe Stempel-
    Logik fuer seine Drift-Warnung. Dieser Sensor DUPLIZIERT sie bewusst nicht
    ueber einen Import, sondern bleibt eigenstaendig lauffaehig (der Query-Layer
    kann in einem Projekt fehlen, der Sensor soll trotzdem messen koennen).

Doku: HANDBUCH Anhang BN (Query-Layer) + ADR knowledge-graph-strategie.
Tests: test_project_index_sensor.py (stdlib unittest, synthetische Fixtures).
stdlib-only (argparse, json, os, sys) — **kein Subprozess, keine OS-Kommandos.**
    HEAD wird direkt aus `.git` gelesen (loose refs / packed-refs / detached /
    Worktrees via commondir); alle Datei-Zugriffe laufen ueber einen
    Path-Containment-Guard (`_resolve_within`), damit fehlerhafte/boesartige
    CLI-Argumente (`--root`, `--out-dir`) nie aus der Projekt-Wurzel ausbrechen.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

DEFAULT_OUT_DIR = "graphify-out"
GRAPH_NAME = "graph.json"
STAMP_NAME = "index-stamp.json"
DOCS_INDEX_NAME = "docs-index.json"  # Doku-Index (BOO-447/BOO-476): head_sha eingebettet


def _resolve_within(root_real: str, candidate: str) -> str | None:
    """Kanonisiere `candidate` (relativ zu root_real) und gib ihn NUR zurueck,
    wenn er innerhalb von `root_real` bleibt — sonst None.

    Containment-Guard gegen Traversal (`../`, Symlinks, absolute Pfade) aus
    fehlerhaften/boesartigen CLI-Argumenten (Muster wie label_check.resolve_within):
    vor JEDEM Dateizugriff, damit der Sensor nie eine Datei ausserhalb der
    geprueften Wurzel anfasst.
    """
    target = os.path.realpath(
        candidate if os.path.isabs(candidate) else os.path.join(root_real, candidate))
    if target == root_real or target.startswith(root_real + os.sep):
        return target
    return None


def _read_text(path: str | None) -> str | None:
    """Lies eine Textdatei getrimmt; None bei fehlendem Pfad/Lesefehler.

    `path` MUSS bereits durch `_resolve_within` gefuehrt sein (Containment-Guard) —
    so laeuft jeder Datei-Zugriff nur auf kanonisierten, in der Wurzel liegenden
    Pfaden, nie auf roher CLI-Eingabe.
    """
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError:
        return None


def _packed_ref(git_dir: str, ref: str) -> str | None:
    """SHA von `ref` aus `.git/packed-refs` (Fallback, wenn kein loose ref)."""
    for ln in (_read_text(_resolve_within(git_dir, "packed-refs")) or "").splitlines():
        ln = ln.strip()
        if ln and ln[0] not in "#^":
            sha, _, name = ln.partition(" ")
            if name == ref:
                return sha or None
    return None


def _git_head(root_real: str) -> str | None:
    """Aktueller HEAD-SHA, direkt aus `.git` gelesen — **ohne Subprozess**.

    Loest ref-HEAD, detached-HEAD und packed-refs auf. Jeder Zugriff laeuft ueber
    `_resolve_within` (Containment), sodass fehlerhafte CLI-Eingaben und ein
    traversierender HEAD-Inhalt (`ref: ../..`) nie aus der Wurzel ausbrechen.
    Bewusste Grenze: `.git`-als-Datei (Linked-Worktree/Submodule) -> None; der
    Sensor meldet dann `unknown` statt eine falsche Frische zu behaupten.
    """
    git_dir = _resolve_within(root_real, ".git")
    if not git_dir or not os.path.isdir(git_dir):
        return None
    head = _read_text(_resolve_within(git_dir, "HEAD"))
    if not head:
        return None
    if not head.startswith("ref:"):                        # detached: direkter SHA
        return head
    ref = head[len("ref:"):].strip()
    loose = _read_text(_resolve_within(git_dir, ref))      # ref ausserhalb .git -> None
    return loose or _packed_ref(git_dir, ref)


def sense(root: str, out_dir: str = DEFAULT_OUT_DIR) -> dict:
    """Read-only Messung. Liefert immer ein Dict, wirft nie fuer 'kein Index'.

    Felder:
      present  — bool: graph.json UND index-stamp.json existieren.
      fresh    — bool|None: Stempel head_sha == HEAD. None = nicht bestimmbar
                 (kein Index, kein git, oder Stempel fehlt/unlesbar).
      status   — 'absent' | 'fresh' | 'stale' | 'unstamped' | 'unknown'.
      detail   — kurze belegbare Begruendung (SHAs gekuerzt), nie erfunden.
    """
    # CLI-Argumente (root/out_dir) sind untrusted: kanonisieren + Containment-Guard
    # vor JEDEM Dateizugriff, damit `--out-dir ../../etc` nie ausbricht.
    root_real = os.path.realpath(root)
    graph_path = _resolve_within(root_real, os.path.join(out_dir, GRAPH_NAME))
    stamp_path = _resolve_within(root_real, os.path.join(out_dir, STAMP_NAME))

    graph_exists = bool(graph_path) and os.path.isfile(graph_path)
    stamp_exists = bool(stamp_path) and os.path.isfile(stamp_path)

    # --- Anwesenheit: der Index gilt nur MIT beiden Dateien als vorhanden. ---
    if not graph_exists:
        # Kein Graph -> lite / nicht gebaut -> NEUTRALES Ueberspringen, kein WARN.
        return {
            "present": False, "fresh": None, "status": "absent",
            "detail": f"kein Projekt-Index ({out_dir}/{GRAPH_NAME} fehlt) — "
                      f"lite/nicht gebaut, Sensor uebersprungen",
        }

    head = _git_head(root_real)

    if not stamp_exists:
        return {
            "present": True, "fresh": None, "status": "unstamped",
            "detail": f"Graph vorhanden, aber {out_dir}/{STAMP_NAME} fehlt — "
                      f"Frische unbestimmbar",
        }

    try:
        with open(stamp_path, encoding="utf-8") as fh:
            stamp = json.load(fh)
    except (OSError, ValueError):
        return {
            "present": True, "fresh": None, "status": "unstamped",
            "detail": f"Graph vorhanden, {out_dir}/{STAMP_NAME} unlesbar — "
                      f"Frische unbestimmbar",
        }

    graph_sha = str(stamp.get("head_sha") or "")

    if head is None:
        return {
            "present": True, "fresh": None, "status": "unknown",
            "detail": "Graph + Stempel vorhanden, aber kein git-HEAD "
                      "(kein Repo?) — Frische nicht vergleichbar",
        }
    if not graph_sha:
        return {
            "present": True, "fresh": None, "status": "unstamped",
            "detail": "Graph vorhanden, Stempel ohne head_sha — "
                      "Frische unbestimmbar",
        }

    if graph_sha == head:
        return {
            "present": True, "fresh": True, "status": "fresh",
            "detail": f"Projekt-Index vorhanden und frisch "
                      f"(Stempel {graph_sha[:9]} == HEAD)",
        }
    return {
        "present": True, "fresh": False, "status": "stale",
        "detail": f"Projekt-Index vorhanden, aber Stempel {graph_sha[:9]} "
                  f"!= HEAD {head[:9]} — gebaut, aber nicht neu gebaut "
                  f"(schwaches Nutzungssignal)",
    }


def sense_docs(root: str) -> dict:
    """Read-only Messung des Doku-Index (BOO-476). Analog zu `sense()`, aber der
    Stempel `head_sha` liegt EINGEBETTET in `docs-index.json` (kein separater
    Stempel wie beim Code-Graph). Liefert immer ein Dict, wirft nie fuer 'kein Index'.
    """
    root_real = os.path.realpath(root)
    idx_path = _resolve_within(root_real, DOCS_INDEX_NAME)

    if not idx_path or not os.path.isfile(idx_path):
        return {
            "present": False, "fresh": None, "status": "absent",
            "detail": f"kein Doku-Index ({DOCS_INDEX_NAME} fehlt) — "
                      f"lite/nicht gebaut, Sensor uebersprungen",
        }
    try:
        idx = json.loads(_read_text(idx_path) or "")
    except ValueError:
        idx = None
    if not isinstance(idx, dict):
        return {
            "present": True, "fresh": None, "status": "unstamped",
            "detail": f"{DOCS_INDEX_NAME} vorhanden, aber unlesbar/kein JSON — "
                      f"Frische unbestimmbar",
        }
    head = _git_head(root_real)
    if head is None:
        return {
            "present": True, "fresh": None, "status": "unknown",
            "detail": f"{DOCS_INDEX_NAME} vorhanden, aber kein git-HEAD "
                      f"(kein Repo?) — Frische nicht vergleichbar",
        }
    idx_sha = str(idx.get("head_sha") or "")
    if not idx_sha:
        return {
            "present": True, "fresh": None, "status": "unstamped",
            "detail": f"{DOCS_INDEX_NAME} ohne head_sha — Frische unbestimmbar",
        }
    if idx_sha == head:
        return {
            "present": True, "fresh": True, "status": "fresh",
            "detail": f"Doku-Index vorhanden und frisch (Stempel {idx_sha[:9]} == HEAD)",
        }
    return {
        "present": True, "fresh": False, "status": "stale",
        "detail": f"Doku-Index vorhanden, aber Stempel {idx_sha[:9]} != HEAD "
                  f"{head[:9]} — gebaut, aber nicht neu gebaut (schwaches Nutzungssignal)",
    }


# --- Praesentation: Beobachtungszeile fuers Sprint-Journal --------------------------

# Marker steuert nur die Optik im Journal — NIE ein Block. 'stale'/'unstamped'
# sind WARN-Beobachtungen, 'absent' ist ein neutraler Hinweis, 'fresh' ist OK.
_MARKER = {
    "fresh": "OK",
    "stale": "WARN",
    "unstamped": "WARN",
    "unknown": "INFO",
    "absent": "SKIP",
}


def observation_line(result: dict, name: str = "Projekt-Index") -> str:
    """Eine Zeile fuer den Sprint-Report / das Journal (kein Block). `name` =
    Anzeigename (z.B. «Code-Graph» / «Doku-Index»)."""
    marker = _MARKER.get(result["status"], "INFO")
    return f"[{marker}] {name}-Sensor: {result['detail']}"


def frontmatter_block(result: dict, key: str = "project_index") -> str:
    """YAML-Fragment fuer das Sprint-Journal-Frontmatter (minimal, auswertbar).
    `key` = Frontmatter-Schluessel (`project_index` / `doc_index`).

    `fresh: null` bleibt null (nicht false) wenn nicht bestimmbar — Zahlen-
    Disziplin: kein erfundenes false, wo nichts gemessen wurde.
    """
    present = "true" if result["present"] else "false"
    if result["fresh"] is None:
        fresh = "null"
    else:
        fresh = "true" if result["fresh"] else "false"
    return (
        f"{key}:\n"
        f"  present: {present}\n"
        f"  fresh: {fresh}\n"
        f"  status: {result['status']}"
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Read-only Projekt-Index-Sensor fuer sprint-review (BOO-471). "
                    "Exit-Code immer 0 — Sensor, kein Gate.")
    ap.add_argument("--root", default=".",
                    help="Projekt-Root (Default: aktuelles Verzeichnis)")
    ap.add_argument("--out-dir", default=DEFAULT_OUT_DIR,
                    help=f"Code-Graph-Ausgabeverzeichnis (Default: {DEFAULT_OUT_DIR})")
    ap.add_argument("--which", choices=["code", "docs", "both"], default="both",
                    help="welcher Index: code (Code-Graph), docs (Doku-Index), "
                         "both (Default — beide)")
    ap.add_argument("--format", choices=["line", "json", "frontmatter"],
                    default="line",
                    help="line = Beobachtungszeile(n) (Default), json = Rohdaten, "
                         "frontmatter = YAML-Fragment(e)")
    args = ap.parse_args(argv)

    # (Frontmatter-Schluessel, Anzeigename, Messung) — je nach --which.
    measured = []
    if args.which in ("code", "both"):
        measured.append(("project_index", "Code-Graph", sense(args.root, args.out_dir)))
    if args.which in ("docs", "both"):
        measured.append(("doc_index", "Doku-Index", sense_docs(args.root)))

    if args.format == "json":
        print(json.dumps({key: res for key, _, res in measured},
                         ensure_ascii=False, sort_keys=True))
    elif args.format == "frontmatter":
        print("\n".join(frontmatter_block(res, key) for key, _, res in measured))
    else:
        print("\n".join(observation_line(res, name) for _, name, res in measured))

    # Sensor, kein Gate: IMMER 0, egal was gemessen wurde.
    return 0


if __name__ == "__main__":
    sys.exit(main())
