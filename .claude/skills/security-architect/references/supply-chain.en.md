---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Supply Chain Security

## Dependency risk assessment

Evaluate every dependency against these criteria:

| Criterion | Low risk | High risk |
|-----------|----------|-----------|
| Maintainers | Multiple active maintainers | Single person, inactive |
| Last update | < 6 months | > 2 years |
| Known CVEs | None open | Open, unpatched CVEs |
| Downloads/usage | Widely used | Rare, no audit |
| Transitive deps | Few, maintained | Many, deeply nested |
| Security policy | SECURITY.md present | No security contact |

## Automated checks

### npm (Node.js)
```bash
npm audit
# Or stricter:
npm audit --audit-level=high
```

### pip (Python)
```bash
pip-audit
# Or:
safety check
```

### Go
```bash
govulncheck ./...
```

### Rust
```bash
cargo audit
```

## Versioning rules

1. **Always commit lock files** — `package-lock.json`, `poetry.lock`, `go.sum`, `Cargo.lock`
2. **Pin versions** — no ranges (`^`, `~`) in production dependencies
3. **Automated updates** — set up Dependabot/Renovate, but review manually
4. **Subresource Integrity** — SRI hashes for CDN embeds
   ```html
   <script src="https://cdn.example.com/lib.js"
           integrity="sha384-..." crossorigin="anonymous"></script>
   ```

## Attack vectors

| Attack | Description | Protection |
|--------|-------------|------------|
| Typosquatting | `lodash` vs `1odash` | Check package names carefully |
| Dependency confusion | Internal package overridden by public one | Private registry with scoping |
| Maintainer takeover | Compromised account | Lock files, integrity checks |
| Build-script injection | Malicious `postinstall` scripts | `--ignore-scripts` on install, then run selectively |
| Protestware | Maintainer injects destructive code | Pinned versions, review before update |

## Audit checklist

- [ ] `npm audit` / `pip-audit` / `cargo audit` with no critical findings
- [ ] No dependencies with known unpatched CVEs
- [ ] Lock files up to date and committed
- [ ] No unnecessarily broad version ranges
- [ ] Transitive dependencies checked for known problems
- [ ] No orphaned dependencies (no longer maintained)
- [ ] Build scripts of dependencies reviewed (for new dependencies)
