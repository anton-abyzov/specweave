/**
 * Unit Test: ContextBudgetConfig type and defaults
 *
 * Validates that the ContextBudgetConfig interface exists in config types
 * and has correct defaults in DEFAULT_CONFIG.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { SpecWeaveConfig } from '../../../../src/core/config/types.js';

describe('ContextBudgetConfig', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have contextBudget property', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('contextBudget');
    });

    it('should default level to "full"', () => {
      expect(DEFAULT_CONFIG.contextBudget?.level).toBe('full');
    });

    it('should default autoAdapt to true', () => {
      expect(DEFAULT_CONFIG.contextBudget?.autoAdapt).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should accept valid budget levels', () => {
      const config: Partial<SpecWeaveConfig> = {
        contextBudget: {
          level: 'full',
          autoAdapt: true,
        },
      };
      expect(config.contextBudget?.level).toBe('full');

      // All valid levels
      const levels = ['full', 'compact', 'minimal', 'off'] as const;
      for (const level of levels) {
        const c: Partial<SpecWeaveConfig> = {
          contextBudget: { level },
        };
        expect(c.contextBudget?.level).toBe(level);
      }
    });
  });
});
