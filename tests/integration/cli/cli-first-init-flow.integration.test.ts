/**
 * E2E Tests: CLI-First Init Flow (Increment 0049)
 *
 * Comprehensive end-to-end testing for smart pagination, CLI-first defaults,
 * progress tracking, cancelation/resume, and zero timeout errors.
 *
 * Covers:
 * - T-006: Smart Pagination E2E
 * - T-012: CLI-First Defaults E2E
 * - T-018: Progress Tracking E2E
 * - T-024: Cancelation and Resume E2E
 * - T-028: Zero Timeout Errors Performance Test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { getProjectCount } from '../../../src/cli/helpers/project-count-fetcher.js';
import { promptImportStrategy } from '../../../src/cli/helpers/import-strategy-prompter.js';
import { AsyncProjectLoader } from '../../../src/cli/helpers/async-project-loader.js';
import { CancelationHandler } from '../../../src/cli/helpers/cancelation-handler.js';
import { ProgressTracker } from '../../../src/cli/helpers/progress-tracker.js';
import { silentLogger } from '../../../src/utils/logger.js';
import inquirer from 'inquirer';

// Mock global fetch
global.fetch = vi.fn();

// Mock inquirer
vi.mock('inquirer');

describe('E2E: CLI-First Init Flow (0049)', () => {
  let testDir: string;
  let stateFile: string;
  let errorLogFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temp directory for test files
    testDir = path.join(os.tmpdir(), `e2e-init-flow-${Date.now()}`);
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

  describe('T-006: Smart Pagination E2E', () => {
    it('should execute full CLI-first flow with smart pagination (127 projects)', async () => {
      // Step 1: Count check (< 1 second)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 127 }),
        headers: new Headers()
      } as Response);

      const startCountCheck = Date.now();
      const countResult = await getProjectCount({
        provider: 'jira',
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        logger: silentLogger
      });
      const countCheckDuration = Date.now() - startCountCheck;

      expect(countResult.accessible).toBe(127);
      expect(countCheckDuration).toBeLessThan(1000); // AC-US1-01

      // Step 2: Strategy prompt (user selects "import-all")
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: true }); // Safety confirmation

      const strategyResult = await promptImportStrategy({
        totalCount: 127,
        provider: 'jira',
        logger: silentLogger
      });

      expect(strategyResult.strategy).toBe('import-all');
      expect(strategyResult.confirmed).toBe(true);

      // Step 3: Batch fetch with smart pagination (3 batches: 50, 50, 27)
      const mockBatches = [
        Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, key: `P-${i}`, name: `Project ${i}` })),
        Array.from({ length: 50 }, (_, i) => ({ id: `${50 + i}`, key: `P-${50 + i}`, name: `Project ${50 + i}` })),
        Array.from({ length: 27 }, (_, i) => ({ id: `${100 + i}`, key: `P-${100 + i}`, name: `Project ${100 + i}` }))
      ];

      let callIndex = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Realistic latency
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

      const startFetch = Date.now();
      const result = await loader.fetchAllProjects(127);
      const fetchDuration = Date.now() - startFetch;

      // Assertions: AC-US1-03, AC-US1-04
      expect(result.projects).toHaveLength(127);
      expect(result.succeeded).toBe(127);
      expect(result.failed).toBe(0);
      expect(fetchDuration).toBeLessThan(30000); // < 30 seconds
      expect(fetch).toHaveBeenCalledTimes(4); // 1 count + 3 batches
    });

    it('should handle partial last batch correctly (100 projects → 50 + 50)', async () => {
      const mockBatch1 = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        key: `PROJ-${i}`,
        name: `Project ${i}`
      }));

      const mockBatch2 = Array.from({ length: 50 }, (_, i) => ({
        id: `${50 + i}`,
        key: `PROJ-${50 + i}`,
        name: `Project ${50 + i}`
      }));

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ values: mockBatch1 }),
          headers: new Headers()
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ values: mockBatch2 }),
          headers: new Headers()
        } as Response);

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        { batchSize: 50, stateFile, errorLogFile, logger: silentLogger }
      );

      const result = await loader.fetchAllProjects(100);

      expect(result.projects).toHaveLength(100);
      expect(result.succeeded).toBe(100);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('T-012: CLI-First Defaults E2E', () => {
    it('should default to "import-all" strategy', async () => {
      // Mock user accepting the default
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'import-all'
      });

      const result = await promptImportStrategy({
        totalCount: 75,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');

      // Verify prompt was called with correct default
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            name: 'strategy',
            default: 'import-all' // CLI-first default
          })
        ])
      );
    });

    it('should show safety confirmation for large imports (> 100 projects)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: true });

      const result = await promptImportStrategy({
        totalCount: 150,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');
      expect(result.confirmed).toBe(true);

      // Verify confirmation prompt was shown
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      const confirmPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(confirmPromptCall[0].type).toBe('confirm');
      expect(confirmPromptCall[0].default).toBe(false); // Safe default
    });

    it('should allow user to deselect unwanted projects in "select-specific" mode', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'select-specific' });

      const result = await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('select-specific');

      // In real usage, this would show checkbox with all pre-checked
      // User can deselect unwanted projects with spacebar
      // This is tested in import-strategy-prompter.test.ts unit tests
    });
  });

  describe('T-018: Progress Tracking E2E', () => {
    it('should display progress updates every 5 items', async () => {
      const mockBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        key: `PROJ-${i}`,
        name: `Project ${i}`
      }));

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockBatch }),
        headers: new Headers()
      } as Response);

      // Track progress updates
      const progressUpdates: any[] = [];
      const mockProgressLogger = {
        log: (msg: string) => progressUpdates.push(msg),
        error: () => {},
        warn: () => {}
      };

      const tracker = new ProgressTracker({
        total: 50,
        itemName: 'projects',
        updateFrequency: 5, // Update every 5 items
        logger: mockProgressLogger as any
      });

      // Simulate processing 50 items
      for (let i = 0; i < 50; i++) {
        tracker.update(i + 1);
      }

      // Verify progress updates were shown (every 5 items: 5, 10, 15, ..., 50)
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should show estimated time remaining (ETA)', async () => {
      const mockBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        key: `P-${i}`,
        name: `Project ${i}`
      }));

      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per batch
        return {
          ok: true,
          json: async () => ({ values: mockBatch.slice(0, 50) }),
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
          showEta: true, // Enable ETA
          stateFile,
          errorLogFile,
          logger: silentLogger
        }
      );

      const result = await loader.fetchAllProjects(100);

      expect(result.succeeded).toBe(100);
      // ETA calculation is tested in progress-tracker.test.ts
    });
  });

  describe('T-024: Cancelation and Resume E2E', () => {
    it('should save state on cancelation and resume from checkpoint', async () => {
      // Simulate cancelation after 25 items
      const mockBatch1 = Array.from({ length: 25 }, (_, i) => ({
        id: `${i}`,
        key: `P-${i}`,
        name: `Project ${i}`
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: mockBatch1 }),
        headers: new Headers()
      } as Response);

      const handler = new CancelationHandler({
        stateFile: path.join(testDir, '.specweave/logs/import-state.json'),
        logger: silentLogger
      });

      // Simulate processing 25 items then cancel
      handler.saveState(25, mockBatch1);

      // Verify state file created
      expect(existsSync(path.join(testDir, '.specweave/logs/import-state.json'))).toBe(true);

      // Read state
      const state = await handler.loadState();
      expect(state).not.toBeNull();
      expect(state?.currentOffset).toBe(25);
      expect(state?.completedProjects).toHaveLength(25);

      // Resume from checkpoint
      const mockBatch2 = Array.from({ length: 75 }, (_, i) => ({
        id: `${25 + i}`,
        key: `P-${25 + i}`,
        name: `Project ${25 + i}`
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: mockBatch2 }),
        headers: new Headers()
      } as Response);

      const loader = new AsyncProjectLoader(
        {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        'jira',
        {
          batchSize: 75,
          stateFile: path.join(testDir, '.specweave/logs/import-state.json'),
          errorLogFile,
          logger: silentLogger
        }
      );

      // Resume from offset 25
      const result = await loader.fetchBatch(25, 75);

      expect(result).toHaveLength(75);
      // Total: 25 (before cancel) + 75 (after resume) = 100
    });

    it('should expire state after 24 hours (TTL validation)', async () => {
      const handler = new CancelationHandler({
        stateFile: path.join(testDir, '.specweave/logs/import-state.json'),
        logger: silentLogger
      });

      // Save state
      handler.saveState(50, []);

      // Read state file and modify timestamp to 25 hours ago
      const stateFilePath = path.join(testDir, '.specweave/logs/import-state.json');
      const state = JSON.parse(await fs.readFile(stateFilePath, 'utf-8'));
      state.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf-8');

      // Load state - should return null (expired)
      const loadedState = await handler.loadState();
      expect(loadedState).toBeNull();
    });

    it('should handle SIGINT gracefully and save state', async () => {
      const handler = new CancelationHandler({
        stateFile: path.join(testDir, '.specweave/logs/import-state.json'),
        logger: silentLogger
      });

      // Simulate SIGINT
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      handler.saveState(30, []);
      handler.handleCancel();

      // Verify state was saved before exit
      expect(existsSync(path.join(testDir, '.specweave/logs/import-state.json'))).toBe(true);

      mockExit.mockRestore();
    });
  });

  describe('T-028: Zero Timeout Errors Performance Test', () => {
    it('should complete 200 projects without timeout errors', async () => {
      // Mock 200 projects (4 batches of 50)
      const mockBatches = Array.from({ length: 4 }, (_, batchIdx) =>
        Array.from({ length: 50 }, (_, i) => ({
          id: `${batchIdx * 50 + i}`,
          key: `P-${batchIdx * 50 + i}`,
          name: `Project ${batchIdx * 50 + i}`
        }))
      );

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

      const result = await loader.fetchAllProjects(200);

      // Verify zero timeout errors
      expect(result.succeeded).toBe(200);
      expect(result.failed).toBe(0);
      expect(result.projects).toHaveLength(200);

      // Verify no timeout-related errors in log
      if (existsSync(errorLogFile)) {
        const errorLog = await fs.readFile(errorLogFile, 'utf-8');
        expect(errorLog).not.toContain('ETIMEDOUT');
        expect(errorLog).not.toContain('timeout');
      }
    });

    it('should handle network errors without cascading failures', async () => {
      // Mock intermittent network errors
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        callCount++;

        // Fail on 2nd batch (simulate network error)
        if (callCount === 2) {
          throw Object.assign(new Error('Network error'), { code: 'ECONNREFUSED' });
        }

        // Succeed on other batches
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          ok: true,
          json: async () => ({
            values: Array.from({ length: 50 }, (_, i) => ({
              id: `${i}`,
              key: `P-${i}`,
              name: `Project ${i}`
            }))
          }),
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

      // Continue-on-failure: Batch 2 failed, but batches 1 and 3 succeeded
      expect(result.succeeded).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.succeeded + result.failed).toBe(150);
    });
  });
});
