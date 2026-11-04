---
title: "Tasks and acceptance criteria in SpecWithCode threads"
sidebar_label: Tasks and acceptance criteria
description: "How a SpecWithCode thread works from a SpecWeave increment's tasks and acceptance criteria instead of a loose chat prompt: the plan card, how a thread binds to an increment, what counts as done, and a five-minute tutorial."
keywords: [acceptance criteria, ai coding agent tasks, spec driven development, specweave, specwithcode, plan card, t3 code alternative]
---

# Tasks and acceptance criteria in threads

Most agent apps run on the prompt: you type what you want, the agent writes its own todo list, ticks it off and says it is done. The todo list disappears with the session and a tick is not evidence.

SpecWithCode can run a thread on a SpecWeave increment instead. The increment's `spec.md` holds the acceptance criteria (ACs) and the tasks that cover them, and its `ledger.jsonl` records who claimed each task and the evidence that finished it. The thread shows that state at the top, and so do the sidebar, the project's thread list and the coordinator's worker cards. The chat is still there for questions and steering; the spec is what the work is measured against.

Increments are recommended, never required. A thread without one works as plain chat and shows the agent's own checklist. SpecWithCode also has its own optional plan, **Plan → Add a plan**, which keeps a short spec, ACs and tasks in the app; see [Plans and project routines](./plans-and-routines.md). This page covers the other plan source: a SpecWeave increment, which the app reads but never rewrites.

## What the thread shows

The **plan card** sits at the top of the thread, collapsed to one line:

`Increment 0930 · Wire the plan card · Next: Compact progress in lists · 2/5 · AC 1/4`

- **2/5** is tasks done out of tasks in the increment, folded from the ledger.
- **AC 1/4** is acceptance criteria verified out of the total, green once all are. A criterion counts only when every task citing it is done with evidence and a `specweave verify` run passed after the last of them. A ticked box in the spec is a declaration, not proof, and a task done without a later passing verify is evidence, not verification, so neither counts here. (The CLI's own `specweave ac list` reports an AC as met or open; "verified" is SpecWithCode's stricter reading of the same ledger.)

Expand the card to see every task (done, current, open, blocked, skipped), with the thread's own task marked **this thread** and the agent's live todo list nested under it. The **Acceptance criteria** list below it is open by default and shows each AC, how far it is proven (verified, evidence not verified, declared only, open, no task), the tasks that cover it and its user story. **Open spec** opens `spec.md` in the app's viewer.

In lists, the same state reads as `0930 · 2/5`; the AC count is on the card only. A thread that changed code with no increment is marked in the Threads pane so you can link one or say none is needed.

## How a thread gets its increment

You rarely link by hand. Strongest first:

1. **Linked in SpecWithCode.** **Link increment** on the plan card, or "Link SpecWeave increment to thread" in the command palette.
2. **Claim.** The agent ran a SpecWeave command that writes the ledger, such as `specweave task claim`, `task done` or `pickup`, from that thread. SpecWithCode starts every turn with the thread's id, so the CLI records which thread touched which increment. A worker the coordinator launched on an increment counts here from its first moment (see below).
3. **Checkpoint.** SpecWeave's session checkpoint for the thread names the increment.
4. **Name.** The increment's number or folder is in the thread's title or branch, such as `feat/0930-plan-card`.

When the coordinator launches a worker on an increment, SpecWithCode binds the new thread to it right away and tells the worker to run `specweave pickup <id>` first. The worker's first claim then marks the task it holds.

## Why the ledger and not the chat

- **Done means evidence.** `specweave task done` needs evidence: a passing `--run "<command>"` or `--evidence "<commit or output>"`. A skip needs a reason. The app never ticks a task from a todo event.
- **No two agents take the same task.** A claim leases a task for two hours by default, and only the agent holding it releases it early.
- **The record outlives the thread.** The spec and ledger live in git, so every tool, machine and teammate sees the same state, and a new thread picks up where the last one stopped.
- **The app only reads.** SpecWithCode never writes your spec, checkboxes or ledger. Claiming and finishing stay with the agent and the CLI.

## Tutorial: run a thread on tasks and ACs (5 minutes)

You need SpecWithCode and a project folder. The agent installs nothing for you; install the [SpecWeave CLI](../getting-started/installation.md) first.

1. **Set up SpecWeave in the project.** In a terminal in the project folder, run `specweave init .`. A repository inside a SpecWeave umbrella can skip this; the CLI and SpecWithCode use the umbrella's `.specweave` folder above it.
2. **Write the increment.** In a thread, ask the agent: *"Create a SpecWeave increment for adding CSV export to the reports page, with acceptance criteria and tasks."* The agent uses the `/sw-increment` skill (or runs `specweave create-increment "CSV export"` and fills in the spec), which writes `spec.md` with ACs such as `AC-01: the Export button downloads the visible rows as CSV`, and tasks that cite them.
3. **Review the ACs, not the code.** Open the plan card, then **Open spec**. Edit the criteria until they say what done means to you. This is the moment that replaces a long prompt.
4. **Start the work.** Ask *"Work the next task."* The agent runs `specweave pickup` to see the next task and its ACs, then `specweave task claim T-01`. The card switches to that task and marks it **this thread**.
5. **Watch progress from anywhere.** The card's count, the sidebar and the coordinator's worker cards move as the agent finishes tasks with evidence. Run several threads on the same increment; claims keep them off each other's tasks.
6. **Verify.** When the tasks are done, the agent runs `specweave verify`. Only then do the ACs turn verified and the card read `AC 4/4`.

To split the work, ask the project's coordinator to *"run increment 0930 across two workers"*. Each worker claims a different task. Every worker's card shows the whole plan with the same counts and marks the task that worker holds as **this thread**.

## Related

- [Plans and project routines](./plans-and-routines.md)
- [Finish a thread](./finish-a-thread.md): what happens to the branch when the tasks are done
- [SpecWithCode vs T3 Code and OpenCode](/docs/compare/specwithcode-vs-opencode-t3-code)
