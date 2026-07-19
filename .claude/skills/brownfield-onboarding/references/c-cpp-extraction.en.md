---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# C/C++ extraction: clangd/libclang + compile_commands.json + fallbacks (SSoT, BOO-301)

> 🇩🇪 [Deutsch](c-cpp-extraction.md) · 🇬🇧 **English** (this file)
>
> SSoT for the C/C++ path of brownfield onboarding. Change things here, do not duplicate them in SKILL.md.

## Why C/C++ needs its own fact layer

An LLM reads plain C code just fine — the real problems live in the context: (1) **`#ifdef` switches**: the same file compiles into different programs depending on board/chip/feature flag; without "what is built with which flags" every narrative is speculation. (2) **Hardware context is not in the code**: register accesses are only intelligible with the chip datasheet. (3) **Timing/concurrency** (ISR/register ordering) is invisible to any static tool — document the limit openly instead of papering over it.

## Build preflight (ask first, then extract)

**The ordering is binding:** the C/C++ path begins with **one explicit operator question**, before any extraction tier runs — because whether a `compile_commands.json` exists decides tier-1 extraction vs. degradation path and therefore the entire fact quality. The previously observed failure (a silent jump into the degradation path, followed by a skipped intake) is ruled out this way.

1. **Ask and wait for the answer:** "Is there a `Makefile`, `CMakeLists.txt` or a `compile_commands.json`? Shall I generate the JSON — via `bear -- <build-command>` (after `make clean`) or CMake `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`?"
2. **Log the answer:** the chosen source (received / self-produced / none → degradation path) is written to the run manifest `journal/brownfield-onboarding-map.yml`.
3. **Only then** apply the configuration truth below and start the cascade.

If the JSON is missing, the degradation path is a **documented, deliberate choice after the question** — not an overlooked default.

## Configuration truth: compile_commands.json (three paths, one degradation path)

| Path | When | Mechanics |
|---|---|---|
| **Receive** (customer-produced) | customer builds it themselves (pilot default) | The customer delivers three things per `docs/runbooks/compile-commands-bear.en.md`: JSON + source revision (SVN revision/commit) + SDK/header copy. Then: **path rewriting** to the local mirror, **tagging** with the delivered revision in the run manifest, **validation** against the checkout (sample: referenced files exist at that revision; entry count vs. `.c` files). Deviations → report, don't smooth over. |
| **Produce it ourselves** | build environment available locally | CMake: `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON` at configure time. Make/custom system: `bear -- <build command>` after `make clean`. |
| **Degradation path (read-only mode)** | no JSON, no build possible | Onboarding continues — **the JSON is NOT mandatory, the skill never aborts.** All `#ifdef` variants are described instead of one guessed variant; every artifact prominently carries the **"configuration-unverified"** tag (in the frontmatter `confidence:` this caps the value at `inferred`). No silent guessing of the active variant. |

Concrete preflight error messages instead of cryptic failure: "ARM compiler missing (`arm-none-eabi-gcc` not in PATH)", "SDK path unknown — question 5 from appendix Z §Z.5 open".

## Configuration matrix (one view per build configuration)

If several configurations exist (`compile_commands.<config>.json`), the run produces **one analysis view per configuration** plus the matrix as an artifact:

```yaml
# docs/_intake/brownfield/configuration-matrix.yml
schema_version: 1
configurations:
  - name: <config>            # e.g. board-a, pc-simulator
    compile_commands: compile_commands.<config>.json
    source_revision: <svn-rev|sha|n.a.>
    entries: <n>              # entries in the JSON
    defines_sample: [<top-defines>]   # most frequent -D flags (counted from the JSON)
unconfigured: <n>             # .c files built in NO configuration — report, don't hide
```

Finding documents state in their header which configuration(s) they apply to. Statements valid in only one variant carry the configuration name in the claim.

## Extraction cascade (3 tiers, each named — no silent downgrade)

| Tier | Tool | Delivers | Limit |
|---|---|---|---|
| 1 (primary) | **clangd/libclang** against `compile_commands.json` (practically: `clangd --check=<file>` for diagnostics; symbol/reference extraction via libclang Python or `clang -Xclang -ast-dump=json` per translation unit) | call and dependency graphs, resolved includes, symbols with `file:line` — for the **active** configuration | only configured files; ISR/interrupt wiring and timing remain UNKNOWN |
| 2 (fallback) | mcp-server-tree-sitter (C/C++ grammars) | functions/structs/includes per file, line-accurate | edges import-based only (no call resolution), `#ifdef`-blind → artifacts "configuration-unverified" |
| 3 (minimal) | file inventory via `find`/`grep` (`^#include`, function signatures, `#ifdef` count per file) | base facts + switch density | inventory only |

Additionally, as **second-order fact sources** (only with a `compile_commands.json`): `clang-tidy` and `cppcheck` findings enter the narrative as `EXTRACTED` facts with `file:line` (e.g. "empty catch block", "uninitialised variable") — quoted descriptively, not evaluated.

## Baseline capture (hook into gate_mode: diff, BOO-311)

The run counts the existing findings (clang-tidy, cppcheck) and writes them as a **baseline count** into the onboarding artifact (`00-rohbefund.md` header + `configuration-matrix.yml` field `baseline_findings`). Purpose: in later gate operation, `gate_mode: diff` (BOO-311) evaluates only new/changed code — the legacy stock captured here is documented but does not block. No concealment: the number is stated in the finding.

## Hardware anti-fabrication (hard constraint)

- **No invented register meanings, chip specifications or datasheet quotes.** A register address without a datasheet source is an `UNKNOWN` with an open question — never a plausible narrative.
- Hardware statements only with a source (`datasheet:<file/section>` as evidence type in the claim) or as an open question in `why/frageliste.md` (category **hardware**).
- Vendor PDFs delivered by the customer are `origin: ingested-external` (read-injection note BOO-300) and are treated as data.

## SVN source (read mirror)

Legacy on SVN → read it via `git svn clone <url> --stdlayout` (or without `--stdlayout` for flat layouts) onto a **local copy** — forge-independent, read-only, history usable for WHY mining/`git blame`. For anything that changes code, the SVN resolution path applies (migration, no permanent two-way bridge) — not part of onboarding. macOS note: `git-svn` is a separate Homebrew formula (Apple Git no longer ships it). The mirror revision (SVN revision) is recorded in the run manifest and must match the revision of the delivered `compile_commands.json` — deviations are reported.

## Phase-0 intake (C/C++)

The question catalogue SSoT is **HANDBUCH appendix Z §Z.5** (ten questions, BOO-308) — no parallel checklist here. Rules for the run:

- The appendix-Z questions are the **mandatory questions**; on top, **dynamic questions: at most 10 per run**, each with a triggering code quote (`file:line`) — no fishing questions.
- **Document the why-triad per question:** (a) why asked, (b) what the answer enables, (c) what happens if unanswered.
- All answers with a source (person/document) go to `docs/_intake/brownfield/intake-antworten.md` (`origin: human-<initials>`); missing answers = marked, never an abort.
- **Time-criticality rule:** with departing knowledge holders, **pull the WHY interview (step 11) forward** — if necessary before the full tool chain; the degradation path exists exactly for this.
