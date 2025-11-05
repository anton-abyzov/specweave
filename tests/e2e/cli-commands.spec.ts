/**
 * SpecWeave E2E Test Suite
 * Tests CLI commands end-to-end
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

const execAsync = promisify(exec);

test.describe('SpecWeave CLI E2E Tests', () => {
  let testDir: string;
  const specweaveBin = path.join(__dirname, '../../bin/specweave.js');

  test.beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
  });

  test.afterEach(async () => {
    // Cleanup test directory
    if (testDir) {
      await fs.remove(testDir);
    }
  });

  test('should initialize project with specweave init', async () => {
    // Run: specweave init --non-interactive
    const { stdout, stderr } = await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en --non-interactive`,
      { cwd: testDir }
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

  test('should show version with --version flag', async () => {
    const { stdout } = await execAsync(`node "${specweaveBin}" --version`);

    // Verify version format (e.g., "0.7.0")
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should show help with --help flag', async () => {
    const { stdout } = await execAsync(`node "${specweaveBin}" --help`);

    // Verify help output contains key commands
    expect(stdout).toContain('specweave');
    expect(stdout).toContain('init');
    expect(stdout).toContain('version');
  });

  test('should create correct directory structure', async () => {
    // Initialize project
    await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en --non-interactive`,
      { cwd: testDir }
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

  test('should handle non-interactive mode correctly', async () => {
    // Run with --non-interactive flag
    const { stdout, stderr } = await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en --non-interactive`,
      { cwd: testDir }
    );

    // Should not hang waiting for input
    expect(stdout).toBeTruthy();

    // Should create .specweave/ without prompts
    const specweaveDir = path.join(testDir, '.specweave');
    expect(await fs.pathExists(specweaveDir)).toBe(true);
  });

  test('should validate config.json structure', async () => {
    // Initialize project
    await execAsync(
      `node "${specweaveBin}" init --adapter=claude --language=en --non-interactive`,
      { cwd: testDir }
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
