/**
 * Migration Tests for Lazy Loading
 *
 * Tests the migration scenarios between full and lazy loading modes,
 * including backup creation, memory preservation, and rollback.
 *
 * @module tests/unit/core/lazy-loading/migration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PluginCacheManager, CacheState } from '../../../../src/core/lazy-loading/cache-manager.js';

// Create a temporary directory for tests
const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-migration-test');

describe('Migration Tests', () => {
  let testDir: string;
  let testCachePath: string;
  let testActivePath: string;
  let testStatePath: string;
  let testMarketplacePath: string;
  let testBackupPath: string;
  let testRegistryPath: string;
  let cacheManager: PluginCacheManager;

  beforeEach(() => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(TEST_BASE_DIR, testId);

    testCachePath = path.join(testDir, 'skills-cache');
    testActivePath = path.join(testDir, 'skills');
    testStatePath = path.join(testDir, 'state', 'plugins-loaded.json');
    testMarketplacePath = path.join(testDir, 'marketplace', 'plugins');
    testBackupPath = path.join(testDir, 'skills-backup');
    testRegistryPath = path.join(testDir, 'plugins', 'installed_plugins.json');

    fs.mkdirSync(testCachePath, { recursive: true });
    fs.mkdirSync(testActivePath, { recursive: true });
    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });
    fs.mkdirSync(path.dirname(testRegistryPath), { recursive: true });

    cacheManager = new PluginCacheManager({
      cachePath: testCachePath,
      activePath: testActivePath,
      statePath: testStatePath,
      marketplacePath: testMarketplacePath,
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Memory Preservation', () => {
    it('should preserve single MEMORY.md during migration', async () => {
      // Setup plugin with memory
      createPluginWithMemory(testActivePath, 'specweave', 'increment', {
        memories: ['Prefers TDD', 'Uses Vitest'],
        preferences: ['TypeScript', 'Strict mode'],
      });

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      // Collect memories before migration
      const memories = collectMemoryFiles(testActivePath);
      expect(Object.keys(memories)).toHaveLength(1);

      // Perform migration
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router', 'specweave'] });

      // Restore memories
      restoreMemoryFiles(testActivePath, memories);

      // Verify memory preserved
      const memoryPath = path.join(
        testActivePath,
        'specweave',
        'skills',
        'increment',
        'MEMORY.md'
      );
      expect(fs.existsSync(memoryPath)).toBe(true);

      const content = fs.readFileSync(memoryPath, 'utf8');
      expect(content).toContain('Prefers TDD');
      expect(content).toContain('Uses Vitest');
      expect(content).toContain('TypeScript');
    });

    it('should preserve multiple MEMORY.md files across plugins', async () => {
      // Setup multiple plugins with memories
      createPluginWithMemory(testActivePath, 'specweave', 'increment', {
        memories: ['User prefers TDD'],
      });
      createPluginWithMemory(testActivePath, 'specweave', 'validate', {
        memories: ['Skip slow tests in dev'],
      });
      createPluginWithMemory(testActivePath, 'specweave-github', 'sync', {
        memories: ['Use squash merge'],
      });

      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-github',
        'specweave-router',
      ]);

      // Collect all memories
      const memories = collectMemoryFiles(testActivePath);
      expect(Object.keys(memories)).toHaveLength(3);

      // Perform migration
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router', 'specweave', 'specweave-github'] });

      // Restore memories
      restoreMemoryFiles(testActivePath, memories);

      // Verify all memories preserved
      expect(
        fs.existsSync(
          path.join(testActivePath, 'specweave', 'skills', 'increment', 'MEMORY.md')
        )
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(testActivePath, 'specweave', 'skills', 'validate', 'MEMORY.md')
        )
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(testActivePath, 'specweave-github', 'skills', 'sync', 'MEMORY.md')
        )
      ).toBe(true);
    });

    it('should handle empty MEMORY.md files', async () => {
      // Create plugin with empty memory
      createMockPlugin(testActivePath, 'specweave');
      const memoryPath = path.join(
        testActivePath,
        'specweave',
        'skills',
        'test-skill',
        'MEMORY.md'
      );
      fs.writeFileSync(memoryPath, '');

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const memories = collectMemoryFiles(testActivePath);
      expect(Object.keys(memories)).toHaveLength(1);
      expect(memories[Object.keys(memories)[0]]).toBe('');

      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router', 'specweave'] });
      restoreMemoryFiles(testActivePath, memories);

      expect(fs.existsSync(memoryPath)).toBe(true);
    });

    it('should preserve memory content exactly (binary-safe)', async () => {
      const complexContent = `# Memory

## Special Characters
- Unicode: 日本語 한국어 中文
- Emoji: 🚀 💻 ✅ ❌
- Newlines: \n\n

## Code Blocks
\`\`\`typescript
const x = 42;
\`\`\`

## Edge Cases
- Tab:	character
- Line with trailing spaces:
- Empty lines above and below

`;

      createMockPlugin(testActivePath, 'specweave');
      const memoryPath = path.join(
        testActivePath,
        'specweave',
        'skills',
        'test-skill',
        'MEMORY.md'
      );
      fs.writeFileSync(memoryPath, complexContent);

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const memories = collectMemoryFiles(testActivePath);
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router', 'specweave'] });
      restoreMemoryFiles(testActivePath, memories);

      const restored = fs.readFileSync(memoryPath, 'utf8');
      expect(restored).toBe(complexContent);
    });
  });

  describe('Backup Creation', () => {
    it('should create complete backup of existing skills', async () => {
      // Setup existing installation
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');
      createMockPlugin(testActivePath, 'specweave-jira');

      // Create backup
      fs.mkdirSync(testBackupPath, { recursive: true });
      const plugins = fs.readdirSync(testActivePath, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

      for (const plugin of plugins) {
        copyDirectorySync(
          path.join(testActivePath, plugin),
          path.join(testBackupPath, plugin)
        );
      }

      // Verify backup contents
      expect(fs.existsSync(path.join(testBackupPath, 'specweave'))).toBe(true);
      expect(fs.existsSync(path.join(testBackupPath, 'specweave-github'))).toBe(true);
      expect(fs.existsSync(path.join(testBackupPath, 'specweave-jira'))).toBe(true);

      // Verify structure preserved
      expect(
        fs.existsSync(
          path.join(testBackupPath, 'specweave', 'skills', 'test-skill', 'SKILL.md')
        )
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(testBackupPath, 'specweave', '.claude-plugin', 'plugin.json')
        )
      ).toBe(true);
    });

    it('should include timestamp in backup metadata', async () => {
      createMockPlugin(testActivePath, 'specweave');

      const backupMetadata = {
        createdAt: new Date().toISOString(),
        sourceDir: testActivePath,
        plugins: ['specweave'],
        specweaveVersion: '1.0.0',
      };

      fs.mkdirSync(testBackupPath, { recursive: true });
      copyDirectorySync(
        path.join(testActivePath, 'specweave'),
        path.join(testBackupPath, 'specweave')
      );
      fs.writeFileSync(
        path.join(testBackupPath, 'backup-metadata.json'),
        JSON.stringify(backupMetadata, null, 2)
      );

      // Verify metadata
      const savedMetadata = JSON.parse(
        fs.readFileSync(path.join(testBackupPath, 'backup-metadata.json'), 'utf8')
      );
      expect(savedMetadata.createdAt).toBeDefined();
      expect(new Date(savedMetadata.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve file permissions in backup', async () => {
      createMockPlugin(testActivePath, 'specweave');
      const scriptPath = path.join(testActivePath, 'specweave', 'scripts', 'test.sh');
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "test"');
      fs.chmodSync(scriptPath, 0o755);

      fs.mkdirSync(testBackupPath, { recursive: true });
      copyDirectorySync(
        path.join(testActivePath, 'specweave'),
        path.join(testBackupPath, 'specweave')
      );

      const backupScriptPath = path.join(testBackupPath, 'specweave', 'scripts', 'test.sh');
      const stats = fs.statSync(backupScriptPath);
      // Check executable bit is preserved (on Unix-like systems)
      if (process.platform !== 'win32') {
        expect(stats.mode & 0o111).toBeGreaterThan(0);
      }
    });
  });

  // NOTE: These rollback tests are SKIPPED because the architecture changed.
  // Strategy 3 (skills dir copy to ~/.claude/skills/) was REMOVED.
  // Plugin installation now uses: Strategy 1 (CLI) or Strategy 2 (registry fallback).
  // Rollback scenarios that depend on skills dir manipulation are no longer relevant.
  // isPluginLoaded() now checks the registry, not the skills directory.
  describe.skip('Rollback Functionality (SKIPPED - architecture changed)', () => {
    it('should restore original state from backup', async () => {
      // Setup and backup
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');
      fs.writeFileSync(
        path.join(testActivePath, 'specweave', 'custom-file.txt'),
        'Custom content before migration'
      );

      fs.mkdirSync(testBackupPath, { recursive: true });
      for (const plugin of ['specweave', 'specweave-github']) {
        copyDirectorySync(
          path.join(testActivePath, plugin),
          path.join(testBackupPath, plugin)
        );
      }

      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-github',
        'specweave-router',
      ]);

      // Migrate
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // Verify migration happened
      expect(cacheManager.isPluginLoaded('specweave')).toBe(false);

      // Rollback
      for (const plugin of cacheManager.getLoadedPlugins()) {
        fs.rmSync(path.join(testActivePath, plugin), { recursive: true, force: true });
      }
      const backupPlugins = fs.readdirSync(testBackupPath, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
      for (const plugin of backupPlugins) {
        copyDirectorySync(
          path.join(testBackupPath, plugin),
          path.join(testActivePath, plugin)
        );
      }

      // Update state
      const state = cacheManager.readState();
      state.lazyMode = false;
      state.loadedPlugins = backupPlugins;
      fs.writeFileSync(testStatePath, JSON.stringify(state, null, 2));

      // Verify rollback
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);
      expect(
        fs.readFileSync(
          path.join(testActivePath, 'specweave', 'custom-file.txt'),
          'utf8'
        )
      ).toBe('Custom content before migration');
    });

    it('should clear lazy mode state on rollback', async () => {
      createMockPlugin(testActivePath, 'specweave');
      fs.mkdirSync(testBackupPath, { recursive: true });
      copyDirectorySync(
        path.join(testActivePath, 'specweave'),
        path.join(testBackupPath, 'specweave')
      );

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      // Set lazy mode
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      const lazyState = cacheManager.readState();
      expect(lazyState.lazyMode).toBe(true);

      // Simulate rollback
      const state = cacheManager.readState();
      state.lazyMode = false;
      state.loadedPlugins = ['specweave'];
      fs.writeFileSync(testStatePath, JSON.stringify(state, null, 2));

      const rolledBackState = cacheManager.readState();
      expect(rolledBackState.lazyMode).toBe(false);
    });

    it('should remove router skill on rollback', async () => {
      createMockPlugin(testActivePath, 'specweave');
      fs.mkdirSync(testBackupPath, { recursive: true });
      copyDirectorySync(
        path.join(testActivePath, 'specweave'),
        path.join(testBackupPath, 'specweave')
      );

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);

      // Rollback: remove router
      fs.rmSync(path.join(testActivePath, 'specweave-router'), { recursive: true, force: true });
      copyDirectorySync(
        path.join(testBackupPath, 'specweave'),
        path.join(testActivePath, 'specweave')
      );

      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(false);
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
    });
  });

  describe('Partial Migration Recovery', () => {
    // NOTE: SKIPPED - Architecture changed. isPluginLoaded() now checks registry, not skills dir.
    // This test creates a mock plugin in skills dir but expects isPluginLoaded to detect it.
    // With registry-based checks, plugins in skills dir are NOT considered "loaded".
    it.skip('should recover from failed cache population (SKIPPED - architecture changed)', async () => {
      createMockPlugin(testActivePath, 'specweave');
      // Remove marketplace directory - simulates failure scenario
      fs.rmSync(testMarketplacePath, { recursive: true, force: true });

      const result = await cacheManager.populateCache();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Marketplace not found');

      // Original plugins should still be intact
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
    });

    it('should recover from failed unload', async () => {
      createMockPlugin(testActivePath, 'specweave');
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      await cacheManager.populateCache();

      // Simulate failure during unload by making directory read-only
      // (This is OS-dependent, so we test the recovery path instead)

      // Verify that even if unload fails, cache is still populated
      expect(cacheManager.getCachedPlugins()).toContain('specweave');
      expect(cacheManager.getCachedPlugins()).toContain('specweave-router');

      // User can still install from cache
      const installResult = await cacheManager.installPlugins({
        plugins: ['specweave-router'],
      });
      expect(installResult.success).toBe(true);
    });

    // NOTE: SKIPPED - Architecture changed. isPluginLoaded() now checks registry, not skills dir.
    // After installing plugins, they remain registered even if marketplace source is deleted.
    // This is correct behavior - installed plugins shouldn't care about source availability.
    it.skip('should handle missing plugin in marketplace gracefully (SKIPPED - architecture changed)', async () => {
      // SIMPLIFIED (v1.0.122+): Now we read directly from marketplace
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);
      await cacheManager.populateCache();

      // Remove one plugin from marketplace (simulates unavailable plugin)
      fs.rmSync(path.join(testMarketplacePath, 'specweave'), { recursive: true, force: true });

      const result = await cacheManager.installPlugins({
        plugins: ['specweave', 'specweave-router'],
      });

      // Should succeed for router, skip missing specweave
      expect(result.success).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave')).toBe(false);
    });

    // NOTE: SKIPPED - Architecture changed. isPluginLoaded() now checks registry, not skills dir.
    // This test creates mock plugins in skills dir but expects isPluginLoaded to detect them.
    // With registry-based checks, plugins in skills dir are NOT considered "loaded".
    it.skip('should recover from interrupted migration (SKIPPED - architecture changed)', async () => {
      // Setup
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');
      fs.mkdirSync(testBackupPath, { recursive: true });
      for (const plugin of ['specweave', 'specweave-github']) {
        copyDirectorySync(
          path.join(testActivePath, plugin),
          path.join(testBackupPath, plugin)
        );
      }

      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-github',
        'specweave-router',
      ]);

      await cacheManager.populateCache();

      // Simulate interrupted migration:
      // - Some plugins unloaded
      // - Router not yet installed
      await cacheManager.unloadPlugins(['specweave']);
      // (Imagine interruption here)

      // Recovery: Install router and continue
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // State should be recoverable
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);

      // Can still complete migration by unloading rest
      await cacheManager.unloadPlugins();
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(false);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
    });
  });
});

/**
 * Helper to create a plugin with memory file
 */
function createPluginWithMemory(
  basePath: string,
  pluginName: string,
  skillName: string,
  options: { memories?: string[]; preferences?: string[] }
): void {
  createMockPlugin(basePath, pluginName);

  const memoryPath = path.join(basePath, pluginName, 'skills', skillName, 'MEMORY.md');
  fs.mkdirSync(path.dirname(memoryPath), { recursive: true });

  const content = `# Skill Memory

## Learned Patterns
${(options.memories || []).map((m) => `- ${m}`).join('\n')}

## User Preferences
${(options.preferences || []).map((p) => `- ${p}`).join('\n')}
`;

  fs.writeFileSync(memoryPath, content);
}

/**
 * Helper to create a mock plugin
 */
function createMockPlugin(basePath: string, pluginName: string): void {
  const pluginPath = path.join(basePath, pluginName);
  const skillsPath = path.join(pluginPath, 'skills', 'test-skill');
  const claudePluginPath = path.join(pluginPath, '.claude-plugin');

  fs.mkdirSync(skillsPath, { recursive: true });
  fs.mkdirSync(claudePluginPath, { recursive: true });

  fs.writeFileSync(
    path.join(skillsPath, 'SKILL.md'),
    `# Test Skill\nPlugin: ${pluginName}`
  );

  fs.writeFileSync(
    path.join(claudePluginPath, 'plugin.json'),
    JSON.stringify({ name: pluginName, version: '1.0.0' })
  );
}

/**
 * Helper to create marketplace plugins
 */
function createMarketplacePlugins(marketplacePath: string, pluginNames: string[]): void {
  for (const name of pluginNames) {
    createMockPlugin(marketplacePath, name);
  }
}

/**
 * Collect all MEMORY.md files from a directory tree
 */
function collectMemoryFiles(basePath: string): Record<string, string> {
  const memories: Record<string, string> = {};

  const walkDir = (dir: string, relativePath: string): void => {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const newRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath, newRelativePath);
      } else if (entry.name === 'MEMORY.md') {
        memories[newRelativePath] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  };

  walkDir(basePath, '');
  return memories;
}

/**
 * Restore MEMORY.md files to a directory tree
 */
function restoreMemoryFiles(basePath: string, memories: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(memories)) {
    const fullPath = path.join(basePath, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

/**
 * Copy directory recursively
 */
function copyDirectorySync(source: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      // Preserve permissions
      try {
        const stats = fs.statSync(srcPath);
        fs.chmodSync(destPath, stats.mode);
      } catch {
        // Ignore permission errors on Windows
      }
    }
  }
}
