---
title: "Auto-handoff at 90%: the rules for Claude Code, Codex and Grok Build"
description: "When SpecWeave hands off by itself near a Claude Code or Codex usage limit: where the 90% comes from, which hook fires in each tool, what gets pushed, and how \"pick up\" continues the work in the next tool."
---

# Auto-handoff rules

> **Turn it on once. At 90% of any usage window the session hands off by itself, and you say "pick up" in the next tool.**

```bash
specweave auto-handoff on            # once per machine; 90% by default
specweave auto-handoff on --at 80    # your own threshold
specweave auto-handoff status        # hooks in place, last usage each tool reported
specweave auto-handoff off           # puts your previous setup back
```

`on` writes to your own tool settings in your home folder, not to the project, so it covers every SpecWeave project on that machine. Run it again any time: it never adds a hook twice, and it repairs anything `status` says is missing.

## The rules in one table

| | Claude Code | Codex | Grok Build | Gemini CLI, Cursor, Copilot, OpenCode, cloud sessions |
|---|---|---|---|---|
| **How usage is measured** | Terminal sessions: the 5-hour, weekly and spend percentages Claude Code passes to its status line (Pro and Max, after the first reply), saved per session by `specweave statusline`. Desktop, Remote Control and `claude -p` sessions run no status line: they use the desktop app's usage samples or Claude Code's own usage cache when fresh (see below). | The `rate_limits` Codex writes into its own session log every turn (5-hour and weekly `used_percent`). | Grok shows no usage percentage. | None of them shows a usage percentage to scripts. |
| **What fires at 90%** | `Stop` hook `specweave usage-guard` | `Stop` hook `specweave usage-guard` in `~/.codex/hooks.json` | nothing (no number to compare) | nothing |
| **What fires when the limit is hit** | `StopFailure` hook (matcher `rate_limit`) runs `specweave usage-guard --limit-hit`, which writes the handoff itself | the 90% Stop hook is the only one | `StopFailure` hook in `~/.grok/hooks/` writes the handoff itself | you say "hand off" in the next session |
| **Recognises "hand off" / "pick up"** | the `sw-handoff` skill, and `AGENTS.md` through `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` (SpecWeave adds it to Gemini CLI's `context.fileName`) |

## Where 90% comes from

The threshold is the `at` value in `~/.specweave/auto-handoff.json`, 90 unless you pass `--at`. It is compared with the **fullest window that has not reset yet**: the 5-hour window, the weekly window, or the spend limit, whichever is highest. A window whose reset time has passed is ignored, so yesterday's 95% never triggers a handoff today.

90 leaves about a tenth of the window for the handoff turn itself, which costs one command and a few lines of output.

## What happens at 90%

1. The agent finishes its turn. The `Stop` hook reads the latest usage for that session.
2. Under the threshold it prints `{}` and adds nothing to the conversation: no tokens, no files.
3. At or past it, the hook keeps the agent going once and tells it: run `specweave handoff --reason "usage at 92% of the 5-hour limit"`, tell the user to say "pick up" in another tool, and stop. In Claude Code you see the note "Auto-handoff: usage is at 92% of the 5-hour limit, so this session is handing off", not an error. In Codex the hook blocks the stop with the same instruction.
4. The agent runs that one command. `specweave handoff`:
   - releases its task claims, so the next tool is not locked out;
   - records the handoff in the increment's `ledger.jsonl`;
   - writes `handoff.md` next to the increment (where it stopped, the next step, files touched);
   - scrubs secrets from what it writes;
   - pushes the branch, and a snapshot of uncommitted edits to the `specweave-handoff` branch and `wip/<branch>`, when the repo has an `origin` remote (`--no-push` keeps it local);
   - refreshes the HTML report at `reports/handoff-report.html`.

   Your working tree, index and branch are left as they were.

A session is asked **once per usage window**. If you keep working in the same session after the window resets and it fills up again, it is asked again.

## Desktop, Remote Control and `claude -p` sessions

Claude Code runs the status line only in a terminal session. In the desktop app, in a Remote Control session and in `claude -p`, the Stop hook falls back to two readings, whichever is fresher:

- **The desktop app's usage samples**, `plan-usage-history.json` in the app's folder (`~/Library/Application Support/Claude/` on macOS). The app writes your 5-hour and 7-day percentages there about every 15 minutes while it runs, for each organization you use; the hook takes the newest sample of the session's organization (`CLAUDE_CODE_ORGANIZATION_UUID`) when it is under 20 minutes old.
- **Claude Code's own usage cache**, `cachedUsageUtilization` in `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`), refreshed only when Claude Code fetches your usage, for example when you open `/usage`. The hook uses it when it is under an hour old and belongs to the signed-in account.

Neither is guaranteed. Samples come minutes apart and usage can jump from 0% to 100% between two of them, and both files are the app's own, undocumented. So in those sessions, plan on this: **they hand off when a turn hits the limit**, through the `StopFailure` hook below, and at 90% when a fresh reading shows it. `specweave auto-handoff status` says the same. For a dependable 90% handoff, run the work in a terminal session.

## What happens when the limit is hit mid-task

Usage can jump from under 90% to the limit inside one long turn. Then the turn fails on the limit before the Stop hook can ask.

- **Claude Code** and **Grok Build** fire `StopFailure` with `error: "rate_limit"`. The hook does not need the model: it runs `specweave handoff` itself, with the reason "usage limit reached in claude" (or grok), and pushes as above. It does this at most once per session every five hours, so a retry loop hands off once. It runs even if the 90% handoff already happened, so the handoff carries the latest edits.
- **Codex** has no failure hook. Its 90% Stop hook is the safety margin; set `--at` lower if your turns are long. Codex skips a new hook until you trust it, and there is no command to approve one: open `codex` in a terminal once after `auto-handoff on` and approve the hook when it asks. Until then a Codex session at 92% just stops.
- Outside a SpecWeave project (no `.specweave/config.json` above the folder) the limit hook does nothing.

Claude Code also shows the model a note starting "[Usage limit approaching" or "[Usage limit reached" on some plans. `AGENTS.md` tells the agent to treat that note as the handoff moment too, which is the only automatic path in cloud sessions, where there is no status line or user hook.

## Pick up in the next tool

Say "pick up" (or "continue from the other account"). Every tool reads the same rule in `AGENTS.md` and runs:

```bash
specweave pickup
```

`pickup` fetches the last handoff, moves the branch forward to it and applies the handed-off edits when your checkout is clean. If it is not, it says what to do and changes nothing. It writes a `pickup` line to the increment's ledger once per handoff, also when both tools work in the same checkout, so the report counts every change of hands. Then it prints the increment, the next task with its acceptance criteria, its files and test, who holds which claim, and the notes left for you. The agent continues from that task. Claude Code's SessionStart hook prints the same summary when a session opens, without fetching.

## Check that it works

`specweave auto-handoff status` shows, per tool, whether the hooks are in place and the last usage that tool reported:

```text
Auto-handoff is on at 90% (since 2026-09-26T05:40:00.000Z).
Claude Code: status line, Stop and StopFailure hooks in place; last reading 5-hour 42% · weekly 12% (3 min ago)
  Desktop, Remote Control and `claude -p` sessions run no status line. They read the desktop app's usage samples (every 15 minutes or so) or Claude Code's usage cache when either is fresh, so a jump past the threshold between samples is missed; then they hand off when a turn hits the limit.
Codex: Stop hook in place but not approved yet; last reading 5-hour 61% · weekly 20% (10 min ago)
  Codex skips a hook until you trust it: open `codex` in a terminal once and approve the hook when it asks.
```

"no usage reading yet" for Claude Code means no terminal session's status line has run since `on` and no fresh desktop sample or usage cache exists: open a terminal session and send one message. "not approved yet" for Codex means Codex has not recorded your trust for the hook in `~/.codex/config.toml`. To see the whole path without waiting for a real limit, run `specweave auto-handoff on --at 1` in a test project and send one message: the session hands off for real, pushes included. Then set it back with `specweave auto-handoff on --at 90`.

## Turning it off

`specweave auto-handoff off` removes the Stop, StopFailure and Grok hooks, puts back the status line you had before, and deletes `~/.specweave/auto-handoff.json`. With the file gone every hook is a no-op even if one was left behind.

---

## See also

- [Handoff and pickup](/docs/guides/cross-tool-handoff/): the manual commands and what a handoff contains.
- [Claude Code vs Codex](/docs/guides/claude-code-vs-codex/): what each tool reads and where its session lives.
- [Commands](/docs/reference/commands/): every flag.

<!-- SEO long-tail keywords (one phrase per line for exact-match indexing):
claude code usage limit auto handoff
claude code 5-hour limit switch to codex
codex usage limit continue in claude code
automatic handoff when out of tokens
claude code stop hook usage limit
-->
