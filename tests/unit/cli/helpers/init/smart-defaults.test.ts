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
import { KNOWN_CONFIG_KEYS } from '../../../../../src/core/config/types.js';

function makeOptions(overrides: Partial<SmartDefaultsOptions> = {}): SmartDefaultsOptions {
  return {
    adapter: 'claude',
    isGitRepo: true,
    ...overrides,
  };
}

describe('smart-defaults', () => {
  describe('applySmartDefaults', () => {
    // ─── Testing defaults (2.0 shape) ─────────────────────────

    it('should set testing.mode to TDD', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.mode).toBe('TDD');
    });

    it('should seed an empty testing.commands list', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.commands).toEqual([]);
    });

    it('should set testing.coverage', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.testing.coverage).toEqual({ unit: 80, integration: 70, e2e: 100 });
    });

    it('should preserve existing testing config', () => {
      const existing = { testing: { mode: 'test-after', commands: ['npm test'] } };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.testing.mode).toBe('test-after');
      expect(config.testing.commands).toEqual(['npm test']);
    });

    // ─── Planning / living docs ───────────────────────────────

    it("should set planning.deepInterview to 'off'", () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.planning.deepInterview).toBe('off');
    });

    it('should preserve an existing deepInterview setting', () => {
      const config = applySmartDefaults({ planning: { deepInterview: 'warn', roadmap: 'keep' } }, makeOptions());
      expect(config.planning.deepInterview).toBe('warn');
      expect(config.planning.roadmap).toBe('keep');
    });

    it('should default livingDocs to false', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.livingDocs).toBe(false);
    });

    it("should preserve livingDocs: 'onDone'", () => {
      const config = applySmartDefaults({ livingDocs: 'onDone' }, makeOptions());
      expect(config.livingDocs).toBe('onDone');
    });

    // ─── LSP defaults ─────────────────────────────────────────

    it('should enable LSP for Claude adapter', () => {
      const config = applySmartDefaults({}, makeOptions({ adapter: 'claude' }));
      expect(config.lsp).toEqual({ enabled: true });
    });

    it('should NOT set LSP for cursor adapter', () => {
      const config = applySmartDefaults({}, makeOptions({ adapter: 'cursor' }));
      expect(config.lsp).toBeUndefined();
    });

    it('should preserve existing LSP config for Claude', () => {
      const config = applySmartDefaults({ lsp: { enabled: false } }, makeOptions({ adapter: 'claude' }));
      expect(config.lsp.enabled).toBe(false);
    });

    // ─── Sync defaults ────────────────────────────────────────

    it('should enable sync when a repository provider is configured', () => {
      const config = applySmartDefaults({ repository: { provider: 'github' } }, makeOptions());
      expect(config.sync.enabled).toBe(true);
      expect(config.sync.settings.autoSyncOnCompletion).toBe(true);
    });

    it('should not write a hooks block (2.0: closure flags come from sync setup)', () => {
      const config = applySmartDefaults({ repository: { provider: 'github' } }, makeOptions());
      expect(config.hooks).toBeUndefined();
    });

    it('should leave sync alone when no provider is configured', () => {
      const config = applySmartDefaults({}, makeOptions());
      expect(config.sync).toBeUndefined();
    });

    // ─── Overall behavior ─────────────────────────────────────

    it('should return the modified config object', () => {
      const input = {};
      const result = applySmartDefaults(input, makeOptions());
      expect(result).toBe(input); // Same reference
      expect(result.testing).toBeDefined();
      expect(result.planning).toBeDefined();
    });

    it('should not overwrite unrelated config keys', () => {
      const existing = { sync: { enabled: true }, custom: 'value' };
      const config = applySmartDefaults(existing, makeOptions());
      expect(config.sync).toEqual({ enabled: true });
      expect(config.custom).toBe('value');
    });

    it('writes only keys the 2.0 config surface knows about', () => {
      const config = applySmartDefaults({ repository: { provider: 'github' } }, makeOptions());
      for (const key of Object.keys(config)) {
        expect(KNOWN_CONFIG_KEYS as readonly string[], key).toContain(key);
      }
    });
  });

  describe('orphaned config key guard', () => {
    // Prevents config keys from being added to smart-defaults without
    // corresponding usage in skills, hooks, or source code.
    // See: incrementInterview removal — orphaned keys confuse LLMs
    // that read config.json and interpret unknown enabled flags as instructions.

    const REPO_ROOT = join(__dirname, '../../../../..');

    function getConfigLeafKeys(): string[] {
      const config = applySmartDefaults({}, { adapter: 'claude', isGitRepo: true });
      // Also test with a provider to trigger sync/hooks branch
      const configWithProvider = applySmartDefaults(
        { repository: { provider: 'github' } },
        { adapter: 'claude', isGitRepo: true },
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
