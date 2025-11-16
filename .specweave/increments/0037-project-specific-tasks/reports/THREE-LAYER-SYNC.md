# ✅ THREE-LAYER BIDIRECTIONAL SYNC ARCHITECTURE

**Date**: 2025-11-16
**Status**: ✅ CORRECTLY UNDERSTOOD

---

## Your Correct Flow

> **Flow 1**: "Github subtasks checked → living docs specs FS US implementation is checked → increment tasks.md is checked"
>
> **Flow 2**: "increment per project tasks.md file has task, it becomes completed (checked) → living docs specs FS US imple tasks becomes checked → GH issue subtasks becomes checked !!!"

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 LAYER 1: GITHUB ISSUE                        │
│              (UI for Stakeholders)                          │
│                                                             │
│  Issue #123: US-001 Authentication (Backend)               │
│  ┌─────────────────────────────────────────────────┐      │
│  │ ## Subtasks                                      │      │
│  │ - [x] T-001: Setup JWT service                   │      │
│  │ - [ ] T-002: Create login API endpoint           │      │
│  └─────────────────────────────────────────────────┘      │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ ↕ (THREE-LAYER SYNC)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│          LAYER 2: LIVING DOCS USER STORY                     │
│           (specs/backend/FS-031/us-001.md)                  │
│                                                             │
│  # US-001: Implement Authentication (Backend)              │
│  ┌─────────────────────────────────────────────────┐      │
│  │ ## Implementation                                │      │
│  │ - [x] T-001: Setup JWT service                   │      │
│  │ - [ ] T-002: Create login API endpoint           │      │
│  └─────────────────────────────────────────────────┘      │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ ↕ (THREE-LAYER SYNC)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│        LAYER 3: INCREMENT TASKS.MD                           │
│         (Source of Truth)                                   │
│                                                             │
│  .specweave/increments/0031/tasks.md                       │
│  ┌─────────────────────────────────────────────────┐      │
│  │ - [x] **T-001**: Setup JWT service (AC-US1-01)   │      │
│  │ - [ ] **T-002**: Create API endpoint (AC-US1-01) │      │
│  │ - [ ] **T-003**: Build login form (AC-US1-02)    │      │
│  └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sync Flow 1: GitHub → Living Docs → Increment

**Scenario**: Stakeholder checks subtask in GitHub Issue

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: User Action                                          │
│ Stakeholder checks subtask in GitHub Issue:                  │
│ - [ ] T-002: Create login API endpoint → [x]                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: GitHub Sync Detects Change                           │
│ - GitHub webhook fires                                        │
│ - specweave-github:sync command runs                          │
│ - Detects checkbox change for T-002                           │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Living Docs User Story Implementation Updated        │
│ File: specs/backend/FS-031/us-001.md                         │
│                                                               │
│ ## Implementation                                             │
│ - [x] T-001: Setup JWT service                               │
│ - [x] T-002: Create login API endpoint ← UPDATED!            │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Increment tasks.md Updated (Source of Truth)         │
│ File: .specweave/increments/0031/tasks.md                    │
│                                                               │
│ - [x] **T-001**: Setup JWT service (AC-US1-01)               │
│ - [x] **T-002**: Create API endpoint (AC-US1-01) ← UPDATED!  │
│ - [ ] **T-003**: Build login form (AC-US1-02)                │
└───────────────────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ GitHub → Living Docs → Increment (in that order!)
- ✅ Living Docs is the MIDDLE layer, not a passthrough
- ✅ Increment tasks.md is updated LAST (source of truth)

---

## Sync Flow 2: Increment → Living Docs → GitHub

**Scenario**: Developer completes task and updates increment tasks.md

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Developer Action                                     │
│ Developer completes code and updates increment tasks.md:      │
│ - [ ] **T-003**: Build login form (AC-US1-02) → [x]          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Living Docs Sync Detects Change                      │
│ - /specweave:sync-docs command runs                          │
│ - Detects increment tasks.md change for T-003                │
│ - Reads increment tasks.md (source of truth)                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Living Docs User Story Implementation Updated        │
│ File: specs/frontend/FS-031/us-001.md                        │
│                                                               │
│ ## Implementation                                             │
│ - [x] T-003: Build login form ← UPDATED!                     │
│ - [ ] T-004: Add route protection                            │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: GitHub Issue Subtasks Updated                        │
│ - specweave-github:sync command runs                          │
│ - Reads Living Docs User Story Implementation                 │
│ - Updates GitHub issue subtasks                               │
│                                                               │
│ Issue #124: US-001 Authentication (Frontend)                 │
│ ## Subtasks                                                   │
│ - [x] T-003: Build login form ← UPDATED!                     │
│ - [ ] T-004: Add route protection                            │
└───────────────────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ Increment → Living Docs → GitHub (in that order!)
- ✅ Living Docs is the MIDDLE layer, not a passthrough
- ✅ GitHub issue is updated LAST (UI for stakeholders)

---

## Why Three Layers?

### Layer 1: GitHub Issue (UI for Stakeholders)
**Purpose**: Allows stakeholders to track progress without repository access

**Benefits**:
- ✅ Stakeholders can check/uncheck subtasks
- ✅ No need for repository access
- ✅ Familiar GitHub UI
- ✅ Mobile-friendly

**Example**:
```markdown
Issue #123: US-001 Authentication (Backend)

## Subtasks
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

---

### Layer 2: Living Docs User Story Implementation (Middle Layer)
**Purpose**: Connects GitHub UI with increment source of truth

**Benefits**:
- ✅ Project-specific (specs/backend/ vs specs/frontend/)
- ✅ Part of living documentation
- ✅ Version controlled
- ✅ Mediates between GitHub and Increment

**Example**:
```markdown
# US-001: Implement Authentication (Backend)

## Implementation
- [x] T-001: Setup JWT service
- [ ] T-002: Create login API endpoint
```

---

### Layer 3: Increment tasks.md (Source of Truth)
**Purpose**: Single source of truth for ALL task statuses across ALL projects

**Benefits**:
- ✅ One file with all tasks
- ✅ Definitive status (no conflicts)
- ✅ Easy to validate (code vs status)
- ✅ No duplication

**Example**:
```markdown
# Tasks

- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form (AC-US1-02)
- [ ] **T-004**: Add route protection (AC-US1-03)
```

---

## Conflict Resolution

**Question**: What if GitHub and Increment get out of sync?

**Answer**: Increment tasks.md is the SOURCE OF TRUTH. Always trust it!

```
Scenario: GitHub shows T-002 as complete, but increment tasks.md shows incomplete

Resolution:
1. Read increment tasks.md (source of truth)
2. T-002 is incomplete → That's the truth
3. Update Living Docs Implementation section: [ ] T-002
4. Update GitHub subtask: [ ] T-002
5. Increment wins!
```

---

## Validation & Reopen Flow

**Question**: What if task is marked complete but code is missing?

**Answer**: Validation reopens task in all three layers!

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Validation Command Runs                              │
│ - /specweave:validate 0031                                    │
│ - Checks increment tasks.md                                   │
│ - T-001 is marked complete [x]                                │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Code Verification                                     │
│ - Check if JWT service code exists                            │
│ - Search for: src/auth/jwt-service.ts                         │
│ - Result: FILE NOT FOUND!                                     │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Reopen in Increment tasks.md (Source of Truth)       │
│ File: .specweave/increments/0031/tasks.md                    │
│                                                               │
│ - [ ] **T-001**: Setup JWT service (AC-US1-01) ← REOPENED!   │
│   (Was [x], now [ ] because code missing)                    │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Propagate to Living Docs                              │
│ File: specs/backend/FS-031/us-001.md                         │
│                                                               │
│ ## Implementation                                             │
│ - [ ] T-001: Setup JWT service ← REOPENED!                   │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Propagate to GitHub                                   │
│ Issue #123: US-001 Authentication (Backend)                  │
│                                                               │
│ ## Subtasks                                                   │
│ - [ ] T-001: Setup JWT service ← REOPENED!                   │
│                                                               │
│ Comment added:                                                │
│ "❌ Task T-001 reopened: Code not found at                    │
│  src/auth/jwt-service.ts"                                    │
└───────────────────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ Validation checks code existence
- ✅ Reopen starts at increment tasks.md (source of truth)
- ✅ Propagates through all three layers
- ✅ GitHub comment explains why

---

## Implementation Details

### Sync Manager (Three-Layer Coordinator)

```typescript
class ThreeLayerSyncManager {
  // Flow 1: GitHub → Living Docs → Increment
  async syncFromGitHub(issueId: number, taskId: string, completed: boolean) {
    // Step 1: Find User Story from GitHub issue
    const userStory = await this.findUserStoryByIssue(issueId);

    // Step 2: Update Living Docs Implementation section
    await this.updateUserStoryImplementation(userStory, taskId, completed);

    // Step 3: Update Increment tasks.md (source of truth)
    const increment = await this.findIncrementByTask(taskId);
    await this.updateIncrementTask(increment, taskId, completed);

    console.log(`✅ Synced: GitHub → Living Docs → Increment (${taskId})`);
  }

  // Flow 2: Increment → Living Docs → GitHub
  async syncFromIncrement(incrementId: number, taskId: string, completed: boolean) {
    // Step 1: Find all User Stories that reference this task
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

    console.log(`✅ Synced: Increment → Living Docs → GitHub (${taskId})`);
  }
}
```

---

## Summary

**Your Correction**:
> "the flow is wrong!!"
> "should be Github subtasks checked → living docs specs FS US implementation is checked → increment tasks.md is checked"
> "increment per project tasks.md file has task, it becomes completed (checked) → living docs specs FS US implementation tasks becomes checked → GH issue subtasks becomes checked !!!"

**What We Now Have**:
- ✅ **Three-Layer Architecture**: GitHub ↔ Living Docs ↔ Increment
- ✅ **Flow 1**: GitHub → Living Docs → Increment (stakeholder updates)
- ✅ **Flow 2**: Increment → Living Docs → GitHub (developer updates)
- ✅ **Living Docs is the MIDDLE layer**, not a passthrough!
- ✅ **Increment tasks.md is the SOURCE OF TRUTH**
- ✅ **Validation propagates through all three layers**

**Result**: CORRECTLY UNDERSTOOD! 🎉

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Status**: ✅ THREE-LAYER SYNC ARCHITECTURE CONFIRMED
