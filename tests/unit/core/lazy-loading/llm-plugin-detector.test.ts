/**
 * Tests for LLM Plugin Detector - Pure/Testable Functions
 *
 * Tests constants, lookup functions, config reading, cache management,
 * and hook output formatting. Does NOT test LLM calls or CLI execution.
 *
 * @module tests/unit/core/lazy-loading/llm-plugin-detector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock dependencies that require Claude CLI or side effects
const { mockDetectClaudeCli, mockGetCleanEnv } = vi.hoisted(() => ({
  mockDetectClaudeCli: vi.fn(),
  mockGetCleanEnv: vi.fn(() => ({})),
}));

vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getCleanEnv: mockGetCleanEnv,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: vi.fn(),
  getScopeArgs: vi.fn(() => []),
}));

import {
  SPECWEAVE_PLUGINS,
  OFFICIAL_PLUGINS,
  ALL_VALID_PLUGINS,
  isSpecWeavePlugin,
  isOfficialPlugin,
  getPluginMarketplace,
  readPluginAutoLoadConfig,
  clearCliCache,
  getCliStatus,
  formatHookOutput,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

import type {
  LLMDetectionResult,
  PluginInstallResult,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

// ============================================================
// SPECWEAVE_PLUGINS constant
// ============================================================
describe('SPECWEAVE_PLUGINS constant', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(SPECWEAVE_PLUGINS)).toBe(true);
    expect(SPECWEAVE_PLUGINS.length).toBeGreaterThanOrEqual(22);
  });

  it('should have "sw" as the first element (core plugin)', () => {
    expect(SPECWEAVE_PLUGINS[0]).toBe('sw');
  });

  it('should include development domain plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-frontend');
    expect(SPECWEAVE_PLUGINS).toContain('sw-backend');
    expect(SPECWEAVE_PLUGINS).toContain('sw-testing');
    expect(SPECWEAVE_PLUGINS).toContain('sw-mobile');
  });

  it('should include infrastructure plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-infra');
    expect(SPECWEAVE_PLUGINS).toContain('sw-k8s');
  });

  it('should include external tool integration plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-github');
    expect(SPECWEAVE_PLUGINS).toContain('sw-jira');
    expect(SPECWEAVE_PLUGINS).toContain('sw-ado');
  });

  it('should include specialized domain plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-payments');
    expect(SPECWEAVE_PLUGINS).toContain('sw-ml');
    expect(SPECWEAVE_PLUGINS).toContain('sw-kafka');
    expect(SPECWEAVE_PLUGINS).toContain('sw-confluent');
  });

  it('should include additional marketplace plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-kafka-streams');
    expect(SPECWEAVE_PLUGINS).toContain('sw-n8n');
    expect(SPECWEAVE_PLUGINS).toContain('sw-figma');
    expect(SPECWEAVE_PLUGINS).toContain('sw-cost');
    expect(SPECWEAVE_PLUGINS).toContain('sw-docs');
    expect(SPECWEAVE_PLUGINS).toContain('sw-diagrams');
    expect(SPECWEAVE_PLUGINS).toContain('sw-media');
    expect(SPECWEAVE_PLUGINS).toContain('sw-release');
  });

  it('should NOT contain removed plugins', () => {
    // sw-ui removed v1.0.204
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-ui');
    // sw-router removed v1.0.160
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-router');
    // sw-plugin-dev removed v1.0.203
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-plugin-dev');
  });

  it('should have no duplicates', () => {
    const uniqueSet = new Set(SPECWEAVE_PLUGINS);
    expect(uniqueSet.size).toBe(SPECWEAVE_PLUGINS.length);
  });

  it('should only contain strings starting with "sw"', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(plugin).toMatch(/^sw/);
    }
  });
});

// ============================================================
// OFFICIAL_PLUGINS constant
// ============================================================
describe('OFFICIAL_PLUGINS constant', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(OFFICIAL_PLUGINS)).toBe(true);
    expect(OFFICIAL_PLUGINS.length).toBeGreaterThanOrEqual(9);
  });

  it('should include service integration plugins', () => {
    expect(OFFICIAL_PLUGINS).toContain('firebase');
    expect(OFFICIAL_PLUGINS).toContain('gitlab');
    expect(OFFICIAL_PLUGINS).toContain('linear');
    expect(OFFICIAL_PLUGINS).toContain('asana');
    expect(OFFICIAL_PLUGINS).toContain('slack');
    expect(OFFICIAL_PLUGINS).toContain('supabase');
  });

  it('should include framework-specific plugins', () => {
    expect(OFFICIAL_PLUGINS).toContain('laravel-boost');
  });

  it('should include development tool plugins', () => {
    expect(OFFICIAL_PLUGINS).toContain('code-review');
    expect(OFFICIAL_PLUGINS).toContain('commit-commands');
    expect(OFFICIAL_PLUGINS).toContain('hookify');
  });

  it('should NOT contain broken LSP plugins', () => {
    expect(OFFICIAL_PLUGINS).not.toContain('csharp-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('gopls-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('jdtls-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('kotlin-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('php-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('lua-lsp');
    expect(OFFICIAL_PLUGINS).not.toContain('clangd-lsp');
  });

  it('should NOT contain removed plugins (context7, playwright)', () => {
    expect(OFFICIAL_PLUGINS).not.toContain('context7');
    expect(OFFICIAL_PLUGINS).not.toContain('playwright');
  });

  it('should NOT contain plugins that collide with SpecWeave', () => {
    expect(OFFICIAL_PLUGINS).not.toContain('github');
    expect(OFFICIAL_PLUGINS).not.toContain('stripe');
  });

  it('should have no duplicates', () => {
    const uniqueSet = new Set(OFFICIAL_PLUGINS);
    expect(uniqueSet.size).toBe(OFFICIAL_PLUGINS.length);
  });

  it('should NOT contain any sw-prefixed plugins', () => {
    for (const plugin of OFFICIAL_PLUGINS) {
      expect(plugin).not.toMatch(/^sw/);
    }
  });
});

// ============================================================
// ALL_VALID_PLUGINS constant
// ============================================================
describe('ALL_VALID_PLUGINS constant', () => {
  it('should combine both SPECWEAVE_PLUGINS and OFFICIAL_PLUGINS', () => {
    expect(ALL_VALID_PLUGINS.length).toBe(SPECWEAVE_PLUGINS.length + OFFICIAL_PLUGINS.length);
  });

  it('should include all SpecWeave plugins', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(ALL_VALID_PLUGINS).toContain(plugin);
    }
  });

  it('should include all official plugins', () => {
    for (const plugin of OFFICIAL_PLUGINS) {
      expect(ALL_VALID_PLUGINS).toContain(plugin);
    }
  });

  it('should have no duplicates across both arrays', () => {
    const uniqueSet = new Set(ALL_VALID_PLUGINS);
    expect(uniqueSet.size).toBe(ALL_VALID_PLUGINS.length);
  });

  it('should start with SpecWeave plugins followed by official plugins', () => {
    // First element is the core 'sw' plugin
    expect(ALL_VALID_PLUGINS[0]).toBe('sw');
    // Last element should be from OFFICIAL_PLUGINS
    expect(ALL_VALID_PLUGINS[ALL_VALID_PLUGINS.length - 1]).toBe(
      OFFICIAL_PLUGINS[OFFICIAL_PLUGINS.length - 1]
    );
  });
});

// ============================================================
// isSpecWeavePlugin()
// ============================================================
describe('isSpecWeavePlugin', () => {
  it('should return true for core "sw" plugin', () => {
    expect(isSpecWeavePlugin('sw')).toBe(true);
  });

  it('should return true for domain plugins', () => {
    expect(isSpecWeavePlugin('sw-frontend')).toBe(true);
    expect(isSpecWeavePlugin('sw-backend')).toBe(true);
    expect(isSpecWeavePlugin('sw-testing')).toBe(true);
  });

  it('should return true for infra plugins', () => {
    expect(isSpecWeavePlugin('sw-infra')).toBe(true);
    expect(isSpecWeavePlugin('sw-k8s')).toBe(true);
  });

  it('should return true for all entries in SPECWEAVE_PLUGINS', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(isSpecWeavePlugin(plugin)).toBe(true);
    }
  });

  it('should return false for official plugins', () => {
    expect(isSpecWeavePlugin('firebase')).toBe(false);
    expect(isSpecWeavePlugin('gitlab')).toBe(false);
    expect(isSpecWeavePlugin('linear')).toBe(false);
    expect(isSpecWeavePlugin('supabase')).toBe(false);
  });

  it('should return false for unknown plugin names', () => {
    expect(isSpecWeavePlugin('unknown')).toBe(false);
    expect(isSpecWeavePlugin('my-custom-plugin')).toBe(false);
    expect(isSpecWeavePlugin('sw-nonexistent')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isSpecWeavePlugin('')).toBe(false);
  });

  it('should return false for string with only whitespace', () => {
    expect(isSpecWeavePlugin(' ')).toBe(false);
    expect(isSpecWeavePlugin('  sw  ')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isSpecWeavePlugin('SW')).toBe(false);
    expect(isSpecWeavePlugin('Sw-Frontend')).toBe(false);
    expect(isSpecWeavePlugin('SW-BACKEND')).toBe(false);
  });
});

// ============================================================
// isOfficialPlugin()
// ============================================================
describe('isOfficialPlugin', () => {
  it('should return true for service integrations', () => {
    expect(isOfficialPlugin('firebase')).toBe(true);
    expect(isOfficialPlugin('gitlab')).toBe(true);
    expect(isOfficialPlugin('linear')).toBe(true);
    expect(isOfficialPlugin('slack')).toBe(true);
    expect(isOfficialPlugin('supabase')).toBe(true);
    expect(isOfficialPlugin('asana')).toBe(true);
  });

  it('should return true for framework-specific plugins', () => {
    expect(isOfficialPlugin('laravel-boost')).toBe(true);
  });

  it('should return true for dev tool plugins', () => {
    expect(isOfficialPlugin('code-review')).toBe(true);
    expect(isOfficialPlugin('commit-commands')).toBe(true);
    expect(isOfficialPlugin('hookify')).toBe(true);
  });

  it('should return true for all entries in OFFICIAL_PLUGINS', () => {
    for (const plugin of OFFICIAL_PLUGINS) {
      expect(isOfficialPlugin(plugin)).toBe(true);
    }
  });

  it('should return false for SpecWeave plugins', () => {
    expect(isOfficialPlugin('sw')).toBe(false);
    expect(isOfficialPlugin('sw-frontend')).toBe(false);
    expect(isOfficialPlugin('sw-backend')).toBe(false);
    expect(isOfficialPlugin('sw-github')).toBe(false);
  });

  it('should return false for unknown plugins', () => {
    expect(isOfficialPlugin('unknown')).toBe(false);
    expect(isOfficialPlugin('my-plugin')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isOfficialPlugin('')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isOfficialPlugin('Firebase')).toBe(false);
    expect(isOfficialPlugin('GITLAB')).toBe(false);
    expect(isOfficialPlugin('Slack')).toBe(false);
  });
});

// ============================================================
// getPluginMarketplace()
// ============================================================
describe('getPluginMarketplace', () => {
  it('should return "specweave" for all SpecWeave plugins', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(getPluginMarketplace(plugin)).toBe('specweave');
    }
  });

  it('should return "specweave" for core sw plugin', () => {
    expect(getPluginMarketplace('sw')).toBe('specweave');
  });

  it('should return "specweave" for domain plugins', () => {
    expect(getPluginMarketplace('sw-frontend')).toBe('specweave');
    expect(getPluginMarketplace('sw-backend')).toBe('specweave');
    expect(getPluginMarketplace('sw-testing')).toBe('specweave');
  });

  it('should return "claude-plugins-official" for all official plugins', () => {
    for (const plugin of OFFICIAL_PLUGINS) {
      expect(getPluginMarketplace(plugin)).toBe('claude-plugins-official');
    }
  });

  it('should return "claude-plugins-official" for firebase', () => {
    expect(getPluginMarketplace('firebase')).toBe('claude-plugins-official');
  });

  it('should return "claude-plugins-official" for gitlab', () => {
    expect(getPluginMarketplace('gitlab')).toBe('claude-plugins-official');
  });

  it('should return "unknown" for unrecognized plugin names', () => {
    expect(getPluginMarketplace('unknown')).toBe('unknown');
    expect(getPluginMarketplace('my-custom-plugin')).toBe('unknown');
    expect(getPluginMarketplace('')).toBe('unknown');
    expect(getPluginMarketplace('react')).toBe('unknown');
  });

  it('should return "unknown" for removed plugins', () => {
    expect(getPluginMarketplace('sw-ui')).toBe('unknown');
    expect(getPluginMarketplace('sw-router')).toBe('unknown');
    expect(getPluginMarketplace('sw-plugin-dev')).toBe('unknown');
  });

  it('should return "unknown" for broken LSP plugins', () => {
    expect(getPluginMarketplace('csharp-lsp')).toBe('unknown');
    expect(getPluginMarketplace('gopls-lsp')).toBe('unknown');
  });
});

// ============================================================
// readPluginAutoLoadConfig()
// ============================================================
describe('readPluginAutoLoadConfig', () => {
  let tmpDir: string;
  const originalCwd = process.cwd;
  const originalEnv = process.env.SPECWEAVE_DISABLE_AUTO_LOAD;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-llm-test-'));
    process.cwd = () => tmpDir;
    delete process.env.SPECWEAVE_DISABLE_AUTO_LOAD;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    if (originalEnv !== undefined) {
      process.env.SPECWEAVE_DISABLE_AUTO_LOAD = originalEnv;
    } else {
      delete process.env.SPECWEAVE_DISABLE_AUTO_LOAD;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return defaults when no config file exists', () => {
    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: false });
  });

  it('should return defaults when .specweave dir exists but no config.json', () => {
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: false });
  });

  it('should return defaults when config has no pluginAutoLoad section', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ version: '1.0' }));

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: false });
  });

  it('should read pluginAutoLoad.enabled: false', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { enabled: false } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(false);
    expect(config.suggestOnly).toBe(false);
  });

  it('should read pluginAutoLoad.suggestOnly: true', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { suggestOnly: true } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
    expect(config.suggestOnly).toBe(true);
  });

  it('should read both enabled and suggestOnly together', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { enabled: false, suggestOnly: true } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(false);
    expect(config.suggestOnly).toBe(true);
  });

  it('should default enabled to true when not explicitly set to false', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { suggestOnly: false } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
  });

  it('should default suggestOnly to false when not explicitly set to true', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { enabled: true } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.suggestOnly).toBe(false);
  });

  it('should override with env var SPECWEAVE_DISABLE_AUTO_LOAD=1', () => {
    process.env.SPECWEAVE_DISABLE_AUTO_LOAD = '1';

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(false);
    expect(config.suggestOnly).toBe(true);
  });

  it('should prioritize env var over config file', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { enabled: true, suggestOnly: false } })
    );

    process.env.SPECWEAVE_DISABLE_AUTO_LOAD = '1';

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(false);
    expect(config.suggestOnly).toBe(true);
  });

  it('should NOT disable when env var is set to "0"', () => {
    process.env.SPECWEAVE_DISABLE_AUTO_LOAD = '0';

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
    expect(config.suggestOnly).toBe(false);
  });

  it('should NOT disable when env var is empty string', () => {
    process.env.SPECWEAVE_DISABLE_AUTO_LOAD = '';

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
    expect(config.suggestOnly).toBe(false);
  });

  it('should return defaults for corrupt/invalid JSON config', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), 'not valid json {{{');

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: false });
  });

  it('should return defaults for empty config file', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), '');

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: false });
  });

  it('should handle pluginAutoLoad as empty object', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: {} })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
    expect(config.suggestOnly).toBe(false);
  });
});

// ============================================================
// clearCliCache() / getCliStatus()
// ============================================================
describe('clearCliCache / getCliStatus', () => {
  beforeEach(() => {
    clearCliCache();
  });

  it('should return null from getCliStatus initially (after clearing)', () => {
    expect(getCliStatus()).toBeNull();
  });

  it('should clear cached state without throwing', () => {
    expect(() => clearCliCache()).not.toThrow();
  });

  it('should return null after calling clearCliCache multiple times', () => {
    clearCliCache();
    clearCliCache();
    clearCliCache();
    expect(getCliStatus()).toBeNull();
  });
});

// ============================================================
// formatHookOutput()
// ============================================================
describe('formatHookOutput', () => {
  // Helper to create a detection result
  function makeDetection(overrides: Partial<LLMDetectionResult> = {}): LLMDetectionResult {
    return {
      success: true,
      plugins: [],
      confidence: 0.9,
      durationMs: 100,
      ...overrides,
    };
  }

  // Helper to create an install result
  function makeInstall(overrides: Partial<PluginInstallResult> = {}): PluginInstallResult {
    return {
      success: true,
      plugin: 'sw-frontend',
      ...overrides,
    };
  }

  it('should always set continue: true', () => {
    const result = formatHookOutput({
      detection: makeDetection(),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
  });

  it('should return valid JSON', () => {
    const result = formatHookOutput({
      detection: makeDetection(),
      installations: [],
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  // --- Detection failure scenarios ---

  it('should show install suggestion when error includes "not found"', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: false,
        error: 'Claude CLI not found in PATH',
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toContain('Claude CLI not found');
    expect(parsed.systemMessage).toContain('npm install -g @anthropic-ai/claude-code');
  });

  it('should show login message when error includes "authentication"', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: false,
        error: 'Claude CLI authentication required',
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toContain('authentication required');
    expect(parsed.systemMessage).toContain('claude login');
  });

  it('should not show systemMessage for other detection errors (silent degradation)', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: false,
        error: 'Some random timeout error',
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toBeUndefined();
  });

  it('should not show systemMessage when detection fails with no error', () => {
    const result = formatHookOutput({
      detection: makeDetection({ success: false }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toBeUndefined();
  });

  // --- Detection success, no plugins ---

  it('should have no systemMessage when success but no plugins detected', () => {
    const result = formatHookOutput({
      detection: makeDetection({ success: true, plugins: [] }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toBeUndefined();
  });

  // --- suggestOnly mode ---

  it('should show suggest message with install instructions in suggestOnly mode', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend'] as any,
      }),
      installations: [],
      suggestOnly: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toContain('Plugins that may help');
    expect(parsed.systemMessage).toContain('sw-frontend, sw-backend');
    expect(parsed.systemMessage).toContain('claude plugin install');
    expect(parsed.systemMessage).toContain('@specweave');
  });

  it('should show single plugin in suggestOnly mode', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['firebase'] as any,
      }),
      installations: [],
      suggestOnly: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('firebase');
    expect(parsed.systemMessage).toContain('Plugins that may help');
  });

  // --- Normal mode: newly installed plugins ---

  it('should show "Loaded:" for newly installed plugins', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Loaded: sw-frontend');
  });

  it('should show multiple loaded plugins', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend' }),
        makeInstall({ success: true, plugin: 'sw-backend' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Loaded: sw-frontend, sw-backend');
  });

  // --- Normal mode: already installed plugins ---

  it('should show "Using:" when only already-installed plugins', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend', alreadyInstalled: true }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Using: sw-frontend');
  });

  it('should NOT show "Using:" when there are newly installed plugins too', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend' }),
        makeInstall({ success: true, plugin: 'sw-backend', alreadyInstalled: true }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Loaded: sw-frontend');
    expect(parsed.systemMessage).not.toContain('Using:');
  });

  // --- Normal mode: failed installations ---

  it('should show "Failed:" for failed installations', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [
        makeInstall({ success: false, plugin: 'sw-frontend', error: 'timeout' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Failed: sw-frontend');
  });

  // --- Mix of installed and failed ---

  it('should show combined message for mix of installed, already-installed, and failed', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend', 'sw-testing'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend' }),
        makeInstall({ success: true, plugin: 'sw-backend', alreadyInstalled: true }),
        makeInstall({ success: false, plugin: 'sw-testing', error: 'network error' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    // Should have Loaded + Failed (no Using since there are new installs)
    expect(parsed.systemMessage).toContain('Loaded: sw-frontend');
    expect(parsed.systemMessage).toContain('Failed: sw-testing');
    expect(parsed.systemMessage).not.toContain('Using:');
    expect(parsed.systemMessage).toContain(' | ');
  });

  it('should show "Using:" and "Failed:" when no new installs', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend', alreadyInstalled: true }),
        makeInstall({ success: false, plugin: 'sw-backend', error: 'err' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Using: sw-frontend');
    expect(parsed.systemMessage).toContain('Failed: sw-backend');
    expect(parsed.systemMessage).toContain(' | ');
  });

  it('should prefix all messages with "SpecWeave:"', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toMatch(/^SpecWeave:/);
  });

  it('should not have systemMessage when plugins detected but installations array is empty', () => {
    // This can happen when suggestOnly is NOT set but installations are empty
    // Looking at the code: it enters the `detection.plugins.length > 0` branch,
    // then checks suggestOnly (false), then builds parts from empty installations list
    // parts will be empty, so no systemMessage is set
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toBeUndefined();
  });

  it('should handle multiple failed installations', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend'] as any,
      }),
      installations: [
        makeInstall({ success: false, plugin: 'sw-frontend', error: 'err1' }),
        makeInstall({ success: false, plugin: 'sw-backend', error: 'err2' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Failed: sw-frontend, sw-backend');
  });

  it('should handle all already-installed with multiple plugins', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend', 'sw-backend', 'firebase'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend', alreadyInstalled: true }),
        makeInstall({ success: true, plugin: 'sw-backend', alreadyInstalled: true }),
        makeInstall({ success: true, plugin: 'firebase', alreadyInstalled: true }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Using: sw-frontend, sw-backend, firebase');
  });

  it('should always have continue: true even when detection fails with "not found"', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: false,
        error: 'command not found',
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
  });

  it('should always have continue: true even when detection fails with "authentication"', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: false,
        error: 'authentication failure',
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
  });

  it('should always have continue: true in suggestOnly mode', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-frontend'] as any,
      }),
      installations: [],
      suggestOnly: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
  });
});

// ============================================================
// Prompt safety constants and truncation utilities
// ============================================================
import {
  MAX_DETECTION_USER_PROMPT_LENGTH,
  MAX_ADDITIONAL_CONTEXT_LENGTH,
  MAX_SKILL_FIRST_PROMPT_LENGTH,
  truncateForDetection,
  truncateForSkillFirstArgs,
  truncateAdditionalContext,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

describe('Prompt safety constants', () => {
  it('MAX_DETECTION_USER_PROMPT_LENGTH should be a reasonable limit', () => {
    expect(MAX_DETECTION_USER_PROMPT_LENGTH).toBeGreaterThanOrEqual(1000);
    expect(MAX_DETECTION_USER_PROMPT_LENGTH).toBeLessThanOrEqual(5000);
  });

  it('MAX_ADDITIONAL_CONTEXT_LENGTH should limit additionalContext size', () => {
    expect(MAX_ADDITIONAL_CONTEXT_LENGTH).toBeGreaterThanOrEqual(4000);
    expect(MAX_ADDITIONAL_CONTEXT_LENGTH).toBeLessThanOrEqual(10000);
  });

  it('MAX_SKILL_FIRST_PROMPT_LENGTH should limit prompt in SKILL FIRST args', () => {
    expect(MAX_SKILL_FIRST_PROMPT_LENGTH).toBeGreaterThanOrEqual(1000);
    expect(MAX_SKILL_FIRST_PROMPT_LENGTH).toBeLessThanOrEqual(3000);
  });
});

describe('truncateForDetection', () => {
  it('should return short prompts unchanged', () => {
    const short = 'Build a React dashboard';
    expect(truncateForDetection(short)).toBe(short);
  });

  it('should truncate prompts exceeding MAX_DETECTION_USER_PROMPT_LENGTH', () => {
    const long = 'x'.repeat(MAX_DETECTION_USER_PROMPT_LENGTH + 500);
    const result = truncateForDetection(long);
    expect(result.length).toBeLessThanOrEqual(MAX_DETECTION_USER_PROMPT_LENGTH + 50); // allow for suffix
    expect(result).toContain('... [truncated]');
  });

  it('should preserve the beginning of the prompt when truncating', () => {
    const prefix = 'IMPORTANT_START ';
    const long = prefix + 'x'.repeat(MAX_DETECTION_USER_PROMPT_LENGTH + 500);
    const result = truncateForDetection(long);
    expect(result.startsWith(prefix)).toBe(true);
  });

  it('should handle empty string', () => {
    expect(truncateForDetection('')).toBe('');
  });

  it('should handle prompts exactly at the limit', () => {
    const exact = 'y'.repeat(MAX_DETECTION_USER_PROMPT_LENGTH);
    expect(truncateForDetection(exact)).toBe(exact);
  });
});

describe('truncateForSkillFirstArgs', () => {
  it('should return short prompts unchanged', () => {
    const short = 'Add a login page';
    expect(truncateForSkillFirstArgs(short)).toBe(short);
  });

  it('should truncate prompts exceeding MAX_SKILL_FIRST_PROMPT_LENGTH', () => {
    const long = 'z'.repeat(MAX_SKILL_FIRST_PROMPT_LENGTH + 1000);
    const result = truncateForSkillFirstArgs(long);
    expect(result.length).toBeLessThanOrEqual(MAX_SKILL_FIRST_PROMPT_LENGTH + 80);
    expect(result).toContain('[truncated');
  });

  it('should include a hint that original prompt is available above', () => {
    const long = 'a'.repeat(MAX_SKILL_FIRST_PROMPT_LENGTH + 500);
    const result = truncateForSkillFirstArgs(long);
    expect(result).toMatch(/see original prompt|original prompt above/i);
  });
});

describe('truncateAdditionalContext', () => {
  it('should return small context unchanged', () => {
    const small = 'Some context here';
    expect(truncateAdditionalContext(small)).toBe(small);
  });

  it('should truncate context exceeding MAX_ADDITIONAL_CONTEXT_LENGTH', () => {
    const large = 'c'.repeat(MAX_ADDITIONAL_CONTEXT_LENGTH + 2000);
    const result = truncateAdditionalContext(large);
    expect(result.length).toBeLessThanOrEqual(MAX_ADDITIONAL_CONTEXT_LENGTH + 80);
    expect(result).toContain('[context truncated');
  });

  it('should handle empty string', () => {
    expect(truncateAdditionalContext('')).toBe('');
  });
});
