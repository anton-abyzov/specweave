/**
 * LifecycleHookDispatcher Queue Mode Tests
 *
 * Verifies that onTaskCompleted and onIncrementDone respect sync.mode config.
 * When mode is "queued", events are queued via queueSyncEvent instead of
 * calling LivingDocsSync directly.
 *
 * Satisfies: AC-US1-02, AC-US1-03 (T-002)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks for ESM compatibility
const mocks = vi.hoisted(() => {
  const mockConfigRead = vi.fn();
  const mockSyncIncrement = vi.fn();
  const mockQueueSyncEvent = vi.fn();
  const mockSyncIncrementClosure = vi.fn();
  return {
    mockConfigRead,
    mockSyncIncrement,
    mockQueueSyncEvent,
    mockSyncIncrementClosure,
  };
});

vi.mock('../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class {
    read = mocks.mockConfigRead;
  },
}));

vi.mock('../../../src/core/sync/event-queue.js', () => ({
  queueSyncEvent: mocks.mockQueueSyncEvent,
}));

vi.mock('../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = mocks.mockSyncIncrement;
    getProjectId = () => 'test-project';
  },
}));

vi.mock('../../../src/sync/sync-coordinator.js', () => ({
  SyncCoordinator: class {
    syncIncrementClosure = mocks.mockSyncIncrementClosure;
  },
}));

vi.mock('../../../src/cli/commands/sync-retry.js', () => ({
  drainRetryQueueForIncrement: vi.fn().mockResolvedValue({ attempted: 0, succeeded: 0 }),
}));

vi.mock('../../../src/core/skill-gen/signal-collector.js', () => ({
  SignalCollector: class {
    collect = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../../src/core/skill-gen/suggestion-engine.js', () => ({
  SuggestionEngine: class {
    evaluate = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: {
    read: vi.fn().mockReturnValue({ skipLivingDocsSync: false }),
  },
}));

import { LifecycleHookDispatcher } from '../../../src/core/hooks/LifecycleHookDispatcher.js';

describe('LifecycleHookDispatcher Queue Mode', () => {
  const bypass = { _bypassTestGuard: true } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockQueueSyncEvent.mockResolvedValue(undefined);
    mocks.mockSyncIncrement.mockResolvedValue({ success: true });
    mocks.mockSyncIncrementClosure.mockResolvedValue({ success: true, closedIssues: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper: set config to return queued or immediate mode
  function setMode(mode: 'queued' | 'immediate') {
    mocks.mockConfigRead.mockResolvedValue({
      hooks: {
        post_task_completion: { sync_tasks_md: true, external_tracker_sync: true },
        post_increment_done: { sync_living_docs: true, close_github_issue: true },
      },
      sync: {
        mode,
        settings: { autoSyncOnCompletion: true },
      },
    });
  }

  describe('onTaskCompleted() with sync.mode="queued"', () => {
    it('queues event instead of calling LivingDocsSync directly', async () => {
      setMode('queued');

      await LifecycleHookDispatcher.onTaskCompleted(
        '/fake/root',
        '0618',
        { ...bypass, taskId: 'T-001' },
      );

      expect(mocks.mockQueueSyncEvent).toHaveBeenCalledWith(
        '/fake/root',
        '0618',
        'task.completed',
        { taskId: 'T-001' },
      );
      expect(mocks.mockSyncIncrement).not.toHaveBeenCalled();
    });
  });

  describe('onTaskCompleted() with sync.mode="immediate"', () => {
    it('calls LivingDocsSync directly (legacy behavior)', async () => {
      setMode('immediate');

      await LifecycleHookDispatcher.onTaskCompleted(
        '/fake/root',
        '0618',
        { ...bypass, taskId: 'T-001' },
      );

      expect(mocks.mockQueueSyncEvent).not.toHaveBeenCalled();
      expect(mocks.mockSyncIncrement).toHaveBeenCalled();
    });
  });

  describe('onIncrementDone() with directSync option', () => {
    it('calls LivingDocsSync directly when directSync=true regardless of mode', async () => {
      setMode('queued');

      await LifecycleHookDispatcher.onIncrementDone(
        '/fake/root',
        '0618',
        { ...bypass, directSync: true },
      );

      // Should call LivingDocsSync directly even in queued mode
      expect(mocks.mockSyncIncrement).toHaveBeenCalled();
      expect(mocks.mockQueueSyncEvent).not.toHaveBeenCalled();
    });
  });

  describe('onIncrementDone() without directSync in queued mode', () => {
    it('queues event instead of calling LivingDocsSync directly', async () => {
      setMode('queued');

      const result = await LifecycleHookDispatcher.onIncrementDone(
        '/fake/root',
        '0618',
        { ...bypass },
      );

      expect(mocks.mockQueueSyncEvent).toHaveBeenCalledWith(
        '/fake/root',
        '0618',
        'increment.done',
      );
      expect(mocks.mockSyncIncrement).not.toHaveBeenCalled();
      expect(result.syncSuccess).toContain('Event queued for deferred sync');
    });
  });

  describe('onIncrementDone() in immediate mode', () => {
    it('calls LivingDocsSync directly (legacy behavior)', async () => {
      setMode('immediate');

      await LifecycleHookDispatcher.onIncrementDone(
        '/fake/root',
        '0618',
        { ...bypass },
      );

      expect(mocks.mockSyncIncrement).toHaveBeenCalled();
      expect(mocks.mockQueueSyncEvent).not.toHaveBeenCalled();
    });
  });
});
