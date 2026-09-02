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

**STATUS** — heartbeat after every task or every 2-3 tasks at minimum. Keeps
team-lead aware of progress and lets it intervene if something is stuck.

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
- WRITE only to your assigned file patterns (listed in the domain template below)
- READ any file for context
- Send STATUS heartbeat after every 2-3 tasks minimum
- Do NOT wait for team-lead response to PLAN_READY — proceed immediately
- ALL repository operations MUST use `repositories/{ORG}/` directory structure
- Create `.specweave/increments/` in YOUR assigned repo, NOT in the umbrella project root
- **Workflow Mode** (below) is OPT-IN and default-off — only borrow a `Workflow()` for a ≥~25 same-shape independent-task batch, exactly once, and only if `quality.workflows.agentBorrow.enabled` is true

## Workflow Mode (OPT-IN — large homogeneous batch only)

You normally implement tasks sequentially. **IF AND ONLY IF** your assigned task list is a **large homogeneous batch** — **≥~25 tasks of the same shape with no cross-task dependencies** (e.g. apply the same rename/migration/edit to N files, port N similar tests, audit N modules) — you MAY call `Workflow()` **EXACTLY ONCE** to fan them out.

**Gate (ALL must hold, else implement sequentially):**
- `quality.workflows.enabled === true` AND `quality.workflows.agentBorrow.enabled === true` in `.specweave/config.json` (both default **off** — if absent/false, do NOT use Workflow).
- ≥~25 same-shape, independent tasks (`quality.workflows.batchShapeThreshold`, default 25).
- Projected concurrency ≤ `quality.workflows.maxSubagentsPerWorkflow` (≤16) and projected tokens ≤ `quality.workflows.perRunTokenBudget`.

**Nesting law (HARD):** You were spawned by team-lead via the `Task` tool, so you ARE allowed ONE `Workflow()` call. The subagents your Workflow spawns are **leaves** — they CANNOT call `Workflow()` (it throws). One borrow, one level down. Never nest.

**Heartbeat-before-Workflow (MANDATORY — prevents false-kill):** A background Workflow makes you silent for minutes. BEFORE the call, emit a STATUS that declares the delegation so team-lead extends its stuck-detection window (see SKILL.md §8b Workflow-Aware Stuck Detection):

```
SendMessage({ type: "message", recipient: "team-lead",
  content: "STATUS: T-{N}/{total} — DELEGATING {batchCount} tasks to background Workflow (workflow_id={id}). Expect silence until WORKFLOW_DONE.",
  summary: "[Domain] entering Workflow Mode — {batchCount} tasks" })
```
On completion emit `STATUS: WORKFLOW_DONE — {done}/{batchCount} ok, {failed} failed. Resuming T-{M}.` then resume normal heartbeats.

**Template** (one call; results stay in script vars, NOT your context). Inject SpecWeave context (spec/AC refs, file paths) into every agent prompt — Workflow is domain-blind:

```js
export const meta = {
  name: "batch-fanout",
  description: "Fan out a homogeneous batch of same-shape tasks",
  phases: [{ title: "batch" }],
};
const items = [/* the >=25 same-shape task descriptors: { target, acRef, file } */];
const results = await parallel(
  items.map((it) => () => agent(
    `Apply <the same transform> to ${it.target}. Spec: ${it.acRef}. Write ONLY ${it.file}.`,
    { label: it.target, phase: "batch", isolation: "worktree" }
  ))
);
log(`batch complete: ${results.filter(Boolean).length}/${items.length}`);
return results;
```

**Budget guard:** Keep projected tokens under `quality.workflows.perRunTokenBudget`. If your batch would exceed it, split into fewer items or fall back to sequential — do NOT raise the cap yourself.

**If the gate fails for any reason → implement the tasks sequentially as usual.** Workflow Mode is an optimization, never a requirement.
