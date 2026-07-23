# Sicherheit & Secret-Remediation — BelegChat

> Diese Datei dokumentiert die durchgeführten Härtungsmaßnahmen und die noch von dir
> manuell auszuführenden Schritte. Reihenfolge in Abschnitt 1 unbedingt einhalten.

---

## 0. Status Secret-Rotation (geprüft 2026-07-12, Phase 4 / BER-96-Session)

| Punkt | Status |
|-------|--------|
| `n8n-workflows` privat | ✅ verifiziert (`visibility: private`) |
| Alt-Secrets in Git-Historie | ⚠️ weiterhin vorhanden (49/12/5 Commits) — durch privates Repo entschärft; `git filter-repo` optional (Achtung: Force-Push bricht lokale Klone, es existieren mehrere Arbeitskopien) |
| Threema API-Secrets (*BERENT1/2*) | ❓ **manuell verifizieren:** wurden sie nach dem Leak neu erzeugt? (Gateway-Konsole) |
| Threema Private Key | ⚠️ nicht rotierbar — bei Bedarf neue Gateway-ID; Risiko begrenzt, solange Repo privat bleibt |
| Supabase Service-/Anon-Key | ❓ **manuell verifizieren:** Dashboard → Settings → API (bei Rotation: n8n-Server-`.env` + Edge Secrets nachziehen) |
| Mistral-API-Key | ❓ manuell prüfen/rotieren (Mistral-Konsole) |
| RLS | ✅ aktiv auf allen Belegtabellen; Dashboard läuft **ohne** Service-Key über Rolle `dashboard_service` (ADR-05) |
| Neue Secrets seit Phase 2/3 | `IMPORT_API_TOKEN` (n8n-`.env` + `belegchat/.env.local`) · `DASHBOARD_DB_URL`, `AUTH_SESSION_SECRET` (`.env.local` + Vercel) · `N8N_API_KEY` (`n8n-workflows/.env`) — alle gitignored, Vercel-Env verschlüsselt |
| App-Audit | `npm audit`: keine kritischen/hohen Findings (Stand 2026-07-12) |

**Abschnitte 1–4 unten beschreiben die ursprüngliche Remediation (März/Juli 2026) und bleiben als Referenz stehen; Punkt „App-Funktionalität" aus Abschnitt 4 ist durch Phase 3 (Dashboard) überholt.**

---

## 1. SOFORT: Kompromittierte Secrets rotieren

Folgende Secrets lagen im Klartext im n8n-Workflow-Export und wurden nach
`github.com/peerendees/n8n-workflows` (öffentlich erreichbar) gepusht. Sie gelten als
**kompromittiert** und müssen als Erstes neu erzeugt werden — das Entfernen aus dem Code
allein reicht nicht, da sie in der Git-Historie und ggf. in Klonen/Caches weiterexistieren.

Reihenfolge:

1. **Repo privat schalten** (kauft Zeit, ersetzt aber keine Rotation)
   - `github.com/peerendees/n8n-workflows` → Settings → Danger Zone → *Change visibility* → Private
   - Gleiches für alle Repos prüfen, die den Workflow-Export enthalten könnten.

2. **Supabase-Keys rotieren**
   - Supabase Dashboard → Project `xuqefeewzdvjhuquciut` → Settings → API
   - Service-Role-Key und Anon-Key neu erzeugen (JWT-Secret rotieren).
   - Achtung: Der Service-Role-Key umgeht **alle** RLS-Policies. Prüfe zusätzlich, ob
     RLS auf `belege`, `mandanten` etc. überhaupt aktiv ist.

3. **Threema-Gateway absichern**
   - **API-Secret neu generieren** (Gateway-Konsole → API-Secret). Das schließt den
     Missbrauch über die API (Nachrichten senden, Blobs herunterladen). Geht sofort.
   - **Private Key lässt sich NICHT rotieren:** Eine Gateway-ID ist dauerhaft an ihren
     Public Key gebunden. Der geleakte Private Key `vZJkgU6...` kann nicht ersetzt werden.
     Für volle Vertraulichkeit müsste eine **neue Gateway-ID** (neues Schlüsselpaar)
     beantragt werden und der Kanal darauf umziehen. Abwägen, ob über den alten Kanal
     bereits echte Kundenbelege liefen — wenn nein (Beta), ist das Risiko begrenzt.

4. **Mistral-API-Key rotieren** (lag als n8n-Credential vor, zur Sicherheit trotzdem prüfen).

5. **Git-Historie bereinigen** (nach der Rotation, nicht davor):
   ```bash
   # Beispiel mit git-filter-repo (empfohlen)
   cd n8n-workflows
   git filter-repo --replace-text <(cat <<'EOF'
   18DOvPKBV7ize3Nh==>REDACTED
   2pLgi4h6RWJWr6AD==>REDACTED
   vZJkgU6zz4ZXUz1X3Y4Nhinrm/NI8xfsvlZy5AMu1TQ===>REDACTED
   EOF
   )
   # danach: git push --force (mit Bedacht, Team informieren)
   ```
   Auch die Supabase-JWTs (`eyJhbGci...`) und die Webhook-URL in die Ersetzungsliste
   aufnehmen. Alternativ BFG Repo-Cleaner.

---

## 2. Bereits umgesetzte Code-Maßnahmen

### n8n-Workflow (`n8n-workflows/.../BelegChat mit Threema Beleg-Eingang.json`)
- **Secrets entfernt:** alle hartkodierten Werte im `Config`-Node durch `$env`-Referenzen
  ersetzt (siehe Variablenliste unten).
- **Signaturprüfung:** neuer Code-Node „Signatur prüfen" direkt nach dem Webhook.
  Verifiziert die HMAC-SHA256-Signatur (`mac`) des Threema-Callbacks in Konstantzeit und
  weist gefälschte Anfragen ab.
- **Mandanten-Guard:** „Prüfe Inhalt" bricht ab, wenn keine aktive `mandant_id` für die
  Absender-Threema-ID gefunden wird (Mandantentrennung, keine „herrenlosen" Belege).
- **Fehlerpfad verkabelt:** kritische Nodes (Blob-Download, Entschlüsselung, OCR,
  KI-Kontierung, Supabase) laufen bei Fehler auf „Fehler melden" (Nutzer bekommt eine
  Rückmeldung statt stillem Abbruch).
- **Null-sichere Bestätigung:** kein Absturz mehr bei fehlendem Betrag/Datum.

> WICHTIG: Der Workflow ist ein Auto-Backup-**Export** aus der laufenden n8n-Instanz.
> Diese Datei-Änderungen wirken erst, wenn du den Workflow **in n8n neu importierst**
> und dort die Umgebungsvariablen setzt. Bitte danach einmal einen Testbeleg schicken.

### threema-decrypt (`threema-decrypt/api/decrypt.js`)
- **Bearer-Token-Pflicht:** ohne gültiges `DECRYPT_API_TOKEN` → `401`. Kein offenes
  Entschlüsselungs-Orakel mehr.
- **CORS eingeschränkt:** kein `Access-Control-Allow-Origin: *` mehr; nur gesetzt, wenn
  `ALLOWED_ORIGIN` konfiguriert ist.
- **Buffer-Fix:** `String.fromCharCode.apply` durch `Buffer` ersetzt → kein `RangeError`
  bei größeren Belegen.
- `.gitignore` + `.env.example` ergänzt.

### App (`belegchat/`)
- `next` auf `15.5.20` gehoben (schließt die kritische RCE-/SSRF-/Cache-Advisory-Reihe).
- Ungenutzte Laufzeit-Pakete entfernt (`@notionhq/client`, `tesseract.js`).
- `shadcn-ui` von `dependencies` nach `devDependencies` verschoben.
- Paketname `belegarchivator` → `belegchat`.
- `.env.example` ergänzt, `.gitignore` behält `.env.example` bei.
- `npm audit`: von 10 (1 kritisch/4 hoch) auf 2 moderate reduziert. Build & Lint grün.

---

## 3. In n8n zu setzende Umgebungsvariablen

Diese Variablen müssen in der n8n-Instanz (Environment / `.env` des Containers) gesetzt sein:

```
THREEMA_GATEWAY_ID=            # bisher *BERENT1
THREEMA_GATEWAY_ID_E2E=        # bisher *BERENT2
THREEMA_API_SECRET=            # neues API-Secret (secret1)
THREEMA_API_SECRET_E2E=        # neues API-Secret (secret2)
THREEMA_GATEWAY_PRIVATE_KEY=   # NEUES Schlüsselpaar
SUPABASE_URL=
SUPABASE_ANON_KEY=             # neu
SUPABASE_SERVICE_KEY=          # neu
```

Für die Vercel-Funktion `threema-decrypt` zusätzlich:
```
DECRYPT_API_TOKEN=             # dasselbe Token, das n8n im Authorization-Header sendet
ALLOWED_ORIGIN=                # optional, leer lassen bei Server-zu-Server
```

> Der n8n-HTTP-Node, der `threema-decrypt` aufruft, muss künftig den Header
> `Authorization: Bearer {{ $env.DECRYPT_API_TOKEN }}` mitsenden (bei „Nachricht
> entschlüsseln" und „Blob entschlüsseln"). Beim Re-Import bitte ergänzen.

> **BER-118 (23.07.2026):** Auch die Dashboard-Route `POST /api/belege/[id]/dokument`
> ruft die Edge-Action `archive-beleg-*` serverseitig mit demselben Token auf. Dafür
> muss `DECRYPT_API_TOKEN` in der **Vercel-Umgebung** des `belegchat`-Projekts gesetzt
> sein (`.env.local` lokal). Der Token bleibt server-only (Route-Handler), erscheint
> nie im Client. → Runbook-Schritt M1.

---

## 4. Noch offen / empfohlen

- **Signatur-Feldnamen prüfen:** Der neue „Signatur prüfen"-Node erwartet die
  Threema-Standardfelder (`from,to,messageId,date,nonce,box,mac`). Falls dein Webhook die
  Felder anders verschachtelt liefert, den Zugriff im Node anpassen und mit einem echten
  Callback testen.
- **Beleg-Nr-Race:** sicherstellen, dass `naechste_beleg_nr` atomar ist (DB-Sequence +
  `UNIQUE(mandant_id, beleg_nr)`), sonst Doppelvergabe bei Parallel-Belegen möglich.
- **RLS in Supabase** aktiv halten; Service-Role-Key nur serverseitig verwenden.
- **App-Funktionalität:** `belegchat/` ist noch das Next.js-Template — die eigentliche
  Beleg-Review-/DATEV-Oberfläche existiert im Code noch nicht.
