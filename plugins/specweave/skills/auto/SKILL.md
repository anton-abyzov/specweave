---
description: Run a SpecWeave increment unattended until every task is done, then verify and close. Use for "auto mode", "run until done", "ship this while I sleep".
argument-hint: "[increment-ids...] [--dry-run|--reset]"
version: 3.0.0
---
<!-- Generated from skills/sw-auto/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-auto: run until done

Auto mode is the sw-do loop without stopping to ask. The bar does not drop: claim
before editing, a passing test for every `done`, verify before closing.

## Start

1. The spec has no open questions and every task has `Files` and a `Test`. If not,
   fix the spec first.
2. `specweave auto 0042` records the session (`--dry-run` previews it, `--reset` clears
   stale state). In a tool that runs SpecWeave's Stop hook (Claude Code with the `sw`
   plugin) the hook hands you the remaining work after every turn until nothing is
   left. In any other tool, nothing feeds you back: keep looping yourself.
3. `specweave auto-status` shows progress; `specweave cancel-auto` stops it.

## Each turn

1. `specweave task next` → `specweave task claim T-NN` → implement inside its `Files` →
   commit `0042: ...` → `specweave task done T-NN --run "<Test>"`.
2. A failing test is fixed in the next turn, never marked done.
3. Genuinely blocked (missing secret, ambiguous spec, external dependency):
   `specweave task block T-NN --reason "<what is missing>"` and move on. Blocked tasks
   do not count as remaining work, so the loop ends instead of thrashing.
4. Nothing claimable left: run sw-done (verify, review, complete).

## Running out of budget

Before the session ends for tokens or time: `specweave handoff --reason "auto: out of
tokens"`. The next session, in any tool or account, says "pick up" and continues.

## Manual path (no CLI)

Without the CLI there is no hook and no session file: follow the manual path of sw-do
in a loop until every task in spec.md has a `done` or `skip` line, then sw-done.

## Rules

- Never edit `.specweave/state/auto-mode.json` by hand; `specweave auto --reset` clears it.
- One auto session per project; check `specweave auto-status` before starting another.
- Never widen a task's `Files` or weaken a test to keep the loop moving.
