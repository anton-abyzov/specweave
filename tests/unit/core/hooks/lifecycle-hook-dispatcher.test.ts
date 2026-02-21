/**
 * LifecycleHookDispatcher Unit Tests
 *
 * Tests for the lifecycle hook dispatcher that reads hooks config
 * and dispatches configured actions at lifecycle points.
 *
 * Part of increment 0298: Hook Lifecycle Wiring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoist mocks for ESM compatibility
const mocks = vi.hoisted(() => {
  const mockConfigRead = vi.fn();
  const mockAutoCreateExternalIssue = vi.fn();
  const mockSyncIncrement = vi.fn();
  const mockSyncIncrementClosure = vi.fn();

  return {
    mockConfigRead,
    mockAutoCreateExternalIssue,
    mockSyncIncrement,
    mockSyncIncrementClosure,
  };
});

vi.mock('../../../../src/core/config/config-manager.js', () => {
  return {
    ConfigManager: class {
      read = mocks.mockConfigRead;
    },
  };
});

vi.mock('../../../../src/sync/external-issue-auto-creator.js', () => ({
  autoCreateExternalIssue: mocks.mockAutoCreateExternalIssue,
}));

vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => {
  return {
    LivingDocsSync: class {
      syncIncrement = mocks.mockSyncIncrement;
    },
  };
});

vi.mock('../../../../src/sync/sync-coordinator.js', () => {
  return {
    SyncCoordinator: class {
      syncIncrementClosure = mocks.mockSyncIncrementClosure;
    },
  };
});

// Import after mocks are set up
import { LifecycleHookDispatcher } from '../../../../src/core/hooks/LifecycleHookDispatcher.js';

describe('LifecycleHookDispatcher', () => {
  const projectRoot = '/tmp/test-project';
  const incrementId = '0100-test-feature';
  // All dispatch tests must bypass the test guard since VITEST env is always set
  const bypass = { _bypassTestGuard: true } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no hooks config (safe default)
    mocks.mockConfigRead.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── TC-001 ─────────────────────────────────────────────────────────
  describe('onIncrementPlanned', () => {
    it('TC-001: calls autoCreateExternalIssue when auto_create_github_issue=true', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_planning: {
            auto_create_github_issue: true,
          },
        },
      });
      mocks.mockAutoCreateExternalIssue.mockResolvedValue({ success: true });

      await LifecycleHookDispatcher.onIncrementPlanned(projectRoot, incrementId, bypass);

      expect(mocks.mockAutoCreateExternalIssue).toHaveBeenCalledWith(
        projectRoot,
        incrementId,
      );
    });

    // ─── TC-002 ───────────────────────────────────────────────────────
    it('TC-002: skips when auto_create_github_issue=false', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_planning: {
            auto_create_github_issue: false,
          },
        },
      });

      await LifecycleHookDispatcher.onIncrementPlanned(projectRoot, incrementId, bypass);

      expect(mocks.mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    // ─── TC-003 ───────────────────────────────────────────────────────
    it('TC-003: skips when hooks config is missing', async () => {
      mocks.mockConfigRead.mockResolvedValue({});

      await LifecycleHookDispatcher.onIncrementPlanned(projectRoot, incrementId, bypass);

      expect(mocks.mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    // ─── TC-004 ───────────────────────────────────────────────────────
    it('TC-004: catches and logs errors (non-blocking)', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_planning: {
            auto_create_github_issue: true,
          },
        },
      });
      mocks.mockAutoCreateExternalIssue.mockRejectedValue(new Error('GitHub API down'));

      // Should not throw
      await expect(
        LifecycleHookDispatcher.onIncrementPlanned(projectRoot, incrementId, bypass),
      ).resolves.toBeUndefined();
    });
  });

  // ─── TC-005..007 ────────────────────────────────────────────────────
  describe('onTaskCompleted', () => {
    it('TC-005: dispatches sync when sync_tasks_md=true', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_task_completion: {
            sync_tasks_md: true,
          },
        },
      });
      mocks.mockSyncIncrement.mockResolvedValue({ success: true });

      await LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId, bypass);

      expect(mocks.mockSyncIncrement).toHaveBeenCalledWith(incrementId);
    });

    it('TC-006: dispatches external tracker sync when external_tracker_sync=true', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_task_completion: {
            external_tracker_sync: true,
          },
        },
      });
      mocks.mockSyncIncrementClosure.mockResolvedValue({
        success: true,
        closedIssues: [],
      });

      await LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId, bypass);

      // Verify syncIncrementClosure was called (implying SyncCoordinator was constructed)
      expect(mocks.mockSyncIncrementClosure).toHaveBeenCalled();
    });

    it('TC-007: skips all when both disabled', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_task_completion: {
            sync_tasks_md: false,
            external_tracker_sync: false,
          },
        },
      });

      await LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId, bypass);

      expect(mocks.mockSyncIncrement).not.toHaveBeenCalled();
      expect(mocks.mockSyncIncrementClosure).not.toHaveBeenCalled();
    });
  });

  // ─── TC-008..010 ────────────────────────────────────────────────────
  describe('onIncrementDone', () => {
    it('TC-008: dispatches living docs sync when sync_living_docs=true', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_done: {
            sync_living_docs: true,
          },
        },
      });
      mocks.mockSyncIncrement.mockResolvedValue({ success: true });

      await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

      expect(mocks.mockSyncIncrement).toHaveBeenCalledWith(incrementId);
    });

    it('TC-009: dispatches issue closure when close_github_issue=true', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_done: {
            close_github_issue: true,
          },
        },
      });
      mocks.mockSyncIncrementClosure.mockResolvedValue({
        success: true,
        closedIssues: [42],
      });

      await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

      // Verify syncIncrementClosure was called (implying SyncCoordinator was constructed)
      expect(mocks.mockSyncIncrementClosure).toHaveBeenCalled();
    });

    it('TC-010: respects update_living_docs_first ordering', async () => {
      const callOrder: string[] = [];

      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_done: {
            sync_living_docs: true,
            close_github_issue: true,
            update_living_docs_first: true,
          },
        },
      });

      mocks.mockSyncIncrement.mockImplementation(async () => {
        callOrder.push('livingDocs');
        return { success: true };
      });
      mocks.mockSyncIncrementClosure.mockImplementation(async () => {
        callOrder.push('syncClosure');
        return { success: true, closedIssues: [] };
      });

      await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

      expect(callOrder).toEqual(['livingDocs', 'syncClosure']);
    });
  });

  // ─── TC-011 ─────────────────────────────────────────────────────────
  describe('test environment guard', () => {
    it('TC-011: all methods skip in test environment (VITEST set)', async () => {
      // VITEST env var is always set during vitest runs, so
      // we test the guard by verifying that when _skipTestGuard is not passed,
      // dispatch methods are no-ops. The actual implementation checks process.env.VITEST.
      // Since VITEST IS set in our test env, we need to verify the guard:
      // Call without the internal bypass flag
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_planning: { auto_create_github_issue: true },
          post_task_completion: { sync_tasks_md: true },
          post_increment_done: { sync_living_docs: true },
        },
      });

      // Direct calls (without bypass) should be no-ops because VITEST is set
      await LifecycleHookDispatcher.onIncrementPlanned(projectRoot, incrementId, { _bypassTestGuard: false });
      await LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId, { _bypassTestGuard: false });
      await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, { _bypassTestGuard: false });

      // None of the sync functions should have been called
      expect(mocks.mockConfigRead).not.toHaveBeenCalled();
      expect(mocks.mockAutoCreateExternalIssue).not.toHaveBeenCalled();
      expect(mocks.mockSyncIncrement).not.toHaveBeenCalled();
      expect(mocks.mockSyncIncrementClosure).not.toHaveBeenCalled();
    });
  });

  // ─── TC-012 ─────────────────────────────────────────────────────────
  describe('partial config handling', () => {
    it('TC-012: partial config is handled gracefully', async () => {
      mocks.mockConfigRead.mockResolvedValue({
        hooks: {
          post_increment_planning: {
            auto_create_github_issue: true,
          },
          // post_task_completion is missing entirely
        },
      });

      // Should not throw when accessing missing subsection
      await expect(
        LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId, bypass),
      ).resolves.toBeUndefined();

      // No sync operations should have run
      expect(mocks.mockSyncIncrement).not.toHaveBeenCalled();
      expect(mocks.mockSyncIncrementClosure).not.toHaveBeenCalled();
    });
  });
});
