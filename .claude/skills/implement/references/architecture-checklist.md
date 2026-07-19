---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architektur-Check bei Implementation

Vor der Implementation die relevanten Dimensionen pruefen:

| Dimension | Pruefen wenn... |
|-----------|-----------------|
| Reliability | Neuer Daemon, neuer Agent, neuer Pfad |
| Data Integrity | Schreibt in trades.jsonl, Brain DB, Signal-Files |
| Security | Neue API, neuer Webhook, externer Input |
| Performance | Rate Limits, WebSocket, Memory-intensive Ops |
| Observability | Neues Feature das stumm fehlschlagen koennte |
| Maintainability | Jede Aenderung — Code-Duplikation? Config-SSoT? |
| Cost Efficiency | Neue API mit Kosten, LLM-Calls |
| Signal Quality | Neuer Agent, geaenderte Gewichtung |

Nicht alle Dimensionen sind immer relevant. Nur die pruefen die zur Aenderung passen.
