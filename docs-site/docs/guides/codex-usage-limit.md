---
title: "Codex usage limit reached: what to do next"
description: "Hit the Codex usage limit? How the five-hour and weekly windows work on ChatGPT plans, where to check what is left, and how to keep working on the task."
slug: /guides/codex-usage-limit
keywords: [codex usage limit, codex limit reached, codex rate limit, codex weekly limit, codex 5 hour limit, codex usage limit reset, codex out of usage, chatgpt codex limit]
---

# Codex usage limit reached: what to do next

Codex shows a usage limit notice, and the reset time is hours or days away. OpenAI says a turn that is already running can finish, subject to fair-use limits; the notice then lists what your account can do next. This page explains how Codex limits work on a ChatGPT plan, how to see one coming, and the ways to keep going, including moving the task to another tool or account without losing your place.

OpenAI changes plans and numbers often. Everything below was checked against OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) and the help article [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) on November 24, 2026. Check them for the current state.

## How the limits work

- **One allowance for agent work.** "ChatGPT Work and Codex share pricing, credits, and usage limits." On plans that use shared allowances or credits, the same pool also covers ChatGPT for Excel and Workspace Agents where those are available. Regular ChatGPT voice, image generation and file-upload limits are separate, and their banners do not apply to Codex; building or editing a Site in Codex counts toward Codex usage, while auto-review safety checks are free when you are signed in with a ChatGPT account.
- **Local and cloud draw from the same pool.** The CLI, the IDE extension, the desktop app and cloud tasks all count. OpenAI notes that cloud tasks "may use more of your allowance than local messages".
- **A five-hour window, and sometimes a weekly one.** On Plus and Standard Business, usage is counted per five-hour period, and "weekly limits may also apply". Pro plans "currently have no five-hour limit". Enterprise and Edu with flexible pricing have no fixed rate limits.
- **The model matters a lot.** OpenAI's estimates for Plus range from 6 to 50 local messages per five hours on GPT-6.2 Astra to 350 to 3,000 on GPT-6 Luna. They are estimates, not fixed caps: a long task with a big context and lots of tool calls uses far more than a short request.
- **API keys are billed separately.** A Codex session signed in with an API key uses API pricing, "not your ChatGPT allowance".

Starting a new chat does not reset your usage limits.

## See it coming

- **`/status`** in an active Codex CLI session shows your usage.
- **The usage dashboard** at [chatgpt.com/codex/settings/usage](https://chatgpt.com/codex/settings/usage) shows which allowance is used up, your credit balance and the reset times.
- **The session log.** Codex records the rate limits it reports, as `used_percent` per window, in its own session log. That is what SpecWeave's automatic handoff reads (below).

## Your options when the limit hits

### 1. Wait for the reset

Free, and fine when the five-hour window resets soon. Before you stop, ask Codex to write down where it is: what is done, what is half done and what comes next. A fresh session after the reset then starts from your notes instead of from nothing.

### 2. Buy credits or upgrade

OpenAI's notice lists what your account can do: add credits, use an available reset, upgrade, or wait. Eligible Plus and Pro users can buy credits without changing plans, and credits let you keep working after the included limit. Rates differ by model, so check the [token rates](https://learn.chatgpt.com/docs/pricing) first.

### 3. Switch to a lighter model

While a window still has allowance left, a lighter model uses much less of it per message (OpenAI's estimates above), so `/model` can stretch what remains. It will not reset the window, and a lighter model may not finish the hardest part of the task.

### 4. Hand the task to another tool or account

If you also have Claude Code, Grok Build, Gemini CLI or a second ChatGPT account, you can continue there. None of them can read Codex's session, so a summary copied by hand loses your uncommitted edits, the decisions you made and which tasks were finished.

[SpecWeave](/docs/overview/introduction/) keeps that state in git: `specweave handoff` in Codex writes `handoff.md` and, when the repository has a remote and the push succeeds, pushes your branch with a snapshot of your edits, and `specweave pickup` in the other tool continues from there. The two commands and what carries over are in [Handoff and pickup](/docs/guides/cross-tool-handoff/); the Claude Code direction is [Switch from Claude Code to Codex](/docs/guides/switch-claude-code-to-codex/).

## Hand off before the limit

On your own machine, SpecWeave can watch the Codex limit for you:

```bash
specweave auto-handoff on                 # heads-up at 95% of the five-hour or weekly window
specweave auto-handoff on --mode enforce  # or stop and hand off there
specweave auto-handoff status
```

A `Stop` hook in `~/.codex/hooks.json` runs at the end of each turn and reads the limits from the session log. When the fuller window crosses the threshold, Codex tells you once that a handoff is available; in `enforce` mode the hook asks Codex to run `specweave handoff` and tell you to say "pick up" in the next tool. Codex has no hook that fires when a turn fails on the limit, so set the threshold lower if your turns are long. With credits, Codex keeps answering past 100%, so the hook stays quiet unless the credits look likely to run out within about an hour at the current rate. [Auto-handoff rules](/docs/guides/auto-handoff/) has the details.

## Make the allowance last longer

- **Keep `AGENTS.md` short.** Codex loads it into the session's context, so every line costs allowance. SpecWeave's is about 760 tokens.
- **Turn off MCP servers you are not using.** Enabled servers add their tool definitions to the context.
- **Restart a chat that keeps compacting.** OpenAI's advice for a chat that shows "Context automatically compacted" without progress is to start a new one with a short summary of the goal and the work done.
- **Work from a written spec.** A short `spec.md` with acceptance criteria means fewer rounds of "that's not what I meant".

:::tip Prefer a desktop app?
[SpecWithCode](/code/) is a free, open-source (MIT) desktop app that runs Codex and Claude Code side by side with your own sign-ins. When Codex hits its limit, the thread can continue on another compatible provider you are signed in to, if the project allows it. Watch [Keep working when a provider runs out](/tutorials/provider-runs-out/).
:::

## Common questions

**Does a new chat reset the Codex limit?** No. Your limits count Codex use on that account, local and cloud.

**Do ChatGPT messages use my Codex allowance?** Regular chat voice, image generation and file uploads in ChatGPT have their own limits. On plans that use shared allowances or credits, ChatGPT Work, ChatGPT for Excel and Workspace Agents share the Codex pool where they are available.

**Can Claude Code continue my Codex session?** Not directly; Claude Code does not read Codex's session files. With SpecWeave the spec, the task state, a handoff note and your uncommitted edits go through git (pushed when a remote is set up and the push succeeds), and `specweave pickup` in Claude Code continues from there.

**Will OpenAI support reset my limit?** No. The help article says support "does not reset ChatGPT or Codex usage limits".

## See also

- [Claude Code usage limit reached](/docs/guides/claude-code-usage-limit/): the same question for Claude Pro, Max and Ultra
- [Claude Code vs Codex](/docs/guides/claude-code-vs-codex/): differences that matter day to day
- [Handoff and pickup](/docs/guides/cross-tool-handoff/)
- [Auto-handoff rules](/docs/guides/auto-handoff/)
- [SpecWithCode](/code/): run several coding agents on your own machines
