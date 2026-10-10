import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  applyProjectDefault, autocompactCommand, autocompactStatus, codexCompactLimit, effectiveWindow, parseWindow,
} from '../../../../src/cli/commands/autocompact.js';

let home: string;
let proj: string;

const userFile = () => path.join(home, '.claude', 'settings.json');
const projectFile = () => path.join(proj, '.claude', 'settings.json');
const write = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

beforeEach(() => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-autocompact-'));
  home = path.join(base, 'home');
  proj = path.join(base, 'proj');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(proj, { recursive: true });
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(path.dirname(home), { recursive: true, force: true });
});

describe('parseWindow', () => {
  it.each([['400k', 400000], ['400000', 400000], ['1M', 1000000], ['250_000', 250000], ['0.5m', 500000]])('%s → %d', (v, n) => {
    expect(parseWindow(v)).toBe(n);
  });
  it.each(['99k', '1.5M', 'auto', 'big', ''])('rejects %s', (v) => {
    expect(parseWindow(v)).toBeUndefined();
  });
});

describe('effectiveWindow', () => {
  it('is Claude Code\'s own window when nothing is set', () => {
    expect(effectiveWindow(home, proj, {})).toEqual({ source: 'auto', byModel: {} });
  });

  it('lets a higher settings file replace the window and the per-model values below it', () => {
    write(userFile(), { autoCompactWindow: 300000, modelSettings: { 'claude-opus-5-5': { autoCompactWindow: 600000 } } });
    expect(effectiveWindow(home, proj, {})).toEqual({ window: 300000, source: 'user', byModel: { 'claude-opus-5-5': 600000 } });
    write(projectFile(), { autoCompactWindow: 400000 });
    expect(effectiveWindow(home, proj, {})).toEqual({ window: 400000, source: 'project', byModel: {} });
  });

  it('keeps lower per-model values when a higher file only sets per-model values', () => {
    write(userFile(), { modelSettings: { a: { autoCompactWindow: 'auto' } } });
    write(projectFile(), { modelSettings: { b: { autoCompactWindow: 500000 } } });
    expect(effectiveWindow(home, proj, {}).byModel).toEqual({ a: 'auto', b: 500000 });
  });

  it('gives the environment variable the last word', () => {
    write(projectFile(), { autoCompactWindow: 400000 });
    expect(effectiveWindow(home, proj, { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '700000' })).toEqual({ window: 700000, source: 'env', byModel: {} });
  });
});

describe('autocompact on | off', () => {
  it('sets 400K in the user settings and keeps everything else there', async () => {
    write(userFile(), { theme: 'dark', hooks: { Stop: [] } });
    expect(await autocompactCommand('on', { home, cwd: proj, env: {} })).toBe(0);
    expect(read(userFile())).toEqual({ theme: 'dark', hooks: { Stop: [] }, autoCompactWindow: 400000 });
    expect(await autocompactCommand('off', { home, cwd: proj, env: {} })).toBe(0);
    expect(read(userFile())).toEqual({ theme: 'dark', hooks: { Stop: [] } });
  });

  it('writes the project file with --project and a custom window with --at', async () => {
    expect(await autocompactCommand('on', { home, cwd: proj, project: true, at: '600k', env: {} })).toBe(0);
    expect(read(projectFile())).toEqual({ autoCompactWindow: 600000 });
    expect(fs.existsSync(userFile())).toBe(false);
  });

  it('refuses an out-of-range window and leaves malformed settings alone', async () => {
    expect(await autocompactCommand('on', { home, cwd: proj, at: '2M', env: {} })).toBe(2);
    expect(fs.existsSync(userFile())).toBe(false);
    write(userFile(), '{ not json');
    expect(await autocompactCommand('on', { home, cwd: proj, env: {} })).toBe(1);
    expect(fs.readFileSync(userFile(), 'utf8')).toBe('{ not json');
  });
});

describe('applyProjectDefault', () => {
  it('adds 400K once and never overrides a window already chosen', () => {
    expect(applyProjectDefault(proj)).toMatch(/400K/);
    expect(read(projectFile())).toEqual({ autoCompactWindow: 400000 });
    write(projectFile(), { autoCompactWindow: 800000, permissions: {} });
    expect(applyProjectDefault(proj)).toBeUndefined();
    expect(read(projectFile())).toEqual({ autoCompactWindow: 800000, permissions: {} });
  });
});

describe('status', () => {
  it('names the source and the Codex cap', () => {
    write(userFile(), { autoCompactWindow: 400000 });
    write(path.join(home, '.codex', 'config.toml'), 'model = "gpt"\nmodel_auto_compact_token_limit = 250000\n[profiles.x]\n');
    const lines = autocompactStatus(home, proj, {});
    expect(lines[0]).toContain('400K');
    expect(lines[0]).toContain(userFile());
    expect(lines.at(-1)).toContain('250K');
    expect(codexCompactLimit(home)).toBe(250000);
  });

  it('ignores a Codex limit inside a profile table', () => {
    write(path.join(home, '.codex', 'config.toml'), '[profiles.x]\nmodel_auto_compact_token_limit = 250000\n');
    expect(codexCompactLimit(home)).toBeUndefined();
  });
});
