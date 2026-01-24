/**
 * Cache Manager Flow Tests (Unit Tests)
 *
 * Tests the PluginCacheManager class flows:
 * - Init → Install → Verify
 * - Plugin registration check
 * - State management
 *
 * NOTE: These are UNIT tests using mocked filesystem paths.
 * All plugin operations now go through Claude CLI.
 *
 * @module tests/unit/core/lazy-loading/cache-manager-flow
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
  directoryToMarketplaceName,
} from '../../../../src/core/lazy-loading/cache-manager.js';

const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-flow-test');

describe('Cache Manager Flow Tests', () => {
  let testDir: string;
  let testStatePath: string;
  let testMarketplacePath: string;
  let testRegistryPath: string;

  beforeEach(() => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(TEST_BASE_DIR, testId);

    testStatePath = path.join(testDir, 'state', 'plugins-loaded.json');
    testMarketplacePath = path.join(testDir, 'marketplace', 'plugins');
    testRegistryPath = path.join(testDir, 'plugins', 'installed_plugins.json');

    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });
    fs.mkdirSync(path.dirname(testRegistryPath), { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Init → Populate → Install Flow', () => {
    it('should complete full init to install flow', async () => {
      // Step 1: Simulate marketplace population
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
      ]);

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      // Step 2: Verify marketplace ready
      const populateResult = await cacheManager.populateCache();
      expect(populateResult.success).toBe(true);
      expect(populateResult.pluginsAffected).toBe(4);

      // Verify marketplace plugins available
      const marketplacePlugins = cacheManager.getMarketplacePlugins();
      expect(marketplacePlugins).toHaveLength(4);
      expect(marketplacePlugins).toContain('sw');
      expect(marketplacePlugins).toContain('sw-router');

      // Step 3: Install router only (CLI unavailable = 0 affected)
      const initResult = await cacheManager.installPlugins({
        plugins: ['sw-router'],
      });
      expect(initResult.success).toBe(true);
      expect(initResult.pluginsAffected).toBe(0); // CLI unavailable

      // Verify state updates (even without actual CLI install)
      const state = cacheManager.readState();
      expect(state.version).toBeDefined();
      expect(state.lastUpdated).toBeDefined();
    });

    it('should support selective plugin loading', async () => {
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
        'specweave-ado',
        'specweave-frontend',
        'specweave-backend',
      ]);

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      await cacheManager.populateCache();

      // Request specific plugins
      const result = await cacheManager.installPlugins({
        plugins: ['sw', 'sw-github'],
      });

      expect(result.success).toBe(true);

      // Verify marketplace still shows all plugins
      const marketplacePlugins = cacheManager.getMarketplacePlugins();
      expect(marketplacePlugins).toHaveLength(7);
    });
  });

  describe('Plugin Registration Check', () => {
    it('should check registration with correct key format', () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      // Create registry with proper sw-* format
      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
          'sw-router@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      // isPluginRegistered uses sw-* format
      expect(cacheManager.isPluginRegistered('sw')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-router')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-github')).toBe(false);
    });

    it('should skip already registered plugins', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave']);

      // Pre-register plugin
      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0); // Already registered
    });
  });

  describe('Full Installation Mode', () => {
    it('should request install for all plugins with no filter', async () => {
      createMarketplacePlugins(testMarketplacePath, [
        'specweave',
        'specweave-router',
        'specweave-github',
        'specweave-jira',
        'specweave-ado',
      ]);

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      await cacheManager.populateCache();
      const result = await cacheManager.installPlugins(); // No filter = all plugins

      expect(result.success).toBe(true);
      // CLI unavailable so 0 affected, but operation succeeded
      expect(result.pluginsAffected).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should preserve state across operations', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      await cacheManager.populateCache();
      const state1 = cacheManager.readState();
      expect(state1.version).toBeDefined();

      await cacheManager.installPlugins({ plugins: ['sw'] });
      const state2 = cacheManager.readState();
      expect(state2.totalLoads).toBeGreaterThanOrEqual(1);
    });

    it('should track state in marketplace names (sw-*)', async () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-router']);

      // Pre-register to simulate successful install
      const registry = {
        version: 2,
        plugins: {
          'sw@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
          'sw-router@specweave': [{ scope: 'user', installPath: '/test', version: '1.0.0' }],
        },
      };
      fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      await cacheManager.installPlugins({ plugins: ['sw', 'sw-router'] });

      const state = cacheManager.readState();
      // State file stores marketplace names (sw-*)
      expect(state.loadedPlugins).toContain('sw');
      expect(state.loadedPlugins).toContain('sw-router');
    });
  });

  describe('Analytics', () => {
    it('should return analytics summary', () => {
      createMarketplacePlugins(testMarketplacePath, ['specweave', 'specweave-github']);

      const cacheManager = new PluginCacheManager({
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
        registryPath: testRegistryPath,
      });

      const summary = cacheManager.getAnalyticsSummary();

      expect(summary.availablePlugins).toBe(2);
      expect(summary.totalLoads).toBeDefined();
      expect(summary.loadedPlugins).toBeDefined();
    });
  });

  // NOTE: Migration and rollback tests removed (v1.0.157)
  // Strategy 3 (skills dir copy) was REMOVED.
  // All plugin operations now go through Claude CLI.
  // See: tests/unit/core/lazy-loading/migration.test.ts for migration notes.
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
function createMockPlugin(basePath: string, directoryName: string): void {
  const pluginPath = path.join(basePath, directoryName);
  const skillsPath = path.join(pluginPath, 'skills', 'test-skill');

  fs.mkdirSync(skillsPath, { recursive: true });

  // Create marketplace.json with sw-* name
  fs.writeFileSync(
    path.join(pluginPath, 'marketplace.json'),
    JSON.stringify({
      name: directoryToMarketplaceName(directoryName),
      version: '1.0.0',
      description: `Test plugin ${directoryName}`,
    })
  );

  fs.writeFileSync(
    path.join(skillsPath, 'SKILL.md'),
    `# Test Skill\nPlugin: ${directoryName}`
  );
}
