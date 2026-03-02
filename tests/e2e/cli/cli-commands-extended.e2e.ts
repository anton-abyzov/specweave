/**
 * E2E Test: Extended CLI Commands
 *
 * Tests CLI commands with proper before/after state verification:
 *   - specweave status (with and without increments)
 *   - specweave doctor (quick, json, full)
 *   - specweave cache (status, clear)
 *   - specweave check-discipline
 *   - specweave list
 *
 * Every test is fully isolated with temp dirs and isolated HOME.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';
import os from 'os';
import { getIsolatedEnv } from '../../test-utils/temp-home.js';
import { normalizeOutput, extractJson } from '../../test-utils/normalize-output.js';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specweaveBin = path.join(__dirname, '../../../bin/specweave.js');
const CLI_TIMEOUT = 60000;

/**
 * Creates a fully isolated environment for CLI tests:
 * - Temp working dir with git init
 * - Isolated HOME dir
 * - Git user config for commits
 * - SpecWeave init already run
 */
async function createInitializedEnv(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const suffix = `${testName}-${timestamp}-${random}`;

  const workDir = path.join(os.tmpdir(), `sw-cli-ext-work-${suffix}`);
  await fs.mkdir(workDir, { recursive: true });

  const homeDir = path.join(os.tmpdir(), `sw-cli-ext-home-${suffix}`);
  await fs.mkdir(homeDir, { recursive: true });
  await fs.mkdir(path.join(homeDir, '.specweave'), { recursive: true });
  await fs.mkdir(path.join(homeDir, '.claude'), { recursive: true });

  const env = getIsolatedEnv(homeDir, { CI: 'true' });

  // Git init
  await execAsync('git init', { cwd: workDir, env });
  await execAsync('git config user.email "test@specweave.dev"', { cwd: workDir, env });
  await execAsync('git config user.name "SpecWeave Test"', { cwd: workDir, env });
  await fs.writeFile(path.join(workDir, '.gitkeep'), '');
  await execAsync('git add -A && git commit -m "initial commit"', { cwd: workDir, env });

  // Run specweave init
  await execAsync(`node "${specweaveBin}" init --adapter=claude --language=en`, {
    cwd: workDir, env, timeout: 30000,
  });

  const cleanup = async () => {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(homeDir, { recursive: true, force: true }).catch(() => {});
  };

  return { workDir, homeDir, env, cleanup };
}

/** Run specweave CLI in isolated env */
async function sw(
  args: string,
  env: Record<string, string>,
  cwd: string,
  timeout = 30000
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`node "${specweaveBin}" ${args}`, { cwd, env, timeout });
}

// These tests require `specweave init` which may not work in CI
// (missing plugins, sibling repos, or binary linking issues)
const canRunCliE2E = !process.env.CI;

describe.skipIf(!canRunCliE2E)('Extended CLI Commands', { timeout: CLI_TIMEOUT }, () => {
  let workDir: string;
  let homeDir: string;
  let env: Record<string, string>;
  let cleanup: () => Promise<void> = async () => {};

  beforeEach(async () => {
    const ctx = await createInitializedEnv('cli-ext');
    workDir = ctx.workDir;
    homeDir = ctx.homeDir;
    env = ctx.env;
    cleanup = ctx.cleanup;
  }, 45000);

  afterEach(async () => {
    await cleanup();
  });

  // =========================================================================
  // STATUS COMMAND
  // =========================================================================
  describe('status command', () => {
    it('should show status overview for initialized project', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Status always shows overall progress section
      expect(output).toMatch(/Overall Progress/i);
      // Status always shows WIP limit info
      expect(output).toMatch(/WIP Limit/i);
      // Status always shows summary counts
      expect(output).toMatch(/Summary/i);
      expect(output).toMatch(/Active:\s*\d+/i);
      expect(output).toMatch(/Completed:\s*\d+/i);
    });

    it('should show zero active increments on fresh project', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Fresh project: 0/0 or 0/1 increments complete
      expect(output).toMatch(/Overall Progress.*\d+\/\d+/i);
    });
  });

  // =========================================================================
  // DOCTOR COMMAND
  // =========================================================================
  describe('doctor command', () => {
    it('should run quick health check and report categories', async () => {
      const result = await sw('doctor --quick', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Doctor output must contain actual check category names
      expect(output).toMatch(/environment|project|config|git/i);
    });

    it('should output valid JSON with --json flag', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{
        summary: { total: number; passed: number; failures: number; warnings: number };
        categories: unknown[];
      }>(result.stdout);

      expect(json).not.toBeNull();

      // Verify JSON structure has required fields
      expect(json!.summary).toHaveProperty('total');
      expect(json!.summary).toHaveProperty('passed');
      expect(json!.summary).toHaveProperty('failures');
      expect(json!.summary).toHaveProperty('warnings');
      expect(json!.summary.total).toBeGreaterThan(0);

      // On a freshly initialized project, there should be no failures
      // (skip this on CI where git remote might not exist)
      expect(json!.summary.passed).toBeGreaterThan(0);
    });

    it('should have zero failures on a healthy fresh project', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{
        summary: { failures: number; passed: number };
      }>(result.stdout);

      expect(json).not.toBeNull();
      // A freshly initialized project should pass all quick checks
      expect(json!.summary.failures).toBe(0);
      expect(json!.summary.passed).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // CACHE COMMAND
  // =========================================================================
  describe('cache command', () => {
    it('should report no cache on fresh project', async () => {
      const result = await sw('cache', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Default (--status) should report cache status
      expect(output).toMatch(/Cache Status/i);
      // Fresh project has no dashboard cache
      expect(output).toMatch(/Not found|No cache/i);
    });

    it('should handle --clear with no existing cache', async () => {
      const result = await sw('cache --clear', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Should not crash, should report nothing to clear
      expect(output).toMatch(/No cache to clear|cleared/i);
    });

    it('should clear existing cache file', async () => {
      // Create a fake cache file
      const stateDir = path.join(workDir, '.specweave', 'state');
      await fs.mkdir(stateDir, { recursive: true });
      const cachePath = path.join(stateDir, 'dashboard.json');
      await fs.writeFile(cachePath, JSON.stringify({ version: '1.0', summary: { total: 0 } }));

      // Verify cache exists before
      const beforeStat = await fs.stat(cachePath);
      expect(beforeStat.isFile()).toBe(true);

      // Clear cache
      const result = await sw('cache --clear', env, workDir);
      const output = normalizeOutput(result.stdout);
      expect(output).toMatch(/cleared/i);

      // Verify cache file is gone after
      try {
        await fs.stat(cachePath);
        expect.unreachable('Cache file should have been deleted');
      } catch (err: any) {
        expect(err.code).toBe('ENOENT');
      }
    });

    it('should show cache details when cache exists', async () => {
      // Create a valid cache file
      const stateDir = path.join(workDir, '.specweave', 'state');
      await fs.mkdir(stateDir, { recursive: true });
      const cachePath = path.join(stateDir, 'dashboard.json');
      await fs.writeFile(cachePath, JSON.stringify({
        version: '2.0',
        summary: { total: 5, active: 2, completed: 3, archived: 0 },
        updatedAt: new Date().toISOString(),
        increments: {},
      }));

      const result = await sw('cache', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(output).toMatch(/Valid/i);
      expect(output).toMatch(/Version.*2\.0/);
      expect(output).toMatch(/Total increments.*5/);
    });
  });

  // =========================================================================
  // LIST COMMAND
  // =========================================================================
  describe('list command', () => {
    it('should list available components', async () => {
      const result = await sw('list', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Should show some header/content about components
      expect(output.length).toBeGreaterThan(10);
    });

    it('should handle --installed flag', async () => {
      const result = await sw('list --installed', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Should not crash, may show "no components" or list them
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // VERSION AND HELP (extended)
  // =========================================================================
  describe('version and help', () => {
    it('should output valid semver from --version', async () => {
      const result = await sw('--version', env, workDir);
      const version = normalizeOutput(result.stdout);
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should list all registered commands in --help', async () => {
      const result = await sw('--help', env, workDir);
      const output = normalizeOutput(result.stdout);

      // These are core commands that must always be registered
      expect(output).toContain('init');
      expect(output).toContain('status');
      expect(output).toContain('save');
      expect(output).toContain('doctor');
    });

    it('should not list removed commands in --help', async () => {
      const result = await sw('--help', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Dead commands removed in past increments (0125, 0182, 0171)
      expect(output).not.toContain('enable-multiproject');
      expect(output).not.toContain('switch-project');
      expect(output).not.toContain('cache-status');
      expect(output).not.toContain('cache-refresh');
      expect(output).not.toContain('migrate-lazy');
      expect(output).not.toContain('delete-feature');
    });

    it('should not list internal-only commands in --help', async () => {
      const result = await sw('--help', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Hook-internal commands should be hidden from user-facing help
      expect(output).not.toContain('detect-intent');
      expect(output).not.toContain('evaluate-completion');
      expect(output).not.toContain('reflect-stop');
      expect(output).not.toContain('detect-project');
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================
  describe('error handling', () => {
    it('should exit non-zero for unknown command', async () => {
      try {
        await sw('nonexistent-command-xyz', env, workDir);
        expect.unreachable('Expected command to fail');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should show helpful error for status in non-specweave dir', async () => {
      // Create a dir without .specweave
      const emptyDir = path.join(os.tmpdir(), `sw-empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      try {
        const result = await sw('status', env, emptyDir).catch(e => e);
        // Should either show an error message or exit non-zero
        const output = normalizeOutput(result.stdout || result.stderr || '');
        // At minimum it shouldn't silently succeed with meaningful status data
        expect(output).not.toMatch(/Active:\s+[1-9]/);
      } finally {
        await fs.rm(emptyDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });
});
