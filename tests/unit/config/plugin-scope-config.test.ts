/**
 * Plugin Scope Configuration Tests
 *
 * Tests for project-scoped plugin installation configuration.
 * Verifies parsing of plugins.defaultScope, plugins.lspScope, etc.
 *
 * @increment 0179-project-scoped-plugin-installation
 * @phase RED - Writing failing tests first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PluginScopeConfig,
  PluginInstallationScope,
  getPluginScope,
  getScopeArgs,
  DEFAULT_PLUGIN_SCOPE_CONFIG,
} from '../../../src/core/types/plugin-scope.js';

describe('Plugin Scope Configuration', () => {
  describe('PluginInstallationScope type', () => {
    it('should accept valid scope values', () => {
      const userScope: PluginInstallationScope = 'user';
      const projectScope: PluginInstallationScope = 'project';
      const localScope: PluginInstallationScope = 'local';

      expect(userScope).toBe('user');
      expect(projectScope).toBe('project');
      expect(localScope).toBe('local');
    });
  });

  describe('PluginScopeConfig interface', () => {
    it('should define default scope as user', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
      };

      expect(config.defaultScope).toBe('user');
    });

    it('should define lspScope as project by default', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
        lspScope: 'project',
      };

      expect(config.lspScope).toBe('project');
    });

    it('should define specweaveScope as project by default', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
        specweaveScope: 'project',
      };

      expect(config.specweaveScope).toBe('project');
    });

    it('should support scopeOverrides for specific plugins', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
        scopeOverrides: {
          'context7': 'user',
          'playwright': 'user',
          'vtsls': 'project',
        },
      };

      expect(config.scopeOverrides?.['context7']).toBe('user');
      expect(config.scopeOverrides?.['playwright']).toBe('user');
      expect(config.scopeOverrides?.['vtsls']).toBe('project');
    });
  });

  describe('DEFAULT_PLUGIN_SCOPE_CONFIG', () => {
    it('should have user as defaultScope', () => {
      expect(DEFAULT_PLUGIN_SCOPE_CONFIG.defaultScope).toBe('user');
    });

    it('should have project as lspScope', () => {
      expect(DEFAULT_PLUGIN_SCOPE_CONFIG.lspScope).toBe('project');
    });

    it('should have project as specweaveScope', () => {
      expect(DEFAULT_PLUGIN_SCOPE_CONFIG.specweaveScope).toBe('project');
    });

    it('should override core sw plugin to user scope', () => {
      expect(DEFAULT_PLUGIN_SCOPE_CONFIG.scopeOverrides?.['sw']).toBe('user');
    });
  });

  describe('getPluginScope function', () => {
    it('should return scopeOverride if plugin has specific override', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
        scopeOverrides: {
          'context7': 'local',
        },
      };

      const scope = getPluginScope('context7', 'specweave', config);
      expect(scope).toBe('local');
    });

    it('should return lspScope for LSP plugins', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
        lspScope: 'project',
      };

      // LSP plugins from claude-code-lsps marketplace
      expect(getPluginScope('vtsls', 'claude-code-lsps', config)).toBe('project');
      expect(getPluginScope('pyright', 'claude-code-lsps', config)).toBe('project');
      expect(getPluginScope('rust-analyzer', 'claude-code-lsps', config)).toBe('project');
    });

    it('should return project scope for domain SpecWeave plugins', () => {
      // With default config, domain plugins get project scope
      expect(getPluginScope('sw-frontend', 'specweave')).toBe('project');
      expect(getPluginScope('sw-backend', 'specweave')).toBe('project');
      expect(getPluginScope('sw-github', 'specweave')).toBe('project');
      expect(getPluginScope('sw-jira', 'specweave')).toBe('project');
    });

    it('should return user scope for core sw plugin via override', () => {
      // Core sw plugin stays at user level via scopeOverrides
      expect(getPluginScope('sw', 'specweave')).toBe('user');
    });

    it('should return defaultScope for other plugins', () => {
      const config: PluginScopeConfig = {
        defaultScope: 'user',
      };

      expect(getPluginScope('context7', 'claude-plugins-official', config)).toBe('user');
      expect(getPluginScope('playwright', 'claude-plugins-official', config)).toBe('user');
    });

    it('should use defaults when config is undefined', () => {
      const scope = getPluginScope('vtsls', 'claude-code-lsps', undefined);
      expect(scope).toBe('project'); // LSP default is project
    });

    it('should use defaults when config is empty', () => {
      const scope = getPluginScope('vtsls', 'claude-code-lsps', {});
      expect(scope).toBe('project'); // LSP default is project
    });
  });
});

describe('getScopeArgs', () => {
  it('should return empty array for user scope', () => {
    expect(getScopeArgs('user')).toEqual([]);
  });

  it('should return --scope project for project scope', () => {
    expect(getScopeArgs('project')).toEqual(['--scope', 'project']);
  });

  it('should return --scope local for local scope', () => {
    expect(getScopeArgs('local')).toEqual(['--scope', 'local']);
  });
});

describe('Config Parsing for Plugin Scopes', () => {
  it('should parse plugins.scope config from JSON', () => {
    const configJson = {
      plugins: {
        scope: {
          defaultScope: 'user',
          lspScope: 'project',
          specweaveScope: 'project',
          scopeOverrides: {
            'sw': 'user',
            'context7': 'user',
            'playwright': 'user',
          },
        },
      },
    };

    // This test validates the expected config structure
    expect(configJson.plugins.scope.defaultScope).toBe('user');
    expect(configJson.plugins.scope.lspScope).toBe('project');
    expect(configJson.plugins.scope.specweaveScope).toBe('project');
    expect(configJson.plugins.scope.scopeOverrides['sw']).toBe('user');
    expect(configJson.plugins.scope.scopeOverrides['context7']).toBe('user');
  });
});
