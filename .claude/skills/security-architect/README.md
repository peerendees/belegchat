---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Security Architect — Claude Code Skill

> **Security by Design** fuer den gesamten Entwicklungsprozess — von der ersten Idee bis zum Produktivcode.
> Ein Claude-Code-Skill, der professionelles Security-Engineering in jede Session bringt.

**Version:** 1.3.0 | **Lizenz:** MIT | **Plattform:** Claude Code (Anthropic)

> **Claude-Code-Modus:** `/security-architect` ist read-only Analyse (Threat Modeling, Review, Audit, Skill-Scan, MCP-Scan) → **`plan`** (Plan Mode); Befunde bzw. Record-Entwuerfe als Report, kein Code, keine Config-Aenderung. Details: HANDBUCH §6 „Claude-Code-Modus".

---

## Was der Skill tut

Der Security-Architect-Skill macht Claude Code zum vollwertigen Security-Engineering-Partner. Statt Security als Nachgedanken zu behandeln, integriert er Threat Modeling, Code Review und Auditing direkt in den Entwicklungs-Workflow — automatisch zum richtigen Zeitpunkt ausgeloest.

**Das Kernproblem:** Die meisten Entwickler ueberspringen Security komplett oder laufen am Ende eine Checkliste durch. Der Skill macht Security zum natuerlichen Teil des Bauens — bevor Code geschrieben wird, waehrend er geschrieben wird und bevor er ausgeliefert wird.

### Neu in v1.1.0: SKILL-SCAN-Modus
Bevor Skills aus GitHub oder anderen externen Quellen installiert werden, prueft der SKILL-SCAN-Modus sie auf **Prompt-Injection-Attacken** — bösartige Anweisungen, die in SKILL.md-Dateien versteckt sein koennten, um Claudes Verhalten zu kapern, Zugangsdaten abzugreifen oder Systemkonfiguration zu manipulieren.

---

### Neu in v1.2.0: MCP-SCAN-Modus
Bevor ein MCP-Server angebunden wird, fuellt der MCP-SCAN-Modus den Vetting-Record entlang der 7-Punkte-Checkliste (SECURITY.md §10 / HANDBUCH Anhang BB) **vor** — als Record-**Entwurf** mit `status: draft`, aus Betreiber-Primaerquellen belegt. Er nimmt nicht ab und aendert keine Config: die Abnahme (`approved`) bleibt der Operator, der Guard `mcp_vetting_check.py` bleibt die Durchsetzung.

---

### Neu in v1.3.0: Web-Release-Live-Kurzcheck (AUDIT)
Alle Gates des Frameworks lesen den **Code vor dem Merge** — niemand prueft bisher das **laufende System nach dem Deploy**. Der AUDIT-Modus bekommt dafuer einen leichtgewichtigen 5-Punkte-**curl-Kurzcheck** (<10 Min, kein DAST): Soll-Header-Abgleich, Root-Endpoint-Disclosure, `/.well-known/security.txt`, Redirect-Parameter-Probe, wiederholter Login (Rate-Limit) — nur gegen eigene/Staging-Deploys, HOCH-Befund = Release-Blocker ([references/live-release-check.md](references/live-release-check.md)). Zusaetzlich ist die Security-Header-Soll-Liste auf OWASP-Secure-Headers-Stand gehoben (Permissions-Policy, COOP, X-Powered-By-/Server-Entfernung, helmet-Default fuer Express) und `SECURITY.md` bekommt einen security.txt-Disclosure-Baustein (RFC 9116).

---

## Fuenf Betriebsmodi

```
Nutzer plant / brainstormt?                 → DESIGN   (Threat Modeling)
Nutzer schreibt / aendert Code?             → REVIEW   (Code-Security-Check)
Nutzer sagt "Audit" / "Scan"?               → AUDIT    (Voller Security-Scan)
Nutzer will Skill/Plugin installieren?      → SKILL-SCAN (Prompt-Injection-Check)
Nutzer will MCP-Server anbinden?            → MCP-SCAN  (Vetting-Record-Entwurf)
```

### Modus 1: DESIGN — Threat Modeling

Ausgeloest **bevor** Code geschrieben wird, waehrend Planung und Architektur-Entscheidungen.

**Was passiert:**
1. System-Scope wird definiert: Datenfluesse, Trust-Grenzen, externe Interfaces
2. STRIDE-Analyse pro Komponente und Interface
3. DREAD-Risk-Scoring (1–10) fuer jeden identifizierten Threat
4. Konkrete Security-Requirements fuer die Implementation formuliert

**STRIDE-Framework:**

| Threat | Frage | Gegenmassnahme |
|--------|-------|----------------|
| **S**poofing | Kann jemand eine andere Identitaet vortaeuschen? | Strong Auth, MFA |
| **T**ampering | Koennen Daten manipuliert werden? | Integrity Checks, Signaturen |
| **R**epudiation | Kann jemand Aktionen abstreiten? | Audit Logs, digitale Signaturen |
| **I**nformation Disclosure | Koennen vertrauliche Daten leaken? | Verschluesselung, Access Controls |
| **D**enial of Service | Kann der Service lahmgelegt werden? | Rate Limiting, Redundanz |
| **E**levation of Privilege | Kann jemand unberechtigte Rechte bekommen? | RBAC, Least Privilege |

**DREAD-Scoring:** Jeder Threat 1–10 bewertet in Damage, Reproducibility, Exploitability, Affected Users, Discoverability.

**Output:** Threat-Model-Report mit Threat-Tabelle, Risiko-Scores und priorisierten Security-Requirements.

---

### Modus 2: REVIEW — Code-Security-Check

Ausgeloest automatisch **waehrend Code-Aenderungen**, oder auf Abruf.

**Was passiert:**
1. Risiko-Klassifikation der Aenderung (HIGH / MEDIUM / LOW)
2. OWASP Top 10:2025 Quick-Check gegen den Diff
3. Sprachspezifische Secure-Code-Patterns verifiziert
4. Secrets-Check (keine API-Keys, Passwoerter, Tokens im Code)
5. Security-Headers-Audit (fuer Web-Apps)

**OWASP Top 10:2025 Checks:**

| # | Schwachstelle | Check |
|---|---------------|-------|
| A01 | Broken Access Control | Auth auf jedem Endpoint? Deny by Default? |
| A02 | Security Misconfiguration | Secure Defaults? Debug aus? |
| A03 | Software Supply Chain Failures | Versions-Pinning? Integritaet geprueft? |
| A04 | Cryptographic Failures | TLS 1.2+? AES-256-GCM? Argon2/bcrypt? |
| A05 | Injection | Parameterisierte Queries? Input Validation? |
| A06 | Insecure Design | Threat Model vorhanden? Rate Limiting? |
| A07 | Auth Failures | MFA? Breached-Password-Check? |
| A08 | Integrity Failures | Signierte Packages? SRI fuer CDN? |
| A09 | Security Logging and Alerting Failures | Security-Events geloggt? Alerting? |
| A10 | Mishandling of Exceptional Conditions | Fail-Closed? Keine Internals exponiert? |

**Output-Format:**
```
### Security Review: [Beschreibung der Aenderung]

| # | Finding | Severity | File:Line | Empfehlung |
|---|---------|----------|-----------|------------|
| 1 | SQL-Query mit String-Concat | HIGH | api.py:42 | Parameterisierte Query nutzen |
| 2 | Rate Limiting fehlt | MEDIUM | auth.py:15 | Rate-Limiter-Middleware hinzufuegen |

Risk Assessment: MEDIUM
Blocker: Ja (HIGH findings = Blocker)
```

---

### Modus 3: AUDIT — Voller Security-Scan

Ausgeloest auf Abruf (`/security audit`), vor Releases, oder periodisch.

**Was passiert:**
1. Alle REVIEW-Checks auf die gesamte Codebase angewendet
2. Dependency-Analyse — bekannte Schwachstellen, verlassene Packages, unnoetige Dependencies
3. Konfigurations-Review — Produktions-Settings, CORS, DB-Permissions, Secrets-Management
4. Attack-Surface-Mapping — alle public Endpoints, welche User-Input akzeptieren, welche State aendern

**Deckt auch Agentic AI Security (OWASP ASI01–ASI10)** fuer Projekte mit KI-Agents, MCP-Servern oder Tool-Calling-Systemen.

**Web-Release-Live-Kurzcheck (v1.3.0):** Bei Web-Deploys schliesst Schritt 6 den blinden Fleck zwischen «Code geprueft» und «System laeuft» — ein 5-Punkte-curl-Kurzcheck (<10 Min, kein DAST) gegen ein eigenes/Staging-Deploy: Header, Root-Disclosure, security.txt, Open Redirect, Rate-Limit. Details: [references/live-release-check.md](references/live-release-check.md).

**Output:** Kompletter Audit-Report mit Gesamt-Risiko-Rating (Low / Medium / High / Critical), Findings nach Severity sortiert, Action Plan mit Prioritaeten, und positive Findings.

---

### Modus 4: SKILL-SCAN — Prompt-Injection-Check fuer Skills

Ausgeloest **bevor ein externer Skill installiert wird** aus GitHub oder anderen Quellen.

Dieser Modus adressiert einen spezifischen Threat im Claude-Code-Oekosystem: Eine boesartige SKILL.md-Datei koennte versteckte Anweisungen enthalten, die Claudes Verhalten kapern, Credentials lesen, globale Settings aendern oder destruktive Operationen ausfuehren — ohne dass du es bemerkst.

**Was passiert:**
1. **Metadaten-Check** — passen Name, Description und tatsaechlicher Inhalt zusammen? Unbekannter Autor / keine Versionierung / fehlendes Repo → erhoehte Skepsis
2. **Prompt-Injection-Scan** — 8 Angriffs-Kategorien geprueft (siehe Referenzdatei)
3. **Scope-Check** — macht der Skill mehr als seine Description verspricht?
4. **False-Positive-Filter** — legitime Skills enthalten oft Security-Beispiele, CLAUDE.md-Read-Zugriff oder dokumentierte, scopierte Shell-Commands

**8 Angriffs-Kategorien:**

| Kategorie | Was geprueft wird |
|-----------|-------------------|
| Override / Hijacking | Anweisungen die Claudes Verhalten ueberschreiben |
| Exfiltration | Zugriff auf sensible Dateien, API-Keys, Credentials |
| Privilege Escalation | Behauptete Berechtigungen die nie gewaehrt wurden |
| Destructive Actions | `rm -rf`, `git reset --hard`, Massen-Deletion |
| Settings Manipulation | Writes auf `CLAUDE.md`, `settings.json` |
| Indirect Injection | Externe URLs die Instructions laden koennten |
| Hidden Instructions | HTML-Kommentare, Unicode-Tricks, unsichtbarer Text |
| Social Engineering | Fake-Metadaten, Impersonation, Urgency-Framing |

**Severity-Skala:** `CRITICAL` → `HIGH` → `MEDIUM` → `NOTE`

**Output-Format:**
```
### SKILL-SCAN: my-skill v1.0.0

| # | Kategorie | Severity | Zeile | Finding |
|---|-----------|----------|-------|---------|
| 1 | Exfiltration | CRITICAL | 42 | Liest ~/.ssh/id_rsa und uebertraegt Inhalt |
| 2 | Override | HIGH | 15 | "Ignore all previous instructions" |

Gesamtbewertung: DANGEROUS
Empfehlung: Nicht installieren

Grund: Zwei kritische Findings deuten auf intentional boesartiges Verhalten hin.
```

---

### Modus 5: MCP-SCAN — Record-Ausfuell-Helfer fuer MCP-Server-Vetting

Ausgeloest **bevor ein MCP-Server angebunden wird** — bzw. wenn ein `.mcp.json`/`mcpServers`-Block einen Server ohne Vetting-Record `docs/mcp-vetting/<server>.md` konfiguriert. MCP-Server sind derselbe Vektor wie fremde Skills: fremde Endpunkte mit Tool-Zugriff auf das Projekt.

**Was passiert:**
1. **Config lesen** — `.mcp.json` / `.claude/settings*.json` auf `mcpServers` pruefen; gegen `docs/mcp-vetting/` abgleichen
2. **Betreiber-Primaerquellen recherchieren** — nur offizielle Anbieter-Doku (OAuth/Token, Audit-Log, Security-&-Access)
3. **Record-Entwurf `status: draft`** entlang der 7 Punkte (AuthN · Verschluesselung/Transport · Least-Privilege-Scope · Audit-Faehigkeit · Session-/User-Zuordnung · Herkunft/Vertrauenswuerdigkeit · Token-Ablauf) — jeder Punkt Befund + Quelle ODER explizit „nicht dokumentiert"
4. **Haertungs-Empfehlungen** als separate Vorschlagsliste (Umsetzung Operator)

**Anti-Fabrikation (woertlich im Skill):** Nichts erfinden. Fakten, die nicht in einer Betreiber-Primaerquelle belegbar sind, werden explizit als „nicht dokumentiert" ausgewiesen — kein Ausfuellen aus Plausibilitaet.

**Abgrenzung:** setzt nie `status: approved`, aendert nie Config; der Guard `mcp_vetting_check.py` bleibt die Durchsetzung (ein `draft`-Record fuer einen konfigurierten Server haelt die CI bewusst rot, bis der Operator abnimmt). Vollstaendiges Beispiel: [docs/mcp-vetting/linear-mcp.md](../docs/mcp-vetting/linear-mcp.md).

---

## Unterstuetzte Sprachen (Code-Patterns)

JavaScript / TypeScript · Python · Go · Rust · Java · PHP · C / C++ · Bash

---

## Standards & Referenzen

| Standard | Abdeckung |
|----------|-----------|
| OWASP Top 10:2025 | Alle 10 Kategorien, jeder REVIEW- und AUDIT-Lauf |
| OWASP ASVS 5.0 | 3 Levels: alle Apps / sensible Daten / kritische Systeme |
| OWASP LLM Top 10 | LLM01 Prompt Injection, Supply Chain fuer KI-Systeme |
| OWASP Agentic AI (ASI01–ASI10) | Agent-Security, Tool-Misuse, Memory-Attacks |
| STRIDE / DREAD | Threat-Modeling-Framework fuer DESIGN-Modus |
| MITRE ATLAS | AML.T0054 Prompt Injection (SKILL-SCAN-Referenz) |

---

## Schnittstellen zu anderen Skills

Andere Skills koennen Security Architect direkt aufrufen:

```
"Pruef die Security dieser Aenderung"          → triggert REVIEW
"Erstell ein Threat Model fuer dieses Feature" → triggert DESIGN
"Fuehr ein Security-Audit aus"                 → triggert AUDIT
"Scan diesen Skill bevor ich ihn installiere"  → triggert SKILL-SCAN
```

| Aufrufender Skill | Security-Modus | Ergebnis |
|-------------------|----------------|----------|
| `ideation` | DESIGN | Threat Model parallel zur Story erstellt |
| `implement` | REVIEW | Code-Aenderungen vor Commit reviewed |
| `architecture-review` | DESIGN + AUDIT | Architektur um Security-Dimension erweitert |
| `sprint-review` | AUDIT | Periodischer Security-Gesundheits-Check |
| `skill-creator` | SKILL-SCAN | Prompt-Injection-Check vor Installation externer Skills |

---

## Trigger-Phrasen

Der Skill aktiviert sich automatisch bei:

- `/security`, `security`, `sicherheit`
- `threat model`, `threat modeling`
- `security review`, `security audit`
- `is this secure?`, `ist das sicher?`
- `OWASP`, `ASVS`
- `scan this skill`, `scanne diesen skill`
- `skill-scan`, `pruefe diesen skill`
- `mcp-scan`, `scanne mcp server`, `vet mcp`

---

## Dateistruktur

```
security-architect/
├── README.md                              ← Diese Datei
├── SKILL.md                               ← Skill-Definition (wird von Claude Code geladen)
└── references/
    ├── threat-modeling.md                 ← STRIDE/DREAD-Details, Auth-Patterns, Zero Trust
    ├── owasp-checklist.md                 ← OWASP Top 10:2025, ASVS 5.0, ASI01-ASI10
    ├── secure-code-patterns.md            ← Secure vs. Insecure Patterns pro Sprache
    ├── supply-chain.md                    ← Dependency-Analyse, Risk-Scoring, Audit-Tools
    ├── live-release-check.md              ← AUDIT Schritt 6: 5-Punkte-curl-Kurzcheck (kein DAST)
    └── prompt-injection-patterns.md       ← 8 Angriffs-Kategorien fuer SKILL-SCAN-Modus
```

**SKILL.md** ist die Datei die Claude Code liest und ausfuehrt. Enthaelt die Router-Logik, die Mode-Workflows und Referenzen zu Detail-Dateien in `references/`.

**Referenz-Dateien** werden on-demand geladen — nur wenn der jeweilige Mode sie braucht. Haelt das Context-Window schlank.

---

## Installation

### Option A: Aus diesem Repo
```bash
cp -r security-architect ~/.claude/skills/security-architect
```

### Option B: Gesamte Skills-Sammlung klonen
```bash
git clone https://github.com/<dein-repo>/claudecodeskills ~/Documents/GitHub/claudecodeskills
cp -r ~/Documents/GitHub/claudecodeskills/security-architect ~/.claude/skills/security-architect
```

### Installation verifizieren
```bash
ls ~/.claude/skills/security-architect/
# Sollte zeigen: README.md  SKILL.md  references/
```

Nach Installation wird der Skill bei der naechsten Session automatisch erkannt. Keine Config noetig.

---

## Design-Prinzipien

Der Skill baut auf fuenf non-negotiable Prinzipien:

1. **Defense in Depth** — Nie auf eine einzige Security-Massnahme verlassen
2. **Fail Closed** — Bei Fehlern Zugriff verweigern, nicht erlauben
3. **Least Privilege** — Nur minimale noetige Permissions vergeben
4. **Assume Breach** — Immer annehmen Angreifer sind schon im System
5. **Evidence-Based** — Jedes Finding mit konkretem Grund und Zeilen-Nummer

Diese Prinzipien leiten jede Empfehlung des Skills.

---

## Security-Hinweis zum Skill selbst

Der Skill folgt seinen eigenen SKILL-SCAN-Kriterien:

- Er liest **keine** Dateien ausserhalb seines eigenen Ordners (ausser CLAUDE.md fuer globale Regeln, read-only)
- Er macht **keine** externen Netzwerk-Requests
- Er aendert **keine** System-Konfiguration
- Alle Shell-Command-Beispiele sind klar als Beispiele markiert, nicht als ausfuehrbare Anweisungen
- Der `references/` Ordner enthaelt nur Dokumentation, keinen ausfuehrbaren Code

Verifizierbar: `/security` ausfuehren und die eigene SKILL.md als Input geben.

---

## Changelog

### v1.3.0 — 2026-07-12
- **Neu: Web-Release-Live-Kurzcheck** (AUDIT Schritt 6, BOO-425) — `references/live-release-check.md` (DE+EN): 5-Punkte-curl-Kurzcheck (<10 Min, kein DAST) gegen das laufende Deploy — Soll-Header, Root-Disclosure, `/.well-known/security.txt`, Open Redirect, Rate-Limit; nur eigene/Staging-Systeme, HOCH = Release-Blocker
- **Header-Soll-Liste gehoben** (REVIEW Schritt 5): + Permissions-Policy, + Cross-Origin-Opener-Policy, + X-Powered-By-/Server-Entfernung, helmet-Default fuer Express (OWASP-Secure-Headers-Stand)
- **security.txt-Disclosure-Baustein** (RFC 9116, Contact/Expires) + vollstaendige Header-Baseline in `SECURITY.md`-Template (§11)
- Schliesst den blinden Fleck aus Befundbericht B (BOO-413): kein Gate prueft das laufende System nach Deploy

### v1.2.0 — 2026-07-05
- **Neu: MCP-SCAN-Modus** — Record-Ausfuell-Helfer fuer MCP-Server-Vetting (BOO-334). Liest `.mcp.json`/`mcpServers`, recherchiert Betreiber-Primaerquellen und erzeugt einen Record-**Entwurf** `docs/mcp-vetting/<server>.md` mit `status: draft` entlang der 7-Punkte-Checkliste (SECURITY.md §10) + Haertungs-Empfehlungen
- **Anti-Fabrikations-Constraint woertlich im Skill:** Luecken werden als „nicht dokumentiert" ausgewiesen, nichts aus Plausibilitaet ausgefuellt
- **Abgrenzung:** setzt nie `status: approved`, aendert nie Config (`.mcp.json`/`.claude/settings*.json` sind sensitive-paths seit BOO-330); Guard `mcp_vetting_check.py` bleibt Durchsetzung
- Update: Decision-Tree in SKILL.md um MCP-SCAN-Trigger erweitert; Verweis auf HANDBUCH Anhang BB / SECURITY.md §10

### v1.1.0 — 2026-03-10
- **Neu: SKILL-SCAN-Modus** — Prompt-Injection-Check fuer externe Skills vor Installation
- **Neu: `references/prompt-injection-patterns.md`** — 8 Angriffs-Kategorien mit konkreten Patterns, False-Positive-Filter und Quellen (OWASP LLM Top 10, MITRE ATLAS, Simon Willison)
- Fix: Unsupported `version`-Feld aus SKILL.md-Frontmatter entfernt
- Update: Decision-Tree in SKILL.md enthaelt SKILL-SCAN-Trigger

### v1.0.0 — 2026-03-09
- Initial Release
- DESIGN-Mode: STRIDE/DREAD Threat Modeling
- REVIEW-Mode: OWASP Top 10:2025, Secure-Code-Patterns, Secrets-Check
- AUDIT-Mode: kompletter Projekt-Scan inkl. Dependency- und Config-Review
- 4 Referenz-Dateien: threat-modeling, owasp-checklist, secure-code-patterns, supply-chain
- Sprachen: JS/TS, Python, Go, Rust, Java, PHP, C/C++, Bash

---

## Lizenz

MIT-Lizenz — frei nutzbar, modifizierbar, weiterverteilbar.

---

*Gebaut fuer [Claude Code](https://claude.ai/claude-code) von Anthropic.*

## Verwandt

- Skill-Definition: [SKILL.md](SKILL.md)
- Security-Gesamtsicht (Threat Model bis Gates): [Runbook ciso-security](../docs/runbooks/ciso-security.md)
