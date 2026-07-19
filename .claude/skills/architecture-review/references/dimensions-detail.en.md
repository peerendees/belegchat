---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architecture Dimensions — Detail (for /architecture-review)

Detail questions per dimension, with "check when" trigger conditions. Generically phrased — project-specific examples as optional hints.

**Structure:** 8 standard dimensions + 4 optional add-ons (activated in bootstrap Block A.4, visible in `ARCHITECTURE_DESIGN.md §3`).

**Standard vs. add-on:** Standard dimensions apply to **every** project — they are universal software properties safeguarded in any AI-assisted build. Add-ons are context-specific and activated in bootstrap when the project needs them (regulated industry, cost-heavy APIs, signal processing).

## Standard dimensions

### 1. Reliability

**Check when:** New component, external API dependency, daemon / long-running process, critical business path.

> **Schrader (Code Crash, Ch. 4 §Run the System Pillar 6 Reliability):** "Reliability is not a feeling but a mandatory check against invariants." — Reliability is not "it's running somehow", but a hard mandatory check against five invariants: idempotency, retry with backoff, circuit breaker per external dependency, graceful degradation, SLO + error budget. Templates: bootstrap skill `references/file-templates.md` §lib/idempotency, §lib/retry, §lib/circuit-breaker, §docs/SLO.md.

**General hygiene (always check):**

- Graceful degradation: does the system continue if this feature fails?
- Kill switch / feature flag: can the feature be disabled via config without deployment?
- Retry strategy: transient errors retried with backoff?
- Timeout: every external call has a sensible timeout?
- Restart behavior (for daemons): locking (flock / PID file) against double-start? Backoff on crash loop?

**Mandatory invariants (BOO-25):** During review the reviewer MUST validate the following five invariants against the project's `docs/SLO.md`, `lib/idempotency.{js,py}`, `lib/retry.{js,py}` and `lib/circuit-breaker.{js,py}`. Per invariant: status (OK / warning / critical) in the report.

#### 1.1 Idempotency invariant

**Required aspects:**
- All write endpoints (POST/PUT/PATCH/DELETE) accept an `Idempotency-Key` header (UUID v4)
- Server persists request hash + response per key with 24h TTL (store: `lib/idempotency.{js,py}`)
- Same key + same body -> cached response (replay without a second side effect)
- Same key + diverging body -> HTTP 422 (conflict, no silent overwrite)
- Key format and TTL recorded as ADR in `ARCHITECTURE_DESIGN.md §3`

**Check questions:**
- Do all write endpoints (POST/PUT/PATCH/DELETE) accept an `Idempotency-Key` header — and do critical paths deliberately reject requests without one?
- Does `lib/idempotency.{js,py}` persist request hash + response with 24h TTL — and is the store (Redis / DB) justified by an ADR?
- Does a replay with same key + same body return the cached response (no duplicate side effect)?
- Does a replay with same key + diverging body return HTTP 422 (conflict) — and not a silent overwrite?
- Is the key format (UUID v4) documented in the endpoint contract, and are invalid keys rejected with HTTP 400?

#### 1.2 Retry+backoff invariant

**Required aspects:**
- All downstream calls (DB, external API, message bus) are wrapped by the retry helper `lib/retry.{js,py}` — no ad-hoc `for` loop in call-site code
- Maximum 3 attempts, exponential backoff with jitter (default 100ms base, factor 2)
- Status-code filter: only 5xx, timeout, connection-reset are retried — NO retry on 4xx
- No retry on idempotency conflicts (HTTP 422 from §1.1) — the conflict is final
- Retry attempts are logged via the structured logger (BOO-14, §5.1) with `attempt`, `delay_ms` and final status

**Check questions:**
- Are all downstream calls (DB, external API, message bus) wrapped in `lib/retry.{js,py}` — or do ad-hoc retry loops still exist in call-site code?
- Is the retry count capped at 3 and does the backoff use jitter (against thundering herd) instead of a fixed delay?
- Does the retry helper filter status codes correctly (only retry 5xx / timeout / connection-reset) — or is a 4xx retried by mistake?
- Is HTTP 422 from the idempotency check (§1.1) deliberately NOT retried — or does the system loop itself into a permanent conflict?
- Are retry attempts logged structurally (`attempt`, `delay_ms`, final status) — can a flaky downstream be traced via the logs?

#### 1.3 Circuit-breaker / bulkhead invariant

**Required aspects:**
- One breaker per external dependency (no global mega breaker that opens every path at once)
- Default config: `errorThreshold` 50%, `resetTimeout` 30s, `volumeThreshold` 10 — per-service deviations justified via ADR
- State changes (Closed / Open / Half-Open) are logged via the structured logger (BOO-14, §5.1)
- Bulkhead pattern documented where appropriate: connection-pool limits per service / per external dependency so a slow downstream cannot block the entire worker pool
- `lib/circuit-breaker.{js,py}` is used consistently — no parallel home-grown implementation

**Check questions:**
- Does each external dependency have its own breaker — or do multiple downstreams share a global breaker (anti-pattern)?
- Are the default values (`errorThreshold` 50%, `resetTimeout` 30s, `volumeThreshold` 10) honored — deviations justified via ADR?
- Are state changes (Closed / Open / Half-Open) visible in the structured log (§5.1) — can the open window per breaker be reconstructed?
- Are bulkhead limits (connection-pool limits per service) documented — could a slow downstream monopolize the worker pool?
- Is `lib/circuit-breaker.{js,py}` used everywhere — or do parallel home-grown implementations exist that make behaviour unpredictable?

#### 1.4 Graceful-degradation invariant

**Required aspects:**
- Per feature path, fallback behavior is documented: which path falls first, which fallback kicks in, which path must stay live
- Kill switch / feature flag per critical path — disablement without deployment is possible
- "Read-only mode" when the write DB is unreachable — read paths stay available
- Cached-response fallback when upstream does not answer — stale data flagged with `X-Stale: true` header
- Degradation behavior documented in `docs/SLO.md` as part of the service contract (what does "available" mean when a subsystem is down?)

**Check questions:**
- Is it documented per feature path which path falls first and which fallback kicks in — or is degradation undefined ("we'll see")?
- Does each critical path have a kill switch / feature flag that works without deployment — and is the switch actually tested (not just documented)?
- Does the system switch into a "read-only mode" when the write DB is unreachable — do read paths remain usable?
- Are cached-response fallbacks flagged with `X-Stale: true` (or equivalent) — can clients tell that the data is not fresh?
- Is degradation behavior part of the service contract in `docs/SLO.md` — or is "available" implicitly read as "everything works"?

#### 1.5 SLO + error-budget invariant

**Required aspects:**
- `docs/SLO.md` exists, is maintained and referenced from `ARCHITECTURE_DESIGN.md §6`
- Availability target per service explicit (e.g. 99.9 / 99.95 / 99.99) — no "as much as possible"
- Error-budget table per quarter with consumption tracker (window, incidents, budget consumed, budget remaining)
- Three SLIs per service: latency P95, availability, error rate — each with measurement method (source: §5.2 metrics endpoint)
- Review cadence (default monthly in `/sprint-review`) documented — error-budget consumption is checked regularly, not only at escalation

**Check questions:**
- Does `docs/SLO.md` exist and is it referenced from `ARCHITECTURE_DESIGN.md §6` — or does it live as an orphan file?
- Is the availability target per service explicit (e.g. 99.9 / 99.95 / 99.99) — or does it say "high availability"?
- Does `docs/SLO.md` carry an error-budget table per quarter with a consumption tracker (incidents, budget consumed, budget remaining) — and is the latest entry younger than the last sprint?
- Are the three SLIs (latency P95, availability, error rate) defined per service and mapped to concrete metrics from §5.2 (no "we'll know what to measure")?
- Is a review cadence (default monthly in `/sprint-review`) set — or does the error budget only get attention once it is already exhausted?

### 2. Data Integrity

**Check when:** Write access to persistent data sources (DB, files, config), state that survives restart.

- SSoT respected? Is the authoritative data source clear and documented?
- Atomic writes where needed (write-then-rename, DB transactions)?
- Race conditions on parallel access considered?
- Idempotency on retries ensured (no duplicate side effect)?
- Backup / recovery path for critical data defined?

### 3. Security

**Check when:** New external API, new webhook endpoint, external input, new `.env` variable, change to auth logic.

- API keys / secrets only in `.env`, never in code, never in logs
- Input validation on all external entries (user input, webhooks, APIs)
- Token/key sanitization in error logs
- On inbound webhooks: HMAC signing, replay protection, rate limit, body size limit
- Principle of least privilege: tool/file access reduced to the minimum

### 4. Performance

**Check when:** New API with rate limits, long-running connection (WebSocket, SSE), memory-intensive ops, tight latency requirements.

> **Schrader (Code Crash, Ch. 3 §Production Readiness Gate 3):** "Performance without a baseline is faith, not architecture." — Performance is not "feels fast", but a hard mandatory check against three invariants: a baseline exists, the baseline trend stays stable, and a CI gate blocks regressions. Templates: bootstrap skill `references/file-templates.md` §perf-baseline.json + §perf.yml.

**General hygiene (always check):**

- Latency budget for the use case known and tested
- Rate limits of external APIs documented and respected, buffer planned
- Memory usage: no unbounded buffering, cleanup strategy
- Long-running connections: reconnect logic, heartbeat, clean shutdown
- Caching where useful (semantic, TTL-based, cache invalidation defined)

**Mandatory invariants (BOO-16):** During review the reviewer MUST validate the following three invariants against the project's `journal/perf-baseline.json` and `.github/workflows/perf.yml`. Per invariant: status (OK / warning / critical) in the report.

#### 4.1 Baseline-existence invariant

**Required aspects:**
- `journal/perf-baseline.json` exists and is valid JSON
- Per service: an entry with the mandatory fields `p50_ms`, `p95_ms`, `p99_ms`, `req_per_sec`, `recorded_at` (ISO 8601), `commit_sha`, `bench_tool`
- Latest `recorded_at` is no older than 30 sprints (otherwise the baseline counts as stale and must be re-measured)
- Bench skeleton present per service: `bench/<service>.bench.js` (Node, autocannon-based) OR `bench/<service>_bench.py` (Python, pytest-benchmark-based)

**Check questions:**
- Does `journal/perf-baseline.json` exist and contain an entry per declared service with all 7 mandatory fields (`p50_ms`, `p95_ms`, `p99_ms`, `req_per_sec`, `recorded_at`, `commit_sha`, `bench_tool`)?
- Is the latest `recorded_at` of every service younger than 30 sprints — or is there an ADR justifying the staleness?
- Does every service have a runnable bench skeleton at `bench/<service>.bench.js` (Node) or `bench/<service>_bench.py` (Python) — and does it run without code changes?
- Is `bench_tool` consistently set (e.g. `autocannon` or `pytest-benchmark`) and does the tool match the service stack?
- Does each entry's `commit_sha` reference a commit that actually exists on the main line (no orphan branch hash)?

#### 4.2 Baseline-trend invariant

**Required aspects:**
- P95 growth across the last N=10 commits to `journal/perf-baseline.json` <= 10% (green corridor)
- Growth > 10% and < 20%: architectural hint in the report — investigate code vs. infra cause (new dependency, changed bench host, background load?)
- Growth >= 20%: hard finding (status critical). Should already be blocked by the CI gate (§4.3) — if it is not, the gate is broken
- Trend is computed per service separately (no aggregated overall mean that hides outliers)

**Check questions:**
- Does P95 growth per service across the last 10 `perf-baseline.json` commits stay below 10% (status OK)?
- For growth 10–20%: does the report document whether the cause is code (new logic, inefficient query) or infra (bench host, neighbour load)?
- For growth >= 20%: why was it merged at all — is there an active `perf-override` (see §4.3) or is the CI gate disabled?
- Is the trend evaluated per service individually (not aggregated) — and is there at least one service that is dragging the average down?
- Is the bench environment constant (same runner, same load-generator config) — or could the trend be explained by measurement drift?

#### 4.3 Gate invariant

**Required aspects:**
- `.github/workflows/perf.yml` exists and runs on every PR that touches code paths
- Workflow is wired into branch protection as a required status check — or there is an ADR documenting why not (e.g. early phase, no deployment pressure)
- 3-threshold logic: P95 factor <= 1.05 → pass, 1.05–1.20 → warning (merge possible, visible), > 1.20 → block (merge only via override)
- Override mechanism documented: PR label `perf-override` OR commit trailer `Perf-Override: <reason>`
- Override log lives at `journal/reports/perf/overrides.log` — every override leaves date, PR/commit, reason

**Check questions:**
- Does `.github/workflows/perf.yml` exist and does the workflow trigger on relevant PRs (not just `main` push)?
- Is the `perf` check active as a required status check in branch protection — or is there an ADR with rationale why not?
- Is the 3-threshold logic (<=1.05 pass / 1.05–1.20 warning / >1.20 block) actually encoded in the workflow rather than only documented?
- Are the latest entries in `journal/reports/perf/overrides.log` traceable (PR link, reason, follow-up obligation)?
- Is the override mechanism used with discipline (no "we override every block because the gate is annoying") — or has the gate effectively been disabled?

### 5. Observability

**Check when:** Any feature that could silently fail, new external system, new daemon.

> **Schrader (Code Crash, ch. 3 §Observability + ch. 4 Pillar 3):** "What is not observed is not productive." — Observability is not "we log something somewhere", but a hard mandatory check against three invariants. Templates: bootstrap skill `references/file-templates.md` §observability.md.

**General hygiene (always check):**

- Structured logging with sensible log levels
- No raw API response in logs (risk of key/token leak)
- Metrics for important state changes (counter, histogram)
- Self-healing check needed (if self-healing agent active)?

**Mandatory invariants (BOO-14):** During review the reviewer MUST validate the following three invariants against the project's `observability.md` and `observability/alerts/`. Per invariant: status (OK / warning / critical) in the report.

#### 5.1 Logging-schema invariant

**Required aspects:**
- Structured JSON logging in place (no `console.log` / `print` in production code)
- Mandatory fields per log entry: `timestamp` (ISO 8601), `level`, `service`, `trace_id`, `message`, `context`
- Logger library recorded as an ADR (e.g. pino for Node.js, structlog for Python)

**Check questions:**
- Does every service emit structured JSON logging with the 6 mandatory fields (`timestamp`, `level`, `service`, `trace_id`, `message`, `context`)?
- Are there still `console.log` / `print` / `fmt.Println` calls in production code (anti-pattern)?
- Is the logger choice recorded as an ADR in `ARCHITECTURE_DESIGN.md §3` (with rationale)?
- Are log levels used with discipline (no `INFO` for errors, no `ERROR` for routine events)?
- Is the `trace_id` field set consistently — can a request be correlated across all services?

#### 5.2 Metrics-endpoint invariant

**Required aspects:**
- `/metrics` endpoint in Prometheus format per service
- Mandatory metrics per service: `{service}_up`, `{service}_requests_total`, `{service}_request_duration_seconds`, `{service}_errors_total`
- Port convention 9090+N (Prometheus itself on 9090, every service gets a unique sequential port)

**Check questions:**
- Does every service expose a reachable `/metrics` endpoint that returns Prometheus-conformant format?
- Are the 4 mandatory metrics (`{service}_up`, `{service}_requests_total`, `{service}_request_duration_seconds`, `{service}_errors_total`) exported per service?
- Do ports follow the 9090+N convention — and is the service→port mapping documented in `observability.md`?
- Are the histogram buckets for `request_duration_seconds` chosen sensibly (not just blind defaults)?
- Are metric names consistently prefixed with the service name (no namespace conflicts)?

#### 5.3 Alert-rules invariant

**Required aspects:**
- Prometheus alert-rule file `observability/alerts/<service>.yml` present per service
- Three mandatory alerts per service: `{service}_down`, `{service}_error_rate_high`, `{service}_p95_slow`
- Routing receiver configured (e.g. Telegram, Slack, email) and active in Alertmanager
- Validation: `promtool check rules observability/alerts/*.yml` exit 0

**Check questions:**
- Does every service have a file `observability/alerts/<service>.yml` with the 3 mandatory alerts (`{service}_down`, `{service}_error_rate_high`, `{service}_p95_slow`)?
- Are the alert thresholds documented with a rationale (not gut feel — referencing the latency budget from §4 Performance)?
- Is at least one routing receiver configured (Telegram / Slack / email) and has a test alert actually arrived at the receiver?
- Does `promtool check rules observability/alerts/*.yml` return exit 0 (validation wired into CI)?
- Are `for:` clauses set to avoid flapping (no alert on single-scrape spikes)?

### 6. Maintainability

**Check on:** Every change.

- Code duplication: is there already a similar function that can be reused?
- Config SSoT: all relevant constants in `lib/config.js`? No hardcodes?
- Docs to update — which files (from `ARCHITECTURE_DESIGN.md §9`)?
- Understandable without extra context? Naming expressive? Comments at non-obvious spots?
- Note: test discipline now lives in §7 Testability — this dimension focuses on readability + SSoT.

### 7. Testability

**Check when:** Every new function with logic (not pure glue code), new interface between modules, changed critical path.

> **Schrader (Code Crash, test pyramid):** "AI generates tests, humans choose the cases." — The discipline is not "many tests" but "covering the right cases". Coverage number alone is false safety.

**Metrics:**
- **Coverage + change value** — coverage on the **newly added lines** (not total coverage). BOO-15 sets the gate at >=80% on staged diff.
- **Pass rate** — share of green test runs over time. Red trend = either flaky tests or a real regression trend.

**Practices:**
- **Test pyramid:** unit tests (fast, isolated) > contract tests (module interfaces) > integration tests (end-to-end, slow, few).
- **Contract testing between modules:** for every external API and every sub-system call, a contract test that freezes the schema. Breaking changes from upstream surface immediately.
- **Test cases curated by humans:** AI may generate test code — selecting which cases to cover (edge cases, failure modes, security cases) belongs to the operator.

**Check questions:**
- Were tests written for the changed path (unit / contract / integration depending on risk)?
- Coverage on new code in acceptable range (default gate >=80%)?
- Edge cases deliberately chosen (not just the happy path)?
- For external interfaces: contract test in place verifying the response schema?
- Pass rate stable — no "been red for a while, we ignore it"?

### 8. Scalability

**Check when:** New service / API / daemon, addition of state, new external API, change to the connection pool, new background job.

> **Schrader (Code Crash, Ch. 3 §Production Readiness — Scalable applications):** "Scalability is an architectural property, not hope — you cannot retrofit it without a rewrite." (paraphrased) — Scalability is not "we're small anyway", but a property that cannot be retrofitted later without a rewrite. Even prototypes must be designed with scalability in mind.

**4 pro-invariants (check all):**

1. **Stateless** — no in-memory session state in the service process. State lives in an external store (Redis, DB, queue). Check: grep for `globalThis.sessions`, `this.cache = new Map()`, module-global mutables.
2. **Horizontally scalable** — service can be deployed as N parallel instances. No local write locks, no local cron jobs without election (e.g. via Redis SETNX or a DB lock table). Check: ADR present for "what happens with 3 instances?".
3. **12-Factor compliant** (the 5 most important) — config via env vars (not files), dependencies declared explicitly, process disposable (cleanly start/stop), logs as stdout stream, backing services via URL (no hardcodes).
4. **Async-decoupled** for I/O-heavy work — no sync-blocking calls > 100ms in the request path. Long-running work via queue (BullMQ/Celery/RabbitMQ/SQS). Request path stays fast.

**4 anti-patterns as warning signals:**

- **Local cache without invalidation across instances** — `Map`/`dict` in process memory, no invalidation when N>1 instances. Use instead: Redis cache with TTL or cache-aside pattern.
- **File-based locks** — `.lock` files on the filesystem as a mutex. Does not scale across instances. Use instead: Redis SETNX with expiry or DB row locking.
- **Scheduler in the web process** — cron job directly in the Express/FastAPI process, not as a separate worker. With N>1 instances the job fires N times. Use instead: dedicated worker with leader election (e.g. via Bull queue + Redis).
- **Shared memory between requests** — request data in module-global variables, leaking between requests. Race conditions on parallel requests, leaks across sessions. Use instead: everything in request scope OR explicitly in an external store.

**Check questions:**

- Does the service run with `N=3` parallel instances without code changes — or are there hardcodes/locks/singletons that prevent it?
- Are all 5 central 12-Factor points (config, dependencies, disposability, logs, backing services) satisfied?
- Does every I/O-heavy code path have async decoupling — or are there still sync-blocking calls > 100ms in the request path?
- Is state external, or is there still in-memory state that gets lost on restart/re-deploy?
- If the cache is local (Map/dict): how is it invalidated across instances? If not at all: is the stale-data tolerance documented?

---

## Optional add-ons (when activated in bootstrap)

### 9. Privacy / GDPR

**Check when:** New external data transfer, personal data in flow, change to redaction pipeline.

- Data-flow boundaries explicit (Tier 0/1/2 or analog model)
- Before every cloud call: redaction of PII (emails, tokens, IBANs, phone numbers)
- Audit log on tier change / data transfer
- Offline fallback when privacy tier 0 is enforced
- Data subject rights: deletion / access implementable

### 10. Cost Efficiency

**Check when:** New API with costs, LLM calls, new SaaS dependency.

- API/token costs per call estimated; daily limit defined
- Free tier sufficient for production load?
- Cache strategy for repeated queries
- Alternatives (free, open source) evaluated
- Rate-limit budget realistically planned

### 11. Signal Quality

**Check when:** New signal/prediction agent, changed weighting, new data source, ML model change.

- Does the feature measurably improve decision quality?
- Evaluation metric defined (precision/recall/F1/custom)?
- Feedback loop present (attribution, active learning)?
- Correlation with existing signals (avoid redundancy / double counting)?
- Backtesting / validation strategy before production?

### 12. Compliance

**Check when:** Regulated industry, new external data processing, new stored PII category.

- Legal requirements identified (GDPR, HIPAA, SOX, etc.)?
- Audit trail for critical actions present?
- Data retention policy respected?
- Responsible role (DPO, compliance officer) involved?
- Documentation for auditors in `compliance/` up to date?

---

## Usage in `/architecture-review`

For every review:
1. Read active dimensions from `ARCHITECTURE_DESIGN.md §3 Quality Attributes`
2. For each active dimension: go through check questions, note status per area (OK / Warning / Critical)
3. Story-specific scope: only check dimensions touched by the change
4. System-wide scope (`/architecture-review --system`): go through all active dimensions

---

## Domain examples (reference only, not default)

The "check when" triggers above are generic. Concrete project expressions:

- **Voice assistant:** "flock", "daemon restart" → applies to wake-word listener. "Journal" → SQLite FTS5 memory.
- **Trading system:** "flock", "PID" → applies to agent daemons. "Journal" → JSONL + brain DB. Dual-write is mandatory.
- **Backend service:** "long-running connection" → WebSocket / SSE. "Rate limit" → upstream API quota.
- **Research project:** "reproducibility" → prompt versioning, seed fixing.

Project-specific details belong in the project's `ARCHITECTURE_DESIGN.md` + `SYSTEM_ARCHITECTURE.md` — not in this generic checklist.
