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
  ALL_KNOWN_PLUGINS,
  ALL_VALID_PLUGINS,
  isSpecWeavePlugin,
  isKnownPlugin,
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
    expect(SPECWEAVE_PLUGINS.length).toBeGreaterThanOrEqual(4);
  });

  it('should have "sw" as the first element (core plugin)', () => {
    expect(SPECWEAVE_PLUGINS[0]).toBe('sw');
  });

  it('should NOT contain the per-provider sync plugins removed in 2.0', () => {
    // Tracker sync ships in the core sw plugin (sw:sync / `specweave sync`).
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-github');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-jira');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-ado');
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
describe('ALL_VALID_PLUGINS constant (specweave-only)', () => {
  it('should include all specweave plugins', () => {
    expect(ALL_VALID_PLUGINS.length).toBe(SPECWEAVE_PLUGINS.length);
  });

  it('should include all SpecWeave plugins', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(ALL_VALID_PLUGINS).toContain(plugin);
    }
  });

  it('should NOT include any third-party plugins', () => {
    expect(ALL_VALID_PLUGINS).not.toContain('gitlab');
    expect(ALL_VALID_PLUGINS).not.toContain('firebase');
    expect(ALL_VALID_PLUGINS).not.toContain('slack');
  });

  it('should NOT include removed vskill plugins', () => {
    expect(ALL_VALID_PLUGINS).not.toContain('mobile');
    expect(ALL_VALID_PLUGINS).not.toContain('skills');
    expect(ALL_VALID_PLUGINS).not.toContain('frontend');
    expect(ALL_VALID_PLUGINS).not.toContain('backend');
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

  it('should return false for the per-provider sync plugins removed in 2.0', () => {
    expect(isSpecWeavePlugin('sw-github')).toBe(false);
    expect(isSpecWeavePlugin('sw-jira')).toBe(false);
    expect(isSpecWeavePlugin('sw-ado')).toBe(false);
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
// isKnownPlugin() (v1.0.315: new)
// ============================================================
describe('isKnownPlugin (specweave-only validation)', () => {
  it('should return true for specweave plugins', () => {
    expect(isKnownPlugin('sw')).toBe(true);
    expect(isKnownPlugin('sw-media')).toBe(true);
    expect(isKnownPlugin('sw-github')).toBe(false);
  });

  it('should return false for removed vskill plugins', () => {
    expect(isKnownPlugin('mobile')).toBe(false);
    expect(isKnownPlugin('skills')).toBe(false);
    expect(isKnownPlugin('frontend')).toBe(false);
    expect(isKnownPlugin('backend')).toBe(false);
    expect(isKnownPlugin('security')).toBe(false);
    expect(isKnownPlugin('blockchain')).toBe(false);
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
// getPluginMarketplace removed — vskill concepts removed

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
    expect(config).toEqual({ enabled: true, suggestOnly: true });
  });

  it('should return defaults when .specweave dir exists but no config.json', () => {
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: true });
  });

  it('should return defaults when config has no pluginAutoLoad section', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ version: '1.0' }));

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: true });
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

  it('should default suggestOnly to true when not explicitly set to false (consent-first)', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ pluginAutoLoad: { enabled: true } })
    );

    const config = readPluginAutoLoadConfig();
    expect(config.suggestOnly).toBe(true);
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
    expect(config.suggestOnly).toBe(true);
  });

  it('should NOT disable when env var is empty string', () => {
    process.env.SPECWEAVE_DISABLE_AUTO_LOAD = '';

    const config = readPluginAutoLoadConfig();
    expect(config.enabled).toBe(true);
    expect(config.suggestOnly).toBe(true);
  });

  it('should return defaults for corrupt/invalid JSON config', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), 'not valid json {{{');

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: true });
  });

  it('should return defaults for empty config file', () => {
    const configDir = path.join(tmpDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), '');

    const config = readPluginAutoLoadConfig();
    expect(config).toEqual({ enabled: true, suggestOnly: true });
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
    expect(config.suggestOnly).toBe(true);
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
      plugin: 'frontend',
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

  // --- v1.0.535: Plugin installation messaging removed ---
  // All plugins are pre-installed at init time. formatHookOutput no longer
  // generates systemMessage for plugin installation/suggestion scenarios.

  it('should not have systemMessage for suggestOnly mode (v1.0.535: removed)', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['sw-github', 'sw-jira'] as any,
      }),
      installations: [],
      suggestOnly: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toBeUndefined();
  });

  it('should not have systemMessage for detected plugins with installations (v1.0.535: removed)', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['frontend'] as any,
      }),
      installations: [
        makeInstall({ success: true, plugin: 'frontend' }),
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toBeUndefined();
  });

  it('should not have systemMessage when plugins detected but installations array is empty', () => {
    const result = formatHookOutput({
      detection: makeDetection({
        success: true,
        plugins: ['frontend'] as any,
      }),
      installations: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.systemMessage).toBeUndefined();
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
        plugins: ['frontend'] as any,
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

// ============================================================
// --bare flag tests (0652) - requires child_process mock
// ============================================================
describe('detectPluginsViaLLM --bare flag (0652)', async () => {
  // Separate mock setup for CLI execution tests
  const { mockSpawnSync } = vi.hoisted(() => ({
    mockSpawnSync: vi.fn(),
  }));

  vi.mock('child_process', async () => {
    const actual = await vi.importActual('child_process');
    return { ...actual, spawnSync: mockSpawnSync };
  });

  const { detectPluginsViaLLM } = await import('../../../../src/core/lazy-loading/llm-plugin-detector.js');

  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectClaudeCli.mockReturnValue({
      available: true,
      commandPath: '/usr/bin/claude',
      commandExists: true,
      shellWorkaround: false,
    });
    mockGetCleanEnv.mockReturnValue({ PATH: '/usr/bin' });
  });

  it('should pass --bare as first argument to CLI', async () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: JSON.stringify({ plugins: ['sw'], action: 'none', confidence: 0.9 }),
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      stderr: '',
    });

    await detectPluginsViaLLM('build a todo app');

    expect(mockSpawnSync).toHaveBeenCalled();
    const args = mockSpawnSync.mock.calls[0][1];
    expect(args[0]).toBe('--bare');
  });

  it('should NOT include --setting-sources in args (subsumed by --bare)', async () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: JSON.stringify({ plugins: ['sw'], action: 'none', confidence: 0.9 }),
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      stderr: '',
    });

    await detectPluginsViaLLM('build something');

    const args = mockSpawnSync.mock.calls[0][1];
    expect(args).not.toContain('--setting-sources');
  });
});
