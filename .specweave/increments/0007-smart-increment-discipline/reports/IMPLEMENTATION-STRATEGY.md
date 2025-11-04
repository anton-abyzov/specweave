# Implementation Strategy: Increment 0007

**Document**: Technical implementation strategy and shortcuts design
**Created**: 2025-11-03
**Status**: Implementation Guide

---

## Executive Summary

This increment combines TWO major features:
1. **Part 1: Test-Aware Planning** (P1, Foundation)
2. **Part 2: Smart Status Management** (P2, Enhancement)

**Key Innovation**: Command shortcuts (e.g., `/pause` instead of `/specweave:pause`)

---

## Command Shortcuts Design

### Problem

Current commands are verbose:
```bash
/specweave:inc "feature"        # 18 characters
/specweave:do                   # 13 characters
/specweave:pause 0006           # 17 characters + args
```

**Result**: Slower workflow, more typing

### Solution: Dual-Form Commands

Each command gets TWO forms:
1. **Namespace form** (explicit, no conflicts): `/specweave:pause`
2. **Short form** (convenient, daily use): `/pause`

**Implementation**:
```
plugins/specweave/commands/
├── specweave-pause.md      # Full: /specweave:pause
├── pause.md                 # Short: /pause
├── specweave-resume.md     # Full: /specweave:resume
├── resume.md                # Short: /resume
├── specweave-abandon.md    # Full: /specweave:abandon
└── abandon.md               # Short: /abandon
```

**Both files contain SAME content** (DRY via includes if needed, or accept duplication)

### Command Mapping

| Feature | Namespace Form | Short Form | Priority |
|---------|---------------|------------|----------|
| **Core Lifecycle** |
| Plan increment | `/specweave:inc` | `/inc` | ✅ Exists |
| Execute tasks | `/specweave:do` | `/do` | ✅ Exists |
| Complete increment | `/specweave:done` | `/done` | ✅ Exists |
| Check progress | `/specweave:progress` | `/progress` | ✅ Exists |
| **Status Management (NEW)** |
| Pause increment | `/specweave:pause` | `/pause` | 🆕 Part 2 |
| Resume increment | `/specweave:resume` | `/resume` | 🆕 Part 2 |
| Abandon increment | `/specweave:abandon` | `/abandon` | 🆕 Part 2 |
| Show status | `/specweave:status` | `/status` | ✅ Exists |
| **Test Coverage (NEW)** |
| Validate coverage | `/specweave:validate-coverage` | `/validate-coverage` | 🆕 Part 1 |
| Validate increment | `/specweave:validate` | `/validate` | ✅ Exists |

**Naming Principle**:
- Short forms should be intuitive, no namespace prefix
- Avoid conflicts with built-in commands (e.g., `/help`, `/clear`)
- Use full namespace if conflict risk exists

---

## Part 1: Test-Aware Planning Implementation

### Architecture

```
Increment Planning Flow (Enhanced):

1. User: /specweave:inc "Add search"
   ↓
2. PM Agent: Generate spec.md with AC-IDs
   spec.md:
   - AC-US1-01: Search by keyword
   - AC-US1-02: Search results paginated
   ↓
3. Architect Agent: Generate plan.md
   ↓
4. *** NEW *** test-aware-planner Agent:
   - Input: spec.md (AC-IDs), plan.md
   - Output: tests.md (TC-IDs mapped to AC-IDs)
   ↓
5. *** NEW *** test-aware-planner Agent:
   - Input: spec.md, plan.md, tests.md (TC-IDs)
   - Output: tasks.md (with Test Coverage sections)
   ↓
6. Validation:
   - Every AC has linked TC-IDs
   - Every task has Test Coverage section
   ↓
7. Present to user
```

### Components to Create

#### 1. PM Agent Update
**File**: `plugins/specweave/agents/pm/AGENT.md`

**Change**: Add AC-ID generation to user stories

**Format**:
```markdown
### US1: Add Search Feature

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Search by keyword returns relevant results
  - **Tests**: (filled by test-aware-planner)
  - **Priority**: P1

- [ ] **AC-US1-02**: Search results are paginated (50 per page)
  - **Tests**: (filled by test-aware-planner)
  - **Priority**: P1
```

#### 2. test-aware-planner Agent
**File**: `plugins/specweave/agents/test-aware-planner/AGENT.md`

**Role**: Generate tests.md and tasks.md with bidirectional links

**Inputs**:
- `spec.md` (with AC-IDs)
- `plan.md` (technical architecture)

**Outputs**:
1. `tests.md` (TC-IDs mapped to AC-IDs)
2. `tasks.md` (with Test Coverage sections)

**Algorithm**:
```
Step 1: Read spec.md → Extract AC-IDs
Step 2: Read plan.md → Understand technical approach
Step 3: Generate tests.md:
  - For each AC-ID, create 1-3 TC-IDs
  - Map TC-IDs back to AC-IDs
  - Include test type (unit/integration/e2e)
Step 4: Generate tasks.md:
  - For each task, add "Test Coverage" section
  - Reference TC-IDs that validate this task
  - Reference AC-IDs this task satisfies
Step 5: Validate bidirectional links
```

#### 3. increment-planner Skill Update
**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Change**: Add Step 4 (invoke test-aware-planner) and Step 5 (validate)

**New Flow**:
```
Step 0: Validation and setup
Step 1: Requirements Analysis (PM Agent)
Step 2: Solution Architecture (Architect Agent)
Step 3: Work Breakdown (Tech Lead Agent)
*** NEW Step 4: Test Planning (test-aware-planner Agent) ***
*** NEW Step 5: Coverage Validation (validate AC/TC/Task links) ***
Step 6: Quality Review (Quality Judge Agent)
Step 7: Finalization
```

#### 4. validate-coverage Command
**Files**:
- `plugins/specweave/commands/specweave-validate-coverage.md`
- `plugins/specweave/commands/validate-coverage.md` (shortcut)

**Functionality**:
```bash
/validate-coverage

Analyzing increment 0007...

📊 Acceptance Criteria Coverage:
✅ AC-US1-01: 2 tests (TC-001, TC-002)
✅ AC-US1-02: 2 tests (TC-003, TC-004)
✅ AC-US2-01: 3 tests (TC-006, TC-007, TC-008)
❌ AC-US3-01: 0 tests (NO COVERAGE!)

📊 Task Coverage:
✅ T-001: 2 tests (TC-001, TC-002)
✅ T-002: 1 test (TC-003)
❌ T-005: 0 tests (Documentation task - OK)
❌ T-008: 0 tests (NO COVERAGE!)

⚠️  Issues Found:
1. AC-US3-01 has no test coverage
2. T-008 is implementation task with no tests

Coverage: 85% (17/20 criteria tested)

Recommendation: Add tests for AC-US3-01 and T-008
```

---

## Part 2: Smart Status Management Implementation

### Architecture

```
Increment Status Model:

active ──pause──> paused ──resume──> active
  │                │
  │                └─abandon─> abandoned
  │
  └──complete──> completed
```

### Metadata Schema

**File**: `.specweave/increments/{id}/metadata.json`

```json
{
  "id": "0007-smart-increment-discipline",
  "status": "active",
  "type": "feature",
  "created": "2025-11-03T10:00:00Z",
  "lastActivity": "2025-11-03T15:30:00Z",
  "pausedReason": null,
  "pausedAt": null,
  "abandonedReason": null,
  "abandonedAt": null
}
```

**Status Enum**:
- `active` - Currently working
- `paused` - Temporarily stopped (blocked/deprioritized)
- `completed` - All done
- `abandoned` - Won't finish

**Type Enum**:
- `hotfix` - Critical production fix
- `feature` - Standard feature development
- `refactor` - Code improvement
- `experiment` - POC/spike work

### Components to Create

#### 1. Metadata Manager
**File**: `src/core/increment/metadata-manager.ts`

**Functions**:
```typescript
export class MetadataManager {
  static read(incrementId: string): IncrementMetadata;
  static write(incrementId: string, metadata: IncrementMetadata): void;
  static updateStatus(incrementId: string, status: IncrementStatus, reason?: string): void;
  static getActiveIncrements(): IncrementMetadata[];
  static getPausedIncrements(): IncrementMetadata[];
  static getByType(type: IncrementType): IncrementMetadata[];
}
```

#### 2. pause Command
**Files**:
- `plugins/specweave/commands/specweave-pause.md`
- `plugins/specweave/commands/pause.md` (shortcut)

**Implementation**:
```markdown
---
name: specweave:pause
description: Pause an active increment (blocked by external dependency)
---

# Pause Increment Command

**Usage**: `/specweave:pause <increment-id> --reason="<reason>"`

**Also available as**: `/pause` (shortcut)

**What It Does**:
1. Validates increment is "active"
2. Updates metadata.json: status = "paused"
3. Records pausedReason and pausedAt timestamp
4. Removes from active increment count
5. Shows updated status

**Example**:
```bash
/pause 0006 --reason="Waiting for Stripe API keys"

✅ Increment 0006 marked as paused
📝 Reason: Waiting for Stripe API keys
⏸️  No longer counts toward active limit
💡 Resume with: /resume 0006
```

**When to Use**:
- Blocked by external dependency (API keys, approvals)
- Waiting for another increment to complete
- Deprioritized (will return to later)
- Needs review before continuing

**Edge Cases**:
- If already paused: Show warning, update reason
- If completed: Error ("Cannot pause completed increment")
- If abandoned: Error ("Cannot pause abandoned increment")
```

#### 3. resume Command
**Files**:
- `plugins/specweave/commands/specweave-resume.md`
- `plugins/specweave/commands/resume.md` (shortcut)

**Implementation**:
```markdown
---
name: specweave:resume
description: Resume a paused increment
---

# Resume Increment Command

**Usage**: `/specweave:resume <increment-id>`

**Also available as**: `/resume` (shortcut)

**What It Does**:
1. Validates increment is "paused"
2. Updates metadata.json: status = "active"
3. Clears pausedReason and pausedAt
4. Adds to active increment count
5. Shows context (how long paused, last activity)

**Example**:
```bash
/resume 0006

✅ Increment 0006 resumed
⏱️  Was paused for: 3 days
💡 Last activity: Created plugin structure
📋 Continue with: /do
```

**Edge Cases**:
- If already active: Show warning, no change
- If completed: Error ("Increment already complete")
- If abandoned: Confirm ("Are you sure? This was abandoned because: {reason}")
```

#### 4. abandon Command
**Files**:
- `plugins/specweave/commands/specweave-abandon.md`
- `plugins/specweave/commands/abandon.md` (shortcut)

**Implementation**:
```markdown
---
name: specweave:abandon
description: Abandon an incomplete increment (requirements changed)
---

# Abandon Increment Command

**Usage**: `/specweave:abandon <increment-id> --reason="<reason>"`

**Also available as**: `/abandon` (shortcut)

**What It Does**:
1. Validates increment is not "completed"
2. Updates metadata.json: status = "abandoned"
3. Records abandonedReason and abandonedAt timestamp
4. Moves increment to `_abandoned/` folder
5. Removes from active increment count

**Example**:
```bash
/abandon 0008 --reason="Requirements changed - feature no longer needed"

✅ Increment 0008 marked as abandoned
📦 Moving to: .specweave/increments/_abandoned/0008-old-feature/
📝 Reason: Requirements changed - feature no longer needed
💾 All work preserved for reference

⚠️  This is permanent! To un-abandon, manually move back to increments/
```

**When to Use**:
- Requirements changed (feature obsolete)
- Approach was wrong (discovered better solution)
- Superseded by different work
- Experiment failed (spike didn't pan out)

**Edge Cases**:
- If completed: Error ("Cannot abandon completed increment")
- Confirmation prompt: "Are you sure? This is permanent."
```

#### 5. Enhanced status Command
**File**: `plugins/specweave/commands/specweave-status.md` (UPDATE)

**New Output**:
```bash
/status

📊 Increment Status Overview

🔥 Active (2):
  🚨 0005-payment-hotfix [hotfix] (90% done, 6 hours old)
     Tasks: 18/20 | Last: Fix Stripe webhook signature

  🔧 0006-i18n [feature] (50% done, 2 days old)
     Tasks: 10/20 | Last: Created translation pipeline

⏸️  Paused (1):
  🔄 0007-stripe-integration [feature] (30% done, paused 3 days)
     Reason: Waiting for Stripe API keys
     ⚠️  Paused for 3+ days - review or abandon?

✅ Completed (4):
  0001-core-framework
  0002-core-enhancements
  0003-intelligent-model-selection
  0004-plugin-architecture

📊 Summary:
  - Active: 2 increments (1 hotfix, 1 feature)
  - Paused: 1 increment
  - Completed: 4 increments
  - Context switching cost: 20-40% (2 active)

💡 Suggestions:
  - Complete 0005 first (high priority, 90% done)
  - Resume or abandon 0007 (stale)

Commands:
  /do              # Continue work on current increment
  /resume 0007     # Resume paused increment
  /abandon 0007    # Abandon if no longer needed
```

---

## Mermaid Diagram Updates

### Main Flow Diagram Update

**File**: `.specweave/docs/internal/architecture/diagrams/main-flow.md`

**Changes**:
1. Add "test-aware-planner" node after Architect
2. Add pause/resume/abandon flows
3. Update increment lifecycle states

**New Diagram**:
```mermaid
graph TD
    Start([User: /inc "feature"]) --> PM[PM Agent<br/>Generate spec.md with AC-IDs]
    PM --> Arch[Architect Agent<br/>Generate plan.md]
    Arch --> TestPlanner[test-aware-planner Agent<br/>Generate tests.md + tasks.md]
    TestPlanner --> Validate[Validate Coverage<br/>AC↔TC↔Task links]
    Validate --> Present[Present Plan to User]

    Present --> Do{User: /do}
    Do --> Active[Status: active]

    Active --> Work[Execute Tasks]
    Work --> Pause{Blocked?}
    Pause -->|Yes| PauseCmd[/pause<br/>Status: paused]
    Pause -->|No| Complete{Done?}

    PauseCmd --> Waiting[Waiting...]
    Waiting --> Resume[/resume<br/>Status: active]
    Resume --> Work

    Complete -->|Yes| Done[/done<br/>Status: completed]
    Complete -->|No| Work

    Active --> Obsolete{Obsolete?}
    Obsolete -->|Yes| Abandon[/abandon<br/>Status: abandoned<br/>Move to _abandoned/]
```

---

## Documentation Updates

### 1. Docusaurus Main Page
**File**: `docs-site/docs/index.md`

**Add sections**:
- "Test-Aware Planning" (new feature highlight)
- "Flexible Status Management" (pause/resume/abandon)
- Command shortcuts reference

### 2. Public Docs
**Files to update**:
- `docs-site/docs/guides/getting-started.md` - Add shortcuts
- `docs-site/docs/guides/increment-workflow.md` - Add pause/resume/abandon
- `docs-site/docs/commands/reference.md` - Add new commands

### 3. Internal Docs
**Files to update**:
- `.specweave/docs/internal/architecture/hld-system.md` - Update increment lifecycle
- `.specweave/docs/internal/architecture/diagrams/` - Update all diagrams
- `CLAUDE.md` - Update "Increment Discipline" section

### 4. README.md
**Keep short** - Link to docs:

```markdown
# SpecWeave

> Spec-driven development framework for Claude Code

## Quick Start

```bash
npm install -g specweave
specweave init
/inc "your feature"  # Plan increment
/do                   # Execute tasks
/done                 # Complete increment
```

## Key Features

✅ Test-Aware Planning - Bidirectional task↔test linking
✅ Smart Status Management - Pause/resume/abandon increments
✅ Living Documentation - Auto-sync on completion
✅ Plugin Architecture - Extend with custom capabilities

## Documentation

📖 [Full Documentation](https://spec-weave.com)
🚀 [Getting Started](https://spec-weave.com/guides/getting-started)
💬 [Discussions](https://github.com/anton-abyzov/specweave/discussions)

## License

MIT
```

---

## Implementation Order

### Phase 1: Foundation (Hours 1-8)
1. ✅ Create plan.md, tasks.md, tests.md
2. ✅ Update PM Agent (AC-ID generation)
3. ✅ Create test-aware-planner Agent
4. ✅ Update increment-planner Skill
5. ✅ Create /validate-coverage command

### Phase 2: Status Management (Hours 9-14)
6. ✅ Create metadata-manager.ts
7. ✅ Create /pause command (namespace + shortcut)
8. ✅ Create /resume command (namespace + shortcut)
9. ✅ Create /abandon command (namespace + shortcut)
10. ✅ Update /status command (rich output)

### Phase 3: Documentation (Hours 15-18)
11. ✅ Update Mermaid diagrams
12. ✅ Update Docusaurus main page
13. ✅ Update public docs (guides, commands)
14. ✅ Update internal docs (ADRs, architecture)
15. ✅ Update README.md (short version)

### Phase 4: Testing & Validation (Hours 19-20)
16. ✅ Write tests for new components
17. ✅ Run E2E tests
18. ✅ Integration tests
19. ✅ Manual validation

---

## Success Criteria

**Part 1 (Test-Aware Planning)**:
- ✅ PM Agent generates AC-IDs
- ✅ test-aware-planner creates bidirectional links
- ✅ /validate-coverage works
- ✅ New increments (0008+) use new format

**Part 2 (Status Management)**:
- ✅ /pause, /resume, /abandon work
- ✅ Shortcuts (/pause vs /specweave:pause) both work
- ✅ metadata.json created/updated correctly
- ✅ /status shows rich information

**Documentation**:
- ✅ Mermaid diagrams updated
- ✅ Docusaurus main page highlights new features
- ✅ All public docs updated
- ✅ README.md short and clear

---

**Status**: Implementation Guide
**Next**: Create plan.md, then begin autonomous implementation
