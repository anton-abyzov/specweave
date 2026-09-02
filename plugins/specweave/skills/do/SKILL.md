---
description: Work an increment task by task through the ledger: task next, claim, implement, commit, task done with evidence. Use when saying "implement", "start working", or "continue increment".
version: 2.0.0
argument-hint: "<increment-id>"
---

# Do Increment

Work an increment task by task through the ledger. State lives in
`.specweave/increments/<id>/ledger.jsonl` (append-only); `tasks.md` holds the
definitions. Never hand-edit status lines — `specweave task done` renders them.

## Usage

```
sw:do [<increment-id>]     # id optional when exactly one increment is active
```

## Loop (repeat until `task next` returns nothing)

1. **Pick**: `specweave task next <id>` — prints the first open task whose deps are done and whose `Files` are not held by another agent. If several increments are active, pass the id.
2. **Claim**: `specweave task claim T-NN <id>`. Exit 3 = someone else owns it (pick another), 4 = its Files overlap a live claim, 6 = deps not done. Never edit before claiming.
3. **Read**: the task's `AC:` ids in spec.md and its `Files:`; open plan.md (or spec.md Approach) only for that scope.
4. **Implement** inside the task's `Files` only. Need another file → claim the task that owns it, or add a task (`### T-NN Title` + `- AC: … | Files: … | Test: …`).
5. **Commit** with the increment id in the subject: `git commit -m "<id>: <what>"`.
6. **Done with evidence**: `specweave task done T-NN <id> --run "<Test command>"` (uses the task's `Test:` when `--run` is omitted). Exit 5 = the command failed → task stays open; fix and re-run. No `Test:` → `--evidence "<sha + what you ran>"`. Never claim completion without a fresh, passing run.
7. **Stuck?** `specweave task block T-NN <id> --reason "<what is missing>"`; not needed? `specweave task skip T-NN <id> --reason "<why>"` (terminal).
8. Go to 1.

## Rules

- One agent per worktree when 2+ agents share the increment; branch name contains the increment id.
- Append only: never edit or delete ledger lines, never touch another task's state line.
- If a claim older than 2h (config `tasks.leaseHours`) has no `done`, it is stale — `task next` offers it again; `task claim --force` takes it over.
- Stopping for any reason: `specweave task release --all-mine` then `sw:handoff`.
- No CLI? Append the line yourself: `echo '{"t":"T-01","e":"claim","by":"<agent>","at":"<ISO>"}' >> ledger.jsonl` (PowerShell: `[IO.File]::AppendAllText`). `by` = `SPECWEAVE_AGENT` or `<tool>@<host>`.

## Increment selection (no id given)

- Exactly one `metadata.json` with `status: active` → use it.
- Several → `specweave task list` errors listing candidates; ask which, or take the one named in the auto-mode context / stop-hook feedback.
- None active but exactly one `planned` → the CLI uses it, and `task claim` starts it (`planned → active`). `specweave start <id>` does it explicitly.
- None at all → `sw:increment` first.

## Finish (mandatory, never stop to ask)

When `task next` says nothing is claimable and every task is done or skipped:

1. `specweave verify <id>` → `reports/verify.json` (project test/lint/build + AC table + ledger).
2. Invoke `Skill({ skill: "sw:done" })` with the id. It runs the optional review and `specweave complete`.

Anti-pattern: "All tasks are complete. Should I close?" — close it.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#do)
