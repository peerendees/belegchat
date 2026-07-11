---
type: roadmap
project: "[[BelegChat - PMO HUB]]"
status: aktiv
erstellt: 2026-07-10
aktualisiert: 2026-07-11
tags: [belegchat, post-alpha, gobd]
source: claude
chat_url: unbekannt
related:
  - "[[Research/POST-ALPHA-Implementierungsplan]]"
---

# Post-Alpha Roadmap — BelegChat

> Fachliche Feature-Roadmap. **Technischer Abarbeitungsplan:** [[Research/POST-ALPHA-Implementierungsplan]] · Repo: `belegchat/docs/POST-ALPHA-PLAN.md`

> Direkt nach Alpha-Abschluss. Alpha = Threema Mehrseiten + GoBD-Basis nutzbar.

## Entscheidung offen: Zweiter Eingangskanal

| Option | Vorteil | Aufwand |
|--------|---------|---------|
| **A — Dashboard-Upload** | PDF vom PC, Vorschau, Freigabe im Browser | App-UI, Auth |
| **B — Lokales Skript / Hot-Folder** | Batch, Büro-Automatismus | CLI + n8n-Webhook |

Empfehlung: **Batch/CLI zuerst** (Phase 2), Dashboard danach (Phase 3). Siehe [[Research/POST-ALPHA-Implementierungsplan]].

## App-Funktionen (gemeinsam für A und B)

### 1. Belege anzeigen

- OCR-Daten, Kontierungsvorschlag, Originalbilder (`beleg_seiten`)
- Status-Badge: `vorschlag`, `klaerungsbedarf`, `geprueft`

### 2. Dokumentation bestätigen

- Nutzer bestätigt einmalig oder pro Beleg das Erfassungsverfahren (GoBD-Nachweis)
- Eintrag in `audit_log`: `dokumentation_bestaetigt`

### 3. Freigaben

| Aktion | Status | Audit |
|--------|--------|-------|
| Freigeben | `vorschlag` → `geprueft` | `beleg_freigegeben` |
| Klärung | → `klaerungsbedarf` | `beleg_klaerung` |

Nach Freigabe: Felder gesperrt (Unveränderbarkeit — Konzept Alpha, UI Post-Alpha).

### 4. DATEV-Export

- Im selben UI-Block, nach Freigabe-Workflow stabil

## Zurückgestellt

- PDF über Threema (P3)
- E-Rechnung / XML (P4+)
- Formale BMF-Verfahrensdokumentation (parallel P2)

## Technische Vorbereitung (Stub)

- `belegchat/` App: Route `/belege` (Liste), `/belege/[id]` (Detail + Freigabe) — Post-Alpha
- Optional: `scripts/beleg-import/` Hot-Folder — Post-Alpha
