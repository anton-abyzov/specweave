# Shared Agent Protocol

<!-- Auto-prepended by template-loader.ts before every domain agent template.
     Do not duplicate the blocks below inside domain templates — keep only
     domain-specific workflow and file ownership there. -->

## Messaging Protocol

All inter-agent communication goes through `SendMessage`. Your plain text output is
NOT visible to team-lead — if you need to report status, raise a blocker, or signal
completion, you MUST call `SendMessage`.

### Signals (send via SendMessage to "team-lead")

**PLAN_READY** — send IMMEDIATELY after writing plan files (plan.md, tasks.md).
Proceed to implementation without waiting for a response. If team-lead replies
with `PLAN_CORRECTION`, pause, revise, then continue.

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "PLAN_READY: Created [increment path]\nTasks: [count]\nACs covered: [AC-IDs]\nKey decisions: [1-2 sentence summary]\nFiles: [file list]\nArchitecture: [approach]",
  summary: "[Domain] plan ready — proceeding to implementation" })
```

**STATUS** — send when a task completes, and before anything that will keep you
silent for minutes. The lead watches the ledger (`specweave task list`), not your
output, so a STATUS is what tells it a silent stretch is work rather than a stall.

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "STATUS: T-{N}/{total} complete. Next: T-{N+1}. Tests: [pass/fail count].",
  summary: "[Domain] agent: task {N} of {total} done" })
```

**BLOCKING_ISSUE** — when stuck on something you cannot resolve yourself
(missing contract, ambiguous spec, failing dependency). Do not sit idle.

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "BLOCKING_ISSUE: [description]. Need: [what you need to unblock].",
  summary: "Blocked: [brief reason]" })
```

**CONTRACT_READY** — optional; send when you produce a contract artifact other
agents depend on (database schema, OpenAPI spec, shared types). Lets parallel
agents unblock earlier.

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "CONTRACT_READY: [artifact path]\nExports: [key types/models]\nConsumers: [agents that should read this]",
  summary: "[Domain] contract ready" })
```

**COMPLETION** — when all tasks are done AND all tests pass. Do NOT signal
completion if tests are failing.

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "COMPLETION: [increment path]\nTasks: {completed}/{total}\nTests: [pass/fail/skip]\nACs satisfied: [AC-IDs]\nFiles changed: [list]",
  summary: "[Domain] agent: all tasks complete, tests passing" })
```

## TaskUpdate Contract

Use `TaskUpdate` (not ad-hoc status messages) to mark task progress in tasks.md
so the team-lead dashboard and closure gates see accurate state. One task in
`in_progress` at a time. Mark `completed` only after its tests pass.

## shutdown_response Handling

If you receive a JSON message with `type: "shutdown_request"`, reply with a
matching `shutdown_response`, echoing `request_id`:

```
SendMessage({ to: "team-lead",
  message: { type: "shutdown_response", request_id: "...", approve: true } })
```

Approve only if you have no unsaved state. Approving terminates your process.

## Rules (apply to every agent)

- Do NOT run `sw:done` or `sw:review` — the lead closes the increment centrally
- Write only to your assigned file patterns (listed in the domain template below)
- Read any file for context
- Do not wait for a team-lead response to PLAN_READY — proceed immediately
- All repository operations use the `repositories/{ORG}/` directory structure
- Create `.specweave/increments/` in your assigned repo, not in the umbrella project root
