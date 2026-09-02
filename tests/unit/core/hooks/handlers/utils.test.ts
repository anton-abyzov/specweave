import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  findProjectRoot,
  createContext,
  parseStdinJson,
  normalizePath,
  getFilePath,
  isIncrementFile,
  extractIncrementId,
  readActiveIncrements,
  logHook,
  HOOK_LOG_FILE,
  HOOK_LOG_MAX_BYTES,
} from '../../../../../src/core/hooks/handlers/utils.js';

let root = '';
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hook-utils-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('findProjectRoot / createContext', () => {
  it('walks up to the directory containing .specweave/config.json', () => {
    const deep = path.join(root, 'a', 'b');
    fs.mkdirSync(deep, { recursive: true });
    expect(findProjectRoot(deep)).toBe(root);
  });
  it('returns null outside a project', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-bare-'));
    try {
      expect(findProjectRoot(bare)).toBeNull();
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
  it('createContext derives state/logs/config paths', () => {
    const ctx = createContext(root);
    expect(ctx.stateDir).toBe(path.join(root, '.specweave', 'state'));
    expect(ctx.logsDir).toBe(path.join(root, '.specweave', 'logs'));
    expect(ctx.configPath).toBe(path.join(root, '.specweave', 'config.json'));
    expect(new Date(ctx.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('parseStdinJson', () => {
  it('parses objects, returns {} for empty/garbage/non-objects', () => {
    expect(parseStdinJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseStdinJson('')).toEqual({});
    expect(parseStdinJson('   ')).toEqual({});
    expect(parseStdinJson('nope{')).toEqual({});
    expect(parseStdinJson('[1]')).toEqual({});
    expect(parseStdinJson('null')).toEqual({});
  });
});

describe('path helpers (Windows fixtures)', () => {
  const win = 'C:\\proj\\.specweave\\increments\\0001-x\\metadata.json';
  it('normalizePath turns backslashes into slashes', () => {
    expect(normalizePath(win)).toBe('C:/proj/.specweave/increments/0001-x/metadata.json');
  });
  it('getFilePath normalizes tool_input.file_path', () => {
    expect(getFilePath({ tool_input: { file_path: win } })).toBe('C:/proj/.specweave/increments/0001-x/metadata.json');
    expect(getFilePath({})).toBe('');
    expect(getFilePath({ tool_input: { file_path: 42 } })).toBe('');
  });
  it('isIncrementFile matches both separators', () => {
    expect(isIncrementFile(win)).toBe(true);
    expect(isIncrementFile('/p/.specweave/increments/0001-x/spec.md')).toBe(true);
    expect(isIncrementFile('C:\\proj\\src\\a.ts')).toBe(false);
  });
  it('extractIncrementId handles E-suffix ids and Windows paths', () => {
    expect(extractIncrementId(win)).toBe('0001-x');
    expect(extractIncrementId('D:\\r\\.specweave\\increments\\0042E-emergency-fix\\tasks.md')).toBe('0042E-emergency-fix');
    expect(extractIncrementId('/nowhere/file.md')).toBe('unknown');
  });
});

describe('readActiveIncrements', () => {
  const inc = (id: string, status: string) => {
    const d = path.join(root, '.specweave', 'increments', id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'metadata.json'), JSON.stringify({ status }));
  };
  it('prefers active-increment.json ids that still exist on disk', () => {
    inc('0001-a', 'active');
    inc('0002-b', 'active');
    fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids: ['0002-b', '0999-gone'] }));
    expect(readActiveIncrements(root)).toEqual(['0002-b']);
  });
  it('falls back to a metadata scan', () => {
    inc('0003-c', 'completed');
    inc('0004-d', 'in-progress');
    inc('0005-e', 'active');
    expect(readActiveIncrements(root)).toEqual(['0004-d', '0005-e']);
  });
  it('returns [] without an increments dir', () => {
    expect(readActiveIncrements(root)).toEqual([]);
  });
});

describe('logHook (single JSONL, rotated at 1 MB)', () => {
  it('appends one JSON line per call to hooks.jsonl', () => {
    const ctx = createContext(root);
    logHook(ctx, 'pre-tool-use', 'blocked x', 'block');
    logHook(ctx, 'stop', '[ERROR] boom', 'error');
    const lines = fs.readFileSync(path.join(ctx.logsDir, HOOK_LOG_FILE), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({ t: ctx.timestamp, hook: 'pre-tool-use', level: 'block', msg: 'blocked x' });
    expect(JSON.parse(lines[1]).level).toBe('error');
    expect(fs.existsSync(path.join(ctx.logsDir, 'hooks.log'))).toBe(false);
    expect(fs.existsSync(path.join(ctx.logsDir, 'hooks'))).toBe(false);
  });
  it('rotates to hooks.jsonl.1 once the cap is exceeded', () => {
    const ctx = createContext(root);
    fs.mkdirSync(ctx.logsDir, { recursive: true });
    const file = path.join(ctx.logsDir, HOOK_LOG_FILE);
    fs.writeFileSync(file, 'x'.repeat(HOOK_LOG_MAX_BYTES + 1));
    logHook(ctx, 'stop', 'after rotation');
    expect(fs.statSync(`${file}.1`).size).toBe(HOOK_LOG_MAX_BYTES + 1);
    expect(fs.readFileSync(file, 'utf8')).toContain('after rotation');
  });
  it('never throws when the logs dir is unwritable', () => {
    const ctx = { ...createContext(root), logsDir: path.join(root, '.specweave', 'config.json', 'nope') };
    expect(() => logHook(ctx, 'stop', 'x')).not.toThrow();
  });
});
