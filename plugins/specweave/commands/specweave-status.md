---
name: status
description: Show increment status overview with rich details (active, paused, completed, abandoned)
usage: /specweave:status [--active|--paused|--completed|--abandoned|--stale]
---

# Increment Status Command

**Usage**: `/specweave:status [filter]`

---

## Purpose

Display comprehensive increment status overview:
- **Active** increments (currently working)
- **Paused** increments (blocked/deprioritized)
- **Completed** increments (done)
- **Abandoned** increments (obsolete)
- **Warnings** for stale increments (paused >7 days, active >30 days)
- **Suggestions** for next actions

---

## Output Format

### Default (All Increments)

```bash
/status

📊 Increment Status Overview

🔥 Active (2):
  🚨 0005-payment-hotfix [hotfix]
     Progress: 90% (18/20 tasks)
     Age: 6 hours
     Last: Fixed Stripe webhook signature

  🔧 0006-i18n [feature]
     Progress: 50% (10/20 tasks)
     Age: 2 days
     Last: Created translation pipeline

⏸️  Paused (1):
  🔄 0007-stripe-integration [feature]
     Progress: 30% (6/20 tasks)
     Paused: 3 days ago
     Reason: Waiting for Stripe API keys
     ⚠️  Review or abandon?

✅ Completed (4):
  0001-core-framework
  0002-core-enhancements
  0003-intelligent-model-selection
  0004-plugin-architecture

📊 Summary:
  - Active: 2 increments (1 hotfix, 1 feature)
  - Paused: 1 increment
  - Completed: 4 increments
  - Context switching: 20-40% cost (2 active)

📋 Type Limits (v0.7.0+):
  ✅ hotfix: 1/unlimited active
  ✅ feature: 1/2 active
  ✅ refactor: 0/1 active
  ✅ bug: 0/unlimited active
  ✅ change-request: 0/2 active
  ✅ experiment: 0/unlimited active

💡 Suggestions:
  - Complete 0005 first (90% done, almost there!)
  - Resume or abandon 0007 (stale)

Commands:
  /do              # Continue current work
  /resume 0007     # Resume paused increment
  /abandon 0007    # Abandon if obsolete
```

### Filtered Views

```bash
# Active only
/status --active

🔥 Active Increments (2):
  🚨 0005-payment-hotfix [hotfix] (90% done, 6 hours)
  🔧 0006-i18n [feature] (50% done, 2 days)

# Paused only
/status --paused

⏸️  Paused Increments (1):
  🔄 0007-stripe [feature] (paused 3 days)
     Reason: Waiting for API keys

# Stale only (paused >7 days OR active >30 days)
/status --stale

⚠️  Stale Increments (2):
  🔄 0008-experiment [experiment] (paused 10 days)
     🚨 AUTO-ABANDON WARNING (14 days inactive)

  🔧 0009-big-refactor [refactor] (active 35 days)
     ⚠️  Long-running - consider breaking into smaller increments
```

---

## Implementation

Uses MetadataManager and Limits to query and display:

```typescript
import { MetadataManager, IncrementStatus } from '../src/core/increment/metadata-manager';
import { checkAllLimits, getLimitsSummary } from '../src/core/increment/limits';

// Get all increments
const allIncrements = MetadataManager.getAll();

// Group by status
const active = allIncrements.filter(m => m.status === IncrementStatus.ACTIVE);
const paused = allIncrements.filter(m => m.status === IncrementStatus.PAUSED);
const completed = allIncrements.filter(m => m.status === IncrementStatus.COMPLETED);
const abandoned = allIncrements.filter(m => m.status === IncrementStatus.ABANDONED);

// Get extended metadata (with progress%)
const extended = active.map(m => MetadataManager.getExtended(m.id));

// Display rich output
console.log('📊 Increment Status Overview\n');

// Active
if (active.length > 0) {
  console.log(`🔥 Active (${active.length}):`);
  extended.forEach(inc => {
    const icon = inc.type === 'hotfix' ? '🚨' : '🔧';
    console.log(`  ${icon} ${inc.id} [${inc.type}]`);
    console.log(`     Progress: ${inc.progress}% (${inc.completedTasks}/${inc.totalTasks} tasks)`);
    console.log(`     Age: ${formatAge(inc.ageInDays)}`);
  });
}

// ... similar for paused, completed, abandoned

// Summary with type limits (v0.7.0+)
console.log('\n📊 Summary:');
console.log(`  - Active: ${active.length} increments`);
console.log(`  - Paused: ${paused.length} increments`);
console.log(`  - Completed: ${completed.length} increments`);

// Type limits breakdown
console.log('\n📋 Type Limits (v0.7.0+):');
const limitsCheck = checkAllLimits();
for (const [type, check] of Object.entries(limitsCheck)) {
  const icon = check.exceeded ? '⚠️ ' : '✅';
  const limitStr = check.limit === null ? 'unlimited' : check.limit.toString();
  console.log(`  ${icon} ${type}: ${check.current}/${limitStr} active`);
}

// Context switching warning if multiple active
if (active.length > 1) {
  const cost = active.length === 2 ? '20-30%' : '40%';
  console.log(`\n⚠️  Context switching: ${cost} productivity cost`);
}
```

---

## Progress Calculation

Progress percentage calculated from tasks.md:

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

---

## Warnings and Suggestions

### Stale Paused Increments

Paused >7 days → warning:

```
⏸️  Paused (1):
  🔄 0007-stripe [feature]
     Paused: 10 days ago
     ⚠️  STALE! Review or abandon?

💡 Actions:
   /resume 0007  # If unblocked
   /abandon 0007 # If no longer needed
```

### Long-Running Active Increments

Active >30 days → warning:

```
🔥 Active (1):
  🔧 0009-big-refactor [refactor]
     Progress: 45% (23/50 tasks)
     Age: 35 days
     ⚠️  Long-running! Consider breaking into smaller increments

💡 Suggestion: Large increments increase risk and reduce velocity
```

### Context Switching Cost

Multiple active features → warning:

```
📊 Summary:
  - Active: 3 features (0010, 0011, 0012)
  - Context switching: 40-60% productivity cost

⚠️  High context switching detected!
   Research shows: 3+ concurrent tasks = 40% productivity loss
   Suggestion: Complete or pause one before continuing
```

### Auto-Abandon Warning (Experiments)

Experiments inactive >14 days → warning:

```
🧪 Experiments (1):
  🔬 0010-graphql-experiment [experiment]
     Last activity: 15 days ago
     🚨 AUTO-ABANDON WARNING

💡 Experiments auto-abandon after 14 days of inactivity
   To prevent: Update via /do or /touch 0010
```

---

## Filters

### --active

Show only active increments

```bash
/status --active

🔥 Active (2):
  🚨 0005-hotfix [hotfix] (90% done)
  🔧 0006-i18n [feature] (50% done)
```

### --paused

Show only paused increments

```bash
/status --paused

⏸️  Paused (2):
  🔄 0007-stripe [feature] (paused 3 days)
     Reason: Waiting for API keys

  🔄 0008-refactor [refactor] (paused 10 days)
     Reason: Deprioritized
     ⚠️  STALE
```

### --completed

Show only completed increments

```bash
/status --completed

✅ Completed (5):
  0001-core-framework (completed 30 days ago)
  0002-core-enhancements (completed 25 days ago)
  0003-model-selection (completed 20 days ago)
  0004-plugin-architecture (completed 15 days ago)
  0005-cross-platform (completed 10 days ago)
```

### --abandoned

Show only abandoned increments

```bash
/status --abandoned

❌ Abandoned (3):
  0008-old-approach (Requirements changed)
  0009-failed-experiment (Experiment failed)
  0010-superseded (Replaced by 0011)

📊 Stats:
  - Abandonment rate: 30% (3/10 total)
  - Common reasons: Requirements changed (2), Experiment failed (1)

💡 Periodically review _abandoned/ for learnings
```

### --stale

Show only stale increments (paused >7 days OR active >30 days)

```bash
/status --stale

⚠️  Stale Increments (3):
  🔄 0007-stripe [feature] (paused 10 days)
  🔄 0008-experiment [experiment] (paused 15 days)
     🚨 AUTO-ABANDON WARNING
  🔧 0009-refactor [refactor] (active 35 days)
     ⚠️  Long-running

💡 Review stale increments weekly
   Paused >7 days: Resume or abandon
   Active >30 days: Consider breaking into smaller increments
```

---

## Related Commands

- `/do` - Continue work on active increment
- `/progress` - Detailed progress for current increment
- `/pause <id>` - Pause active increment
- `/resume <id>` - Resume paused increment
- `/abandon <id>` - Abandon increment (move to _abandoned/)

---

## Best Practices

✅ **Check status regularly** - Daily or before starting work

✅ **Address warnings promptly** - Don't let stale increments pile up

✅ **Complete before starting new** - Minimize context switching

✅ **Review abandoned for learnings** - Understand patterns

❌ **Don't ignore stale warnings** - They indicate blocked or forgotten work

❌ **Don't accumulate paused increments** - Resume or abandon

---

## Statistics and Analytics

Future enhancement (v0.8.0+):

```bash
/status --analytics

📊 Increment Analytics (Last 90 Days):

Velocity:
  - Completed: 8 increments
  - Avg cycle time: 4.2 days
  - Completion rate: 80%

Quality:
  - Avg coverage: 85%
  - Avg tasks/increment: 25

Patterns:
  - Most common type: feature (70%)
  - Context switching: 1.5 active avg
  - Stale rate: 15% (paused >7 days)

Recommendations:
  - ✅ Good velocity (8 increments/90 days)
  - ⚠️  High abandonment (20%) - review scoping
  - ✅ Low context switching (1.5 avg)
```

---

**Command**: `/specweave:status` (or `/status`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
**Part of**: Increment 0007 - Smart Status Management
