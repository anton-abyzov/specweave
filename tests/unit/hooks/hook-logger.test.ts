import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HookLogger } from '../../../src/core/hooks/hook-logger.js';

describe('HookLogger', () => {
  let logger: HookLogger;
  let logDir: string;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-logs-'));
    logger = new HookLogger(logDir);
  });

  afterEach(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('should write log with timestamp and hook name', async () => {
    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 45
    });

    const logFile = path.join(logDir, 'session-start.log');
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.timestamp).toBeDefined();
    expect(entry.hookName).toBe('session-start');
    expect(entry.status).toBe('success');
    expect(entry.duration).toBe(45);
  });

  it('should log failures with error details', async () => {
    await logger.log({
      hookName: 'user-prompt-submit',
      status: 'error',
      error: 'Timeout after 5s',
      stackTrace: 'Error: Timeout...'
    });

    const logFile = path.join(logDir, 'user-prompt-submit.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.error).toBe('Timeout after 5s');
    expect(entry.stackTrace).toContain('Error: Timeout');
  });

  it('should include request ID for correlation', async () => {
    const requestId = 'req-12345';

    await logger.log({
      hookName: 'post-tool-use',
      status: 'success',
      requestId
    });

    const logFile = path.join(logDir, 'post-tool-use.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.requestId).toBe(requestId);
  });

  it('should append multiple log entries to same file', async () => {
    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 50
    });

    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 75
    });

    const logFile = path.join(logDir, 'session-start.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines).toHaveLength(2);

    const entry1 = JSON.parse(lines[0]);
    const entry2 = JSON.parse(lines[1]);

    expect(entry1.duration).toBe(50);
    expect(entry2.duration).toBe(75);
  });

  it('should create log directory if it does not exist', async () => {
    const newLogDir = path.join(os.tmpdir(), 'hook-logs-nonexistent');

    // Clean up if exists from previous test
    if (fs.existsSync(newLogDir)) {
      fs.rmSync(newLogDir, { recursive: true, force: true });
    }

    const newLogger = new HookLogger(newLogDir);

    await newLogger.log({
      hookName: 'test-hook',
      status: 'success'
    });

    expect(fs.existsSync(newLogDir)).toBe(true);

    // Cleanup
    fs.rmSync(newLogDir, { recursive: true, force: true });
  });

  it('should handle warnings array in log entry', async () => {
    await logger.log({
      hookName: 'user-prompt-submit',
      status: 'warning',
      warnings: [
        {
          severity: 'WARNING',
          message: 'Hook execution timeout after 5s',
          recommendation: 'Run specweave check-hooks'
        }
      ]
    });

    const logFile = path.join(logDir, 'user-prompt-submit.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.warnings).toHaveLength(1);
    expect(entry.warnings[0].severity).toBe('WARNING');
    expect(entry.warnings[0].message).toContain('timeout');
  });

  it('should log execution time for performance monitoring', async () => {
    const startTime = Date.now();

    await logger.log({
      hookName: 'post-tool-use',
      status: 'success',
      duration: 1200,
      startTime,
      endTime: startTime + 1200
    });

    const logFile = path.join(logDir, 'post-tool-use.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.duration).toBe(1200);
    expect(entry.startTime).toBe(startTime);
    expect(entry.endTime).toBe(startTime + 1200);
  });
});
