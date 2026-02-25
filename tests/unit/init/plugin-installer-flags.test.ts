import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Unit Tests: Plugin Installer Flag Creation
 *
 * Tests that the plugin installer creates session state flags
 * when plugins are installed, enabling the restart warning feature.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  createPluginInstallFlag,
  readPluginInstallFlag,
  clearPluginInstallFlag,
  appendInstalledPlugins,
  type PluginInstallFlag,
} from '../../../src/cli/helpers/init/plugin-install-flags.js';

describe('Plugin Installer Flags', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    // Create temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-flag-test-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createPluginInstallFlag()', () => {
    it('should create flag file when plugins are installed', () => {
      // Given: Successful plugin installation via specweave init
      const plugins = ['sw', 'frontend'];

      // When: createPluginInstallFlag() is called
      createPluginInstallFlag(tempDir, {
        plugins,
        trigger: 'specweave-init',
        projectPath: tempDir,
      });

      // Then: flag file should exist
      const flagFile = path.join(stateDir, 'plugins-installed-this-session.flag');
      expect(fs.existsSync(flagFile)).toBe(true);
    });

    it('should include plugin names in the flag file', () => {
      // Given: Plugin installation
      const plugins = ['sw', 'frontend', 'backend'];

      // When: createPluginInstallFlag() is called
      createPluginInstallFlag(tempDir, {
        plugins,
        trigger: 'specweave-init',
      });

      // Then: installed-plugins.txt should contain plugin names
      const pluginsFile = path.join(stateDir, 'installed-plugins.txt');
      expect(fs.existsSync(pluginsFile)).toBe(true);

      const content = fs.readFileSync(pluginsFile, 'utf-8');
      expect(content).toContain('sw');
      expect(content).toContain('frontend');
      expect(content).toContain('backend');
    });

    it('should record the trigger type', () => {
      // Given: Plugin installation from specweave init
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      // Then: flag should record the trigger
      const flag = readPluginInstallFlag(tempDir);
      expect(flag).not.toBeNull();
      expect(flag?.trigger).toBe('specweave-init');
    });

    it('should record the timestamp', () => {
      // Given: Plugin installation
      const beforeTime = new Date().toISOString();

      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      const afterTime = new Date().toISOString();

      // Then: flag should have a valid timestamp
      const flag = readPluginInstallFlag(tempDir);
      expect(flag).not.toBeNull();
      expect(flag?.timestamp).toBeDefined();

      const flagTime = new Date(flag!.timestamp);
      expect(flagTime >= new Date(beforeTime)).toBe(true);
      expect(flagTime <= new Date(afterTime)).toBe(true);
    });

    it('should record the project path', () => {
      // Given: Plugin installation with project path
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
        projectPath: '/some/project/path',
      });

      // Then: flag should include project path
      const flag = readPluginInstallFlag(tempDir);
      expect(flag?.projectPath).toBe('/some/project/path');
    });
  });

  describe('appendInstalledPlugins()', () => {
    it('should append to existing plugins', () => {
      // Given: Existing flag with some plugins
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      // When: More plugins are installed
      appendInstalledPlugins(tempDir, ['frontend', 'backend']);

      // Then: All plugins should be in the flag
      const flag = readPluginInstallFlag(tempDir);
      expect(flag?.plugins).toContain('sw');
      expect(flag?.plugins).toContain('frontend');
      expect(flag?.plugins).toContain('backend');
    });

    it('should not duplicate plugins', () => {
      // Given: Existing flag
      createPluginInstallFlag(tempDir, {
        plugins: ['sw', 'frontend'],
        trigger: 'specweave-init',
      });

      // When: Same plugin is appended again
      appendInstalledPlugins(tempDir, ['sw', 'backend']);

      // Then: No duplicates
      const flag = readPluginInstallFlag(tempDir);
      const swCount = flag?.plugins.filter((p) => p === 'sw').length ?? 0;
      expect(swCount).toBe(1);
    });

    it('should create flag if it does not exist', () => {
      // Given: No existing flag

      // When: appendInstalledPlugins is called
      appendInstalledPlugins(tempDir, ['sw-github']);

      // Then: Flag should be created
      const flag = readPluginInstallFlag(tempDir);
      expect(flag).not.toBeNull();
      expect(flag?.plugins).toContain('sw-github');
    });
  });

  describe('readPluginInstallFlag()', () => {
    it('should return flag data when flag exists', () => {
      // Given: Flag file exists
      createPluginInstallFlag(tempDir, {
        plugins: ['sw', 'frontend'],
        trigger: 'claude-plugin-install',
        projectPath: '/test/path',
      });

      // When: readPluginInstallFlag() is called
      const flag = readPluginInstallFlag(tempDir);

      // Then: should return complete flag data
      expect(flag).not.toBeNull();
      expect(flag?.plugins).toEqual(['sw', 'frontend']);
      expect(flag?.trigger).toBe('claude-plugin-install');
      expect(flag?.projectPath).toBe('/test/path');
    });

    it('should return null when no flag exists', () => {
      // Given: No flag file

      // When: readPluginInstallFlag() is called
      const flag = readPluginInstallFlag(tempDir);

      // Then: should return null
      expect(flag).toBeNull();
    });

    it('should return null for invalid flag file', () => {
      // Given: Invalid JSON in flag file
      const flagFile = path.join(stateDir, 'plugins-installed-this-session.flag');
      fs.writeFileSync(flagFile, '{invalid json}');

      // When: readPluginInstallFlag() is called
      const flag = readPluginInstallFlag(tempDir);

      // Then: should return null
      expect(flag).toBeNull();
    });
  });

  describe('clearPluginInstallFlag()', () => {
    it('should remove flag files', () => {
      // Given: Flag files exist
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      // When: clearPluginInstallFlag() is called
      clearPluginInstallFlag(tempDir);

      // Then: flag files should be removed
      const flagFile = path.join(stateDir, 'plugins-installed-this-session.flag');
      const pluginsFile = path.join(stateDir, 'installed-plugins.txt');
      expect(fs.existsSync(flagFile)).toBe(false);
      expect(fs.existsSync(pluginsFile)).toBe(false);
    });

    it('should not throw when flag files do not exist', () => {
      // Given: No flag files

      // When/Then: clearPluginInstallFlag should not throw
      expect(() => clearPluginInstallFlag(tempDir)).not.toThrow();
    });
  });

  describe('Flag file format', () => {
    it('should be JSON format for flag file', () => {
      // Given: Flag created
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      // When: reading raw file
      const flagFile = path.join(stateDir, 'plugins-installed-this-session.flag');
      const content = fs.readFileSync(flagFile, 'utf-8');

      // Then: should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have one plugin per line in plugins text file', () => {
      // Given: Multiple plugins
      createPluginInstallFlag(tempDir, {
        plugins: ['sw', 'frontend', 'backend'],
        trigger: 'specweave-init',
      });

      // When: reading plugins file
      const pluginsFile = path.join(stateDir, 'installed-plugins.txt');
      const content = fs.readFileSync(pluginsFile, 'utf-8');
      const lines = content.trim().split('\n');

      // Then: should have one plugin per line
      expect(lines).toContain('sw');
      expect(lines).toContain('frontend');
      expect(lines).toContain('backend');
      expect(lines.length).toBe(3);
    });
  });
});
