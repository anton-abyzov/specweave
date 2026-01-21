import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogRotator } from '../../../src/core/hooks/log-rotator.js';

describe('LogRotation', () => {
  let logDir: string;
  let rotator: LogRotator;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-rotation-'));
    rotator = new LogRotator(logDir);
  });

  afterEach(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('should create dated log files', () => {
    const logPath = rotator.getCurrentLogPath('session-start');
    const today = new Date().toISOString().split('T')[0];

    expect(logPath).toContain(today);
    expect(logPath).toContain('session-start');
    expect(logPath).toMatch(/\.log$/);
  });

  it('should clean logs older than retention days', async () => {
    // Create old log files
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago
    const oldDateStr = oldDate.toISOString().split('T')[0];
    const oldLog = `session-start-${oldDateStr}.log`;

    fs.writeFileSync(path.join(logDir, oldLog), 'old content');

    // Verify old log exists
    expect(fs.existsSync(path.join(logDir, oldLog))).toBe(true);

    // Clean logs older than 7 days
    await rotator.cleanOldLogs(7);

    // Old log should be removed
    expect(fs.existsSync(path.join(logDir, oldLog))).toBe(false);
  });

  it('should keep logs within retention period', async () => {
    // Create recent log files
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3); // 3 days ago
    const recentDateStr = recentDate.toISOString().split('T')[0];
    const recentLog = `session-start-${recentDateStr}.log`;

    fs.writeFileSync(path.join(logDir, recentLog), 'recent content');

    // Verify recent log exists
    expect(fs.existsSync(path.join(logDir, recentLog))).toBe(true);

    // Clean logs older than 7 days
    await rotator.cleanOldLogs(7);

    // Recent log should still exist
    expect(fs.existsSync(path.join(logDir, recentLog))).toBe(true);
  });

  it('should handle multiple hooks with different dates', async () => {
    // Create logs for different hooks and dates
    const dates = [-2, -5, -10]; // days ago
    const hooks = ['session-start', 'user-prompt-submit', 'post-tool-use'];

    for (const hook of hooks) {
      for (const dayOffset of dates) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const dateStr = date.toISOString().split('T')[0];
        const logFile = `${hook}-${dateStr}.log`;

        fs.writeFileSync(path.join(logDir, logFile), 'content');
      }
    }

    // Should have 9 log files (3 hooks × 3 dates)
    const filesBefore = fs.readdirSync(logDir);
    expect(filesBefore).toHaveLength(9);

    // Clean logs older than 7 days
    await rotator.cleanOldLogs(7);

    // Should have 6 log files left (3 hooks × 2 recent dates)
    const filesAfter = fs.readdirSync(logDir);
    expect(filesAfter).toHaveLength(6);

    // Verify only old logs were removed
    for (const file of filesAfter) {
      expect(file).not.toContain('-10-'); // 10 days ago should be gone
    }
  });

  it('should not fail if log directory is empty', async () => {
    // Clean up empty directory should not throw
    await expect(rotator.cleanOldLogs(7)).resolves.not.toThrow();
  });

  it('should skip non-log files during cleanup', async () => {
    // Create non-log file
    const textFile = path.join(logDir, 'readme.txt');
    fs.writeFileSync(textFile, 'do not delete');

    // Create old log
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    const oldDateStr = oldDate.toISOString().split('T')[0];
    const oldLog = `session-start-${oldDateStr}.log`;
    fs.writeFileSync(path.join(logDir, oldLog), 'old content');

    // Clean logs
    await rotator.cleanOldLogs(7);

    // Text file should still exist
    expect(fs.existsSync(textFile)).toBe(true);
    // Old log should be removed
    expect(fs.existsSync(path.join(logDir, oldLog))).toBe(false);
  });

  it('should generate log path with hook name and date', () => {
    const logPath = rotator.getCurrentLogPath('user-prompt-submit');
    const today = new Date().toISOString().split('T')[0];

    expect(logPath).toContain(logDir);
    expect(logPath).toContain('user-prompt-submit');
    expect(logPath).toContain(today);
  });
});
