---
title: "Claude Code usage limit reached: what to do next"
description: "How Claude Code's five-hour and weekly usage limits work, how to check what you have left, and how to keep working when you hit one: wait, buy more, or hand the task to Codex or another account without losing your place."
slug: /guides/claude-code-usage-limit
keywords: [claude code usage limit, claude code limit reached, claude code weekly limit, claude usage limit reached, claude code 5 hour limit, claude code rate limit, what to do when claude code runs out, claude code out of tokens]
---

# Claude Code usage limit reached: what to do next

You are halfway through a task, Claude Code says you have hit your usage limit, and the reset is hours or days away. This page explains how the limits work, how to see one coming, and the four ways to keep going. The last one, handing the task to another tool or account, is the one that doesn't cost you money or time.

## How the limits work

On a Pro or Max plan, Claude Code shares its allowance with Claude in the browser and the desktop app. Two limits apply at the same time:

| Limit | What it is | When it resets |
|---|---|---|
| **Session window** | A rolling five-hour window that starts with your first message | Five hours after it started |
| **Weekly limit** | A seven-day cap on total use, with a separate cap for the largest models on some plans | Seven days after the week started |

Max plans raise both limits (5x and 20x the Pro allowance), but they don't remove them. Long agentic sessions use far more than chat: every tool call sends the conversation, your `CLAUDE.md`, and the definitions of every connected MCP tool again. Starting a new conversation doesn't reset either window.

Anthropic adjusts the exact numbers from time to time, so check the [Claude help center](https://support.claude.com) for the current ones. Codex on a ChatGPT plan works the same way, with its own five-hour and weekly windows.

## See it coming

- **`/usage`** inside Claude Code shows your session and weekly bars and when each one resets. **`/status`** gives a quick snapshot.
- **Settings > Usage** on claude.ai shows the same bars.
- **A status line** can show the percentage all the time. `specweave statusline` does this; automatic checkpoints do not depend on that reading.

Claude Code also warns you when you are close to a plan limit. A warning, or even a 100% plan reading, is not proof that the current provider will reject the next request: extra usage, credits or a proxy may still let work continue. Keep recovery state current independently of the reading, and choose whether to switch when the provider actually refuses work or when it suits you.

## Your options when the limit hits

### 1. Wait for the reset

Free, and fine if the reset is an hour away. Less fine on a weekly limit with five days to go. Before you stop, ask Claude to write down where it is, or the next session (yours, after the reset) starts from a summary of a summary.

### 2. Pay for more

Paid plans can turn on extra usage billed at API rates, or you can point Claude Code at an API key. You keep the same session, at a price. A bigger plan raises the ceiling for next time.

### 3. Use a smaller model

Switching to a smaller model with `/model` can get you past a limit that applies only to the largest models. It doesn't give you a fresh session window, and the smaller model may not finish the hard part of the task.

### 4. Hand the task to another tool or account

If you also have Codex, Grok Build, Gemini CLI or a second Claude account, the fastest way to keep working is to continue there. The problem is that none of them can read Claude Code's session. Copying a summary by hand loses your uncommitted edits, the decisions you made, and which tasks were actually finished.

[SpecWeave](/docs/overview/introduction/) fixes that by keeping the state of the work in git:

```bash
specweave handoff --reason "out of usage"
```

`handoff` releases your task claims, writes `handoff.md` with where you stopped and what comes next, and pushes your branch and a snapshot of your uncommitted edits. In the other tool, from the same repository:

```bash
specweave pickup
```

`pickup` applies your edits and prints the next task with its acceptance criteria, its test command, notes and the project memory. You can also just say "hand off" in Claude Code and "pick up" in Codex; the instruction file SpecWeave installs tells every agent what those words mean.

The step-by-step version is [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/).

## Save recovery state automatically

On your own machine, SpecWeave can keep a local checkpoint without interrupting work:

```bash
specweave auto-handoff on          # silent local saves after turns
specweave auto-handoff status      # hook status and checkpoint directory
```

Claude Code and Codex queue a detached worker after a `Stop`, throttled to once every five minutes per canonical worktree and session. Claude Code and Grok Build queue the same local worker on `StopFailure` with `rate_limit`. It needs no model, usage reading or network, never pushes or releases task claims, and leaves your checkout untouched. It is event-driven, with no daemon.

Successful saves write `~/.specweave/checkpoints/<hash>/current.json`, pointing to a saved handoff document and diff. `pickup` does not apply these recovery files. When you decide to switch tools or machines, run `specweave handoff` to transfer ownership and push your work.

Existing enabled settings adopt the new behavior when the CLI is upgraded; hook commands stay the same. `--at` remains accepted for compatibility and no longer sets a threshold. Refresh project instructions with `specweave update` to remove old quota-stop rules. Cloud sessions without user hooks need an explicit handoff. Usage warnings alone never tell the agent to stop. [Automatic checkpoint rules](/docs/guides/auto-handoff/) has the details.

## Make the allowance last longer

- **Keep the instruction file short.** Everything in `CLAUDE.md` is sent with every request. SpecWeave's `AGENTS.md` is about 760 tokens, and `CLAUDE.md` only imports it. See [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md/).
- **Disconnect MCP servers you aren't using.** Their tool definitions are sent every time.
- **Work from a written spec.** A short `spec.md` with acceptance criteria means fewer rounds of "that's not what I meant".
- **Compact at 400K on 1M-context models.** Each message resends the conversation so far, and Claude Code's default waits until about 967K tokens to summarize it. `specweave autocompact on` (or `/autocompact 400k`) keeps every turn under half that. See [Auto-compact at 400K](/docs/guides/claude-code-auto-compact/).
- **Start a fresh session per task.** A long transcript makes every later step more expensive. With the task state in the repository, a new session needs one `specweave pickup` to catch up.

## Common questions

**Does starting a new chat reset the Claude Code limit?** No. Both the five-hour window and the weekly limit count all your use, across Claude Code and Claude in the browser.

**Can Codex continue my Claude Code session?** Not directly; Codex can't read Claude Code's transcript. With SpecWeave, the spec, the task state, a handoff note and your uncommitted edits go through git, and `specweave pickup` in Codex continues from there.

**Does it work with a second Claude account instead of Codex?** Yes. Project memory in Claude Code stays with one account, so a second account starts cold without a handoff. `specweave pickup` gives it the same starting point Codex would get.

**Do I need the SpecWeave CLI?** For automatic local checkpoints, yes. For a manual one, the self-contained skill is enough: `npx vskill i handoff`. It needs only `git` and a shell.

## See also

- [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/)
- [Handoff and pickup](/docs/guides/cross-tool-handoff/)
- [Auto-handoff rules](/docs/guides/auto-handoff/)
- [Auto-compact at 400K](/docs/guides/claude-code-auto-compact/)
- [Claude Code vs Codex: use both](/docs/guides/claude-code-vs-codex/)
- [Claude Code Projects and threads](/docs/guides/claude-code-projects/)
