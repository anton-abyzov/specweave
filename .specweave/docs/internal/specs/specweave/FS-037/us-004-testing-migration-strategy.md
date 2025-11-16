---
id: US-004
feature: FS-037
title: Testing & Migration Strategy
status: planning
priority: P1
created: 2025-11-15
project: specweave
---

# US-004: Testing & Migration Strategy

**Feature**: [FS-037](../../_features/FS-037/FEATURE.md)

**As a** SpecWeave contributor
**I want** comprehensive test coverage and migration strategy for project-specific tasks
**So that** existing increments remain compatible and new features work reliably

---

## Acceptance Criteria

- [x] **AC-US4-01**: Unit tests cover task splitting logic (95%+ coverage) (P1, testable)
- [x] **AC-US4-02**: Unit tests cover bidirectional completion tracking (95%+ coverage) (P1, testable)
- [x] **AC-US4-03**: Integration tests cover full living docs sync with project tasks (P1, testable)
- [x] **AC-US4-04**: E2E tests cover complete workflow (increment → sync → GitHub) (P1, testable)
- [x] **AC-US4-05**: Backward compatibility tests verify existing increments work (P1, testable)
- [x] **AC-US4-06**: Migration script converts existing increments to project tasks (P2, testable)
- [x] **AC-US4-07**: Performance tests ensure sync completes within 5 seconds (P2, testable)
- [x] **AC-US4-08**: Error handling tests cover edge cases (missing files, malformed tasks) (P1, testable)

---

## Implementation

**Test Files to Create**:

**Unit Tests**:
```typescript
tests/unit/project-task-splitter.test.ts         // Task splitting logic
tests/unit/bidirectional-completion.test.ts      // Completion tracking
tests/unit/project-detection.test.ts             // Project detection (keywords, tech stack)
tests/unit/task-id-generator.test.ts             // Task ID format (T-BE-001, T-FE-001)
```

**Integration Tests**:
```typescript
tests/integration/spec-distributor-project-tasks.test.ts  // Full living docs sync
tests/integration/completion-calculator-project-tasks.test.ts  // Completion calculation
tests/integration/github-feature-sync-project-tasks.test.ts   // GitHub sync
```

**E2E Tests**:
```typescript
tests/e2e/project-tasks-e2e.spec.ts              // Complete workflow
tests/e2e/multi-project-tasks-sync.spec.ts       // Multi-project sync
tests/e2e/bidirectional-completion-e2e.spec.ts   // Completion tracking
tests/e2e/backward-compatibility.spec.ts         // Existing increments
```

**Test Coverage Targets**:
- Unit tests: 95%+
- Integration tests: 90%+
- E2E tests: 85%+
- Overall: 90%+

---

## Migration Strategy

### Backward Compatibility

**Problem**: Existing increments have user stories linking to `increments/####/tasks.md` (no project tasks).

**Solution**: Lazy migration on next sync.

```typescript
// When syncing existing user story without project tasks:
if (!existsProjectTasksFile(project, feature)) {
  // Option 1: Auto-generate project tasks from increment tasks (RECOMMENDED)
  const projectTasks = this.splitTasksByProject(incrementTasks, project);
  await this.writeProjectTasksFile(projectTasks);

  // Option 2: Keep linking to increment tasks (backward compatible)
  // User story still links to increment tasks.md (no change)

  // Configuration: Let user choose in config.json
  const mode = config.livingDocs.projectTasks?.migrationMode || 'auto-generate';
}
```

**Configuration** (`.specweave/config.json`):
```json
{
  "livingDocs": {
    "projectTasks": {
      "enabled": true,
      "migrationMode": "auto-generate",  // "auto-generate" | "manual" | "legacy-compat"
      "autoSplitTasks": true
    }
  }
}
```

### Migration Script

**File**: `scripts/migrate-to-project-tasks.ts`

**Purpose**: Batch migrate ALL existing increments to project tasks.

```typescript
// Script logic:
async function migrateAllIncrements() {
  const increments = await getAllIncrements();

  for (const increment of increments) {
    console.log(`Migrating ${increment.id}...`);

    // Step 1: Detect projects for this increment
    const projects = detectProjects(increment);

    // Step 2: Generate project tasks for each project
    for (const project of projects) {
      const projectTasks = splitTasksByProject(increment.tasks, project);
      await writeProjectTasksFile(projectTasks, project, increment.feature);
    }

    // Step 3: Update user story links
    await updateUserStoryLinks(increment, projects);

    console.log(`✅ ${increment.id} migrated`);
  }
}
```

**Usage**:
```bash
# Dry run (preview changes)
npm run migrate:project-tasks -- --dry-run

# Migrate all increments
npm run migrate:project-tasks

# Migrate specific increment
npm run migrate:project-tasks -- 0031

# Migrate range
npm run migrate:project-tasks -- 0020-0035
```

---

## Edge Cases & Error Handling

### Edge Case 1: Missing TASKS.md File
```typescript
// If increment doesn't have tasks.md:
if (!existsSync(incrementTasksPath)) {
  logger.warn(`Increment ${id} has no tasks.md, skipping project task generation`);
  return []; // Empty array, no crash
}
```

### Edge Case 2: Malformed Task Format
```typescript
// If task doesn't match expected format:
const taskMatch = line.match(/^##\s+T-(\d+):\s+(.+)/);
if (!taskMatch) {
  logger.warn(`Skipping malformed task: ${line}`);
  continue; // Skip bad lines, continue processing
}
```

### Edge Case 3: Ambiguous Project Detection
```typescript
// If task could apply to multiple projects:
if (detectProjects(task).length > 1) {
  // Apply to ALL detected projects
  for (const project of detectedProjects) {
    projectTasks.push(createProjectTask(task, project));
  }
  logger.info(`Task ${task.id} applied to multiple projects: ${detectedProjects}`);
}
```

### Edge Case 4: No Projects Configured
```typescript
// If config.multiProject.projects is empty:
if (projects.length === 0) {
  logger.warn('No projects configured, using fallback "default" project');
  projects = ['default'];
}
```

---

## Performance Tests

**Goal**: Ensure project task generation doesn't slow down living docs sync.

**Test**: `tests/performance/project-tasks-sync.perf.ts`

```typescript
test('Project task generation completes within 5 seconds for 100 tasks', async () => {
  const incrementWith100Tasks = createMockIncrement(100);

  const startTime = Date.now();
  await specDistributor.distribute(incrementWith100Tasks.id);
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(5000); // 5 seconds max
});
```

**Targets**:
- 10 tasks: < 500ms
- 50 tasks: < 2 seconds
- 100 tasks: < 5 seconds
- 500 tasks: < 30 seconds

---

## Test Data Fixtures

**Location**: `tests/fixtures/project-tasks/`

**Files**:
```
tests/fixtures/project-tasks/
├── increment-0037-example/
│   ├── spec.md                  # Multi-project spec (backend + frontend)
│   ├── tasks.md                 # 20 high-level tasks
│   └── expected-output/
│       ├── backend/TASKS.md     # Expected backend tasks
│       └── frontend/TASKS.md    # Expected frontend tasks
├── increment-legacy/
│   ├── spec.md                  # Legacy format (no projects field)
│   └── tasks.md                 # Generic tasks
└── increment-single-project/
    ├── spec.md                  # Single project (backend only)
    └── tasks.md                 # Backend-only tasks
```

---

## Business Rationale

**Why Comprehensive Testing Matters**:
- Project-specific tasks are CORE workflow (affects ALL multi-project features)
- Bidirectional tracking is complex (easy to introduce bugs)
- Backward compatibility critical (200+ existing increments must work)
- GitHub sync affects external stakeholders (bugs visible to clients)

**Without Tests**:
- ❌ Risk of breaking existing increments
- ❌ Bugs in bidirectional tracking (orphaned tasks)
- ❌ Performance regressions (slow living docs sync)
- ❌ Edge cases unhandled (crashes in production)

**With Comprehensive Tests**:
- ✅ Confidence in refactoring
- ✅ Fast iteration (tests catch bugs early)
- ✅ Documentation (tests show usage examples)
- ✅ Regression prevention (tests lock in behavior)

---

## Test Strategy Summary

| Test Type | Files | Coverage Target | Purpose |
|-----------|-------|-----------------|---------|
| Unit | 4 files | 95%+ | Task splitting, completion tracking |
| Integration | 3 files | 90%+ | Full sync workflow, GitHub integration |
| E2E | 4 files | 85%+ | End-to-end scenarios, backward compat |
| Performance | 1 file | N/A | Ensure sync completes within 5s |

**Total Test Files**: 12
**Estimated Test Writing Time**: 4-6 hours
**Estimated Migration Script Time**: 1-2 hours

---

## Related User Stories

- [US-001: Task Splitting Logic (spec-distributor.ts)](us-001-task-splitting-logic.md)
- [US-002: Bidirectional Completion Tracking](us-002-bidirectional-completion-tracking.md)
- [US-003: GitHub Sync Integration](us-003-github-sync-integration.md)

---

**Status**: Planning
**Priority**: P1 (quality assurance requirement)
**Estimated Effort**: 4-6 hours (tests) + 1-2 hours (migration script) = 5-8 hours total
