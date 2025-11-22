/**
 * Integration Tests: JIRA Progress Tracking
 *
 * Tests ProgressTracker and CancelationHandler integration with JIRA batch operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsyncProjectLoader, type FetchOptions } from '../../../../src/cli/helpers/async-project-loader.js';
import { silentLogger } from '../../../../src/utils/logger.js';
import type { JiraCredentials } from '../../../../src/cli/helpers/project-count-fetcher.js';

describe('TC-030: JIRA Progress Tracking Integration', () => {
  let loader: AsyncProjectLoader;
  let mockCredentials: JiraCredentials;

  beforeEach(() => {
    mockCredentials = {
      domain: 'example.atlassian.net',
      email: 'test@example.com',
      apiToken: 'mock-token',
      instanceType: 'cloud' as const
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Progress Bar Updates', () => {
    it('should show progress bar during batch fetch', async () => {
      const consoleLogSpy = vi.spyOn(process.stdout, 'write');

      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: true,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      // Mock fetchBatch to return mock projects
      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(20);

      // Verify progress was rendered (should contain percentage)
      const writeCalls = consoleLogSpy.mock.calls;
      const hasProgressOutput = writeCalls.some(call =>
        String(call[0]).includes('%') || String(call[0]).includes('Fetching')
      );

      expect(hasProgressOutput).toBe(true);
    });

    it('should update progress every 5 projects (throttling)', async () => {
      const consoleLogSpy = vi.spyOn(process.stdout, 'write');

      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: false,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(25);

      // With updateFrequency=5, should update at: 5, 10, 15, 20, 25
      const progressUpdates = consoleLogSpy.mock.calls.filter(call =>
        String(call[0]).includes('Fetching')
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('ETA Calculation', () => {
    it('should show ETA during batch operations', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const consoleLogSpy = vi.spyOn(process.stdout, 'write');

      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: true,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      let callCount = 0;
      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        callCount++;
        vi.setSystemTime(now + callCount * 1000);

        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(30);

      const hasETA = consoleLogSpy.mock.calls.some(call =>
        String(call[0]).includes('remaining') || String(call[0]).includes('~')
      );

      expect(hasETA).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should continue on batch failure', async () => {
      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: false,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      let batchCount = 0;
      // Mock fetchBatchWithRetry instead of fetchBatch (has retry logic)
      vi.spyOn(loader as any, 'fetchBatchWithRetry').mockImplementation(async (offset: number, limit: number) => {
        batchCount++;

        if (batchCount === 2) {
          throw new Error('Network timeout');
        }

        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      const result = await loader.fetchAllProjects(30);

      expect(result.succeeded).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track failed projects in errors array', async () => {
      const options: FetchOptions = {
        batchSize: 10,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        if (offset === 10) {
          throw new Error('Auth failed');
        }

        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      const result = await loader.fetchAllProjects(20);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('Auth failed');
    });
  });

  describe('Final Summary', () => {
    it('should display final summary with counts', async () => {
      // Create a custom logger to spy on
      const logSpy = vi.fn();
      const customLogger = {
        log: logSpy,
        error: vi.fn(),
        warn: vi.fn()
      };

      const options: FetchOptions = {
        batchSize: 10,
        logger: customLogger as any
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(25);

      // Check if summary was logged
      const summaryLogs = logSpy.mock.calls.filter(call =>
        String(call[0]).includes('Imported') ||
        String(call[0]).includes('projects')
      );

      expect(summaryLogs.length).toBeGreaterThan(0);
    });
  });

  describe('TC-031: Cancelation During Batch Load', () => {
    it('should detect cancelation via shouldCancel()', async () => {
      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'jira', options);

      let fetchCount = 0;
      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset: number, limit: number) => {
        fetchCount++;

        if (fetchCount === 2) {
          process.emit('SIGINT', 'SIGINT');
        }

        return Array.from({ length: limit }, (_: any, i: number) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      const result = await loader.fetchAllProjects(50);

      expect(result.canceled).toBe(true);
      expect(result.projects.length).toBeLessThan(50);
    });
  });
});
