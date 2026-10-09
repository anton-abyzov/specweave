---
title: "Claude Code auto-compact: compact at 400K to save usage"
description: "Why Claude Code sessions on 1M-context models burn usage before they compact, how /autocompact 400k fixes it, and how SpecWeave and SpecWeave Studio set it for you. Codex keeps its own compaction."
slug: /guides/claude-code-auto-compact
keywords: [claude code autocompact, claude code auto compact, /autocompact, autoCompactWindow, claude code 1m context usage, claude code compaction usage, claude code context window cost]
---

# Claude Code auto-compact: compact at 400K

Auto-compact replaces your whole conversation with a short summary when it gets
long. Until it runs, every message you send carries the whole conversation so far.
Most of that is read from the prompt cache, which is much cheaper than fresh input,
but it still counts toward your five-hour and weekly usage.

On a 1M-context model Claude Code waits until about 967K tokens before it
compacts, so the last stretch of a long session sends close to a million tokens
with every message. Compacting at 400K keeps each message under half that.
Lydia Hallie of the Claude Code team
[explained this](https://x.com/lydiahallie/status/2108624109538291901) and
recommends `/autocompact 400k`.

## What SpecWeave sets

| Where | What |
|---|---|
| `specweave init` | Writes `"autoCompactWindow": 400000` to the new project's `.claude/settings.json`. It is committed, so teammates and cloud sessions get it too. |
| `specweave autocompact on` | Writes the same to `~/.claude/settings.json`, for every project on this machine. `--at 600k` picks another window; `--project` writes the project file instead. |
| `specweave autocompact off` | Removes the window from that file, so Claude Code picks its own again. |
| `specweave autocompact status` | Shows the window Claude Code will use, which file it comes from, any per-model values saved by `/autocompact`, and Codex's cap. |
| SpecWeave Studio | Starts Claude sessions with a 400K window. Change it per Claude provider instance under **Auto-compact after**, or enter `auto` to leave it to Claude Code. |

Claude Code compacts at the smaller of the setting and the model's context window,
so 400K changes nothing on 200K models. It only acts on the 1M-context models,
which is where the cost builds up.

## How Claude Code picks the window

- `CLAUDE_CODE_AUTO_COMPACT_WINDOW` in the environment wins over every file.
- Otherwise settings files apply in order: `~/.claude/settings.json`, then the
  project's `.claude/settings.json`, then `.claude/settings.local.json`.
- `/autocompact` saves a per-model value under `modelSettings` in your settings.
  In the same file it beats the top-level `autoCompactWindow`, but a higher file
  that sets the top-level value replaces it.

So a project's 400K overrides a personal `/autocompact` saved in your user
settings. To keep your own value in one project, set it in
`.claude/settings.local.json`, which is not committed.

## When to pick a larger window

Compacting more often means more of the session lives in a summary rather than
verbatim. For a long investigation where the exact earlier output matters, use
`specweave autocompact on --at 700k` or `/autocompact` for that model. Valid
windows run from 100K to 1M.

## Compaction and handoffs

Compaction does not lose your SpecWeave place. The SessionStart hook runs again
after every compaction and puts the compact pickup (open increment, next task,
its acceptance criteria) back into the conversation. With `specweave auto-handoff
on`, the latest local checkpoint is at most five minutes old whenever a limit hits.

## Codex

Codex compacts on its own schedule from the model's window, and SpecWeave leaves
it alone. To cap it, set `model_auto_compact_token_limit` in
`~/.codex/config.toml`; `specweave autocompact status` shows the value.

## See also

- [Usage limit reached](/docs/guides/claude-code-usage-limit/)
- [Auto-handoff rules](/docs/guides/auto-handoff/)
