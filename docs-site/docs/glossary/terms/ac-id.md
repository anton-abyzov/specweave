---
title: AC-ID
sidebar_label: AC-ID
description: How acceptance criteria are numbered in spec.md, how tasks point at them, and when an AC counts as met.
---

# AC-ID (acceptance criterion id)

An **AC-ID** names one acceptance criterion in an increment's `spec.md`. Tasks point at AC-IDs, so every criterion can be traced to the work and the test that satisfy it.

## Format

New increments number criteria `AC-01`, `AC-02` and so on, as checklist items in the Acceptance Criteria section:

```markdown
## Acceptance Criteria

- [ ] AC-01: Returning within 24 hours restores the cart and shipping choice
- [ ] AC-02: A paid order is never restored
```

Each criterion should be specific and testable: someone reading it can say yes or no without asking you.

Increments written with 2.x often use the story-based form `AC-US1-01`. The CLI reads both, so there is nothing to rename.

## How tasks use them

Every task in the Tasks section names the criteria it covers on its detail line:

```markdown
### T-02 Restore the draft on return
- AC: AC-01, AC-02 | Files: src/checkout/restore.ts, src/checkout/restore.test.ts | Test: npm test -- restore
```

`specweave task next` and `specweave task claim` print the task together with the full text of these criteria, so the agent does not reread the whole spec for each task.

## When an AC is met

An AC counts as met when at least one task covers it and every task that covers it is done or skipped, with at least one done. Task state comes from the [ledger](/docs/glossary/terms/ledger), so nobody ticks checkboxes by hand. A box you tick yourself still counts, for a criterion you verified manually.

`specweave verify` reports how many criteria are met and fails while any is not. `specweave complete` will not close the increment until verify passes, unless you give a `--reason`. See [quality gate](/docs/glossary/terms/quality-gate).

## Tips

- One observable behaviour per criterion. If it has "and" in the middle, it is probably two.
- Write the criterion before the task. A task with no AC is work nobody asked for.
- An AC no task covers is never met. `verify` will tell you.

## Related

- [spec.md](/docs/glossary/terms/spec-md)
- [Increment](/docs/glossary/terms/increments)
- [What is an increment](/docs/guides/core-concepts/what-is-an-increment)
