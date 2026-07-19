#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  PRE-EDIT-BODYGUARD — Layer-0 Governance Hook (BOO-86)  [Fixture-Kopie]
#  Kanonische Quelle: bootstrap/references/file-templates.md §pre-edit-bodyguard.sh
#  Claude Code PreToolUse Hook (Bash) — Matcher: Edit|Write|MultiEdit
#  Exit 1 → Tool-Call blockiert | Exit 0 → erlaubt (Default: Warnung)
#  BODYGUARD_STRICT=1 → warn-Muster werden zu block
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERN_DIR="${SCRIPT_DIR}/bodyguard/patterns"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
OVERLAY="${PROJECT_ROOT}/.claude/bodyguard.local.yml"
STRICT="${BODYGUARD_STRICT:-0}"

INPUT="$(cat)"

printf '%s' "$INPUT" | python3 -c "$(cat <<'PYEOF'
import sys, json, re, os
pattern_dir, overlay, strict = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)
ti = data.get("tool_input", {}) or {}
file_path = ti.get("file_path", "") or ""
content = ti.get("content") or ti.get("new_string") or ""
if not content and isinstance(ti.get("edits"), list):
    content = "\n".join(e.get("new_string", "") for e in ti["edits"])
if not content:
    sys.exit(0)
ext = os.path.splitext(file_path)[1].lower()
lang_map = {".js":"javascript",".mjs":"javascript",".cjs":"javascript",".ts":"javascript",
            ".tsx":"javascript",".jsx":"javascript",".py":"python",".java":"java",
            ".c":"c-cpp",".h":"c-cpp",".cpp":"c-cpp",".cc":"c-cpp",".hpp":"c-cpp"}
lang = lang_map.get(ext)
def parse_patterns(path):
    out, cur = [], None
    if not os.path.isfile(path):
        return out
    for line in open(path, encoding="utf-8"):
        s = line.rstrip("\n")
        if not s.strip() or s.lstrip().startswith("#"):
            continue
        if s.lstrip().startswith("- "):
            if cur: out.append(cur)
            cur, s = {}, s.lstrip()[2:]
        if ":" in s and cur is not None:
            k, v = s.split(":", 1)
            cur[k.strip()] = v.strip().strip("'\"")
    if cur: out.append(cur)
    return out
files = [os.path.join(pattern_dir, "_universal.yml"),
         os.path.join(pattern_dir, "gate-configs.yml")]
if lang: files.append(os.path.join(pattern_dir, lang + ".yml"))
files.append(overlay)
patterns, order = {}, []
for f in files:
    for p in parse_patterns(f):
        n = p.get("name")
        if not n or not p.get("pattern"): continue
        if n not in patterns: order.append(n)
        patterns[n] = p
blocks, warns = [], []
for n in order:
    p = patterns[n]
    try: rx = re.compile(p["pattern"])
    except re.error: continue
    if rx.search(content):
        action = (p.get("action") or "warn").lower()
        if strict and action == "warn": action = "block"
        msg = "  [%s] %s — %s" % (n, p.get("quelle","?"), file_path or "?")
        (blocks if action == "block" else warns).append(msg)
if warns:
    sys.stderr.write("[BODYGUARD] WARNUNG — unsichere Muster im neuen Code:\n" + "\n".join(warns) + "\n")
if blocks:
    sys.stderr.write("\n[BODYGUARD] BLOCKIERT — sicherheitskritische Muster:\n" + "\n".join(blocks) +
                     "\n  Bitte entfernen/ersetzen: Secret in env/Secret-Manager, parametrisierte Query, sichere API/TLS.\n")
    sys.exit(1)
sys.exit(0)
PYEOF
)" "$PATTERN_DIR" "$OVERLAY" "$STRICT"
