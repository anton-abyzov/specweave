/**
 * Tests for Failure Logger
 *
 * @module tests/unit/core/lazy-loading/failure-logger
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  LazyLoadingLogger,
  LogEntry,
  getLogger,
  logError,
  logWarn,
  logInfo,
  getLogFilePath,
} from '../../../../src/core/lazy-loading/failure-logger.js';

// Test directory
const TEST_DIR = path.join(os.tmpdir(), 'specweave-logger-test');
const TEST_LOG_FILE = path.join(TEST_DIR, 'test.log');

describe('LazyLoadingLogger', () => {
  let logger: LazyLoadingLogger;

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    logger = new LazyLoadingLogger({
      logDir: TEST_DIR,
      logFile: TEST_LOG_FILE,
    });
  });

  afterEach(() => {
    // Clean up
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Basic Logging', () => {
    it('should create log file on first write', () => {
      expect(fs.existsSync(TEST_LOG_FILE)).toBe(false);

      logger.info('test', 'Test message');

      expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);
    });

    it('should write error entries with all fields', () => {
      const error = new Error('Test error');
      logger.error('installPlugins', 'Failed to install', error, { plugins: ['foo'] });

      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(1);

      const entry = entries[0];
      expect(entry.level).toBe('error');
      expect(entry.operation).toBe('installPlugins');
      expect(entry.message).toBe('Failed to install');
      expect(entry.error).toBe('Test error');
      expect(entry.stack).toContain('Error: Test error');
      expect(entry.metadata).toEqual({ plugins: ['foo'] });
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should write warning entries', () => {
      logger.warn('cache', 'Cache miss');

      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('warn');
    });

    it('should write info entries', () => {
      logger.info('load', 'Loaded 5 plugins');

      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('info');
    });

    it('should write debug entries', () => {
      logger.debug('internal', 'Debug info');

      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('debug');
    });

    it('should handle entries without optional fields', () => {
      logger.info('test', 'Simple message');

      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(1);
      expect(entries[0].error).toBeUndefined();
      expect(entries[0].stack).toBeUndefined();
      expect(entries[0].metadata).toBeUndefined();
    });
  });

  describe('Log Rotation', () => {
    it('should rotate when file exceeds max size', () => {
      // Create logger with tiny max size
      const smallLogger = new LazyLoadingLogger({
        logDir: TEST_DIR,
        logFile: TEST_LOG_FILE,
        maxFileSize: 500, // 500 bytes
        maxFiles: 3,
      });

      // Write entries to exceed limit
      for (let i = 0; i < 20; i++) {
        smallLogger.info('test', `Message number ${i} with some extra content to increase size`);
      }

      // Check rotated file exists
      expect(fs.existsSync(`${TEST_LOG_FILE}.1`)).toBe(true);
    });

    it('should delete oldest rotated file when max reached', () => {
      const smallLogger = new LazyLoadingLogger({
        logDir: TEST_DIR,
        logFile: TEST_LOG_FILE,
        maxFileSize: 200, // Very small
        maxFiles: 2,
      });

      // Write many entries to force multiple rotations
      for (let i = 0; i < 50; i++) {
        smallLogger.info('test', `Long message ${i} to fill up file quickly`);
      }

      // Should have at most maxFiles rotated files
      const rotatedCount = [1, 2, 3, 4, 5].filter((n) =>
        fs.existsSync(`${TEST_LOG_FILE}.${n}`)
      ).length;

      expect(rotatedCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Log Reading', () => {
    it('should read recent logs with limit', () => {
      for (let i = 0; i < 10; i++) {
        logger.info('test', `Message ${i}`);
      }

      const entries = logger.getRecentLogs(5);
      expect(entries).toHaveLength(5);
      // Should be the last 5 entries
      expect(entries[0].message).toBe('Message 5');
      expect(entries[4].message).toBe('Message 9');
    });

    it('should return empty array for non-existent log', () => {
      const newLogger = new LazyLoadingLogger({
        logDir: TEST_DIR,
        logFile: path.join(TEST_DIR, 'nonexistent.log'),
      });

      const entries = newLogger.getRecentLogs();
      expect(entries).toEqual([]);
    });

    it('should handle corrupted log lines gracefully', () => {
      // Write some valid entries
      logger.info('test', 'Valid entry');

      // Append corrupted line directly
      fs.appendFileSync(TEST_LOG_FILE, 'not valid json\n');

      // Write another valid entry
      logger.info('test', 'Another valid');

      // Should parse valid entries and skip corrupted
      const entries = logger.getRecentLogs();
      expect(entries).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      logger.error('test', 'Error 1');
      logger.error('test', 'Error 2');
      logger.warn('test', 'Warning 1');
      logger.info('test', 'Info 1');
      logger.info('test', 'Info 2');

      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(5);
      expect(stats.errorCount).toBe(2);
      expect(stats.warnCount).toBe(1);
      expect(stats.fileSize).toBeGreaterThan(0);
    });

    it('should return zero stats for empty log', () => {
      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.warnCount).toBe(0);
      expect(stats.fileSize).toBe(0);
    });
  });

  describe('Clear Logs', () => {
    it('should clear main log file', () => {
      logger.info('test', 'Some entry');
      expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);

      logger.clear();
      expect(fs.existsSync(TEST_LOG_FILE)).toBe(false);
    });

    it('should clear rotated files', () => {
      // Create logger with tiny max size to force rotation
      const smallLogger = new LazyLoadingLogger({
        logDir: TEST_DIR,
        logFile: TEST_LOG_FILE,
        maxFileSize: 100,
        maxFiles: 3,
      });

      // Write many entries
      for (let i = 0; i < 50; i++) {
        smallLogger.info('test', `Message ${i} with content`);
      }

      // Should have rotated files
      expect(fs.existsSync(`${TEST_LOG_FILE}.1`)).toBe(true);

      // Clear all
      smallLogger.clear();

      expect(fs.existsSync(TEST_LOG_FILE)).toBe(false);
      expect(fs.existsSync(`${TEST_LOG_FILE}.1`)).toBe(false);
    });
  });

  describe('Path Access', () => {
    it('should return correct log path', () => {
      expect(logger.getLogPath()).toBe(TEST_LOG_FILE);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should provide default logger via getLogger()', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2); // Singleton
  });

  it('should provide getLogFilePath()', () => {
    const path = getLogFilePath();
    expect(path).toContain('lazy-loading.log');
  });
});

describe('Error Resilience', () => {
  it('should not throw on write failures', () => {
    // Create logger with invalid path
    const logger = new LazyLoadingLogger({
      logDir: '/nonexistent/path/that/cannot/be/created',
      logFile: '/nonexistent/path/test.log',
    });

    // Should not throw
    expect(() => logger.info('test', 'message')).not.toThrow();
  });

  it('should handle null error gracefully', () => {
    const logger = new LazyLoadingLogger({
      logDir: TEST_DIR,
      logFile: TEST_LOG_FILE,
    });

    // Should not throw with undefined error
    expect(() => logger.error('test', 'message', undefined)).not.toThrow();
  });
});
