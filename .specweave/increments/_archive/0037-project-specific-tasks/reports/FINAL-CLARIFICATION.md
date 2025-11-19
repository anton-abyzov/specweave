# ✅ FINAL CLARIFICATION: Implementation Section (Not Separate TASKS.md)

**Date**: 2025-11-16
**Status**: ✅ CORRECTLY UNDERSTOOD

---

## Your Critical Correction

> "no you got it wrong, no separate tasks.md file needed! User Story MUST include reference to tasks in Implementation section itself!"
>
> "after specweave-github:sync those tasks will be as gh subtasks, clickable, this status will be synced with increment tasks.md file which is per project!"

---

## The CORRECT Structure

### Increment (Source of Truth)

**File**: `.specweave/increments/0031-external-tool-status-sync/tasks.md`

```markdown
# Tasks

- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form component (AC-US1-02)
- [ ] **T-004**: Add route protection HOC (AC-US1-03)

> **Note**: This is the SOURCE OF TRUTH for all task statuses
```

**Key Point**: ONE tasks.md file for the entire increment (not per project!)

---

### User Story (References Tasks)

**File**: `specs/backend/FS-031/us-001-authentication.md`

```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria
- [x] **AC-US1-01**: JWT token generation (backend) (P1)

## Implementation
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint

> **Note**: Task status syncs with increment tasks.md
```

**Key Points**:
- ✅ Has `## Implementation` section (NOT `## Tasks`)
- ✅ References tasks from increment tasks.md
- ✅ NO separate `specs/backend/FS-031/TASKS.md` file!
- ✅ Status syncs bidirectionally with increment tasks.md

---

### GitHub Issue (After Sync)

**After running `/specweave-github:sync`**:

```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria
- [x] **AC-US1-01**: JWT token generation (backend)

## Subtasks
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint

> Checking/unchecking subtasks syncs status with increment tasks.md
```

**Key Points**:
- ✅ Subtasks are checkable in GitHub issue
- ✅ Checking checkbox in GitHub → Increment tasks.md updates
- ✅ Unchecking checkbox in GitHub → Increment tasks.md updates
- ✅ Stakeholders can update without repository access!

---

## Bidirectional Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INCREMENT (Source of Truth)              │
│                                                             │
│  .specweave/increments/0031/tasks.md                       │
│  - [x] **T-001**: Setup JWT service (AC-US1-01)           │
│  - [ ] **T-002**: Create login API endpoint (AC-US1-01)   │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (references filtered by AC-ID)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER STORY                                │
│                                                             │
│  specs/backend/FS-031/us-001-authentication.md             │
│  ## Implementation                                          │
│  - [x] **T-001**: Setup JWT service                        │
│  - [ ] **T-002**: Create login API endpoint                │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (specweave-github:sync)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ISSUE                              │
│                                                             │
│  Issue #123: US-001 Authentication (Backend)               │
│  ## Subtasks                                                │
│  - [x] **T-001**: Setup JWT service                        │
│  - [ ] **T-002**: Create login API endpoint                │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (user checks/unchecks checkbox)
                   ↓
         ┌─────────────────────┐
         │  Status syncs back  │
         │  to increment       │
         │  tasks.md           │
         └─────────────────────┘
```

---

## What I Got Wrong Initially

**❌ WRONG (My Initial Understanding)**:
```
specs/backend/FS-031/
├── us-001-authentication.md (description only)
└── TASKS.md (separate file with all backend tasks)
    ├── T-BE-001: Setup JWT service
    ├── T-BE-002: Create login API endpoint
    └── T-BE-003: Add middleware
```

**Problems**:
- Separate TASKS.md file (not needed!)
- Tasks not in User Story file
- GitHub sync would be more complex

---

**✅ CORRECT (Your Clarification)**:
```
specs/backend/FS-031/
└── us-001-authentication.md
    ├── ## Acceptance Criteria
    └── ## Implementation (references increment tasks.md)
        ├── T-001: Setup JWT service
        └── T-002: Create login API endpoint
```

**Benefits**:
- ✅ Everything in User Story file
- ✅ Implementation section = GitHub subtasks
- ✅ Simple sync: Implementation → GitHub → Increment tasks.md
- ✅ No separate TASKS.md files!

---

## Implementation Logic

### 1. Living Docs Sync (User Story Generation)

```typescript
// Generate User Story file
function generateUserStory(increment: Increment, userStory: UserStory) {
  const file = `specs/${userStory.project}/FS-${increment.id}/us-${userStory.id}.md`;

  // 1. Copy Acceptance Criteria (filtered by project)
  const acs = increment.spec.acceptanceCriteria
    .filter(ac => ac.description.includes(userStory.project));

  // 2. Reference Tasks in Implementation section (filtered by AC-ID)
  const acIds = acs.map(ac => ac.id);
  const tasks = increment.tasks
    .filter(task => acIds.some(acId => task.description.includes(acId)));

  // 3. Write User Story file
  const content = `
# ${userStory.title}

## Acceptance Criteria
${acs.map(ac => `- [${ac.completed ? 'x' : ' '}] **${ac.id}**: ${ac.description}`).join('\n')}

## Implementation
${tasks.map(task => `- [${task.completed ? 'x' : ' '}] **${task.id}**: ${task.description}`).join('\n')}

> **Note**: Task status syncs with increment tasks.md
`;

  writeFile(file, content);
}
```

---

### 2. GitHub Sync (Create Issue with Subtasks)

```typescript
// Sync User Story to GitHub Issue
function syncUserStoryToGitHub(userStory: UserStoryFile) {
  const issue = {
    title: userStory.title,
    body: `
## Acceptance Criteria
${userStory.acceptanceCriteria.map(ac => `- [${ac.completed ? 'x' : ' '}] **${ac.id}**: ${ac.description}`).join('\n')}

## Subtasks
${userStory.implementation.tasks.map(task => `- [${task.completed ? 'x' : ' '}] **${task.id}**: ${task.description}`).join('\n')}

> Checking/unchecking subtasks syncs status with increment tasks.md
`
  };

  github.issues.create(issue);
}
```

---

### 3. Bidirectional Status Sync

```typescript
// GitHub Webhook: User checks subtask checkbox
function onGitHubCheckboxChange(issueId: number, taskId: string, completed: boolean) {
  // 1. Find increment that owns this task
  const increment = findIncrementByTaskId(taskId);

  // 2. Update increment tasks.md (SOURCE OF TRUTH)
  updateIncrementTask(increment, taskId, completed);

  // 3. Update User Story file (next living docs sync)
  // This happens automatically on next sync
}

// Increment tasks.md change detection
function onIncrementTaskChange(incrementId: number, taskId: string, completed: boolean) {
  // 1. Find all User Stories that reference this task
  const userStories = findUserStoriesByTaskId(taskId);

  // 2. Update User Story Implementation section
  userStories.forEach(us => {
    updateUserStoryTask(us, taskId, completed);
  });

  // 3. Update GitHub issue subtasks
  const issues = findGitHubIssuesByTaskId(taskId);
  issues.forEach(issue => {
    updateGitHubSubtask(issue, taskId, completed);
  });
}
```

---

## Key Differences from My Initial Understanding

| Aspect | ❌ My Initial Understanding | ✅ Correct Understanding |
|--------|----------------------------|--------------------------|
| **User Story Structure** | Has link to separate TASKS.md | Has `## Implementation` section |
| **Task Location** | Separate `specs/{project}/FS-XXX/TASKS.md` | In User Story file itself |
| **Task IDs** | `T-BE-001`, `T-FE-001` (project-prefixed) | `T-001`, `T-002` (increment-wide) |
| **GitHub Subtasks** | Would need complex mapping | Direct from Implementation section |
| **Status Sync** | Three-way (GitHub ↔ Project TASKS.md ↔ Increment) | Two-way (GitHub ↔ Increment tasks.md) |
| **Complexity** | High (separate files, transformations) | Low (just references in one section) |

---

## Benefits of Correct Approach

**Simplicity**:
- ✅ No separate TASKS.md files
- ✅ Everything in User Story file
- ✅ Simple sync: Implementation → Subtasks

**Clarity**:
- ✅ Clear section name: `## Implementation`
- ✅ Clear purpose: What needs to be done for this US
- ✅ Clear sync: Checkboxes in GitHub = checkboxes in tasks.md

**Maintainability**:
- ✅ One increment tasks.md (source of truth)
- ✅ User Stories reference tasks (not copy)
- ✅ Status changes propagate automatically

---

## Updated User Stories

### US-005: Reference Tasks in Implementation Section

**Goal**: User Story files have `## Implementation` section that references tasks from increment tasks.md

**Key ACs**:
- Copy ACs from increment spec.md
- Reference tasks in `## Implementation` section (NOT `## Tasks`)
- Filter tasks by AC-ID
- NO separate TASKS.md files

---

### US-007: GitHub Subtasks from Implementation Section

**Goal**: GitHub issues show subtasks from User Story Implementation section

**Key ACs**:
- GitHub issue body shows Implementation section as Subtasks
- Subtasks are checkable in GitHub
- Checking/unchecking syncs to increment tasks.md
- User Story Implementation section updates when increment changes

---

## Summary

**What You Said**:
> "User Story MUST include reference to tasks in Implementation section itself!"
> "after specweave-github:sync those tasks will be as gh subtasks, clickable"
> "this status will be synced with increment tasks.md file"

**What We Now Have**:
- ✅ User Story has `## Implementation` section (not separate TASKS.md)
- ✅ Implementation section references tasks from increment tasks.md
- ✅ GitHub sync creates subtasks from Implementation section
- ✅ Subtasks are checkable in GitHub
- ✅ Status syncs bidirectionally: GitHub subtasks ↔ Increment tasks.md
- ✅ NO separate TASKS.md files anywhere!

**Result**: CORRECTLY UNDERSTOOD! 🎉

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Status**: ✅ FINAL STRUCTURE CONFIRMED
