# COPIED ACs and Tasks

**Category**: Architecture
**Related Terms**: [Three-Layer Architecture](three-layer-architecture.md), [Living Docs](living-docs.md), [User Story](user-story.md), [Project-Specific Tasks](project-specific-tasks.md)

---

## Definition

**COPIED ACs and Tasks** refers to SpecWeave's approach where Acceptance Criteria (ACs) and implementation tasks are **copied** from the increment (source of truth) to User Story files in living documentation, rather than being referenced by links. This creates self-contained User Story documents that remain readable even when the increment is archived.

## Key Concept: COPIED vs REFERENCED

### ❌ REFERENCED (Not Used in SpecWeave)
```markdown
# specs/backend/FS-031/us-001-authentication.md

## Acceptance Criteria
See [increment spec.md](../../../increments/0031/spec.md#us-001)

## Implementation
See [increment tasks.md](../../../increments/0031/tasks.md)
```

**Problems with References**:
- Breaks when increment is archived
- Requires navigating to multiple files
- Not self-contained
- Poor readability

### ✅ COPIED (SpecWeave Approach)
```markdown
# specs/backend/FS-031/us-001-authentication.md

## Acceptance Criteria (COPIED from increment spec.md, filtered by backend)
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

**Benefits of COPIED**:
- Self-contained documentation
- Readable without navigation
- Survives increment archiving
- Project-specific content
- Checkbox status synchronized

---

## How COPIED Content Works

### Source of Truth (Increment)

**File**: `.specweave/increments/0031/spec.md`
```markdown
## US-001: Implement Authentication
**Acceptance Criteria**:
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)
- [ ] AC-US1-03: Login form component (frontend)
- [ ] AC-US1-04: Protected routes (frontend)
```

**File**: `.specweave/increments/0031/tasks.md`
```markdown
- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form component (AC-US1-03)
- [ ] **T-004**: Add route protection HOC (AC-US1-04)
```

### COPIED to Backend User Story

**File**: `specs/backend/FS-031/us-001-authentication.md`
```markdown
## Acceptance Criteria (COPIED from increment spec.md, filtered by backend)
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

**Filtering Logic**:
1. **ACs**: Filter by project keyword "(backend)"
2. **Tasks**: Filter by AC-ID (only tasks for backend ACs)
3. **Status**: Preserve checkbox state from increment

### COPIED to Frontend User Story

**File**: `specs/frontend/FS-031/us-001-authentication.md`
```markdown
## Acceptance Criteria (COPIED from increment spec.md, filtered by frontend)
- [ ] AC-US1-03: Login form component (frontend)
- [ ] AC-US1-04: Protected routes (frontend)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)
- [ ] T-003: Build login form component
- [ ] T-004: Add route protection HOC
```

**Filtering Logic**:
1. **ACs**: Filter by project keyword "(frontend)"
2. **Tasks**: Filter by AC-ID (only tasks for frontend ACs)
3. **Status**: Preserve checkbox state from increment

---

## Filtering Strategies

### 1. Project Keyword Filtering (for ACs)

**Backend Keywords**: `(backend)`, `(BE)`, `(API)`, `(server)`
**Frontend Keywords**: `(frontend)`, `(FE)`, `(UI)`, `(client)`
**Mobile Keywords**: `(mobile)`, `(iOS)`, `(Android)`

**Example**:
```markdown
# Increment spec.md
- AC-US1-01: JWT token generation (backend) ← Backend US
- AC-US1-02: Login form (frontend) ← Frontend US
- AC-US1-03: Biometric auth (mobile) ← Mobile US
```

### 2. AC-ID Filtering (for Tasks)

Tasks reference their parent AC via AC-ID:

```markdown
# Increment tasks.md
- T-001: Setup JWT service (AC-US1-01) ← Backend (AC-US1-01 is backend)
- T-002: Build login form (AC-US1-02) ← Frontend (AC-US1-02 is frontend)
```

**Filtering Logic**:
1. Identify User Story's ACs (e.g., Backend US has AC-US1-01)
2. Find all tasks referencing those AC-IDs
3. Copy only those tasks to User Story Implementation section

---

## Checkbox Status Synchronization

COPIED content maintains **bidirectional sync** through the [Three-Layer Architecture](three-layer-architecture.md):

### Flow 1: Increment → User Story → GitHub
```
Increment spec.md:
- [x] AC-US1-01: JWT token generation (backend)
    ↓ (COPY with status)
User Story ACs:
- [x] AC-US1-01: JWT token generation (backend)
    ↓ (GitHub sync)
GitHub Issue ACs:
- [x] AC-US1-01: JWT token generation (backend)
```

### Flow 2: GitHub → User Story → Increment
```
GitHub Issue ACs:
- [x] AC-US1-02: Protected routes (backend) ← Stakeholder checks
    ↓ (GitHub sync)
User Story ACs:
- [x] AC-US1-02: Protected routes (backend)
    ↓ (Living docs sync)
Increment spec.md:
- [x] AC-US1-02: Protected routes (backend)
```

**Key Point**: COPIED content stays synchronized with increment (source of truth)

---

## Benefits of COPIED Approach

### 1. Self-Contained Documentation
User Stories are readable without navigating to increment files:

```markdown
# specs/backend/FS-031/us-001-authentication.md

## Acceptance Criteria
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Implementation
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

**Reader gets**:
- All ACs for this User Story
- All implementation tasks
- Current completion status
- No need to navigate elsewhere

### 2. Survives Increment Archiving
When increment is archived, COPIED content remains in living docs:

```
Before archiving:
.specweave/increments/0031/ ← Source of truth
.specweave/docs/internal/specs/backend/FS-031/us-001.md ← COPIED content

After archiving:
.specweave/increments/_archive/0031/ ← Archived
.specweave/docs/internal/specs/backend/FS-031/us-001.md ← Still readable!
```

### 3. Project-Specific Content
Each User Story contains only relevant content:

```markdown
# Backend User Story (only backend ACs and tasks)
- AC-US1-01: JWT token (backend)
- T-001: Setup JWT service

# Frontend User Story (only frontend ACs and tasks)
- AC-US1-03: Login form (frontend)
- T-003: Build login component
```

### 4. GitHub Integration
COPIED content becomes checkable checkboxes in GitHub issues:

```markdown
# GitHub Issue: US-001 Authentication (Backend)

## Acceptance Criteria
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Subtasks
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

**Stakeholders can**:
- Check/uncheck boxes to track progress
- See all relevant ACs and tasks
- No repository access needed

---

## Technical Implementation

### Copy Process

**Command**: `/specweave:sync-docs`

**Steps**:
1. Read increment spec.md (all ACs)
2. Read increment tasks.md (all tasks)
3. For each User Story:
   - Filter ACs by project keyword
   - Filter tasks by AC-ID
   - Preserve checkbox status
   - Write to User Story file

**Pseudocode**:
```typescript
async copyToUserStory(userStory: UserStory, increment: Increment) {
  // Step 1: Filter ACs by project
  const acs = increment.spec.acs
    .filter(ac => ac.project === userStory.project);

  // Step 2: Extract AC-IDs
  const acIds = acs.map(ac => ac.id); // ['AC-US1-01', 'AC-US1-02']

  // Step 3: Filter tasks by AC-ID
  const tasks = increment.tasks
    .filter(task => acIds.includes(task.acId));

  // Step 4: Update User Story file
  await this.writeUserStory(userStory, {
    acceptanceCriteria: acs,  // COPIED ACs
    implementation: tasks      // COPIED tasks
  });
}
```

### Sync Process

**Three-Layer Sync** ensures COPIED content stays synchronized:

```typescript
class CopiedContentSyncManager {
  // When increment changes
  async syncFromIncrement(incrementId: string) {
    // Step 1: Read increment (source of truth)
    const increment = await this.readIncrement(incrementId);

    // Step 2: Find all User Stories for this increment
    const userStories = await this.findUserStories(incrementId);

    // Step 3: Re-copy ACs and tasks to each User Story
    for (const us of userStories) {
      await this.copyToUserStory(us, increment);
    }

    // Step 4: Sync to GitHub
    await this.syncToGitHub(userStories);
  }

  // When User Story changes (from GitHub)
  async syncFromUserStory(userStory: UserStory, acId: string, completed: boolean) {
    // Step 1: Update User Story file
    await this.updateUserStoryAC(userStory, acId, completed);

    // Step 2: Update increment spec.md (source of truth)
    const increment = await this.findIncrement(userStory);
    await this.updateIncrementAC(increment, acId, completed);
  }
}
```

---

## Comparison with Reference-Based Approaches

| Aspect | COPIED (SpecWeave) | REFERENCED (Traditional) |
|--------|-------------------|--------------------------|
| **Readability** | Self-contained, no navigation | Requires clicking links |
| **Archiving** | Survives increment archiving | Breaks when increment archived |
| **Project Filtering** | Automatic (backend vs frontend) | Manual navigation required |
| **GitHub Integration** | Checkable checkboxes | Links only, no checkboxes |
| **Status Sync** | Bidirectional, automatic | Manual or no sync |
| **Documentation Quality** | High (complete info in one place) | Low (fragmented across files) |
| **Maintenance** | Automatic (via sync commands) | Manual updates |

---

## User Story File Structure

**Complete Example**:

```markdown
# US-001: Implement Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../_features/_archive/FS-031/FEATURE.md)
**Epic**: [Epic-123: Authentication System](../../_epics/epic-123.md)

---

## Description

Implement backend authentication using JWT tokens, including token generation,
validation, and protected route middleware.

---

## Acceptance Criteria (COPIED from increment spec.md, filtered by backend)

- [x] **AC-US1-01**: JWT token generation (backend) (P1)
  - Generate secure JWT tokens on successful login
  - Include user ID and role in token payload
  - Set appropriate expiration time (24 hours)

- [ ] **AC-US1-02**: Protected routes (backend) (P1)
  - Middleware validates JWT token
  - Unauthorized requests return 401
  - Token expiration handled correctly

---

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)

### JWT Token Generation (AC-US1-01)
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint

### Protected Routes (AC-US1-02)
- [ ] **T-005**: Create auth middleware
- [ ] **T-006**: Apply middleware to protected routes

---

## Technical Notes

- Using `jsonwebtoken` library (v9.0.0)
- Token secret stored in environment variable
- RS256 algorithm for token signing

---

**Status**: In Progress (50% complete)
**Last Updated**: 2025-11-16
**Increment**: [0031-external-tool-status-sync](../../../increments/0031/)
```

---

## Best Practices

### For Developers

1. **Trust the Increment**: Always update increment spec.md and tasks.md first
2. **Sync Regularly**: Run `/specweave:sync-docs` to propagate changes
3. **Verify Filtering**: Check User Stories have correct project-specific content
4. **Validate Status**: Ensure checkbox status matches code completion

### For Documentation Writers

1. **Don't Edit User Stories Directly**: Changes will be overwritten on next sync
2. **Update Increment Instead**: Edit spec.md or tasks.md, then sync
3. **Use Descriptive Headers**: Note "(COPIED from increment spec.md)" for clarity
4. **Link to Increment**: Include link to source increment for reference

### For Teams

1. **Single Source of Truth**: Increment files are definitive
2. **Automatic Sync**: Use commands, don't copy manually
3. **Project Keywords**: Use consistent keywords (backend), (frontend), (mobile)
4. **AC-ID References**: Always include AC-ID in task descriptions

---

## Common Questions

### Q: Why copy instead of reference?
**A**: COPIED content creates self-contained, readable documentation that survives increment archiving and integrates with GitHub checkboxes.

### Q: Does COPIED content get out of sync?
**A**: No - the [Three-Layer Architecture](three-layer-architecture.md) keeps all layers synchronized bidirectionally.

### Q: Can I edit User Story ACs/tasks directly?
**A**: No - edit the increment files (source of truth) and run sync commands. Direct edits will be overwritten.

### Q: What happens when increment is archived?
**A**: COPIED content in User Stories remains readable. The increment becomes archived reference.

### Q: How does project filtering work?
**A**: ACs filtered by keywords like "(backend)", tasks filtered by AC-ID relationships.

---

## Related Concepts

- **[Three-Layer Architecture](three-layer-architecture.md)**: Synchronization pattern for COPIED content
- **[Living Docs](living-docs.md)**: Destination for COPIED User Stories
- **[Project-Specific Tasks](project-specific-tasks.md)**: How tasks are filtered by project
- **[Source of Truth](source-of-truth.md)**: Increment as definitive status
- **[User Story](user-story.md)**: Container for COPIED ACs and tasks

---

## Summary

**COPIED ACs and Tasks** is SpecWeave's approach where:

- Acceptance Criteria and tasks are **copied** from increment to User Story files
- Content is **filtered** by project (backend/frontend/mobile) and AC-ID
- Checkbox status is **synchronized** bidirectionally via Three-Layer Architecture
- User Stories are **self-contained** and survive increment archiving
- GitHub issues show **checkable checkboxes** for ACs and tasks

**Benefits**: Readability, self-contained docs, GitHub integration, automatic sync

**Key Difference**: COPIED (readable, survives archiving) vs REFERENCED (breaks when archived)

---

**Last Updated**: 2025-11-16
**Related Increment**: [0037-project-specific-tasks](../../../increments/0037-project-specific-tasks/)
