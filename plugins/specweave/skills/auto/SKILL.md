---
disable-model-invocation: true
description: Run an increment unattended - the Stop hook feeds you back into the loop until every task is done. Use when saying "auto mode", "run until done", or "ship this while I sleep".
version: 2.0.0
argument-hint: "[increment-ids...] [--dry-run|--reset|--all-backlog]"
---

# Auto Mode

Unattended execution. `specweave auto` writes a session file; the plugin's **Stop**
hook reads it after every turn and either blocks (with what remains) or lets the
session end. There is no daemon and no background process — the loop is the hook.

## Start / inspect / stop

| Intent | Command |
|---|---|
| Start on specific increments | `specweave auto 0042 0043` |
| Start on whatever is active | `specweave auto` |
| Preview without activating | `specweave auto --dry-run` |
| Clear stale session state | `specweave auto --reset` |
| Progress of the running session | `specweave auto-status [--json]` |
| Stop it (emergency) | `specweave cancel-auto [--force]` |

## How the loop actually ends

The Stop handler decides each turn, in this order (any error → the session is released,
never trapped):

1. No `auto-mode.json`, or `active !== true` → session over.
2. Session file older than `auto.maxSessionAge` (default 7200 s) → released.
3. Turn count above `auto.maxTurns` (default 20) → safety stop.
4. `stop_hook_active` and no progress for 3 consecutive turns → loop guard releases it.
5. No increment left to work on → released.
6. Zero pending tasks and every AC satisfied → blocks once with
   `all_complete_needs_closure` — that is your cue to close.
7. Otherwise → blocks with `<P> task(s) / <A> AC(s) remain` and you keep going.

So: **you never decide to keep looping.** You do the next task, stop, and the hook
either returns you or lets you go.

## What you do inside the loop

1. `specweave task next <id>` → `task claim` → implement inside the task's `Files` →
   commit `<id>: …` → `specweave task done T-NN <id> --run "<Test>"`. Same loop as `sw:do`.
2. Test fails → fix it in the next turn. Never mark a task done without a passing run.
3. Genuinely blocked (missing secret, ambiguous spec, external dependency) →
   `specweave task block T-NN <id> --note "<what is missing>"` and stop. Blocked tasks do
   not count as remaining work, so the loop ends instead of thrashing.
4. On `all_complete_needs_closure`: `specweave verify <id>`, then `sw:done <id>`.

## Rules

- **Never edit `.specweave/state/auto-mode.json` or `.stop-auto-turns` by hand.**
  `specweave auto --reset` is the supported way to clear them.
- Do not start auto mode on an increment whose spec has open questions — resolve them first.
- Auto mode does not lower the bar: same claim-before-edit, same evidence for `task done`.
- If the hook is not installed (plugin not loaded), `specweave auto` still writes the session
  but nothing feeds you back — say so rather than pretending to loop.
- One auto session per project. Check `specweave auto-status` before starting another.

## Resources

- `specweave auto --help`, `specweave auto-status --help`
- [Official Documentation](https://verified-skill.com/docs/reference/skills#auto)
