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

  test('should create and populate .claude/commands directory', async () => {
    // Verify .claude/commands exists
    const commandsDir = path.join(TEST_DIR, '.claude/commands');
    expect(await fs.pathExists(commandsDir)).toBe(true);

    // Verify it contains .md files
    const files = await fs.readdir(commandsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    expect(mdFiles.length).toBeGreaterThan(10);
    expect(mdFiles).toContain('specweave.do.md');
    expect(mdFiles).toContain('specweave.inc.md');
    expect(mdFiles).toContain('specweave.progress.md');
  });

  test('should create and populate .claude/agents directory', async () => {
    // Verify .claude/agents exists
    const agentsDir = path.join(TEST_DIR, '.claude/agents');
    expect(await fs.pathExists(agentsDir)).toBe(true);

    // Verify it contains agent subdirectories
    const dirs = await fs.readdir(agentsDir, { withFileTypes: true });
    const agentDirs = dirs.filter(d => d.isDirectory());

    expect(agentDirs.length).toBeGreaterThan(8);
    expect(agentDirs.some(d => d.name === 'pm')).toBe(true);
    expect(agentDirs.some(d => d.name === 'architect')).toBe(true);
    expect(agentDirs.some(d => d.name === 'devops')).toBe(true);

    // Verify each agent has AGENT.md
    for (const dir of agentDirs) {
      const agentMdPath = path.join(agentsDir, dir.name, 'AGENT.md');
      expect(await fs.pathExists(agentMdPath)).toBe(true);
    }
  });

  test('should create and populate .claude/skills directory', async () => {
    // Verify .claude/skills exists
    const skillsDir = path.join(TEST_DIR, '.claude/skills');
    expect(await fs.pathExists(skillsDir)).toBe(true);

    // Verify it contains skill subdirectories
    const dirs = await fs.readdir(skillsDir, { withFileTypes: true });
    const skillDirs = dirs.filter(d => d.isDirectory());

    expect(skillDirs.length).toBeGreaterThan(30);
    expect(skillDirs.some(d => d.name === 'increment-planner')).toBe(true);
    expect(skillDirs.some(d => d.name === 'context-loader')).toBe(true);

    // Verify each skill has SKILL.md
    for (const dir of skillDirs) {
      const skillMdPath = path.join(skillsDir, dir.name, 'SKILL.md');
      expect(await fs.pathExists(skillMdPath)).toBe(true);
    }
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
