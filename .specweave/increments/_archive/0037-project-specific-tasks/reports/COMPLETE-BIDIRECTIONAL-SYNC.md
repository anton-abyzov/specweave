# ✅ COMPLETE BIDIRECTIONAL SYNC: ACs + Tasks + Feature Links

**Date**: 2025-11-16
**Status**: ✅ COMPLETE UNDERSTANDING

---

## Your Complete Requirements

> "just to be clear GH issue MUST have link to feature (which is in living docs /specs root folder separate _features folder, there also might be _epics connected to a feature for ado/jira)."
>
> "And GH issue as its synced to in fact US MUST have Acceptance Criteria section (copy-pasted) which is also in sync with specs/<project>/US-XXX which in turn is in sync with increment spec.md US ACs !!! so bidirectional sync works here!"

---

## Complete GitHub Issue Structure

```markdown
# US-001: Implement Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../specs/_features/FS-031/FEATURE.md)
**Epic** (if exists for ADO/JIRA): [Epic-123](../../specs/_epics/epic-123.md)

## Acceptance Criteria (synced bidirectionally!)
- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Protected routes (backend) (P1)

## Subtasks (synced bidirectionally!)
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint
- [ ] **T-003**: Add middleware

---

**Bidirectional Sync**:
- **ACs**: GitHub ↔ specs/backend/FS-031/us-001.md ↔ increment spec.md
- **Tasks**: GitHub ↔ specs/backend/FS-031/us-001.md (Implementation) ↔ increment tasks.md

**Links**:
- User Story: [specs/backend/FS-031/us-001.md](link)
- Feature: [specs/_features/FS-031/FEATURE.md](link)
```

---

## File Structure

```
.specweave/
├── increments/0031-external-tool-status-sync/
│   ├── spec.md (SOURCE OF TRUTH for ACs)
│   └── tasks.md (SOURCE OF TRUTH for Tasks)
│
└── docs/internal/specs/
    ├── _features/
    │   └── FS-031/
    │       └── FEATURE.md (Feature definition)
    │
    ├── _epics/ (optional, for ADO/JIRA)
    │   └── epic-123.md
    │
    ├── backend/
    │   └── FS-031/
    │       └── us-001-authentication.md
    │           ├── ## Acceptance Criteria (copied)
    │           └── ## Implementation (tasks)
    │
    └── frontend/
        └── FS-031/
            └── us-001-authentication.md
                ├── ## Acceptance Criteria (copied)
                └── ## Implementation (tasks)
```

---

## TWO Three-Layer Bidirectional Syncs

### 1. Acceptance Criteria Sync

```
┌─────────────────────────────────────────────────────────────┐
│         LAYER 1: GitHub Issue Acceptance Criteria           │
│                                                             │
│  ## Acceptance Criteria                                     │
│  - [x] **AC-US1-01**: JWT token generation (backend)       │
│  - [ ] **AC-US1-02**: Protected routes (backend)           │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ↕ (THREE-LAYER SYNC)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│    LAYER 2: Living Docs User Story Acceptance Criteria      │
│         (specs/backend/FS-031/us-001.md)                    │
│                                                             │
│  ## Acceptance Criteria                                     │
│  - [x] **AC-US1-01**: JWT token generation (backend)       │
│  - [ ] **AC-US1-02**: Protected routes (backend)           │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ↕ (THREE-LAYER SYNC)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│       LAYER 3: Increment spec.md (Source of Truth)          │
│      (.specweave/increments/0031/spec.md)                   │
│                                                             │
│  ## US-001: Implement Authentication                        │
│  **Acceptance Criteria**:                                   │
│  - [x] **AC-US1-01**: JWT token generation (backend)       │
│  - [ ] **AC-US1-02**: Protected routes (backend)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Tasks (Subtasks) Sync

```
┌─────────────────────────────────────────────────────────────┐
│           LAYER 1: GitHub Issue Subtasks                     │
│                                                             │
│  ## Subtasks                                                │
│  - [x] **T-001**: Setup JWT service                        │
│  - [ ] **T-002**: Create login API endpoint                │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ↕ (THREE-LAYER SYNC)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│    LAYER 2: Living Docs User Story Implementation           │
│         (specs/backend/FS-031/us-001.md)                    │
│                                                             │
│  ## Implementation                                          │
│  - [x] **T-001**: Setup JWT service                        │
│  - [ ] **T-002**: Create login API endpoint                │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ↕ (THREE-LAYER SYNC)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│       LAYER 3: Increment tasks.md (Source of Truth)         │
│      (.specweave/increments/0031/tasks.md)                  │
│                                                             │
│  - [x] **T-001**: Setup JWT service (AC-US1-01)            │
│  - [ ] **T-002**: Create API endpoint (AC-US1-01)          │
│  - [ ] **T-003**: Build login form (AC-US1-02)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Sync Flows

### Flow 1: User Checks AC in GitHub

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: User Action                                          │
│ Stakeholder checks AC in GitHub Issue:                       │
│ - [ ] AC-US1-02: Protected routes → [x]                      │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: GitHub Sync Detects Change                           │
│ - GitHub webhook fires                                        │
│ - specweave-github:sync command runs                          │
│ - Detects AC checkbox change for AC-US1-02                   │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Living Docs User Story AC Updated                    │
│ File: specs/backend/FS-031/us-001.md                         │
│                                                               │
│ ## Acceptance Criteria                                        │
│ - [x] AC-US1-01: JWT token generation                        │
│ - [x] AC-US1-02: Protected routes ← UPDATED!                 │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Increment spec.md Updated (Source of Truth)          │
│ File: .specweave/increments/0031/spec.md                     │
│                                                               │
│ ## US-001: Implement Authentication                           │
│ **Acceptance Criteria**:                                      │
│ - [x] AC-US1-01: JWT token generation (backend)              │
│ - [x] AC-US1-02: Protected routes (backend) ← UPDATED!       │
└───────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Developer Updates Increment spec.md

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Developer Action                                     │
│ Developer completes AC validation and updates increment:      │
│ - [ ] AC-US1-03: Secure storage → [x]                        │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Living Docs Sync Detects Change                      │
│ - /specweave:sync-docs command runs                          │
│ - Detects increment spec.md change for AC-US1-03             │
│ - Reads increment spec.md (source of truth)                  │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Living Docs User Story AC Updated                    │
│ File: specs/backend/FS-031/us-001.md                         │
│                                                               │
│ ## Acceptance Criteria                                        │
│ - [x] AC-US1-01: JWT token generation                        │
│ - [x] AC-US1-02: Protected routes                            │
│ - [x] AC-US1-03: Secure storage ← UPDATED!                   │
└──────────────────┬───────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: GitHub Issue AC Checkboxes Updated                   │
│ - specweave-github:sync command runs                          │
│ - Reads Living Docs User Story Acceptance Criteria            │
│ - Updates GitHub issue AC checkboxes                          │
│                                                               │
│ Issue #123: US-001 Authentication (Backend)                  │
│ ## Acceptance Criteria                                        │
│ - [x] AC-US1-01: JWT token generation                        │
│ - [x] AC-US1-02: Protected routes                            │
│ - [x] AC-US1-03: Secure storage ← UPDATED!                   │
└───────────────────────────────────────────────────────────────┘
```

---

## Feature & Epic Links

### _features Folder Structure

```
.specweave/docs/internal/specs/_features/
├── FS-031/
│   ├── FEATURE.md (Feature definition)
│   ├── us-001.md → ../../backend/FS-031/us-001.md (symlink)
│   ├── us-002.md → ../../frontend/FS-031/us-002.md (symlink)
│   └── README.md (Feature overview)
│
└── FS-032/
    └── FEATURE.md
```

**Feature File** (`specs/_features/FS-031/FEATURE.md`):
```markdown
# FS-031: External Tool Status Sync

## Description
Bidirectional synchronization between SpecWeave and external tools (GitHub, JIRA, ADO).

## User Stories
- [US-001: Implement Authentication (Backend)](../../backend/FS-031/us-001.md)
- [US-002: Implement Authentication (Frontend)](../../frontend/FS-031/us-002.md)
- [US-003: GitHub Sync Integration](../../backend/FS-031/us-003.md)

## Epics (for ADO/JIRA)
- [Epic-123: Authentication System](../../_epics/epic-123.md)

## Status
- **Status**: In Progress
- **Completion**: 40% (2/5 User Stories)
```

---

### _epics Folder Structure (Optional, for ADO/JIRA)

```
.specweave/docs/internal/specs/_epics/
└── epic-123.md
```

**Epic File** (`specs/_epics/epic-123.md`):
```markdown
# Epic-123: Authentication System

## Features
- [FS-031: External Tool Status Sync](../_features/FS-031/FEATURE.md)
- [FS-030: User Management](../_features/FS-030/FEATURE.md)

## User Stories
- [US-001: Implement Authentication (Backend)](../backend/FS-031/us-001.md)
- [US-002: Implement Authentication (Frontend)](../frontend/FS-031/us-002.md)

## Status
- **Status**: In Progress
- **Completion**: 30% (3/10 User Stories)
```

---

## GitHub Issue with All Links

```markdown
# US-001: Implement Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../specs/_features/FS-031/FEATURE.md)
**Epic**: [Epic-123: Authentication System](../../specs/_epics/epic-123.md)
**User Story**: [specs/backend/FS-031/us-001.md](../../specs/backend/FS-031/us-001.md)

---

## Acceptance Criteria
(Synced bidirectionally: GitHub ↔ Living Docs ↔ Increment spec.md)

- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Protected routes (backend) (P1)

## Subtasks
(Synced bidirectionally: GitHub ↔ Living Docs ↔ Increment tasks.md)

- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint
- [ ] **T-003**: Add middleware

---

**Progress**: 33% (1/3 ACs, 1/3 Subtasks)

**Links**:
- **Feature**: [FS-031: External Tool Status Sync](link)
- **Epic**: [Epic-123: Authentication System](link)
- **User Story**: [us-001-authentication.md](link)
- **Increment**: [0031-external-tool-status-sync](link)
```

---

## Summary

**Complete Requirements**:
- ✅ GitHub issue has link to Feature (`specs/_features/FS-XXX/FEATURE.md`)
- ✅ GitHub issue has link to Epic (if exists, for ADO/JIRA) (`specs/_epics/epic-XXX.md`)
- ✅ GitHub issue has link to User Story (`specs/<project>/FS-XXX/us-XXX.md`)
- ✅ **TWO bidirectional syncs**:
  1. **ACs**: GitHub ↔ Living Docs US ↔ Increment spec.md
  2. **Tasks**: GitHub ↔ Living Docs Implementation ↔ Increment tasks.md

**Three-Layer Architecture (for BOTH ACs and Tasks)**:
```
Layer 1: GitHub Issue (UI for stakeholders)
    ↕
Layer 2: Living Docs User Story (specs/<project>/FS-XXX/us-XXX.md)
    ↕
Layer 3: Increment (source of truth)
    - spec.md (for ACs)
    - tasks.md (for Tasks)
```

**Result**: COMPLETE UNDERSTANDING! 🎉

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Status**: ✅ COMPLETE BIDIRECTIONAL SYNC ARCHITECTURE
