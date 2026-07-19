---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Java extraction: scip-java + fallbacks

Reference for step 4 of the skill. Three tiers, descending accuracy — the tier that was used is always recorded in the output (`extractor.tier`), including `limitations`.

## Tier 1 — scip-java (primary)

[SCIP](https://sourcegraph.com/blog/announcing-scip) (Sourcegraph Code Intelligence Protocol) is the most mature language-agnostic fact-graph standard; [scip-java](https://sourcegraph.github.io/scip-java/) is the JVM indexer (Java, Scala, Kotlin — Kotlin "less mature" according to the project). Research state 2026-07-01, triple-confirmed.

**Check availability / obtain:**

```bash
command -v scip-java \
  || command -v cs && cs launch com.sourcegraph:scip-java_2.13:latest -- --help
```

If neither scip-java nor Coursier (`cs`) is available: ask the operator whether installation is allowed (`cs` via Homebrew/apt), otherwise tier 2.

**Build the index:**

```bash
cd "$SRC_ROOT"
scip-java index --output "$TMP/index.scip"
```

scip-java needs a **working build** (Maven/Gradle is detected automatically). If the build fails (missing private dependencies, old JDK version — common with legacy): record the error message, use tier 2, and document the reason in `extractor.limitations`.

**What the index delivers:** symbols with definitions (file/line), references (who uses what, resolved — not just imports), derivable from that: package dependencies, class hierarchy, public API surfaces.

**Reading it out:** `scip print --json "$TMP/index.scip"` (scip CLI) or direct Protobuf processing; distil `nodes`/`edges` from it according to [fact-graph-schema.en.md](fact-graph-schema.en.md). Only take over facts that are in the index — no enrichment at this point.

## Tier 2 — mcp-server-tree-sitter (fallback)

If scip-java cannot run (broken build, missing toolchain, operator declines installation): tree-sitter-based extraction via MCP server (31 languages confirmed; research 2026-07-01).

- Load the tool via ToolSearch (the MCP server must be connected in the session; otherwise operator hint with a setup pointer and continue to tier 3).
- Per `*.java` file: extract class/interface/method declarations + `import` lines with line numbers.
- **Limits (record in `limitations`):** edges are import-based, no resolved references; no cross-file symbol resolution; **scale limit**: for very large codebases (order of magnitude >1M LOC, HOLD according to the project roadmap) chunk file by file instead of working repo-wide — and record the chunk boundaries in the manifest.

## Tier 3 — file inventory (minimal fallback)

Deterministic, no extra tooling, deliberately coarse:

```bash
find "$SRC_ROOT" -type f -name "*.java" | wc -l                          # counts.java_files_total
grep -rn --include="*.java" -E "^package " "$SRC_ROOT" | sort -u         # Pakete (mit file:line)
grep -rn --include="*.java" -E "^public (class|interface|enum) " "$SRC_ROOT"   # Typen (mit file:line)
grep -rn --include="*.java" -E "^import " "$SRC_ROOT"                    # Import-Kanten (mit file:line)
grep -rln --include="*.java" "public static void main" "$SRC_ROOT"       # Einstiegspunkt-Signale
```

`limitations` then contains at least: "no method level", "edges import-based only", "no symbol resolution". The raw finding states prominently that only the inventory ran.

## Deliberately NOT used

- **PhpDependencyAnalysis** and similar out-of-language extractors — v1 is Java-only (C/C++ separately as BOO-301).
- **RefExpo/DepMiner benchmark numbers** as evidence — the superiority numbers did not survive verification (research 2026-07-01, 0-3 killed). The tools themselves exist; whoever wants to integrate them does so as a separate story with its own verification.
- **jQAssistant as a C4 generator** — the C4 plugin READS C4 models (validation as-is vs. to-be), it does not generate them. This skill generates C4 itself from the fact graph from v0.3.x.
