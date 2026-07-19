#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""test_project_index_sensor.py — Regressions-Tests fuer den Projekt-Index-Sensor.

DE: Deckt die fuenf Zustaende (absent / fresh / stale / unstamped / unknown) plus
    die Praesentations-Helfer ab. `_git_head` wird gemockt, damit KEIN echtes git
    noetig ist — die Tests laufen deterministisch auf synthetischen Fixtures.
    Invariante (Anti-Fabrikation): der Sensor liefert nie ein erfundenes
    `fresh: false`, wo nichts gemessen wurde — dann ist `fresh` None.
EN: Covers the five states plus the presentation helpers; `_git_head` is mocked so
    no real git is required.

stdlib-only (unittest, tempfile, json, os).
"""
from __future__ import annotations

import json
import os
import tempfile
import unittest
from unittest import mock

import project_index_sensor as sensor

HEAD = "a" * 40
OTHER = "b" * 40


def _make_project(tmp: str, *, graph: bool, stamp) -> str:
    """Legt graphify-out/ mit optionalem graph.json + Stempel an.

    stamp: None -> keine Datei; "bad" -> unlesbar; dict -> geschrieben.
    """
    out = os.path.join(tmp, sensor.DEFAULT_OUT_DIR)
    os.makedirs(out, exist_ok=True)
    if graph:
        with open(os.path.join(out, sensor.GRAPH_NAME), "w", encoding="utf-8") as fh:
            json.dump({"nodes": [], "links": []}, fh)
    if stamp == "bad":
        with open(os.path.join(out, sensor.STAMP_NAME), "w", encoding="utf-8") as fh:
            fh.write("{ this is not json")
    elif isinstance(stamp, dict):
        with open(os.path.join(out, sensor.STAMP_NAME), "w", encoding="utf-8") as fh:
            json.dump(stamp, fh)
    return tmp


class SenseStates(unittest.TestCase):
    def test_absent_no_graph_is_neutral_skip(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=False, stamp=None)
            r = sensor.sense(tmp)
        self.assertFalse(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "absent")

    def test_fresh_when_stamp_matches_head(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp={"head_sha": HEAD, "engine": "x"})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertTrue(r["fresh"])
        self.assertEqual(r["status"], "fresh")

    def test_stale_when_stamp_differs_from_head(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp={"head_sha": OTHER, "engine": "x"})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertFalse(r["fresh"])
        self.assertEqual(r["status"], "stale")

    def test_unstamped_when_stamp_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp=None)
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "unstamped")

    def test_unstamped_when_stamp_unreadable(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp="bad")
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "unstamped")

    def test_unknown_when_no_git_head(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp={"head_sha": HEAD, "engine": "x"})
            with mock.patch.object(sensor, "_git_head", return_value=None):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "unknown")

    def test_unstamped_when_stamp_without_head_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=True, stamp={"engine": "x"})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense(tmp)
        self.assertTrue(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "unstamped")


class Presentation(unittest.TestCase):
    def test_observation_line_marker_maps(self):
        self.assertIn("[OK]", sensor.observation_line(
            {"status": "fresh", "detail": "d"}))
        self.assertIn("[WARN]", sensor.observation_line(
            {"status": "stale", "detail": "d"}))
        self.assertIn("[SKIP]", sensor.observation_line(
            {"status": "absent", "detail": "d"}))

    def test_frontmatter_fresh_null_when_not_measured(self):
        # Anti-Fabrikation: fresh bleibt null, nie erfundenes false.
        fm = sensor.frontmatter_block(
            {"present": True, "fresh": None, "status": "unstamped"})
        self.assertIn("present: true", fm)
        self.assertIn("fresh: null", fm)

    def test_frontmatter_false_when_stale(self):
        fm = sensor.frontmatter_block(
            {"present": True, "fresh": False, "status": "stale"})
        self.assertIn("fresh: false", fm)


class GitHeadNoSubprocess(unittest.TestCase):
    """Beweist HEAD-Aufloesung ohne git-Binary + ohne Subprozess (hand-gebautes .git)."""

    def _init_git(self, root: str) -> str:
        os.makedirs(os.path.join(root, ".git", "refs", "heads"))
        with open(os.path.join(root, ".git", "HEAD"), "w", encoding="utf-8") as fh:
            fh.write("ref: refs/heads/main\n")
        return root

    def test_loose_ref(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._init_git(tmp)
            with open(os.path.join(tmp, ".git", "refs", "heads", "main"), "w",
                      encoding="utf-8") as fh:
                fh.write(HEAD + "\n")
            self.assertEqual(sensor._git_head(os.path.realpath(tmp)), HEAD)

    def test_packed_refs_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._init_git(tmp)  # kein loose ref -> packed-refs muss greifen
            with open(os.path.join(tmp, ".git", "packed-refs"), "w",
                      encoding="utf-8") as fh:
                fh.write("# pack-refs with: peeled fully-peeled sorted\n")
                fh.write(f"{HEAD} refs/heads/main\n")
            self.assertEqual(sensor._git_head(os.path.realpath(tmp)), HEAD)

    def test_detached_head_direct_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, ".git"))
            with open(os.path.join(tmp, ".git", "HEAD"), "w", encoding="utf-8") as fh:
                fh.write(HEAD + "\n")
            self.assertEqual(sensor._git_head(os.path.realpath(tmp)), HEAD)

    def test_no_git_returns_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(sensor._git_head(os.path.realpath(tmp)))


class PathContainment(unittest.TestCase):
    def test_traversal_out_dir_is_neutral_absent(self):
        # boesartiges --out-dir darf nie ausserhalb der Wurzel lesen -> absent.
        with tempfile.TemporaryDirectory() as tmp:
            r = sensor.sense(tmp, out_dir=os.path.join("..", "..", "etc"))
        self.assertFalse(r["present"])
        self.assertEqual(r["status"], "absent")

    def test_resolve_within_blocks_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            root_real = os.path.realpath(tmp)
            self.assertIsNone(sensor._resolve_within(root_real, "../../etc/passwd"))
            inside = sensor._resolve_within(root_real, "graphify-out/graph.json")
            self.assertTrue(inside and inside.startswith(root_real + os.sep))


class SenseDocsStates(unittest.TestCase):
    """Doku-Index-Sensor (BOO-476): head_sha eingebettet in docs-index.json."""

    def _write(self, tmp, stamp):
        p = os.path.join(tmp, sensor.DOCS_INDEX_NAME)
        if stamp == "bad":
            with open(p, "w", encoding="utf-8") as fh:
                fh.write("{ not json")
        elif isinstance(stamp, dict):
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(stamp, fh)

    def test_absent_no_docs_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = sensor.sense_docs(tmp)
        self.assertFalse(r["present"])
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "absent")

    def test_fresh(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write(tmp, {"head_sha": HEAD, "files": {}})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense_docs(tmp)
        self.assertTrue(r["fresh"])
        self.assertEqual(r["status"], "fresh")

    def test_stale(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write(tmp, {"head_sha": OTHER})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense_docs(tmp)
        self.assertFalse(r["fresh"])
        self.assertEqual(r["status"], "stale")

    def test_unstamped_bad_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write(tmp, "bad")
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense_docs(tmp)
        self.assertIsNone(r["fresh"])
        self.assertEqual(r["status"], "unstamped")

    def test_unstamped_no_head_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write(tmp, {"files": {}})
            with mock.patch.object(sensor, "_git_head", return_value=HEAD):
                r = sensor.sense_docs(tmp)
        self.assertEqual(r["status"], "unstamped")

    def test_unknown_no_git(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write(tmp, {"head_sha": HEAD})
            with mock.patch.object(sensor, "_git_head", return_value=None):
                r = sensor.sense_docs(tmp)
        self.assertEqual(r["status"], "unknown")


class PresentationParametrized(unittest.TestCase):
    def test_frontmatter_key_and_name(self):
        fm = sensor.frontmatter_block(
            {"present": True, "fresh": True, "status": "fresh"}, key="doc_index")
        self.assertTrue(fm.startswith("doc_index:"))
        line = sensor.observation_line(
            {"status": "stale", "detail": "d"}, name="Doku-Index")
        self.assertIn("[WARN]", line)
        self.assertIn("Doku-Index-Sensor", line)


class MainExit(unittest.TestCase):
    def test_main_always_exit_zero_even_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=False, stamp=None)
            rc = sensor.main(["--root", tmp, "--format", "json"])
        self.assertEqual(rc, 0)

    def test_main_frontmatter_format_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_project(tmp, graph=False, stamp=None)
            rc = sensor.main(["--root", tmp, "--format", "frontmatter"])
        self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
