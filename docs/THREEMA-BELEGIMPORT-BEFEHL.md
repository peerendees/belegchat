# Threema-Belegimport-Befehl + lokale Import-Automatik

> Stand 01.08.2026. Teil 1 (lokale Automatik) und **Teil 2 (Threema-Befehl, BER-124) sind
> umgesetzt und live**; Teil 3 (Produkt-Backend) ist spezifiziert und wartet auf eine
> eigene Story.
>
> provenance: classification internal · status active · source claude

---

## Teil 1 — Lokale Import-Automatik (UMGESETZT)

Belege liegen lokal in iCloud (`…/Papierlos/Steuerberater/Belege/Input`); Cloud (Vercel/n8n)
kommt nicht heran → der Auslöser läuft **lokal auf dem Mac**. Zwei Wege, beide über
`scripts/beleg-import/beleg-import.mjs`:

1. **Doppelklick-Launcher** — `scripts/beleg-import/belege-importieren.command` (Kopie auf dem
   Desktop). Ruft `watch --once` (Input einmal abarbeiten → beenden). PR #50.
2. **Geplanter Job 3×/Tag** — LaunchAgent `de.berent.belegchat.import`
   (`~/Library/LaunchAgents/de.berent.belegchat.import.plist`), `StartCalendarInterval`
   **11:50 / 17:50 / 21:50**, führt `watch --once` aus. Kein Dauerprozess (bewusst: Betreiber
   wollte genau drei Läufe). Bei Ruhezustand holt launchd einen verpassten Lauf beim Aufwachen
   einmalig nach. Log: `~/Library/Logs/belegchat-import.log`.

**Steuerung:**
```
launchctl list | grep belegchat                                   # Status (PID '-' = wartet auf Uhrzeit)
launchctl kickstart -k gui/$(id -u)/de.berent.belegchat.import    # sofort jetzt laufen lassen
launchctl bootout   gui/$(id -u)/de.berent.belegchat.import       # deaktivieren
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/de.berent.belegchat.import.plist  # aktivieren
```

Terminologie: technisch ein **LaunchAgent** (Login-Sitzung), kein System-*Daemon*; da nur zeit-
gesteuert, am treffendsten „geplanter Job".

---

## Teil 2 — Threema-Belegimport-Befehl (UMGESETZT, BER-124)

**Ziel:** Betreiber schickt dem BelegChat-Threema-Bot eine Textnachricht und stößt den Import
vom Handy an — mit **voller Ergebnis-Rückmeldung** per Threema. Ergänzt den geplanten Job um
einen **On-Demand-Lauf** zwischen den festen Zeiten.

**Betreiber-Festlegungen (31.07./01.08.2026):**
- **Befehlswort:** ausschließlich **`Belegimport`** (Groß/Klein egal, getrimmt). `Import` wurde
  bewusst **nicht** als Synonym belegt — der Begriff bleibt für spätere Import-Varianten frei.
- **Berechtigter Absender:** nicht hartkodiert, sondern `mandanten.import_befehl_aktiv`.
  Für Firma 01 (`BUMFMZ39`) auf `true`, Testfirma 99 auf `false`.
- **Rückmeldung:** volle Ergebnis-Meldung — Zahlen, Belegnummern **und Dateinamen der Fehler**.

```
Threema „Belegimport"  ──►  n8n: Route belegimport  ──►  INSERT import_kommandos (offen)
                                       │                         │
                            Sofort-Reply „angestoßen"            │  Mac-Poller (20 s)
                                                                 ▼
                            Threema ◄── n8n „Import-Ergebnis" ◄── watch --once --json
                                        (gemeldet)      (erledigt)
```

### Was wo liegt

| Baustein | Ort |
|----------|-----|
| Migration (Flag + `import_kommandos`) | `threema-decrypt/supabase/migrations/20260801092326_threema_belegimport_befehl.sql` |
| n8n-Befehlszweig | Workflow `MYpHUIHNMuIUR1ic`, Nodes „Import-Kommando anlegen" + „Import-Bestätigung senden" |
| n8n-Ergebnis-Webhook | Workflow **`6GDS7NzfiTRavKjr`** „BelegChat Import-Ergebnis", Pfad `belegchat-import-ergebnis` |
| Poller | `scripts/beleg-import/import-poller.mjs` |
| LaunchAgent | `scripts/beleg-import/de.berent.belegchat.poller.plist` |
| Bilanz-Ausgabe der CLI | `beleg-import.mjs watch --once --json` |

### Erkennung im Workflow

Der Andockpunkt ist **nicht** „Prüfe Nachrichtentyp" (das trennt nur leere von befüllten
Nachrichten), sondern die Code-Node **„Mehrseiten Routing"** und der Switch **„Mehrseiten
Router"**. Dort entstand die neue Route `belegimport` (Ausgang 5; der Fallback rutschte
dadurch auf Ausgang 6):

```js
} else if (inhalt.isText) {
  route = (befehl === 'belegimport' && inhalt.import_befehl_aktiv)
    ? 'belegimport'
    : 'text_ohne_pending';
}
```

Zwei bewusste Einschränkungen:
- Die Route greift nur, wenn **kein Mehrseiten-Vorgang offen** ist. Wer gerade Seiten sammelt
  und „Belegimport" tippt, bekommt wie bisher die Rückfrage — ein laufender Beleg wird nicht gekapert.
- Ohne `import_befehl_aktiv` landet der Text im alten Zweig „Text ignorieren" (freundlicher
  Hinweis, Foto zu senden). Der Absender erfährt nicht, dass es einen Befehl gibt.

### Ergebnistext

Formatiert wird im Poller (`meldungsText`), nicht in n8n — so ist der Wortlaut versioniert
und ohne Workflow-Änderung anpassbar. n8n sendet nur, was ankommt.

| Fall | Nachricht |
|------|-----------|
| Erfolg | `✅ Belegimport fertig: 12 importiert. Nummern 01-2026-0033…0044` |
| Mit Fehlern | zusätzlich `⚠️`, `Fehler: rechnung.pdf — HTTP 500: …` (max. 5, dann „… und N weitere") |
| Duplikate | `Duplikate: alt.pdf` |
| Nichts zu tun | `ℹ️ Belegimport: keine neuen Dateien im Eingang.` |
| Import läuft schon | `⏳ Es läuft gerade schon ein Import…` |
| Lauf abgebrochen | `⚠️ … Bitte „Belegimport" noch einmal senden.` |

Belegnummern werden zu `0033…0044` zusammengezogen, wenn die Folge lückenlos ist, sonst
aufgezählt (ab 9 Nummern gekappt).

### Betrieb

```bash
launchctl list | grep belegchat            # poller mit PID = läuft, import mit '-' = wartet auf Uhrzeit
tail -f ~/Library/Logs/belegchat-poller.log
launchctl bootout   gui/$(id -u)/de.berent.belegchat.poller   # aus
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/de.berent.belegchat.poller.plist  # an
```

Hängengebliebene Aufträge (`in_arbeit` nach Absturz/Neustart) räumt der Poller **beim Start**
auf und meldet sie als abgebrochen — der einzige Bearbeiter ist er selbst, also kann `in_arbeit`
beim Start nichts anderes bedeuten.

**Sicherheit:** festes Befehlswort (kein freier Input → keine Injection), Absender per DB-Flag
gegated, Ergebnis-Webhook mit `IMPORT_API_TOKEN` (401/400 geprüft). Der Poller führt
ausschließlich das feste `watch --once` aus — der Befehl trägt keine Parameter, die irgendwo
landen könnten. Threema-Gateway-Zugangsdaten bleiben auf dem n8n-Server; der Mac kennt sie nicht.
Nur ein Import gleichzeitig: `beleg-import.mjs` hält eine prozessübergreifende Sperre, damit
geplanter Job und Threema-Lauf sich nicht überschneiden (BER-111-Falle).

---

## Teil 3 — Produkt-Backend ([BER-125](https://linear.app/berent/issue/BER-125), offen)

Aus der vorbereiteten DB-Config ein echtes Feature machen: Dashboard-Admin zum Verwalten der
berechtigten Threema-IDs / `import_befehl_aktiv` je Mandant; Historie der `import_kommandos`
sichtbar; optional „Import jetzt"-Button im Dashboard. Die RLS-Policies decken das bereits ab —
für den Button ist keine Migration nötig, er legt dieselbe Zeile an wie der Threema-Befehl.

---

## Prüfstand 01.08.2026

| Geprüft | Ergebnis |
|---------|----------|
| Migration auf Prod | angewendet; Firma 01 `true`, Testfirma 99 `false` |
| n8n Live vs. Repo-Export | bitgleich nach Read-back; Router-Ausgänge 0–6 wie vorgesehen |
| Ergebnis-Webhook | 401 bei falschem Token, 400 ohne Felder, 200 + Threema-Zustellung |
| Durchstich Poller | Auftrag → `gemeldet` in 18 s, Threema-Meldung zugestellt |
| Import-Sperre | verwaiste Sperre übernommen, parallele Läufe serialisiert |
| Befehl per Threema | **abgenommen 01.08. 17:20** — Befehl vom Handy → Sofort-Reply → Import → Ergebnismeldung in 34 s, ohne Eingriff |

Ablauf der Abnahme (UTC): 15:19:56 legt n8n den Auftrag an · 15:19:59/15:20:00 Eingangs-Workflow
`success` (Sofort-Reply) · 15:20:09 Poller übernimmt · 15:20:14 `erledigt` (Eingang leer, 0/0) ·
15:20:26 Ergebnis-Workflow `success` · 15:20:32 `gemeldet`.

**Betriebsbeobachtung:** Der Mac verlor am 01.08. mehrfach kurz die Verbindung zum Supabase-Pooler
(12:37, 13:20–13:47, 14:51–14:55 UTC — `ENOTFOUND`, `EHOSTUNREACH`, `CONNECT_TIMEOUT`). Der Poller
protokolliert solche Runden und macht weiter; ein Befehl während eines Aussetzers wird bis zu 20 s
später abgeholt. Häufen sich die Ausfälle, lohnt ein Blick auf Schlafverhalten und WLAN des Macs.
