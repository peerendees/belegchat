---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Web Release Live Quick-Check (AUDIT mode)

> 🌐 **Language:** English (this file) · [🇩🇪 Deutsch](live-release-check.md)

> **Plain language:** Every other gate reads the **code** before the merge. This check is the first
> look at the **running system** after deploy — using the same off-the-shelf means an attacker uses
> in the first minute: a handful of `curl` calls. No heavy tooling, no DAST, under ten minutes.

![Web release live quick-check: code gates before the merge vs. the blind spot after deploy and the 5 curl probes](../../docs/live-release-check.en.png)

This reference belongs to the `security-architect` **AUDIT mode** ([SKILL.md](../SKILL.en.md),
step 6). It runs **before a web release** and closes the blind spot between «code is reviewed» and
«system is live»: headers the reverse proxy swallows, framework banners the platform appends,
default routes left open in the prod build — a code gate sees none of it.

## Scope & authorization (mandatory, read first)

- **Own systems only.** These probes run exclusively against a deployment you own or for which you
  hold **written authorization**. Probing third-party hosts without permission is not allowed — the
  rate-limit check (below) is active traffic.
- **Prefer staging.** Run against the staging/pre-prod environment where one exists. The
  login-repeat check can trigger real lockouts — never against a third party's production account,
  never with someone else's credentials.
- **Read-mostly.** Four of the five checks are pure `GET` requests. Only check 5 actively sends
  repeated requests; keep it to your own environment and low repeat counts.

## Prerequisite

`curl` is enough. Set the target URL once:

```bash
BASE="https://staging.example.com"   # your deploy — with https://, no trailing slash
```

## The five checks

### 1. Expected-header comparison

Verifies that the security headers that *should* be set in code/framework actually **arrive** at the
edge — and that **giveaway headers** are stripped.

```bash
curl -sSI "$BASE/" | tr -d '\r'
```

Compare against the expected list (identical to REVIEW step 5 and
[security-template §11](../../bootstrap/references/security-template.en.md)):

| Header | Expected | Why in short |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | forces HTTPS, prevents downgrade |
| `Content-Security-Policy` | at least `default-src 'self'` | contains XSS/injection |
| `X-Content-Type-Options` | `nosniff` | no MIME sniffing |
| `X-Frame-Options` | `DENY` (or CSP `frame-ancestors`) | clickjacking protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | no referrer leak |
| `Permissions-Policy` | restrictive (e.g. `geolocation=(), camera=()`) | disables unused browser features |
| `Cross-Origin-Opener-Policy` | `same-origin` | isolates the browsing context (Spectre class) |

**Giveaway headers — must be absent:**

```bash
curl -sSI "$BASE/" | grep -iE '^(server|x-powered-by):'
```

`X-Powered-By` should not appear at all; `Server` should not name a precise version (`nginx` not
`nginx/1.25.3`). Both hand an attacker a free CVE map.

### 2. Root-endpoint disclosure

Some frameworks serve unwanted JSON with versions, route lists, or stack traces under `/` (or
health/info routes) in the prod build.

```bash
curl -sS "$BASE/" | head -c 400; echo
curl -sS -o /dev/null -w '%{content_type}\n' "$BASE/"
```

**Red:** `application/json` with framework/version fields, a route dump, or a stack trace on a route
that should be an HTML page or a deliberate API document.

### 3. `/.well-known/security.txt` (RFC 9116)

A public deploy should advertise a vulnerability reporting path.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "$BASE/.well-known/security.txt"
curl -sS "$BASE/.well-known/security.txt"
```

**Expected:** HTTP `200` with at least `Contact:` and `Expires:` (scaffold in
[security-template §11](../../bootstrap/references/security-template.en.md)). `404` = finding (low,
but part of OWASP Secure Headers hygiene).

### 4. Redirect-parameter probe (open redirect)

If a redirect parameter opens arbitrary external targets, that is a phishing building block.

```bash
curl -sS -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
  "$BASE/login?next=https://example.org/attacker"
```

**Red:** the `Location`/`redirect_url` points to the foreign domain (`example.org`). **Green:**
redirect only to a relative path / same origin, or rejection. Adapt the parameter name to your own
project (`next`, `redirect`, `returnTo`, `url` …).

### 5. Repeated login (rate-limit smoke test)

Checks whether an auth endpoint eventually throttles brute force — not completeness, just a sign of
life from the protection.

```bash
for i in $(seq 1 12); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -X POST "$BASE/api/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"probe@example.com","password":"wrong-'"$i"'"}'
done
```

**Green:** after a few attempts the code flips to `429` (Too Many Requests) or a deliberate delay.
**Red:** all twelve return the same fast `401` — no rate limit. Adapt the endpoint path and body to
your own API; only against your own/staging environment.

## Report template

```
### Web Release Live Quick-Check: <BASE> (<date>)

| # | Check | Result | Finding | Severity |
|---|-------|--------|---------|----------|
| 1 | Expected headers | 5/7 set; X-Powered-By present | Permissions-Policy + COOP missing; banner leaks | MEDIUM |
| 2 | Root disclosure | JSON with version | version info at / | LOW |
| 3 | security.txt | 404 | no reporting path | LOW |
| 4 | Open redirect | relative | ok | — |
| 5 | Rate limit | 12x 401 | no limit at login | HIGH |

**Overall:** <Low/Medium/High>  ·  **Release blocker:** Yes/No (HIGH = blocker)
```

**Blocker rule (mirrors REVIEW):** a **HIGH** finding blocks the release until it is fixed or
accepted as a documented residual risk.

## Honest limit

This is a **quick check**, not a DAST scan and not a pentest. It catches the common, cheap
first-minute misconfigurations — not logic flaws, chained attacks, or authenticated attack surface.
For deep testing, real DAST/pentest remains the right answer; this check only lowers the chance of
going live with an obvious hole. Context: OWASP Secure Headers Project, RFC 9116 (security.txt),
OWASP Top 10:2025 (A02 Security Misconfiguration, A01 Broken Access Control).

## Related

- [SKILL.en.md](../SKILL.en.md) — AUDIT mode (step 6) and REVIEW header list (step 5)
- [security-template §11](../../bootstrap/references/security-template.en.md) — header baseline, helmet default, security.txt scaffold
- [owasp-checklist.en.md](owasp-checklist.en.md) — OWASP Top 10:2025 / ASVS
- [docs/security-hub.en.md](../../docs/security-hub.en.md) — security map (§6 operations)
