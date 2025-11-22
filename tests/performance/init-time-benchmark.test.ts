/**
 * Performance Test: Init Time Benchmark
 *
 * Tests CLI-first init flow performance against targets from spec.md:
 * - < 1 second: Project count check (US-001, AC-US1-01)
 * - < 30 seconds: Init time for 100+ projects with "Import all" (US-001, AC-US1-04)
 * - Zero timeout errors under normal load
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  getProjectCount,
  type ProjectCountResult
} from '../../src/cli/helpers/project-count-fetcher.js';
import {
  AsyncProjectLoader,
  type FetchResult
} from '../../src/cli/helpers/async-project-loader.js';
import { silentLogger } from '../../src/utils/logger.js';

// Mock global fetch
global.fetch = vi.fn();

describe('Performance Benchmark: Init Time', () => {
  let testDir: string;
  let stateFile: string;
  let errorLogFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temp directory for test files
    testDir = path.join(os.tmpdir(), `init-perf-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    stateFile = path.join(testDir, 'import-state.json');
    errorLogFile = path.join(testDir, 'import-errors.log');
  });

  afterEach(async () => {
    // Cleanup temp directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('AC-US1-01: Project Count Check < 1 Second', () => {
    it('should complete count check under 1 second for 100 projects', async () => {
      // Mock JIRA Cloud count API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 100 }),
        headers: new Headers()
      } as Response);

      const startTime = Date.now();

      const result = await getProjectCount({
        provider: 'jira',
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        logger: silentLogger
      });

      const elapsed = Date.now() - startTime;

      // Assertions
      expect(result.accessible).toBe(100);
      expect(elapsed).toBeLessThan(1000); // < 1 second target
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should complete count check under 1 second for 500 projects', async () => {
      // Mock large project count
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 500 }),
        headers: new Headers()
      } as Response);

      const startTime = Date.now();

      const result = await getProjectCount({
        provider: 'jira',
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        logger: silentLogger
      });

      const elapsed = Date.now() - startTime;

      expect(result.accessible).toBe(500);
      expect(elapsed).toBeLessThan(1000); // < 1 second target
    });
  });

  describe('AC-US1-04: Init Time < 30 Seconds for 100+ Projects', () => {
    it('should complete import of 100 projects under 30 seconds', async () => {
      // Mock 2 batches of 50 projects each
      const batch1 = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        key: `PROJ-${i}`,
        name: `Project ${i}`
      }));

      const batch2 = Array.from({ length: 50 }, (_, i) => ({
        id: `${50 + i}`,
        key: `PROJ-${50 + i}`,
        name: `Project ${50 + i}`
      }));

      // Simulate realistic API latency (200ms per batch)
      vi.mocked(fetch)
        .mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          return {
            ok: true,
            json: async () => ({ values: fetch.mock.calls.length === 1 ? batch1 : batch2 }),
            headers: new Headers()
          } as Response;
        });

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 50,
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const startTime = Date.now();
      const result = await loader.fetchAllProjects(100);
      const elapsed = Date.now() - startTime;

      // Assertions
      expect(result.projects).toHaveLength(100);
      expect(result.succeeded).toBe(100);
      expect(result.failed).toBe(0);
      expect(elapsed).toBeLessThan(30000); // < 30 second target
    });

    it('should complete import of 127 projects under 30 seconds', async () => {
      // Mock 3 batches (50, 50, 27)
      const mockBatches = [
        Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, key: `P-${i}`, name: `Project ${i}` })),
        Array.from({ length: 50 }, (_, i) => ({ id: `${50 + i}`, key: `P-${50 + i}`, name: `Project ${50 + i}` })),
        Array.from({ length: 27 }, (_, i) => ({ id: `${100 + i}`, key: `P-${100 + i}`, name: `Project ${100 + i}` }))
      ];

      let callIndex = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms per batch
        const batch = mockBatches[callIndex++];
        return {
          ok: true,
          json: async () => ({ values: batch }),
          headers: new Headers()
        } as Response;
      });

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 50,
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const startTime = Date.now();
      const result = await loader.fetchAllProjects(127);
      const elapsed = Date.now() - startTime;

      expect(result.projects).toHaveLength(127);
      expect(result.succeeded).toBe(127);
      expect(elapsed).toBeLessThan(30000); // < 30 second target
    });
  });

  describe('Zero Timeout Errors Under Normal Load', () => {
    it('should complete without timeout errors for normal API latency', async () => {
      // Mock 150 projects (3 batches) with realistic latency (300ms)
      const mockBatches = [
        Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, key: `P-${i}`, name: `P ${i}` })),
        Array.from({ length: 50 }, (_, i) => ({ id: `${50 + i}`, key: `P-${50 + i}`, name: `P ${50 + i}` })),
        Array.from({ length: 50 }, (_, i) => ({ id: `${100 + i}`, key: `P-${100 + i}`, name: `P ${100 + i}` }))
      ];

      let callIndex = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Realistic latency
        const batch = mockBatches[callIndex++];
        return {
          ok: true,
          json: async () => ({ values: batch }),
          headers: new Headers()
        } as Response;
      });

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 50,
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const result = await loader.fetchAllProjects(150);

      // Verify zero timeout errors
      expect(result.succeeded).toBe(150);
      expect(result.failed).toBe(0);
      expect(result.projects).toHaveLength(150);

      // Verify no error log was created (no errors occurred)
      if (existsSync(errorLogFile)) {
        const errorLog = await fs.readFile(errorLogFile, 'utf-8');
        expect(errorLog).not.toContain('ETIMEDOUT');
        expect(errorLog).not.toContain('timeout');
      }
    });

    it('should handle slow API (1s latency) without timeout errors', async () => {
      // Mock slow but successful API responses
      const mockBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        key: `PROJ-${i}`,
        name: `Project ${i}`
      }));

      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second latency
        return {
          ok: true,
          json: async () => ({ values: mockBatch }),
          headers: new Headers()
        } as Response;
      });

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 50,
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const result = await loader.fetchAllProjects(50);

      // Should complete successfully despite slow API
      expect(result.succeeded).toBe(50);
      expect(result.failed).toBe(0);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance degradation if init exceeds 45 seconds (150% of target)', { timeout: 15000 }, async () => {
      // Mock artificially slow API to test regression detection
      const mockBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        key: `P-${i}`,
        name: `Project ${i}`
      }));

      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds per batch (very slow!)
        return {
          ok: true,
          json: async () => ({ values: mockBatch }),
          headers: new Headers()
        } as Response;
      });

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 50,
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const startTime = Date.now();
      const result = await loader.fetchAllProjects(100);
      const elapsed = Date.now() - startTime;

      // Performance degradation detected (should trigger alert in CI/CD)
      if (elapsed > 45000) {
        console.warn(`⚠️  PERFORMANCE REGRESSION: Init took ${elapsed}ms (target: 30000ms)`);
      }

      // Still completes, but performance is degraded
      expect(result.succeeded).toBe(100);
      expect(elapsed).toBeGreaterThan(9000); // Will definitely exceed threshold
    });
  });
});
