/**
 * E2E Tests for Lazy Loading Full Flow
 *
 * Tests the complete user journey from initialization to lazy loading
 * to migration and rollback scenarios.
 *
 * @module tests/unit/core/lazy-loading/e2e-flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PluginCacheManager } from '../../../../src/core/lazy-loading/cache-manager.js';

// Create a temporary directory for tests
const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-e2e-test');

describe('E2E Flow Tests', () => {
  let testDir: string;
  let testCachePath: string;
  let testActivePath: string;
  let testStatePath: string;
  let testMarketplacePath: string;
  let testBackupPath: string;

  beforeEach(() => {
    // Create unique test directories for each test
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(TEST_BASE_DIR, testId);

    testCachePath = path.join(testDir, 'skills-cache');
    testActivePath = path.join(testDir, 'skills');
    testStatePath = path.join(testDir, 'state', 'plugins-loaded.json');
    testMarketplacePath = path.join(testDir, 'marketplace', 'plugins');
    testBackupPath = path.join(testDir, 'skills-backup');

    // Create directories
    fs.mkdirSync(testCachePath, { recursive: true });
    fs.mkdirSync(testActivePath, { recursive: true });
    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    try {
      fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Init → Use → Lazy Load → Verify Flow', () => {
    it('should complete full init to lazy load flow', async () => {
      // Step 1: Simulate marketplace population (like refresh-marketplace)
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Step 2: Verify marketplace ready (populateCache is now a no-op)
      const populateResult = await cacheManager.populateCache();
      expect(populateResult.success).toBe(true);
      expect(populateResult.pluginsAffected).toBe(4); // Now reports marketplace plugin count

      // Verify marketplace plugins available (SIMPLIFIED: reads from marketplace directly)
      expect(cacheManager.getCachedPlugins()).toHaveLength(4);
      expect(cacheManager.isPluginCached('specweave-router')).toBe(true);

      // Step 3: Install router only (lazy mode init)
      const initResult = await cacheManager.installPlugins({
        plugins: ['specweave-router'],
      });
      expect(initResult.success).toBe(true);
      expect(initResult.pluginsAffected).toBe(1);

      // Verify only router installed
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave')).toBe(false);

      // Verify state reflects lazy mode
      const state1 = cacheManager.readState();
      expect(state1.lazyMode).toBe(true);
      expect(state1.loadedPlugins).toEqual(['specweave-router']);
      expect(state1.cachedPlugins).toHaveLength(4);

      // Step 4: User triggers lazy load (like router skill does)
      const lazyLoadResult = await cacheManager.installPlugins({
        plugins: ['specweave', 'specweave-github'],
      });
      expect(lazyLoadResult.success).toBe(true);
      expect(lazyLoadResult.pluginsAffected).toBe(2);

      // Step 5: Verify full functionality
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);

      const state2 = cacheManager.readState();
      expect(state2.loadedPlugins).toContain('specweave');
      expect(state2.loadedPlugins).toContain('specweave-github');
      expect(state2.loadedPlugins).toContain('specweave-router');
    });

    it('should support selective plugin loading', async () => {
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
        'specweave-ado',
        'sw-frontend',
        'sw-backend',
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      await cacheManager.populateCache();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // User only needs GitHub integration
      await cacheManager.installPlugins({ plugins: ['specweave', 'specweave-github'] });

      // Verify selective load
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-jira')).toBe(false);
      expect(cacheManager.isPluginLoaded('specweave-ado')).toBe(false);
      expect(cacheManager.isPluginLoaded('sw-frontend')).toBe(false);

      // Others remain in cache
      expect(cacheManager.isPluginCached('specweave-jira')).toBe(true);
      expect(cacheManager.isPluginCached('specweave-ado')).toBe(true);
    });
  });

  describe('Existing Install → Migrate → Verify Flow', () => {
    it('should migrate from full install to lazy mode', async () => {
      // Step 1: Simulate existing full installation
      const existingPlugins = [
        'specweave',
        'specweave-github',
        'specweave-jira',
        'specweave-ado',
      ];

      for (const plugin of existingPlugins) {
        createMockPlugin(testActivePath, plugin);
      }

      // Create marketplace (needed for cache population)
      createMarketplacePlugins(testMarketplacePath, [
        'specweave-router',
        ...existingPlugins,
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Verify pre-migration state
      expect(cacheManager.getLoadedPlugins()).toHaveLength(4);
      // SIMPLIFIED: getCachedPlugins() now returns marketplace plugins directly
      expect(cacheManager.getCachedPlugins()).toHaveLength(5); // All marketplace plugins

      // Step 2: Backup existing skills (simulate migrate-lazy --backup)
      fs.mkdirSync(testBackupPath, { recursive: true });
      for (const plugin of existingPlugins) {
        const srcPath = path.join(testActivePath, plugin);
        const destPath = path.join(testBackupPath, plugin);
        copyDirectorySync(srcPath, destPath);
      }

      // Step 3: Populate cache from marketplace
      const populateResult = await cacheManager.populateCache();
      expect(populateResult.success).toBe(true);

      // Step 4: Unload all plugins except router
      await cacheManager.unloadPlugins();

      // Step 5: Install router only
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // Step 6: Verify migration complete
      expect(cacheManager.getLoadedPlugins()).toEqual(['specweave-router']);
      expect(cacheManager.getCachedPlugins()).toHaveLength(5);

      const state = cacheManager.readState();
      expect(state.lazyMode).toBe(true);
      expect(state.loadedPlugins).toEqual(['specweave-router']);

      // Step 7: Verify backup exists for rollback
      expect(fs.existsSync(path.join(testBackupPath, 'specweave'))).toBe(true);
      expect(fs.existsSync(path.join(testBackupPath, 'specweave-github'))).toBe(true);
    });

    it('should preserve memories during migration', async () => {
      // Setup existing plugin with MEMORY.md
      createMockPlugin(testActivePath, 'specweave');
      const memoryPath = path.join(testActivePath, 'specweave', 'skills', 'test-skill', 'MEMORY.md');
      fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
      fs.writeFileSync(
        memoryPath,
        `# Skill Memory

## User Preferences
- Prefers TDD
- Uses TypeScript
`
      );

      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Backup memories
      const memories: Record<string, string> = {};
      collectMemories(testActivePath, memories);

      expect(Object.keys(memories).length).toBeGreaterThan(0);

      // Simulate migration
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // Restore memories to cache (and new install)
      await cacheManager.installPlugins({ plugins: ['specweave'] });
      restoreMemories(testActivePath, memories);

      // Verify memory preserved
      const restoredMemoryPath = path.join(
        testActivePath,
        'specweave',
        'skills',
        'test-skill',
        'MEMORY.md'
      );
      expect(fs.existsSync(restoredMemoryPath)).toBe(true);
      const content = fs.readFileSync(restoredMemoryPath, 'utf8');
      expect(content).toContain('Prefers TDD');
    });
  });

  describe('Migrate → Rollback → Verify Flow', () => {
    it('should rollback migration successfully', async () => {
      // Step 1: Setup full installation
      const existingPlugins = ['specweave', 'specweave-github', 'specweave-jira'];

      for (const plugin of existingPlugins) {
        createMockPlugin(testActivePath, plugin);
        // Add a marker file to verify rollback works
        fs.writeFileSync(
          path.join(testActivePath, plugin, 'pre-migration-marker.txt'),
          'This file existed before migration'
        );
      }

      createMarketplacePlugins(testMarketplacePath, [
        'specweave-router',
        ...existingPlugins,
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Step 2: Create backup
      fs.mkdirSync(testBackupPath, { recursive: true });
      for (const plugin of existingPlugins) {
        copyDirectorySync(
          path.join(testActivePath, plugin),
          path.join(testBackupPath, plugin)
        );
      }

      // Step 3: Perform migration
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // Verify migrated state
      expect(cacheManager.getLoadedPlugins()).toEqual(['specweave-router']);

      // Step 4: Rollback
      // Clear active directory
      for (const plugin of cacheManager.getLoadedPlugins()) {
        fs.rmSync(path.join(testActivePath, plugin), { recursive: true, force: true });
      }

      // Restore from backup
      for (const plugin of existingPlugins) {
        copyDirectorySync(
          path.join(testBackupPath, plugin),
          path.join(testActivePath, plugin)
        );
      }

      // Clear lazy mode state
      const state = cacheManager.readState();
      state.lazyMode = false;
      state.loadedPlugins = existingPlugins;
      fs.writeFileSync(testStatePath, JSON.stringify(state, null, 2));

      // Step 5: Verify rollback complete
      expect(cacheManager.getLoadedPlugins().sort()).toEqual(existingPlugins.sort());

      // Verify original files restored
      for (const plugin of existingPlugins) {
        const markerPath = path.join(testActivePath, plugin, 'pre-migration-marker.txt');
        expect(fs.existsSync(markerPath)).toBe(true);
        expect(fs.readFileSync(markerPath, 'utf8')).toBe('This file existed before migration');
      }

      // Verify state restored
      const restoredState = cacheManager.readState();
      expect(restoredState.lazyMode).toBe(false);
    });

    it('should handle partial rollback gracefully', async () => {
      // Setup
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-github',
        'specweave-router',
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Backup only one plugin (simulating partial backup)
      fs.mkdirSync(testBackupPath, { recursive: true });
      copyDirectorySync(
        path.join(testActivePath, 'specweave'),
        path.join(testBackupPath, 'specweave')
      );

      // Migrate
      await cacheManager.populateCache();
      await cacheManager.unloadPlugins();
      await cacheManager.installPlugins({ plugins: ['specweave-router'] });

      // Partial rollback (only specweave has backup)
      const backupPlugins = fs.readdirSync(testBackupPath);
      for (const plugin of backupPlugins) {
        copyDirectorySync(
          path.join(testBackupPath, plugin),
          path.join(testActivePath, plugin)
        );
      }

      // Verify partial restore
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(false);
      // github can still be installed from cache
      expect(cacheManager.isPluginCached('specweave-github')).toBe(true);
    });
  });

  describe('Full Installation Mode (--full flag)', () => {
    it('should install all plugins immediately with --full', async () => {
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
        'specweave-ado',
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Simulate --full mode: populate cache AND install all
      await cacheManager.populateCache();
      const result = await cacheManager.installPlugins(); // No filter = all plugins

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(5);

      // All plugins should be loaded
      expect(cacheManager.getLoadedPlugins()).toHaveLength(5);
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-jira')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-ado')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
    });
  });

  describe('Unload and Reload Flow', () => {
    it('should unload plugins while preserving router', async () => {
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
      ]);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Setup: full install
      await cacheManager.populateCache();
      await cacheManager.installPlugins();

      expect(cacheManager.getLoadedPlugins()).toHaveLength(3);

      // Unload all except router
      const unloadResult = await cacheManager.unloadPlugins();

      expect(unloadResult.success).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave')).toBe(false);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(false);

      // Reload specific plugin
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(false);
    });

    it('should track unload/reload in state', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const cacheManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      await cacheManager.populateCache();
      await cacheManager.installPlugins();

      const state1 = cacheManager.readState();
      expect(state1.loadedPlugins).toContain('specweave');

      await cacheManager.unloadPlugins(['specweave']);

      const state2 = cacheManager.readState();
      expect(state2.loadedPlugins).not.toContain('specweave');
      expect(state2.loadedPlugins).toContain('specweave-router');

      await cacheManager.installPlugins({ plugins: ['specweave'] });

      const state3 = cacheManager.readState();
      expect(state3.loadedPlugins).toContain('specweave');
    });
  });
});

/**
 * Helper to create multiple marketplace plugins
 */
function createMarketplacePlugins(marketplacePath: string, pluginNames: string[]): void {
  for (const name of pluginNames) {
    createMockPlugin(marketplacePath, name);
  }
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
 * Helper to copy directory synchronously
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
    }
  }
}

/**
 * Collect MEMORY.md files from plugin directory
 */
function collectMemories(basePath: string, memories: Record<string, string>): void {
  if (!fs.existsSync(basePath)) return;

  const walkDir = (dir: string, relativePath: string) => {
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
}

/**
 * Restore MEMORY.md files to plugin directory
 */
function restoreMemories(basePath: string, memories: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(memories)) {
    const fullPath = path.join(basePath, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}
