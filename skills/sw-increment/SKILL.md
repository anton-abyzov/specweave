---
description: Open a SpecWeave increment - a numbered folder with spec.md (problem, scope, numbered ACs, approach) and tasks.md - before any code. Use for "plan a feature", "new increment", "let's build X".
argument-hint: "\"<feature title>\" [--supersedes NNNN]"
version: "2.0.0"
---

# sw-increment — plan the unit of work

An increment is one folder, `.specweave/increments/NNNN-slug/`, and it is the
tracker: spec + tasks + ledger + evidence live together and travel in git.
Write the spec, get it approved, then implement (`sw-do`). No code before the
ACs exist.

Run `specweave --version`: exit 0 → **CLI path**. Not found → **manual path**.

## 1. Understand before writing

Ask only what you cannot infer from the repo — typically: the problem behind the
request, what is explicitly out of scope, and how you will know it works.
Scope clear from the request? Skip the interview and write the spec.

## 2. Create the folder

CLI:

```bash
specweave create-increment --auto-id --name "<slug>" --title "<Title>" \
  --description "<one line>" --project "<project id from .specweave/config.json>" \
  [--type feature|bug|hotfix|refactor|experiment]
```

Manual: next id = highest existing number + 1, zero-padded to 4
(`ls .specweave/increments`), folder `NNNN-kebab-slug`, then write
`metadata.json`, `spec.md`, `tasks.md`, and an empty `ledger.jsonl`:

```json
{"id":"0042-ledger-fold","status":"active","type":"feature","created":"2026-09-02T10:00:00Z","lastActivity":"2026-09-02T10:00:00Z"}
```

Status is one of `planning` `active` `paused` `ready_for_review` `completed`
`abandoned`, and only lifecycle commands change it. Replacing an older
increment? Add `"supersedes":"0031-old-slug"` here and close that one as
abandoned with the reason `superseded by 0042-ledger-fold`.

## 3. spec.md — one evolving document

```markdown
# 0042 Ledger fold

## Problem
What is wrong today and for whom. The intent, not the solution.

## Scope
In: … · Out: … (say what you are deliberately not doing)

## Acceptance criteria
- [ ] AC-01 Two agents claiming the same task never both get it
- [ ] AC-02 A malformed ledger line is skipped and counted, never fatal

## Approach
Files that change and in what order · risks · decisions taken (link ADRs) ·
alternatives rejected and why.

## Open questions
- …
```

ACs are numbered, checkable, and each one is testable by a command or an
observation. `plan.md` is optional overflow when the Approach outgrows the spec.

## 4. tasks.md — definitions only

```markdown
# Tasks — 0042 Ledger fold

### T-01 Fold the ledger
- AC: AC-01 | Files: src/core/tasks/ledger.ts, src/core/tasks/ledger.test.ts | Test: npm test -- ledger

### T-02 Skip malformed lines
- AC: AC-02 | Files: src/core/tasks/ledger.ts | Test: npm test -- ledger
```

- Every AC is covered by at least one task; every task names its `Files:` (the ownership unit for parallel agents) and a `Test:` command that proves it.
- Split tasks so two agents never need the same file. Task state is NOT written here — the ledger owns it (`sw-task`).

## 5. Approve, then hand off

Show the ACs and the task list, get an explicit go-ahead, then run `sw-do`.
Set `metadata.json.status` to `active` when work starts.

## Rules

- No code, no scaffolding, no dependencies before the spec is approved.
- One increment = one shippable outcome. Two outcomes = two increments.
- ACs are the definition of done; `specweave verify` counts them and
  `specweave complete` refuses to close without passing evidence.

## Related

- `sw-do` — implement it. · `sw-task` — the ledger. · `sw-review` — adversarial pass before closing.
