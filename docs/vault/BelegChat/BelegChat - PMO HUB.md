---
tags: [projekt, belegchat, entwicklung]
status: aktiv
phase: post-alpha
erstellt: 2026-07-10
aktualisiert: 2026-07-11
language: de
source: claude
chat_url: unbekannt
governance: "[[Projekt-Governance]]"
related:
  - "[[Research/POST-ALPHA-Implementierungsplan]]"
  - "[[Decisions/ADR-02 Mehrseiten-Fertig-UX]]"
---

# BelegChat

> Threema-basierter Belegeingang mit OCR, KI-Kontierung (SKR04) und revisionssicherer Speicherung in Supabase.

## Projektziel

Mandanten senden Belegfotos per Threema; der Workflow extrahiert Daten, schlägt ein Sachkonto vor und legt einen Datensatz in Supabase an. Status initial: `vorschlag` (manuell prüfbar nach Alpha).

## Status

| Phase | Stand |
|-------|-------|
| **Beta** | Threema E2E Einzelseite grün (2026-07-10, Beleg `01-2026-0003`) |
| **Alpha** | **E2E grün** (2026-07-11, Beleg `01-2026-0004`, Mehrseiten + GoBD) |
| **Post-Alpha** | **Plan steht** — Phase 1 GoBD → Phase 2 Batch → Phase 3 Dashboard |

## Erledigt 2026-07-10 (Beta)

- [x] Auth `DECRYPT_API_TOKEN` an Supabase-Nodes
- [x] `Prüfe Inhalt`: `raw.text` statt `raw.plaintext`
- [x] OCR/Kontierung über Supabase Edge Function
- [x] SOP Threema-Belegeingang im Vault
- [x] Mandanten-Guard, Signaturprüfung, Fehlerpfad

## Erledigt 2026-07-11 (Alpha)

- [x] Mehrseiten-UX: Scan + Scan + **`Fertig`** ([[Decisions/ADR-02 Mehrseiten-Fertig-UX]])
- [x] Threema-Gateway-Split: Dialog *BERENT2* (E2E), Abschluss *BERENT1* (`send_simple`)
- [x] PKCS7-Padding Send + Strip Receive (Edge Function v15)
- [x] n8n-Loop-Fix (leere Delivery-Callbacks)
- [x] GoBD: Storage, `gobd_hash`, `beleg_seiten`, `audit_log`
- [x] Workflow live per n8n API (ID `MYpHUIHNMuIUR1ic`)
- [x] E2E-Test Mehrseiten grün (`01-2026-0004`)

### Alpha Definition of Done

- [x] Mandant kann 1–n Seiten per Threema mit **`Fertig`** abschließen
- [x] Ein `belege`-Satz mit verknüpften Storage-Dateien
- [x] `gobd_hash` und `audit_log` bei Erfassung
- [x] SOP beschreibt Flow inkl. GoBD + Troubleshooting
- [x] Testbeleg Mehrseiten E2E grün

## Post-Alpha (P2)

**Implementierungsplan:** [[Research/POST-ALPHA-Implementierungsplan]] · Claude Code: `belegchat/docs/POST-ALPHA-PLAN.md`

Siehe auch [[Research/Post-Alpha-Roadmap]].

| Phase | Thema | Linear | Status |
|-------|-------|--------|--------|
| 0 | Pfad-Migration Shared → `~/Entwicklung/projekte/` | — | offen |
| 1 | GoBD: Zeitstempel, Hash, Unveränderbarkeit | BER-92 *(anlegen)* | offen |
| 2 | PDF-Batch CLI + n8n-Webhook | [BER-90](https://linear.app/berent/issue/BER-90) | offen |
| 3 | Dashboard Threema-ID + Passkey | BER-93 *(anlegen)* | offen |
| 4 | RLS final, DATEV, Landing | BER-91, BER-22 | offen |

## Kanal-Strategie

| Kanal | Phase |
|-------|-------|
| Threema Foto + **Fertig** | Alpha ✓ |
| Dashboard PDF | Post-Alpha |
| Lokales Skript / Hot-Folder | Post-Alpha |
| Threema PDF | P3 |
| E-Rechnung XML | P4+ |

## Operations / SOPs

- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Research/SOP-Threema-Belegeingang]]
- [[Research/Post-Alpha-Roadmap]]
- `belegchat/SICHERHEIT.md`
- `belegchat/docs/ALPHA-HANDOFF.md`
- `threema-decrypt/DEPLOY.md`

## SOP-Lage

| Ort | Anzahl | Hinweis |
|-----|--------|---------|
| Vault BelegChat | 2 SOPs/Roadmaps + 2 ADRs | Single Source of Truth |
| Notion | ~49 | Eigenes Migrationsprojekt — **kein Alpha-Blocker** |
| Second Brain | Sync aus Vault | `berent-2nd-brain/02 Projekte/BelegChat/` |

## Backlog (Linear)

Projekt: [BelegChat](https://linear.app/berent/project/belegchat-0db7e2580452)

## Verknüpfungen

- [[Projekt-Governance]]
- [[Research/POST-ALPHA-Implementierungsplan]]
- [[Decisions/ADR-02 Mehrseiten-Fertig-UX]]
- [[Decisions/ADR-01 Mehrseiten-Ziffern-UX]] (superseded)
- [[Research/Post-Alpha-Roadmap]]
