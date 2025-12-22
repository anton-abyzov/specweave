/**
 * Hook Scanner Tests
 *
 * Tests hook discovery and metadata extraction.
 * Updated for EDA v2 architecture (dispatchers, handlers, detectors, guards).
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

    it('should extract hook metadata correctly (v2 architecture)', async () => {
      const hooks = await scanner.scanHooks();
      // v2 architecture: look for session-start dispatcher (critical hook)
      const sessionStartDispatcher = hooks.find(h => h.name === 'session-start');

      expect(sessionStartDispatcher).toBeDefined();
      expect(sessionStartDispatcher?.plugin).toBe('specweave');
      expect(sessionStartDispatcher?.trigger).toBe('session-start');
      expect(sessionStartDispatcher?.critical).toBe(true);
    });

    it('should identify critical hooks (v2 architecture)', async () => {
      const hooks = await scanner.scanHooks();
      const criticalHooks = hooks.filter(h => h.critical);

      expect(criticalHooks.length).toBeGreaterThan(0);
      // v2 critical hooks include dispatchers and key handlers
      expect(criticalHooks.some(h =>
        h.name === 'session-start' ||
        h.name === 'post-tool-use' ||
        h.name === 'lifecycle-detector' ||
        h.name === 'status-line-handler'
      )).toBe(true);
    });

    it('should mark hooks as testable (v2 handlers/guards/detectors)', async () => {
      const hooks = await scanner.scanHooks();
      const testableHooks = hooks.filter(h => h.testable);

      expect(testableHooks.length).toBeGreaterThan(0);
      // v2 handlers, guards, and detectors are testable
      expect(testableHooks.some(h =>
        h.name.includes('handler') ||
        h.name.includes('guard') ||
        h.name.includes('detector')
      )).toBe(true);
    });

    it('should discover v2 EDA components', async () => {
      const hooks = await scanner.scanHooks();

      // Should find dispatchers
      expect(hooks.some(h => h.name === 'session-start')).toBe(true);
      expect(hooks.some(h => h.name === 'post-tool-use')).toBe(true);

      // Should find handlers
      expect(hooks.some(h => h.name === 'status-line-handler')).toBe(true);

      // Should find detectors
      expect(hooks.some(h => h.name === 'lifecycle-detector')).toBe(true);

      // Should find guards
      expect(hooks.some(h => h.name === 'metadata-json-guard')).toBe(true);
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
