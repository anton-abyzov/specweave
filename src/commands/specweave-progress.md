---
name: specweave-progress
description: Show current increment progress, task completion %, PM gate status, and next action
---

# Progress Tracking

**Quick Status Check**: See exactly where you are in your current increment.

Shows:
- Active increment status
- Task completion percentage
- PM gate preview (tasks, tests, docs)
- Next action to take
- Time tracking

---

## Usage

```bash
# Check current progress
/progress

# Show progress for specific increment
/progress 0001
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
Next Action: Run `/build 0001` to resume at T004

💡 Tip: `/build` auto-resumes from last incomplete task!
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

Next Action: Run `/build 0002` to continue payment-flow
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
1. Run `/build 0001` to retry T005
2. Or manually review T005 for blockers
3. Or skip T005 and defer to next increment

💡 Tip: Long-running tasks may need breaking down
```

---

## Implementation

**How `/progress` works**:

### Step 1: Find Active Increment

```bash
# Check for in-progress increments
find .specweave/increments -name "tasks.md" -exec grep -l "status: in-progress" {} \;
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

### Step 4: Determine Next Action

```bash
if [[ $in_progress_count -eq 0 ]]; then
    echo "Run \`/inc\` to start new feature"
elif [[ $in_progress_count -gt 1 ]]; then
    echo "⚠️ Multiple increments active. Focus on completing one."
    echo "Run \`/build $oldest_increment\`"
elif [[ $next_task != "" ]]; then
    echo "Run \`/build $increment_id\` to resume at $next_task"
else
    echo "All tasks complete! Run \`/done $increment_id\` to close."
fi
```

---

## When to Use `/progress`

Use `/progress` when you:
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
/progress

# Shows: "Active: 0002-payments, Task 5/10 (50%)"
# Shows: "Next: /build 0002 to resume at T006"

/build 0002
# Auto-resumes from T006
```

---

## Pro Tips

1. **No increment ID needed** - `/progress` automatically finds active increment
2. **Smart resume** - `/build` picks up where you left off (no task ID needed)
3. **WIP limits** - Keep 1-2 increments active max for focus
4. **Completion %** - P1 tasks weighted higher (they're critical path)
5. **Time tracking** - Warns if tasks are stuck (>2 hours inactive)

---

## Related Commands

- `/inc` - Start new increment (auto-closes previous if ready)
- `/build` - Execute tasks (auto-resumes from next incomplete)
- `/validate` - Run quality checks (optional)
- `/done` - Explicitly close increment (optional if `/inc` auto-closes)

---

**💡 Remember**: `/progress` is your "where am I?" command. Use it anytime you need orientation!
