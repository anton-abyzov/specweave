# /specweave:progress Command - Simple Fix

**Date**: 2025-11-15
**Increment**: 0034-github-ac-checkboxes-fix

---

## TL;DR

**Solution**: `/specweave:progress` should just call `status --verbose` (which already exists!)

---

## Current Situation

### What EXISTS
- ✅ **`status` CLI command** - Shows all increments, progress %, age, WIP limits
- ✅ **`status --verbose`** - Adds extra details (progress %, age in days)
- ✅ **`/specweave:progress` slash command** - Just documentation (doesn't execute anything)

### What's MISSING
- ❌ No `progress` CLI command
- ❌ Slash command doesn't actually run any code
- ❌ Documentation misleads users into thinking there's a `progress` command

---

## What `status --verbose` Already Shows

```bash
$ node bin/specweave.js status --verbose

📊 Increment Status

📈 Overall Progress: 4/5 increments complete (80%)

▶️  Active (1):
  ● 0034-github-ac-checkboxes-fix [feature]
     Progress: 0%        ← VERBOSE: Shows progress %
     Age: 0 days         ← VERBOSE: Shows age

📈 WIP Limit:
  ✅ Active increments: 1/1

📊 Summary:
   Active: 1
   Paused: 0
   Completed: 4
   Abandoned: 0
   Total: 5
```

**Already includes**:
- ✅ ALL active increments
- ✅ Progress % (from tasks.md checkboxes)
- ✅ Age in days
- ✅ WIP limit warnings
- ✅ Overall progress
- ✅ Next actions

---

## Comparison: `status --verbose` vs Expected `progress`

| Feature | `status --verbose` | Expected in `progress` | Gap |
|---------|-------------------|------------------------|-----|
| **ALL active increments** | ✅ | ✅ | None |
| **Progress %** | ✅ | ✅ | None |
| **Age tracking** | ✅ (days) | ✅ (days) | None |
| **WIP limits** | ✅ | ✅ | None |
| **Overall progress** | ✅ | ✅ | None |
| **Next actions** | ✅ (basic) | ✅ (basic) | None |
| **Task-level details** | ❌ | ✅ | **Missing** |
| **PM gates** | ❌ | ✅ | **Missing** |
| **Next task highlighted** | ❌ | ✅ | **Missing** |

**Conclusion**: `status --verbose` is **80% there**, just missing task-level details.

---

## Two Approaches

### Option A: Simple Alias (5 minutes) ✅ RECOMMENDED

**Make `progress` an alias for `status --verbose`**

**Changes**:
1. Add alias to CLI (1 line)
2. Update slash command docs to point to `status --verbose`

**Implementation**:
```javascript
// bin/specweave.js (line ~107)
program
  .command('status')
  .alias('progress')  // ← Add this
  .description('Show increment status overview (alias: progress)')
  .option('-v, --verbose', 'Show detailed information')
  .option('-t, --type <type>', 'Filter by increment type')
  .action(async (options) => {
    const { statusCommand } = await import('../dist/src/cli/commands/status.js');
    // Auto-enable verbose when called as 'progress'
    if (program.args[0] === 'progress') {
      options.verbose = true;
    }
    await statusCommand(options);
  });
```

**Result**:
```bash
# Both work identically:
node bin/specweave.js status --verbose
node bin/specweave.js progress

# Slash command documentation:
/specweave:progress → "Run 'specweave progress' for detailed status"
```

**Pros**:
- ✅ 1-line code change
- ✅ Works immediately
- ✅ No new code to maintain
- ✅ Semantic naming (users can use `progress` if they prefer)

**Cons**:
- ❌ Doesn't show task-level details (yet)
- ❌ Doesn't show PM gates (yet)

### Option B: Full Implementation (4 hours)

**Create new `progress` command with task-level details**

**Changes**:
1. Create `src/cli/commands/progress.ts`
2. Create `src/core/increment/progress-commands.ts`
3. Parse tasks.md for individual task status
4. Show PM gates preview
5. Highlight next task

**Pros**:
- ✅ Full feature set (task tree, PM gates, next task)
- ✅ Matches documentation expectations

**Cons**:
- ❌ 4 hours of work
- ❌ Need task parsing logic
- ❌ Need PM gates checking logic
- ❌ More code to maintain

---

## Recommendation: Start with Option A

**Why**:
1. **Immediate fix** - Users can use `/specweave:progress` today
2. **80% solution** - Shows what users need (active increments, progress, WIP limits)
3. **Iterative improvement** - Can add task details later when needed

**Then enhance** `status` command to show task details when needed (Option B can be Phase 2)

---

## Implementation: Option A (Simple Alias)

### Step 1: Add Alias to CLI (2 min)

**File**: `bin/specweave.js` (line 107)

```diff
program
  .command('status')
+ .alias('progress')
- .description('Show increment status overview')
+ .description('Show increment status overview (alias: progress)')
  .option('-v, --verbose', 'Show detailed information')
  .option('-t, --type <type>', 'Filter by increment type (feature, hotfix, bug, etc.)')
  .action(async (options) => {
    const { statusCommand } = await import('../dist/src/cli/commands/status.js');
+   // Auto-enable verbose when called as 'progress'
+   if (process.argv.includes('progress') && !options.verbose) {
+     options.verbose = true;
+   }
    await statusCommand(options);
  });
```

### Step 2: Update Slash Command Documentation (3 min)

**File**: `plugins/specweave/commands/specweave-progress.md`

**Add at top** (after frontmatter):
```markdown
**Quick Start**:
```bash
# Check progress for all active increments
specweave progress

# Or use the full command:
specweave status --verbose
```

**Note**: `progress` is an alias for `status --verbose` for easier typing.
```

### Step 3: Test (5 min)

```bash
# Build
npm run build

# Test alias works
node bin/specweave.js progress
# Should show same output as status --verbose

# Test verbose auto-enabled
node bin/specweave.js progress
# Should show progress % and age (verbose output)

# Test original still works
node bin/specweave.js status --verbose
# Should show same output
```

---

## Future Enhancement: Task-Level Details

**When users need more detail**, we can enhance `status --verbose` to show:

```bash
$ specweave progress

📊 Current Progress

▶️  Active: 0034-github-ac-checkboxes-fix
    Progress: 5/20 tasks (25%)

    Tasks:
    ├─ [✅] T-001: Setup project structure (P1)
    ├─ [✅] T-002: Create API client (P1)
    ├─ [✅] T-003: Add authentication (P1)
    ├─ [⏳] T-004: Implement sync logic (P1) ← NEXT
    ├─ [ ] T-005: Add error handling (P2)
    └─ 15 more tasks...

    PM Gates:
    ├─ Tasks: 3/8 P1 done (38%) ⏳
    ├─ Tests: 0/5 passing (0%) ❌
    └─ Docs: Not updated ⏳
```

**Implementation**: Add `--tasks` flag to show task tree (future work)

---

## Success Criteria

### Phase 1: Alias (Today) ✅
- [ ] `node bin/specweave.js progress` works
- [ ] Auto-enables verbose output
- [ ] Shows all active increments
- [ ] Shows progress % and age
- [ ] Slash command documentation updated

### Phase 2: Task Details (Future) 📋
- [ ] Shows task tree with checkboxes
- [ ] Shows PM gates preview
- [ ] Highlights next task
- [ ] Shows time since last activity

---

## Conclusion

**Immediate Fix**: Add `.alias('progress')` to `status` command (5 minutes)

**Result**:
- Users can use `/specweave:progress` immediately
- Shows 80% of what they need (active increments, progress, WIP limits)
- Can enhance later with task-level details if needed

**Next Steps**:
1. Add alias (1 line)
2. Auto-enable verbose (3 lines)
3. Update docs (add "Quick Start")
4. Test and ship ✅

---

**Total Time**: 15 minutes
**Impact**: High (fixes user-reported issue immediately)
**Risk**: Low (no breaking changes, just adds alias)
