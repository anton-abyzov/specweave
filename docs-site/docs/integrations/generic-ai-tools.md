---
title: "Use SpecWeave with Codex, Grok Build, Cursor and Gemini CLI"
description: "How Codex, Grok Build, Cursor, Copilot, Gemini CLI and other agents use SpecWeave through AGENTS.md, skills and the CLI, and how to switch between them mid-task."
sidebar_label: Codex, Grok, Cursor and others
---

# Codex, Grok, Cursor and other tools

SpecWeave does not depend on Claude Code. Everything that matters is a file in git (`AGENTS.md`, the increment's `spec.md`, its `ledger.jsonl`, the handoff and `.specweave/memory/`) plus a CLI that any agent can run in a shell. Claude Code gets a plugin and two hooks on top; every other tool uses the same files and commands.

## What each tool reads

| Tool | Instructions | Skills |
|---|---|---|
| Claude Code, including Projects threads | `CLAUDE.md`, which imports `AGENTS.md` | the `sw` plugin (`/sw:do`), or `.claude/skills/sw-*` |
| Codex (CLI, app and cloud) | `AGENTS.md` | `.agents/skills/sw-*`, invoked as `$sw-do` |
| Grok Build | `AGENTS.md` and `CLAUDE.md` | `.grok/skills/`, `.agents/skills/` and Claude Code skills |
| Cursor, GitHub Copilot, Gemini CLI, OpenCode | `AGENTS.md` | their own skill folders, or the CLI directly |

`AGENTS.md` is the single, short instruction file. It tells every agent to start with `specweave pickup` and describes the loop below, so a tool that reads nothing else still knows what to do.

`specweave init` writes `AGENTS.md` and `CLAUDE.md` and installs the eleven skills twice, as `.claude/skills/sw-<name>/` for Claude Code and `.agents/skills/sw-<name>/` for Codex and other tools that read that folder, so switching tools needs no reinstall. For a tool that looks elsewhere, install the portable skills one at a time:

```bash
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-handoff
```

You never have to name a skill. Asking in plain words ("plan this", "do the next task", "hand off", "pick up where I left off") works in every tool, because the instructions map those requests to the same commands.

## The loop with only the CLI

This is what `AGENTS.md` asks every agent to do. It needs Node.js and `npm install -g specweave`, nothing tool-specific.

```bash
specweave pickup                                  # latest handoff, open increment, next task and its ACs, claims, notes, memory
specweave create-increment "Keep checkout resumable"   # only for new work; then fill in spec.md
specweave task next                               # the next open task with the text of its acceptance criteria
specweave task claim T-01
# edit only the files listed on the task, commit as "0042: what changed"
specweave task done T-01 --run "npm test -- checkout"  # exit 0 required; the output is stored as evidence
specweave verify                                  # project test, lint and build, written to reports/verify.json
specweave complete 0042
```

Tasks live in `spec.md` as `### T-01 Title` followed by `- AC: AC-01 | Files: src/a.ts | Test: npm test -- a`. An acceptance criterion counts as met when every task that covers it is done, so nobody ticks checkboxes.

Without the CLI at all, an agent can still take part by appending ledger lines itself, one JSON object per line:

```json
{"t":"T-01","e":"claim","by":"codex@laptop","at":"2026-09-25T10:00:00Z"}
```

`e` is `claim`, `done`, `release`, `skip` or `block`. A `done` line needs `"evidence"` (a commit sha), and a `skip` line needs `"note"` with the reason.

## Switching tools mid-task

When you run out of tokens or want another model to continue, say "hand off" in the tool you are in, or run:

```bash
specweave handoff --reason "out of tokens"
```

`handoff` releases your task claims, records the handoff in the ledger, writes `handoff.md` with repo-relative paths and scrubs secrets. When the repository has a remote, it also pushes your branch and a snapshot of your uncommitted edits (to `specweave-handoff` and `wip/<branch>`), so another machine, another account or a cloud session such as a Claude Code Projects thread or a Codex cloud task can see the work. Add `--no-push` to keep everything local.

In the next tool, from the same repository, say "pick up", or run:

```bash
specweave pickup
```

`pickup` fetches the waiting handoff, brings your branch and uncommitted edits into this checkout when it is clean, and prints the increment, the next task with its acceptance criteria, notes and memory. `--no-apply` only shows the handoff and changes nothing. To leave a message for whoever works on an increment next, use `specweave note "<text>" [id]`.

Each claim records who made it as `<tool>@<host>`, for example `codex@laptop`, or `<tool>@cloud` in a cloud session. SpecWeave detects Claude Code, Codex, Grok, Cursor, Gemini CLI, Copilot and OpenCode; set `SPECWEAVE_TOOL` or `SPECWEAVE_HOST` to override. See [Cross-tool handoff](/docs/guides/cross-tool-handoff) for the full walk-through and the per-tool session table.

## What only Claude Code gets

- The `sw` plugin with `/sw:<name>` commands.
- The SessionStart hook, which prints a short pickup when a session opens. Other tools run `specweave pickup` because `AGENTS.md` tells them to.
- The Stop hook that drives [auto mode](/docs/guides/autonomous-execution).
- The `specweave team` launcher. The team protocol itself (a worktree per agent, claims through the ledger) works with any tool; see [Agent teams](/docs/guides/agent-teams-and-swarms).

Everything else, including verify, handoff, memory and sync, works the same in every tool.

## See also

- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
- [Claude Code Projects and threads](/docs/guides/claude-code-projects)
- [Portable projects](/docs/guides/portable-projects)
