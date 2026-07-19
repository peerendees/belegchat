#!/usr/bin/env python3
# dpo/scripts/test_dpo_audit.py — Unit-Tests fuer den Kontrollkatalog-Runner (BOO-87/BOO-427)
#
# Stdlib-only (unittest), kein PyYAML — wie der Runner selbst. Fokus: die fuenf
# check_typ-Mechaniken (inkl. der BOO-427-Typen grep-review und conditional-file)
# und der opt-in GAP-Exit. Laufen mit:
#   cd dpo/scripts && python3 -m unittest test_dpo_audit -v
import importlib.util
import os
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dpo_audit", os.path.join(_HERE, "dpo-audit.py"))
dpo_audit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dpo_audit)


class TempProject(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def write(self, rel, content=""):
        p = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return p


class TestFileChecks(TempProject):
    def test_file_exists_pass_und_gap(self):
        self.write("PRIVACY.md", "x")
        self.assertEqual(dpo_audit._check_file_exists("PRIVACY.md", self.root)[0], "PASS")
        self.assertEqual(dpo_audit._check_file_exists("FEHLT.md", self.root)[0], "GAP")

    def test_file_contains_case_insensitiv(self):
        self.write("PRIVACY.md", "## Privacy-by-Design-Ablauf")
        st, _ = dpo_audit._check_file_contains("PRIVACY.md::privacy-BY-design", self.root)
        self.assertEqual(st, "PASS")
        st, _ = dpo_audit._check_file_contains("PRIVACY.md::nicht-da", self.root)
        self.assertEqual(st, "GAP")


class TestGrepAbsent(TempProject):
    def test_treffer_ist_gap(self):
        self.write("src/a.py", "key = 'AKIAABCDEFGHIJKLMNOP'")
        st, detail = dpo_audit._check_grep_absent(r"AKIA[0-9A-Z]{16}", self.root)
        self.assertEqual(st, "GAP")
        self.assertIn("a.py", detail)

    def test_kein_treffer_ist_pass(self):
        self.write("src/a.py", "print('ok')")
        self.assertEqual(dpo_audit._check_grep_absent(r"AKIA[0-9A-Z]{16}", self.root)[0], "PASS")


class TestGrepReview(TempProject):
    """BOO-427: Heuristik-Grep — Treffer ist Hinweis (REVIEW-NEEDED), nie Urteil (GAP)."""

    def test_pii_spalte_in_migration_ist_review_needed(self):
        self.write("migrations/001_add_email.sql", "ALTER TABLE orders ADD COLUMN email TEXT;")
        st, detail = dpo_audit._check_grep_review(
            r"migrations::(?i)\b(email|phone|telefon|birth|geburt)\w*\b", self.root)
        self.assertEqual(st, "REVIEW-NEEDED")
        self.assertIn("001_add_email.sql", detail)
        self.assertIn("kein Urteil", detail)

    def test_scope_filter_greift(self):
        # Treffer AUSSERHALB des Scopes darf nicht feuern
        self.write("src/mailer.py", "email = load_email()")
        st, _ = dpo_audit._check_grep_review(r"migrations::(?i)\bemail\b", self.root)
        self.assertEqual(st, "PASS")

    def test_ohne_scope_alle_source_dateien(self):
        self.write("src/mailer.py", "birthdate = row['birthdate']")
        st, _ = dpo_audit._check_grep_review(r"(?i)\bbirthdate\b", self.root)
        self.assertEqual(st, "REVIEW-NEEDED")

    def test_ungueltiges_muster(self):
        self.assertEqual(dpo_audit._check_grep_review("migrations::([", self.root)[0],
                         "REVIEW-NEEDED")


class TestConditionalFile(TempProject):
    """BOO-427: WENN::DANN — PII-Pfade deklariert, aber Privacy-Add-on inaktiv -> GAP."""

    ARG = ".claude/personal-data-paths.json::PRIVACY.md"

    def test_wenn_fehlt_ist_na_pass(self):
        self.assertEqual(dpo_audit._check_conditional_file(self.ARG, self.root)[0], "PASS")

    def test_beide_vorhanden_ist_pass(self):
        self.write(".claude/personal-data-paths.json", "{}")
        self.write("PRIVACY.md", "x")
        self.assertEqual(dpo_audit._check_conditional_file(self.ARG, self.root)[0], "PASS")

    def test_wenn_ohne_dann_ist_gap(self):
        self.write(".claude/personal-data-paths.json", "{}")
        st, detail = dpo_audit._check_conditional_file(self.ARG, self.root)
        self.assertEqual(st, "GAP")
        self.assertIn("PRIVACY.md fehlt", detail)


class TestRunCheckDispatch(TempProject):
    def test_review_typ_und_unbekannter_typ(self):
        self.assertEqual(dpo_audit.run_check({"check_typ": "review"}, self.root)[0],
                         "REVIEW-NEEDED")
        self.assertEqual(dpo_audit.run_check({"check_typ": "quatsch"}, self.root)[0],
                         "REVIEW-NEEDED")

    def test_neue_typen_registriert(self):
        self.assertIn("grep-review", dpo_audit._CHECKS)
        self.assertIn("conditional-file", dpo_audit._CHECKS)


class TestGapExit(TempProject):
    """BOO-427: Default Exit 0 (Bericht); --gap-exit/DPO_GAP_EXIT=1 -> Exit 1 bei GAP."""

    def _run_main(self, gap_exit):
        # Minimal-Katalog als Projekt-Overlay: ein Control, das sicher GAP ist.
        self.write(".claude/dpo/controls/test.yml",
                   "- id: T-001\n  titel: t\n  check_typ: file-exists\n  check_arg: FEHLT.md\n")
        env_backup = dict(os.environ)
        argv_backup = list(sys.argv)
        try:
            os.environ["DPO_PROJECT_ROOT"] = self.root
            os.environ["DPO_AUDIT_DATE"] = "2026-01-01"
            os.environ.pop("DPO_GAP_EXIT", None)
            sys.argv = ["dpo-audit.py"] + (["--gap-exit"] if gap_exit else [])
            return dpo_audit.main()
        finally:
            os.environ.clear()
            os.environ.update(env_backup)
            sys.argv = argv_backup

    def test_default_bleibt_exit_0(self):
        self.assertEqual(self._run_main(gap_exit=False), 0)

    def test_gap_exit_liefert_1(self):
        self.assertEqual(self._run_main(gap_exit=True), 1)


class TestParseCatalog(TempProject):
    def test_flacher_parser_liest_controls(self):
        p = self.write("controls/x.yml",
                       "# Kommentar\n- id: A-001\n  titel: 'Eins'\n  check_typ: review\n"
                       "- id: A-002\n  titel: \"Zwei\"\n  check_typ: file-exists\n  check_arg: x\n")
        cat = dpo_audit.parse_catalog(p)
        self.assertEqual([c["id"] for c in cat], ["A-001", "A-002"])
        self.assertEqual(cat[0]["titel"], "Eins")


if __name__ == "__main__":
    unittest.main()
