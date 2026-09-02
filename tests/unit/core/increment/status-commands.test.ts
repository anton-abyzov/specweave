/**
 * Unit tests for status-commands
 *
 * Tests pauseIncrement, resumeIncrement, abandonIncrement, completeIncrement
 * with mocked MetadataManager and process.exit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IncrementStatus, IncrementType } from '../../../../src/core/types/increment-metadata.js';

// ─── Mocked MetadataManager ──────────────────────────────────────
const mockRead = vi.fn();
const mockUpdateStatus = vi.fn();
const mockGetActive = vi.fn().mockReturnValue([]);
const mockGetAll = vi.fn().mockReturnValue([]);
const mockGetExtended = vi.fn();
const mockOnIncrementDone = vi.fn().mockResolvedValue({ syncErrors: [], syncSuccess: [] });

vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: {
    read: (...args: unknown[]) => mockRead(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    getActive: () => mockGetActive(),
    getAll: () => mockGetAll(),
    getExtended: (...args: unknown[]) => mockGetExtended(...args),
  },
}));

// Advisory WIP limit is fixed for the display test; buildWipNote stays real.
vi.mock('../../../../src/core/increment/discipline-checker.js', async (importActual) => {
  const actual = await importActual<typeof import('../../../../src/core/increment/discipline-checker.js')>();
  return {
    ...actual,
    DisciplineChecker: class {
      getLimits() {
        return { activeIncrements: 2 };
      }
    },
  };
});

vi.mock('../../../../src/core/hooks/LifecycleHookDispatcher.js', () => ({
  LifecycleHookDispatcher: {
    onIncrementDone: (...args: unknown[]) => mockOnIncrementDone(...args),
  },
}));

const mockSyncIncrement = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = mockSyncIncrement;
  },
}));

const mockCloseCompletedIncrementIssues = vi.fn().mockResolvedValue({ closed: 0, milestoneClose: false, errors: [] });
vi.mock('../../../../src/sync/github-reconciler.js', () => ({
  GitHubReconciler: {
    closeCompletedIncrementIssues: (...args: unknown[]) => mockCloseCompletedIncrementIssues(...args),
  },
}));

// Mock process.exit — throw to halt code execution (like real process.exit)
class ProcessExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
  throw new ProcessExitError(code ?? 0);
});

// Suppress console output
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

import {
  pauseIncrement,
  resumeIncrement,
  abandonIncrement,
  completeIncrement,
  showStatus,
} from '../../../../src/core/increment/status-commands.js';

function makeMetadata(overrides: Record<string, unknown> = {}) {
  return {
    id: '0001-test',
    name: 'test',
    type: IncrementType.FEATURE,
    status: IncrementStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('status-commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── pauseIncrement ─────────────────────────────────────────────

  describe('showStatus', () => {
    it('counts the same increments in the Active group and the advisory note', async () => {
      mockGetAll.mockReturnValue([
        makeMetadata({ id: '0001-a', status: IncrementStatus.ACTIVE }),
        makeMetadata({ id: '0002-a', status: IncrementStatus.ACTIVE }),
        makeMetadata({ id: '0003-r', status: IncrementStatus.READY_FOR_REVIEW }),
        makeMetadata({ id: '0004-p', status: IncrementStatus.PLANNING }),
        makeMetadata({ id: '0005-b', status: IncrementStatus.BACKLOG }),
        makeMetadata({ id: '0006-z', status: IncrementStatus.PAUSED }),
      ]);
      mockGetExtended.mockReturnValue({ progress: 0, ageInDays: 1, daysPaused: 1 });

      await showStatus();

      const out = mockLog.mock.calls.map((c) => String(c[0])).join('\n');
      // active + ready_for_review count; planning/backlog/paused do not
      expect(out).toContain('Active (3)');
      expect(out).toContain('Planning (1)');
      expect(out).toContain('3 active increments (recommended: 2)');
      expect(out).not.toMatch(/EXCEEDS LIMIT/);
    });

    it('prints no advisory note when within the limit', async () => {
      mockGetAll.mockReturnValue([
        makeMetadata({ id: '0001-a', status: IncrementStatus.ACTIVE }),
        makeMetadata({ id: '0002-p', status: IncrementStatus.PLANNING }),
      ]);
      mockGetExtended.mockReturnValue({ progress: 0, ageInDays: 1, daysPaused: 1 });

      await showStatus();

      const out = mockLog.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('Active (1)');
      expect(out).not.toContain('active increments (recommended:');
    });
  });

  describe('pauseIncrement', () => {
    it('should pause an active increment', async () => {
      mockRead.mockReturnValue(makeMetadata());

      await pauseIncrement({ incrementId: '0001-test', reason: 'blocked' });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.PAUSED,
        'blocked'
      );
    });

    it('should use default reason when none provided', async () => {
      mockRead.mockReturnValue(makeMetadata());

      await pauseIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.PAUSED,
        'No reason provided'
      );
    });

    it('should not update when already paused without force', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.PAUSED }));

      await pauseIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('should update reason when already paused with force', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.PAUSED }));

      await pauseIncrement({ incrementId: '0001-test', reason: 'new reason', force: true });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.PAUSED,
        'new reason'
      );
    });

    it('should exit when increment is completed', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.COMPLETED }));

      await expect(pauseIncrement({ incrementId: '0001-test' }))
        .rejects.toThrow(ProcessExitError);
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });
  });

  // ─── resumeIncrement ───────────────────────────────────────────

  describe('resumeIncrement', () => {
    it('should resume a paused increment', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.PAUSED }));
      mockGetActive.mockReturnValue([]);

      await resumeIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.ACTIVE
      );
    });

    it('should resume an abandoned increment', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.ABANDONED }));
      mockGetActive.mockReturnValue([]);

      await resumeIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.ACTIVE
      );
    });

    it('should not resume when already active', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.ACTIVE }));

      await resumeIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('should exit when increment is completed', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.COMPLETED }));

      await expect(resumeIncrement({ incrementId: '0001-test' }))
        .rejects.toThrow(ProcessExitError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

  });

  // ─── abandonIncrement ──────────────────────────────────────────

  describe('abandonIncrement', () => {
    it('should abandon an active increment', async () => {
      mockRead.mockReturnValue(makeMetadata());

      await abandonIncrement({ incrementId: '0001-test', reason: 'no longer needed', force: true });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.ABANDONED,
        'no longer needed'
      );
    });

    it('should use default reason when none provided', async () => {
      mockRead.mockReturnValue(makeMetadata());

      await abandonIncrement({ incrementId: '0001-test', force: true });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.ABANDONED,
        'No reason provided'
      );
    });

    it('should not update when already abandoned without force', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.ABANDONED }));

      await abandonIncrement({ incrementId: '0001-test' });

      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('should update reason when already abandoned with force', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.ABANDONED }));

      await abandonIncrement({
        incrementId: '0001-test',
        reason: 'updated reason',
        force: true,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.ABANDONED,
        'updated reason'
      );
    });

    it('should exit when increment is completed', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.COMPLETED }));

      await expect(abandonIncrement({ incrementId: '0001-test', force: true }))
        .rejects.toThrow(ProcessExitError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  // ─── completeIncrement ─────────────────────────────────────────

  describe('completeIncrement', () => {
    it('should return true when already completed', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.COMPLETED }));

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      expect(result).toBe(true);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('should auto-walk paused increment through READY_FOR_REVIEW to COMPLETED', async () => {
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.PAUSED }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      expect(result).toBe(true);
      // Intermediate: PAUSED -> READY_FOR_REVIEW
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.READY_FOR_REVIEW
      );
      // Final: READY_FOR_REVIEW -> COMPLETED
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.COMPLETED
      );
    });

    it('should auto-walk active increment through READY_FOR_REVIEW to COMPLETED', async () => {
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      expect(result).toBe(true);
      // Intermediate: ACTIVE -> READY_FOR_REVIEW
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.READY_FOR_REVIEW
      );
      // Final: READY_FOR_REVIEW -> COMPLETED
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        '0001-test',
        IncrementStatus.COMPLETED
      );
    });

    it('should return false on MetadataManager error', async () => {
      mockRead.mockImplementation(() => {
        throw new Error('file not found');
      });

      const result = await completeIncrement({
        incrementId: '9999-missing',
        skipValidation: true,
      });

      expect(result).toBe(false);
    });

    it('should suppress output in silent mode', async () => {
      const logSpy = vi.spyOn(console, 'log');
      logSpy.mockClear();

      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));

      await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
        silent: true,
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should await LifecycleHookDispatcher.onIncrementDone after completion', async () => {
      const callOrder: string[] = [];
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));
      mockOnIncrementDone.mockImplementation(async () => {
        callOrder.push('hooks');
        return { syncErrors: [], syncSuccess: ['Living docs synced'] };
      });

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      // Hooks should have been called by the time completeIncrement returns
      expect(result).toBe(true);
      expect(mockOnIncrementDone).toHaveBeenCalled();
      expect(callOrder).toContain('hooks');
    });

    it('should auto-walk PLANNING through ACTIVE, READY_FOR_REVIEW to COMPLETED', async () => {
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.PLANNING }))
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      expect(result).toBe(true);
      expect(mockUpdateStatus).toHaveBeenCalledWith('0001-test', IncrementStatus.ACTIVE);
      expect(mockUpdateStatus).toHaveBeenCalledWith('0001-test', IncrementStatus.READY_FOR_REVIEW);
      expect(mockUpdateStatus).toHaveBeenCalledWith('0001-test', IncrementStatus.COMPLETED);
    });

    it('should return false if intermediate transition fails', async () => {
      mockRead.mockReturnValue(makeMetadata({ status: IncrementStatus.PLANNING }));
      mockUpdateStatus.mockImplementationOnce(() => {
        throw new Error('spec.md write failed');
      });

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      expect(result).toBe(false);
    });

    it('should run post-completion sync via LifecycleHookDispatcher', async () => {
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));

      await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      // Living docs sync is now handled by LifecycleHookDispatcher.onIncrementDone
      // (not called directly in completeIncrement)
      expect(mockOnIncrementDone).toHaveBeenCalled();
    });

    it('should return true even when hooks throw (error-isolated)', async () => {
      mockRead
        .mockReturnValueOnce(makeMetadata({ status: IncrementStatus.ACTIVE }))
        .mockReturnValue(makeMetadata({ status: IncrementStatus.READY_FOR_REVIEW }));
      mockOnIncrementDone.mockRejectedValue(new Error('Hook dispatch failed'));

      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const result = await completeIncrement({
        incrementId: '0001-test',
        skipValidation: true,
      });

      // Completion should still succeed
      expect(result).toBe(true);
      expect(mockUpdateStatus).toHaveBeenCalledWith('0001-test', IncrementStatus.COMPLETED);
      // Error should be logged to stderr
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook dispatch failed'),
      );

      stderrSpy.mockRestore();
    });
  });
});
