#!/usr/bin/env python3
"""resolve-model.py — BOO-170 (+ BOO-362)

Loest fuer einen Skill die Claude-Code-Modell-Flags deterministisch auf.

Kette (nutzt bestehende SSoT, kein neuer Doppel-Owner):
  1. <repo>/<skill>/SKILL.md  Frontmatter `recommended_model:`  -> Tier (haiku|sonnet|opus|fable)
  2. bootstrap/references/model-tiers.json  tiers[tier].current_version  -> Modell-Version
     bootstrap/references/model-tiers.json  tiers[tier].effort          -> Effort-Default
     bootstrap/references/model-tiers.json  _meta.security_critical_skills -> Fable-Sperre

Genutzt im unbeaufsichtigten `/sprint-run --auto`-Betrieb (ADR-4: die Story-Schleife
faehrt /goal mit nativen Subagents; einen Subprozess-pro-Story-Daemon gibt es nicht
mehr), um Modell-Flags fuer headless gestartete Laeufe deterministisch aufzuloesen —
z.B. einen /implement-Einzellauf als Story-Engine. Zwei Ausgabe-Modi:

  # Rueckwaertskompatibel — nur die Modell-Version (Default) bzw. das Tier:
    claude -p "/implement <ISSUE>" \\
      --model "$(python3 sprint-run/scripts/resolve-model.py implement)" \\
      --permission-mode dontAsk

  # BOO-362 — die volle, hart erzwungene Flag-Kette:
    claude -p "/implement <ISSUE>" \\
      $(python3 sprint-run/scripts/resolve-model.py implement --full) \\
      --permission-mode dontAsk
  # emittiert z.B.:  --model claude-opus-4-8 --fallback-model opus --effort high

BOO-362 — Daemon = harte Policy: `--full` erzwingt zusaetzlich
  * `--fallback-model opus` (primaeres Tier, sonst Opus — nie Fable als Fallback), und
  * `--effort <level>` (Reasoning-Tiefe pro Tier/Skill).
`--effort` und `--fallback-model` existieren nativ ab Claude Code v2.1.193 (verifiziert;
BOO-170s Befund „kein --effort" ist veraltet).

Harte Sicherheitsregel (BOO-306/BOO-362): security-kritische Skills
(`_meta.security_critical_skills`: security-architect, implement-security-findings,
threat-modeling) laufen NACHWEISBAR auf genau opus, nie ueber fable — die
Cyber-Safety-Klassifizierer des fable-Tiers koennen gutartige Security-Arbeit
ablehnen. Eine fable-Zuweisung fuer diese Skills wird hart auf opus degradiert
(Audit-Argument FINMA/BaFin/MaRisk).

Ehrliche Grenze: Interaktiv bleibt `recommended_model` eine Empfehlung — Claude Code
kann das Modell des laufenden Loops nicht per Skill wechseln. Nativer Zwang ginge nur
ueber hardcodiertes `model:`-Frontmatter (nimmt Operator-Freiheit + nagelt die Version
fest), bewusst nicht. Dieses Skript liefert nur den Skill-Default; die Override-
Hierarchie (`--model`-CLI > CLAUDE.md model_overrides > Skill-Default) bleibt gewahrt.

Dependency-frei (kein PyYAML — Frontmatter wird zeilenweise geparst), analog
dpo-audit.py / docs_drift_check.py. Faellt im Zweifel auf das 'sonnet'-Tier zurueck
(sicherer Default laut model-tiers.json) und meldet nach stderr.

Usage:
  resolve-model.py <skill-name> [--tier|--effort-only|--full] [--fallback MODEL] [--repo-root PATH]
    (ohne Modus)   gibt die Modell-Version aus (rueckwaertskompatibel)
    --tier         gibt das Tier (haiku|sonnet|opus|fable) aus
    --effort-only  gibt das Effort-Level (low|medium|high|xhigh|max) aus
    --full         gibt die volle Flag-Kette aus:
                     --model <version> --fallback-model <fb> --effort <level>
    --fallback     Fallback-Modell fuer --full (Default: opus)
    --repo-root    Repo-Wurzel explizit setzen (sonst Auto-Discovery)
"""
import json
import os
import re
import sys

DEFAULT_TIER = "sonnet"
DEFAULT_FALLBACK = "opus"
TIERS_REL = os.path.join("bootstrap", "references", "model-tiers.json")

# Gegen `claude --help` (v2.1.193) verifiziert: low, medium, high, xhigh, max.
VALID_EFFORT = ("low", "medium", "high", "xhigh", "max")
# Nur Fallback, wenn ein Tier kein eigenes `effort`-Feld traegt (Alt-Katalog).
DEFAULT_EFFORT_BY_TIER = {
    "haiku": "low",
    "sonnet": "medium",
    "opus": "high",
    "fable": "max",
}


def find_repo_root(start):
    d = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(d, TIERS_REL)):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def read_frontmatter_field(skill_dir, field):
    """Liest ein Frontmatter-Feld (z.B. `recommended_model:` / `effort:`) aus SKILL.md.

    Zeilenweiser Parser (kein PyYAML). Der Wert wird nach dem ersten Token abgeschnitten,
    damit ein Inline-Kommentar (z.B. `recommended_model: opus  # BOO-169`) nicht mitwandert.
    Gibt None zurueck, wenn Datei/Feld fehlen.
    """
    skill_md = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_md):
        return None
    pattern = re.compile(r"\s*" + re.escape(field) + r":\s*([A-Za-z0-9_.-]+)")
    in_frontmatter = False
    with open(skill_md, encoding="utf-8") as fh:
        for idx, raw in enumerate(fh):
            line = raw.rstrip("\n")
            if idx == 0 and line.strip() == "---":
                in_frontmatter = True
                continue
            if in_frontmatter and line.strip() == "---":
                break
            if in_frontmatter:
                m = pattern.match(line)
                if m:
                    return m.group(1)
    return None


def load_catalog(root):
    """Liest model-tiers.json -> (tiers-dict, security_critical_skills-set)."""
    with open(os.path.join(root, TIERS_REL), encoding="utf-8") as fh:
        data = json.load(fh)
    tiers = data.get("tiers", {})
    sec = set(data.get("_meta", {}).get("security_critical_skills", []))
    return tiers, sec


def resolve_tier(skill, requested_tier, tiers, security_skills):
    """Bestimmt das effektive Tier inkl. Fallbacks und harter Fable-Sperre.

    `requested_tier` ist das aus SKILL.md gelesene `recommended_model` (oder None).
    Rueckgabe: (tier, note). `note` != None, wenn eine Sperre/ein Fallback griff (fuer stderr).
    """
    tier = requested_tier
    note = None
    if not tier:
        note = "kein recommended_model fuer '%s' -> Fallback '%s'" % (skill, DEFAULT_TIER)
        tier = DEFAULT_TIER
    elif tier not in tiers:
        note = "Tier '%s' nicht in model-tiers.json -> Fallback '%s'" % (tier, DEFAULT_TIER)
        tier = DEFAULT_TIER if DEFAULT_TIER in tiers else tier

    # HARTE Sicherheitsregel (BOO-306/BOO-362): security-kritische Skills nie ueber fable.
    if tier == "fable" and skill in security_skills:
        note = ("SICHERHEITS-SPERRE: '%s' ist security-kritisch -> fable auf opus degradiert "
                "(Cyber-Refusal-Caveat, Audit-Argument)" % skill)
        tier = "opus"
    return tier, note


def resolve_effort(skill_dir, tier, tiers):
    """Effort-Level: SKILL.md-Frontmatter `effort:` > Tier-Default > harte Default-Map.

    Ein ungueltiger Frontmatter-Wert wird verworfen (stderr) und faellt auf den
    Tier-Default zurueck. Rueckgabe: (effort, note-or-None).
    """
    note = None
    fm = read_frontmatter_field(skill_dir, "effort")
    if fm:
        if fm in VALID_EFFORT:
            return fm, None
        note = ("effort '%s' aus SKILL.md ungueltig (erlaubt: %s) -> Tier-Default"
                % (fm, "|".join(VALID_EFFORT)))
        # weiter zum Tier-Default
    tier_effort = tiers.get(tier, {}).get("effort")
    if tier_effort in VALID_EFFORT:
        return tier_effort, note
    return DEFAULT_EFFORT_BY_TIER.get(tier, "medium"), note


def tier_version(tier, tiers):
    """current_version des Tiers, sonst der Tier-Alias selbst (letzter Fallback)."""
    return tiers.get(tier, {}).get("current_version") or tier


def _take_value(args, flag):
    """Entfernt `flag VALUE` aus args (in-place). -> (value|None, rc|None); rc=2 bei fehlendem Wert.

    Ist `flag` nicht vorhanden, kommt (None, None) zurueck.
    """
    if flag not in args:
        return None, None
    i = args.index(flag)
    if i + 1 >= len(args):
        sys.stderr.write("resolve-model: %s erwartet einen Wert\n" % flag)
        return None, 2
    val = args[i + 1]
    del args[i:i + 2]
    return val, None


def _parse_argv(argv):
    """Zerlegt die CLI in (mode, fallback, repo_root, skill, rc).

    rc != None => sofort mit diesem Code beenden (Usage-/Wert-Fehler). Haelt main() flach
    (Cognitive Complexity), die eigentliche Aufloesung bleibt in main().
    """
    args = list(argv)
    mode = "version"
    for flag, name in (("--tier", "tier"), ("--effort-only", "effort"), ("--full", "full")):
        if flag in args:
            mode = name
            args = [a for a in args if a != flag]

    fallback, rc = _take_value(args, "--fallback")
    if rc is not None:
        return None, None, None, None, rc
    repo_root, rc = _take_value(args, "--repo-root")
    if rc is not None:
        return None, None, None, None, rc

    if not args:
        sys.stderr.write(
            "usage: resolve-model.py <skill-name> "
            "[--tier|--effort-only|--full] [--fallback MODEL] [--repo-root PATH]\n")
        return None, None, None, None, 2
    return mode, (fallback or DEFAULT_FALLBACK), repo_root, args[0], None


def main(argv):
    mode, fallback, repo_root, skill, rc = _parse_argv(argv)
    if rc is not None:
        return rc

    root = (repo_root
            or find_repo_root(os.getcwd())
            or find_repo_root(os.path.dirname(os.path.abspath(__file__))))
    if not root:
        sys.stderr.write(
            "resolve-model: model-tiers.json nicht gefunden -> Fallback-Tier '%s'\n"
            % DEFAULT_TIER)
        print(DEFAULT_TIER if mode in ("tier", "version") else "")
        return 0

    tiers, security_skills = load_catalog(root)
    skill_dir = os.path.join(root, skill)

    requested = read_frontmatter_field(skill_dir, "recommended_model")
    tier, tier_note = resolve_tier(skill, requested, tiers, security_skills)
    if tier_note:
        sys.stderr.write("resolve-model: %s\n" % tier_note)

    if mode == "tier":
        print(tier)
        return 0

    effort, effort_note = resolve_effort(skill_dir, tier, tiers)
    if effort_note:
        sys.stderr.write("resolve-model: %s\n" % effort_note)

    if mode == "effort":
        print(effort)
        return 0

    version = tier_version(tier, tiers)

    if mode == "full":
        print("--model %s --fallback-model %s --effort %s" % (version, fallback, effort))
        return 0

    # Default: nur die Version (rueckwaertskompatibel).
    print(version)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
