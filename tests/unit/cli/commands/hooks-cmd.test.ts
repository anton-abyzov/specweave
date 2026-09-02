/**
 * `specweave hooks log` — reads the single per-project JSONL hook log
 * (.specweave/logs/hooks.jsonl + one rotated predecessor) and prints the
 * newest entries first, with --hook / --blocks-only / --errors-only filters.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { hooksLogCommand, readHookLog } from '../../../../src/cli/commands/hooks-cmd.js';

interface Entry { t: string; hook: string; level: string; msg: string }

describe('hooks-cmd CLI', () => {
  let testDir: string;
  let logsDir: string;
  let origCwd: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'sw-hooks-cmd-'));
    logsDir = path.join(testDir, '.specweave', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    origCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(origCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function write(file: string, entries: Partial<Entry>[]): void {
    fs.writeFileSync(
      path.join(logsDir, file),
      entries.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );
  }

  function entry(i: number, over: Partial<Entry> = {}): Partial<Entry> {
    return {
      t: `2026-04-06T00:${String(i).padStart(2, '0')}:00.000Z`,
      hook: 'pre-tool-use',
      level: 'warn',
      msg: `event ${i}`,
      ...over,
    };
  }

  function capture(): string[] {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => { logs.push(String(msg)); });
    return logs;
  }

  describe('readHookLog', () => {
    it('reads the rotated file before the current one and skips malformed lines', () => {
      write('hooks.jsonl.1', [entry(1, { msg: 'old' })]);
      fs.writeFileSync(
        path.join(logsDir, 'hooks.jsonl'),
        `${JSON.stringify(entry(2, { msg: 'new' }))}\nNOT JSON\n\n`,
      );
      expect(readHookLog(testDir).map((e) => e.msg)).toEqual(['old', 'new']);
    });

    it('returns [] when nothing was ever logged', () => {
      expect(readHookLog(testDir)).toEqual([]);
    });
  });

  describe('hooksLogCommand', () => {
    it('displays the last 20 entries by default, newest first', async () => {
      write('hooks.jsonl', Array.from({ length: 25 }, (_, i) => entry(i)));
      const logs = capture();
      await hooksLogCommand({});

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines).toHaveLength(20);
      expect(dataLines[0]).toContain('event 24');
      expect(dataLines[19]).toContain('event 5');
    });

    it('respects --last N', async () => {
      write('hooks.jsonl', Array.from({ length: 25 }, (_, i) => entry(i)));
      const logs = capture();
      await hooksLogCommand({ last: 5 });
      expect(logs.filter((l) => l.includes('pre-tool-use'))).toHaveLength(5);
    });

    it('filters with --blocks-only', async () => {
      write('hooks.jsonl', [
        entry(1),
        entry(2, { level: 'block', msg: 'guard blocked 0001-x' }),
        entry(3, { level: 'error' }),
      ]);
      const logs = capture();
      await hooksLogCommand({ blocksOnly: true });

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines).toHaveLength(1);
      expect(dataLines[0]).toContain('block');
      expect(dataLines[0]).toContain('guard blocked 0001-x');
    });

    it('filters with --errors-only', async () => {
      write('hooks.jsonl', [entry(1), entry(2, { level: 'error', msg: 'boom' })]);
      const logs = capture();
      await hooksLogCommand({ errorsOnly: true });

      const dataLines = logs.filter((l) => l.includes('pre-tool-use'));
      expect(dataLines).toHaveLength(1);
      expect(dataLines[0]).toContain('boom');
    });

    it('filters by hook name', async () => {
      write('hooks.jsonl', [entry(1), entry(2, { hook: 'stop', msg: 'auto loop released' })]);
      const logs = capture();
      await hooksLogCommand({ hook: 'stop' });

      expect(logs.filter((l) => l.includes('pre-tool-use'))).toHaveLength(0);
      expect(logs.filter((l) => l.includes('auto loop released'))).toHaveLength(1);
    });

    it('shows an empty state when nothing is logged', async () => {
      const logs = capture();
      await hooksLogCommand({});
      expect(logs.some((l) => l.includes('No hook events logged'))).toBe(true);
    });
  });
});
