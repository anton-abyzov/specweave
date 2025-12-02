---
increment: 0072-github-status-reconciliation
total_tasks: 12
completed_tasks: 12
---

# Tasks

## US-001: GitHub Status Reconciliation Command

### T-001: Create GitHubReconciler class
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed
**Priority**: P1

Created `src/sync/github-reconciler.ts` with:
- `scanIncrements()` - find all non-archived increments with GitHub links
- `compareStates()` - compare metadata.json status with GitHub issue state
- `reconcile()` - fix mismatches (close/reopen as needed)

### T-002: Create reconcile command markdown
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-07
**Status**: [x] completed
**Priority**: P1

Created `plugins/specweave-github/commands/specweave-github-reconcile.md` with:
- Command documentation
- Usage examples
- --dry-run flag documentation

### T-003: Implement reconcile report output
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Priority**: P2

Added clear output formatting showing:
- Increments scanned
- Mismatches found
- Actions taken (close/reopen)
- Summary statistics

## US-002: Automatic Issue Reopen on Resume

### T-004: Add reopen logic to post-increment-status-change.sh
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1

Modified hook to detect when status becomes active/in-progress/resumed and:
- Check if main GitHub issue is closed
- Reopen it with appropriate comment

### T-005: Create reopen-github-issues.ts script
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04
**Status**: [x] completed
**Priority**: P1

Created Node script that:
- Finds all GitHub issues for an increment (main + User Stories)
- Reopens closed issues
- Posts explanatory comment

### T-006: Integrate reopen script into hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P1

Updated post-increment-status-change.sh to call reopen-github-issues.js

## US-003: Automatic Issue Close on Abandon

### T-007: Add close logic to post-increment-status-change.sh
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Priority**: P1

Modified hook to detect when status becomes abandoned and close issues

### T-008: Create close-github-issues-abandoned.ts script
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P1

Created Node script that:
- Finds all GitHub issues for an increment
- Closes open issues with "abandoned" comment
- Different from completion closure (different message)

## US-004: Optional Auto-Reconcile on Session Start

### T-009: Add config option for auto-reconcile
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P2

Config option `sync.github.autoReconcileOnSessionStart` is supported in config.json

### T-010: Create session-start reconcile hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P2

Created lightweight hook that:
- Checks if reconcile is needed (>1 hour since last)
- Runs quick reconcile in background
- Stores last reconcile timestamp

### T-011: Add error handling for session start
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Priority**: P2

Ensured reconcile errors don't block session start:
- Wrap in try/catch
- Log errors to debug log
- Exit 0 regardless of result

### T-012: Update hooks.json for SessionStart
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Priority**: P2

Registered the session start hook in hooks.json
