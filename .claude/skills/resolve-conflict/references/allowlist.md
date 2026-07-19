---
provenance:
  origin: ai-claude
  classification: internal
  status: reviewed
---

# Allowlist — mechanisch auto-auflösbare Konflikt-Klassen

> 🇩🇪 **Deutsch** (diese Datei) · 🇬🇧 [English](allowlist.en.md)

SSoT für [`../SKILL.md`](../SKILL.md) Schritt 2. **Nur** die hier gelisteten Klassen dürfen automatisch aufgelöst werden. Alles andere ist inhaltlich und geht mit Empfehlung an den Menschen (Schritt 3). Die Liste ist bewusst konservativ: im Zweifel gilt ein Hunk als inhaltlich.

## Grundregel

Eine Klasse ist nur dann mechanisch, wenn die korrekte Auflösung **eindeutig aus der Struktur** folgt — nicht aus einer inhaltlichen Präferenz. Auto-Auflösung heisst fast immer **Union** (beide Seiten behalten, richtig einsortieren), nie **Wahl** (eine Seite verwerfen).

## Klassen

### K1 — Beidseitige Append-Zeilen in geordneten Listen

Beide Branches hängen je eine Zeile an dieselbe geordnete Liste/Tabelle an.

- **Trigger:** Konflikt-Hunk, in dem `ours` und `theirs` je eine neue Zeile am selben Anker enthalten, restlicher Kontext identisch.
- **Auflösung:** beide Zeilen behalten, nach der Ordnung der Liste einsortieren (alphabetisch / chronologisch / nummerisch, wie die Liste es vorgibt).
- **Beispiele:** `docs/releases/README.md` Wave-Liste, HANDBUCH-Anhang-Tabelle, `docs/INDEX.md`-Tabellen, Changelog-Einträge.

### K2 — Wave-Index-Kopf

Zwei Branches ergänzen den Wave-Index um verschiedene Wave-Buchstaben.

- **Trigger:** Konflikt im Wave-Index-Kopf (`docs/releases/README.md` / `_index.md`), beide Seiten fügen eine Wave-Zeile hinzu.
- **Auflösung:** beide Wave-Zeilen behalten (Union), Buchstaben-Reihenfolge wahren. **Kollisions-Check:** vergeben beide Seiten *denselben* Buchstaben, ist das **kein** K2 → inhaltlich (der Operator muss umbenennen, ADR Cross-Session-Drift).

### K3 — Versions-Bump

Beide Seiten heben dieselbe Versionsnummer an (SKILL.md `version:`, README `**Version:**`, `package.json`).

- **Trigger:** Konflikt nur in einer SemVer-Zeile.
- **Auflösung:** die **höhere** Version gewinnt. Bei gleicher Höhe mit unterschiedlichem Sinn → inhaltlich.

### K4 — DE/EN-Paritätsdateien

Der strukturell identische Konflikt tritt in einer `.md` und ihrer `.en.md` auf.

- **Trigger:** derselbe Hunk-Typ in DE- und EN-Zwilling.
- **Auflösung:** dieselbe strukturelle Auflösung (K1–K3) auf beiden Sprachdateien anwenden — Parität wahren, damit `docs_drift_check.py` grün bleibt.

### K5 — Reine Formatierung

Whitespace, Zeilenende (CRLF/LF), Reihenfolge stabiler, unabhängiger Blöcke.

- **Trigger:** Diff-Inhalt identisch bis auf Formatierung.
- **Auflösung:** die im Repo geltende Formatierung (`.editorconfig`, Linter) durchsetzen.

## Was NICHT auf die Allowlist gehört

- Konkurrierende Änderungen an **derselben** Logik-/Prosa-Zeile (nicht nur Append).
- Gelöschte-vs-geänderte Datei/Zeile.
- Alles, wo die richtige Seite eine **inhaltliche Entscheidung** ist.
- Ein Wave-Buchstaben-Doppel (siehe K2) — bleibt bewusst inhaltlich.

## Protokoll

Jede Auto-Auflösung wird geloggt: `K<n> | <datei> | <kurzbegründung>`. Der Log ist Teil der Skill-Ausgabe und, bei `governance_mode=heavy`, der Audit-Spur.
