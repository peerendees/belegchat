#!/usr/bin/env python3
"""test_model_drift_report.py — unittest fuer model-drift-report.py (BOO-362).

Fixtures folgen dem realen meta.json-Schema (implement/SKILL.md, BOO-84): sowohl
`override_audit[]` als auch `token_tracking.iterations[]`. Deckt ab:
  * Modell->Tier-Aufloesung (exakt, Prefix mit Datums-Suffix, Alias, unbekannt),
  * Drift aus override_audit,
  * Drift aus token_tracking,
  * kein Drift, wenn genutztes Tier == empfohlenes Tier,
  * leere Tracking-Felder -> kein erfundener Drift.

stdlib-only. Laeuft mit: python3 -m unittest test_model_drift_report
"""
import importlib.util
import os
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_SCRIPT = os.path.join(_HERE, "model-drift-report.py")


def _load():
    spec = importlib.util.spec_from_file_location("model_drift_report", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


mdr = _load()

# Realistischer Tier-Index (Ausschnitt aus model-tiers.json).
VIDX = mdr.build_version_index({
    "haiku": {"current_version": "claude-haiku-4-5"},
    "sonnet": {"current_version": "claude-sonnet-4-6"},
    "opus": {"current_version": "claude-opus-4-8"},
    "fable": {"current_version": "claude-fable-5"},
})


class TestModelToTier(unittest.TestCase):
    def test_exact_match(self):
        self.assertEqual(mdr.model_to_tier("claude-opus-4-8", VIDX), "opus")

    def test_prefix_match_with_date_suffix(self):
        # Reales meta.json-Beispiel nutzt claude-haiku-4-5-20251001.
        self.assertEqual(mdr.model_to_tier("claude-haiku-4-5-20251001", VIDX), "haiku")

    def test_alias_match(self):
        self.assertEqual(mdr.model_to_tier("sonnet", VIDX), "sonnet")

    def test_unknown_model_is_question_mark(self):
        self.assertEqual(mdr.model_to_tier("gpt-4", VIDX), "?")

    def test_empty_is_question_mark(self):
        self.assertEqual(mdr.model_to_tier("", VIDX), "?")


class TestDriftFromOverrideAudit(unittest.TestCase):
    def test_override_haiku_to_sonnet_is_drift(self):
        meta = {
            "story_id": "BOO-72",
            "override_audit": [{
                "skill": "implement-iterations",
                "recommended_tier": "haiku",
                "actual_model": "claude-sonnet-4-6",
                "override_origin": "cli-flag",
            }],
        }
        rows = mdr.drift_rows_for_meta(meta, VIDX)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["recommended_tier"], "haiku")
        self.assertEqual(rows[0]["actual_tier"], "sonnet")
        self.assertEqual(rows[0]["source"], "override_audit")

    def test_override_same_tier_is_no_drift(self):
        meta = {
            "story_id": "BOO-1",
            "override_audit": [{
                "skill": "implement",
                "recommended_tier": "opus",
                "actual_model": "claude-opus-4-8",
                "override_origin": "none",
            }],
        }
        self.assertEqual(mdr.drift_rows_for_meta(meta, VIDX), [])


class TestDriftFromTokenTracking(unittest.TestCase):
    def test_iteration_tier_mismatch_is_drift(self):
        meta = {
            "story_id": "BOO-15",
            "token_tracking": {"iterations": [{
                "iteration_label": "step-5-core",
                "skill_invoked": "implement",
                "model_used": "claude-sonnet-4-6",
                "model_tier": "opus",
            }]},
        }
        rows = mdr.drift_rows_for_meta(meta, VIDX)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["actual_tier"], "sonnet")
        self.assertEqual(rows[0]["source"], "token_tracking")

    def test_iteration_match_is_no_drift(self):
        meta = {
            "story_id": "BOO-15",
            "token_tracking": {"iterations": [{
                "iteration_label": "step-6a",
                "skill_invoked": "implement-iterations",
                "model_used": "claude-haiku-4-5-20251001",
                "model_tier": "haiku",
            }]},
        }
        self.assertEqual(mdr.drift_rows_for_meta(meta, VIDX), [])

    def test_empty_tracking_yields_no_drift(self):
        # Capture-Hook inaktiv: keine Iterationen -> kein erfundener Befund.
        meta = {"story_id": "BOO-9", "token_tracking": {}, "override_audit": []}
        self.assertEqual(mdr.drift_rows_for_meta(meta, VIDX), [])


class TestScan(unittest.TestCase):
    def test_scan_counts_and_skips_unreadable(self):
        # Nicht-existente Datei -> unreadable, kein Crash.
        rows, scanned, unreadable = mdr.scan(["/nonexistent/meta.json"], VIDX)
        self.assertEqual(scanned, 0)
        self.assertEqual(unreadable, 1)
        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
