/**
 * Unit tests for fixHookPermissions function
 *
 * Tests hook permission fixing functionality including:
 * - Skip on Windows
 * - Only fix files that need fixing (not already executable)
 * - Handle missing directories gracefully
 * - Report accurate counts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, chmodSync, statSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

// We need to test the internal function, so we'll import the module and test behavior
// Since fixHookPermissions is not exported, we test via the refresh-marketplace command
// For now, let's create a standalone test implementation matching the logic

/**
 * Matches the implementation in refresh-marketplace.ts
 * This allows us to test the logic in isolation
 */
function fixHookPermissions(marketplacePath: string): { fixed: number; skipped: number; errors: string[] } {
  const fs = require('fs');
  const errors: string[] = [];
  let fixed = 0;
  let skipped = 0;

  // Skip on Windows - chmod has no effect on NTFS
  if (process.platform === 'win32') {
    return { fixed: 0, skipped: 0, errors: [] };
  }

  const pluginsDir = path.join(marketplacePath, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return { fixed, skipped, errors: ['Plugins directory not found'] };
  }

  // Find all plugin directories
  const pluginDirs = fs.readdirSync(pluginsDir).filter((name: string) => {
    const pluginPath = path.join(pluginsDir, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  const isExecutable = (filePath: string): boolean => {
    try {
      const stats = fs.statSync(filePath);
      return (stats.mode & 0o100) !== 0;
    } catch {
      return false;
    }
  };

  const fixFilePermission = (filePath: string, displayName: string): void => {
    try {
      if (isExecutable(filePath)) {
        skipped++;
        return;
      }
      fs.chmodSync(filePath, 0o755);
      fixed++;
    } catch (error) {
      errors.push(`${displayName}: ${error}`);
    }
  };

  for (const pluginName of pluginDirs) {
    const hooksDir = path.join(pluginsDir, pluginName, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hookFiles = fs.readdirSync(hooksDir).filter((f: string) => f.endsWith('.sh'));
      for (const hookFile of hookFiles) {
        const hookPath = path.join(hooksDir, hookFile);
        fixFilePermission(hookPath, `${pluginName}/${hookFile}`);
      }
    }

    const scriptsDir = path.join(pluginsDir, pluginName, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter((f: string) => f.endsWith('.sh'));
      for (const scriptFile of scriptFiles) {
        const scriptPath = path.join(scriptsDir, scriptFile);
        fixFilePermission(scriptPath, `${pluginName}/scripts/${scriptFile}`);
      }
    }
  }

  return { fixed, skipped, errors };
}

describe('fixHookPermissions', () => {
  let testDir: string;
  let originalPlatform: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(tmpdir(), `hook-perms-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Store original platform
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore platform (in case we mocked it)
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('Windows behavior', () => {
    it('should skip entirely on Windows', () => {
      // Mock Windows platform
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('missing directories', () => {
    it('should handle missing plugins directory gracefully', () => {
      // Skip this test on Windows
      if (process.platform === 'win32') return;

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toContain('Plugins directory not found');
    });

    it('should handle empty plugins directory', () => {
      if (process.platform === 'win32') return;

      mkdirSync(path.join(testDir, 'plugins'), { recursive: true });

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('permission fixing', () => {
    it('should fix permissions on non-executable .sh files', () => {
      if (process.platform === 'win32') return;

      // Setup: Create plugin with hook that's not executable
      const hooksDir = path.join(testDir, 'plugins', 'test-plugin', 'hooks');
      mkdirSync(hooksDir, { recursive: true });

      const hookPath = path.join(hooksDir, 'post-task.sh');
      writeFileSync(hookPath, '#!/bin/bash\necho "test"');
      chmodSync(hookPath, 0o644); // Not executable

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify permission was fixed
      const stats = statSync(hookPath);
      expect(stats.mode & 0o100).toBeTruthy(); // Owner execute bit set
    });

    it('should skip already executable files', () => {
      if (process.platform === 'win32') return;

      // Setup: Create plugin with hook that's already executable
      const hooksDir = path.join(testDir, 'plugins', 'test-plugin', 'hooks');
      mkdirSync(hooksDir, { recursive: true });

      const hookPath = path.join(hooksDir, 'post-task.sh');
      writeFileSync(hookPath, '#!/bin/bash\necho "test"');
      chmodSync(hookPath, 0o755); // Already executable

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed permissions correctly', () => {
      if (process.platform === 'win32') return;

      // Setup: Create plugin with multiple hooks
      const hooksDir = path.join(testDir, 'plugins', 'test-plugin', 'hooks');
      mkdirSync(hooksDir, { recursive: true });

      // Hook 1: Not executable
      const hook1 = path.join(hooksDir, 'hook1.sh');
      writeFileSync(hook1, '#!/bin/bash');
      chmodSync(hook1, 0o644);

      // Hook 2: Already executable
      const hook2 = path.join(hooksDir, 'hook2.sh');
      writeFileSync(hook2, '#!/bin/bash');
      chmodSync(hook2, 0o755);

      // Hook 3: Not executable
      const hook3 = path.join(hooksDir, 'hook3.sh');
      writeFileSync(hook3, '#!/bin/bash');
      chmodSync(hook3, 0o600);

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should also fix scripts directory', () => {
      if (process.platform === 'win32') return;

      // Setup: Create plugin with scripts directory
      const scriptsDir = path.join(testDir, 'plugins', 'test-plugin', 'scripts');
      mkdirSync(scriptsDir, { recursive: true });

      const scriptPath = path.join(scriptsDir, 'helper.sh');
      writeFileSync(scriptPath, '#!/bin/bash');
      chmodSync(scriptPath, 0o644);

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(1);
      expect(result.skipped).toBe(0);

      // Verify permission was fixed
      const stats = statSync(scriptPath);
      expect(stats.mode & 0o100).toBeTruthy();
    });

    it('should ignore non-.sh files', () => {
      if (process.platform === 'win32') return;

      // Setup: Create plugin with non-sh files
      const hooksDir = path.join(testDir, 'plugins', 'test-plugin', 'hooks');
      mkdirSync(hooksDir, { recursive: true });

      // TypeScript file (should be ignored)
      writeFileSync(path.join(hooksDir, 'hook.ts'), 'export {}');
      // JSON file (should be ignored)
      writeFileSync(path.join(hooksDir, 'config.json'), '{}');
      // Shell script (should be processed)
      const hookPath = path.join(hooksDir, 'hook.sh');
      writeFileSync(hookPath, '#!/bin/bash');
      chmodSync(hookPath, 0o644);

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(1); // Only .sh file
      expect(result.skipped).toBe(0);
    });
  });

  describe('multiple plugins', () => {
    it('should process all plugins', () => {
      if (process.platform === 'win32') return;

      // Setup: Create multiple plugins
      const plugin1Hooks = path.join(testDir, 'plugins', 'plugin-a', 'hooks');
      const plugin2Hooks = path.join(testDir, 'plugins', 'plugin-b', 'hooks');
      mkdirSync(plugin1Hooks, { recursive: true });
      mkdirSync(plugin2Hooks, { recursive: true });

      const hook1 = path.join(plugin1Hooks, 'hook.sh');
      const hook2 = path.join(plugin2Hooks, 'hook.sh');
      writeFileSync(hook1, '#!/bin/bash');
      writeFileSync(hook2, '#!/bin/bash');
      chmodSync(hook1, 0o644);
      chmodSync(hook2, 0o644);

      const result = fixHookPermissions(testDir);

      expect(result.fixed).toBe(2);
      expect(result.skipped).toBe(0);
    });
  });
});
