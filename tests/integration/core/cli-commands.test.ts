/**
 * SpecWeave CLI E2E Test Suite
 *
 * Tests CLI commands end-to-end by spawning real processes.
 * Uses temp-home isolation to prevent touching real ~/.specweave/.
 * Uses normalize-output helpers for reliable output assertions.
 *
 * Run separately: npm run test:e2e:cli
 * These are intentionally slower than unit tests.
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

const CLI_TIMEOUT = 30000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specweaveBin = path.join(__dirname, '../../../bin/specweave.js');

/**
 * Helper: create a temp working directory + isolated home for CLI tests.
 * Returns both the working dir (cwd for init) and isolated home.
 */
async function createCliTestEnv(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  // Working directory (where specweave init runs)
  const workDir = path.join(
    os.tmpdir(),
    `specweave-cli-${testName}-${timestamp}-${random}`
  );
  await fs.mkdir(workDir, { recursive: true });

  // Isolated home (prevents touching real ~/.specweave/)
  const homeDir = path.join(
    os.tmpdir(),
    `specweave-home-${testName}-${timestamp}-${random}`
  );
  await fs.mkdir(homeDir, { recursive: true });
  await fs.mkdir(path.join(homeDir, '.specweave'), { recursive: true });
  await fs.mkdir(path.join(homeDir, '.claude'), { recursive: true });

  const cleanup = async () => {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(homeDir, { recursive: true, force: true }).catch(() => {});
  };

  return { workDir, homeDir, cleanup };
}

describe('SpecWeave CLI Commands', { timeout: CLI_TIMEOUT }, () => {
  let workDir: string;
  let homeDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createCliTestEnv('cli-test');
    workDir = env.workDir;
    homeDir = env.homeDir;
    cleanup = env.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('Version and Help', () => {
    it('should show version with --version flag', async () => {
      const { stdout } = await execAsync(
        `node "${specweaveBin}" --version`,
        { env: getIsolatedEnv(homeDir) }
      );

      const version = normalizeOutput(stdout);
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should show help with --help flag', async () => {
      const { stdout } = await execAsync(
        `node "${specweaveBin}" --help`,
        { env: getIsolatedEnv(homeDir) }
      );

      const output = normalizeOutput(stdout);
      expect(output).toContain('specweave');
      expect(output).toContain('init');
    });

    it('should exit with code 0 for --version', async () => {
      // If execAsync doesn't throw, exit code was 0
      const { stdout } = await execAsync(
        `node "${specweaveBin}" --version`,
        { env: getIsolatedEnv(homeDir) }
      );
      const version = normalizeOutput(stdout);
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Init Command', () => {
    it('should initialize project with specweave init', async () => {
      await execAsync(
        `node "${specweaveBin}" init --adapter=claude --language=en`,
        {
          cwd: workDir,
          env: getIsolatedEnv(homeDir, { CI: 'true' }),
        }
      );

      // Verify .specweave/ directory created
      const specweaveDir = path.join(workDir, '.specweave');
      const stat = await fs.stat(specweaveDir);
      expect(stat.isDirectory()).toBe(true);

      // Verify config.json exists and is valid JSON
      const configPath = path.join(specweaveDir, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('project');

      // Verify increments/ directory created
      const incrementsDir = path.join(specweaveDir, 'increments');
      const incStat = await fs.stat(incrementsDir);
      expect(incStat.isDirectory()).toBe(true);
    });

    it('should create docs directory structure', async () => {
      await execAsync(
        `node "${specweaveBin}" init --adapter=claude --language=en`,
        {
          cwd: workDir,
          env: getIsolatedEnv(homeDir, { CI: 'true' }),
        }
      );

      const docsDir = path.join(workDir, '.specweave', 'docs');
      const stat = await fs.stat(docsDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should set correct adapter in config', async () => {
      await execAsync(
        `node "${specweaveBin}" init --adapter=claude --language=en`,
        {
          cwd: workDir,
          env: getIsolatedEnv(homeDir, { CI: 'true' }),
        }
      );

      const configPath = path.join(workDir, '.specweave', 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.adapters?.default).toBe('claude');
      expect(config.language).toBe('en');
    });

    it('should not hang in CI mode (non-interactive)', async () => {
      // This test verifies that CI=true prevents interactive prompts
      // If it hangs, the timeout will catch it
      await execAsync(
        `node "${specweaveBin}" init --adapter=claude --language=en`,
        {
          cwd: workDir,
          env: getIsolatedEnv(homeDir, { CI: 'true' }),
          timeout: 20000,
        }
      );

      // Verify init produced correct structure (not just "something was printed")
      const specweaveDir = path.join(workDir, '.specweave');
      const stat = await fs.stat(specweaveDir);
      expect(stat.isDirectory()).toBe(true);

      const configPath = path.join(specweaveDir, 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config).toHaveProperty('project');
      expect(config.adapters?.default).toBe('claude');
    });
  });

  describe('Error Handling', () => {
    it('should exit with non-zero for unknown command', async () => {
      try {
        await execAsync(
          `node "${specweaveBin}" nonexistent-command-xyz`,
          { env: getIsolatedEnv(homeDir) }
        );
        // Should not reach here
        expect.unreachable('Expected command to fail');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });
  });
});
