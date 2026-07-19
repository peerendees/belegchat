---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Web-Release-Live-Kurzcheck (AUDIT-Modus)

> 🌐 **Sprache:** Deutsch (diese Datei) · [🇬🇧 English](live-release-check.en.md)

> **Klartext:** Alle anderen Gates lesen den **Code** vor dem Merge. Dieser Check schaut zum ersten
> Mal auf das **laufende System** nach dem Deploy — mit denselben Bordmitteln, mit denen ein
> Angreifer in der ersten Minute schaut: ein paar `curl`-Aufrufe. Kein Schwer-Werkzeug, kein DAST,
> unter zehn Minuten.

![Web-Release-Live-Kurzcheck: Code-Gates vor dem Merge vs. der blinde Fleck nach dem Deploy und die 5 curl-Proben](../../docs/live-release-check.png)

Diese Reference gehört zum `security-architect`-**AUDIT-Modus** ([SKILL.md](../SKILL.md), Schritt 6).
Sie wird **vor einem Web-Release** ausgeführt und schliesst den blinden Fleck zwischen «Code ist
geprüft» und «System läuft»: Header, die der Reverse-Proxy verschluckt; Framework-Banner, die die
Plattform anhängt; Default-Routen, die im Prod-Build offen bleiben — nichts davon sieht ein
Code-Gate.

## Scope & Autorisierung (Pflicht, zuerst lesen)

- **Nur eigene Systeme.** Diese Proben laufen ausschliesslich gegen ein Deployment, das dir gehört
  oder für das eine **schriftliche Freigabe** vorliegt. Proben gegen fremde Hosts sind ohne
  Erlaubnis unzulässig — der Rate-Limit-Check (unten) ist aktiver Traffic.
- **Staging bevorzugt.** Führe den Check gegen die Staging-/Pre-Prod-Umgebung aus, wo vorhanden.
  Der Login-Wiederholungs-Check kann echte Sperren auslösen — nie gegen einen produktiven Account
  eines Dritten, nie mit fremden Credentials.
- **Read-mostly.** Vier der fünf Checks sind reine `GET`-Requests. Nur Check 5 sendet aktiv
  wiederholte Requests; halte dich an die eigene Umgebung und niedrige Wiederholungszahlen.

## Voraussetzung

`curl` genügt. Setze die Ziel-URL einmal:

```bash
BASE="https://staging.example.com"   # dein Deploy — mit https://, ohne Slash am Ende
```

## Die fünf Checks

### 1. Soll-Header-Abgleich

Prüft, ob die Sicherheits-Header, die im Code/Framework gesetzt sein *sollten*, an der Kante auch
wirklich **ankommen** — und ob **Verräter-Header** entfernt sind.

```bash
curl -sSI "$BASE/" | tr -d '\r'
```

Gegen die Soll-Liste abgleichen (identisch mit REVIEW Schritt 5 und
[security-template §11](../../bootstrap/references/security-template.md)):

| Header | Soll | Kurz warum |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | erzwingt HTTPS, verhindert Downgrade |
| `Content-Security-Policy` | mindestens `default-src 'self'` | dämmt XSS/Injection ein |
| `X-Content-Type-Options` | `nosniff` | kein MIME-Sniffing |
| `X-Frame-Options` | `DENY` (oder CSP `frame-ancestors`) | Clickjacking-Schutz |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | kein Referrer-Leak |
| `Permissions-Policy` | restriktiv (z. B. `geolocation=(), camera=()`) | schaltet ungenutzte Browser-Features ab |
| `Cross-Origin-Opener-Policy` | `same-origin` | isoliert den Browsing-Context (Spectre-Klasse) |

**Verräter-Header — müssen fehlen:**

```bash
curl -sSI "$BASE/" | grep -iE '^(server|x-powered-by):'
```

`X-Powered-By` sollte gar nicht erscheinen; `Server` sollte keine genaue Version nennen
(`nginx` statt `nginx/1.25.3`). Beides gibt einem Angreifer eine kostenlose CVE-Landkarte.

### 2. Root-Endpoint-Disclosure

Manche Frameworks liefern unter `/` (oder Health-/Info-Routen) im Prod-Build ungewollt JSON mit
Versionen, Routen-Listen oder Stacktraces aus.

```bash
curl -sS "$BASE/" | head -c 400; echo
curl -sS -o /dev/null -w '%{content_type}\n' "$BASE/"
```

**Rot:** `application/json` mit Framework-/Versions-Feldern, Routen-Dump oder Stacktrace an einer
Route, die eine HTML-Seite oder ein bewusstes API-Dokument sein sollte.

### 3. `/.well-known/security.txt` (RFC 9116)

Ein öffentliches Deploy sollte einen Meldeweg für Schwachstellen ausweisen.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "$BASE/.well-known/security.txt"
curl -sS "$BASE/.well-known/security.txt"
```

**Soll:** HTTP `200` mit mindestens `Contact:` und `Expires:` (Scaffold im
[security-template §11](../../bootstrap/references/security-template.md)). `404` = Befund
(niedrig, aber Teil der OWASP-Secure-Headers-Hygiene).

### 4. Redirect-Parameter-Probe (Open Redirect)

Öffnet ein Redirect-Parameter beliebige externe Ziele, ist das ein Phishing-Baustein.

```bash
curl -sS -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
  "$BASE/login?next=https://example.org/attacker"
```

**Rot:** Der `Location`/`redirect_url` zeigt auf die fremde Domain (`example.org`). **Grün:** Redirect
nur auf einen relativen Pfad / dieselbe Origin oder Ablehnung. Parametername an das eigene Projekt
anpassen (`next`, `redirect`, `returnTo`, `url` …).

### 5. Wiederholter Login (Rate-Limit-Smoke-Test)

Prüft, ob ein Auth-Endpunkt Brute-Force **irgendwann** ausbremst — nicht Vollständigkeit, nur ein
Lebenszeichen des Schutzes.

```bash
for i in $(seq 1 12); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -X POST "$BASE/api/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"probe@example.com","password":"wrong-'"$i"'"}'
done
```

**Grün:** Nach einigen Versuchen kippt der Code auf `429` (Too Many Requests) oder eine bewusste
Verzögerung. **Rot:** Alle zwölf liefern denselben schnellen `401` — kein Rate-Limit. Endpunkt-Pfad
und Body an das eigene API anpassen; nur gegen die eigene/Staging-Umgebung.

## Report-Vorlage

```
### Web-Release-Live-Kurzcheck: <BASE> (<Datum>)

| # | Check | Ergebnis | Befund | Schwere |
|---|-------|----------|--------|---------|
| 1 | Soll-Header | 5/7 gesetzt; X-Powered-By vorhanden | Permissions-Policy + COOP fehlen; Banner leakt | MITTEL |
| 2 | Root-Disclosure | JSON mit Version | Versions-Info an / | NIEDRIG |
| 3 | security.txt | 404 | kein Meldeweg | NIEDRIG |
| 4 | Open Redirect | relativ | ok | — |
| 5 | Rate-Limit | 12x 401 | kein Limit am Login | HOCH |

**Gesamt:** <Low/Medium/High>  ·  **Release-Blocker:** Ja/Nein (HOCH = Blocker)
```

**Blocker-Regel (analog REVIEW):** ein **HOCH**-Befund blockiert das Release, bis er behoben oder als
Restrisiko dokumentiert abgenommen ist.

## Ehrliche Grenze

Das ist ein **Kurzcheck**, kein DAST-Scan und kein Pentest. Er findet die häufigen, billigen
Fehlkonfigurationen der ersten Minute — nicht Logik-Lücken, verkettete Angriffe oder
authentifizierte Angriffsflächen. Für tiefe Prüfung bleibt echtes DAST/Pentest die richtige
Antwort; dieser Check senkt nur die Wahrscheinlichkeit, mit einem offensichtlichen Loch live zu
gehen. Einordnung: OWASP Secure Headers Project, RFC 9116 (security.txt), OWASP Top 10:2025
(A02 Security Misconfiguration, A01 Broken Access Control).

## Verwandt

- [SKILL.md](../SKILL.md) — AUDIT-Modus (Schritt 6) und REVIEW-Header-Liste (Schritt 5)
- [security-template §11](../../bootstrap/references/security-template.md) — Header-Baseline, helmet-Default, security.txt-Scaffold
- [owasp-checklist.md](owasp-checklist.md) — OWASP Top 10:2025 / ASVS
- [docs/security-hub.md](../../docs/security-hub.md) — Security-Landkarte (§6 Betrieb)
