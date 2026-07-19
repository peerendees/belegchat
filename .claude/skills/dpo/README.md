---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# dpo — Data Protection Officer (Datenschutz by Design)

**Version:** 1.3.0 · **Befehl:** `/dpo`

Bringt **Datenschutz by Design** in den Entwicklungsprozess mit Claude Code — von der Datenerhebung bis zur Loeschung. Der Skill stellt an den richtigen Stellen die richtigen Pruef-Fragen (Rechtsgrundlage, Zweckbindung, Loeschkonzept, Betroffenenrechte), damit Operatoren keine DSGVO-Experten sein muessen. Deckt **DSGVO/GDPR (EU)**, **BDSG (DE)** und **nDSG (CH)** ab. Der Operator entscheidet — der Skill erfindet keine Rechtsberatung.

> **Claude-Code-Modus:** `/dpo` ist read-only (ASSESS/REVIEW dialogisch, AUDIT deterministisch) → **`plan`** (Plan Mode); der AUDIT-Runner laeuft, vom `/sprint-review` getriggert, unbeaufsichtigt mit **`dontAsk`**. Details: HANDBUCH §6 „Claude-Code-Modus".

## Installation

```bash
# Aus dem GitHub-Repo in den globalen Skill-Pool kopieren
cp -r ~/Documents/GitHub/claudecodeskills/dpo ~/.claude/skills/dpo
```

Im INTENTRON-Framework wird `dpo` zusaetzlich beim `/bootstrap` (Privacy-Add-on) als Bundle-Skill installiert.

## Nutzung

```text
/dpo                  → Modus wird automatisch nach Phase gewaehlt
/dpo audit            → Compliance-Audit gegen die Kontrollkataloge
```

Wird auch automatisch von anderen Skills aufgerufen: `/ideation` (ASSESS), `/implement` (REVIEW), `/sprint-review` (AUDIT).

## Funktionsumfang

### 3 Modi

| Modus | Wann | Was |
|-------|------|-----|
| **ASSESS** | Ideation/Planung, neue Features | Datenfluss-Analyse, Rechtsgrundlage (Art. 6), DPIA-Schwellwert-Pruefung |
| **REVIEW** | Code-/Feature-Aenderung mit Datenverarbeitung | Datenschutz-Check im Code (PII, Consent, Pseudonymisierung) |
| **AUDIT** | Auf Abruf, vor Releases, periodisch | Kontrollkatalog abarbeiten → reproduzierbarer Report |

### Deterministischer Kontrollkatalog (seit v1.2.0, BOO-87)

Der AUDIT-Modus arbeitet **versionierte YAML-Kontrollkataloge** ab statt Fliesstext:

- **Kataloge** `controls/gdpr.yml` (DSGVO) + `controls/ndsg.yml` (Schweizer nDSG — CH-Alleinstellung). Jedes Control mit `id/titel/evidenz/check_typ/check_arg/mapsTo/quelle`.
- **Runner** `scripts/dpo-audit.py` (python3-Stdlib, **keine Datenbank**) erzeugt ein reproduzierbares Report-Paar `dpo/reports/<date>_audit.md` + `.json`.
- **Ehrlicher Determinismus:** mechanische Checks (Datei vorhanden? Secret im Code? TLS aus?) → **PASS/GAP**; Urteils-Checks (Zweckbindung, Verhaeltnismaessigkeit) → **REVIEW-NEEDED** (Mensch bestaetigt). Seit BOO-427 zusaetzlich: `grep-review` (PII-Heuristik, z.B. email-Spalten in Migrationen → REVIEW-NEEDED als Hinweis) und `conditional-file` (PII-Pfade deklariert ohne Privacy-Add-on → GAP); Art.-25/35-DSGVO- und Art.-7-nDSG-Controls im Katalog.
- **Opt-in Gate fuer heavy (BOO-427):** `--gap-exit` / `DPO_GAP_EXIT=1` macht ≥1 GAP zum Exit 1 (Required-Status-Check-tauglich); Default bleibt Bericht (Exit 0).
- **Projekt-Overlay** `.claude/dpo/controls/` (BYO, ueberlebt Updates). OSCAL-Export als spaetere Ausbaustufe.

## Hintergrund / Motivation

Privacy war im Framework lange nur ein loser Hinweis, waehrend Security voll operationalisiert war (Asymmetrie). `dpo` schliesst das: Privacy by Design wird zur **Framework-Garantie**. Mit BOO-87 wurde die AUDIT-Evidenz von einer KI-Meinung zu **auditor-ready, reproduzierbarer** Control-fuer-Control-Evidenz — relevant fuer FINMA/BaFin-regulierte Zielgruppen. Das Katalog-Pattern ist an `agentic-security` (JSON-Control-Kataloge + OSCAL) angelehnt, **ohne Code-Uebernahme** (PolyForm-Lizenz), und um nDSG erweitert.

## Dateistruktur

```
dpo/
├─ SKILL.md / SKILL.en.md       Skill-Definition (DE/EN), 3 Modi + Kontrollkataloge
├─ README.md                    diese Datei
├─ controls/
│  ├─ gdpr.yml                  DSGVO-Kontrollkatalog
│  └─ ndsg.yml                  Schweizer nDSG-Kontrollkatalog (CH-Alleinstellung)
├─ scripts/
│  └─ dpo-audit.py              deterministischer Audit-Runner (Report md+json)
└─ references/
   ├─ ndsg-schweiz.md           nDSG-Besonderheiten, Vergleich DSGVO, EDOEB
   ├─ verarbeitungsverzeichnis.md  Art. 30 Template
   ├─ dpia-template.md          DPIA nach Art. 35
   ├─ betroffenenrechte.md      Art. 15-22, Fristen, Patterns
   └─ privacy-patterns.md       Privacy-by-Design Code-Patterns
```

## Quellen

- DSGVO/GDPR (Verordnung (EU) 2016/679), BDSG, nDSG (Schweiz, in Kraft seit 2023).
- Kontrollkatalog-Pattern angelehnt an `agentic-security` (Clear-Capabilities) — nur Pattern, kein Code (PolyForm-Lizenz).
- INTENTRON-Framework: BOO-69 (DPO-Adoption), BOO-87 (Kontrollkatalog).

## Verwandt

- Rollen-Runbook: [dpo-privacy](../docs/runbooks/dpo-privacy.md)
- Compliance-Nachweismechanik: [compliance-mechanik](../docs/compliance/compliance-mechanik.md)
