---
description: Work a SpecWeave increment task by task - claim, implement inside the task's Files, test, commit, done with evidence - then verify and close. Use for "implement", "continue", "keep going".
argument-hint: "[increment-id]"
version: 3.0.0
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
2. `specweave task claim T-03`. Exit 3: someone holds it; 4: its Files overlap a live
   claim; 6: its dependencies are not done. Pick another. Never edit before claiming.
3. Implement inside that task's `Files` only. Need another file? Claim the task that
   owns it, or add a task to spec.md `## Tasks`.
4. Run the task's `Test`. Red means fix it; never skip, weaken or delete a test.
5. Commit with the increment id first: `git commit -m "0042: fold the ledger"`.
6. `specweave task done T-03 --run "npm test -- ledger"`. Exit 5: the command failed and
   the task stays open. No `Test`? `--evidence "<sha> + what you checked"`.
7. Stuck: `specweave task block T-03 --reason "<what is missing>"`. Not needed:
   `specweave task skip T-03 --reason "<why>"`. Then back to 1.

Commands take the increment id last (`specweave task next 0042`) when more than one
increment is active. `specweave task list` shows the whole board.

## Finish without asking

When `task next` has nothing left, run sw-done: verify, review, complete.
"All tasks are done, should I close?" is the anti-pattern.

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
$line = '{"t":"T-01","e":"done","by":"codex@win","at":"2026-09-02T11:30:00Z","evidence":"npm test -- ledger exit 0 / a1b2c3d"}'
[IO.File]::AppendAllText($L, $line + "`n", [Text.UTF8Encoding]::new($false))
```

PowerShell never uses `>>` here: it writes UTF-16 and every other tool fails to read it.
Events: `claim`, `done` (needs `evidence`), `release`, `block` and `skip` (both need
`note`), for example
`{"t":"T-02","e":"skip","by":"codex@mbp","at":"2026-09-02T12:00:00Z","note":"covered by T-01"}`.
`by` is `SPECWEAVE_AGENT` if set, else `<tool>@<host>`.

## Rules

- A claim older than 2 hours with no `done` is stale and may be taken over.
- Append only: never edit, reorder or delete a ledger line. On a merge conflict in
  `ledger.jsonl` keep every line from both sides.
- Several agents on one increment: one worktree and branch each (sw-team).
