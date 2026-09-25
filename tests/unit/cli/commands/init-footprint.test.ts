/**
 * What `specweave init` writes (3.0, decision D6): only what the user needs.
 *
 * Runs the real CLI in a scratch project with HOME pointed at a scratch home,
 * then checks the project for the skills in both tool folders and the memory
 * index, and checks that nothing else crept back in: no living-docs scaffold,
 * no git hook unless --git-hooks, no TDD or coverage defaults, no lockfile in
 * .gitignore, no project agent-teams env, and nothing written to the home
 * directory (~/.claude/settings.json, shell rc files, ~/.specweave).
 *
 * Needs `npm run build` first (CI builds before unit tests).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SPECWEAVE_SKILLS, toProjectSkill } from '../../../../src/core/skills/project-skills.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'specweave.js');
const BUILT_INIT = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'commands', 'init.js');

let base: string;

/** Run `specweave init . --quick [...extra]` in a fresh project; returns its path and home. */
function runInit(name: string, extra: string[] = []): { proj: string; home: string } {
  const proj = path.join(base, name);
  const home = path.join(base, `${name}-home`);
  const tmp = path.join(base, `${name}-tmp`);
  for (const d of [proj, home, tmp]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(proj, 'package.json'), JSON.stringify({ name, scripts: { test: 'echo ok' } }));
  const env: NodeJS.ProcessEnv = {
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
  };
  execFileSync(process.execPath, [CLI, 'init', '.', '--quick', ...extra], {
    cwd: proj, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
  });
  return { proj, home };
}

function listFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (rel === '.git') continue;
      out.push(...listFiles(path.join(dir, e.name), rel));
    } else out.push(rel);
  }
  return out.sort();
}

beforeAll(() => {
  if (!fs.existsSync(BUILT_INIT)) throw new Error('dist/ is missing: run `npm run build` before this test');
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-init-footprint-'));
});

afterAll(() => {
  if (base) fs.rmSync(base, { recursive: true, force: true });
});

describe('specweave init footprint', () => {
  let proj: string;
  let home: string;
  let files: string[];

  beforeAll(() => {
    ({ proj, home } = runInit('plain'));
    files = listFiles(proj);
  }, 180_000);

  it('installs the 11 skills as sw-<name> in .claude/skills and .agents/skills, from the plugin source', () => {
    for (const base of ['.claude/skills', '.agents/skills']) {
      const dirs = fs.readdirSync(path.join(proj, base)).sort();
      expect(dirs).toEqual(SPECWEAVE_SKILLS.map((n) => `sw-${n}`).sort());
      for (const name of SPECWEAVE_SKILLS) {
        const installed = fs.readFileSync(path.join(proj, base, `sw-${name}`, 'SKILL.md'), 'utf-8');
        const plugin = fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'specweave', 'skills', name, 'SKILL.md'), 'utf-8');
        expect(installed).toBe(toProjectSkill(plugin, name));
        expect(installed.startsWith(`---\nname: sw-${name}\n`)).toBe(true);
        expect(installed).not.toContain('Generated from skills/');
      }
    }
  });

  it('copies no unnamespaced skills', () => {
    for (const name of ['do', 'review', 'done', 'increment', 'qa']) {
      expect(fs.existsSync(path.join(proj, '.claude', 'skills', name)), name).toBe(false);
      expect(fs.existsSync(path.join(proj, '.agents', 'skills', name)), name).toBe(false);
    }
  });

  it('creates the committed memory index as a two-line stub', () => {
    const memory = fs.readFileSync(path.join(proj, '.specweave', 'memory', 'MEMORY.md'), 'utf-8');
    expect(memory.trimEnd().split('\n')).toHaveLength(2);
    expect(memory).toMatch(/one line per file/);
    const ignore = fs.readFileSync(path.join(proj, '.gitignore'), 'utf-8');
    expect(ignore).not.toMatch(/^\.specweave\/memory/m);
    expect(ignore).toMatch(/^\.specweave\/state\/$/m);
    expect(ignore).toMatch(/^\.specweave\/logs\/$/m);
  });

  it('writes no living-docs scaffold and starts no background job', () => {
    expect(files.filter((f) => f.startsWith('.specweave/docs/'))).toEqual([]);
    expect(fs.existsSync(path.join(proj, '.specweave', 'state', 'living-docs-config.json'))).toBe(false);
    expect(fs.existsSync(path.join(proj, '.specweave', 'state', 'jobs'))).toBe(false);
  });

  it('installs no git pre-commit hook by default', () => {
    expect(fs.existsSync(path.join(proj, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(proj, '.git', 'hooks', 'pre-commit'))).toBe(false);
  });

  it('writes no TDD mode or coverage targets', () => {
    const config = JSON.parse(fs.readFileSync(path.join(proj, '.specweave', 'config.json'), 'utf-8'));
    expect(config.testing?.mode).toBeUndefined();
    expect(config.testing?.coverage).toBeUndefined();
    const text = files
      .filter((f) => !f.startsWith('.claude/skills/') && !f.startsWith('.agents/skills/'))
      .map((f) => fs.readFileSync(path.join(proj, f), 'utf-8'))
      .join('\n');
    expect(text).not.toMatch(/\bTDD\b/);
    expect(text).not.toMatch(/\b95%/);
  });

  it('writes only the auto keys something reads', () => {
    const config = JSON.parse(fs.readFileSync(path.join(proj, '.specweave', 'config.json'), 'utf-8'));
    expect(config.auto).toEqual({ maxTurns: 20, maxSessionAge: 7200, requireTests: false });
  });

  it('never adds a lockfile to .gitignore', () => {
    const ignore = fs.readFileSync(path.join(proj, '.gitignore'), 'utf-8');
    for (const lock of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'go.sum', 'Gemfile.lock', 'composer.lock']) {
      expect(ignore, lock).not.toContain(lock);
    }
  });

  it('writes nothing to the home directory and no agent-teams env into the project', () => {
    expect(fs.existsSync(path.join(home, '.claude', 'settings.json'))).toBe(false);
    for (const rc of ['.bashrc', '.zshrc', '.profile', '.bash_profile']) {
      expect(fs.existsSync(path.join(home, rc)), rc).toBe(false);
    }
    expect(fs.existsSync(path.join(home, '.specweave', 'plugins-lock.json'))).toBe(false);
    const projectSettings = path.join(proj, '.claude', 'settings.json');
    if (fs.existsSync(projectSettings)) {
      expect(fs.readFileSync(projectSettings, 'utf-8')).not.toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
    }
  });

  it('stays small', () => {
    const outsideSkills = files.filter((f) => !f.startsWith('.claude/skills/') && !f.startsWith('.agents/skills/'));
    expect(outsideSkills.sort()).toEqual([
      '.gitattributes', '.gitignore', '.specweave/config.json', '.specweave/memory/MEMORY.md',
      'AGENTS.md', 'CLAUDE.md', 'README.md', 'package.json',
    ].sort());
  });
});

describe('specweave init --git-hooks', () => {
  it('installs the SpecWeave pre-commit hook when asked', () => {
    const { proj } = runInit('hooked', ['--git-hooks']);
    const hook = path.join(proj, '.git', 'hooks', 'pre-commit');
    expect(fs.existsSync(hook)).toBe(true);
    expect(fs.readFileSync(hook, 'utf-8')).toContain('SpecWeave Pre-Commit Hook');
  }, 180_000);
});
