---
sidebar_position: 3
title: Skills
description: The SpecWeave 3.0 skill set, how to invoke each skill in Claude Code, Codex and other tools, and the plain words that trigger them.
---

# Skills reference

A SpecWeave skill is a short instruction file that walks an agent through one step of the loop. Every skill calls the `specweave` CLI for the actual work, so the result is the same in every tool. The [commands reference](/docs/reference/commands) lists what each command does.

You rarely need to name a skill. `AGENTS.md` tells every agent the loop, so plain words such as "plan this", "keep going", "hand off" or "pick up" are enough.

## The skill set

| Skill | What it does | Plain words that trigger it |
|-------|--------------|-----------------------------|
| `increment` | Plans a unit of work: creates the increment and writes `spec.md` with Problem, Scope, numbered acceptance criteria, Approach and Tasks. | "plan a feature", "new increment", "let's build X" |
| `do` | Works the increment task by task: `task next`, claim, implement, commit, `task done --run` with the test. | "implement", "start working", "continue", "keep going" |
| `auto` | Runs an increment unattended. The Stop hook sends the session back into the loop until every task is done. | "auto mode", "run until done" |
| `team` | Runs one increment with several agents in parallel: a worktree each, claims through the ledger, one close. | "team", "parallel agents" |
| `review` | Adversarial review in a fresh context before shipping. Every finding cites `path:line` and is checked again. | "review", "grill this", "critique the implementation" |
| `done` | Closes an increment: ledger check, `specweave verify`, optional review, `specweave complete`. | "close the increment", "we are done", "finish up" |
| `sync` | GitHub, Jira and Azure DevOps: push progress, pull or import issues, check status, run setup. | "sync", "push to GitHub", "import issues" |
| `handoff` | Writes a secret-scrubbed handoff and pushes it, so the work continues in another tool, account or session. | "hand off", "handoff", "I'm out of tokens", "switching accounts" |
| `project` | Coordinates ongoing work across tools with shared goals, context, artifacts and worker briefs. | "set up a project", "brief a worker" |
| `brainstorm` | Compares options on stated criteria and ends with a pick, before a spec is written. | "brainstorm", "what are our options" |
| `jev` | Hands closed-set decisions (routing, command safety, screening, failure triage) to Jev. | "jev", "system one" |

The Claude Code plugin also carries `qa`, a thin wrapper over `specweave qa` for a risk score. The portable set adds `sw-task` for agents that only need to claim and finish tasks.

There is no pickup skill. `AGENTS.md` tells every agent to run `specweave pickup` at the start of a session and when you say "pick up" or "continue". In Claude Code the SessionStart hook also prints a short pickup on its own.

## How to invoke them

| Where you work | How skills are installed | How you call one |
|----------------|--------------------------|------------------|
| Claude Code with the plugin | `claude plugin install sw@specweave` | `/sw:do`, `/sw:handoff`, `/sw:increment "Add login form"` |
| Claude Code without the plugin (a Claude Code Projects thread, another cloud session) | When the plugin is not installed, `specweave init` copies the skills into `.claude/skills/` in the repo; commit that folder | Pick them from the `/` menu, or ask in plain words |
| Codex (CLI, desktop, cloud) | `specweave init --adapter codex` or `specweave refresh-plugins` writes `.agents/skills/sw-<name>/` | `$sw-do`, `$sw-handoff`, `$sw-increment` |
| Cursor, Gemini CLI, Copilot and other tools | `specweave init --adapter <tool>` writes the skills where that tool looks for them | The tool's own skill syntax, or plain words |
| Any tool, no SpecWeave install | `npx vskill install anton-abyzov/specweave/sw-do` (see below) | The tool's own skill syntax, or plain words |

In Claude Code, `auto`, `done` and `handoff` are marked so the model does not start them by itself; you type `/sw:handoff` or `/sw:done`. Saying "hand off" or "we are done" still works, because `AGENTS.md` tells the agent to run `specweave handoff --reason "<your words>"` whenever it stops, and `specweave complete` to close.

## Handing off in a few words

You do not need to write a long prompt to move work between tools or accounts.

1. In the session that is stopping, say "hand off" (or "I'm out of tokens"). The agent runs `specweave handoff`, which releases its claims and pushes the branch and a snapshot of uncommitted work.
2. In the new session (another tool, a cloud thread, a second account), say "pick up". The agent runs `specweave pickup`, which fetches that handoff, applies it when the working tree is clean, and prints the next task with its acceptance criteria.

`specweave report` then writes an HTML timeline of who did what, as evidence of the handover.

See [cross-tool handoff](/docs/guides/cross-tool-handoff) and [Claude Code Projects](/docs/guides/claude-code-projects).

## Portable skills for any tool

These live in the `skills/` folder of the SpecWeave repo and install with [vskill](/docs/skills/vskill-cli). Each one spells out the file formats and a manual shell procedure, so they work even where the CLI is not installed.

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-task
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-handoff
npx vskill install anton-abyzov/specweave/sw-jev
```

| Skill | Use it when | Writes |
|-------|-------------|--------|
| `sw-increment` | Planning a feature, before any code | `metadata.json`, `spec.md` |
| `sw-do` | Implementing an increment task by task | Commits, ledger events, `reports/verify.json` |
| `sw-task` | Claiming, finishing or skipping tasks; several agents on one increment | `ledger.jsonl` |
| `sw-review` | Reviewing before shipping | `reports/review.md` |
| `sw-handoff` | Stopping: out of tokens, switching tools or machines | `handoff.md`, `handoff.diff` |
| `sw-jev` | A decision whose possible answers can all be listed in advance | Nothing; it answers and you act |

For tools that only read `AGENTS.md`, see [generic AI tools](/docs/integrations/generic-ai-tools).

## Writing your own

Custom skills go in your own plugin or are installed with vskill; they are not added to the `sw` plugin. See [installing skills](/docs/skills/installation) and the [skills overview](/docs/skills).
