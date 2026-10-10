---
id: spec-md
title: spec.md
sidebar_label: spec.md
description: The single file that describes an increment in SpecWeave 3.0 - Problem, Scope, Acceptance Criteria, Approach, Open questions and Tasks.
---

# spec.md

In SpecWeave 3.0, **`spec.md` is the increment**. It is the one file an agent reads to know what to build, why, how it will be checked, and which tasks are left. It holds definitions only; progress lives in the [ledger](/docs/glossary/terms/ledger).

## Template

`specweave create-increment "title"` writes this:

```markdown
# Keep checkout resumable

## Problem

What is wrong today, for whom, and the evidence. Not the solution.

## Scope

In: what this increment ships. Out: what it does not include.

## Acceptance Criteria

- [ ] AC-01: Specific, testable criterion
- [ ] AC-02: Specific, testable criterion

## Approach

Files that change, in order; key decisions; rejected alternatives; risks.

## Open questions

- question, or "none"

## Tasks

### T-01 First task
- AC: AC-01 | Files: src/file.ts, src/file.test.ts | Test: npm test -- file

### T-02 Second task
- AC: AC-02 | Files: src/other.ts | Test: npm test -- other
```

## Sections

| Section | What goes in it |
|---|---|
| Problem | The situation today and who it hurts. Not the fix. |
| Scope | What is in and what is explicitly out. |
| Acceptance Criteria | Numbered, testable checks (`AC-01`, `AC-02`). See [AC-ID](/docs/glossary/terms/ac-id). |
| Approach | The design in a few lines: files in order, decisions, rejected options, risks. Decisions that must outlive the session go here. |
| Open questions | What still needs an answer, or "none". |
| Tasks | `### T-NN Title` headings, each with one line giving the ACs it covers, the Files it touches and the Test that proves it. |

## What is not in it

- **No status.** There is no frontmatter and no progress written back into the file. Status is in `metadata.json`, task state in `ledger.jsonl`.
- **No separate task file.** Tasks are the last section. Increments from 2.x keep their [tasks.md](/docs/glossary/terms/tasks-md).
- **No long design document.** If the Approach genuinely needs pages, create the increment with `--with-plan` to get an optional `plan.md`.

## Editing it

Edit `spec.md` by hand or through the agent at any time. Adding an AC or a task is a normal edit. Removing a task that has ledger events leaves those events orphaned, so prefer `specweave task skip T-03 --reason "..."` for work that will not happen.

## Related

- [Increment](/docs/glossary/terms/increments)
- [AC-ID](/docs/glossary/terms/ac-id)
- [Ledger](/docs/glossary/terms/ledger)
- [What is an increment](/docs/guides/core-concepts/what-is-an-increment)
