---
title: "A Claude Code and Codex workflow: the daily loop"
description: "A repeatable AI coding workflow for Claude Code, Codex and other agents: plan a short spec, claim a task, prove it with a test, verify, review and close, and hand off when a usage limit hits."
---

import TutorialEmbed from '@site/src/components/TutorialVideo/TutorialEmbed';

# The daily loop

Every change that deserves an increment goes through the same five steps. In a tool with SpecWeave skills you can say the words in the first column; everywhere else, or when you want control, run the commands.

<TutorialEmbed slug="claim-prove-verify-complete" />

```mermaid
flowchart LR
  plan["1. Plan: spec.md"] --> work["2. Work: claim, commit, test"]
  work --> work
  work --> verify["3. Verify: build, test, lint"]
  verify --> review["4. Review: fresh session or another model"]
  review --> complete[5. Complete]
  work -. out of tokens .-> handoff[Hand off]
  handoff -. next tool .-> pickup[Pick up]
  pickup -.-> work
```

| Step | Say | Command |
|---|---|---|
| Plan | "Let's add resumable checkout" | `specweave create-increment "Resumable checkout"` |
| Work | "Do the next task" | `specweave task next`, `task claim T-01`, `task done T-01 --run "npm test"` |
| Verify | "Verify it" | `specweave verify` |
| Review | "Review it" | the `review` skill in a fresh session, or `specweave review` for another model |
| Complete | "We're done" | `specweave complete 0042` |
| Hand off | "Hand off" | `specweave handoff --reason "out of tokens"` |
| Pick up | "Pick up where I left off" | `specweave pickup` |

## 1. Plan

Describe the outcome, not the implementation. The agent creates the increment and writes `spec.md`: the problem, the scope, numbered acceptance criteria, the approach and the tasks. Each task names the criteria it covers, the files it owns and the test that proves it.

Before writing it, the agent asks you only the decisions that are yours (at most five by default), each with a recommended answer, and records them under `## Decisions` ([Decide step](/docs/guides/decide-step)). Read the spec before any code is written. This is the cheapest moment to catch a misunderstanding. Change the criteria until they say exactly what done means.

If an open increment already owns the files this change touches, add criteria and tasks to that increment instead of opening another one. When the shape of the work is unclear, say "grill me": the optional `grill-me` skill interviews you in rounds until every decision is settled (`specweave skills enable grill-me` installs it; see [grill me and glossary](/docs/guides/grill-and-glossary)).

Small, self-contained fixes need no increment. Just ask your agent.

## 2. Work

```bash
specweave task next
```

prints the next open task with the text of its acceptance criteria, its files and its test. The agent claims it, edits only that task's files, commits as `0042: what changed`, and records completion with the real test run:

```bash
specweave task claim T-01
git commit -m "0042: save the checkout draft"
specweave task done T-01 --run "npm test -- draft"
```

`done` runs the command itself and only records the task when it exits 0, storing the output as evidence. If a task cannot be finished, `specweave task block T-01 --reason "..."` or `task skip` records why. You can watch progress with `specweave status` or the [dashboard](/docs/guides/dashboard).

### Task cards

Each task is also a card: one line in the right tense with a link to the PR, report or artifact behind it. Pass the line and link when you claim or finish a task:

```bash
specweave task claim T-01 --line "Saving the checkout draft"
specweave task done T-01 --run "npm test -- draft" --line "Saved the checkout draft" --link https://github.com/acme/shop/pull/42
```

`specweave cards --md` prints the checklist, and `specweave pickup` prints it first:

```text
0042-checkout-draft Checkout draft

✓ Saved the checkout draft (https://github.com/acme/shop/pull/42)
✱ Validating the address
○ Error message
```

Without `--line` the card shows the task title. Without `--link` it links the first PR URL, `log:` report or commit found in the evidence. Lines are capped at 100 characters. Work that has no increment gets cards too: `specweave card add "Fix the login redirect"` writes `C-01` to `.specweave/cards/<branch>.jsonl`, and `specweave card start|done|wait C-01` moves it. On an increment, `card start|done|wait T-01` are the same as `task claim|done|block`.

To let the agent work through every task unattended, use [autonomous mode](/docs/guides/autonomous-execution). To split a large increment across several agents, use [agent teams](/docs/guides/agent-teams-and-swarms).

## 3. Verify

```bash
specweave verify
```

runs the build, test and lint commands from the Commands table in `AGENTS.md` and writes `reports/verify.md` and `reports/verify.json`, including which acceptance criteria the ledger shows as met. `acs.items` lists each criterion with how it was decided (`checkbox`, `ledger` or `none`) and the tasks that cite it, so a reader can trace a criterion to its tasks; a met criterion is declared done, not proof that a test exercised it. With no commands configured or detected, verify fails with "no test commands configured"; `specweave verify --reason "docs only"` passes and records the reason in `verify.json`.

## 4. Review

Ask for a review in a fresh session: a subagent, a new thread, or a different tool. The session that wrote the code should not approve it. The `review` skill reads the spec, the diff and the surrounding code, and reports only concrete problems with `path:line` for each, in `reports/review.md`.

A different model is a good reviewer. `specweave review` reads from the ledger which model family wrote the code and runs a reviewer from another one (Codex for Claude-written code, Claude Opus for code from OpenAI models), writing `reports/review-<reviewer>.md`. It exits 0 for ship and 3 for fix first. `--brief` prints the brief to paste into any model by hand. Set `review.crossModel` to make `review` and `done` run it every time. See [review with another model](/docs/guides/cross-model-review).

## 5. Complete

```bash
specweave complete 0042
```

closes the increment when the verify report passes. It refuses a spec.md that declares no acceptance criteria. If you must close without a passing report or without criteria, `--reason` records why in `metadata.json`. Completing never creates issues. It closes an issue that an earlier `specweave sync push` linked only when the close-on-complete setting is on, which `specweave sync setup` turns on. Push progress with `specweave sync push` when you want a tracker updated. See [GitHub](/docs/guides/github-sync).

## When you have to stop

Out of tokens, switching subscription, or want another model to take over: say "hand off", or run

```bash
specweave handoff --reason "out of tokens"
```

It releases your claims, records where you stopped, and pushes your branch and a snapshot of your uncommitted edits so a cloud session, another machine or another account can see them. In the next tool, say "pick up", or run `specweave pickup`: it fetches the handoff, applies your edits and prints the next task. Run `specweave auto-handoff on` once and Claude Code and Codex on your machine tell you at 95% of the usage limit that a handoff is available, and Claude Code hands off by itself when a turn hits the limit. Details in [Handoff and pickup](/docs/guides/cross-tool-handoff).

## Hotfixes

A production fix is still an increment, just a small one: `specweave create-increment "Fix double charge" --type hotfix`. Keep it to one or two tasks, verify, complete, and write a follow-up increment for the proper fix if the hotfix is a patch.
