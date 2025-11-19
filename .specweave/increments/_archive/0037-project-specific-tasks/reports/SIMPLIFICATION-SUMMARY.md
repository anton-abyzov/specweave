# ✅ SIMPLIFIED APPROACH: Copy-Paste ACs/Tasks to User Stories

**Date**: 2025-11-16
**Status**: ✅ SPECIFICATION UPDATED WITH RADICAL SIMPLIFICATION

---

## Your Critical Feedback

> "no, the idea is that Tasks are related to User stories, which are project related and not cross projects!! ultrathink on it, adjust spec!"
>
> "it will make it simpler, as all internal docs project feature US will just use copy-pasted Acceptance criteria AND Tasks as a part of implementation!!! Which simplifies a lot"
>
> "we will just need to update status for each task, US, AC and support bidirectional, e.g. I update tasks status in GH, then increment spec tasks.md MUST update as well after github sync"
>
> "but special validate commands MUST verify if code is still not there and task is not completed, in fact it will be reopened, or User story reopened, or AC and increment could be reopened!"

---

## What Changed

### ❌ OLD APPROACH (Complex - THREE-LEVEL HIERARCHY)

```
Increment: 0031-external-tool-status-sync/tasks.md
└── High-level tasks: T-001: Implement authentication
    ├── Backend: specs/backend/FS-031/TASKS.md (NEW FILE!)
    │   ├── T-BE-001: JWT auth service
    │   ├── T-BE-002: Database schema
    │   └── T-BE-003: API endpoint
    └── Frontend: specs/frontend/FS-031/TASKS.md (NEW FILE!)
        ├── T-FE-001: Login form component
        ├── T-FE-002: Auth state management
        └── T-FE-003: Protected route HOC

Problems:
❌ Three-level hierarchy (increment → project → user story)
❌ Separate TASKS.md files for each project
❌ Complex transformation logic
❌ "Project tasks" that are cross-project (wrong!)
```

---

### ✅ NEW APPROACH (Simple - COPY-PASTE)

```
SOURCE OF TRUTH (Increment):
├── spec.md → Acceptance Criteria (ACs)
└── tasks.md → Tasks (with AC-IDs for filtering)
    ↓
    COPY-PASTE (filtered by AC-ID and project keywords)
    ↓
DESTINATION (User Stories - ALREADY PROJECT-SPECIFIC!):
└── specs/backend/FS-031/us-001-authentication.md
    ├── ## Acceptance Criteria (copied from increment spec.md)
    └── ## Tasks (copied from increment tasks.md, filtered by AC-ID)

Benefits:
✅ User Stories ARE already project-specific!
✅ NO separate TASKS.md files needed!
✅ Just copy-paste relevant ACs and Tasks
✅ Simple filtering: AC-ID + project keywords
✅ No transformation logic
```

---

## Data Flow (Simplified)

### Step 1: Increment (Source of Truth)

**Increment spec.md**:
```markdown
## US-001: Implement Authentication

**Acceptance Criteria**:
- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Login form component (frontend) (P1)
- [ ] **AC-US1-03**: Protected routes (frontend) (P1)
```

**Increment tasks.md**:
```markdown
- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form component (AC-US1-02)
- [ ] **T-004**: Add route protection HOC (AC-US1-03)
```

---

### Step 2: Copy-Paste to User Stories (Filtered)

**User Story: specs/backend/FS-031/us-001-authentication.md**:
```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria
(Copied from increment spec.md, filtered by "backend" keyword)

- [x] **AC-US1-01**: JWT token generation (backend) (P1)

## Tasks
(Copied from increment tasks.md, filtered by AC-US1-01)

- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint
```

**User Story: specs/frontend/FS-031/us-001-authentication.md**:
```markdown
# US-001: Implement Authentication (Frontend)

## Acceptance Criteria
(Copied from increment spec.md, filtered by "frontend" keyword)

- [ ] **AC-US1-02**: Login form component (frontend) (P1)
- [ ] **AC-US1-03**: Protected routes (frontend) (P1)

## Tasks
(Copied from increment tasks.md, filtered by AC-US1-02, AC-US1-03)

- [ ] **T-003**: Build login form component
- [ ] **T-004**: Add route protection HOC
```

---

### Step 3: Bidirectional Sync (GitHub ↔ Increment ↔ User Story)

**Scenario 1: User updates GitHub**:
```
User checks checkbox in GitHub issue for T-002
→ GitHub sync detects change
→ Increment tasks.md updates: [x] T-002
→ User Story file updates: [x] T-002 (next sync)
```

**Scenario 2: Validation detects missing code**:
```
Validate command checks:
- T-001 marked complete in tasks.md?  YES ✓
- Code for T-001 exists? NO ✗

Action:
→ Reopen T-001 in tasks.md: [ ] T-001
→ Reopen User Story if all tasks were complete
→ Reopen AC-US1-01 if all tasks for it were complete
→ Reopen increment if all ACs were complete
```

**Scenario 3: Bottom-up completion**:
```
User completes T-002 (last task for AC-US1-01)
→ Mark AC-US1-01 as complete
→ Check if all ACs for US-001 complete
→ If YES → Mark US-001 as complete
→ Check if all USs for increment complete
→ If YES → Mark increment as complete
```

---

## Benefits of Simplification

### Code Reduction

**OLD Approach**:
- Three-level hierarchy logic
- Transformation from increment tasks → project tasks
- Separate TASKS.md file generation
- Complex mapping and tracking
- **Estimated Code**: ~1,500 lines

**NEW Approach**:
- Simple copy-paste with filtering
- Filter by AC-ID (tasks) and project keywords (ACs)
- No separate files (just sections in User Story)
- **Estimated Code**: ~300 lines

**Reduction**: 80% code reduction (1,500 → 300 lines)!

---

### Time Reduction

**OLD Approach**:
- Phase 1: Task Splitting Logic (4-6 hours)
- Phase 2: Bidirectional Tracking (4-6 hours)
- Phase 3: GitHub Sync (3-4 hours)
- Phase 4: Testing (4-4 hours)
- **Total**: 15-20 hours

**NEW Approach**:
- Phase 1: Copy-Paste ACs/Tasks (3-4 hours)
- Phase 2: Bidirectional Sync with Validation (4-5 hours)
- Phase 3: GitHub Sync (2-3 hours)
- Phase 4: Testing (3-3 hours)
- **Total**: 10-15 hours

**Reduction**: 25-33% time reduction (15-20 hours → 10-15 hours)!

---

### Complexity Reduction

**OLD Approach**:
- Need to understand three-level hierarchy
- Need to map increment tasks → project tasks
- Need to track completion across three levels
- **Cognitive Load**: HIGH

**NEW Approach**:
- User Stories ARE already project-specific
- Just copy-paste ACs and Tasks
- Filter by AC-ID and project keywords
- **Cognitive Load**: LOW

**Result**: MUCH easier to understand and implement!

---

## Implementation Details

### Filtering Logic

**AC Filtering** (by project keywords):
```typescript
function filterACsByProject(acs: AC[], project: string): AC[] {
  return acs.filter(ac => {
    const desc = ac.description.toLowerCase();
    return desc.includes(project.toLowerCase());
  });
}

// Example:
// AC: "JWT token generation (backend)" → backend project
// AC: "Login form component (frontend)" → frontend project
```

**Task Filtering** (by AC-ID):
```typescript
function filterTasksByACIDs(tasks: Task[], acIds: string[]): Task[] {
  return tasks.filter(task => {
    // Task format: "T-001: Description (AC-US1-01)"
    return acIds.some(acId => task.description.includes(acId));
  });
}

// Example:
// Task: "T-001: Setup JWT service (AC-US1-01)" → Includes AC-US1-01
// Task: "T-003: Build login form (AC-US1-02)" → Includes AC-US1-02
```

---

### Bidirectional Sync

**Three-Way Sync**:
```
GitHub Issue (Checkboxes)
    ↕
Increment tasks.md (Source of Truth)
    ↕
User Story files (Copies)
```

**Sync Direction**:
1. GitHub → Increment (user updates checkbox)
2. Increment → User Story (living docs sync)
3. User Story → GitHub (issue body update)

**Validation**:
```
Validate command:
1. Read increment tasks.md
2. For each completed task:
   a. Check if code exists (file path, function name, etc.)
   b. If missing → Reopen task
   c. If reopened → Check if AC/US/Increment need reopening
```

---

## Updated User Stories

### US-005: Copy-Paste ACs/Tasks to User Stories

**Goal**: Copy ACs and Tasks from increment to User Story files during living docs sync.

**Key ACs**:
- Copy ACs from increment spec.md, filter by project keywords
- Copy Tasks from increment tasks.md, filter by AC-ID
- Create `## Acceptance Criteria` and `## Tasks` sections in User Story files
- NO separate `specs/{project}/FS-XXX/TASKS.md` files!

---

### US-006: Bidirectional Sync with Validation & Reopen

**Goal**: Sync status bidirectionally with code validation and reopen mechanism.

**Key ACs**:
- GitHub checkbox change → Increment tasks.md updates
- Increment change → User Story updates
- User Story change → GitHub updates
- Validate command checks if code exists
- Reopen task/AC/US/Increment if code missing

---

### US-007: GitHub Sync with User Story ACs/Tasks

**Goal**: Show User Story ACs and Tasks as checkboxes in GitHub issues.

**Key ACs**:
- GitHub issue body shows ACs from User Story file
- GitHub issue body shows Tasks from User Story file
- Checkboxes sync bidirectionally
- Progress comments show completion %

---

## Migration Path

**For Existing Increments**:

```
Before (OLD - separate TASKS.md):
specs/backend/FS-031/
├── us-001-authentication.md (just description + link)
└── TASKS.md (all backend tasks)

After (NEW - embedded in US):
specs/backend/FS-031/
└── us-001-authentication.md
    ├── ## Acceptance Criteria (copied)
    └── ## Tasks (copied, filtered by AC-ID)
```

**Migration Script**:
1. Read existing TASKS.md (if exists)
2. Parse tasks by AC-ID
3. Distribute tasks to User Story files
4. Add `## Acceptance Criteria` and `## Tasks` sections
5. Delete TASKS.md (no longer needed!)

---

## Summary

**What You Said**:
> "Tasks are related to User Stories, which are project related and not cross projects!!"

**What We Did**:
- ✅ Removed three-level hierarchy (was wrong!)
- ✅ User Stories ARE already project-specific (in `specs/{project}/FS-XXX/`)
- ✅ Just copy-paste ACs and Tasks to User Story files
- ✅ NO separate TASKS.md files needed
- ✅ Bidirectional sync with validation and reopen
- ✅ 80% code reduction, 25-33% time reduction
- ✅ MUCH simpler to understand and implement!

**Result**: RADICAL SIMPLIFICATION! 🎉

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Status**: ✅ SPECIFICATION UPDATED WITH SIMPLIFIED APPROACH
