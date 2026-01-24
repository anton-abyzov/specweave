/**
 * Integration Tests for Hot-Reload Functionality
 *
 * Tests plugin installation via Claude CLI (the only supported method).
 * Background installation and skills directory copy have been removed.
 *
 * @module tests/unit/core/lazy-loading/hot-reload.integration
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

const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-hot-reload-test');

/**
 * Create a mock plugin with a skill in the marketplace directory
 * Uses DIRECTORY names (specweave-*) for filesystem operations
 */
function createMockPluginWithSkill(
  marketplacePath: string,
  directoryName: string,
  skillName: string,
  skillConfig: Record<string, unknown>
): void {
  const pluginPath = path.join(marketplacePath, directoryName);
  const skillPath = path.join(pluginPath, 'skills', skillName);

  fs.mkdirSync(skillPath, { recursive: true });

  // Create marketplace.json with sw-* name
  fs.writeFileSync(
    path.join(pluginPath, 'marketplace.json'),
    JSON.stringify({
      name: directoryToMarketplaceName(directoryName),
      version: '1.0.0',
      description: `Test plugin ${directoryName}`,
    })
  );

  // Create SKILL.md
  fs.writeFileSync(
    path.join(skillPath, 'SKILL.md'),
    `---
name: ${skillName}
description: ${skillConfig.description || 'Test skill'}
---

# ${skillName}

Test skill content.
`
  );
}

describe('Hot-Reload Integration Tests', () => {
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

  describe('Plugin Installation', () => {
    it('should return success for valid plugins (CLI unavailable)', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
      });

      expect(result.success).toBe(true);
      // CLI unavailable so no actual installation
      expect(result.pluginsAffected).toBe(0);
    });

    it('should handle multiple plugins', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});
      createMockPluginWithSkill(testMarketplacePath, 'specweave-github', 'github-sync', {});
      createMockPluginWithSkill(testMarketplacePath, 'specweave-jira', 'jira-sync', {});

      const result = await cacheManager.installPlugins({
        plugins: ['sw', 'sw-github', 'sw-jira'],
      });

      expect(result.success).toBe(true);
    });

    it('should normalize directory names to marketplace names', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave-github', 'github-sync', {});

      // Pass directory name, should be normalized to sw-github
      const result = await cacheManager.installPlugins({
        plugins: ['specweave-github'],
      });

      expect(result.success).toBe(true);
    });

    it('should skip already registered plugins', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      // Register plugin in mock registry
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

      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
      });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0); // Already registered
    });

    it('should force reinstall with force option', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      // Register plugin in mock registry
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

      // Force should attempt reinstall (CLI unavailable so 0 affected)
      const result = await cacheManager.installPlugins({
        plugins: ['sw'],
        force: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Plugin Registration Check', () => {
    it('should check if plugin is registered', () => {
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
      expect(cacheManager.isPluginRegistered('sw-github')).toBe(false);
    });

    it('should use correct registry key format (sw-*@specweave)', () => {
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
          'sw-ado@specweave': [{
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
      expect(cacheManager.isPluginRegistered('sw-ado')).toBe(true);
      expect(cacheManager.isPluginRegistered('sw-router')).toBe(false);
    });
  });

  describe('Marketplace Plugin Discovery', () => {
    it('should discover plugins in marketplace', () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});
      createMockPluginWithSkill(testMarketplacePath, 'specweave-github', 'github-sync', {});

      const plugins = cacheManager.getMarketplacePlugins();

      // Returns sw-* marketplace names
      expect(plugins).toContain('sw');
      expect(plugins).toContain('sw-github');
    });

    it('should return empty array for missing marketplace', () => {
      fs.rmSync(testMarketplacePath, { recursive: true });

      const plugins = cacheManager.getMarketplacePlugins();

      expect(plugins).toEqual([]);
    });
  });

  describe('State Management', () => {
    it('should read state from file', () => {
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

    it('should return default state if file missing', () => {
      const state = cacheManager.readState();

      expect(state.version).toBeDefined();
      expect(state.loadedPlugins).toEqual([]);
      expect(state.totalLoads).toBe(0);
    });
  });

  describe('Analytics Summary', () => {
    it('should return analytics summary', () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});
      createMockPluginWithSkill(testMarketplacePath, 'specweave-github', 'sync', {});

      const summary = cacheManager.getAnalyticsSummary();

      expect(summary.availablePlugins).toBe(2);
      expect(summary.totalLoads).toBeDefined();
      expect(summary.loadedPlugins).toBeDefined();
    });
  });

  // NOTE: Background installation was removed in v1.0.157
  // All plugin operations now go through Claude CLI only
  describe.skip('Background Installation (REMOVED)', () => {
    /**
     * Background installation via installPluginsBackground() was removed.
     *
     * Reasons:
     * 1. All plugin operations MUST go through Claude CLI
     * 2. Direct registry manipulation caused wrong plugin names
     * 3. Simplified architecture - CLI is the single source of truth
     *
     * To install plugins:
     *   claude plugin install sw@specweave
     *   claude plugin install sw-github@specweave
     */
    it('placeholder', () => {
      expect(true).toBe(true);
    });
  });
});
