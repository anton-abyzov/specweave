---
increment: 0037-project-specific-tasks
title: "Project-Specific Tasks Architecture"
priority: P1
status: planning
created: 2025-11-15
feature: FS-037
projects: ['specweave']
type: feature
test_mode: TDD
coverage_target: 95
---

# Feature: Project-Specific Tasks Architecture

## Quick Overview

Implement three-level task hierarchy (Increment → Project → User Story) with bidirectional completion tracking. Backend and frontend teams get separate TASKS.md files with project-specific implementation tasks, while high-level increment tasks orchestrate completion. Solves critical gap where multi-project features have only generic increment tasks.

**Living Docs Spec**: [FS-037: Project-Specific Tasks Architecture](../../docs/internal/specs/_features/FS-037/FEATURE.md)

---

## Problem Statement

**User Feedback** (from increment 0034):
> "instead of just links to Tasks, in fact we MUST have our own project tasks to complete, right? let's consider backend and frontend project. Increment tasks.md has only kind of high level tasks, but they MUST be splitted into tasks to be implemented for each specific project!!!"

**Critical Insight**:
> "increment tasks with its status is not 1-1 mapping to internal docs spec project related US !!! and completino of tasks MSUT be tracked separately, though it MUST be bidirectional and you MSUT always check if completing one leads to completion of another !!!"

**Current Architecture** (WRONG):
```
Increment: 0031-external-tool-status-sync/tasks.md
└── Generic tasks: T-001: Implement authentication
    └── Both backend AND frontend link to SAME generic tasks
        ❌ Problem: No project-specific breakdown!
```

**Required Architecture** (CORRECT):
```
Increment: 0031-external-tool-status-sync/tasks.md
└── High-level tasks: T-001: Implement authentication (backend + frontend)
    ├── Backend: specs/backend/FS-031/TASKS.md
    │   ├── T-BE-001: JWT auth service (Node.js)
    │   ├── T-BE-002: Database schema (PostgreSQL)
    │   └── T-BE-003: API endpoint /auth/login
    └── Frontend: specs/frontend/FS-031/TASKS.md
        ├── T-FE-001: Login form component (React)
        ├── T-FE-002: Auth state management (Redux)
        └── T-FE-003: Protected route HOC
```

---

## Solution Approach

### Three-Level Task Hierarchy

**Level 1: Increment Tasks** (High-level orchestration)
- Location: `.specweave/increments/####/tasks.md`
- Scope: Cross-project, strategic
- Example: `T-001: Implement authentication system`
- Completion: When ALL project-specific tasks complete

**Level 2: Project Tasks** (Implementation detail)
- Location: `.specweave/docs/internal/specs/{project}/FS-XXX/TASKS.md`
- Scope: Project-specific (backend, frontend, mobile)
- Example: `T-BE-001: Create JWT auth service`
- Completion: Independently tracked per project

**Level 3: User Story Tasks** (Optional, embedded)
- Location: User story file's **Implementation** section
- Scope: Tasks specific to ONE user story
- Example: Tasks for US-001 only
- Completion: Subset of project tasks

### Bidirectional Tracking Rules

**Rule 1: Project Task → Increment Task** (Auto-completion)
```
When marking T-BE-001 as complete:
1. Find increment task it maps to (T-001)
2. Find ALL sibling project tasks (T-FE-001, T-MOB-001)
3. Check if ALL siblings are complete
4. If YES → Auto-complete increment T-001
5. If NO → Keep increment T-001 as in-progress (show % done)
```

**Rule 2: Increment Task → Project Tasks** (Verification)
```
When attempting to mark increment T-001 as complete:
1. Find all project tasks mapped to T-001
2. Verify ALL project tasks are actually complete
3. If YES → Safe to complete increment T-001
4. If NO → Reject completion, show blocking project tasks
```

**Rule 3: Progress Calculation**
```
Increment task progress = (completedProjectTasks / totalProjectTasks) * 100
Example: T-001 = (2/5 project tasks done) = 40%
```

---

## User Stories

### US-001: Task Splitting Logic (spec-distributor.ts)

**Complete Details**: [US-001](../../docs/internal/specs/specweave/FS-037/us-001-task-splitting-logic.md)

**As a** developer working on multi-project features
**I want** increment tasks to be automatically split into project-specific tasks
**So that** backend and frontend teams have their own TASKS.md files with implementation details

**Acceptance Criteria**:
- [x] **AC-US1-01**: SpecDistributor generates `specs/{project}/FS-XXX/TASKS.md` during living docs sync (P1, testable)
- [x] **AC-US1-02**: Project tasks use format `T-{PROJECT}-{number}` (e.g., T-BE-001, T-FE-001) (P1, testable)
- [x] **AC-US1-03**: Each project task links back to its increment task (bidirectional) (P1, testable)
- [x] **AC-US1-04**: Project tasks include project-specific details (tech stack, implementation approach) (P1, testable)
- [x] **AC-US1-05**: Tasks correctly detect which projects they apply to (backend vs frontend vs both) (P1, testable)
- [x] **AC-US1-06**: User story files link to project TASKS.md (not increment tasks.md) (P1, testable)
- [x] **AC-US1-07**: Project TASKS.md includes progress summary (completed, in-progress, not started) (P2, testable)
- [x] **AC-US1-08**: Backward compatibility: Existing increments without project tasks still work (P1, testable)

---

### US-002: Bidirectional Completion Tracking

**Complete Details**: [US-002](../../docs/internal/specs/specweave/FS-037/us-002-bidirectional-completion-tracking.md)

**As a** developer completing project-specific tasks
**I want** completion to be tracked bidirectionally (project ↔ increment)
**So that** completing all backend/frontend tasks auto-completes the increment task

**Acceptance Criteria**:
- [x] **AC-US2-01**: Increment task completion requires ALL mapped project tasks to be complete (P1, testable)
- [x] **AC-US2-02**: Completing last project task auto-completes increment task (P1, testable)
- [x] **AC-US2-03**: Increment task progress shows % based on project task completion (P1, testable)
- [x] **AC-US2-04**: CompletionCalculator reads BOTH increment AND project tasks (P1, testable)
- [x] **AC-US2-05**: User story completion considers project tasks (not just increment tasks) (P1, testable)
- [x] **AC-US2-06**: Attempting to complete increment task with incomplete project tasks shows error (P1, testable)
- [x] **AC-US2-07**: GitHub issue checkboxes reflect project task completion (P1, testable)
- [x] **AC-US2-08**: Verification gate checks both increment AND project task completion (P1, testable)

---

### US-003: GitHub Sync Integration

**Complete Details**: [US-003](../../docs/internal/specs/specweave/FS-037/us-003-github-sync-integration.md)

**As a** stakeholder viewing GitHub issues
**I want** to see project-specific task progress (backend vs frontend)
**So that** I can understand which team is blocking or ahead without repository access

**Acceptance Criteria**:
- [x] **AC-US3-01**: GitHub issue body shows project tasks (not just increment tasks) (P1, testable)
- [x] **AC-US3-02**: Project tasks grouped by project (Backend Tasks, Frontend Tasks sections) (P1, testable)
- [x] **AC-US3-03**: Project task completion shows as checkboxes in GitHub issue (P1, testable)
- [x] **AC-US3-04**: Progress comments show project-specific progress (Backend: 3/5, Frontend: 2/8) (P1, testable)
- [x] **AC-US3-05**: Issue state reflects project task completion (not just increment tasks) (P1, testable)
- [x] **AC-US3-06**: Project tasks link to `specs/{project}/FS-XXX/TASKS.md` in repository (P2, testable)
- [x] **AC-US3-07**: Increment tasks still visible (with mapping to project tasks) (P2, testable)
- [x] **AC-US3-08**: Verification gate checks project task completion before closing issue (P1, testable)

---

### US-004: Testing & Migration Strategy

**Complete Details**: [US-004](../../docs/internal/specs/specweave/FS-037/us-004-testing-migration-strategy.md)

**As a** SpecWeave contributor
**I want** comprehensive test coverage and migration strategy for project-specific tasks
**So that** existing increments remain compatible and new features work reliably

**Acceptance Criteria**:
- [x] **AC-US4-01**: Unit tests cover task splitting logic (95%+ coverage) (P1, testable)
- [x] **AC-US4-02**: Unit tests cover bidirectional completion tracking (95%+ coverage) (P1, testable)
- [x] **AC-US4-03**: Integration tests cover full living docs sync with project tasks (P1, testable)
- [x] **AC-US4-04**: E2E tests cover complete workflow (increment → sync → GitHub) (P1, testable)
- [x] **AC-US4-05**: Backward compatibility tests verify existing increments work (P1, testable)
- [x] **AC-US4-06**: Migration script converts existing increments to project tasks (P2, testable)
- [x] **AC-US4-07**: Performance tests ensure sync completes within 5 seconds (P2, testable)
- [x] **AC-US4-08**: Error handling tests cover edge cases (missing files, malformed tasks) (P1, testable)

---

## Success Criteria

### Functional Metrics
- **Task Splitting Accuracy**: 95%+ tasks correctly classified by project (backend vs frontend)
- **Bidirectional Sync Correctness**: 100% completion state consistency (no orphaned tasks)
- **Backward Compatibility**: 100% existing increments work without modification

### Quality Metrics
- **Test Coverage**: 95%+ overall (unit + integration + E2E)
- **Performance**: Living docs sync completes within 5 seconds for 100 tasks
- **Error Handling**: Zero crashes on malformed input (graceful degradation)

### User Experience Metrics
- **GitHub Issue Quality**: Stakeholders can see project-specific progress without repository access
- **Developer Clarity**: Backend/frontend teams report clear task ownership (user survey)
- **Migration Success**: 100% of existing increments migrated without data loss

---

## Architecture Reference

**Complete Design Document**: [PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md](../0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)

### Key Components

**1. SpecDistributor Enhancement** (`src/core/living-docs/spec-distributor.ts`):
- Generates project TASKS.md files during living docs sync
- Splits increment tasks by project (keyword/tech stack detection)
- Creates bidirectional links (project task → increment task)

**2. CompletionCalculator Enhancement** (`plugins/specweave-github/lib/completion-calculator.ts`):
- Reads BOTH increment AND project tasks
- Validates completion state consistency
- Calculates progress % based on project task completion

**3. GitHub Sync Enhancement** (`plugins/specweave-github/lib/`):
- Updates issue body with project-specific task lists
- Shows progress comments with project breakdown
- Verification gate checks project task completion

---

## Implementation Phases

### Phase 1: Task Splitting Logic (4-6 hours)
**Files**: `src/core/living-docs/spec-distributor.ts`
**Output**: Project TASKS.md files created during living docs sync

### Phase 2: Bidirectional Tracking (4-6 hours)
**Files**: `plugins/specweave-github/lib/completion-calculator.ts`
**Output**: Completion verification includes both increment AND project tasks

### Phase 3: GitHub Sync Integration (3-4 hours)
**Files**: `plugins/specweave-github/lib/user-story-issue-builder.ts`, `github-feature-sync.ts`, `progress-comment-builder.ts`
**Output**: GitHub issues show project-specific task progress

### Phase 4: Testing & Migration (5-8 hours)
**Files**: 12 test files (unit, integration, E2E) + migration script
**Output**: 95%+ test coverage + migration script for existing increments

**Total Estimated Effort**: 15-20 hours

---

## Benefits

### Clear Ownership
- Backend team: Works on `T-BE-*` tasks
- Frontend team: Works on `T-FE-*` tasks
- No confusion about who does what

### Granular Tracking
- Track backend progress independently from frontend
- GitHub issues show project-specific completion %
- Stakeholders see which project is blocking

### Realistic Task Breakdown
- Increment tasks = High-level goals
- Project tasks = Actual implementation steps
- No more "generic tasks" that don't match reality

### Bidirectional Sync
- Completing all project tasks → Auto-completes increment task
- Increment task completion verified against project tasks
- No manual coordination needed

---

## Migration Strategy

### Backward Compatibility

**Problem**: Existing increments have user stories linking to `increments/####/tasks.md` (no project tasks).

**Solution**: Lazy migration on next sync (auto-generate project tasks from increment tasks).

**Configuration** (`.specweave/config.json`):
```json
{
  "livingDocs": {
    "projectTasks": {
      "enabled": true,
      "migrationMode": "auto-generate",
      "autoSplitTasks": true
    }
  }
}
```

### Migration Script

**File**: `scripts/migrate-to-project-tasks.ts`

**Usage**:
```bash
# Dry run (preview changes)
npm run migrate:project-tasks -- --dry-run

# Migrate all increments
npm run migrate:project-tasks

# Migrate specific increment
npm run migrate:project-tasks -- 0031
```

---

## Related Documentation

- **Architecture Design**: [PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md](../0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)
- **Living Spec**: [FS-037 Feature Overview](../../docs/internal/specs/_features/FS-037/FEATURE.md)
- **User Stories**:
  - [US-001: Task Splitting Logic](../../docs/internal/specs/specweave/FS-037/us-001-task-splitting-logic.md)
  - [US-002: Bidirectional Completion Tracking](../../docs/internal/specs/specweave/FS-037/us-002-bidirectional-completion-tracking.md)
  - [US-003: GitHub Sync Integration](../../docs/internal/specs/specweave/FS-037/us-003-github-sync-integration.md)
  - [US-004: Testing & Migration Strategy](../../docs/internal/specs/specweave/FS-037/us-004-testing-migration-strategy.md)

---

**Status**: Planning
**Priority**: P1 (blocking multi-project workflow)
**Estimated Effort**: 15-20 hours total
**Test Coverage Target**: 95%+
