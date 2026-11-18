/**
 * create-increment refuses a folder that was never set up (1396 AC-04).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const MESSAGE =
  'This folder is not set up for SpecWeave. Run `specweave init` here first. ' +
  "In SpecWithCode, press Set up SpecWeave on the project's Board tab.";

function listTree(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      out.push(path.relative(dir, full));
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(dir);
  return out.sort();
}

describe('create-increment without .specweave/config.json', () => {
  let tempDir: string;
  let cwd: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // realpath: macOS tmpdir is a symlink, and the root finder compares real paths.
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-no-config-')));
    cwd = process.cwd();
    for (const key of ['SPECWEAVE_WORKSPACE', 'SPECWEAVE_PROJECT_ROOT']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function load() {
    return import('../../../../src/cli/commands/create-increment.js');
  }

  it('exports the exact message', async () => {
    const { NOT_SET_UP_MESSAGE } = await load();
    expect(NOT_SET_UP_MESSAGE).toBe(MESSAGE);
  });

  it('refuses a plain folder (current directory) and writes nothing', async () => {
    const { createIncrementCommand, NotSetUpError } = await load();
    const folder = path.join(tempDir, 'plain');
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, 'index.html'), '<h1>hi</h1>');
    process.chdir(folder);

    const err = await createIncrementCommand({ title: 'Simple website', withPlan: true, commit: false }).catch(e => e);
    expect(err).toBeInstanceOf(NotSetUpError);
    expect(err.message).toBe(MESSAGE);
    expect(listTree(folder)).toEqual(['index.html']);
  });

  it('refuses a folder holding only .specweave/increments (the half state)', async () => {
    const { createIncrementCommand } = await load();
    const folder = path.join(tempDir, 'half');
    fs.mkdirSync(path.join(folder, '.specweave', 'increments', '0001-old'), { recursive: true });
    fs.writeFileSync(path.join(folder, '.specweave', 'increments', '0001-old', 'spec.md'), '# Old');
    const before = listTree(folder);
    process.chdir(folder);

    await expect(createIncrementCommand({ title: 'Another' })).rejects.toThrow(MESSAGE);
    expect(listTree(folder)).toEqual(before);
  });

  it('refuses a --project-root without a config and prints JSON when asked', async () => {
    const { createIncrementCommand } = await load();
    const folder = path.join(tempDir, 'root-flag');
    fs.mkdirSync(folder);

    await expect(createIncrementCommand({ title: 'X', projectRoot: folder, json: true })).rejects.toThrow(MESSAGE);
    expect(listTree(folder)).toEqual([]);
    const printed = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(printed).toMatchObject({ success: false, code: 'not-set-up', error: MESSAGE });
  });

  it('works in a folder with a config', async () => {
    const { createIncrementCommand } = await load();
    const folder = path.join(tempDir, 'ready');
    fs.mkdirSync(path.join(folder, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(folder, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'ready' } }));
    process.chdir(folder);

    await createIncrementCommand({ title: 'Login form', commit: false });
    const created = fs.readdirSync(path.join(folder, '.specweave', 'increments'));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatch(/^0001-login-form$/);
  });

  it('works from a subfolder of a set-up project, and writes at the project root', async () => {
    const { createIncrementCommand } = await load();
    const folder = path.join(tempDir, 'nested');
    fs.mkdirSync(path.join(folder, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(folder, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'nested' } }));
    fs.mkdirSync(path.join(folder, 'src', 'lib'), { recursive: true });
    process.chdir(path.join(folder, 'src', 'lib'));

    await createIncrementCommand({ title: 'Deep', commit: false });
    expect(fs.readdirSync(path.join(folder, '.specweave', 'increments'))).toHaveLength(1);
    expect(fs.existsSync(path.join(folder, 'src', 'lib', '.specweave'))).toBe(false);
  });

  it("works inside an umbrella's member repository and plans at the umbrella", async () => {
    const { createIncrementCommand } = await load();
    const umbrella = path.join(tempDir, 'umb');
    const member = path.join(umbrella, 'repositories', 'acme', 'app');
    fs.mkdirSync(path.join(umbrella, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(umbrella, '.specweave', 'config.json'),
      JSON.stringify({ project: { name: 'umb' }, umbrella: { enabled: true } }),
    );
    fs.mkdirSync(path.join(member, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(member, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'app' } }));
    process.chdir(member);

    await createIncrementCommand({ title: 'Member work', commit: false });
    expect(fs.readdirSync(path.join(umbrella, '.specweave', 'increments'))).toHaveLength(1);
    expect(fs.existsSync(path.join(member, '.specweave', 'increments'))).toBe(false);
  });

  it('the CLI exits 1 with the message and leaves a plain folder as it was', () => {
    const bin = path.resolve(cwd, 'bin/specweave.js');
    if (!fs.existsSync(path.resolve(cwd, 'dist/src/cli/commands/create-increment.js'))) {
      throw new Error('dist/ is missing: run `npm run build` before this test');
    }
    const folder = path.join(tempDir, 'cli-plain');
    fs.mkdirSync(folder);
    const env = { ...process.env };
    delete env.SPECWEAVE_WORKSPACE;
    const run = spawnSync(
      process.execPath,
      [bin, 'create-increment', 'Simple website', '--with-plan', '--no-commit', '--json'],
      { cwd: folder, encoding: 'utf8', env },
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain(MESSAGE);
    expect(JSON.parse(run.stdout.trim().split('\n').pop()!)).toMatchObject({ success: false, code: 'not-set-up' });
    expect(listTree(folder)).toEqual([]);
  });

  it('the CLI refuses a --project-root without a config with the same message', () => {
    const bin = path.resolve(cwd, 'bin/specweave.js');
    const folder = path.join(tempDir, 'cli-root-flag');
    const elsewhere = path.join(tempDir, 'cli-elsewhere');
    fs.mkdirSync(folder);
    fs.mkdirSync(elsewhere);
    const env = { ...process.env };
    delete env.SPECWEAVE_WORKSPACE;
    const run = spawnSync(
      process.execPath,
      [bin, 'create-increment', 'Simple website', '--project-root', folder, '--no-commit'],
      { cwd: elsewhere, encoding: 'utf8', env },
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain(MESSAGE);
    expect(run.stderr).not.toContain('is not a valid SpecWeave project');
    expect(listTree(folder)).toEqual([]);
    expect(listTree(elsewhere)).toEqual([]);
  });
});
