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
import { execFile } from 'node:child_process';
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
