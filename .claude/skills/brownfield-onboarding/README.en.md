---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# brownfield-onboarding

> Framework bundle skill — reads an existing Java codebase and produces evidenced architecture findings (fact graph + raw finding) with an honesty commitment. Origin: BOO-297 (2026-07-01).

**Version:** 1.5.0 · **Command:** `/brownfield-onboarding`

> **New in 1.5.0 (BOO-486):** explicit profile read for chunk tuning (step 5.5) — if `.claude/model-profile.yml` exists, it is passed fresh to the `chunk_plan.py` run via `--profile`; without a profile the conservative fixed default applies, announced. Script and chunk discipline (BOO-489) unchanged.

> **Claude Code mode:** `/brownfield-onboarding` only reads the source (read-only) and writes findings to `docs/_intake/` + `journal/` → supervised **`acceptEdits`**. No unattended operation. Details: HANDBUCH §6 "Claude Code mode".

## What the skill does

`brownfield-onboarding` takes an existing, often undocumented codebase (v1: **Java**) — as a Git URL, local folder or archive — and extracts from it a **fact graph** (packages, classes, dependencies, each with a `file:line` reference). The extraction is done by deterministic tools (primary `scip-java`, fallback `tree-sitter`, minimal fallback file inventory); the skill orchestrates, narrates and labels. Findings land in `docs/_intake/brownfield/`, and every document carries the document label (BOO-298).

> **In plain terms:** Many tools read old software like an expert witness who delivers a nice-looking report — without citing where each statement comes from, and without admitting what he never checked. This skill is the expert witness who names the source for every statement and honestly adds: **seen / assumed / don't know.**

![Overview: source -> extraction -> fact graph -> honesty layer -> outputs -> human](overview.en.png)

**Descriptive, not evaluative:** the skill makes legacy readable (what the system IS). Evaluation ("good/secure/compliant?") stays with `/security-architect`, `/architecture-review`, `/dpo` and the quality gates.

## When to apply

- **Post-bootstrap.** Skeleton artefacts (CLAUDE.md / AGENTS.md / CONVENTIONS.md) exist.
- An existing system is being taken over: code is there, architecture documentation is missing or not verifiable.
- **Trigger:** `/brownfield-onboarding`, or the phase-7.6 hint after bootstrap when existing code was detected.

## Usage (short)

```
/brownfield-onboarding
  -> Quelle waehlen (Git-URL / Ordner / Archiv)
  -> Pre-Flight (Projekt-Root, Bootstrap-Spur, classification-Default)
  -> Stack-Erkennung (v1: nur Java — sonst ehrliche Ablehnung, kein Konfidenz-Theater)
  -> Faktenextraktion (scip-java -> tree-sitter -> Datei-Inventar; Stufe wird benannt)
  -> Faktengraph: docs/_intake/brownfield/fact-graph.yml
  -> Befunde mit Konfidenz-Tags (EXTRACTED/INFERRED/UNKNOWN) + Beleg-Register claims.yml
  -> Grep-Back (deterministisch): jeder Beleg wird an der Quelle rueckgeprueft
  -> Coverage-Register (deterministisch): "X von Y gesehen" nach coverage.yml
  -> Falsifikations-Pass: Vermutungen gegen den Graph angreifen, Widersprueche melden
  -> C4-Ausgabe: workspace.dsl (C1-C3, selbst erzeugt) + c4-map.yml;
     Vollstaendigkeits-Check erzwungen; Rendering via Structurizr-MCP optional
  -> Warum-Luecken-Kompass (interaktiv): minen -> Luecken markieren -> priorisierte
     Frageliste -> Interview; Antworten origin: human-<kuerzel>, Fremd-Artefakte
     origin: ingested-external (+ BOO-300-Hinweis)
```

## Honesty principles

1. No statement without a claim: EXTRACTED with `file:line` evidence + a passed grep-back; INFERRED with supporting facts + falsification pass; otherwise UNKNOWN.
2. No silent downgrade — the extractor tier that actually ran is stated in every output, including its limits.
3. Gaps are counted (coverage register), not smoothed over; ghost entries in the graph are suspected fabrication and turn the run red.
4. The source stays read-only; artefacts are created in the project only.
5. Label duty: `origin: ai-claude`, `status: draft`, `confidence` = lowest tag of the document.
6. Cherry-picking guard: counter-evidence is searched for and named alongside — concealed counter-evidence weighs like a failed grep-back.

Details + schemas: [references/honesty-layer.en.md](references/honesty-layer.en.md) (SSoT).

## Stages (epic BOO-297)

| Stage | Content | Status |
|---|---|---|
| v0.1.x | scaffold, 3 adapters, Java extraction, fact graph, raw finding | shipped (phase 1) |
| v0.2.x | honesty layer: grep-back, coverage register, EXTRACTED/INFERRED/UNKNOWN, falsification pass | shipped (phase 2) |
| v0.3.x | C4 self-generated: fact graph → Structurizr DSL, rendering via MCP, completeness enforced | shipped (phase 3) |
| v1.0 | why-gap compass + interactive interview (provenance tagging) | shipped |
| v1.1 (BOO-301) | C/C++ embedded path: SVN adapter, `compile_commands.json` truth, hardware anti-fabrication | shipped |
| v1.2 (BOO-475) | offline C4 render (step 10b): `render_c4_local.sh` → Mermaid + Obsidian note, no Docker / no MCP required | shipped |
| v1.3 (BOO-489) | standalone mode (pre-flight without a bootstrap trace → warning) + map-reduce chunk discipline (step 5.5): `chunk_plan.py` slices the fact graph module by module with a local token budget → repos larger than the effective window, model-agnostic (epic BOO-483) | shipped |
| v1.4 (BOO-490) | documentation quality rubric (`doc-quality-rubric.md`, SSoT): audience gate (no silent skip), fact-plus-meaning, line-number/numeric-value honesty, anti-pattern list + gold-standard few-shot slot → module-doc content quality enforceable (epic BOO-483) | this release |

## Interlocking

- `/knowledge-onboarding` — sibling skill for existing **documentation**; together they yield the gap report "where does the legacy documentation contradict the code finding".
- `/architecture-review` — evaluative review, runs **after** the finding.
- CONVENTIONS §Dokument-Etikett (BOO-298) — provenance labelling of all findings.

## File structure

```
brownfield-onboarding/
├── SKILL.md / SKILL.en.md            # Workflow (11 Schritte), Anti-Fabrikations-Regeln
├── README.md / README.en.md          # diese Datei
├── overview.excalidraw / overview.png            # Uebersichts-Sketch (DE)
├── overview.en.excalidraw / overview.en.png      # Uebersichts-Sketch (EN)
├── scripts/
│   ├── grep_back.py                  # Belege an der Quelle rueckpruefen (Exit 1 = rot)
│   ├── coverage_register.py          # Closed-World-Zaehlung -> coverage.yml
│   ├── c4_completeness.py            # Diagramm gegen Faktengraph erzwingen (Exit 1 = rot)
│   ├── render_c4_local.sh            # Offline-C4-Render: DSL -> Mermaid + Obsidian-Note (BOO-475)
│   └── chunk_plan.py                 # Faktengraph -> Modul-Chunk-Plan (Token-Budget, Split) (BOO-489)
└── references/
    ├── fact-graph-schema.md/.en.md   # SSoT Faktengraph-Schema
    ├── java-extraction.md/.en.md     # scip-java + Fallback-Stufen
    ├── honesty-layer.md/.en.md       # SSoT Ehrlichkeits-Schicht (Claims, Tags, Falsifikation)
    ├── c4-structurizr.md/.en.md      # SSoT C4-Ausgabe (Mapping, DSL-Template, Sidecar)
    ├── why-gap-compass.md/.en.md     # SSoT Warum-Luecken-Kompass + Interview
    ├── doc-quality-rubric.md/.en.md  # SSoT documentation quality rubric (audience gate, anti-patterns) (BOO-490)
    └── gold-standard/                # few-shot slot for accepted examples (currently empty; §5 substitute) (BOO-490)
```

## Sources

- Spec: `specs/BOO-297.md` · Runbook: `docs/runbooks/brownfield-onboarding.en.md`
- Evidence (triple-triangulated): SecondBrain `04 Ressourcen/Research/2026-07-01 Brownfield-Code-Onboarding.md` + `2026-07-02 Tribal-Knowledge-Warum-Legacy.md`
- SCIP/scip-java: sourcegraph.com/blog/announcing-scip · sourcegraph.github.io/scip-java
