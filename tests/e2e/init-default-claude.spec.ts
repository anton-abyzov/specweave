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

const TEST_DIR = path.join(process.cwd(), 'test-init-default-claude');

test.describe('specweave init - default claude adapter', () => {
  test.beforeAll(async () => {
    // Clean up test directory
    await fs.remove(TEST_DIR);
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    // Clean up test directory
    await fs.remove(TEST_DIR);
  });

  test('should default to claude adapter when no --adapter flag provided', async () => {
    // Run init without --adapter flag
    const output = execSync('specweave init .', {
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

    // Verify it contains marketplace config
    const settings = await fs.readJson(settingsPath);
    expect(settings.extraKnownMarketplaces).toBeDefined();
    expect(settings.extraKnownMarketplaces.specweave).toBeDefined();
    expect(settings.extraKnownMarketplaces.specweave.source).toContain('.claude-plugin');
  });

  test.skip('Plugin system: agents are NOT copied to .claude/ (installed globally)', async () => {
    // NOTE: As of v0.4.0+, SpecWeave uses Claude Code's native plugin system
    // Agents remain in plugins/specweave/agents/ and are installed globally
    // This test is kept for reference but skipped
  });

  test.skip('Plugin system: skills are NOT copied to .claude/ (installed globally)', async () => {
    // NOTE: As of v0.4.0+, SpecWeave uses Claude Code's native plugin system
    // Skills remain in plugins/specweave/skills/ and are installed globally
    // This test is kept for reference but skipped
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
  const GENERIC_TEST_DIR = path.join(process.cwd(), 'test-init-generic');

  test.beforeAll(async () => {
    await fs.remove(GENERIC_TEST_DIR);
    await fs.mkdir(GENERIC_TEST_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    await fs.remove(GENERIC_TEST_DIR);
  });

  test('should use generic adapter when explicitly requested', async () => {
    // Run init with --adapter generic
    const output = execSync('specweave init . --adapter generic', {
      cwd: GENERIC_TEST_DIR,
      encoding: 'utf-8'
    });

    // Verify output mentions "generic"
    expect(output).toContain('generic');
    expect(output).toContain('Universal AI Tool Compatibility');
  });

  test('should use claude adapter when explicitly requested', async () => {
    const CLAUDE_TEST_DIR = path.join(process.cwd(), 'test-init-explicit-claude');

    await fs.remove(CLAUDE_TEST_DIR);
    await fs.mkdir(CLAUDE_TEST_DIR, { recursive: true });

    // Run init with --adapter claude
    const output = execSync('specweave init . --adapter claude', {
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
