---
title: Agent teams
description: Run one increment with several agents in parallel, from any vendor, coordinating only through git and the task ledger.
---

# Agent teams

Several agents can work one increment at the same time. They coordinate only through committed files: the task list in `spec.md`, the append-only `ledger.jsonl` and `handoff.md`. There is no message bus and no shared memory, so a Claude Code session, a Codex session, a Cursor window and a person can share one increment without talking to each other.

Use a team when the work splits into three or more lanes whose files do not overlap. Two agents editing the same file is slower than one agent doing both tasks.

## The five rules

Every agent on the team follows these, whatever tool it runs in.

**1. One worktree and branch per agent.** The branch name contains the increment id.

```bash
git worktree add ../0042-claude -b inc/0042-claude
git worktree add ../0042-codex  -b inc/0042-codex
```

**2. Claim before you edit, and edit only the task's files.**

```bash
specweave task next 0042
specweave task claim T-03 0042
```

`claim` fails loudly instead of racing:

| Exit code | Meaning |
|---|---|
| 3 | Someone else holds the claim |
| 4 | The task's `Files` overlap another agent's live claim |
| 6 | The task's dependencies are not done yet |

A claim older than the lease (`tasks.leaseHours`, 2 hours by default) is stale and can be taken over. `--force` overrides a live claim, so use it only when you know the other agent is gone.

**3. The ledger is append-only.** Never edit or delete a line. On a merge conflict in `ledger.jsonl`, keep every line from both sides. `init` and `update-instructions` add `**/ledger.jsonl merge=union` to `.gitattributes` so git does this for you.

**4. Done needs proof.**

```bash
specweave task done T-03 0042 --run "npm test -- cart"
```

The command must exit 0; its output is stored as evidence. A task that turned out to be unnecessary is skipped with a reason, never ticked:

```bash
specweave task skip T-07 0042 --reason "endpoint already exists"
```

**5. When you stop, release and hand off.**

```bash
specweave handoff 0042 --reason "lane done"
```

`handoff` releases your claims (`--keep-claims` keeps them) and pushes your branch and uncommitted edits when there is a remote (`--no-push` keeps them local). To release without handing off, run `specweave task release --all-mine`.

The pushed `specweave-handoff` ref holds only the latest handoff in the repository, so in a team the lead collects work by merging the lane branches, not with `specweave pickup`.

## Watching the team

```bash
specweave task list 0042          # every task: status, owner, evidence
specweave task list 0042 --json
specweave task whoami             # the agent id this shell claims as
```

Agent ids are `<tool>@<host>`, for example `codex@laptop`. Set `SPECWEAVE_AGENT` to give each agent in a team its own name.

Blocked tasks are the lead's queue: unblock them (provide the secret, split the task, make the decision) and tell only that agent.

## Closing

Only the lead closes. Merge the lane branches into the increment branch, keeping every ledger line, then:

```bash
specweave verify 0042
specweave complete 0042
git worktree remove ../0042-claude
```

## In Claude Code

In Claude Code, `/sw:team` (or "split this across three agents") plans the lanes, spawns the agents with the rules above and does the single closure at the end.

`specweave team` launches Claude Code with its experimental agent teams feature turned on:

```bash
specweave team "Build the checkout recovery increment"
specweave team --mode in-process      # no tmux; all agents in one pane
specweave team --no-increment         # free-form swarm without an increment
```

It sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json` for the project and for your user, and starts `claude` inside a new tmux session when tmux is installed, so each agent gets its own pane. Without tmux it falls back to in-process mode. Note that it starts Claude Code with `--dangerously-skip-permissions`, so run it only in a repository and worktree where that is acceptable.

## Teams and auto mode

For one agent running until the work is done, see [Autonomous execution](/docs/guides/autonomous-execution). Each agent in a team can run its own auto session in its own worktree.

## See also

- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
- [Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools)
- [Commands reference](/docs/reference/commands)
