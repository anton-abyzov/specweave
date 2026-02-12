/**
 * Unit tests for the save command
 *
 * Tests executeSave() by creating real temp git repos.
 * No network access - uses --no-push and local-only repos.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import * as fs from 'fs/promises';
import os from 'os';
import { executeSave } from '../../../../src/cli/commands/save.js';
import { Logger } from '../../../../src/utils/logger.js';

const execAsync = promisify(exec);

/** Collect log output for assertions */
function createTestLogger(): { logger: Logger; output: string[] } {
  const output: string[] = [];
  const logger: Logger = {
    log: (msg: string) => output.push(msg),
    error: (msg: string) => output.push(`ERROR: ${msg}`),
    warn: (msg: string) => output.push(`WARN: ${msg}`),
    debug: (msg: string) => output.push(`DEBUG: ${msg}`),
    verbose: (msg: string) => output.push(`VERBOSE: ${msg}`),
  };
  return { logger, output };
}

/** Create isolated git repo for save command tests */
async function createSaveTestRepo(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const repoDir = path.join(os.tmpdir(), `sw-save-test-${testName}-${timestamp}-${random}`);
  await fs.mkdir(repoDir, { recursive: true });

  // Strip NODE_OPTIONS for child process safety
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;

  await execAsync('git init', { cwd: repoDir, env: cleanEnv });
  await execAsync('git config user.email "test@specweave.dev"', { cwd: repoDir, env: cleanEnv });
  await execAsync('git config user.name "Test"', { cwd: repoDir, env: cleanEnv });

  // Initial commit
  await fs.writeFile(path.join(repoDir, '.gitkeep'), '');
  await execAsync('git add -A && git commit -m "init"', { cwd: repoDir, env: cleanEnv });

  const cleanup = async () => {
    await fs.rm(repoDir, { recursive: true, force: true }).catch(() => {});
  };

  return { repoDir, cleanup, cleanEnv };
}

describe('save command', () => {
  let repoDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const ctx = await createSaveTestRepo('save');
    repoDir = ctx.repoDir;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should commit with custom message', async () => {
    await fs.writeFile(path.join(repoDir, 'feature.ts'), 'export const x = 1;\n');

    const { logger, output } = createTestLogger();
    await executeSave({
      message: 'feat: custom message',
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const log = output.join('\n');
    expect(log).toContain('SUMMARY');

    // Verify commit exists
    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout).toContain('feat: custom message');
  });

  it('should auto-generate commit message for source files', async () => {
    await fs.writeFile(path.join(repoDir, 'app.ts'), 'const y = 2;\n');

    const { logger, output } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const log = output.join('\n');
    expect(log).toContain('Auto:');

    // Commit should exist with conventional format
    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout.trim()).toMatch(/^[a-f0-9]+ (feat|chore|docs|test)/);
  });

  it('should auto-generate docs commit for markdown files', async () => {
    await fs.mkdir(path.join(repoDir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(repoDir, 'docs', 'guide.md'), '# Guide\n');

    const { logger } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout.trim()).toMatch(/^[a-f0-9]+ docs/);
  });

  it('should auto-generate test commit for test files', async () => {
    await fs.mkdir(path.join(repoDir, 'tests'), { recursive: true });
    await fs.writeFile(path.join(repoDir, 'tests', 'app.test.ts'), 'test("x", () => {});\n');

    const { logger } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout.trim()).toMatch(/^[a-f0-9]+ test/);
  });

  it('should skip when no changes', async () => {
    const { logger, output } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const log = output.join('\n');
    // Should mention skipping or no changes
    expect(log).toMatch(/skip|no changes|Skipped/i);
  });

  it('should handle dry-run mode', async () => {
    await fs.writeFile(path.join(repoDir, 'dry.ts'), 'export const dry = true;\n');

    const { logger, output } = createTestLogger();
    await executeSave({
      dryRun: true,
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const log = output.join('\n');
    expect(log).toContain('DRY RUN');
    expect(log).toContain('Would:');

    // Verify NO actual commit was created
    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout.trim()).toMatch(/^[a-f0-9]+ init$/);
  });

  it('should handle deleted files', async () => {
    // Create and commit a file
    await fs.writeFile(path.join(repoDir, 'to-delete.ts'), 'export const gone = true;\n');
    await execAsync('git add -A && git commit -m "add file"', { cwd: repoDir });

    // Delete it
    await fs.rm(path.join(repoDir, 'to-delete.ts'));

    const { logger } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    // Should have created a commit
    const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
    expect(stdout.trim()).not.toMatch(/^[a-f0-9]+ add file$/);
  });

  it('should handle mixed file categories', async () => {
    await fs.writeFile(path.join(repoDir, 'feature.ts'), 'export const a = 1;\n');
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Readme\n');
    await fs.writeFile(path.join(repoDir, 'package.json'), '{"name":"test"}\n');

    const { logger, output } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const log = output.join('\n');
    expect(log).toContain('SUMMARY');
    expect(log).toContain('Saved');
  });

  it('should leave working directory clean after save', async () => {
    await fs.writeFile(path.join(repoDir, 'clean.ts'), 'clean();\n');

    const { logger } = createTestLogger();
    await executeSave({
      noPush: true,
      logger,
      projectRoot: repoDir,
    });

    const { stdout } = await execAsync('git status --porcelain', { cwd: repoDir });
    expect(stdout.trim()).toBe('');
  });
});
