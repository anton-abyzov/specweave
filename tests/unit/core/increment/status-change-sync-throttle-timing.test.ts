/**
 * Unit tests for StatusChangeSyncTrigger throttle timing fix.
 *
 * Verifies that SyncThrottle.record() is called BEFORE LivingDocsSync.syncIncrement(),
 * preventing reentrancy where a second trigger fires while the first sync is still running.
 *
 * Bug: record() was called AFTER syncIncrement(). Since syncs take 10-30s but the throttle
 * window is 5s, a second trigger could slip through while the first was still running.
 *
 * Fix: record() is now called BEFORE syncIncrement(), closing the reentrancy window.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IncrementStatus } from '../../../../src/core/types/increment-metadata.js';

// ─── Call-order tracking ─────────────────────────────────────────
const callOrder: string[] = [];

// ─── Hoisted mocks ──────────────────────────────────────────────
const { mockShouldSkip, mockRecord, mockSyncIncrement, mockCanSync, mockRecordSuccess } =
  vi.hoisted(() => ({
    mockShouldSkip: vi.fn().mockReturnValue(false),
    mockRecord: vi.fn(),
    mockSyncIncrement: vi.fn().mockResolvedValue({ success: true }),
    mockCanSync: vi.fn().mockReturnValue(true),
    mockRecordSuccess: vi.fn(),
  }));

// ─── Mock SyncThrottle ──────────────────────────────────────────
vi.mock('../../../../src/core/sync-throttle.js', () => ({
  SyncThrottle: class {
    shouldSkip = (...args: unknown[]) => mockShouldSkip(...args);
    record = (...args: unknown[]) => {
      callOrder.push('throttle.record');
      return mockRecord(...args);
    };
  },
}));

// ─── Mock LivingDocsSync ────────────────────────────────────────
vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = (...args: unknown[]) => {
      callOrder.push('sync.syncIncrement');
      return mockSyncIncrement(...args);
    };
  },
}));

// ─── Mock the livingDocs config gate ────────────────────────────
// 2.0 only generates living docs when `config.livingDocs === 'onDone'`.
// These tests are about throttle-vs-sync ordering, so the gate is open here;
// the closed-gate behaviour has its own test at the bottom of this file.
const { mockLivingDocsEnabled } = vi.hoisted(() => ({
  mockLivingDocsEnabled: vi.fn().mockReturnValue(true),
}));
vi.mock('../../../../src/core/living-docs/living-docs-enabled.js', () => ({
  livingDocsEnabled: (...args: unknown[]) => mockLivingDocsEnabled(...args),
}));

// ─── Mock the external-tracker gate ─────────────────────────────
// With no tracker configured there is nowhere to sync TO, and the trigger must
// not run the pipeline (nor print "Auto-synced … to external tools").
const { mockExternalSyncConfigured } = vi.hoisted(() => ({
  mockExternalSyncConfigured: vi.fn().mockReturnValue(true),
}));
vi.mock('../../../../src/sync/external-sync-configured.js', () => ({
  externalSyncConfigured: (...args: unknown[]) => mockExternalSyncConfigured(...args),
}));

// ─── Mock SyncCircuitBreaker ────────────────────────────────────
vi.mock('../../../../src/core/increment/sync-circuit-breaker.js', () => ({
  SyncCircuitBreaker: class {
    canSync = mockCanSync;
    recordSuccess = mockRecordSuccess;
    recordFailure = vi.fn();
    getState = vi.fn().mockReturnValue({ state: 'closed', failures: 0 });
    reset = vi.fn();
  },
}));

// ─── Mock resolveEffectiveRoot ──────────────────────────────────
vi.mock('../../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: () => '/fake/project',
}));

// ─── Mock ConfigManager (force immediate sync mode for these tests) ─
vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class {
    async read() {
      return { sync: { mode: 'immediate' } };
    }
  },
}));

// ─── Mock external-issue-auto-creator (dynamic import in spawnAsyncSync) ──
vi.mock('../../../../src/sync/external-issue-auto-creator.js', () => ({
  autoCreateExternalIssue: vi.fn().mockResolvedValue({ success: true, skipped: true }),
}));

// ─── Mock sync-coordinator (dynamic import for autoCloseExternalIssues) ──
vi.mock('../../../../src/sync/sync-coordinator.js', () => ({
  SyncCoordinator: class {
    syncIncrementClosure = vi.fn().mockResolvedValue({ success: true, closedIssues: [] });
  },
}));

// ─── Mock logger ────────────────────────────────────────────────
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock fs (hasMissingFeatureId reads metadata.json via dynamic import) ─
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    promises: {
      ...actual.promises,
      readFile: vi.fn().mockRejectedValue(new Error('not found')),
    },
  };
});

// ─── Import SUT after all mocks are registered ──────────────────
import { StatusChangeSyncTrigger } from '../../../../src/core/increment/status-change-sync-trigger.js';

/**
 * Helper: flush the microtask queue so the fire-and-forget promise
 * inside triggerIfNeeded has time to settle.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe('StatusChangeSyncTrigger throttle timing', () => {
  let savedNodeEnv: string | undefined;
  let savedVitest: string | undefined;

  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
    mockShouldSkip.mockReturnValue(false);
    mockCanSync.mockReturnValue(true);
    mockLivingDocsEnabled.mockReturnValue(true);
    mockExternalSyncConfigured.mockReturnValue(true);

    // The SUT early-returns when NODE_ENV=test or VITEST is set.
    // Temporarily remove both so triggerIfNeeded executes the real path.
    savedNodeEnv = process.env.NODE_ENV;
    savedVitest = process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.VITEST;

    StatusChangeSyncTrigger.suppressForCompletion = false;
  });

  afterEach(() => {
    // Restore env vars
    if (savedNodeEnv !== undefined) {
      process.env.NODE_ENV = savedNodeEnv;
    }
    if (savedVitest !== undefined) {
      process.env.VITEST = savedVitest;
    }
  });

  it('calls SyncThrottle.record() BEFORE LivingDocsSync.syncIncrement()', async () => {
    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0001-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    // triggerIfNeeded fires spawnAsyncSync without await -- wait for it
    await flushMicrotasks();

    // Both must have been called
    expect(callOrder).toContain('throttle.record');
    expect(callOrder).toContain('sync.syncIncrement');

    // record() must come first
    const recordIdx = callOrder.indexOf('throttle.record');
    const syncIdx = callOrder.indexOf('sync.syncIncrement');
    expect(recordIdx).toBeLessThan(syncIdx);
  });

  it('skips sync when SyncThrottle.shouldSkip() returns true (second rapid call throttled)', async () => {
    // First call: not throttled
    mockShouldSkip.mockReturnValueOnce(false);
    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0002-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    await flushMicrotasks();
    expect(mockSyncIncrement).toHaveBeenCalledTimes(1);

    // Reset to track second call independently
    mockSyncIncrement.mockClear();

    // Second call: throttled
    mockShouldSkip.mockReturnValueOnce(true);
    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0002-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    await flushMicrotasks();

    // syncIncrement must NOT have been called for the throttled invocation
    expect(mockSyncIncrement).not.toHaveBeenCalled();
  });

  it('checks SyncThrottle.shouldSkip() before spawning sync', async () => {
    mockShouldSkip.mockReturnValue(true);

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0003-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    await flushMicrotasks();

    // shouldSkip was consulted
    expect(mockShouldSkip).toHaveBeenCalledWith('0003-test');

    // Sync was never spawned
    expect(mockSyncIncrement).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('never generates living docs when config.livingDocs is off (2.0 default)', async () => {
    mockLivingDocsEnabled.mockReturnValue(false);
    mockExternalSyncConfigured.mockReturnValue(true);

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0004-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    await flushMicrotasks();

    // The status-change trigger is how `livingDocs: false` projects still got a
    // freshly generated FEATURE.md written at the moment of closure.
    expect(mockSyncIncrement).not.toHaveBeenCalled();
    // External sync still runs — only doc GENERATION is gated.
    expect(mockRecord).toHaveBeenCalledWith('0004-test');
  });

  it('does nothing at all when neither living docs nor a tracker is configured', async () => {
    // The 2.0 default project: `livingDocs: false`, no sync block. The trigger
    // used to run the whole pipeline anyway and announce
    // "✅ Auto-synced increment … to external tools" — in a project whose own
    // doctor reports "no external sync enabled".
    mockLivingDocsEnabled.mockReturnValue(false);
    mockExternalSyncConfigured.mockReturnValue(false);

    await StatusChangeSyncTrigger.triggerIfNeeded(
      '0006-test',
      IncrementStatus.PLANNED,
      IncrementStatus.ACTIVE
    );
    await flushMicrotasks();

    expect(mockSyncIncrement).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockRecordSuccess).not.toHaveBeenCalled();
  });

  it('is a no-op while a closure is in progress (single sync point)', async () => {
    StatusChangeSyncTrigger.suppressForCompletion = true;
    try {
      await StatusChangeSyncTrigger.triggerIfNeeded(
        '0005-test',
        IncrementStatus.ACTIVE,
        IncrementStatus.READY_FOR_REVIEW
      );
      await flushMicrotasks();
    } finally {
      StatusChangeSyncTrigger.suppressForCompletion = false;
    }

    expect(mockSyncIncrement).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
