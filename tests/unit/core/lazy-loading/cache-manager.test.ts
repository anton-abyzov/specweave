/**
 * Tests for Plugin Cache Manager - Lazy Loading
 *
 * @module tests/unit/core/lazy-loading/cache-manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PluginCacheManager,
  CACHE_PATHS,
  CacheState,
  CachedPluginMetadata,
  BackgroundInstallStatus,
} from '../../../../src/core/lazy-loading/cache-manager.js';

// Create a temporary directory for tests
const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-cache-manager-test');

describe('PluginCacheManager', () => {
  let cacheManager: PluginCacheManager;
  let testCachePath: string;
  let testActivePath: string;
  let testStatePath: string;
  let testMarketplacePath: string;

  beforeEach(() => {
    // Create unique test directories for each test
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testDir = path.join(TEST_BASE_DIR, testId);

    testCachePath = path.join(testDir, 'skills-cache');
    testActivePath = path.join(testDir, 'skills');
    testStatePath = path.join(testDir, 'state', 'plugins-loaded.json');
    testMarketplacePath = path.join(testDir, 'marketplace', 'plugins');
    const testRegistryPath = path.join(testDir, 'plugins', 'installed_plugins.json');

    // Create directories
    fs.mkdirSync(testCachePath, { recursive: true });
    fs.mkdirSync(testActivePath, { recursive: true });
    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });
    fs.mkdirSync(path.dirname(testRegistryPath), { recursive: true });

    // Create manager with test paths (including registryPath to isolate from user's real registry)
    cacheManager = new PluginCacheManager({
      cachePath: testCachePath,
      activePath: testActivePath,
      statePath: testStatePath,
      marketplacePath: testMarketplacePath,
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    // Clean up test directories
    try {
      fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should use default paths when no options provided', () => {
      const defaultManager = new PluginCacheManager();
      // Test that it doesn't throw
      expect(defaultManager).toBeDefined();
    });

    it('should accept custom paths', () => {
      expect(cacheManager).toBeDefined();
    });
  });

  describe('CACHE_PATHS constant', () => {
    it('should have expected paths', () => {
      expect(CACHE_PATHS.cache).toContain('.specweave');
      expect(CACHE_PATHS.active).toContain('.claude');
      expect(CACHE_PATHS.state).toContain('plugins-loaded.json');
      expect(CACHE_PATHS.marketplace).toContain('.claude');
    });
  });

  describe('populateCache', () => {
    // SIMPLIFIED (v1.0.122+): populateCache is now a no-op that validates marketplace
    // and updates state. It no longer creates an intermediate cache.

    it('should validate marketplace and report plugin count', async () => {
      // Create mock plugins in marketplace
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const result = await cacheManager.populateCache();

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(2);
      // No intermediate cache created - plugins read directly from marketplace
      expect(fs.existsSync(path.join(testMarketplacePath, 'specweave'))).toBe(true);
      expect(fs.existsSync(path.join(testMarketplacePath, 'specweave-github'))).toBe(true);
    });

    it('should update state with marketplace plugins', async () => {
      createMockPlugin(testMarketplacePath, 'test-plugin');

      const result = await cacheManager.populateCache();

      expect(result.success).toBe(true);
      // State should be updated with plugin info
      const state = cacheManager.readState();
      expect(state.cachedPlugins.length).toBe(1);
      expect(state.cachedPlugins[0].name).toBe('test-plugin');
    });

    it('should return error if marketplace not found', async () => {
      fs.rmSync(testMarketplacePath, { recursive: true });

      const result = await cacheManager.populateCache();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Marketplace not found');
    });

    it('should update state with marketplace plugin info', async () => {
      // SIMPLIFIED (v1.0.122+): populateCache no longer creates intermediate cache files
      // It just validates marketplace and updates state
      createMockPlugin(testMarketplacePath, 'test-plugin');

      await cacheManager.populateCache();

      // State should have plugin info (for backward compatibility)
      const state = cacheManager.readState();
      expect(state.cachedPlugins.length).toBe(1);
      expect(state.cachedPlugins[0].name).toBe('test-plugin');
    });

    it('should update state file after population', async () => {
      createMockPlugin(testMarketplacePath, 'test-plugin');

      await cacheManager.populateCache();

      const state = cacheManager.readState();
      expect(state.cachedPlugins.length).toBe(1);
      expect(state.cachedPlugins[0].name).toBe('test-plugin');
    });
  });

  describe('installPlugins', () => {
    beforeEach(async () => {
      // Populate cache with test plugins
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');
      createMockPlugin(testMarketplacePath, 'specweave-jira');
    });

    it('should install all cached plugins by default', async () => {
      const result = await cacheManager.installPlugins();

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(3);
      expect(fs.existsSync(path.join(testActivePath, 'specweave'))).toBe(true);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-github'))).toBe(true);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-jira'))).toBe(true);
    });

    it('should install specific plugins', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['specweave', 'specweave-github'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(2);
      expect(fs.existsSync(path.join(testActivePath, 'specweave'))).toBe(true);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-github'))).toBe(true);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-jira'))).toBe(false);
    });

    it('should install plugins by group name', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['core'],
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(testActivePath, 'specweave'))).toBe(true);
    });

    it('should skip already installed plugins', async () => {
      // First install
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Second install should skip
      const result = await cacheManager.installPlugins({ plugins: ['specweave'] });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0);
    });

    it('should reinstall with force option', async () => {
      // First install
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Modify the installed version
      const testFile = path.join(testActivePath, 'specweave', 'test-marker.txt');
      fs.writeFileSync(testFile, 'old version');

      // Force reinstall
      const result = await cacheManager.installPlugins({
        plugins: ['specweave'],
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(1);
      // Marker file should be gone (fresh copy)
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should update state file after installation', async () => {
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      const state = cacheManager.readState();
      expect(state.loadedPlugins).toContain('specweave');
      expect(state.analytics.totalLoads).toBeGreaterThan(0);
    });

    it('should warn for plugins not in cache', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['nonexistent-plugin'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0);
    });
  });

  describe('isPluginLoaded', () => {
    it('should return true for loaded plugins', async () => {
      createMockPlugin(testActivePath, 'specweave');

      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
    });

    it('should return false for unloaded plugins', () => {
      expect(cacheManager.isPluginLoaded('specweave')).toBe(false);
    });
  });

  describe('isPluginCached', () => {
    it('should return true for cached plugins', () => {
      createMockPlugin(testMarketplacePath, 'specweave');

      expect(cacheManager.isPluginCached('specweave')).toBe(true);
    });

    it('should return false for non-cached plugins', () => {
      expect(cacheManager.isPluginCached('specweave')).toBe(false);
    });
  });

  describe('getCachedPlugins', () => {
    it('should return list of cached plugins', () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const plugins = cacheManager.getCachedPlugins();

      expect(plugins).toContain('specweave');
      expect(plugins).toContain('specweave-github');
      expect(plugins.length).toBe(2);
    });

    it('should return empty array if no cache', () => {
      fs.rmSync(testCachePath, { recursive: true });

      const plugins = cacheManager.getCachedPlugins();

      expect(plugins).toEqual([]);
    });

    it('should exclude hidden directories', () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      fs.mkdirSync(path.join(testCachePath, '.hidden'), { recursive: true });

      const plugins = cacheManager.getCachedPlugins();

      expect(plugins).toContain('specweave');
      expect(plugins).not.toContain('.hidden');
    });
  });

  describe('getLoadedPlugins', () => {
    it('should return list of loaded plugins', () => {
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');

      const plugins = cacheManager.getLoadedPlugins();

      expect(plugins).toContain('specweave');
      expect(plugins).toContain('specweave-github');
    });

    it('should return empty array if no active plugins', () => {
      const plugins = cacheManager.getLoadedPlugins();
      expect(plugins).toEqual([]);
    });
  });

  describe('cleanupCache', () => {
    // SIMPLIFIED (v1.0.122+): cleanupCache is now a no-op since we read directly from marketplace
    // There's no intermediate cache to clean up
    it('should be a no-op with simplified architecture', async () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const result = await cacheManager.cleanupCache();

      // Since getCachedPlugins() and getMarketplacePlugins() return the same list,
      // there are never any "stale" plugins to remove
      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0);
    });
  });

  describe('unloadPlugins', () => {
    beforeEach(() => {
      createMockPlugin(testActivePath, 'specweave');
      createMockPlugin(testActivePath, 'specweave-github');
      createMockPlugin(testActivePath, 'specweave-router');
    });

    it('should unload all plugins except router', async () => {
      const result = await cacheManager.unloadPlugins();

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(2);
      expect(fs.existsSync(path.join(testActivePath, 'specweave'))).toBe(false);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-github'))).toBe(false);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-router'))).toBe(true);
    });

    it('should unload specific plugins', async () => {
      const result = await cacheManager.unloadPlugins(['specweave']);

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(1);
      expect(fs.existsSync(path.join(testActivePath, 'specweave'))).toBe(false);
      expect(fs.existsSync(path.join(testActivePath, 'specweave-github'))).toBe(true);
    });

    it('should update state after unload', async () => {
      // First, set up state with loaded plugins
      const initialState = cacheManager.readState();
      initialState.loadedPlugins = ['specweave', 'specweave-github', 'specweave-router'];
      fs.writeFileSync(testStatePath, JSON.stringify(initialState));

      await cacheManager.unloadPlugins(['specweave']);

      const state = cacheManager.readState();
      expect(state.loadedPlugins).not.toContain('specweave');
    });
  });

  describe('getCacheSize', () => {
    it('should return total and per-plugin sizes', () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const sizes = cacheManager.getCacheSize();

      expect(sizes.total).toBeGreaterThan(0);
      expect(sizes.plugins['specweave']).toBeGreaterThan(0);
      expect(sizes.plugins['specweave-github']).toBeGreaterThan(0);
    });

    it('should return zero for empty cache', () => {
      const sizes = cacheManager.getCacheSize();

      expect(sizes.total).toBe(0);
      expect(Object.keys(sizes.plugins).length).toBe(0);
    });
  });

  describe('readState', () => {
    it('should return default state if file does not exist', () => {
      const state = cacheManager.readState();

      expect(state.version).toBe('1.0.0');
      expect(state.lazyMode).toBe(true);
      expect(state.cachedPlugins).toEqual([]);
      expect(state.loadedPlugins).toEqual([]);
      expect(state.analytics.totalLoads).toBe(0);
    });

    it('should read existing state file', () => {
      const testState: CacheState = {
        version: '1.0.0',
        lazyMode: true,
        lastUpdated: new Date().toISOString(),
        cachedPlugins: [],
        loadedPlugins: ['specweave'],
        analytics: { totalLoads: 5, totalTokensSaved: 1000, avgLoadTimeMs: 150 },
      };

      fs.writeFileSync(testStatePath, JSON.stringify(testState));

      const state = cacheManager.readState();

      expect(state.loadedPlugins).toContain('specweave');
      expect(state.analytics.totalLoads).toBe(5);
    });

    it('should handle corrupted state file', () => {
      fs.writeFileSync(testStatePath, 'not valid json');

      const state = cacheManager.readState();

      expect(state.version).toBe('1.0.0');
      expect(state.loadedPlugins).toEqual([]);
    });
  });

  describe('installPluginsBackground', () => {
    beforeEach(() => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');
    });

    it('should return task ID immediately', () => {
      const taskId = cacheManager.installPluginsBackground();

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^install-\d+-[a-z0-9]+$/);
    });

    it('should allow checking task status', async () => {
      const taskId = cacheManager.installPluginsBackground({
        plugins: ['specweave'],
      });

      // Initial status should be pending or running
      const initialStatus = cacheManager.checkInstallStatus(taskId);
      expect(initialStatus).not.toBeNull();
      expect(['pending', 'running', 'completed']).toContain(initialStatus!.status);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalStatus = cacheManager.checkInstallStatus(taskId);
      expect(finalStatus).not.toBeNull();
      expect(finalStatus!.status).toBe('completed');
      expect(finalStatus!.installed).toContain('specweave');
    });

    it('should return null for unknown task ID', () => {
      const status = cacheManager.checkInstallStatus('unknown-task-id');
      expect(status).toBeNull();
    });

    it('should track progress during installation', async () => {
      const taskId = cacheManager.installPluginsBackground({
        plugins: ['specweave', 'specweave-github'],
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cacheManager.checkInstallStatus(taskId);
      expect(status).not.toBeNull();
      expect(status!.progress).toBe(100);
      expect(status!.installed.length).toBe(2);
    });
  });

  describe('cleanupBackgroundTasks', () => {
    it('should remove old completed tasks', async () => {
      const taskId = cacheManager.installPluginsBackground({
        plugins: [],
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Task should exist
      expect(cacheManager.checkInstallStatus(taskId)).not.toBeNull();

      // Cleanup with very short max age
      cacheManager.cleanupBackgroundTasks(1);

      // Wait a bit more than the max age
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now cleanup should remove it
      cacheManager.cleanupBackgroundTasks(1);

      // Task should be gone
      expect(cacheManager.checkInstallStatus(taskId)).toBeNull();
    });
  });
});

/**
 * Helper to create a mock plugin directory
 */
function createMockPlugin(basePath: string, pluginName: string): void {
  const pluginPath = path.join(basePath, pluginName);
  const skillsPath = path.join(pluginPath, 'skills', 'test-skill');
  const claudePluginPath = path.join(pluginPath, '.claude-plugin');

  fs.mkdirSync(skillsPath, { recursive: true });
  fs.mkdirSync(claudePluginPath, { recursive: true });

  // Create skill file
  fs.writeFileSync(
    path.join(skillsPath, 'SKILL.md'),
    `# Test Skill\nThis is a test skill for ${pluginName}`
  );

  // Create plugin.json
  fs.writeFileSync(
    path.join(claudePluginPath, 'plugin.json'),
    JSON.stringify({ name: pluginName, version: '1.0.0' })
  );
}
