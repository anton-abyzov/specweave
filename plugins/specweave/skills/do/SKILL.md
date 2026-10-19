---
description: Work a SpecWeave increment task by task - claim, implement inside its Files, test, commit, done with evidence - alone, unattended or in lanes, then close. Use for "implement", "continue", "auto".
argument-hint: "[increment-id] [--auto] [--lanes]"
version: 3.1.0
---
<!-- Generated from skills/sw-do/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-do: work an increment to done

Tasks are defined in spec.md under `## Tasks`; their state lives only in the
increment's `ledger.jsonl`, which the CLI appends to. Never write state into spec.md.

## Start

`specweave pickup` applies any handoff pushed from another tool or account, then prints
the open increment, the next task with its acceptance criteria, claims other agents
hold, and notes left for you. No increment yet? Run sw-increment first.

## The loop

1. `specweave task next` prints the next claimable task with its AC text.
2. `specweave task claim T-03`. Exit 3: someone holds it (your own earlier claim from
   a crashed session: say so, then `--force`); 4: its Files overlap a live claim;
   6: its dependencies are not done. Otherwise pick another. Never edit before claiming.
3. Implement inside that task's `Files` only. Need another file? Claim the task that
   owns it, or add a task to spec.md `## Tasks`. Use the words in `GLOSSARY.md`, if
   the project has one, for every new name.
4. Run the task's `Test`. Red means fix the code; never skip, weaken or delete a test.
   Don't write tests first or add unit tests the task did not ask for (unless the
   project's `testing` config or conventions require them): check the AC end to end,
   the way a user would hit it.
5. Commit with the increment id first: `git commit -m "0042: fold the ledger"`.
6. `specweave task done T-03 --run "npm run test:e2e -- double-claim"`. Exit 5: the
   command failed and the task stays open. No `Test`? `--evidence "<sha> + what you checked"`.
7. Stuck: `specweave task block T-03 --reason "<what is missing>"`. Not needed:
   `specweave task skip T-03 --reason "<why>"`. Then back to 1.

Commands take the increment id last (`specweave task next 0042`) when more than one
increment is active. `specweave task list` shows the whole board.

## Unattended (auto mode)

"Auto", "run until done", "ship this while I sleep": the same loop without stopping
to ask. The bar does not drop.

1. Start only when the spec has nothing under `## Decisions` > `### Open` and every
   task has `Files` and a `Test`; otherwise fix the spec first.
2. `specweave auto 0042` records the session (`--dry-run` previews, `--reset` clears
   stale state). A tool that runs SpecWeave's Stop hook hands you the remaining work
   after every turn; in any other tool, keep looping yourself.
3. Blocked (missing secret, ambiguous spec, outside dependency): `task block` and move
   on. When only blocked tasks remain, `specweave cancel-auto` and tell the user what
   each one needs, instead of looping to the turn limit.
4. `specweave auto-status` shows progress; one auto session per project.

## Parallel lanes

Three or more disjoint lanes, or 15+ tasks: you are the lead. Split, start, watch,
merge and close; do not implement.

1. Group tasks into 2 to 5 lanes whose `Files` do not overlap. Shared contracts
   (types, schema) go in an early task the others list under `**Dependencies**: T-01`.
2. One worktree and branch per lane agent (your tool's or app's worktree feature, or
   `git worktree add ../0042-api -b inc/0042-api`), with `SPECWEAVE_AGENT=api` set.
   Brief each one: its tasks, this loop, "edit only their Files", and on finish
   `specweave task release --all-mine` plus `specweave note "api: done" 0042`.
3. Watch with `specweave task list 0042`; `blocked` rows are your queue. A claim older
   than 2 hours with no progress may be taken with `--force`.
4. Merge the lane branches in dependency order (keep every `ledger.jsonl` line from both
   sides), then close as below. Lane agents never run `specweave handoff`.
   `specweave team` opens agent panes for the same setup in tools that have them.

## Finish without asking

When `task next` has nothing left, run sw-done: verify, review, complete, in the same
session. "All tasks are done, should I close?" is the anti-pattern.

Plan for it from the start: a progress checklist or status you keep for the user ends
with "Verify and close 0042", not with "merge" or "release". Work that shipped through
a PR still gets `specweave task done T-03 --evidence "<merge sha>"` first, or the ledger
never shows it finished. A session never ends with every task done and the increment
still open; if a close gate stops you (verify fails, a manual check only the user can
do), say which one in your report.

## Stopping early

Out of tokens, switching tool or account: `specweave handoff --reason "<why>"` (sw-handoff).

## Manual path (no CLI)

Read the tasks from spec.md and the state from `ledger.jsonl`: the next task is the lowest
T-id nobody holds whose Files no live claim holds. Append one JSON object per line, keys
in this order, UTF-8, LF:

```bash
L=.specweave/increments/0042-ledger-fold/ledger.jsonl
printf '%s\n' '{"t":"T-01","e":"claim","by":"codex@mbp","at":"2026-09-02T10:00:00Z"}' >> "$L"
```

```powershell
$L = '.specweave\increments\0042-ledger-fold\ledger.jsonl'
$line = '{"t":"T-01","e":"done","by":"codex@win","at":"2026-09-02T11:30:00Z","evidence":"npm run test:e2e -- double-claim exit 0 / a1b2c3d"}'
[IO.File]::AppendAllText($L, $line + "`n", [Text.UTF8Encoding]::new($false))
```

PowerShell never uses `>>` here: it writes UTF-16 and every other tool fails to read it.
Events: `claim`, `done` (needs `evidence`), `release`, `block` and `skip` (both need
`note`), for example
`{"t":"T-02","e":"skip","by":"codex@mbp","at":"2026-09-02T12:00:00Z","note":"covered by T-01"}`.
`by` is `SPECWEAVE_AGENT` if set, else `<tool>@<host>`. Unattended or in lanes, follow
the same steps by hand: there is no hook and no session file.

## Rules

- A claim older than 2 hours with no `done` is stale and may be taken over.
- Append only: never edit, reorder or delete a ledger line. On a merge conflict in
  `ledger.jsonl` keep every line from both sides.
- Never widen a task's `Files` or weaken a test to keep a loop moving.
- Never edit `.specweave/state/auto-mode.json` by hand; `specweave auto --reset` clears it.
