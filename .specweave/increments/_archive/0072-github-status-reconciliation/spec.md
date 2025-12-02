---
increment: 0072-github-status-reconciliation
status: completed
priority: P1
epic: FS-072
created: 2025-11-26
---

# GitHub Status Reconciliation

## Problem Statement

GitHub issues remain open even after increments are closed because:
1. The hook chain has silent failure points (no feature_id, gate checks, API errors)
2. No REOPEN logic exists when increments are resumed
3. No reconciliation mechanism to detect/fix drift

This causes confusion as users see open GitHub issues for completed work.

## User Stories

### US-001: GitHub Status Reconciliation Command

**As a** developer using SpecWeave
**I want** a command to reconcile GitHub issue states with increment statuses
**So that** I can fix any drift between local state and GitHub

#### Acceptance Criteria

- [x] **AC-US1-01**: Command `/specweave-github:reconcile` exists and is documented ✅
- [x] **AC-US1-02**: Command scans all non-archived increments ✅
- [x] **AC-US1-03**: Command compares metadata.json status with GitHub issue state ✅
- [x] **AC-US1-04**: Command closes GitHub issues where metadata.status=completed but GH=open ✅ (Tested: closed 10 issues)
- [x] **AC-US1-05**: Command reopens GitHub issues where metadata.status=in-progress but GH=closed ✅
- [x] **AC-US1-06**: Command reports what was fixed with clear output ✅
- [x] **AC-US1-07**: Command supports --dry-run flag to preview changes ✅

### US-002: Automatic Issue Reopen on Resume

**As a** developer resuming a paused/completed increment
**I want** GitHub issues to automatically reopen
**So that** issue state matches increment state

#### Acceptance Criteria

- [x] **AC-US2-01**: When increment status changes to in-progress/active/resumed, check if GH issues are closed
- [x] **AC-US2-02**: Automatically reopen closed GitHub issues for resumed increments
- [x] **AC-US2-03**: Post comment explaining why issue was reopened
- [x] **AC-US2-04**: Handle User Story issues (not just main increment issue)

### US-003: Automatic Issue Close on Abandon

**As a** developer abandoning an increment
**I want** GitHub issues to automatically close
**So that** abandoned work is reflected in GitHub

#### Acceptance Criteria

- [x] **AC-US3-01**: When increment status changes to abandoned, close GitHub issues
- [x] **AC-US3-02**: Post comment explaining why issue was closed (abandoned)
- [x] **AC-US3-03**: Handle User Story issues (not just main increment issue)

### US-004: Optional Auto-Reconcile on Session Start

**As a** team lead
**I want** automatic reconciliation on session start
**So that** drift is caught and fixed proactively

#### Acceptance Criteria

- [x] **AC-US4-01**: Config option `sync.github.autoReconcileOnSessionStart` exists
- [x] **AC-US4-02**: When enabled, SessionStart hook runs quick reconcile
- [x] **AC-US4-03**: Reconcile only runs if >1 hour since last reconcile (debounce)
- [x] **AC-US4-04**: Errors are logged but don't block session start

## Technical Notes

- Use existing `GitHubClientV2` for API calls
- Leverage `SyncCoordinator` for issue operations
- Add new `GitHubReconciler` class for reconciliation logic
- Respect existing gate system (canUpdateExternalItems, etc.)
