# Increment Lifecycle Management Design

**Date**: 2025-10-26
**Status**: ✅ Design Complete
**Implementation**: Ready for coding

---

## Executive Summary

Complete increment lifecycle management system with:
- **5 status stages**: backlog → planned → in-progress → completed → closed
- **WIP limits**: Max 2-3 in progress (framework), max 1-2 (user projects)
- **Leftover transfer**: Automated migration of unfinished work
- **Closure reports**: Track completion, reasons for incompleteness
- **Task vs Increment rules**: Clear decision tree

---

## Problem Statement

### Current Issues

1. **No clear lifecycle** - When is an increment "done"?
2. **No leftover handling** - What happens to unfinished tasks?
3. **No WIP limits** - Can start infinite increments
4. **No closure ritual** - Missing retrospective/review phase
5. **Scope creep unchecked** - Tasks keep getting added indefinitely

### Real-World Scenario

```
001-core-framework [IN PROGRESS]
├── 50 tasks planned
├── 35 tasks completed ✅
├── 10 tasks in progress ⏳
└── 5 tasks not started ❌

Question: Can we close this increment and move on?
Answer: YES - with leftover transfer!
```

---

## Status Lifecycle

### 5-Stage Lifecycle

```
backlog → planned → in-progress → completed → closed
   ↓         ↓          ↓             ↓          ↓
 Idea    Ready to   Work      All done    Archived
         start      ongoing   & tested    & reviewed
```

### Status Definitions

#### 1. **backlog**
- **Definition**: Identified but not yet prioritized or planned
- **File location**: `.specweave/increments/_backlog/####-name.md` (lightweight spec)
- **Criteria**: Basic idea documented
- **Next step**: Promote to "planned" when prioritized

#### 2. **planned**
- **Definition**: Spec created, tasks defined, ready to start
- **File location**: `.specweave/increments/####-name/` (full structure)
- **Criteria**:
  - ✅ `spec.md` with user stories
  - ✅ `tasks.md` with implementation breakdown
  - ✅ Dependencies identified
  - ✅ Priority assigned (P1/P2/P3)
- **Next step**: Start work (change to "in-progress")

#### 3. **in-progress**
- **Definition**: Active development underway
- **Criteria**:
  - ✅ At least 1 task started
  - ✅ WIP limit not exceeded
  - ✅ Dependencies completed (if any)
- **Constraints**:
  - ⚠️ **WIP limit enforced**: Max 2-3 in progress (framework), max 1-2 (user projects)
  - ⚠️ Must complete or close before starting new increment (if at limit)
- **Next step**: Complete all critical tasks

#### 4. **completed**
- **Definition**: All P1 tasks done, tests passing, ready for review
- **Criteria**:
  - ✅ All P1 (critical) tasks completed
  - ✅ All tests passing
  - ✅ Documentation updated
  - ✅ Code reviewed (if team)
  - ❌ P2/P3 tasks MAY remain (can transfer)
- **Next step**: Review, then close

#### 5. **closed**
- **Definition**: Reviewed, accepted, archived
- **Criteria**:
  - ✅ All "completed" criteria met
  - ✅ Closure report generated
  - ✅ Leftovers transferred (if any)
  - ✅ Retrospective done (optional)
- **Result**: Increment archived, WIP slot freed

---

## Leftover Transfer Workflow

### When to Transfer Leftovers

**Valid reasons** to close with leftovers:
1. ✅ **Time-boxed completion** - 2 weeks up, 80% done is enough
2. ✅ **Lower priority work remains** - P2/P3 tasks can wait
3. ✅ **Scope clarification** - Some tasks no longer relevant
4. ✅ **Blocked tasks** - Waiting on external dependencies
5. ✅ **Pivot** - Business priorities changed

**Invalid reasons** ❌:
- Giving up on P1 tasks
- Skipping tests
- Avoiding difficult work

### Transfer Mechanism

#### Step 1: Identify Leftovers

Scan `tasks.md` for:
- ❌ `[ ]` - Not started
- ⏳ `[-]` - In progress (optional notation)

Categorize:
- **P1 incomplete** → ⚠️ Warning! Cannot close without addressing
- **P2/P3 incomplete** → Transfer allowed

#### Step 2: Create Transfer Log

**File**: `.specweave/increments/####-name/reports/closure-report.md`

```markdown
# Increment Closure Report

**Increment**: 001-core-framework
**Closed Date**: 2025-10-26
**Duration**: 3 months
**Status**: completed → closed

## Completion Summary

| Category | Planned | Completed | Remaining |
|----------|---------|-----------|-----------|
| P1 Tasks | 30 | 30 | 0 ✅ |
| P2 Tasks | 15 | 12 | 3 |
| P3 Tasks | 5 | 2 | 3 |
| **Total** | **50** | **44** | **6** |

**Completion Rate**: 88% (44/50 tasks)
**Critical Path**: 100% (30/30 P1 tasks)

## Transferred Tasks

### Transferred to 002-enhancements

**Reason**: Lower priority, not blocking MVP

| Task ID | Description | Priority | Transfer Reason |
|---------|-------------|----------|-----------------|
| T045 | Add caching to context-loader | P2 | Performance optimization, not critical |
| T046 | Add retry logic to skill-router | P2 | Error handling enhancement |
| T047 | Create skill usage analytics | P3 | Nice-to-have, monitoring feature |

### Canceled Tasks

**Reason**: No longer relevant after architecture changes

| Task ID | Description | Priority | Cancel Reason |
|---------|-------------|----------|---------------|
| T048 | Implement vector search | P3 | Deferred to v2.0 per product decision |
| T049 | Add GraphQL endpoint | P3 | REST API sufficient for MVP |
| T050 | Create skill marketplace | P3 | Out of scope for v1.0 |

## Retrospective (Optional)

**What went well**:
- ✅ Clear spec upfront reduced scope creep
- ✅ Test-first approach caught bugs early
- ✅ WIP limits improved focus

**What to improve**:
- ⚠️ Better task estimation (underestimated agent testing)
- ⚠️ More frequent reviews (caught design issues late)

## Sign-off

- [x] All P1 tasks completed
- [x] All tests passing
- [x] Documentation updated
- [x] Leftovers transferred to 002-enhancements
- [x] Retrospective completed

**Closed by**: [Name]
**Date**: 2025-10-26
```

#### Step 3: Transfer Tasks to New Increment

**Option A: Create dedicated leftover increment**

```bash
/create-increment "Enhancements from 001-core-framework" --leftover
```

Creates:
```
.specweave/increments/002-enhancements/
├── spec.md
│   ---
│   transferred_from: 001-core-framework
│   transfer_date: 2025-10-26
│   ---
│
│   # Enhancements from 001-core-framework
│
│   **Transferred tasks** (3 tasks from 001):
│   - T045: Add caching to context-loader (P2)
│   - T046: Add retry logic to skill-router (P2)
│   - T047: Create skill usage analytics (P3)
│
└── tasks.md
    ## Transferred Tasks

    ### T001: Add caching to context-loader
    **Transferred from**: 001-core-framework (T045)
    **Original priority**: P2
    **New priority**: P1 (promoted - now critical for performance)
    ...
```

**Option B: Add to existing increment**

If increment 002 already exists:
```markdown
# 002-existing-increment/tasks.md

## Transferred Tasks (from 001-core-framework)

### T050: Add caching to context-loader
**Transferred from**: 001-core-framework (T045)
**Transfer date**: 2025-10-26
**Transfer reason**: Performance optimization, deferred from 001
**Original priority**: P2
**Current priority**: P2
```

#### Step 4: Update Source Increment

Mark transferred tasks in `001-core-framework/tasks.md`:

```markdown
### T045: Add caching to context-loader
**Status**: [T] Transferred to 002-enhancements
**Transfer date**: 2025-10-26
**Reason**: P2 priority, deferred to focus on P1 completion
```

**Legend**:
- `[x]` - Completed
- `[ ]` - Not started
- `[-]` - In progress
- `[T]` - Transferred
- `[C]` - Canceled

---

## WIP Limit Enforcement

### Limits

| Project Type | WIP Limit | Rationale |
|--------------|-----------|-----------|
| **Framework development** (SpecWeave repo) | 2-3 in progress | Allows core + 1-2 independent features |
| **User projects** (small team 1-5) | 1-2 in progress | Better focus, higher quality |
| **User projects** (large team 10+) | 3-5 in progress | Multiple sub-teams, still limited |

### Enforcement Points

#### 1. **At increment creation** (`/create-increment`)

```bash
/create-increment "Add JIRA integration"

# System checks:
→ Increments in progress: 2 (001-core-framework, 002-enhancements)
→ WIP limit: 2
→ Status: ⚠️ WIP limit reached

Cannot create new increment. Options:

A) Complete 001 or 002 first (recommended)
   Run: /close-increment 001

B) Add as tasks to existing increment
   Run: /add-tasks 001 "JIRA integration tasks"

C) Override WIP limit (requires --force flag)
   Run: /create-increment "..." --force
   Warning: Context switching reduces productivity 20-40%

Your choice?
```

#### 2. **At increment start** (status: planned → in-progress)

```bash
/start-increment 003

# System checks:
→ Current WIP: 2/2
→ Status: ⚠️ Must close 1 increment first

Options:
A) Close increment 001 (88% complete, ready to close)
B) Close increment 002 (50% complete, transfer leftovers)
C) Override (not recommended)
```

### Override Policy

**When to allow `--force`**:
- ✅ Truly independent work (no dependencies)
- ✅ Critical bug fix (production down)
- ✅ Blocked on external dependency (can work in parallel)

**When to reject `--force`**:
- ❌ Just impatient to start new work
- ❌ Avoiding difficult tasks in current increment
- ❌ Poor planning (didn't estimate correctly)

---

## Task vs Increment Decision Tree

### Decision Flowchart

```
New work request
      ↓
┌─────────────────────────────┐
│ How long will this take?    │
└─────────────────────────────┘
      ↓                    ↓
  Hours-Days            Weeks+
      ↓                    ↓
┌─────────────────┐   ┌──────────────────┐
│ How many        │   │ Check WIP limit  │
│ components?     │   │                  │
└─────────────────┘   └──────────────────┘
   ↓         ↓              ↓
  1        2+           WIP < limit?
   ↓         ↓          ↓          ↓
  TASK   INCREMENT    YES        NO
   ↓                   ↓          ↓
Add to current    NEW INCREMENT  Close
tasks.md                         existing
                                increment
```

### Examples

#### Example 1: Bug Fix

```
Request: "Fix error handling in context-loader"

Decision:
→ Duration: 2 hours
→ Components: 1 (context-loader skill)
→ Action: TASK - Add to current increment

Implementation:
Add to 001-core-framework/tasks.md:

### T051: Fix error handling in context-loader
**Added**: 2025-10-26
**Discovered**: During integration testing
**Priority**: P1
**Estimated**: 2 hours
**Status**: [ ] Pending
```

#### Example 2: New Feature

```
Request: "Add complete JIRA integration (sync, mapper, tests)"

Decision:
→ Duration: 2 weeks
→ Components: 2 agents + 1 skill + tests
→ WIP: 2/2 (at limit)
→ Action: CLOSE 001, then NEW INCREMENT

Implementation:
1. /close-increment 001 (transfer leftovers)
2. /create-increment "JIRA Integration"
```

#### Example 3: Enhancement

```
Request: "Add caching to context-loader"

Decision:
→ Duration: 1 day
→ Components: 1 (context-loader)
→ Priority: P2 (performance optimization)
→ Current increment: 001 (80% complete, close soon)
→ Action: DEFER to next increment

Implementation:
Add to backlog:
echo "### Caching for context-loader" >> .specweave/increments/_backlog/future-enhancements.md
```

---

## Commands

### `/close-increment <id>` - Close increment with leftover transfer

**Usage**:
```bash
/close-increment 001
/close-increment 001 --force  # Skip validation
/close-increment 001 --no-transfer  # Cancel leftovers instead
```

**Workflow**:
1. **Validate completion**:
   - ✅ All P1 tasks completed?
   - ✅ All tests passing?
   - ✅ Documentation updated?

2. **If P1 incomplete**:
   ```
   ⚠️ Cannot close: 3 P1 tasks remaining

   Incomplete P1 tasks:
   - T020: Implement skill-router core logic
   - T025: Add E2E tests for context-loader
   - T030: Create installation script

   Options:
   A) Complete P1 tasks first (recommended)
   B) Downgrade to P2 (if justified)
   C) Force close (not recommended - breaks commitment)
   ```

3. **Identify leftovers**:
   - Scan `tasks.md` for `[ ]` tasks
   - Categorize by priority

4. **Present transfer options**:
   ```
   ✅ Ready to close 001-core-framework

   Completion: 88% (44/50 tasks)
   Leftovers: 6 tasks (3 P2, 3 P3)

   Transfer options:
   A) Create new increment "002-enhancements" with leftovers
   B) Add to existing increment (select: 002, 003, 004)
   C) Cancel leftovers (document why)

   Your choice?
   ```

5. **Generate closure report**:
   - Create `.specweave/increments/001-core-framework/reports/closure-report.md`
   - Document completion stats
   - List transferred/canceled tasks
   - Optional: Retrospective notes

6. **Update status**:
   - `spec.md` frontmatter: `status: closed`
   - `updated: 2025-10-26`
   - `closed_date: 2025-10-26`

7. **Free WIP slot**:
   - WIP count decreases by 1
   - Can start new increment

### `/add-tasks <increment-id>` - Add tasks to existing increment

**Usage**:
```bash
/add-tasks 001 "Fix error handling in context-loader"
/add-tasks 001 --priority P2 "Add caching to context-loader"
```

**Workflow**:
1. Validate increment is "in-progress" or "planned"
2. Parse task description
3. Add to `tasks.md` with auto-incrementing task ID
4. Update `spec.md` frontmatter `updated: YYYY-MM-DD`

### `/start-increment <id>` - Change status: planned → in-progress

**Usage**:
```bash
/start-increment 002
```

**Workflow**:
1. Check WIP limit
2. If at limit: Prompt to close existing increment
3. Update `spec.md` frontmatter: `status: in-progress`
4. Create initial `logs/execution.log` entry

### `/list-increments` - Show all increments with status

**Usage**:
```bash
/list-increments
/list-increments --status in-progress
/list-increments --priority P1
```

**Output**:
```
📊 Increments Overview

Status: in-progress (2/2 WIP limit reached)
├── 001-core-framework [P1] - 88% complete (44/50 tasks)
└── 002-enhancements [P2] - 40% complete (6/15 tasks)

Status: planned (3)
├── 003-jira-integration [P1] - Ready to start (blocked by WIP limit)
├── 004-github-sync [P2] - Ready to start
└── 005-cost-optimizer-v2 [P3] - Ready to start

Status: backlog (10)
├── Design system improvements
├── Performance optimizations
└── ... (7 more)

Status: closed (5)
├── 000-project-setup [P1] - Closed 2025-09-15
└── ... (4 more)

⚠️ Action needed: Close 001 or 002 to free WIP slot
```

---

## Frontmatter Schema

### Complete increment `spec.md` frontmatter

```yaml
---
increment: 001-core-framework
title: "SpecWeave Core Framework"
priority: P1
status: in-progress  # backlog | planned | in-progress | completed | closed
created: 2025-01-25
updated: 2025-10-26
started: 2025-02-01  # When status changed to in-progress
completed: null       # When all P1 tasks done
closed: null          # When closure report generated
structure: user-stories

# Completion tracking
total_tasks: 50
completed_tasks: 44
completion_rate: 88

# Leftover tracking (when closed)
transferred_to: null    # e.g., "002-enhancements"
canceled_tasks: 0
transfer_reason: null

# Dependencies
dependencies:
  - none

# WIP tracking
wip_slot: 1  # Which WIP slot this occupies (1, 2, or 3)
---
```

---

## CLAUDE.md Updates

Add comprehensive section on increment lifecycle:

```markdown
## Increment Lifecycle Management

### Status Progression

```
backlog → planned → in-progress → completed → closed
```

**Definitions**:
- **backlog**: Idea identified, not yet planned
- **planned**: Spec created, ready to start
- **in-progress**: Active development (WIP limit enforced)
- **completed**: All P1 tasks done, tests passing
- **closed**: Reviewed, archived, WIP slot freed

### WIP Limits

| Project Type | WIP Limit |
|--------------|-----------|
| Framework development | 2-3 in progress |
| User projects (solo) | 1-2 in progress |
| User projects (team) | 3-5 in progress |

**Enforcement**: Cannot start new increment when at WIP limit

### Task vs Increment

**Add as TASK** (to current increment):
- ✅ Duration: Hours-Days
- ✅ Components: 1 agent/skill
- ✅ Examples: Bug fixes, small enhancements

**Create NEW INCREMENT**:
- ✅ Duration: Weeks+
- ✅ Components: 2+ agents/skills
- ✅ Examples: Major features, integrations

### Closing Increments

**Criteria to close**:
- ✅ All P1 tasks completed
- ✅ All tests passing
- ✅ Documentation updated
- ❌ P2/P3 tasks can remain (transfer allowed)

**Leftover transfer**:
```bash
/close-increment 001  # Guides you through leftover handling
```

**Closure report** generated in `reports/closure-report.md`

### Commands

- `/create-increment <description>` - Create new increment (checks WIP limit)
- `/start-increment <id>` - Start increment (checks WIP limit)
- `/add-tasks <id> <description>` - Add tasks to existing increment
- `/close-increment <id>` - Close with leftover transfer
- `/list-increments` - View all increments and WIP status
```

---

## Implementation Checklist

### Phase 1: Core Workflow (P1)
- [ ] Update increment frontmatter schema
- [ ] Create `/close-increment` command
- [ ] Create `/add-tasks` command
- [ ] Create `/start-increment` command
- [ ] Create `/list-increments` command
- [ ] WIP limit enforcement in `/create-increment`

### Phase 2: Leftover Transfer (P1)
- [ ] Leftover detection logic
- [ ] Transfer to new increment workflow
- [ ] Transfer to existing increment workflow
- [ ] Closure report generation
- [ ] Task status markers (`[T]`, `[C]`)

### Phase 3: Documentation (P1)
- [ ] Update CLAUDE.md with lifecycle section
- [ ] Update `.specweave/increments/README.md`
- [ ] Create closure report template
- [ ] Add examples to slash command docs

### Phase 4: Testing (P2)
- [ ] Test WIP limit enforcement
- [ ] Test leftover transfer workflow
- [ ] Test closure with P1 incomplete (should block)
- [ ] Test closure with P2/P3 leftovers (should allow)
- [ ] Integration tests for full workflow

---

## Success Criteria

- ✅ WIP limits enforced (cannot exceed 2-3 in progress)
- ✅ Closure workflow smooth (< 5 min to close increment)
- ✅ Leftover transfer automated (no manual file editing)
- ✅ Closure reports complete (document what done, what transferred)
- ✅ Task vs Increment decision clear (< 30 sec to decide)
- ✅ Status tracking accurate (real-time WIP visibility)

---

## Example Workflow: Real Project

### Week 1-12: Core Framework

```bash
# Create and start
/create-increment "Core Framework"  # Creates 001
/start-increment 001

# Add tasks as discovered
/add-tasks 001 "Fix error in context-loader"
/add-tasks 001 "Add retry logic to skill-router"

# After 3 months, 88% done
/close-increment 001

# System prompts:
→ Completion: 88% (44/50 tasks)
→ Leftovers: 6 P2/P3 tasks
→ Transfer to new increment "002-enhancements"? [Yes/No]

# User confirms
→ Closure report generated
→ Tasks transferred to 002
→ 001 status: closed
→ WIP slot freed (1/2 → 0/2)
```

### Week 13-14: JIRA Integration

```bash
# Now can start new work
/create-increment "JIRA Integration"  # Creates 003
/start-increment 003

# WIP: 1/2 (003 in progress)
```

---

**This design provides**:
- ✅ Clear lifecycle with 5 statuses
- ✅ WIP limits to prevent overload
- ✅ Automated leftover transfer
- ✅ Closure ritual with reports
- ✅ Task vs Increment clarity
- ✅ Real-world flexibility (close with leftovers when justified)

**Ready for implementation!**
