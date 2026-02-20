---
sidebar_position: 2
---

# Status Command

Monitor your increment progress and work-in-progress limits with the `/status` command.

## Overview

The `/status` command provides a **high-level overview** of all your increments, showing what's active, paused, completed, and helping you understand your current workload.

:::tip Intelligent Automation
SpecWeave **automatically manages** increment status. The system detects blockages, pauses work, and resumes when ready - you rarely need manual intervention.
:::

## Usage

```bash
/status                    # View all increments
/specweave:status          # Explicit namespace form
```

## What It Shows

```bash
$ /specweave:status

📊 Increment Status Overview

📈 Overall Progress: 3/10 increments complete (30%)

▶️  Active (1):
  ● 0007-payment-integration [feature] (60% complete)
     Tasks: 25/42 completed
     Time: 1.2 weeks elapsed, 0.8 weeks remaining
     Last activity: 2 hours ago

⏸️  Paused (2):
  ⏸ 0005-kubernetes-migration [feature]
     Reason: Waiting for DevOps approval
     Paused: 7 days ago

  ⏸ 0006-notification-system [feature]
     Reason: Waiting for backend API
     Paused: 2 days ago

✅ Completed (3):
  ✓ 0001-core-framework
  ✓ 0002-core-enhancements
  ✓ 0004-plugin-architecture

📈 WIP Limit:
  ✅ Active increments: 1/1 (within limit)

💡 Suggestions:
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
- ❌ Don't know what's in progress
- ❌ Can't see what's blocked
- ❌ No visibility into WIP limits
- ❌ Unclear what to work on next

### The Solution: `/status` Command

Get instant visibility:
- ✅ See all active work
- ✅ Understand blockages
- ✅ Monitor WIP limits
- ✅ Get smart suggestions

## Increment Statuses

| Status | Meaning | Counts Toward WIP Limit? |
|--------|---------|-------------------------|
| **planning** | Creating spec/plan/tasks | ❌ No |
| **active** | Currently being worked on | ✅ Yes |
| **backlog** | Not started yet | ❌ No |
| **paused** | Temporarily blocked (automatic) | ❌ No |
| **completed** | All tasks done, shipped | ❌ No |
| **abandoned** | Work cancelled | ❌ No |

**Auto-Transitions**:
- **PLANNING → ACTIVE**: Automatically when tasks.md created and first task starts
- **BACKLOG → PLANNING**: When spec.md created (resume planning)
- **PAUSED → ACTIVE**: When blockage resolved

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
    "maxActiveIncrements": 1,  // Default: 1 active (focus)
    "hardCap": 2,               // Emergency ceiling (never exceeded)
    "allowEmergencyInterrupt": true
  }
}
```

## Common Workflows

### Workflow 1: Check Status Before Planning

```bash
# Before starting new work, check current status
$ /specweave:status

📊 Increment Status Overview
▶️  Active (1): 0007-payment-integration (60% complete)

# WIP limit reached, need to complete or pause current work first
$ /specweave:do 0007  # Continue current work
```

### Workflow 2: Monitor Multiple Paused Increments

```bash
$ /specweave:status

⏸️  Paused (3):
  ⏸ 0005-kubernetes [feature] (45 days ago)  ⚠️ Stale!
  ⏸ 0006-notifications [feature] (7 days ago)
  ⏸ 0007-payments [feature] (2 days ago)

# Clean up stale work
$ /specweave:abandon 0005 --reason "Too old, requirements changed"
$ /specweave:resume 0007  # Resume most recent
```

### Workflow 3: Understand Progress

```bash
$ /specweave:status

📈 Overall Progress: 8/15 increments complete (53%)

▶️  Active (1): 0009-authentication (80% complete)
✅ Completed (8): 0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008

# Good progress! Close current and start next
$ /specweave:done 0009
$ /specweave:next  # Smart suggestion for what's next
```

## Automatic Status Management (System Commands)

:::warning Mostly Automatic
SpecWeave **automatically manages** increment status. These commands are primarily used by the system internally. You rarely need to call them manually.
:::

### `/pause` - Pause Increment (Automatic)

**SpecWeave automatically pauses when**:
- 🚧 Missing dependencies (API keys, credentials, configuration)
- 👥 Waiting for external approvals or responses
- 🔄 Persistent compilation or test failures
- 📝 You explicitly indicate "I'm blocked"

**Manual use only for**:
- Business decisions (strategic pivot, deprioritization)
- Cases where SpecWeave hasn't detected blockage

```bash
/pause 0007 --reason "Pausing for hotfix"
```

[Full pause documentation →](./pause)

---

### `/resume` - Resume Increment (Automatic)

**SpecWeave automatically resumes when**:
- ✅ API keys/credentials become available
- ✅ External services respond or approve
- ✅ Build/test issues are fixed
- ✅ Environmental dependencies are resolved

**Manual use only for**:
- Restarting explicitly abandoned work
- Cases where SpecWeave hasn't detected resolution

```bash
/resume 0007
```

[Full resume documentation →](./resume)

---

### `/abandon` - Cancel Increment (Manual)

**Use when**:
- ✅ Requirements changed (business decision)
- ✅ Feature no longer needed (strategic pivot)
- ✅ Long-term postponement (deprioritized for quarters)

```bash
/abandon 0007 --reason "Pivot to enterprise, consumer features on hold"
```

[Full abandon documentation →](./abandon)

## When to Use `/status`

**Daily standup**:
```bash
$ /specweave:status
# Shows: Active work, paused work, completed work
```

**Before planning new work**:
```bash
$ /specweave:status
# Check: Am I at WIP limit? Can I start new increment?
```

**Weekly retrospective**:
```bash
$ /specweave:status
# Review: What's stale? What's blocked? What's shipped?
```

**Team collaboration**:
```bash
$ /specweave:status
# Share: Current focus, blockers, progress
```

## Best Practices

### 1. Check Status Frequently

```bash
# Daily standup
$ /specweave:status

# Before planning new work
$ /specweave:status

# Weekly retrospective
$ /specweave:status
```

### 2. Clean Up Stale Work

```bash
$ /specweave:status

⏸️  Paused (3):
  ⏸ 0003 (45 days ago)  ⚠️ Too long!

# Either abandon or prioritize
$ /specweave:abandon 0003 --reason "Too old, requirements changed"
```

### 3. Trust the Automation

```bash
# ✅ Let SpecWeave manage status
$ /specweave:do  # System pauses automatically when blocked

# ❌ Don't manually pause unless business decision
```

### 4. Focus on One Thing

**Single-tasking vs Multi-tasking**:

| Approach | Features Active | Time | Features Shipped |
|----------|----------------|------|------------------|
| **Multi-tasking** | 5 features | 10 weeks | 0 complete |
| **Single-tasking** | 1 feature | 10 weeks | 5 complete |

**Result**: 1 feature at a time = 5× more shipped

## Related Commands

- [`/pause`](./pause) - Pause increment (mostly automatic)
- [`/resume`](./resume) - Resume increment (mostly automatic)
- [`/abandon`](./abandon) - Cancel increment permanently
- `/progress` - Detailed progress for specific increment
- [`/next`](./next) - Smart suggestion for what's next

## Related Documentation

- [Commands Overview](./overview) - All SpecWeave commands
- [Workflow Guide](/docs/guides/workflow) - Complete development workflow
- [Getting Started](/docs/guides/getting-started) - Quick start guide

## Summary

**Key Points**:
- ✅ Use `/status` to **monitor** all increments
- ✅ Shows **active**, **paused**, **completed** work
- ✅ Displays **WIP limits** and **smart suggestions**
- ✅ **Check frequently** (daily standup, before planning, retrospectives)
- ✅ **Trust automation** - SpecWeave manages status automatically

**Philosophy**:
> **Visibility without intervention. SpecWeave manages status, you monitor progress.**
