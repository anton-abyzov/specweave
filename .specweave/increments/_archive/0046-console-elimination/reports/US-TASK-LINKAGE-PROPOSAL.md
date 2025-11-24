# Proposal: US-Task Linkage Architecture

**Date**: 2025-11-19
**Context**: Increment 0046 tasks.md lacks traceability to User Stories
**Impact**: Critical - breaks living docs sync, AC validation, progress tracking

---

## Problem Statement

### Current Broken State

```
Feature (FS-046)
  ↓
User Stories (US-001, US-002, US-003)
  ↓
Acceptance Criteria (AC-US1-01, AC-US1-02...)
  ↓
  ??? ← NO LINK
  ↓
Tasks (T-001, T-002, T-003...)
```

**Symptoms**:
- Living docs US files show "No tasks defined"
- Can't automatically determine US completion from task status
- Can't trace which tasks implement which ACs
- Manual sync required between tasks.md and living docs
- `/specweave:sync-docs` can't update US task lists

### Root Cause

`tasks.md` structure has:
- Tasks with their own embedded ACs (not the same as US ACs!)
- NO explicit `user_story` field linking task to parent US
- NO `satisfies_acs` field mapping task to US acceptance criteria

---

## Proposed Solution: Hierarchical Tasks with Explicit Linkage

### New tasks.md Structure

```markdown
---
total_tasks: 25
completed: 18
by_user_story:
  US-001: 11
  US-002: 4
  US-003: 4
---

# Tasks: Console.* Elimination - Phase 2

## User Story: US-001 - CLI Commands Logger

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Tasks**: 11 total, 8 completed

### T-001: Migrate init.ts to logger abstraction

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 3 days

**Description**: Migrate `cli/commands/init.ts` (246 violations) to logger abstraction.

**Implementation Steps**:
1. Add logger import
2. Update function signature
3. Migrate debug logs to logger
4. Document user-facing exceptions
5. Update tests with silentLogger

**Files Affected**:
- `src/cli/commands/init.ts`
- `tests/integration/cli/init.test.ts`

---

### T-002: Migrate next-command.ts to logger abstraction

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0
**Estimated Effort**: 1 day

**Description**: Migrate `cli/commands/next-command.ts` (42 violations).

**Dependency**: T-001 (establishes pattern)

---

## User Story: US-002 - Test Isolation

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Tasks**: 4 total, 1 completed

### T-012: Integration testing for all migrated CLI commands

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [ ] pending
**Priority**: P0

**Description**: Run comprehensive integration tests for all migrated CLI commands.

**Depends On**: T-001 through T-011 (all US-001 tasks)

---

## User Story: US-003 - Contributor Guidelines

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Tasks**: 4 total, 4 completed

### T-013: Update CONTRIBUTING.md with CLI-specific examples

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

### T-014: Update CLAUDE.md if needed

**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
```

---

## Benefits

### 1. Automatic Living Docs Sync

With explicit US linkage, `sync-living-docs.js` can:

```typescript
// Parse tasks.md with US links
const tasksByUS = parseTasksByUserStory(tasksPath);

for (const [usId, tasks] of Object.entries(tasksByUS)) {
  const usPath = `.specweave/docs/internal/specs/${project}/${featureId}/${usId}.md`;

  // Update US task list
  const taskList = tasks.map(t =>
    `- [${t.status === 'completed' ? 'x' : ' '}] [${t.id}](../../../../increments/${incrementId}/tasks.md#${t.id}): ${t.title}`
  ).join('\n');

  // Replace "No tasks defined" with actual task list
  updateUSTaskSection(usPath, taskList);

  // Update ACs based on satisfiedACs
  const satisfiedACs = tasks
    .filter(t => t.status === 'completed')
    .flatMap(t => t.satisfiesACs);

  updateACCheckboxes(usPath, satisfiedACs);
}
```

### 2. Validation & Coverage

```bash
# Verify all ACs covered by tasks
/specweave:validate 0046

Checking AC coverage...
✓ AC-US1-01: Covered by T-001, T-002, T-004...T-011
✓ AC-US1-02: Covered by T-001, T-002, T-004...T-011
✓ AC-US2-01: Covered by T-012
⚠ AC-US3-05: No tasks assigned!
```

### 3. Progress Tracking

```bash
/specweave:progress

Increment 0046: Console Elimination
├─ US-001: CLI Commands Logger [8/11 tasks completed] ████████░░░ 73%
├─ US-002: Test Isolation [1/4 tasks completed] ██░░ 25%
└─ US-003: Guidelines [4/4 tasks completed] ████ 100%
```

### 4. Closure Validation

`/specweave:done 0046` can verify:
- All US-001 ACs have completed tasks
- All US-002 ACs have completed tasks
- All tasks mapped to valid ACs
- No orphan tasks (no US link)

---

## Implementation Plan

### Phase 1: Parser & Generator Updates

**Files to modify**:
1. `src/generators/spec/task-parser.ts` - Parse US linkage fields
2. `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache` - New template
3. `plugins/specweave/skills/spec-generator/SKILL.md` - Update generation logic

**New task format**:
```typescript
interface Task {
  id: string;               // T-001
  userStory: string;        // US-001
  satisfiesACs: string[];   // [AC-US1-01, AC-US1-02]
  status: 'pending' | 'in_progress' | 'completed';
  title: string;
  description: string;
  dependencies?: string[];  // [T-001, T-002]
}
```

### Phase 2: Hook Updates

**Files to modify**:
1. `plugins/specweave/lib/hooks/sync-living-docs.js` - Use US links for AC updates
2. `plugins/specweave/hooks/post-task-completion.sh` - Update US task lists

**New sync logic**:
```javascript
// When task marked completed in tasks.md
// 1. Parse task's userStory and satisfiesACs fields
// 2. Update living docs US file task list
// 3. Check ACs for that US based on satisfiesACs
```

### Phase 3: Validation Updates

**Files to modify**:
1. `/specweave:validate` command - Add AC coverage checks
2. `/specweave:done` validation gate - Verify US-Task-AC linkage

**New checks**:
- ✓ All tasks link to valid US
- ✓ All ACs covered by at least one task
- ✓ No orphan tasks (missing userStory field)
- ✓ All linked ACs exist in spec.md

### Phase 4: Migration Script

Create migration tool for existing increments:

```bash
# Analyze existing tasks.md and spec.md
npx tsx scripts/migrate-task-linkage.ts 0046

# Output:
Analyzing increment 0046...
Found 3 user stories, 13 ACs, 25 tasks

Suggested linkage:
  T-001 → US-001 (AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04)
  T-002 → US-001 (AC-US1-01, AC-US1-02)
  T-012 → US-002 (AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04)

Apply? [y/N]
```

---

## Backward Compatibility

### Handling Old Increments

1. **Parser**: Support both formats (with/without US linkage)
2. **Validation**: Warn if no US links (don't fail)
3. **Migration**: `/specweave:migrate-task-linkage 0042` (optional)

### Graceful Degradation

```typescript
if (task.userStory) {
  // New format - use explicit linkage
  updateLivingDocsWithLinks(task);
} else {
  // Old format - fall back to heuristics
  inferUserStoryFromTaskDescription(task);
}
```

---

## Recommended Next Steps

### Option A: Create New Increment (Recommended)

```bash
/specweave:increment "US-Task Linkage Architecture"
```

**Scope**:
- Update task format specification
- Modify parsers/generators
- Update living docs sync hooks
- Add validation checks
- Create migration tooling
- Update existing increments (0043-0046)

**Estimated Effort**: 5-8 days
**Impact**: High - fixes core traceability gap

### Option B: Add to Current Increment 0046

**Pro**: Fix the problem immediately for 0046
**Con**: Scope creep, might delay 0046 closure

---

## Impact Analysis

### Files Affected (Estimate)

**Core System**:
- `src/generators/spec/task-parser.ts` (NEW or modify existing)
- `src/generators/spec/spec-generator.ts` (minor update)
- `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache` (major update)

**Hooks**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (significant update)
- `plugins/specweave/hooks/post-task-completion.sh` (minor update)

**Commands**:
- `plugins/specweave/commands/specweave-validate.md` (add AC coverage checks)
- `plugins/specweave/commands/specweave-done.md` (add linkage validation)

**Documentation**:
- `.specweave/docs/internal/architecture/hld-system.md` (update traceability section)
- `CLAUDE.md` (update task format documentation)
- `.github/CONTRIBUTING.md` (update task writing guidelines)

**Total**: ~15 files impacted

---

## Success Metrics

After implementation:

1. ✅ Living docs US files show actual task lists (not "No tasks defined")
2. ✅ `/specweave:progress` shows per-US task completion
3. ✅ `/specweave:validate` detects uncovered ACs
4. ✅ `/specweave:sync-docs` automatically updates US task status
5. ✅ AC checkboxes in living docs sync with task completion
6. ✅ 100% traceability: Feature → US → AC → Task

---

## Appendix: Current State Analysis (Increment 0046)

### Detected Linkage (Inferred from Content)

**US-001 Tasks** (11 total):
- T-001: init.ts migration
- T-002: next-command.ts migration
- T-004 through T-011: Remaining CLI command migrations

**US-002 Tasks** (1 primary):
- T-012: Integration testing (depends on all US-001 tasks)

**US-003 Tasks** (3 total):
- T-013: Update CONTRIBUTING.md
- T-014: Update CLAUDE.md
- T-015: Create completion report

**Orphan Tasks** (potential):
- T-003: Week 1 validation (could be US-002 or independent)
- T-016: Final validation (likely US-002)
- T-017 through T-019: Optional tasks (need classification)

This manual inference proves the need for explicit linkage!
