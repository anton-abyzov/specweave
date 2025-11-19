/**
 * Integration Tests for Increment Status Synchronization
 *
 * Tasks: T-013, T-014, T-015
 * Increment: 0043-spec-md-desync-fix
 * Test Mode: Integration (real file system, real MetadataManager)
 * Coverage Target: 85%
 *
 * User Stories: US-001, US-002, US-003
 * Acceptance Criteria: AC-US1-01, AC-US1-02, AC-US1-03, AC-US2-03, AC-US3-01
 *
 * Purpose: Verify that spec.md and metadata.json stay in sync throughout
 * the increment lifecycle (create → pause → resume → close).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import matter from 'gray-matter';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import { findProjectRoot } from '../../test-utils/project-root.js';

// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);

describe('Increment Status Sync - Integration Tests', () => {
  let testRoot: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `status-sync-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Change to test directory
    process.chdir(testRoot);

    // Create .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'logs'));
  });

  afterEach(async () => {
    // Restore original cwd
    // ✅ SAFE: projectRoot is determined from test file location
    process.chdir(projectRoot);

    // Cleanup test directory
    await fs.remove(testRoot);
  });

  /**
   * Helper: Create a test increment with metadata.json and spec.md
   */
  async function createTestIncrement(
    incrementId: string,
    status: IncrementStatus = IncrementStatus.ACTIVE
  ): Promise<void> {
    const incrementDir = path.join(testRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create metadata.json
    const metadata = {
      id: incrementId,
      status,
      type: 'feature' as const,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata);

    // Create spec.md with YAML frontmatter
    const specContent = `---
increment: ${incrementId}
title: Test Increment
priority: P1
status: ${status}
type: feature
created: 2025-01-01
---

# Test Increment

Test content.
`;
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');

    // Create tasks.md
    const tasksContent = `---
increment: ${incrementId}
total_tasks: 5
completed_tasks: 5
---

# Tasks

All tasks complete (for testing purposes).
`;
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent, 'utf-8');
  }

  /**
   * Helper: Read spec.md frontmatter status
   */
  async function readSpecStatus(incrementId: string): Promise<string | null> {
    const specPath = path.join(testRoot, '.specweave', 'increments', incrementId, 'spec.md');
    if (!(await fs.pathExists(specPath))) {
      return null;
    }
    const content = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(content);
    return parsed.data.status || null;
  }

  /**
   * T-013: Test Status Line Hook Reads Updated spec.md
   */
  describe('T-013: Status Line Hook Reads Updated spec.md', () => {
    it('testStatusLineHookReadsUpdatedSpec - should read completed status from spec.md after closure', async () => {
      // GIVEN an increment with status="active"
      const incrementId = '0001-test-increment';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // Verify initial state
      let specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('active');

      // WHEN increment is closed via MetadataManager.updateStatus()
      MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN spec.md should be updated to "completed"
      specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('completed');

      // AND metadata.json should also be "completed"
      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.COMPLETED);
    });

    it('testStatusLineExcludesCompletedIncrements - should not cache completed increments', async () => {
      // GIVEN two active increments
      await createTestIncrement('0001-first', IncrementStatus.ACTIVE);
      await createTestIncrement('0002-second', IncrementStatus.ACTIVE);

      // WHEN first increment is completed
      MetadataManager.updateStatus('0001-first', IncrementStatus.COMPLETED);

      // THEN only second increment should be considered active
      const firstSpecStatus = await readSpecStatus('0001-first');
      const secondSpecStatus = await readSpecStatus('0002-second');

      expect(firstSpecStatus).toBe('completed');
      expect(secondSpecStatus).toBe('active');

      // Verify metadata matches
      expect(MetadataManager.read('0001-first').status).toBe(IncrementStatus.COMPLETED);
      expect(MetadataManager.read('0002-second').status).toBe(IncrementStatus.ACTIVE);
    });

    it('testStatusLineShowsNextActiveIncrement - should show correct active increment after closure', async () => {
      // GIVEN multiple increments: 0038 (active), 0042 (active)
      await createTestIncrement('0038-old', IncrementStatus.ACTIVE);
      await createTestIncrement('0042-current', IncrementStatus.ACTIVE);

      // WHEN 0038 is completed
      MetadataManager.updateStatus('0038-old', IncrementStatus.COMPLETED);

      // THEN 0038 spec.md should show "completed"
      const spec0038Status = await readSpecStatus('0038-old');
      expect(spec0038Status).toBe('completed');

      // AND 0042 spec.md should still show "active"
      const spec0042Status = await readSpecStatus('0042-current');
      expect(spec0042Status).toBe('active');

      // This simulates the status line hook reading spec.md
      // The hook would now correctly show "0042-current" as active
    });
  });

  /**
   * T-014: Test /specweave:done Updates spec.md
   */
  describe('T-014: /specweave:done Command Updates spec.md', () => {
    it('testDoneCommandUpdatesSpec - should update spec.md when closing increment', async () => {
      // GIVEN an active increment with all tasks completed
      const incrementId = '0001-test';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // Verify initial state
      let specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('active');

      // WHEN /specweave:done is executed (simulated via MetadataManager.updateStatus)
      // In real usage, /specweave:done command calls MetadataManager.updateStatus
      MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN spec.md should be updated to "completed"
      specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('completed');
    });

    it('testDoneCommandUpdatesBothFiles - should update both metadata.json and spec.md', async () => {
      // GIVEN an active increment
      const incrementId = '0002-test';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // WHEN increment is closed
      MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN metadata.json should be updated
      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.COMPLETED);

      // AND spec.md should also be updated
      const specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('completed');

      // Verify both files are in sync
      expect(metadata.status.toLowerCase()).toBe(specStatus);
    });

    it('testDoneCommandUpdatesStatusLine - should update status line to show next increment', async () => {
      // GIVEN two active increments
      await createTestIncrement('0001-first', IncrementStatus.ACTIVE);
      await createTestIncrement('0002-second', IncrementStatus.ACTIVE);

      // WHEN first increment is closed
      MetadataManager.updateStatus('0001-first', IncrementStatus.COMPLETED);

      // THEN first increment should be completed in both files
      expect(MetadataManager.read('0001-first').status).toBe(IncrementStatus.COMPLETED);
      expect(await readSpecStatus('0001-first')).toBe('completed');

      // AND second increment should still be active
      expect(MetadataManager.read('0002-second').status).toBe(IncrementStatus.ACTIVE);
      expect(await readSpecStatus('0002-second')).toBe('active');

      // Status line would now show "0002-second" as the active increment
    });
  });

  /**
   * T-015: Test /specweave:pause and /specweave:resume Update spec.md
   */
  describe('T-015: /pause and /resume Commands Update spec.md', () => {
    it('testPauseCommandUpdatesSpec - should update spec.md to paused', async () => {
      // GIVEN an active increment
      const incrementId = '0005-pause-test';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // Verify initial state
      let specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('active');

      // WHEN /specweave:pause is executed
      MetadataManager.updateStatus(incrementId, IncrementStatus.PAUSED, 'Waiting for dependencies');

      // THEN spec.md should be updated to "paused"
      specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('paused');

      // AND metadata.json should also be "paused"
      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PAUSED);
    });

    it('testResumeCommandUpdatesSpec - should update spec.md back to active', async () => {
      // GIVEN a paused increment
      const incrementId = '0006-resume-test';
      await createTestIncrement(incrementId, IncrementStatus.PAUSED);

      // Verify initial state
      let specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('paused');

      // WHEN /specweave:resume is executed
      MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

      // THEN spec.md should be updated to "active"
      specStatus = await readSpecStatus(incrementId);
      expect(specStatus).toBe('active');

      // AND metadata.json should also be "active"
      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    it('testPauseResumeRoundTrip - should preserve state through pause/resume cycle', async () => {
      // GIVEN an active increment
      const incrementId = '0007-roundtrip-test';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // Verify initial state
      expect(await readSpecStatus(incrementId)).toBe('active');
      expect(MetadataManager.read(incrementId).status).toBe(IncrementStatus.ACTIVE);

      // WHEN paused
      MetadataManager.updateStatus(incrementId, IncrementStatus.PAUSED);

      // THEN both files should show "paused"
      expect(await readSpecStatus(incrementId)).toBe('paused');
      expect(MetadataManager.read(incrementId).status).toBe(IncrementStatus.PAUSED);

      // WHEN resumed
      MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

      // THEN both files should show "active" again
      expect(await readSpecStatus(incrementId)).toBe('active');
      expect(MetadataManager.read(incrementId).status).toBe(IncrementStatus.ACTIVE);

      // State successfully restored through round-trip
    });

    it('testAbandonCommandUpdatesSpec - should update spec.md to abandoned', async () => {
      // GIVEN an active increment
      const incrementId = '0008-abandon-test';
      await createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // WHEN /specweave:abandon is executed
      MetadataManager.updateStatus(incrementId, IncrementStatus.ABANDONED, 'Requirements changed');

      // THEN spec.md should be updated to "abandoned"
      expect(await readSpecStatus(incrementId)).toBe('abandoned');

      // AND metadata.json should also be "abandoned"
      expect(MetadataManager.read(incrementId).status).toBe(IncrementStatus.ABANDONED);
    });
  });

  /**
   * Additional Integration Tests: All Status Transitions
   */
  describe('All Status Transitions Update spec.md', () => {
    it('testAllTransitionsUpdateSpec - should update spec.md for every valid transition', async () => {
      // Test all valid transitions
      const transitions = [
        { from: IncrementStatus.PLANNING, to: IncrementStatus.ACTIVE, label: 'planning→active' },
        { from: IncrementStatus.ACTIVE, to: IncrementStatus.COMPLETED, label: 'active→completed' },
        { from: IncrementStatus.ACTIVE, to: IncrementStatus.PAUSED, label: 'active→paused' },
        { from: IncrementStatus.PAUSED, to: IncrementStatus.ACTIVE, label: 'paused→active (resume)' },
        { from: IncrementStatus.ACTIVE, to: IncrementStatus.ABANDONED, label: 'active→abandoned' },
      ];

      for (const transition of transitions) {
        // Create increment with starting status
        const incrementId = `test-${transition.from}-to-${transition.to}`;
        await createTestIncrement(incrementId, transition.from);

        // Verify starting state
        expect(await readSpecStatus(incrementId)).toBe(transition.from.toLowerCase());

        // Execute transition
        MetadataManager.updateStatus(incrementId, transition.to);

        // Verify ending state
        expect(await readSpecStatus(incrementId)).toBe(transition.to.toLowerCase());
        expect(MetadataManager.read(incrementId).status).toBe(transition.to);
      }
    });
  });
});
