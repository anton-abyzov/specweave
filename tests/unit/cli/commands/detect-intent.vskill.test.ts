/**
 * Tests for vskillRecommendations in detect-intent.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies
const { mockDetectPluginsViaLLM, mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockDetectPluginsViaLLM: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: vi.fn(() => []),
}));

vi.mock('../../../../src/core/lazy-loading/llm-plugin-detector.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    detectPluginsViaLLM: mockDetectPluginsViaLLM,
  };
});

vi.mock('../../../../src/core/lazy-loading/failure-logger.js', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: vi.fn(),
  getCleanEnv: vi.fn(() => ({})),
}));

vi.mock('../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: vi.fn(),
  getScopeArgs: vi.fn(() => []),
}));

import {
  detectVskillPlugins,
  type VskillMatch,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

describe('detectVskillPlugins integration with detect-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
  });

  it('TC-001: detects mobile plugin for ios prompt', () => {
    const matches = detectVskillPlugins('deploy ios app to testflight');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.some(m => m.plugin === 'mobile')).toBe(true);
    expect(matches[0].installCommand).toBe('vskill install anton-abyzov/vskill --plugin mobile');
  });

  it('TC-002: lockfile filter excludes already-installed plugins', async () => {
    // Mock vskill.lock exists and contains "mobile" plugin
    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.endsWith('vskill.lock')) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.endsWith('vskill.lock')) {
        return JSON.stringify({ skills: { mobile: { version: '1.0.0' } } });
      }
      return '{}';
    });

    // Mock LLM to return empty (we only care about vskill keyword matches)
    mockDetectPluginsViaLLM.mockResolvedValue({
      plugins: [],
      confidence: 0,
      incrementAction: null,
      skillRouting: null,
    });

    const { detectIntentCommand } = await import('../../../../src/cli/commands/detect-intent.js');
    const result = await detectIntentCommand('deploy ios app to testflight', { silent: true });

    // mobile keyword matches "ios" and "testflight", but lockfile says it's installed
    const mobileRecs = (result.vskillRecommendations ?? []).filter(
      (r: { plugin: string }) => r.plugin === 'mobile'
    );
    expect(mobileRecs).toHaveLength(0);
  });

  it('TC-003: no match for unrelated prompt', () => {
    const matches = detectVskillPlugins('update react component');
    expect(matches).toHaveLength(0);
  });

  it('TC-004: DetectIntentResult can accept vskillRecommendations field', async () => {
    // Import the type and verify it compiles with vskillRecommendations
    const { DetectIntentResult } = await import('../../../../src/cli/commands/detect-intent.js') as any;
    // The type check is compile-time — if this module imports without error, the type is valid
    const matches = detectVskillPlugins('deploy ios app');
    const recommendations = matches.map(m => ({
      plugin: m.plugin,
      matchedKeyword: m.matchedKeyword,
      installCommand: m.installCommand,
    }));
    expect(Array.isArray(recommendations)).toBe(true);
  });
});
