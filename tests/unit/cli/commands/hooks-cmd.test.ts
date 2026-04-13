import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// We test the functions directly by importing and overriding process.cwd()
describe('hooks-cmd CLI', () => {
  let testDir: string;
  let hooksLogDir: string;
  let origCwd: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'sw-hooks-cmd-'));
    hooksLogDir = path.join(testDir, '.specweave', 'logs', 'hooks');
    fs.mkdirSync(hooksLogDir, { recursive: true });
    origCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function writeLogEntries(hookName: string, entries: Record<string, unknown>[]) {
    const logFile = path.join(hooksLogDir, `${hookName}.log`);
    const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(logFile, lines);
  }

  describe('hooksLogCommand', () => {
    it('displays last 20 entries by default', async () => {
      const entries = Array.from({ length: 25 }, (_, i) => ({
        hookName: 'pre-tool-use',
        status: 'success',
        duration: i,
        timestamp: `2026-04-06T00:${String(i).padStart(2, '0')}:00.000Z`,
      }));
      writeLogEntries('pre-tool-use', entries);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({});

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines.length).toBe(20);

      vi.restoreAllMocks();
    });

    it('filters with --blocks-only', async () => {
      writeLogEntries('pre-tool-use', [
        { hookName: 'pre-tool-use', status: 'success', timestamp: '2026-04-06T00:01:00.000Z' },
        { hookName: 'pre-tool-use', status: 'warning', error: '[GUARD] Blocked', timestamp: '2026-04-06T00:02:00.000Z' },
        { hookName: 'pre-tool-use', status: 'success', timestamp: '2026-04-06T00:03:00.000Z' },
      ]);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({ blocksOnly: true });

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines.length).toBe(1);
      expect(dataLines[0]).toContain('warning');

      vi.restoreAllMocks();
    });

    it('filters with --errors-only', async () => {
      writeLogEntries('pre-tool-use', [
        { hookName: 'pre-tool-use', status: 'success', timestamp: '2026-04-06T00:01:00.000Z' },
        { hookName: 'pre-tool-use', status: 'error', error: '[ERROR] Crash', timestamp: '2026-04-06T00:02:00.000Z' },
      ]);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({ errorsOnly: true });

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines.length).toBe(1);

      vi.restoreAllMocks();
    });

    it('respects --last N limit', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        hookName: 'pre-tool-use',
        status: 'success',
        timestamp: `2026-04-06T00:${String(i).padStart(2, '0')}:00.000Z`,
      }));
      writeLogEntries('pre-tool-use', entries);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({ last: 5 });

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines.length).toBe(5);

      vi.restoreAllMocks();
    });

    it('filters by --hook name', async () => {
      writeLogEntries('pre-tool-use', [
        { hookName: 'pre-tool-use', status: 'success', timestamp: '2026-04-06T00:01:00.000Z' },
      ]);
      writeLogEntries('user-prompt-submit', [
        { hookName: 'user-prompt-submit', status: 'success', timestamp: '2026-04-06T00:02:00.000Z' },
      ]);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({ hook: 'pre-tool-use' });

      const promptLines = logs.filter((l) => l.includes('user-prompt-submit'));
      expect(promptLines.length).toBe(0);

      vi.restoreAllMocks();
    });

    it('shows empty state when no logs exist', async () => {
      // Remove the hooks log dir
      fs.rmSync(hooksLogDir, { recursive: true, force: true });

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksLogCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksLogCommand({});

      expect(logs.some((l) => l.includes('No hook logs found'))).toBe(true);

      vi.restoreAllMocks();
    });
  });

  describe('hooksHealthCommand', () => {
    it('shows health report with OK status for healthy hooks', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        hookName: 'pre-tool-use',
        status: 'success',
        duration: 5,
        timestamp: `2026-04-06T00:${String(i).padStart(2, '0')}:00.000Z`,
      }));
      writeLogEntries('pre-tool-use', entries);

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksHealthCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksHealthCommand({});

      expect(logs.some((l) => l.includes('Hook Health Report'))).toBe(true);
      expect(logs.some((l) => l.includes('pre-tool-use'))).toBe(true);

      vi.restoreAllMocks();
    });

    it('shows empty state when no data available', async () => {
      fs.rmSync(hooksLogDir, { recursive: true, force: true });

      const logs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

      const { hooksHealthCommand } = await import(
        '../../../../src/cli/commands/hooks-cmd.js'
      );
      await hooksHealthCommand({});

      expect(logs.some((l) => l.includes('No hook data available'))).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
