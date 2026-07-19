---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Intent-Draft-Template (Perceive-Output)

Diese Vorlage ist die Kopiervorlage fuer `intents/INTENT-DRAFT-XX.md` — das Arbeitsartefakt aus dem Perceive-Modus (Schritt 0.3 des `/intent`-Skills).

> [!warning] Kein valider Intent
> Diese Datei ist ein Destillat der Perceive-Phase aus Rohmaterial. Sie ist Startpunkt fuer die Intent-Session, nicht ihr Ergebnis. Erst `INTENT-XX.md` nach Schritt 5 ist valide.

---

## Kopiervorlage

```markdown
---
id: INTENT-DRAFT-XX
status: perceive-draft
created: YYYY-MM-DD
raw_sources:
  - intents/raw/dateiname1.md
  - intents/raw/dateiname2.txt
linked_initiative: BOO-XX | optional
---

# Intent-Draft XX (Perceive-Phase)

> [!warning] Arbeitsartefakt — kein valider Intent
> Destillat aus Rohmaterial. In den Schritten 1–5 des /intent-Skills zum finalen INTENT-XX.md verfeinern.

## Extrahierte Elemente

### Problem-Signale
- [Was aus den Rohfiles als schlecht, kaputt oder fehlend beschrieben wird]

### Nutzergruppen (erkannt)
- [Genannte oder implizierte Rollen / Zielgruppen]

### Metriken-Kandidaten (erwähnt)
- [Messgroessen oder Erfolgskriterien — explizit oder implizit erwaehnt]

### Constraints (erkannt)
- [Randbedingungen, Nicht-Optionen, Rahmenvorgaben]

## Vorlaeu figer Intent-Versuch

> ⚠️ Hypothese — vom Operator zu verifizieren und zu verfeinern

[Nutzergruppe] soll [messbares Ergebnis] erreichen,
ohne [aktuelles Problem/Reibung].
Erfolg = [falls aus Rohfiles erkennbar — sonst: TBD in Schritt 5]

## Offene Fragen aus dem Rohmaterial

- [Was unklar geblieben ist oder weiterer Klaerung bedarf]

---
*Naechster Schritt: Diese Elemente in Schritt 1 des /intent-Skills verfeinern.*
```

---

## Felder

| Feld | Bedeutung |
|------|-----------|
| `id` | `INTENT-DRAFT-XX` — gleiche Nummerierung wie das spätere `INTENT-XX.md` |
| `status` | Immer `perceive-draft` solange die Intent-Session nicht abgeschlossen ist |
| `raw_sources` | Liste der gelesenen Rohfiles aus `intents/raw/` |
| `linked_initiative` | Optional — Linear-Issue-Referenz falls vorhanden |

## Lifecycle

```
intents/raw/*.md/.txt
        ↓ (Perceive-Durchlauf, Schritt 0.3)
intents/INTENT-DRAFT-XX.md   ← diese Datei
        ↓ (Intent-Session, Schritte 1–5)
intents/INTENT-XX.md         ← valider Intent
intents/INTENT-XX.validation.md
```

`INTENT-DRAFT-XX.md` wird nach erfolgreichem Abschluss von Schritt 5 nicht gelöscht — sie dokumentiert den Perceive-Ausgangspunkt fuer spaetere Retrospektiven.
