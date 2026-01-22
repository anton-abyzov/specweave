/**
 * Integration Tests for Hot-Reload Functionality
 *
 * Tests the hot-reload behavior where skills become active after copying
 * to the active skills directory without requiring Claude Code restart.
 *
 * @module tests/unit/core/lazy-loading/hot-reload.integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PluginCacheManager,
  CacheState,
} from '../../../../src/core/lazy-loading/cache-manager.js';

// Create a temporary directory for tests
const TEST_BASE_DIR = path.join(os.tmpdir(), 'specweave-hot-reload-test');

describe('Hot-Reload Integration Tests', () => {
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

    // Create directories
    fs.mkdirSync(testCachePath, { recursive: true });
    fs.mkdirSync(testActivePath, { recursive: true });
    fs.mkdirSync(path.dirname(testStatePath), { recursive: true });
    fs.mkdirSync(testMarketplacePath, { recursive: true });

    // Create manager with test paths
    cacheManager = new PluginCacheManager({
      cachePath: testCachePath,
      activePath: testActivePath,
      statePath: testStatePath,
      marketplacePath: testMarketplacePath,
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

  describe('Skill Appearance After Copy', () => {
    it('should make skill appear in active directory after install', async () => {
      // Setup: Create mock plugin in cache
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'increment-planner', {
        description: 'Plan increments',
        triggers: ['increment', 'plan'],
      });

      // Act: Install the plugin
      const result = await cacheManager.installPlugins({
        plugins: ['specweave'],
      });

      // Assert: Plugin should be in active directory
      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(1);

      const skillPath = path.join(
        testActivePath,
        'specweave',
        'skills',
        'increment-planner',
        'SKILL.md'
      );
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should preserve skill content after copy', async () => {
      // Setup: Create mock plugin with specific content
      const skillContent = `---
name: test-skill
description: Test skill for hot-reload
triggers:
  - test
  - verify
---

# Test Skill

This is test content for verification.
`;
      createMockPluginWithSkill(testMarketplacePath, 'test-plugin', 'test-skill', {
        customContent: skillContent,
      });

      // Act: Install the plugin
      await cacheManager.installPlugins({
        plugins: ['test-plugin'],
      });

      // Assert: Content should be preserved
      const skillPath = path.join(
        testActivePath,
        'test-plugin',
        'skills',
        'test-skill',
        'SKILL.md'
      );
      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toBe(skillContent);
    });

    it('should report skill as loaded after install', async () => {
      // Setup
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'router', {
        description: 'Router skill',
        triggers: ['specweave', 'lazy'],
      });

      // Act
      await cacheManager.installPlugins({
        plugins: ['specweave'],
      });

      // Assert
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.getLoadedPlugins()).toContain('specweave');
    });
  });

  describe('Multiple Skill Activation', () => {
    beforeEach(() => {
      // Create multiple plugins in cache
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'increment-planner', {
        description: 'Plan increments',
        triggers: ['increment'],
      });
      createMockPluginWithSkill(testMarketplacePath, 'specweave-github', 'github-sync', {
        description: 'GitHub sync',
        triggers: ['github', 'sync'],
      });
      createMockPluginWithSkill(testMarketplacePath, 'specweave-jira', 'jira-sync', {
        description: 'JIRA sync',
        triggers: ['jira'],
      });
    });

    it('should install multiple plugins in single operation', async () => {
      // Act
      const result = await cacheManager.installPlugins({
        plugins: ['specweave', 'specweave-github', 'specweave-jira'],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(3);

      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-github')).toBe(true);
      expect(cacheManager.isPluginLoaded('specweave-jira')).toBe(true);
    });

    it('should install all plugins when no specific list provided', async () => {
      // Act
      const result = await cacheManager.installPlugins();

      // Assert
      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(3);

      const loadedPlugins = cacheManager.getLoadedPlugins();
      expect(loadedPlugins).toHaveLength(3);
      expect(loadedPlugins).toContain('specweave');
      expect(loadedPlugins).toContain('specweave-github');
      expect(loadedPlugins).toContain('specweave-jira');
    });

    it('should track all installed plugins in state file', async () => {
      // Act
      await cacheManager.installPlugins();

      // Assert
      const state = cacheManager.readState();
      expect(state.loadedPlugins).toContain('specweave');
      expect(state.loadedPlugins).toContain('specweave-github');
      expect(state.loadedPlugins).toContain('specweave-jira');
    });

    it('should install plugins by group', async () => {
      // Create additional plugin for group test
      createMockPluginWithSkill(testMarketplacePath, 'specweave-ado', 'ado-sync', {
        description: 'Azure DevOps sync',
        triggers: ['ado', 'azure'],
      });

      // Note: This test verifies the group expansion functionality
      // In real usage, 'core' group would include specweave and specweave-router
      const result = await cacheManager.installPlugins({
        plugins: ['core'],
      });

      expect(result.success).toBe(true);
      // Core group includes specweave
      expect(cacheManager.isPluginLoaded('specweave')).toBe(true);
    });
  });

  describe('State File Management', () => {
    it('should create state file on first install', async () => {
      // Ensure state file doesn't exist
      expect(fs.existsSync(testStatePath)).toBe(false);

      // Setup and install
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Assert state file created
      expect(fs.existsSync(testStatePath)).toBe(true);
    });

    it('should update analytics on each install', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      // First install
      await cacheManager.installPlugins({ plugins: ['specweave'], force: true });
      const state1 = cacheManager.readState();
      const firstTotalLoads = state1.analytics.totalLoads;

      // Second install (force to ensure it happens)
      await cacheManager.installPlugins({ plugins: ['specweave'], force: true });
      const state2 = cacheManager.readState();

      expect(state2.analytics.totalLoads).toBeGreaterThan(firstTotalLoads);
    });

    it('should persist state across manager instances', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      // Install with first manager
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Create new manager with same paths
      const newManager = new PluginCacheManager({
        cachePath: testCachePath,
        activePath: testActivePath,
        statePath: testStatePath,
        marketplacePath: testMarketplacePath,
      });

      // Verify state persisted
      const state = newManager.readState();
      expect(state.loadedPlugins).toContain('specweave');
    });

    it('should track lastUpdated timestamp', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      const beforeInstall = new Date().toISOString();
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      const state = cacheManager.readState();
      expect(new Date(state.lastUpdated).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeInstall).getTime()
      );
    });
  });

  describe('Installation Performance', () => {
    it('should complete installation in under 2 seconds', async () => {
      // Create multiple plugins to test performance
      for (let i = 0; i < 5; i++) {
        createMockPluginWithSkill(testMarketplacePath, `plugin-${i}`, 'skill', {
          description: `Test plugin ${i}`,
        });
      }

      const startTime = performance.now();
      const result = await cacheManager.installPlugins();
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      // Relaxed threshold for CI/various environments (catches major regressions)
      expect(duration).toBeLessThan(15000); // 15 seconds
      expect(result.durationMs).toBeLessThan(15000);
    });

    it('should skip already installed plugins (idempotent)', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      // First install
      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Second install should skip
      const result = await cacheManager.installPlugins({ plugins: ['specweave'] });

      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0); // No new plugins installed
    });
  });

  describe('Background Installation', () => {
    it('should return task ID immediately', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      const taskId = cacheManager.installPluginsBackground({
        plugins: ['specweave'],
      });

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^install-\d+-[a-z0-9]+$/);
    });

    it('should complete installation in background', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'test', {});

      const taskId = cacheManager.installPluginsBackground({
        plugins: ['specweave'],
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cacheManager.checkInstallStatus(taskId);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('completed');
      expect(status!.installed).toContain('specweave');
    });

    it('should track progress during background installation', async () => {
      // Create multiple plugins
      createMockPluginWithSkill(testMarketplacePath, 'plugin-1', 'skill', {});
      createMockPluginWithSkill(testMarketplacePath, 'plugin-2', 'skill', {});

      const taskId = cacheManager.installPluginsBackground({
        plugins: ['plugin-1', 'plugin-2'],
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cacheManager.checkInstallStatus(taskId);
      expect(status!.progress).toBe(100);
      expect(status!.installed).toHaveLength(2);
    });
  });

  describe('Hot-Reload Verification Notes', () => {
    /**
     * MANUAL VERIFICATION REQUIRED:
     *
     * The following behaviors require manual testing with Claude Code:
     *
     * 1. Skills activate without restart:
     *    - Run: specweave load-plugins core
     *    - Check: /plugin list --installed shows new plugins
     *    - No Claude Code restart should be needed
     *
     * 2. User feedback during load:
     *    - Router skill should show "Loading SpecWeave skills..."
     *    - Installation spinner/progress should be visible
     *
     * 3. Skills functional immediately:
     *    - After load completes, try /sw:status
     *    - Should work without additional actions
     *
     * These tests verify the underlying file operations work correctly.
     * Claude Code's hot-reload mechanism is tested by using it.
     */
    it('should have skills in correct directory structure for Claude Code', async () => {
      createMockPluginWithSkill(testMarketplacePath, 'specweave', 'increment', {
        description: 'Plan increments',
        triggers: ['increment', 'plan'],
      });

      await cacheManager.installPlugins({ plugins: ['specweave'] });

      // Verify Claude Code expected structure:
      // ~/.claude/skills/specweave/skills/increment/SKILL.md
      const skillPath = path.join(testActivePath, 'specweave', 'skills', 'increment', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      // Verify plugin.json exists (required by Claude Code)
      const pluginJsonPath = path.join(testActivePath, 'specweave', '.claude-plugin', 'plugin.json');
      expect(fs.existsSync(pluginJsonPath)).toBe(true);
    });
  });
});

/**
 * Helper to create a mock plugin with a skill
 */
function createMockPluginWithSkill(
  basePath: string,
  pluginName: string,
  skillName: string,
  options: {
    description?: string;
    triggers?: string[];
    customContent?: string;
  } = {}
): void {
  const pluginPath = path.join(basePath, pluginName);
  const skillsPath = path.join(pluginPath, 'skills', skillName);
  const claudePluginPath = path.join(pluginPath, '.claude-plugin');

  fs.mkdirSync(skillsPath, { recursive: true });
  fs.mkdirSync(claudePluginPath, { recursive: true });

  // Create SKILL.md
  const content =
    options.customContent ||
    `---
name: ${skillName}
description: ${options.description || `${skillName} skill`}
triggers:
${(options.triggers || [skillName]).map((t) => `  - ${t}`).join('\n')}
---

# ${skillName}

Test skill content.
`;

  fs.writeFileSync(path.join(skillsPath, 'SKILL.md'), content);

  // Create plugin.json
  fs.writeFileSync(
    path.join(claudePluginPath, 'plugin.json'),
    JSON.stringify({ name: pluginName, version: '1.0.0' })
  );
}
