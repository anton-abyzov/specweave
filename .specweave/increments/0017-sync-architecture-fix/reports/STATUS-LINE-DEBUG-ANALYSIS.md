# Status Line Issues - Root Cause Analysis

**Date**: 2025-11-11
**Increment**: 0017-sync-architecture-fix
**Issue**: Status line not showing progress bar and current task

---

## Current Problems

### 1. **Stale Active Increment Pointer** ❌
```bash
# What the system thinks is active:
.specweave/state/active-increment.json → "9999-status-line-test"

# What should be active (from user screenshot):
0017-sync-architecture-fix
```

**Impact**: Status line shows test increment instead of real work!

---

### 2. **Missing tasks.md Files** ❌
Increments missing critical files:
- ❌ `0017-sync-architecture-fix/tasks.md` (NO TASKS = NO PROGRESS BAR!)
- ❌ `0020-multi-project-intelligent-sync/tasks.md`

**Why it matters**: Status line REQUIRES tasks.md to:
- Count total tasks
- Count completed tasks
- Find current task (first `[ ]` checkbox)
- Calculate percentage

**Without tasks.md → Status line shows nothing!**

---

### 3. **Files in Wrong Location** ❌
Reports in increment ROOT instead of reports/ subfolder:

```bash
# ❌ WRONG (current state):
0017-sync-architecture-fix/
├── TEST-REPORT-COMPLETE.md          ← In root! Should be in reports/
├── spec.md
└── metadata.json

0020-multi-project-intelligent-sync/
├── IMPLEMENTATION-COMPLETE.md       ← In root! Should be in reports/
├── IMPLEMENTATION-SUMMARY.md        ← In root! Should be in reports/
├── UNIFIED-SYNC-ARCHITECTURE.md     ← In root! Should be in reports/
└── reports/
    └── CODE-REVIEW-*.md             ← Only these are correct!

# ✅ CORRECT (how it should be):
0017-sync-architecture-fix/
├── spec.md
├── plan.md
├── tasks.md                         ← Required for status line!
├── reports/                         ← All reports go here!
│   ├── TEST-REPORT-COMPLETE.md
│   └── ANALYSIS-*.md
└── metadata.json
```

**See CLAUDE.md section**: "🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!"

---

### 4. **Multiple "Active" Increments** ⚠️
Violates SpecWeave discipline (max 1 active):
- 0017-sync-architecture-fix (active)
- 0018-strict-increment-discipline-enforcement (active)
- 0019-jira-init-improvements (active)
- 0020-multi-project-intelligent-sync (active)
- 9999-status-line-test (active)

**Should be**: Only ONE increment active at a time!

---

## How Status Line Works (Architecture)

```
1. Hook fires after task completion:
   post-task-completion.sh
   ↓
2. Calls update-status-line.sh:
   ↓
3. Reads active increment:
   .specweave/state/active-increment.json → "0017-sync-architecture-fix"
   ↓
4. Finds tasks.md:
   .specweave/increments/0017-sync-architecture-fix/tasks.md
   ↓
5. Parses progress:
   - Total tasks: grep -c '^## T-' tasks.md
   - Completed: grep -c '^\[x\]' tasks.md
   - Current task: First '[ ]' checkbox
   ↓
6. Writes cache:
   .specweave/state/status-line.json
   ↓
7. Status line reads cache (<1ms):
   [sync-fix] ████░░░░ 15/30 (50%) • T-016: Update docs
```

**Critical dependencies**:
- ✅ `.specweave/state/active-increment.json` → Points to correct increment
- ✅ `.specweave/increments/{id}/tasks.md` → Exists and has task checkboxes
- ✅ Task format: `## T-NNN: Task Title` + `[ ]` or `[x]` checkboxes

---

## Fixes Required

### Fix 1: Update Active Increment Pointer
```bash
# Update to point to 0017 (current work)
echo '{"id":"0017-sync-architecture-fix"}' > .specweave/state/active-increment.json
```

### Fix 2: Create Missing tasks.md
Either:
- **Option A**: Regenerate increment with proper structure (`/specweave:increment`)
- **Option B**: Manually create tasks.md with checkpoint format

Example tasks.md format:
```markdown
---
increment: 0017-sync-architecture-fix
total_tasks: 5
test_mode: standard
coverage_target: 85%
---

# Tasks for Increment 0017: Sync Architecture Fix

## T-001: Fix init.ts prompt messages

[ ] **Fix sync architecture prompts**

- Update question text to reflect Local ↔ External architecture
- Remove "GitHub PRs ↔ Jira" language
- Test prompts with different provider combinations

## T-002: Update documentation

[x] **Update CLAUDE.md with correct architecture**

- Add diagrams showing Local ↔ External
- Clarify source of truth principle
- Test documentation accuracy

... (more tasks)
```

### Fix 3: Move Files to reports/ Folder
```bash
# Already created reports folder in this fix!

# Move report files
mv .specweave/increments/0017-sync-architecture-fix/TEST-REPORT-COMPLETE.md \
   .specweave/increments/0017-sync-architecture-fix/reports/

# For 0020 (if fixing that too):
mkdir -p .specweave/increments/0020-multi-project-intelligent-sync/reports
mv .specweave/increments/0020-multi-project-intelligent-sync/IMPLEMENTATION-*.md \
   .specweave/increments/0020-multi-project-intelligent-sync/reports/
mv .specweave/increments/0020-multi-project-intelligent-sync/UNIFIED-SYNC-ARCHITECTURE.md \
   .specweave/increments/0020-multi-project-intelligent-sync/reports/
```

### Fix 4: Close Completed Increments
```bash
# Mark completed increments as "completed" in metadata
# (Keep only 0017 as active if that's current work)

# For each completed increment:
jq '.status = "completed"' \
  .specweave/increments/0018-.../metadata.json > tmp && mv tmp metadata.json
```

### Fix 5: Update status-line.json Cache
```bash
# After fixes, regenerate cache
bash plugins/specweave/hooks/lib/update-status-line.sh
```

---

## CLAUDE.md Updates Needed

**Current section** ("🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!") is good but needs emphasis on reports/ folder.

**Add this section**:

```markdown
### ⛔ CRITICAL: Report Files MUST Go in reports/ Subfolder!

**ALL analysis, completion reports, and summary files MUST go in reports/ folder:**

```
✅ CORRECT:
.specweave/increments/0017-sync-fix/
├── spec.md                         ← Core files stay in root
├── plan.md
├── tasks.md                        ← Required for status line!
├── reports/                        ← ALL reports here!
│   ├── TEST-REPORT-COMPLETE.md
│   ├── ANALYSIS-*.md
│   ├── IMPLEMENTATION-*.md
│   └── SESSION-SUMMARY.md
└── metadata.json

❌ WRONG:
.specweave/increments/0017-sync-fix/
├── TEST-REPORT-COMPLETE.md         ← NO! Goes in reports/
├── ANALYSIS-*.md                   ← NO! Goes in reports/
├── spec.md
└── metadata.json
```

**Why this matters for status line**:
- ✅ Status line can parse tasks.md correctly (no extra .md files confusing it)
- ✅ Clean increment structure (core files at root level)
- ✅ Easy to find reports (one folder)
- ✅ Consistent across all increments
```

**Also update the existing section** to mention that report files in root can interfere with status line parsing.

---

## Expected Behavior After Fixes

```bash
# Status line should show:
[sync-fix] ████░░░░ 5/10 (50%) • T-006: Update documentation

# Or if complete:
[sync-fix] ████████ 10/10 (100%) • Use /specweave:done

# Or if no active increment:
No active increment
```

---

## Summary

**Root causes**:
1. ❌ Stale active-increment.json pointing to test increment
2. ❌ Missing tasks.md files (can't calculate progress)
3. ❌ Files in wrong locations (increment root instead of reports/)
4. ⚠️ Multiple "active" increments (should be only 1)

**Fixes applied**:
1. ✅ Created reports/ folder for 0017
2. 📋 TODO: Update active-increment.json to current increment
3. 📋 TODO: Create tasks.md with proper checkpoint format
4. 📋 TODO: Move TEST-REPORT-COMPLETE.md to reports/
5. 📋 TODO: Update CLAUDE.md with clearer file organization rules

**Result**: Status line will show progress bar and current task correctly!

---

## Testing After Fixes

```bash
# 1. Verify active increment
cat .specweave/state/active-increment.json
# Should show: {"id":"0017-sync-architecture-fix"}

# 2. Verify tasks.md exists
ls -l .specweave/increments/0017-sync-architecture-fix/tasks.md

# 3. Regenerate cache
bash plugins/specweave/hooks/lib/update-status-line.sh

# 4. Check cache
cat .specweave/state/status-line.json
# Should show correct increment, tasks, and progress

# 5. Test status line
specweave status-line
# Should display: [sync-fix] ████░░░░ X/Y (Z%) • T-NNN: Task title
```
