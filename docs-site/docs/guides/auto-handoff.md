---
title: "Automatic checkpoints: keep working without quota interruptions"
description: "SpecWeave saves local recovery checkpoints after turns without stopping the agent, calling a model, pushing to git or depending on usage readings. Use explicit handoff when you choose to switch."
---

# Automatic checkpoint rules

`auto-handoff` now saves local recovery checkpoints in the background. Work continues, even when a plan reports 90% or 100% usage. When you choose to switch tools, accounts or machines, explicit `specweave handoff` still transfers ownership and pushes your edits.

```bash
specweave auto-handoff on            # once per machine; silent local checkpoints
specweave auto-handoff status        # hook status and checkpoint directory
specweave auto-handoff off           # restores your previous setup
```

`on` writes to your own tool settings in your home folder, so it covers local directories and Git worktrees on that machine. A `.specweave` project adds context but is not required. Running it again repairs missing hooks without duplicating them. There is no daemon: each supported hook may queue one detached worker, which exits after saving.

## Why saving no longer waits for 90%

A plan percentage describes a usage window, not whether the current provider will accept another request. Extra usage, credits or a proxy may keep requests working after a window reaches 100%. Desktop usage samples can also be stale or missing, and a long turn can exhaust a limit before the next reading.

Automatic saving therefore does not read usage to decide whether to run, and it never asks the model to hand off or stop. Usage warnings remain informational. `--at <percent>` is accepted for compatibility with old commands, but has no effect on checkpoint timing. Status-line usage display can continue independently.

## Which hooks save

| Tool | After a completed turn | After a rate-limit failure |
|---|---|---|
| Claude Code | `Stop` queues a checkpoint | `StopFailure` with `rate_limit` queues the same worker |
| Codex | `Stop` queues a checkpoint when the hook is trusted | No failure hook; the last successful checkpoint remains available |
| Grok Build | No regular checkpoint hook | `StopFailure` with `rate_limit` queues the same worker |
| Other tools and cloud sessions without user hooks | Use explicit `specweave handoff` | Use explicit `specweave handoff` from an available shell or session |

The hook command remains `specweave usage-guard`; failure hooks add `--limit-hit`. It returns without a model-visible instruction. An invalid or missing directory or session identity, or a disabled setting, is a no-op. Saving does not require a `.specweave` project. Claude Code desktop, Remote Control and `claude -p` sessions need the relevant hook to run, but no longer need a status line or desktop usage cache.

## What a checkpoint does

1. The hook resolves the current directory and session identity and queues a detached local worker. It includes SpecWeave project context when available.
2. Saves are throttled to once every five minutes per canonical worktree and session. Parallel sessions and separate worktrees have separate checkpoint locations; paths that resolve to the same worktree share its identity.
3. The worker captures a handoff document and diff without modifying the checkout, index, branch or task claims. It makes no model calls, commits, pushes or other network requests.
4. Only after a successful save, it writes a `current.json` receipt under `~/.specweave/checkpoints/<hash>/` that points to the saved files. Failed attempts do not replace the last successful receipt.

The five-minute interval is a throttle on hook events, not a timer. An idle session does not wake up to save, and a turn that has not reached a supported hook has not created a new checkpoint. Check the receipt before assuming the latest edit was captured.

## Recover local work

Run:

```bash
specweave auto-handoff status
```

The output shows hook health and the checkpoint directory. Open the matching `current.json` receipt and inspect the handoff document and diff it references. Compare them with the current checkout before restoring any edits; another session may still be working there.

These files stay on this machine. They are recovery evidence, not a transfer of task ownership, and `specweave pickup` does not apply them. To make work available to another machine or account through git, run an explicit handoff from the owning checkout:

```bash
specweave handoff --reason "switching tools"
```

That command releases your claims and pushes the handoff and uncommitted edits as before. In the destination tool, `specweave pickup` fetches the explicit handoff and applies its edits when the checkout is clean. [Handoff and pickup](/docs/guides/cross-tool-handoff/) explains the checks and options.

## Parallel sessions, proxies and Tailscale

Local checkpoint saving does not use a proxy, Tailscale connection, git remote or provider API. Their availability cannot make the checkpoint wait for network access. The worker keeps each worktree and session separate and does not release another worker's task claims.

An explicit handoff still pushes through your configured git transport, so it can require your network, proxy or Tailscale connection. Treat that remote transfer separately from a successful local checkpoint. A local receipt alone does not prove another machine received your work.

## Upgrade an existing setup

Enabled settings from earlier releases adopt checkpoint behavior as soon as the upgraded CLI handles the hook. The installed hook commands stay the same. You do not need to disable and re-enable automatic saving to remove the old quota behavior.

Run `specweave update` in each project to refresh generated instructions and skills that formerly told the agent to stop on usage warnings. Preserve your own project instructions when reviewing the update. Run `specweave auto-handoff status` to inspect the setup, and `on` again if it reports a missing hook.

Codex skips an untrusted hook. If `status` reports that condition, open Codex in a terminal and approve the hook when it asks. Trust belongs to the hook's content; changing that content can require approval again. This release keeps the existing command stable.

## Turning it off

`specweave auto-handoff off` removes the installed Stop, StopFailure and Grok hooks, restores your previous status line and deletes `~/.specweave/auto-handoff.json`. With the setting removed, any remaining hook invocation is a no-op.

## See also

- [Handoff and pickup](/docs/guides/cross-tool-handoff/): explicit transfer and what a handoff contains.
- [Claude Code vs Codex](/docs/guides/claude-code-vs-codex/): instruction files, sessions and switching tools.
- [Commands](/docs/reference/commands/): command flags.

<!-- SEO long-tail keywords (one phrase per line for exact-match indexing):
claude code usage limit auto handoff
claude code 5-hour limit switch to codex
codex usage limit continue in claude code
nonblocking local recovery checkpoint
claude code stop hook usage limit
-->
