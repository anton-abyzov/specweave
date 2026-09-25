---
sidebar_position: 1
title: Getting Started
description: Track intent and verified progress in your own project, then continue with another coding agent.
---

# Start with your project

SpecWeave keeps your requested outcome, task evidence, and handoff in your repository. Use your preferred coding agent to implement the work. No account or external tracker is required for the local workflow.

## Install and initialize

Requires Node.js 20.12 or later.

```bash
npm install -g specweave
cd your-project
specweave init
```

Initialization configures your project. Choose only the tools and optional integrations you use.

## Open the work board

```bash
specweave dashboard
```

This starts the local dashboard and opens it in your browser. For automation or a server without a display, use:

```bash
specweave dashboard --no-browser
```

Start with a short intent: what outcome should change? A small change can stay as an intent. When the work needs explicit acceptance criteria, create and attach an increment. The board's state is planning information; it does not replace verification of the linked increment.

## Add structure when the work needs it

```bash
specweave create-increment "Preserve checkout when a customer returns"
```

The increment is one `spec.md`: the problem, scope, acceptance criteria, approach and a `## Tasks` section. Your agent can write it from your request; use the `sw-increment` skill where it is installed.

```bash
specweave task next <increment-id>
specweave task claim T-01 <increment-id>
```

`task next` prints the task with the acceptance criteria it covers. Implement it, commit, and record the actual verification command:

```bash
specweave task done T-01 <increment-id> --run "npm test"
```

Choose your project's real test command. The append-only ledger records who claimed and completed each task. The dashboard reads that record without a model call.

## Change agents without losing the thread

```bash
specweave handoff
```

Or just tell your agent to hand off. This releases your claims and pushes your branch and uncommitted edits to git. In the next tool, or under another subscription, run:

```bash
specweave pickup
```

It fetches the handoff, applies your edits, and prints the increment, the next task with its criteria, notes and project memory in one read. Nothing to copy or paste.

[How cross-tool handoffs work](/docs/guides/cross-tool-handoff)

## Close with evidence

```bash
specweave verify <increment-id>
specweave complete <increment-id>
```

Verification checks the increment against the project's configured commands. A passing report supports closure. A green board card alone does not prove acceptance criteria passed.

## Choose your next layer

- [Understand intent, sessions, and evidence](/product)
- [Connect an existing tracker when useful](/integrations)
- [Explore CLI commands](/docs/reference/commands)
- [Find and evaluate focused skills](https://verified-skill.com)
