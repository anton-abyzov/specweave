/**
 * Migration Tests for Lazy Loading
 *
 * Tests plugin installation scenarios and state management.
 * Note: Direct registry manipulation and skills directory copy have been removed.
 * All plugin operations now go through Claude CLI.
 *
 * @module tests/unit/core/lazy-loading/migration
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
  marketplaceNameToDirectory,
  directoryToMarketplaceName,
} from '../../../../src/core/lazy-loading/cache-manager.js';

const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-migration-test');

/**
 * Create mock plugins in marketplace
 */
function createMarketplacePlugins(marketplacePath: string, plugins: string[]): void {
  for (const pluginDir of plugins) {
    const pluginPath = path.join(marketplacePath, pluginDir);
    fs.mkdirSync(pluginPath, { recursive: true });
    fs.writeFileSync(
      path.join(pluginPath, 'marketplace.json'),
      JSON.stringify({
        name: directoryToMarketplaceName(pluginDir),
        version: '1.0.0',
      })
    );
  }
}

describe('Migration Tests', () => {
  let testStatePath: string;
  let testMarketplacePath: string;
  let testRegistryPath: string;
  let cacheManager: PluginCacheManager;

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

  describe('Marketplace Discovery', () => {
    it('should discover plugins from marketplace', () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const plugins = cacheManager.getMarketplacePlugins();

      expect(plugins).toContain('sw');
      expect(plugins).toContain('sw-router');
    });

    it('should handle empty marketplace', () => {
      const plugins = cacheManager.getMarketplacePlugins();
      expect(plugins).toEqual([]);
    });
  });

  describe('Plugin Registration', () => {
    it('should check registered plugins correctly', () => {
      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
          'sw-router@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      expect(cacheManager.isPluginRegistered('sw')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-router')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-github')).toBe(false);
    });

    it('should use marketplace name format for registry keys', () => {
      // Key format: sw-github@specweave (NOT specweave-github@specweave)
      const registry = {
        version: 2,
        plugins: {
          'sw-github@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
          'sw-ado@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      expect(cacheManager.isPluginRegistered('sw-github')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-ado')).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should preserve state across operations', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      await cacheManager.populateCache();

      const state = cacheManager.readState();
      expect(state.version).toBeDefined();
      expect(state.lastUpdated).toBeDefined();
    });

    it('should track totalLoads', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave']);

      await cacheManager.populateCache();
      const state1 = cacheManager.readState();

      await cacheManager.populateCache();
      const state2 = cacheManager.readState();

      expect(state2.totalLoads).toBeGreaterThanOrEqual(state1.totalLoads);
    });
  });

  describe('Name Normalization', () => {
    it('should normalize directory names to marketplace names', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave-github']);

      // Pass directory name
      const result = await cacheManager.installPlugins({
        plugins: ['specweave-github'], // directory name
      });

      expect(result.success).toBe(true);
    });

    it('should accept marketplace names directly', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave-github']);

      const result = await cacheManager.installPlugins({
        plugins: ['sw-github'], // marketplace name
      });

      expect(result.success).toBe(true);
    });
  });

  describe('CLI-Only Installation', () => {
    // NOTE: Direct registry manipulation was removed in v1.0.157
    // All plugin operations MUST go through Claude CLI

    it('should not install when CLI unavailable', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const result = await cacheManager.installPlugins({
        plugins: ['sw', 'sw-router'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0); // CLI unavailable
    });

    it('should skip already registered plugins', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave']);

      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0); // Already registered
    });

    it('should attempt reinstall with force option', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave']);

      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
        force: true,
      });

      expect(result.success).toBe(true);
      // CLI unavailable so 0 affected, but force flag was processed
    });
  });

  // NOTE: Memory preservation tests removed
  // The unloadPlugins and skills directory copy functionality was removed
  // All plugin operations now go through Claude CLI
  describe.skip('Memory Preservation (REMOVED)', () => {
    /**
     * Memory preservation via MEMORY.md files was removed.
     *
     * The previous workflow was:
     * 1. Collect MEMORY.md files
     * 2. Unload plugins
     * 3. Install new plugins
     * 4. Restore MEMORY.md files
     *
     * This is no longer needed since plugins are managed by Claude CLI.
     * Memory/learnings are now stored in .specweave/state/ and CLAUDE.md.
     */
    it('placeholder', () => {
      expect(true).toBe(true);
    });
  });
});
