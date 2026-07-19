---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
name: knowledge-onboarding
recommended_model: sonnet  # BOO-84 — tier mapping in bootstrap/references/model-tiers.json
description: |
  Bestands-Doku/Wissenspaket eines Projekts deterministisch in Governance-Artefakte
  routen. 3 Adapter (GitHub-Repo / lokaler Ordner / im Chat). Routing via Rubrik +
  persistiertem Manifest. Anti-Fabrikation: vorschlagen statt blind uebernehmen,
  Coverage-Check. Verwenden wenn Bestands-Doku/Vor-Material vorhanden ist (post-bootstrap).
  Ausloeser: "/knowledge-onboarding", "wir haben schon ein Wissenspaket", "verknuepfe
  das bestehende Repo mit unseren Artefakten".
version: 1.2.1
metadata:
  hermes:
    category: onboarding
    tags: [bestands-onboarding, routing, manifest, anti-fabrikation, docs-as-code]
    requires_toolsets: [terminal, git]
    related_skills: [ideation, architecture-review, intent, pitch, dpo]
---

# Knowledge-Onboarding

Vorhandenes Projekt-Wissen — egal ob GitHub-Repo, lokaler Ordner / Upload oder im Chat bereitgestellt — **deterministisch + wiederholbar** in die Governance-Artefakte des Frameworks routen. Laeuft **nach** dem Bootstrap, **bevor** mit `/ideation`/`/implement` gestartet wird, wenn der Kunde schon ein Wissenspaket mitbringt.

![Problem → Lösung: deterministisch statt LLM-Whim](references/sketches/01-problem-loesung.png)

## Wann diesen Skill nutzen

- **Post-Bootstrap**, Skelett-Artefakte existieren (CLAUDE.md / AGENTS.md / CONVENTIONS.md / ARCHITECTURE_DESIGN.md angelegt).
- Der Kunde bringt **Vor-Material** mit: GAP-Analysen, Legal-/Compliance-Recherche, README, PLAN.md, `docs/`-Context, Design-Dateien, Demo-Choreographien, Handover-Notizen, Prompt-Library.
- Operator-Trigger: explizit `/knowledge-onboarding`, oder Bootstrap Phase 7.6 hat den Hinweis ausgegeben (Block-B-Flag `bestands_doku_erkannt: true`).

**Nicht** der richtige Skill fuer:
- Code-Analyse — dafuer ist `/architecture-review` da.
- Reine Artefakt-Skelette ins Repo holen — dafuer ist `references/framework-upgrade.md` da.

## Workflow (8 Schritte)

### Schritt 1: Adapter-Wahl

![3 Adapter → eine normalisierte Datei-Liste](references/sketches/02-adapter-funnel.png)

```
Welche Quelle soll geroutet werden?
  a) GitHub-Repo  -> URL (HTTPS oder SSH), shallow clone in $TMP
  b) Lokaler Ordner / Upload -> absoluter Pfad
  c) Im Chat bereitgestellt -> Operator paste-fertig pro Datei
```

Alle drei Adapter normalisieren zu einer einheitlichen **Datei-Liste mit Inhalt**:

```
files[]:
  - source_path: <relativer Pfad>
    content: <Roh-Inhalt>
    size_bytes: <int>
    mtime: <ISO-Datum, optional>
```

Bei `a`: `git clone --depth 1 <URL> $TMP` (kein Push-Zugriff noetig). Branch-Optional `--branch <main>`. Bei `b`: `find <pfad> -type f -name "*.md"` plus konfigurierbare Endungen. Bei `c`: Operator paste pro File, jeweils mit Pfad-Hinweis.

### Schritt 2: Pre-Flight

1. Projekt-Root validieren (`pwd`, `ls -la`, `cat .claude/environment.json` falls vorhanden).
2. Bootstrap-Spur pruefen — mindestens eines von `CLAUDE.md` / `AGENTS.md` / `CONVENTIONS.md` muss vorhanden sein. Sonst: Stop mit Hinweis "bitte `/bootstrap` zuerst".
3. **Framework-Artefakte erkennen** und in **Tier-0-Ausschluss-Liste** fuehren (siehe `references/routing-rubric.md`):
   - Repo-Root-Files: `CLAUDE.md`, `AGENTS.md`, `CONVENTIONS.md`, `ARCHITECTURE_DESIGN.md`, `SECURITY.md`, `GOVERNANCE.md`, `INDEX.md`, `DEVELOPER_ONBOARDING.md`, `CONTEXT.md`.
   - Code-Verzeichnisse (Heuristik): Endungen `*.{ts,tsx,js,jsx,py,go,rb,java,rs,cs,kt,php}` plus Pfade die in `.gitignore` matchen.
   - Skill-Bundle-Verzeichnisse im Projekt-Root: `architecture-review/`, `backlog/`, `bootstrap/`, `brownfield-onboarding/`, `cloud-system-engineer/`, `dpo/`, `grafana/`, `ideation/`, `implement/`, `intent/`, `knowledge-onboarding/`, `pitch/`, `security-architect/`, `sprint-review/`, `visualize/`.
4. **Adapter-Quelle ausser-Repo-Pruefung:** wenn Adapter `a/b` ein anderes Repo liefert als das aktuelle Projekt → ok, dann ist die Tier-0-Liste **nur** auf die Quelle anzuwenden (nicht auf das Ziel). Wenn Adapter `a/b` dasselbe Repo ist (z.B. Re-Scan einer Bestands-Quelle, die schon mit Framework gemischt wurde) → Tier 0 voll anwenden.

### Schritt 3: Manifest lesen (Determinismus-Anker)

```bash
MANIFEST="journal/knowledge-onboarding-map.yml"
if [ -f "$MANIFEST" ]; then
  # Manifest zuerst lesen
  EXISTING=$(yq '.items' "$MANIFEST")
else
  EXISTING="[]"
fi
```

Pro Datei in der Quell-Liste:
1. **`source_hash`** neu berechnen (`sha256` ueber Inhalt).
2. Im Manifest nach `source_path` suchen:
   - **Treffer + Hash identisch** → Routing wird **uebernommen** (keine Re-Klassifikation, keine Operator-Frage).
   - **Treffer + Hash anders** → Datei wurde geaendert. **Pinned-Schutz** beachten: wenn `pinned: true` im alten Eintrag → Routing bleibt, nur `source_hash` wird aktualisiert; operator_note "Datei geaendert, Routing gepinnt" anhaengen. Wenn `pinned: false` → neu klassifizieren (Schritt 4).
   - **Kein Treffer** → neu klassifizieren (Schritt 4).

Ergebnis: zwei Listen — `unchanged[]` (uebernommen) und `to_classify[]` (Schritt 4).

### Schritt 4: Klassifikation (Tier 0/1/2/3)

![Tier-Wasserfall: jede Datei fällt durch, bis genau eine Kategorie greift](references/sketches/03-tier-wasserfall.png)

Pro Datei in `to_classify[]`:

1. **Tier 0 — Ausschluss.** Wenn Pfad oder Endung in der Tier-0-Liste (Schritt 2) → `category: framework-artefact` (Datei aus dem Framework selbst) oder `category: code` (Code-File), `action: skip`. Weiter zum naechsten File.

2. **Tier 1 — Dateiname / Pfad-Match** (deterministisch, siehe Rubrik):
   - Genau **ein** Kategorie-Match in den Dateiname-Signalen → Klassifikation vergeben, `tier: 1`.
   - **Zwei oder mehr** Kategorie-Matches (z.B. `LEGAL_SKILLS_RECHERCHE.md` → "legal" + "recherche") → Tier 3 (Schritt 4 unten).

3. **Tier 2 — Inhalts-Signale** (regelgebunden):
   - Kein Tier-1-Match, aber Inhalt enthaelt Stichworte aus genau einer Kategorie (siehe Rubrik) → Klassifikation vergeben, `tier: 2`.
   - Inhalts-Signale aus mehreren Kategorien → Tier 3.

4. **Tier 3 — mehrdeutig** (≥ 2 Kategorien matchen ODER **kein** Match):
   - Operator wird gefragt:
     ```
     File: <path>
     Matches: <category-1> (Signal: ...) UND <category-2> (Signal: ...)

     Welche Kategorie?
       a) <category-1>
       b) <category-2>
       c) Andere -> welche?
       d) skip
       e) Inhalt zeigen vor Entscheidung
     ```
   - Antwort wird im Manifest als `tier: 3` + `operator_note: <Begruendung>` + `pinned: true` festgehalten (damit Folge-Scans nicht wieder fragen).

5. **Default-Aktion pro Kategorie:** siehe Rubrik (`referenzieren` / `extrahieren` / `skip` / `fragen`).

### Schritt 5: Vorschlag-Tabelle

Output an den Operator (kein Auto-Apply!):

```
Routing-Vorschlag (Adapter: github-repo · Quelle: beispiel-org/beispiel-projekt · Stand: 2026-06-03)

| # | Quell-Datei                       | Tier | Kategorie              | Signal              | Ziel                              | Aktion        |
|---|-----------------------------------|------|------------------------|---------------------|-----------------------------------|---------------|
| 1 | GAP_ANALYSE.md                    | 1    | intent-gap-scope       | filename:gap        | intents/ + ARCH_DESIGN.md §1      | extrahieren   |
| 2 | README.md                         | 1    | architektur-plan       | filename:README     | ARCH_DESIGN.md + Backlog          | referenzieren |
| 3 | docs/CONTEXT.md                   | 1    | vokabular-kontext      | filename:context    | CONTEXT.md                        | extrahieren   |
| 4 | docs/STYLE_GUIDE.md               | 1    | design-ui-visual       | filename:style      | ARCH_DESIGN.md §5 + DESIGN.md     | referenzieren |
| 5 | LEGAL_SKILLS_RECHERCHE.md         | 3    | ambivalent             | filename:legal+research | (Operator-Frage)              | fragen        |
| 6 | DEMO_CHOREOGRAPHIE.md             | 1    | demo-storyboard-pitch  | filename:demo       | docs/project/demo/                | referenzieren |
| 7 | docs/HANDOVER.md                  | 1    | onboarding-handover    | filename:handover   | DEVELOPER_ONBOARDING.md           | extrahieren   |
| 8 | prompts/widerspruch.prompt.md     | 1    | prompt-library         | path:prompts/       | docs/project/prompts/             | referenzieren |
| 9 | AGENTS.md                         | 0    | framework-artefact     | tier-0-list         | -                                 | skip          |

Coverage: 18 Quell-Dateien, 14 klassifiziert, 3 Tier-0-Skip, 1 Tier-3-Frage.

Aktion (Operator):
  a) Apply alle (mit Tier-3-Fragen interaktiv)
  b) Nur ausgewaehlte (Komma-getrennte # eingeben)
  c) Diff zeigen pro File vor Apply
  d) Abbruch — nichts schreiben
```

### Schritt 6: Routing-Apply

**Default: referenzieren, nicht duplizieren.** Pro Ziel-Artefakt wird ein **Verweis-Block** angehangen (Docs-as-Code):

```markdown
<!-- knowledge-onboarding · BOO-137 · source:GAP_ANALYSE.md · stand:2026-06-03 -->
> **Quelle:** [GAP_ANALYSE.md](../GAP_ANALYSE.md) · Signal: `filename:gap` · Tier 1 · Stand: 2026-06-03
>
> _Kurzer Anker-Auszug (max. 5 Zeilen) oder Inhaltsverzeichnis:_
>
> - ist: Bearbeitung manuell, Bearbeitungszeit 2-3 Wochen
> - soll: Automatisierter Entwurf in unter 5 Minuten
> - Luecken: 3 (siehe Kapitel 2 der Quelle)
```

**Aktion-Varianten:**

- **`referenzieren`** (Default): Verweis-Block ans Ende der Ziel-Sektion. Keine Volltext-Kopie. Stand-Datum + Signal + Tier dokumentiert.
- **`extrahieren`**: Operator-bestaetigte Inhalts-Bloecke werden in das Ziel-Artefakt extrahiert (z.B. Intent-Statement aus `GAP_ANALYSE.md` nach `intents/INTENT-XX.md`). **Pflicht: Operator-Diff vor Apply.** Quelle bleibt mit Verweis-Block referenziert.
- **`skip`**: kein Schreib-Vorgang; Eintrag im Manifest mit `action: skip`.
- **`fragen`** (Tier 3): wird in Schritt 4 schon aufgeloest.

**Wenn Ziel-Artefakt nicht existiert** (z.B. `DESIGN.md` noch nicht angelegt): Skill legt es **leer mit Skelett-Frontmatter** an und fuegt den ersten Verweis-Block ein. Operator-Hinweis: "Neues Artefakt erstellt: DESIGN.md — bitte spaeter mit `/security-architect`/`/ideation` befuellen."

**DPO-Verzahnung (Legal · Compliance):** Wenn Kategorie `legal-compliance` UND Inhalts-Signale auf personenbezogene Daten/KI hinweisen ("personenbezogen", "Profiling", "automatisierte Entscheidung", "KI-System") → Skill gibt Hinweis aus: "Vorschlag: `/dpo` starten — Kategorie deutet auf DSGVO-Pflicht hin." Kein Auto-Run.

### Schritt 7: Manifest schreiben

```bash
mkdir -p journal/
cat > journal/knowledge-onboarding-map.yml <<EOF
schema_version: 1
generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
generator: knowledge-onboarding/SKILL.md v1.0.0
source:
  adapter: $ADAPTER
  identifier: $IDENTIFIER
  scanned_at: $SCANNED_AT
items:
$(yq -o yaml '.items' < $WORK_DIR/items.yml | sed 's/^/  /')
coverage:
  total_files: $TOTAL
  classified: $CLASSIFIED
  skipped_tier_0: $SKIP_T0
  unclear_tier_3: $UNCLEAR
  operator_pinned: $PINNED
EOF
```

Manifest wird **committed** (gehoert zum Audit-Trail, analog `meta.json` aus `/implement`). Commit-Message-Konvention:

```
chore(knowledge-onboarding): manifest update — <ADAPTER> <IDENTIFIER>

- classified: <N> · skipped: <N> · tier-3-resolved: <N>
- pinned items: <list>
```

### Schritt 8: Coverage-Check

Output an Operator:

```
Coverage-Check (Stand 2026-06-03):

Total:       18 Quell-Dateien
Classified:  14 (78%)
  · Tier 1:  10
  · Tier 2:   3
  · Tier 3:   1 (operator-resolved, pinned)
Skipped:      4 (22%)
  · Tier 0:   3 (Framework-Artefakte: AGENTS.md, CLAUDE.md, CONVENTIONS.md)
  · Operator: 1 (DEMO_kompakt.md — Duplikat zu DEMO_CHOREOGRAPHIE.md)

Manifest: journal/knowledge-onboarding-map.yml (committed)
Neue Ziel-Artefakte: DESIGN.md (Skelett angelegt — bitte mit /ideation befuellen)
DPO-Hinweis: 1 File (LEGAL_SKILLS_RECHERCHE.md) — Vorschlag `/dpo` starten.
```

Wenn `Skip-Quote > 50 %`: Warnung "Auffaellig hohe Skip-Quote — Rubrik koennte nicht passen, bitte Quelle pruefen oder Folge-Story fuer Rubrik-Erweiterung anlegen."

## Re-Scan-Verhalten

![Manifest-Determinismus: Re-Scan liest das Manifest zuerst — re-read statt re-infer](references/sketches/04-manifest-determinismus.png)

Beim erneuten Lauf:

1. Manifest wird **zuerst gelesen** (Schritt 3).
2. Unveraenderte Files (Hash identisch) werden **stumm uebernommen** — keine Frage, kein Re-Apply.
3. Geaenderte Files werden re-klassifiziert; `pinned: true` schuetzt vor Re-Routing.
4. Neue Files (nicht im Manifest) durchlaufen Klassifikation komplett.
5. Geloeschte Files (im Manifest, nicht in Quelle) werden im Manifest als `status: removed` markiert, Verweis-Bloecke in Ziel-Artefakten **bleiben** (Audit-Trail), bekommen aber einen `_(Quelle nicht mehr vorhanden, Stand: YYYY-MM-DD)_`-Suffix.

## Anti-Fabrikation — verbindliche Regeln

![Anti-Fabrikation: vorschlagen statt blind übernehmen, mit Operator-Gate und Coverage-Check](references/sketches/05-anti-fabrikation.png)

1. **Kein Routing ohne Match-Signal.** Wenn weder Tier-1- noch Tier-2-Signal matcht → Tier 3 (Operator-Frage). Niemals raten.
2. **Kein Volltext-Copy ohne Operator-Approval.** Default ist `referenzieren`. `extrahieren` nur mit explizitem Diff-Approval.
3. **Quell-Verweis Pflicht in jedem Ziel-Block.** Jeder eingefuegte Block traegt `source:<path>` + `signal:<signal>` + `stand:<datum>`. Verifizierbar.
4. **Coverage-Check Pflicht.** Skip-Quote > 50 % → Warnung. Tier-3-Quote > 30 % → Warnung "Rubrik koennte zu unscharf sein".
5. **Manifest als Audit-Trail.** Jeder Lauf schreibt einen vollstaendigen Manifest-Stand. Operator-Korrekturen mit `pinned: true` sind **immutable** im Re-Scan.

## Verzahnung mit anderen Skills

| Skill | Rolle |
|---|---|
| `/architecture-review` | liest **Code**, nicht Doku. Laeuft **nach** `/knowledge-onboarding`. |
| `/ideation` | nutzt extrahierte Intents/Architektur-Bausteine. |
| `/intent` | extrahierte Intent-Statements landen in `intents/INTENT-XX.md`. |
| `/pitch` | demo-storyboard-pitch-Kategorie referenziert pitch-Materialien. |
| `/dpo` | wird bei legal-compliance + Personendaten-Signal vorgeschlagen. |
| `references/framework-upgrade.md` | zieht Framework-Skelette ins Repo. Laeuft **vor** `/knowledge-onboarding`. |

## Referenzen

- [References — Routing-Rubrik (SSoT)](references/routing-rubric.md)
- HANDBUCH-Sektion „Knowledge-Onboarding — Bestands-Doku in Governance-Artefakte routen"
- `docs/how-we-document.md` §4 „Bestehendes/fremdes Repo auf Stand bringen"
- Spec: `specs/BOO-137.md`
- ADR-Quelle: SecondBrain `02 Projekte/Code-Crash Framework/Decisions/2026-06-03 Knowledge-Onboarding-Skill — Routing-Rubrik + Manifest-Determinismus.md`
