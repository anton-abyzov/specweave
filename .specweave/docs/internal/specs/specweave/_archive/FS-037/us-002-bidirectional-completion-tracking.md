---
id: US-002
feature: FS-037
title: Bidirectional Completion Tracking
status: planning
priority: P1
created: 2025-11-15
project: specweave
---

# US-002: Bidirectional Completion Tracking

**Feature**: [FS-037](../../_features/FS-037/FEATURE.md)

**As a** developer completing project-specific tasks
**I want** completion to be tracked bidirectionally (project ↔ increment)
**So that** completing all backend/frontend tasks auto-completes the increment task

---

## Acceptance Criteria

- [x] **AC-US2-01**: Increment task completion requires ALL mapped project tasks to be complete (P1, testable)
- [x] **AC-US2-02**: Completing last project task auto-completes increment task (P1, testable)
- [x] **AC-US2-03**: Increment task progress shows % based on project task completion (P1, testable)
- [x] **AC-US2-04**: CompletionCalculator reads BOTH increment AND project tasks (P1, testable)
- [x] **AC-US2-05**: User story completion considers project tasks (not just increment tasks) (P1, testable)
- [x] **AC-US2-06**: Attempting to complete increment task with incomplete project tasks shows error (P1, testable)
- [x] **AC-US2-07**: GitHub issue checkboxes reflect project task completion (P1, testable)
- [x] **AC-US2-08**: Verification gate checks both increment AND project task completion (P1, testable)

---

## Implementation

**Files to Modify**:
- `plugins/specweave-github/lib/completion-calculator.ts` (~400 lines → ~600 lines)

**New Methods**:
```typescript
// Extract project-specific tasks from specs/{project}/FS-XXX/TASKS.md
extractProjectTasks(projectId: string, featureId: string): Task[]

// Merge increment tasks with project tasks
mergeTasks(incrementTasks: Task[], projectTasks: Task[]): Task[]

// Check if increment task can be completed (all project tasks done)
checkBidirectionalCompletion(incrementTask: Task, projectTasks: Task[]): boolean

// Calculate completion percentage for increment task
calculateIncrementTaskProgress(incrementTask: Task, projectTasks: Task[]): number

// Find all project tasks mapped to increment task
findMappedProjectTasks(incrementTaskId: string, projectTasks: Task[]): Task[]

// Validate completion state consistency
validateCompletionConsistency(incrementTasks: Task[], projectTasks: Task[]): ValidationResult
```

**Bidirectional Rules**:

**Rule 1: Project Task → Increment Task** (Auto-completion)
```typescript
// When marking T-BE-001 as complete:
1. Find increment task it maps to (T-001)
2. Find ALL sibling project tasks (T-FE-001, T-MOB-001, etc.)
3. Check if ALL siblings are complete
4. If YES → Auto-complete increment T-001
5. If NO → Keep increment T-001 as in-progress (show % done)
```

**Rule 2: Increment Task → Project Tasks** (Verification)
```typescript
// When attempting to mark increment T-001 as complete:
1. Find all project tasks mapped to T-001
2. Verify ALL project tasks are actually complete
3. If YES → Safe to complete increment T-001
4. If NO → Reject completion, show blocking project tasks:
   "Cannot complete T-001: Blocked by T-BE-003 (40% done), T-FE-002 (not started)"
```

**Rule 3: Progress Calculation**
```typescript
// Increment task progress = % of project tasks complete
T-001 progress = (completedProjectTasks / totalProjectTasks) * 100
Example: T-001 = (2/5 project tasks done) = 40%
```

---

## Business Rationale

**User's Critical Requirement**: "completion of tasks MUST be tracked separately, though it MUST be bidirectional and you MUST always check if completing one leads to completion of another !!!"

Without bidirectional tracking:
- ❌ Backend team completes all tasks, but increment task still shows incomplete
- ❌ PM marks increment complete, but frontend tasks are 0% done
- ❌ GitHub shows 100% complete, but reality is 50% (misleading stakeholders)

With bidirectional tracking:
- ✅ Auto-completion when all teams finish
- ✅ Always accurate progress (no manual sync needed)
- ✅ Prevents premature closure (blocks if project tasks incomplete)

---

## Test Strategy

**Unit Tests** (`tests/unit/bidirectional-completion.test.ts`):
- Test auto-completion (all project tasks done → increment task done)
- Test rejection (incomplete project tasks → cannot complete increment task)
- Test progress calculation (2/5 project tasks = 40%)
- Test validation (detect orphaned tasks, inconsistent states)
- Test multi-project scenarios (backend done, frontend in-progress)

**Integration Tests** (`tests/integration/completion-calculator-project-tasks.test.ts`):
- Test reading project TASKS.md files
- Test merging increment + project tasks
- Test completion calculation with real task files
- Test error handling (missing TASKS.md files)

**E2E Tests** (`tests/e2e/bidirectional-completion.spec.ts`):
- Test complete workflow: mark project task done → increment task updates
- Test reverse: attempt to complete increment task with incomplete project tasks
- Test GitHub sync: project task completion updates issue checkboxes

**Coverage Target**: 95%+

---

## Edge Cases

**Edge Case 1: Partial Project Coverage**
```
Increment task T-001: "Implement authentication"
Project tasks:
  - T-BE-001, T-BE-002, T-BE-003 (backend has project tasks)
  - Frontend: No project TASKS.md (uses increment tasks directly)

Solution: T-001 complete = T-BE-001 && T-BE-002 && T-BE-003 (ignore missing frontend tasks)
```

**Edge Case 2: Cross-Project Dependencies**
```
T-BE-001: API endpoint (backend)
T-FE-001: API client (frontend) - DEPENDS ON T-BE-001

Solution: T-FE-001 metadata includes "blockedBy: T-BE-001"
Completion calculator checks dependencies before allowing completion
```

**Edge Case 3: Orphaned Tasks**
```
Project task T-BE-999 exists, but no increment task maps to it

Solution: Validation reports orphaned tasks
User can either:
  a) Create increment task T-099 to map to it
  b) Delete T-BE-999 as obsolete
```

---

## Related User Stories

- [US-001: Task Splitting Logic (spec-distributor.ts)](us-001-task-splitting-logic.md)
- [US-003: GitHub Sync Integration](us-003-github-sync-integration.md)
- [US-004: Testing & Migration Strategy](us-004-testing-migration-strategy.md)

---

**Status**: Planning
**Priority**: P1 (core bidirectional sync requirement)
**Estimated Effort**: 4-6 hours
