import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for DisciplineChecker
 *
 * CRITICAL: DisciplineChecker uses MetadataManager.getAll() which reads metadata.json files.
 * Tests must:
 * 1. Change process.cwd() to the test directory (so getProjectRoot() returns test dir)
 * 2. Create proper metadata.json files (not just tasks.md)
 */

import path from 'path';
import * as fs from '../../../../src/utils/fs-native.js';
import os from 'os';
import { DisciplineChecker } from '../../../../src/core/increment/discipline-checker.js';
import { DisciplineLimits } from '../../../../src/core/increment/types.js';

/**
 * Helper to create an increment with metadata.json
 */
async function createIncrement(
  testDir: string,
  id: string,
  status: 'active' | 'completed' | 'paused' | 'backlog' | 'planning' | 'ready_for_review' | 'abandoned'
): Promise<void> {
  const incPath = path.join(testDir, '.specweave', 'increments', id);
  await fs.ensureDir(incPath);

  // Create metadata.json with required fields
  const metadata = {
    id,
    title: `Test Increment ${id}`,
    status,
    type: 'feature', // Required field
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(incPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Also create tasks.md for completeness
  const tasksContent = status === 'completed'
    ? `# Tasks\n\n### T-001: Task 1\n**Status**: [x] Completed\n`
    : `# Tasks\n\n### T-001: Task 1\n**Status**: [ ] Pending\n`;

  await fs.writeFile(path.join(incPath, 'tasks.md'), tasksContent);
}

describe('DisciplineChecker', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original cwd
    originalCwd = process.cwd();

    // Create temp directory for test
    testDir = path.join(os.tmpdir(), `discipline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.specweave', 'increments'));

    // Change to test directory so getProjectRoot() returns it
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Cleanup
    try {
      await fs.remove(testDir);
    } catch {
      // Ignore cleanup errors
    }
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
      // Create completed increment with metadata.json
      await createIncrement(testDir, '0001-feature', 'completed');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.completed).toBe(1);
    });

    it('should return compliant when 1 active increment (at limit)', async () => {
      // Create 1 active increment
      await createIncrement(testDir, '0001-feature', 'active');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(1);
    });
  });

  describe('validate() - hard cap violations', () => {
    it('should detect hard cap exceeded (4 active, limit 3)', async () => {
      // Create 4 active increments (hard cap is 3)
      for (let i = 1; i <= 4; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
      }

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      const hardCapViolation = result.violations.find(
        (v) => v.type === 'hard_cap_exceeded'
      );
      expect(hardCapViolation).toBeDefined();
      expect(hardCapViolation?.message).toContain('4 active');
      expect(hardCapViolation?.severity).toBe('error');
    });
  });

  describe('validate() - WIP limit warnings', () => {
    it('should warn when exceeding recommended limit but under hard cap', async () => {
      // Create 2 active increments (exceeds max of 1, but under hard cap of 3)
      for (let i = 1; i <= 2; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
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
      // Create 1 active increment
      await createIncrement(testDir, '0001-feature', 'active');

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
      // Create exactly 1 active (at maxActiveIncrements)
      await createIncrement(testDir, '0001-feature', 'active');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(1);
    });

    it('should handle missing metadata.json gracefully with lazy init', async () => {
      // Create increment directory without metadata.json
      // MetadataManager uses lazy initialization - it will create default metadata
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-feature');
      await fs.ensureDir(incPath);
      // Only create tasks.md, no metadata.json
      await fs.writeFile(path.join(incPath, 'tasks.md'), '# Tasks');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      // Should not crash
      expect(result).toBeDefined();
      expect(result.timestamp).toBeTruthy();
      // Lazy init creates default metadata with PLANNING status (counts as active)
      expect(result.increments.total).toBe(1);
      expect(result.increments.active).toBe(1); // PLANNING counts as active
    });

    it('should count planning status as active', async () => {
      await createIncrement(testDir, '0001-feature', 'planning');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.increments.active).toBe(1);
    });

    it('should count ready_for_review status as active', async () => {
      await createIncrement(testDir, '0001-feature', 'ready_for_review');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.increments.active).toBe(1);
    });
  });

  describe('validate() - configuration', () => {
    it('should respect custom limits', async () => {
      // Create 2 active increments
      for (let i = 1; i <= 2; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
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

  describe('validate() - mixed status counts', () => {
    it('should correctly count different statuses', async () => {
      // Create mix of statuses
      await createIncrement(testDir, '0001-active', 'active');
      await createIncrement(testDir, '0002-completed', 'completed');
      await createIncrement(testDir, '0003-paused', 'paused');
      await createIncrement(testDir, '0004-backlog', 'backlog');
      await createIncrement(testDir, '0005-abandoned', 'abandoned');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.increments.total).toBe(5);
      expect(result.increments.active).toBe(1);
      expect(result.increments.completed).toBe(1);
      expect(result.increments.paused).toBe(1);
      expect(result.increments.backlog).toBe(1);
      expect(result.increments.abandoned).toBe(1);
    });
  });
});
