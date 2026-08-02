# 02.08.2026 — n8n-Sicherung instand gesetzt, zwei Belegprüfungs-Lücken geschlossen

> Drei Stränge an einem Tag: die seit Monaten abgeschaltete n8n-Sicherung wieder in Betrieb,
> zwei Befunde aus dem laufenden Erfassen von Belegen, und eine Zugangsdaten-Altlast entschärft.
> Alle Ergebnisse liegen in BER-127 bis BER-130 und in der Verfahrensdoku (Ä-7, Ä-8); diese Notiz
> hält fest, was dazwischen passiert ist — besonders das, was schiefging.

## Ergebnis

| Strang | Ergebnis | Referenz |
|---|---|---|
| n8n-Backup + GitHub-Sync | instand gesetzt, **beide aktiv** seit 13:06 | [BER-128](https://linear.app/berent/issue/BER-128) |
| Gateway-Secret im Klartext | Node auf `$env` umgestellt, Rotation offen (Betreiber) | [BER-127](https://linear.app/berent/issue/BER-127) |
| Freigabe ohne Belegdatum | gesperrt, Server + Oberfläche | [BER-129](https://linear.app/berent/issue/BER-129) |
| Verwerfen eines Entwurfs | wird protokolliert; Nummernvergabe entschieden (Variante B) | [BER-130](https://linear.app/berent/issue/BER-130), Ä-8 |
| `.env`-Sicherung im n8n-Repo | ausgelagert, `.gitignore` gehärtet, **keine Rotation nötig** | n8n-workflows #26 |

## Das Muster des Tages: eine Information an zwei Stellen

Dreimal derselbe Fehlertyp, in drei verschiedenen Systemen — und zweimal mit Schaden:

1. **Workflow-`id`.** Der Sync liest die Ziel-ID *aus der Datei*. Mein Export des neuen
   Ergebnis-Workflows war gefiltert und trug sie nicht — also legte der Sync bei jedem Push
   einen neuen Workflow an statt zu aktualisieren. Zwei inaktive Doppelgänger auf demselben
   Webhook-Pfad, beide inzwischen gelöscht.
2. **Dateinamen-Regel.** Sie stand im Backup **zweimal**: in „Workflow extrahieren" und in
   „Veraltete Dateien finden". Ich härtete die eine, die andere blieb alt — der Cleanup verglich
   gegen den alten Namen und löschte drei Dateien, die der Backup Sekunden vorher geschrieben
   hatte.
3. **„16 Werte"** in `SCHEMA.md` für `audit_log.aktion`. Falsch seit dem 23.07., unbemerkt.
   Ein Zähler, der bei jeder Erweiterung still veraltet.

Konsequenz, die ich mitnehme: **vor dem Ändern einer Regel nach weiteren Verwendungen suchen.**
Bei (2) hätte ein `grep` nach `safeName` vor dem Patch gereicht — ich habe ihn erst danach
gemacht. Und wo eine Zahl eine Liste beschreibt, gehört die Liste als Wahrheit hin, nicht die Zahl.

## Was ich falsch gemacht habe

**Der Bereichs-Diff hat mich getäuscht.** Nach dem Cleanup-Zwischenfall prüfte ich mit
`git diff A..B` und sah drei Ordner als „nie beschrieben" — tatsächlich waren sie beschrieben
und wieder geleert worden. Ein Bereichs-Diff verschweigt Dateien, die im selben Bereich angelegt
und gelöscht wurden. Richtig ist `git log --name-status`. Diese Fehldeutung hat eine Runde
gekostet und mich zunächst die falsche Ursache vermuten lassen.

**Ein Wartekriterium war zu eng.** Beim zweiten Kontrolllauf verglich ich nur gegen *eine*
bekannte Ausführungs-ID — im Fenster davor war aber schon eine zweite gelaufen. Der Beobachter
hielt sie für den neuen Lauf und schaltete ab, bevor der Test überhaupt startete. Seitdem
vergleiche ich gegen den Höchstwert und warte zusätzlich auf `stoppedAt`.

Beides sind Prüf-, keine Bau-Fehler — aber sie haben mich zweimal an der Ursache vorbeidenken
lassen, und beim ersten Mal habe ich deshalb an Live-Daten geraten statt gemessen.

## Drei Entscheidungen, die ich bewusst nicht „sauber" gelöst habe

**Der Deaktivieren-Zweig im Sync ist stillgelegt, nicht repariert.** Er schickt
`{"active": false}` an jeden aktualisierten Workflow, der vorher aktiv war. Gelaufen ist er nie,
weil er eine unzulässige HTTP-Methode nutzt — deshalb endete jeder betroffene Sync-Lauf mit
*Method not allowed*. **Hätte jemand nur die Methode „repariert", würde seither jeder Merge den
zugehörigen Live-Workflow abschalten**, auch den Threema-Belegeingang. Ein `PUT` ändert den
Aktiv-Zustand ohnehin nicht; es gibt nichts wiederherzustellen.

**Der Cleanup-Zweig im Backup ist abgeschaltet, nicht repariert.** Auch nach der Vereinheitlichung
der Dateinamen-Regel markierte er alle frisch erstellten Dateien: `.first()` ignoriert die
Item-Zuordnung und liefert in jedem Durchlauf denselben Namen. Sauber wäre, die Zuordnung
aufzulösen — der Zweig hängt aber an einem Listing-Node mit mehreren Items je Ordner, das gehört
entworfen und an Testdaten geprüft. Ich hatte an dem Punkt zweimal am Live-Bestand danebengelegen.
Abwägung: Nutzen des Zweigs ist Ordnung, Schaden ist Datenverlust. Eine liegengebliebene Datei
nach einem Rename ist billiger.

**Belegnummern: Variante B, ohne Codeänderung.** Die Nummer eines verworfenen Entwurfs darf
erneut vergeben werden und darf ebenso als Lücke bleiben. Nicht weil das Verhalten deterministisch
wäre — es hängt an der Reihenfolge —, sondern weil **beide Fälle seit heute im Protokoll erklärt
sind**: `erstellt` → `entwurf_verworfen` (→ `erstellt`). Nachvollziehbar ist der Vorgang, nicht die
Nummer. Ohne den Audit-Eintrag wäre B schwach gewesen; mit ihm trägt es. Verfahrensdoku Ä-8.

## Beruhigend

- **Kein Datenverlust.** Die drei gelöschten Sicherungsdateien waren jederzeit aus n8n
  rekonstruierbar, und der Wiederherstellungslauf hat sie zurückgeschrieben (Lauf 14188:
  0 Fehler, 0 Löschungen, alle Ordner gefüllt).
- **Keine Rotation nötig** für den `N8N_API_KEY`: weder er noch die Werte der aktiven `.env`
  stehen in der Historie des Repos — getrackt war dort immer nur `.env.example`. Die Sicherung
  war eine *drohende*, keine eingetretene Preisgabe. Anders beim Threema-Gateway-Secret
  (BER-127), das tatsächlich in der Historie steht.
- **Der Belegbestand war nie betroffen.** `01-2026-0044` war der einzige Beleg ohne Datum und
  wurde als Entwurf verworfen, bevor er irgendwo ankam.

## Offen

- [BER-127](https://linear.app/berent/issue/BER-127) Rotation des \*BERENT1-Gateway-Secrets — Betreiber-Sache, kein Zeitdruck
- [BER-130](https://linear.app/berent/issue/BER-130) Lückenübersicht zum Jahresexport — reine Bequemlichkeit für die Kanzlei
- Cleanup-Zweig im Backup: Wiederbelebung, wenn jemand die Item-Zuordnung sauber entwirft
- Beim Steuerberater: Bestätigung des K2-Stapels, danach 2024-Export auf `uebertragen`
