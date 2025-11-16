# Project-Specific Tasks

**Category**: Organization
**Related Terms**: [COPIED ACs and Tasks](copied-acs-and-tasks.md), [User Story](user-story.md), [Living Docs](living-docs.md), [Three-Layer Architecture](three-layer-architecture.md)

---

## Definition

**Project-Specific Tasks** refers to how implementation tasks in SpecWeave are organized by User Story, which themselves are project-specific (backend, frontend, mobile, infrastructure). Rather than having all tasks in one global list, tasks are filtered and copied to User Story files based on their related Acceptance Criteria (ACs), creating project-focused task lists.

## Key Concept

### All Tasks in One Source (Increment tasks.md)
```markdown
# .specweave/increments/0031/tasks.md (SOURCE OF TRUTH)

- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form component (AC-US1-03)
- [ ] **T-004**: Add route protection HOC (AC-US1-04)
- [ ] **T-005**: Setup authentication middleware (AC-US1-02)
```

### Project-Specific Task Lists (User Stories)

**Backend User Story** (`specs/backend/FS-031/us-001.md`):
```markdown
## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### JWT Token Generation (AC-US1-01)
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint

### Protected Routes (AC-US1-02)
- [ ] T-005: Setup authentication middleware
```

**Frontend User Story** (`specs/frontend/FS-031/us-001.md`):
```markdown
## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### Login Form (AC-US1-03)
- [ ] T-003: Build login form component

### Route Protection (AC-US1-04)
- [ ] T-004: Add route protection HOC
```

**Key Point**: Same increment, different User Stories → different task lists

---

## How Project-Specific Filtering Works

### Step 1: User Stories Are Project-Specific

User Stories are organized by project in living docs:

```
.specweave/docs/internal/specs/
├── backend/
│   └── FS-031/
│       └── us-001-authentication.md ← Backend User Story
│
├── frontend/
│   └── FS-031/
│       └── us-001-authentication.md ← Frontend User Story
│
└── mobile/
    └── FS-031/
        └── us-001-authentication.md ← Mobile User Story
```

### Step 2: ACs Are Project-Tagged

Acceptance Criteria include project keywords:

```markdown
# Increment spec.md
## US-001: Implement Authentication

**Acceptance Criteria**:
- AC-US1-01: JWT token generation (backend) ← Backend AC
- AC-US1-02: Protected routes (backend) ← Backend AC
- AC-US1-03: Login form component (frontend) ← Frontend AC
- AC-US1-04: Route protection (frontend) ← Frontend AC
```

### Step 3: Tasks Reference AC-IDs

Tasks include AC-ID in parentheses:

```markdown
# Increment tasks.md
- T-001: Setup JWT service (AC-US1-01) ← References backend AC
- T-002: Create API endpoint (AC-US1-01) ← References backend AC
- T-003: Build login form (AC-US1-03) ← References frontend AC
- T-004: Add route HOC (AC-US1-04) ← References frontend AC
```

### Step 4: Filtering Logic

```typescript
// Pseudocode for filtering tasks
async filterTasksForUserStory(userStory: UserStory, increment: Increment) {
  // Step 1: Get User Story's ACs (already filtered by project)
  const userStoryACs = userStory.acceptanceCriteria;
  const acIds = userStoryACs.map(ac => ac.id);
  // Example: ['AC-US1-01', 'AC-US1-02'] for backend US

  // Step 2: Filter increment tasks by AC-ID
  const projectTasks = increment.tasks.filter(task =>
    acIds.includes(task.acId)
  );

  // Step 3: Return project-specific tasks
  return projectTasks;
}
```

**Result**: Backend User Story gets only backend tasks, Frontend gets only frontend tasks

---

## Complete Example

### Increment (Source of Truth)

**Spec** (`.specweave/increments/0031/spec.md`):
```markdown
## US-001: Implement Authentication

**Acceptance Criteria**:
- [x] AC-US1-01: JWT token generation (backend) (P1)
- [ ] AC-US1-02: Protected routes middleware (backend) (P1)
- [ ] AC-US1-03: Login form with validation (frontend) (P1)
- [ ] AC-US1-04: Protected route component (frontend) (P2)
- [ ] AC-US1-05: Biometric authentication (mobile) (P2)
```

**Tasks** (`.specweave/increments/0031/tasks.md`):
```markdown
# Backend Tasks
- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create /login endpoint (AC-US1-01)
- [ ] **T-003**: Create auth middleware (AC-US1-02)

# Frontend Tasks
- [ ] **T-004**: Build login form component (AC-US1-03)
- [ ] **T-005**: Add form validation (AC-US1-03)
- [ ] **T-006**: Create ProtectedRoute HOC (AC-US1-04)

# Mobile Tasks
- [ ] **T-007**: Setup biometric library (AC-US1-05)
- [ ] **T-008**: Implement fingerprint auth (AC-US1-05)
```

### Backend User Story

**File**: `specs/backend/FS-031/us-001-authentication.md`

```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria (COPIED from increment spec.md, filtered by backend)
- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Protected routes middleware (backend) (P1)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### JWT Token Generation (AC-US1-01)
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create /login endpoint

### Protected Routes Middleware (AC-US1-02)
- [ ] **T-003**: Create auth middleware

---

**Status**: In Progress (33% complete - 1/3 tasks)
```

**Result**: Only backend ACs and tasks

### Frontend User Story

**File**: `specs/frontend/FS-031/us-001-authentication.md`

```markdown
# US-001: Implement Authentication (Frontend)

## Acceptance Criteria (COPIED from increment spec.md, filtered by frontend)
- [ ] **AC-US1-03**: Login form with validation (frontend) (P1)
- [ ] **AC-US1-04**: Protected route component (frontend) (P2)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### Login Form (AC-US1-03)
- [ ] **T-004**: Build login form component
- [ ] **T-005**: Add form validation

### Protected Routes (AC-US1-04)
- [ ] **T-006**: Create ProtectedRoute HOC

---

**Status**: Not Started (0% complete)
```

**Result**: Only frontend ACs and tasks

### Mobile User Story

**File**: `specs/mobile/FS-031/us-001-authentication.md`

```markdown
# US-001: Implement Authentication (Mobile)

## Acceptance Criteria (COPIED from increment spec.md, filtered by mobile)
- [ ] **AC-US1-05**: Biometric authentication (mobile) (P2)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### Biometric Authentication (AC-US1-05)
- [ ] **T-007**: Setup biometric library
- [ ] **T-008**: Implement fingerprint auth

---

**Status**: Not Started (0% complete)
```

**Result**: Only mobile ACs and tasks

---

## Benefits of Project-Specific Tasks

### 1. Focus and Clarity
Developers see only relevant tasks for their project:

```markdown
# Backend developer opens specs/backend/FS-031/us-001.md
## Implementation
- [x] T-001: Setup JWT service ← Relevant
- [ ] T-002: Create /login endpoint ← Relevant
- [ ] T-003: Create auth middleware ← Relevant

# No frontend or mobile tasks to distract!
```

### 2. Team Organization
Different teams work on different User Stories:

```
Backend Team → specs/backend/FS-031/us-001.md
Frontend Team → specs/frontend/FS-031/us-001.md
Mobile Team → specs/mobile/FS-031/us-001.md
```

**Each team**:
- Sees only their tasks
- Tracks only their ACs
- Works independently

### 3. GitHub Integration
GitHub issues show project-specific checkable task lists:

**Backend GitHub Issue**:
```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes middleware (backend)

## Subtasks
- [x] T-001: Setup JWT service
- [ ] T-002: Create /login endpoint
- [ ] T-003: Create auth middleware
```

**Frontend GitHub Issue**:
```markdown
# US-001: Implement Authentication (Frontend)

## Acceptance Criteria
- [ ] AC-US1-03: Login form with validation (frontend)
- [ ] AC-US1-04: Protected route component (frontend)

## Subtasks
- [ ] T-004: Build login form component
- [ ] T-005: Add form validation
- [ ] T-006: Create ProtectedRoute HOC
```

**Stakeholders see**:
- Project-specific progress
- Relevant checkboxes only
- Focused task lists

### 4. Progress Tracking
Calculate completion per project:

```
Backend US-001: 33% (1/3 tasks complete)
Frontend US-001: 0% (0/3 tasks complete)
Mobile US-001: 0% (0/2 tasks complete)

Overall US-001: 12.5% (1/8 tasks complete)
```

---

## Relationship with User Stories

### User Stories ARE Project-Specific

**Key Insight**: User Stories are already organized by project in the file structure:

```
specs/
├── backend/FS-031/us-001.md ← Backend User Story
├── frontend/FS-031/us-001.md ← Frontend User Story
└── mobile/FS-031/us-001.md ← Mobile User Story
```

### Tasks Follow User Story Organization

**Because**:
- User Stories have project-specific ACs
- Tasks reference AC-IDs
- Filtering happens automatically

**Result**:
- Backend User Story → Backend tasks
- Frontend User Story → Frontend tasks
- Mobile User Story → Mobile tasks

---

## AC-ID Linking Strategy

### Task Format

Every task MUST include AC-ID in parentheses:

```markdown
- [ ] **T-001**: Setup JWT service (AC-US1-01)
                                     ↑
                                   AC-ID
```

### Why AC-IDs Matter

AC-IDs enable project-specific filtering:

```
1. Backend User Story has AC-US1-01, AC-US1-02
2. Find all tasks with (AC-US1-01) or (AC-US1-02)
3. Result: T-001, T-002, T-003 → Backend tasks only
```

### Multiple AC-IDs

Tasks can reference multiple ACs:

```markdown
- [ ] **T-010**: Integration test (AC-US1-01, AC-US1-03)
                                   ↑            ↑
                             Backend AC    Frontend AC
```

**Filtering Result**:
- Backend User Story: Shows T-010 (has AC-US1-01)
- Frontend User Story: Shows T-010 (has AC-US1-03)
- Mobile User Story: Does NOT show T-010

---

## Data Flow with Project-Specific Tasks

### Three-Layer Architecture Integration

```
┌─────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)       │
│                                             │
│ tasks.md: ALL tasks for ALL projects       │
│ - T-001: Backend task (AC-US1-01)          │
│ - T-003: Frontend task (AC-US1-03)         │
│                                             │
└──────────────────┬──────────────────────────┘
                   ↓
          (Filter by AC-ID + Project)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY             │
│                                             │
│ Backend US Implementation:                  │
│ - T-001: Backend task ← Filtered            │
│                                             │
│ Frontend US Implementation:                 │
│ - T-003: Frontend task ← Filtered           │
│                                             │
└──────────────────┬──────────────────────────┘
                   ↓
          (GitHub sync)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                       │
│                                             │
│ Backend Issue Subtasks:                     │
│ - T-001: Backend task                       │
│                                             │
│ Frontend Issue Subtasks:                    │
│ - T-003: Frontend task                      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Technical Implementation

### TaskProjectSpecificGenerator

**File**: `src/core/living-docs/task-project-specific-generator.ts`

```typescript
export class TaskProjectSpecificGenerator {
  /**
   * Generate project-specific task list for User Story
   */
  async generateTasksForUserStory(
    userStory: UserStory,
    increment: Increment
  ): Promise<Task[]> {
    // Step 1: Get User Story's AC-IDs
    const acIds = userStory.acceptanceCriteria.map(ac => ac.id);
    // Example: ['AC-US1-01', 'AC-US1-02'] for backend US

    // Step 2: Filter increment tasks by AC-ID
    const projectTasks = increment.tasks.filter(task =>
      this.hasMatchingACID(task, acIds)
    );

    // Step 3: Preserve completion status from increment
    const tasksWithStatus = projectTasks.map(task => ({
      ...task,
      completed: task.completed // From increment source of truth
    }));

    return tasksWithStatus;
  }

  /**
   * Check if task references any of the given AC-IDs
   */
  private hasMatchingACID(task: Task, acIds: string[]): boolean {
    // Extract AC-IDs from task description
    // Example: "Setup JWT service (AC-US1-01)" → ['AC-US1-01']
    const taskACIDs = this.extractACIDs(task.description);

    // Check if any task AC-ID matches User Story AC-IDs
    return taskACIDs.some(acId => acIds.includes(acId));
  }

  /**
   * Extract AC-IDs from task description
   */
  private extractACIDs(description: string): string[] {
    // Regex: Match "AC-USXX-YY" pattern
    const regex = /\(AC-US\d+-\d+(?:,\s*AC-US\d+-\d+)*\)/g;
    const matches = description.match(regex);

    if (!matches) return [];

    // Parse AC-IDs from parentheses
    // "(AC-US1-01, AC-US1-02)" → ['AC-US1-01', 'AC-US1-02']
    return matches[0]
      .replace(/[()]/g, '')
      .split(',')
      .map(id => id.trim());
  }
}
```

---

## Best Practices

### For Task Creation

1. **Always Include AC-ID**: Every task MUST reference at least one AC
   ```markdown
   ✅ CORRECT: - [ ] **T-001**: Setup JWT service (AC-US1-01)
   ❌ WRONG: - [ ] **T-001**: Setup JWT service
   ```

2. **Use Descriptive Task Names**: Clear, action-oriented descriptions
   ```markdown
   ✅ CORRECT: - [ ] **T-001**: Setup JWT service with RS256 signing
   ❌ WRONG: - [ ] **T-001**: JWT stuff
   ```

3. **Group by AC**: Organize tasks under their related AC heading
   ```markdown
   ### JWT Token Generation (AC-US1-01)
   - [ ] T-001: Setup JWT service
   - [ ] T-002: Create /login endpoint
   ```

### For User Story Organization

1. **One User Story Per Project**: Don't mix backend and frontend in same file
2. **Clear Project Folder**: Use `specs/backend/`, `specs/frontend/`, `specs/mobile/`
3. **Consistent Naming**: Same feature ID across projects (FS-031)

### For Teams

1. **Single Source of Truth**: Update increment tasks.md, not User Story files
2. **Sync After Updates**: Run `/specweave:sync-docs` to propagate changes
3. **Verify Filtering**: Check User Stories have correct project-specific tasks
4. **Track Progress**: Use project-specific completion percentages

---

## Common Questions

### Q: Where should I add a new task?
**A**: Add to increment tasks.md with AC-ID. It will auto-filter to relevant User Stories.

### Q: Can a task belong to multiple projects?
**A**: Yes, if it references multiple AC-IDs from different projects:
```markdown
- [ ] **T-010**: Integration test (AC-US1-01, AC-US1-03)
                                   ↑ Backend    ↑ Frontend
```

### Q: What if a task has no AC-ID?
**A**: It won't appear in any User Story. ALL tasks MUST have AC-ID.

### Q: How do I see all tasks across projects?
**A**: Read increment tasks.md (source of truth) - it has ALL tasks.

### Q: Can I edit User Story task list directly?
**A**: No - edits will be overwritten on next sync. Update increment tasks.md instead.

---

## Related Concepts

- **[COPIED ACs and Tasks](copied-acs-and-tasks.md)**: How tasks are copied to User Stories
- **[Three-Layer Architecture](three-layer-architecture.md)**: Synchronization pattern
- **[User Story](user-story.md)**: Container for project-specific tasks
- **[Living Docs](living-docs.md)**: Destination for User Story files
- **[AC-ID](ac-id.md)**: Identifier used for task filtering

---

## Summary

**Project-Specific Tasks** means:

- All tasks stored in increment tasks.md (source of truth)
- Tasks filtered to User Stories by **AC-ID** relationships
- User Stories are **project-specific** (backend/frontend/mobile)
- Each User Story shows **only relevant tasks** for that project
- GitHub issues show **project-specific checkable task lists**
- Teams work on **focused, filtered task lists**

**Key Mechanism**: User Story ACs → AC-IDs → Filter tasks → Project-specific list

**Benefits**: Team focus, clarity, independent progress tracking, GitHub integration

---

**Last Updated**: 2025-11-16
**Related Increment**: [0037-project-specific-tasks](../../../increments/0037-project-specific-tasks/)
