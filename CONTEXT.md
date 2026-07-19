# CONTEXT.md — BelegChat

> Kanonisches Vokabular. Die KI nutzt konsequent diese Begriffe.

---

## Governance-Vokabular (kanonisch)

| Begriff | Bedeutung | Quelle |
|---------|-----------|--------|
| Spec | Story-Spezifikation unter `specs/BER-XXX.md` | CONVENTIONS.md |
| Gate | Automatische Pruefung, die Merge/Commit blockiert | GOVERNANCE.md |
| Layer | Gate-Schicht (0-3: Bodyguard, Spec, Pre-Commit, CI) | GOVERNANCE.md |
| Sprint | Arbeitseinheit mit Review am Ende | Learning-Loop |
| Drift | Abweichung zwischen Doku und Realitaet | doc-drift-check |

## Verbotsliste

| Verboten | Stattdessen | Grund |
|----------|-------------|-------|
| User-Daten in Logs | Anonymisierte IDs | DSGVO |
| Secrets in Code | `.env.local` / Edge Secrets | Sicherheit |
| `any` (TypeScript) | Konkreter Typ | Typsicherheit |

## Projekt-Domaene (vom Operator fuellen)

| Begriff | Definition | Kontext |
|---------|-----------|---------|
| Beleg | Digitalisiertes Buchungsdokument (Rechnung, Quittung, Kassenbon) | Kern-Entitaet |
| Mandant | Steuerpflichtiger Kunde, der Belege einreicht | Nutzer-Rolle |
| Kontierung | Zuordnung eines Belegs zu SKR04-Konten (Soll/Haben) | KI-Aufgabe |
| SKR04 | Standardkontenrahmen 04 (DATEV) | Buchhaltungs-Standard |
| GoBD | Grundsaetze zur ordnungsmaessigen Fuehrung und Aufbewahrung von Buechern | Compliance |
| Threema-ID | 8-stellige alphanumerische ID eines Threema-Nutzers | Kanal-Identifikation |
| Hash-Kette | SHA-256-Verkettung ueber Beleg-Metadaten + Vorgaenger-Hash | Revisionssicherheit |
| Firma | Mandanten-Zuordnung in Supabase (firma_id) | Multi-Mandanten |
| Deckblatt | Zusammenfassung eines Beleg-Batches (Termin/Bewirtung) | Beleg-Gruppierung |
