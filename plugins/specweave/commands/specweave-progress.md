---
name: specweave:progress
description: Show progress for ALL active increments (up to 2), task completion %, PM gates, and next actions
---

# Progress Tracking

**Quick Status Check**: See exactly where you are in ALL your active increments.

**NEW**: Now shows **ALL active increments** (max 2) with full progress for each!

Shows:
- **ALL active increment statuses** (not just one!)
- Task completion percentage (per increment)
- PM gate preview (tasks, tests, docs)
- Next action to take
- Time tracking
- WIP limit warnings (if >2 active)

---

## Quick Start

```bash
# Check progress for all active increments (recommended)
specweave progress

# Or use the full command name
specweave status --verbose

# Filter by increment type
specweave progress --type feature
```

**Note**: `progress` is an alias for `status --verbose` with automatic verbose mode enabled.

---

## Usage

```bash
# Check current progress
/specweave:progress

# Show progress for specific increment
/specweave:progress 0001
```

---

## What It Shows

### 1. Active Increment Info
- Increment ID and name
- Current status (planned, in-progress, completed)
- Time started and last activity

### 2. Task Progress (with %)
- Visual task list with completion indicators
- Percentage complete (P1 tasks weighted higher)
- Next incomplete task highlighted
- Stuck/blocked task warnings

### 3. PM Gates Preview
- **Gate 1**: Tasks completed (P1 required)
- **Gate 2**: Tests passing (>80% coverage)
- **Gate 3**: Documentation updated

### 4. Next Action Guidance
- Suggests exact command to run next
- Warns about WIP limit violations
- Alerts for long-inactive increments

---

## Example Output

### Normal Progress

```
📊 Current Progress

Active Increment: 0001-user-authentication
Status: in-progress (started 2 hours ago)

Task Progress: 3/12 completed (25%)
├─ [✅] T001: Setup auth module (P1) - 5 min ago
├─ [✅] T002: Create user model (P1) - 10 min ago
├─ [✅] T003: Implement JWT tokens (P1) - 15 min ago
├─ [⏳] T004: Add password hashing (P1) ← NEXT
├─ [ ] T005: Create login endpoint (P1)
├─ [ ] T006: Add logout endpoint (P2)
└─ 6 more tasks...

PM Gates Preview:
├─ Gate 1 (Tasks): 3/8 P1 tasks done (38%) ⏳
├─ Gate 2 (Tests): 2/5 passing (40%) ⏳
└─ Gate 3 (Docs): CLAUDE.md ✅, README.md ⏳

Last Activity: 5 minutes ago
Next Action: Run `/do 0001` to resume at T004

💡 Tip: `/do` auto-resumes from last incomplete task!
```

### No Active Work

```
📊 Current Progress

No active increment found.

Recent Increments:
├─ 0003-payment-flow (completed) - 1 day ago
├─ 0002-user-profile (completed) - 2 days ago
└─ 0001-auth (closed) - 3 days ago

Next Action: Run `/specweave inc "feature description"` to start new work

💡 Tip: `/inc` is your starting point for all new features
```

### Multiple In-Progress (WIP Limit Warning)

```
📊 Current Progress

⚠️ Warning: 2 increments in-progress (exceeds recommended WIP limit: 1)

Active Increments:
1. 0002-payment-flow (in-progress)
   └─ Task Progress: 5/10 completed (50%)

2. 0003-notifications (in-progress)
   └─ Task Progress: 2/8 completed (25%)

Recommendation: Focus on completing 0002 before starting new work.

Next Action: Run `/do 0002` to continue payment-flow
```

### Stuck/Inactive Increment

```
📊 Current Progress

Active Increment: 0001-user-authentication
Status: in-progress (started 2 days ago)

⚠️ Warning: Last activity was 6 hours ago
└─ Current task T005 may be stuck or blocked

Task Progress: 4/12 completed (33%)
├─ [✅] T001: Setup auth module (P1)
├─ [✅] T002: Create user model (P1)
├─ [✅] T003: Implement JWT tokens (P1)
├─ [✅] T004: Add password hashing (P1)
├─ [🔄] T005: Create login endpoint (P1) ← STUCK? (6 hours)
├─ [ ] T006: Add logout endpoint (P2)
└─ 6 more tasks...

Next Action:
1. Run `/do 0001` to retry T005
2. Or manually review T005 for blockers
3. Or skip T005 and defer to next increment

💡 Tip: Long-running tasks may need breaking down
```

---

## Implementation

**How `/progress` works** (UPGRADED for multi-active support):

### Step 1: Find ALL Active Increments (FAST!)

```typescript
// NEW: Use ActiveIncrementManager cache (10x faster!)
import { MetadataManager } from './src/core/increment/metadata-manager.js';

// Get ALL active increments (from cache, not scan!)
const activeIncrements = MetadataManager.getActive();

// Performance:
// - OLD: Scan 31 metadata files (~50ms)
// - NEW: Read 1 cache + 1-2 metadata files (~5ms) ✅
```

### Step 2: Parse Tasks and Calculate %

```bash
# Read tasks.md
# Count completed vs total
# Weight P1 tasks higher (2x), P2 (1.5x), P3 (1x)
# Calculate percentage

Example:
- P1 tasks: 3/8 complete = 3*2 / 8*2 = 6/16 (37.5%)
- P2 tasks: 2/3 complete = 2*1.5 / 3*1.5 = 3/4.5 (66%)
- P3 tasks: 1/1 complete = 1*1 / 1*1 = 1/1 (100%)

Overall: (6 + 3 + 1) / (16 + 4.5 + 1) = 10/21.5 = 46.5%
```

### Step 3: Check PM Gates

```bash
# Gate 1: Tasks
# - Count P1 tasks completed
# - Status: ✅ all done, ⏳ in progress, ❌ blocked

# Gate 2: Tests
# - Run test suite (npm test or equivalent)
# - Check coverage report
# - Status: ✅ >80%, ⏳ 50-80%, ❌ <50%

# Gate 3: Docs
# - Check if CLAUDE.md updated recently
# - Check if README.md mentions new feature
# - Status: ✅ updated, ⏳ partial, ❌ outdated
```

### Step 4: Display ALL Active Increments

```typescript
// NEW: Display progress for EACH active increment
for (const increment of activeIncrements) {
  console.log(`\n📊 ${increment.id}`);
  console.log(`Status: ${increment.status}`);
  console.log(`Task Progress: ${completed}/${total} (${percent}%)`);
  console.log(`Next: /specweave:do ${increment.id}`);
}

// Show WIP limit info
if (activeIncrements.length === 0) {
  console.log('No active increments. Run /specweave:increment to start new work.');
} else if (activeIncrements.length === 1) {
  console.log('✅ 1 active increment (optimal focus)');
} else if (activeIncrements.length === 2) {
  console.log('✅ 2 active increments (at WIP limit, but OK)');
} else if (activeIncrements.length > 2) {
  console.log('⚠️ >2 active increments (exceeds WIP limit!)');
}
```

---

## When to Use `/specweave:progress`

Use `/specweave:progress` when you:
- ✅ Come back after a break and need context
- ✅ Want to see overall completion status
- ✅ Need to know which task to work on next
- ✅ Forgot which increment you're working on
- ✅ Want to check if PM gates will pass
- ✅ Suspect a task is stuck or blocked
- ✅ Have multiple increments and need to prioritize

**Typical workflow**:
```bash
# Morning: Check what you were working on
/specweave:progress

# Shows: "Active: 0002-payments, Task 5/10 (50%)"
# Shows: "Next: /specweave:do 0002 to resume at T006"

/specweave:do 0002
# Auto-resumes from T006
```

---

## Pro Tips

1. **Shows ALL active increments** - `/specweave:progress` displays up to 2 active increments with full progress
2. **10x faster** - Uses cache instead of scanning 31 metadata files (5ms vs 50ms)
3. **Smart resume** - `/specweave:do` picks up where you left off (no task ID needed)
4. **WIP limits** - 2 active increments allowed (feature + hotfix/bug)
5. **Completion %** - P1 tasks weighted higher (they're critical path)
6. **Time tracking** - Warns if tasks are stuck (>2 hours inactive)

---

## Related Commands

- `/inc` - Start new increment (auto-closes previous if ready)
- `/do` - Execute tasks (auto-resumes from next incomplete)
- `/validate` - Run quality checks (optional)
- `/done` - Explicitly close increment (optional if `/inc` auto-closes)

---

**💡 Remember**: `/progress` is your "where am I?" command. Use it anytime you need orientation!

---

## Executable Implementation

```typescript
import { Task } from '@claude/types';

const task = new Task('progress-check', 'Show progress for all active increments');

task.run(async () => {
  const { MetadataManager } = await import('../../../dist/src/core/increment/metadata-manager.js');
  const fs = await import('fs-extra');
  const path = await import('path');

  // Step 1: Get ALL active increments (FAST via cache!)
  const activeIncrements = MetadataManager.getActive();

  // Step 2: Check if specific increment requested
  const requestedId = process.argv[2]?.replace(/^0+/, '').padStart(4, '0');
  const increments = requestedId
    ? activeIncrements.filter(inc => inc.id === requestedId)
    : activeIncrements;

  // Step 3: Display results
  console.log('\n📊 Current Progress\n');

  if (increments.length === 0) {
    if (requestedId) {
      console.log(`❌ Increment ${requestedId} is not active`);
    } else {
      console.log('No active increments found.\n');
      console.log('Recent Increments:');
      const allIncrements = MetadataManager.getAll()
        .filter(m => m.status === 'completed' || m.status === 'closed')
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        .slice(0, 3);

      allIncrements.forEach(inc => {
        const age = Math.floor((Date.now() - new Date(inc.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`├─ ${inc.id} (${inc.status}) - ${age} day${age === 1 ? '' : 's'} ago`);
      });

      console.log('\nNext Action: Run /specweave:increment "feature description" to start new work');
    }
    return;
  }

  // Step 4: Show progress for each active increment
  for (const increment of increments) {
    console.log(`📦 Increment: ${increment.id}`);
    console.log(`Status: ${increment.status}`);

    const started = new Date(increment.created);
    const lastActivity = new Date(increment.lastActivity);
    const ageHours = Math.floor((Date.now() - started.getTime()) / (1000 * 60 * 60));
    const lastActivityHours = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60));

    console.log(`Started: ${ageHours} hours ago`);
    console.log(`Last Activity: ${lastActivityHours} hours ago`);

    // Try to read tasks.md for progress
    const incrementPath = path.default.join(process.cwd(), '.specweave/increments', increment.id);
    const tasksPath = path.default.join(incrementPath, 'tasks.md');

    if (await fs.default.pathExists(tasksPath)) {
      const tasksContent = await fs.default.readFile(tasksPath, 'utf-8');

      // Count tasks
      const taskLines = tasksContent.split('\n').filter(line =>
        line.match(/^#+\s+(T-?\d+|Task-?\d+):/i)
      );
      const completedTasks = tasksContent.split('\n').filter(line =>
        line.includes('[✅]') || line.includes('[x]') || line.includes('[X]')
      );

      const total = taskLines.length;
      const completed = completedTasks.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      console.log(`\nTask Progress: ${completed}/${total} completed (${percent}%)`);

      if (total > 0) {
        console.log('\nTasks:');
        taskLines.slice(0, 10).forEach(line => {
          const isComplete = line.includes('[✅]') || line.includes('[x]') || line.includes('[X]');
          const marker = isComplete ? '✅' : '⏳';
          const taskName = line.replace(/^#+\s+/, '').replace(/\s*\[.*?\]\s*/, '').trim();
          console.log(`  ${marker} ${taskName}`);
        });

        if (taskLines.length > 10) {
          console.log(`  ... and ${taskLines.length - 10} more tasks`);
        }
      }
    }

    console.log(`\nNext Action: Run /specweave:do ${increment.id} to continue work\n`);
  }

  // Step 5: Show WIP limit warnings
  if (activeIncrements.length > 2) {
    console.log('⚠️ Warning: More than 2 active increments (exceeds WIP limit)');
    console.log('💡 Recommendation: Focus on completing one increment before starting new work\n');
  } else if (activeIncrements.length === 2) {
    console.log('✅ 2 active increments (at WIP limit, but OK)\n');
  } else if (activeIncrements.length === 1) {
    console.log('✅ 1 active increment (optimal focus)\n');
  }
});

export default task;
```
