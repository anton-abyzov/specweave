/**
 * SpecWeave E2E Test Suite
 * Tests CLI commands end-to-end
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from '../../../src/utils/fs-native.js';
import os from 'os';
// CRITICAL: Import getCleanEnv to prevent NODE_OPTIONS debug flags from breaking child processes
import { getCleanEnv } from '../../../src/utils/clean-env.js';

const execAsync = promisify(exec);

describe('SpecWeave CLI E2E Tests', () => {
  let testDir: string;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const specweaveBin = path.join(__dirname, '../../bin/specweave.js');

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
  });

  afterEach(async () => {
    // Cleanup test directory
    if (testDir) {
      await fs.remove(testDir);
    }
  });

  it('should initialize project with specweave init', async () => {
    // Run: specweave init (CI mode via env var)
    const { stdout, stderr } = await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en`,
      {
        cwd: testDir,
        env: { ...getCleanEnv(), CI: 'true' }
      }
    );

    // Verify .specweave/ directory created
    const specweaveDir = path.join(testDir, '.specweave');
    expect(await fs.pathExists(specweaveDir)).toBe(true);

    // Verify config.json created
    const configPath = path.join(specweaveDir, 'config.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    // Verify config.json is valid JSON
    const config = await fs.readJson(configPath);
    expect(config).toHaveProperty('project');
    expect(config).toHaveProperty('hooks');

    // Verify increments/ directory created
    const incrementsDir = path.join(specweaveDir, 'increments');
    expect(await fs.pathExists(incrementsDir)).toBe(true);

    // Verify docs/ directory created
    const docsDir = path.join(specweaveDir, 'docs');
    expect(await fs.pathExists(docsDir)).toBe(true);
  });

  it('should show version with --version flag', async () => {
    const { stdout } = await execAsync(`node "${specweaveBin}" --version`);

    // Verify version format (e.g., "0.7.0")
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should show help with --help flag', async () => {
    const { stdout } = await execAsync(`node "${specweaveBin}" --help`);

    // Verify help output contains key commands
    expect(stdout).toContain('specweave');
    expect(stdout).toContain('init');
    expect(stdout).toContain('version');
  });

  it('should create correct directory structure', async () => {
    // Initialize project (CI mode via env var)
    await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en`,
      {
        cwd: testDir,
        env: { ...getCleanEnv(), CI: 'true' }
      }
    );

    const specweaveDir = path.join(testDir, '.specweave');

    // Verify internal docs structure
    const internalDocsDir = path.join(specweaveDir, 'docs', 'internal');
    expect(await fs.pathExists(path.join(internalDocsDir, 'specs'))).toBe(true);
    expect(await fs.pathExists(path.join(internalDocsDir, 'architecture'))).toBe(true);
    expect(await fs.pathExists(path.join(internalDocsDir, 'strategy'))).toBe(true);

    // Verify logs directory
    const logsDir = path.join(specweaveDir, 'logs');
    expect(await fs.pathExists(logsDir)).toBe(true);
  });

  it('should handle non-interactive mode correctly', async () => {
    // Run with CI env var (non-interactive mode)
    const { stdout, stderr } = await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en`,
      {
        cwd: testDir,
        env: { ...getCleanEnv(), CI: 'true' }
      }
    );

    // Should not hang waiting for input
    expect(stdout).toBeTruthy();

    // Should create .specweave/ without prompts
    const specweaveDir = path.join(testDir, '.specweave');
    expect(await fs.pathExists(specweaveDir)).toBe(true);
  });

  it('should validate config.json structure', async () => {
    // Initialize project (CI mode via env var)
    await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en`,
      {
        cwd: testDir,
        env: { ...getCleanEnv(), CI: 'true' }
      }
    );

    // Read config.json
    const configPath = path.join(testDir, '.specweave', 'config.json');
    const config = await fs.readJson(configPath);

    // Verify required fields
    expect(config).toHaveProperty('project.name');
    expect(config).toHaveProperty('adapters.default');
    expect(config.adapters.default).toBe('claude');
    expect(config).toHaveProperty('language');
    expect(config.language).toBe('en');

    // Verify hooks configuration
    expect(config).toHaveProperty('hooks.post_task_completion');
    expect(config.hooks.post_task_completion.sync_living_docs).toBe(true);
  });
});
