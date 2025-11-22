/**
 * Integration Tests: ADO Progress Tracking
 *
 * Tests ProgressTracker and CancelationHandler integration with ADO batch operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsyncProjectLoader, type FetchOptions } from '../../../../src/cli/helpers/async-project-loader.js';
import { silentLogger } from '../../../../src/utils/logger.js';
import type { AdoCredentials } from '../../../../src/cli/helpers/project-count-fetcher.js';

describe('TC-032: ADO Progress Tracking Integration', () => {
  let loader: AsyncProjectLoader;
  let mockCredentials: AdoCredentials;

  beforeEach(() => {
    mockCredentials = {
      organization: 'test-org',
      project: 'test-project',
      personalAccessToken: 'mock-pat'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Progress Bar Updates', () => {
    it('should show progress bar during ADO batch fetch', async () => {
      const consoleLogSpy = vi.spyOn(process.stdout, 'write');

      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: true,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'ado', options);

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset, limit) => {
        return Array.from({ length: limit }, (_, i) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(20);

      const writeCalls = consoleLogSpy.mock.calls;
      const hasProgressOutput = writeCalls.some(call =>
        String(call[0]).includes('%') || String(call[0]).includes('Fetching')
      );

      expect(hasProgressOutput).toBe(true);
    });

    it('should handle Ctrl+C gracefully during ADO fetch', async () => {
      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'ado', options);

      let fetchCount = 0;
      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset, limit) => {
        fetchCount++;

        if (fetchCount === 2) {
          process.emit('SIGINT', 'SIGINT');
        }

        return Array.from({ length: limit }, (_, i) => ({
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

  describe('Error Handling', () => {
    it('should continue on batch failure (ADO)', async () => {
      const options: FetchOptions = {
        batchSize: 10,
        updateFrequency: 5,
        showEta: false,
        logger: silentLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'ado', options);

      let batchCount = 0;
      vi.spyOn(loader as any, 'fetchBatchWithRetry').mockImplementation(async (offset, limit) => {
        batchCount++;

        if (batchCount === 2) {
          throw new Error('ADO API timeout');
        }

        return Array.from({ length: limit }, (_, i) => ({
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
  });

  describe('Final Summary', () => {
    it('should display final summary for ADO operations', async () => {
      const logSpy = vi.fn();
      const customLogger = {
        log: logSpy,
        error: vi.fn(),
        warn: vi.fn()
      };

      const options: FetchOptions = {
        batchSize: 10,
        logger: customLogger
      };

      loader = new AsyncProjectLoader(mockCredentials, 'ado', options);

      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset, limit) => {
        return Array.from({ length: limit }, (_, i) => ({
          id: String(offset + i),
          key: 'PROJ-' + (offset + i),
          name: 'Project ' + (offset + i)
        }));
      });

      await loader.fetchAllProjects(25);

      const summaryLogs = logSpy.mock.calls.filter(call =>
        String(call[0]).includes('Imported') ||
        String(call[0]).includes('projects')
      );

      expect(summaryLogs.length).toBeGreaterThan(0);
    });
  });

  describe('ETA Calculation (ADO)', () => {
    it('should show ETA during ADO batch operations', async () => {
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

      loader = new AsyncProjectLoader(mockCredentials, 'ado', options);

      let callCount = 0;
      vi.spyOn(loader as any, 'fetchBatch').mockImplementation(async (offset, limit) => {
        callCount++;
        vi.setSystemTime(now + callCount * 1000);

        return Array.from({ length: limit }, (_, i) => ({
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
});
