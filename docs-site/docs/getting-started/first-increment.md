---
sidebar_position: 2
title: "Your First Increment"
description: "Create, work through and close your first SpecWeave increment, then carry it to another tool."
---

import CommandTabs from '@site/src/components/CommandTabs';

# Your First Increment

This walks through one small change from request to closed increment, and shows how to move it to another tool halfway through.

## Before you start

- SpecWeave installed: `npm install -g specweave`
- The project initialized: `specweave init`
- A coding agent: Claude Code, Codex, Grok Build, Cursor or any tool that reads `AGENTS.md`

We will use a small example: **"Add a greeting that uses the signed-in user's name."**

## 1. Create the increment

<CommandTabs
  natural="Add a greeting that uses the signed-in user's name"
  claude='sw:increment "personal greeting"'
  other='specweave create-increment "personal greeting"'
/>

You get one file, `.specweave/increments/0001-personal-greeting/spec.md`:

```markdown
# Personal greeting

## Problem
Signed-in users see a generic welcome.

## Scope
The header greeting. Not emails.

## Acceptance Criteria
- [ ] AC-01: A signed-in user sees "Hi, <first name>"
- [ ] AC-02: A signed-out visitor sees "Welcome"

## Approach
Read the name from the session in the header component.

## Open questions
- none

## Tasks

### T-01 Render the name from the session
- AC: AC-01 | Files: src/header/Greeting.tsx | Test: npm test -- greeting

### T-02 Fall back for signed-out visitors
- AC: AC-02 | Files: src/header/Greeting.tsx | Test: npm test -- greeting
```

Read it before any code is written. Adjust the criteria until they say exactly what done means.

## 2. Work through the tasks

<CommandTabs
  natural="Start implementing"
  claude="sw:do"
  other="specweave task next"
/>

Under the hood the agent runs:

```bash
specweave task next                        # T-01 and the text of AC-01
specweave task claim T-01
specweave task done T-01 --run "npm test -- greeting"  # records the real check
```

Each task arrives with its own criteria, so the agent does not reread the whole spec. When every task covering a criterion is done, that criterion is met.

## 3. Switch tools halfway (optional)

Say you run out of usage after T-01. Tell the agent "hand off", or run:

```bash
specweave handoff
```

It pushes your branch and uncommitted edits to git. Then open the project in another tool, or the same tool under another subscription, and run:

```bash
specweave pickup
```

It fetches the handoff, applies your edits, and shows increment 0001, T-02 with AC-02, any notes and the project memory. Continue from there. Nothing to copy or paste. See [Cross-tool handoff](/docs/guides/cross-tool-handoff).

## 4. Review and close

<CommandTabs
  natural="Review increment 0001"
  claude="sw:review 0001"
  other="specweave verify 0001"
/>

<CommandTabs
  natural="We're done with increment 0001"
  claude="sw:done 0001"
  other="specweave complete 0001"
/>

`verify` runs your project's build, test and lint commands and writes a report. `complete` closes the increment only when the tasks are done and the checks passed. Closing does not touch GitHub, Jira or Azure DevOps unless you set that up.

## Common questions

**Can I change the spec halfway?** Yes. Edit `spec.md`; add criteria and tasks as you learn more.

**What if a task turns out to be unnecessary?** Skip it with a reason: `specweave task skip T-02 --reason "covered by T-01"`.

**Do I need `plan.md`?** Only for a genuinely large design. Most increments never need one.

## Next

- [What is an increment?](/docs/guides/core-concepts/what-is-an-increment)
- [Claude Code Projects and threads](/docs/guides/claude-code-projects)
- [SpecWeave 3.0](/docs/guides/specweave-3)
