# Three-Layer Architecture

**Category**: Architecture
**Related Terms**: [Bidirectional Sync](bidirectional-sync.md), [Living Docs](living-docs.md), [Source of Truth](source-of-truth.md), [GitHub Integration](../../guides/github-integration.md)

---

## Definition

The **Three-Layer Architecture** is SpecWeave's data synchronization pattern that ensures consistency between the increment (source of truth), living documentation (middle layer), and external tools like GitHub (visualization layer). Each layer serves a distinct purpose, and data flows bidirectionally through all three layers.

## The Three Layers

### Layer 1: GitHub Issue (Visualization Layer)
**Purpose**: Provides a user-friendly interface for stakeholders to track progress

**Characteristics**:
- Checkable checkboxes for Acceptance Criteria (ACs)
- Checkable subtasks for implementation tasks
- No repository access required
- Mobile-friendly stakeholder UI
- Familiar GitHub interface

**Example**:
```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Subtasks
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

### Layer 2: Living Docs User Story (Middle Layer)
**Purpose**: Connects external tools with increment source of truth

**Characteristics**:
- Project-specific (e.g., `specs/backend/FS-031/us-001.md`)
- Part of living documentation
- Version controlled in repository
- Mediates between GitHub and Increment
- Contains COPIED ACs and tasks (not references)

**Example**:
```markdown
# US-001: Implement Authentication (Backend)

## Acceptance Criteria (COPIED from increment spec.md)
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

## Implementation (COPIED tasks from increment tasks.md)
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

### Layer 3: Increment (Source of Truth)
**Purpose**: Single source of truth for all work statuses

**Characteristics**:
- Definitive status (no conflicts)
- Single file for all ACs (`spec.md`)
- Single file for all tasks (`tasks.md`)
- Easy to validate (code vs status)
- No duplication

**Example**:
```markdown
# .specweave/increments/0031/spec.md
## US-001: Implement Authentication
**Acceptance Criteria**:
- [x] AC-US1-01: JWT token generation (backend)
- [ ] AC-US1-02: Protected routes (backend)

# .specweave/increments/0031/tasks.md
- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
```

---

## Two Independent Sync Flows

The three-layer architecture supports **TWO separate bidirectional flows**:

### Flow 1: Increment → Living Docs → GitHub
**Trigger**: Developer completes work and updates increment

```
┌─────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)       │
│ - Developer marks AC/task complete         │
│ - [x] T-001: Setup JWT service             │
└──────────────────┬──────────────────────────┘
                   ↓
          (COPY to living docs)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY             │
│ - Implementation section updates            │
│ - [x] T-001: Setup JWT service             │
└──────────────────┬──────────────────────────┘
                   ↓
          (GitHub sync)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                       │
│ - Subtask checkbox updates                  │
│ - [x] T-001: Setup JWT service             │
└─────────────────────────────────────────────┘
```

**Flow Steps**:
1. Developer completes JWT service implementation
2. Developer updates increment tasks.md: `[x] T-001`
3. Living docs sync runs (`/specweave:sync-docs`)
4. User Story Implementation section updated
5. GitHub sync runs (`/specweave-github:sync`)
6. GitHub issue subtask checkbox updated

### Flow 2: GitHub → Living Docs → Increment
**Trigger**: Stakeholder checks checkbox in GitHub issue

```
┌─────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                       │
│ - Stakeholder checks subtask                │
│ - [ ] T-002 → [x] T-002                    │
└──────────────────┬──────────────────────────┘
                   ↓
          (GitHub sync detects change)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY             │
│ - Implementation section updates            │
│ - [x] T-002: Create login API              │
└──────────────────┬──────────────────────────┘
                   ↓
          (Living docs sync)
                   ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)       │
│ - tasks.md updates                          │
│ - [x] T-002: Create login API              │
└─────────────────────────────────────────────┘
```

**Flow Steps**:
1. Stakeholder reviews GitHub issue
2. Stakeholder checks subtask: `[x] T-002`
3. GitHub webhook fires (or manual sync)
4. Living Docs User Story Implementation section updates
5. Increment tasks.md updates (source of truth)

---

## Why Three Layers?

### Separation of Concerns
- **Layer 1 (GitHub)**: Stakeholder visibility and tracking
- **Layer 2 (Living Docs)**: Documentation and project organization
- **Layer 3 (Increment)**: Implementation source of truth

### Benefits
- **Stakeholder Access**: Non-developers can track progress via GitHub UI
- **Project Organization**: Living docs organize by project (backend/frontend/mobile)
- **Single Source of Truth**: Increment remains the definitive status
- **Conflict Resolution**: Increment always wins in case of sync conflicts
- **Validation**: Easy to verify code exists for completed tasks

### Clarity
Each layer has a clear role:
- GitHub = UI for stakeholders
- Living Docs = Project-specific documentation
- Increment = Source of truth

---

## TWO Independent Three-Layer Syncs

The architecture actually implements **TWO separate three-layer syncs**:

### 1. Acceptance Criteria (ACs) Sync
```
GitHub Issue Acceptance Criteria (checkboxes)
    ↕ (bidirectional)
Living Docs User Story Acceptance Criteria
    ↕ (bidirectional)
Increment spec.md (SOURCE OF TRUTH)
```

### 2. Tasks (Subtasks) Sync
```
GitHub Issue Subtasks (checkboxes)
    ↕ (bidirectional)
Living Docs User Story Implementation
    ↕ (bidirectional)
Increment tasks.md (SOURCE OF TRUTH)
```

Both syncs operate independently but follow the same three-layer pattern.

---

## Conflict Resolution

**Question**: What if GitHub and Increment get out of sync?

**Answer**: Increment is the SOURCE OF TRUTH. Always trust it!

**Example Scenario**:
```
GitHub shows: [x] T-002 (checked)
Increment shows: [ ] T-002 (unchecked)

Resolution:
1. Read increment tasks.md (source of truth)
2. T-002 is incomplete → That's the truth
3. Update Living Docs: [ ] T-002
4. Update GitHub: [ ] T-002
5. Increment wins!
```

---

## Validation & Reopen Mechanism

The three-layer architecture supports validation that propagates through all layers:

```
┌─────────────────────────────────────────────┐
│ STEP 1: Validation Command                 │
│ - /specweave:validate 0031                  │
│ - Check if code exists for T-001            │
│ - Result: FILE NOT FOUND!                   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 2: Reopen in Increment (Layer 3)      │
│ - [ ] T-001: Setup JWT service ← REOPENED  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 3: Propagate to Living Docs (Layer 2) │
│ - [ ] T-001: Setup JWT service ← REOPENED  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 4: Propagate to GitHub (Layer 1)      │
│ - [ ] T-001: Setup JWT service ← REOPENED  │
│ - Comment: "❌ Code not found"              │
└─────────────────────────────────────────────┘
```

**Key Points**:
- Validation checks code existence
- Reopen starts at increment (source of truth)
- Propagates through all three layers
- GitHub comment explains why

---

## Technical Implementation

### Sync Manager Pattern

```typescript
class ThreeLayerSyncManager {
  // Flow 1: Increment → Living Docs → GitHub
  async syncFromIncrement(incrementId: string, taskId: string, completed: boolean) {
    // Step 1: Find User Stories that reference this task
    const userStories = await this.findUserStoriesByTask(taskId);

    // Step 2: Update Living Docs Implementation sections
    for (const us of userStories) {
      await this.updateUserStoryImplementation(us, taskId, completed);
    }

    // Step 3: Update GitHub issue subtasks
    const issues = await this.findGitHubIssuesByUserStories(userStories);
    for (const issue of issues) {
      await this.updateGitHubSubtask(issue, taskId, completed);
    }
  }

  // Flow 2: GitHub → Living Docs → Increment
  async syncFromGitHub(issueId: number, taskId: string, completed: boolean) {
    // Step 1: Find User Story from GitHub issue
    const userStory = await this.findUserStoryByIssue(issueId);

    // Step 2: Update Living Docs Implementation section
    await this.updateUserStoryImplementation(userStory, taskId, completed);

    // Step 3: Update Increment tasks.md (source of truth)
    const increment = await this.findIncrementByTask(taskId);
    await this.updateIncrementTask(increment, taskId, completed);
  }
}
```

---

## Use Cases

### Use Case 1: Developer Completes Task
**Scenario**: Developer finishes implementing JWT service

**Flow**:
1. Developer updates increment tasks.md: `[x] T-001`
2. Run `/specweave:sync-docs` to update living docs
3. Run `/specweave-github:sync` to update GitHub
4. Stakeholder sees checked subtask in GitHub issue

**Result**: Three layers synchronized, stakeholder sees progress

### Use Case 2: Stakeholder Tracks Progress
**Scenario**: Stakeholder reviews work and marks task complete

**Flow**:
1. Stakeholder checks GitHub subtask: `[x] T-002`
2. GitHub webhook triggers sync
3. Living Docs User Story Implementation updates
4. Increment tasks.md updates (source of truth)

**Result**: Developer sees stakeholder's tracking in increment

### Use Case 3: Validation Finds Missing Code
**Scenario**: Task marked complete but code doesn't exist

**Flow**:
1. Run `/specweave:validate 0031`
2. Validation detects T-001 marked complete but code missing
3. Reopen in increment tasks.md: `[ ] T-001`
4. Propagate to living docs and GitHub
5. GitHub comment explains issue

**Result**: All three layers reopened, stakeholder notified

---

## Best Practices

### For Developers
- Update increment files (spec.md, tasks.md) first
- Run `/specweave:sync-docs` to propagate to living docs
- Run `/specweave-github:sync` to update GitHub
- Verify GitHub issue reflects your changes

### For Stakeholders
- Check/uncheck boxes in GitHub issues
- Sync happens automatically (or manually via command)
- Changes propagate to living docs and increment
- No repository access needed

### For Teams
- Trust the increment as source of truth
- Use validation to verify code exists
- Keep all three layers synchronized
- Resolve conflicts by favoring increment status

---

## Related Concepts

- **[Bidirectional Sync](bidirectional-sync.md)**: How data flows in both directions
- **[Living Docs](living-docs.md)**: Middle layer documentation
- **[Source of Truth](source-of-truth.md)**: Increment as definitive status
- **[COPIED ACs and Tasks](copied-acs-and-tasks.md)**: How content is copied, not referenced
- **[GitHub Integration](../../guides/github-integration.md)**: External tool sync

---

## Summary

The Three-Layer Architecture is SpecWeave's core synchronization pattern:

- **Layer 1 (GitHub)**: Stakeholder UI with checkable checkboxes
- **Layer 2 (Living Docs)**: Project-specific documentation (middle layer)
- **Layer 3 (Increment)**: Source of truth for all statuses

**TWO independent flows**:
1. **Increment → Living Docs → GitHub** (developer updates)
2. **GitHub → Living Docs → Increment** (stakeholder updates)

**TWO independent syncs**:
1. **Acceptance Criteria**: GitHub ACs ↔ Living Docs ACs ↔ Increment spec.md
2. **Tasks**: GitHub Subtasks ↔ Living Docs Implementation ↔ Increment tasks.md

**Benefits**: Clear separation of concerns, stakeholder access, single source of truth, validation support

---

**Last Updated**: 2025-11-16
**Related Increment**: [0037-project-specific-tasks](../../../increments/0037-project-specific-tasks/)
