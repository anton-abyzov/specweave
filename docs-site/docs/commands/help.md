---
sidebar_position: 1
---

import CommandTabs from '@site/src/components/CommandTabs';

# Help & Discovery

**Discovery entry point**: See all available skills, usage statistics, and contextual next actions.

`sw:help` is the first command to run when you're new to SpecWeave or need a quick reference of what's available.

## Usage

<CommandTabs
  natural='What can SpecWeave do?'
  claude='sw:help'
  other='help'
/>

## What It Shows

### Stats Banner

If you've been using SpecWeave, the help command shows a one-line summary of your activity:

```
SPECWEAVE — 12 increments completed | 47 tasks done | 8 skills used (last 30 days)
```

### Active Increment Context

If you have work in progress, it shows your current state and next actions:

```
Active now:
  0042-user-auth — 60% (6/10 tasks)
  Next: sw:do 0042 (continue) | sw:progress (status) | sw:done 0042 (close)
```

### Skills by Workflow Stage

All skills organized by when you'd use them:

| Stage | Key Skills | Purpose |
|-------|-----------|---------|
| **Plan** | `sw:increment`, `sw:brainstorm`, `sw:pm`, `sw:architect` | Define what to build |
| **Implement** | `sw:do`, `sw:auto`, `sw:team-lead`, `sw:tdd-cycle` | Build it |
| **Verify** | `sw:validate`, `sw:grill`, `sw:code-reviewer`, `sw:e2e` | Check quality |
| **Close** | `sw:done`, `sw:next`, `sw:pr` | Ship it |
| **Sync** | `sw:progress-sync`, `sw:sync-setup`, `sw:import` | Connect external tools |
| **Explore** | `sw:docs`, `sw:progress`, `sw:analytics`, `sw:doctor` | Understand your project |
| **Create** | `sw:image`, `sw:video`, `sw:diagrams`, `sw:remotion` | Generate media |

### Getting Started (New Users)

If SpecWeave isn't initialized yet, the help command shows setup instructions:

```
Get started in 3 steps:
  1. npm install -g specweave
  2. cd your-project && specweave init .
  3. Describe what you want to build
```

## Related Commands

- [`sw:docs`](/docs/commands/docs) — Browse and search living documentation
- [`sw:progress`](/docs/commands/status) — Show increment progress
- [`sw:analytics`](/docs/commands/analytics) — Detailed usage statistics
- [`sw:doctor`](/docs/commands/doctor) — Installation health check
