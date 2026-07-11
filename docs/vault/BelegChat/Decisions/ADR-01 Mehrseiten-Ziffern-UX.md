---
tags: [adr, belegchat, entscheidung]
type: entscheidung
project: "[[BelegChat - PMO HUB]]"
status: superseded
erstellt: 2026-07-10
entschieden_am: 2026-07-10
superseded_by: "[[Decisions/ADR-02 Mehrseiten-Fertig-UX]]"
superseded_am: 2026-07-11
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# ADR-01: Mehrseiten-UX mit Ziffern 1/2

> **Status: superseded** — ersetzt durch [[Decisions/ADR-02 Mehrseiten-Fertig-UX]] (2026-07-11).

## Fragestellung

Wie erfasst der Mandant Papierbelege mit Vorder- und Rückseite über Threema?

## Entscheidung

Nach jeder gespeicherten Seite sendet das System:

> **(1) Seite hinzufügen** oder **(2) Beleg vollständig erfasst?**

Der Mandant antwortet nur mit **`1`** oder **`2`**.

## Begründung

- Einfacher als Freitext („fertig", „ok")
- Kein stilles Timeout-Sammeln — Mandant behält Kontrolle
- Threema-Textnachrichten werden im `pending_belege`-Zustand als Steuerkommandos verarbeitet

## Konsequenzen

- Tabelle `pending_belege` für Zwischenzustand (24h Timeout)
- Jede Seite sofort in Storage + Hash (GoBD)
- OCR erst nach `2`, über alle gesammelten Seiten

## Verknüpfungen

- [[Research/SOP-Threema-Belegeingang]]
