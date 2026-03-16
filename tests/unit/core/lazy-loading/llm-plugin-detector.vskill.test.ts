/**
 * Tests for vskill Plugin Registry and detectVskillPlugins()
 *
 * TDD RED phase: These tests define the expected behavior for
 * VSKILL_PLUGIN_REGISTRY and detectVskillPlugins() before implementation.
 *
 * @module tests/unit/core/lazy-loading/llm-plugin-detector.vskill
 */

import { describe, it, expect, vi } from 'vitest';

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

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: vi.fn(() => '/tmp/test-project'),
}));

import {
  VSKILL_PLUGIN_REGISTRY,
  detectVskillPlugins,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

describe('VSKILL_PLUGIN_REGISTRY', () => {
  it('TC-006: contains exactly 5 plugin entries', () => {
    const keys = Object.keys(VSKILL_PLUGIN_REGISTRY);
    expect(keys).toHaveLength(5);
    expect(keys).toContain('mobile');
    expect(keys).toContain('google-workspace');
    expect(keys).toContain('marketing');
    expect(keys).toContain('productivity');
    expect(keys).toContain('skills');
  });

  it('each entry has required fields', () => {
    for (const [name, entry] of Object.entries(VSKILL_PLUGIN_REGISTRY)) {
      expect(entry).toHaveProperty('keywords');
      expect(entry).toHaveProperty('shortKeywords');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('installCommand');
      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(Array.isArray(entry.shortKeywords)).toBe(true);
      expect(typeof entry.description).toBe('string');
      expect(entry.installCommand).toContain(`vskill install anton-abyzov/vskill --plugin ${name}`);
    }
  });
});

describe('detectVskillPlugins()', () => {
  it('TC-001: detects mobile plugin from "deploy ios app to testflight"', () => {
    const matches = detectVskillPlugins('deploy ios app to testflight');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const mobile = matches.find(m => m.plugin === 'mobile');
    expect(mobile).toBeDefined();
    expect(mobile!.matchedKeyword).toBeDefined();
    expect(mobile!.installCommand).toBe('vskill install anton-abyzov/vskill --plugin mobile');
  });

  it('TC-002: no false positive on "ios" inside "curious"', () => {
    const matches = detectVskillPlugins('I am curious about this feature');
    expect(matches).toHaveLength(0);
  });

  it('TC-003: detects both marketing and google-workspace', () => {
    const matches = detectVskillPlugins('post on linkedin and update google sheets');
    const plugins = matches.map(m => m.plugin);
    expect(plugins).toContain('marketing');
    expect(plugins).toContain('google-workspace');
  });

  it('TC-004: returns empty for unrelated prompt', () => {
    const matches = detectVskillPlugins('update react component');
    expect(matches).toHaveLength(0);
  });

  it('TC-005: caps results at 3 when 4+ plugins match', () => {
    // Prompt designed to trigger mobile, google-workspace, marketing, and productivity
    const matches = detectVskillPlugins(
      'deploy ios app, update google sheets, post on linkedin, and set up notion workspace'
    );
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it('detects productivity plugin from "notion" keyword', () => {
    const matches = detectVskillPlugins('set up a notion workspace for the team');
    const prod = matches.find(m => m.plugin === 'productivity');
    expect(prod).toBeDefined();
  });

  it('detects skills plugin from "discover skill" keyword', () => {
    const matches = detectVskillPlugins('help me discover skill for frontend development');
    const skills = matches.find(m => m.plugin === 'skills');
    expect(skills).toBeDefined();
  });

  it('detects google-workspace from "google sheets" keyword', () => {
    const matches = detectVskillPlugins('update the google sheets report for Q1');
    const gws = matches.find(m => m.plugin === 'google-workspace');
    expect(gws).toBeDefined();
  });
});
