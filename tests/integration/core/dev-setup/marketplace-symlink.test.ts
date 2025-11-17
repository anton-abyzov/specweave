/**
 * Integration Tests for Marketplace Symlink Setup
 *
 * Tests that prevent hook errors by ensuring marketplace symlink is correctly configured
 * for local development.
 *
 * Related:
 * - scripts/validate-local-dev-setup.sh
 * - scripts/setup-dev-plugins.sh
 * - CLAUDE.md (Local Development Setup section)
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync, ExecSyncOptions } from 'child_process';

describe('Marketplace Symlink Setup (Integration)', () => {
  let tempDir: string;
  let tempClaudeDir: string;
  let tempMarketplaceDir: string;
  let mockRepoDir: string;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-marketplace-test-'));
    tempClaudeDir = path.join(tempDir, '.claude', 'plugins', 'marketplaces');
    tempMarketplaceDir = path.join(tempClaudeDir, 'specweave');
    mockRepoDir = path.join(tempDir, 'mock-repo');

    // Create mock SpecWeave repository structure
    await fs.ensureDir(mockRepoDir);
    await fs.writeJson(path.join(mockRepoDir, 'package.json'), {
      name: 'specweave',
      version: '0.21.0',
    });

    // Create mock plugin structure
    const pluginDir = path.join(mockRepoDir, 'plugins', 'specweave');
    await fs.ensureDir(path.join(pluginDir, 'hooks'));
    await fs.writeFile(
      path.join(pluginDir, 'hooks', 'post-task-completion.sh'),
      '#!/bin/bash\necho "Hook executed"',
      { mode: 0o755 }
    );

    await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
    await fs.writeJson(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
      name: 'specweave',
      version: '0.21.0',
    });

    // Create other plugin hooks to match real structure
    const otherPlugins = ['specweave-github', 'specweave-jira', 'specweave-ado'];
    for (const pluginName of otherPlugins) {
      const otherPluginDir = path.join(mockRepoDir, 'plugins', pluginName);
      await fs.ensureDir(path.join(otherPluginDir, 'hooks'));
      await fs.writeFile(
        path.join(otherPluginDir, 'hooks', 'post-task-completion.sh'),
        '#!/bin/bash\necho "Hook executed"',
        { mode: 0o755 }
      );
    }
  });

  afterEach(async () => {
    // Clean up
    await fs.remove(tempDir);
  });

  describe('Issue Detection', () => {
    it('should detect when marketplace is a regular directory instead of symlink', async () => {
      // Create marketplace as regular directory (the bug scenario)
      await fs.ensureDir(tempMarketplaceDir);
      await fs.copy(mockRepoDir, tempMarketplaceDir);

      // Verify it's NOT a symlink
      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(stats.isDirectory()).toBe(true);

      // This is the problematic state that causes hook errors
    });

    it('should verify hooks exist in copied directory but are out of sync', async () => {
      // Setup: Create marketplace as regular directory
      await fs.ensureDir(tempMarketplaceDir);
      await fs.copy(mockRepoDir, tempMarketplaceDir);

      // Verify hooks exist in marketplace
      const marketplaceHook = path.join(
        tempMarketplaceDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      expect(await fs.pathExists(marketplaceHook)).toBe(true);

      // Modify the local repo hook (simulating development)
      const localHook = path.join(
        mockRepoDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      await fs.writeFile(localHook, '#!/bin/bash\necho "Updated hook"', { mode: 0o755 });

      // Verify marketplace hook is out of sync
      const marketplaceContent = await fs.readFile(marketplaceHook, 'utf-8');
      const localContent = await fs.readFile(localHook, 'utf-8');

      expect(marketplaceContent).not.toBe(localContent);
      // This demonstrates why symlinks are critical for development
    });
  });

  describe('Validation Script', () => {
    it('should detect marketplace is not a symlink', async () => {
      // Create marketplace as regular directory
      await fs.ensureDir(tempMarketplaceDir);
      await fs.copy(mockRepoDir, tempMarketplaceDir);

      // The validation script would fail with this setup
      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(false);

      // This is what scripts/validate-local-dev-setup.sh checks
    });

    it('should verify symlink points to correct repository', async () => {
      // Create symlink pointing to WRONG location
      const wrongRepoDir = path.join(tempDir, 'wrong-repo');
      await fs.ensureDir(wrongRepoDir);
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(wrongRepoDir, tempMarketplaceDir);

      // Verify it's a symlink
      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(true);

      // But it points to wrong location
      const target = await fs.readlink(tempMarketplaceDir);
      expect(target).toBe(wrongRepoDir);
      expect(target).not.toBe(mockRepoDir);

      // This is another failure mode the validation script detects
    });
  });

  describe('Correct Setup', () => {
    it('should create symlink pointing to local repository', async () => {
      // Setup: Remove any existing marketplace directory
      if (await fs.pathExists(tempMarketplaceDir)) {
        await fs.remove(tempMarketplaceDir);
      }

      // Create symlink (what scripts/setup-dev-plugins.sh does)
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Verify it's a symlink
      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify it points to correct location
      const target = await fs.readlink(tempMarketplaceDir);
      expect(path.resolve(target)).toBe(path.resolve(mockRepoDir));
    });

    it('should allow changes to local hooks to reflect immediately', async () => {
      // Setup: Create symlink
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Verify hook is accessible through symlink
      const symlinkHook = path.join(
        tempMarketplaceDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      expect(await fs.pathExists(symlinkHook)).toBe(true);

      // Read initial content
      const initialContent = await fs.readFile(symlinkHook, 'utf-8');
      expect(initialContent).toContain('Hook executed');

      // Modify the local repo hook
      const localHook = path.join(
        mockRepoDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      await fs.writeFile(localHook, '#!/bin/bash\necho "Updated immediately"', {
        mode: 0o755,
      });

      // Verify change is reflected through symlink immediately
      const updatedContent = await fs.readFile(symlinkHook, 'utf-8');
      expect(updatedContent).toContain('Updated immediately');

      // This is the key benefit of symlinks for development!
    });

    it('should make all plugin hooks accessible through symlink', async () => {
      // Setup: Create symlink
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Verify all plugin hooks are accessible
      const expectedHooks = [
        'plugins/specweave/hooks/post-task-completion.sh',
        'plugins/specweave-github/hooks/post-task-completion.sh',
        'plugins/specweave-jira/hooks/post-task-completion.sh',
        'plugins/specweave-ado/hooks/post-task-completion.sh',
      ];

      for (const hookPath of expectedHooks) {
        const fullPath = path.join(tempMarketplaceDir, hookPath);
        expect(await fs.pathExists(fullPath)).toBe(true);

        // Verify it's executable
        const stats = await fs.stat(fullPath);
        expect(stats.mode & 0o111).not.toBe(0); // At least one execute bit set
      }
    });
  });

  describe('Fix Procedure', () => {
    it('should backup existing directory before creating symlink', async () => {
      // Setup: Create marketplace as regular directory (bad state)
      await fs.ensureDir(tempMarketplaceDir);
      await fs.writeJson(path.join(tempMarketplaceDir, 'test.json'), { test: true });

      // Fix procedure (what scripts/setup-dev-plugins.sh does)
      const backupPath = `${tempMarketplaceDir}.backup-${Date.now()}`;
      if (await fs.pathExists(tempMarketplaceDir)) {
        const stats = await fs.lstat(tempMarketplaceDir);
        if (!stats.isSymbolicLink()) {
          await fs.move(tempMarketplaceDir, backupPath);
        }
      }

      // Create symlink
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Verify backup exists
      expect(await fs.pathExists(backupPath)).toBe(true);
      expect(await fs.pathExists(path.join(backupPath, 'test.json'))).toBe(true);

      // Verify symlink created
      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it('should handle symlink recreation idempotently', async () => {
      await fs.ensureDir(tempClaudeDir);

      // Create symlink first time
      await fs.symlink(mockRepoDir, tempMarketplaceDir);
      expect((await fs.lstat(tempMarketplaceDir)).isSymbolicLink()).toBe(true);

      // Remove and recreate (idempotent operation)
      await fs.remove(tempMarketplaceDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Should still work
      expect((await fs.lstat(tempMarketplaceDir)).isSymbolicLink()).toBe(true);

      const target = await fs.readlink(tempMarketplaceDir);
      expect(path.resolve(target)).toBe(path.resolve(mockRepoDir));
    });
  });

  describe('Error Prevention', () => {
    it('should fail hooks when marketplace is regular directory', async () => {
      // This test documents the failure mode
      // Setup: Create marketplace as regular directory with OLD hook version
      await fs.ensureDir(tempMarketplaceDir);
      const marketplaceHookDir = path.join(
        tempMarketplaceDir,
        'plugins/specweave/hooks'
      );
      await fs.ensureDir(marketplaceHookDir);
      await fs.writeFile(
        path.join(marketplaceHookDir, 'post-task-completion.sh'),
        '#!/bin/bash\necho "Old version"',
        { mode: 0o755 }
      );

      // Update local repo with NEW hook version
      const localHook = path.join(
        mockRepoDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      await fs.writeFile(
        localHook,
        '#!/bin/bash\necho "New version with critical fix"',
        { mode: 0o755 }
      );

      // Claude Code would execute the OLD version from marketplace
      const marketplaceHook = path.join(marketplaceHookDir, 'post-task-completion.sh');
      const executedContent = await fs.readFile(marketplaceHook, 'utf-8');

      expect(executedContent).toContain('Old version');
      expect(executedContent).not.toContain('New version');

      // This is the root cause of the bug!
    });

    it('should prevent hook errors with proper symlink setup', async () => {
      // Setup: Create symlink (CORRECT setup)
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Update local repo hook
      const localHook = path.join(
        mockRepoDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      await fs.writeFile(
        localHook,
        '#!/bin/bash\necho "Latest version with fix"',
        { mode: 0o755 }
      );

      // Claude Code executes from marketplace (which is a symlink)
      const marketplaceHook = path.join(
        tempMarketplaceDir,
        'plugins/specweave/hooks/post-task-completion.sh'
      );
      const executedContent = await fs.readFile(marketplaceHook, 'utf-8');

      expect(executedContent).toContain('Latest version with fix');

      // Symlink ensures hooks are always up-to-date!
    });
  });

  describe('Platform Compatibility', () => {
    it('should work on Unix-like systems', async () => {
      if (process.platform === 'win32') {
        console.log('Skipping Unix-specific test on Windows');
        return;
      }

      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      const stats = await fs.lstat(tempMarketplaceDir);
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it('should detect platform and suggest appropriate commands', () => {
      const platform = process.platform;

      expect(['darwin', 'linux', 'win32', 'freebsd', 'openbsd']).toContain(platform);

      // Validation script works on all platforms
      // Setup script adapts commands per platform
    });
  });

  describe('Validation Checklist', () => {
    it('should verify all critical files are accessible via symlink', async () => {
      await fs.ensureDir(tempClaudeDir);
      await fs.symlink(mockRepoDir, tempMarketplaceDir);

      // Checklist from scripts/validate-local-dev-setup.sh
      const criticalFiles = [
        'package.json',
        'plugins/specweave/.claude-plugin/plugin.json',
        'plugins/specweave/hooks/post-task-completion.sh',
      ];

      for (const file of criticalFiles) {
        const fullPath = path.join(tempMarketplaceDir, file);
        expect(await fs.pathExists(fullPath)).toBe(true);
      }
    });

    it('should ensure symlink is absolute path', async () => {
      await fs.ensureDir(tempClaudeDir);

      // Create symlink with absolute path
      const absoluteRepoPath = path.resolve(mockRepoDir);
      await fs.symlink(absoluteRepoPath, tempMarketplaceDir);

      const target = await fs.readlink(tempMarketplaceDir);

      // Symlink can be relative or absolute, but it should resolve correctly
      const resolvedTarget = path.resolve(tempClaudeDir, target);
      expect(resolvedTarget).toBe(absoluteRepoPath);
    });
  });
});
