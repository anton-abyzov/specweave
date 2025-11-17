import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for DisciplineChecker
 */

import { DisciplineChecker } from '../../../../src/core/increment/discipline-checker.js';
import { ValidationResult, DisciplineLimits } from '../../../../src/core/increment/types.js';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

describe('DisciplineChecker', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for test
    testDir = path.join(os.tmpdir(), `discipline-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.specweave', 'increments'));
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('constructor', () => {
    it('should create checker with default limits', () => {
      const checker = new DisciplineChecker(testDir);
      expect(checker).toBeDefined();
    });

    it('should create checker with custom limits', () => {
      const customLimits: DisciplineLimits = {
        maxActiveIncrements: 2,
        hardCap: 3,
        allowEmergencyInterrupt: false,
      };
      const checker = new DisciplineChecker(testDir, customLimits);
      expect(checker).toBeDefined();
    });
  });

  describe('validate() - no violations', () => {
    it('should return compliant when no increments exist', async () => {
      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.total).toBe(0);
      expect(result.increments.active).toBe(0);
    });

    it('should return compliant when only completed increments exist', async () => {
      // Create completed increment with proper task format
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incPath);
      await fs.writeFile(
        path.join(incPath, 'tasks.md'),
        `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [x] Completed
`
      );

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      // Debug: Print violations if any
      if (!result.compliant) {
        throw new Error(`Expected compliant but got violations: ${JSON.stringify({
          violations: result.violations,
          increments: result.increments
        }, null, 2)}`);
      }

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return compliant when 1 active increment (at limit)', async () => {
      // Create 1 active increment with proper task format
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incPath);
      await fs.writeFile(
        path.join(incPath, 'tasks.md'),
        `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(1);
    });
  });

  describe('validate() - hard cap violations', () => {
    it('should detect hard cap exceeded (3 active, limit 2)', async () => {
      // Create 3 incomplete increments with proper task format
      for (let i = 1; i <= 3; i++) {
        const incPath = path.join(testDir, '.specweave', 'increments', `000${i}-test`);
        await fs.ensureDir(incPath);
        await fs.writeFile(
          path.join(incPath, 'tasks.md'),
          `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
        );
      }

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      const hardCapViolation = result.violations.find(
        (v) => v.type === 'hard_cap_exceeded'
      );
      expect(hardCapViolation).toBeDefined();
      expect(hardCapViolation?.message).toContain('3 active');
      expect(hardCapViolation?.severity).toBe('error');
    });
  });

  describe('validate() - WIP limit warnings', () => {
    it('should warn when exceeding recommended limit but under hard cap', async () => {
      // Create 2 incomplete increments (exceeds max of 1, but under hard cap of 2)
      for (let i = 1; i <= 2; i++) {
        const incPath = path.join(testDir, '.specweave', 'increments', `000${i}-test`);
        await fs.ensureDir(incPath);
        await fs.writeFile(
          path.join(incPath, 'tasks.md'),
          `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
        );
      }

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(false);

      const wipViolation = result.violations.find(
        (v) => v.type === 'wip_limit_exceeded'
      );
      expect(wipViolation).toBeDefined();
      expect(wipViolation?.severity).toBe('warning');
      expect(wipViolation?.message).toContain('2 active');
    });
  });

  describe('validate() - active increment tracking', () => {
    it('should track active increments with pending tasks (compliant if under limit)', async () => {
      // Create 1 active increment with pending tasks (1/3 complete = 33%)
      // This is compliant since 1 active is at the maxActiveIncrements limit
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incPath);
      await fs.writeFile(
        path.join(incPath, 'tasks.md'),
        `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending

### T-003: Task 3
**Status**: [ ] Pending
`
      );

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      // Should be compliant (1 active is at the limit)
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);

      // But should report 1 active increment
      expect(result.increments.active).toBe(1);
      expect(result.increments.completed).toBe(0);
    });
  });

  describe('validate() - edge cases', () => {
    it('should handle exactly at limit (no violation)', async () => {
      // Create exactly 1 active (at maxActiveIncrements) with proper task format
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incPath);
      await fs.writeFile(
        path.join(incPath, 'tasks.md'),
        `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(1);
    });

    it('should handle missing tasks.md gracefully', async () => {
      // Create increment without tasks.md
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incPath);

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      // Should not crash
      expect(result).toBeDefined();
      expect(result.timestamp).toBeTruthy();
    });
  });

  describe('validate() - configuration', () => {
    it('should respect custom limits', async () => {
      // Create 2 active increments with proper task format
      for (let i = 1; i <= 2; i++) {
        const incPath = path.join(testDir, '.specweave', 'increments', `000${i}-test`);
        await fs.ensureDir(incPath);
        await fs.writeFile(
          path.join(incPath, 'tasks.md'),
          `# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
        );
      }

      // With default limits (max=1), this should warn
      const checker1 = new DisciplineChecker(testDir);
      const result1 = await checker1.validate();
      expect(result1.compliant).toBe(false);

      // With custom limits (max=2), this should pass
      const customLimits: DisciplineLimits = {
        maxActiveIncrements: 2,
        hardCap: 3,
        allowEmergencyInterrupt: true,
      };
      const checker2 = new DisciplineChecker(testDir, customLimits);
      const result2 = await checker2.validate();
      expect(result2.compliant).toBe(true);
    });
  });
});
