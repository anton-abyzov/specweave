/**
 * Unit tests for default-conditions.ts
 * Tests smart defaults, merge logic, and mandatory enforcement
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultConditions,
  mergeConditions,
  validateUserConditions,
  describeConditions,
  MANDATORY_CONDITIONS,
} from './default-conditions.js';
import { CompletionCondition } from './types.js';

describe('default-conditions', () => {
  describe('MANDATORY_CONDITIONS', () => {
    it('web-frontend should require e2e and e2e-coverage', () => {
      const conditions = MANDATORY_CONDITIONS['web-frontend'];

      const types = conditions.map((c) => c.type);
      expect(types).toContain('e2e');
      expect(types).toContain('e2e-coverage');
      expect(types).toContain('build');
      expect(types).toContain('tests');
      expect(types).toContain('types');

      const e2eCov = conditions.find((c) => c.type === 'e2e-coverage');
      expect(e2eCov?.threshold).toBe(70);
      expect(e2eCov?.mandatory).toBe(true);
    });

    it('backend-api should require integration and coverage', () => {
      const conditions = MANDATORY_CONDITIONS['backend-api'];

      const types = conditions.map((c) => c.type);
      expect(types).toContain('integration');
      expect(types).toContain('coverage');
      expect(types).toContain('tests');

      const coverage = conditions.find((c) => c.type === 'coverage');
      expect(coverage?.threshold).toBe(80);
      expect(coverage?.mandatory).toBe(true);
    });

    it('library should require tests, coverage, and types', () => {
      const conditions = MANDATORY_CONDITIONS['library'];

      const types = conditions.map((c) => c.type);
      expect(types).toContain('tests');
      expect(types).toContain('coverage');
      expect(types).toContain('types');
      expect(types).not.toContain('e2e');

      const coverage = conditions.find((c) => c.type === 'coverage');
      expect(coverage?.threshold).toBe(80);
    });

    it('mobile-native should have lower e2e-coverage threshold', () => {
      const conditions = MANDATORY_CONDITIONS['mobile-native'];

      const e2eCov = conditions.find((c) => c.type === 'e2e-coverage');
      expect(e2eCov?.threshold).toBe(60); // Lower than web (70%)
    });

    it('cli-tool should not require e2e', () => {
      const conditions = MANDATORY_CONDITIONS['cli-tool'];

      const types = conditions.map((c) => c.type);
      expect(types).not.toContain('e2e');
      expect(types).toContain('tests');
      expect(types).toContain('types');
    });

    it('generic should have minimal requirements', () => {
      const conditions = MANDATORY_CONDITIONS['generic'];

      expect(conditions.length).toBe(1);
      expect(conditions[0].type).toBe('tests');
      expect(conditions[0].mandatory).toBe(true);
    });

    it('all mandatory conditions should have mandatory=true', () => {
      for (const [projectType, conditions] of Object.entries(
        MANDATORY_CONDITIONS
      )) {
        for (const condition of conditions) {
          expect(condition.mandatory).toBe(true);
        }
      }
    });

    it('build and types should have autoHeal=true where present', () => {
      const webConditions = MANDATORY_CONDITIONS['web-frontend'];

      const build = webConditions.find((c) => c.type === 'build');
      expect(build?.autoHeal).toBe(true);
      expect(build?.maxRetries).toBe(3);

      const types = webConditions.find((c) => c.type === 'types');
      expect(types?.autoHeal).toBe(true);
    });
  });

  describe('getDefaultConditions', () => {
    it('should return defaults with no user overrides', () => {
      const conditions = getDefaultConditions('web-frontend');

      expect(conditions.length).toBeGreaterThan(0);
      expect(conditions).toEqual(MANDATORY_CONDITIONS['web-frontend']);
    });

    it('should return defaults with empty user overrides', () => {
      const conditions = getDefaultConditions('backend-api', []);

      expect(conditions).toEqual(MANDATORY_CONDITIONS['backend-api']);
    });

    it('should merge user overrides with defaults', () => {
      const userOverrides: CompletionCondition[] = [
        { type: 'lint', mandatory: false },
      ];

      const conditions = getDefaultConditions('web-frontend', userOverrides);

      // Should have defaults + user additions
      expect(conditions.find((c) => c.type === 'e2e')).toBeDefined();
      expect(conditions.find((c) => c.type === 'lint')).toBeDefined();
    });

    it('should fallback to generic for unknown types', () => {
      const conditions = getDefaultConditions('unknown' as any);

      expect(conditions).toEqual(MANDATORY_CONDITIONS['generic']);
    });
  });

  describe('mergeConditions', () => {
    it('should preserve all mandatory conditions', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'build', mandatory: true },
        { type: 'e2e', mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'lint', mandatory: false },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      expect(merged.find((c) => c.type === 'build')).toBeDefined();
      expect(merged.find((c) => c.type === 'e2e')).toBeDefined();
      expect(merged.find((c) => c.type === 'lint')).toBeDefined();
    });

    it('should allow user to add new conditions', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'lint', mandatory: false },
        { type: 'security', mandatory: false },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      expect(merged.length).toBe(3);
      expect(merged.find((c) => c.type === 'lint')).toBeDefined();
      expect(merged.find((c) => c.type === 'security')).toBeDefined();
    });

    it('should preserve mandatory=true even if user tries to change', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'e2e', mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'e2e', mandatory: false }, // User tries to disable
      ];

      const merged = mergeConditions(mandatory, userProvided);

      const e2e = merged.find((c) => c.type === 'e2e');
      expect(e2e?.mandatory).toBe(true); // Should remain true
    });

    it('should allow user to adjust autoHeal settings', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'build', mandatory: true, autoHeal: false },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      const build = merged.find((c) => c.type === 'build');
      expect(build?.autoHeal).toBe(false); // User preference applied
      expect(build?.mandatory).toBe(true); // But mandatory preserved
    });

    it('should not allow decreasing threshold below mandatory minimum', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'coverage', threshold: 80, mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'coverage', threshold: 50, mandatory: true }, // Too low
      ];

      const merged = mergeConditions(mandatory, userProvided);

      const coverage = merged.find((c) => c.type === 'coverage');
      expect(coverage?.threshold).toBe(80); // Should remain at mandatory minimum
    });

    it('should allow increasing threshold above mandatory minimum', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'coverage', threshold: 70, mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'coverage', threshold: 90, mandatory: true },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      const coverage = merged.find((c) => c.type === 'coverage');
      expect(coverage?.threshold).toBe(90); // User can increase
    });

    it('should not duplicate conditions', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
        { type: 'lint', mandatory: false },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      const testConditions = merged.filter((c) => c.type === 'tests');
      expect(testConditions.length).toBe(1);
    });
  });

  describe('validateUserConditions', () => {
    it('should pass validation with valid user conditions', () => {
      const userConditions: CompletionCondition[] = [
        { type: 'build', mandatory: true },
        { type: 'tests', mandatory: true },
        { type: 'e2e', mandatory: true },
        { type: 'e2e-coverage', threshold: 70, mandatory: true },
        { type: 'types', mandatory: true },
      ];

      const result = validateUserConditions('web-frontend', userConditions);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn about missing mandatory conditions', () => {
      const userConditions: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
        // Missing e2e, e2e-coverage, etc.
      ];

      const result = validateUserConditions('web-frontend', userConditions);

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('e2e'))).toBe(true);
    });

    it('should warn about threshold violations', () => {
      const userConditions: CompletionCondition[] = [
        { type: 'coverage', threshold: 50, mandatory: true },
      ];

      const result = validateUserConditions('backend-api', userConditions);

      expect(result.valid).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('threshold too low'))
      ).toBe(true);
    });

    it('should warn about disabling mandatory conditions', () => {
      const userConditions: CompletionCondition[] = [
        { type: 'e2e', mandatory: false }, // Trying to disable
      ];

      const result = validateUserConditions('web-frontend', userConditions);

      expect(result.valid).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('Cannot disable mandatory'))
      ).toBe(true);
    });

    it('should accept user adding extra conditions', () => {
      const userConditions: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
        { type: 'lint', mandatory: false }, // Extra condition
      ];

      const result = validateUserConditions('generic', userConditions);

      expect(result.valid).toBe(true);
    });
  });

  describe('describeConditions', () => {
    it('should generate human-readable descriptions', () => {
      const conditions: CompletionCondition[] = [
        { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
        { type: 'tests', mandatory: true },
        { type: 'e2e', mandatory: true },
        { type: 'coverage', threshold: 80, mandatory: true },
      ];

      const descriptions = describeConditions(conditions);

      expect(descriptions.length).toBe(4);
      expect(descriptions[0]).toContain('Build');
      expect(descriptions[0]).toContain('MANDATORY');
      expect(descriptions[0]).toContain('auto-heal');
      expect(descriptions[3]).toContain('≥80%');
    });

    it('should include icons for each condition type', () => {
      const conditions: CompletionCondition[] = [
        { type: 'build', mandatory: true },
        { type: 'e2e', mandatory: true },
      ];

      const descriptions = describeConditions(conditions);

      expect(descriptions[0]).toContain('🔨');
      expect(descriptions[1]).toContain('🎭');
    });

    it('should show threshold when present', () => {
      const conditions: CompletionCondition[] = [
        { type: 'coverage', threshold: 90, mandatory: true },
      ];

      const descriptions = describeConditions(conditions);

      expect(descriptions[0]).toContain('≥90%');
    });

    it('should show auto-heal info when enabled', () => {
      const conditions: CompletionCondition[] = [
        { type: 'build', mandatory: true, autoHeal: true, maxRetries: 5 },
      ];

      const descriptions = describeConditions(conditions);

      expect(descriptions[0]).toContain('auto-heal: 5 retries');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mandatory conditions', () => {
      const merged = mergeConditions([], [{ type: 'lint', mandatory: false }]);

      expect(merged.length).toBe(1);
      expect(merged[0].type).toBe('lint');
    });

    it('should handle empty user conditions', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'tests', mandatory: true },
      ];

      const merged = mergeConditions(mandatory, []);

      expect(merged).toEqual(mandatory);
    });

    it('should handle conditions without thresholds', () => {
      const mandatory: CompletionCondition[] = [
        { type: 'build', mandatory: true },
      ];

      const userProvided: CompletionCondition[] = [
        { type: 'build', mandatory: true },
      ];

      const merged = mergeConditions(mandatory, userProvided);

      expect(merged.find((c) => c.type === 'build')).toBeDefined();
    });

    it('should handle unknown project types', () => {
      const conditions = getDefaultConditions('unknown-type' as any);

      expect(conditions).toEqual(MANDATORY_CONDITIONS['generic']);
    });
  });
});
