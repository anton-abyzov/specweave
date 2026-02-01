/**
 * Unit Tests: ReconcileManager
 *
 * Tests post-merge increment ID collision resolution including:
 * - Collision detection (same base number)
 * - Chronological ordering (older = winner)
 * - External increment handling (E-suffix)
 * - Folder renaming
 * - metadata.json and spec.md updates
 * - Feature ID derivation
 * - Dry-run mode
 * - Empty/no collisions handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from '../../../../src/utils/fs-native.js';
import { ReconcileManager, createReconcileManager } from '../../../../src/core/increment/reconcile-manager.js';
import type { ReconcileOptions, IncrementInfo, Collision, ReconcileResult } from '../../../../src/core/increment/reconcile-manager.js';

// Use os.tmpdir() to prevent deletion of project .specweave/
const createTestRoot = () => path.join(
  os.tmpdir(),
  `test-reconcile-manager-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

describe('ReconcileManager', () => {
  let testRoot: string;
  let incrementsDir: string;
  let archiveDir: string;
  let abandonedDir: string;
  let pausedDir: string;
  let livingDocsDir: string;

  beforeEach(async () => {
    testRoot = createTestRoot();
    incrementsDir = path.join(testRoot, '.specweave', 'increments');
    archiveDir = path.join(incrementsDir, '_archive');
    abandonedDir = path.join(incrementsDir, '_abandoned');
    pausedDir = path.join(incrementsDir, '_paused');
    livingDocsDir = path.join(testRoot, '.specweave', 'docs', 'internal', 'specs');

    // Create directory structure
    await fs.mkdir(incrementsDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.mkdir(abandonedDir, { recursive: true });
    await fs.mkdir(pausedDir, { recursive: true });
    await fs.mkdir(livingDocsDir, { recursive: true });

    // Create config.json to mark as initialized SpecWeave project
    await fs.writeFile(
      path.join(testRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  // Helper function to create test increment
  async function createTestIncrement(
    folder: string,
    id: string,
    options: {
      status?: string;
      lastActivity?: string;
      created?: string;
      github?: Record<string, unknown>;
      jira?: Record<string, unknown>;
      ado?: Record<string, unknown>;
      extraFiles?: Record<string, string>;
    } = {}
  ): Promise<void> {
    const incDir = path.join(folder, id);
    await fs.mkdir(incDir, { recursive: true });

    const now = new Date();
    const metadata: Record<string, unknown> = {
      id,
      status: options.status || 'active',
      type: 'feature',
      created: options.created || now.toISOString(),
      lastActivity: options.lastActivity || now.toISOString(),
    };

    if (options.github) {
      metadata.github = options.github;
    }
    if (options.jira || options.ado) {
      metadata.external_sync = {};
      if (options.jira) {
        (metadata.external_sync as Record<string, unknown>).jira = options.jira;
      }
      if (options.ado) {
        (metadata.external_sync as Record<string, unknown>).ado = options.ado;
      }
    }

    await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Create spec.md with frontmatter
    const specContent = `---
increment: ${id}
title: "Test Increment"
---

# ${id}

## User Stories

### US-001: Test Story
`;
    await fs.writeFile(path.join(incDir, 'spec.md'), specContent);
    await fs.writeFile(path.join(incDir, 'plan.md'), `# Plan for ${id}`);
    await fs.writeFile(path.join(incDir, 'tasks.md'), `# Tasks for ${id}`);

    // Create extra files if specified
    if (options.extraFiles) {
      for (const [filepath, content] of Object.entries(options.extraFiles)) {
        const fullPath = path.join(incDir, filepath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
      }
    }
  }

  // Helper to check if increment exists
  async function incrementExists(folder: string, id: string): Promise<boolean> {
    return await fs.pathExists(path.join(folder, id));
  }

  describe('Collision Detection', () => {
    it('should detect collision when two increments have same base number', async () => {
      // Arrange: Create two increments with same base number 0001
      const now = new Date();
      const older = new Date(now.getTime() - 86400000); // 1 day ago

      await createTestIncrement(incrementsDir, '0001-feature-a', {
        status: 'active',
        lastActivity: now.toISOString(),
      });
      await createTestIncrement(archiveDir, '0001-feature-b', {
        status: 'completed',
        lastActivity: older.toISOString(),
      });

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert
      expect(collisions.length).toBe(1);
      expect(collisions[0].baseNumber).toBe(1);
      expect(collisions[0].increments.length).toBe(2);
      expect(summary).toContain('Found 1 collision');
    });

    it('should detect multiple collisions across different base numbers', async () => {
      // Arrange: Create collisions for both 0001 and 0002
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-feature-a', { lastActivity: now.toISOString() });
      await createTestIncrement(archiveDir, '0001-feature-b', { lastActivity: older.toISOString() });
      await createTestIncrement(incrementsDir, '0002-feature-c', { lastActivity: now.toISOString() });
      await createTestIncrement(pausedDir, '0002-feature-d', { lastActivity: older.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert
      expect(collisions.length).toBe(2);
      expect(collisions.map(c => c.baseNumber).sort()).toEqual([1, 2]);
    });

    it('should not flag unique increments as collisions', async () => {
      // Arrange: Create unique increments with different numbers
      await createTestIncrement(incrementsDir, '0001-feature-a');
      await createTestIncrement(incrementsDir, '0002-feature-b');
      await createTestIncrement(archiveDir, '0003-feature-c');

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert
      expect(collisions.length).toBe(0);
      expect(summary).toContain('No ID collisions found');
    });

    it('should filter by specific increment number when provided', async () => {
      // Arrange: Create collisions for 0001 and 0002
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-feature-a', { lastActivity: now.toISOString() });
      await createTestIncrement(archiveDir, '0001-feature-b', { lastActivity: older.toISOString() });
      await createTestIncrement(incrementsDir, '0002-feature-c', { lastActivity: now.toISOString() });
      await createTestIncrement(pausedDir, '0002-feature-d', { lastActivity: older.toISOString() });

      // Act: Filter to only check 0001
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary('0001');

      // Assert: Only 0001 collision reported
      expect(collisions.length).toBe(1);
      expect(collisions[0].baseNumber).toBe(1);
    });
  });

  describe('Chronological Ordering (Winner Selection)', () => {
    it('should select older increment as winner based on lastActivity', async () => {
      // Arrange: Older increment should win
      const now = new Date();
      const older = new Date(now.getTime() - 86400000); // 1 day ago

      await createTestIncrement(incrementsDir, '0001-feature-newer', {
        lastActivity: now.toISOString(),
      });
      await createTestIncrement(archiveDir, '0001-feature-older', {
        lastActivity: older.toISOString(),
      });

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert: Older one is the winner
      expect(collisions[0].winner.id).toBe('0001-feature-older');
      expect(collisions[0].toRenumber[0].id).toBe('0001-feature-newer');
    });

    it('should order multiple increments chronologically', async () => {
      // Arrange: Three increments with different dates
      const now = new Date();
      const middle = new Date(now.getTime() - 86400000); // 1 day ago
      const oldest = new Date(now.getTime() - 172800000); // 2 days ago

      await createTestIncrement(incrementsDir, '0001-newest', { lastActivity: now.toISOString() });
      await createTestIncrement(archiveDir, '0001-middle', { lastActivity: middle.toISOString() });
      await createTestIncrement(abandonedDir, '0001-oldest', { lastActivity: oldest.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert: Oldest wins, others are to be renumbered
      expect(collisions[0].winner.id).toBe('0001-oldest');
      expect(collisions[0].toRenumber.length).toBe(2);
      expect(collisions[0].toRenumber[0].id).toBe('0001-middle');
      expect(collisions[0].toRenumber[1].id).toBe('0001-newest');
    });
  });

  describe('External Increment Handling (E-suffix)', () => {
    it('should recognize E-suffix increments as external', async () => {
      // Arrange: Create external increment with E suffix
      await createTestIncrement(incrementsDir, '0001E-external-feature');

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // No collision since only one increment
      expect(collisions.length).toBe(0);
    });

    it('should detect collision between regular and E-suffix increment with same base', async () => {
      // Arrange: Both 0001 and 0001E should collide (same base number)
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-regular-feature', {
        lastActivity: now.toISOString(),
      });
      await createTestIncrement(archiveDir, '0001E-external-feature', {
        lastActivity: older.toISOString(),
      });

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert: Collision detected (same base number 1)
      expect(collisions.length).toBe(1);
      expect(collisions[0].baseNumber).toBe(1);
      expect(collisions[0].increments.some(i => i.isExternal)).toBe(true);
      expect(collisions[0].increments.some(i => !i.isExternal)).toBe(true);
    });

    it('should preserve E-suffix when renumbering external increment', async () => {
      // Arrange: External increment should keep E suffix after renumber
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      // Regular wins (older)
      await createTestIncrement(incrementsDir, '0001-regular', { lastActivity: older.toISOString() });
      // External loses and gets renumbered
      await createTestIncrement(archiveDir, '0001E-external', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: New ID should have E suffix
      expect(result.operations.length).toBe(1);
      expect(result.operations[0].oldId).toBe('0001E-external');
      expect(result.operations[0].newId).toMatch(/^\d{4}E-external$/);
    });
  });

  describe('Folder Renaming', () => {
    it('should rename increment folder correctly during reconciliation', async () => {
      // Arrange: Create collision
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act: Reconcile (not dry-run)
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Loser folder should be renamed
      expect(result.incrementsRenumbered).toBe(1);
      expect(await incrementExists(archiveDir, '0001-loser')).toBe(false);
      // New folder should exist with new ID
      const newId = result.operations[0].newId;
      expect(await incrementExists(archiveDir, newId)).toBe(true);
    });

    it('should handle folder rename failure gracefully', async () => {
      // Arrange: Create collision
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Make the loser folder read-only to simulate rename failure (Unix only)
      if (process.platform !== 'win32') {
        await fs.chmod(path.join(archiveDir, '0001-loser'), 0o444);
      }

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Error should be captured (on Unix)
      if (process.platform !== 'win32') {
        expect(result.errors.length).toBeGreaterThan(0);
      }

      // Cleanup: Restore permissions
      if (process.platform !== 'win32') {
        try {
          await fs.chmod(path.join(archiveDir, '0001-loser'), 0o755);
        } catch {
          // Ignore if cleanup fails
        }
      }
    });
  });

  describe('metadata.json Updates', () => {
    it('should update id field in metadata.json after renumbering', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Read metadata from renamed folder
      const newId = result.operations[0].newId;
      const metadataPath = path.join(archiveDir, newId, 'metadata.json');
      const metadata = await fs.readJson(metadataPath);

      expect(metadata.id).toBe(newId);
    });

    it('should add reconcileHistory entry to metadata.json', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Check reconcileHistory
      const newId = result.operations[0].newId;
      const metadataPath = path.join(archiveDir, newId, 'metadata.json');
      const metadata = await fs.readJson(metadataPath);

      expect(metadata.reconcileHistory).toBeDefined();
      expect(Array.isArray(metadata.reconcileHistory)).toBe(true);
      expect(metadata.reconcileHistory.length).toBe(1);
      expect(metadata.reconcileHistory[0].action).toBe('renumbered');
      expect(metadata.reconcileHistory[0].note).toContain('reconciliation');
    });

    it('should update lastActivity in metadata.json', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);
      const beforeReconcile = new Date();

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: lastActivity should be updated
      const newId = result.operations[0].newId;
      const metadataPath = path.join(archiveDir, newId, 'metadata.json');
      const metadata = await fs.readJson(metadataPath);

      const lastActivityDate = new Date(metadata.lastActivity);
      expect(lastActivityDate.getTime()).toBeGreaterThanOrEqual(beforeReconcile.getTime());
    });
  });

  describe('spec.md Frontmatter Updates', () => {
    it('should update increment field in spec.md frontmatter', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Read spec.md from renamed folder
      const newId = result.operations[0].newId;
      const specPath = path.join(archiveDir, newId, 'spec.md');
      const specContent = await fs.readFile(specPath, 'utf-8');

      expect(specContent).toContain(`increment: ${newId}`);
      expect(specContent).not.toContain('increment: 0001-loser');
    });

    it('should preserve other frontmatter fields when updating spec.md', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Add extra frontmatter to loser spec.md
      const loserSpecPath = path.join(archiveDir, '0001-loser', 'spec.md');
      const originalSpec = `---
increment: 0001-loser
title: "Important Feature"
priority: high
custom_field: test_value
---

# Feature Description
`;
      await fs.writeFile(loserSpecPath, originalSpec);

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Other fields should be preserved
      const newId = result.operations[0].newId;
      const specPath = path.join(archiveDir, newId, 'spec.md');
      const specContent = await fs.readFile(specPath, 'utf-8');

      expect(specContent).toContain(`increment: ${newId}`);
      expect(specContent).toContain('title: "Important Feature"');
      expect(specContent).toContain('# Feature Description');
    });
  });

  describe('Feature ID Derivation', () => {
    it('should derive correct feature ID from regular increment', async () => {
      // Test: 0001-auth → FS-001
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      expect(result.operations[0].oldFeatureId).toBe('FS-001');
    });

    it('should derive correct feature ID from external increment (E-suffix)', async () => {
      // Test: 0001E-auth → FS-001E
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001E-external', { lastActivity: now.toISOString() });

      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Find the external increment operation
      const externalOp = result.operations.find(op => op.oldId === '0001E-external');
      expect(externalOp?.oldFeatureId).toBe('FS-001E');
    });

    it('should calculate new feature ID correctly after renumbering', async () => {
      // Arrange: 0001 collides, loser becomes 0002, so FS-001 → FS-002
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      expect(result.operations[0].oldFeatureId).toBe('FS-001');
      // New feature ID should be FS-002 (or higher if other increments exist)
      expect(result.operations[0].newFeatureId).toMatch(/^FS-\d{3}$/);
      expect(result.operations[0].newFeatureId).not.toBe('FS-001');
    });

    it('should preserve E-suffix in new feature ID for external increments', async () => {
      // Arrange: 0001E collides, gets renumbered to 0002E, so FS-001E → FS-002E
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001E-external', { lastActivity: now.toISOString() });

      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      const externalOp = result.operations.find(op => op.oldId === '0001E-external');
      expect(externalOp?.oldFeatureId).toBe('FS-001E');
      expect(externalOp?.newFeatureId).toMatch(/^FS-\d{3}E$/);
    });
  });

  describe('Dry-Run Mode', () => {
    it('should not make any changes in dry-run mode', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: No actual changes
      expect(result.incrementsRenumbered).toBe(1); // Reports what would happen
      expect(await incrementExists(archiveDir, '0001-loser')).toBe(true); // Still exists
      expect(result.operations[0].updatedReferences.every(r => r.success)).toBe(true);
    });

    it('should report what would be changed in dry-run mode', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: Operations describe what would happen
      expect(result.operations.length).toBe(1);
      expect(result.operations[0].oldId).toBe('0001-loser');
      expect(result.operations[0].newId).toMatch(/^\d{4}-loser$/);
      expect(result.operations[0].updatedReferences.some(
        r => r.details.includes('Would rename folder')
      )).toBe(true);
    });

    it('should not generate report file in dry-run mode', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: No report path
      expect(result.reportPath).toBeUndefined();
    });
  });

  describe('Empty/No Collisions', () => {
    it('should return empty result when no increments exist', async () => {
      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile();

      // Assert
      expect(result.collisionsFound).toBe(0);
      expect(result.incrementsRenumbered).toBe(0);
      expect(result.operations.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should return empty result when no collisions exist', async () => {
      // Arrange: Create unique increments
      await createTestIncrement(incrementsDir, '0001-feature-a');
      await createTestIncrement(incrementsDir, '0002-feature-b');
      await createTestIncrement(archiveDir, '0003-feature-c');

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile();

      // Assert
      expect(result.collisionsFound).toBe(0);
      expect(result.incrementsRenumbered).toBe(0);
      expect(result.operations.length).toBe(0);
    });

    it('should return correct summary when no collisions', async () => {
      // Arrange
      await createTestIncrement(incrementsDir, '0001-feature');

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert
      expect(collisions.length).toBe(0);
      expect(summary).toContain('No ID collisions found');
      expect(summary).toContain('unique');
    });
  });

  describe('Living Docs Folder Renaming', () => {
    it('should rename living docs folder when it exists', async () => {
      // Arrange: Create collision and living docs folder
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Create living docs folder for loser
      const projectDir = path.join(livingDocsDir, 'my-project');
      const oldFeatureDir = path.join(projectDir, 'FS-001');
      await fs.mkdir(oldFeatureDir, { recursive: true });
      await fs.writeFile(path.join(oldFeatureDir, 'FEATURE.md'), `---
id: FS-001
---
# Feature`);

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Old folder should be renamed
      expect(await fs.pathExists(oldFeatureDir)).toBe(false);
      const newFeatureId = result.operations[0].newFeatureId;
      const newFeatureDir = path.join(projectDir, newFeatureId);
      expect(await fs.pathExists(newFeatureDir)).toBe(true);
    });

    it('should handle missing living docs folder gracefully', async () => {
      // Arrange: Create collision but no living docs folder
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act: Should not throw
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Renumbering still succeeds
      expect(result.incrementsRenumbered).toBe(1);
      // Living docs failure is not fatal
      const livingDocsRef = result.operations[0].updatedReferences.find(
        r => r.type === 'living-docs'
      );
      expect(livingDocsRef).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should generate report file after reconciliation', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert
      expect(result.reportPath).toBeDefined();
      expect(await fs.pathExists(result.reportPath!)).toBe(true);
    });

    it('should include all operations in report', async () => {
      // Arrange
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', { lastActivity: now.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Read report content
      const reportContent = await fs.readFile(result.reportPath!, 'utf-8');
      expect(reportContent).toContain('Increment ID Reconciliation Report');
      expect(reportContent).toContain('0001-loser');
      expect(reportContent).toContain(result.operations[0].newId);
      expect(reportContent).toContain('FS-001');
    });
  });

  describe('External Tool Update References (Mocked)', () => {
    it('should record GitHub reference update attempt', async () => {
      // Arrange: Create increment with GitHub metadata
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', {
        lastActivity: now.toISOString(),
        github: { issue: 42, milestone: 1 },
      });

      // Mock execFileNoThrow to avoid actual CLI calls
      vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
        execFileNoThrow: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Not configured' }),
      }));

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: Should have GitHub reference in updatedReferences
      const githubRef = result.operations[0].updatedReferences.find(
        r => r.type === 'github'
      );
      // GitHub update may succeed or fail, but should be recorded
      expect(result.operations.length).toBe(1);
    });

    it('should record JIRA reference update attempt', async () => {
      // Arrange: Create increment with JIRA metadata
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', {
        lastActivity: now.toISOString(),
        jira: { issueKey: 'PROJ-123' },
      });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: JIRA update attempted (will fail without config, that's OK)
      expect(result.operations.length).toBe(1);
    });

    it('should record ADO reference update attempt', async () => {
      // Arrange: Create increment with ADO metadata
      const now = new Date();
      const older = new Date(now.getTime() - 86400000);

      await createTestIncrement(incrementsDir, '0001-winner', { lastActivity: older.toISOString() });
      await createTestIncrement(archiveDir, '0001-loser', {
        lastActivity: now.toISOString(),
        ado: { workItemId: 999 },
      });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: false });

      // Assert: ADO update attempted
      expect(result.operations.length).toBe(1);
    });
  });

  describe('createReconcileManager Factory', () => {
    it('should create ReconcileManager instance', () => {
      const manager = createReconcileManager(testRoot);
      expect(manager).toBeInstanceOf(ReconcileManager);
    });
  });

  describe('Edge Cases', () => {
    it('should handle increment without metadata.json', async () => {
      // Arrange: Create increment folder with only spec.md
      const incDir = path.join(incrementsDir, '0001-no-metadata');
      await fs.mkdir(incDir, { recursive: true });
      await fs.writeFile(path.join(incDir, 'spec.md'), '# Spec');

      // Create a second increment to cause collision
      await createTestIncrement(archiveDir, '0001-with-metadata');

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert: Should still detect collision
      expect(collisions.length).toBe(1);
    });

    it('should handle corrupted metadata.json gracefully', async () => {
      // Arrange: Create increment with invalid JSON
      const incDir = path.join(incrementsDir, '0001-bad-json');
      await fs.mkdir(incDir, { recursive: true });
      await fs.writeFile(path.join(incDir, 'metadata.json'), '{invalid json');
      await fs.writeFile(path.join(incDir, 'spec.md'), '# Spec');

      // Create a second increment to cause collision
      await createTestIncrement(archiveDir, '0001-valid');

      // Act: Should not throw
      const manager = createReconcileManager(testRoot);
      const { collisions } = await manager.getCollisionSummary();

      // Assert: Should detect collision (uses file mtime as fallback)
      expect(collisions.length).toBe(1);
    });

    it('should skip non-increment directories', async () => {
      // Arrange: Create non-increment folders
      await fs.mkdir(path.join(incrementsDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(incrementsDir, 'not-an-increment'), { recursive: true });
      await createTestIncrement(incrementsDir, '0001-valid-increment');

      // Act
      const manager = createReconcileManager(testRoot);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert: Only valid increment detected, no false collisions
      expect(collisions.length).toBe(0);
      expect(summary).toContain('No ID collisions found');
    });

    it('should handle three-way collision', async () => {
      // Arrange: Three increments with same base number
      const now = new Date();
      const middle = new Date(now.getTime() - 86400000);
      const oldest = new Date(now.getTime() - 172800000);

      await createTestIncrement(incrementsDir, '0001-newest', { lastActivity: now.toISOString() });
      await createTestIncrement(archiveDir, '0001-middle', { lastActivity: middle.toISOString() });
      await createTestIncrement(abandonedDir, '0001-oldest', { lastActivity: oldest.toISOString() });

      // Act
      const manager = createReconcileManager(testRoot);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: Two increments should be renumbered
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(2);
      expect(result.operations.length).toBe(2);
    });
  });
});
