---
description: Plan work as a SpecWeave increment - one spec.md with Problem, Scope, numbered ACs, Approach and Tasks - before writing code. Use for "plan a feature", "new increment", "let's build X".
argument-hint: "\"<title>\" [--supersedes NNNN]"
version: 3.0.0
---

# sw-increment: plan the unit of work

An increment is one folder, `.specweave/increments/NNNN-slug/`, with one file you write:
`spec.md`. `ledger.jsonl` beside it holds task state and is only appended to;
`metadata.json` is machine state you never need to read. One increment is one branch
and one PR.

## Before writing

- A small self-contained fix needs no increment. Just do it.
- An open increment already owns the files this touches (`specweave task list`)? Add
  ACs and tasks to its spec.md instead of opening another.
- Read the code the change touches before writing Approach.
- Unsure what to build at all? Run sw-brainstorm's Options first.

## Decide

Run sw-brainstorm's Decide step before writing ACs: think first, settle facts yourself,
then ask the user only the decisions that are theirs, one question at a time, each with
a recommended answer. `planning.deepInterview` sets the depth: `critical` (default) asks
at most 5, `deep` ("grill me") has no cap, `off` skips. A clear request asks nothing.
Record every answer and default in spec.md `## Decisions` and apply it to Scope, ACs
and Approach. Without sw-brainstorm installed: ask at most 5, each with your
recommendation, and record them the same way.

## Create it

`specweave create-increment "Add rate limiting"` prints the new folder with a scaffolded
spec.md; replace every `[bracket]`. Add `--supersedes 0031` when this replaces an older
increment (that one is abandoned for you), `--planned` for backlog work.

Manual path (no CLI): next id = highest folder number + 1, zero-padded to 4. Create
`NNNN-kebab-slug/` with `spec.md`, an empty `ledger.jsonl` and this `metadata.json`:

```json
{"id":"0042-ledger-fold","status":"active","type":"feature","created":"2026-09-02T10:00:00Z","lastActivity":"2026-09-02T10:00:00Z"}
```

Write UTF-8 without a BOM; in PowerShell use
`[IO.File]::WriteAllText($p, $body, [Text.UTF8Encoding]::new($false))`, never `>`.

## spec.md

```markdown
# 0042 Ledger fold

## Problem
Two agents can both believe they own T-01. Who hits it, and the evidence.

## Scope
In: claim ordering, malformed lines. Out: a ledger server.

## Acceptance Criteria
- [ ] AC-01: Two agents claiming the same task never both get it
- [ ] AC-02: A malformed ledger line is skipped and counted, never fatal

## Approach
Files that change and in what order, decisions, rejected alternatives, risks.

## Decisions
### Asked
- D-01 Claim tie-break? → earliest ledger line wins (user).
### Defaulted (change any before sw-do)
- D-02 Malformed-line report → a count in `task list` (reversible).
### Open
- none

## Tasks

### T-01 Fold the ledger
- AC: AC-01 | Files: src/core/tasks/ledger.ts, tests/e2e/double-claim.e2e.ts | Test: npm run test:e2e -- double-claim

### T-02 Skip malformed lines
- AC: AC-02 | Files: src/core/tasks/ledger-parse.ts, tests/e2e/malformed-ledger.e2e.ts | Test: npm run test:e2e -- malformed-ledger
```

- ACs are observable: "p95 of /search under 300 ms with 10k rows", not "faster".
- Every AC is covered by at least one task; every task names its `Files` and a `Test`
  command a machine can run.
- A `Test` checks the AC from the outside: the CLI, HTTP route, UI or public API a user
  or caller touches, run with the repo's own test command. A new test file goes in the
  task's `Files`. Reuse existing tests; plan new unit or integration tests only when the
  user, the project's `testing` config or its conventions ask for them. The
  human-approved AC is the oracle, not a test the agent wrote.
- `Files` is the ownership unit: two tasks that edit one file cannot run in parallel,
  so merge them. Shared contracts (types, schema) go in an early task.
- An AC is met when every task covering it is done. Nobody ticks the boxes; never
  write state into spec.md.
- `plan.md` is optional overflow for a genuinely large design.

## Then

Show the ACs and tasks. Unless the user asked to review the plan first, carry on with
sw-do (one agent) or sw-team (three or more disjoint lanes).
