# Project-Specific Tasks Architecture

**Date**: 2025-11-15
**Increment**: 0034-github-ac-checkboxes-fix
**Status**: Architecture Design (Not Yet Implemented)

---

## Problem Statement

**User Feedback**: "instead of just links to Tasks, in fact we MUST have our own project tasks to complete, right? let's consider backend and frontend project. Increment tasks.md has only kind of high level tasks, but they MUST be splitted into tasks to be implemented for each specific project!!!"

**Current Architecture** (WRONG):
```
Increment: 0031-external-tool-status-sync/tasks.md
└── High-level tasks (generic, not project-specific)
    Example: "T-001: Implement authentication"

Living Docs: specs/backend/FS-031/us-001-*.md
└── **Implementation** section:
    - JUST LINKS to increment tasks.md
    ❌ Problem: Backend and Frontend both link to SAME generic tasks!
```

**Required Architecture** (CORRECT):
```
Increment: 0031-external-tool-status-sync/tasks.md
└── High-level tasks (orchestration level)
    Example: "T-001: Implement authentication (backend + frontend)"

Living Docs: specs/backend/FS-031/us-001-*.md
└── **Implementation** section:
    - Project-specific tasks (backend-specific)
    Example:
      - T-BE-001: Create JWT auth service (Node.js/Express)
      - T-BE-002: Database schema for users table
      - T-BE-003: API endpoint /auth/login

Living Docs: specs/frontend/FS-031/us-001-*.md
└── **Implementation** section:
    - Project-specific tasks (frontend-specific)
    Example:
      - T-FE-001: Login form component (React)
      - T-FE-002: Auth state management (Redux)
      - T-FE-003: Protected route HOC
```

**Key Insight**: "increment tasks with its status is not 1-1 mapping to internal docs spec project related US !!!"

---

## Architecture Components

### 1. Task Hierarchy (Three Levels)

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

### 2. Bidirectional Tracking Rules

**Rule 1**: Completing project task updates increment task

```typescript
// When marking T-BE-001 as complete:
1. Check if T-BE-001 maps to increment task T-001
2. Check if ALL sibling tasks (T-FE-001, T-MOB-001) are also complete
3. If yes → Mark increment T-001 as complete
4. If no → Keep increment T-001 as in-progress
```

**Rule 2**: Completing increment task updates ALL project tasks

```typescript
// When marking increment T-001 as complete:
1. Find all project tasks mapped to T-001 (T-BE-001, T-FE-001, T-MOB-001)
2. Verify ALL project tasks are actually complete
3. If yes → Safe to mark increment T-001 complete
4. If no → Reject completion, show blocking project tasks
```

**User's Critical Requirement**: "completion of tasks MUST be tracked separately, though it MUST be bidirectional and you MUST always check if completing one leads to completion of another !!!"

---

## File Structure

### Example: Multi-Project Feature (FS-031)

```
.specweave/
├── increments/0031-external-tool-status-sync/
│   ├── tasks.md                    # ← Level 1: Increment tasks (orchestration)
│   │   T-001: Implement authentication (backend + frontend)
│   │   T-002: Create status mapper (backend only)
│   │   T-003: Build UI dashboard (frontend only)
│   └── spec.md                     # Original increment spec
│
└── docs/internal/specs/
    ├── backend/FS-031/
    │   ├── TASKS.md                # ← Level 2: Backend project tasks
    │   │   T-BE-001: JWT auth service (Node.js)
    │   │   T-BE-002: Users table schema (PostgreSQL)
    │   │   T-BE-003: /auth/login endpoint
    │   │   T-BE-004: Status mapper class
    │   │   Maps to: T-001, T-002 (increment tasks)
    │   │
    │   ├── us-001-*.md             # Backend user story
    │   │   **Implementation**:
    │   │   - [T-BE-001](TASKS.md#t-be-001) ← Links to backend tasks!
    │   │   - [T-BE-002](TASKS.md#t-be-002)
    │   │   - [T-BE-003](TASKS.md#t-be-003)
    │   │
    │   └── us-002-*.md
    │
    └── frontend/FS-031/
        ├── TASKS.md                # ← Level 2: Frontend project tasks
        │   T-FE-001: Login form (React)
        │   T-FE-002: Auth state (Redux)
        │   T-FE-003: Protected routes
        │   T-FE-004: Dashboard UI
        │   Maps to: T-001, T-003 (increment tasks)
        │
        ├── us-001-*.md             # Frontend user story
        │   **Implementation**:
        │   - [T-FE-001](TASKS.md#t-fe-001) ← Links to frontend tasks!
        │   - [T-FE-002](TASKS.md#t-fe-002)
        │   - [T-FE-003](TASKS.md#t-fe-003)
        │
        └── us-003-*.md
```

---

## Task Format (Project-Specific)

### Backend TASKS.md Example

```markdown
# Backend Tasks - FS-031: External Tool Status Sync

**Project**: Backend
**Feature**: FS-031
**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

---

## T-BE-001: JWT Authentication Service

**Increment Task**: [T-001: Implement authentication](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001)

**User Story**: [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)

**AC**: AC-US1-01, AC-US1-02

**Status**: [x] (100% - Completed)

**Description**: Create JWT-based authentication service for backend API

**Test Plan** (BDD):
- **Given** valid credentials → **When** /auth/login called → **Then** returns JWT token
- **Given** expired token → **When** protected route called → **Then** returns 401

**Test Cases**:
- Unit (`auth-service.test.ts`): validLogin, expiredToken → 95% coverage
- Integration (`auth-api.test.ts`): loginEndpoint, protectedRoute → 90% coverage

**Implementation**:
- `src/services/AuthService.ts` - JWT service
- `src/api/routes/auth.ts` - Auth endpoints
- bcrypt for password hashing
- Redis for token blacklist

**Completion Criteria**:
- [x] Service implemented
- [x] Tests passing
- [x] Code reviewed
- [x] Merged to develop

---

## T-BE-002: Database Schema - Users Table

**Increment Task**: [T-001: Implement authentication](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001)

**User Story**: [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)

**AC**: AC-US1-01

**Status**: [x] (100% - Completed)

**Description**: Create PostgreSQL schema for users table

**Migration**: `migrations/0001-create-users-table.sql`

**Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Completion Criteria**:
- [x] Migration created
- [x] Migration tested
- [x] Deployed to dev environment

---

## T-BE-003: API Endpoint - /auth/login

**Increment Task**: [T-001: Implement authentication](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001)

**User Story**: [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)

**AC**: AC-US1-02, AC-US1-03

**Status**: [ ] (40% - In Progress)

**Description**: Implement /auth/login endpoint

**API Contract**:
```json
POST /auth/login
Body: { "email": "user@example.com", "password": "secret" }
Response: { "token": "jwt-token-here", "expiresIn": 3600 }
```

**Completion Criteria**:
- [x] Endpoint created
- [x] Request validation
- [ ] Rate limiting
- [ ] Tests passing
- [ ] Documentation updated

---

## Progress Summary

- Total Tasks: 15
- Completed: 8 (53%)
- In Progress: 4 (27%)
- Not Started: 3 (20%)

**Blocked By**:
- T-BE-003: Waiting for rate limiting library selection

**Next**: Complete T-BE-003 rate limiting
```

---

## Bidirectional Tracking Implementation

### CompletionCalculator Enhancement

**Current** (`completion-calculator.ts`):
```typescript
// Only reads increment tasks.md
extractTasks(userStoryContent, userStoryId): Task[] {
  const tasksPath = path.join(
    this.projectRoot,
    '.specweave/increments', incrementId, 'tasks.md'
  );
  // Parse tasks.md...
}
```

**Enhanced** (NEW):
```typescript
// Reads BOTH increment AND project tasks
extractTasks(userStoryContent, userStoryId, projectId): Task[] {
  // Step 1: Extract increment tasks (orchestration level)
  const incrementTasks = this.extractIncrementTasks(incrementId);

  // Step 2: Extract project-specific tasks
  const projectTasks = this.extractProjectTasks(projectId, featureId);

  // Step 3: Merge and deduplicate
  return this.mergeTasks(incrementTasks, projectTasks);
}

// NEW: Extract project-specific tasks
extractProjectTasks(projectId, featureId): Task[] {
  const projectTasksPath = path.join(
    this.projectRoot,
    '.specweave/docs/internal/specs', projectId, featureId, 'TASKS.md'
  );

  if (!existsSync(projectTasksPath)) {
    return []; // Project has no custom tasks
  }

  // Parse project TASKS.md...
  return tasks;
}

// NEW: Check bidirectional completion
checkBidirectionalCompletion(incrementTask, projectTasks): boolean {
  // Find all project tasks mapped to this increment task
  const mappedProjectTasks = projectTasks.filter(
    t => t.incrementTaskId === incrementTask.id
  );

  // Increment task complete ONLY if ALL mapped project tasks complete
  return mappedProjectTasks.every(t => t.completed);
}
```

### SpecDistributor Enhancement

**Current** (`spec-distributor.ts`):
```typescript
// Only creates user story files
generateUserStoryFilesByProject() {
  for (const userStory of stories) {
    userStoryFiles.push({
      // ... user story content
      // Implementation section has links to increment tasks.md
    });
  }
}
```

**Enhanced** (NEW):
```typescript
// Creates user story files AND project TASKS.md
generateUserStoryFilesByProject() {
  for (const project of projects) {
    // Step 1: Generate user story files (existing)
    const userStoryFiles = this.generateUserStories(project);

    // ✨ Step 2: Generate project TASKS.md (NEW!)
    const projectTasks = this.generateProjectTasks(project, increment);

    // Step 3: Write files
    await this.writeUserStoryFiles(userStoryFiles);
    await this.writeProjectTasksFile(projectTasks);
  }
}

// ✨ NEW: Generate project-specific tasks
generateProjectTasks(project, increment): ProjectTasks {
  // Step 1: Read increment tasks.md
  const incrementTasks = this.parseIncrementTasks(increment);

  // Step 2: Split tasks by project
  const projectTasks = this.splitTasksByProject(incrementTasks, project);

  // Step 3: Add project-specific details
  return this.enrichTasksForProject(projectTasks, project);
}

// ✨ NEW: Split tasks by project
splitTasksByProject(incrementTasks, project): Task[] {
  return incrementTasks.map(task => {
    // Detect if task applies to this project
    if (this.taskAppliesToProject(task, project)) {
      return this.createProjectTask(task, project);
    }
  }).filter(Boolean);
}

// ✨ NEW: Create project-specific task from increment task
createProjectTask(incrementTask, project): Task {
  const projectPrefix = this.getProjectPrefix(project); // "BE", "FE", "MOB"

  return {
    id: `T-${projectPrefix}-${incrementTask.number}`,
    title: this.adaptTitleForProject(incrementTask.title, project),
    description: this.adaptDescriptionForProject(incrementTask.description, project),
    incrementTaskId: incrementTask.id,
    userStories: incrementTask.userStories,
    status: incrementTask.status,
    // ... other fields
  };
}
```

---

## Task ID Format

### Increment Tasks
- Format: `T-{number}`
- Example: `T-001`, `T-002`, `T-015`
- Scope: Cross-project (orchestration)

### Project Tasks
- Format: `T-{PROJECT}-{number}`
- Examples:
  - Backend: `T-BE-001`, `T-BE-002`
  - Frontend: `T-FE-001`, `T-FE-002`
  - Mobile: `T-MOB-001`, `T-MOB-002`
  - Infrastructure: `T-INFRA-001`
- Scope: Project-specific (implementation)

### Mapping
```typescript
// Increment task T-001 maps to:
{
  "T-001": {
    "incrementTask": "T-001: Implement authentication",
    "projectTasks": [
      "T-BE-001: JWT auth service",
      "T-BE-002: Users table schema",
      "T-BE-003: /auth/login endpoint",
      "T-FE-001: Login form component",
      "T-FE-002: Auth state management",
      "T-FE-003: Protected route HOC"
    ]
  }
}

// Completion logic:
// T-001 complete = (T-BE-001 && T-BE-002 && T-BE-003 && T-FE-001 && T-FE-002 && T-FE-003)
```

---

## GitHub Sync Integration

### Issue Body Update

**Current**:
```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](...)

**Tasks**:
- [T-001: Create Enhanced Content Builder](...)
- [T-003: Enhance GitHub Content Sync](...)
```

**Enhanced**:
```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](...)

**Backend Tasks** (3/5 complete):
- [x] [T-BE-001: JWT auth service](../backend/FS-031/TASKS.md#t-be-001)
- [x] [T-BE-002: Users table schema](../backend/FS-031/TASKS.md#t-be-002)
- [ ] [T-BE-003: /auth/login endpoint](../backend/FS-031/TASKS.md#t-be-003)
- [ ] [T-BE-004: Rate limiting](../backend/FS-031/TASKS.md#t-be-004)
- [ ] [T-BE-005: API documentation](../backend/FS-031/TASKS.md#t-be-005)

**Increment Tasks** (1/2 complete):
- [x] [T-001: Implement authentication](...)
- [ ] [T-002: Create status mapper](...)
```

### Verification Gate Update

**Current**:
```typescript
// Only verifies increment tasks
const tasks = await this.extractTasks(content, userStoryId);
```

**Enhanced**:
```typescript
// Verifies BOTH increment AND project tasks
const incrementTasks = await this.extractIncrementTasks(content, userStoryId);
const projectTasks = await this.extractProjectTasks(content, userStoryId, projectId);

// Completion requires BOTH to be complete
const overallComplete =
  acsCompleted === acsTotal &&
  incrementTasksCompleted === incrementTasksTotal &&
  projectTasksCompleted === projectTasksTotal;
```

---

## Implementation Plan

### Phase 1: Task Splitting Logic (spec-distributor.ts)

**Files to Modify**:
- `src/core/living-docs/spec-distributor.ts`

**New Methods**:
1. `generateProjectTasks(project, increment): ProjectTasks`
2. `splitTasksByProject(incrementTasks, project): Task[]`
3. `createProjectTask(incrementTask, project): Task`
4. `writeProjectTasksFile(projectTasks, projectPath): void`

**Output**: `specs/{project}/FS-XXX/TASKS.md` files created during living docs sync

### Phase 2: Bidirectional Tracking (completion-calculator.ts)

**Files to Modify**:
- `plugins/specweave-github/lib/completion-calculator.ts`

**New Methods**:
1. `extractProjectTasks(projectId, featureId): Task[]`
2. `mergeTasks(incrementTasks, projectTasks): Task[]`
3. `checkBidirectionalCompletion(incrementTask, projectTasks): boolean`

**Output**: Completion verification includes both increment AND project tasks

### Phase 3: GitHub Sync Integration (github-feature-sync.ts)

**Files to Modify**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
- `plugins/specweave-github/lib/github-feature-sync.ts`

**Changes**:
1. Update issue body to show project tasks (not just increment tasks)
2. Update progress comments to show project task completion
3. Verification gate checks both increment AND project task completion

### Phase 4: Testing

**Test Files to Create**:
- `tests/unit/project-task-splitter.test.ts`
- `tests/unit/bidirectional-completion.test.ts`
- `tests/e2e/multi-project-tasks-sync.spec.ts`

**Coverage Target**: 90%+

---

## Migration Strategy

### Existing Increments (Backward Compatibility)

**Problem**: Existing user stories link to increment tasks.md (no project tasks)

**Solution**: Lazy migration on next sync

```typescript
// When syncing existing user story without project tasks:
if (!existsProjectTasksFile(project, feature)) {
  // Option 1: Auto-generate project tasks from increment tasks
  const projectTasks = this.splitTasksByProject(incrementTasks, project);
  await this.writeProjectTasksFile(projectTasks);

  // Option 2: Keep linking to increment tasks (backward compatible)
  // User story still links to increment tasks.md
}
```

---

## Example Output

### Backend TASKS.md (Generated)

**Path**: `.specweave/docs/internal/specs/backend/FS-031/TASKS.md`

```markdown
# Backend Tasks - FS-031: External Tool Status Sync

Generated from: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

---

## T-BE-001: JWT Authentication Service

[Full content as shown in "Task Format" section above]

---

## T-BE-002: Database Schema - Users Table

[Full content as shown in "Task Format" section above]

---

## T-BE-003: API Endpoint - /auth/login

[Full content as shown in "Task Format" section above]

---

[Additional backend tasks...]
```

### Frontend TASKS.md (Generated)

**Path**: `.specweave/docs/internal/specs/frontend/FS-031/TASKS.md`

```markdown
# Frontend Tasks - FS-031: External Tool Status Sync

Generated from: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

---

## T-FE-001: Login Form Component

**Increment Task**: [T-001: Implement authentication](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001)

**User Story**: [US-001: Rich External Issue Content](us-001-rich-external-issue-content.md)

**AC**: AC-US1-01, AC-US1-02

**Status**: [x] (100% - Completed)

**Description**: Create login form component with email/password inputs

**Test Plan** (BDD):
- **Given** empty form → **When** submit → **Then** show validation errors
- **Given** valid credentials → **When** submit → **Then** call auth API

**Test Cases**:
- Unit (`LoginForm.test.tsx`): validation, submit → 95% coverage
- Integration (`login-flow.test.tsx`): endToEndLogin → 90% coverage

**Implementation**:
- `src/components/auth/LoginForm.tsx` - React component
- `src/hooks/useAuth.ts` - Auth hook
- Form validation with Formik + Yup

**Completion Criteria**:
- [x] Component implemented
- [x] Tests passing
- [x] Code reviewed
- [x] Merged to develop

---

[Additional frontend tasks...]
```

---

## Benefits

### ✅ Clear Ownership
- Backend team: Works on `T-BE-*` tasks
- Frontend team: Works on `T-FE-*` tasks
- No confusion about who does what

### ✅ Granular Tracking
- Track backend progress independently from frontend
- GitHub issues show project-specific completion %
- Stakeholders see which project is blocking

### ✅ Realistic Task Breakdown
- Increment tasks = High-level goals
- Project tasks = Actual implementation steps
- No more "generic tasks" that don't match reality

### ✅ Bidirectional Sync
- Completing all project tasks → Auto-completes increment task
- Increment task completion verified against project tasks
- No manual coordination needed

---

## Next Steps

1. **Design Review**: User approval of architecture
2. **Implementation**: Phase 1-4 (estimated 8-12 hours)
3. **Testing**: Unit + Integration + E2E (4-6 hours)
4. **Documentation**: User guide for project-specific tasks (2 hours)
5. **Migration**: Re-sync existing features with project tasks (1 hour)

---

**Status**: ⚠️ ARCHITECTURE COMPLETE, IMPLEMENTATION PENDING
**User Approval**: Required before proceeding
**Estimated Effort**: 15-20 hours total
