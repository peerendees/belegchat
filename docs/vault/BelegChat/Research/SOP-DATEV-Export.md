---
tags: [sop, belegchat, datev, export]
type: sop
project: "[[BelegChat - PMO HUB]]"
erstellt: 2026-07-12
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# SOP: DATEV-Export

> Technik: `belegchat/docs/DATEV.md` · Dashboard: https://app.belegchat.de/export

## Monatsabschluss (Ablauf Mandant/BERENT)

1. **Freigeben:** `/belege` — alle Vorschläge prüfen, ggf. Sachkonto korrigieren, freigeben
2. **Exportieren:** `/export` — Jahr + Monat wählen → „DATEV-Buchungsstapel erzeugen"
   → `EXTF_Buchungsstapel_<jahr>_M<mm>.csv` wird heruntergeladen
3. **Übergeben:** Datei an den StB (DATEV Re:wesen → ASCII-Import Buchungsstapel)
4. Belege stehen danach auf **Exportiert** (festgeschrieben); der Export erscheint in der
   Liste und kann jederzeit erneut heruntergeladen werden (deterministisch regeneriert)

## Einmalig einrichten

- Beraternummer + Mandantennummer vom StB in `firmen` eintragen (SQL in `docs/DATEV.md`)
- Gegenkonto prüfen (`datev_gegenkonto`, Default 1800 Bank)

## Troubleshooting

| Symptom | Ursache / Abhilfe |
|---------|-------------------|
| „Keine freigegebenen Belege im Zeitraum" | Nichts im Status `geprueft` mit Belegdatum im Zeitraum — erst freigeben; Belegdatum prüfen |
| DATEV-Import meckert Header | Berater-/Mandantennummer fehlen (0;0) → in `firmen` pflegen |
| Beleg fehlt im Stapel | `beleg_datum` leer oder außerhalb des Zeitraums; Status ≠ `geprueft` |
| Falsche Kontierung entdeckt nach Export | Beleg ist festgeschrieben — Korrektur via Storno/Neuerfassung beim StB |

## Verknüpfungen

- [[Research/SOP-Dashboard-Auth]] · [[BelegChat - PMO HUB]]
- `belegchat/docs/DATEV.md`
