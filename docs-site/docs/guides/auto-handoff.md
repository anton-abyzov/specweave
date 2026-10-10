---
title: "Auto-handoff near the usage limit: suggest or enforce, for Claude Code, Codex and Grok Build"
description: "What SpecWeave does near a Claude Code or Codex usage limit: a heads-up at 95% by default or a handoff in enforce mode, the 30-minute reset rule, which hook fires in each tool, what gets pushed, and how \"pick up\" continues the work in the next tool."
---

# Auto-handoff rules

> **Turn it on once. At 95% of a usage window the session tells you a handoff is available and keeps working; when a turn actually hits the limit, it hands off by itself and you say "pick up" in the next tool.**

```bash
specweave auto-handoff on                  # once per machine; suggest mode at 95%
specweave auto-handoff on --mode enforce   # stop and hand off at the threshold instead
specweave auto-handoff on --at 90          # your own threshold
specweave auto-handoff on --wait-under 60  # stay quiet when the limit resets within an hour
specweave auto-handoff on --mode checkpoint  # never act on usage; only save local checkpoints
specweave auto-handoff status              # mode, hooks in place, last usage each tool reported
specweave auto-handoff off                 # puts your previous setup back
```

`on` writes to your own tool settings in your home folder, not to the project, so it covers every SpecWeave project on that machine. Run it again any time: it never adds a hook twice, and it repairs anything `status` says is missing.

Every hook also saves a **local checkpoint** after each turn, so between handoffs there is always a recent recovery point on the machine. See [Local checkpoints](#local-checkpoints-between-handoffs).

## The rules in one table

| | Claude Code | Codex | Grok Build | Gemini CLI, Cursor, Copilot, OpenCode, cloud sessions |
|---|---|---|---|---|
| **How usage is measured** | Terminal sessions: the 5-hour, weekly and spend percentages Claude Code passes to its status line (Pro and Max, after the first reply), saved per session by `specweave statusline`. Desktop, Remote Control and `claude -p` sessions run no status line: they use the desktop app's usage samples or Claude Code's own usage cache when fresh (see below). | The `rate_limits` Codex writes into its own session log every turn (5-hour and weekly `used_percent`). | Grok shows no usage percentage. | None of them shows a usage percentage to scripts. |
| **What fires at the threshold** | `Stop` hook `specweave usage-guard` | `Stop` hook `specweave usage-guard` in `~/.codex/hooks.json` | nothing (no number to compare) | nothing |
| **What fires when the limit is hit** | `StopFailure` hook (matcher `rate_limit`) runs `specweave usage-guard --limit-hit`, which writes the handoff itself | the threshold Stop hook is the only one | `StopFailure` hook in `~/.grok/hooks/` writes the handoff itself | you say "hand off" in the next session |
| **Recognises "hand off" / "pick up"** | the `sw-handoff` skill, and `AGENTS.md` through `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` (SpecWeave adds it to Gemini CLI's `context.fileName`) |

## Three modes

| Mode | At the threshold | When a turn hits the limit |
|---|---|---|
| `suggest` (default) | The session tells you once, in one line, that usage is at 96% of the 5-hour limit and when it resets, and that you can say "hand off". It keeps working. | Hands off by itself (Claude Code, Grok Build): the session cannot go on, so this is the last moment to write the handoff. |
| `enforce` | The session runs `specweave handoff` and stops, and tells you to say "pick up" in another tool. This was the only behaviour before 3.0.11. | Hands off by itself. |
| `checkpoint` | Nothing. | Saves a local checkpoint only. |

Pick one with `specweave auto-handoff on --mode <mode>`. `--checkpoint-only` and `--handoff` still work as the old names for `checkpoint` and `enforce`.

Why `suggest` is the default: a stop at the threshold throws away the rest of the window, and the rest can be a lot of work. 9% of a weekly limit is hours of work, and every session on the same account stops at once. The work is not at risk without the stop: when a turn really runs out, the limit hook writes the handoff without the model (Claude Code, Grok Build), and local checkpoints cover the turns in between. Choose `enforce` when you would rather move early than ever be cut off mid-turn, for example for Codex, which has no limit hook.

## Where 95% comes from

The threshold is the `at` value in `~/.specweave/auto-handoff.json`, 95 unless you pass `--at`. It is compared with the **fullest window that has not reset yet**: the 5-hour window, the weekly window, or the spend limit, whichever is highest. A window whose reset time has passed is ignored, so yesterday's 98% never triggers anything today.

Settings written before 3.0.11 move to the new defaults when you upgrade: `suggest` instead of the old stop, and 95 if the file held the old default of 90. A threshold you chose yourself and checkpoint-only mode are kept. Run `specweave auto-handoff on --mode enforce --at 90` to get the old behaviour back.

## The reset rule: wait rather than move

A handoff is worth it when the wait is long. When **every** window at or past the threshold resets within `--wait-under` minutes (30 by default), the session neither suggests nor enforces anything: finishing in the same tool after a short wait beats moving the work. The same rule holds when a turn hits the limit: a reset within 30 minutes saves a local checkpoint and writes no handoff, and Claude Code shows its own "resets at" message.

The rule needs reset times. The status line and Claude Code's usage cache carry them, and so does Codex's session log. The desktop app's samples do not; a reset time still ahead in the usage cache is borrowed for them. With no known reset time the session acts as if the wait were long. `--wait-under 0` turns the rule off.

The weekly window is why "every" matters: at 97% of the 5-hour window and 96% of the weekly one, the 5-hour reset in 20 minutes does not help, so the session acts.

## What happens at the threshold

1. The agent finishes its turn. The `Stop` hook reads the latest usage for that session.
2. Under the threshold, or when the full windows reset within the wait, it prints `{}` and adds nothing to the conversation: no tokens, no files.
3. At or past it, the hook keeps the agent going for one more reply.
   - In **suggest** mode the agent adds one line for you and finishes as it was about to. In Claude Code you also see "Auto-handoff: usage is at 96% of the 5-hour limit, which resets in 2 h 10 min. Work continues; say "hand off" to move it to another tool or account." Say "hand off" whenever you want to move.
   - In **enforce** mode it tells the agent: run `specweave handoff --reason "usage at 96% of the 5-hour limit"`, tell the user to say "pick up" in another tool, and stop. In Claude Code you see "Auto-handoff: usage is at 96% of the 5-hour limit, which resets in 2 h 10 min, so this session is handing off", not an error. In Codex the hook blocks the stop with the same instruction.
4. A handoff (in enforce mode, when you say "hand off", or from the limit hook) runs `specweave handoff`:
   - releases its task claims, so the next tool is not locked out;
   - records the handoff in the increment's `ledger.jsonl`;
   - writes `handoff.md` next to the increment (where it stopped, the next step, files touched);
   - scrubs secrets from what it writes;
   - pushes the branch, and a snapshot of uncommitted edits to the `specweave-handoff` branch and `wip/<branch>`, when the repo has an `origin` remote (`--no-push` keeps it local);
   - refreshes the HTML report at `reports/handoff-report.html`.

   Your working tree, index and branch are left as they were.

A session hears about it **once per usage window**. If you keep working in the same session after the window resets and it fills up again, it hears about it again.

The hook stays quiet in two cases, whatever the percentage:

- **Outside a SpecWeave project.** With no `.specweave/config.json` in the session's folder or above it, there is no increment, ledger or branch to hand off, so a plain chat is never told to run `specweave handoff`.
- **A Codex plan whose credits will last.** Next to the percentages, Codex logs `credits` (`has_credits`, `balance`, `unlimited`). While there is a balance, or the plan is unlimited, Codex keeps answering after a window reaches 100%, so the session is not asked to stop. `specweave auto-handoff status` says so under the Codex line.

Both still save local checkpoints.

Credits are a balance, and a busy day can spend it. Once a window is at the threshold, the hook reads back through the session's log to the balances Codex logged in the hour before its newest one and works out how long the rest lasts at that rate. Under **60 minutes**, a session in a project gets the heads-up (suggest) or is asked to hand off (enforce) once, with "credits are running out (about 8 min left at the current rate)" in the request. What gives no rate, and so never asks:

- balances less than two minutes apart, or a single one;
- a balance Codex did not report, and an unlimited plan;
- anything spent before a top-up. The measurement starts again at a record with no credits, or with less than half of the newest balance. A smaller top-up is not noticed and makes the rate look lower for up to an hour.

The estimate needs the session's own log, so a session whose first turn already runs out is not caught. Codex has no failure hook, so in that case its last local checkpoint is what `specweave pickup` offers.

Codex logs more than one limit in a session: the plan's own (`limit_id: "codex"`) and others such as `gpt-reserve`. The hook reads the plan's newest record, however many records of other limits follow it, as far back as the last 64 MB of the log.

## Desktop, Remote Control and `claude -p` sessions

Claude Code runs the status line only in a terminal session. In the desktop app, in a Remote Control session and in `claude -p`, the Stop hook falls back to two readings, whichever is fresher:

- **The desktop app's usage samples**, `plan-usage-history.json` in the app's folder (`~/Library/Application Support/Claude/` on macOS). The app writes your 5-hour and 7-day percentages there about every 15 minutes while it runs, for each organization you use; the hook takes the newest sample of the session's organization (`CLAUDE_CODE_ORGANIZATION_UUID`) when it is under 20 minutes old.
- **Claude Code's own usage cache**, `cachedUsageUtilization` in `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`), refreshed only when Claude Code fetches your usage, for example when you open `/usage`. The hook uses it when it is under an hour old and belongs to the signed-in account.

Neither is guaranteed. Samples come minutes apart and usage can jump from 0% to 100% between two of them, and both files are the app's own, undocumented. So in those sessions, plan on this: **they hand off when a turn hits the limit**, through the `StopFailure` hook below, and act at the threshold when a fresh reading shows it. `specweave auto-handoff status` says the same. For a dependable reading at the threshold, run the work in a terminal session.

## What happens when the limit is hit mid-task

Usage can jump from under the threshold to the limit inside one long turn. Then the turn fails on the limit before the Stop hook can ask.

- **Claude Code** and **Grok Build** fire `StopFailure` with `error: "rate_limit"`. The hook does not need the model: it runs `specweave handoff` itself, with the reason "usage limit reached in claude" (or grok), and pushes as above. It does this at most once per session every five hours, so a retry loop hands off once. It runs in suggest and enforce mode alike, and even if a handoff at the threshold already happened, so the handoff carries the latest edits. When the limit resets within `--wait-under` minutes it only saves a local checkpoint.
- **Codex** has no failure hook. Its threshold Stop hook is the safety margin (on a plan with credits, the one-hour credit estimate above); set `--at` lower if your turns are long. Codex skips a new hook until you trust it, and there is no command to approve one: open `codex` in a terminal once after `auto-handoff on` and approve the hook when it asks. Until then a Codex session at 96% gets no heads-up and no handoff.
- Outside a SpecWeave project (no `.specweave/config.json` above the folder) the limit hook does nothing, like the threshold hook.

Claude Code also shows the model a note starting "[Usage limit approaching" or "[Usage limit reached" on some plans. `AGENTS.md` tells the agent to mention "approaching" in one line and keep working, and to treat "reached" as the handoff moment, which is the only automatic path in cloud sessions, where there is no status line or user hook.

## Local checkpoints between handoffs

Each `Stop` (Claude Code, Codex) and each `StopFailure` with `rate_limit` (Claude Code, Grok Build) also queues a detached local worker that saves a checkpoint: a handoff document and a diff of the worktree under `~/.specweave/checkpoints/<hash>/`, with a `current.json` receipt that points to the newest complete save. Saves are throttled to once every five minutes per worktree and session. The worker makes no model call, no network request and no commit, never pushes and never releases a claim, and leaves your checkout, index and branch untouched. There is no daemon: an idle session does not save.

A checkpoint is recovery evidence on this machine, not a transfer: it is never pushed and never applied for you. When the newest checkpoint for the worktree is newer than the last handoff, `specweave pickup` prints a `Local checkpoint:` line with the session that saved it and the paths of its document and diff, so a session that died before it could hand off is not lost. Read them and compare with the checkout before restoring anything.

## Checkpoint-only mode

A plan percentage is not always the end of the road: extra usage, credits or a proxy can keep a provider answering after a window reaches 100%. If that is your setup, turn usage off entirely:

```bash
specweave auto-handoff on --mode checkpoint   # local checkpoints only, never act on usage
specweave auto-handoff on --mode suggest      # back to the heads-up at the threshold
```

In checkpoint-only mode the Stop hook never steers the model and a rate-limited turn only saves a checkpoint. Running `on` again keeps the mode, threshold and wait you chose.

## Inside SpecWeave Studio

[SpecWeave Studio](/studio) runs Claude Code and Codex sessions itself and can switch a thread from one provider to the other between turns, by a per-project rule: offer the fallback, wait for the reset, or switch automatically at a percentage you pick. When Studio starts a provider session it sets `SPECWEAVE_STUDIO_THREAD_ID`. With that variable set, the hooks never ask the model to hand off, because a pushed handoff in the middle of a Studio thread would release claims the next provider still needs. They only save the checkpoint, and also write it to `~/.specweave/checkpoints/studio/<thread>.json`, one file per Studio thread whichever provider wrote it. Outside Studio, the same machine keeps handing off as above.

## Pick up in the next tool

Say "pick up" (or "continue from the other account"). Every tool reads the same rule in `AGENTS.md` and runs:

```bash
specweave pickup
```

`pickup` fetches the last handoff, moves the branch forward to it and applies the handed-off edits when your checkout is clean. If it is not, it says what to do and changes nothing. It writes a `pickup` line to the increment's ledger once per handoff, also when both tools work in the same checkout, so the report counts every change of hands. Then it prints the increment, the next task with its acceptance criteria, its files and test, who holds which claim, and the notes left for you. The agent continues from that task. Claude Code's SessionStart hook prints the same summary when a session opens, without fetching.

## Check that it works

`specweave auto-handoff status` shows, per tool, whether the hooks are in place and the last usage that tool reported:

```text
Auto-handoff is on at 95% in suggest mode (since 2026-10-10T19:40:00.000Z): a session tells you once per usage window at the threshold that you can say "hand off", and keeps working; nothing when every full window resets within 30 min. A turn that hits the limit hands off by itself.
Claude Code: status line, Stop and StopFailure hooks in place; last reading 5-hour 42% · weekly 12% (3 min ago)
  Desktop, Remote Control and `claude -p` sessions run no status line. They read the desktop app's usage samples (every 15 minutes or so) or Claude Code's usage cache when either is fresh, so a jump past the threshold between samples is missed; then they hand off when a turn hits the limit.
Codex: Stop hook in place but not approved yet; last reading 5-hour 61% · weekly 20% (10 min ago)
  Codex skips a hook until you trust it: open `codex` in a terminal and approve the hook when it asks. It asks again whenever the hook changes, for example after `auto-handoff on` with a new SpecWeave version.
Local checkpoints: /Users/you/.specweave/checkpoints (per worktree and session; current.json points to the latest complete save).
Checkpoints never push or release claims; a handoff does, so the next tool can `specweave pickup`.
```

"no usage reading yet" for Claude Code means no terminal session's status line has run since `on` and no fresh desktop sample or usage cache exists: open a terminal session and send one message. "not approved yet" for Codex means `~/.codex/config.toml` has no `trusted_hash` for this exact hook (`[hooks.state."<home>/.codex/hooks.json:stop:<group>:<hook>"]`). Trust entries for plugin hooks do not count. Codex ties the trust to the hook's content, so a changed hook needs approving again. To see the whole path without waiting for a real limit, run `specweave auto-handoff on --at 1 --mode enforce` in a test project and send one message: the session hands off for real, pushes included. Then set it back with `specweave auto-handoff on --at 95 --mode suggest`.

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
claude code local checkpoint before usage limit
claude code stop hook usage limit
-->
