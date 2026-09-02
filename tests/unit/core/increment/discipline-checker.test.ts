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
import { DisciplineChecker, buildWipNote, resolveDisciplineLimits } from '../../../../src/core/increment/discipline-checker.js';
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
    it('should create checker with default limits (advisory 3)', () => {
      const checker = new DisciplineChecker(testDir);
      expect(checker.getLimits()).toEqual({ activeIncrements: 3 });
    });

    it('should create checker with custom limits', () => {
      const customLimits: DisciplineLimits = { activeIncrements: 2 };
      const checker = new DisciplineChecker(testDir, customLimits);
      expect(checker.getLimits()).toEqual({ activeIncrements: 2 });
    });

    it('should read limits.activeIncrements from config.json', async () => {
      await fs.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ version: '2.0', limits: { activeIncrements: 5 } })
      );
      const checker = new DisciplineChecker(testDir);
      expect(checker.getLimits()).toEqual({ activeIncrements: 5 });
    });
  });

  describe('resolveDisciplineLimits', () => {
    it('defaults to 3', () => {
      expect(resolveDisciplineLimits(undefined)).toEqual({ activeIncrements: 3 });
      expect(resolveDisciplineLimits({})).toEqual({ activeIncrements: 3 });
    });

    it('honours legacy maxActiveIncrements until migrated', () => {
      expect(resolveDisciplineLimits({ maxActiveIncrements: 7, hardCap: 9 })).toEqual({ activeIncrements: 7 });
    });

    it('clamps negatives to 0 (off)', () => {
      expect(resolveDisciplineLimits({ activeIncrements: -1 })).toEqual({ activeIncrements: 0 });
    });
  });

  describe('buildWipNote', () => {
    it('returns null at or under the limit', () => {
      expect(buildWipNote(3, 3)).toBeNull();
      expect(buildWipNote(0, 3)).toBeNull();
    });

    it('returns null when disabled (0)', () => {
      expect(buildWipNote(50, 0)).toBeNull();
    });

    it('returns a single info note when over the limit', () => {
      const note = buildWipNote(4, 3);
      expect(note?.severity).toBe('info');
      expect(note?.type).toBe('wip_limit_exceeded');
      expect(note?.message).toContain('4 active');
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
      await createIncrement(testDir, '0001-feature', 'completed');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.completed).toBe(1);
    });

    it('should return compliant with exactly 3 active (at limit)', async () => {
      for (let i = 1; i <= 3; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
      }

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.increments.active).toBe(3);
    });
  });

  describe('validate() - advisory WIP note (no hard cap)', () => {
    it('10 active increments produce exactly one info note and no error', async () => {
      for (let i = 1; i <= 10; i++) {
        await createIncrement(testDir, `${String(i).padStart(4, '0')}-inc`, 'active');
      }

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result.increments.active).toBe(10);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('wip_limit_exceeded');
      expect(result.violations[0].severity).toBe('info');
      expect(result.violations[0].message).toContain('10 active');
      expect(result.violations.some(v => v.severity === 'error')).toBe(false);
      expect(result.violations.some(v => (v.type as string) === 'hard_cap_exceeded')).toBe(false);
    });

    it('emits no note when limits.activeIncrements is 0', async () => {
      for (let i = 1; i <= 6; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
      }

      const checker = new DisciplineChecker(testDir, { activeIncrements: 0 });
      const result = await checker.validate();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should respect custom limits', async () => {
      for (let i = 1; i <= 4; i++) {
        await createIncrement(testDir, `000${i}-inc`, 'active');
      }

      const result1 = await new DisciplineChecker(testDir).validate();
      expect(result1.violations.find(v => v.type === 'wip_limit_exceeded')).toBeDefined();

      const result2 = await new DisciplineChecker(testDir, { activeIncrements: 4 }).validate();
      expect(result2.violations.find(v => v.type === 'wip_limit_exceeded')).toBeUndefined();
    });
  });

  describe('validate() - active definition (WIP_COUNTED_STATUSES)', () => {
    it('should handle missing metadata.json gracefully with lazy init', async () => {
      const incPath = path.join(testDir, '.specweave', 'increments', '0001-feature');
      await fs.ensureDir(incPath);
      await fs.writeFile(path.join(incPath, 'tasks.md'), '# Tasks');

      const checker = new DisciplineChecker(testDir);
      const result = await checker.validate();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeTruthy();
      expect(result.increments.total).toBe(1);
      // Lazy init creates PLANNING metadata, which is not active
      expect(result.increments.active).toBe(0);
    });

    it('should NOT count planning status as active', async () => {
      await createIncrement(testDir, '0001-feature', 'planning');

      const result = await new DisciplineChecker(testDir).validate();
      expect(result.increments.active).toBe(0);
    });

    it('should count ready_for_review status as active', async () => {
      await createIncrement(testDir, '0001-feature', 'ready_for_review');

      const result = await new DisciplineChecker(testDir).validate();
      expect(result.increments.active).toBe(1);
    });

    it('should NOT count paused status as active', async () => {
      await createIncrement(testDir, '0001-feature', 'paused');

      const result = await new DisciplineChecker(testDir).validate();
      expect(result.increments.active).toBe(0);
      expect(result.increments.paused).toBe(1);
    });
  });

  describe('validate() - mixed status counts', () => {
    it('should correctly count different statuses', async () => {
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
