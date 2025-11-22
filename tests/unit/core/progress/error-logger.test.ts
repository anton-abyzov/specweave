/**
 * Unit Tests: ErrorLogger
 *
 * Tests error logging, reading, and file management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import {
  logError,
  readErrorLog,
  clearErrorLog,
  getErrorCount
} from '../../../../src/core/progress/error-logger.js';

describe('ErrorLogger', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'error-logger-test-'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('TC-033: Error Logging', () => {
    it('should log error to file', async () => {
      await logError('PROJ-123', new Error('Network timeout'), { projectRoot: testDir });

      const logFile = join(testDir, '.specweave', 'logs', 'import-errors.log');
      expect(existsSync(logFile)).toBe(true);
    });

    it('should log multiple errors', async () => {
      await logError('PROJ-1', new Error('Error 1'), { projectRoot: testDir });
      await logError('PROJ-2', new Error('Error 2'), { projectRoot: testDir });
      await logError('PROJ-3', new Error('Error 3'), { projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries).toHaveLength(3);
      expect(entries[0].projectKey).toBe('PROJ-1');
      expect(entries[1].projectKey).toBe('PROJ-2');
      expect(entries[2].projectKey).toBe('PROJ-3');
    });

    it('should include timestamp in log entry', async () => {
      await logError('PROJ-456', new Error('Timeout'), { projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries[0].timestamp).toBeDefined();
      expect(new Date(entries[0].timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should handle string errors', async () => {
      await logError('PROJ-789', 'Custom error message', { projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries[0].error).toBe('Custom error message');
    });
  });

  describe('TC-034: Error Log Reading', () => {
    it('should read error log entries', async () => {
      await logError('PROJ-A', new Error('Error A'), { projectRoot: testDir });
      await logError('PROJ-B', new Error('Error B'), { projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries).toHaveLength(2);
      expect(entries[0].error).toBe('Error A');
      expect(entries[1].error).toBe('Error B');
    });

    it('should return empty array if log does not exist', async () => {
      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries).toEqual([]);
    });

    it('should parse log lines correctly', async () => {
      await logError('PROJECT-123', new Error('Network error'), { projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });

      expect(entries[0].projectKey).toBe('PROJECT-123');
      expect(entries[0].error).toBe('Network error');
    });
  });

  describe('Error Log Management', () => {
    it('should clear error log', async () => {
      await logError('PROJ-1', new Error('Error'), { projectRoot: testDir });
      await logError('PROJ-2', new Error('Error'), { projectRoot: testDir });

      await clearErrorLog({ projectRoot: testDir });

      const entries = await readErrorLog({ projectRoot: testDir });
      expect(entries).toEqual([]);
    });

    it('should get error count', async () => {
      await logError('PROJ-1', new Error('Error 1'), { projectRoot: testDir });
      await logError('PROJ-2', new Error('Error 2'), { projectRoot: testDir });
      await logError('PROJ-3', new Error('Error 3'), { projectRoot: testDir });

      const count = await getErrorCount({ projectRoot: testDir });

      expect(count).toBe(3);
    });

    it('should return 0 count for non-existent log', async () => {
      const count = await getErrorCount({ projectRoot: testDir });

      expect(count).toBe(0);
    });

    it('should create log directory if missing', async () => {
      const logDir = join(testDir, '.specweave', 'logs');
      expect(existsSync(logDir)).toBe(false);

      await logError('PROJ-X', new Error('Test'), { projectRoot: testDir });

      expect(existsSync(logDir)).toBe(true);
    });
  });
});
