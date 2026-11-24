---
title: "Codex usage limit reached: what to do next"
description: "Hit the Codex usage limit? How the five-hour and weekly windows work on ChatGPT plans, where to check what is left, and how to keep working on the task."
slug: /guides/codex-usage-limit
keywords: [codex usage limit, codex limit reached, codex rate limit, codex weekly limit, codex 5 hour limit, codex usage limit reset, codex out of usage, chatgpt codex limit]
---

# Codex usage limit reached: what to do next

Codex stops mid-task with a usage limit notice, and the reset time is hours or days away. This page explains how Codex limits work on a ChatGPT plan, how to see one coming, and the ways to keep going. The last one, moving the task to another tool or account, keeps your place without paying for more.

OpenAI changes plans and numbers often. Everything below was checked against OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) and the help article [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) on November 24, 2026. Check them for the current state.

## How the limits work

- **One allowance for agent work.** "ChatGPT Work and Codex share pricing, credits, and usage limits." The same pool also covers ChatGPT for Excel and Workspace Agents where your plan has them. Regular ChatGPT voice, image and file-upload limits are separate and do not use Codex usage.
- **Local and cloud draw from the same pool.** The CLI, the IDE extension, the desktop app and cloud tasks all count. OpenAI notes that cloud tasks "may use more of your allowance than local messages".
- **A five-hour window, and a weekly one.** On Plus and Standard Business, usage is counted per five-hour period, and "weekly limits may also apply". Pro plans "currently have no five-hour limit".
- **The model matters a lot.** OpenAI's estimates for Plus range from 6 to 50 local messages per five hours on GPT-6.2 Astra to 350 to 3,000 on GPT-6 Luna. They are estimates, not fixed caps: a long task with a big context and lots of tool calls uses far more than a short request.
- **API keys are billed separately.** A Codex session signed in with an API key uses API pricing, "not your ChatGPT allowance".

Starting a new chat does not reset either window.

## See it coming

- **`/status`** in an active Codex CLI session shows your usage.
- **The usage dashboard** at [chatgpt.com/codex/settings/usage](https://chatgpt.com/codex/settings/usage) shows which allowance is used up, your credit balance and the reset times.
- **The session log.** Codex writes its five-hour and weekly `used_percent` into its own session log every turn. That is what SpecWeave's automatic handoff reads (below).

## Your options when the limit hits

### 1. Wait for the reset

Free, and fine when the five-hour window resets soon. Before you stop, ask Codex to write down where it is: what is done, what is half done and what comes next. A fresh session after the reset then starts from your notes instead of from nothing.

### 2. Buy credits or upgrade

OpenAI's notice lists what your account can do: add credits, use an available reset, upgrade, or wait. Eligible Plus and Pro users can buy credits without changing plans, and credits let you keep working after the included limit. Rates differ by model, so check the [token rates](https://learn.chatgpt.com/docs/pricing) first.

### 3. Switch to a lighter model

Lighter models use much less of the allowance per message, so `/model` can stretch what is left of a window. It will not reset the window, and a lighter model may not finish the hardest part of the task.

### 4. Hand the task to another tool or account

If you also have Claude Code, Grok Build, Gemini CLI or a second ChatGPT account, the fastest way to keep working is to continue there. None of them can read Codex's session, and a summary copied by hand loses your uncommitted edits, the decisions you made and which tasks were actually finished.

[SpecWeave](/docs/overview/introduction/) keeps the state of the work in git instead:

```bash
specweave handoff --reason "codex out of usage"
```

`handoff` releases your task claims, writes `handoff.md` with where you stopped and what comes next, and pushes your branch and a snapshot of your uncommitted edits. In the other tool, from the same repository:

```bash
specweave pickup
```

`pickup` applies your edits and prints the next task with its acceptance criteria, its test command and the project memory. You can also say "hand off" in Codex and "pick up" in Claude Code: the `AGENTS.md` SpecWeave installs tells every agent what those words mean. [What goes in handoff.md](/docs/guides/handoff-md/) shows the file the next agent reads.

## Hand off before the limit

On your own machine, SpecWeave can watch the Codex limit for you:

```bash
specweave auto-handoff on                 # heads-up at 95% of the five-hour or weekly window
specweave auto-handoff on --mode enforce  # or stop and hand off there
specweave auto-handoff status
```

A `Stop` hook in `~/.codex/hooks.json` reads the limits from the session log. When the fuller window crosses the threshold, Codex tells you once that a handoff is available; in `enforce` mode it runs `specweave handoff` and tells you to say "pick up" in the next tool. Codex has no hook that fires when a turn hits the limit, so `enforce` is the safer choice for Codex. While you have credits, Codex keeps answering past 100%, and the hook does not ask it to stop. [Auto-handoff rules](/docs/guides/auto-handoff/) has the details.

## Make the allowance last longer

- **Keep `AGENTS.md` short.** It is sent with every request. SpecWeave's is about 760 tokens.
- **Turn off MCP servers you are not using.** Their tool definitions are sent every time.
- **Start a new chat per task.** A long transcript makes every later step more expensive, and Codex says a chat that keeps compacting without progress should be restarted with a short summary.
- **Work from a written spec.** A short `spec.md` with acceptance criteria means fewer rounds of "that's not what I meant".

:::tip Prefer a desktop app?
[SpecWithCode](/code/) is a free, open-source (MIT) desktop app that runs Codex and Claude Code side by side with your own sign-ins. When Codex hits its limit and another provider is signed in, the thread can continue there, if the project allows it. Watch [Keep working when a provider runs out](/tutorials/provider-runs-out/).
:::

## Common questions

**Does a new chat reset the Codex limit?** No. Both windows count all your Codex use on that account, local and cloud.

**Do ChatGPT messages use my Codex allowance?** Regular chat, voice, image generation and file uploads have their own limits. ChatGPT Work, ChatGPT for Excel and Workspace Agents share the Codex pool on plans that have them.

**Can Claude Code continue my Codex session?** Not directly; Claude Code does not read Codex's session files. With SpecWeave the spec, the task state, a handoff note and your uncommitted edits go through git, and `specweave pickup` in Claude Code continues from there.

**Will OpenAI support reset my limit?** No. The help article says support "does not reset ChatGPT or Codex usage limits".

## See also

- [Claude Code usage limit reached](/docs/guides/claude-code-usage-limit/): the same question for Claude Pro, Max and Ultra
- [Claude Code vs Codex](/docs/guides/claude-code-vs-codex/): differences that matter day to day
- [Handoff and pickup](/docs/guides/cross-tool-handoff/)
- [Auto-handoff rules](/docs/guides/auto-handoff/)
- [SpecWithCode](/code/): run several coding agents on your own machines
