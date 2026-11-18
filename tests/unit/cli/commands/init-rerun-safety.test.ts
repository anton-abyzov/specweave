/**
 * `specweave init` is safe to run again and refuses before it writes.
 *
 * Runs the real CLI in scratch projects (needs `npm run build` first):
 * - a re-run keeps every key already in .specweave/config.json;
 * - an unknown --adapter writes nothing;
 * - init never creates a repository, in or outside a Git work tree;
 * - an explicit path to the home directory is refused like `.` is.
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

interface Run { status: number | null; out: string }

function envFor(home: string, tmp: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: home,
    USERPROFILE: home,
    // init refuses to run inside the system temp dir; give the child its own.
    TMPDIR: tmp,
    TEMP: tmp,
    TMP: tmp,
    CI: 'true',
    NO_COLOR: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
    GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
  };
}

/** A scratch home and temp folder beside the projects of one test. */
function scratch(name: string): { root: string; home: string; env: NodeJS.ProcessEnv } {
  const root = path.join(base, name);
  const home = path.join(base, `${name}-home`);
  const tmp = path.join(base, `${name}-tmp`);
  for (const d of [root, home, tmp]) fs.mkdirSync(d, { recursive: true });
  return { root, home, env: envFor(home, tmp) };
}

function init(cwd: string, env: NodeJS.ProcessEnv, args: string[] = ['.']): Run {
  const r = spawnSync(process.execPath, [CLI, 'init', ...args, '--quick'], {
    cwd, env, encoding: 'utf-8', timeout: 120_000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

function git(cwd: string, env: NodeJS.ProcessEnv, args: string[]): string {
  return execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

beforeAll(() => {
  base = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sw-init-rerun-'));
});

afterAll(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

describe('specweave init: a re-run keeps the project config', () => {
  it('keeps every key the project already has', () => {
    const { root, env } = scratch('rerun');
    expect(init(root, env, ['.', '--adapter', 'codex']).status).toBe(0);

    const configPath = path.join(root, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.adapters.default).toBe('codex');
    config.testing.commands = ['npm test'];
    config.limits.activeIncrements = 7;
    config.lsp = { enabled: false };
    config.sync = { enabled: false };
    config.issueTracker = { provider: 'jira', domain: 'example.atlassian.net' };
    config.skills = { enabled: ['glossary'] };
    config.custom = { keep: 'me' };
    config.git = { autoCommitIncrement: true };
    config.workspace = { ...config.workspace, rootRepo: { github: { owner: 'acme', repo: 'root' } } };
    config.multiProject = { enabled: true };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    expect(init(root, env).status).toBe(0);

    const after = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(after.testing.commands).toEqual(['npm test']);
    expect(after.limits.activeIncrements).toBe(7);
    expect(after.lsp).toEqual({ enabled: false });
    expect(after.sync).toEqual({ enabled: false });
    expect(after.issueTracker).toEqual({ provider: 'jira', domain: 'example.atlassian.net' });
    expect(after.skills).toEqual({ enabled: ['glossary'] });
    expect(after.custom).toEqual({ keep: 'me' });
    expect(after.git).toEqual({ autoCommitIncrement: true });
    expect(after.workspace.rootRepo).toEqual({ github: { owner: 'acme', repo: 'root' } });
    // 1.x keys are `specweave update`'s to migrate, not init's to drop.
    expect(after.multiProject).toEqual({ enabled: true });
    // The saved tool stays unless --adapter names another.
    expect(after.adapters.default).toBe('codex');
    // The optional skill the project turned on is still installed.
    expect(fs.existsSync(path.join(root, '.claude', 'skills', 'sw-glossary', 'SKILL.md'))).toBe(true);
  });

  it('takes a new tool when --adapter names one', () => {
    const { root, env } = scratch('retool');
    expect(init(root, env, ['.', '--adapter', 'codex']).status).toBe(0);
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const after = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
    expect(after.adapters.default).toBe('claude');
  });

  it('fills the defaults a half-written config lacks', () => {
    const { root, env } = scratch('partial');
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'kept-name' } }),
    );
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const after = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
    expect(after.project.name).toBe('kept-name');
    expect(after.adapters.default).toBe('claude');
    expect(after.testing.commands).toEqual([]);
    expect(after.planning.deepInterview).toBe('critical');
  });

  it('leaves a config it cannot read as it is', () => {
    const { root, env } = scratch('corrupt');
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    const configPath = path.join(root, '.specweave', 'config.json');
    for (const content of ['{ "version": "2.0", "project": ', '[]']) {
      fs.writeFileSync(configPath, content);
      const run = init(root, env, ['.', '--adapter', 'claude']);
      expect(run.status).toBe(1);
      expect(run.out).toContain('is not valid JSON');
      expect(run.out).not.toMatch(/\n\s+at /);
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(content);
    }
  });

  it('keeps provider "local" and its other keys when the folder has a remote', () => {
    const { root, env } = scratch('local-provider');
    git(root, env, ['init', '-q']);
    git(root, env, ['remote', 'add', 'origin', 'https://github.com/remoteorg/remoterepo.git']);
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const configPath = path.join(root, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // A first run no longer fills the provider from the remote (`sync setup` does).
    expect(config.repository.provider).toBe('local');
    expect(config.sync).toBeUndefined();
    config.repository = { provider: 'local', customKey: 'keepme' };
    delete config.sync;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const after = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(after.repository).toEqual({ provider: 'local', customKey: 'keepme' });
    expect(after.sync).toBeUndefined();
  });

  it('keeps the saved tool when SPECWEAVE_TOOL names another, and does not claim to use it', () => {
    const { root, env } = scratch('env-tool');
    expect(init(root, env, ['.', '--adapter', 'codex']).status).toBe(0);
    const run = init(root, { ...env, SPECWEAVE_TOOL: 'cursor' });
    expect(run.status).toBe(0);
    expect(run.out).not.toContain('Using cursor');
    const after = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
    expect(after.adapters.default).toBe('codex');
  });

  it('still warns about a broken claude command when claude is the saved tool', () => {
    const { root, home, env } = scratch('broken-claude');
    const bin = path.join(home, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    const fake = path.join(bin, process.platform === 'win32' ? 'claude.cmd' : 'claude');
    fs.writeFileSync(fake, process.platform === 'win32' ? '@exit /b 1\r\n' : '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const withBroken = { ...env, PATH: `${bin}${path.delimiter}${env.PATH}` };
    expect(init(root, withBroken, ['.', '--adapter', 'claude']).status).toBe(0);
    const run = init(root, withBroken);
    expect(run.status).toBe(0);
    expect(run.out).toContain('claude command failed its check');
  });

  it('reads a saved tool in any letter case and names one it does not know', () => {
    const { root, env } = scratch('saved-case');
    expect(init(root, env, ['.', '--adapter', 'codex']).status).toBe(0);
    const configPath = path.join(root, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.adapters.default = 'Codex';
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    expect(init(root, env).status).toBe(0);
    expect(JSON.parse(fs.readFileSync(configPath, 'utf-8')).adapters.default).toBe('codex');

    const again = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    again.adapters.default = 'nosucholdtool';
    fs.writeFileSync(configPath, JSON.stringify(again, null, 2));
    const run = init(root, env);
    expect(run.status).toBe(0);
    expect(run.out).toContain('"nosucholdtool"');
  });

  it('keeps lsp: false', () => {
    const { root, env } = scratch('lsp-false');
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const configPath = path.join(root, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.lsp = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    expect(JSON.parse(fs.readFileSync(configPath, 'utf-8')).lsp).toBe(false);
  });
});

describe('specweave init: refuses before it writes', () => {
  it('exits 1 on an unknown --adapter and writes nothing', () => {
    const { root, env } = scratch('bogus');
    const run = init(root, env, ['.', '--adapter', 'nosuchtool']);
    expect(run.status).toBe(1);
    expect(run.out).toContain('nosuchtool');
    expect(run.out).not.toMatch(/\n\s+at .*init\.js/);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it('checks --adapter before --force removes anything', () => {
    const { root, env } = scratch('force-bogus');
    expect(init(root, env, ['.', '--adapter', 'claude']).status).toBe(0);
    const spec = path.join(root, '.specweave', 'increments', '0001-keep', 'spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Keep me\n');

    expect(init(root, env, ['.', '--force', '--adapter', 'nosuchtool']).status).toBe(1);

    expect(fs.readFileSync(spec, 'utf-8')).toBe('# Keep me\n');
    expect(fs.readdirSync(root).filter((n) => n.startsWith('.specweave.backup-'))).toEqual([]);
  });

  it('accepts a tool name in any letter case', () => {
    const { root, env } = scratch('casing');
    expect(init(root, env, ['.', '--adapter', 'Codex']).status).toBe(0);
    const config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
    expect(config.adapters.default).toBe('codex');
  });

  it('refuses an explicit path to the home directory', () => {
    const { root, home, env } = scratch('homepath');
    const run = init(root, env, [home]);
    expect(run.status).toBe(1);
    expect(fs.existsSync(path.join(home, '.specweave'))).toBe(false);
    expect(fs.existsSync(path.join(home, '.git'))).toBe(false);
  });
});

describe('specweave init: Git', () => {
  it('creates no nested repository inside a Git work tree', () => {
    const { root, env } = scratch('mono');
    git(root, env, ['init', '-q']);
    const pkg = path.join(root, 'packages', 'app');
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, 'index.js'), 'module.exports = 1;\n');

    expect(init(pkg, env, ['.', '--adapter', 'claude']).status).toBe(0);

    expect(fs.existsSync(path.join(pkg, '.git'))).toBe(false);
    expect(fs.realpathSync(git(pkg, env, ['rev-parse', '--show-toplevel']))).toBe(fs.realpathSync(root));
    // Nothing was committed to the repository that was already there.
    expect(git(root, env, ['rev-list', '--all', '--count'])).toBe('0');
  });

  it('a GIT_DIR leaked from the caller changes nothing', () => {
    const { root, env } = scratch('leaked-gitdir');
    const other = path.join(base, 'leaked-gitdir-other');
    fs.mkdirSync(other, { recursive: true });
    git(other, env, ['init', '-q']);
    const run = init(root, { ...env, GIT_DIR: path.join(other, '.git') }, ['.', '--adapter', 'claude']);
    expect(run.status).toBe(0);
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
    expect(git(other, env, ['rev-list', '--all', '--count'])).toBe('0');
  });

  it('sets up a project under a home folder that is itself a repository', () => {
    const { home, env } = scratch('home-repo');
    git(home, env, ['init', '-q']);
    const proj = path.join(home, 'proj');
    fs.mkdirSync(proj, { recursive: true });
    expect(init(proj, env, ['.', '--adapter', 'claude']).status).toBe(0);
    expect(fs.existsSync(path.join(proj, '.specweave', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(proj, '.git'))).toBe(false);
  });
});
