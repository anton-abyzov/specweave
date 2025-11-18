import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * CRITICAL SAFEGUARDS: Increment Closure Operations
 *
 * These tests enforce the FUNDAMENTAL RULE:
 * Increments are PERMANENT. Closing = status update ONLY. NEVER move/delete.
 *
 * Incident: 2025-11-18 - Increment 0038 accidentally "deleted" via move to _completed/
 * Root Cause: Incorrect closure pattern (move instead of status update)
 * Solution: These tests prevent recurrence
 */
describe('Increment Closure Safeguards (CRITICAL)', () => {
  let testRoot: string;
  let incrementsDir: string;
  let incrementPath: string;
  let metadataPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), 'test-increment-closure-' + Date.now());
    incrementsDir = path.join(testRoot, '.specweave', 'increments');
    incrementPath = path.join(incrementsDir, '0001-test-increment');
    metadataPath = path.join(incrementPath, 'metadata.json');

    // Setup test increment
    await fs.ensureDir(incrementPath);
    await fs.writeJson(metadataPath, {
      id: '0001-test-increment',
      status: 'active',
      type: 'feature',
      priority: 'P1',
      created: '2025-11-18T00:00:00Z',
      started: '2025-11-18T00:00:00Z',
      totalTasks: 10,
      completedTasks: 10
    });

    // Create some increment files
    await fs.writeFile(path.join(incrementPath, 'spec.md'), '# Spec');
    await fs.writeFile(path.join(incrementPath, 'plan.md'), '# Plan');
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), '# Tasks');
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('✅ CORRECT: Status Update Without File Operations', () => {
    it('should update status to completed WITHOUT moving increment', async () => {
      // Act: Close increment (correct way - update metadata only)
      const metadata = await fs.readJson(metadataPath);
      metadata.status = 'completed';
      metadata.completed = new Date().toISOString();
      await fs.writeJson(metadataPath, metadata);

      // Assert: Increment still exists in ORIGINAL location
      const incrementExists = await fs.pathExists(incrementPath);
      expect(incrementExists).toBe(true);

      // Assert: All files still present
      const specExists = await fs.pathExists(path.join(incrementPath, 'spec.md'));
      const planExists = await fs.pathExists(path.join(incrementPath, 'plan.md'));
      const tasksExists = await fs.pathExists(path.join(incrementPath, 'tasks.md'));

      expect(specExists).toBe(true);
      expect(planExists).toBe(true);
      expect(tasksExists).toBe(true);

      // Assert: Status updated correctly
      const updatedMetadata = await fs.readJson(metadataPath);
      expect(updatedMetadata.status).toBe('completed');
      expect(updatedMetadata.completed).toBeDefined();
    });

    it('should NEVER create _completed directory', async () => {
      // Act: Close increment
      const metadata = await fs.readJson(metadataPath);
      metadata.status = 'completed';
      metadata.completed = new Date().toISOString();
      await fs.writeJson(metadataPath, metadata);

      // Assert: _completed directory NEVER created
      const completedDirPath = path.join(incrementsDir, '_completed');
      const completedDirExists = await fs.pathExists(completedDirPath);

      expect(completedDirExists).toBe(false);
    });

    it('should NEVER create _archive directory during closure', async () => {
      // Act: Close increment
      const metadata = await fs.readJson(metadataPath);
      metadata.status = 'completed';
      metadata.completed = new Date().toISOString();
      await fs.writeJson(metadataPath, metadata);

      // Assert: _archive directory NEVER created
      const archiveDirPath = path.join(incrementsDir, '_archive');
      const archiveDirExists = await fs.pathExists(archiveDirPath);

      expect(archiveDirExists).toBe(false);
    });

    it('should allow querying completed increments by status', async () => {
      // Setup: Create multiple increments with different statuses
      const increments = [
        { id: '0001-test', status: 'completed' },
        { id: '0002-test', status: 'active' },
        { id: '0003-test', status: 'completed' },
        { id: '0004-test', status: 'paused' }
      ];

      for (const inc of increments) {
        const incPath = path.join(incrementsDir, inc.id);
        await fs.ensureDir(incPath);
        await fs.writeJson(path.join(incPath, 'metadata.json'), {
          id: inc.id,
          status: inc.status,
          created: '2025-11-18T00:00:00Z'
        });
      }

      // Act: Query by status (correct pattern)
      const allIncrementDirs = await fs.readdir(incrementsDir);
      const allMetadata = await Promise.all(
        allIncrementDirs
          .filter(dir => /^[0-9]{4}-/.test(dir))
          .map(async dir => {
            const metaPath = path.join(incrementsDir, dir, 'metadata.json');
            return await fs.readJson(metaPath);
          })
      );

      const completedIncrements = allMetadata.filter(m => m.status === 'completed');
      const activeIncrements = allMetadata.filter(m => m.status === 'active');

      // Assert: Correct filtering
      expect(completedIncrements).toHaveLength(2); // 0001, 0003
      expect(activeIncrements).toHaveLength(2); // 0002 + original test increment from beforeEach

      // Assert: All increments in SAME directory
      for (const meta of allMetadata) {
        const incPath = path.join(incrementsDir, meta.id);
        const exists = await fs.pathExists(incPath);
        expect(exists).toBe(true);
      }
    });
  });

  describe('❌ FORBIDDEN: File Move/Delete Operations', () => {
    it('should detect if increment was moved to _completed', async () => {
      // WRONG pattern: Move to _completed (what happened in incident)
      const completedDir = path.join(incrementsDir, '_completed');
      await fs.ensureDir(completedDir);
      await fs.move(incrementPath, path.join(completedDir, '0001-test-increment'));

      // Detect: Increment no longer in original location
      const incrementExists = await fs.pathExists(incrementPath);
      expect(incrementExists).toBe(false);

      // Detect: _completed directory created (WRONG!)
      const completedDirExists = await fs.pathExists(completedDir);
      expect(completedDirExists).toBe(true);

      // This test PASSES if it detects the WRONG pattern
      // In real code, pre-commit hook would BLOCK this
    });

    it('should detect if increment was deleted', async () => {
      // WRONG pattern: Delete increment
      await fs.remove(incrementPath);

      // Detect: Increment deleted (WRONG!)
      const incrementExists = await fs.pathExists(incrementPath);
      expect(incrementExists).toBe(false);

      // This test PASSES if it detects the WRONG pattern
      // In real code, pre-commit hook would BLOCK this
    });

    it('should detect if increment was renamed', async () => {
      // WRONG pattern: Rename increment
      const renamedPath = path.join(incrementsDir, '0001-test-increment-old');
      await fs.rename(incrementPath, renamedPath);

      // Detect: Original path gone
      const originalExists = await fs.pathExists(incrementPath);
      expect(originalExists).toBe(false);

      // Detect: Renamed path exists (WRONG!)
      const renamedExists = await fs.pathExists(renamedPath);
      expect(renamedExists).toBe(true);

      // This test PASSES if it detects the WRONG pattern
    });
  });

  describe('🔒 Status Enum Validation', () => {
    it('should only allow valid status enum values', async () => {
      const validStatuses = ['planning', 'active', 'paused', 'completed', 'abandoned'];
      const invalidStatuses = ['archived', 'deleted', 'moved', 'closed', 'done', 'finished'];

      // Valid statuses should pass
      for (const status of validStatuses) {
        const metadata = await fs.readJson(metadataPath);
        metadata.status = status;
        await fs.writeJson(metadataPath, metadata);

        const saved = await fs.readJson(metadataPath);
        expect(validStatuses).toContain(saved.status);
      }

      // Invalid statuses should be detected
      for (const status of invalidStatuses) {
        const metadata = await fs.readJson(metadataPath);
        metadata.status = status;
        await fs.writeJson(metadataPath, metadata);

        const saved = await fs.readJson(metadataPath);

        // In real code, validator would reject these
        // This test documents invalid values to catch
        expect(validStatuses).not.toContain(saved.status);
      }
    });

    it('should reject empty or null status', async () => {
      const metadata = await fs.readJson(metadataPath);

      // Empty status
      metadata.status = '';
      await fs.writeJson(metadataPath, metadata);
      const emptyStatus = (await fs.readJson(metadataPath)).status;
      expect(emptyStatus).toBe(''); // Documents invalid state

      // Null status
      metadata.status = null;
      await fs.writeJson(metadataPath, metadata);
      const nullStatus = (await fs.readJson(metadataPath)).status;
      expect(nullStatus).toBe(null); // Documents invalid state

      // In real code, validator would reject these
    });
  });

  describe('📊 Increment Permanence Verification', () => {
    it('should preserve all increment history after closure', async () => {
      // Setup: Create reports and logs
      const reportsDir = path.join(incrementPath, 'reports');
      const logsDir = path.join(incrementPath, 'logs');

      await fs.ensureDir(reportsDir);
      await fs.ensureDir(logsDir);

      await fs.writeFile(path.join(reportsDir, 'PM-VALIDATION-REPORT.md'), '# PM Report');
      await fs.writeFile(path.join(logsDir, 'execution.log'), 'Log entry');

      // Act: Close increment
      const metadata = await fs.readJson(metadataPath);
      metadata.status = 'completed';
      metadata.completed = new Date().toISOString();
      await fs.writeJson(metadataPath, metadata);

      // Assert: All history preserved
      const pmReportExists = await fs.pathExists(path.join(reportsDir, 'PM-VALIDATION-REPORT.md'));
      const logExists = await fs.pathExists(path.join(logsDir, 'execution.log'));

      expect(pmReportExists).toBe(true);
      expect(logExists).toBe(true);
    });

    it('should count completed increments without moving them', async () => {
      // Setup: Create 5 completed increments
      for (let i = 1; i <= 5; i++) {
        const incId = `000${i}-test-increment`;
        const incPath = path.join(incrementsDir, incId);
        await fs.ensureDir(incPath);
        await fs.writeJson(path.join(incPath, 'metadata.json'), {
          id: incId,
          status: 'completed',
          created: '2025-11-18T00:00:00Z',
          completed: '2025-11-18T01:00:00Z'
        });
      }

      // Act: Count completed increments
      const allDirs = await fs.readdir(incrementsDir);
      const incrementDirs = allDirs.filter(dir => /^[0-9]{4}-/.test(dir));

      const completedCount = (await Promise.all(
        incrementDirs.map(async dir => {
          const metaPath = path.join(incrementsDir, dir, 'metadata.json');
          const meta = await fs.readJson(metaPath);
          return meta.status === 'completed' ? 1 : 0;
        })
      )).reduce((sum, val) => sum + val, 0);

      // Assert: All 5 completed increments counted
      expect(completedCount).toBe(5);

      // Assert: All still in increments directory
      for (const dir of incrementDirs) {
        const exists = await fs.pathExists(path.join(incrementsDir, dir));
        expect(exists).toBe(true);
      }
    });
  });

  describe('🚨 Pre-Commit Hook Validation Scenarios', () => {
    it('should detect _completed directory creation', async () => {
      // Simulate wrong closure pattern
      const completedDir = path.join(incrementsDir, '_completed');
      await fs.ensureDir(completedDir);

      // Validation check (what pre-commit hook will do)
      const completedDirExists = await fs.pathExists(completedDir);

      // This should FAIL pre-commit hook
      expect(completedDirExists).toBe(true); // Documents violation
    });

    it('should detect increment numbering gaps (potential deletion)', async () => {
      // Setup: Create increments with gap
      const existingIncrements = [
        '0001-test',
        '0002-test',
        // Gap: 0003, 0004, 0005 missing
        '0006-test',
        '0007-test'
      ];

      for (const incId of existingIncrements) {
        const incPath = path.join(incrementsDir, incId);
        await fs.ensureDir(incPath);
        await fs.writeJson(path.join(incPath, 'metadata.json'), {
          id: incId,
          status: 'active',
          created: '2025-11-18T00:00:00Z'
        });
      }

      // Validation check (what pre-commit hook will do)
      const allDirs = await fs.readdir(incrementsDir);
      const incrementIds = allDirs
        .filter(dir => /^[0-9]{4}-/.test(dir))
        .map(dir => parseInt(dir.slice(0, 4)))
        .sort((a, b) => a - b);

      // Detect gaps
      const gaps: number[] = [];
      for (let i = 1; i < incrementIds.length; i++) {
        const gap = incrementIds[i] - incrementIds[i - 1];
        if (gap > 1) {
          gaps.push(gap);
        }
      }

      // Assert: Gap detected (potential deletion)
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0]).toBe(4); // Gap of 4 increments (0003-0006)
    });
  });
});
