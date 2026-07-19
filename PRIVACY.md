# PRIVACY.md — BelegChat

> DSGVO-Datenkategorien und Schutzmassnahmen.

---

## Datenkategorien

| Kategorie | Beispiele | Speicherort | Schutz |
|-----------|----------|-------------|--------|
| Threema-IDs | `BUMFMZ39` | Supabase (threema_contacts) | RLS, kein Log |
| Mandanten-Zuordnung | firma_id, Firmenname | Supabase (firmen) | RLS |
| Belegdaten | Rechnungsbetrag, Lieferant, Datum | Supabase (belege) | RLS, GoBD-Hash |
| Beleg-Dateien | Fotos, PDFs | Supabase Storage | Bucket-Policy |
| Auth-Credentials | Passkey Public Keys | Supabase (passkey_credentials) | RLS |
| Session-Tokens | JWTs | httpOnly Cookies | Signiert (jose) |

## Grundsaetze

1. **Datensparsamkeit:** Nur notwendige Felder erheben und speichern
2. **Zweckbindung:** Belegdaten nur fuer Buchhaltungszwecke
3. **Verschluesselung:** Transit (HTTPS/E2E), Storage (Supabase-managed)
4. **Zugriffskontrolle:** RLS pro Mandant, kein Cross-Tenant-Zugriff
5. **Loeschkonzept:** Nach GoBD-Aufbewahrungsfrist (10 Jahre)
6. **Keine PII in Logs:** Threema-IDs, Namen, Betraege nie loggen
7. **Keine PII an LLM:** Nur anonymisierte Beleg-Texte an Mistral

## Betroffene Pfade

Siehe `personal-data-paths.json` fuer die vollstaendige Liste.

## Rechtsgrundlage

- Vertragserfuellung (Art. 6 Abs. 1 lit. b DSGVO)
- Gesetzliche Aufbewahrungspflicht (Art. 6 Abs. 1 lit. c DSGVO, AO/HGB)
