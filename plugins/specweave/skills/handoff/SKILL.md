---
description: Hand work to another tool, account or machine and pick it up there, in two words. Use when the user says "hand off", "hand off all", "out of tokens", "switching accounts", "pick up" or "continue".
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

## Hand off everything (switching accounts with many threads)

When the user switches accounts or tools with several increments in flight ("hand off
all", "switching subscriptions"), run:

```bash
specweave handoff --all --reason "<their words>"
```

It writes `.specweave/handoffs/<date>-INDEX.md` and `index.json`: one row per active
increment (tasks done/total, open ACs, last activity, what it waits on, a paste-ready
resume prompt) and, in an umbrella workspace, every checkout under
`repositories/<org>/<repo>` (and its worktrees) with uncommitted files, unpushed
commits or a branch with no remote, with its open PR when `gh` is installed. It is
read-only toward everything else: no claims released, nothing committed or pushed in
the umbrella or the nested repos. Commit and push the local-only work it lists, or say
so in your reply. `--dry-run` prints the index without writing it.

A wait is a ledger line `{"t":"*","e":"wait","by":"<you>","at":"<ISO time>","note":"Anton: typed go for the cutover"}`
or a `Waits on: ...` line in the increment's `handoff.md`; a `wait` with the note
`resolved` clears the earlier ones.

On the other side, "pick up all" is `specweave pickup --all`: the newest index,
actionable increments first, then the ones waiting on a person. Start each topic with
its resume prompt, then `specweave pickup <id>`.

## Your hand-written handoff is kept

`specweave handoff` never overwrites a `handoff.md` that a person wrote (one without the
`<!-- Doc format v2 -->` marker); the generated doc goes to `handoff.auto.md` beside it.
Text between `<!-- keep -->` and `<!-- /keep -->` in a generated doc survives the next
`handoff`.

## Hand off by itself

The user runs `specweave auto-handoff on` once (Claude Code, Codex and Grok Build, on
their own machine; not in cloud sessions). By default (`--mode suggest`) a session that
reaches 95% of the 5-hour or weekly limit gets a heads-up from the Stop hook: tell the
user in one line that they can say "hand off", and keep working. Do not hand off on a
heads-up. With `--mode enforce` the Stop hook instead asks you to hand off: run the
handoff it names and stop. Neither happens when the full windows reset within 30 minutes
(`--wait-under`), since waiting is cheaper. In both modes a Claude Code or Grok turn that
hits the limit outright hands off from a hook. `auto-handoff status` shows the mode, the
hooks and the last usage reading.

Claude Code also warns the model itself near and at the 5-hour limit, with a note that
starts "[Usage limit approaching" or "[Usage limit reached". "Approaching" is a
heads-up: mention it in one line and keep working. "Reached" is the handoff moment:
finish the current edit, run `specweave handoff --reason "usage limit"` (one command; it
needs no summary from you) and stop.

Between handoffs every hook also saves a local checkpoint under
`~/.specweave/checkpoints/` (no model, network, push or claim change; `pickup` does
not apply it). `auto-handoff on --checkpoint-only` keeps only those checkpoints, for
plans where credits or a proxy keep working past the limit. Inside SpecWeave Studio
(`SPECWEAVE_STUDIO_THREAD_ID` is set) do not hand off on a usage note: Studio switches
the thread to another provider between turns, and a handoff would release its claims.

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
