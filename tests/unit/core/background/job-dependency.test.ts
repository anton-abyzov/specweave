/**
 * Job Dependency System Tests
 *
 * Tests for checkDependencies, waitForDependencies, detectCircularDependencies,
 * and formatDependencyStatus functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkDependencies,
  waitForDependencies,
  detectCircularDependencies,
  formatDependencyStatus,
  type DependencyStatus
} from '../../../../src/core/background/job-dependency.js';
import type { BackgroundJobManager } from '../../../../src/core/background/job-manager.js';
import type { BackgroundJob } from '../../../../src/core/background/types.js';

function createMockJobManager(jobs: Record<string, Partial<BackgroundJob>>): BackgroundJobManager {
  return {
    getJob: vi.fn((id: string) => {
      const job = jobs[id];
      if (!job) return null;
      return job as BackgroundJob;
    })
  } as unknown as BackgroundJobManager;
}

describe('job-dependency', () => {
  describe('checkDependencies', () => {
    it('returns ready when no dependencies', () => {
      const jm = createMockJobManager({});
      const status = checkDependencies(jm, undefined);
      expect(status.ready).toBe(true);
      expect(status.waitingFor).toEqual([]);
      expect(status.failedDeps).toEqual([]);
      expect(status.completedDeps).toEqual([]);
    });

    it('returns ready when dependencies is empty array', () => {
      const jm = createMockJobManager({});
      const status = checkDependencies(jm, []);
      expect(status.ready).toBe(true);
    });

    it('treats completed deps as satisfied', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'completed' },
        'job-2': { status: 'completed' }
      });
      const status = checkDependencies(jm, ['job-1', 'job-2']);
      expect(status.ready).toBe(true);
      expect(status.completedDeps).toEqual(['job-1', 'job-2']);
      expect(status.waitingFor).toEqual([]);
    });

    it('treats completed_with_warnings as satisfied', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'completed_with_warnings' }
      });
      const status = checkDependencies(jm, ['job-1']);
      expect(status.ready).toBe(true);
      expect(status.completedDeps).toEqual(['job-1']);
    });

    it('treats missing jobs as completed (deleted or never created)', () => {
      const jm = createMockJobManager({});
      const status = checkDependencies(jm, ['nonexistent']);
      expect(status.ready).toBe(true);
      expect(status.completedDeps).toEqual(['nonexistent']);
    });

    it('marks failed deps correctly', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'failed' }
      });
      const status = checkDependencies(jm, ['job-1']);
      // Failed deps still count as "ready" (not waiting anymore)
      expect(status.ready).toBe(true);
      expect(status.failedDeps).toEqual(['job-1']);
    });

    it('marks running deps as waiting', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'running' }
      });
      const status = checkDependencies(jm, ['job-1']);
      expect(status.ready).toBe(false);
      expect(status.waitingFor).toEqual(['job-1']);
    });

    it('marks pending deps as waiting', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'pending' }
      });
      const status = checkDependencies(jm, ['job-1']);
      expect(status.ready).toBe(false);
      expect(status.waitingFor).toEqual(['job-1']);
    });

    it('marks paused deps as waiting', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'paused' }
      });
      const status = checkDependencies(jm, ['job-1']);
      expect(status.ready).toBe(false);
      expect(status.waitingFor).toEqual(['job-1']);
    });

    it('handles mixed dependency statuses', () => {
      const jm = createMockJobManager({
        'job-1': { status: 'completed' },
        'job-2': { status: 'running' },
        'job-3': { status: 'failed' },
        // job-4 doesn't exist (treated as completed)
      });
      const status = checkDependencies(jm, ['job-1', 'job-2', 'job-3', 'job-4']);
      expect(status.ready).toBe(false);
      expect(status.completedDeps).toEqual(['job-1', 'job-4']);
      expect(status.waitingFor).toEqual(['job-2']);
      expect(status.failedDeps).toEqual(['job-3']);
    });
  });

  describe('waitForDependencies', () => {
    // Mock getJobManager module
    const mockGetJobManager = vi.hoisted(() => vi.fn());

    vi.mock('../../../../src/core/background/job-manager.js', () => ({
      getJobManager: mockGetJobManager
    }));

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns immediately when no dependencies', async () => {
      const onProgress = vi.fn();
      mockGetJobManager.mockReturnValue(createMockJobManager({}));

      const status = await waitForDependencies('/project', undefined, onProgress, 10);
      expect(status.ready).toBe(true);
      expect(onProgress).toHaveBeenCalledTimes(1);
    });

    it('returns immediately when all deps already completed', async () => {
      const onProgress = vi.fn();
      mockGetJobManager.mockReturnValue(createMockJobManager({
        'job-1': { status: 'completed' }
      }));

      const status = await waitForDependencies('/project', ['job-1'], onProgress, 10);
      expect(status.ready).toBe(true);
      expect(status.completedDeps).toEqual(['job-1']);
    });

    it('polls until dependencies complete', async () => {
      const onProgress = vi.fn();
      let getJobCallCount = 0;

      // waitForDependencies calls getJobManager once and reuses the instance.
      // So we mock getJob on that single instance to return different statuses.
      const mockGetJob = vi.fn().mockImplementation(() => {
        getJobCallCount++;
        if (getJobCallCount <= 2) {
          return { status: 'running' } as BackgroundJob;
        }
        return { status: 'completed' } as BackgroundJob;
      });

      mockGetJobManager.mockReturnValue({ getJob: mockGetJob });

      const status = await waitForDependencies('/project', ['job-1'], onProgress, 10);
      expect(status.ready).toBe(true);
      expect(status.completedDeps).toEqual(['job-1']);
      // onProgress called: once per poll while waiting + once for ready
      expect(onProgress).toHaveBeenCalledTimes(3);
    });

    it('reports failed dependencies as ready', async () => {
      const onProgress = vi.fn();
      mockGetJobManager.mockReturnValue(createMockJobManager({
        'job-1': { status: 'failed' }
      }));

      const status = await waitForDependencies('/project', ['job-1'], onProgress, 10);
      expect(status.ready).toBe(true);
      expect(status.failedDeps).toEqual(['job-1']);
    });
  });

  describe('detectCircularDependencies', () => {
    it('returns empty for no dependencies', () => {
      const jm = createMockJobManager({});
      const chains = detectCircularDependencies(jm, 'job-A', undefined);
      expect(chains).toEqual([]);
    });

    it('returns empty for empty dependencies', () => {
      const jm = createMockJobManager({});
      const chains = detectCircularDependencies(jm, 'job-A', []);
      expect(chains).toEqual([]);
    });

    it('detects direct self-reference', () => {
      const jm = createMockJobManager({});
      const chains = detectCircularDependencies(jm, 'job-A', ['job-A']);
      expect(chains).toHaveLength(1);
      expect(chains[0]).toEqual(['job-A', 'job-A']);
    });

    it('detects circular chain through another job', () => {
      const jm = createMockJobManager({
        'job-B': { config: { dependsOn: ['job-A'] } as any }
      });
      const chains = detectCircularDependencies(jm, 'job-A', ['job-B']);
      expect(chains).toHaveLength(1);
      expect(chains[0]).toEqual(['job-A', 'job-B', 'job-A']);
    });

    it('returns empty when no circular dependency exists', () => {
      const jm = createMockJobManager({
        'job-B': { config: { dependsOn: ['job-C'] } as any },
        'job-C': { config: {} as any }
      });
      const chains = detectCircularDependencies(jm, 'job-A', ['job-B']);
      expect(chains).toEqual([]);
    });

    it('handles missing jobs gracefully', () => {
      const jm = createMockJobManager({});
      const chains = detectCircularDependencies(jm, 'job-A', ['job-B']);
      expect(chains).toEqual([]);
    });
  });

  describe('formatDependencyStatus', () => {
    it('formats all completed', () => {
      const status: DependencyStatus = {
        ready: true,
        waitingFor: [],
        failedDeps: [],
        completedDeps: ['job-1']
      };
      expect(formatDependencyStatus(status)).toBe('All dependencies completed');
    });

    it('formats ready with failed deps', () => {
      const status: DependencyStatus = {
        ready: true,
        waitingFor: [],
        failedDeps: ['job-1'],
        completedDeps: ['job-2']
      };
      expect(formatDependencyStatus(status)).toContain('1 failed');
      expect(formatDependencyStatus(status)).toContain('proceeding with partial data');
    });

    it('formats waiting status', () => {
      const status: DependencyStatus = {
        ready: false,
        waitingFor: ['job-1', 'job-2'],
        failedDeps: [],
        completedDeps: ['job-3']
      };
      const formatted = formatDependencyStatus(status);
      expect(formatted).toContain('Waiting for: job-1, job-2');
      expect(formatted).toContain('Completed: 1');
    });

    it('formats status with all categories', () => {
      const status: DependencyStatus = {
        ready: false,
        waitingFor: ['job-1'],
        failedDeps: ['job-2'],
        completedDeps: ['job-3']
      };
      const formatted = formatDependencyStatus(status);
      expect(formatted).toContain('Waiting for: job-1');
      expect(formatted).toContain('Completed: 1');
      expect(formatted).toContain('Failed: 1');
    });
  });
});
