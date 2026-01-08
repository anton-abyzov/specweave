import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { HookLogger } from '../../../src/core/hooks/hook-logger.js';

const execAsync = promisify(exec);

describe('specweave logs hooks', () => {
  let testDir: string;
  let logsDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-test-'));
    logsDir = path.join(testDir, '.specweave', 'logs', 'hooks');

    // Create test project structure
    fs.mkdirSync(logsDir, { recursive: true });

    // Create sample log entries
    const logger = new HookLogger(logsDir);

    // Add multiple log entries for different hooks
    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 100,
      timestamp: '2026-01-08T10:00:00Z'
    });

    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 150,
      timestamp: '2026-01-08T10:05:00Z'
    });

    await logger.log({
      hookName: 'user-prompt-submit',
      status: 'warning',
      duration: 5200,
      timestamp: '2026-01-08T10:10:00Z',
      warnings: [{
        severity: 'WARNING',
        message: 'Hook execution timeout after 5s',
        recommendation: 'Run specweave check-hooks'
      }]
    });

    await logger.log({
      hookName: 'post-tool-use',
      status: 'success',
      duration: 75,
      timestamp: '2026-01-08T10:15:00Z'
    });

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should tail last 50 lines by default', async () => {
    // Add many entries to test tail
    const logger = new HookLogger(logsDir);
    for (let i = 0; i < 60; i++) {
      await logger.log({
        hookName: 'test-hook',
        status: 'success',
        duration: 100
      });
    }

    // Run command (stub - actual implementation will be CLI)
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    // Capture output
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({ tail: 50 });

    console.log = originalLog;

    // Should have at most 50 entries + headers
    const entryLines = output.filter(line => line.includes('"status"'));
    expect(entryLines.length).toBeLessThanOrEqual(50);
  });

  it('should filter by hook name', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({ hook: 'session-start', format: 'json' });

    console.log = originalLog;

    const entries = output
      .filter(line => line.trim().length > 0 && line.includes('hookName'))
      .map(line => JSON.parse(line));

    expect(entries.every((e: any) => e.hookName === 'session-start')).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('should show all hooks when no filter specified', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({});

    console.log = originalLog;

    const text = output.join('\n');
    expect(text).toContain('session-start');
    expect(text).toContain('user-prompt-submit');
    expect(text).toContain('post-tool-use');
  });

  it('should handle --format=json option', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({ format: 'json' });

    console.log = originalLog;

    // Every non-empty line should be valid JSON
    const lines = output.filter(line => line.trim().length > 0);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('should handle --format=table option (default)', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({ format: 'table' });

    console.log = originalLog;

    const text = output.join('\n');

    // Should have table headers
    expect(text).toContain('Timestamp');
    expect(text).toContain('Hook');
    expect(text).toContain('Status');
    expect(text).toContain('Duration');
  });

  it('should show warnings in output', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');
    const output: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await logsCommand({ hook: 'user-prompt-submit' });

    console.log = originalLog;

    const text = output.join('\n');
    expect(text).toContain('timeout');
  });

  it('should handle non-existent hook gracefully', async () => {
    const { logsCommand } = await import('../../../src/cli/commands/logs.js');

    // Should not throw
    await expect(logsCommand({ hook: 'non-existent-hook' })).resolves.not.toThrow();
  });

  it('should handle missing logs directory', async () => {
    // Remove logs directory
    fs.rmSync(logsDir, { recursive: true, force: true });

    const { logsCommand } = await import('../../../src/cli/commands/logs.js');

    // Should not throw
    await expect(logsCommand({})).resolves.not.toThrow();
  });
});
