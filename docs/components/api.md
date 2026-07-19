# Externe APIs — BelegChat

> Threema Gateway, n8n, Mistral AI.

## Threema Gateway

- **Zweck:** Beleg-Fotos empfangen, Bestaetigungen senden
- **Auth:** API-Key + Secret (in Edge Secrets)
- **Decrypt:** Edge Function `threema-decrypt` (Schwester-Repo)
- **Dialog:** BERENT2 (E2E), BERENT1 (send_simple)

## n8n

- **Zweck:** Workflow-Orchestrierung (OCR, Kontierung, Import)
- **Host:** `https://n8n.srv1098810.hstgr.cloud`
- **Workflows:**
  - Threema-Workflow: `MYpHUIHNMuIUR1ic`
  - PDF-Import-Workflow: `scLbdf5AbS8ojqJD`
- **Auth:** IMPORT_API_TOKEN fuer Webhook

## Mistral AI

- **Zweck:** OCR (Beleg-Text-Extraktion) + KI-Kontierung (SKR04)
- **Aufruf:** via n8n HTTP-Node
- **Modell:** Mistral (konfigurierbar)

## Offene Fragen

- [ ] Mistral-Modell-Upgrade evaluieren
- [ ] DATEV-Export-Integration (Phase 4)
