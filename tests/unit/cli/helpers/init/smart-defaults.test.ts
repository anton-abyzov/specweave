/**
 * Tests for smart defaults application
 * T-008 [RED] → T-009 [GREEN]
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
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
      expect(config.testing.coverageTargets).toEqual({ unit: 80, integration: 70, e2e: 100 });
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

    it('should NOT set incrementInterview (orphaned key removed)', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.planning.incrementInterview).toBeUndefined();
    });

    // ─── Sync/hooks defaults ──────────────────────────────────

    it('should set auto_create_github_issue in post_increment_planning when provider configured', () => {
      const config = applySmartDefaults(
        { repository: { provider: 'github' } },
        makeOptions()
      );
      expect(config.hooks.post_increment_planning.auto_create_github_issue).toBe(true);
    });

    it('should NOT set sync_living_docs in post_increment_planning', () => {
      const config = applySmartDefaults(
        { repository: { provider: 'github' } },
        makeOptions()
      );
      // sync_living_docs should NOT be set by smart defaults
      // (it runs after agents finish, not at planning time)
      expect(config.hooks.post_increment_planning.sync_living_docs).toBeUndefined();
    });

    it('should preserve existing post_increment_planning hooks', () => {
      const config = applySmartDefaults(
        {
          repository: { provider: 'github' },
          hooks: { post_increment_planning: { custom_hook: true } },
        },
        makeOptions()
      );
      expect(config.hooks.post_increment_planning.custom_hook).toBe(true);
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

  describe('orphaned config key guard', () => {
    // Prevents config keys from being added to smart-defaults without
    // corresponding usage in skills, hooks, or source code.
    // See: incrementInterview removal — orphaned keys confuse LLMs
    // that read config.json and interpret unknown enabled flags as instructions.

    const REPO_ROOT = join(__dirname, '../../../../..');

    function getConfigLeafKeys(): string[] {
      const config = applySmartDefaults({}, {
        adapter: 'claude',
        language: 'de', // non-en to trigger translation branch
        isGitRepo: true,
      });
      // Also test with a provider to trigger sync/hooks branch
      const configWithProvider = applySmartDefaults(
        { repository: { provider: 'github' } },
        { adapter: 'claude', language: 'en', isGitRepo: true },
      );
      const keys = new Set<string>();
      function walk(obj: Record<string, any>, prefix: string) {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            walk(v, path);
          } else {
            keys.add(path);
          }
        }
      }
      walk(config, '');
      walk(configWithProvider, '');
      return [...keys];
    }

    function isKeyReferenced(key: string): boolean {
      // Extract the deepest config key name (e.g. "incrementInterview" from
      // "planning.incrementInterview.enabled")
      const segments = key.split('.');
      // Search for the second-to-last segment if it's a nested object key
      // (e.g., "deepInterview" from "planning.deepInterview.enabled")
      // or the leaf itself for flat keys
      const searchTerms = new Set<string>();
      for (const seg of segments) {
        if (seg.length > 3) searchTerms.add(seg); // skip short generic keys like "enabled"
      }

      const searchDirs = [
        join(REPO_ROOT, 'plugins'),
        join(REPO_ROOT, 'src'),
      ];

      for (const term of searchTerms) {
        for (const dir of searchDirs) {
          if (!existsSync(dir)) continue;
          try {
            // Search in .ts, .md, .sh files — skills use jq/grep on these key names
            const result = execSync(
              `grep -rl "${term}" "${dir}" --include="*.ts" --include="*.md" --include="*.sh" 2>/dev/null || true`,
              { encoding: 'utf-8' },
            ).trim();
            // Exclude smart-defaults.ts itself and its test
            const files = result.split('\n').filter(f =>
              f && !f.includes('smart-defaults.ts') && !f.includes('smart-defaults.test.ts'),
            );
            if (files.length > 0) return true;
          } catch {
            // grep not found or other error — skip
          }
        }
      }
      return false;
    }

    it('every config key from smart-defaults should be referenced in plugins or src', () => {
      const keys = getConfigLeafKeys();
      const orphaned: string[] = [];

      for (const key of keys) {
        if (!isKeyReferenced(key)) {
          orphaned.push(key);
        }
      }

      expect(
        orphaned,
        `Orphaned config keys found in smart-defaults.ts that are never referenced ` +
        `in plugins/ or src/. These confuse LLMs that read config.json. ` +
        `Either wire them into a skill/hook or remove them:\n  ${orphaned.join('\n  ')}`,
      ).toEqual([]);
    });
  });
});
