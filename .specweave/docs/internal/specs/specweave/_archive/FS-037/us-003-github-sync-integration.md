---
id: US-003
feature: FS-037
title: GitHub Sync Integration
status: planning
priority: P1
created: 2025-11-15
project: specweave
---

# US-003: GitHub Sync Integration

**Feature**: [FS-037](../../_features/FS-037/FEATURE.md)

**As a** stakeholder viewing GitHub issues
**I want** to see project-specific task progress (backend vs frontend)
**So that** I can understand which team is blocking or ahead without repository access

---

## Acceptance Criteria

- [x] **AC-US3-01**: GitHub issue body shows project tasks (not just increment tasks) (P1, testable)
- [x] **AC-US3-02**: Project tasks grouped by project (Backend Tasks, Frontend Tasks sections) (P1, testable)
- [x] **AC-US3-03**: Project task completion shows as checkboxes in GitHub issue (P1, testable)
- [x] **AC-US3-04**: Progress comments show project-specific progress (Backend: 3/5, Frontend: 2/8) (P1, testable)
- [x] **AC-US3-05**: Issue state reflects project task completion (not just increment tasks) (P1, testable)
- [x] **AC-US3-06**: Project tasks link to `specs/{project}/FS-XXX/TASKS.md` in repository (P2, testable)
- [x] **AC-US3-07**: Increment tasks still visible (with mapping to project tasks) (P2, testable)
- [x] **AC-US3-08**: Verification gate checks project task completion before closing issue (P1, testable)

---

## Implementation

**Files to Modify**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts` (~600 lines → ~800 lines)
- `plugins/specweave-github/lib/github-feature-sync.ts` (~1000 lines → ~1100 lines)
- `plugins/specweave-github/lib/progress-comment-builder.ts` (~300 lines → ~400 lines)

**New Methods**:

**UserStoryIssueBuilder**:
```typescript
// Build implementation section with project tasks
buildImplementationSection(userStory: UserStory, projects: ProjectId[]): string

// Build project-specific task list
buildProjectTaskList(project: ProjectId, tasks: Task[]): string

// Build project task checkbox
buildProjectTaskCheckbox(task: Task, project: ProjectId): string

// Group tasks by project
groupTasksByProject(tasks: Task[]): Map<ProjectId, Task[]>
```

**GitHubFeatureSync**:
```typescript
// Sync project tasks to GitHub issue
syncProjectTasksToGitHub(userStory: UserStory, issueNumber: number): void

// Update issue checkboxes with project task completion
updateProjectTaskCheckboxes(issueNumber: number, projectTasks: Task[]): void

// Verify project task completion before closing
verifyProjectTasksComplete(userStory: UserStory): ValidationResult
```

**ProgressCommentBuilder**:
```typescript
// Build progress comment with project breakdown
buildProgressWithProjectBreakdown(userStory: UserStory, projects: ProjectId[]): string

// Build project-specific progress section
buildProjectProgress(project: ProjectId, tasks: Task[]): string
```

**GitHub Issue Format** (Enhanced):

**Before** (Current):
```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](...)

**Tasks**:
- [T-001: Create Enhanced Content Builder](...)
- [T-003: Enhance GitHub Content Sync](...)
```

**After** (Enhanced with Project Tasks):
```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](...)

**Backend Tasks** (3/5 complete - 60%):
- [x] [T-BE-001: JWT auth service](../backend/FS-031/TASKS.md#t-be-001)
- [x] [T-BE-002: Users table schema](../backend/FS-031/TASKS.md#t-be-002)
- [x] [T-BE-003: /auth/login endpoint](../backend/FS-031/TASKS.md#t-be-003)
- [ ] [T-BE-004: Rate limiting](../backend/FS-031/TASKS.md#t-be-004)
- [ ] [T-BE-005: API documentation](../backend/FS-031/TASKS.md#t-be-005)

**Frontend Tasks** (2/8 complete - 25%):
- [x] [T-FE-001: Login form component](../frontend/FS-031/TASKS.md#t-fe-001)
- [x] [T-FE-002: Auth state management](../frontend/FS-031/TASKS.md#t-fe-002)
- [ ] [T-FE-003: Protected route HOC](../frontend/FS-031/TASKS.md#t-fe-003)
- [ ] [T-FE-004: Error handling](../frontend/FS-031/TASKS.md#t-fe-004)
- [ ] [T-FE-005: Loading states](../frontend/FS-031/TASKS.md#t-fe-005)
- [ ] [T-FE-006: Token refresh](../frontend/FS-031/TASKS.md#t-fe-006)
- [ ] [T-FE-007: Logout functionality](../frontend/FS-031/TASKS.md#t-fe-007)
- [ ] [T-FE-008: Session timeout](../frontend/FS-031/TASKS.md#t-fe-008)

**Increment Tasks** (1/2 complete - 50%):
- [x] [T-001: Implement authentication](...) - Maps to: T-BE-001, T-BE-002, T-BE-003, T-FE-001, T-FE-002
- [ ] [T-002: Add rate limiting](...) - Maps to: T-BE-004, T-FE-004

**Overall Progress**: 5/15 tasks (33%)
```

**Progress Comment Format**:
```markdown
## 🔄 Progress Update - 2025-11-15 14:30 UTC

**Overall**: 5/15 tasks (33%) - 🟡 In Progress

### Project Breakdown

**Backend** (3/5 = 60%):
- ✅ JWT auth service
- ✅ Users table schema
- ✅ /auth/login endpoint
- 🔄 Rate limiting (40% done)
- ⏳ API documentation (not started)

**Frontend** (2/8 = 25%):
- ✅ Login form component
- ✅ Auth state management
- 🔄 Protected route HOC (in progress)
- ⏳ Error handling (not started)
- ⏳ 4 more tasks...

### Blocked By
- Frontend waiting on T-BE-004 (backend rate limiting) for T-FE-004

### Next Steps
- Complete T-BE-004 (backend rate limiting)
- Unblocks T-FE-004 (frontend error handling)
```

---

## Business Rationale

**Stakeholder Pain Point**: Current GitHub issues show generic tasks like "Implement authentication" without clarity on which team (backend vs frontend) is blocking. PM/clients can't see team-specific progress.

**Solution Benefits**:
- PM sees: "Backend is 60% done, frontend is 25% - frontend is blocking"
- Client sees: "My feature is 33% complete, ETA is accurate based on slowest team"
- Tech lead sees: "Frontend needs help, reallocate resources"

---

## Test Strategy

**Unit Tests** (`tests/unit/github-project-tasks-sync.test.ts`):
- Test issue body generation with project tasks
- Test task grouping by project
- Test progress calculation by project
- Test checkbox formatting
- Test link generation to project TASKS.md

**Integration Tests** (`tests/integration/github-feature-sync-project-tasks.test.ts`):
- Test syncing project tasks to GitHub
- Test updating issue checkboxes
- Test progress comments with project breakdown
- Test verification gate (checks project tasks)

**E2E Tests** (`tests/e2e/github-project-tasks-e2e.spec.ts`):
- Test complete workflow: increment → sync → GitHub issue with project tasks
- Test issue update when project task completes
- Test progress comment creation with project breakdown
- Test issue closure verification (checks all project tasks)

**Coverage Target**: 95%+

---

## Related User Stories

- [US-001: Task Splitting Logic (spec-distributor.ts)](us-001-task-splitting-logic.md)
- [US-002: Bidirectional Completion Tracking](us-002-bidirectional-completion-tracking.md)
- [US-004: Testing & Migration Strategy](us-004-testing-migration-strategy.md)

---

**Status**: Planning
**Priority**: P1 (stakeholder visibility requirement)
**Estimated Effort**: 3-4 hours
