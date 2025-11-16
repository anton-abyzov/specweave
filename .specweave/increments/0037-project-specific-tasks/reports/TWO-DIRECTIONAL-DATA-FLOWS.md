# ✅ TWO SEPARATE DIRECTIONAL DATA FLOWS

**Date**: 2025-11-16
**Status**: ✅ COMPLETE - TWO SEPARATE DIAGRAMS CREATED
**Increment**: 0037-project-specific-tasks

---

## User Requirement

> "in data flow visualize just 2 direction, don't combine in one!! from increment task or AC checked and from GH issue AC or task checked!!!"
> "just create 2 data flow diagrams"

**Requirement**: Create TWO separate data flow diagrams:
1. **Flow 1**: Increment → Living Docs → GitHub (Developer completes work)
2. **Flow 2**: GitHub → Living Docs → Increment (Stakeholder checks checkbox)

---

## Data Flow Diagram 1: Increment → Living Docs → GitHub

**Scenario**: Developer completes task/AC and marks it complete in increment

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)                        │
│                                                              │
│ .specweave/increments/0031/                                 │
│ ├── spec.md                                                 │
│ │   └── [x] AC-US1-01: JWT token generation (backend)      │
│ │                                                            │
│ └── tasks.md                                                │
│     └── [x] T-001: Setup JWT service (AC-US1-01)           │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (COPY to living docs - filtered by project/AC-ID)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY                             │
│                                                              │
│ specs/backend/FS-031/us-001-authentication.md               │
│                                                              │
│ ## Acceptance Criteria (COPIED from increment spec.md)     │
│ - [x] AC-US1-01: JWT token generation (backend)            │
│                                                              │
│ ## Implementation (COPIED tasks from increment tasks.md)   │
│ - [x] T-001: Setup JWT service                             │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (GitHub sync - visualize as checkboxes)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                                       │
│                                                              │
│ Issue #123: US-001 Authentication (Backend)                │
│                                                              │
│ ## Acceptance Criteria                                      │
│ - [x] AC-US1-01: JWT token generation (backend)            │
│                                                              │
│ ## Subtasks                                                  │
│ - [x] T-001: Setup JWT service                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Flow Description**:
1. Developer completes JWT service implementation
2. Developer updates increment tasks.md: `[x] T-001: Setup JWT service`
3. Developer updates increment spec.md: `[x] AC-US1-01: JWT token generation`
4. Living docs sync runs (`/specweave:sync-docs`)
5. User Story file updated with COPIED ACs and tasks (checkboxes synced)
6. GitHub sync runs (`/specweave-github:sync`)
7. GitHub issue checkboxes updated to match

**Key Points**:
- ✅ Increment is the **starting point** (source of truth)
- ✅ Living Docs receives COPIED content (filtered)
- ✅ GitHub visualizes as checkable checkboxes
- ✅ One-way flow: Increment → Living Docs → GitHub

---

## Data Flow Diagram 2: GitHub → Living Docs → Increment

**Scenario**: Stakeholder checks checkbox in GitHub issue

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                                       │
│                                                              │
│ Issue #123: US-001 Authentication (Backend)                │
│                                                              │
│ ## Acceptance Criteria                                      │
│ - [x] AC-US1-01: JWT token generation (backend) ← CHECKED! │
│                                                              │
│ ## Subtasks                                                  │
│ - [x] T-001: Setup JWT service ← CHECKED!                  │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (GitHub sync detects checkbox change)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY                             │
│                                                              │
│ specs/backend/FS-031/us-001-authentication.md               │
│                                                              │
│ ## Acceptance Criteria (synced from GitHub)                │
│ - [x] AC-US1-01: JWT token generation (backend) ← UPDATED! │
│                                                              │
│ ## Implementation (synced from GitHub)                      │
│ - [x] T-001: Setup JWT service ← UPDATED!                  │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (Living docs sync - update source of truth)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)                        │
│                                                              │
│ .specweave/increments/0031/                                 │
│ ├── spec.md                                                 │
│ │   └── [x] AC-US1-01: JWT token (backend) ← UPDATED!      │
│ │                                                            │
│ └── tasks.md                                                │
│     └── [x] T-001: Setup JWT service ← UPDATED!            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Flow Description**:
1. Stakeholder reviews GitHub issue
2. Stakeholder checks checkbox: `[x] T-001: Setup JWT service`
3. GitHub webhook fires (or manual sync)
4. GitHub sync detects checkbox change
5. User Story file updated with new checkbox status
6. Living docs sync propagates to increment
7. Increment tasks.md and spec.md updated (source of truth)

**Key Points**:
- ✅ GitHub is the **starting point** (stakeholder action)
- ✅ Living Docs receives status update
- ✅ Increment is **final destination** (source of truth updated)
- ✅ One-way flow: GitHub → Living Docs → Increment

---

## Why TWO Separate Diagrams?

### Clarity
- ✅ Each diagram shows ONE clear direction
- ✅ No confusion about which way data flows
- ✅ Easy to understand for developers and stakeholders

### Different Actors
- **Diagram 1**: Developer-initiated (completes work)
- **Diagram 2**: Stakeholder-initiated (tracks progress)

### Different Triggers
- **Diagram 1**: Code completion → increment update
- **Diagram 2**: Checkbox click → GitHub webhook

### Different Use Cases
- **Diagram 1**: Implementation workflow (dev → stakeholder visibility)
- **Diagram 2**: Progress tracking (stakeholder → source of truth sync)

---

## How They Work Together (Bidirectional Sync)

```
Developer completes work:
Increment → Living Docs → GitHub (Diagram 1)

Stakeholder updates status:
GitHub → Living Docs → Increment (Diagram 2)

Result: Both flows ensure consistency!
```

**Example Scenario**:

1. **Developer Flow** (Diagram 1):
   - Developer completes T-001
   - Updates increment tasks.md: `[x] T-001`
   - Sync propagates: Living Docs → GitHub
   - Stakeholder sees checkbox checked in GitHub

2. **Stakeholder Flow** (Diagram 2):
   - Stakeholder sees T-002 is actually done (developer forgot to check)
   - Stakeholder checks `[x] T-002` in GitHub
   - Sync propagates: Living Docs → Increment
   - Increment tasks.md updated: `[x] T-002`

**Result**: Both layers stay in sync, regardless of who initiates the change!

---

## Technical Implementation

### Flow 1: Increment → Living Docs → GitHub

**Trigger**: `/specweave:sync-docs` command

**Steps**:
1. Read increment spec.md and tasks.md (source of truth)
2. Filter ACs by project keywords (backend, frontend, mobile)
3. Filter tasks by AC-ID (only tasks for this User Story's ACs)
4. Update User Story file with COPIED ACs and tasks
5. Preserve checkbox status from increment
6. Trigger GitHub sync
7. Update GitHub issue body with new checkboxes

**Code Path**:
```typescript
// Simplified pseudocode
async syncIncrementToGitHub(incrementId: string) {
  // Step 1: Read source of truth
  const increment = await readIncrement(incrementId);

  // Step 2: Copy to Living Docs
  const userStories = await copyToLivingDocs(increment);

  // Step 3: Sync to GitHub
  for (const userStory of userStories) {
    await syncUserStoryToGitHub(userStory);
  }
}
```

---

### Flow 2: GitHub → Living Docs → Increment

**Trigger**: GitHub webhook OR `/specweave-github:sync` command

**Steps**:
1. Detect checkbox change in GitHub issue
2. Parse checkbox state (AC-US1-01: checked/unchecked)
3. Update Living Docs User Story file
4. Propagate to increment spec.md or tasks.md
5. Update source of truth checkbox status

**Code Path**:
```typescript
// Simplified pseudocode
async syncGitHubToIncrement(issueId: number, checkboxChange: Change) {
  // Step 1: Find User Story from GitHub issue
  const userStory = await findUserStoryByIssue(issueId);

  // Step 2: Update User Story file
  await updateUserStoryCheckbox(userStory, checkboxChange);

  // Step 3: Update Increment (source of truth)
  const increment = await findIncrementByUserStory(userStory);
  await updateIncrementCheckbox(increment, checkboxChange);
}
```

---

## Validation & Conflict Resolution

### Validation Flow (Reopen Mechanism)

**Scenario**: Task marked complete but code missing

```
Validate command checks:
1. Is T-001 marked [x] in increment tasks.md?
2. Does the code exist? (grep for "jwt-service.ts")
3. If NO → Reopen task

Reopen propagates through BOTH flows:
Flow 1 (Increment → GitHub): [ ] T-001
Flow 2 (GitHub sees change): Checkbox unchecked
```

**Implementation**:
```typescript
async validateTask(taskId: string) {
  const task = await findTaskInIncrement(taskId);

  if (task.completed && !codeExists(task)) {
    // Reopen in increment (source of truth)
    await reopenInIncrement(taskId);

    // Flow 1: Propagate to Living Docs and GitHub
    await syncIncrementToGitHub(task.incrementId);
  }
}
```

---

### Conflict Resolution

**Scenario**: GitHub and Increment out of sync

**Rule**: Increment ALWAYS wins (source of truth)

**Example**:
- GitHub shows: `[x] T-002` (checked)
- Increment shows: `[ ] T-002` (unchecked)

**Resolution**:
1. Read increment tasks.md (source of truth)
2. T-002 is unchecked → That's the truth
3. Flow 1: Update Living Docs → GitHub
4. GitHub checkbox unchecked: `[ ] T-002`

---

## Summary

**What We Now Have**:
- ✅ **TWO separate data flow diagrams** (not combined!)
- ✅ **Diagram 1**: Increment → Living Docs → GitHub (developer flow)
- ✅ **Diagram 2**: GitHub → Living Docs → Increment (stakeholder flow)
- ✅ **Clear directionality** in each diagram
- ✅ **Three-layer architecture** shown in both
- ✅ **Bidirectional sync** achieved through TWO independent flows

**Benefits**:
- ✅ Easier to understand (one direction per diagram)
- ✅ Clear actor roles (developer vs stakeholder)
- ✅ Separate triggers (code completion vs checkbox click)
- ✅ No confusion about data flow direction

**Result**: REQUIREMENT MET! 🎉

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Status**: ✅ TWO SEPARATE DIRECTIONAL DATA FLOWS CREATED
