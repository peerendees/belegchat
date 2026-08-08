# DEVELOPER_ONBOARDING.md — BelegChat

> Für alle, die dieses Projekt übernehmen: fremdes Entwicklungsteam, anderes
> KI-Werkzeug (Codex, Cursor, Copilot), oder das eigene Ich in sechs Monaten.
> Angelegt 08.08.2026 — die Datei fehlte und wurde von den Governance-Skills
> bei jedem Lauf angemahnt.
>
> **Pflegepflicht:** Wer Runtime, Zielarchitektur, Pflichtlektüre, Arbeitsweise
> oder Sicherheitsregeln ändert, zieht diese Datei nach. Sie ist die einzige,
> die Übergabefähigkeit herstellt.

---

## In fünf Minuten arbeitsfähig

```bash
git clone git@github.com:peerendees/belegchat.git
cd belegchat
npm ci
bash scripts/install-hooks.sh     # setzt core.hooksPath=.githooks — NICHT überspringen
cp .env.local.example .env.local  # falls vorhanden; sonst siehe SICHERHEIT.md
npm run dev
```

Ohne `install-hooks.sh` laufen die lokalen Quality-Gates nicht — Commits gehen
dann ungeprüft durch und fallen erst in der CI auf.

**Zweites Repo:** Datenbank-Migrationen liegen **nicht hier**, sondern im
Schwester-Repo `threema-decrypt/supabase/migrations/`. Wer am Schema arbeitet,
klont beide nebeneinander.

---

## Was das System tut

Mandanten fotografieren Belege und schicken sie per Threema. n8n orchestriert
OCR und KI-Kontierung (SKR04), die Belege landen revisionssicher in Supabase.
Im Dashboard prüft und gibt der Mandant sie frei; daraus entsteht ein
DATEV-Buchungsstapel (EXTF) für die Steuerkanzlei.

```
Threema  ─┐
PDF-Batch ─┼─→ n8n ─→ Edge Function (OCR) ─→ Supabase ─→ Dashboard ─→ DATEV-Export
Dashboard ─┘                                    │            (Freigabe)
                                          RLS + GoBD-Trigger
```

**Der Kern, den man verstanden haben muss:** Ab Status `geprueft` ist ein Beleg
**festgeschrieben** (GoBD). Änderungen blockt die Datenbank per Trigger, nicht
die Anwendung. Was einmal freigegeben ist, wird nicht korrigiert, sondern nur
über eine dokumentierte Korrekturfassung ersetzt. Diese eine Regel erklärt die
meisten Eigenheiten des Codes.

---

## Pflichtlektüre, in dieser Reihenfolge

| # | Datei | Warum |
|---|---|---|
| 1 | `CLAUDE.md` | Systemkontext, Arbeitsregeln, Infrastruktur-Koordinaten |
| 2 | `CONVENTIONS.md` | Der Vertrag: Runtime, Gates, Commit-Format, Execution-Isolation |
| 3 | `docs/UEBERGABE.md` | Aktueller Systemstand + offene Punkte |
| 4 | `ARCHITECTURE_DESIGN.md` | ADRs und Leitprinzipien; §9 ist die Doku-Landkarte |
| 5 | `docs/SCHEMA.md` | Datenbank als lesbare Karte (Wahrheit sind die Migrationen) |
| 6 | `SICHERHEIT.md` | Secrets, wo sie liegen, was nie ins Repo darf |
| 7 | `docs/GOBD.md`, `docs/DATEV.md` | Die fachlichen Zwänge hinter dem Code |

`INDEX.md` listet alles Weitere. `CONTEXT.md` klärt das Vokabular — wer
„Beleg", „Mandant" und „Firma" verwechselt, baut an der falschen Stelle.

---

## Arbeitsweise

**Story-getrieben, ohne Ausnahme.** Jede Änderung hängt an einem Linear-Issue
(`BER-XXX`) und braucht ein `specs/BER-XXX.md`. Der Pre-Commit-Hook blockt einen
Commit mit `BER-XXX` in der Nachricht, wenn die Spec fehlt. Einzige Ausnahme:
reine Doku-Commits unter `journal/**` und `docs/**`.

- Commit-Format: `BER-[Nr]: [Was wurde gemacht]`
- Sprache: **Code Englisch, Doku und Commits Deutsch**
- Kein direkter Push auf `main` — Branch → PR → Merge
- DSGVO: keine personenbezogenen Daten in Logs oder Commits

**Reihenfolge bei Schema-Arbeit:** Migration (Schwester-Repo) → App → n8n.
Migrationen werden mit Rollback-Transaktions-Tests belegt, siehe
`specs/migrations/*_trigger_tests.sql` als Muster.

**Nach `apply_migration` immer zwei Dinge:** `supabase_migrations.schema_migrations`
lesen und die Datei auf die dort registrierte Version umbenennen (der Supabase-MCP
vergibt einen eigenen Zeitstempel), und den Security-Advisor laufen lassen.

---

## Quality Gates

| Layer | Was | Wo |
|---|---|---|
| 0 | Pre-Edit-Bodyguard (Secrets, unsichere Muster) | `.claude/hooks/pre-edit-bodyguard.sh` |
| 1 | Spec-Gate, Doc-Version-Sync | `.claude/hooks/` |
| 2 | ESLint + Typecheck + Semgrep, **blockierend** | `.githooks/pre-commit` |
| 3 | ESLint, Typecheck, Semgrep in CI, **blockierend** | `.github/workflows/` |

Die Semgrep-Packs stehen **ausschließlich** in `.semgrep.yml`; Hook und CI lesen
sie von dort. Wer Packs ändert, ändert beide Layer auf einmal — das ist Absicht.

Was **nicht** verdrahtet ist, steht ehrlich in `CONVENTIONS.md §3`. Verlass dich
auf die Tabelle dort, nicht auf Annahmen.

---

## Für den Werkzeugwechsel

Das Projekt ist auf Claude Code eingerichtet (`runtime_target: claude-code` in
`CONVENTIONS.md`), aber nichts davon ist zwingend:

- **Die Gates sind Shell und Python**, kein KI-Werkzeug nötig:
  `.githooks/pre-commit`, `.claude/hooks/*.sh`, `.claude/scripts/schrader_check.py`,
  `scripts/doc-drift-check.sh`. Jede Umgebung kann sie fahren.
- **Die Skills unter `.claude/skills/`** sind Prozessbeschreibungen in Markdown.
  Ein anderes Werkzeug liest sie als Runbook oder ignoriert sie — der Prozess
  steht in `CONVENTIONS.md`, nicht im Skill.
- **`.claude/environment.json`** hält die Projektkonfiguration maschinenlesbar.
  Wer ohne Claude Code arbeitet, liest sie trotzdem: dort steht, welche Werkzeuge
  tatsächlich verfügbar sind.
- **Ein klassisches Team** braucht von alldem nur: `npm ci`, die Hooks, Linear
  und die Pflichtlektüre oben.

---

## Startpunkt für die Umsetzung

1. `docs/UEBERGABE.md` lesen — was ist offen?
2. Linear-Projekt [BelegChat](https://linear.app/berent/project/belegchat-0db7e2580452),
   Issue mit Status *In Progress* oder das oberste im Backlog.
3. `specs/BER-XXX.md` lesen. Fehlt sie, wird sie zuerst geschrieben.
4. Branch, bauen, Gates grün, PR.

Die nächste anstehende Arbeit ist in `specs/BER-122.md` unter „Umsetzungs-Stufen"
beschrieben — eine Kette von vier verketteten Stories mit vollständigen Prompts.

---

## Annahmen, die beim Handoff wichtig sind

- **Ein produktiver Mandant.** Firma 01 ist der Echtbetrieb, Firma 99 die
  Testfirma. Mandantenfähigkeit für mehrere Kunden ist Backlog (BER-132 ff.),
  nicht gebaut. Wer das annimmt, baut an falschen Stellen.
- **Die Datenbank ist die Wahrheit, nicht die App.** RLS und Trigger tragen die
  Isolation und die Unveränderbarkeit. Eine App-seitige Prüfung ist Komfort,
  kein Schutz.
- **Es gibt keine Testsuite.** Verifiziert wird über Rollback-Trigger-Tests auf
  der Datenbank und manuelle E2E-Läufe. Ein Coverage-Gate steht in
  `CONVENTIONS.md`, ist aber nicht implementiert — siehe dort.
- **Produktion ist die einzige Datenbank.** Es gibt keine Staging-Instanz; ein
  Supabase-Branch trägt nicht, weil die `belege`-Tabelle älter ist als die
  Migrationshistorie. Wer testet, testet mit Rollback-Transaktionen oder an
  Firma 99.

---

*BERENT.AI · Beratung + Entwicklung · berent.ai*
