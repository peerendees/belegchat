# BelegChat Alpha-Block — Handoff

Stand: 2026-07-11 — **Alpha E2E grün**

## Ergebnis

| Test | Beleg | Datum |
|------|-------|-------|
| Einzelseite (Beta) | `01-2026-0003` | 2026-07-10 |
| Mehrseiten + GoBD (Alpha) | `01-2026-0004` | 2026-07-11 |

## Umgesetzt

| Bereich | Artefakt |
|---------|----------|
| DB | `pending_belege`, `beleg_seiten` (Migration `alpha_multipage_gobd`) |
| Edge Function | `archive-beleg-seite`, `ocr-storage-pages`, PKCS7-Padding (v15) |
| n8n | Workflow `MYpHUIHNMuIUR1ic` — 9 Patch-Skripte, live per API |
| Vault | `belegchat/docs/vault/` (Staging für Second Brain) |
| ADR | [[ADR-02 Mehrseiten-Fertig-UX]] (ersetzt Ziffern 1/2) |

## Threema-Gateways

| Phase | Gateway | API |
|-------|---------|-----|
| Dialog (Rückfrage, Fehler) | *BERENT2* | E2E via Edge `action: send` |
| Abschluss (Beleg erfasst) | *BERENT1* | `send_simple` form-urlencoded |

Mandant sieht Dialog und Abschluss in **zwei Threema-Chats**.

## E2E-Test Mehrseiten

1. Foto Seite 1 → „Seite 1 gespeichert. Scanne eine weitere Seite oder antworte mit Fertig.“
2. Foto Seite 2 → erneute Rückfrage
3. `Fertig` → OCR, Beleg-Nr, `belege` + `beleg_seiten` + `audit_log` + Storage
4. Abschlussnachricht von *BERENT1*

## Deploy (Referenz)

```bash
cd /Users/Shared/Projekte/Entwicklung/projekte/threema-decrypt
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref xuqefeewzdvjhuquciut
supabase functions deploy threema-decrypt --project-ref xuqefeewzdvjhuquciut --no-verify-jwt
```

n8n: Workflow aus `n8n-workflows/n8n/MYpHUIHNMuIUR1ic/` oder live per API.

## Sicherheitshinweis

`pending_belege` und `beleg_seiten` haben RLS deaktiviert. Für Produktion RLS aktivieren und Service-Role-only Policies definieren.

## Vault-Sync (Second Brain)

```bash
sudo cp -R belegchat/docs/vault/BelegChat berent-2nd-brain/02\ Projekte/
sudo cp belegchat/docs/vault/05\ Daily\ Notes/2026-07-11.md berent-2nd-brain/05\ Daily\ Notes/
sudo chown -R "$(whoami)" berent-2nd-brain/02\ Projekte/BelegChat
```

Doku: `belegchat/docs/vault/README.md`

## Post-Alpha

Siehe `docs/POST-ALPHA-PLAN.md` und Vault [[Post-Alpha-Implementierungsplan]].
