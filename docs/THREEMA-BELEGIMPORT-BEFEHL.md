# Threema-Belegimport-Befehl + lokale Import-Automatik

> Übergabe-Spec (Stand 01.08.2026). Teil 1 (lokale Automatik) ist **umgesetzt**;
> Teil 2 (Threema-Befehl) und Teil 3 (Produkt-Backend) sind **spezifiziert, noch nicht gebaut** —
> gedacht für einen **frischen, fokussierten Chat** (dieser Kontext ist sehr lang).
>
> provenance: classification internal · status draft · source claude

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

## Teil 2 — Threema-Belegimport-Befehl (ZU BAUEN)

**Ziel:** Betreiber schickt dem BelegChat-Threema-Bot eine Textnachricht und stößt den Import
vom Handy an — mit **voller Ergebnis-Rückmeldung** per Threema. Ergänzt den geplanten Job um
einen **On-Demand-Lauf** zwischen den festen Zeiten.

**Betreiber-Festlegungen (31.07./01.08.2026):**
- **Befehlswort:** `Belegimport` (Betreiber-Formulierung „Auslöser Belegimport"; Groß/Klein egal).
  Empfehlung: zusätzlich `Import` als Synonym annehmen. **Vor dem Bau kurz bestätigen.**
- **Berechtigter Absender:** aktuell **`BUMFMZ39`** — aber **nicht hartkodieren**: die zulässige
  Threema-ID soll **im Backend hinterlegbar** sein (Betreiber-Wunsch, „bau das vorbereitend").
- **Rückmeldung:** **volle Ergebnis-Meldung** per Threema (z. B. „12 importiert, 0 Fehler,
  Nummern 01-2026-0033…0044"), nicht nur „angestoßen".

**Design:**
1. **DB-Config (statt Hardcode)** — minimal vorbereitet: Flag pro Mandant/Firma, z. B.
   `mandanten.import_befehl_aktiv boolean default false` (die zulässigen Absender = registrierte
   `threema_sender_id` mit Flag `true`; für Firma 01/BUMFMZ39 auf `true`). Die bestehende
   n8n-Node **„Mandant ermitteln"** löst `threema_sender_id → mandant` bereits auf.
2. **Auftrags-Tabelle** `import_kommandos` (Supabase): `id, mandant_id, angefordert_am,
   status (offen|in_arbeit|erledigt|gemeldet), ergebnis jsonb, erledigt_am`. RLS/Grants für
   `dashboard_service` (Mac-Poller nutzt `DASHBOARD_DB_URL`).
3. **n8n-Zweig im Threema-Workflow** (`MYpHUIHNMuIUR1ic`, Andockpunkt: Switch **„Prüfe
   Nachrichtentyp"** → heute landet Text bei **„Text ignorieren"**): wenn Text ∈ {belegimport,
   import} **und** Absender-Mandant `import_befehl_aktiv` → `INSERT import_kommandos(offen)` +
   Sofort-Reply „Belegimport angestoßen …"; sonst wie bisher ignorieren. **Sorgfältig: Repo-Edit
   + Live-Patch + Read-back**, wie die Revision (siehe [[belegchat-n8n-live-updates]]).
4. **Lokaler Poller** (neuer LaunchAgent, z. B. `de.berent.belegchat.poller`, KeepAlive, alle
   ~20 s): pollt `import_kommandos WHERE status='offen'` → `in_arbeit` → `watch --once` mit
   **strukturierter Zusammenfassung** (dafür `beleg-import.mjs` um einen Summary-Output erweitern:
   Anzahl importiert/Fehler + Belegnummern, z. B. `--once --json`) → schreibt `ergebnis` +
   `status='erledigt'`.
5. **Ergebnis-Rückkanal:** Poller ruft einen kleinen **n8n-Webhook „Import-Ergebnis senden"**
   mit der Zusammenfassung → n8n sendet die Threema-Nachricht (Gateway-Creds liegen serverseitig,
   nicht auf dem Mac) → `status='gemeldet'`. (Alternative: separater n8n-Schedule pollt `erledigt`.)

**Sicherheit:** fixes Befehlswort (kein freier Input → keine Injection), Absender DB-gegated,
nur berechtigte Mandanten. Der Poller führt ausschließlich das feste `watch --once` aus.

---

## Teil 3 — Produkt-Backend (FRISCHER CHAT, später)

Aus der vorbereiteten DB-Config ein echtes Feature machen: Dashboard-Admin zum Verwalten der
berechtigten Threema-IDs / `import_befehl_aktiv` je Mandant; Historie der `import_kommandos`
sichtbar; optional „Import jetzt"-Button im Dashboard. Eigene Story (Linear-Issue anlegen),
gehört nicht in denselben Kontext wie der n8n-/Poller-Bau.

---

## Startpunkt für den frischen Chat

1. `CLAUDE.md` → `docs/UEBERGABE.md` → **dieses Dokument**.
2. Teil 2 bauen: DB-Migration (Flag + `import_kommandos`) · n8n-Zweig (Repo+Live+Read-back) ·
   Poller-LaunchAgent · Summary-Output in der CLI · Ergebnis-Webhook.
3. Befehlswort und Ergebnis-Text-Format mit dem Betreiber kurz bestätigen.
4. Teil 3 als eigene Story terminieren.
