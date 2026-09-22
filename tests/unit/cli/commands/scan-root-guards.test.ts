import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>();
  const mocked = {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
    readdirSync: vi.fn(actual.readdirSync),
  };
  return { ...mocked, default: mocked };
});
const manager = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/core/lsp/lsp-manager.js', () => ({
  getGlobalLSPManager: manager,
  shutdownGlobalLSPManager: vi.fn(),
}));
import { createLspCommand } from '../../../../src/cli/commands/lsp.js';
import { dashboardCommand } from '../../../../src/cli/commands/dashboard.js';

describe('CLI scan root guards', () => {
  let root: string;
  let oldExit: typeof process.exitCode;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-root-'));
    fs.mkdirSync(path.join(root, '.specweave'));
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    oldExit = process.exitCode;
    process.exitCode = undefined;
    manager.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = oldExit;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([
    ['refs', 'missing.ts', 'foo'], ['def', 'missing.ts', 'foo'],
    ['hover', 'missing.ts', 'foo'], ['symbols', 'missing.ts'],
    ['search', 'foo'], ['warmup'], ['status'], ['setup', '--dry-run'],
  ])('refuses LSP %s before reading directory contents', async (...args) => {
    const scan = vi.spyOn(fs, 'readdirSync');
    await createLspCommand().parseAsync(args, { from: 'user' });
    expect(process.exitCode).toBe(1);
    expect(manager).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('.specweave/config.json'));
  });

  it('keeps rejected quiet warmup silent', async () => {
    await createLspCommand().parseAsync(['warmup', '--quiet'], { from: 'user' });
    expect(process.exitCode).toBe(1);
    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(manager).not.toHaveBeenCalled();
  });

  it('scans nearest project root when setup starts from a subdirectory', async () => {
    fs.writeFileSync(path.join(root, '.specweave/config.json'), '{}');
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'index.ts'), 'export {};');
    vi.mocked(process.cwd).mockReturnValue(path.join(root, 'src'));
    const scan = vi.spyOn(fs, 'readdirSync');
    await createLspCommand().parseAsync(['setup', '--dry-run', '--min-files', '1'], { from: 'user' });
    expect(process.exitCode).not.toBe(1);
    expect(scan).toHaveBeenCalledWith(root, { withFileTypes: true });
    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).toContain('TypeScript');
  });

  it('refuses dashboard without reading lock or opening network/server', async () => {
    const read = vi.spyOn(fs, 'readFileSync');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await dashboardCommand({ browser: false });
    expect(process.exitCode).toBe(1);
    expect(read).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('.specweave/config.json'));
  });

  it('registers effective project root with existing dashboard from nested cwd', async () => {
    fs.writeFileSync(path.join(root, '.specweave/config.json'), '{}');
    fs.mkdirSync(path.join(root, 'src'));
    vi.mocked(process.cwd).mockReturnValue(path.join(root, 'src'));
    const actual = await vi.importActual<typeof import('fs')>('fs');
    const exists = actual.existsSync;
    const read = actual.readFileSync;
    const lock = path.join(process.env.HOME || '', '.specweave-dashboard.json');
    vi.spyOn(fs, 'existsSync').mockImplementation(p => p === lock || exists(p));
    vi.spyOn(fs, 'readFileSync').mockImplementation(((p: string, ...args: any[]) =>
      p === lock ? JSON.stringify({ pid: process.pid, port: 3456 }) : read(p, ...args)) as any);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await dashboardCommand({ browser: false });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3456/api/projects', expect.objectContaining({
      body: JSON.stringify({ path: root }),
    }));
    expect(process.exitCode).not.toBe(1);
  });
});
