---
sidebar_position: 25
title: Work board and dashboard
description: Track user intent, task evidence and cross-tool execution history from local project state
---

# Work board and dashboard

The SpecWeave 2.1 dashboard opens on the **Work board**. Start with the work that matters: what is in progress, what needs attention, which tasks are complete, and which linked increments have current passing verification.

## Launch

Run from an initialized SpecWeave project:

```bash
specweave dashboard
specweave dashboard --no-browser
specweave dashboard --port 3457 --no-browser
```

The command starts or reuses the local dashboard. It normally opens a browser; `--no-browser` prints the URL without opening one. The default starting port is 3456, with nearby ports tried if needed. The server binds to loopback. Run the command from another project to register it, then choose the workspace in the sidebar.

## From intent to evidence

Create a short title and summary with **New intent**. A small task can stay independent; linking an increment is optional. Existing increments also appear on the board.

Move cards through **Backlog, In progress, Blocked, Review and Done** by dragging them or using the state selector. This is the intent's planning state. Moving a card to Done does not complete its linked increment or replace verification.

Open a card to read its summary, follow its increment link, inspect task and acceptance-criteria progress, and review the recorded executions. **Evidence** opens the increment view. The task ledger supplies task state; the specification supplies acceptance criteria. A verification report can be missing, failed, current or stale. A stale passing report is not counted as current verification.

The top counters distinguish active intents, blocked work, completed tasks and verified linked increments. They do not turn token consumption or activity volume into proof of completion.

## Sessions and continuation

**Sessions** shows project-scoped local Codex and Claude Code metadata when available. Link a session to its intent explicitly, or add an execution setup yourself. Harness, exact model identifier, effort, provider and surface remain separate fields. Unavailable facts stay Unknown; bounded reads can miss intermediate model changes and are labeled partial.

An intent can span several sessions and tools. Use `specweave handoff` to write context the next tool can read. [Models and execution context](/docs/guides/model-selection) explains the dimensions and their limits.

## Local updates

Intent snapshots persist in `.specweave/intents/board.jsonl`. Increment documents and the append-only task ledger remain in `.specweave/increments/`. The board refreshes on filesystem events and reconciles every 15 seconds; session metadata refreshes while its view is open. Invalid snapshots produce warnings rather than silently replacing valid state.

These reads and projections make **no model API calls**. They do not require an agent to spend tokens rewriting a status summary on every tool call.

## Secondary views

Connections and evidence remain in the main navigation. Expand **Diagnostics & settings** for Usage & estimates, analytics, hooks, errors and configuration. These views show available records, not a guaranteed transcript of every agent action. The default hook set does not capture every tool invocation.

[Usage & estimates](/docs/reference/cost-tracking) distinguishes token records from estimated API costs. [Hooks](/docs/guides/dashboard/hooks) explains the two default lifecycle hooks.
