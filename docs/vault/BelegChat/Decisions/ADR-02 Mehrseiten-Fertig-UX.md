---
tags: [adr, belegchat, entscheidung]
type: entscheidung
project: "[[BelegChat - PMO HUB]]"
status: entschieden
erstellt: 2026-07-11
entschieden_am: 2026-07-11
supersedes: "[[Decisions/ADR-01 Mehrseiten-Ziffern-UX]]"
language: de
source: claude
chat_url: unbekannt
parent: "[[BelegChat - PMO HUB]]"
---

# ADR-02: Mehrseiten-UX mit „Fertig“

## Fragestellung

Wie erfasst der Mandant Papierbelege mit mehreren Seiten über Threema — und wie signalisiert er den Abschluss?

## Entscheidung

Nach jeder gespeicherten Seite sendet das System:

> **Seite N gespeichert. Scanne eine weitere Seite oder antworte mit Fertig.**

| Eingabe | Aktion |
|---------|--------|
| weiteres Foto | nächste Seite archivieren, erneute Rückfrage |
| `Fertig` (case-insensitive, `startsWith('fertig')`) | OCR über alle Seiten, Beleg anlegen, Abschluss-Push |
| anderes | Hinweis via Dialog *BERENT2* |

## Begründung

- Natürlicher als Ziffern `1`/`2` — Mandant denkt in „noch eine Seite“ vs. „fertig“
- Weniger Fehleingaben (Ziffern vs. Freitext mit klarer Schlüsselwort-Erkennung)
- E2E-Test 2026-07-11 grün (Beleg `01-2026-0004`)

## Konsequenzen

- ADR-01 ist **superseded**
- `Prüfe Inhalt`: PKCS7-Strip + Text-Typ-Bytes `0x01`/`0x02` für eingehende Threema-Texte
- Dialog *BERENT2* (E2E), Abschluss *BERENT1* (`send_simple`) — zwei separate Threema-Chats beim Mandanten

## Verknüpfungen

- [[Research/SOP-Threema-Belegeingang]]
- [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded)
