/**
 * Unit Tests: SyncAuditLogger
 *
 * Tests the audit logging functionality for sync operations.
 * Logs are stored in JSONL format for efficient querying.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncAuditLogger, AuditLogEntry } from '../../../../src/core/sync/sync-audit-logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('SyncAuditLogger', () => {
  let testDir: string;
  let logger: SyncAuditLogger;

  beforeEach(async () => {
    // Create isolated test directory
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `specweave-audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });

    logger = new SyncAuditLogger({
      specweavePath: path.join(testDir, '.specweave'),
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('logSuccess()', () => {
    it('should log successful operations', async () => {
      // Act
      await logger.logSuccess('github', 'upsert-internal', 'FS-001', 150);

      // Assert
      const entries = await logger.getRecentEntries(10);
      expect(entries.length).toBe(1);
      expect(entries[0].platform).toBe('github');
      expect(entries[0].operation).toBe('upsert-internal');
      expect(entries[0].itemId).toBe('FS-001');
      expect(entries[0].result).toBe('success');
      expect(entries[0].durationMs).toBe(150);
    });

    it('should include optional context', async () => {
      // Act
      await logger.logSuccess('jira', 'update-status', 'JIRA-123', 200, {
        issueNumber: 456,
        statusFrom: 'open',
        statusTo: 'closed',
      });

      // Assert
      const entries = await logger.getRecentEntries(10);
      expect(entries[0].context).toEqual({
        issueNumber: 456,
        statusFrom: 'open',
        statusTo: 'closed',
      });
    });
  });

  describe('logDenied()', () => {
    it('should log denied operations with reason', async () => {
      // Act
      await logger.logDenied(
        'github',
        'upsert-internal',
        'FS-001',
        'canUpsertInternalItems is disabled'
      );

      // Assert
      const entries = await logger.getRecentEntries(10);
      expect(entries.length).toBe(1);
      expect(entries[0].result).toBe('denied');
      expect(entries[0].reason).toBe('canUpsertInternalItems is disabled');
    });
  });

  describe('logError()', () => {
    it('should log error operations with error message', async () => {
      // Arrange
      const testError = new Error('Network timeout');
      testError.stack = 'Error: Network timeout\n    at test.ts:1:1';

      // Act
      await logger.logError('ado', 'upsert-external', 'ADO-789', testError);

      // Assert
      const entries = await logger.getRecentEntries(10);
      expect(entries.length).toBe(1);
      expect(entries[0].result).toBe('error');
      expect(entries[0].error).toBe('Network timeout');
      expect(entries[0].context?.stack).toContain('Network timeout');
    });
  });

  describe('getLogPath()', () => {
    it('should return path with date format', () => {
      // Act
      const logPath = logger.getLogPath();

      // Assert
      expect(logPath).toContain('audit-');
      expect(logPath).toContain('.jsonl');
      expect(logPath).toMatch(/audit-\d{4}-\d{2}-\d{2}\.jsonl/);
    });

    it('should return path for specific date', () => {
      // Arrange
      const date = new Date('2025-06-15');

      // Act
      const logPath = logger.getLogPath(date);

      // Assert
      expect(logPath).toContain('audit-2025-06-15.jsonl');
    });
  });

  describe('getLogFiles()', () => {
    it('should return empty array when no logs exist', async () => {
      // Act
      const files = await logger.getLogFiles();

      // Assert
      expect(files).toEqual([]);
    });

    it('should return log files sorted newest first', async () => {
      // Arrange - create some logs
      await logger.logSuccess('github', 'read', 'FS-001');

      // Act
      const files = await logger.getLogFiles();

      // Assert
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toContain('audit-');
    });
  });

  describe('getRecentEntries()', () => {
    it('should respect limit parameter', async () => {
      // Arrange - log multiple entries
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logSuccess('github', 'read', 'FS-002');
      await logger.logSuccess('github', 'read', 'FS-003');

      // Act
      const entries = await logger.getRecentEntries(2);

      // Assert
      expect(entries.length).toBe(2);
    });

    it('should apply filter function', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logDenied('github', 'upsert-internal', 'FS-002', 'denied');
      await logger.logSuccess('jira', 'read', 'JIRA-001');

      // Act
      const entries = await logger.getRecentEntries(10, (e) => e.platform === 'github');

      // Assert
      expect(entries.length).toBe(2);
      expect(entries.every((e) => e.platform === 'github')).toBe(true);
    });
  });

  describe('getEntriesForPlatform()', () => {
    it('should filter by platform', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logSuccess('jira', 'read', 'JIRA-001');
      await logger.logSuccess('ado', 'read', 'ADO-001');
      await logger.logSuccess('github', 'read', 'FS-002');

      // Act
      const githubEntries = await logger.getEntriesForPlatform('github');

      // Assert
      expect(githubEntries.length).toBe(2);
      expect(githubEntries.every((e) => e.platform === 'github')).toBe(true);
    });
  });

  describe('getDeniedEntries()', () => {
    it('should return only denied entries', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logDenied('github', 'upsert-internal', 'FS-002', 'denied');
      await logger.logSuccess('jira', 'read', 'JIRA-001');

      // Act
      const deniedEntries = await logger.getDeniedEntries();

      // Assert
      expect(deniedEntries.length).toBe(1);
      expect(deniedEntries[0].result).toBe('denied');
    });
  });

  describe('getErrorEntries()', () => {
    it('should return only error entries', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logError('github', 'upsert-internal', 'FS-002', new Error('test'));
      await logger.logDenied('jira', 'read', 'JIRA-001', 'denied');

      // Act
      const errorEntries = await logger.getErrorEntries();

      // Assert
      expect(errorEntries.length).toBe(1);
      expect(errorEntries[0].result).toBe('error');
    });
  });

  describe('getStats()', () => {
    it('should calculate statistics correctly', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001', 100);
      await logger.logSuccess('github', 'upsert-internal', 'FS-002', 200);
      await logger.logDenied('jira', 'upsert-external', 'JIRA-001', 'denied');
      await logger.logError('ado', 'update-status', 'ADO-001', new Error('test'));

      // Act
      const stats = await logger.getStats();

      // Assert
      expect(stats.total).toBe(4);
      expect(stats.success).toBe(2);
      expect(stats.denied).toBe(1);
      expect(stats.errors).toBe(1);
      expect(stats.byPlatform.github).toBe(2);
      expect(stats.byPlatform.jira).toBe(1);
      expect(stats.byPlatform.ado).toBe(1);
      expect(stats.avgDurationMs).toBe(150); // (100 + 200) / 2
    });

    it('should filter by time range', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');

      // Act - query for future entries (should be empty)
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const stats = await logger.getStats(futureDate);

      // Assert
      expect(stats.total).toBe(0);
    });
  });

  describe('cleanup()', () => {
    it('should delete files older than retention period', async () => {
      // Arrange - create a logger with very short retention
      const shortRetentionLogger = new SyncAuditLogger({
        specweavePath: path.join(testDir, '.specweave'),
        retentionDays: 0, // Immediate expiry
      });

      // Create a log entry (creates today's log file)
      await shortRetentionLogger.logSuccess('github', 'read', 'FS-001');

      // Create an old log file manually
      const logDir = path.join(testDir, '.specweave', 'logs', 'sync');
      const oldLogPath = path.join(logDir, 'audit-2020-01-01.jsonl');
      await fs.writeFile(oldLogPath, '{"test": true}\n');

      // Act
      const deletedCount = await shortRetentionLogger.cleanup();

      // Assert
      expect(deletedCount).toBeGreaterThan(0);
      await expect(fs.access(oldLogPath)).rejects.toThrow();
    });
  });

  describe('disabled logging', () => {
    it('should not log when enabled is false', async () => {
      // Arrange
      const disabledLogger = new SyncAuditLogger({
        specweavePath: path.join(testDir, '.specweave'),
        enabled: false,
      });

      // Act
      await disabledLogger.logSuccess('github', 'read', 'FS-001');

      // Assert
      const entries = await disabledLogger.getRecentEntries();
      expect(entries.length).toBe(0);
    });
  });

  describe('JSONL format', () => {
    it('should write one JSON object per line', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logSuccess('github', 'read', 'FS-002');

      // Act
      const logPath = logger.getLogPath();
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Assert
      expect(lines.length).toBe(2);
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it('should include timestamp in each entry', async () => {
      // Act
      await logger.logSuccess('github', 'read', 'FS-001');

      // Assert
      const entries = await logger.getRecentEntries();
      expect(entries[0].timestamp).toBeDefined();
      expect(new Date(entries[0].timestamp).toISOString()).toBe(entries[0].timestamp);
    });
  });

  describe('readEntries()', () => {
    it('should return empty array for non-existent file', async () => {
      // Act
      const entries = await logger.readEntries('/non/existent/path.jsonl');

      // Assert
      expect(entries).toEqual([]);
    });

    it('should respect limit and filter', async () => {
      // Arrange
      await logger.logSuccess('github', 'read', 'FS-001');
      await logger.logDenied('github', 'upsert-internal', 'FS-002', 'denied');
      await logger.logSuccess('github', 'read', 'FS-003');

      // Act
      const logPath = logger.getLogPath();
      const entries = await logger.readEntries(
        logPath,
        1,
        (e) => e.result === 'success'
      );

      // Assert
      expect(entries.length).toBe(1);
      expect(entries[0].result).toBe('success');
    });
  });

  describe('error handling', () => {
    it('should not throw when log directory creation fails', async () => {
      // Arrange - create logger with invalid path
      const invalidLogger = new SyncAuditLogger({
        specweavePath: '/root/cannot/write/here',
      });

      // Act & Assert - should not throw
      await expect(
        invalidLogger.logSuccess('github', 'read', 'FS-001')
      ).resolves.not.toThrow();
    });
  });
});
