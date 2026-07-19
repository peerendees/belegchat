---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Token-Heuristik fuer /ideation Schritt 5b (BOO-39)

Detaillierte Heuristik-Signale, mit denen `/ideation` Schritt 5b den voraussichtlichen Token-Verbrauch einer Story abschaetzt. Wird aus der Story-Beschreibung (Schritt 4 Draft + Schritt 5 Abgleich) extrahiert und in `estimation_basis` als Prosa dokumentiert.

## Signal-Tabelle

| Signal | Token-Wirkung | Erkennung in der Story |
|--------|---|---|
| **Anzahl betroffener Files** | linear ~2k pro File | "files:"-Section in der Spec, oder Aufzaehlung von Pfaden im Body |
| **Erwartete Diff-Groesse** | ~100 Token pro 50 Zeilen | Operator-Angabe, sonst Heuristik aus Files-Liste |
| **Test-Aufwand** | neue Tests +20-50% Tool-Output, erweiterte Tests +10-20% | "Tests:"-Bullet in AC, oder Kontext-Hinweis "incl. Tests" |
| **Doku-Aufwand** | HANDBUCH-Update +10-30%, README-Update +5-15%, Excalidraw +10-20% | "HANDBUCH"-Erwaehnung, "Doku"-Bullet, neuer Skill |
| **Cross-Skill-Beruehrungen** | +1k pro betroffenen Skill (Lese-Aufwand) | "Skill:"-Erwaehnungen in der Spec, Bundle-Skill-Namen (bootstrap, implement, ...) |
| **Reference-Datei-Lese-Aufwand** | +500-2000 pro Reference | "siehe `references/X.md`"-Verweise in der Spec |
| **Erfahrungs-Faktor (L3)** | Multiplikator 0.8-1.2 aus aehnlichen Stories | `journal/learnings.db` (wenn Level L3 aktiv) |

## Berechnungsbeispiel

Story BOO-39 selbst (diese Story):

| Position | Wert |
|---|---|
| Files: 4 (ideation/SKILL.md + .en.md, references/token-heuristik.md NEU + .en.md) | 4 × 2k = 8k |
| Diff: ~250 Zeilen neue Logik | 250/50 × 100 = 500 |
| Tests: keine neuen (Skill-Aenderung ohne Code) | 0 |
| Doku: HANDBUCH Anhang G existing, hier nicht beruehrt; references-Datei NEU = +20% | (8k + 500) × 0.2 = 1.7k |
| Cross-Skill: implement (BOO-40), backlog, sprint-review | 3 × 1k = 3k |
| References: 2 (token-heuristik.md DE + EN als neue Datei) | 0 (sind selbst erstellt) |
| L3-Faktor: nicht aktiv | 1.0 |
| **Summe** | **~13k Token** |

= ~7% des Sprint-Budgets (Beispiel: Cloud-Default-Profil 200k → Budget 160k) → **2 SP**, Modus `linear`.

## L3-Kalibrierung (optional)

Wenn `.learning-loop` auf `L3` gesetzt und `journal/learnings.db` existiert:

```sql
SELECT AVG(actual_tokens) / AVG(estimated_tokens) AS calibration_factor
FROM stories
WHERE skills_touched IN (gewuenschte_skill_liste)
  AND diff_size_lines BETWEEN (story_diff * 0.7) AND (story_diff * 1.3)
LIMIT 10;
```

Wenn 5+ Treffer und `calibration_factor` zwischen 0.7 und 1.5: Estimate × `calibration_factor`. Sonst: ungewichtete Heuristik.

Default-Schwelle: 5 aehnliche Stories (in `environment.json` als `thresholds.l3_calibration_min_matches` konfigurierbar — optional, BOO-39 selbst legt das Feld nicht zwingend an).

## Kalibrierungs-Loop

Nach jeder Story `/sprint-review` schreibt `actual_tokens` zurueck nach L3 (aus `journal/reports/local/{date}_{story}/meta.json` Schritt-Count + Skill-Output-Volumen). Selbst-korrigierend ueber Zeit — nach 10-20 Sprints sollte die Heuristik projekt-spezifisch kalibriert sein.

## SP-Klassifizierung

Token-Estimate aus der Heuristik wird auf SP-Klasse gemappt (HANDBUCH Anhang G). Die
Prozent-Basis ist das Budget aus dem **frisch gelesenen** Modell-Profil `.claude/model-profile.yml`
(`served_context × effective_fraction × budget_pct`, SSoT BOO-484 — nur referenziert; ohne Profil
Cloud-Default 200k + Warnung, BOO-486). Zusaetzlicher harter Deckel: `token_estimate` ueber
`Blatt-Budget × capability_factor` → Story splitten, unabhaengig von der SP-Klasse:

| Token-Estimate | Anteil 80%-Budget | SP | Ausfuehrungsmodus |
|---|---|---|---|
| < 8k | ~5% | 1 | linear |
| 8-24k | ~10-15% | 2 | linear / sub-agents |
| 24-48k | ~20-30% | 3 | sub-agents |
| 48-96k | ~40-60% | 5 | agentic |
| > 96k | ueber 60% | 8 | **Story aufteilen** |

## Operator-Override

`/ideation` zeigt die Schaetzung + ableitete SP + Modus, fragt: "Korrigieren? [y/n]". Bei `y` Operator-Eingabe. Modus wird automatisch aus Tabelle nachgezogen — Operator korrigiert nur SP.

Manuelle Overrides werden ebenfalls in L3 mitgeschrieben (mit Marker `override=true`), damit Kalibrierung weiss: "Operator hat manuell hoechstwertig korrigiert, Heuristik war unterschaetzt".

## Verknuepfungen

- Konvention: HANDBUCH Anhang G (BOO-38)
- Konsumiert: `/implement` Schritt 0b Pre-Flight (BOO-40) liest `token_estimate` aus Spec-Frontmatter
- L3-Source: `journal/learnings.db` (Learning-Loop Level 3, siehe `bootstrap/references/learning-loop.md`)
- environment.json: `thresholds.token_warn_threshold` (Default 70) + `thresholds.token_hard_threshold` (Default 80)
