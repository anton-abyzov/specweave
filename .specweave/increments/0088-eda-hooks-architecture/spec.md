---
increment: 0088-eda-hooks-architecture
type: refactor
status: completed
created: 2025-12-01
---

# EDA Hooks Architecture - Rock Solid Implementation

## Problem Statement

Current hooks system has issues:
1. **Crashes** - Heavy operations in hooks cause Claude Code to crash
2. **Race conditions** - Multiple updates happening simultaneously
3. **Wrong triggers** - Status line updates on every task.md edit, not on meaningful events
4. **Missing lifecycle events** - No detection of increment created/done/archived/reopened

## Requirements

### Living Specs Sync
Update `.specweave/docs/internal/specs/` when increment:
- **Created** - Add new spec entry
- **Done** - Mark as complete
- **Archived** - Move to archive section
- **Reopened** - Restore from archive

### Status Line Updates
Update ONLY when:
- **User Story completed** - ALL ACs checked AND ALL tasks for that US completed
- **User Story reopened** - Status reverted
- **Increment lifecycle** - done/archived/reopened (not created, not every edit)

### Safety Requirements
- **No crashes** - Graceful degradation on any error
- **No race conditions** - File locking, sequential processing
- **Fast dispatcher** - <10ms synchronous, heavy work async
- **Debouncing** - Coalesce duplicate events
- **Disable switch** - SPECWEAVE_DISABLE_HOOKS=1

## Acceptance Criteria

### US-001: Lifecycle Event Detection
- [x] **AC-US1-01**: Detect increment.created when metadata.json created with status=planning
- [x] **AC-US1-02**: Detect increment.done when status changes to completed
- [x] **AC-US1-03**: Detect increment.archived when folder moved to _archive/
- [x] **AC-US1-04**: Detect increment.reopened when status changes from completed to active

### US-002: User Story Completion Detection
- [x] **AC-US2-01**: Detect when all tasks for a US are completed (all T-XXX with [x])
- [x] **AC-US2-02**: Detect when all ACs for a US are checked (all AC-USXXX with [x])
- [x] **AC-US2-03**: Fire user-story.completed only when BOTH conditions met
- [x] **AC-US2-04**: Fire user-story.reopened when status reverts

### US-003: Living Specs Handler
- [x] **AC-US3-01**: Create spec entry in specs folder on increment.created
- [x] **AC-US3-02**: Mark complete on increment.done
- [x] **AC-US3-03**: Move to archive on increment.archived
- [x] **AC-US3-04**: Restore on increment.reopened

### US-004: Status Line Handler
- [x] **AC-US4-01**: Update status line on user-story.completed
- [x] **AC-US4-02**: Update status line on user-story.reopened
- [x] **AC-US4-03**: Update status line on increment.done/archived/reopened
- [x] **AC-US4-04**: NO update on every task.md edit

### US-005: Race Condition Prevention
- [x] **AC-US5-01**: File locking with flock for processors
- [x] **AC-US5-02**: Single processor per project (PID file check)
- [x] **AC-US5-03**: Event coalescing (same event within 10s = one processing)
- [x] **AC-US5-04**: Longer debounce for heavy operations (60s for living specs)

### US-006: Safety Measures
- [x] **AC-US6-01**: SPECWEAVE_DISABLE_HOOKS=1 disables all hooks
- [x] **AC-US6-02**: Timeout on all operations (30s max)
- [x] **AC-US6-03**: Error logging without blocking
- [x] **AC-US6-04**: Graceful exit on any error (exit 0, not crash)
