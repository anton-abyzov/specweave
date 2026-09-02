---
title: Agent Teams & Swarms
description: Run one increment with several agents in parallel — any vendor, any subscription.
---

import CommandTabs from '@site/src/components/CommandTabs';

# Agent teams and swarms

**Several agents, one increment, no message bus.** Coordination happens only through committed files: `tasks.md` (definitions), `ledger.jsonl` (state), `handoff.md` (context). That is what makes it vendor-agnostic — a Claude Code session, a Codex session, a Cursor window and a human can all work the same increment without talking to each other.

Claude Code's team tooling is an accelerator. It is never a requirement.

---

## The five rules

### 1. One worktree per agent, named after the agent

```bash
git worktree add ../0042-claude -b inc/0042-claude
git worktree add ../0042-codex  -b inc/0042-codex
# or, in Claude Code:
claude --worktree 0042-claude
```

The branch name must contain the increment id. That is how `specweave` and your reviewers tie a branch back to a spec.

### 2. Claim before you edit

```bash
specweave task next          # first open task with deps met and no Files overlap
specweave task claim T-01
```

Edit **only** the files listed in that task's `Files` field. Need another file? Claim its task, or add a task for it.

`claim` fails loudly rather than silently racing:

| Exit | Meaning |
|------|---------|
| 3 | Lost the race — someone else claimed it first. |
| 4 | `Files` overlap with another agent's live claim. |
| 6 | Dependencies not met. |

A claim older than the lease (2 hours by default) is **stale** and may be re-claimed by anyone.

### 3. Append only; never edit a ledger line

`ledger.jsonl` is append-only. Never edit an existing line, never change another task's status, never delete anything.

On a git conflict in `ledger.jsonl`, **keep every line from both sides**. `specweave init` and `specweave update` write this into `.gitattributes` so git does it for you:

```
**/ledger.jsonl merge=union
```

The fold sorts events by timestamp before deriving state, so the concatenation order does not matter.

### 4. `done` needs proof

```bash
specweave task done T-01 --run "npm test -- cart"
```

The task's `Test` command must exit 0, and the commit sha goes into the evidence. Paste the output in your report. A task that turned out to be unnecessary is closed with a reason, never ticked:

```bash
specweave task skip T-07 --reason "endpoint already exists"
```

### 5. When you stop, release and hand off

```bash
specweave task release --all-mine
specweave handoff
```

Otherwise your claims sit there until the lease expires and the next agent has to guess.

---

## Reading the board

```bash
specweave task list        # task, status, owner, evidence
specweave task list --json
```

`tasks.md` carries the same view, rendered between `<!-- SW:BOARD -->` markers on every ledger write. Read it; never hand-edit it.

---

## Running it in Claude Code

<CommandTabs
  natural="Split this increment across three agents"
  claude="sw:team"
  other="specweave task next in each worktree"
/>

`sw:team` sets up the worktrees, hands each agent its lane, and does one closure at the end. It is the merge of 1.x's `team-lead` and `team-merge` skills.

Use it when the work has **three or more genuinely disjoint lanes** — disjoint meaning their `Files` sets do not overlap. Two agents fighting over the same file is slower than one agent doing both tasks.

---

## Unattended runs

For a single agent running until the work is done, see [Autonomous execution](/docs/guides/autonomous-execution) (`sw:auto`). Teams and auto mode compose: each agent in a team can run its own auto session in its own worktree.

---

## See also

- [SpecWeave 2.0](/docs/guides/specweave-2#multi-agent-five-rules)
- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
- [Commands reference](/docs/reference/commands) — the `specweave task` verbs
