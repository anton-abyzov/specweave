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
- Ask only what changes the spec: the problem behind the request, what is out of scope,
  how you will know it works. A clear request needs no interview.
- Read the code the change touches before writing Approach.

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

## Tasks

### T-01 Fold the ledger
- AC: AC-01 | Files: src/core/tasks/ledger.ts, src/core/tasks/ledger.test.ts | Test: npm test -- ledger

### T-02 Skip malformed lines
- AC: AC-02 | Files: src/core/tasks/ledger-parse.ts | Test: npm test -- ledger
```

- ACs are observable: "p95 of /search under 300 ms with 10k rows", not "faster".
- Every AC is covered by at least one task; every task names its `Files` and a `Test`
  command a machine can run.
- `Files` is the ownership unit: two tasks that edit one file cannot run in parallel,
  so merge them. Shared contracts (types, schema) go in an early task.
- An AC is met when every task covering it is done. Nobody ticks the boxes; never
  write state into spec.md.
- `plan.md` is optional overflow for a genuinely large design.

## Then

Show the ACs and tasks. Unless the user asked to review the plan first, carry on with
sw-do (one agent) or sw-team (three or more disjoint lanes).
