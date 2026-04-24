/**
 * Hotfix 0696: LifecycleHookDispatcher forwards SyncCoordinator closure errors
 *
 * Proves:
 *   AC-US3-02: dispatcher's result.syncErrors MUST include every string in
 *              the SyncCoordinator.syncIncrementClosure() result.errors[].
 *   AC-US3-03: logError() MUST persist closure errors to
 *              .specweave/logs/hooks.log AND survive fs failures.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConfigRead = vi.fn();
  const mockSyncIncrement = vi.fn();
  const mockSyncIncrementClosure = vi.fn();
  const mockAppendFileSync = vi.fn();
  const mockMkdirSync = vi.fn();
  return {
    mockConfigRead,
    mockSyncIncrement,
    mockSyncIncrementClosure,
    mockAppendFileSync,
    mockMkdirSync,
  };
});

// Mock fs before any module that might import it
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    appendFileSync: mocks.mockAppendFileSync,
    mkdirSync: mocks.mockMkdirSync,
  };
});

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class {
    read = mocks.mockConfigRead;
  },
}));

vi.mock('../../../../src/sync/external-issue-auto-creator.js', () => ({
  autoCreateExternalIssue: vi.fn(),
}));

vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = mocks.mockSyncIncrement;
    getProjectId = () => 'test-project';
  },
}));

vi.mock('../../../../src/sync/sync-coordinator.js', () => ({
  SyncCoordinator: class {
    syncIncrementClosure = mocks.mockSyncIncrementClosure;
  },
}));

// Stub MetadataManager used inside the dispatcher (per-increment skip lookup)
vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: class {
    static read = vi.fn().mockReturnValue({ skipLivingDocsSync: false });
  },
}));

// Stub retry queue drain to no-op
vi.mock('../../../../src/cli/commands/sync-retry.js', () => ({
  drainRetryQueueForIncrement: vi.fn().mockResolvedValue({ attempted: 0, succeeded: 0 }),
}));

// Stub skill-gen signals (non-blocking best-effort)
vi.mock('../../../../src/core/skill-gen/signal-collector.js', () => ({
  SignalCollector: class {
    collect = vi.fn().mockResolvedValue(undefined);
    constructor(_r: string) {}
  },
}));
vi.mock('../../../../src/core/skill-gen/suggestion-engine.js', () => ({
  SuggestionEngine: class {
    evaluate = vi.fn().mockResolvedValue(undefined);
    constructor(_r: string) {}
  },
}));

import { LifecycleHookDispatcher } from '../../../../src/core/hooks/LifecycleHookDispatcher.js';

describe('LifecycleHookDispatcher.onIncrementDone — closure error forwarding (0696)', () => {
  const projectRoot = '/tmp/test-0696-dispatcher';
  const incrementId = '0696-hotfix-fixture';
  const bypass = { _bypassTestGuard: true, directSync: true } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockConfigRead.mockResolvedValue({
      hooks: {
        post_increment_done: {
          close_github_issue: true,
        },
      },
      sync: {
        settings: {
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true,
        },
      },
    });
    mocks.mockSyncIncrement.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- T-005 — dispatcher forwards closureResult.errors into syncErrors ----
  it('T-005: forwards SyncCoordinator closure errors into result.syncErrors', async () => {
    mocks.mockSyncIncrementClosure.mockResolvedValue({
      success: false,
      userStoriesSynced: 0,
      syncMode: 'full-sync',
      errors: ['JIRA SWE2E-X: boom'],
      closedIssues: [],
    });

    const result = await LifecycleHookDispatcher.onIncrementDone(
      projectRoot,
      incrementId,
      bypass,
    );

    expect(result.syncErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('JIRA SWE2E-X: boom')]),
    );
  });

  // ---- T-006 — closure errors are persisted to .specweave/logs/hooks.log ----
  it('T-006: persists closure-thrown errors to .specweave/logs/hooks.log', async () => {
    mocks.mockSyncIncrementClosure.mockRejectedValue(new Error('network ECONNRESET'));
    mocks.mockAppendFileSync.mockImplementation(() => undefined);
    mocks.mockMkdirSync.mockImplementation(() => undefined);

    const result = await LifecycleHookDispatcher.onIncrementDone(
      projectRoot,
      incrementId,
      bypass,
    );

    const appendCalls = mocks.mockAppendFileSync.mock.calls;
    const relevantCall = appendCalls.find(c => String(c[0]).includes('hooks.log'));
    expect(relevantCall, 'expected an appendFileSync call targeting .specweave/logs/hooks.log').toBeDefined();

    const writtenContent = appendCalls
      .filter(c => String(c[0]).includes('hooks.log'))
      .map(c => String(c[1]))
      .join('\n');

    expect(writtenContent).toMatch(/onIncrementDone:closure/);
    expect(writtenContent).toMatch(/ECONNRESET/);
    expect(result.syncErrors.some(e => /ECONNRESET/.test(e))).toBe(true);
  });

  it('T-006b: logError is exception-safe when appendFileSync throws', async () => {
    mocks.mockSyncIncrementClosure.mockRejectedValue(new Error('boom'));
    mocks.mockMkdirSync.mockImplementation(() => undefined);
    mocks.mockAppendFileSync.mockImplementation(() => {
      throw new Error('EROFS: read-only filesystem');
    });

    // Must not throw even though the writer fails.
    await expect(
      LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass),
    ).resolves.toBeTruthy();
  });
});
