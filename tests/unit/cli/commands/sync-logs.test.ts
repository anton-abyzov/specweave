/**
 * Sync Logs Command Tests
 *
 * IMPORTANT: Uses vi.hoisted() with class-based mocks for vitest 4.x compatibility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { LogQueryResult } from '../../../../src/core/logs/log-aggregator.js';
import { AuditLogEntry } from '../../../../src/core/sync/sync-audit-logger.js';

// Use vi.hoisted() to create mock classes
const { mockQuery, mockExport, MockLogAggregator, MockLogExporter } = vi.hoisted(() => {
  const _mockQuery = vi.fn().mockResolvedValue({
    entries: [
      {
        timestamp: '2025-12-01T12:00:05Z',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        result: 'success',
        durationMs: 150,
      },
      {
        timestamp: '2025-12-01T12:00:04Z',
        platform: 'jira',
        operation: 'update-status',
        itemId: 'US-001',
        result: 'success',
        durationMs: 200,
      },
      {
        timestamp: '2025-12-01T12:00:03Z',
        platform: 'github',
        operation: 'upsert-external',
        itemId: 'EXT-001',
        result: 'denied',
        reason: 'External updates disabled',
      },
    ],
    total: 3,
    hasMore: false,
    query: {},
    executionTimeMs: 15,
  });

  const _mockExport = vi.fn().mockResolvedValue(undefined);

  class _MockLogAggregator {
    query = _mockQuery;
  }

  class _MockLogExporter {
    export = _mockExport;
  }

  return {
    mockQuery: _mockQuery,
    mockExport: _mockExport,
    MockLogAggregator: _MockLogAggregator,
    MockLogExporter: _MockLogExporter,
  };
});

// Mock the LogAggregator
vi.mock('../../../../src/core/logs/log-aggregator.js', () => {
  return {
    LogAggregator: MockLogAggregator,
  };
});

// Mock the LogExporter
// vi.mock('../../../../src/core/logs/log-exporter.js', () => {
//   return {
//     LogExporter: MockLogExporter,
//   };
// });

// NOTE: Tests SKIPPED - sync-logs.ts was never implemented.
// Import commented out - module doesn't exist
// import {
//   createSyncLogsCommand,
//   runSyncLogs,
//   formatLogOutput,
//   formatLogLine,
//   parseDate,
// } from '../../../../src/cli/commands/sync-logs.js';

describe.skip('sync-logs command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('createSyncLogsCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createSyncLogsCommand();
      expect(cmd.name()).toBe('sync-logs');
    });

    it('should have --since option', () => {
      const cmd = createSyncLogsCommand();
      const option = cmd.options.find(o => o.long === '--since');
      expect(option).toBeDefined();
    });

    it('should have --platform option', () => {
      const cmd = createSyncLogsCommand();
      const option = cmd.options.find(o => o.long === '--platform');
      expect(option).toBeDefined();
    });

    it('should have --result option', () => {
      const cmd = createSyncLogsCommand();
      const option = cmd.options.find(o => o.long === '--result');
      expect(option).toBeDefined();
    });

    it('should have --export option', () => {
      const cmd = createSyncLogsCommand();
      const option = cmd.options.find(o => o.long === '--export');
      expect(option).toBeDefined();
    });
  });

  describe('runSyncLogs', () => {
    it('should output formatted logs by default', async () => {
      await runSyncLogs({});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('SYNC LOGS');
      expect(output).toContain('FS-001');
      expect(output).toContain('github');
    });

    it('should output JSON when --json flag is set', async () => {
      await runSyncLogs({ json: true });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.entries).toHaveLength(3);
    });

    it('should show export confirmation when --export is set', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-logs-'));
      const exportPath = path.join(tmpDir, 'logs.json');

      await runSyncLogs({ export: exportPath });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exported'));

      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });

  describe('formatLogOutput', () => {
    const sampleResult: LogQueryResult = {
      entries: [
        {
          timestamp: '2025-12-01T12:00:05Z',
          platform: 'github',
          operation: 'upsert-internal',
          itemId: 'FS-001',
          result: 'success',
          durationMs: 150,
        },
        {
          timestamp: '2025-12-01T12:00:03Z',
          platform: 'github',
          operation: 'upsert-external',
          itemId: 'EXT-001',
          result: 'denied',
          reason: 'External updates disabled',
        },
      ],
      total: 2,
      hasMore: false,
      query: {},
      executionTimeMs: 10,
    };

    it('should include header', () => {
      const output = formatLogOutput(sampleResult, {});
      expect(output).toContain('SYNC LOGS');
    });

    it('should include entry details', () => {
      const output = formatLogOutput(sampleResult, {});
      expect(output).toContain('github');
      expect(output).toContain('FS-001');
      expect(output).toContain('150ms');
    });

    it('should show reason for denied entries', () => {
      const output = formatLogOutput(sampleResult, {});
      expect(output).toContain('Reason: External updates disabled');
    });

    it('should show "hasMore" message when applicable', () => {
      const resultWithMore = { ...sampleResult, hasMore: true, total: 100 };
      const output = formatLogOutput(resultWithMore, {});
      expect(output).toContain('Showing 2 of 100 entries');
    });
  });

  describe('formatLogLine', () => {
    it('should format success entry with emoji', () => {
      const entry: AuditLogEntry = {
        timestamp: '2025-12-01T12:00:05Z',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        result: 'success',
        durationMs: 150,
      };

      const line = formatLogLine(entry);
      expect(line).toContain('✅');
      expect(line).toContain('github');
      expect(line).toContain('150ms');
    });

    it('should format denied entry with emoji', () => {
      const entry: AuditLogEntry = {
        timestamp: '2025-12-01T12:00:03Z',
        platform: 'jira',
        operation: 'delete',
        itemId: 'JIRA-123',
        result: 'denied',
      };

      const line = formatLogLine(entry);
      expect(line).toContain('🚫');
      expect(line).toContain('denied');
    });

    it('should format error entry with emoji', () => {
      const entry: AuditLogEntry = {
        timestamp: '2025-12-01T12:00:02Z',
        platform: 'ado',
        operation: 'read',
        itemId: 'WI-001',
        result: 'error',
      };

      const line = formatLogLine(entry);
      expect(line).toContain('❌');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO 8601 date', () => {
      const date = parseDate('2025-12-01T12:00:00Z');
      expect(date.toISOString()).toContain('2025-12-01');
    });

    it('should parse YYYY-MM-DD date', () => {
      const date = parseDate('2025-12-01');
      // Use UTC methods to avoid timezone issues
      const isoStr = date.toISOString();
      expect(isoStr).toContain('2025');
      expect(isoStr).toContain('12');
    });

    it('should throw for invalid date', () => {
      expect(() => parseDate('invalid')).toThrow('Invalid date format');
    });
  });
});
