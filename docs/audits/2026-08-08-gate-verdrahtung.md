# Gate-Verdrahtung — Audit 08.08.2026

> Anlass: Beim Pre-Flight von BER-122 fielen mehrere fehlende Framework-Werkzeuge
> auf. Die Nachschau ergab, dass das Problem größer ist als fehlende Dateien —
> mehrere Gates waren **nominell aktiv, aber nicht verdrahtet**, und ein
> CI-Check konnte gar nicht fehlschlagen.
>
> Methode: Prüfung jedes in `CONVENTIONS.md §3` deklarierten Gates gegen sein
> tatsächliches Skript, plus Signal-Tests für die neu gebauten Prüfer.

---

## Befunde

### B1 — CI-Semgrep war ein Grün, das nicht rot werden konnte ⚠️ schwerwiegend

`.github/workflows/semgrep.yml` lief mit `continue-on-error: true` am
Scan-Schritt. Der Check meldete auf jedem PR „Semgrep Security Scan — pass",
**unabhängig davon, ob Findings existierten**.

Das ist die gefährlichere Sorte Lücke: ein rotes Gate fällt auf, ein Gate das
nie rot wird, wird zur Gewohnheit. In dieser Session wurden vier PRs mit
„Semgrep pass" gemeldet — die Aussage war wertlos.

**Behoben:** `continue-on-error` am Scan-Schritt entfernt; nur der SARIF-Upload
darf noch scheitern. Baseline vor dem Umschalten gemessen: **0 Findings über
422 Dateien** — das Gate startet also nicht mit Altlast.

### B2 — Der Semgrep-Pack-Katalog stand an drei Stellen 📋

| Ort | Zustand vorher |
|---|---|
| `.semgrep.yml` | Packs **auskommentiert** — nach der Reader-Logik: 0 aktive Packs |
| `.githooks/pre-commit` | Liste hartkodiert |
| `.github/workflows/semgrep.yml` | Liste hartkodiert |

Das Manifest behauptete im eigenen Kommentar, „Layer 2 + Layer 3 lesen dieses
Manifest" — beides war falsch. Wer die Datei geändert hätte, hätte nichts
bewirkt. Dieselbe Fehlerklasse wie am 02.08. („eine Information an zwei
Stellen"), hier an drei.

**Behoben:** Packs als echte YAML-Liste unter `packs:`; Hook und CI lesen sie
per `grep -E '^[[:space:]]*-[[:space:]]+p/'`. Ein **leeres Manifest blockt jetzt**,
statt still durchzuwinken — 0 Packs ist ein Befund, kein Grün.

### B3 — Zwei Gates deklariert, nie gebaut 📋

`CONVENTIONS.md §3` führte beide als **AN**:

- **`dependency-check`** — kein Skript. Der Kommentarkopf von
  `.githooks/pre-commit` behauptete sogar „ESLint + Semgrep + Dependency-Check",
  der Code hatte drei Schritte ohne Dependency-Prüfung.
- **`coverage-check`** („>=80 % Diff-Coverage") — kein Skript, **kein
  Test-Runner, keine einzige Testdatei** im Projekt.

**Behoben:** Beide stehen jetzt als *deklariert, nicht verdrahtet* in der
Tabelle, mit Begründung. Der irreführende Hook-Kommentar ist korrigiert.
Entscheidung zum Coverage-Gate: ehrlich führen statt streichen — eine
Folge-Story für Test-Setup ist vorgemerkt.

### B4 — Framework-Werkzeuge fehlten 📋

`.claude/scripts/schrader_check.py`, `scripts/doc-drift-check.sh` und
`.claude/model-profile.yml` gab es nicht. Folge: Der Schrader-Gate-Check lief
als Handarbeit (und ist in dieser Session prompt einmal an einem veralteten
Lesestand vorbeigelaufen), der Doku-Drift-Check lief nie, und der
Token-Pre-Flight fiel bei jedem Lauf auf den Cloud-Default zurück.

**Behoben:** Alle drei angelegt und mit Signal-Tests belegt (siehe unten).

### B5 — `environment.json` widersprach der Realität 📋

`tools_available.semgrep: false`, obwohl Semgrep lokal installiert ist
(1.171.0) und im Pre-Commit-Hook läuft. Die Skills überspringen anhand dieses
Flags Gates — und melden das als „übersprungen", während das Gate tatsächlich
lief. Genau so ist es in dieser Session in einer Gate-Tabelle gelandet.

**Behoben:** auf `true`. Zusätzlich `tests: false` und `coverage: false`
ergänzt, damit die Skills den fehlenden Test-Unterbau kennen statt ihn zu
vermuten.

### B6 — `DEVELOPER_ONBOARDING.md` fehlte 📋

Von den Governance-Skills bei jedem Lauf angemahnt. Ohne die Datei ist das
Projekt an ein fremdes Team oder ein anderes Werkzeug schwer übergebbar.

**Behoben:** angelegt, mit Fünf-Minuten-Setup, Pflichtlektüre-Reihenfolge,
Gate-Übersicht, Werkzeugwechsel-Abschnitt und den vier Annahmen, die beim
Handoff am ehesten falsch geraten werden.

---

## Signal-Tests der neuen Prüfer

Ein Prüfer, der nichts meldet, ist nicht bewiesen grün — er könnte blind sein.
Beide neuen Skripte wurden deshalb gegen bekannt-schlechte Eingaben gefahren:

| Prüfer | Positiv | Negativ |
|---|---|---|
| `schrader_check.py` | echter BER-140-Block → **Exit 0**, alle vier Bestandteile mit Zeichenzahl | `--self-test` grün; `specs/BER-122.md` (Block liegt im Issue, nicht in der Spec) → **Exit 1** mit korrekter Checkliste |
| `doc-drift-check.sh` | Repo im Ist-Zustand → **PASS**, 51 registrierte Artefakte | eingeschleuste unregistrierte Datei → gemeldet; eingeschleuste tote Referenz → gemeldet |

---

## Was bewusst offen bleibt

- **`dependency-check`** ist nicht gebaut. Risiko derzeit gering, weil selten
  Manifest-Änderungen anstehen — aber es ist eine echte Lücke im
  Supply-Chain-Schutz.
- **Kein Test-Unterbau.** Solange es keine Testsuite gibt, ist jede Aussage
  über Coverage bedeutungslos. Die Verifikation läuft über Rollback-Trigger-Tests
  und manuelle E2E-Läufe — das trägt für die DB-Semantik, nicht für die
  Anwendungslogik in `src/lib/`.
- **`model-profile.yml` ist geschätzt, nicht gemessen** (`herkunft: default`).
  Eine Endpoint-Probe würde die Werte schärfen.
- **Der lokale Semgrep-Zweig bleibt WARN**, wenn Semgrep nicht installiert ist.
  Hart zu blocken würde jeden Neuzugang ohne Semgrep aussperren; die CI fängt
  es ab. Bewusste Abwägung, keine Nachlässigkeit.

---

## Lehre

Zwei der sechs Befunde (B1, B2) sind derselbe Mechanismus: **etwas meldete
Erfolg, ohne geprüft zu haben.** Der CI-Check war strukturell unfähig zu
scheitern; das Manifest wurde von niemandem gelesen. Beide sahen im
Repo-Alltag aus wie funktionierende Absicherung.

Die Gegenmaßnahme ist nicht mehr Konfiguration, sondern der Signal-Test: bei
jedem Gate einmal absichtlich etwas Schlechtes hineingeben und prüfen, dass es
rot wird. Dieselbe Disziplin hat in dieser Session schon die Steuerzeilen-Trigger
und die Session-Prüfung belegt — sie gehört zu jedem Gate, das behauptet, etwas
zu schützen.
