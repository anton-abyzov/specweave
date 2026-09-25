---
description: Run one SpecWeave increment with several agents in parallel - any tool or account, a worktree each, claims through the ledger, one close. Use for "team", "parallel agents", 3+ disjoint lanes.
argument-hint: "[increment-id]"
version: 3.0.0
---

# sw-team: several agents, one increment

Agents can be Claude Code, Codex, Cursor, Grok, another account or a person. They
coordinate only through committed files: spec.md (tasks), `ledger.jsonl` (claims and
evidence) and handoffs. No message bus is needed; your tool's subagents or agent teams
are an accelerator, never a requirement.

## You are the lead

You split, start, watch, merge and close. You do not implement. Fan out only with three
or more disjoint lanes or 15+ tasks; otherwise use sw-do.

## 1. Split

1. `Files` is the ownership unit. Two tasks that touch one file cannot run in parallel:
   merge them, or put `**Dependencies**: T-01` under the later one. Shared contracts
   (types, schema, migrations) go in an early task the others depend on.
2. Group tasks into lanes with disjoint `Files`: 2 to 5 lanes, one agent each.
3. `specweave task list 0042` shows every task open. Commit spec.md.

## 2. Start each agent

One worktree and branch per agent:
`git worktree add ../0042-api -b inc/0042-api`. Then give that agent (a subagent, a
terminal in the worktree, another tool or account) this brief:

```text
You are agent "api" on increment 0042 in ../0042-api (branch inc/0042-api).
Your tasks: T-01, T-02. Run the sw-do loop (`specweave task next 0042`, claim, ...)
on your tasks only. Edit only their Files. Commit as "0042: ...". `task done --run`
needs exit 0. When done or blocked: `specweave task release --all-mine`,
`specweave note "api: <done | blocked: why>" 0042`, commit and push your branch.
```

Set `SPECWEAVE_AGENT=api` in that agent's environment so its claims are distinct.
In Claude Code, `specweave team` opens agent-team panes for the same setup.

## 3. Watch cheaply

Poll `specweave task list 0042` instead of chatting. `blocked` rows are your queue:
unblock (supply the secret, split the task, decide) and tell only that agent. A claim
older than 2 hours with no progress is stale; a replacement agent claims it with
`specweave task claim T-NN --force`. Agents' notes show in `specweave pickup --no-apply`.
Lane agents do not use `specweave handoff`: it moves the one shared handoff pointer.

## 4. Merge and close

1. Merge the lane branches in dependency order. `ledger.jsonl` conflicts resolve by
   keeping every line from both sides.
2. `specweave verify 0042` on the merged tree; red becomes a fix task for one agent.
3. sw-review on the merged diff, then `specweave complete 0042`. Only the lead closes.
4. `git worktree remove ../0042-api` for each lane.

## Manual path (no CLI)

Same split and brief; each agent appends its own `claim`, `done` and `release` lines to
`ledger.jsonl` as in sw-do's manual path, plus a `note` line as in sw-handoff's.

## Anti-patterns

- An agent editing outside its tasks' `Files`. Add a task instead.
- One increment per agent: you lose the single ledger and the single verify.
- The lead implementing "just this small piece", or closing while a claim is live.
