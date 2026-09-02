---
sidebar_position: 2
---

import CommandTabs from '@site/src/components/CommandTabs';

# Status Command

Monitor your increment progress and work-in-progress limits with the status command.

## Overview

The status command provides a **high-level overview** of all your increments, showing what's active, paused, completed, and helping you understand your current workload.

:::tip Intelligent Automation
SpecWeave **automatically manages** increment status. The system detects blockages, pauses work, and resumes when ready - you rarely need manual intervention.
:::

## Usage

<CommandTabs
  natural='Show progress'
  claude='sw:status'
  other='status'
/>

## What It Shows

```bash
$ specweave status

Increment Status Overview

Overall Progress: 3/10 increments complete (30%)

Active (1):
  - 0007-payment-integration [feature] (60% complete)
     Tasks: 25/42 completed
     Time: 1.2 weeks elapsed, 0.8 weeks remaining
     Last activity: 2 hours ago

Paused (2):
  - 0005-kubernetes-migration [feature]
     Reason: Waiting for DevOps approval
     Paused: 7 days ago

  - 0006-notification-system [feature]
     Reason: Waiting for backend API
     Paused: 2 days ago

Completed (3):
  0001-core-framework
  0002-core-enhancements
  0004-plugin-architecture

WIP Limit:
  Active increments: 1/1 (within limit)

Suggestions:
  - 0006 ready to resume (backend API available)
  - 0005 stale (paused >7 days, consider abandoning or prioritizing)
```

**Key Information**:
- **Active work**: What you're currently working on
- **Paused work**: What's blocked and why
- **Completed work**: What's shipped
- **WIP limits**: Are you at capacity?
- **Smart suggestions**: What to do next

## Why Status Monitoring Matters

### The Problem: Lost Context

Without clear status visibility:
- Don't know what's in progress
- Can't see what's blocked
- No visibility into WIP limits
- Unclear what to work on next

### The Solution: Status Command

Get instant visibility by saying "what's the status?" or using the command:
- See all active work
- Understand blockages
- Monitor WIP limits
- Get smart suggestions

## Increment Statuses

| Status | Meaning | Counts Toward WIP Limit? |
|--------|---------|-------------------------|
| **planning** | Creating spec/plan/tasks | No |
| **active** | Currently being worked on | Yes |
| **backlog** | Not started yet | No |
| **paused** | Temporarily blocked (automatic) | No |
| **completed** | All tasks done, shipped | No |
| **abandoned** | Work cancelled | No |

**Auto-Transitions**:
- **PLANNING -> ACTIVE**: Automatically when tasks.md created and first task starts
- **BACKLOG -> PLANNING**: When spec.md created (resume planning)
- **PAUSED -> ACTIVE**: When blockage resolved

## WIP Limits

:::tip Default: ONE Active Increment
SpecWeave defaults to **1 active increment** maximum. This enforces focus and prevents context switching.
:::

**Why 1?** Research shows:
- 1 task = 100% productivity
- 2 tasks = 20% slower (context switching cost)
- 3+ tasks = 40% slower + more bugs

### Configuring Limits

Edit `.specweave/config.json`:

```json
{
  "limits": {
    "activeIncrements": 1  // Advisory only (default 3, 0 = off); never blocks
  }
}
```

## Common Workflows

### Workflow 1: Check Status Before Planning

```bash
# Before starting new work, check current status (or say "what's the status?")
$ specweave status

Increment Status Overview
Active (1): 0007-payment-integration (60% complete)

# WIP limit reached, need to complete or pause current work first
$ specweave do  # Continue current work (or say "start implementing")
```

### Workflow 2: Monitor Multiple Paused Increments

```bash
$ specweave status

Paused (3):
  0005-kubernetes [feature] (45 days ago)  STALE!
  0006-notifications [feature] (7 days ago)
  0007-payments [feature] (2 days ago)

# Clean up stale work (or say "abandon this")
$ specweave abandon 0005 --reason "Too old, requirements changed"
$ specweave resume 0007  # Resume most recent (or say "resume work")
```

### Workflow 3: Understand Progress

```bash
$ specweave status

Overall Progress: 8/15 increments complete (53%)

Active (1): 0009-authentication (80% complete)
Completed (8): 0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008

# Good progress! Close current and start next (or say "we're done")
$ specweave done 0009
$ specweave next  # Smart suggestion for what's next
```

## Automatic Status Management (System Commands)

:::warning Mostly Automatic
SpecWeave **automatically manages** increment status. These commands are primarily used by the system internally. You rarely need to call them manually.
:::

### Pause Increment (Automatic)

**SpecWeave automatically pauses when**:
- Missing dependencies (API keys, credentials, configuration)
- Waiting for external approvals or responses
- Persistent compilation or test failures
- You explicitly indicate "I'm blocked"

**Manual use only for**:
- Business decisions (strategic pivot, deprioritization)
- Cases where SpecWeave hasn't detected blockage

<CommandTabs
  natural='Pause this'
  claude='sw:pause 0007'
  other='pause 0007 --reason "Pausing for hotfix"'
/>

[Full pause documentation ->](./pause)

---

### Resume Increment (Automatic)

**SpecWeave automatically resumes when**:
- API keys/credentials become available
- External services respond or approve
- Build/test issues are fixed
- Environmental dependencies are resolved

**Manual use only for**:
- Restarting explicitly abandoned work
- Cases where SpecWeave hasn't detected resolution

<CommandTabs
  natural='Resume work'
  claude='sw:resume 0007'
  other='resume 0007'
/>

[Full resume documentation ->](./resume)

---

### Cancel Increment (Manual)

**Use when**:
- Requirements changed (business decision)
- Feature no longer needed (strategic pivot)
- Long-term postponement (deprioritized for quarters)

<CommandTabs
  natural='Abandon this'
  claude='sw:abandon 0007'
  other='abandon 0007 --reason "Pivot to enterprise, consumer features on hold"'
/>

[Full abandon documentation ->](./abandon)

## When to Use Status

**Daily standup** (say "what's the status?" or type the command):
```bash
$ specweave status
# Shows: Active work, paused work, completed work
```

**Before planning new work**:
```bash
$ specweave status
# Check: Am I at WIP limit? Can I start new increment?
```

**Weekly retrospective**:
```bash
$ specweave status
# Review: What's stale? What's blocked? What's shipped?
```

**Team collaboration**:
```bash
$ specweave status
# Share: Current focus, blockers, progress
```

## Best Practices

### 1. Check Status Frequently

```bash
# Daily standup (or say "what's the status?")
$ specweave status

# Before planning new work
$ specweave status

# Weekly retrospective
$ specweave status
```

### 2. Clean Up Stale Work

```bash
$ specweave status

Paused (3):
  0003 (45 days ago)  Too long!

# Either abandon or prioritize (or say "abandon this")
$ specweave abandon 0003 --reason "Too old, requirements changed"
```

### 3. Trust the Automation

```bash
# Let SpecWeave manage status
$ specweave do  # System pauses automatically when blocked

# Don't manually pause unless business decision
```

### 4. Focus on One Thing

**Single-tasking vs Multi-tasking**:

| Approach | Features Active | Time | Features Shipped |
|----------|----------------|------|------------------|
| **Multi-tasking** | 5 features | 10 weeks | 0 complete |
| **Single-tasking** | 1 feature | 10 weeks | 5 complete |

**Result**: 1 feature at a time = 5x more shipped

## Related Commands

| Natural Language | Claude Code | Other AI Tools | Purpose |
|-----------------|-------------|----------------|---------|
| "Pause this" | `sw:pause` | `pause` | Pause increment (mostly automatic) |
| "Resume work" | `sw:resume` | `resume` | Resume increment (mostly automatic) |
| "Abandon this" | `sw:abandon` | `abandon` | Cancel increment permanently |
| "What's the status?" | `sw:progress` | `progress` | Detailed progress for specific increment |

## Related Documentation

- [Commands Overview](./overview) - All SpecWeave commands
- [Workflow Guide](/docs/guides/workflow) - Complete development workflow
- [Getting Started](/docs/guides/getting-started) - Quick start guide

## Summary

**Key Points**:
- Use the status command to **monitor** all increments
- Shows **active**, **paused**, **completed** work
- Displays **WIP limits** and **smart suggestions**
- **Check frequently** (daily standup, before planning, retrospectives)
- **Trust automation** - SpecWeave manages status automatically

**Philosophy**:
> **Visibility without intervention. SpecWeave manages status, you monitor progress.**
