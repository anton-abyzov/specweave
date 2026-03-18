---
sidebar_position: 5
---

import CommandTabs from '@site/src/components/CommandTabs';

# Status

Show comprehensive increment status overview with progress tracking and suggestions.

## Synopsis

<CommandTabs
  natural='What&apos;s the status?'
  claude='/sw:status'
  other='status'
/>

## Description

The `status` command displays a comprehensive overview of all increments in your project, including:
- **Overall progress** (X/Y increments complete)
- **Active increments** (currently working)
- **Paused increments** (temporarily blocked)
- **Completed increments** (done and shipped)
- **Abandoned increments** (cancelled work)
- **WIP limit status** (are you at capacity?)
- **Warnings** (stale work, context switching)
- **Suggestions** (next actions)

**Use status when**:
- Checking overall project progress
- Finding which increment to work on
- Identifying stale or blocked work
- Understanding WIP limit status

:::tip Check Status Daily
Run the status command (or say "show progress") at the start of each day to understand current work and identify any issues early.
:::

## Options

### No arguments (default)

Show all increments with summary.

```bash
specweave status
```

### `--verbose` or `-v`

Show detailed information (progress %, age, last activity).

```bash
specweave status --verbose
```

### `--type <type>`

Filter by increment type (feature, hotfix, bug, etc.).

```bash
specweave status --type=feature
```

## Examples

### Example 1: Basic Status Check

```bash
$ specweave status

Increment Status

Overall Progress: 3/8 increments complete (38%)

Active (1):
  - 0007-smart-increment-discipline [feature] (80% complete)

Paused (1):
  - 0005-kubernetes-migration [feature]
     Reason: Waiting for DevOps approval

WIP Limit:
  Active increments: 1/1

Summary:
   Active: 1
   Paused: 1
   Completed: 3
   Abandoned: 3
   Total: 8

Continue work with: specweave do (or say "start implementing")
```

**What you see**:
- Overall progress (3/8 = 38%)
- 1 active increment (80% complete)
- 1 paused increment (with reason)
- WIP limit status (1/1 - at capacity)
- Summary of all statuses
- Next action suggestion

### Example 2: Multiple Active Increments (WIP Limit Warning)

```bash
$ specweave status

Increment Status

Overall Progress: 2/10 increments complete (20%)

Active (3):
  - 0007-payment-integration [feature]
  - 0008-notification-system [feature]
  - 0009-refactor [refactor]

WIP Limit:
  Active increments: 3/1 (EXCEEDS LIMIT!)
  Run 'specweave pause <id>' (or say "pause this") to pause one before starting new work

Summary:
   Active: 3  # <- Too many!
   Paused: 0
   Completed: 2
   Total: 10

WARNING: High context switching detected!
   Research shows: 3+ concurrent tasks = 40-60% productivity loss

Suggestions:
   - Complete one increment before continuing
   - Or pause 2 increments to free capacity
```

**Key insight**: Status command warns when WIP limit is exceeded!

### Example 3: Verbose Output

```bash
$ specweave status --verbose

Increment Status

Overall Progress: 4/10 increments complete (40%)

Active (2):
  - 0007-payment-integration [feature]
     Progress: 75% (15/20 tasks)
     Age: 5 days
     Last activity: 2 hours ago
     Last: Implemented Stripe webhook handler

  - 0009-refactor [refactor]
     Progress: 30% (6/20 tasks)
     Age: 12 days
     Last activity: 1 day ago
     Last: Extracted service layer

Paused (1):
  - 0008-kubernetes [feature]
     Progress: 20% (4/20 tasks)
     Paused: 7 days ago
     Reason: Waiting for DevOps approval on cluster config
     STALE! Review or abandon?

Completed (4):
  0001-core-framework (completed 30 days ago)
  0002-core-enhancements (completed 25 days ago)
  0003-model-selection (completed 20 days ago)
  0004-plugin-architecture (completed 15 days ago)

WIP Limit:
  Active increments: 2/1 (EXCEEDS LIMIT!)

Summary:
   Active: 2
   Paused: 1
   Completed: 4
   Total: 10

Suggestions:
   - Complete 0007 first (75% done, almost there!)
   - Resume or abandon 0008 (stale, paused 7 days)
```

**Verbose mode shows**:
- Task progress percentages
- Age (how long increment has been active)
- Last activity timestamp
- Last task completed
- Stale warnings for paused increments

### Example 4: Filter by Type

```bash
$ specweave status --type=feature

Feature Increments

Active (2):
  - 0007-payment-integration [feature]
  - 0008-notification-system [feature]

Paused (1):
  - 0006-kubernetes [feature]
     Reason: Waiting for DevOps

Completed (3):
  0001-core-framework
  0002-core-enhancements
  0003-model-selection

Feature Summary:
   Active: 2
   Paused: 1
   Completed: 3
   Total: 6
```

## Behavior

### Overall Progress Calculation

```typescript
// Count completed increments
const completed = increments.filter(i => i.status === 'completed');
const total = increments.length;
const progress = Math.round((completed.length / total) * 100);

// Display
console.log(`Overall Progress: ${completed.length}/${total} increments complete (${progress}%)`);
```

**Key insight**: Overall progress = completed increments / total increments.

### Task Progress Calculation

For each active increment, progress is calculated from `tasks.md`:

```typescript
// Count completed tasks: [x] or [X]
const completedMatches = tasksContent.match(/\[x\]/gi);
const completedTasks = completedMatches ? completedMatches.length : 0;

// Count total tasks: [ ] or [x]
const totalMatches = tasksContent.match(/\[ \]|\[x\]/gi);
const totalTasks = totalMatches ? totalMatches.length : 0;

// Calculate percentage
const progress = Math.round((completedTasks / totalTasks) * 100);
```

### WIP Limit Checking

```typescript
const activeCount = increments.filter(i => i.status === 'active').length;
const limit = 1; // Default: 1 active increment

if (activeCount > limit) {
  console.log('Active increments:', activeCount, '/', limit, '(EXCEEDS LIMIT!)');
  console.log('Run "specweave pause <id>" to pause one before starting new work');
}
```

### Status Icons

| Status | Icon | Meaning |
|--------|------|---------|
| Active | marker | Currently working |
| Paused | pause | Temporarily blocked |
| Completed | check | Done and shipped |
| Abandoned | x | Cancelled/obsolete |
| Stale | warning | Paused >7 days or active >30 days |

## Warnings and Suggestions

### Stale Paused Increments

Paused >7 days -> warning:

```bash
Paused (1):
  0007-kubernetes [feature]
     Paused: 10 days ago
     Reason: Waiting for API keys
     STALE! Review or abandon?

Actions:
   specweave resume 0007  # If unblocked (or say "resume work")
   specweave abandon 0007 # If no longer needed (or say "abandon this")
```

### Long-Running Active Increments

Active >30 days -> warning:

```bash
Active (1):
  0009-big-refactor [refactor]
     Progress: 45% (23/50 tasks)
     Age: 35 days
     Long-running! Consider breaking into smaller increments

Suggestion: Large increments increase risk and reduce velocity
```

### Context Switching Cost

Multiple active -> warning:

```bash
Active (3):
  0007-payment
  0008-notifications
  0009-refactor

WARNING: High context switching detected!
   Research shows: 3+ concurrent tasks = 40-60% productivity loss

Complete or pause one before continuing
```

### Almost Complete Suggestions

```bash
Active (2):
  0007-payment (90% complete)  # <- Almost done!
  0008-notifications (20% complete)

Suggestions:
   - Complete 0007 first (90% done, almost there!)
   - Then focus on 0008
```

## Common Scenarios

### Scenario 1: Daily Standup Check

```bash
# Morning routine: Check status (or say "what's the status?")
$ specweave status

Increment Status
Overall Progress: 4/10 complete (40%)

Active (1):
  0007-payment-integration (75% done)

Continue work with: specweave do (or say "start implementing")

# Clear picture of what to work on today!
```

### Scenario 2: Before Starting New Work

```bash
# Check capacity before creating new increment
$ specweave status

Active (1): 0007-payment-integration
WIP Limit: 1/1

# At capacity! Complete current work first
$ specweave do

# Or pause current work (or say "pause this")
$ specweave pause 0007 --reason "Hotfix needed"
$ specweave inc "0008-critical-bugfix"  # Now works
```

### Scenario 3: Sprint Review

```bash
# Review sprint progress
$ specweave status

Overall Progress: 6/12 complete (50%)

Completed (2 this sprint):
  0005-user-auth (completed 5 days ago)
  0006-notifications (completed 2 days ago)

Active (1):
  0007-payment-integration (80% done)
     Age: 10 days
     Almost complete!

Sprint Summary:
   - 2 increments completed
   - 1 increment in progress (80% done)
   - 0 abandoned
   - Velocity: Good!
```

### Scenario 4: Finding Stale Work

```bash
# Identify stale increments
$ specweave status --verbose

Paused (3):
  0005-kubernetes (paused 45 days) STALE!
  0007-refactor (paused 30 days) STALE!
  0008-experiment (paused 60 days) STALE!

Action needed: Review or abandon stale work

# Clean up (or say "abandon this" for each)
$ specweave abandon 0005 --reason "Too old, requirements changed"
$ specweave abandon 0008 --reason "Experiment obsolete"
$ specweave resume 0007  # Still relevant
```

## Integration with Other Commands

### status -> do

```bash
$ specweave status
Active (1): 0007-payment

$ specweave do  # Continue active work (or say "start implementing")
```

### status -> pause

```bash
$ specweave status
Active (2): 0007-payment, 0008-notifications
WIP Limit: 2/1 (EXCEEDS LIMIT!)

$ specweave pause 0008 --reason "Focus on 0007"
```

### status -> resume

```bash
$ specweave status
Paused (1): 0007-payment (Waiting for API keys)

# API keys arrived (or say "resume work")
$ specweave resume 0007
$ specweave do  # Continue work
```

### status -> abandon

```bash
$ specweave status
Paused (1): 0008-old-feature (paused 45 days) STALE!

$ specweave abandon 0008 --reason "Too old, requirements changed"
```

## Configuration

Configure WIP limits and staleness thresholds in `.specweave/config.json`:

```json
{
  "limits": {
    "feature": 1,                    // Max 1 active feature
    "hotfix": 1,                     // Max 1 active hotfix
    "experimentAutoAbandonDays": 14, // Auto-abandon experiments
    "staleness": {
      "paused": 7,                   // Warn if paused > 7 days
      "active": 30                   // Warn if active > 30 days
    }
  }
}
```

**Adjust based on team size**:
| Team Size | Recommended Limit |
|-----------|------------------|
| Solo (1) | 1 |
| Small (2-3) | 1-2 |
| Medium (4-7) | 2-3 |
| Large (8-15) | 3-5 |

## Output Reference

### Status Summary

```bash
Increment Status

Overall Progress: X/Y increments complete (Z%)

Active (N):
  increment-id [type] (progress%)

Paused (N):
  increment-id [type]
     Reason: why paused

Completed (N):
  increment-id (completed X days ago)

Abandoned (N):
  increment-id (reason)

WIP Limit:
  Active increments: X/Y

Summary:
   Active: N
   Paused: N
   Completed: N
   Abandoned: N
   Total: N

Suggestions:
   - Next actions based on current state
```

## Error Handling

### No Increments

```bash
$ specweave status

Increment Status

No increments found.

Create your first increment: specweave inc "feature description"
(or say "let's build X")
```

### No Active Increments

```bash
$ specweave status

Increment Status

Overall Progress: 4/10 complete (40%)

Active (0):
  (none)

Paused (2):
  0007-feature
  0008-refactor

Resume a paused increment: specweave resume <id> (or say "resume work")
Or start new work: specweave inc "feature description" (or say "let's build X")
```

## Best Practices

### 1. Check Status Daily

```bash
# Start of day routine (or say "what's the status?")
$ specweave status

# Clear picture of:
# - What to work on
# - Any blocked work
# - Overall progress
```

### 2. Before Creating New Increments

```bash
# Always check capacity first
$ specweave status

# If at WIP limit:
# - Complete current work, OR
# - Pause current work
```

### 3. Weekly Stale Review

```bash
# Every Friday: Review stale work
$ specweave status --verbose

# Action on stale increments:
# - Resume if unblocked
# - Abandon if obsolete
# - Update if still blocked
```

### 4. Sprint Reviews

```bash
# Sprint end: Review progress
$ specweave status

# Metrics:
# - Overall progress (X/Y complete)
# - Velocity (N completed this sprint)
# - Abandonment rate (learning opportunity)
```

## See Also

- `pause` - Pause active work
- `resume` - Resume paused work
- `abandon` - Cancel work permanently
- Status Management Guide - Complete workflow guide

## Summary

**Key Points**:
- Shows comprehensive project overview
- Overall progress tracking (X/Y complete)
- WIP limit status and warnings
- Stale work detection
- Context switching warnings
- Next action suggestions

**Command**:
```bash
specweave status [--verbose] [--type=<type>]
```

**Philosophy**:
> Visibility drives action. Check status daily, address warnings promptly, maintain focus.
