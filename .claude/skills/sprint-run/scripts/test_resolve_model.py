#!/usr/bin/env python3
"""test_resolve_model.py — unittest fuer resolve-model.py (BOO-170 + BOO-362).

Deckt ab:
  * Frontmatter-Parser (Inline-Kommentar wird abgeschnitten),
  * Tier-Aufloesung inkl. Default- und Unbekannt-Fallback,
  * HARTE Fable-Sperre fuer security-kritische Skills (BOO-306/BOO-362) — der
    Nachweis, dass security-architect & Co. NIE ueber fable geroutet werden,
  * Effort-Aufloesung (Frontmatter > Tier-Default > Map; ungueltiger Wert faellt zurueck),
  * die volle Flag-Kette aus `--full` (Format + Fallback + kein-fable-fuer-Security),
  * Rueckwaertskompatibilitaet des Version-Only-Modus.

stdlib-only, keine externen Deps. Laeuft mit: python3 -m unittest test_resolve_model
"""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_SCRIPT = os.path.join(_HERE, "resolve-model.py")
# Repo-Wurzel: sprint-run/scripts/ -> zwei Ebenen hoch.
_REPO = os.path.dirname(os.path.dirname(_HERE))


def _load_module():
    spec = importlib.util.spec_from_file_location("resolve_model", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rm = _load_module()


class TestFrontmatterParser(unittest.TestCase):
    def _skill(self, body):
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "SKILL.md"), "w", encoding="utf-8") as fh:
            fh.write(body)
        return d

    def test_reads_value_and_strips_inline_comment(self):
        d = self._skill("---\nname: x\nrecommended_model: opus  # BOO-169 Kommentar\n---\nBody\n")
        self.assertEqual(rm.read_frontmatter_field(d, "recommended_model"), "opus")

    def test_reads_effort_field(self):
        d = self._skill("---\nname: x\neffort: xhigh\n---\n")
        self.assertEqual(rm.read_frontmatter_field(d, "effort"), "xhigh")

    def test_missing_field_returns_none(self):
        d = self._skill("---\nname: x\n---\n")
        self.assertIsNone(rm.read_frontmatter_field(d, "recommended_model"))

    def test_missing_file_returns_none(self):
        self.assertIsNone(rm.read_frontmatter_field(tempfile.mkdtemp(), "recommended_model"))

    def test_ignores_field_outside_frontmatter(self):
        d = self._skill("---\nname: x\n---\nrecommended_model: fable\n")
        self.assertIsNone(rm.read_frontmatter_field(d, "recommended_model"))


class TestResolveTier(unittest.TestCase):
    def setUp(self):
        self.tiers, self.sec = rm.load_catalog(_REPO)

    def test_known_tier_passes_through(self):
        tier, note = rm.resolve_tier("implement", "opus", self.tiers, self.sec)
        self.assertEqual(tier, "opus")
        self.assertIsNone(note)

    def test_missing_recommendation_falls_back_to_sonnet(self):
        tier, note = rm.resolve_tier("whatever", None, self.tiers, self.sec)
        self.assertEqual(tier, "sonnet")
        self.assertIsNotNone(note)

    def test_unknown_tier_falls_back_to_sonnet(self):
        tier, note = rm.resolve_tier("whatever", "megatier", self.tiers, self.sec)
        self.assertEqual(tier, "sonnet")
        self.assertIsNotNone(note)

    def test_non_security_skill_may_use_fable(self):
        tier, note = rm.resolve_tier("architecture-review", "fable", self.tiers, self.sec)
        self.assertEqual(tier, "fable")
        self.assertIsNone(note)

    def test_security_critical_skill_fable_is_hard_downgraded_to_opus(self):
        # Kernnachweis BOO-306/BOO-362: security-kritisch NIE ueber fable.
        for skill in ("security-architect", "implement-security-findings", "threat-modeling"):
            tier, note = rm.resolve_tier(skill, "fable", self.tiers, self.sec)
            self.assertEqual(tier, "opus", "%s haette auf opus degradiert werden muessen" % skill)
            self.assertIn("SICHERHEITS-SPERRE", note)

    def test_security_skills_list_is_populated(self):
        # Regressionsschutz: leere Liste wuerde die Sperre still deaktivieren.
        self.assertIn("security-architect", self.sec)


class TestResolveEffort(unittest.TestCase):
    def setUp(self):
        self.tiers, _ = rm.load_catalog(_REPO)
        self.empty = tempfile.mkdtemp()  # kein SKILL.md -> kein Frontmatter-Effort

    def test_tier_default_effort(self):
        self.assertEqual(rm.resolve_effort(self.empty, "opus", self.tiers)[0], "high")
        self.assertEqual(rm.resolve_effort(self.empty, "haiku", self.tiers)[0], "low")
        self.assertEqual(rm.resolve_effort(self.empty, "fable", self.tiers)[0], "max")

    def test_frontmatter_effort_overrides_tier(self):
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "SKILL.md"), "w", encoding="utf-8") as fh:
            fh.write("---\nname: x\neffort: xhigh\n---\n")
        self.assertEqual(rm.resolve_effort(d, "haiku", self.tiers)[0], "xhigh")

    def test_invalid_frontmatter_effort_falls_back_to_tier(self):
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "SKILL.md"), "w", encoding="utf-8") as fh:
            fh.write("---\nname: x\neffort: turbo\n---\n")
        effort, note = rm.resolve_effort(d, "opus", self.tiers)
        self.assertEqual(effort, "high")
        self.assertIsNotNone(note)

    def test_unknown_tier_uses_default_map(self):
        self.assertEqual(rm.resolve_effort(self.empty, "ghost", self.tiers)[0], "medium")


def _run(*cli_args):
    """resolve-model.py als Subprozess -> (stdout, rc)."""
    # Test-Harness: fixe Argv-Liste (sys.executable + Skriptpfad), kein Shell, kein User-Input.
    res = subprocess.run(  # noqa: S603
        [sys.executable, _SCRIPT, *cli_args, "--repo-root", _REPO],
        capture_output=True, text=True,
    )
    return res.stdout.strip(), res.returncode


class TestCliModes(unittest.TestCase):
    def test_version_mode_backward_compatible(self):
        out, rc = _run("implement")
        self.assertEqual(rc, 0)
        self.assertEqual(out, "claude-opus-4-8")

    def test_tier_mode(self):
        out, _ = _run("bootstrap", "--tier")
        self.assertEqual(out, "sonnet")

    def test_effort_only_mode(self):
        out, _ = _run("implement", "--effort-only")
        self.assertEqual(out, "high")

    def test_full_mode_emits_three_flags(self):
        out, rc = _run("implement", "--full")
        self.assertEqual(rc, 0)
        self.assertEqual(out, "--model claude-opus-4-8 --fallback-model opus --effort high")

    def test_full_mode_custom_fallback(self):
        out, _ = _run("bootstrap", "--full", "--fallback", "sonnet")
        self.assertIn("--fallback-model sonnet", out)

    def test_full_mode_security_skill_never_fable(self):
        # security-architect ist opus im Katalog; die Kette darf nie fable enthalten.
        out, _ = _run("security-architect", "--full")
        self.assertIn("--model claude-opus-4-8", out)
        self.assertNotIn("fable", out)


if __name__ == "__main__":
    unittest.main()
