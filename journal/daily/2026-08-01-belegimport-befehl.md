# 01.08.2026 — Threema-Befehl „Belegimport" (BER-124)

> Teil 2 der Übergabe-Spec `docs/THREEMA-BELEGIMPORT-BEFEHL.md` gebaut und live genommen.
> Migration und beide n8n-Workflows sind auf Prod angewendet, drei PRs versionieren den Stand nach.

## Ergebnis

| Baustein | Stand | PR |
|---|---|---|
| Migration (`import_befehl_aktiv`, `import_kommandos`) | **auf Prod angewendet** | threema-decrypt #29 |
| n8n-Befehlszweig `MYpHUIHNMuIUR1ic` | **live gepatcht**, Read-back bitgleich | n8n-workflows #24 |
| n8n-Ergebnis-Workflow `6GDS7NzfiTRavKjr` | **live + aktiv** | n8n-workflows #24 |
| Poller + LaunchAgent + CLI-Bilanz + Import-Sperre | gebaut, Gate grün | belegchat #53 |
| Auslösung vom Handy | **offen** — braucht eine echte Threema-Nachricht | — |

## Zwei Abweichungen von der Spec

Die Spec nannte als Andockpunkt den Switch „Prüfe Nachrichtentyp" → „Text ignorieren". Real
trennt dieser Switch nur leere von befüllten Nachrichten; einsortiert wird Text erst in
**„Mehrseiten Routing"** (Code) und **„Mehrseiten Router"** (Switch, Ausgang 3
`text_ohne_pending`). Dort ist die neue Route entstanden. Ebenso heißt die Spalte
`mandanten.threema_id`, nicht `threema_sender_id`. Beides beim Sichten des Live-Exports
bzw. des Schemas gefunden — die Spec entstand offenbar aus dem Gedächtnis.

**Konsequenz für künftige Specs:** Node- und Spaltennamen aus dem Live-Export bzw. dem
Schema zitieren, nicht aus dem Gedächtnis. Ein falscher Andockpunkt kostet nichts, wenn er
auffällt — aber er lädt dazu ein, den Zweig an der falschen Stelle einzuhängen.

## Nicht geplant, aber nötig: prozessübergreifende Import-Sperre

Mit dem Threema-Befehl gibt es **drei** Auslöser für denselben Import: Doppelklick-Launcher,
geplanter Job (11:50/17:50/21:50) und der Befehl. Der Scan-Lock aus BER-111 schützt nur
*innerhalb* eines Prozesses — zwei gleichzeitig gestartete Läufe wären in genau dieselbe Falle
gelaufen, die BER-111 behoben hat (Mistral-Rate-Limit, Kollision der MAX-basierten
Belegnummer). Deshalb hält `watch` jetzt eine PID-basierte Sperre in `$TMPDIR`; verwaiste
Sperren werden übernommen, ein zweiter Lauf wartet bis zu 5 Minuten und meldet sich sonst
als `gesperrt`.

Das ist der Befund, der ohne den Bau nicht aufgefallen wäre: die Automatik von Teil 1 war
für **einen** Auslöser entworfen.

## Geprüft

- Migration auf Prod, Firma 01 `true` / Testfirma 99 `false`
- n8n Live vs. Repo-Export nach dem PUT bitgleich; Router-Ausgänge 0–6 wie vorgesehen
- Ergebnis-Webhook: 401 bei falschem Token, 400 ohne Felder, 200 + Threema-Zustellung
- Durchstich: Auftrag in der DB → `gemeldet` in 18 s, Meldung kam an
- Sperre: verwaiste Sperre übernommen, parallele Läufe serialisiert, Sperrdatei aufgeräumt
- Routing-Logik gegen den **Live-Code** getestet, 12 Fälle (Groß/Klein, Leerzeichen,
  „Import" allein, „Belegimport bitte", nicht freigeschalteter Mandant, offener
  Mehrseiten-Vorgang, Bildpfade) — alle wie erwartet
- Gates: ESLint + Typecheck + Semgrep grün ohne `--no-verify`

## Nebenbefund

Im Repo `n8n-workflows` liegt die ungetrackte Datei `.env.bak-vor-quoting` (28.07.), die von
`.gitignore` **nicht** erfasst ist — ein `git add -A` würde sie mit Zugangsdaten committen.
Bewusst nicht mitcommittet, als eigene Aufgabe notiert.

## Offen

Ein `Belegimport` vom Handy senden. Erwartet: Sofort-Reply „angestoßen", dann bei leerem
Eingang „ℹ️ Belegimport: keine neuen Dateien im Eingang." Danach BER-124 auf Done.
