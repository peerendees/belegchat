---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

<a name="deutsch"></a>

> 🌐 **Sprache:** Deutsch (diese Datei) · [🇬🇧 English version](README.en.md)

# Quality-Gate-Audit — prueft, ob die Quality Gates wirklich verdrahtet sind

> Ein Quality Gate kann **konfiguriert** und trotzdem **blind** sein. Dieser Skill prueft jedes der
> vier Gates eines Projekts gegen Existenz, Registrierung und einen Signal-Test und stuft es als
> `verdrahtet`, `nominell` oder `blind` ein. Er **diagnostiziert** und **repariert nicht** — er
> stellt die Wahrheit fest und schreibt sie als Audit-Report.

**Version:** 1.3.0 · **Befehl:** `/quality-gate-audit`

> **Neu in 1.2.0 (BOO-370):** **Phantom-Gate-Probe** — erkennt GitHub-seitig einen Required-Check, der nie postet (totes Pflicht-Gate, z. B. SonarCloud nach Org-Transfer). `bash quality-gate-audit/scripts/phantom-gate-probe.sh`; `gh` als einzige Netz-Abhängigkeit, kein Sonar-Zugang. Meldet, repariert nicht.
>
> **Neu in 1.1.0 (BOO-202):** monatliche **Native-Feature-Beobachtung** (ADR-5 Re-Eval-Trigger — ist Anthropics *Agent Teams* noch experimentell?). Ein **Watch**, kein Wiring-Gate — blockt keinen Sprint, fliesst nicht in `verdrahtet/nominell/blind` ein.

---

## Was macht /quality-gate-audit?

Drei Zustaende, ein einziger Unterschied — feuert das Gate beim gezielten Trigger oder nicht?

- **`verdrahtet`** — Datei vorhanden, registriert im ausfuehrenden Pfad, Signal-Test feuert.
- **`nominell`** — vorhanden und konfiguriert, aber nirgends registriert: laeuft faktisch nie.
- **`blind`** — behauptet zu pruefen, prueft nichts (Datei fehlt/leer oder Schicht haengt nirgends).

Die Unterscheidung **nominell vs. blind** ist der Kern des Audits: `nominell` gibt falsche
Sicherheit, `blind` ist offen kaputt — keiner von beiden ist Verdrahtung. Der Skill schreibt das
Ergebnis als Audit-Report nach `docs/audits/` und gibt eine Status-Tabelle aus. Er **fuehrt keinen
Gate-Lauf** durch (das machen `/security-architect` und `/implement`) — er prueft **eine Ebene
hoeher**: ob die Gates ueberhaupt verdrahtet sind, sodass sie feuern *koennen*.

---

## Nutzung

### Befehl + Trigger-Phrasen

```
/quality-gate-audit
```

Oder eine der Trigger-Phrasen:

```
sind die quality gates verdrahtet
pruef die quality gates
gate wiring check
quality gate audit
```

### CLI-Flags

| Aufruf | Wirkung |
|--------|---------|
| `/quality-gate-audit` | interaktiver Lauf, Default-Trigger `manual`. |
| `--trigger {post-install\|pre-sprint\|post-update\|manual}` | Trigger-Kontext (steuert Frontmatter `triggered_by` + Trigger-Mechanik). |
| `--override-gate <name>[,<name>...] --reason "..."` | ein/mehrere `blind`-Gates transient akzeptieren. `--reason` ist **Pflicht** und landet im Audit-Trail. |
| `--report-only` | nur den letzten Report ausgeben, **kein** neuer Lauf. |
| `--trigger post-update --force` | manueller Post-Update-Trigger (Fallback, wenn der Versions-Marker nicht greift). |

**Exit-Code:** `0` wenn alle Gates `verdrahtet` **oder** akzeptiert ueberschrieben sind; `1` wenn
≥1 Gate `blind` ist ohne Override.

### Vier automatische Trigger

| Trigger | Wer loest aus | Verhalten |
|---------|---------------|-----------|
| `post-install` | letzter Schritt in `/bootstrap` | Baseline-Report direkt nach dem Setup. |
| `pre-sprint` | **HARD-HOOK** in `/sprint-run` Schritt 1 | alle `verdrahtet` → Sprint startet; ≥1 `blind` → **STOPP**. |
| `post-update` | Versions-Marker `.claude/.last-framework-version` | Mismatch zur Framework-`version` → Auto-Trigger. |
| `manual` | Operator (`/quality-gate-audit`) | Default, interaktiver Lauf. |

---

## Modi & Features

### Die vier Gates

| # | Gate | Was geprueft wird | Signal-Test |
|---|------|-------------------|-------------|
| 1 | **Semgrep-Wiring** | `.semgrep/`, Wiring-Canary, `semgrep.yml`-Workflow | `semgrep --config .semgrep/ …/wiring-canary.py` muss `qgaudit-wiring-canary` melden. |
| 2 | **Coverage** | `coverage-check.sh` + Schwellwerte (`COVERAGE_PASS=80`/`WARN=60`) | Schwellwerte vorhanden **und** Hook registriert. |
| 3 | **Slopsquatting** | `slopsquatting/wordlist.txt`, `dependency-check.sh` | Wordlist ≤ 90 Tage + referenziert + bekannter Eintrag per `grep` erkannt. |
| 4 | **Layer-0 Bodyguard** | `pre-edit-bodyguard.sh`, `bodyguard/patterns/*.yml`, `settings.json` | synthetischer AWS-Key-Edit → Hook blockt mit Exit 1 + `[BODYGUARD] BLOCKIERT`. |

Volle Tabelle mit Pfaden, Markern und nominell-vs-blind-Kriterien:
[references/gate-catalog.md](references/gate-catalog.md).

### Status-Schema

`verdrahtet` (alles greift) · `nominell` (konfiguriert, aber nicht registriert) · `blind` (prueft
nichts). Die Engine `scripts/gate-checks.sh` (deterministisch, bash 3.2-kompatibel, dependency-frei)
fuehrt die Signal-Tests selbst aus und liefert pro Gate eine Zeile `gate=<name> status=<status>`.

### Phantom-Gate-Probe (BOO-370)

Getrennt vom Wiring-Audit: `scripts/phantom-gate-probe.sh` prüft GitHub-seitig, ob ein **Required-Check
wirklich postet** — oder als totes Pflicht-Gate jeden PR blockiert, ohne je zu prüfen (klassischer Fall:
SonarCloud verliert nach einem Org-Transfer die Projekt-Bindung). Zwei Status: `aktiv` (hat im Fenster der
letzten N Commits gepostet) / `nominell` (required, aber nie gepostet = Phantom). `gh` ist die einzige
Netz-Abhängigkeit, **kein Sonar-Zugang** nötig; die Probe **meldet, repariert nicht**. Org-Transfer-Fix:
HANDBUCH Anhang AA. Details im [SKILL.md](SKILL.md).

### Report

- **Pfad:** `docs/audits/YYYY-MM-DD-quality-gate-audit.md` (konfigurierbar via `.claude/environment.json`,
  Feld `paths.audits`). In Git eingecheckt, nicht unter Drift-Watch.
- **Frontmatter:** `audit_id`, `triggered_by`, `framework_version`, `overrides: []`,
  `summary: {verdrahtet, nominell, blind}`.
- **Body:** Status-Tabelle, pro Gate Check-Pfad + Signal-Test-Output + Reparatur-Hinweis, Diff zum
  letzten Lauf (ab dem 2. Lauf), naechste Schritte.

---

## Hintergrund

Anlass war ein konkreter Semgrep-Vorfall: Ein Custom-Rule-Verzeichnis (`.semgrep/`) war sauber
konfiguriert, wurde aber nie via `--config` an die CLI uebergeben — die Regeln liefen schlicht nie
(ADR „Semgrep Custom-Rule-Wiring", 2026-06-11). Das Gate war **nominell** da und faktisch **blind**.
Genau diese Luecke zwischen *konfiguriert* und *wirksam* gibt falsche Sicherheit: man verlaesst sich
auf einen Schutz, der nie feuert.

Die Lehre: **nominell ist blind.** Ein Gate, das man nicht gegen einen echten Trigger getestet hat,
ist kein Schutz, sondern eine Annahme. `/quality-gate-audit` macht aus dieser Lehre eine
reproduzierbare Pruefung — mit einem **Wiring-Canary** je Gate (eine Fixture mit bewusster
Verletzung, die nur dann einen Treffer produziert, wenn das Gate wirklich verdrahtet ist). Ein
Treffer beweist die Verdrahtung; Schweigen beweist Blindheit.

---

## Dateistruktur

```
quality-gate-audit/
├── SKILL.md                              ← Skill-Definition (1.0.0, DE — primaer)
├── SKILL.en.md                           ← Skill-Definition (1.0.0, EN)
├── README.md                             ← diese Datei (DE)
├── README.en.md                          ← englisches README
├── scripts/
│   ├── gate-checks.sh                    ← deterministische Audit-Engine (4 Gates)
│   └── signal-tests/
│       └── bodyguard-canary-edit.sh      ← AWS-Key-Edit gegen den Bodyguard-Hook
└── references/
    ├── gate-catalog.md                   ← Gate-Tabelle (Pfade, Marker, Kriterien)
    ├── test-plan.md                      ← Positiv-/Negativ-Cases je Gate
    └── test-fixtures/                    ← project-wired / project-blind / project-nominell
```

> **Overview-Sketch:** `quality-gate-audit-overview.excalidraw`/`.png` (+ `.en`) folgen ueber den
> zentralen Render-Pass.

## Verwandt

- Security-Gesamtsicht: [Runbook ciso-security](../docs/runbooks/ciso-security.md)
- Governance-Prinzip dahinter: [Runbook governance-prinzip](../docs/runbooks/governance-prinzip.md)
