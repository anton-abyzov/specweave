---
title: "Claude Code vs Codex: use both, and switch when you hit a limit"
description: "How Claude Code and Codex differ in instruction files, skills, sessions and usage limits, and how to continue a half-finished task in the other one without re-explaining it."
slug: /guides/claude-code-vs-codex
keywords: [claude code vs codex, claude code usage limit, switch from claude code to codex, claude code limit reached, codex usage limit, claude code handoff]
---

# Claude Code vs Codex: use both, and switch when you hit a limit

Many developers now have both Claude Code and Codex. Which model is better changes from month to month, so this page skips that question. What matters for daily work is how each tool reads your project, where it keeps its session, and what happens when its usage window runs out halfway through a task.

## Side by side

| | Claude Code | Codex |
|---|---|---|
| **Instruction file** | `CLAUDE.md` (a one-line `@AGENTS.md` import pulls in the shared file) | `AGENTS.md` |
| **Skills folder** | `.claude/skills/`, or plugins | `.agents/skills/`, invoked as `$name` |
| **Where the session lives** | `~/.claude/projects/…/<id>.jsonl` | `~/.codex/sessions/…` |
| **Resume the same session** | `claude -r <id>` | `codex resume <id>` or `codex resume --last` |
| **Cloud option** | Claude Code on the web and Projects threads | Codex cloud tasks |
| **Usage** | 5-hour and weekly windows on Pro and Max plans | 5-hour and weekly windows on ChatGPT plans |
| **Can it read the other's session?** | No | No |

The last row is the important one. Neither tool can open the other's transcript, and a second account of the same tool can't either. When one runs out, the plan, the decisions and your uncommitted edits are stuck in a session nothing else can read.

## When Claude Code hits its usage limit

The fix is to keep the state of the work in the repository instead of in the chat. With SpecWeave:

1. In Claude Code, say "hand off", or run:

   ```bash
   specweave handoff --reason "out of usage"
   ```

   This releases your task claims, writes `handoff.md` with where you stopped and what comes next, and pushes your branch and a snapshot of your uncommitted edits.

2. Open Codex in the same repository and say "pick up", or run:

   ```bash
   specweave pickup
   ```

   Codex gets your edits back and sees the next task with its acceptance criteria, any notes, and the project memory, all in one read.

It works the same way in the other direction, and between two accounts of the same tool. [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/) walks through it step by step, and [Claude Code usage limit reached](/docs/guides/claude-code-usage-limit/) covers your other options when a limit hits.

## Keep recovery checkpoints automatically

On your own machine, enable silent local saves:

```bash
specweave auto-handoff on
```

Claude Code and Codex queue a detached checkpoint after turns, at most once every five minutes per worktree and session. Saving needs no usage reading, model call or network. It leaves claims and your checkout untouched and never stops work at 90% or 100% of a plan. Credits or a proxy can keep a provider available after a plan window fills.

`specweave auto-handoff status` shows the checkpoint directory. These files are local recovery points; `pickup` does not apply them. When you choose to switch, explicit `specweave handoff` still transfers ownership and pushes your edits. Cloud sessions without user hooks need that explicit command. See [Automatic checkpoint rules](/docs/guides/auto-handoff/).

## Set up one repository for both

```bash
npm install -g specweave
specweave init
```

`init` writes one `AGENTS.md` for Codex and every other agent, a `CLAUDE.md` that imports it, and the same skills into `.claude/skills/` and `.agents/skills/`. Nothing needs reinstalling when you switch. See [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md) for why one file is enough.

## Using both on purpose

Switching isn't only for emergencies. Some teams let one tool implement and the other review, or run a Claude Code Projects thread and a Codex cloud task on separate increments at the same time. The ledger records which tool claimed and finished each task (`claude@laptop`, `codex@cloud`), so you can see afterwards who did what.

## Common questions

**Can Codex read my Claude Code conversation?** No, and no tool can read another's. SpecWeave carries what matters (the spec, the task state, your edits and a note) through git instead.

**Do I need both subscriptions?** No. The same handoff works between two accounts of one tool, or to Grok Build, Gemini CLI, Cursor or Copilot.

**What if I don't want another CLI?** Install the self-contained handoff skill with `npx vskill i handoff`. It needs only `git` and a shell and writes a compatible `handoff.md`.

## See also

- [Handoff and pickup](/docs/guides/cross-tool-handoff)
- [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/)
- [Claude Code usage limit reached: what to do next](/docs/guides/claude-code-usage-limit/)
- [Claude Code Projects and threads](/docs/guides/claude-code-projects)
- [Codex, Grok Build, Cursor and Gemini CLI](/docs/integrations/generic-ai-tools)
- [SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro](/docs/compare/spec-driven-development-tools)
