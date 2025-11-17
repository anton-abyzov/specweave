import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for increment discipline types
 */

import {
  ViolationType,
  ViolationSeverity,
  ValidationViolation,
  ValidationResult,
  DisciplineCheckOptions,
  DisciplineLimits,
} from '../../../../src/core/increment/types.js';

describe('Increment Discipline Types', () => {
  describe('ViolationType', () => {
    it('should have all expected violation types', () => {
      const validTypes: ViolationType[] = [
        'hard_cap_exceeded',
        'wip_limit_exceeded',
        'incomplete_work',
        'emergency_violation',
        'metadata_inconsistency',
        'github_sync_failed',
      ];

      // Verify each type is valid (TypeScript compile-time check)
      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });

      expect(validTypes).toHaveLength(6);
    });
  });

  describe('ValidationResult', () => {
    it('should have all required fields with proper structure', () => {
      const result: ValidationResult = {
        compliant: false,
        violations: [
          {
            type: 'hard_cap_exceeded',
            message: 'Too many active increments',
            suggestion: 'Complete or pause one increment',
            severity: 'error',
            incrementId: '0018-test',
            context: { activeCount: 3 },
          },
        ],
        increments: {
          total: 10,
          active: 3,
          backlog: 0,
          paused: 1,
          completed: 5,
          abandoned: 1,
        },
        config: {
          maxActiveIncrements: 1,
          hardCap: 2,
          allowEmergencyInterrupt: true,
        },
        timestamp: '2025-11-10T14:00:00Z',
      };

      // Verify structure
      expect(result.compliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('hard_cap_exceeded');
      expect(result.violations[0].severity).toBe('error');
      expect(result.increments.total).toBe(10);
      expect(result.increments.active).toBe(3);
      expect(result.config.maxActiveIncrements).toBe(1);
      expect(result.config.hardCap).toBe(2);
      expect(result.timestamp).toBeTruthy();
    });

    it('should support compliant state with no violations', () => {
      const result: ValidationResult = {
        compliant: true,
        violations: [],
        increments: {
          total: 5,
          active: 1,
          backlog: 0,
          paused: 0,
          completed: 4,
          abandoned: 0,
        },
        config: {
          maxActiveIncrements: 1,
          hardCap: 2,
          allowEmergencyInterrupt: true,
        },
        timestamp: '2025-11-10T14:00:00Z',
      };

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(1);
    });
  });

  describe('DisciplineCheckOptions', () => {
    it('should properly type all options', () => {
      const options: DisciplineCheckOptions = {
        verbose: true,
        json: false,
        fix: false,
        projectRoot: '/test/project',
      };

      expect(options.verbose).toBe(true);
      expect(options.json).toBe(false);
      expect(options.fix).toBe(false);
      expect(options.projectRoot).toBe('/test/project');
    });

    it('should support partial options', () => {
      const options1: DisciplineCheckOptions = {};
      const options2: DisciplineCheckOptions = { verbose: true };
      const options3: DisciplineCheckOptions = { json: true, projectRoot: '/path' };

      expect(options1).toBeDefined();
      expect(options2.verbose).toBe(true);
      expect(options3.json).toBe(true);
      expect(options3.projectRoot).toBe('/path');
    });
  });

  describe('DisciplineLimits', () => {
    it('should properly type discipline limits configuration', () => {
      const limits: DisciplineLimits = {
        maxActiveIncrements: 1,
        hardCap: 2,
        allowEmergencyInterrupt: true,
        typeBehaviors: {
          canInterrupt: ['hotfix', 'bug'],
          autoAbandonDays: {
            experiment: 14,
          },
        },
      };

      expect(limits.maxActiveIncrements).toBe(1);
      expect(limits.hardCap).toBe(2);
      expect(limits.allowEmergencyInterrupt).toBe(true);
      expect(limits.typeBehaviors?.canInterrupt).toContain('hotfix');
      expect(limits.typeBehaviors?.canInterrupt).toContain('bug');
      expect(limits.typeBehaviors?.autoAbandonDays?.experiment).toBe(14);
    });
  });
});
