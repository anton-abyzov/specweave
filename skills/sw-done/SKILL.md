---
description: Close a SpecWeave increment - every task done or skipped, specweave verify green, a fresh-context review, then specweave complete. Use for "close it", "we are done", "finish up".
argument-hint: "[increment-id] [--reason \"...\"]"
version: 3.0.0
---

# sw-done: close an increment

Closing is verify, review, complete. The one hard gate is a passing
`reports/verify.json`; everything else is evidence.

## Steps

1. **Board.** `specweave task list`: every task must be `done` or `skipped`. Anything
   open goes back to sw-do, or `specweave task skip T-04 --reason "<why>"`.
2. **Verify.** `specweave verify` runs the project's test, lint and build commands
   (config `testing.commands`, else detected), checks every acceptance criterion
   against the ledger (an AC is met when all its tasks are done) and writes
   `reports/verify.md` and `reports/verify.json`. Red: fix and re-run. Do not tick
   AC boxes; they are derived.
3. **Review.** For anything that ships, run sw-review in a fresh context. Fix critical
   and high findings, then verify again.
4. **Docs.** If commands, config or user-facing behaviour changed, update README,
   CHANGELOG and the `## Commands` table in AGENTS.md in the same branch.
5. **Complete.** `specweave complete 0042`. It refuses without a passing verify unless
   the user gives a reason: `specweave complete 0042 --reason "<why>"`.
6. **Ship.** Push the branch and open the PR the way this repository ships;
   `specweave report` writes an HTML timeline to attach as evidence.

Report in one paragraph: verify result, review verdict (or "skipped"), commits,
anything deferred.

## Manual path (no CLI)

Check every task in spec.md has a `done` or `skip` line in `ledger.jsonl`. Run the
project's test, lint and build commands yourself and put their real output in
`reports/verify.md`. Then set `"status": "completed"` in `metadata.json`, the one state
change the manual path makes by hand.

## Rules

- Never ask "should I close?" when the tasks are done; close, and the user can reopen.
- Never edit `metadata.json` status while the CLI is available.
- Several agents on one increment: only the lead closes, after every agent has handed
  off or released its claims.
- Completing never calls GitHub, Jira or Azure DevOps unless close-on-complete is set;
  a failed sync afterwards is retried with `specweave sync push`.
