---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# C4 output: fact graph → Structurizr DSL (SSoT)

Single source of truth for the C4 generation from v0.3.0. Core decision (research 2026-07-01, design-relevant): **we generate C4 OURSELVES from the fact graph.** The jQAssistant C4 plugin READS C4 models (as-is vs. to-be validation), it does not generate them — it remains an optional validator. The output format is [Structurizr DSL](https://structurizr.com) (text-based, LLM-friendly, Apache 2.0); rendering runs via the official Structurizr MCP server when connected — otherwise the DSL file remains the artefact (graceful degradation).

## Why enforced completeness

The most frequent documented error in the state-of-the-art comparison (CIAO, arXiv 2604.08293) are "diagram errors" — truncated or omitted classes, 32 occurrences in the 22-dev study. The deterministic completeness check targets exactly that: **no diagram element without graph evidence, no relevant graph element without a place in the diagram or a justified omission.**

## Mapping fact graph → C4 (honestly tagged)

| C4 level | Source in the fact graph | Confidence |
|---|---|---|
| C1 Context: the software system | the source root as a whole | EXTRACTED |
| C1 Context: external systems | foreign import groups (e.g. `org.springframework.*`, JDBC) — usage evidenced, system character assumed | INFERRED |
| C2 Container | build modules (Maven `<module>`/Gradle subprojects) with `file:line` from the build file; single-module project → one container | EXTRACTED |
| C3 Component | top-level packages under the root package; edges = aggregated package references from `edges` | EXTRACTED (scip) / EXTRACTED with `limitations` (import-based at tier 2/3) |

Every DSL element carries its confidence tag as a Structurizr tag (`tags "EXTRACTED"` / `tags "INFERRED"`) — the honesty layer is visible in the diagram, not only in the text.

## Artefacts

```
docs/_intake/brownfield/architecture/
├── workspace.dsl      # Structurizr DSL: C1 Context, C2 Container, C3 Component
├── c4-map.yml         # sidecar: DSL element -> graph node -> level (+ omitted list)
└── *.png / *.svg      # optional: renderings via Structurizr MCP
```

### DSL skeleton (template)

```
workspace "<projekt>" "Brownfield finding BOO-297 — generated from fact-graph.yml, as of <datum>" {
  model {
    sys = softwareSystem "<projekt>" {
      tags "EXTRACTED"
      web = container "<modul>" {
        tags "EXTRACTED"
        billing = component "com.acme.billing" "Evidenced: pom.xml:12" { tags "EXTRACTED" }
      }
    }
    db = softwareSystem "Relational DB (assumed from JDBC imports)" { tags "INFERRED" }
    sys -> db "JDBC (Invoice.java:7)"
  }
  views {
    systemContext sys { include * ; autolayout lr }
    container sys     { include * ; autolayout lr }
    component web     { include * ; autolayout lr }
  }
}
```

Description convention: evidence (`file:line`) goes into the element/edge descriptions; the corresponding claims live, as always, in `claims.yml`.

### Sidecar `c4-map.yml` (contract for the completeness check)

```yaml
schema_version: 1
generated_at: <ISO>
elements:
  - dsl_id: billing            # identifier in workspace.dsl
    graph_node: com.acme.billing
    level: component           # context | container | component
    confidence: EXTRACTED
omitted:                       # graph nodes without a place in the diagram — admissible only WITH a justification
  - graph_node: com.acme.generated
    reason: "generated code (JAXB), 0 incoming edges — deliberately omitted"
```

## Completeness check (deterministic, mandatory)

```bash
python3 brownfield-onboarding/scripts/c4_completeness.py \
  --fact-graph docs/_intake/brownfield/fact-graph.yml \
  --dsl docs/_intake/brownfield/architecture/workspace.dsl \
  --map docs/_intake/brownfield/architecture/c4-map.yml
```

Four checks, exit 1 on violation:

1. Every `elements[]` mapping points to an existing graph node (no invented elements).
2. Every `dsl_id` actually occurs in `workspace.dsl` (sidecar and DSL do not drift apart).
3. Every relevant graph node (default: all `kind: package`) is mapped OR listed in `omitted` with a non-empty justification (no silent omissions — the CIAO error).
4. The number of `component` declarations in the DSL matches the `level: component` entries in the sidecar (no element bypassing the register).

**No diagram is handed over with a red completeness check.** The run is recorded in the closing block.

## Rendering (optional, graceful)

Order: **offline first**, MCP when connected, otherwise DSL-only. No rendering is not an error.

- **Offline (step 10b, default, no Docker / no online service):** `bash brownfield-onboarding/scripts/render_c4_local.sh` exports `workspace.dsl` via `structurizr-cli` to Mermaid and builds an Obsidian-readable `C4-Diagramme.md` (Mermaid fences) — see §Offline render.
- **Structurizr MCP connected:** have the views rendered, place the resulting images next to the DSL; `/visualize` can build on them.
- **None of these:** operator hint with a setup pointer; `workspace.dsl` remains the authoritative, versionable artefact.

### Offline render (BOO-475)

`scripts/render_c4_local.sh` is the **portable, offline-safe** render path (Mac + Windows via Git Bash). It replaces no online service — it uses a **locally installed** toolchain:

- **JDK** (>= 17, tested with 21) — discovered via `JAVA_HOME` → `/usr/libexec/java_home` → a working `java` on PATH → known (keg-only) Homebrew/Linux paths. **No** hardcoded path like `/opt/homebrew`.
- **structurizr-cli** — discovered via `STRUCTURIZR_CLI_HOME` → `~/tools/structurizr-cli/structurizr.sh` → `structurizr.sh` on PATH.

Flow: scan **only** `docs/_intake/brownfield/architecture/*.dsl` (never repo-wide) → `export -format mermaid` → `C4-Diagramme.md` carrying a `provenance:` label (`origin: ai-claude`, `status: draft`) so the note passes the label gate in the customer project.

Exit codes: `0` success · `2` render tools missing (hint + runbook, **no abort**) · `3` no DSL in the intake path · `4` render failed (DSL syntax). **Standalone re-run:** re-invokable anytime with an existing DSL, without re-extraction.

One-time tool setup (once online, then offline): `docs/runbooks/c4-rendering-setup.md`.

## jQAssistant (validator only, optional)

Anyone running jQAssistant can read the generated C4 model in as a to-be/as-is comparison and have it checked rule-based. The skill does not require this and generates nothing with it.
