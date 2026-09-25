---
description: Hand work to another tool, account or machine and pick it up there, in two words. Use when the user says "hand off", "out of tokens", "switching accounts", "pick up" or "continue".
argument-hint: "[--reason \"...\"] [--next \"...\"]"
version: 3.0.0
---
<!-- Generated from skills/sw-handoff/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-handoff: "hand off" here, "pick up" there

The user should never have to copy a prompt. Two words each way.

## Hand off

When the user says "hand off", "handoff", "I'm out of tokens", "switching to Codex" or
"switching accounts", run:

```bash
specweave handoff --reason "<their words>"
```

It releases your task claims, records the handoff in the ledger, writes `handoff.md`
next to the increment, pushes the branch, and pushes a snapshot of your uncommitted
edits to the `specweave-handoff` branch (and `wip/<branch>`). Your working tree,
index and branch are untouched. Relay its two or three lines as they are, then tell
the user: say "pick up" in the other tool.

Add `--next "<exact next step>"`, `--gotcha "..."` or `--decision "..."` only for what
the files cannot tell the next agent. No Git remote and another machine:
`--inline` prints a prompt to paste instead. `--no-push` keeps it local.

To hand off by itself, the user runs `specweave auto-handoff on` once (Claude Code and
Codex, on their own machine; not in cloud sessions). A session then hands off at 90% of
the 5-hour or weekly limit (`--at <percent>` to change it); `auto-handoff status` shows
the current usage. When its Stop hook asks you to hand off, run the handoff it names.

## Pick up

When the user says "pick up", "pick up here", "continue" or "continue from the other
account", run `specweave pickup`. It fetches the last handoff, moves this branch
forward to it and applies the handed-off edits (only on a clean tree), then prints the
increment, the next task with its acceptance criteria and any notes. If it reports
uncommitted changes or a diverged branch, do what it says; never discard the user's
edits. Then continue with sw-do.

## Notes and the record

- `specweave note "<text>"` leaves a message for whoever works on the increment next.
- `specweave report` writes an HTML timeline of who did what: tools, sessions,
  handoffs, pickups, evidence.

## Manual path (no CLI)

1. Release each task you hold by appending a line to its `ledger.jsonl`:
   `{"t":"T-03","e":"release","by":"codex@mbp","at":"2026-09-02T12:00:00Z"}`, and a note
   for the next agent: `{"t":"*","e":"note","by":"codex@mbp","at":"2026-09-02T12:00:00Z","note":"T-03 half done, see handoff.md"}`.
   In PowerShell append with `[IO.File]::AppendAllText` and UTF-8 without a BOM, never `>>`.
2. Write `.specweave/increments/<id>/handoff.md` (UTF-8, no BOM) with these sections in
   this order: `## Where I left off`, `## Done / Pending`, `## Decisions`,
   `## Files touched`, `## Next steps`, `## Resume`, and a last line
   `<!-- Doc format v2 -->`. Scrub tokens, keys and passwords from it first.
3. Commit the work in progress and push the branch:

```bash
git add -A
git commit -m "0042: work in progress (handoff)"
git push -u origin HEAD
```

To pick up by hand: `git fetch origin`, check out that branch, read its `handoff.md`,
and continue at the first task in spec.md with no `done` line in the ledger.
