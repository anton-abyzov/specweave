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
  VSKILL_PLUGINS,
  ALL_KNOWN_PLUGINS,
  ALL_VALID_PLUGINS,
  isSpecWeavePlugin,
  isVskillPlugin,
  isKnownPlugin,
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
describe('SPECWEAVE_PLUGINS constant (v1.0.315: workflow/integration only)', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(SPECWEAVE_PLUGINS)).toBe(true);
    expect(SPECWEAVE_PLUGINS.length).toBeGreaterThanOrEqual(5);
  });

  it('should have "sw" as the first element (core plugin)', () => {
    expect(SPECWEAVE_PLUGINS[0]).toBe('sw');
  });

  it('should include external tool integration plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-github');
    expect(SPECWEAVE_PLUGINS).toContain('sw-jira');
    expect(SPECWEAVE_PLUGINS).toContain('sw-ado');
  });

  it('should include workflow plugins that remain in specweave', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-release');
    expect(SPECWEAVE_PLUGINS).toContain('sw-diagrams');
    expect(SPECWEAVE_PLUGINS).toContain('sw-docs');
    expect(SPECWEAVE_PLUGINS).toContain('sw-media');
  });

  it('should NOT contain migrated domain plugins (moved to vskill)', () => {
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-frontend');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-backend');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-testing');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-mobile');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-infra');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-k8s');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-payments');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-ml');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-kafka');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-confluent');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-kafka-streams');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-n8n');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-cost');
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
// VSKILL_PLUGINS constant (v1.0.315: migrated domain plugins)
// ============================================================
describe('VSKILL_PLUGINS constant (v2.1.0: per-category plugins)', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(VSKILL_PLUGINS)).toBe(true);
    expect(VSKILL_PLUGINS.length).toBe(15);
  });

  it('should include all vskill marketplace plugins', () => {
    expect(VSKILL_PLUGINS).toContain('frontend');
    expect(VSKILL_PLUGINS).toContain('backend');
    expect(VSKILL_PLUGINS).toContain('testing');
    expect(VSKILL_PLUGINS).toContain('mobile');
    expect(VSKILL_PLUGINS).toContain('infra');
    expect(VSKILL_PLUGINS).toContain('k8s');
    expect(VSKILL_PLUGINS).toContain('payments');
    expect(VSKILL_PLUGINS).toContain('ml');
    expect(VSKILL_PLUGINS).toContain('kafka');
    expect(VSKILL_PLUGINS).toContain('confluent');
    expect(VSKILL_PLUGINS).toContain('cost');
    expect(VSKILL_PLUGINS).toContain('docs');
    expect(VSKILL_PLUGINS).toContain('security');
    expect(VSKILL_PLUGINS).toContain('scout');
    expect(VSKILL_PLUGINS).toContain('blockchain');
  });

  it('should NOT contain kafka-streams or n8n (merged into kafka plugin)', () => {
    expect(VSKILL_PLUGINS).not.toContain('kafka-streams');
    expect(VSKILL_PLUGINS).not.toContain('n8n');
  });

  it('should NOT contain any sw- prefixed entries', () => {
    for (const plugin of VSKILL_PLUGINS) {
      expect(plugin).not.toMatch(/^sw-/);
      expect(plugin).not.toBe('sw');
    }
  });

  it('should have no duplicates', () => {
    const uniqueSet = new Set(VSKILL_PLUGINS);
    expect(uniqueSet.size).toBe(VSKILL_PLUGINS.length);
  });
});

// ============================================================
// OFFICIAL_PLUGINS removed (v1.0.279)
// ============================================================
describe('Official plugins policy (v1.0.279)', () => {
  it('ALL_VALID_PLUGINS should equal ALL_KNOWN_PLUGINS (specweave + vskill)', () => {
    expect(ALL_VALID_PLUGINS).toEqual(ALL_KNOWN_PLUGINS);
  });

  it('should never include gitlab, firebase, slack, or any third-party plugin', () => {
    const forbidden = ['gitlab', 'firebase', 'slack', 'linear', 'asana', 'supabase', 'laravel-boost', 'hookify', 'commit-commands'];
    for (const plugin of forbidden) {
      expect(ALL_VALID_PLUGINS).not.toContain(plugin);
    }
  });
});

// ============================================================
// ALL_VALID_PLUGINS / ALL_KNOWN_PLUGINS constant (v1.0.315)
// ============================================================
describe('ALL_VALID_PLUGINS constant (v2.1.0: combined)', () => {
  it('should include both specweave and vskill plugins', () => {
    expect(ALL_VALID_PLUGINS.length).toBe(SPECWEAVE_PLUGINS.length + VSKILL_PLUGINS.length);
  });

  it('should include all SpecWeave plugins', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(ALL_VALID_PLUGINS).toContain(plugin);
    }
  });

  it('should include all vskill plugins', () => {
    for (const plugin of VSKILL_PLUGINS) {
      expect(ALL_VALID_PLUGINS).toContain(plugin);
    }
  });

  it('should NOT include any third-party plugins', () => {
    expect(ALL_VALID_PLUGINS).not.toContain('gitlab');
    expect(ALL_VALID_PLUGINS).not.toContain('firebase');
    expect(ALL_VALID_PLUGINS).not.toContain('slack');
  });

  it('should have no duplicates', () => {
    const uniqueSet = new Set(ALL_VALID_PLUGINS);
    expect(uniqueSet.size).toBe(ALL_VALID_PLUGINS.length);
  });

  it('should start with the core sw plugin', () => {
    expect(ALL_VALID_PLUGINS[0]).toBe('sw');
  });
});

// ============================================================
// isSpecWeavePlugin()
// ============================================================
describe('isSpecWeavePlugin (v1.0.315: narrowed to workflow/integration)', () => {
  it('should return true for core "sw" plugin', () => {
    expect(isSpecWeavePlugin('sw')).toBe(true);
  });

  it('should return true for integration plugins', () => {
    expect(isSpecWeavePlugin('sw-github')).toBe(true);
    expect(isSpecWeavePlugin('sw-jira')).toBe(true);
    expect(isSpecWeavePlugin('sw-ado')).toBe(true);
  });

  it('should return true for all entries in SPECWEAVE_PLUGINS', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(isSpecWeavePlugin(plugin)).toBe(true);
    }
  });

  it('should return false for migrated plugins (now in vskill)', () => {
    expect(isSpecWeavePlugin('sw-frontend')).toBe(false);
    expect(isSpecWeavePlugin('sw-backend')).toBe(false);
    expect(isSpecWeavePlugin('sw-testing')).toBe(false);
    expect(isSpecWeavePlugin('sw-infra')).toBe(false);
    expect(isSpecWeavePlugin('sw-k8s')).toBe(false);
  });

  it('should return false for vskill plugin names', () => {
    expect(isSpecWeavePlugin('frontend')).toBe(false);
    expect(isSpecWeavePlugin('backend')).toBe(false);
    expect(isSpecWeavePlugin('testing')).toBe(false);
  });

  it('should return false for unknown plugin names', () => {
    expect(isSpecWeavePlugin('unknown')).toBe(false);
    expect(isSpecWeavePlugin('sw-nonexistent')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isSpecWeavePlugin('')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isSpecWeavePlugin('SW')).toBe(false);
    expect(isSpecWeavePlugin('SW-GITHUB')).toBe(false);
  });
});

// ============================================================
// isVskillPlugin() (v1.0.315: new)
// ============================================================
describe('isVskillPlugin (v2.1.0: per-category plugins)', () => {
  it('should return true for all VSKILL_PLUGINS entries', () => {
    for (const plugin of VSKILL_PLUGINS) {
      expect(isVskillPlugin(plugin)).toBe(true);
    }
  });

  it('should return true for common domain plugins', () => {
    expect(isVskillPlugin('frontend')).toBe(true);
    expect(isVskillPlugin('backend')).toBe(true);
    expect(isVskillPlugin('ml')).toBe(true);
    expect(isVskillPlugin('k8s')).toBe(true);
    expect(isVskillPlugin('scout')).toBe(true);
    expect(isVskillPlugin('blockchain')).toBe(true);
  });

  it('should return false for old "vs" monolithic plugin name', () => {
    expect(isVskillPlugin('vs')).toBe(false);
  });

  it('should return false for specweave plugins', () => {
    expect(isVskillPlugin('sw')).toBe(false);
    expect(isVskillPlugin('sw-github')).toBe(false);
    expect(isVskillPlugin('sw-jira')).toBe(false);
  });

  it('should return false for old sw- prefixed names', () => {
    expect(isVskillPlugin('sw-frontend')).toBe(false);
    expect(isVskillPlugin('sw-backend')).toBe(false);
  });

  it('should return false for unknown plugins', () => {
    expect(isVskillPlugin('unknown')).toBe(false);
    expect(isVskillPlugin('')).toBe(false);
  });
});

// ============================================================
// isKnownPlugin() (v1.0.315: new)
// ============================================================
describe('isKnownPlugin (v1.0.315: combined validation)', () => {
  it('should return true for specweave plugins', () => {
    expect(isKnownPlugin('sw')).toBe(true);
    expect(isKnownPlugin('sw-github')).toBe(true);
  });

  it('should return true for vskill plugins', () => {
    expect(isKnownPlugin('frontend')).toBe(true);
    expect(isKnownPlugin('backend')).toBe(true);
    expect(isKnownPlugin('security')).toBe(true);
    expect(isKnownPlugin('scout')).toBe(true);
    expect(isKnownPlugin('blockchain')).toBe(true);
  });

  it('should return false for old "vs" monolithic plugin name', () => {
    expect(isKnownPlugin('vs')).toBe(false);
  });

  it('should return false for old migrated names', () => {
    expect(isKnownPlugin('sw-frontend')).toBe(false);
    expect(isKnownPlugin('sw-backend')).toBe(false);
  });

  it('should return false for unknown plugins', () => {
    expect(isKnownPlugin('nonexistent')).toBe(false);
    expect(isKnownPlugin('')).toBe(false);
  });
});

// isOfficialPlugin removed in v1.0.279 — only @specweave plugins allowed

// ============================================================
// getPluginMarketplace()
// ============================================================
describe('getPluginMarketplace (v1.0.315: dual-source)', () => {
  it('should return "specweave" for all sw-* plugins', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(getPluginMarketplace(plugin)).toBe('specweave');
    }
  });

  it('should return "specweave" for core sw plugin', () => {
    expect(getPluginMarketplace('sw')).toBe('specweave');
  });

  it('should return "vskill" for domain plugins', () => {
    expect(getPluginMarketplace('frontend')).toBe('vskill');
    expect(getPluginMarketplace('backend')).toBe('vskill');
    expect(getPluginMarketplace('testing')).toBe('vskill');
    expect(getPluginMarketplace('ml')).toBe('vskill');
    expect(getPluginMarketplace('blockchain')).toBe('vskill');
  });

  it('should return "vskill" for all VSKILL_PLUGINS entries', () => {
    for (const plugin of VSKILL_PLUGINS) {
      expect(getPluginMarketplace(plugin)).toBe('vskill');
    }
  });

  it('should return "specweave" for unknown plugins (default)', () => {
    expect(getPluginMarketplace('unknown')).toBe('specweave');
    expect(getPluginMarketplace('')).toBe('specweave');
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
        plugins: ['sw-frontend'] as any,
      }),
      installations: [],
      suggestOnly: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('sw-frontend');
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
        plugins: ['sw-frontend', 'sw-backend', 'sw-testing'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'sw-frontend', alreadyInstalled: true }),
        makeInstall({ success: true, plugin: 'sw-backend', alreadyInstalled: true }),
        makeInstall({ success: true, plugin: 'sw-testing', alreadyInstalled: true }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toContain('Using: sw-frontend, sw-backend, sw-testing');
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
    // v1.0.260: Reduced to 3000 to prevent prompt overflow (was 4000-10000 range)
    expect(MAX_ADDITIONAL_CONTEXT_LENGTH).toBeGreaterThanOrEqual(2500);
    expect(MAX_ADDITIONAL_CONTEXT_LENGTH).toBeLessThanOrEqual(4000);
  });

  it('MAX_SKILL_FIRST_PROMPT_LENGTH should limit prompt in SKILL FIRST args', () => {
    // v1.0.260: Reduced to 800 to match hook (was 1000-3000 range)
    expect(MAX_SKILL_FIRST_PROMPT_LENGTH).toBeGreaterThanOrEqual(500);
    expect(MAX_SKILL_FIRST_PROMPT_LENGTH).toBeLessThanOrEqual(1000);
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

// ============================================================
// LLM Detection Prompt - Investigation/Debugging Routing (0211)
// ============================================================
describe('LLM Detection Prompt - Investigation/Debugging Routing', () => {
  const detectorPath = path.join(
    process.cwd(),
    'src/core/lazy-loading/llm-plugin-detector.ts'
  );

  let promptSource: string;

  beforeEach(() => {
    promptSource = fs.readFileSync(detectorPath, 'utf-8');
  });

  describe('NEVER-use-none list includes investigation keywords', () => {
    it('should include "investigate" in NEVER-use-none guidance', () => {
      // The action table or surrounding text must explicitly mention "investigate"
      // as something that should NEVER map to action: "none"
      expect(promptSource).toMatch(/NEVER.*none.*investigate|investigate.*NEVER.*none/is);
    });

    it('should include "debug" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*debug|debug.*NEVER.*none/is);
    });

    it('should include "troubleshoot" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*troubleshoot|troubleshoot.*NEVER.*none/is);
    });

    it('should include "optimize" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*optimize|optimize.*NEVER.*none/is);
    });

    it('should include "secure" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*secure|secure.*NEVER.*none/is);
    });

    it('should include "audit" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*audit|audit.*NEVER.*none/is);
    });

    it('should include "solve" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*solve|solve.*NEVER.*none/is);
    });

    it('should include "resolve" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*resolve|resolve.*NEVER.*none/is);
    });

    it('should include "analyze" in NEVER-use-none guidance', () => {
      expect(promptSource).toMatch(/NEVER.*none.*analyze|analyze.*NEVER.*none/is);
    });
  });

  describe('Investigation/debugging guidance block', () => {
    it('should contain explicit investigation/debugging guidance section', () => {
      expect(promptSource).toMatch(/INVESTIGATION.*DEBUGGING/is);
    });

    it('should clarify that investigation is implementation work, not a question', () => {
      expect(promptSource).toMatch(/investigation.*implementation work|investigation.*increment tracking/is);
    });

    it('should state "why does X fail" equals work, not question', () => {
      expect(promptSource).toMatch(/why does.*fail.*work.*not.*question|why does.*fail.*never.*none/is);
    });
  });

  describe('Investigation example in prompt', () => {
    it('should include an investigation example with action "new"', () => {
      // There should be an example prompt about investigation
      expect(promptSource).toMatch(/[Ii]nvestigat/);
      // And it should map to action: "new", not "none"
      expect(promptSource).toMatch(/[Ii]nvestigat[\s\S]{0,500}"action":\s*"new"/);
    });
  });
});
