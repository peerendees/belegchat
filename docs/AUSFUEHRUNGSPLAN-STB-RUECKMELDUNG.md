# Ausführungsplan — StB-Rückmeldung 22.07.2026 (Baulauf + Runbook)

> Stand: 23.07.2026, Fassung 2 (nach Betreiber-Dialog) · Für den Bau-Agenten
> (S0–S7) und den Betreiber (M1–M6). Grundlage: Specs BER-116..122 (Fassung
> 23.07.2026), `docs/audits/2026-07-23-strukturpruefung-ausbaustufe.md`,
> Betreiber-Antworten vom 23.07.2026 (Schlüssel 90/80 bestätigt, 1810 = andere
> Karten, 6520-Belege = Fehlkontierungen → Umbuchungsliste im Anschreiben).
>
> provenance: classification internal · status final · source claude

## Grundregeln des Baulaufs

- **Der Betreiber ist anwesend.** Der Lauf startet sofort (kein Nachtfenster);
  die M-Schritte laufen verzahnt: nach S5-Merge kann der Betreiber unmittelbar
  M4/M5 ausführen, während S6 noch baut. Bei Rückfragen: fragen statt raten —
  Antwortet der Betreiber nicht binnen einer angemessenen Wartezeit, gilt die
  jeweilige Abbruchbedingung.
- **Priorität (Betreiber-Vorgabe 23.07.2026):** S1–S5 sind stapelkritisch
  (Fertigstellung + Übermittlung des Korrekturstapels 2024). S6 (BER-118) ist
  beauftragt, aber nachrangig — es blockiert den Stapel nicht. Alles weitere
  (BER-120/122, `docs/FEATURE-WUENSCHE.md`) ist für kommende Releases gemerkt.
- **Strikt seriell** in der Reihenfolge S0 → S7. Kein Schritt beginnt, bevor der
  vorherige abgeschlossen oder sauber abgebrochen ist. Die Stories teilen sich
  Trigger-Funktion und Dateien — Parallelität ist ausgeschlossen (Validierungsbericht).
- **Branch → PR → Merge je Schritt** (nie direkt auf `main`; Commits
  `BER-<Nr>: …` deutsch). Nach grünen Checks selbst mergen; nächster Branch von
  aktualisiertem `main`.
- **Abbruch heißt:** Schritt stoppen, Branch/PR offen lassen mit Kommentar
  `ABBRUCH: <Bedingung>`, die abhängigen Folgeschritte auslassen, unabhängige
  Folgeschritte fortsetzen (Abhängigkeiten je Schritt vermerkt), Abschlussnotiz für
  den Operator schreiben (S7 läuft immer).
- **Erlaubt an Prod:** genau EIN `apply_migration` (S1) + read-only-Verifikation +
  der Trigger-Testlauf, der in einer Transaktion endet und mit ROLLBACK schließt.
  **Verboten an Prod:** jede dauerhafte DML am Bestand (Nacherfassung, Einfrieren,
  Korrekturstapel = Morgen-Runbook), Edge-Function-Deploys, n8n-Änderungen,
  Vercel-Env-Änderungen, Linear-Schreibzugriffe.
- **Keine App-Testdaten in Prod:** Auch über die App-Routen werden nachts KEINE
  Belege/Exporte angelegt (DASHBOARD_DB_URL zeigt auf Prod; das System enthält
  ausschließlich Echtbestand). Routen-Logik wird per Unit-Tests auf den reinen
  Funktionen (Validierung, Auflösung, `datev.ts`) abgesichert; DB-Semantik über
  den Rollback-Testanhang; E2E über die Morgen-Schritte M3/M4.
- Vercel deployt `main` automatisch. Die Schritte sind so geschnitten, dass jeder
  Merge einen lauffähigen Zwischenstand ergibt (neue Spalten sind nullable/Default;
  Alt-Code läuft mit neuem Schema weiter).

---

## S0 — Vorbedingungen (read-only)

1. `git -C belegchat status` und `git -C threema-decrypt status`: sauber, `main`
   aktuell (`git pull`).
2. Supabase-MCP erreichbar: `SELECT 1`.
3. Zustands-Assertionen (alle read-only, alle müssen exakt zutreffen):
   - `SELECT count(*) FROM belege` → **60**; alle `status='exportiert'`.
   - `SELECT count(*) FROM datev_exporte` → **1**; `status='erstellt'`,
     `datei_pfad='EXTF_Buchungsstapel_2024_Jahr.csv'`.
   - `SELECT md5(pg_get_functiondef('public.fn_belege_festschreibung'::regproc))`
     → `4b206ff6f1de5fddb4ca110d4fc8c9eb` (Stand `20260719221107`).
   - `SELECT (SELECT max(updated_at) FROM firmen WHERE firma_nr='01') <
     (SELECT min(created_at) FROM datev_exporte)` → **true** (Erstfassung
     rekonstruierbar, BER-121-Vorbedingung).
   - Spalten `zahlungsweg`/`gegenkonto`/`bu_schluessel`/`dokument_fehlt` existieren
     **nicht** auf `belege` (Migration noch nicht angewendet).
4. `npm install` + `npx tsc --noEmit` + `npx next build` im belegchat-Repo laufen
   fehlerfrei auf `main` (Werkzeuge funktionieren, Basis ist grün).

**Abbruch S0:** Eine Assertion trifft nicht zu → GESAMTLAUF abbrechen (nichts wurde
verändert); Abschlussnotiz mit der abweichenden Assertion. Ausnahme: Sind die
Spalten aus Punkt 3.5 bereits vorhanden UND `steuerschluessel` existiert mit 4
Seeds, gilt S1 als bereits ausgeführt → S1 überspringen, bei S2 fortsetzen.

## S1 — Konsolidierte Migration (Repo threema-decrypt, Commit-Präfix BER-116)

1. Branch `kunkel/ber-116-konsolidierte-migration` in `threema-decrypt`.
2. `specs/migrations/20260723_stb_rueckmeldung_konsolidiert.sql` (belegchat-Repo)
   UNVERÄNDERT kopieren nach
   `threema-decrypt/supabase/migrations/<JJJJMMTThhmmss>_stb_rueckmeldung_konsolidiert.sql`
   (Zeitstempel = aktueller UTC-Zeitpunkt).
3. `apply_migration` (Supabase-MCP, Projekt `xuqefeewzdvjhuquciut`) mit exakt diesem
   Inhalt.
4. Verifikation: die 7 Queries am Ende der Migrationsdatei; erwartete Werte dort.
5. Trigger-Tests: `specs/migrations/20260723_trigger_tests.sql` als EIN
   `execute_sql`-Aufruf. Erfolg = kein Fehler (Skript endet mit ROLLBACK).
   Scheitert der Aufruf am `SET LOCAL ROLE`/GRANT (Meldung „permission denied to
   set role"), gilt NUR T10 als nicht ausführbar: einmal wiederholen ohne den
   Abschnitt T10 (Block zwischen `-- T10:`-Kommentar und `RESET ROLE;` entfernen)
   und T10 als „manuell am Morgen" in der Abschlussnotiz vermerken — alle übrigen
   Tests müssen bestehen.
6. Commit `BER-116: Konsolidierte DB-Migration StB-Rückmeldung (Zahlungsweg,
   Steuerschlüssel, Nachreichung, Export-Fassungen)` → PR → Merge.

**Abbruch S1:** `apply_migration` wirft Fehler (Transaktion = nichts angewendet)
oder eine Verifikations-Query weicht ab oder ein Trigger-Test schlägt fehl →
GESAMTLAUF abbrechen (S2–S6 hängen alle an S1). Kein zweiter apply-Versuch ohne
Analyse in der Abschlussnotiz.

## S2 — BER-116 App-Schicht (Repo belegchat)

Branch `kunkel/ber-116-zahlungsweg-app`, Umfang exakt `specs/BER-116.md`.
Gates: ESLint, Semgrep, `tsc --noEmit`, `next build`, Pre-Commit-Hooks des Repos.
PR → Checks grün → Merge.

**Abbruch S2:** Gate rot und nicht durch offensichtlichen eigenen Fehler behebbar
(max. 3 Fix-Iterationen) → BER-116 abbrechen; dann auch S3, S4, S5 abbrechen
(Export-/Freigabe-Kette hängt zusammen); S6 (BER-118) DARF trotzdem laufen —
einziger Berührungspunkt ist `datev.ts`/Export-SELECTs, dann auf Basis `main`.

## S3 — BER-117 App-Schicht

Branch `kunkel/ber-117-steuerschluessel-app`, Umfang exakt `specs/BER-117.md`
(Schlüssel-Seeds `90`/`80` sind kanzleibestätigt — keine Wartezeit auf Antworten).
Voraussetzung: S2 gemerged. Gates wie S2.

**Abbruch S3:** wie S2 → S4/S5 abbrechen; S6 darf laufen.

## S4 — BER-121 App-Schicht (stapelkritisch: vor der Nacherfassung!)

Branch `kunkel/ber-121-export-fassungen`, Umfang exakt `specs/BER-121.md`.
Voraussetzung: S2+S3 gemerged (Export-Code-Basis).

**Abbruch S4:** wie S2 → S5 abbrechen (Commit-Guard fehlt) UND in der
Abschlussnotiz WARNUNG: M4/M5 dürfen NICHT ausgeführt werden, solange BER-121
fehlt (sonst stille Ersetzung der Erstfassung). S6 darf laufen.

## S5 — BER-119 App-Schicht

Branch `kunkel/ber-119-nacherfassung`, Umfang exakt `specs/BER-119.md`.
Voraussetzung: S2, S3, S4 gemerged. KEINE Ausführung der Nacherfassung durch den
Agenten — nach dem Merge den Betreiber benachrichtigen: M4/M5 sind frei.

**Abbruch S5:** wie S2; M4/M5 entfallen; S6 darf laufen.

## S6 — BER-118 App-Schicht (StB-Punkt 2; nachrangig, gleiche Session)

Branch `kunkel/ber-118-beleg-ohne-dokument`, Umfang exakt `specs/BER-118.md`
(inkl. `docs/verfahrensdoku/AENDERUNGEN-v1.1.md`, Doku, `specs/BER-113.md`
superseded). Voraussetzung: S3 gemerged (bzw. S2/S3 abgebrochen → auf `main`).
Läuft NACH S5, damit der Stapelpfad zuerst fertig wird (Betreiber-Priorität).

**Abbruch S6:** wie S2; unabhängig — M4/M5 bleiben unberührt; M1 entfällt.

## S7 — Abschluss (läuft immer)

1. Doku-Konsistenz: `docs/DATEV.md`, `docs/GOBD.md`, `docs/UEBERGABE.md`
   (Feature-Stand + „Offene Punkte"), `docs/SCHEMA.md` — Stand der tatsächlich
   gemergten Schritte; `INDEX.md`/`ARCHITECTURE_DESIGN.md §9` für alle neuen
   Dateien vervollständigen (Grundeinträge sind seit der Konzeption vorhanden).
   `specs/TEMPLATE.md`: DoD-Zeile „Schema-Änderungen in docs/SCHEMA.md
   nachgezogen" ergänzen. Sammel-Branch `kunkel/ber-116-doku-baulauf`, ein PR.
2. Abschlussnotiz `journal/daily/2026-07-23-baulauf.md`: je Schritt
   gemerged/abgebrochen (+PR-Links), ausgelassene Tests, Hinweise zu M1–M6.
3. KEINE Linear-Änderungen (Betreiber setzt Status, M6).

---

## Runbook Betreiber (M-Schritte; Nummern stabil, Reihenfolge: M4 → M5 → M6 → M1 → M3 → M2)

| # | Schritt | Gate davor |
|---|---|---|
| **M4** | **Nacherfassung** `/nacherfassung`: 60 Belege (Zahlungsweg per Tasten 1/2/3; 53 mit Schlüssel-Vorschlag `90`/`80`, 7 ohne), Zusammenfassung sichten, EIN Batch-Commit — friert die Erstfassung automatisch ein | S5 gemerged + Kurz-Smoke: Login ok, `/nacherfassung` zeigt „60 offen · 53 mit Schlüssel-Vorschlag", `/export` zeigt Fassungs-Spalte |
| **M5** | **Korrekturstapel** `EXTF_Buchungsstapel_2024_Jahr_K2.csv` erzeugen und mit dem **Versandteil aus `docs/OFFENE-FRAGEN-STB.md`** an die Kanzlei senden (enthält: Bestätigungsbitte „nur K2 importieren, Erstfassung verwerfen", Umbuchungsliste der 6 Fehlkontierungen, Automatik-Prüfpunkt). Keine Wartepflicht auf eine Vorab-Antwort — die Anweisung steht im Anschreiben | M4 |
| **M6** | Linear-Status BER-116/117/119/121 setzen (+118 nach S6); Kanzlei-Antworten später im Log von `docs/OFFENE-FRAGEN-STB.md` dokumentieren und Konfiguration nachziehen | M5 |
| **M1** | Vercel-Env: `DECRYPT_API_TOKEN` setzen (Wert = bestehendes Edge-Secret); `.env.local` ergänzen; Redeploy abwarten | S6 gemerged |
| **M3** | Passkey-E2E des BER-118-Pfads: manueller Beleg ohne Dokument → Freigabe (Zahlungsweg + Schlüssel) → Dokument nachreichen — **auf der Testfirma 99** | M1 |
| **M2** | n8n „Mandant ermitteln" (beide Workflows): bei >1 Treffer Fehlerzweig statt erster Zeile (Strukturprüfung §1.1); Live-Patch + Repo-Export. Betreiber-Entscheid 23.07.: NACH dem K2-Versand | M5 |

**Rotes Gate für M4/M5:** Wenn S4 (BER-121) nicht gemerged ist, M4/M5 NICHT
ausführen — der alte Re-Download würde die ausgelieferte Erstfassung still
ersetzen.
