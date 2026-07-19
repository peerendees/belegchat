---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Ehrlichkeits-Schicht (SSoT)

Single Source of Truth fuer die Disziplin-Schicht ab v0.2.0: Beleg-Register, Konfidenz-Tags, Grep-Back, Coverage-Register, Falsifikations-Pass. Das ist der Teil, den kein untersuchtes Marktprodukt leistet (Research 2026-07-01, dreifach bestaetigt) — und der Grund, warum es diesen Skill gibt.

## Die vier Disziplinen

| Disziplin | Werkzeug | Ergebnis |
|---|---|---|
| 1. Beleg pro Aussage | `claims.yml` + `scripts/grep_back.py` | jede Aussage traegt `datei:zeile` + Zitat; Rueckpruefung liest die Stelle erneut |
| 2. Closed-World-Coverage | `scripts/coverage_register.py` → `coverage.yml` | „X von Y gesehen" — Luecken benannt, nicht glattgebuegelt |
| 3. Konfidenz-Tag | Tag an jeder Aussage | EXTRACTED / INFERRED / UNKNOWN — Leser sieht sofort: gesehen / vermutet / unbekannt |
| 4. Falsifikation | Pruef-Protokoll (unten) | INFERRED-Aussagen werden gegen den Faktengraph angegriffen, Widersprueche gemeldet |

## Konfidenz-Tags

- **`EXTRACTED`** — Tool-Fakt. Stammt aus dem Faktengraph, hat mindestens einen `evidence`-Eintrag. Ohne Beleg ist EXTRACTED unzulaessig (grep_back.py macht den Lauf rot).
- **`INFERRED`** — LLM-Vermutung, als solche markiert. Muss (a) die Fakten nennen, auf die sie sich stuetzt, (b) den Falsifikations-Pass durchlaufen haben, (c) im Befund sprachlich als Vermutung stehen („deutet darauf hin", nie „ist").
- **`UNKNOWN`** — ehrliche Luecke. Wird ausgeschrieben („nicht ermittelbar, weil ..."), statt sie mit einer plausiblen Erzaehlung zu fuellen. Spekulation ist unterdrueckt.

Mapping auf das Dokument-Etikett (BOO-298, CONVENTIONS §2a): das Frontmatter-Feld `confidence:` traegt den **niedrigsten** im Dokument vorkommenden Tag (`extracted` > `inferred` > `unknown` in Vertrauens-Reihenfolge) — ein Dokument mit auch nur einer INFERRED-Aussage ist als Ganzes `confidence: inferred`.

## Beleg-Register: `docs/_intake/brownfield/claims.yml`

```yaml
schema_version: 1
generated_at: <ISO>
claims:
  - id: C-001
    statement: "Das Modul billing haengt direkt an der Persistenz-Schicht."
    confidence: EXTRACTED            # EXTRACTED | INFERRED | UNKNOWN
    evidence:                        # Pflicht bei EXTRACTED; bei INFERRED: die Stuetz-Fakten
      - file: src/main/java/com/acme/billing/Invoice.java
        line: 7
        quote: "import com.acme.persistence.Db;"
    documents: [00-rohbefund.md]     # wo die Aussage verwendet wird
  - id: C-002
    statement: "Die Paket-Struktur deutet auf eine beabsichtigte 3-Schichten-Architektur hin."
    confidence: INFERRED
    evidence:
      - file: src/main/java/com/acme
        line: 1
        quote: ""                    # INFERRED: quote optional, Stuetz-Fakten via file/claim-Referenzen
    based_on: [C-001]
    falsification: "Gegen Graph geprueft: 3 von 41 Kanten verletzen die vermutete Schichtung — siehe Widerspruchs-Abschnitt."
```

Regeln:
- Jede Architektur-Aussage in einem Befund-Dokument hat einen Claim mit ID; die ID steht im Dokument (z.B. `[C-001]`).
- `quote` ist der woertliche Schnipsel der Zeile (whitespace-normalisierter Vergleich, ±2 Zeilen Toleranz).
- Ein Claim ohne verifizierbare Evidenz wird geloescht oder auf UNKNOWN gestuft — nie stillschweigend behalten.

## Grep-Back (Disziplin 1, deterministisch)

```bash
python3 brownfield-onboarding/scripts/grep_back.py \
  --claims docs/_intake/brownfield/claims.yml --src-root "$SRC_ROOT"
```

Exit 0 = alle Belege bestaetigt; Exit 1 = mindestens ein Beleg gescheitert → Befund darf so nicht uebergeben werden. Beide Skripte kanonisieren alle Pfade und lehnen Path-Traversal ab: Belege muessen in `SRC_ROOT` liegen, Register/Graph im Projekt (Aufruf aus dem Projekt-Root). Der Lauf steht im Abschluss-Block (Kommando + Ergebnis), damit der Operator ihn wiederholen kann.

## Coverage-Register (Disziplin 2, deterministisch)

```bash
python3 brownfield-onboarding/scripts/coverage_register.py \
  --fact-graph docs/_intake/brownfield/fact-graph.yml \
  --src-root "$SRC_ROOT" --out docs/_intake/brownfield/coverage.yml
```

- Ground truth kommt aus der **Quelle** (`find`-Zaehlung im Script), nicht aus dem Graphen — der Graph kann sich nicht selbst bestaetigen.
- Luecken sind **kein Fehler** (Exit 0 auch bei 18% Coverage) — aber **Ghost-Eintraege** (Graph nennt Dateien, die es nicht gibt) sind Fabrikations-Verdacht und machen den Lauf rot (Exit 1).
- Jedes Befund-Dokument zitiert die Coverage-Zahl im Kopf: „Basis: 340 von 1'900 Java-Dateien gesehen (17.9%)."

## Falsifikations-Pass (Disziplin 4, Protokoll)

Fuer **jede** INFERRED-Aussage, bevor sie in einen Befund darf:

1. **Implikation ableiten:** Was muesste im Faktengraph gelten, wenn die Vermutung stimmt? (Beispiel: „Praesentations-Schicht" → keine Kante `ui.* -> persistence.*`.)
2. **Gegen den Graph pruefen** (deterministisch, z.B. `yq`/`grep` auf fact-graph.yml) — nicht gegen das eigene Gedaechtnis.
3. **Widerspruch gefunden?** Aussage faellt oder wird umformuliert UND der Widerspruch steht als eigener Punkt im Befund („Der Graph widerspricht der vermuteten Schichtung an 3 Stellen: ...").
4. **Ergebnis im Claim festhalten** (`falsification:`-Feld) — auch wenn der Pass bestanden wurde.

## Rosinenpickerei-Schutz

Gefahr ist nicht nur Erfindung, sondern **selektives Zitieren**: guenstige Belege uebernehmen, killende Caveats weglassen (Befund der eigenen Recherche-Verifikation 2026-07-01). Darum:

- Beim Belegen einer Aussage sind **Gegenbelege mitzusuchen** (dieselbe Graph-Abfrage, invertiert). Existieren sie, stehen sie im Claim (`counter_evidence:`) und im Befund.
- Eine Aussage, deren Gegenbelege im Graph stehen, aber im Claim fehlen, gilt im Review als Rosinenpickerei — gleicher Schweregrad wie ein gescheiterter Grep-Back.
- Extraktor-`limitations` (Stufe 2/3) muessen in jedem Befund-Kopf wiederholt werden — ein Befund auf Import-Kanten darf sich nicht wie einer auf aufgeloesten Referenzen lesen.

## Ehrliche Grenzen dieser Schicht

- Grep-Back prueft, dass die zitierte Stelle existiert und das Zitat traegt — nicht, dass die Aussage die Stelle richtig **interpretiert**. Interpretations-Fehler faengt erst der Falsifikations-Pass (bei INFERRED) bzw. das menschliche Review.
- Trust-Signale werden nicht automatisch befolgt: Nutzer verwenden LLM-Output teils trotz sichtbarer Evidenz-Warnung weiter (PaperTrail-Befund, Research 2026-07-01). Die Tags machen Ehrlichkeit **sichtbar**, sie ersetzen kein Review — deshalb bleibt `status: draft` bis ein Mensch freigibt.
