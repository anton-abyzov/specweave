/**
 * Auto Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AutoLogger } from '../../../src/core/auto/logger.js';

describe('AutoLogger', () => {
  let tempDir: string;
  let logger: AutoLogger;
  const testSessionId = 'auto-2025-12-29-abc123';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-logger-test-'));
    logger = new AutoLogger(tempDir, testSessionId);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('logging', () => {
    it('should create log file on first entry', () => {
      logger.logStart(['0001', '0002']);

      const logPath = logger.getLogFilePath();
      expect(fs.existsSync(logPath)).toBe(true);
    });

    it('should append entries to log file', () => {
      logger.logStart(['0001']);
      logger.logIteration(1, '0001');
      logger.logTaskComplete('T-001', '0001', { duration: 5000 });

      const logPath = logger.getLogFilePath();
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);

      const firstEntry = JSON.parse(lines[0]);
      expect(firstEntry.event).toBe('start');
      expect(firstEntry.sessionId).toBe(testSessionId);
    });

    it('should log task completion with details', () => {
      logger.logTaskComplete('T-001', '0001', {
        duration: 5000,
        testsRun: 10,
        testsPassed: 10,
        filesModified: ['src/index.ts'],
      });

      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].event).toBe('task_complete');
      expect(entries[0].details.taskId).toBe('T-001');
      expect(entries[0].details.testsRun).toBe(10);
    });

    it('should log task failure', () => {
      logger.logTaskFailed('T-002', '0001', 'Test failed', 1);

      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].event).toBe('task_failed');
      expect(entries[0].details.error).toBe('Test failed');
      expect(entries[0].details.attempt).toBe(1);
    });

    it('should log human gate events', () => {
      logger.logGateTriggered('npm run deploy', 'deploy');
      logger.logGateApproved('npm run deploy');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].event).toBe('gate_triggered');
      expect(entries[1].event).toBe('gate_approved');
    });

    it('should log circuit breaker events', () => {
      logger.logCircuitOpen('github', 3);
      logger.logCircuitClose('github');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].event).toBe('circuit_open');
      expect(entries[0].details.failures).toBe(3);
      expect(entries[1].event).toBe('circuit_close');
    });
  });

  describe('loadFromFile', () => {
    it('should load existing entries from file', () => {
      // Create initial log entries
      logger.logStart(['0001']);
      logger.logIteration(1, '0001');

      // Create new logger instance
      const newLogger = new AutoLogger(tempDir, testSessionId);
      const loaded = newLogger.loadFromFile();

      expect(loaded).toBe(true);
      expect(newLogger.getEntries()).toHaveLength(2);
    });

    it('should return false when file does not exist', () => {
      const newLogger = new AutoLogger(tempDir, 'nonexistent');
      const loaded = newLogger.loadFromFile();

      expect(loaded).toBe(false);
    });
  });

  describe('generateSummary', () => {
    it('should generate correct summary statistics', () => {
      logger.logStart(['0001', '0002']);
      logger.logIteration(1, '0001');
      logger.logTaskComplete('T-001', '0001', {
        duration: 5000,
        testsRun: 10,
        testsPassed: 10,
        coveragePercent: 85,
      });
      logger.logTaskComplete('T-002', '0001', {
        duration: 3000,
        testsRun: 5,
        testsPassed: 5,
        coveragePercent: 90,
      });
      logger.logGateTriggered('deploy', 'deploy');
      logger.logGateApproved('deploy');
      logger.logSync('github', 5, true);
      logger.logComplete({ endReason: 'All tasks done' });

      const summary = logger.generateSummary();

      expect(summary.sessionId).toBe(testSessionId);
      expect(summary.iterations).toBe(1);
      expect(summary.totalTasks).toBe(2);
      expect(summary.totalTests).toBe(15);
      expect(summary.averageCoverage).toBe(87.5);
      expect(summary.humanGatesTriggered).toBe(1);
      expect(summary.syncOperations).toBe(1);
      expect(summary.success).toBe(true);
    });

    it('should handle empty log', () => {
      const summary = logger.generateSummary();

      expect(summary.sessionId).toBe(testSessionId);
      expect(summary.totalTasks).toBe(0);
      expect(summary.success).toBe(false);
    });
  });

  describe('generateIncrementReport', () => {
    it('should generate increment-specific report', () => {
      logger.logTaskComplete('T-001', '0001', {
        duration: 5000,
        testsRun: 10,
        testsPassed: 10,
        coveragePercent: 85,
      });
      logger.logTaskComplete('T-002', '0001', {
        duration: 3000,
        testsRun: 5,
        testsPassed: 5,
        coveragePercent: 90,
      });
      logger.logTaskComplete('T-001', '0002', {
        duration: 4000,
        testsRun: 8,
        testsPassed: 8,
        coveragePercent: 80,
      });

      const report = logger.generateIncrementReport('0001');

      expect(report).not.toBeNull();
      expect(report!.incrementId).toBe('0001');
      expect(report!.tasksCompleted).toBe(2);
      expect(report!.testsTotal).toBe(15);
      expect(report!.coveragePercent).toBe(87.5);
      expect(report!.success).toBe(true);
    });

    it('should return null for unknown increment', () => {
      logger.logTaskComplete('T-001', '0001', { duration: 5000 });

      const report = logger.generateIncrementReport('0099');

      expect(report).toBeNull();
    });

    it('should mark failed increment as unsuccessful', () => {
      logger.logTaskComplete('T-001', '0001', { duration: 5000 });
      logger.logTaskFailed('T-002', '0001', 'Error', 3);

      const report = logger.generateIncrementReport('0001');

      expect(report).not.toBeNull();
      expect(report!.success).toBe(false);
      expect(report!.endReason).toBe('task_failures');
    });
  });

  describe('writeSummaryMarkdown', () => {
    it('should write summary to markdown file', () => {
      logger.logStart(['0001']);
      logger.logComplete({});

      const summary = logger.generateSummary();
      const summaryPath = logger.writeSummaryMarkdown(summary);

      expect(fs.existsSync(summaryPath)).toBe(true);

      const content = fs.readFileSync(summaryPath, 'utf-8');
      expect(content).toContain('# Auto Session Summary');
      expect(content).toContain(testSessionId);
    });
  });
});
