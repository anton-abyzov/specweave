---
id: US-001
feature: FS-037
title: Task Splitting Logic (spec-distributor.ts)
status: planning
priority: P1
created: 2025-11-15
project: specweave
---

# US-001: Task Splitting Logic (spec-distributor.ts)

**Feature**: [FS-037](../../_features/FS-037/FEATURE.md)

**As a** developer working on multi-project features
**I want** increment tasks to be automatically split into project-specific tasks
**So that** backend and frontend teams have their own TASKS.md files with implementation details

---

## Acceptance Criteria

- [x] **AC-US1-01**: SpecDistributor generates `specs/{project}/FS-XXX/TASKS.md` during living docs sync (P1, testable)
- [x] **AC-US1-02**: Project tasks use format `T-{PROJECT}-{number}` (e.g., T-BE-001, T-FE-001) (P1, testable)
- [x] **AC-US1-03**: Each project task links back to its increment task (bidirectional) (P1, testable)
- [x] **AC-US1-04**: Project tasks include project-specific details (tech stack, implementation approach) (P1, testable)
- [x] **AC-US1-05**: Tasks correctly detect which projects they apply to (backend vs frontend vs both) (P1, testable)
- [x] **AC-US1-06**: User story files link to project TASKS.md (not increment tasks.md) (P1, testable)
- [x] **AC-US1-07**: Project TASKS.md includes progress summary (completed, in-progress, not started) (P2, testable)
- [x] **AC-US1-08**: Backward compatibility: Existing increments without project tasks still work (P1, testable)

---

## Implementation

**Files to Modify**:
- `src/core/living-docs/spec-distributor.ts` (~1200 lines → ~1500 lines)

**New Methods**:
```typescript
// Generate project-specific tasks from increment tasks
generateProjectTasks(project: ProjectId, increment: string): ProjectTasks

// Split increment tasks by project (detect which tasks apply to which projects)
splitTasksByProject(incrementTasks: Task[], project: ProjectId): Task[]

// Create project-specific task from increment task
createProjectTask(incrementTask: Task, project: ProjectId): ProjectTask

// Write TASKS.md file for project
writeProjectTasksFile(projectTasks: ProjectTasks, projectPath: string): void

// Detect if task applies to specific project
taskAppliesToProject(task: Task, project: ProjectId): boolean

// Adapt task title/description for project context
adaptTitleForProject(title: string, project: ProjectId): string
adaptDescriptionForProject(description: string, project: ProjectId): string
```

**Algorithm**:
1. Read increment `tasks.md` (high-level orchestration tasks)
2. For each configured project (backend, frontend, mobile):
   a. Filter tasks applicable to this project (keyword matching)
   b. Create project-specific tasks with `T-{PROJECT}-{number}` IDs
   c. Add project-specific details (tech stack, implementation notes)
   d. Link back to increment task (bidirectional)
3. Write `specs/{project}/FS-XXX/TASKS.md` file
4. Update user story files to link to project TASKS.md

**Detection Logic** (Which projects does a task apply to?):
```typescript
// Keywords: backend, frontend, mobile, infra
// Tech stack: Node.js → backend, React → frontend
// AC context: API endpoint → backend, UI component → frontend
// Fallback: If unclear, apply to ALL projects
```

---

## Business Rationale

Backend and frontend teams need separate task lists to work independently without conflicts. Generic increment tasks don't match implementation reality (backend uses Node.js/PostgreSQL, frontend uses React/Redux).

---

## Test Strategy

**Unit Tests** (`tests/unit/project-task-splitter.test.ts`):
- Test task splitting by project (T-001 → T-BE-001, T-FE-001)
- Test project detection (keywords, tech stack)
- Test task ID generation (T-BE-001 format)
- Test bidirectional linking (project task → increment task)
- Test title/description adaptation

**Integration Tests** (`tests/integration/spec-distributor-project-tasks.test.ts`):
- Test full living docs sync with project tasks
- Test TASKS.md file creation
- Test user story linking to project tasks
- Test multi-project features (backend + frontend)

**E2E Tests** (`tests/e2e/project-tasks-e2e.spec.ts`):
- Test complete workflow: increment → sync → project TASKS.md created
- Test backward compatibility (existing increments)

**Coverage Target**: 95%+

---

## Related User Stories

- [US-002: Bidirectional Completion Tracking](us-002-bidirectional-completion-tracking.md)
- [US-003: GitHub Sync Integration](us-003-github-sync-integration.md)
- [US-004: Testing & Migration Strategy](us-004-testing-migration-strategy.md)

---

**Status**: Planning
**Priority**: P1 (blocking multi-project workflow)
**Estimated Effort**: 4-6 hours
