---
increment: 0051-automatic-github-sync
title: Automatic GitHub Sync with Permission Gates
priority: P0
status: completed
type: feature
feature_id: FS-049
created: 2025-11-22T00:00:00.000Z
test_mode: TDD
coverage_target: 85
estimated_hours: 40
dependencies:
  - 0050-external-tool-import-phase-1b-7
---

# Feature: Automatic GitHub Sync with Permission Gates

## Overview

**Complete Requirements**: See [FS-049: Automatic GitHub Sync with Permission Gates](../../docs/internal/specs/_features/FS-049/FEATURE.md)

**Problem**: GitHub issues are NOT automatically created when increments complete, even when `canUpsertInternalItems: true` is enabled. Users must manually run `/specweave-github:sync` after every `/done`, leading to:
- 30% forgotten syncs (manual adherence failure)
- 2-5 minutes wasted per increment
- Stale GitHub issues (poor stakeholder visibility)

**Solution**: Integrate GitHub sync into `SyncCoordinator.syncIncrementCompletion()` with three-tier permission model:
1. **GATE 1**: `canUpsertInternalItems` (living docs sync)
2. **GATE 2**: `canUpdateExternalItems` (external tracker sync)
3. **GATE 3**: `autoSyncOnCompletion` (automatic trigger, default: true)
4. **GATE 4**: `sync.github.enabled` (GitHub-specific toggle)

**Impact**:
- ✅ Zero manual sync commands (100% automation)
- ✅ Real-time GitHub visibility (stakeholders see progress immediately)
- ✅ Idempotent retries (no duplicate issues)
- ✅ Graceful degradation (workflow continues on API failures)

## Quick Summary

**User Stories**:
- [US-001: Automatic Issue Creation on Completion](../../docs/internal/specs/specweave/FS-049/us-001-auto-issue-creation.md)
- [US-002: Three-Tier Permission Model](../../docs/internal/specs/specweave/FS-049/us-002-permission-gates.md)
- [US-003: Idempotency via Caching](../../docs/internal/specs/specweave/FS-049/us-003-idempotency.md)
- [US-004: Error Isolation and Recovery](../../docs/internal/specs/specweave/FS-049/us-004-error-isolation.md)

**Estimated Effort**: 40 hours (5 days)
**Coverage Target**: 85% (TDD approach)
**Dependencies**: Increment 0050 (External Tool Import)

## Acceptance Criteria

<!-- Auto-synced from living docs -->

### US-001: Automatic Issue Creation on Completion

- [x] **AC-US1-01**: When increment completes, `SyncCoordinator.syncIncrementCompletion()` called automatically
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US1-02**: `SyncCoordinator` detects all User Stories linked to increment's feature
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US1-03**: For each User Story, create GitHub issue using `GitHubClientV2`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US1-04**: Created issues linked to feature milestone (if exists)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-05**: `metadata.json` updated with GitHub issue numbers
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US1-06**: User sees success message: "Created 4 GitHub issues for FS-049"
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

### US-002: Three-Tier Permission Model

- [x] **AC-US2-01**: Config supports three independent flags
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US2-02**: GATE 1 (`canUpsertInternalItems`) controls living docs sync
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US2-03**: GATE 2 (`canUpdateExternalItems`) controls external tracker sync
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US2-04**: GATE 3 (`autoSyncOnCompletion`) controls automatic trigger
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US2-05**: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US2-06**: Default config has `autoSyncOnCompletion: true`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US2-07**: User sees clear message when sync skipped due to permission gates
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

### US-003: Idempotency via Caching

- [x] **AC-US3-01**: Before creating issue, check User Story frontmatter for existing `github.number`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US3-02**: If frontmatter missing, query GitHub API to detect duplicates
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US3-03**: Use `DuplicateDetector.createWithProtection()` for GitHub queries
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US3-04**: After issue created, update User Story frontmatter with issue number
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US3-05**: After all issues created, update increment `metadata.json` with issue list
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US3-06**: Re-running sync skips existing issues and reports: "Skipped 2 existing, created 2 new"
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

### US-004: Error Isolation and Recovery

- [x] **AC-US4-01**: All sync errors caught and logged (NEVER crash workflow)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US4-02**: Sync operations wrapped in try-catch with error isolation
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US4-03**: Hooks ALWAYS exit 0 (even on failure)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US4-04**: User sees clear error message on sync failure
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-05**: Partial sync completion allowed (some issues created, others failed)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-06**: Circuit breaker auto-disables hooks after 3 consecutive failures
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes

- [x] **AC-US4-07**: Manual recovery command documented: `/specweave-github:sync --retry`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes

## Functional Requirements

**FR-001**: Auto-create GitHub issues on increment completion
- System shall automatically create GitHub issues for all User Stories when `/specweave:done` completes
- Priority: P0

**FR-002**: Permission gate evaluation
- System shall evaluate 4 permission gates before syncing (GATE 1-4)
- Priority: P0

**FR-003**: Idempotent sync operations
- System shall prevent duplicate issue creation via frontmatter caching and API queries
- Priority: P0

**FR-004**: Error isolation
- System shall catch all sync errors and continue user workflow
- Priority: P0

## Non-Functional Requirements

**NFR-001**: Performance (< 10 seconds sync time)
- Background execution, non-blocking user workflow
- Priority: P0

**NFR-002**: Reliability (graceful degradation on API failures)
- Workflow continues even if GitHub API unavailable
- Priority: P0

**NFR-003**: Idempotency (100% duplicate prevention)
- Re-running sync creates zero duplicate issues
- Priority: P0

**NFR-004**: Observability (clear logs and status)
- `.specweave/logs/hooks-debug.log` contains detailed sync events
- Priority: P1

## Success Criteria

- **Automation Rate**: 100% of completed increments auto-sync to GitHub
- **Time Savings**: Eliminate 2-5 minutes per increment manual sync
- **Reliability**: Zero forgotten syncs (0% miss rate)
- **Error Rate**: < 1% sync failures due to GitHub API errors

## Test Strategy

**Unit Tests**:
- Permission gate evaluation (4 gates × 2 states = 8 tests)
- Idempotency checks (frontmatter cache, API query)
- Error isolation (catch all error types)

**Integration Tests**:
- Mock GitHub API, verify issue creation payload
- Verify `metadata.json` updated correctly
- Test permission gate combinations (16 combinations)

**E2E Tests**:
- Complete real increment, verify GitHub issues created
- Re-run sync, verify zero duplicates
- Test error recovery workflows

## Implementation Plan

**Phase 1: Permission Gates** (8 hours)
- Add `autoSyncOnCompletion` to config schema
- Implement 4-gate evaluation in `SyncCoordinator`
- Unit tests for gate combinations

**Phase 2: Issue Creation** (12 hours)
- Implement `createGitHubIssuesForUserStories()` in `SyncCoordinator`
- Implement `createUserStoryIssue()` in `GitHubClientV2`
- Integration tests with GitHub API mock

**Phase 3: Idempotency** (10 hours)
- Frontmatter caching (read/write `github.number`)
- API duplicate detection (use `DuplicateDetector`)
- Metadata.json update after sync

**Phase 4: Error Isolation** (8 hours)
- Try-catch wrappers in `SyncCoordinator`
- Circuit breaker integration
- Error message templates

**Phase 5: Testing & Documentation** (2 hours)
- E2E tests with real GitHub repo
- Update user documentation
- Create migration guide

## Dependencies

**Required Before Start**:
- ✅ Increment 0050 completed (External Tool Import)
- ✅ `SyncCoordinator` exists (`src/sync/sync-coordinator.ts`)
- ✅ `GitHubClientV2` exists (`plugins/specweave-github/lib/github-client-v2.ts`)

## Files to Modify

**Core**:
- `src/sync/sync-coordinator.ts`: Add `createGitHubIssuesForUserStories()`
- `src/core/config/types.ts`: Add `autoSyncOnCompletion` field
- `plugins/specweave-github/lib/github-client-v2.ts`: Add `createUserStoryIssue()`

**Hooks** (already trigger sync - no changes needed):
- `plugins/specweave/hooks/post-task-completion.sh`: Already calls `SyncCoordinator`

**Tests**:
- `tests/unit/sync/sync-coordinator.test.ts`: Permission gate tests
- `tests/integration/sync/github-sync-integration.test.ts`: Issue creation tests
- `tests/e2e/sync/auto-sync-e2e.test.ts`: End-to-end workflow tests

## Configuration Example

```json
{
  "sync": {
    "enabled": true,
    "provider": "github",
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true  // NEW: Default true
    },
    "github": {
      "enabled": true,
      "owner": "anton-abyzov",
      "repo": "specweave"
    }
  }
}
```

## Risks and Mitigations

**Risk 1: GitHub Rate Limits**
- Mitigation: Batch requests, cache aggressively, exponential backoff
- Fallback: Manual sync (`/specweave-github:sync`)

**Risk 2: Stale Lock Files**
- Mitigation: Lock timeout (15s), stale lock cleanup
- Fallback: Manual lock removal (`rm .specweave/state/.hook-github-sync.lock`)

**Risk 3: Permission Confusion**
- Mitigation: Clear documentation, sensible defaults
- Fallback: FAQ + troubleshooting guide

## References

- **Feature Spec**: [FS-049](../../docs/internal/specs/_features/FS-049/FEATURE.md)
- **ADRs**:
  - ADR-0030: Intelligent Living Docs Sync
  - ADR-0032: Universal Hierarchy Mapping
  - ADR-0007: GitHub First Task Sync
- **Dependencies**: Increment 0050 (External Tool Import)

---

**Status**: Planned
**Estimated Completion**: 2025-11-29 (5 business days)
**Next Steps**: Generate tasks.md via test-aware-planner
