/**
 * E2E test for default Claude adapter behavior
 *
 * Tests that `specweave init .` defaults to claude adapter
 * and installs .claude/ files correctly
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to local CLI (use this instead of global 'specweave' command)
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'bin/specweave.js');

test.describe('specweave init - default claude adapter', () => {
  let TEST_DIR: string;

  test.beforeEach(async ({ }, testInfo) => {
    // Create unique directory in fixtures (NOT project root!)
    TEST_DIR = path.join(__dirname, '../fixtures/e2e-init-claude', `test-${testInfo.workerIndex}-${Date.now()}`);

    // Clean up and create test directory
    await fs.remove(TEST_DIR);
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  test.afterEach(async () => {
    // Clean up test directory
    await fs.remove(TEST_DIR);
  });

  test('should default to claude adapter when no --adapter flag provided', async () => {
    // Run init without --adapter flag (using local CLI)
    const output = execSync(`node "${CLI_PATH}" init .`, {
      cwd: TEST_DIR,
      encoding: 'utf-8'
    });

    // Verify output mentions "claude" and NOT "generic"
    expect(output).toContain('claude');
    expect(output).not.toContain('generic (manual automation)');
  });

  test('should create .claude/settings.json with marketplace config', async () => {
    // Verify .claude/settings.json exists (marketplace registration)
    const settingsPath = path.join(TEST_DIR, '.claude/settings.json');
    expect(await fs.pathExists(settingsPath)).toBe(true);

    // Verify it contains marketplace config with correct GitHub object format
    const settings = await fs.readJson(settingsPath);
    expect(settings.extraKnownMarketplaces).toBeDefined();
    expect(settings.extraKnownMarketplaces.specweave).toBeDefined();
    expect(settings.extraKnownMarketplaces.specweave.source).toBeDefined();
    expect(settings.extraKnownMarketplaces.specweave.source.source).toBe('github');
    expect(settings.extraKnownMarketplaces.specweave.source.repo).toBe('anton-abyzov/specweave');
    expect(settings.extraKnownMarketplaces.specweave.source.path).toBe('.claude-plugin');
  });



  test('should create .specweave directory structure', async () => {
    const specweaveDir = path.join(TEST_DIR, '.specweave');
    expect(await fs.pathExists(specweaveDir)).toBe(true);

    // Verify subdirectories
    expect(await fs.pathExists(path.join(specweaveDir, 'increments'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveDir, 'docs/internal/strategy'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveDir, 'docs/internal/architecture'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveDir, 'docs/public'))).toBe(true);
  });

  test('should create CLAUDE.md and AGENTS.md', async () => {
    expect(await fs.pathExists(path.join(TEST_DIR, 'CLAUDE.md'))).toBe(true);
    expect(await fs.pathExists(path.join(TEST_DIR, 'AGENTS.md'))).toBe(true);
  });

  test('should initialize git repository', async () => {
    const gitDir = path.join(TEST_DIR, '.git');
    expect(await fs.pathExists(gitDir)).toBe(true);
  });
});

test.describe('specweave init - explicit adapter flags', () => {
  let GENERIC_TEST_DIR: string;
  let CLAUDE_TEST_DIR: string;

  test.beforeEach(async ({ }, testInfo) => {
    // Create unique directories in fixtures (NOT project root!)
    GENERIC_TEST_DIR = path.join(__dirname, '../fixtures/e2e-init-generic', `test-${testInfo.workerIndex}-${Date.now()}`);
    CLAUDE_TEST_DIR = path.join(__dirname, '../fixtures/e2e-init-explicit-claude', `test-${testInfo.workerIndex}-${Date.now()}`);

    await fs.remove(GENERIC_TEST_DIR);
    await fs.remove(CLAUDE_TEST_DIR);
    await fs.mkdir(GENERIC_TEST_DIR, { recursive: true });
    await fs.mkdir(CLAUDE_TEST_DIR, { recursive: true });
  });

  test.afterEach(async () => {
    await fs.remove(GENERIC_TEST_DIR);
    await fs.remove(CLAUDE_TEST_DIR);
  });

  test('should use generic adapter when explicitly requested', async () => {
    // Run init with --adapter generic (using local CLI)
    const output = execSync(`node "${CLI_PATH}" init . --adapter generic`, {
      cwd: GENERIC_TEST_DIR,
      encoding: 'utf-8'
    });

    // Verify output mentions "generic"
    expect(output).toContain('generic');
    expect(output).toContain('Universal AI Tool Compatibility');
  });

  test('should use claude adapter when explicitly requested', async () => {
    // CLAUDE_TEST_DIR is now created in beforeEach (no more root pollution!)

    // Run init with --adapter claude (using local CLI)
    const output = execSync(`node "${CLI_PATH}" init . --adapter claude`, {
      cwd: CLAUDE_TEST_DIR,
      encoding: 'utf-8'
    });

    // Verify output mentions "claude"
    expect(output).toContain('claude');
    expect(output).toContain('Installing Claude Code components');

    // Verify .claude/ directories are populated
    const commandsDir = path.join(CLAUDE_TEST_DIR, '.claude/commands');
    const files = await fs.readdir(commandsDir);
    expect(files.length).toBeGreaterThan(10);

    await fs.remove(CLAUDE_TEST_DIR);
  });
});
