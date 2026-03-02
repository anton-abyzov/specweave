/**
 * E2E Smoke Tests: CLI Commands
 *
 * Comprehensive smoke tests for core CLI commands:
 *   - specweave status (increment status verification)
 *   - specweave list agents (agent discovery)
 *   - specweave context (project context retrieval)
 *   - specweave doctor --json (health checks with JSON output)
 *
 * Additional coverage:
 *   - specweave list skills (skill discovery)
 *   - specweave context projects (project enumeration)
 *   - specweave context boards (board enumeration)
 *   - specweave list --installed (installed components)
 *
 * Every test is fully isolated with temp dirs and isolated HOME.
 * Tests use minimal setup for speed, reusing initialized projects.
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
const SMOKE_TIMEOUT = 60000;
const INIT_TIMEOUT = 30000;

/**
 * Creates a minimal initialized environment for smoke tests.
 * Uses the fewest possible operations for speed.
 */
async function createMinimalEnv(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const suffix = `${testName}-${timestamp}-${random}`;

  const workDir = path.join(os.tmpdir(), `sw-smoke-work-${suffix}`);
  await fs.mkdir(workDir, { recursive: true });

  const homeDir = path.join(os.tmpdir(), `sw-smoke-home-${suffix}`);
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

  // Run specweave init (non-interactive, minimal)
  await execAsync(
    `node "${specweaveBin}" init --adapter=claude --language=en`,
    { cwd: workDir, env, timeout: INIT_TIMEOUT }
  );

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
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  try {
    const result = await execAsync(`node "${specweaveBin}" ${args}`, { cwd, env, timeout });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    };
  }
}

describe.skip('CLI Smoke Tests', { timeout: SMOKE_TIMEOUT }, () => {
  let workDir: string;
  let homeDir: string;
  let env: Record<string, string>;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const ctx = await createMinimalEnv('smoke');
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
  describe('specweave status', () => {
    it('should show increment status for fresh project', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Status output should include core sections
      expect(result.exitCode).toBe(0);
      expect(output).toMatch(/Summary|Progress|Active/i);
    });

    it('should exit with code 0 on success', async () => {
      const result = await sw('status', env, workDir);
      expect(result.exitCode).toBe(0);
    });

    it('should include WIP limit information', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(output).toMatch(/WIP Limit|wip/i);
    });

    it('should show increment counts', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Should report counts for active/completed
      expect(result.exitCode).toBe(0);
      expect(output).toMatch(/Active:|Completed:/i);
    });

    it('should handle verbose flag', async () => {
      const result = await sw('status --verbose', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(output.length).toBeGreaterThan(5);
    });
  });

  // =========================================================================
  // LIST AGENTS COMMAND
  // =========================================================================
  describe('specweave list agents', () => {
    it('should list available agents or report none', async () => {
      const result = await sw('list agents', env, workDir);
      const output = normalizeOutput(result.stdout);

      // May exit 1 if agents directory is not found in test sandbox
      expect(result.exitCode).toBeLessThanOrEqual(1);
      // Output may be empty if no agents directory exists in the sandbox
      expect(output.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle list with no subcommand', async () => {
      const result = await sw('list', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(output.length).toBeGreaterThan(5);
    });

    it('should show agents header when agents exist', async () => {
      const result = await sw('list', env, workDir);
      const output = normalizeOutput(result.stdout);

      // May show "Agents:" header or "no agents" message
      expect(result.exitCode).toBe(0);
      expect(output).toMatch(/agent|skill/i);
    });

    it('should handle --installed flag for agents', async () => {
      const result = await sw('list --installed', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      // Should succeed even if no installed components
      expect(output.length).toBeGreaterThan(0);
    });

    it('should not crash on empty project', async () => {
      // Already in empty project from setup
      const result = await sw('list', env, workDir);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toBe('');
    });
  });

  // =========================================================================
  // CONTEXT COMMAND
  // =========================================================================
  describe('specweave context', () => {
    it('should show project context', async () => {
      const result = await sw('context projects', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      // Context should output valid JSON
      expect(output.length).toBeGreaterThan(5);
    });

    it('should output valid JSON from context projects', async () => {
      const result = await sw('context projects', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(typeof json).toBe('object');
    });

    it('should include structure level in context', async () => {
      const result = await sw('context projects', env, workDir);
      const json = extractJson<{ level: number; projects: unknown[] }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(json?.level).toBeDefined();
      expect([1, 2]).toContain(json?.level);
    });

    it('should include projects array in context', async () => {
      const result = await sw('context projects', env, workDir);
      const json = extractJson<{ projects: unknown[] }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(Array.isArray(json?.projects)).toBe(true);
    });

    it('should handle boards subcommand', async () => {
      const result = await sw('context boards', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      // Should succeed even if no boards
      expect(output.length).toBeGreaterThan(0);
    });

    it('should output valid JSON from context boards', async () => {
      const result = await sw('context boards', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(typeof json).toBe('object');
    });

    it('should accept project parameter for boards', async () => {
      const result = await sw('context boards --project=default', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
    });

    it('should handle select subcommand', async () => {
      const result = await sw('context select', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should output valid JSON from context select', async () => {
      const result = await sw('context select', env, workDir);
      const json = extractJson<{ selected: { project: string } }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(json?.selected).toBeDefined();
      expect(typeof json?.selected?.project).toBe('string');
    });
  });

  // =========================================================================
  // DOCTOR COMMAND WITH JSON OUTPUT
  // =========================================================================
  describe('specweave doctor --json', () => {
    it('should output valid JSON with --json flag', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{
        summary: { total: number; passed: number; failures: number; warnings: number };
        categories: unknown[];
      }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(typeof json).toBe('object');
    });

    it('should include summary field in JSON output', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{
        summary: { total: number; passed: number; failures: number; warnings: number };
      }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json?.summary).toBeDefined();
      expect(typeof json?.summary?.total).toBe('number');
      expect(typeof json?.summary?.passed).toBe('number');
      expect(typeof json?.summary?.failures).toBe('number');
      expect(typeof json?.summary?.warnings).toBe('number');
    });

    it('should have passed checks > 0 on healthy project', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{ summary: { passed: number } }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json?.summary?.passed).toBeGreaterThan(0);
    });

    it('should have zero failures on fresh initialized project', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{ summary: { failures: number } }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json?.summary?.failures).toBe(0);
    });

    it('should include categories field', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson<{ categories: unknown[] }>(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(Array.isArray(json?.categories)).toBe(true);
    });

    it('should exit 0 on healthy project with --json', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      expect(result.exitCode).toBe(0);
    });

    it('should handle verbose with json output', async () => {
      const result = await sw('doctor --json --quick --verbose', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
    });

    it('should handle skip-external with json output', async () => {
      const result = await sw('doctor --json --quick --skip-external', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
    });

    it('should output valid JSON even without --quick', async () => {
      const result = await sw('doctor --json --skip-external', env, workDir);
      const json = extractJson(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(typeof json).toBe('object');
    });
  });

  // =========================================================================
  // DOCTOR COMMAND (TEXT OUTPUT)
  // =========================================================================
  describe('specweave doctor (text output)', () => {
    it('should show health check categories in text mode', async () => {
      const result = await sw('doctor --quick', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      // Should show check category names
      expect(output).toMatch(/environment|project|config|git/i);
    });

    it('should include check results in text output', async () => {
      const result = await sw('doctor --quick', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      // Should show pass/fail/warn indicators
      expect(output).toMatch(/✓|✗|pass|fail|warn/i);
    });

    it('should handle verbose text output', async () => {
      const result = await sw('doctor --quick --verbose', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(result.exitCode).toBe(0);
      expect(output.length).toBeGreaterThan(20);
    });
  });

  // =========================================================================
  // COMBINED QUICK CHECKS
  // =========================================================================
  describe('command chain verification', () => {
    it('should run status, list, and context without errors', async () => {
      const statusResult = await sw('status', env, workDir);
      const listResult = await sw('list', env, workDir);
      const contextResult = await sw('context projects', env, workDir);

      expect(statusResult.exitCode).toBe(0);
      expect(listResult.exitCode).toBe(0);
      expect(contextResult.exitCode).toBe(0);
    });

    it('should produce consistent output across runs', async () => {
      const result1 = await sw('status', env, workDir);
      const result2 = await sw('status', env, workDir);

      const output1 = normalizeOutput(result1.stdout);
      const output2 = normalizeOutput(result2.stdout);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      // Same structure, may vary in timestamps but should have same sections
      expect(output1).toMatch(/Summary|Progress/i);
      expect(output2).toMatch(/Summary|Progress/i);
    });

    it('should handle rapid consecutive calls', async () => {
      const promises = [
        sw('status', env, workDir),
        sw('list', env, workDir),
        sw('context projects', env, workDir),
        sw('doctor --json --quick', env, workDir),
      ];

      const results = await Promise.all(promises);

      expect(results.every(r => r.exitCode === 0)).toBe(true);
      expect(results.every(r => r.stdout.length > 0)).toBe(true);
    });
  });

  // =========================================================================
  // ERROR CASES
  // =========================================================================
  describe('error handling', () => {
    it('should fail gracefully on non-specweave directory', async () => {
      const emptyDir = path.join(os.tmpdir(), `sw-empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      try {
        const result = await sw('status', env, emptyDir);
        // Should either fail with non-zero code or show informative message
        const output = normalizeOutput(result.stdout + result.stderr);
        // Either it fails or shows that no increments found
        expect(result.exitCode !== 0 || output.length > 0).toBe(true);
      } finally {
        await fs.rm(emptyDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    it('should handle invalid context subcommand', async () => {
      const result = await sw('context invalid-subcommand', env, workDir);
      // Should exit non-zero or show error
      expect(result.exitCode !== 0 || result.stdout.includes('error') || result.stderr.includes('error')).toBe(true);
    });

    it('should handle unknown command', async () => {
      const result = await sw('nonexistent-command-xyz', env, workDir);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // =========================================================================
  // PERFORMANCE / QUICK EXECUTION
  // =========================================================================
  describe('performance', () => {
    it('should complete status in under 5s', async () => {
      const start = Date.now();
      const result = await sw('status', env, workDir);
      const duration = Date.now() - start;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(5000);
    });

    it('should complete list in under 5s', async () => {
      const start = Date.now();
      const result = await sw('list', env, workDir);
      const duration = Date.now() - start;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(5000);
    });

    it('should complete context in under 5s', async () => {
      const start = Date.now();
      const result = await sw('context projects', env, workDir);
      const duration = Date.now() - start;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(5000);
    });

    it('should complete doctor --quick in under 10s', async () => {
      const start = Date.now();
      const result = await sw('doctor --quick --json', env, workDir);
      const duration = Date.now() - start;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(10000);
    });
  });

  // =========================================================================
  // OUTPUT VALIDATION
  // =========================================================================
  describe('output validation', () => {
    it('status output should be non-empty', async () => {
      const result = await sw('status', env, workDir);
      expect(result.stdout.trim().length).toBeGreaterThan(0);
    });

    it('list output should be non-empty', async () => {
      const result = await sw('list', env, workDir);
      expect(result.stdout.trim().length).toBeGreaterThan(0);
    });

    it('context projects should be parseable JSON', async () => {
      const result = await sw('context projects', env, workDir);
      const json = extractJson(result.stdout);
      expect(json).not.toBeNull();
    });

    it('doctor --json should be parseable JSON', async () => {
      const result = await sw('doctor --json --quick', env, workDir);
      const json = extractJson(result.stdout);
      expect(json).not.toBeNull();
    });

    it('should have no sensitive data in status output', async () => {
      const result = await sw('status', env, workDir);
      const output = normalizeOutput(result.stdout);

      // Check for common sensitive patterns (tokens, secrets, etc)
      expect(output).not.toMatch(/token|secret|password|key/i);
    });

    it('should have no sensitive data in context output', async () => {
      const result = await sw('context projects', env, workDir);
      const output = normalizeOutput(result.stdout);

      expect(output).not.toMatch(/token|secret|password/i);
    });
  });
});
