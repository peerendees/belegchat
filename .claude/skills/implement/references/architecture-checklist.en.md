---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Architecture check during implementation

Check the relevant dimensions before implementing:

| Dimension | Check when... |
|-----------|----------------|
| Reliability | New daemon, new agent, new code path |
| Data Integrity | Writes to trades.jsonl, Brain DB, signal files |
| Security | New API, new webhook, external input |
| Performance | Rate limits, WebSocket, memory-intensive ops |
| Observability | New feature that could fail silently |
| Maintainability | Every change — code duplication? Config SSoT? |
| Cost Efficiency | New API with cost, LLM calls |
| Signal Quality | New agent, changed weighting |

Not every dimension is always relevant. Only check the ones that apply to the change.
