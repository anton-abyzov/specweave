---
description: Plan a unit of work as a SpecWeave increment - spec.md with Problem, Scope, numbered ACs and an Approach, plus tasks.md. Use when starting a feature, bug, hotfix or refactor.
version: 2.0.0
argument-hint: "<what you want to build> [--supersedes <id>]"
---

# Plan an Increment

An increment is one folder — `.specweave/increments/NNNN-slug/` — holding
`spec.md` (intent + ACs + approach), `tasks.md` (task definitions),
`ledger.jsonl` (state, written by the CLI) and `metadata.json`. It is the unit of
work and the tracker; every commit for it carries its id in the subject.

## Plan mode first (blocking)

Planning produces a document the user approves before any code is written. If your
tool has a plan mode, enter it now (Claude Code: `EnterPlanMode`) and wait for
confirmation. Do not create files, do not implement, until the plan is approved.

## Steps

1. **Understand the request.** Restate it in one sentence: what changes, for whom, why now.
   - Scope clear enough to write ACs? Go to 2.
   - Not clear (vague goal, unknown users, competing options, unclear done-condition)?
     Interview first — ask only the questions whose answers change the spec, in one batch:
     the problem behind the request, who hits it, what "done" looks like, what is explicitly
     out of scope, constraints (stack, deadline, data), and the riskiest unknown.
     Trivial fix → 0 questions. Do not interview to fill a quota.
2. **Look before writing.** Read `.specweave/config.json` (testing commands, sync,
   `workspace.repos`), skim existing increments for overlap (`specweave status`), and
   read the code the change will touch. An Approach written without reading the files is a guess.
3. **Create the folder** — the CLI owns id allocation (atomic, retried):
   ```
   specweave create-increment --auto-id --name "<kebab-slug>" --title "<Title>" \
     --description "<one line>" --project "<project id from config>" [--type feature|bug|hotfix|refactor]
   ```
   Superseding an older increment (`--supersedes <old-id>` once the CLI ships it): create the
   new one, then `specweave abandon <old-id> --reason "superseded by <new-id>"` and name the
   old id in the new spec's Problem section.
4. **Write `spec.md`** — one evolving document, these sections:

   ```markdown
   # NNNN — <Title>

   ## Problem
   What is wrong today, for whom, and the evidence (issue, log, user quote). Not the solution.

   ## Scope
   In: … · Out: … (the "out" list is what stops scope creep later.)

   ## Acceptance Criteria
   - [ ] AC-01: <observable, testable outcome — a reviewer can check it without asking you>
   - [ ] AC-02: …

   ## Approach
   Files that change and in what order · key decisions (+ ADR links) · rejected alternatives
   and why · risks and the mitigation.

   ## Open questions
   - <question> — blocking? who decides?
   ```

   ACs are numbered and observable. "Improve performance" is not an AC; "p95 of
   `/search` under 300 ms with 10k rows" is. Keep them to what this increment ships.
   `plan.md` is optional overflow for a genuinely large design — `--with-plan`; the
   Approach section is the default home.
5. **Write `tasks.md`** — definitions only; the ledger holds state:

   ```markdown
   ### T-01 Add the ledger fold
   - AC: AC-01, AC-02 | Files: src/core/tasks/ledger.ts, src/core/tasks/ledger.test.ts | Test: npm test -- ledger
   ```

   `Files:` is the ownership unit — two tasks that edit the same file cannot run in
   parallel, so merge them or add `**Dependencies**: T-NN`. Every AC must be covered by at
   least one task; every task needs a `Test:` that a machine can run (or an explicit
   "manual: <what to check>"). Shared contracts (types, schema, migrations) go in an early
   task everything else depends on.
6. **Present the plan** (problem, ACs, task list, risks) and get approval. Then leave plan mode.
7. **Hand off to execution**: `sw:do <id>` for one agent; `sw:team <id>` when the work has
   3+ disjoint lanes or 15+ tasks.

## Rules

- **Never hand-edit `metadata.json` status** — CLI transitions own it.
- **WIP is advisory.** The CLI prints one note when active increments exceed
  `limits.activeIncrements` (`0` = off). It never blocks; do not invent a cap.
- **One agent plans.** No planning fan-out — a second opinion on a spec costs more than it adds.
- **Umbrella workspaces**: increments live in the umbrella root only. The `Project:` field on
  a user story routes sync to a child repo; never create `.specweave/` inside a child repo.
- **Bug / hotfix increments are still increments** — smaller spec (Problem, one or two ACs,
  Approach), same folder shape. Do not skip the spec because it is "quick".
- If the user says "don't create an increment", respect it and work in the conversation.

## Resources

- `specweave create-increment --help`, `specweave status`
- [Official Documentation](https://verified-skill.com/docs/reference/skills#increment)
