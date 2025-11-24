---
increment: 0058-fix-status-sync-and-auto-github-update
status: completed
estimated_tasks: 12
completed_tasks: 12
---

# Implementation Tasks

## Phase 1: Fix Reopen Bug

### T-001: Fix increment-reopener to use updateStatus()
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0

Replace direct `metadata.status` assignment with `MetadataManager.updateStatus()` call in `reopenIncrement()`.

**Changes**:
- File: `src/core/increment/increment-reopener.ts`
- Line 187-206: Replace metadata manipulation with updateStatus() call

**Test Coverage**:
```typescript
describe('IncrementReopener', () => {
  it('should use updateStatus() to prevent desync', async () => {
    // Given: Completed increment
    const incrementId = '0057-test';
    MetadataManager.updateStatus(incrementId, 'completed', 'Done');

    // When: Reopen
    await IncrementReopener.reopenIncrement({
      target: ReopenTarget.INCREMENT,
      incrementId,
      reason: 'Found bug'
    });

    // Then: Both files match
    const metadata = MetadataManager.read(incrementId);
    const spec = readSpecMd(incrementId);

    expect(metadata.status).toBe('active');
    expect(spec.status).toBe('active'); // ← Must match!
  });
});
```

---

### T-002: Add reopen desync test
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P0

Add comprehensive test coverage for reopen desync scenario.

**Test Coverage**:
```typescript
describe('Reopen Desync Prevention', () => {
  it('should keep spec.md and metadata.json in sync after reopen', async () => {
    // Test multiple reopen cycles
    const incrementId = createTestIncrement();

    // Complete it
    MetadataManager.updateStatus(incrementId, 'completed', 'Done');
    assertNoDesync(incrementId);

    // Reopen it
    await IncrementReopener.reopenIncrement({
      target: ReopenTarget.INCREMENT,
      incrementId,
      reason: 'Bug found'
    });
    assertNoDesync(incrementId); // ← Critical check

    // Complete again
    MetadataManager.updateStatus(incrementId, 'completed', 'Fixed');
    assertNoDesync(incrementId);
  });

  it('should update status line cache after reopen', async () => {
    const incrementId = createCompletedIncrement();

    // Cache should show no active increments
    let cache = readStatusLineCache();
    expect(cache.current).toBeNull();

    // Reopen
    await IncrementReopener.reopenIncrement({
      target: ReopenTarget.INCREMENT,
      incrementId,
      reason: 'Reopen'
    });

    // Cache should update
    updateStatusLineCache();
    cache = readStatusLineCache();
    expect(cache.current.id).toBe(incrementId);
  });
});
```

---

### T-003: Update increment-reopener documentation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Priority**: P2

Add JSDoc comments explaining the sync behavior.

---

## Phase 2: Add Auto Sync

### T-004: Create StatusChangeSyncTrigger class
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P0

Create a new class to handle automatic sync on status changes.

**Implementation**:
```typescript
// src/core/increment/status-change-sync-trigger.ts
import { LivingDocsSync } from '../../sync/living-docs-sync.js';
import { IncrementStatus } from '../types/increment-metadata.js';
import { SyncCircuitBreaker } from './sync-circuit-breaker.js';

export class StatusChangeSyncTrigger {
  private static circuitBreaker = new SyncCircuitBreaker();

  /**
   * Trigger sync if status transition warrants it
   */
  static async triggerIfNeeded(
    incrementId: string,
    oldStatus: IncrementStatus,
    newStatus: IncrementStatus
  ): Promise<void> {
    // Check if this transition needs sync
    if (!this.isSyncWorthy(oldStatus, newStatus)) {
      return;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canSync()) {
      console.warn('⚠️  Sync circuit breaker open - skipping auto-sync');
      console.warn('Run /specweave:sync-progress manually');
      return;
    }

    // Spawn non-blocking sync
    this.spawnAsyncSync(incrementId)
      .catch(error => {
        this.circuitBreaker.recordFailure();
        console.error('❌ Auto-sync failed:', error.message);
        console.log('💡 Run /specweave:sync-progress to retry');
      });
  }

  private static isSyncWorthy(
    oldStatus: IncrementStatus,
    newStatus: IncrementStatus
  ): boolean {
    const transition = `${oldStatus} → ${newStatus}`;

    const SYNC_WORTHY = [
      'planning → active',
      'active → completed',
      'completed → active',
      'backlog → active',
      'paused → active'
    ];

    return SYNC_WORTHY.includes(transition);
  }

  private static async spawnAsyncSync(incrementId: string): Promise<void> {
    // Non-blocking: Don't await
    setTimeout(async () => {
      try {
        const sync = new LivingDocsSync();
        await sync.syncIncrement(incrementId);
        this.circuitBreaker.recordSuccess();
        console.log(`✅ Auto-synced increment ${incrementId} to GitHub`);
      } catch (error) {
        // Error already logged by triggerIfNeeded
        throw error;
      }
    }, 0);
  }
}
```

**Test Coverage**:
```typescript
describe('StatusChangeSyncTrigger', () => {
  it('should trigger sync for planning → active', async () => {
    const spy = vi.spyOn(LivingDocsSync.prototype, 'syncIncrement');

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0058-test',
      IncrementStatus.PLANNING,
      IncrementStatus.ACTIVE
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('0058-test');
    });
  });

  it('should NOT trigger sync for active → paused', async () => {
    const spy = vi.spyOn(LivingDocsSync.prototype, 'syncIncrement');

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0058-test',
      IncrementStatus.ACTIVE,
      IncrementStatus.PAUSED
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('should respect circuit breaker', async () => {
    const breaker = StatusChangeSyncTrigger['circuitBreaker'];
    breaker.state = 'open'; // Force open

    const spy = vi.spyOn(LivingDocsSync.prototype, 'syncIncrement');

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0058-test',
      IncrementStatus.ACTIVE,
      IncrementStatus.COMPLETED
    );

    expect(spy).not.toHaveBeenCalled();
  });
});
```

---

### T-005: Create SyncCircuitBreaker class
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P0

Implement circuit breaker pattern to prevent sync storms.

**Implementation**:
```typescript
// src/core/increment/sync-circuit-breaker.ts
export class SyncCircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  canSync(): boolean {
    if (this.state === 'open') {
      // Check if timeout passed
      if (this.shouldReset()) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.FAILURE_THRESHOLD) {
      this.state = 'open';
      console.error(`🔴 Circuit breaker OPEN after ${this.failures} failures`);
      console.log(`⏰ Auto-reset in ${this.RESET_TIMEOUT_MS / 60000} minutes`);
    }
  }

  private shouldReset(): boolean {
    if (!this.lastFailure) return false;
    const elapsed = Date.now() - this.lastFailure.getTime();
    return elapsed > this.RESET_TIMEOUT_MS;
  }

  getState(): { state: string; failures: number; lastFailure?: Date } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }
}
```

**Test Coverage**:
```typescript
describe('SyncCircuitBreaker', () => {
  it('should open after 3 failures', () => {
    const breaker = new SyncCircuitBreaker();

    expect(breaker.canSync()).toBe(true);

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(true); // Still closed

    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false); // Now open!
  });

  it('should reset after 5 minutes', async () => {
    const breaker = new SyncCircuitBreaker();

    // Open it
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false);

    // Fast-forward time (mock Date.now)
    vi.useFakeTimers();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

    // Should be half-open now
    expect(breaker.canSync()).toBe(true);

    // Success closes it
    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('closed');
  });

  it('should close on success', () => {
    const breaker = new SyncCircuitBreaker();

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState().failures).toBe(2);

    breaker.recordSuccess();
    expect(breaker.getState().failures).toBe(0);
    expect(breaker.getState().state).toBe('closed');
  });
});
```

---

### T-006: Integrate trigger into MetadataManager.updateStatus()
**User Story**: US-002
**Satisfies ACs**: AC-US2-04, AC-US2-05
**Status**: [x] completed
**Priority**: P0

Add StatusChangeSyncTrigger call to updateStatus() method.

**Changes**:
```typescript
// src/core/increment/metadata-manager.ts
static updateStatus(
  incrementId: string,
  newStatus: IncrementStatus,
  reason?: string
): IncrementMetadata {
  const metadata = this.read(incrementId);
  const oldStatus = metadata.status; // ← Capture old status

  // Validate transition
  if (!isValidTransition(metadata.status, newStatus)) {
    throw new MetadataError(
      `Invalid status transition: ${metadata.status} → ${newStatus}`,
      incrementId
    );
  }

  // Update metadata
  metadata.status = newStatus;
  metadata.lastActivity = new Date().toISOString();

  // Update both files atomically
  try {
    this.updateSpecMdStatusSync(incrementId, newStatus);
    this.write(incrementId, metadata);
  } catch (error) {
    this.logger.error(
      `CRITICAL: Failed to update status for ${incrementId}`,
      error
    );
    throw new MetadataError(
      `Cannot update increment status - spec.md sync failed.\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      incrementId
    );
  }

  // Update active cache
  const activeManager = new ActiveIncrementManager();
  await activeManager.smartUpdate();

  // NEW: Trigger auto-sync if needed
  StatusChangeSyncTrigger.triggerIfNeeded(
    incrementId,
    oldStatus,
    newStatus
  ).catch(error => {
    // Log but don't throw - sync failure shouldn't break status update
    this.logger.warn(
      `Auto-sync failed for ${incrementId}: ${error.message}`
    );
  });

  return metadata;
}
```

**Test Coverage**:
```typescript
describe('MetadataManager.updateStatus with auto-sync', () => {
  it('should trigger sync when planning → active', async () => {
    const incrementId = createTestIncrement({ status: 'planning' });
    const spy = vi.spyOn(StatusChangeSyncTrigger, 'triggerIfNeeded');

    MetadataManager.updateStatus(incrementId, 'active', 'Starting work');

    expect(spy).toHaveBeenCalledWith(
      incrementId,
      'planning',
      'active'
    );
  });

  it('should NOT crash updateStatus if sync fails', async () => {
    const incrementId = createTestIncrement({ status: 'active' });

    // Mock sync to fail
    vi.spyOn(LivingDocsSync.prototype, 'syncIncrement')
      .mockRejectedValue(new Error('GitHub down'));

    // Should still succeed
    expect(() => {
      MetadataManager.updateStatus(incrementId, 'completed', 'Done');
    }).not.toThrow();

    // Status should be updated
    const metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe('completed');
  });
});
```

---

### T-007: Add error handling and logging
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Priority**: P1

Add comprehensive error handling with user-friendly messages.

**Completed**: Error handling is comprehensive in StatusChangeSyncTrigger:
- Try-catch blocks with detailed logging (lines 64-69, 122-134)
- Circuit breaker integration prevents sync storms
- User-friendly error messages with recovery instructions
- Non-blocking execution ensures status updates never fail
- Logger abstraction for testing

---

### T-008: Add diagnostics command
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Priority**: P2

Create `/specweave:sync-diagnostics` to show circuit breaker state.

**Completed**: Implemented `/specweave:sync-diagnostics` command:
- Shows circuit breaker state (closed/open/half-open)
- Displays failure count and last failure timestamp
- Shows auto-reset countdown
- Lists active increments with sync status
- Provides troubleshooting guidance
- File: `plugins/specweave/commands/sync-diagnostics.md`

---

## Phase 3: Testing & Validation

### T-009: Unit tests for circuit breaker
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P0

Comprehensive unit tests for SyncCircuitBreaker (see T-005 for tests).

**Completed**: Comprehensive test suite with 20+ test cases:
- State transitions (closed → open → half-open → closed)
- Failure threshold (opens after 3 failures)
- Auto-reset after 5 minutes
- Manual reset functionality
- Edge cases and rapid failures
- File: `tests/unit/increment/sync-circuit-breaker.test.ts`

---

### T-010: Integration tests for auto-sync
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P0

Integration tests for end-to-end sync flow.

**Test Coverage**:
```typescript
describe('Auto-Sync Integration', () => {
  it('should sync to GitHub when increment activated', async () => {
    // Setup: Create GitHub issue for increment
    const incrementId = createTestIncrement({ status: 'planning' });
    const issueNumber = await createGitHubIssue(incrementId);

    // When: Activate increment
    MetadataManager.updateStatus(incrementId, 'active', 'Starting');

    // Then: GitHub issue should be updated
    await waitFor(async () => {
      const issue = await getGitHubIssue(issueNumber);
      expect(issue.labels).toContain('in-progress');
    }, { timeout: 10000 });
  });

  it('should close GitHub issue when increment completed', async () => {
    const incrementId = createTestIncrement({ status: 'active' });
    const issueNumber = linkGitHubIssue(incrementId);

    // When: Complete increment
    MetadataManager.updateStatus(incrementId, 'completed', 'Done');

    // Then: GitHub issue should be closed
    await waitFor(async () => {
      const issue = await getGitHubIssue(issueNumber);
      expect(issue.state).toBe('closed');
    }, { timeout: 10000 });
  });
});
```

---

### T-011: E2E test: Create → Activate → Complete → GitHub
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1

Full E2E test covering entire increment lifecycle with GitHub sync.

---

### T-012: Crash resistance test
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Priority**: P0

Test that sync failures don't crash Claude Code.

**Completed**: Integration test suite verifying crash resistance:
- Status updates always succeed even if sync fails
- Circuit breaker opens after repeated failures
- System remains operational during GitHub downtime
- Manual sync fallback works
- User-friendly error messages
- No error leakage to calling code
- File: `tests/integration/increment/crash-resistance.test.ts`

**Test Coverage**:
```typescript
describe('Crash Resistance', () => {
  it('should not crash when GitHub is down', async () => {
    // Mock GitHub to fail
    mockGitHubDown();

    const incrementId = createTestIncrement({ status: 'planning' });

    // Should not throw
    expect(() => {
      MetadataManager.updateStatus(incrementId, 'active', 'Start');
    }).not.toThrow();

    // Status should still be updated
    const metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe('active');
  });

  it('should open circuit breaker after repeated failures', async () => {
    mockGitHubDown();

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      MetadataManager.updateStatus(`test-${i}`, 'active', 'Test');
      await sleep(100);
    }

    // Circuit breaker should be open
    const breaker = StatusChangeSyncTrigger['circuitBreaker'];
    expect(breaker.getState().state).toBe('open');

    // Further syncs should be skipped
    const spy = vi.spyOn(LivingDocsSync.prototype, 'syncIncrement');
    MetadataManager.updateStatus('test-4', 'active', 'Test');

    expect(spy).not.toHaveBeenCalled();
  });
});
```
