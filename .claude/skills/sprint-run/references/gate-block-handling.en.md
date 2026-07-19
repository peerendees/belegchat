---
provenance:
  origin: ai-claude
  classification: open
  status: reviewed
---

# Gate-block handling — /goal pause/resume on sensitive path

Reference for `/sprint-run` step 6 (execution by `/goal`). Security-critical: `/goal` must
**never** bridge governance gates automatically. Since 2.0.0 (ADR-4) this pause belongs to `/goal`,
no longer to a skill-owned daemon loop.

## Which gates pause `/goal`?

| Gate | Source (`/implement`) | Trigger | Approval token |
|---|---|---|---|
| Sensitive-Paths | step 5.5 (BOO-18) | changed file matches `.claude/sensitive-paths.json` | `review-ok: <name> - <comment>` |
| Personal-Data | step 5.5b (BOO-69) | `personal_data: true` + match in `.claude/personal-data-paths.json` | `privacy-ok: <name> - <comment>` (GDPR Art. 25) |
| Doc-drift (compliance) | pre-flight (BOO-229) | `compliance_doc_gate: true` + checker FAIL (`scripts/doc-drift-check.sh`) | mostly worker self-heal; on `local≠remote`: `doc-drift-ok: <name> - <comment>` |

Both can strike at the same time — then first `review-ok` (technical), then `privacy-ok`
(legal). No confirmation replaces the other.

## Special case: doc-drift gate (BOO-229)

Unlike sensitive-paths/personal-data, doc drift is partly **safely self-resolvable**. Active only when `compliance_doc_gate: true`. Autopilot behavior:

- **Safe (no stop needed):** a missing registration in §References/INDEX → the worker adds the file itself (mechanical, no real decision), logs it, and continues.
- **Real decision (pauses):** `local ≠ remote` (a tracked doc lags behind `origin`) — the operator decides which version wins (`git pull` vs. keep local). Approval token `doc-drift-ok: <name> - <comment>`.

In **standard mode** (`compliance_doc_gate: false`) nothing pauses — the drift is a WARN and the run continues.

## Protocol

1. **Pause.** `/implement` (in the story subagent) stops at its gate. `/goal` does **not** continue
   for this story — no merge, no worktree cleanup. Other stories can keep running.
2. **Notify.** Operator hint with **story ID**, **gate type** and **concrete path/reason** —
   a persistent note (e.g. Linear comment) so the operator can answer remotely too.
3. **Wait.** `/goal` keeps this story blocked until the operator delivers the matching approval
   token. **No** timeout resume.
4. **Resume.** After approval `/implement` records the block in the spec file (`## Human Review`
   or `## Privacy Review`) and continues; `/goal` resumes the story subagent.
5. **Abort (optional).** If the operator does not want to approve: story back to `Backlog`,
   remove worktree.

## Prohibitions

- ❌ No automatic bypass of a gate.
- ❌ No timeout-based auto-resume.
- ❌ No approval "in advance" for upcoming stories — each approval applies to exactly one block.

## State machine

```text
running ──(gate hit)──▶ paused ──(review-ok / privacy-ok / doc-drift-ok)──▶ resumed ──▶ running
                          │
                          └──(operator rejects)──▶ aborted (story → Backlog)
```

Sketch: `docs/gate-block-handling.png` (HANDBUCH Appendix AD).
