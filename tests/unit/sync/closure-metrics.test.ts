/**
 * Unit tests for ClosureMetrics
 *
 * Tests cover:
 * - Constructor: state directory creation, metricsFile path setup
 * - startOperation() / timing integration
 * - recordClosure(): success, failure, duration, error tracking
 * - recordBatch(): batch recording with multiple results
 * - getSummary(): aggregated stats per tool
 * - loadMetrics() / saveMetrics(): persistence, corrupted JSON, version mismatch
 * - Record trimming (MAX_RECORDS = 1000)
 * - Error tracking (MAX_RECENT_ERRORS = 10)
 * - getRecentFailures(): time-based filtering
 * - isFailureRateHigh(): threshold alerting
 * - formatSummary(): display formatting
 * - reset(): clearing metrics
 * - createClosureMetrics factory function
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoist all mocks before any imports
const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
}));

import {
  ClosureMetrics,
  createClosureMetrics,
  type ExternalTool,
  type ClosureRecord,
  type ClosureMetricsSummary,
} from '../../../src/sync/closure-metrics.js';
import type { Logger } from '../../../src/utils/logger.js';

// ================================================================
// Helpers
// ================================================================

function silentLogger(): Logger {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function makeRecord(overrides: Partial<ClosureRecord> = {}): ClosureRecord {
  return {
    tool: 'github',
    itemId: 1,
    incrementId: '0001',
    success: true,
    timestamp: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makePersistedMetrics(records: ClosureRecord[] = []) {
  return {
    version: 1,
    records,
    summary: {
      github: emptyToolMetrics(),
      jira: emptyToolMetrics(),
      ado: emptyToolMetrics(),
      overall: { totalAttempts: 0, successful: 0, failed: 0, successRate: 1 },
      lastUpdated: '2026-01-15T10:00:00.000Z',
    },
  };
}

function emptyToolMetrics() {
  return {
    totalAttempts: 0,
    successful: 0,
    failed: 0,
    successRate: 1,
    recentErrors: [],
  };
}

// ================================================================
// Tests
// ================================================================

describe('ClosureMetrics', () => {
  const projectRoot = '/test/project';
  const stateDir = '/test/project/.specweave/state';
  const metricsFile = '/test/project/.specweave/state/closure-metrics.json';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    // Default: state directory exists, no metrics file
    mockExistsSync.mockImplementation((p: string) => {
      if (p === stateDir) return true;
      return false;
    });
  });

  // ================================================================
  // Constructor
  // ================================================================

  describe('constructor', () => {
    it('should create state directory when it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      new ClosureMetrics({ projectRoot, logger: silentLogger() });

      expect(mockMkdirSync).toHaveBeenCalledWith(stateDir, { recursive: true });
    });

    it('should not create state directory when it already exists', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        return false;
      });

      new ClosureMetrics({ projectRoot, logger: silentLogger() });

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should set metricsFile path correctly', () => {
      // The metricsFile is private, so we test it indirectly via loadMetrics
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(makePersistedMetrics()));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      metrics.getSummary();

      expect(mockReadFileSync).toHaveBeenCalledWith(metricsFile, 'utf-8');
    });

    it('should default incrementId to "unknown" when not provided', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });

      // Record a closure and check the incrementId in the written data
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        return false; // metricsFile does not exist
      });

      metrics.recordClosure('github', 42, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].incrementId).toBe('unknown');
    });

    it('should use provided incrementId', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0005-feature',
        logger: silentLogger(),
      });

      metrics.recordClosure('github', 42, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].incrementId).toBe('0005-feature');
    });
  });

  // ================================================================
  // startOperation / timing
  // ================================================================

  describe('startOperation', () => {
    it('should record duration when startOperation was called before recordClosure', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });

      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 150);

      metrics.startOperation();
      metrics.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].durationMs).toBe(150);
    });

    it('should not record duration when startOperation was not called', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });

      metrics.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].durationMs).toBeUndefined();
    });

    it('should reset timer after recordClosure', () => {
      // First call: startOperation + recordClosure sets and uses the timer
      // Second call: recordClosure without startOperation should have no duration

      // We need the second recordClosure to load the file written by the first
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });

      const now = 1700000000000;
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)        // startOperation
        .mockReturnValueOnce(now + 100); // first recordClosure Date.now()

      metrics.startOperation();
      metrics.recordClosure('github', 1, true);

      // After the first recordClosure, the timer is reset to 0.
      // Set up the second call: loadMetrics will re-read from file
      const firstWritten = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(firstWritten));

      vi.spyOn(Date, 'now').mockReturnValue(now + 500);
      metrics.recordClosure('github', 2, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[1][1]);
      const secondRecord = writtenData.records.find((r: any) => r.itemId === 2);
      expect(secondRecord.durationMs).toBeUndefined();
    });
  });

  // ================================================================
  // recordClosure
  // ================================================================

  describe('recordClosure', () => {
    it('should record a successful closure', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      metrics.recordClosure('github', 42, true);

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(1);
      expect(writtenData.records[0]).toMatchObject({
        tool: 'github',
        itemId: 42,
        incrementId: '0001',
        success: true,
      });
      expect(writtenData.records[0].timestamp).toBeDefined();
    });

    it('should record a failed closure with error message', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0002',
        logger: silentLogger(),
      });

      metrics.recordClosure('jira', 'TEST-123', false, 'Rate limited');

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0]).toMatchObject({
        tool: 'jira',
        itemId: 'TEST-123',
        success: false,
        error: 'Rate limited',
      });
    });

    it('should record for each tool type: github, jira, ado', () => {
      const tools: ExternalTool[] = ['github', 'jira', 'ado'];

      for (const tool of tools) {
        vi.clearAllMocks();
        mockExistsSync.mockImplementation((p: string) => p === stateDir);

        const metrics = new ClosureMetrics({
          projectRoot,
          incrementId: '0001',
          logger: silentLogger(),
        });
        metrics.recordClosure(tool, `item-${tool}`, true);

        const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
        expect(writtenData.records[0].tool).toBe(tool);
      }
    });

    it('should append records to existing metrics', () => {
      const existingRecords = [makeRecord({ itemId: 1 })];
      const existing = makePersistedMetrics(existingRecords);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });
      metrics.recordClosure('github', 2, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(2);
      expect(writtenData.records[0].itemId).toBe(1);
      expect(writtenData.records[1].itemId).toBe(2);
    });

    it('should update summary after recording', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      metrics.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.totalAttempts).toBe(1);
      expect(writtenData.summary.github.successful).toBe(1);
      expect(writtenData.summary.github.successRate).toBe(1);
      expect(writtenData.summary.overall.totalAttempts).toBe(1);
      expect(writtenData.summary.overall.successful).toBe(1);
    });
  });

  // ================================================================
  // Record trimming (MAX_RECORDS = 1000)
  // ================================================================

  describe('record trimming', () => {
    it('should trim records to 1000 when exceeding MAX_RECORDS via recordClosure', () => {
      const existingRecords = Array.from({ length: 1000 }, (_, i) =>
        makeRecord({ itemId: i, timestamp: `2026-01-15T${String(i).padStart(5, '0')}Z` })
      );
      const existing = makePersistedMetrics(existingRecords);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });
      metrics.recordClosure('github', 9999, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(1000);
      // The newest record should be present (the one we just added)
      expect(writtenData.records[999].itemId).toBe(9999);
      // The oldest record (id=0) should be removed
      expect(writtenData.records[0].itemId).toBe(1);
    });

    it('should trim records to 1000 when exceeding MAX_RECORDS via recordBatch', () => {
      const existingRecords = Array.from({ length: 998 }, (_, i) =>
        makeRecord({ itemId: i })
      );
      const existing = makePersistedMetrics(existingRecords);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      // Add 5 batch records (998 + 5 = 1003 > 1000)
      const batchResults = Array.from({ length: 5 }, (_, i) => ({
        itemId: 5000 + i,
        success: true,
      }));
      metrics.recordBatch('github', batchResults);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(1000);
    });

    it('should not trim when under MAX_RECORDS', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      metrics.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(1);
    });
  });

  // ================================================================
  // recordBatch
  // ================================================================

  describe('recordBatch', () => {
    it('should record multiple results in a single batch', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0003',
        logger: silentLogger(),
      });

      const results = [
        { itemId: 10, success: true },
        { itemId: 11, success: false, error: 'Not found' },
        { itemId: 12, success: true },
      ];
      metrics.recordBatch('jira', results);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(3);
      expect(writtenData.records[0]).toMatchObject({ tool: 'jira', itemId: 10, success: true });
      expect(writtenData.records[1]).toMatchObject({ tool: 'jira', itemId: 11, success: false, error: 'Not found' });
      expect(writtenData.records[2]).toMatchObject({ tool: 'jira', itemId: 12, success: true });
    });

    it('should update summary correctly after batch recording', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      metrics.recordBatch('ado', [
        { itemId: 1, success: true },
        { itemId: 2, success: true },
        { itemId: 3, success: false, error: 'Timeout' },
      ]);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.ado.totalAttempts).toBe(3);
      expect(writtenData.summary.ado.successful).toBe(2);
      expect(writtenData.summary.ado.failed).toBe(1);
      expect(writtenData.summary.ado.successRate).toBeCloseTo(2 / 3);
    });

    it('should record all items with same tool and incrementId', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0007',
        logger: silentLogger(),
      });

      metrics.recordBatch('github', [
        { itemId: 100, success: true },
        { itemId: 200, success: true },
      ]);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      for (const record of writtenData.records) {
        expect(record.tool).toBe('github');
        expect(record.incrementId).toBe('0007');
      }
    });

    it('should handle empty batch gracefully', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        incrementId: '0001',
        logger: silentLogger(),
      });

      metrics.recordBatch('github', []);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toHaveLength(0);
    });
  });

  // ================================================================
  // getSummary
  // ================================================================

  describe('getSummary', () => {
    it('should return empty summary when no metrics file exists', () => {
      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      const summary = metrics.getSummary();

      expect(summary.github.totalAttempts).toBe(0);
      expect(summary.jira.totalAttempts).toBe(0);
      expect(summary.ado.totalAttempts).toBe(0);
      expect(summary.overall.totalAttempts).toBe(0);
      expect(summary.github.successRate).toBe(1); // Default 100% when no data
    });

    it('should return correct per-tool aggregation', () => {
      const records = [
        makeRecord({ tool: 'github', itemId: 1, success: true }),
        makeRecord({ tool: 'github', itemId: 2, success: true }),
        makeRecord({ tool: 'github', itemId: 3, success: false, error: 'Rate limited' }),
        makeRecord({ tool: 'jira', itemId: 'J-1', success: true }),
        makeRecord({ tool: 'ado', itemId: 'A-1', success: false, error: 'Auth failure' }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Trigger a re-record to force summary recalculation through getSummary
      // Actually getSummary just loads and returns, but summary is stale from persisted.
      // Let's record one more to get proper summary:
      metrics.recordClosure('github', 4, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      const summary = writtenData.summary;

      expect(summary.github.totalAttempts).toBe(4);
      expect(summary.github.successful).toBe(3);
      expect(summary.github.failed).toBe(1);
      expect(summary.github.successRate).toBe(0.75);

      expect(summary.jira.totalAttempts).toBe(1);
      expect(summary.jira.successful).toBe(1);
      expect(summary.jira.successRate).toBe(1);

      expect(summary.ado.totalAttempts).toBe(1);
      expect(summary.ado.failed).toBe(1);
      expect(summary.ado.successRate).toBe(0);
    });

    it('should calculate correct overall stats', () => {
      const records = [
        makeRecord({ tool: 'github', success: true }),
        makeRecord({ tool: 'github', success: false }),
        makeRecord({ tool: 'jira', success: true }),
        makeRecord({ tool: 'jira', success: true }),
        makeRecord({ tool: 'ado', success: false }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Add one record to trigger summary recalculation
      metrics.recordClosure('github', 999, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      const overall = writtenData.summary.overall;

      // 5 existing + 1 new = 6 total; 3 success existing + 1 new = 4 success
      expect(overall.totalAttempts).toBe(6);
      expect(overall.successful).toBe(4);
      expect(overall.failed).toBe(2);
      expect(overall.successRate).toBeCloseTo(4 / 6);
    });

    it('should track average duration per tool', () => {
      const records = [
        makeRecord({ tool: 'github', success: true, durationMs: 100 }),
        makeRecord({ tool: 'github', success: true, durationMs: 200 }),
        makeRecord({ tool: 'github', success: true, durationMs: 300 }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Trigger update to recalculate summary
      metrics.recordClosure('jira', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.avgDurationMs).toBe(200); // (100+200+300)/3
    });

    it('should track last success and last failure timestamps', () => {
      const records = [
        makeRecord({ tool: 'github', success: true, timestamp: '2026-01-10T00:00:00.000Z' }),
        makeRecord({ tool: 'github', success: false, timestamp: '2026-01-12T00:00:00.000Z', error: 'err' }),
        makeRecord({ tool: 'github', success: true, timestamp: '2026-01-15T00:00:00.000Z' }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Trigger recalculation
      metrics.recordClosure('jira', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.lastSuccess).toBe('2026-01-15T00:00:00.000Z');
      expect(writtenData.summary.github.lastFailure).toBe('2026-01-12T00:00:00.000Z');
    });
  });

  // ================================================================
  // Error tracking (MAX_RECENT_ERRORS = 10)
  // ================================================================

  describe('error tracking', () => {
    it('should track recent errors per tool', () => {
      const records = [
        makeRecord({ tool: 'github', success: false, error: 'Error A' }),
        makeRecord({ tool: 'github', success: false, error: 'Error B' }),
        makeRecord({ tool: 'github', success: true }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Trigger recalculation
      metrics.recordClosure('jira', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      // Errors are reversed (most recent first)
      expect(writtenData.summary.github.recentErrors).toEqual(['Error B', 'Error A']);
    });

    it('should limit recent errors to MAX_RECENT_ERRORS (10)', () => {
      // Create 15 failure records
      const records = Array.from({ length: 15 }, (_, i) =>
        makeRecord({
          tool: 'github',
          success: false,
          error: `Error ${i}`,
          timestamp: `2026-01-15T${String(i).padStart(2, '0')}:00:00.000Z`,
        })
      );
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      // Trigger recalculation
      metrics.recordClosure('jira', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.recentErrors).toHaveLength(10);
      // Should contain errors 5-14 (the last 10), reversed
      expect(writtenData.summary.github.recentErrors[0]).toBe('Error 14');
      expect(writtenData.summary.github.recentErrors[9]).toBe('Error 5');
    });

    it('should not include errors without error message in recentErrors', () => {
      const records = [
        makeRecord({ tool: 'github', success: false }), // no error string
        makeRecord({ tool: 'github', success: false, error: 'Has message' }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({
        projectRoot,
        logger: silentLogger(),
      });

      metrics.recordClosure('jira', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.recentErrors).toEqual(['Has message']);
    });
  });

  // ================================================================
  // loadMetrics / saveMetrics (persistence)
  // ================================================================

  describe('loadMetrics / saveMetrics', () => {
    it('should return empty metrics when file does not exist', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        return false;
      });

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const summary = metrics.getSummary();

      expect(summary.overall.totalAttempts).toBe(0);
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should load existing metrics from file', () => {
      const existing = makePersistedMetrics([
        makeRecord({ tool: 'github', success: true }),
      ]);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const summary = metrics.getSummary();

      expect(mockReadFileSync).toHaveBeenCalledWith(metricsFile, 'utf-8');
      // Summary reflects persisted (stale) data since no updateSummary was triggered
      expect(summary).toEqual(existing.summary);
    });

    it('should handle corrupted JSON gracefully', () => {
      const logger = silentLogger();

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('{ not valid json }}}');

      const metrics = new ClosureMetrics({ projectRoot, logger });
      const summary = metrics.getSummary();

      // Should fallback to empty metrics
      expect(summary.overall.totalAttempts).toBe(0);
      expect(logger.log).toHaveBeenCalled();
    });

    it('should handle version mismatch by returning empty metrics', () => {
      const logger = silentLogger();
      const oldVersion = {
        version: 99,
        records: [makeRecord()],
        summary: makePersistedMetrics().summary,
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(oldVersion));

      const metrics = new ClosureMetrics({ projectRoot, logger });
      const summary = metrics.getSummary();

      expect(summary.overall.totalAttempts).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Migrating metrics'));
    });

    it('should persist metrics to file via writeFileSync', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      metrics.recordClosure('github', 1, true);

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        metricsFile,
        expect.any(String)
      );

      // Verify JSON is properly formatted (pretty-printed with 2-space indent)
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain('\n'); // pretty printed
      const parsed = JSON.parse(written);
      expect(parsed.version).toBe(1);
    });

    it('should handle write failure gracefully', () => {
      const logger = silentLogger();
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const metrics = new ClosureMetrics({ projectRoot, logger });

      // Should not throw
      expect(() => metrics.recordClosure('github', 1, true)).not.toThrow();
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to save metrics'));
    });

    it('should handle read failure gracefully', () => {
      const logger = silentLogger();

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      const metrics = new ClosureMetrics({ projectRoot, logger });
      const summary = metrics.getSummary();

      // Should fallback to empty metrics
      expect(summary.overall.totalAttempts).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to load metrics'));
    });
  });

  // ================================================================
  // getRecentFailures
  // ================================================================

  describe('getRecentFailures', () => {
    it('should return failures within the specified time window', () => {
      const now = Date.now();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();

      const records = [
        makeRecord({ success: false, error: 'Recent', timestamp: twoHoursAgo }),
        makeRecord({ success: false, error: 'Old', timestamp: thirtyHoursAgo }),
        makeRecord({ success: true, timestamp: twoHoursAgo }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const failures = metrics.getRecentFailures(24);

      expect(failures).toHaveLength(1);
      expect(failures[0].error).toBe('Recent');
    });

    it('should default to 24 hours when no window specified', () => {
      const now = Date.now();
      const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();

      const records = [
        makeRecord({ success: false, error: 'Within 24h', timestamp: twelveHoursAgo }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const failures = metrics.getRecentFailures();

      expect(failures).toHaveLength(1);
    });

    it('should return empty array when no failures in window', () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const records = [
        makeRecord({ success: false, error: 'Old', timestamp: oldTimestamp }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const failures = metrics.getRecentFailures(24);

      expect(failures).toHaveLength(0);
    });
  });

  // ================================================================
  // isFailureRateHigh
  // ================================================================

  describe('isFailureRateHigh', () => {
    it('should return false when fewer than 5 attempts', () => {
      const records = [
        makeRecord({ tool: 'github', success: false }),
        makeRecord({ tool: 'github', success: false }),
        makeRecord({ tool: 'github', success: false }),
      ];
      const persisted = makePersistedMetrics(records);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });

      // We need to record to trigger summary update. Build a metrics that has proper summary.
      // Or: build proper summary manually
      const metricsObj = new ClosureMetrics({ projectRoot, logger: silentLogger() });

      // Record enough data fresh
      vi.clearAllMocks();
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        return false;
      });

      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: false },
        { itemId: 2, success: false },
        { itemId: 3, success: false },
      ]);

      // Now check via getSummary — mock re-read
      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      // Only 3 attempts — should return false regardless of failure rate
      expect(m2.isFailureRateHigh('github')).toBe(false);
    });

    it('should return true when failure rate exceeds threshold with enough data', () => {
      // 5 attempts: 4 failures, 1 success = 80% failure > 20% threshold
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: false, error: 'fail' },
        { itemId: 2, success: false, error: 'fail' },
        { itemId: 3, success: false, error: 'fail' },
        { itemId: 4, success: false, error: 'fail' },
        { itemId: 5, success: true },
      ]);

      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      expect(m2.isFailureRateHigh('github', 0.2)).toBe(true);
    });

    it('should return false when failure rate is below threshold', () => {
      // 5 attempts: 1 failure, 4 success = 20% failure = not > 20% threshold
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: true },
        { itemId: 2, success: true },
        { itemId: 3, success: true },
        { itemId: 4, success: true },
        { itemId: 5, success: false, error: 'fail' },
      ]);

      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      expect(m2.isFailureRateHigh('github', 0.2)).toBe(false);
    });

    it('should use default threshold of 0.2', () => {
      // 10 attempts: 3 failures = 30% failure > 20% default threshold
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const results = Array.from({ length: 10 }, (_, i) => ({
        itemId: i,
        success: i >= 3, // first 3 fail, rest succeed
        error: i < 3 ? 'fail' : undefined,
      }));
      m.recordBatch('jira', results);

      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      expect(m2.isFailureRateHigh('jira')).toBe(true);
    });
  });

  // ================================================================
  // formatSummary
  // ================================================================

  describe('formatSummary', () => {
    it('should format summary with "No data" for tools without attempts', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const output = metrics.formatSummary();

      expect(output).toContain('Closure Sync Metrics');
      expect(output).toContain('No data');
    });

    it('should display success percentage for tools with data', () => {
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: true },
        { itemId: 2, success: true },
        { itemId: 3, success: false, error: 'Test error' },
      ]);

      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const output = m2.formatSummary();

      expect(output).toContain('66.7%');
      expect(output).toContain('2/3');
    });

    it('should show average duration when available', () => {
      const records = [
        makeRecord({ tool: 'github', success: true, durationMs: 500 }),
      ];
      const persisted = makePersistedMetrics(records);

      // Manually set the summary with avgDurationMs
      persisted.summary.github = {
        totalAttempts: 1,
        successful: 1,
        failed: 0,
        successRate: 1,
        avgDurationMs: 500,
        recentErrors: [],
      };
      persisted.summary.overall = {
        totalAttempts: 1,
        successful: 1,
        failed: 0,
        successRate: 1,
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const output = metrics.formatSummary();

      expect(output).toContain('500ms');
    });

    it('should show last error for tools with failures', () => {
      const persisted = makePersistedMetrics();
      persisted.summary.github = {
        totalAttempts: 5,
        successful: 3,
        failed: 2,
        successRate: 0.6,
        lastFailure: '2026-01-15T00:00:00.000Z',
        recentErrors: ['Connection timeout', 'Rate limited'],
      };
      persisted.summary.overall = {
        totalAttempts: 5,
        successful: 3,
        failed: 2,
        successRate: 0.6,
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const output = metrics.formatSummary();

      expect(output).toContain('Connection timeout');
    });

    it('should show overall stats', () => {
      const persisted = makePersistedMetrics();
      persisted.summary.overall = {
        totalAttempts: 10,
        successful: 8,
        failed: 2,
        successRate: 0.8,
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(persisted));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const output = metrics.formatSummary();

      expect(output).toContain('Overall');
      expect(output).toContain('80.0%');
      expect(output).toContain('8/10');
    });
  });

  // ================================================================
  // reset
  // ================================================================

  describe('reset', () => {
    it('should write empty metrics to file', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      metrics.reset();

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);

      expect(writtenData.version).toBe(1);
      expect(writtenData.records).toEqual([]);
      expect(writtenData.summary.github.totalAttempts).toBe(0);
      expect(writtenData.summary.jira.totalAttempts).toBe(0);
      expect(writtenData.summary.ado.totalAttempts).toBe(0);
      expect(writtenData.summary.overall.totalAttempts).toBe(0);
    });

    it('should overwrite existing metrics', () => {
      const existing = makePersistedMetrics([makeRecord()]);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      metrics.reset();

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records).toEqual([]);
    });
  });

  // ================================================================
  // createClosureMetrics factory
  // ================================================================

  describe('createClosureMetrics', () => {
    it('should create a ClosureMetrics instance', () => {
      const instance = createClosureMetrics('/test/root');
      expect(instance).toBeInstanceOf(ClosureMetrics);
    });

    it('should pass incrementId to constructor', () => {
      const instance = createClosureMetrics('/test/root', '0005-test');
      instance.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].incrementId).toBe('0005-test');
    });

    it('should pass logger to constructor', () => {
      const logger = silentLogger();
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('write error');
      });

      const instance = createClosureMetrics('/test/root', '0001', logger);
      instance.recordClosure('github', 1, true);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to save'));
    });

    it('should default incrementId to "unknown" when not provided', () => {
      const instance = createClosureMetrics('/test/root');
      instance.recordClosure('github', 1, true);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.records[0].incrementId).toBe('unknown');
    });
  });

  // ================================================================
  // Success rate calculation edge cases
  // ================================================================

  describe('success rate edge cases', () => {
    it('should default to 100% success rate when no records exist', () => {
      const metrics = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      const summary = metrics.getSummary();

      expect(summary.github.successRate).toBe(1);
      expect(summary.jira.successRate).toBe(1);
      expect(summary.ado.successRate).toBe(1);
      expect(summary.overall.successRate).toBe(1);
    });

    it('should calculate 0% success rate when all records are failures', () => {
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: false, error: 'err' },
        { itemId: 2, success: false, error: 'err' },
      ]);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.successRate).toBe(0);
    });

    it('should calculate 100% success rate when all records are successful', () => {
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: true },
        { itemId: 2, success: true },
      ]);

      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenData.summary.github.successRate).toBe(1);
    });
  });

  // ================================================================
  // Cross-tool isolation
  // ================================================================

  describe('cross-tool isolation', () => {
    it('should keep metrics isolated between tools', () => {
      const m = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m.recordBatch('github', [
        { itemId: 1, success: true },
        { itemId: 2, success: true },
      ]);

      // Re-read and add jira records
      const written1 = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === stateDir) return true;
        if (p === metricsFile) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(written1));

      const m2 = new ClosureMetrics({ projectRoot, logger: silentLogger() });
      m2.recordBatch('jira', [
        { itemId: 'J-1', success: false, error: 'Auth error' },
      ]);

      const written2 = JSON.parse(mockWriteFileSync.mock.calls[1][1]);

      // GitHub should remain unaffected
      expect(written2.summary.github.totalAttempts).toBe(2);
      expect(written2.summary.github.successful).toBe(2);
      expect(written2.summary.github.successRate).toBe(1);

      // Jira should reflect its own records
      expect(written2.summary.jira.totalAttempts).toBe(1);
      expect(written2.summary.jira.failed).toBe(1);
      expect(written2.summary.jira.successRate).toBe(0);

      // ADO untouched
      expect(written2.summary.ado.totalAttempts).toBe(0);
    });
  });
});
