---
id: tasks-md
title: tasks.md (legacy)
sidebar_label: tasks.md (legacy)
description: The separate task file used by increments created before SpecWeave 3.0 - still read, never created for new increments.
---

# tasks.md (legacy)

**`tasks.md`** was the separate task checklist of increments created with SpecWeave 1.x and 2.x. SpecWeave 3.0 does not create it any more. New increments keep their tasks in the `## Tasks` section of [spec.md](/docs/glossary/terms/spec-md), and task state lives only in the [ledger](/docs/glossary/terms/ledger).

## Why it went away

An audit of a real 2.x project found that about two thirds of a typical `tasks.md` was derived state: checkboxes, status words and counts that repeated what the ledger already knew, and that drifted when two agents edited it. Keeping definitions in `spec.md` and state in the ledger means one file to read and nothing to reconcile.

## Existing increments keep working

If an increment folder has a `tasks.md`, the CLI treats it as the task source for that increment and ignores any Tasks section in `spec.md`. Nothing needs converting:

- `specweave task next`, `claim`, `done` and `verify` read tasks from `tasks.md`.
- Where a task has ledger events, the ledger decides its state. Where it has none, the old checkbox or `**Status**` line is used, so work finished under 2.x still counts as done.
- State is not written back into the file. If you want the checkboxes refreshed from the ledger for people reading it, run:

```bash
specweave task render --write 0031
```

## Moving an open increment to the 3.0 layout

Optional, and only worth it for an increment you will keep working on for a while:

1. Copy each task into a `## Tasks` section at the end of `spec.md` as `### T-01 Title`, followed by one line such as `- AC: AC-01 | Files: src/a.ts | Test: npm test -- a`.
2. Delete `tasks.md`.
3. Run `specweave task list` to check every task was found. The ledger is keyed by task id, so keep the same ids.

## Related

- [spec.md](/docs/glossary/terms/spec-md)
- [Ledger](/docs/glossary/terms/ledger)
- [SpecWeave 3.0](/docs/guides/specweave-3)
