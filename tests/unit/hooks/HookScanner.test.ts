import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Hook Scanner Tests
 *
 * Tests hook discovery and metadata extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookScanner } from '../../../src/core/hooks/HookScanner.js';
import { ScannerConfig } from '../../../src/core/hooks/types.js';
import * as path from 'path';

describe('HookScanner', () => {
  let scanner: HookScanner;
  let config: ScannerConfig;

  beforeEach(() => {
    const projectRoot = process.cwd();
    const pluginDirs = [path.join(projectRoot, 'plugins/specweave')];

    config = {
      projectRoot,
      pluginDirs,
      includeNonTestable: true
    };

    scanner = new HookScanner(config);
  });

  describe('scanHooks', () => {
    it('should discover hooks in plugin directories', async () => {
      const hooks = await scanner.scanHooks();

      expect(hooks).toBeDefined();
      expect(Array.isArray(hooks)).toBe(true);
      expect(hooks.length).toBeGreaterThan(0);
    });

    it('should extract hook metadata correctly', async () => {
      const hooks = await scanner.scanHooks();
      const postTaskCompletion = hooks.find(h => h.name === 'post-task-completion');

      expect(postTaskCompletion).toBeDefined();
      expect(postTaskCompletion?.plugin).toBe('specweave');
      expect(postTaskCompletion?.trigger).toBe('post-task-completion');
      expect(postTaskCompletion?.critical).toBe(true);
    });

    it('should identify critical hooks', async () => {
      const hooks = await scanner.scanHooks();
      const criticalHooks = hooks.filter(h => h.critical);

      expect(criticalHooks.length).toBeGreaterThan(0);
      expect(criticalHooks.some(h => h.name === 'post-task-completion')).toBe(true);
    });

    it('should mark hooks as testable', async () => {
      const hooks = await scanner.scanHooks();
      const testableHooks = hooks.filter(h => h.testable);

      expect(testableHooks.length).toBeGreaterThan(0);
    });
  });

  describe('findPluginDirectories', () => {
    it('should find all plugin directories', async () => {
      const projectRoot = process.cwd();
      const pluginDirs = await HookScanner.findPluginDirectories(projectRoot);

      expect(pluginDirs).toBeDefined();
      expect(Array.isArray(pluginDirs)).toBe(true);
      expect(pluginDirs.length).toBeGreaterThan(0);
      expect(pluginDirs.some(dir => dir.includes('specweave'))).toBe(true);
    });
  });

  describe('createDefaultConfig', () => {
    it('should create valid default config', async () => {
      const projectRoot = process.cwd();
      const defaultConfig = await HookScanner.createDefaultConfig(projectRoot);

      expect(defaultConfig.projectRoot).toBe(projectRoot);
      expect(defaultConfig.pluginDirs.length).toBeGreaterThan(0);
      expect(defaultConfig.includeNonTestable).toBe(true);
    });
  });
});
