---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architektur-Dimensionen — Detail (fuer /architecture-review)

Detail-Fragen fuer jede Dimension, mit "Pruefen wenn"-Triggerbedingungen. Generisch formuliert — projekt-spezifische Beispiele als optionale Hinweise.

**Struktur:** 8 Standard-Dimensionen + 4 Optional-Add-ons (aktiviert im Bootstrap Block A.4, sichtbar in `ARCHITECTURE_DESIGN.md §3`).

**Standard vs. Add-on:** Standard-Dimensionen gelten fuer **jedes** Projekt — sie sind universelle Software-Eigenschaften, die in jedem KI-unterstuetzten Bau abgesichert werden. Add-ons sind kontext-spezifisch und werden im Bootstrap aktiviert, wenn das Projekt sie braucht (regulierte Branche, kostenintensive APIs, Signal-Verarbeitung).

## Standard-Dimensionen

### 1. Reliability

**Pruefen wenn:** Neue Komponente, externe API-Abhaengigkeit, Daemon / Long-Running-Prozess, kritischer Geschaeftspfad.

> **Schrader (Code Crash, Kap. 4 §Run the System Saeule 6 Reliability):** "Verlaesslichkeit ist kein Gefuehl, sondern eine Pflicht-Pruefung gegen Invarianten." — Reliability ist nicht "es laeuft halt", sondern eine harte Pflicht-Pruefung gegen fuenf Invarianten: Idempotenz, Retry mit Backoff, Circuit Breaker pro externe Abhaengigkeit, Graceful Degradation, SLO + Error Budget. Vorlagen: bootstrap-Skill `references/file-templates.md` §lib/idempotency, §lib/retry, §lib/circuit-breaker, §docs/SLO.md.

**Allgemeine Hygiene (immer pruefen):**

- Graceful Degradation: Laeuft das System weiter wenn dieses Feature ausfaellt?
- Kill-Switch / Feature-Flag: Kann das Feature per Config deaktiviert werden ohne Deployment?
- Retry-Strategie: Transiente Fehler werden mit Backoff retried?
- Timeout: Jeder externe Call hat einen sinnvollen Timeout?
- Restart-Verhalten (bei Daemons): Locking (flock / PID-File) gegen Doppelstart? Backoff bei Crash-Loop?

**Pflicht-Invarianten (BOO-25):** Beim Review MUSS der Reviewer die folgenden fuenf Invarianten gegen das Projekt-`docs/SLO.md`, `lib/idempotency.{js,py}`, `lib/retry.{js,py}` und `lib/circuit-breaker.{js,py}` validieren. Pro Invariante: Status (OK / Warnung / Kritisch) im Report.

#### 1.1 Idempotenz-Invariante

**Geforderte Aspekte:**
- Alle schreibenden Endpoints (POST/PUT/PATCH/DELETE) akzeptieren einen `Idempotency-Key`-Header (UUID v4)
- Server persistiert pro Key Request-Hash + Response mit 24h TTL (Store: `lib/idempotency.{js,py}`)
- Gleicher Key + gleicher Body -> cached Response (Replay ohne erneuten Side-Effect)
- Gleicher Key + abweichender Body -> HTTP 422 (Konflikt, kein stiller Overwrite)
- Schluessel-Format und TTL als ADR in `ARCHITECTURE_DESIGN.md §3` dokumentiert

**Pruef-Fragen:**
- Akzeptieren alle schreibenden Endpoints (POST/PUT/PATCH/DELETE) einen `Idempotency-Key`-Header und lehnen Requests ohne Key bei kritischen Pfaden bewusst ab?
- Persistiert `lib/idempotency.{js,py}` Request-Hash + Response mit 24h TTL — und ist der Store (Redis / DB) als ADR begruendet?
- Liefert ein Replay mit gleichem Key + gleichem Body die zwischengespeicherte Response zurueck (kein doppelter Side-Effect)?
- Liefert ein Replay mit gleichem Key + abweichendem Body HTTP 422 (Konflikt) — und nicht stillschweigend ein Overwrite?
- Ist das Key-Format (UUID v4) im Endpoint-Vertrag dokumentiert und wird ungueltiger Key mit HTTP 400 abgelehnt?

#### 1.2 Retry+Backoff-Invariante

**Geforderte Aspekte:**
- Alle Downstream-Calls (DB, externe API, Message Bus) sind durch den Retry-Helper `lib/retry.{js,py}` geschuetzt — kein Ad-hoc-`for`-Loop im Call-Site-Code
- Maximal 3 Versuche, exponential Backoff mit Jitter (Default 100ms Basis, Faktor 2)
- Status-Code-Filter: nur 5xx, Timeout, Connection-Reset werden retried — KEIN Retry auf 4xx
- Kein Retry bei Idempotency-Konflikten (HTTP 422 aus §1.1) — der Konflikt ist final
- Retry-Versuche werden via strukturiertem Logger (BOO-14, §5.1) mit `attempt`, `delay_ms` und finalem Status geloggt

**Pruef-Fragen:**
- Sind alle Downstream-Calls (DB, externe API, Message Bus) durch `lib/retry.{js,py}` gewrappt — oder existieren noch Ad-hoc-Retry-Loops im Call-Site-Code?
- Ist die Retry-Anzahl auf max. 3 begrenzt und verwendet Backoff Jitter (gegen Thundering Herd) statt fixem Delay?
- Filtert der Retry-Helper Status-Codes korrekt (nur 5xx / Timeout / Connection-Reset retryen) — wird ein 4xx faelschlich retried?
- Wird auf HTTP 422 aus der Idempotenz-Pruefung (§1.1) bewusst NICHT retried — oder fuehrt das System sich selbst in einen Endlos-Konflikt?
- Werden Retry-Versuche strukturiert geloggt (`attempt`, `delay_ms`, finaler Status) — laesst sich ein flaky Downstream im Log nachvollziehen?

#### 1.3 Circuit-Breaker/Bulkhead-Invariante

**Geforderte Aspekte:**
- Pro externer Abhaengigkeit ein eigener Breaker (kein globaler Mega-Breaker, der alle Pfade gleichzeitig oeffnet)
- Default-Config: `errorThreshold` 50%, `resetTimeout` 30s, `volumeThreshold` 10 — Abweichungen pro Service als ADR begruendet
- State-Wechsel (Closed / Open / Half-Open) werden ueber den strukturierten Logger (BOO-14, §5.1) geloggt
- Bulkhead-Pattern dokumentiert wo angemessen: Connection-Pool-Limits pro Service / pro externer Abhaengigkeit, damit ein langsamer Downstream nicht den gesamten Worker-Pool blockiert
- `lib/circuit-breaker.{js,py}` wird konsistent verwendet — keine parallele Eigenbau-Implementierung

**Pruef-Fragen:**
- Hat jede externe Abhaengigkeit einen eigenen Breaker — oder teilen sich mehrere Downstreams einen globalen Breaker (Anti-Pattern)?
- Sind die Default-Werte (`errorThreshold` 50%, `resetTimeout` 30s, `volumeThreshold` 10) eingehalten — Abweichungen via ADR begruendet?
- Werden State-Wechsel (Closed / Open / Half-Open) im strukturierten Log (§5.1) sichtbar — laesst sich der Open-Zeitraum pro Breaker rekonstruieren?
- Sind Bulkhead-Grenzen (Connection-Pool-Limits pro Service) dokumentiert — kann ein langsamer Downstream den Worker-Pool exklusiv belegen?
- Wird `lib/circuit-breaker.{js,py}` ueberall genutzt — oder existieren parallele Eigenbau-Implementierungen, die das Verhalten unkontrolliert machen?

#### 1.4 Graceful-Degradation-Invariante

**Geforderte Aspekte:**
- Pro Feature-Pfad ist Fallback-Verhalten dokumentiert: welcher Pfad faellt zuerst, welcher Fallback greift, welcher Pfad bleibt zwingend live
- Kill-Switch / Feature-Flag pro kritischem Pfad — Deaktivierung ohne Deployment moeglich
- "Read-only Mode" wenn Schreib-DB nicht erreichbar — Lese-Pfade bleiben verfuegbar
- Cached-Response-Fallback wenn Upstream nicht antwortet — Stale-Daten mit `X-Stale: true`-Header gekennzeichnet
- Degradation-Verhalten in `docs/SLO.md` als Teil des Service-Vertrags dokumentiert (was bedeutet "verfuegbar" wenn ein Subsystem ausfaellt?)

**Pruef-Fragen:**
- Ist pro Feature-Pfad dokumentiert, welcher Pfad zuerst faellt und welcher Fallback greift — oder ist Degradation undefiniert ("dann sehen wir mal")?
- Existiert pro kritischem Pfad ein Kill-Switch / Feature-Flag, der ohne Deployment greift — und ist der Switch tatsaechlich getestet (nicht nur dokumentiert)?
- Schaltet das System bei nicht erreichbarer Schreib-DB in einen "Read-only Mode" — bleiben Lese-Pfade nutzbar?
- Werden Cached-Response-Fallbacks mit `X-Stale: true` (oder aequivalent) gekennzeichnet — kann der Client erkennen, dass die Daten nicht frisch sind?
- Ist das Degradationsverhalten in `docs/SLO.md` Teil des Service-Vertrags — oder gilt "verfuegbar" implizit als "alles funktioniert"?

#### 1.5 SLO+Error-Budget-Invariante

**Geforderte Aspekte:**
- `docs/SLO.md` existiert, ist gepflegt und referenziert in `ARCHITECTURE_DESIGN.md §6`
- Availability-Ziel pro Service explizit (z.B. 99.9 / 99.95 / 99.99) — kein "so viel wie moeglich"
- Error-Budget-Tabelle pro Quartal mit Verbrauch-Tracker (Zeitraum, Vorfaelle, verbrauchtes Budget, Restbudget)
- Drei SLIs pro Service: Latency P95, Availability, Error-Rate — jeweils mit Mess-Methode (Quelle: §5.2 Metrics-Endpoint)
- Review-Cadence (Default monatlich in `/sprint-review`) dokumentiert — Error-Budget-Verbrauch wird regelmaessig geprueft, nicht erst bei Eskalation

**Pruef-Fragen:**
- Existiert `docs/SLO.md` und ist es als Teil von `ARCHITECTURE_DESIGN.md §6` referenziert — oder lebt es als orphan File?
- Ist pro Service ein Availability-Ziel explizit beziffert (z.B. 99.9 / 99.95 / 99.99) — oder steht dort "hohe Verfuegbarkeit"?
- Enthaelt `docs/SLO.md` eine Error-Budget-Tabelle pro Quartal mit Verbrauch-Tracker (Vorfaelle, verbrauchtes Budget, Restbudget) — und ist der aktuelle Stand juenger als der letzte Sprint?
- Sind die drei SLIs (Latency P95, Availability, Error-Rate) pro Service definiert und auf konkrete Metriken aus §5.2 gemappt (kein "wir wissen schon was wir messen")?
- Ist eine Review-Cadence (Default monatlich in `/sprint-review`) festgelegt — oder wird das Error-Budget erst beachtet, wenn es bereits aufgebraucht ist?

### 2. Data Integrity

**Pruefen wenn:** Schreibzugriff auf persistente Datenquellen (DB, Files, Config), State der ueber Restart hinweg lebt.

- SSoT respektiert? Ist die authoritative Datenquelle klar und dokumentiert?
- Atomic Writes wo noetig (write-then-rename, DB-Transaktionen)?
- Race Conditions bei parallelen Zugriffen bedacht?
- Idempotenz bei Retries sichergestellt (kein doppelter Side-Effect)?
- Backup / Recovery-Pfad fuer kritische Daten definiert?

### 3. Security

**Pruefen wenn:** Neue externe API, neuer Webhook-Endpoint, externer Input, neue `.env`-Variable, Aenderung an Auth-Logik.

- API-Keys / Secrets nur in `.env`, nie im Code, nie in Logs
- Input-Validation bei allen externen Eingaengen (User-Input, Webhooks, APIs)
- Token-/Key-Sanitization in Error-Logs
- Bei eingehenden Webhooks: HMAC-Signing, Replay-Schutz, Rate-Limit, Body-Size-Limit
- Principle of Least Privilege: Tool-/File-Zugriffe auf das Noetigste reduziert

### 4. Performance

**Pruefen wenn:** Neue API mit Rate-Limits, Long-Running-Connection (WebSocket, SSE), Memory-intensive Ops, enge Latenz-Anforderungen.

> **Schrader (Code Crash, Kap. 3 §Production Readiness Gate 3):** "Performance ohne Baseline ist Glaube, nicht Architektur." — Performance ist nicht "fuehlt sich schnell an", sondern eine harte Pflicht-Pruefung gegen drei Invarianten: Baseline existiert, Baseline-Trend ist stabil, ein CI-Gate blockt Regressionen. Vorlagen: bootstrap-Skill `references/file-templates.md` §perf-baseline.json + §perf.yml.

**Allgemeine Hygiene (immer pruefen):**

- Latenz-Budget fuer den Use-Case bekannt und getestet
- Rate-Limits externer APIs dokumentiert und eingehalten, Buffer eingeplant
- Memory-Verbrauch: kein unbegrenztes Puffern, Cleanup-Strategie
- Long-Running-Connections: Reconnect-Logik, Heartbeat, sauberer Shutdown
- Caching wo sinnvoll (semantisch, TTL-basiert, Cache-Invalidation definiert)

**Pflicht-Invarianten (BOO-16):** Beim Review MUSS der Reviewer die folgenden drei Invarianten gegen das Projekt-`journal/perf-baseline.json` und `.github/workflows/perf.yml` validieren. Pro Invariante: Status (OK / Warnung / Kritisch) im Report.

#### 4.1 Baseline-Existenz-Invariante

**Geforderte Aspekte:**
- `journal/perf-baseline.json` existiert und ist gueltiges JSON
- Pro Service ein Eintrag mit den Pflicht-Feldern: `p50_ms`, `p95_ms`, `p99_ms`, `req_per_sec`, `recorded_at` (ISO 8601), `commit_sha`, `bench_tool`
- Letztes `recorded_at` ist nicht aelter als 30 Sprints (sonst gilt die Baseline als veraltet und muss neu vermessen werden)
- Bench-Skelett pro Service vorhanden: `bench/<service>.bench.js` (Node, autocannon-basiert) ODER `bench/<service>_bench.py` (Python, pytest-benchmark-basiert)

**Pruef-Fragen:**
- Existiert `journal/perf-baseline.json` und enthaelt es pro deklariertem Service einen Eintrag mit allen 7 Pflicht-Feldern (`p50_ms`, `p95_ms`, `p99_ms`, `req_per_sec`, `recorded_at`, `commit_sha`, `bench_tool`)?
- Ist das letzte `recorded_at` aller Services juenger als 30 Sprints — oder gibt es einen ADR der die Veralterung begruendet?
- Hat jeder Service ein lauffaehiges Bench-Skelett unter `bench/<service>.bench.js` (Node) bzw. `bench/<service>_bench.py` (Python) — und laeuft es ohne Code-Aenderung?
- Ist `bench_tool` konsistent gesetzt (z.B. `autocannon` oder `pytest-benchmark`) und passt das Tool zum Service-Stack?
- Verweist der `commit_sha` jedes Eintrags auf einen Commit, der tatsaechlich in der Hauptlinie existiert (kein verwaister Branch-Hash)?

#### 4.2 Baseline-Trend-Invariante

**Geforderte Aspekte:**
- P95-Wachstum ueber die letzten N=10 Commits an `journal/perf-baseline.json` <= 10% (gruener Korridor)
- Wachstum > 10% und < 20%: Architektur-Hinweis im Report — Code- vs. Infra-Ursache pruefen (neue Abhaengigkeit, geaenderter Bench-Host, Hintergrundlast?)
- Wachstum >= 20%: harter Befund (Status Kritisch). Sollte vom CI-Gate (§4.3) bereits geblockt sein — ist es nicht, ist das Gate kaputt
- Trend wird pro Service separat berechnet (kein gemittelter Gesamtschnitt, der Ausreisser versteckt)

**Pruef-Fragen:**
- Liegt das P95-Wachstum pro Service ueber die letzten 10 `perf-baseline.json`-Commits unter 10% (Status OK)?
- Bei Wachstum 10–20%: ist im Report dokumentiert, ob die Ursache Code (neue Logik, ineffiziente Query) oder Infra (Bench-Host, Nachbar-Last) ist?
- Bei Wachstum >= 20%: warum wurde das ueberhaupt gemerged — gibt es einen aktiven `perf-override` (siehe §4.3) oder ist das CI-Gate ausgehebelt?
- Wird der Trend pro Service einzeln betrachtet (nicht aggregiert) — und faellt mindestens ein Service auf, der den Schnitt schoenrechnet?
- Ist die Bench-Umgebung konstant (gleicher Runner, gleiche Last-Generator-Config) — oder erklaert sich der Trend durch Mess-Drift?

#### 4.3 Gate-Invariante

**Geforderte Aspekte:**
- `.github/workflows/perf.yml` existiert und laeuft bei jedem PR der Code-Pfade beruehrt
- Workflow ist als Required Status Check in der Branch-Protection aktiv — oder es gibt einen ADR der dokumentiert, warum nicht (z.B. fruehe Phase, kein Deployment-Druck)
- 3-Schwellen-Logik: P95-Faktor <= 1.05 → Pass, 1.05–1.20 → Warning (Merge moeglich, aber sichtbar), > 1.20 → Block (Merge nur via Override)
- Override-Mechanismus dokumentiert: PR-Label `perf-override` ODER Commit-Trailer `Perf-Override: <Begruendung>`
- Override-Log unter `journal/reports/perf/overrides.log` lebt — jeder Override hinterlaesst Datum, PR/Commit, Begruendung

**Pruef-Fragen:**
- Existiert `.github/workflows/perf.yml` und triggert der Workflow auf relevante PRs (nicht nur `main`-Push)?
- Ist der `perf`-Check in den Branch-Protection-Rules als Required Status Check aktiv — oder gibt es einen ADR mit Begruendung, warum nicht?
- Ist die 3-Schwellen-Logik (<=1.05 Pass / 1.05–1.20 Warning / >1.20 Block) im Workflow tatsaechlich kodiert und nicht nur dokumentiert?
- Sind die letzten Eintraege in `journal/reports/perf/overrides.log` nachvollziehbar (PR-Link, Begruendung, Auflage zur Behebung)?
- Wird der Override-Mechanismus diszipliniert verwendet (kein "wir overrideen jeden Block, weil das Gate nervt") — oder hat sich das Gate de facto deaktiviert?

### 5. Observability

**Pruefen wenn:** Jedes Feature das stumm fehlschlagen koennte, neues externes System, neuer Daemon.

> **Schrader (Code Crash, Kap. 3 §Observability + Kap. 4 Saeule 3):** "Was nicht beobachtet wird, ist nicht produktiv." — Observability ist nicht "wir loggen schon irgendwas", sondern eine harte Pflicht-Pruefung gegen drei Invarianten. Vorlagen: bootstrap-Skill `references/file-templates.md` §observability.md.

**Allgemeine Hygiene (immer pruefen):**

- Strukturiertes Logging mit sinnvollen Log-Levels
- Kein Raw-API-Response in Logs (Gefahr von Key-/Token-Leak)
- Metriken fuer wichtige State-Aenderungen (Counter, Histogram)
- Self-Healing-Check noetig (wenn Self-Healing-Agent aktiv)?

**Pflicht-Invarianten (BOO-14):** Beim Review MUSS der Reviewer die folgenden drei Invarianten gegen das Projekt-`observability.md` und `observability/alerts/` validieren. Pro Invariante: Status (OK / Warnung / Kritisch) im Report.

#### 5.1 Logging-Schema-Invariante

**Geforderte Aspekte:**
- Strukturiertes JSON-Logging vorhanden (kein `console.log` / `print` im Production-Code)
- Pflicht-Felder pro Log-Eintrag: `timestamp` (ISO 8601), `level`, `service`, `trace_id`, `message`, `context`
- Logger-Bibliothek als ADR dokumentiert (z.B. pino fuer Node.js, structlog fuer Python)

**Pruef-Fragen:**
- Hat jeder Service ein strukturiertes JSON-Logging mit den 6 Pflicht-Feldern (`timestamp`, `level`, `service`, `trace_id`, `message`, `context`)?
- Existieren noch `console.log` / `print` / `fmt.Println`-Aufrufe im Production-Code (Anti-Pattern)?
- Ist die Logger-Wahl als ADR in `ARCHITECTURE_DESIGN.md §3` dokumentiert (mit Begruendung)?
- Werden Log-Levels diszipliniert verwendet (kein `INFO` fuer Fehler, kein `ERROR` fuer Routine-Events)?
- Ist das `trace_id`-Feld konsistent gesetzt — laesst sich ein Request ueber alle Services hinweg korrelieren?

#### 5.2 Metrics-Endpoint-Invariante

**Geforderte Aspekte:**
- `/metrics`-Endpoint im Prometheus-Format pro Service
- Pflicht-Metriken pro Service: `{service}_up`, `{service}_requests_total`, `{service}_request_duration_seconds`, `{service}_errors_total`
- Port-Konvention 9090+N (Prometheus selbst auf 9090, jeder Service bekommt einen eindeutigen Folge-Port)

**Pruef-Fragen:**
- Hat jeder Service einen erreichbaren `/metrics`-Endpoint, der Prometheus-konformes Format ausliefert?
- Sind die 4 Pflicht-Metriken (`{service}_up`, `{service}_requests_total`, `{service}_request_duration_seconds`, `{service}_errors_total`) pro Service exportiert?
- Folgen die Ports der Konvention 9090+N — und ist die Zuordnung Service→Port in `observability.md` dokumentiert?
- Sind Histogram-Buckets fuer `request_duration_seconds` sinnvoll gewaehlt (nicht Default-Buckets blind uebernommen)?
- Werden die Metrik-Namen konsequent mit dem Service-Prefix versehen (kein Namespace-Konflikt)?

#### 5.3 Alert-Rules-Invariante

**Geforderte Aspekte:**
- Prometheus-Alert-Rule-Datei `observability/alerts/<service>.yml` pro Service vorhanden
- Drei Pflicht-Alerts pro Service: `{service}_down`, `{service}_error_rate_high`, `{service}_p95_slow`
- Routing-Receiver konfiguriert (z.B. Telegram, Slack, Email) und im Alertmanager aktiv
- Validierung: `promtool check rules observability/alerts/*.yml` exit 0

**Pruef-Fragen:**
- Existiert pro Service eine Datei `observability/alerts/<service>.yml` mit den 3 Pflicht-Alerts (`{service}_down`, `{service}_error_rate_high`, `{service}_p95_slow`)?
- Sind die Alert-Schwellwerte begruendet dokumentiert (nicht aus dem Bauch — Bezug zum Latenz-Budget aus §4 Performance)?
- Ist mindestens ein Routing-Receiver konfiguriert (Telegram / Slack / Email) und ein Test-Alert ist tatsaechlich beim Empfaenger angekommen?
- Gibt `promtool check rules observability/alerts/*.yml` exit 0 zurueck (Validierung im CI verankert)?
- Sind `for:`-Klauseln gesetzt um Flapping zu vermeiden (kein Alert auf Single-Scrape-Spike)?

### 6. Maintainability

**Pruefen bei:** Jeder Aenderung.

- Code-Duplikation: Gibt es schon eine aehnliche Funktion, die wiederverwendet werden kann?
- Config-SSoT: Alle relevanten Konstanten in `lib/config.js`? Keine Hardcodes?
- Doku muss aktualisiert werden — welche Files (aus `ARCHITECTURE_DESIGN.md §9`)?
- Verstaendlichkeit: Versteht man den Code ohne Zusatzkontext? Naming aussagekraeftig? Kommentare bei nicht-offensichtlichen Stellen?
- Hinweis: Test-Disziplin liegt jetzt in §7 Testability — diese Dimension fokussiert auf Lesbarkeit + SSoT.

### 7. Testability

**Pruefen wenn:** Jede neue Funktion mit Logik (kein reiner Glue-Code), neue Schnittstelle zwischen Modulen, geaenderter kritischer Pfad.

> **Schrader (Code Crash, Test-Pyramide):** "KI generiert Tests, Mensch waehlt Faelle." — Die Disziplin ist nicht "viele Tests", sondern "die richtigen Faelle abdecken". Coverage-Zahl allein ist eine Schein-Sicherheit.

**Metriken:**
- **Coverage + Change Value** — Coverage-Quote auf den **neu hinzugefuegten Zeilen** (nicht Gesamt-Coverage). BOO-15 setzt hier den Gate auf >=80% fuer staged Diff.
- **Pass-Rate** — Anteil gruener Test-Laeufe ueber Zeit. Roter Trend = entweder flaky Tests oder echter Regressions-Trend.

**Praktiken:**
- **Test-Pyramide:** Unit-Tests (schnell, isoliert) > Contract-Tests (Modul-Schnittstellen) > Integration-Tests (Ende-zu-Ende, langsam, wenige).
- **Contract Testing zwischen Modulen:** Bei jeder externen API + bei jedem Sub-System-Aufruf einen Contract-Test, der das Schema einfriert. So fallen Breaking Changes beim Upstream-Provider sofort auf.
- **Test-Faelle vom Menschen kuratiert:** KI darf Test-Code generieren — die Auswahl der zu testenden Faelle (Edge Cases, Failure Modes, Sicherheits-Faelle) gehoert dem Operator.

**Pruef-Fragen:**
- Wurden Tests fuer den geaenderten Pfad geschrieben (Unit / Contract / Integration je nach Risiko)?
- Coverage auf neuem Code in akzeptablem Bereich (Default-Gate >=80%)?
- Edge Cases bewusst gewaehlt (nicht nur Happy Path)?
- Bei externen Schnittstellen: Contract-Test vorhanden, der das Response-Schema verifiziert?
- Pass-Rate stabil — kein "schon laenger rot, ignorieren wir"?

### 8. Scalability

**Pruefen wenn:** Neuer Service / API / Daemon, Hinzunahme von State, neue externe API, Aenderung am Connection-Pool, neuer Background-Job.

> **Schrader (Code Crash, Kap. 3 §Production Readiness — Skalierbare Anwendungen):** "Skalierbarkeit ist eine Architektureigenschaft, keine Hoffnung — nicht ohne Rewrite nachruestbar." (paraphrasiert) — Skalierbarkeit ist nicht "wir sind eh klein", sondern eine Eigenschaft, die spaeter nicht ohne Rewrite nachruestbar ist. Auch Prototypen muessen skalierbar gedacht sein.

**4 Pro-Invarianten (alle pruefen):**

1. **Stateless** — Kein in-Memory Session-State im Service-Prozess. State lebt in externem Store (Redis, DB, Queue). Pruefung: grep nach `globalThis.sessions`, `this.cache = new Map()`, modul-globale Mutables.
2. **Horizontal skalierbar** — Service kann als N parallel laufende Instanzen deployed werden. Keine lokalen Write-Locks, keine lokalen Cron-Jobs ohne Election (z.B. via Redis SETNX oder DB-Lock-Tabelle). Pruefung: ADR vorhanden fuer "Was passiert bei 3 Instanzen?".
3. **12-Factor-konform** (die 5 wichtigsten) — Config via Env-Vars (nicht File), Dependencies explizit deklariert, Prozess disposable (sauber startbar/stoppbar), Logs als stdout-Stream, Backing-Services via URL (keine Hardcodes).
4. **Async-entkoppelt** bei I/O-heavy Work — Keine sync-blocking Calls > 100ms im Request-Pfad. Long-running Work via Queue (BullMQ/Celery/RabbitMQ/SQS). Request-Pfad ist immer schnell.

**4 Anti-Patterns als Warnsignale:**

- **Lokaler Cache ohne Invalidierung zwischen Instanzen** — `Map`/`dict` im Process-Memory, keine Invalidierung bei N>1 Instanzen. Statt: Redis-Cache mit TTL oder Cache-Aside-Pattern.
- **File-basierte Locks** — `.lock`-Dateien auf Filesystem als Mutex. Skaliert nicht ueber Instanzen. Statt: Redis SETNX mit Expiry oder DB-Row-Locking.
- **Scheduler im Web-Prozess** — Cron-Job direkt im Express-/FastAPI-Prozess, nicht als separater Worker. Bei N>1 Instanzen feuert der Job N-mal. Statt: dedizierter Worker mit Leader-Election (z.B. via Bull-Queue + Redis).
- **Shared Memory zwischen Requests** — Request-Daten in Modul-globalen Variablen, durchschiebbar zwischen Requests. Race Conditions bei parallelen Requests, leakt zwischen Sessions. Statt: alles im Request-Scope ODER explizit in externem Store.

**Pruef-Fragen:**

- Laeuft der Service mit `N=3` parallel ohne Code-Aenderungen — oder gibt es Hardcodes/Locks/Singletons, die das verhindern?
- Sind alle 5 zentralen 12-Factor-Punkte (Config, Dependencies, Disposability, Logs, Backing-Services) erfuellt?
- Hat jeder I/O-heavy Code-Pfad eine Async-Entkopplung — oder gibt es noch sync-blocking Calls > 100ms im Request-Pfad?
- Ist State extern, oder gibt es noch in-Memory-State, der bei Restart/Re-Deploy verloren geht?
- Wenn der Cache lokal ist (Map/dict): wie wird er zwischen Instanzen invalidiert? Wenn gar nicht: ist die Stale-Daten-Toleranz dokumentiert?

### 9. KI-Tauglichkeit

**Pruefen wenn:** Jede Story. KI-Tauglichkeit ist eine Grundvoraussetzung fuer KI-gestuetzte Entwicklung — nicht erst beim System-Review pruefen.

> **Schrader (Code Crash, Kap. 4 §SYSTEM Z. 1806-1808 + §"Woran scheitert KI-gestuetzte Entwicklung" Z. 1485-1510):** "Die 4 Prinzipien sind Voraussetzung, keine Option." — Wer sie erst im Review prueft, hat sie zu spaet verankert. `/bootstrap` verankert sie proaktiv (BOO-24), `/architecture-review` validiert sie reaktiv.
>
> Referenz: `intentron/references/ki-architektur-prinzipien.md` (Single Source of Truth fuer Prinzipien + Anti-Patterns).

**8 Checks (4 Prinzipien + 4 Anti-Patterns):**

#### 9.1 P1 — Kleine, unabhaengige Module

**Geforderte Aspekte:**
- Jedes Modul (Datei/Klasse/Package) hat max. 500 LOC (ohne Tests + Kommentare)
- Jedes Modul hat genau einen klar benennbaren Zweck — der Modulname enthaelt hoechstens ein Verb
- Keine zirkulaeren Imports (ESLint `import/no-cycle` oder `pylint` als Gate aktiv)
- Abhaengigkeiten fliessen immer nach aussen (Hub-and-Spoke) — kein Shared State zwischen Modulen

**Pruef-Fragen:**
- Liegt jedes Modul unter 500 LOC (messbarer Check: `cloc --by-file` oder `wc -l`)? Ist fuer Ausnahmen ein ADR vorhanden?
- Hat jedes Modul genau einen Zweck — oder enthaelt es heterogene Verantwortlichkeiten ("fetch AND parse AND persist")?
- Zeigt der Import-Graph zirkulaere Abhaengigkeiten — und blockiert ESLint `import/no-cycle` (oder aequivalent) diese bereits?
- Gibt es Shared Global State zwischen Modulen (globale Variablen, Singleton-Abhaengigkeiten ohne DI) — oder sind alle Abhaengigkeiten explizit via Interface?

**Status-Grenze:** OK wenn alle Module <500 LOC und kein zirkulaerer Import. Warnung bei 1–2 Ausnahmen mit ADR. Kritisch bei Modulen >500 LOC ohne ADR oder zirkulaeren Imports ohne Gate.

#### 9.2 P2 — Explizite Interfaces

**Geforderte Aspekte:**
- Starke Typen an allen Modulgrenzen (TypeScript-Interfaces, Python-Dataclasses, OpenAPI-Schemas)
- Jede public Funktion hat mindestens eine Doc-Zeile (JSDoc `@param`/`@returns` oder Python-Docstring)
- Jede Architekturentscheidung hat ein ADR in `ARCHITECTURE_DESIGN.md §3`
- Keine Magic Strings / Magic Numbers ohne benannte Konstante und Kommentar

**Pruef-Fragen:**
- Sind alle Modulgrenzen typisiert (TypeScript-Interface, Python-Dataclass, JSON-Schema) — oder gibt es `any`-Typen / ungetypte Dictionaries an Schnittstellen?
- Hat jede public Funktion eine kurze Doc-Zeile die beschreibt was sie tut und welche Parameter sie erwartet?
- Ist jede nicht-offensichtliche Architekturentscheidung als ADR in `ARCHITECTURE_DESIGN.md §3` dokumentiert — oder existieren Entscheidungen nur in Commit-Messages oder "war halt so"?
- Gibt es Magic Strings / Magic Numbers ohne benannte Konstante — versteht man den Code ohne Zusatzwissen?

**Status-Grenze:** OK wenn alle Grenzen typisiert und ADRs vollstaendig. Warnung bei einzelnen fehlenden Docs. Kritisch bei ungetypten Modulgrenzen oder fehlenden ADRs fuer wesentliche Entscheidungen.

#### 9.3 P3 — Testbarkeit als Grundvoraussetzung

**Geforderte Aspekte:**
- Unit-Tests fuer alle kritischen Pfade (nicht nur Happy Path)
- Contract-Tests an jeder externen Schnittstelle (einfrieren des Response-Schemas)
- Integrations-Tests fuer End-to-End-Flows (wenige, langsam — aber vorhanden)
- Coverage-Gate (BOO-15): >=80% auf staged Diff — gemessen via `c8` (Node) oder `pytest-cov` (Python)
- Tests laufen isoliert ohne externe Abhaengigkeiten (kein echtes Netz in Unit-Tests)

**Pruef-Fragen:**
- Gibt es Unit-Tests fuer den geaenderten Pfad — und decken sie mehr als nur den Happy Path ab (Edge Cases, Failure Modes)?
- Existiert fuer jede externe API / jeden Modul-Call ein Contract-Test, der das Response-Schema einfriert (faellt bei Breaking-Change)?
- Laufen die Tests ohne Netz / ohne echte DB — oder haengen Unit-Tests von externen Services ab (macht sie langsam und fragil)?
- Liegt die Coverage auf neuem Code >= 80% (BOO-15 Gate) — oder gibt es ungetestete neue Pfade?
- Ist die Pass-Rate stabil — oder gibt es flaky Tests die "manchmal rot sind aber wir ignorieren das"?

**Status-Grenze:** OK wenn Coverage >=80% auf neuem Code und Tests laufen isoliert. Warnung bei 60–80%. Kritisch bei <60% oder fehlenden Contract-Tests fuer externe Schnittstellen.

#### 9.4 P4 — Von Anfang an observable

**Geforderte Aspekte:**
- Strukturiertes JSON-Logging mit 6 Pflicht-Feldern: `timestamp`, `level`, `service`, `trace_id`, `message`, `context`
- Kein `console.log` / `print` im Production-Code (ESLint `no-console` als Error aktiv)
- `/metrics`-Endpoint im Prometheus-Format pro Service (BOO-14)
- 3 Pflicht-Alerts pro Service: `_down`, `_error_rate_high`, `_p95_slow` (BOO-14)
- Neuer Code-Pfad erhaelt einen Log-Eintrag bei Entry und Exit (Trace-Id propagiert)

**Pruef-Fragen:**
- Loggt der neue Code-Pfad strukturiert (JSON) mit den 6 Pflicht-Feldern — oder wird `console.log("debug")` verwendet?
- Propagiert jeder eingehende Request eine `trace_id` durch alle Modul-Aufrufe — laesst sich ein Fehler laufend nachverfolgen?
- Sind die `/metrics`-Endpunkte aller betroffenen Services aktuell (neue Metriken fuer neue Pfade)? (BOO-14)
- Sind Alert-Rules fuer den neuen Pfad definiert falls er stumm fehlschlagen kann?
- Wuerde man merken wenn dieser neue Pfad im Production-Betrieb kaputt geht — oder ist er "stumm"?

**Status-Grenze:** OK wenn Logging strukturiert und `/metrics` aktuell. Warnung bei fehlenden Alert-Rules. Kritisch bei `console.log` in Production-Code oder fehlendem `trace_id`.

#### 9.5 AP1 — Gewachsener Monolith (Check)

**Geforderte Aspekte:**
- Kein Modul > 500 LOC ohne ADR
- Kein Modul mit mehreren Zwecken (Namens-Check: mehr als ein Verb?)
- Kein Shared State zwischen Modulen ohne explizites DI-Pattern

**Pruef-Fragen:**
- Wieviele Module liegen aktuell ueber 500 LOC (Ergebnis aus §9.1)? Hat sich die Zahl gegenueber dem letzten Review erhoeht?
- Gibt es Module deren Name zwei oder mehr Verben enthaelt ("fetchAndParseTrades") — Signal fuer gemischte Verantwortlichkeiten?
- Gibt es globale Variablen / Singleton-Objekte die von mehr als einem Modul schreibend verwendet werden?

**Status-Grenze:** OK wenn keine Module >500 LOC ohne ADR. Warnung bei 1–2 Ausnahmen mit ADR. Kritisch bei Wachstum ohne ADR oder Monolith-Trend (Zahl steigt jedes Review).

#### 9.6 AP2 — Implizites Wissen (Check)

**Geforderte Aspekte:**
- Keine Architekturentscheidungen die nur im Kopf von Personen leben
- Kein `console.log` / `print` im Production-Commit
- Keine Magic Strings / Zahlen ohne Kommentar

**Pruef-Fragen:**
- Koennte ein neuer Operator (oder KI-Assistent ohne Kontext) die letzten 3 wesentlichen Architektur-Entscheidungen aus `ARCHITECTURE_DESIGN.md §3` rekonstruieren — oder braucht er "Peter"?
- Enthaelt der PR / Commit `console.log`-Zeilen im Production-Code?
- Gibt es unkommentierte Magic Strings / Numbers in den geaenderten Dateien?

**Status-Grenze:** OK wenn ADRs vollstaendig und kein `console.log` in Prod. Warnung bei fehlenden Docs fuer triviale Entscheidungen. Kritisch bei fehlenden ADRs fuer wesentliche Entscheidungen oder `console.log` in Prod-Code.

#### 9.7 AP3 — Keine echten Modulgrenzen (Check)

**Geforderte Aspekte:**
- Kein direkter DB-/Store-Zugriff aus Modulen die nicht dafuer zustaendig sind
- Keine zirkulaeren Imports
- Keine ungetypten Modulgrenzen (`any`, ungetypte Dictionaries, dynamische Attribute)

**Pruef-Fragen:**
- Greift der neue Code direkt auf die DB / den Store zu — oder geht er ueber das dafuer zustaendige Modul?
- Zeigt `eslint --rule 'import/no-cycle: error'` (oder aequivalent) Fehler fuer den neuen Code?
- Existieren ungetypte Grenzen zwischen dem neuen Modul und seinen Aufrufer (kein `any`, kein ungetyptes `dict`, kein dynamisches Attribut)?

**Status-Grenze:** OK wenn kein Grenz-Verletzung gefunden. Warnung bei einzelnem `any`-Typ mit Kommentar. Kritisch bei direktem DB-Zugriff aus falschem Modul oder zirkulaeren Imports.

#### 9.8 AP4 — Tests als Nachgedanke (Check)

**Geforderte Aspekte:**
- Tests wurden vor oder parallel zum Code geschrieben (kein "tests spaeter")
- Coverage auf neuem Code >=80% (BOO-15)
- Mindestens ein Test fuer den wichtigsten Failure-Mode des neuen Pfads

**Pruef-Fragen:**
- Sind die Tests im selben PR wie der Code — oder kommen sie als Follow-up-PR "wenn wir Zeit haben"?
- Liegt Coverage auf dem staged Diff >= 80% (BOO-15 Gate) — und gibt es einen gruenen Gate-Run?
- Gibt es mindestens einen Test der einen Fehler-Fall testet (nicht nur Happy Path)?
- Sind die Test-Faelle vom Operator bewusst gewaehlt (Edge Cases, Sicherheits-Faelle) — oder wurden sie blind von der KI generiert ohne Review?

**Status-Grenze:** OK wenn Tests im selben PR und Coverage >=80%. Warnung bei 60–80%. Kritisch bei <60% oder Tests komplett als Follow-up.

---

## Optional-Add-ons (wenn im Bootstrap aktiviert)

### 9. Privacy / DSGVO

**Pruefen wenn:** Neue externe Datenweitergabe, personenbezogene Daten im Flow, Aenderung an Redaktions-Pipeline.

- Datenflussgrenzen explizit (Tier 0/1/2 oder analoges Modell)
- Vor jedem Cloud-Call: Redaktion von PII (Emails, Tokens, IBANs, Telefonnummern)
- Audit-Log bei Tier-Wechsel / Datenweitergabe
- Offline-Fallback wenn Privacy-Tier 0 erzwungen
- Betroffenenrechte: Loeschung / Auskunft implementierbar

### 10. Cost Efficiency

**Pruefen wenn:** Neue API mit Kosten, LLM-Aufrufe, neue SaaS-Abhaengigkeit.

- API-/Token-Kosten pro Call abgeschaetzt; Daily-Limit definiert
- Free-Tier ausreichend fuer Produktionslast?
- Cache-Strategie fuer wiederholte Queries
- Alternativen (kostenlos, Open-Source) geprueft
- Rate-Limit-Budget realistisch geplant

### 11. Signal Quality

**Pruefen wenn:** Neuer Signal-/Prediction-Agent, geaenderte Gewichtung, neue Datenquelle, ML-Modell-Aenderung.

- Verbessert das Feature die Entscheidungsqualitaet messbar?
- Evaluation-Metrik definiert (Precision/Recall/F1/custom)?
- Feedback-Loop vorhanden (Attribution, Active Learning)?
- Korrelation mit bestehenden Signalen (Vermeidung von Redundanz / Double-Counting)?
- Backtesting / Validation-Strategie vor Production?

### 12. Compliance

**Pruefen wenn:** Regulierte Branche, neue externe Datenverarbeitung, neue gespeicherte PII-Kategorie.

- Gesetzliche Anforderungen identifiziert (DSGVO, HIPAA, SOX, etc.)?
- Audit-Trail fuer kritische Aktionen vorhanden?
- Data-Retention-Policy eingehalten?
- Verantwortliche Rolle (DPO, Compliance Officer) involviert?
- Dokumentation fuer Auditoren in `compliance/` aktuell?

---

## Verwendung im `/architecture-review`

Bei jedem Review:
1. Aktive Dimensionen aus `ARCHITECTURE_DESIGN.md §3 Quality Attributes` lesen
2. Fuer jede aktive Dimension: Pruef-Fragen durchgehen, Status je Bereich vermerken (OK / Warnung / Kritisch)
3. Story-spezifischer Scope: nur Dimensionen pruefen die durch die Aenderung beruehrt sind
4. System-weiter Scope (`/architecture-review --system`): alle aktiven Dimensionen durchgehen

---

## Domain-Beispiele (nur als Referenz, nicht Default)

Die obigen "Pruefen wenn"-Trigger sind generisch. Konkrete Projekt-Auspraegungen:

- **Voice-Assistant:** "flock", "Daemon-Restart" → gilt fuer den Wake-Word-Listener. "Journal" → SQLite FTS5 Memory.
- **Trading-System:** "flock", "PID" → gilt fuer Agent-Daemons. "Journal" → JSONL + Brain-DB. Dual-Write ist Pflicht.
- **Backend-Service:** "Long-Running-Connection" → WebSocket / SSE. "Rate-Limit" → Upstream-API-Quota.
- **Research-Projekt:** "Reproduzierbarkeit" → Prompt-Versioning, Seed-Fixierung.

Projekt-spezifische Details gehoeren in das jeweilige `ARCHITECTURE_DESIGN.md` + `SYSTEM_ARCHITECTURE.md` — nicht in diese generische Checkliste.
