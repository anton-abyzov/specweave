/**
 * Tests for BaseReconciler abstract class
 *
 * @module tests/unit/sync/base-reconciler.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  BaseReconciler,
  BaseReconcileOptions,
  BaseIncrementState,
  BaseReconcileResult,
} from '../../../src/sync/base-reconciler.js';
import { Logger } from '../../../src/utils/logger.js';

// Concrete implementation for testing
interface TestIncrementState extends BaseIncrementState {
  issueId?: number;
  issueState?: 'open' | 'closed';
}

interface TestReconcileResult extends BaseReconcileResult {
  details: Array<{
    incrementId: string;
    action: string;
    issueId: number;
    reason: string;
  }>;
}

class TestReconciler extends BaseReconciler<TestIncrementState, TestReconcileResult> {
  // Track calls for testing
  public initializeCalled = false;
  public initializeSuccess = true;
  public syncEnabled = true;
  public extractedStates: TestIncrementState[] = [];
  public reconcileItemsCalled: Array<{
    inc: TestIncrementState;
    shouldBeClosed: boolean;
    shouldBeOpen: boolean;
  }> = [];

  protected getToolName(): string {
    return 'Test';
  }

  protected getClosedLabel(): string {
    return 'Issues closed';
  }

  protected getReopenedLabel(): string {
    return 'Issues reopened';
  }

  protected createEmptyResult(): TestReconcileResult {
    return {
      scanned: 0,
      mismatches: 0,
      closed: 0,
      reopened: 0,
      errors: [],
      details: [],
    };
  }

  protected isSyncEnabled(_config: Record<string, unknown>): boolean {
    return this.syncEnabled;
  }

  protected logSyncDisabled(): void {
    this.logger.log('ℹ️  Test sync is disabled');
  }

  protected async initializeClient(): Promise<boolean> {
    this.initializeCalled = true;
    return this.initializeSuccess;
  }

  protected getInitializationErrorMessage(): string {
    return 'Failed to initialize test client';
  }

  protected async extractIncrementState(
    incrementId: string,
    incrementPath: string,
    metadata: Record<string, unknown>
  ): Promise<TestIncrementState | null> {
    // Extract test-specific state
    const testSync = (metadata as { test?: { issueId?: number; state?: string } }).test;
    if (!testSync?.issueId) return null;

    const state: TestIncrementState = {
      incrementId,
      incrementPath,
      metadataStatus: (metadata.status as string) || 'unknown',
      featureId: metadata.featureId as string,
      issueId: testSync.issueId,
      issueState: testSync.state as 'open' | 'closed',
    };

    this.extractedStates.push(state);
    return state;
  }

  protected async reconcileIncrementItems(
    inc: TestIncrementState,
    shouldBeClosed: boolean,
    shouldBeOpen: boolean,
    metadataStatus: string,
    result: TestReconcileResult
  ): Promise<void> {
    this.reconcileItemsCalled.push({ inc, shouldBeClosed, shouldBeOpen });

    if (inc.issueId) {
      const isCurrentlyClosed = inc.issueState === 'closed';

      if (shouldBeClosed && !isCurrentlyClosed) {
        result.mismatches++;
        if (!this.dryRun) {
          result.closed++;
        }
        result.details.push({
          incrementId: inc.incrementId,
          action: this.dryRun ? 'skip' : 'close',
          issueId: inc.issueId,
          reason: `Status=${metadataStatus}, issue=open`,
        });
      } else if (shouldBeOpen && isCurrentlyClosed) {
        result.mismatches++;
        if (!this.dryRun) {
          result.reopened++;
        }
        result.details.push({
          incrementId: inc.incrementId,
          action: this.dryRun ? 'skip' : 'reopen',
          issueId: inc.issueId,
          reason: `Status=${metadataStatus}, issue=closed`,
        });
      }
    }
  }

  // Expose protected members for testing
  public async testLoadConfig(): Promise<Record<string, unknown>> {
    return this.loadConfig();
  }

  public async testScanIncrements(): Promise<TestIncrementState[]> {
    return this.scanIncrements();
  }
}

describe('BaseReconciler', () => {
  let tmpDir: string;
  let reconciler: TestReconciler;
  let mockLogger: Logger;

  beforeEach(async () => {
    // Create temp directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'base-reconciler-test-'));

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Create reconciler
    reconciler = new TestReconciler({
      projectRoot: tmpDir,
      dryRun: false,
      logger: mockLogger,
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should set projectRoot from options', () => {
      expect(reconciler['projectRoot']).toBe(tmpDir);
    });

    it('should default dryRun to false', () => {
      const rec = new TestReconciler({ projectRoot: tmpDir });
      expect(rec['dryRun']).toBe(false);
    });

    it('should set dryRun from options', () => {
      const rec = new TestReconciler({ projectRoot: tmpDir, dryRun: true });
      expect(rec['dryRun']).toBe(true);
    });
  });

  describe('reconcile', () => {
    it('should return early if sync is disabled', async () => {
      reconciler.syncEnabled = false;

      const result = await reconciler.reconcile();

      expect(result.scanned).toBe(0);
      expect(reconciler.initializeCalled).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith('ℹ️  Test sync is disabled');
    });

    it('should return error if initialization fails', async () => {
      reconciler.initializeSuccess = false;

      const result = await reconciler.reconcile();

      expect(result.errors).toContain('Failed to initialize test client');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should scan increments and reconcile each', async () => {
      // Create test increments directory
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({
          status: 'completed',
          test: { issueId: 123, state: 'open' },
        })
      );

      const result = await reconciler.reconcile();

      expect(result.scanned).toBe(1);
      expect(reconciler.reconcileItemsCalled).toHaveLength(1);
      expect(reconciler.reconcileItemsCalled[0].shouldBeClosed).toBe(true);
    });

    it('should handle multiple increments', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(incDir, { recursive: true });

      // Create 3 increments
      for (let i = 1; i <= 3; i++) {
        const incPath = path.join(incDir, `000${i}-test`);
        await fs.mkdir(incPath, { recursive: true });
        await fs.writeFile(
          path.join(incPath, 'metadata.json'),
          JSON.stringify({
            status: i === 1 ? 'completed' : 'active',
            test: { issueId: 100 + i, state: i === 2 ? 'closed' : 'open' },
          })
        );
      }

      const result = await reconciler.reconcile();

      expect(result.scanned).toBe(3);
      expect(reconciler.reconcileItemsCalled).toHaveLength(3);
    });

    it('should print summary after reconciliation', async () => {
      await reconciler.reconcile();

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('TEST RECONCILIATION SUMMARY'));
    });
  });

  describe('scanIncrements', () => {
    it('should return empty array if increments directory does not exist', async () => {
      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
    });

    it('should skip _archive directory', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(incDir, { recursive: true });

      // Create archive
      const archivePath = path.join(incDir, '_archive', '0001-old');
      await fs.mkdir(archivePath, { recursive: true });
      await fs.writeFile(
        path.join(archivePath, 'metadata.json'),
        JSON.stringify({ status: 'completed', test: { issueId: 1 } })
      );

      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
    });

    it('should skip directories without metadata.json', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      await fs.mkdir(path.join(incDir, '0001-test'), { recursive: true });

      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
    });

    it('should skip increments with invalid metadata', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(path.join(incPath, 'metadata.json'), 'invalid json');

      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Skipping'));
    });

    it('should skip directories starting with dot', async () => {
      const incDir = path.join(tmpDir, '.specweave', 'increments');
      const dotDir = path.join(incDir, '.hidden');
      await fs.mkdir(dotDir, { recursive: true });
      await fs.writeFile(
        path.join(dotDir, 'metadata.json'),
        JSON.stringify({ status: 'active', test: { issueId: 1 } })
      );

      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
    });

    it('should extract valid increment states', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-feature');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({
          status: 'active',
          featureId: 'FS-001',
          test: { issueId: 42, state: 'open' },
        })
      );

      const states = await reconciler.testScanIncrements();

      expect(states).toHaveLength(1);
      expect(states[0].incrementId).toBe('0001-feature');
      expect(states[0].metadataStatus).toBe('active');
      expect(states[0].featureId).toBe('FS-001');
      expect(states[0].issueId).toBe(42);
    });

    it('should skip increments without external links', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'active' }) // No test.issueId
      );

      const states = await reconciler.testScanIncrements();

      expect(states).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should return empty object if config does not exist', async () => {
      const config = await reconciler.testLoadConfig();

      expect(config).toEqual({});
    });

    it('should load and parse config.json', async () => {
      const configDir = path.join(tmpDir, '.specweave');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, 'config.json'),
        JSON.stringify({ sync: { enabled: true } })
      );

      const config = await reconciler.testLoadConfig();

      expect(config).toEqual({ sync: { enabled: true } });
    });

    it('should return empty object for invalid JSON', async () => {
      const configDir = path.join(tmpDir, '.specweave');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), 'invalid');

      const config = await reconciler.testLoadConfig();

      expect(config).toEqual({});
    });
  });

  describe('status determination', () => {
    it('should determine completed status as shouldBeClosed', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'completed', test: { issueId: 1, state: 'open' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeClosed).toBe(true);
      expect(reconciler.reconcileItemsCalled[0].shouldBeOpen).toBe(false);
    });

    it('should determine abandoned status as shouldBeClosed', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'abandoned', test: { issueId: 1, state: 'open' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeClosed).toBe(true);
    });

    it('should determine active status as shouldBeOpen', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'active', test: { issueId: 1, state: 'closed' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeOpen).toBe(true);
      expect(reconciler.reconcileItemsCalled[0].shouldBeClosed).toBe(false);
    });

    it('should determine planning status as shouldBeOpen', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'planning', test: { issueId: 1, state: 'open' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeOpen).toBe(true);
    });

    it('should determine backlog status as shouldBeOpen', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'backlog', test: { issueId: 1, state: 'open' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeOpen).toBe(true);
    });

    it('should determine ready_for_review status as shouldBeOpen', async () => {
      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'ready_for_review', test: { issueId: 1, state: 'open' } })
      );

      await reconciler.reconcile();

      expect(reconciler.reconcileItemsCalled[0].shouldBeOpen).toBe(true);
    });
  });

  describe('dry run mode', () => {
    it('should not increment closed count in dry run', async () => {
      const dryRunReconciler = new TestReconciler({
        projectRoot: tmpDir,
        dryRun: true,
        logger: mockLogger,
      });

      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'completed', test: { issueId: 1, state: 'open' } })
      );

      const result = await dryRunReconciler.reconcile();

      expect(result.mismatches).toBe(1);
      expect(result.closed).toBe(0); // Not closed in dry run
      expect(result.details[0].action).toBe('skip');
    });

    it('should log dry run warning in summary', async () => {
      const dryRunReconciler = new TestReconciler({
        projectRoot: tmpDir,
        dryRun: true,
        logger: mockLogger,
      });

      await dryRunReconciler.reconcile();

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    });
  });

  describe('error handling', () => {
    it('should catch and report errors during reconciliation', async () => {
      // Override reconcileIncrementItems to throw
      reconciler['reconcileIncrementItems'] = async () => {
        throw new Error('Test error');
      };

      const incPath = path.join(tmpDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incPath, { recursive: true });
      await fs.writeFile(
        path.join(incPath, 'metadata.json'),
        JSON.stringify({ status: 'active', test: { issueId: 1 } })
      );

      const result = await reconciler.reconcile();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Test error');
    });
  });
});
