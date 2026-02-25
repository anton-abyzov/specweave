import { describe, it, expect } from 'vitest';

/**
 * Unit Tests: Plugin Installation Detector
 *
 * Tests detection of plugin installations during Claude Code sessions.
 * These tests verify the system can detect when plugins are installed
 * via specweave init, claude plugin install, or other triggers.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  detectPluginInstallation,
  parseInstalledPlugins,
  type PluginInstallEvent,
  type DetectionResult,
} from '../../../src/core/session/plugin-install-detector.js';

describe('Plugin Installation Detector', () => {
  describe('detectPluginInstallation()', () => {
    it('should detect plugin installation from "sw installed" success message', () => {
      // Given: Hook output containing "sw installed" success message
      const hookOutput = `
        - Installing core plugin...
        Plugin already installed: sw
        - Installing sw...
        ✔ sw installed
      `;

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: it should return detected: true with plugin list
      expect(result.detected).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.plugins).toContain('sw');
    });

    it('should detect multiple plugins from specweave init output', () => {
      // Given: Output from "specweave init" with multiple plugins
      const hookOutput = `
        🚀 SpecWeave Initialization
        - Creating SpecWeave project...
        ✔ sw installed
        ✔ frontend installed
        ✔ payments installed
        ✔ backend installed
        ✅ Lazy Loading Enabled
      `;

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: it should return all installed plugins
      expect(result.detected).toBe(true);
      expect(result.event?.plugins).toContain('sw');
      expect(result.event?.plugins).toContain('frontend');
      expect(result.event?.plugins).toContain('payments');
      expect(result.event?.plugins).toContain('backend');
      expect(result.event?.plugins.length).toBe(4);
    });

    it('should detect plugin installation from claude plugin install output', () => {
      // Given: Output from "claude plugin install" command
      const hookOutput = `
        Installing plugin sw-github@specweave...
        ✓ Plugin sw-github installed successfully
      `;

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: it should return detected: true
      expect(result.detected).toBe(true);
      expect(result.event?.plugins).toContain('sw-github');
      expect(result.event?.trigger).toBe('claude-plugin-install');
    });

    it('should return detected: false when no plugin installation occurred', () => {
      // Given: Hook output with no plugin installation
      const hookOutput = `
        Running user-prompt-submit hook...
        Checking for existing config...
        No plugins to install.
        Hook completed successfully.
      `;

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: it should return detected: false
      expect(result.detected).toBe(false);
      expect(result.event).toBeUndefined();
    });

    it('should return detected: false for empty output', () => {
      // Given: Empty hook output
      const hookOutput = '';

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: it should return detected: false
      expect(result.detected).toBe(false);
    });

    it('should detect trigger type as specweave-init when SpecWeave Initialization present', () => {
      // Given: Output from specweave init
      const hookOutput = `
        🚀 SpecWeave Initialization
        ✔ sw installed
      `;

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: trigger should be specweave-init
      expect(result.event?.trigger).toBe('specweave-init');
    });

    it('should include timestamp in detection event', () => {
      // Given: Hook output with plugin installation
      const hookOutput = '✔ sw installed';

      // When: detectPluginInstallation() is called
      const result = detectPluginInstallation(hookOutput);

      // Then: event should have timestamp
      expect(result.event?.timestamp).toBeDefined();
      expect(new Date(result.event!.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('parseInstalledPlugins()', () => {
    it('should parse single plugin from success message', () => {
      // Given: Output with single plugin
      const output = '✔ sw installed';

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should return array with plugin name
      expect(plugins).toEqual(['sw']);
    });

    it('should parse multiple plugins from output', () => {
      // Given: Output with multiple plugin installations
      const output = `
        ✔ sw installed
        ✔ frontend installed
        ✔ backend installed
      `;

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should return array of all installed plugin names
      expect(plugins).toContain('sw');
      expect(plugins).toContain('frontend');
      expect(plugins).toContain('backend');
      expect(plugins.length).toBe(3);
    });

    it('should handle "Plugin X installed successfully" format', () => {
      // Given: Alternative success message format
      const output = '✓ Plugin sw-github installed successfully';

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should extract plugin name
      expect(plugins).toContain('sw-github');
    });

    it('should return empty array when no plugins found', () => {
      // Given: Output without plugin installation
      const output = 'Some random output without plugins';

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should return empty array
      expect(plugins).toEqual([]);
    });

    it('should handle mixed success indicators (checkmark variants)', () => {
      // Given: Output with different checkmark styles
      const output = `
        ✔ sw installed
        ✓ frontend installed
        ✅ backend installed
      `;

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should extract all plugins regardless of checkmark style
      expect(plugins.length).toBe(3);
    });

    it('should not duplicate plugins if mentioned multiple times', () => {
      // Given: Output with duplicate mentions
      const output = `
        Installing sw...
        ✔ sw installed
        Plugin sw is ready
        ✔ sw installed (manual workaround)
      `;

      // When: parseInstalledPlugins() is called
      const plugins = parseInstalledPlugins(output);

      // Then: should return unique plugins only
      expect(plugins.filter(p => p === 'sw').length).toBe(1);
    });
  });
});
