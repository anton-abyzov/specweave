/**
 * Tests for smart defaults application
 * T-008 [RED] → T-009 [GREEN]
 */

import { describe, it, expect } from 'vitest';

import {
  applySmartDefaults,
  type SmartDefaultsOptions,
} from '../../../../../src/cli/helpers/init/smart-defaults.js';

function makeOptions(overrides: Partial<SmartDefaultsOptions> = {}): SmartDefaultsOptions {
  return {
    adapter: 'claude',
    language: 'en',
    isGitRepo: true,
    ...overrides,
  };
}

describe('smart-defaults', () => {
  describe('applySmartDefaults', () => {
    // ─── Testing defaults ─────────────────────────────────────

    it('should set testing.defaultTestMode to TDD', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.defaultTestMode).toBe('TDD');
    });

    it('should set testing.defaultCoverageTarget to 80', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.defaultCoverageTarget).toBe(80);
    });

    it('should set testing.coverageTargets', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.coverageTargets).toEqual({ unit: 80, integration: 60, e2e: 40 });
    });

    it('should preserve existing testing config', () => {
      const existing = { testing: { defaultTestMode: 'test-after', customField: 'keep' } };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.testing.defaultTestMode).toBe('test-after');
      expect(config.testing.customField).toBe('keep');
    });

    // ─── Quality gates defaults ───────────────────────────────

    it('should set qualityGates.preset to standard', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.qualityGates.preset).toBe('standard');
    });

    it('should set qualityGates.enforcement', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.qualityGates.enforcement.testsRequired).toBe(true);
      expect(config.qualityGates.enforcement.llmValidation).toBe(true);
    });

    it('should preserve existing quality gates config', () => {
      const existing = { qualityGates: { preset: 'production', custom: true } };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.qualityGates.preset).toBe('production');
      expect(config.qualityGates.custom).toBe(true);
    });

    // ─── Deep interview defaults ──────────────────────────────

    it('should set planning.deepInterview.enabled to false', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.planning.deepInterview.enabled).toBe(false);
    });

    it('should preserve existing planning config', () => {
      const existing = { planning: { deepInterview: { enabled: true }, roadmap: 'keep' } };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.planning.deepInterview.enabled).toBe(true);
      expect(config.planning.roadmap).toBe('keep');
    });

    // ─── LSP defaults ─────────────────────────────────────────

    it('should enable LSP for Claude adapter', () => {
      const config = applySmartDefaults({}, makeOptions({ adapter: 'claude' }));
      expect(config.lsp.enabled).toBe(true);
      expect(config.lsp.autoInstallPlugins).toBe(true);
    });

    it('should NOT set LSP for cursor adapter', () => {
      const config = applySmartDefaults({}, makeOptions({ adapter: 'cursor' }));
      expect(config.lsp).toBeUndefined();
    });

    it('should NOT set LSP for generic adapter', () => {
      const config = applySmartDefaults({}, makeOptions({ adapter: 'generic' }));
      expect(config.lsp).toBeUndefined();
    });

    it('should preserve existing LSP config for Claude', () => {
      const existing = { lsp: { enabled: false, custom: true } };
      const config = applySmartDefaults(existing, makeOptions({ adapter: 'claude' }));
      // Existing values take precedence via spread order
      expect(config.lsp.enabled).toBe(false);
      expect(config.lsp.custom).toBe(true);
    });

    // ─── Translation defaults ─────────────────────────────────

    it('should enable translation for non-English language', () => {
      const config = applySmartDefaults({}, makeOptions({ language: 'es' }));
      expect(config.translation.enabled).toBe(true);
      expect(config.translation.languages).toEqual(['en', 'es']);
      expect(config.translation.primary).toBe('es');
      expect(config.translation.method).toBe('auto');
    });

    it('should disable translation for English', () => {
      const config = applySmartDefaults({}, makeOptions({ language: 'en' }));
      expect(config.translation.enabled).toBe(false);
    });

    it('should preserve existing translation config', () => {
      const existing = { translation: { enabled: true, method: 'manual' } };
      const config = applySmartDefaults(existing, makeOptions({ language: 'de' }));
      expect(config.translation.method).toBe('manual');
      expect(config.translation.enabled).toBe(true);
    });

    // ─── Increment interview defaults ────────────────────────

    it('should set planning.incrementInterview.enabled to true by default', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.planning.incrementInterview.enabled).toBe(true);
    });

    it('should set planning.incrementInterview.minQuestions to 3', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.planning.incrementInterview.minQuestions).toBe(3);
    });

    it('should preserve existing incrementInterview config', () => {
      const existing = {
        planning: {
          incrementInterview: { enabled: false, minQuestions: 10 },
        },
      };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.planning.incrementInterview.enabled).toBe(false);
      expect(config.planning.incrementInterview.minQuestions).toBe(10);
    });

    // ─── Overall behavior ─────────────────────────────────────

    it('should return the modified config object', () => {
      const input = {};
      const result = applySmartDefaults(input, makeOptions());
      expect(result).toBe(input); // Same reference
      expect(result.testing).toBeDefined();
      expect(result.qualityGates).toBeDefined();
      expect(result.planning).toBeDefined();
    });

    it('should not overwrite unrelated config keys', () => {
      const existing = { sync: { enabled: true }, custom: 'value' };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.sync).toEqual({ enabled: true });
      expect(config.custom).toBe('value');
    });
  });
});
