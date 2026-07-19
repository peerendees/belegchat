---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Secure Code Patterns

Sichere vs. unsichere Patterns fuer die gaengigsten Sprachen. Jede Code-Aenderung gegen diese Patterns pruefen.

## Universelle Regeln

1. **Alle Inputs serverseitig validieren** — Client-seitige Validation ist UX, nicht Security
2. **Parameterized Queries** — Nie User-Input in Queries konkatenieren
3. **Output kontextspezifisch encoden** — HTML, JS, URL, CSS brauchen unterschiedliches Encoding
4. **Auth-Checks auf jedem Endpunkt** — Nicht nur im Routing
5. **Fail Closed** — Bei Fehlern Zugriff verweigern
6. **Keine Secrets im Code** — Immer Environment/Vault

---

## JavaScript / TypeScript

### Injection
```javascript
// UNSICHER: Prototype Pollution
Object.assign(target, userInput)
// SICHER: Null-Prototype-Objekt
Object.assign(Object.create(null), validated)

// UNSICHER: eval
eval(userCode)
// SICHER: Nie eval mit User-Input
```

### XSS
```javascript
// UNSICHER: innerHTML
element.innerHTML = userInput
// SICHER: textContent oder DOMPurify
element.textContent = userInput
// Oder: DOMPurify.sanitize(userInput)
```

### Auth (JWT)
```javascript
// UNSICHER: Algorithmus aus Token lesen
jwt.verify(token, secret)
// SICHER: Algorithmus explizit vorgeben
jwt.verify(token, secret, { algorithms: ['HS256'] })

// Token in httpOnly Cookie, NICHT localStorage
res.cookie('token', token, {
  httpOnly: true, secure: true, sameSite: 'strict'
})
```

**Watchlist:** `eval()`, `innerHTML`, `document.write()`, `__proto__`, `Function()`, `setTimeout(string)`

---

## Python

### Injection
```python
# UNSICHER: SQL mit f-String
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
# SICHER: Parameterized Query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# UNSICHER: Command Injection
os.system(f"convert {filename} output.png")
# SICHER: subprocess ohne shell
subprocess.run(["convert", filename, "output.png"], shell=False)
```

### Deserialisierung
```python
# UNSICHER: Pickle RCE
pickle.loads(user_data)
# SICHER: JSON verwenden
json.loads(user_data)
```

### Passwort-Hashing
```python
# UNSICHER
hashlib.md5(password.encode()).hexdigest()
# SICHER
from argon2 import PasswordHasher
PasswordHasher().hash(password)
```

**Watchlist:** `pickle`, `eval()`, `exec()`, `os.system()`, `subprocess` mit `shell=True`, `yaml.load()` (statt `safe_load`)

---

## Go

### Race Conditions
```go
// UNSICHER: Data Race
go func() { counter++ }()
// SICHER: Atomic
atomic.AddInt64(&counter, 1)
```

### Template Injection
```go
// UNSICHER: Kein Escaping
template.HTML(userInput)
// SICHER: Template escaped automatisch
{{.UserInput}}
```

**Watchlist:** Goroutine Data Races, `template.HTML()`, `unsafe` Package, unchecked Slice Access

---

## Rust

```rust
// VORSICHT: unsafe umgeht Safety
unsafe { ptr::read(user_ptr) }

// VORSICHT: Integer Overflow im Release Build
let x: u8 = 255;
let y = x + 1; // Wraps zu 0 im Release!
// SICHER: Checked Arithmetic
let y = x.checked_add(1).unwrap_or(255);
```

**Watchlist:** `unsafe` Bloecke, FFI Calls, Integer Overflow in Release, `.unwrap()` auf Untrusted Input

---

## Java

```java
// UNSICHER: Deserialisierung RCE
ObjectInputStream ois = new ObjectInputStream(userStream);
Object obj = ois.readObject();
// SICHER: JSON mit typisierter Klasse
ObjectMapper mapper = new ObjectMapper();
mapper.readValue(json, SafeClass.class);
```

**Watchlist:** `ObjectInputStream`, `Runtime.exec()`, XML Parser ohne XXE-Schutz, JNDI Lookups

---

## PHP

```php
// UNSICHER: Type Juggling
if ($password == $stored_hash) { ... }
// SICHER: Strikter Vergleich
if (hash_equals($stored_hash, $password)) { ... }

// UNSICHER: File Inclusion
include($_GET['page'] . '.php');
// SICHER: Allowlist
$allowed = ['home', 'about'];
include(in_array($page, $allowed) ? "$page.php" : 'home.php');
```

**Watchlist:** `==` vs `===`, `include/require`, `unserialize()`, `preg_replace` mit `/e`, `extract()`

---

## Shell (Bash)

```bash
# UNSICHER: Unquoted Variables
rm $user_file
# SICHER: Immer quoten
rm "$user_file"

# UNSICHER: eval
eval "$user_command"
# SICHER: Nie eval mit User-Input

# IMMER am Anfang:
set -euo pipefail
```

---

## Fehlerbehandlung (alle Sprachen)

```python
# UNSICHER: Fail-Open
def check_permission(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception:
        return True  # GEFAEHRLICH!

# SICHER: Fail-Closed
def check_permission(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception as e:
        logger.error(f"Auth check failed: {e}")
        return False  # Bei Fehler ablehnen
```

```python
# UNSICHER: Internals exponieren
@app.errorhandler(Exception)
def handle_error(e):
    return str(e), 500

# SICHER: Generische Fehlermeldung
@app.errorhandler(Exception)
def handle_error(e):
    error_id = uuid.uuid4()
    logger.exception(f"Error {error_id}: {e}")
    return {"error": "Ein Fehler ist aufgetreten", "id": str(error_id)}, 500
```

---

## Access Control Pattern

```python
# UNSICHER: Keine Autorisierung
@app.route('/api/user/<user_id>')
def get_user(user_id):
    return db.get_user(user_id)

# SICHER: Autorisierung erzwungen
@app.route('/api/user/<user_id>')
@login_required
def get_user(user_id):
    if current_user.id != user_id and not current_user.is_admin:
        abort(404)  # 404 statt 403 verhindert Enumeration
    return db.get_user(user_id)
```

---

## Open Redirect

```javascript
// UNSICHER: Redirect-Ziel direkt aus Request-Input — jede fremde URL ist erreichbar
app.get('/go', (req, res) => {
  res.redirect(req.query.url);
});

// SICHER: relative Pfade erzwingen, absolute Ziele nur gegen Allowlist
const REDIRECT_ALLOWLIST = ['https://app.example.com', 'https://docs.example.com'];

app.get('/go', (req, res) => {
  const target = String(req.query.url || '/');
  if (target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    return res.redirect(target);  // relativer Pfad — bleibt auf der eigenen Origin
  }
  if (REDIRECT_ALLOWLIST.some((base) => target === base || target.startsWith(base + '/'))) {
    return res.redirect(target);  // exakter Allowlist-Origin-Prefix
  }
  return res.redirect('/');       // alles andere: neutraler Default, kein Fehler-Echo
});
```

- **Relative Pfade erzwingen:** nur Ziele akzeptieren, die mit `/` beginnen — `//` und `/\` ablehnen (Protocol-Relative-URLs wechseln die Origin).
- **Allowlist statt Substring:** absolute Ziele gegen vollstaendige Origins pruefen (`target === base` oder `startsWith(base + '/')`) — ein `includes('example.com')` laesst `https://app.example.com.evil.tld` durch.
- **Kein User-Input in den Fallback:** bei Ablehnung auf einen festen Default umleiten, nie auf eine "bereinigte" Variante des Inputs.
- **Semgrep-Baseline:** die Custom-Regeln `open-redirect-user-input-js`/`-python` (`.semgrep/custom-rules.yml`-Template, BOO-426) melden die direkte Weitergabe von Request-Input an `redirect()` — Baseline ohne Taint-Tracking, ersetzt dieses Pattern nicht.

---

## CSRF-Schutz Checkliste

- [ ] Token kryptographisch zufaellig generiert
- [ ] Token an User-Session gebunden
- [ ] Token serverseitig auf allen State-aendernden Requests validiert
- [ ] Fehlender Token = Request abgelehnt
- [ ] Token nach Auth-Aenderung erneuert
- [ ] SameSite Cookie-Attribut gesetzt
- [ ] Secure und HttpOnly Flags auf Session-Cookies

## File Upload Checkliste

- [ ] Dateityp per Extension-Allowlist UND Magic Bytes validiert
- [ ] Dateigroesse serverseitig limitiert
- [ ] Dateinamen randomisiert (UUID)
- [ ] Uploads ausserhalb des Webroots speichern
- [ ] `Content-Disposition: attachment` Header setzen
- [ ] `X-Content-Type-Options: nosniff` Header setzen
