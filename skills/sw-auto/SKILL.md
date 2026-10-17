---
description: Run a SpecWeave increment unattended until every task is done, then verify and close - the Unattended section of sw-do. Use for "auto mode", "run until done".
argument-hint: "[increment-ids...] [--dry-run|--reset]"
disable-model-invocation: true
version: 3.1.0
---

# sw-auto: run until done

Follow sw-do's "Unattended (auto mode)" section for the increments named, starting
with `specweave auto <ids>`, and close with sw-done when nothing claimable is left.
This entry exists so the command keeps its name; sw-do holds the rules.

## Manual path (no CLI)

Without the CLI there is no hook and no session file: follow sw-do's manual path in a
loop until every task in spec.md has a `done` or `skip` line, then sw-done.
