/**
 * Tests for 0669 Wave 2 config schema additions (T-014/T-015).
 *
 * Four new keys drive Opus 4.7 framework behavior:
 *   - quality.thinkingBudget
 *   - quality.grillConfidenceThreshold
 *   - quality.tokenBudgets
 *   - cache.staticContextFiles
 *
 * Tests assert that DEFAULT_CONFIG carries the agreed defaults and that
 * the TypeScript types accept valid values (the type system is the
 * validator — there is no runtime enum check for thinkingBudget yet;
 * the goal of this task is to extend the schema, not add runtime
 * guards).
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  type SpecWeaveConfig,
  type QualityConfig,
  type CacheConfig,
  type ThinkingBudgetLevel,
} from '../../../../src/core/config/types.js';

describe('0669 Wave 2 — quality + cache config defaults', () => {
  it('DEFAULT_CONFIG.quality.thinkingBudget defaults to "xhigh"', () => {
    expect(DEFAULT_CONFIG.quality?.thinkingBudget).toBe('xhigh');
  });

  it('DEFAULT_CONFIG.quality.grillConfidenceThreshold defaults to 50', () => {
    expect(DEFAULT_CONFIG.quality?.grillConfidenceThreshold).toBe(50);
  });

  it('DEFAULT_CONFIG.quality.tokenBudgets maps pm.interview → 1500 and brainstorm.idea → 1800', () => {
    expect(DEFAULT_CONFIG.quality?.tokenBudgets).toMatchObject({
      'pm.interview': 1500,
      'brainstorm.idea': 1800,
    });
  });

  it('DEFAULT_CONFIG.cache.staticContextFiles lists CLAUDE.md and config.json', () => {
    const files = DEFAULT_CONFIG.cache?.staticContextFiles ?? [];
    expect(files).toContain('CLAUDE.md');
    expect(files).toContain('.specweave/config.json');
  });

  it('SpecWeaveConfig accepts all six thinkingBudget enum values', () => {
    // Type-level assertion: this block compiles iff the enum has the
    // expected members. No runtime check is needed.
    const values: ThinkingBudgetLevel[] = [
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
      'legacy',
    ];
    expect(values).toHaveLength(6);
  });

  it('QualityConfig accepts an explicit user override', () => {
    const cfg: QualityConfig = {
      thinkingBudget: 'max',
      grillConfidenceThreshold: 75,
      tokenBudgets: { 'custom.task': 999 },
    };
    expect(cfg.thinkingBudget).toBe('max');
    expect(cfg.grillConfidenceThreshold).toBe(75);
    expect(cfg.tokenBudgets?.['custom.task']).toBe(999);
  });

  it('CacheConfig accepts an explicit user-supplied file list', () => {
    const cfg: CacheConfig = {
      staticContextFiles: ['README.md', 'docs/guide.md'],
    };
    expect(cfg.staticContextFiles).toEqual(['README.md', 'docs/guide.md']);
  });

  it('SpecWeaveConfig composes quality + cache without type errors', () => {
    const cfg: SpecWeaveConfig = {
      version: '2.0',
      quality: {
        thinkingBudget: 'xhigh',
        grillConfidenceThreshold: 50,
        tokenBudgets: { 'pm.interview': 1500 },
      },
      cache: {
        staticContextFiles: ['CLAUDE.md'],
      },
    };
    expect(cfg.quality?.thinkingBudget).toBe('xhigh');
    expect(cfg.cache?.staticContextFiles).toHaveLength(1);
  });
});
