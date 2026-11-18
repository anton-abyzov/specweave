/**
 * The contract SpecWithCode relies on (1407, AC-10): the app runs
 * `specweave init --quick --adapter claude` (no folder argument) in a project
 * and treats "exit 0 plus a regular .specweave/config.json" as success, then
 * shows a fixed list of files. Every documented init flag stays accepted.
 *
 * Runs the built CLI (needs `npm run build`).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'specweave.js');

let base: string;

function project(name: string): { root: string; env: NodeJS.ProcessEnv } {
  const root = path.join(base, name);
  const home = path.join(base, `${name}-home`);
  for (const d of [root, home]) fs.mkdirSync(d, { recursive: true });
  const tmp = fs.realpathSync.native(os.tmpdir());
  return {
    root,
    env: {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, HOME: home, USERPROFILE: home,
      TMPDIR: tmp, TEMP: tmp, TMP: tmp, NO_COLOR: '1',
      GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'), GIT_CONFIG_NOSYSTEM: '1',
    },
  };
}

function run(cwd: string, env: NodeJS.ProcessEnv, args: string[]): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: 'utf-8', timeout: 120_000 });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

beforeAll(() => {
  base = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'sw-init-app-'));
});

afterAll(() => {
  if (base) fs.rmSync(base, { recursive: true, force: true });
});

describe('specweave init: the SpecWithCode contract', () => {
  it('`init --quick --adapter claude` in a repository exits 0 and writes a regular config', () => {
    const { root, env } = project('app');
    execFileSync('git', ['init', '-q'], { cwd: root, env });
    const r = run(root, env, ['init', '--quick', '--adapter', 'claude']);
    expect(r.status, r.out).toBe(0);
    const configPath = path.join(root, '.specweave', 'config.json');
    expect(fs.lstatSync(configPath).isFile()).toBe(true);
    expect(JSON.parse(fs.readFileSync(configPath, 'utf-8')).adapters.default).toBe('claude');
    // The files the app lists after setup.
    for (const file of ['AGENTS.md', 'CLAUDE.md', 'README.md', '.gitignore', '.gitattributes', '.specweave/memory/MEMORY.md']) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
  });

  it('works the same in a folder without Git', () => {
    const { root, env } = project('app-no-git');
    const r = run(root, env, ['init', '--quick', '--adapter', 'claude']);
    expect(r.status, r.out).toBe(0);
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
  });

  it('accepts every documented flag, ignored ones with any value', () => {
    const { root, env } = project('flags');
    const r = run(root, env, [
      'init', '.', '-q', '--non-interactive', '-a', 'claude', '-t', 'anything', '--tech-stack', 'cobol',
      '-l', 'xx', '--force-refresh', '--full',
    ]);
    expect(r.status, r.out).toBe(0);
    const named = run(base, env, ['init', '-n', 'named-project']);
    expect(named.status, named.out).toBe(0);
    expect(fs.existsSync(path.join(base, 'named-project', '.specweave', 'config.json'))).toBe(true);
    const forced = run(root, env, ['init', '-f']);
    expect(forced.status, forced.out).toBe(0);
  });
});
