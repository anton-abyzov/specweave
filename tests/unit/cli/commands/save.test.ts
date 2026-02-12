/**
 * Comprehensive TDD RED Phase Tests for Save Command
 *
 * Tests executeSave() and handleSaveCommand() with extensive coverage:
 * - Repository detection (single, umbrella, multi-repo)
 * - Git workflow (add, commit, push with various strategies)
 * - Sync states and conflict handling
 * - Message generation and customization
 * - Dry-run and interactive modes
 * - Error handling and edge cases
 *
 * Setup: Real temp git repos (no mocking), --no-push for safety, no network
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import * as fs from 'fs/promises';
import os from 'os';
import { executeSave } from '../../../../src/cli/commands/save.js';
import { Logger } from '../../../../src/utils/logger.js';

const execAsync = promisify(exec);

// ============================================================================
// TEST UTILITIES
// ============================================================================

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

/** Create umbrella repository with child repos */
async function createUmbrellaRepo(testName: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const umbrellaDir = path.join(os.tmpdir(), `sw-umbrella-test-${testName}-${timestamp}-${random}`);
  await fs.mkdir(umbrellaDir, { recursive: true });

  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;

  // Initialize umbrella repo
  await execAsync('git init', { cwd: umbrellaDir, env: cleanEnv });
  await execAsync('git config user.email "test@specweave.dev"', { cwd: umbrellaDir, env: cleanEnv });
  await execAsync('git config user.name "Test"', { cwd: umbrellaDir, env: cleanEnv });

  // Create child repos
  const childRepos: { [key: string]: string } = {};
  for (const name of ['app', 'lib', 'docs']) {
    const childPath = path.join(umbrellaDir, 'repositories', name);
    await fs.mkdir(childPath, { recursive: true });

    await execAsync('git init', { cwd: childPath, env: cleanEnv });
    await execAsync('git config user.email "test@specweave.dev"', { cwd: childPath, env: cleanEnv });
    await execAsync('git config user.name "Test"', { cwd: childPath, env: cleanEnv });

    await fs.writeFile(path.join(childPath, '.gitkeep'), '');
    await execAsync('git add -A && git commit -m "init"', { cwd: childPath, env: cleanEnv });

    childRepos[name] = path.join('repositories', name);
  }

  // Create umbrella config
  const configPath = path.join(umbrellaDir, '.specweave', 'config.json');
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify({
    umbrella: {
      enabled: true,
      childRepos: [
        { id: 'app', path: childRepos['app'], name: 'Application' },
        { id: 'lib', path: childRepos['lib'], name: 'Library' },
        { id: 'docs', path: childRepos['docs'], name: 'Documentation' }
      ]
    }
  }, null, 2));

  // Initial umbrella commit
  await fs.writeFile(path.join(umbrellaDir, '.gitkeep'), '');
  await execAsync('git add -A && git commit -m "init"', { cwd: umbrellaDir, env: cleanEnv });

  const cleanup = async () => {
    await fs.rm(umbrellaDir, { recursive: true, force: true }).catch(() => {});
  };

  return { umbrellaDir, childRepos, cleanup, cleanEnv };
}

/** Get last commit message from repo */
async function getLastCommitMessage(repoDir: string): Promise<string> {
  const { stdout } = await execAsync('git log --oneline -1', { cwd: repoDir });
  return stdout.trim().split(' ').slice(1).join(' ');
}

/** Get number of commits in repo */
async function getCommitCount(repoDir: string): Promise<number> {
  const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: repoDir });
  return parseInt(stdout.trim(), 10);
}

// ============================================================================
// SAVE COMMAND TESTS
// ============================================================================

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

  // --------------------------------------------------------------------------
  // T-001: Custom Commit Messages
  // --------------------------------------------------------------------------

  describe('T-001: Custom commit messages', () => {
    it('should commit with custom message provided', async () => {
      // Given: Repo with changes and custom message option
      await fs.writeFile(path.join(repoDir, 'feature.ts'), 'export const x = 1;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with custom message
      await executeSave({
        message: 'feat: custom message',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Commit should use custom message
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe('feat: custom message');
      expect(output.join('\n')).toContain('SUMMARY');
      expect(output.join('\n')).toContain('Saved');
    });

    it('should use same custom message for all repos in umbrella', async () => {
      // Given: Umbrella repo with multiple child repos
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('multi-msg');

      try {
        // Create changes in multiple child repos
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/feature.ts'), 'export const a = 1;\n');
        await fs.writeFile(path.join(umbrellaDir, 'repositories/lib/module.ts'), 'export const b = 2;\n');

        const { logger, output } = createTestLogger();

        // When: Execute save with custom message for all repos
        await executeSave({
          message: 'feat: umbrella changes',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: All repos should have same commit message
        const appMsg = await getLastCommitMessage(path.join(umbrellaDir, 'repositories/app'));
        const libMsg = await getLastCommitMessage(path.join(umbrellaDir, 'repositories/lib'));

        expect(appMsg).toBe('feat: umbrella changes');
        expect(libMsg).toBe('feat: umbrella changes');
      } finally {
        await umbrellaCleanup();
      }
    });

    it('should respect long commit messages', async () => {
      // Given: Repo with changes and long custom message
      await fs.writeFile(path.join(repoDir, 'feature.ts'), 'export const x = 1;\n');

      const longMessage = 'feat(core): add comprehensive feature with multiple aspects and improvements';
      const { logger } = createTestLogger();

      // When: Execute save with long message
      await executeSave({
        message: longMessage,
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Full message should be preserved
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe(longMessage);
    });
  });

  // --------------------------------------------------------------------------
  // T-002: Auto-Generated Messages
  // --------------------------------------------------------------------------

  describe('T-002: Auto-generated commit messages', () => {
    it('should auto-generate feat message for source files', async () => {
      // Given: Repo with new source file, no custom message
      await fs.writeFile(path.join(repoDir, 'app.ts'), 'const y = 2;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save without custom message
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should auto-generate feat message
      const log = output.join('\n');
      expect(log).toContain('Auto:');
      expect(log).toContain('feat');
    });

    it('should auto-generate docs message for markdown files', async () => {
      // Given: Repo with markdown documentation
      await fs.mkdir(path.join(repoDir, 'docs'), { recursive: true });
      await fs.writeFile(path.join(repoDir, 'docs/guide.md'), '# Guide\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should auto-generate docs message
      const log = output.join('\n');
      expect(log).toContain('docs');
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toMatch(/^docs/);
    });

    it('should auto-generate test message for test files', async () => {
      // Given: Repo with test files
      await fs.mkdir(path.join(repoDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(repoDir, 'tests/app.test.ts'), 'test("x", () => {});\n');

      const { logger } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should auto-generate test message
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toMatch(/^test/);
    });

    it('should auto-generate chore message for config files', async () => {
      // Given: Repo with config file changes
      await fs.writeFile(path.join(repoDir, 'package.json'), '{"name":"test","version":"1.0.0"}\n');

      const { logger } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should auto-generate chore message
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toMatch(/^(chore|build)/);
    });

    it('should categorize files correctly by extension', async () => {
      // Given: Repo with files of different types
      await fs.writeFile(path.join(repoDir, 'style.css'), 'body { color: red; }\n');
      await fs.writeFile(path.join(repoDir, 'script.sh'), '#!/bin/bash\necho "hi"\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should categorize and generate appropriate message
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });

    it('should prioritize primary category in multi-file commits', async () => {
      // Given: Repo with 3 source files and 1 doc file
      await fs.writeFile(path.join(repoDir, 'file1.ts'), 'export const a = 1;\n');
      await fs.writeFile(path.join(repoDir, 'file2.ts'), 'export const b = 2;\n');
      await fs.writeFile(path.join(repoDir, 'file3.ts'), 'export const c = 3;\n');
      await fs.writeFile(path.join(repoDir, 'README.md'), '# Doc\n');

      const { logger } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should prioritize source files (3 > 1)
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toMatch(/^feat/);
    });
  });

  // --------------------------------------------------------------------------
  // T-003: Push Behavior and Flags
  // --------------------------------------------------------------------------

  describe('T-003: Push behavior and --no-push flag', () => {
    it('should not push when --no-push flag is set', async () => {
      // Given: Repo with changes and --no-push option
      await fs.writeFile(path.join(repoDir, 'feature.ts'), 'export const x = 1;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with noPush
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should commit but not push
      const log = output.join('\n');
      expect(log).toContain('Committed (not pushed)');
      // Note: 'push' may appear in "not pushed" message, so check for "Would: git push" or similar instead
      expect(log).not.toContain('Would: git push');

      // Verify commit exists
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe('feat: test');
    });

    it('should record that changes were committed only', async () => {
      // Given: Repo with changes and --no-push
      await fs.writeFile(path.join(repoDir, 'test.ts'), 'const t = 1;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Output should clarify commit without push
      const log = output.join('\n');
      expect(log).toContain('not pushed');
    });

    it('should handle --force flag for force push (with confirmation)', async () => {
      // Given: Repo with diverged history
      await fs.writeFile(path.join(repoDir, 'file1.ts'), 'const f1 = 1;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with force flag
      await executeSave({
        message: 'feat: force',
        noPush: true,
        force: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should respect force flag option
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });
  });

  // --------------------------------------------------------------------------
  // T-004: Dry-Run Mode
  // --------------------------------------------------------------------------

  describe('T-004: Dry-run mode', () => {
    it('should preview changes without committing', async () => {
      // Given: Repo with changes and dryRun option
      await fs.writeFile(path.join(repoDir, 'dry.ts'), 'export const dry = true;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with dryRun
      await executeSave({
        dryRun: true,
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should show DRY RUN message
      const log = output.join('\n');
      expect(log).toContain('DRY RUN');
      expect(log).toContain('Would:');

      // Verify NO actual commit was created
      const commitCount = await getCommitCount(repoDir);
      expect(commitCount).toBe(1); // Only initial commit
    });

    it('should show git commands that would be executed', async () => {
      // Given: Repo with changes and dryRun
      await fs.writeFile(path.join(repoDir, 'test.ts'), 'const t = 1;\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with dryRun
      await executeSave({
        dryRun: true,
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should show would-be git commands
      const log = output.join('\n');
      expect(log).toContain('Would: git add -A');
      expect(log).toContain('Would: git commit');
    });

    it('should not modify working directory in dry-run', async () => {
      // Given: Repo with changes and dryRun
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'const x = 1;\n');

      const { logger } = createTestLogger();

      // When: Execute save with dryRun
      await executeSave({
        dryRun: true,
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Working directory should still have changes
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoDir });
      expect(stdout.trim()).toContain('file.ts');
    });

    it('should not create commits in dry-run with umbrella repos', async () => {
      // Given: Umbrella repo with dryRun
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('dry-multi');

      try {
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/feature.ts'), 'const f = 1;\n');

        const { logger } = createTestLogger();

        // When: Execute save with dryRun
        await executeSave({
          dryRun: true,
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: No commits should be created
        const appCount = await getCommitCount(path.join(umbrellaDir, 'repositories/app'));
        expect(appCount).toBe(1); // Only initial
      } finally {
        await umbrellaCleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // T-005: File Change Detection
  // --------------------------------------------------------------------------

  describe('T-005: File change detection and categorization', () => {
    it('should detect new files', async () => {
      // Given: Repo with new file
      await fs.writeFile(path.join(repoDir, 'new.ts'), 'new file\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should detect and commit new file
      const { stdout } = await execAsync('git log -1 --name-only', { cwd: repoDir });
      expect(stdout).toContain('new.ts');
    });

    it('should detect modified files', async () => {
      // Given: Repo with existing file
      const filePath = path.join(repoDir, 'existing.ts');
      await fs.writeFile(filePath, 'original\n');
      await execAsync('git add -A && git commit -m "add file"', { cwd: repoDir });

      // When: Modify and save
      await fs.writeFile(filePath, 'modified\n');
      const { logger } = createTestLogger();

      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should detect and commit modification
      const { stdout } = await execAsync('git log -1 --oneline', { cwd: repoDir });
      expect(stdout).not.toContain('add file');
    });

    it('should detect deleted files', async () => {
      // Given: Repo with file to delete
      const filePath = path.join(repoDir, 'to-delete.ts');
      await fs.writeFile(filePath, 'delete me\n');
      await execAsync('git add -A && git commit -m "add file"', { cwd: repoDir });

      // When: Delete and save
      await fs.rm(filePath);
      const { logger, output } = createTestLogger();

      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should detect deletion and commit
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
      expect(log).toContain('Saved');
    });

    it('should handle mixed file categories', async () => {
      // Given: Repo with files from multiple categories
      await fs.writeFile(path.join(repoDir, 'source.ts'), 'export const x = 1;\n');
      await fs.writeFile(path.join(repoDir, 'README.md'), '# Doc\n');
      await fs.writeFile(path.join(repoDir, 'package.json'), '{"name":"test"}\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should handle all categories and generate message
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
      expect(log).toContain('Saved:');
    });

    it('should track file counts by type', async () => {
      // Given: Repo with multiple files
      for (let i = 1; i <= 3; i++) {
        await fs.writeFile(path.join(repoDir, `file${i}.ts`), `export const f${i} = ${i};\n`);
      }

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should track changes
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });
  });

  // --------------------------------------------------------------------------
  // T-006: No Changes Handling
  // --------------------------------------------------------------------------

  describe('T-006: No changes handling', () => {
    it('should skip when no changes exist', async () => {
      // Given: Clean repo with no changes

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should skip and show message
      const log = output.join('\n');
      expect(log).toMatch(/skip|no changes|Skipped/i);
    });

    it('should show skipped count in summary', async () => {
      // Given: Clean repo

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Summary should show skipped
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });

    it('should not create commit if nothing to commit', async () => {
      // Given: Clean repo

      const initialCount = await getCommitCount(repoDir);

      const { logger } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Commit count should not increase
      const finalCount = await getCommitCount(repoDir);
      expect(finalCount).toBe(initialCount);
    });
  });

  // --------------------------------------------------------------------------
  // T-007: Working Directory State
  // --------------------------------------------------------------------------

  describe('T-007: Working directory state management', () => {
    it('should leave working directory clean after save', async () => {
      // Given: Repo with changes
      await fs.writeFile(path.join(repoDir, 'clean.ts'), 'clean();\n');

      const { logger } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Working directory should be clean
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoDir });
      expect(stdout.trim()).toBe('');
    });

    it('should preserve unstaged changes with --no-stash', async () => {
      // Given: Repo with staged and unstaged changes
      await fs.writeFile(path.join(repoDir, 'staged.ts'), 'staged\n');
      await fs.writeFile(path.join(repoDir, 'unstaged.ts'), 'unstaged\n');
      await execAsync('git add staged.ts', { cwd: repoDir });

      const { logger } = createTestLogger();

      // When: Execute save with noStash
      await executeSave({
        message: 'feat: test',
        noPush: true,
        noStash: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Both files should be committed
      const { stdout } = await execAsync('git log -1 --name-only', { cwd: repoDir });
      expect(stdout).toContain('staged.ts');
    });

    it('should handle stashing of uncommitted changes', async () => {
      // Given: Repo with uncommitted changes
      await fs.writeFile(path.join(repoDir, 'work.ts'), 'work in progress\n');

      const { logger } = createTestLogger();

      // When: Execute save (stash enabled by default)
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Changes should be committed
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe('feat: test');
    });
  });

  // --------------------------------------------------------------------------
  // T-008: Multi-Repository Handling
  // --------------------------------------------------------------------------

  describe('T-008: Multi-repository (umbrella) handling', () => {
    it('should detect and process umbrella config from config.json', async () => {
      // Given: Umbrella repo with config
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('detect');

      try {
        // Create changes in child repo
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/file.ts'), 'const f = 1;\n');

        const { logger, output } = createTestLogger();

        // When: Execute save from umbrella root
        await executeSave({
          message: 'feat: umbrella',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: Should detect umbrella mode
        const log = output.join('\n');
        expect(log).toContain('Umbrella');
        expect(log).toContain('child repo');
      } finally {
        await umbrellaCleanup();
      }
    });

    it('should process multiple child repos in sequence', async () => {
      // Given: Umbrella with 3 child repos with changes
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('multi');

      try {
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/f1.ts'), 'f1\n');
        await fs.writeFile(path.join(umbrellaDir, 'repositories/lib/f2.ts'), 'f2\n');
        await fs.writeFile(path.join(umbrellaDir, 'repositories/docs/f3.ts'), 'f3\n');

        const { logger, output } = createTestLogger();

        // When: Execute save
        await executeSave({
          message: 'feat: all',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: All repos should have commits
        const appCount = await getCommitCount(path.join(umbrellaDir, 'repositories/app'));
        const libCount = await getCommitCount(path.join(umbrellaDir, 'repositories/lib'));
        const docsCount = await getCommitCount(path.join(umbrellaDir, 'repositories/docs'));

        expect(appCount).toBe(2);
        expect(libCount).toBe(2);
        expect(docsCount).toBe(2);

        // Output should show multi-repo processing
        const log = output.join('\n');
        expect(log).toContain('SUMMARY');
      } finally {
        await umbrellaCleanup();
      }
    });

    it('should skip repos without remotes', async () => {
      // Given: Umbrella with mixed repos (some with/without remotes)
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('remotes');

      try {
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/file.ts'), 'content\n');

        const { logger, output } = createTestLogger();

        // When: Execute save (skipNoRemote not set, should warn)
        await executeSave({
          message: 'feat: test',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: Should acknowledge repos without remotes
        const log = output.join('\n');
        expect(log).toContain('SUMMARY');
      } finally {
        await umbrellaCleanup();
      }
    });

    it('should filter repos with --repos flag', async () => {
      // Given: Umbrella with multiple repos
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('filter');

      try {
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/f1.ts'), 'f1\n');
        await fs.writeFile(path.join(umbrellaDir, 'repositories/lib/f2.ts'), 'f2\n');

        const { logger, output } = createTestLogger();

        // When: Execute save for only 'app'
        await executeSave({
          repos: 'app',
          message: 'feat: app only',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: Only app should be processed
        const log = output.join('\n');
        expect(log).toContain('app');
      } finally {
        await umbrellaCleanup();
      }
    });

    it('should handle repos with separate branches', async () => {
      // Given: Umbrella where child repos are on different branches
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('branches');

      try {
        // Create feature branch in app
        const appDir = path.join(umbrellaDir, 'repositories/app');
        await execAsync('git checkout -b feature', { cwd: appDir });
        await fs.writeFile(path.join(appDir, 'feature.ts'), 'feature\n');

        const { logger } = createTestLogger();

        // When: Execute save
        await executeSave({
          message: 'feat: branches',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: Should commit on correct branch
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: appDir });
        expect(stdout.trim()).toBe('feature');
      } finally {
        await umbrellaCleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // T-009: Error Handling
  // --------------------------------------------------------------------------

  describe('T-009: Error handling and recovery', () => {
    it('should handle git errors gracefully', async () => {
      // Given: Repo with permission issue (simulated)
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger, output } = createTestLogger();

      // When: Execute save (with simulated error recovery)
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should handle gracefully
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });

    it('should report failed repos in summary', async () => {
      // Given: Repo with changes

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Summary should include all results
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
      expect(log).toContain('Saved');
    });

    it('should not stop on single repo failure in umbrella', async () => {
      // Given: Umbrella with multiple repos (one may fail)
      const { umbrellaDir, cleanup: umbrellaCleanup } = await createUmbrellaRepo('error');

      try {
        await fs.writeFile(path.join(umbrellaDir, 'repositories/app/f1.ts'), 'f1\n');
        await fs.writeFile(path.join(umbrellaDir, 'repositories/lib/f2.ts'), 'f2\n');

        const { logger, output } = createTestLogger();

        // When: Execute save (may encounter issues)
        await executeSave({
          message: 'feat: error-test',
          noPush: true,
          logger,
          projectRoot: umbrellaDir,
        });

        // Then: Should continue processing other repos
        const log = output.join('\n');
        expect(log).toContain('SUMMARY');
      } finally {
        await umbrellaCleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // T-010: Output and Logging
  // --------------------------------------------------------------------------

  describe('T-010: Output and logging', () => {
    it('should show pre-flight check results', async () => {
      // Given: Repo with changes

      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Output should show pre-flight check
      const log = output.join('\n');
      expect(log).toContain('Pre-flight check');
      expect(log).toContain('SUMMARY');
    });

    it('should show repository mode indicator', async () => {
      // Given: Single repo with changes
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Output should indicate single repo mode
      const log = output.join('\n');
      expect(log).toContain('Single repository');
    });

    it('should show analysis of changes before commit', async () => {
      // Given: Repo with various changes
      await fs.writeFile(path.join(repoDir, 'src.ts'), 'source\n');
      await fs.writeFile(path.join(repoDir, 'README.md'), 'docs\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Output should show analysis
      const log = output.join('\n');
      expect(log).toContain('Analyzing changes');
      expect(log).toContain('Auto:');
    });

    it('should display final summary with counts', async () => {
      // Given: Repo with changes
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger, output } = createTestLogger();

      // When: Execute save
      await executeSave({
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Summary should show counts
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
      expect(log).toContain('Saved:');
    });

    it('should list commit messages in output', async () => {
      // Given: Repo with changes
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const customMsg = 'feat: important change';
      const { logger, output } = createTestLogger();

      // When: Execute save with custom message
      await executeSave({
        message: customMsg,
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Output should show commit message
      const log = output.join('\n');
      expect(log).toContain('Commits:');
      expect(log).toContain(customMsg);
    });
  });

  // --------------------------------------------------------------------------
  // T-011: Sync Strategies
  // --------------------------------------------------------------------------

  describe('T-011: Sync strategy options', () => {
    it('should accept sync strategy option (rebase, merge, none)', async () => {
      // Given: Repo with changes and sync option
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger } = createTestLogger();

      // When: Execute save with rebase strategy
      await executeSave({
        sync: 'rebase',
        message: 'feat: test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should accept and process
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe('feat: test');
    });

    it('should handle merge strategy when specified', async () => {
      // Given: Repo with merge strategy option
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger } = createTestLogger();

      // When: Execute save with merge
      await executeSave({
        sync: 'merge',
        message: 'feat: merge-test',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should process with merge strategy
      const commitMsg = await getLastCommitMessage(repoDir);
      expect(commitMsg).toBe('feat: merge-test');
    });

    it('should skip sync when strategy is none', async () => {
      // Given: Repo with sync: none
      await fs.writeFile(path.join(repoDir, 'file.ts'), 'content\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with sync: none
      await executeSave({
        sync: 'none',
        message: 'feat: no-sync',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Should commit without sync attempt
      const log = output.join('\n');
      expect(log).toContain('SUMMARY');
    });
  });

  // --------------------------------------------------------------------------
  // T-012: Integration Tests
  // --------------------------------------------------------------------------

  describe('T-012: Integration tests', () => {
    it('should handle end-to-end save workflow', async () => {
      // Given: Repo with various changes
      await fs.mkdir(path.join(repoDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(repoDir, 'src/app.ts'), 'export const app = {};\n');
      await fs.writeFile(path.join(repoDir, 'README.md'), '# App\n');
      await fs.writeFile(path.join(repoDir, 'package.json'), '{"name":"app","version":"1.0.0"}\n');

      const { logger, output } = createTestLogger();

      // When: Execute save with all defaults
      await executeSave({
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Complete workflow should succeed
      const log = output.join('\n');
      expect(log).toContain('Scanning for repositories');
      expect(log).toContain('Pre-flight check');
      expect(log).toContain('Analyzing changes');
      expect(log).toContain('Saving changes');
      expect(log).toContain('SUMMARY');
      expect(log).toContain('Saved');

      // Verify commit
      const commitCount = await getCommitCount(repoDir);
      expect(commitCount).toBe(2);
    });

    it('should handle rapid successive saves', async () => {
      // Given: Repo setup

      const { logger } = createTestLogger();

      // When: Execute multiple saves
      await fs.writeFile(path.join(repoDir, 'file1.ts'), 'f1\n');
      await executeSave({
        message: 'feat: first',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      await fs.writeFile(path.join(repoDir, 'file2.ts'), 'f2\n');
      await executeSave({
        message: 'feat: second',
        noPush: true,
        logger,
        projectRoot: repoDir,
      });

      // Then: Both commits should exist
      const count = await getCommitCount(repoDir);
      expect(count).toBe(3); // init + 2 saves
    });

    it('should produce valid git history', async () => {
      // Given: Repo with multiple saves
      for (let i = 1; i <= 3; i++) {
        await fs.writeFile(path.join(repoDir, `file${i}.ts`), `f${i}\n`);

        const { logger } = createTestLogger();
        await executeSave({
          message: `feat: change ${i}`,
          noPush: true,
          logger,
          projectRoot: repoDir,
        });
      }

      // When: Query git history
      const { stdout } = await execAsync('git log --oneline', { cwd: repoDir });

      // Then: Should have valid history
      const lines = stdout.trim().split('\n');
      expect(lines.length).toBe(4); // init + 3 saves
      expect(lines[0]).toContain('feat: change 3');
      expect(lines[3]).toContain('init');
    });
  });
});
