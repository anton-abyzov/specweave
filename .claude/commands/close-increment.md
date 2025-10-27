# /close-increment - Close Increment with Leftover Transfer

**Command**: `/close-increment <increment-id> [options]`

**Purpose**: Close an increment that has completed all P1 tasks, with automatic leftover transfer for P2/P3 tasks

**Framework**: Framework-agnostic (works with all tech stacks)

---

## Usage

```bash
/close-increment 001                    # Close increment 001
/close-increment 001 --force            # Skip validation (use sparingly)
/close-increment 001 --no-transfer      # Cancel leftovers instead of transferring
```

## Arguments

- `<increment-id>` (required): Increment number (e.g., `001`, `002`)
- `--force` (optional): Skip P1 completion validation
- `--no-transfer` (optional): Cancel leftover tasks instead of transferring

---

## Workflow

### Step 1: Validate Increment Status

Check if increment can be closed:

```
✅ Validating increment 001-core-framework...

Criteria:
→ All P1 tasks completed? [Checking...]
→ All tests passing? [Checking...]
→ Documentation updated? [Checking...]
```

**If P1 tasks incomplete**:
```
❌ Cannot close: 3 P1 tasks remaining

Incomplete P1 tasks:
- T020: Implement skill-router core logic
- T025: Add E2E tests for context-loader
- T030: Create installation script

Options:
A) Complete P1 tasks first (recommended)
B) Downgrade to P2 (if justified - requires explanation)
C) Force close with --force (not recommended - breaks commitment)

Your choice?
```

**If validation passes**:
```
✅ Ready to close 001-core-framework

Completion: 88% (44/50 tasks)
P1 tasks: 100% (30/30) ✅
P2 tasks: 80% (12/15) - 3 remaining
P3 tasks: 40% (2/5) - 3 remaining
```

### Step 2: Identify Leftovers

Scan `tasks.md` for incomplete tasks:

```
Found 6 leftover tasks:

P2 Priority (3 tasks):
- T045: Add caching to context-loader
- T046: Add retry logic to skill-router
- T047: Improve error messages

P3 Priority (3 tasks):
- T048: Add usage analytics
- T049: Create performance dashboard
- T050: Add debug mode

Total leftovers: 6 tasks
```

### Step 3: Present Transfer Options

```
Transfer options for 6 leftover tasks:

A) Create new increment "002-enhancements" (recommended)
   - All 6 tasks transferred to new increment
   - Clean separation of MVP vs enhancements

B) Add to existing increment
   Available increments:
   - 002-brownfield-tools [planned] (15 tasks)
   - 003-jira-integration [planned] (20 tasks)

C) Cancel leftovers (document why each canceled)
   - Tasks marked as [C] in 001/tasks.md
   - Reasons documented in closure report

D) Mix (transfer some, cancel others)
   - You'll be prompted for each task

Your choice? [A/B/C/D]:
```

### Step 4: Execute Transfer

**If option A (new increment)**:
```
Creating increment 002-enhancements...

→ Creating .specweave/increments/0002-enhancements/
→ Creating spec.md with transferred tasks
→ Creating tasks.md with 6 tasks
→ Marking tasks in 001 as [T] Transferred

✅ 6 tasks transferred to 002-enhancements
```

**002-enhancements/spec.md**:
```yaml
---
increment: 002-enhancements
title: "Enhancements from 001-core-framework"
priority: P2
status: planned
created: 2025-10-26
transferred_from: 001-core-framework
transfer_date: 2025-10-26
---

# Enhancements from 001-core-framework

**Transferred tasks** (6 tasks from 001):

## User Stories

### US1: Performance Optimizations (P2)
- T045: Add caching to context-loader
- T046: Add retry logic to skill-router

### US2: Monitoring & Analytics (P3)
- T048: Add usage analytics
- T049: Create performance dashboard
- T050: Add debug mode
```

**002-enhancements/tasks.md**:
```markdown
## Transferred Tasks (from 001-core-framework)

### T001: Add caching to context-loader
**Transferred from**: 001-core-framework (T045)
**Transfer date**: 2025-10-26
**Original priority**: P2
**Current priority**: P1 (promoted - critical for performance)
**Estimated**: 1 day
**Status**: [ ] Pending

**Implementation**:
[Details from original task]
```

### Step 5: Generate Closure Report

**File**: `.specweave/increments/0001-core-framework/reports/closure-report.md`

```markdown
# Increment Closure Report

**Increment**: 001-core-framework
**Closed Date**: 2025-10-26
**Duration**: 3 months (2025-01-25 to 2025-10-26)
**Status**: completed → closed

## Completion Summary

| Category | Planned | Completed | Remaining | Rate |
|----------|---------|-----------|-----------|------|
| P1 Tasks | 30 | 30 | 0 | 100% ✅ |
| P2 Tasks | 15 | 12 | 3 | 80% |
| P3 Tasks | 5 | 2 | 3 | 40% |
| **Total** | **50** | **44** | **6** | **88%** |

## Transferred Tasks

### Transferred to 002-enhancements (6 tasks)

| Task ID | Description | Priority | Transfer Reason |
|---------|-------------|----------|-----------------|
| T045 | Add caching to context-loader | P2 | Performance optimization, not blocking MVP |
| T046 | Add retry logic to skill-router | P2 | Error handling enhancement |
| T047 | Improve error messages | P2 | UX improvement, not critical |
| T048 | Add usage analytics | P3 | Monitoring feature, nice-to-have |
| T049 | Create performance dashboard | P3 | Visualization, future enhancement |
| T050 | Add debug mode | P3 | Developer tool, not user-facing |

## Retrospective

**What went well**:
- ✅ Clear spec upfront reduced scope creep
- ✅ Test-first approach caught bugs early
- ✅ WIP limits improved focus
- ✅ Context manifests reduced token usage 70%

**What to improve**:
- ⚠️ Better task estimation (underestimated agent testing by 50%)
- ⚠️ More frequent reviews (caught design issues late)
- ⚠️ Earlier integration testing (found edge cases late)

**Metrics**:
- Lines of code: 15,000
- Test coverage: 85%
- Token reduction: 72% (context loading)
- Agents created: 20
- Skills created: 24

## Sign-off

- [x] All P1 tasks completed (30/30)
- [x] All tests passing (150/150)
- [x] Documentation updated (API ref, guides)
- [x] Leftovers transferred to 002-enhancements
- [x] Retrospective completed

**Closed by**: SpecWeave Core Team
**Date**: 2025-10-26
```

### Step 6: Update Source Increment

Mark transferred tasks in `001-core-framework/tasks.md`:

```markdown
### T045: Add caching to context-loader
**Status**: [T] Transferred to 002-enhancements (T001)
**Transfer date**: 2025-10-26
**Transfer reason**: Performance optimization, deferred to focus on P1 MVP completion
```

Update `001-core-framework/spec.md` frontmatter:

```yaml
---
status: closed                    # ← Changed from "in-progress"
closed: 2025-10-26                # ← Closure date
transferred_to: 002-enhancements  # ← Where leftovers went
transferred_tasks: 6
completion_rate: 88
---
```

### Step 7: Free WIP Slot

```
✅ Increment 001-core-framework closed successfully

Summary:
→ Completion: 88% (44/50 tasks)
→ P1 completion: 100% (30/30) ✅
→ Leftovers transferred: 6 tasks → 002-enhancements
→ Closure report: .specweave/increments/0001-core-framework/reports/closure-report.md
→ Status: closed
→ WIP freed: 2/2 → 1/2

You can now start a new increment!
```

---

## Validation Rules

### Must Complete Before Closing

- ✅ **All P1 tasks** completed (100%)
- ✅ **All tests passing** (unit, integration, E2E)
- ✅ **Documentation updated** (API ref, guides, changelog)

### Can Transfer

- ✅ **P2 tasks** (important but not critical)
- ✅ **P3 tasks** (nice-to-have)

### Cannot Transfer

- ❌ **P1 tasks** (critical - must complete or justify downgrade)
- ❌ **Failing tests** (must fix before closing)
- ❌ **Undocumented features** (must document or remove)

---

## Override with --force

**Use cases** ✅:
- Time-boxed sprint ended (e.g., 2-week sprint)
- Business pivot (priorities changed)
- External blocker (waiting on third-party)

**Anti-patterns** ❌:
- Avoiding difficult work
- Poor planning/estimation
- Impatience to start new work

**Force closure**:
```bash
/close-increment 001 --force

⚠️  Force closing with 3 P1 tasks incomplete

This breaks the commitment. Document why:
→ Reason for force closure: [User enters reason]

Proceeding...
```

---

## Task Status Markers

| Marker | Status | Description |
|--------|--------|-------------|
| `[ ]` | Not started | Task planned but not begun |
| `[-]` | In progress | Task currently being worked on (optional notation) |
| `[x]` | Completed | Task finished successfully |
| `[T]` | Transferred | Moved to another increment |
| `[C]` | Canceled | No longer relevant, documented why |

---

## Related Documentation

- [INCREMENT-LIFECYCLE-DESIGN.md](../../.specweave/increments/0001-core-framework/reports/INCREMENT-LIFECYCLE-DESIGN.md) - Complete lifecycle design
- [CLAUDE.md](../../CLAUDE.md#increment-lifecycle-management) - Lifecycle management guide

---

**Command Type**: Lifecycle management
**Framework Support**: All (TypeScript, Python, Go, Rust, Java, etc.)
**WIP Impact**: Frees 1 WIP slot
**Output**: Closure report + transferred increment (if applicable)
