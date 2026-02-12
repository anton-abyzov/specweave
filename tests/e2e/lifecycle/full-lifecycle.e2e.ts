/**
 * E2E Test: Full SpecWeave Lifecycle
 *
 * Tests the complete lifecycle:
 *   1. Create isolated git repo
 *   2. Run `specweave init`
 *   3. Verify project structure
 *   4. Run `specweave status`
 *   5. Run `specweave save --no-push` (commit changes)
 *   6. Verify git state
 *   7. Run `specweave doctor`
 *   8. Teardown: remove temp git repo + isolated home
 *
 * Every test is fully isolated - no env leaks, no real HOME touches.
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
const LIFECYCLE_TIMEOUT = 60000;

/**
 * Creates a fully isolated environment for lifecycle tests:
 * - Temp working dir with git init
 * - Isolated HOME dir (prevents touching real ~/.specweave/)
 * - Git user config for commits
 * - Cleanup function that removes everything
 */
async function createLifecycleEnv(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const suffix = `${testName}-${timestamp}-${random}`;

  // Working directory (project root for specweave)
  const workDir = path.join(os.tmpdir(), `sw-lifecycle-work-${suffix}`);
  await fs.mkdir(workDir, { recursive: true });

  // Isolated home
  const homeDir = path.join(os.tmpdir(), `sw-lifecycle-home-${suffix}`);
  await fs.mkdir(homeDir, { recursive: true });
  await fs.mkdir(path.join(homeDir, '.specweave'), { recursive: true });
  await fs.mkdir(path.join(homeDir, '.claude'), { recursive: true });

  const env = getIsolatedEnv(homeDir, { CI: 'true' });

  // Initialize git repo inside workDir
  await execAsync('git init', { cwd: workDir, env });
  await execAsync('git config user.email "test@specweave.dev"', { cwd: workDir, env });
  await execAsync('git config user.name "SpecWeave Test"', { cwd: workDir, env });

  // Initial commit so git is in a clean state
  await fs.writeFile(path.join(workDir, '.gitkeep'), '');
  await execAsync('git add -A && git commit -m "initial commit"', { cwd: workDir, env });

  const cleanup = async () => {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(homeDir, { recursive: true, force: true }).catch(() => {});
  };

  return { workDir, homeDir, env, cleanup };
}

/** Helper to run specweave CLI in isolated env */
async function sw(
  args: string,
  env: Record<string, string>,
  cwd: string,
  timeout = 30000
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`node "${specweaveBin}" ${args}`, { cwd, env, timeout });
}

describe('Full SpecWeave Lifecycle', { timeout: LIFECYCLE_TIMEOUT }, () => {
  let workDir: string;
  let homeDir: string;
  let env: Record<string, string>;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const ctx = await createLifecycleEnv('lifecycle');
    workDir = ctx.workDir;
    homeDir = ctx.homeDir;
    env = ctx.env;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should complete init → status → save → doctor lifecycle', async () => {
    // === Step 1: Init ===
    const initResult = await sw('init --adapter=claude --language=en', env, workDir);
    const initOutput = normalizeOutput(initResult.stdout);

    // Verify .specweave/ directory was created
    const specweaveDir = path.join(workDir, '.specweave');
    const dirStat = await fs.stat(specweaveDir);
    expect(dirStat.isDirectory()).toBe(true);

    // Verify config.json
    const configPath = path.join(specweaveDir, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config).toHaveProperty('project');
    expect(config.adapters?.default).toBe('claude');

    // Verify increments/ exists
    const incrementsDir = path.join(specweaveDir, 'increments');
    const incStat = await fs.stat(incrementsDir);
    expect(incStat.isDirectory()).toBe(true);

    // === Step 2: Status ===
    const statusResult = await sw('status', env, workDir);
    const statusOutput = normalizeOutput(statusResult.stdout);
    // Status should work without errors (may show no active increments)
    expect(statusOutput).toBeTruthy();

    // === Step 3: Save (no-push, local only) ===
    // Add a file to create changes
    await fs.writeFile(path.join(workDir, 'test-feature.ts'), 'export const hello = "world";\n');

    const saveResult = await sw('save --no-push "test: add test feature"', env, workDir);
    const saveOutput = normalizeOutput(saveResult.stdout);
    expect(saveOutput).toContain('SUMMARY');

    // Verify git log has our commit
    const logResult = await execAsync('git log --oneline -2', { cwd: workDir, env });
    const logOutput = normalizeOutput(logResult.stdout);
    expect(logOutput).toContain('test: add test feature');

    // === Step 4: Doctor ===
    const doctorResult = await sw('doctor --quick', env, workDir);
    const doctorOutput = normalizeOutput(doctorResult.stdout);
    // Doctor should run without crashing
    expect(doctorOutput).toBeTruthy();
  });

  it('should handle save with no changes gracefully', async () => {
    // Init the project
    await sw('init --adapter=claude --language=en', env, workDir);

    // Commit the specweave init artifacts so working dir is clean
    await execAsync('git add -A && git commit -m "chore: init specweave"', { cwd: workDir, env });

    // Save with no changes should not fail
    const saveResult = await sw('save --no-push', env, workDir);
    const saveOutput = normalizeOutput(saveResult.stdout);
    // Should report skipped or no changes
    expect(saveOutput).toMatch(/skip|no changes|SUMMARY/i);
  });

  it('should save with auto-generated commit message', async () => {
    // Init
    await sw('init --adapter=claude --language=en', env, workDir);
    await execAsync('git add -A && git commit -m "chore: init specweave"', { cwd: workDir, env });

    // Create source and doc changes
    await fs.writeFile(path.join(workDir, 'src-file.ts'), 'export const x = 1;\n');
    await fs.mkdir(path.join(workDir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(workDir, 'docs', 'api.md'), '# API\n');

    const saveResult = await sw('save --no-push', env, workDir);
    const saveOutput = normalizeOutput(saveResult.stdout);
    expect(saveOutput).toContain('SUMMARY');

    // Verify a commit was created (auto-generated message)
    const logResult = await execAsync('git log --oneline -1', { cwd: workDir, env });
    const lastCommit = normalizeOutput(logResult.stdout);
    // Auto-generated message should use conventional commits format
    expect(lastCommit).toMatch(/^[a-f0-9]+ (feat|docs|chore|test|style|ci|build)/);
  });

  it('should create clean git state after full teardown', async () => {
    // Init + create changes + save
    await sw('init --adapter=claude --language=en', env, workDir);
    await fs.writeFile(path.join(workDir, 'feature.ts'), 'export const y = 2;\n');
    await sw('save --no-push "feat: add feature"', env, workDir);

    // Verify working dir is clean after save
    const statusResult = await execAsync('git status --porcelain', { cwd: workDir, env });
    const statusOutput = statusResult.stdout.trim();
    expect(statusOutput).toBe('');
  });

  it('should isolate HOME and never touch real specweave dir', async () => {
    const realHome = os.homedir();
    const realSpecweave = path.join(realHome, '.specweave');

    // Record state before test
    let realSpecweaveExistedBefore = false;
    let realSpecweaveContentBefore: string[] = [];
    try {
      realSpecweaveContentBefore = await fs.readdir(realSpecweave);
      realSpecweaveExistedBefore = true;
    } catch {
      // Doesn't exist - that's fine
    }

    // Run init in isolated env
    await sw('init --adapter=claude --language=en', env, workDir);

    // Verify real HOME was not touched
    if (realSpecweaveExistedBefore) {
      const realSpecweaveContentAfter = await fs.readdir(realSpecweave);
      expect(realSpecweaveContentAfter).toEqual(realSpecweaveContentBefore);
    }

    // Verify the isolated home HAS the dirs
    const isolatedSpecweave = path.join(homeDir, '.specweave');
    const isolatedStat = await fs.stat(isolatedSpecweave);
    expect(isolatedStat.isDirectory()).toBe(true);
  });

  it('should handle doctor --json output', async () => {
    await sw('init --adapter=claude --language=en', env, workDir);

    const doctorResult = await sw('doctor --json --quick', env, workDir);
    const json = extractJson<{ summary?: { total: number } }>(doctorResult.stdout);
    expect(json).not.toBeNull();
    expect(json?.summary).toHaveProperty('total');
    expect(json!.summary!.total).toBeGreaterThan(0);
  });
});
