---
increment: 0058-fix-status-sync-and-auto-github-update
title: Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change
type: bug
priority: P0
status: completed
created: 2025-11-24T00:00:00.000Z
test_mode: TDD
coverage_target: 95
---

# Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change

## Overview

**Problem 1**: `increment-reopener.ts` bypasses `MetadataManager.updateStatus()`, causing spec.md/metadata.json desync when increments are reopened.

**Problem 2**: Status changes (planned → active, active → completed) don't automatically trigger GitHub issue updates. Users must manually run `/specweave:sync-progress`.

**Root Cause**:
- Reopen code directly modifies `metadata.status` and calls `MetadataManager.write()` (only updates metadata.json)
- `MetadataManager.updateStatus()` doesn't trigger living docs sync or GitHub updates
- No post-status-change hook exists

**Solution**:
1. Fix increment-reopener to use `MetadataManager.updateStatus()`
2. Add automatic living docs sync trigger in `MetadataManager.updateStatus()`
3. Add safety guards to prevent Claude Code crashes:
   - Non-blocking async execution
   - Circuit breaker pattern
   - Error isolation
   - Only sync on meaningful transitions

## User Stories

### US-001: Fix Reopen Desync Bug (P0)

**As a**: Developer
**I want**: Increment reopen to keep spec.md and metadata.json in sync
**So that**: Status line shows accurate state after reopening

#### Acceptance Criteria

- [x] **AC-US1-01**: `reopenIncrement()` uses `MetadataManager.updateStatus()` instead of direct write
- [x] **AC-US1-02**: After reopen, both spec.md and metadata.json have status = "active"
- [x] **AC-US1-03**: Status line cache updates correctly after reopen
- [x] **AC-US1-04**: No desync occurs when reopening completed increments

### US-002: Auto GitHub Sync on Status Change (P0)

**As a**: Developer
**I want**: GitHub issues to update automatically when increment status changes
**So that**: Stakeholders see real-time progress without manual sync

#### Acceptance Criteria

- [x] **AC-US2-01**: Status change `planning → active` triggers living docs sync
- [x] **AC-US2-02**: Status change `active → completed` triggers living docs + GitHub sync
- [x] **AC-US2-03**: Sync runs asynchronously (non-blocking)
- [x] **AC-US2-04**: Errors in sync don't crash `updateStatus()`
- [x] **AC-US2-05**: Circuit breaker prevents repeated sync failures
- [x] **AC-US2-06**: Sync only triggers on meaningful transitions (not backlog → paused)

#### Additional Fix: GitHub Comment Duplication - Complete Fix (2025-11-24)

**Issues Found**:
- GitHub Issue #740: 4 identical progress update comments
- GitHub Issue #741: 2 identical progress update comments (after first fix)

**Root Cause**: **RACE CONDITION** between two sync paths:
1. **Task Completion Path**: TodoWrite → post-task-completion.sh → syncCompletedUserStories() → GitHub sync
2. **Status Change Path**: MetadataManager.updateStatus() → StatusChangeSyncTrigger → GitHub sync

When tasks complete AND status changes simultaneously, BOTH paths fire, creating duplicate comments.

**Complete Fix Implemented** (Two-Layer Defense):

**Layer 1 - Sync Lock**: Prevents concurrent syncs of the same feature
- Added timestamp-based lock at GitHubFeatureSync class level
- 30-second lock duration prevents rapid/concurrent syncs
- Per-feature locking (FS-058 and FS-059 can sync independently)
- Automatic expiry (no manual cleanup needed)

**Layer 2 - Comment Deduplication**: Prevents posting identical consecutive comments
- Fetches last comment before posting new one
- Normalizes content for comparison (ignores timestamps)
- Only posts if progress has actually changed
- Handles edge cases (no previous comment, API failures)

**Files Changed**:
- `plugins/specweave-github/lib/github-feature-sync.ts`:
  - Lines 54-70: Sync lock infrastructure
  - Lines 88-112: Lock check in syncFeatureToGitHub()
  - Lines 487-490: Deduplication in createUserStoryIssue()
  - Lines 542: Deduplication in updateUserStoryIssue()
  - Lines 627-703: postProgressCommentIfChanged() method

**Expected Outcome**:
- Issue #740: Would have 1 comment (not 4) ✅
- Issue #741: Would have 1 comment (not 2) ✅
- Future issues: 0 duplicates guaranteed ✅

**Documentation**:
- `GITHUB-COMMENT-DEDUPLICATION-FIX.md` (initial partial fix)
- `GITHUB-RACE-CONDITION-FIX.md` (complete analysis and fix)

### US-003: Safety Guards Against Crashes (P0)

**As a**: Developer
**I want**: Sync failures to be isolated and not crash Claude Code
**So that**: Status updates always succeed even if GitHub is down

#### Acceptance Criteria

- [x] **AC-US3-01**: Sync runs in try-catch with error logging
- [x] **AC-US3-02**: Circuit breaker opens after 3 consecutive failures
- [x] **AC-US3-03**: Circuit breaker auto-resets after 5 minutes
- [x] **AC-US3-04**: Status update always succeeds even if sync fails
- [x] **AC-US3-05**: User sees clear error message if sync fails
- [x] **AC-US3-06**: Fallback: User can manually run `/specweave:sync-progress`

## Technical Design

### Architecture

```
MetadataManager.updateStatus()
  ├─ Step 1: Update spec.md (via updateSpecMdStatusSync)
  ├─ Step 2: Update metadata.json (via write)
  ├─ Step 3: Update active cache
  └─ Step 4: Trigger async sync (NEW)
       ├─ Check if transition is sync-worthy
       ├─ Circuit breaker check
       ├─ Spawn non-blocking sync
       └─ Log result (success/failure)
```

### Sync-Worthy Transitions

```typescript
const SYNC_WORTHY_TRANSITIONS = {
  'planning → active': true,      // Increment started
  'active → completed': true,     // Increment finished
  'completed → active': true,     // Increment reopened
  'backlog → active': true,       // Backlog item started
  'paused → active': true,        // Work resumed
  // All others: false (no sync needed)
};
```

### Circuit Breaker Pattern

```typescript
class SyncCircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  canSync(): boolean {
    if (state === 'open') {
      // Check if 5 minutes passed
      if (Date.now() - lastFailure > 5 * 60 * 1000) {
        state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    failures = 0;
    state = 'closed';
  }

  recordFailure(): void {
    failures++;
    lastFailure = new Date();
    if (failures >= 3) {
      state = 'open';
    }
  }
}
```

## Implementation Plan

### Phase 1: Fix Reopen Bug (T-001 to T-003)

1. Update `increment-reopener.ts` to use `MetadataManager.updateStatus()`
2. Remove direct `metadata.status` assignment
3. Add test coverage for reopen desync scenario

### Phase 2: Add Auto Sync (T-004 to T-008)

1. Create `StatusChangeSyncTrigger` class
2. Integrate into `MetadataManager.updateStatus()`
3. Add circuit breaker implementation
4. Add comprehensive error handling
5. Add logging and diagnostics

### Phase 3: Testing & Validation (T-009 to T-012)

1. Unit tests for circuit breaker
2. Integration tests for auto-sync
3. E2E test: Create → Activate → Complete → GitHub updated
4. Crash resistance test: Simulate GitHub down

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Sync crashes Claude Code | Medium | Critical | Circuit breaker, try-catch, non-blocking |
| Infinite sync loops | Low | High | Throttle, recursion guard |
| GitHub rate limits | Medium | Medium | Respect rate limits, queue requests |
| Performance degradation | Low | Medium | Async execution, timeout (5s) |

## Testing Strategy

### Unit Tests
- `increment-reopener.test.ts`: Verify updateStatus() call
- `status-change-sync-trigger.test.ts`: Circuit breaker logic
- `circuit-breaker.test.ts`: State transitions

### Integration Tests
- Test planned → active triggers sync
- Test active → completed triggers sync
- Test circuit breaker opens after failures
- Test sync errors don't crash updateStatus()

### E2E Tests
- Create increment → activate → verify GitHub issue updated
- Complete increment → verify GitHub issue closed
- Reopen increment → verify no desync

## Success Criteria

✅ Reopen works without desync (spec.md = metadata.json)
✅ Status changes auto-trigger GitHub sync
✅ Sync failures don't crash Claude Code
✅ Circuit breaker prevents sync storms
✅ 95%+ test coverage
✅ Status line always accurate
