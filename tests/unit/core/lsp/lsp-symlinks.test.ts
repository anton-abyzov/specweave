import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('child_process', async importOriginal => ({
  ...await importOriginal<typeof import('child_process')>(),
  execSync: vi.fn(() => Buffer.from('/mock/server')),
}));
import { detectLSPServers } from '../../../../src/core/lsp/lsp-client.js';

describe('LSP project detection symlink boundaries', () => {
  let temp: string;
  let root: string;
  let outside: string;
  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-links-'));
    root = path.join(temp, 'project');
    outside = path.join(temp, 'outside');
    fs.mkdirSync(root);
    fs.mkdirSync(outside);
  });
  afterEach(() => fs.rmSync(temp, { recursive: true, force: true }));

  it('skips symlinked subdirectories with project markers', async () => {
    fs.writeFileSync(path.join(outside, 'App.csproj'), '');
    fs.symlinkSync(outside, path.join(root, 'escape'), 'dir');
    expect(await detectLSPServers(root)).toEqual([]);
  });

  it.each(['tsconfig.json', 'App.csproj'])('skips symlinked marker %s', async name => {
    fs.writeFileSync(path.join(outside, name), '{}');
    fs.symlinkSync(path.join(outside, name), path.join(root, name), 'file');
    expect(await detectLSPServers(root)).toEqual([]);
  });

  it('skips symlinked markers inside a real subdirectory', async () => {
    fs.writeFileSync(path.join(outside, 'App.csproj'), '');
    fs.mkdirSync(path.join(root, 'src'));
    fs.symlinkSync(path.join(outside, 'App.csproj'), path.join(root, 'src/App.csproj'), 'file');
    expect(await detectLSPServers(root)).toEqual([]);
  });

  it.each(['tsconfig.json', 'App.csproj', 'src/App.csproj', 'App.xcodeproj'])('detects real marker %s', async name => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    if (name.endsWith('.xcodeproj')) fs.mkdirSync(path.join(root, name));
    else fs.writeFileSync(path.join(root, name), '{}');
    expect((await detectLSPServers(root)).length).toBeGreaterThan(0);
  });
});
