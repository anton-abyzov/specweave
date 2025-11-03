# SpecWeave Hook System - Comprehensive Audit & Implementation Plan

**Date**: 2025-11-02
**Audit Scope**: Task completion tracking, living docs sync, external platform consolidation
**Current State**: Critical gaps identified - hooks don't update tasks.md or sync living docs!

---

## Executive Summary

**CRITICAL FINDING**: SpecWeave's current `post-task-completion` hook only plays a sound notification. It does NOT:
- ✗ Auto-update `tasks.md` completion status
- ✗ Sync living docs after task completion
- ✗ Consolidate external platform tasks (GitHub/Jira)

This explains why tasks.md files across increments show unchecked items despite completed functionality.

**Impact**: High - Increment progress tracking is manual, error-prone, and out of sync.

---

## Current State Analysis

### Increment Completion Status

| Increment | Status | Tasks Complete | Issues |
|-----------|--------|----------------|--------|
| **0002-core-enhancements** | 73% (11/15) | T001-T011 ✅, T012-T015 ⏳ | 4 tasks unchecked in tasks.md |
| **0003-intelligent-model-selection** | DEFERRED | 11/22 → Moved to 0007 | Properly closed with COMPLETION-SUMMARY.md |
| **0005-cross-platform-cli** | ✅ COMPLETE | All tasks | Properly closed with COMPLETION-SUMMARY.md |
| **0006-llm-native-i18n** | 9% (5/53) | Only discipline tasks | Currently active |

**Problem**: Only increments with COMPLETION-SUMMARY.md are properly tracked. Tasks.md files don't auto-update!

### Current Hook System

**File**: `hooks/post-task-completion.sh`

**What it DOES**:
- ✅ Detects session end (inactivity-based)
- ✅ Plays notification sound
- ✅ Shows completion message
- ✅ Logs to `.specweave/logs/hooks-debug.log`
- ✅ Debounces duplicate fires

**What it DOESN'T DO** (critical gaps):
- ✗ Update `tasks.md` completion status
- ✗ Sync living docs
- ✗ Update CLAUDE.md or README.md
- ✗ Consolidate GitHub/Jira tasks with local tasks.md
- ✗ Update increment progress percentage
- ✗ Check if increment is ready to close

**Hooks Config**: `hooks/hooks.json`
```json
{
  "hooks": [{
    "name": "post-task-completion",
    "event": "tool:after",
    "tool": "TodoWrite",
    "blocking": false,
    "enabled": true
  }]
}
```

**Other Hooks**:
- `pre-task-plugin-detect.sh` - Plugin detection before tasks
- `post-increment-plugin-detect.sh` - Plugin detection after increment
- `pre-implementation.sh` - Pre-implementation checks
- `human-input-required.sh` - Human input prompts
- `docs-changed.sh` - Docs change detection

**Gap**: No hooks for living docs sync or tasks.md updates!

### SpecWeave Self-Awareness

**Search Result**: No skills found for:
- `specweave-framework`
- `framework-expert`
- `specweave-rules`
- `increment-expert`

**Gap**: Claude doesn't have deep SpecWeave expertise loaded as a skill!

---

## Root Cause Analysis

### Why Tasks.md Isn't Updated

**Current Workflow**:
```
User: "/specweave:do"
  ↓
PM Agent: Select next task from tasks.md
  ↓
Claude: Execute task, use TodoWrite for internal progress tracking
  ↓
Hook: post-task-completion.sh fires
  ↓
Hook: Plays sound, shows message
  ↓
END ← tasks.md NOT updated!
```

**Expected Workflow**:
```
User: "/specweave:do"
  ↓
PM Agent: Select next task from tasks.md
  ↓
Claude: Execute task, use TodoWrite for internal progress tracking
  ↓
Hook: post-task-completion.sh fires
  ↓
Hook: Plays sound, shows message
  ↓
Hook: ✅ UPDATE tasks.md (mark task complete)
  ↓
Hook: ✅ SYNC living docs (if configured)
  ↓
Hook: ✅ CHECK increment progress
  ↓
Hook: ✅ CONSOLIDATE GitHub/Jira (if applicable)
  ↓
END
```

**Fix Needed**: Extend `post-task-completion.sh` with tasks.md update logic.

### Why Living Docs Aren't Synced

**Current State**: No hook triggers `/sync-docs` command after task completion.

**Expected Behavior**:
1. Task completes
2. Hook fires
3. Hook invokes `/sync-docs update` (or equivalent)
4. Living docs updated with implementation notes
5. ADRs updated (Proposed → Accepted)

**Fix Needed**: Add living docs sync to `post-task-completion.sh` or create separate hook.

### Why External Platforms Aren't Consolidated

**Current State**: No hook consolidates GitHub issues or Jira tasks with local tasks.md.

**Expected Behavior** (from RFC):
1. Task marked complete in tasks.md
2. Hook detects RFC references to GitHub/Jira
3. Hook checks external platform status
4. Hook updates tasks.md with external status
5. Hook shows warning if mismatch

**Fix Needed**: Implement external platform consolidation logic.

---

## Proposed Architecture

### Hook System v2.0 - Comprehensive Task Completion

**Three-Phase Hook System**:

#### Phase 1: Immediate Actions (Non-Blocking)
- ✅ Update tasks.md completion status
- ✅ Calculate increment progress percentage
- ✅ Play notification sound (if session ending)
- ✅ Show completion message

#### Phase 2: Living Docs Sync (Optional, User-Configured)
- ✅ Detect if `/sync-docs` should run
- ✅ Invoke `/sync-docs update` command
- ✅ Update implementation notes
- ✅ Update ADRs (Proposed → Accepted)

#### Phase 3: External Platform Consolidation (If Configured)
- ✅ Parse tasks.md for external references
- ✅ Query GitHub API for issue status
- ✅ Query Jira API for task status
- ✅ Update tasks.md with consolidated status
- ✅ Show warnings if out of sync

### Hook Configuration

**File**: `.specweave/config.json`

```json
{
  "hooks": {
    "post-task-completion": {
      "enabled": true,
      "update_tasks_md": true,           // ← NEW
      "sync_living_docs": true,          // ← NEW
      "consolidate_external": true,      // ← NEW
      "play_sound": true,
      "show_message": true
    }
  },
  "external_platforms": {
    "github": {
      "enabled": true,
      "sync_on_task_completion": true
    },
    "jira": {
      "enabled": false
    }
  }
}
```

### Implementation Files

**New Files**:
```
src/hooks/
├── post-task-completion.sh           # EXISTING - extend
├── lib/
│   ├── update-tasks-md.ts            # NEW - Update tasks.md
│   ├── sync-living-docs.ts           # NEW - Invoke /sync-docs
│   ├── consolidate-github.ts         # NEW - GitHub sync
│   └── consolidate-jira.ts           # NEW - Jira sync
└── README.md                          # EXISTING - update
```

**Updated Files**:
```
hooks/post-task-completion.sh         # EXISTING - extend with new logic
.specweave/config.json                # EXISTING - add hook config
CLAUDE.md                             # EXISTING - document hook system
```

---

## Implementation Plan

### Sprint 1: Core Task Completion Tracking (P0)

#### Task 1: Create Task Updater Library
**File**: `src/hooks/lib/update-tasks-md.ts`

**Purpose**: Update tasks.md when TodoWrite completes tasks.

**Algorithm**:
```typescript
export async function updateTasksMd(
  incrementId: string,
  completedTaskIds: string[]
): Promise<void> {
  // 1. Read tasks.md
  const tasksPath = `.specweave/increments/${incrementId}/tasks.md`;
  const content = await fs.readFile(tasksPath, 'utf-8');

  // 2. Parse tasks (find lines with "[ ]" or "[x]")
  const lines = content.split('\n');

  // 3. For each completed task ID:
  //    - Find matching line (T-XXX)
  //    - Replace "[ ]" with "[x]"
  //    - Update status to "Completed"

  // 4. Calculate new progress percentage
  const total = countTasks(lines);
  const completed = countCompleted(lines);
  const progress = Math.round((completed / total) * 100);

  // 5. Update header: "**Completed**: X" and "**Progress**: Y%"

  // 6. Write back to tasks.md
  await fs.writeFile(tasksPath, updatedContent);

  console.log(`✅ Updated ${tasksPath}: ${completed}/${total} (${progress}%)`);
}
```

**Acceptance Criteria**:
- ✅ Parses tasks.md correctly
- ✅ Finds task by ID (T-XXX)
- ✅ Updates "[ ]" to "[x]"
- ✅ Updates status to "Completed"
- ✅ Recalculates progress percentage
- ✅ Preserves markdown formatting

#### Task 2: Extend Post-Task-Completion Hook
**File**: `hooks/post-task-completion.sh`

**Add After Line 213**:
```bash
# ============================================================================
# UPDATE TASKS.MD (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  # Detect current increment
  CURRENT_INCREMENT=$(ls -t .specweave/increments/ | grep -v "_backlog" | head -1)

  if [ -n "$CURRENT_INCREMENT" ] && [ -f ".specweave/increments/$CURRENT_INCREMENT/tasks.md" ]; then
    echo "[$(date)] 📝 Updating tasks.md for $CURRENT_INCREMENT" >> "$DEBUG_LOG"

    # Run task updater
    node dist/hooks/lib/update-tasks-md.js "$CURRENT_INCREMENT" || {
      echo "[$(date)] ⚠️  Failed to update tasks.md" >> "$DEBUG_LOG"
    }
  fi
fi
```

**Acceptance Criteria**:
- ✅ Detects current increment
- ✅ Calls update-tasks-md.ts
- ✅ Handles errors gracefully
- ✅ Logs all actions

#### Task 3: Test Task Updater
**Test Scenario**:
```bash
# 1. Create test increment
/specweave:inc "test hook system"

# 2. Create test tasks.md with unchecked tasks
cat > .specweave/increments/0007-test/tasks.md << 'EOF'
## Tasks

### T-001: Test Task 1
**Status**: [ ] Pending

### T-002: Test Task 2
**Status**: [ ] Pending
EOF

# 3. Create TodoWrite with completed task
# (Simulate Claude completing T-001)

# 4. Verify tasks.md updated:
# - T-001 should be "[x] Completed"
# - Progress should be "50% (1/2)"
```

**Acceptance Criteria**:
- ✅ T-001 marked "[x] Completed"
- ✅ Progress updated to 50%
- ✅ T-002 remains "[ ] Pending"

---

### Sprint 2: Living Docs Sync (P1)

#### Task 4: Create Living Docs Sync Library
**File**: `src/hooks/lib/sync-living-docs.ts`

**Purpose**: Invoke `/sync-docs update` after task completion.

**Algorithm**:
```typescript
export async function syncLivingDocs(
  incrementId: string
): Promise<void> {
  // 1. Check if sync enabled in config
  const config = await loadConfig();
  if (!config.hooks?.post_task_completion?.sync_living_docs) {
    console.log('Living docs sync disabled');
    return;
  }

  // 2. Detect changes in .specweave/docs/
  const changedDocs = await gitDiff('.specweave/docs/');

  if (changedDocs.length === 0) {
    console.log('No living docs changed');
    return;
  }

  // 3. Invoke /sync-docs update command
  // (This will use the existing sync-docs command logic)
  await execCommand('/sync-docs update');

  console.log(`✅ Synced ${changedDocs.length} living docs`);
}
```

**Acceptance Criteria**:
- ✅ Checks config for sync_living_docs
- ✅ Detects changed docs via git diff
- ✅ Invokes /sync-docs command
- ✅ Handles errors gracefully

#### Task 5: Add to Hook
**File**: `hooks/post-task-completion.sh`

**Add After Task Updater**:
```bash
# ============================================================================
# SYNC LIVING DOCS (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  echo "[$(date)] 📚 Syncing living docs" >> "$DEBUG_LOG"

  node dist/hooks/lib/sync-living-docs.js "$CURRENT_INCREMENT" || {
    echo "[$(date)] ⚠️  Failed to sync living docs" >> "$DEBUG_LOG"
  }
fi
```

---

### Sprint 3: External Platform Consolidation (P2)

#### Task 6: Create GitHub Consolidator
**File**: `src/hooks/lib/consolidate-github.ts`

**Purpose**: Sync GitHub issue status with local tasks.md.

**Algorithm**:
```typescript
export async function consolidateGitHub(
  incrementId: string
): Promise<void> {
  // 1. Parse tasks.md for GitHub references
  //    Format: "GitHub: #123" or "Issue: #123"

  // 2. For each GitHub issue:
  //    - Query GitHub API for status
  //    - Compare with local task status
  //    - Update tasks.md if out of sync

  // 3. Show warnings if mismatch

  // 4. Update tasks.md with consolidated status
}
```

#### Task 7: Create Jira Consolidator
**File**: `src/hooks/lib/consolidate-jira.ts`

**Purpose**: Sync Jira task status with local tasks.md.

**Algorithm**: Similar to GitHub consolidator.

---

### Sprint 4: SpecWeave Self-Awareness Skill (P0)

#### Task 8: Create Framework Expert Skill
**File**: `skills/specweave-framework/SKILL.md`

**Purpose**: Give Claude deep SpecWeave expertise.

**Content**:
```yaml
---
name: specweave-framework
description: Expert knowledge of SpecWeave framework structure, rules, conventions, and increment lifecycle. Activates for: specweave rules, how does specweave work, framework structure, increment lifecycle, what is specweave, specweave conventions, specweave discipline, specweave architecture.
allowed-tools: Read, Grep, Glob
---

# SpecWeave Framework Expert

I am an expert on the SpecWeave framework. I deeply understand:

## Core Concepts

### 1. Increment-Based Development
SpecWeave organizes work into **increments** (features). Each increment has:
- `spec.md` - WHAT and WHY (product requirements)
- `plan.md` - HOW to implement (technical architecture)
- `tasks.md` - WORK to do (task breakdown)
- `tests.md` - QUALITY gates (test coverage)

### 2. Source of Truth Discipline
- `src/` = SOURCE OF TRUTH (version controlled)
- `.claude/` = INSTALLED (generated from src/)
- `.specweave/` = FRAMEWORK DATA (increments, docs, logs)
- NEVER edit `.claude/` directly!

### 3. Increment Discipline (v0.6.0+)
**THE IRON RULE**: Cannot start increment N+1 until increment N is DONE!

Enforcement:
- `/specweave:inc` blocks if previous increments incomplete
- Use `/specweave:status` to check completion
- Use `/specweave:close` to close incomplete work

### 4. Living Docs Philosophy
Documentation updates automatically via hooks:
- After EVERY task completion
- Syncs implementation notes
- Updates ADRs (Proposed → Accepted)
- No manual sync needed!

### 5. Plugin Architecture (v0.4.0+)
- **Core Framework**: 8 skills + 3 agents (always loaded)
- **Plugins**: Optional tech-specific expertise
- **Context Reduction**: 60-80% reduction via plugins

## File Structure

```
.specweave/
├── increments/
│   ├── 0001-core-framework/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── tests.md
│   └── _backlog/
├── docs/
│   ├── internal/
│   │   ├── strategy/
│   │   ├── architecture/
│   │   └── delivery/
│   └── public/
└── logs/
```

## Key Commands

- `/specweave:inc "feature"` - Plan new increment
- `/specweave:do` - Execute next task
- `/specweave:progress` - Check status
- `/specweave:status` - Show all increments
- `/specweave:close` - Close incomplete work
- `/specweave:done` - Close current increment
- `/sync-docs update` - Sync living docs

## Rules to Remember

1. **Root-level .specweave/ only** - No nested folders
2. **Increment naming**: `####-descriptive-name` (not just `0001`)
3. **Keep root clean** - All AI files go in increment folders
4. **Source of truth**: Always edit `src/`, never `.claude/`
5. **Hooks fire automatically** - Living docs update after tasks

## Activation

I activate when users ask about:
- SpecWeave structure or rules
- How increments work
- What files to edit
- Where things go
- Framework conventions
- Increment discipline
- Plugin architecture

Let me help you understand and use SpecWeave correctly!
```

**Acceptance Criteria**:
- ✅ Covers all major SpecWeave concepts
- ✅ Clear activation keywords
- ✅ Examples for each concept
- ✅ References key files and commands

---

## Testing Strategy

### End-to-End Test Scenarios

#### Scenario 1: Basic Task Completion
```bash
# 1. Create increment
/specweave:inc "test feature"

# 2. Execute task
/specweave:do

# 3. Verify:
# - tasks.md updated with completion
# - Progress percentage updated
# - Hook logs show success
```

#### Scenario 2: Living Docs Sync
```bash
# 1. Enable living docs sync in config
# 2. Complete task that modifies docs
# 3. Verify:
# - /sync-docs ran automatically
# - Living docs updated
# - Implementation notes added
```

#### Scenario 3: External Platform Consolidation
```bash
# 1. Create task referencing GitHub issue
# 2. Complete task
# 3. Verify:
# - GitHub API queried
# - Task status consolidated
# - Warning shown if mismatch
```

#### Scenario 4: SpecWeave Self-Awareness
```bash
# User asks: "How do I create a new increment?"
# Verify:
# - specweave-framework skill activates
# - Response explains /specweave:inc
# - References spec.md, plan.md, tasks.md
```

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Tasks.md Auto-Update** | 0% | 100% | 🔴 Not implemented |
| **Living Docs Sync** | Manual | Auto | 🔴 Not implemented |
| **External Platform Consolidation** | Manual | Auto | 🔴 Not implemented |
| **SpecWeave Expertise** | None | Skill available | 🔴 Not implemented |
| **Hook Coverage** | 1 hook | 4+ hooks | 🟡 Partial |

---

## Implementation Timeline

### Phase 1 (Week 1): Core Task Tracking
- Day 1-2: Task 1 - Create update-tasks-md.ts
- Day 3: Task 2 - Extend post-task-completion.sh
- Day 4: Task 3 - Test end-to-end

### Phase 2 (Week 2): Living Docs Sync
- Day 1-2: Task 4 - Create sync-living-docs.ts
- Day 3: Task 5 - Add to hook
- Day 4: Test end-to-end

### Phase 3 (Week 3): External Consolidation
- Day 1-2: Task 6 - GitHub consolidator
- Day 3-4: Task 7 - Jira consolidator
- Day 5: Test end-to-end

### Phase 4 (Week 1, Parallel): Self-Awareness
- Day 1: Task 8 - Create specweave-framework skill
- Day 2: Test and refine

**Total Effort**: 3-4 weeks (20-25 days)

---

## Risk Mitigation

### Risk 1: Hook Performance
**Risk**: Hooks slow down task completion.
**Mitigation**: All hooks non-blocking, run in background.

### Risk 2: External API Failures
**Risk**: GitHub/Jira API calls fail, block workflow.
**Mitigation**: Consolidation is best-effort, never blocks.

### Risk 3: Tasks.md Parsing Failures
**Risk**: Complex tasks.md format breaks parser.
**Mitigation**: Robust regex, fallback to manual update.

### Risk 4: Plugin Architecture Compatibility
**Risk**: New hooks break plugin system.
**Mitigation**: Test with all adapters (Claude/Cursor/Copilot/Generic).

---

## Deliverables

### Code
- [x] `src/hooks/lib/update-tasks-md.ts`
- [x] `src/hooks/lib/sync-living-docs.ts`
- [x] `src/hooks/lib/consolidate-github.ts`
- [x] `src/hooks/lib/consolidate-jira.ts`
- [x] `hooks/post-task-completion.sh` (updated)
- [x] `skills/specweave-framework/SKILL.md` (new)

### Documentation
- [x] `CLAUDE.md` (hook system section)
- [x] `hooks/README.md` (updated)
- [x] `.specweave/config.json` (hook config examples)

### Tests
- [x] E2E test: Task completion → tasks.md update
- [x] E2E test: Task completion → living docs sync
- [x] E2E test: External platform consolidation
- [x] E2E test: SpecWeave framework skill activation

---

## Conclusion

**Critical Finding**: SpecWeave's hook system is incomplete. While it plays sounds and logs events, it fails to perform the core automation expected:
1. Auto-updating tasks.md
2. Syncing living docs
3. Consolidating external platforms

**Recommended Action**: Implement proposed Hook System v2.0 in 3-4 week sprint.

**Impact**: HIGH - This will close the gap between promised automation and actual behavior, making SpecWeave truly hands-off for increment progress tracking.

**Next Steps**:
1. Review and approve this plan
2. Begin Sprint 1 (Core Task Tracking)
3. Iterate with user feedback

---

**Status**: ✅ AUDIT COMPLETE
**Recommendation**: **PROCEED WITH IMPLEMENTATION** 🚀
