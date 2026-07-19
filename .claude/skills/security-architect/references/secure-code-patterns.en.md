---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Secure Code Patterns

Secure vs. unsafe patterns for the most common languages. Check every code change against these patterns.

## Universal rules

1. **Validate all inputs server-side** — client-side validation is UX, not security
2. **Parameterized queries** — never concatenate user input into queries
3. **Encode output context-specifically** — HTML, JS, URL, CSS need different encoding
4. **Auth checks on every endpoint** — not only in routing
5. **Fail closed** — deny access on errors
6. **No secrets in code** — always environment/vault

---

## JavaScript / TypeScript

### Injection
```javascript
// UNSAFE: prototype pollution
Object.assign(target, userInput)
// SAFE: null-prototype object
Object.assign(Object.create(null), validated)

// UNSAFE: eval
eval(userCode)
// SAFE: never eval with user input
```

### XSS
```javascript
// UNSAFE: innerHTML
element.innerHTML = userInput
// SAFE: textContent or DOMPurify
element.textContent = userInput
// Or: DOMPurify.sanitize(userInput)
```

### Auth (JWT)
```javascript
// UNSAFE: algorithm read from the token
jwt.verify(token, secret)
// SAFE: specify algorithm explicitly
jwt.verify(token, secret, { algorithms: ['HS256'] })

// Token in httpOnly cookie, NOT localStorage
res.cookie('token', token, {
  httpOnly: true, secure: true, sameSite: 'strict'
})
```

**Watchlist:** `eval()`, `innerHTML`, `document.write()`, `__proto__`, `Function()`, `setTimeout(string)`

---

## Python

### Injection
```python
# UNSAFE: SQL with f-string
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
# SAFE: parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# UNSAFE: command injection
os.system(f"convert {filename} output.png")
# SAFE: subprocess without shell
subprocess.run(["convert", filename, "output.png"], shell=False)
```

### Deserialization
```python
# UNSAFE: pickle RCE
pickle.loads(user_data)
# SAFE: use JSON
json.loads(user_data)
```

### Password hashing
```python
# UNSAFE
hashlib.md5(password.encode()).hexdigest()
# SAFE
from argon2 import PasswordHasher
PasswordHasher().hash(password)
```

**Watchlist:** `pickle`, `eval()`, `exec()`, `os.system()`, `subprocess` with `shell=True`, `yaml.load()` (instead of `safe_load`)

---

## Go

### Race conditions
```go
// UNSAFE: data race
go func() { counter++ }()
// SAFE: atomic
atomic.AddInt64(&counter, 1)
```

### Template injection
```go
// UNSAFE: no escaping
template.HTML(userInput)
// SAFE: template auto-escapes
{{.UserInput}}
```

**Watchlist:** goroutine data races, `template.HTML()`, `unsafe` package, unchecked slice access

---

## Rust

```rust
// CAUTION: unsafe bypasses safety
unsafe { ptr::read(user_ptr) }

// CAUTION: integer overflow in release build
let x: u8 = 255;
let y = x + 1; // Wraps to 0 in release!
// SAFE: checked arithmetic
let y = x.checked_add(1).unwrap_or(255);
```

**Watchlist:** `unsafe` blocks, FFI calls, integer overflow in release, `.unwrap()` on untrusted input

---

## Java

```java
// UNSAFE: deserialization RCE
ObjectInputStream ois = new ObjectInputStream(userStream);
Object obj = ois.readObject();
// SAFE: JSON with typed class
ObjectMapper mapper = new ObjectMapper();
mapper.readValue(json, SafeClass.class);
```

**Watchlist:** `ObjectInputStream`, `Runtime.exec()`, XML parser without XXE protection, JNDI lookups

---

## PHP

```php
// UNSAFE: type juggling
if ($password == $stored_hash) { ... }
// SAFE: strict comparison
if (hash_equals($stored_hash, $password)) { ... }

// UNSAFE: file inclusion
include($_GET['page'] . '.php');
// SAFE: allowlist
$allowed = ['home', 'about'];
include(in_array($page, $allowed) ? "$page.php" : 'home.php');
```

**Watchlist:** `==` vs `===`, `include/require`, `unserialize()`, `preg_replace` with `/e`, `extract()`

---

## Shell (Bash)

```bash
# UNSAFE: unquoted variables
rm $user_file
# SAFE: always quote
rm "$user_file"

# UNSAFE: eval
eval "$user_command"
# SAFE: never eval with user input

# ALWAYS at the top:
set -euo pipefail
```

---

## Error handling (all languages)

```python
# UNSAFE: fail-open
def check_permission(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception:
        return True  # DANGEROUS!

# SAFE: fail-closed
def check_permission(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception as e:
        logger.error(f"Auth check failed: {e}")
        return False  # Deny on error
```

```python
# UNSAFE: expose internals
@app.errorhandler(Exception)
def handle_error(e):
    return str(e), 500

# SAFE: generic error message
@app.errorhandler(Exception)
def handle_error(e):
    error_id = uuid.uuid4()
    logger.exception(f"Error {error_id}: {e}")
    return {"error": "An error occurred", "id": str(error_id)}, 500
```

---

## Access control pattern

```python
# UNSAFE: no authorization
@app.route('/api/user/<user_id>')
def get_user(user_id):
    return db.get_user(user_id)

# SAFE: authorization enforced
@app.route('/api/user/<user_id>')
@login_required
def get_user(user_id):
    if current_user.id != user_id and not current_user.is_admin:
        abort(404)  # 404 instead of 403 prevents enumeration
    return db.get_user(user_id)
```

---

## Open redirect

```javascript
// UNSAFE: redirect target straight from request input — any foreign URL is reachable
app.get('/go', (req, res) => {
  res.redirect(req.query.url);
});

// SAFE: enforce relative paths, check absolute targets against an allowlist only
const REDIRECT_ALLOWLIST = ['https://app.example.com', 'https://docs.example.com'];

app.get('/go', (req, res) => {
  const target = String(req.query.url || '/');
  if (target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    return res.redirect(target);  // relative path — stays on our own origin
  }
  if (REDIRECT_ALLOWLIST.some((base) => target === base || target.startsWith(base + '/'))) {
    return res.redirect(target);  // exact allowlist origin prefix
  }
  return res.redirect('/');       // everything else: neutral default, no input echo
});
```

- **Enforce relative paths:** accept only targets starting with `/` — reject `//` and `/\` (protocol-relative URLs switch the origin).
- **Allowlist instead of substring:** check absolute targets against full origins (`target === base` or `startsWith(base + '/')`) — an `includes('example.com')` lets `https://app.example.com.evil.tld` through.
- **No user input in the fallback:** on rejection redirect to a fixed default, never to a "sanitized" variant of the input.
- **Semgrep baseline:** the custom rules `open-redirect-user-input-js`/`-python` (`.semgrep/custom-rules.yml` template, BOO-426) flag direct pass-through of request input into `redirect()` — a baseline without taint tracking; it does not replace this pattern.

---

## CSRF protection checklist

- [ ] Token cryptographically random
- [ ] Token bound to user session
- [ ] Token validated server-side on every state-changing request
- [ ] Missing token = request rejected
- [ ] Token refreshed after auth change
- [ ] SameSite cookie attribute set
- [ ] Secure and HttpOnly flags on session cookies

## File upload checklist

- [ ] File type validated via extension allowlist AND magic bytes
- [ ] File size limited server-side
- [ ] File names randomized (UUID)
- [ ] Uploads stored outside web root
- [ ] Set `Content-Disposition: attachment` header
- [ ] Set `X-Content-Type-Options: nosniff` header
