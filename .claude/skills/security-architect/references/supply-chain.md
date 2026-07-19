---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Supply Chain Security

## Dependency-Risikobewertung

Jede Dependency anhand dieser Kriterien bewerten:

| Kriterium | Niedriges Risiko | Hohes Risiko |
|-----------|-----------------|-------------|
| Maintainer | Mehrere aktive Maintainer | Einzelperson, inaktiv |
| Letztes Update | < 6 Monate | > 2 Jahre |
| Bekannte CVEs | Keine offenen | Offene, ungepatchte CVEs |
| Downloads/Nutzung | Weit verbreitet | Wenig genutzt, kein Audit |
| Transitive Deps | Wenige, gepflegt | Viele, verschachtelt |
| Security Policy | SECURITY.md vorhanden | Kein Security-Kontakt |

## Automatische Pruefungen

### npm (Node.js)
```bash
npm audit
# Oder strenger:
npm audit --audit-level=high
```

### pip (Python)
```bash
pip-audit
# Oder:
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

## Versionierungs-Regeln

1. **Lock-Files immer committen** — `package-lock.json`, `poetry.lock`, `go.sum`, `Cargo.lock`
2. **Versionen pinnen** — Keine Ranges (`^`, `~`) in Production Dependencies
3. **Automatische Updates** — Dependabot/Renovate einrichten, aber manuell reviewen
4. **Subresource Integrity** — SRI-Hashes fuer CDN-Einbindungen
   ```html
   <script src="https://cdn.example.com/lib.js"
           integrity="sha384-..." crossorigin="anonymous"></script>
   ```

## Angriffsvektoren

| Angriff | Beschreibung | Schutz |
|---------|-------------|--------|
| Typosquatting | `lodash` vs `1odash` | Paketnamen genau pruefen |
| Dependency Confusion | Internes Paket wird von oeffentlichem ueberschrieben | Private Registry mit Scoping |
| Maintainer-Takeover | Kompromittierter Account | Lock-Files, Integritaets-Checks |
| Build-Script-Injection | Malicious `postinstall` Scripts | `--ignore-scripts` bei Installation, dann gezielt ausfuehren |
| Protestware | Maintainer fuegt destruktiven Code ein | Pinned Versions, Review vor Update |

## Audit-Checkliste

- [ ] `npm audit` / `pip-audit` / `cargo audit` ohne kritische Befunde
- [ ] Keine Dependencies mit bekannten ungepatchten CVEs
- [ ] Lock-Files aktuell und committed
- [ ] Keine unnoetig breiten Versionsranges
- [ ] Transitive Dependencies auf bekannte Probleme geprueft
- [ ] Keine verwaisten Dependencies (nicht mehr gewartet)
- [ ] Build-Scripts der Dependencies reviewed (bei neuen Dependencies)
