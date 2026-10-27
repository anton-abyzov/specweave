---
description: Close a SpecWeave increment - every task done or skipped, specweave verify green, a fresh-context review, then specweave complete. Use for "close it", "we are done", "finish up".
argument-hint: "[increment-id] [--reason \"...\"]"
metadata:
  version: "3.1.0"
---
<!-- Generated from skills/sw-done/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

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
3. **Review.** For anything that ships, run sw-review in a fresh context. With
   `review.crossModel` on, also `specweave review`: another model family reviews the
   diff (exit 3 means fix first). If the project has a `GLOSSARY.md`, run
   `specweave glossary check` and rename new code that uses an avoided word. Fix
   critical and high findings, then verify again. In a bloated context, spawn the
   `sw-closer` agent as the fresh-context option; it returns JSON, fixes nothing and
   completes only on a clean `ship` review, so re-read `reports/verify.json` and the
   review report yourself rather than trusting its summary, fix any critical or high
   finding here, then complete.
4. **Docs.** If commands, config or user-facing behaviour changed, update README,
   CHANGELOG and the `## Commands` table in AGENTS.md in the same branch.
5. **Complete.** `specweave complete 0042`. It refuses without a passing verify unless
   the user gives a reason: `specweave complete 0042 --reason "<why>"`.
6. **Ship.** Push the branch and open the PR the way this repository ships;
   `specweave report` writes an HTML timeline to attach as evidence.

Report in one paragraph: verify result, review verdict (or "skipped"), commits,
anything deferred.

## Accepted skips

When a check of an AC cannot be run because the user lacks an installation or a
license, and the user explicitly accepts skipping that named check, record it:

```bash
specweave ac accept-skip AC-03 0042 --check <check-id> --reason "<why it cannot run>" \
  --accepted-by <person> --authorization "<their words, or a message/thread ref>" [--accepted-at 2026-10-27]
```

This records one `accept-skip` event in the increment's ledger, which is never rewritten,
so an AC and check already accepted is refused. Ordinary unavailability never authorizes it; only
the user's own words do. An accepted skip is never verification: it does not tick the
AC or count toward met ACs, and other work on the AC stays as it was. `specweave ac
list` and the `--json` of `task list`, `verify` and `pickup` show each AC's
`acceptance`: `met`, `mixed` (met by its tasks or checkbox, plus an accepted skip),
`skipped-accepted` (not met, no task citing it is unresolved, at least one accepted
skip) or `open`. A skipped-accepted AC lets `specweave complete` pass; `verify.md`,
`verify.json` (`acceptedSkips`, `acs.skippedAccepted`) and the closure output name it.

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
