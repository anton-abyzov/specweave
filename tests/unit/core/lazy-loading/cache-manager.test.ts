/**
 * Tests for Plugin Cache Manager - Lazy Loading
 *
 * @module tests/unit/core/lazy-loading/cache-manager
 *
 * Uses vi.hoisted() for ESM mocking in vitest 4.x to ensure mocks
 * are properly applied before module imports.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Claude CLI detection - CLI unavailable in tests
const { mockDetectClaudeCli, mockIsClaudeCliAvailable, mockClearCliCache } = vi.hoisted(() => ({
  mockDetectClaudeCli: vi.fn().mockReturnValue({ available: false }),
  mockIsClaudeCliAvailable: vi.fn().mockReturnValue(false),
  mockClearCliCache: vi.fn(),
}));

vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  isClaudeCliAvailable: mockIsClaudeCliAvailable,
  clearCliCache: mockClearCliCache,
}));

import {
  PluginCacheManager,
  CACHE_PATHS,
  marketplaceNameToDirectory,
  directoryToMarketplaceName,
} from '../../../../src/core/lazy-loading/cache-manager.js';

const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-cache-manager-test');

/**
 * Create a mock plugin in the marketplace directory
 * Uses DIRECTORY names (specweave, specweave-github) for filesystem
 */
function createMockPlugin(marketplacePath: string, directoryName: string): void {
  const pluginPath = path.join(marketplacePath, directoryName);
  fs.mkdirSync(pluginPath, { recursive: true });
  fs.writeFileSync(
    path.join(pluginPath, 'marketplace.json'),
    JSON.stringify({
      name: directoryToMarketplaceName(directoryName),
      version: '1.0.0',
      description: `Test plugin ${directoryName}`,
    })
  );
}

describe('PluginCacheManager', () => {
  let cacheManager: PluginCacheManager;
  let testStatePath: string;
  let testMarketplacePath: string;
  let testRegistryPath: string;

  beforeEach(() => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testDir = path.join(TEST_BASE_DIR, testId);

    testStatePath = path.join(testDir, 'state', 'plugins-loaded.json');
    testMarketplacePath = path.join(testDir, 'marketplace', 'plugins');
    testRegistryPath = path.join(testDir, 'plugins', 'installed_plugins.json');

    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });
    fs.mkdirSync(path.dirname(testRegistryPath), { recursive: true });

    cacheManager = new PluginCacheManager({
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

  describe('constructor', () => {
    it('should use default paths when no options provided', () => {
      const defaultManager = new PluginCacheManager();
      expect(defaultManager).toBeDefined();
    });

    it('should accept custom paths', () => {
      expect(cacheManager).toBeDefined();
    });
  });

  describe('CACHE_PATHS constant', () => {
    it('should have state and marketplace paths', () => {
      expect(CACHE_PATHS.state).toContain('plugins-loaded.json');
      expect(CACHE_PATHS.marketplace).toContain('.claude');
    });
  });

  describe('Name conversion functions', () => {
    it('should convert marketplace names to directory names', () => {
      expect(marketplaceNameToDirectory('sw')).toBe('specweave');
      expect(marketplaceNameToDirectory('sw-github')).toBe('specweave-github');
      expect(marketplaceNameToDirectory('sw-ado')).toBe('specweave-ado');
      expect(marketplaceNameToDirectory('sw-router')).toBe('specweave-router');
      // Already directory names pass through
      expect(marketplaceNameToDirectory('specweave')).toBe('specweave');
      expect(marketplaceNameToDirectory('specweave-github')).toBe('specweave-github');
    });

    it('should convert directory names to marketplace names', () => {
      expect(directoryToMarketplaceName('specweave')).toBe('sw');
      expect(directoryToMarketplaceName('specweave-github')).toBe('sw-github');
      expect(directoryToMarketplaceName('specweave-ado')).toBe('sw-ado');
      expect(directoryToMarketplaceName('specweave-router')).toBe('sw-router');
      // Already marketplace names pass through
      expect(directoryToMarketplaceName('sw')).toBe('sw');
      expect(directoryToMarketplaceName('sw-github')).toBe('sw-github');
    });
  });

  describe('populateCache', () => {
    it('should validate marketplace and report plugin count', async () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const result = await cacheManager.populateCache();

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(2);
    });

    it('should return error if marketplace not found', async () => {
      fs.rmSync(testMarketplacePath, { recursive: true });

      const result = await cacheManager.populateCache();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Marketplace not found');
    });
  });

  describe('installPlugins', () => {
    beforeEach(() => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');
      createMockPlugin(testMarketplacePath, 'specweave-ado');
    });

    it('should return success when CLI unavailable (no plugins affected)', async () => {
      const result = await cacheManager.installPlugins();

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0);
    });

    it('should handle specific plugins request', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['sw', 'sw-github'],
      });

      expect(result.success).toBe(true);
    });

    it('should normalize plugin names (directory to marketplace)', async () => {
      // specweave-github should become sw-github
      const result = await cacheManager.installPlugins({
        plugins: ['specweave-github'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle force option', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
        force: true,
      });

      expect(result.success).toBe(true);
    });

    it('should return error for missing marketplace', async () => {
      fs.rmSync(testMarketplacePath, { recursive: true });

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Marketplace not found');
    });
  });

  describe('isPluginRegistered', () => {
    it('should return true for registered plugins', () => {
      // Use MARKETPLACE name format: sw@specweave
      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{
            scope: 'user',
            installPath: '/test/path',
            version: '1.0.0',
            installedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      expect(cacheManager.isPluginRegistered('sw')).toBe(true);
    });

    it('should return false for unregistered plugins', () => {
      expect(cacheManager.isPluginRegistered('sw')).toBe(false);
    });

    it('should handle sw-github format', () => {
      const registry = {
        version: 2,
        plugins: {
          'sw-github@specweave': [{
            scope: 'user',
            installPath: '/test/path',
            version: '1.0.0',
            installedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      expect(cacheManager.isPluginRegistered('sw-github')).toBe(true);
    });
  });

  describe('isPluginLoaded (alias)', () => {
    it('should be alias for isPluginRegistered', () => {
      const registry = {
        version: 2,
        plugins: {
          'sw-router@specweave': [{
            scope: 'user',
            installPath: '/test/path',
            version: '1.0.0',
            installedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      expect(cacheManager.isPluginLoaded('sw-router')).toBe(true);
      expect(cacheManager.isPluginLoaded('sw-ado')).toBe(false);
    });
  });

  describe('getMarketplacePlugins', () => {
    it('should return marketplace plugins as sw-* names', () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');
      createMockPlugin(testMarketplacePath, 'specweave-ado');

      const plugins = cacheManager.getMarketplacePlugins();

      // Returns sw-* marketplace names
      expect(plugins).toContain('sw');
      expect(plugins).toContain('sw-github');
      expect(plugins).toContain('sw-ado');
      expect(plugins.length).toBe(3);
    });

    it('should return empty array if marketplace missing', () => {
      fs.rmSync(testMarketplacePath, { recursive: true });

      const plugins = cacheManager.getMarketplacePlugins();

      expect(plugins).toEqual([]);
    });
  });

  describe('readState', () => {
    it('should return default state if file missing', () => {
      const state = cacheManager.readState();

      expect(state.version).toBeDefined();
      expect(state.loadedPlugins).toEqual([]);
      expect(state.totalLoads).toBe(0);
    });

    it('should read existing state file', () => {
      const existingState = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        loadedPlugins: ['sw', 'sw-github'],
        totalLoads: 5,
      };
      fs.writeFileSync(testStatePath, JSON.stringify(existingState, null, 2));

      const state = cacheManager.readState();

      expect(state.loadedPlugins).toContain('sw');
      expect(state.loadedPlugins).toContain('sw-github');
      expect(state.totalLoads).toBe(5);
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary', () => {
      createMockPlugin(testMarketplacePath, 'specweave');
      createMockPlugin(testMarketplacePath, 'specweave-github');

      const summary = cacheManager.getAnalyticsSummary();

      expect(summary.totalLoads).toBeDefined();
      expect(summary.loadedPlugins).toBeDefined();
      expect(summary.availablePlugins).toBe(2);
    });
  });
});
