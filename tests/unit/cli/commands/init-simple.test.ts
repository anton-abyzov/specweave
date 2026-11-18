/**
 * `specweave init` (1407): one path, no questions, never runs Git, safe to
 * run again. Runs the built CLI in scratch folders (needs `npm run build`).
 *
 * AC-06 no prompts, AC-07 a second run changes no file, AC-08 no Git,
 * AC-09 a re-run restores deleted files, AC-11 footprint, AC-12 output size,
 * AC-15 refusals.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'specweave.js');
const isWindows = process.platform === 'win32';

let base: string;

interface Run { status: number | null; out: string; lines: string[] }

function envFor(home: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    HOME: home,
    USERPROFILE: home,
    // The real temp folder, so init's walk up for parent projects stops there.
    TMPDIR: fs.realpathSync.native(os.tmpdir()),
    TEMP: fs.realpathSync.native(os.tmpdir()),
    TMP: fs.realpathSync.native(os.tmpdir()),
    CI: 'true',
    NO_COLOR: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
    GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    ...extra,
  };
}

/** A project folder and a home folder of its own. */
function scratch(name: string): { root: string; home: string; env: NodeJS.ProcessEnv } {
  const root = path.join(base, name);
  const home = path.join(base, `${name}-home`);
  for (const d of [root, home]) fs.mkdirSync(d, { recursive: true });
  return { root, home, env: envFor(home) };
}

function init(cwd: string, env: NodeJS.ProcessEnv, args: string[] = []): Run {
  const r = spawnSync(process.execPath, [CLI, 'init', ...args], { cwd, env, encoding: 'utf-8', timeout: 120_000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { status: r.status, out, lines: out.split('\n').filter((l) => l.trim() !== '') };
}

function git(cwd: string, env: NodeJS.ProcessEnv, args: string[]): string {
  return execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Every file under `dir` (outside `.git`) with its hash. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string, prefix: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (rel === '.git') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel);
      else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  };
  if (fs.existsSync(dir)) walk(dir, '');
  return out;
}

const config = (root: string): Record<string, any> =>
  JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));

beforeAll(() => {
  if (!fs.existsSync(path.join(REPO_ROOT, 'dist', 'src', 'cli', 'commands', 'init.js'))) {
    throw new Error('dist/ is missing: run `npm run build` before this test');
  }
  base = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'sw-init-simple-'));
});

afterAll(() => {
  if (base) fs.rmSync(base, { recursive: true, force: true });
});

describe('AC-06: init asks nothing', () => {
  it('has no prompt library or readline in the command', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'cli', 'commands', 'init.ts'), 'utf-8');
    expect(source).not.toMatch(/@inquirer\/prompts|from 'readline'|node:readline/);
  });

  it('finishes with no CI flag, no --quick and stdin left open', () => {
    const { root, home } = scratch('no-flags');
    const env = envFor(home);
    delete env.CI;
    const r = spawnSync(process.execPath, [CLI, 'init'], { cwd: root, env, encoding: 'utf-8', timeout: 60_000, input: '' });
    expect(r.status).toBe(0);
    expect(fs.existsSync(path.join(root, '.specweave', 'config.json'))).toBe(true);
  });
});

describe('AC-07: a second run right after the first changes no file', () => {
  for (const tool of ['claude', 'codex', 'cursor']) {
    it(`for ${tool}`, () => {
      const { root, env } = scratch(`twice-${tool}`);
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'vitest' } }));
      expect(init(root, env, ['--adapter', tool]).status).toBe(0);
      const first = tree(root);
      const config = path.join(root, '.specweave', 'config.json');
      const configTime = fs.statSync(config).mtimeMs;
      const second = init(root, env);
      expect(second.status).toBe(0);
      expect(second.out).toContain('Nothing to change');
      expect(tree(root)).toEqual(first);
      // Unchanged content is not rewritten, so file watchers see nothing.
      expect(fs.statSync(config).mtimeMs).toBe(configTime);
    });
  }
});

describe('AC-08: init never runs Git', () => {
  for (const tool of ['claude', 'codex', 'cursor']) {
    it.skipIf(isWindows)(`never starts git for ${tool}, creates no .git and says how to add one`, () => {
      const { root, home, env } = scratch(`no-git-${tool}`);
      const bin = path.join(home, 'bin');
      const marker = path.join(home, 'git-was-run');
      fs.mkdirSync(bin, { recursive: true });
      fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh\necho "$@" >> "${marker}"\nexit 1\n`, { mode: 0o755 });
      const run = init(root, { ...env, PATH: `${bin}${path.delimiter}${env.PATH}` }, ['--adapter', tool]);
      expect(run.status, run.out).toBe(0);
      expect(fs.existsSync(marker) ? fs.readFileSync(marker, 'utf-8') : '').toBe('');
      expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
      expect(run.out).toContain('No Git repository here');
    });
  }

  it('adds no commit and stages nothing in a repository', () => {
    const { root, env } = scratch('in-repo');
    git(root, env, ['init', '-q']);
    fs.writeFileSync(path.join(root, 'index.js'), 'module.exports = 1;\n');
    git(root, env, ['add', 'index.js']);
    git(root, env, ['commit', '-qm', 'first']);
    expect(init(root, env).status).toBe(0);
    expect(git(root, env, ['rev-list', '--count', 'HEAD'])).toBe('1');
    expect(git(root, env, ['diff', '--cached', '--name-only'])).toBe('');
  });
});

describe('AC-09: a re-run restores what is missing', () => {
  it('brings back AGENTS.md, a skill folder and .gitattributes', () => {
    const { root, env } = scratch('restore');
    expect(init(root, env).status).toBe(0);
    const skill = fs.readdirSync(path.join(root, '.claude', 'skills')).find((n) => n.startsWith('sw-'))!;
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf-8');
    fs.rmSync(path.join(root, 'AGENTS.md'));
    fs.rmSync(path.join(root, '.claude', 'skills', skill), { recursive: true });
    fs.rmSync(path.join(root, '.gitattributes'));

    expect(init(root, env).status).toBe(0);
    expect(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf-8')).toBe(agents);
    expect(fs.existsSync(path.join(root, '.claude', 'skills', skill, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.gitattributes'))).toBe(true);
  });

  it('keeps the memory index a person wrote', () => {
    const { root, env } = scratch('memory');
    expect(init(root, env).status).toBe(0);
    const index = path.join(root, '.specweave', 'memory', 'MEMORY.md');
    fs.writeFileSync(index, '# mine\n- [a](a.md)\n');
    expect(init(root, env).status).toBe(0);
    expect(fs.readFileSync(index, 'utf-8')).toBe('# mine\n- [a](a.md)\n');
  });
});

describe('AC-11: what init writes', () => {
  it('writes no sync key, no repositories/ and nothing in the home folder', () => {
    const { root, home, env } = scratch('footprint');
    git(root, env, ['init', '-q']);
    git(root, env, ['remote', 'add', 'origin', 'https://github.com/someorg/somerepo.git']);
    // A Claude plugin cache with a skill in it: init must not copy it anywhere.
    const cached = path.join(home, '.claude', 'plugins', 'cache', 'claude-plugins-official', 'demo', '1.0.0', 'skills', 'demo-skill');
    fs.mkdirSync(cached, { recursive: true });
    fs.writeFileSync(path.join(cached, 'SKILL.md'), '---\nname: demo-skill\n---\nx\n');
    const homeBefore = tree(home);

    expect(init(root, env, ['--adapter', 'codex']).status).toBe(0);

    const written = Object.keys(tree(root));
    expect(written.some((f) => f.includes('demo-skill'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'repositories'))).toBe(false);
    const cfg = config(root);
    expect(cfg.sync).toBeUndefined();
    expect(cfg.repository).toEqual({ provider: 'local' });
    expect(tree(home)).toEqual(homeBefore);
    const allowed = [/^\.specweave\//, /^\.claude\/skills\//, /^\.agents\/skills\//, /^(AGENTS|CLAUDE|README)\.md$/, /^\.git(ignore|attributes)$/, /^\.codex\/README\.md$/];
    expect(written.filter((f) => !allowed.some((re) => re.test(f)))).toEqual([]);
  });

  it('gives a new .gitignore only SpecWeave lines', () => {
    const { root, env } = scratch('gitignore');
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"x","dependencies":{"prisma":"5"}}');
    fs.writeFileSync(path.join(root, 'Cargo.toml'), '[package]\nname = "x"\n');
    expect(init(root, env).status).toBe(0);
    const rules = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8').split('\n').filter((l) => l && !l.startsWith('#'));
    for (const rule of rules) expect(rule, rule).toMatch(/specweave|claude|handoff|vskill\.lock|plugins|worktrees/i);
    for (const notOurs of ['node_modules/', 'Cargo.lock', 'go.sum', 'prisma/migrations/*/migration.sql', 'plugins/']) {
      expect(rules).not.toContain(notOurs);
    }
  });

  it('keeps the existing .gitignore lines and adds only what is missing', () => {
    const { root, env } = scratch('gitignore-existing');
    fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\nplugins/\n');
    expect(init(root, env).status).toBe(0);
    const text = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
    expect(text.startsWith('node_modules/\nplugins/\n')).toBe(true);
    // The old unanchored rule already covers the root one.
    expect(text.split('\n')).not.toContain('/plugins/');
    expect(fs.existsSync(path.join(root, '.gitignore.backup'))).toBe(false);
  });

  it('registers checkouts already in the folder and keeps hand-edited entries', () => {
    const { root, env } = scratch('workspace');
    for (const repo of ['api', 'web']) {
      const dir = path.join(root, 'repositories', 'acme', repo);
      fs.mkdirSync(dir, { recursive: true });
      git(dir, env, ['init', '-q']);
    }
    expect(init(root, env).status).toBe(0);
    const first = config(root);
    expect(first.workspace.repos.map((r: { path: string }) => r.path).sort()).toEqual(['repositories/acme/api', 'repositories/acme/web']);

    first.workspace.rootRepo = { github: { owner: 'acme', repo: 'umbrella' } };
    first.workspace.repos[0].prefix = 'XYZ';
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify(first, null, 2));
    const extra = path.join(root, 'repositories', 'acme', 'docs');
    fs.mkdirSync(extra, { recursive: true });
    git(extra, env, ['init', '-q']);

    expect(init(root, env).status).toBe(0);
    const after = config(root);
    expect(after.workspace.rootRepo).toEqual({ github: { owner: 'acme', repo: 'umbrella' } });
    expect(after.workspace.repos[0].prefix).toBe('XYZ');
    expect(after.workspace.repos.map((r: { path: string }) => r.path)).toContain('repositories/acme/docs');
  });
});

describe('AC-12: output', () => {
  for (const tool of ['claude', 'codex', 'gemini']) {
    it(`is 12 lines or fewer for ${tool}, first run and re-run`, () => {
      const { root, env } = scratch(`lines-${tool}`);
      const first = init(root, env, ['--adapter', tool]);
      expect(first.status).toBe(0);
      expect(first.lines.length, first.out).toBeLessThanOrEqual(12);
      const again = init(root, env);
      expect(again.lines.length, again.out).toBeLessThanOrEqual(12);
    });
  }
});

describe('AC-15: refusals write nothing', () => {
  function refused(cwd: string, env: NodeJS.ProcessEnv, args: string[] = [], watch = cwd): Run {
    const before = tree(watch);
    const run = init(cwd, env, args);
    expect(run.status, run.out).toBe(1);
    expect(run.lines.length, run.out).toBe(1);
    expect(tree(watch)).toEqual(before);
    return run;
  }

  it('refuses the home folder', () => {
    const { home, env } = scratch('home');
    expect(refused(home, env).out).toContain('home folder');
  });

  it('refuses the temp folder itself but not a folder inside it', () => {
    const { root, home } = scratch('tmproot');
    const env = envFor(home, { TMPDIR: root, TEMP: root, TMP: root });
    expect(refused(root, env).out).toContain('temp folder');
    const inside = fs.mkdtempSync(path.join(root, 'proj-'));
    expect(init(inside, env).status).toBe(0);
  });

  it('refuses a folder inside another SpecWeave project', () => {
    const { root, env } = scratch('outer');
    expect(init(root, env).status).toBe(0);
    const inner = path.join(root, 'packages', 'app');
    fs.mkdirSync(inner, { recursive: true });
    expect(refused(inner, env, [], root).out).toContain(root);
  });

  it('ignores and keeps an ancestor .specweave without a config', () => {
    const { root, env } = scratch('stale-parent');
    fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
    const child = path.join(root, 'child');
    fs.mkdirSync(child);
    expect(init(child, env).status).toBe(0);
    expect(fs.existsSync(path.join(root, '.specweave', 'state'))).toBe(true);
  });

  it('refuses a linked worktree whose main checkout keeps .specweave out of Git', () => {
    const { root, env } = scratch('wt-main');
    git(root, env, ['init', '-q']);
    fs.writeFileSync(path.join(root, '.gitignore'), '.specweave/\n');
    git(root, env, ['add', '.gitignore']);
    git(root, env, ['commit', '-qm', 'first']);
    expect(init(root, env).status).toBe(0);
    const wt = path.join(base, 'wt-linked');
    git(root, env, ['worktree', 'add', '-q', wt]);
    expect(fs.existsSync(path.join(wt, '.specweave'))).toBe(false);
    expect(refused(wt, env).out).toContain(fs.realpathSync.native(root));
  });

  it('refuses a linked worktree of a checkout with no SpecWeave project, naming the checkout', () => {
    const { root, env } = scratch('wt-plain');
    git(root, env, ['init', '-q']);
    fs.writeFileSync(path.join(root, 'a.txt'), 'a\n');
    git(root, env, ['add', 'a.txt']);
    git(root, env, ['commit', '-qm', 'first']);
    const wt = path.join(base, 'wt-plain-linked');
    git(root, env, ['worktree', 'add', '-q', wt]);
    expect(refused(wt, env).out).toContain('linked worktree');
  });

  it('allows a re-run in a linked worktree that tracks its own .specweave', () => {
    const { root, env } = scratch('wt-tracked');
    git(root, env, ['init', '-q']);
    expect(init(root, env).status).toBe(0);
    git(root, env, ['add', '-A']);
    git(root, env, ['commit', '-qm', 'specweave']);
    const wt = path.join(base, 'wt-tracked-linked');
    git(root, env, ['worktree', 'add', '-q', wt]);
    const r = init(wt, env);
    expect(r.status, r.out).toBe(0);
    // The saved project name wins over the worktree's folder name: nothing tracked changes.
    expect(git(wt, env, ['status', '--porcelain'])).toBe('');
    expect(fs.readFileSync(path.join(wt, 'AGENTS.md'), 'utf-8')).toContain('# wt-tracked');
    expect(fs.readFileSync(path.join(wt, 'AGENTS.md'), 'utf-8')).not.toContain('wt-tracked-linked');
  });

  it.skipIf(isWindows)('refuses a symlinked config.json, and --force starts over', () => {
    const { root, env } = scratch('symlink');
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    const real = path.join(base, 'symlink-real.json');
    fs.writeFileSync(real, '{"version":"2.0"}');
    fs.symlinkSync(real, path.join(root, '.specweave', 'config.json'));
    expect(refused(root, env).out).toContain('symlink');
    expect(init(root, env, ['--force']).status).toBe(0);
    expect(fs.lstatSync(path.join(root, '.specweave', 'config.json')).isSymbolicLink()).toBe(false);
    expect(fs.readFileSync(real, 'utf-8')).toBe('{"version":"2.0"}');
  });

  it('refuses a config that is not a JSON object, and --force keeps it in the backup', () => {
    const { root, env } = scratch('broken');
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '[]');
    expect(refused(root, env).out).toContain('not a valid JSON object');
    const run = init(root, env, ['--force']);
    expect(run.status).toBe(0);
    const backup = fs.readdirSync(root).find((n) => n.startsWith('.specweave.backup-'))!;
    expect(fs.readFileSync(path.join(root, backup, 'config.json'), 'utf-8')).toBe('[]');
    expect(config(root).version).toBe('2.0');
  });
});
