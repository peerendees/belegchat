---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gold-Standard — Few-Shot-Slot für abgenommene Modul-Dokus

Dieser Ordner ist der **Few-Shot-Slot** für den Narrations-Subagenten (BOO-489 Schritt 5.5): Liegt hier ein **vom Kunden/Team abgenommenes** Modul-Doku, bekommt der Subagent es als Beispiel für **Struktur und Informationstiefe** mit — nicht zum Inhalt-Kopieren. Warum Few-Shot: Im Kundenlauf 2026-07-14 war „gib ein gutes Beispiel vor" der stärkste Qualitätshebel, besonders für schwächere lokale Modelle.

> **Aktueller Stand: kein abgenommenes Beispiel abgelegt.** Bis eines existiert, gilt das **Modul-Struktur-Template** aus der Rubrik ([`../doc-quality-rubric.md`](../doc-quality-rubric.md) §5) als verbindlicher Ersatz — der Skill fällt auf die Regel-Beschreibung zurück, statt ein Beispiel zu erfinden (Anti-Fabrikation). Der Slot bleibt bewusst bestehen, damit ein späteres abgenommenes Beispiel **drop-in** ist, ohne den Skill neu zu verdrahten.

## Was hier hineingehört (wenn vorhanden)

- Nur **abgenommene** Modul-Dokus (Kunde/Team hat den Qualitätsstand bestätigt) — sonst ist die Vorlage keine Referenz mehr.
- **Byte-saubere UTF-8-Dateien** (keine kaputten Tabellen/Diagramme — „kaputte Tabelle" ist ein Anti-Pattern der Rubrik §6).
- Sprache: **DE-only** (Original-Arbeitssprache); die Übersetzung der Beispiele ist nicht in Scope (BOO-490). Nur die Rubrik ist zweisprachig.
- Klassifikation nach Inhalt: echte Kundendetails → `internal`; anonymisierte Struktur-Vorlage → `open`.

## Verwendung im Skill

Der Map-Reduce-Loop (BOO-489) wählt pro Modul-Chunk das strukturell nächstliegende abgelegte Beispiel und gibt es dem frischen Subagenten mit — zusammen mit der Rubrik. Fehlt ein Beispiel, greift §5 der Rubrik. Die Ehrlichkeits-Schicht (Grep-Back/Coverage/Falsifikation) bleibt pro erzeugter Modul-Doku Pflicht.
