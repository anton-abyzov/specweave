/**
 * E2E: `specweave update` on a real 1.x project.
 *
 * These drive the actual binary (not an internal), because every bug they
 * cover survived a green unit suite that mocked the very code paths at fault:
 *
 *  - update never ran the 1.x → 2.0 config migration, so the documented
 *    `update` → `doctor` sequence left 13 dead keys on disk (README.md:65
 *    promises "migrates config.json in one pass").
 *  - `--no-plugins` was read as `options.noPlugins`, which Commander never
 *    sets (it sets `plugins: false`), so plugins were always refreshed into
 *    the user's real ~/.claude.
 *  - top-level `banner` survived the migration, so every later config load
 *    warned about an unknown key forever.
 *  - update wrote reflect-config.json and advertised "self-improving AI",
 *    a subsystem 2.0 dropped outright.
 *  - update printed "✓ Fixed:" for health checks it had not fixed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { getIsolatedEnv } from '../../test-utils/temp-home.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specweaveBin = path.join(__dirname, '../../../bin/specweave.js');

/** A representative 1.x config: dead keys, old testing shape, banner. */
const LEGACY_CONFIG = {
  version: '1.0',
  project: { name: 'legacy-fixture' },
  banner: { enabled: true, style: 'compact' },
  reflect: { enabled: true, autoReflect: true },
  contextBudget: { maxTokens: 100000 },
  quality: { gates: true },
  statusLine: { enabled: true },
  pluginAutoLoad: true,
  documentation: { enabled: true },
  testing: { defaultTestMode: 'TDD', coverageTargets: { unit: 95 } },
};

let workDir: string;
let homeDir: string;
let env: Record<string, string>;

function configPath(): string {
  return path.join(workDir, '.specweave', 'config.json');
}

function readConfig(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
}

async function runUpdate(args: string[] = ['--no-self', '--no-plugins']): Promise<string> {
  const { stdout, stderr } = await execFileAsync(process.execPath, [specweaveBin, 'update', ...args], {
    cwd: workDir,
    env,
    timeout: 120_000,
  });
  return `${stdout}\n${stderr}`;
}

describe('e2e: specweave update (1.x project)', () => {
  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-update-work-${suffix}-`));
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-update-home-${suffix}-`));
    fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(homeDir, '.specweave'), { recursive: true });

    fs.mkdirSync(path.join(workDir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(LEGACY_CONFIG, null, 2));
    // A 1.x project also carries the reflect subsystem's state file.
    fs.writeFileSync(
      path.join(workDir, '.specweave', 'state', 'reflect-config.json'),
      JSON.stringify({ enabled: true, autoReflect: true })
    );

    env = getIsolatedEnv(homeDir, { CI: 'true', SPECWEAVE_UPDATE_NO_SELF: '1' });
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('migrates config.json to the 2.0 shape and records a migration note', async () => {
    const output = await runUpdate();

    const config = readConfig();
    for (const dead of [
      'banner',
      'reflect',
      'contextBudget',
      'quality',
      'statusLine',
      'pluginAutoLoad',
      'documentation',
    ]) {
      expect(config, `${dead} should have been dropped`).not.toHaveProperty(dead);
    }
    expect(config.version).toBe('2.0');
    expect(config.testing).toEqual({ mode: 'TDD', coverage: { unit: 95 } });

    const notePath = path.join(workDir, '.specweave', 'state', 'config-migration-2.json');
    expect(fs.existsSync(notePath)).toBe(true);
    const note = JSON.parse(fs.readFileSync(notePath, 'utf-8'));
    expect(note.to).toBe('2.0');
    expect(note.removedKeys).toContain('banner');
    expect(note.removedKeys).toContain('reflect');

    expect(output).toContain('migrated to the 2.0 shape');
  });

  it('is idempotent: a second update rewrites nothing', async () => {
    await runUpdate();
    const afterFirst = fs.readFileSync(configPath(), 'utf-8');

    const output = await runUpdate();

    expect(fs.readFileSync(configPath(), 'utf-8')).toBe(afterFirst);
    expect(output).toContain('Already 2.0 shape');
  });

  it('honours --no-plugins (Commander sets plugins=false, not noPlugins)', async () => {
    const output = await runUpdate();

    expect(output).not.toContain('Refreshing marketplace plugins');
    expect(output).toContain('Skipped (--no-plugins specified)');
    // Nothing may be installed into the (isolated) user home.
    expect(fs.existsSync(path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json'))).toBe(false);
  });

  it('removes the dropped reflect subsystem instead of enabling it', async () => {
    const output = await runUpdate();

    expect(fs.existsSync(path.join(workDir, '.specweave', 'state', 'reflect-config.json'))).toBe(false);
    expect(output).not.toContain('autoReflect');
    expect(output).not.toContain('self-improving AI');
  });

  it('never reports "Fixed:" for a health check it did not fix', async () => {
    const output = await runUpdate();

    expect(output).not.toContain('✓ Fixed:');
  });

  it('--check reports the migration without touching the config', async () => {
    const before = fs.readFileSync(configPath(), 'utf-8');

    const output = await runUpdate(['--no-self', '--no-plugins', '--check']);

    expect(output).toContain('would migrate');
    expect(fs.readFileSync(configPath(), 'utf-8')).toBe(before);
    expect(
      fs.existsSync(path.join(workDir, '.specweave', 'state', 'config-migration-2.json'))
    ).toBe(false);
  });
});

/**
 * The upgrade path a 1.x user actually follows:
 *   npm i -g specweave@2 && specweave update
 *
 * Before this suite, `update` refreshed config, instructions and plugins but
 * never touched `.git/hooks/pre-commit`, so the user kept the 1.x hook body —
 * the one that rejects `ledger.jsonl` at the increment root ("ONLY 4 files
 * allowed") and reports a false duplicate id for any increment that has a
 * `reports/` folder. Their FIRST 2.0 commit was blocked, and `doctor` rated it
 * a non-fatal warning and still exited 0, so nothing told them why.
 *
 * The fixture is the REAL 1.x template (tests/fixtures/git-hooks), not a
 * synthetic stand-in: the bug lives in that exact body.
 */
describe('e2e: specweave update refreshes a stale 1.x pre-commit hook', () => {
  const LEGACY_HOOK = path.join(__dirname, '../../fixtures/git-hooks/pre-commit-1x.template');

  function git(...args: string[]): string {
    return execFileSync('git', args, {
      cwd: workDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
    });
  }

  function tryCommit(message: string): { ok: boolean; output: string } {
    const r = spawnSync('git', ['commit', '-m', message], {
      cwd: workDir,
      encoding: 'utf-8',
      env: { ...env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
    });
    return { ok: r.status === 0, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
  }

  function hookPath(): string {
    return path.join(workDir, '.git', 'hooks', 'pre-commit');
  }

  function installLegacyHook(): void {
    fs.mkdirSync(path.join(workDir, '.git', 'hooks'), { recursive: true });
    fs.copyFileSync(LEGACY_HOOK, hookPath());
    fs.chmodSync(hookPath(), 0o755);
  }

  /** The exact shape `create-increment` + `task claim` leave on disk. */
  function writeIncrement(): void {
    const dir = path.join(workDir, '.specweave', 'increments', '0001-test-feature');
    fs.mkdirSync(path.join(dir, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), '{"id":"0001-test-feature","status":"active"}\n');
    fs.writeFileSync(path.join(dir, 'spec.md'), '# Spec\n\n- [ ] AC-01: something\n');
    fs.writeFileSync(path.join(dir, 'tasks.md'), '### T-01 First\n- AC: AC-01 | Files: a.ts | Test: true\n');
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), '{"t":"T-01","e":"claim","by":"a","at":"2026-09-02T10:00:00Z"}\n');
    fs.writeFileSync(path.join(dir, 'reports', 'verify.json'), '{}\n');
  }

  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-hookup-work-${suffix}-`));
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-hookup-home-${suffix}-`));
    fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(homeDir, '.specweave'), { recursive: true });
    fs.mkdirSync(path.join(workDir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(workDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'hook-fixture' } }, null, 2)
    );
    env = getIsolatedEnv(homeDir, { CI: 'true', SPECWEAVE_UPDATE_NO_SELF: '1' });

    git('init', '-q', '.');
    // A machine-global core.hooksPath would silently shadow .git/hooks and make
    // the commit assertions vacuous.
    git('config', 'core.hooksPath', '.git/hooks');
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('rewrites the 1.x hook so the first 2.0 commit is not blocked', async () => {
    installLegacyHook();
    expect(fs.readFileSync(hookPath(), 'utf-8')).toContain('# Version: 1.0.0');

    const output = await runUpdate();
    expect(output).toMatch(/pre-commit hook refreshed \(v1\.0\.0 → v2\.0\.0\)/);
    expect(fs.readFileSync(hookPath(), 'utf-8')).toContain('# Version: 2.0.0');

    writeIncrement();
    git('add', '-A');
    const commit = tryCommit('0001: first 2.0 commit');
    expect(commit.output).not.toMatch(/ONLY 4 files allowed/);
    expect(commit.output).not.toMatch(/pollution detected/i);
    expect(commit.output).not.toMatch(/Duplicate increment IDs found/i);
    expect(commit.ok).toBe(true);
  });

  it('blocks that same commit when the stale hook is left in place', async () => {
    // Guards the guard: proves the fixture really is the failing 1.x body, so a
    // future regression cannot make the test above pass vacuously.
    installLegacyHook();
    writeIncrement();
    git('add', '-A');

    const commit = tryCommit('0001: first 2.0 commit');
    expect(commit.ok).toBe(false);
    expect(commit.output).toMatch(/ONLY 4 files allowed/);
  });

  it('never rewrites a hook the user wrote, and says what to do instead', async () => {
    const mine = '#!/bin/sh\necho "my own hook"\n';
    fs.mkdirSync(path.join(workDir, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(hookPath(), mine, 'utf-8');
    fs.chmodSync(hookPath(), 0o755);

    const output = await runUpdate();

    expect(fs.readFileSync(hookPath(), 'utf-8')).toBe(mine);
    expect(output).toMatch(/custom pre-commit hook left untouched/);
    expect(output).toMatch(/specweave doctor --fix/);
  });

  it('--check reports the stale hook without rewriting it', async () => {
    installLegacyHook();
    const before = fs.readFileSync(hookPath(), 'utf-8');

    const output = await runUpdate(['--no-self', '--no-plugins', '--check']);

    expect(output).toMatch(/would be refreshed/);
    expect(fs.readFileSync(hookPath(), 'utf-8')).toBe(before);
  });

  it('doctor FAILS (exit 1) on a stale hook — a blocked commit is not a warning', async () => {
    installLegacyHook();

    const r = spawnSync(process.execPath, [specweaveBin, 'doctor'], {
      cwd: workDir,
      env,
      encoding: 'utf-8',
      timeout: 120_000,
    });

    const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    expect(output).toMatch(/Pre-commit hook: stale v1\.0\.0/);
    expect(output).toMatch(/blocks commits/);
    expect(r.status).toBe(1);
  });

  it('doctor --fix repairs the hook and then exits 0', async () => {
    installLegacyHook();

    const fix = spawnSync(process.execPath, [specweaveBin, 'doctor', '--fix'], {
      cwd: workDir,
      env,
      encoding: 'utf-8',
      timeout: 120_000,
    });
    expect(`${fix.stdout ?? ''}`).toMatch(/refreshed v1\.0\.0 → v2\.0\.0/);
    expect(fs.readFileSync(hookPath(), 'utf-8')).toContain('# Version: 2.0.0');
  });
});
