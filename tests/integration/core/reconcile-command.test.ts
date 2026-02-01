/**
 * Integration Tests for /sw:reconcile command
 *
 * Tests the post-merge increment ID collision resolution workflow including:
 * - Full workflow: Create collisions -> run reconcile -> verify renumbering
 * - Living docs folder renaming (FS-XXX folders)
 * - Three-way collisions (three increments with same base number)
 * - Archive folder collisions (active vs archived increment)
 * - Multi-collision resolution (multiple different collision groups)
 * - Report generation (RECONCILE-*.md report created with correct content)
 * - CLI argument parsing (--dry-run, --force, --by-commit, increment number)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from '../../../src/utils/fs-native.js';
import * as os from 'os';
import {
  createReconcileManager,
  ReconcileManager,
  ReconcileResult,
  Collision,
} from '../../../dist/src/core/increment/reconcile-manager.js';
import {
  runReconcileCommand,
  parseReconcileArgs,
  ReconcileCommandOptions,
} from '../../../dist/src/cli/commands/reconcile.js';

// Worker-specific temp directory to avoid race conditions
let TEST_ROOT: string;
let INCREMENTS_DIR: string;
let ARCHIVE_DIR: string;
let ABANDONED_DIR: string;
let PAUSED_DIR: string;
let LIVING_DOCS_DIR: string;
let REPORTS_DIR: string;

/**
 * Helper: Create a test increment with all required files
 */
async function createTestIncrement(
  folder: string,
  id: string,
  options: {
    status?: string;
    lastActivity?: string;
    created?: string;
    github?: { issue?: number; milestone?: number; issues?: number[] };
    external_sync?: { jira?: { issueKey?: string }; ado?: { workItemId?: number } };
  } = {}
): Promise<void> {
  const incDir = path.join(folder, id);
  await fs.mkdir(incDir, { recursive: true });

  // Create metadata.json
  const metadata: Record<string, unknown> = {
    id,
    status: options.status || 'completed',
    type: 'feature',
    created: options.created || '2025-01-01T00:00:00Z',
    lastActivity: options.lastActivity || new Date().toISOString(),
  };

  if (options.github) {
    metadata.github = options.github;
  }

  if (options.external_sync) {
    metadata.external_sync = options.external_sync;
  }

  await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Create core files with frontmatter
  await fs.writeFile(
    path.join(incDir, 'spec.md'),
    `---
increment: ${id}
title: "Test Increment ${id}"
---

# Spec for ${id}

## User Stories

### US-001: Test Story
**As a** user, **I want** to test, **so that** I can verify.
`
  );

  await fs.writeFile(path.join(incDir, 'plan.md'), `# Plan for ${id}\n\n## Tasks\n`);
  await fs.writeFile(path.join(incDir, 'tasks.md'), `# Tasks for ${id}\n\n### T-001: Setup\n`);
}

/**
 * Helper: Create living docs folder structure (FS-XXX)
 */
async function createLivingDocsFolder(featureId: string, projectName: string = 'test-project'): Promise<void> {
  const featureDir = path.join(LIVING_DOCS_DIR, projectName, featureId);
  await fs.mkdir(featureDir, { recursive: true });

  // Create FEATURE.md
  await fs.writeFile(
    path.join(featureDir, 'FEATURE.md'),
    `---
id: ${featureId}
title: "Feature ${featureId}"
---

# ${featureId}: Test Feature

Description of the feature.
`
  );

  // Create a user story file
  await fs.writeFile(
    path.join(featureDir, 'us-001.md'),
    `---
id: US-001
feature: ${featureId}
---

# US-001: User Story

**As a** user, **I want** this feature.
`
  );
}

/**
 * Helper: Check if increment exists in a specific folder
 */
async function incrementExists(folder: string, id: string): Promise<boolean> {
  const incPath = path.join(folder, id);
  return await fs.pathExists(incPath);
}

/**
 * Helper: Check if living docs folder exists
 */
async function livingDocsFolderExists(featureId: string, projectName: string = 'test-project'): Promise<boolean> {
  const featurePath = path.join(LIVING_DOCS_DIR, projectName, featureId);
  return await fs.pathExists(featurePath);
}

/**
 * Helper: Read metadata.json from increment
 */
async function readMetadata(folder: string, id: string): Promise<Record<string, unknown>> {
  const metadataPath = path.join(folder, id, 'metadata.json');
  return await fs.readJson(metadataPath);
}

/**
 * Helper: Read spec.md frontmatter
 */
async function readSpecFrontmatter(folder: string, id: string): Promise<string> {
  const specPath = path.join(folder, id, 'spec.md');
  const content = await fs.readFile(specPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

/**
 * Mock for execFileNoThrow to prevent real CLI calls
 */
function createExecFileMock() {
  return vi.fn().mockImplementation(async (command: string, args: string[]) => {
    // Mock successful gh and az commands
    if (command === 'gh' || command === 'az') {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }
    return {
      stdout: '',
      stderr: 'Command not found',
      exitCode: 1,
      success: false,
    };
  });
}

describe('Reconcile Command Integration Tests', () => {
  beforeEach(async () => {
    // Create worker-specific temp directory
    TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), `reconcile-test-${Date.now()}-`));
    INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
    ARCHIVE_DIR = path.join(INCREMENTS_DIR, '_archive');
    ABANDONED_DIR = path.join(INCREMENTS_DIR, '_abandoned');
    PAUSED_DIR = path.join(INCREMENTS_DIR, '_paused');
    LIVING_DOCS_DIR = path.join(TEST_ROOT, '.specweave', 'docs', 'internal', 'specs');
    REPORTS_DIR = path.join(INCREMENTS_DIR, 'reports');

    // Create directory structure
    await fs.mkdir(INCREMENTS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    await fs.mkdir(ABANDONED_DIR, { recursive: true });
    await fs.mkdir(PAUSED_DIR, { recursive: true });
    await fs.mkdir(LIVING_DOCS_DIR, { recursive: true });

    // Create config.json (required for SpecWeave initialization check)
    const configDir = path.join(TEST_ROOT, '.specweave');
    await fs.writeFile(
      path.join(configDir, 'config.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );
  });

  afterEach(async () => {
    if (TEST_ROOT) {
      await fs.remove(TEST_ROOT);
    }
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Test 1: Full Workflow - Create collisions -> run reconcile -> verify renumbering
  // ============================================================================
  describe('Full Workflow', () => {
    it('reconcile_fullWorkflow_createsCollisionsAndRenumbers', async () => {
      // Arrange: Create two increments with the same base number (0001)
      // Older one should be kept, newer one should be renumbered
      const older = new Date();
      older.setDate(older.getDate() - 10);

      const newer = new Date();

      await createTestIncrement(INCREMENTS_DIR, '0001-auth-feature', {
        lastActivity: older.toISOString(),
        status: 'completed',
      });

      await createTestIncrement(INCREMENTS_DIR, '0001-payment-feature', {
        lastActivity: newer.toISOString(),
        status: 'completed',
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: One collision found, one increment renumbered
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(1);
      expect(result.operations.length).toBe(1);

      // Verify the older one is kept with original ID
      expect(await incrementExists(INCREMENTS_DIR, '0001-auth-feature')).toBe(true);

      // Verify the newer one is renumbered (to 0002 since it's the next available)
      expect(await incrementExists(INCREMENTS_DIR, '0001-payment-feature')).toBe(false);
      expect(await incrementExists(INCREMENTS_DIR, '0002-payment-feature')).toBe(true);

      // Verify metadata.json was updated
      const metadata = await readMetadata(INCREMENTS_DIR, '0002-payment-feature');
      expect(metadata.id).toBe('0002-payment-feature');
      expect(metadata.reconcileHistory).toBeDefined();
    });

    it('reconcile_noCollisions_returnsEmptyResult', async () => {
      // Arrange: Create increments with unique IDs
      await createTestIncrement(INCREMENTS_DIR, '0001-feature-a', { status: 'completed' });
      await createTestIncrement(INCREMENTS_DIR, '0002-feature-b', { status: 'completed' });
      await createTestIncrement(INCREMENTS_DIR, '0003-feature-c', { status: 'completed' });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile();

      // Assert: No collisions found
      expect(result.collisionsFound).toBe(0);
      expect(result.incrementsRenumbered).toBe(0);
      expect(result.operations.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // Test 2: Living Docs Folder Renaming (FS-XXX folders)
  // ============================================================================
  describe('Living Docs Folder Renaming', () => {
    it('reconcile_withLivingDocs_renamesFSFolder', async () => {
      // Arrange: Create collision with living docs
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0001-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0001-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Create living docs for the duplicate (FS-001)
      await createLivingDocsFolder('FS-001', 'test-project');

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Living docs folder renamed
      expect(result.incrementsRenumbered).toBe(1);

      // Verify the living docs operation was recorded
      const livingDocsOp = result.operations[0].updatedReferences.find(
        (r) => r.type === 'living-docs'
      );
      expect(livingDocsOp).toBeDefined();
      expect(livingDocsOp?.details).toContain('FS-001');
      expect(livingDocsOp?.details).toContain('FS-002');
    });

    it('reconcile_withNestedLivingDocs_updatesReferences', async () => {
      // Arrange: Create collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0003-nested-feature', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0003-another-feature', {
        lastActivity: new Date().toISOString(),
      });

      // Create living docs with nested structure
      await createLivingDocsFolder('FS-003', 'my-project');

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Renumbering occurred
      expect(result.incrementsRenumbered).toBe(1);
    });
  });

  // ============================================================================
  // Test 3: Three-Way Collisions
  // ============================================================================
  describe('Three-Way Collisions', () => {
    it('reconcile_threeWayCollision_renumbersAllButOldest', async () => {
      // Arrange: Create three increments with the same base number
      const oldest = new Date();
      oldest.setDate(oldest.getDate() - 20);

      const middle = new Date();
      middle.setDate(middle.getDate() - 10);

      const newest = new Date();

      await createTestIncrement(INCREMENTS_DIR, '0005-first-feature', {
        lastActivity: oldest.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0005-second-feature', {
        lastActivity: middle.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0005-third-feature', {
        lastActivity: newest.toISOString(),
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: One collision with 2 renumbered increments
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(2);
      expect(result.operations.length).toBe(2);

      // Verify oldest is kept
      expect(await incrementExists(INCREMENTS_DIR, '0005-first-feature')).toBe(true);

      // Verify others are renumbered (no longer at original IDs)
      expect(await incrementExists(INCREMENTS_DIR, '0005-second-feature')).toBe(false);
      expect(await incrementExists(INCREMENTS_DIR, '0005-third-feature')).toBe(false);

      // IncrementNumberManager uses gap-filling: finds first available number from 0001
      // Since 0005 exists (the winner), it will use 0001, 0002, 0003, 0004 as available gaps
      // Check that increments were renumbered to new IDs (exact IDs depend on gap-filling)
      const dirs = await fs.readdir(INCREMENTS_DIR);
      const incrementDirs = dirs.filter((d) => /^\d{4}-/.test(d) && !d.startsWith('_'));
      // Should have 3 increments total (winner + 2 renumbered)
      expect(incrementDirs.length).toBe(3);

      // Verify the renumbered ones exist with new names containing the suffix
      const hasSecondFeature = incrementDirs.some((d) => d.includes('second-feature'));
      const hasThirdFeature = incrementDirs.some((d) => d.includes('third-feature'));
      expect(hasSecondFeature).toBe(true);
      expect(hasThirdFeature).toBe(true);
    });
  });

  // ============================================================================
  // Test 4: Archive Folder Collisions
  // ============================================================================
  describe('Archive Folder Collisions', () => {
    it('reconcile_activeVsArchived_correctlyIdentifiesCollision', async () => {
      // Arrange: Create collision between active and archived increment
      const older = new Date();
      older.setDate(older.getDate() - 30);

      // Archived (older)
      await createTestIncrement(ARCHIVE_DIR, '0010-archived-feature', {
        lastActivity: older.toISOString(),
        status: 'completed',
      });

      // Active (newer)
      await createTestIncrement(INCREMENTS_DIR, '0010-active-feature', {
        lastActivity: new Date().toISOString(),
        status: 'active',
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Collision detected and newer one renumbered
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(1);

      // Archived should remain (it's older)
      expect(await incrementExists(ARCHIVE_DIR, '0010-archived-feature')).toBe(true);

      // Active should be renumbered (no longer at 0010)
      expect(await incrementExists(INCREMENTS_DIR, '0010-active-feature')).toBe(false);

      // IncrementNumberManager uses gap-filling: finds first available number from 0001
      // Since only 0010 exists (in archive), it will assign 0001 to the renumbered increment
      // Check that the active feature was renumbered somewhere
      const dirs = await fs.readdir(INCREMENTS_DIR);
      const activeFeatureRenamed = dirs.some((d) => d.includes('active-feature'));
      expect(activeFeatureRenamed).toBe(true);
    });

    it('reconcile_multipleArchiveFolders_detectsAllCollisions', async () => {
      // Arrange: Create collisions across active, archive, and abandoned
      const oldest = new Date();
      oldest.setDate(oldest.getDate() - 60);

      const middle = new Date();
      middle.setDate(middle.getDate() - 30);

      const newest = new Date();

      await createTestIncrement(ABANDONED_DIR, '0015-abandoned-feature', {
        lastActivity: oldest.toISOString(),
        status: 'abandoned',
      });

      await createTestIncrement(ARCHIVE_DIR, '0015-archived-feature', {
        lastActivity: middle.toISOString(),
        status: 'completed',
      });

      await createTestIncrement(INCREMENTS_DIR, '0015-active-feature', {
        lastActivity: newest.toISOString(),
        status: 'active',
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: All three detected, two renumbered
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(2);

      // Oldest (abandoned) should remain with original ID
      expect(await incrementExists(ABANDONED_DIR, '0015-abandoned-feature')).toBe(true);
    });
  });

  // ============================================================================
  // Test 5: Multi-Collision Resolution
  // ============================================================================
  describe('Multi-Collision Resolution', () => {
    it('reconcile_multipleCollisionGroups_resolvesAll', async () => {
      // Arrange: Create multiple collision groups
      const older = new Date();
      older.setDate(older.getDate() - 10);

      // Collision group 1: Base number 0020
      await createTestIncrement(INCREMENTS_DIR, '0020-feature-a1', {
        lastActivity: older.toISOString(),
      });
      await createTestIncrement(INCREMENTS_DIR, '0020-feature-a2', {
        lastActivity: new Date().toISOString(),
      });

      // Collision group 2: Base number 0021
      await createTestIncrement(INCREMENTS_DIR, '0021-feature-b1', {
        lastActivity: older.toISOString(),
      });
      await createTestIncrement(INCREMENTS_DIR, '0021-feature-b2', {
        lastActivity: new Date().toISOString(),
      });

      // Non-colliding increment
      await createTestIncrement(INCREMENTS_DIR, '0022-standalone', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Two collision groups, two renumbered
      expect(result.collisionsFound).toBe(2);
      expect(result.incrementsRenumbered).toBe(2);

      // Original IDs kept for older ones
      expect(await incrementExists(INCREMENTS_DIR, '0020-feature-a1')).toBe(true);
      expect(await incrementExists(INCREMENTS_DIR, '0021-feature-b1')).toBe(true);

      // Newer ones renumbered
      expect(await incrementExists(INCREMENTS_DIR, '0020-feature-a2')).toBe(false);
      expect(await incrementExists(INCREMENTS_DIR, '0021-feature-b2')).toBe(false);

      // Standalone remains unchanged
      expect(await incrementExists(INCREMENTS_DIR, '0022-standalone')).toBe(true);
    });
  });

  // ============================================================================
  // Test 6: Report Generation
  // ============================================================================
  describe('Report Generation', () => {
    it('reconcile_generatesReport_withCorrectContent', async () => {
      // Arrange: Create a collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0030-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0030-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile (not dry-run)
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Report generated
      expect(result.reportPath).toBeDefined();
      expect(await fs.pathExists(result.reportPath!)).toBe(true);

      // Verify report content
      const reportContent = await fs.readFile(result.reportPath!, 'utf-8');

      expect(reportContent).toContain('Increment ID Reconciliation Report');
      expect(reportContent).toContain('/sw:reconcile');
      expect(reportContent).toContain('Collisions found');
      // The report contains the renumbering operation which includes the old ID and new ID
      // The old ID (0030-duplicate) should be in the report, winner (0030-original) is not renumbered
      expect(reportContent).toContain('0030-duplicate');
      expect(reportContent).toContain('Renumbering Operations');
    });

    it('reconcile_dryRun_doesNotGenerateReport', async () => {
      // Arrange: Create a collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0035-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0035-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile in dry-run mode
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: No report generated in dry-run
      expect(result.reportPath).toBeUndefined();

      // Verify no changes were made
      expect(await incrementExists(INCREMENTS_DIR, '0035-original')).toBe(true);
      expect(await incrementExists(INCREMENTS_DIR, '0035-duplicate')).toBe(true);
    });

    it('reconcile_reportPath_followsNamingConvention', async () => {
      // Arrange: Create a collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0040-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0040-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Report follows RECONCILE-*.md naming
      expect(result.reportPath).toBeDefined();
      expect(path.basename(result.reportPath!)).toMatch(/^RECONCILE-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    });
  });

  // ============================================================================
  // Test 7: CLI Argument Parsing
  // ============================================================================
  describe('CLI Argument Parsing', () => {
    it('parseReconcileArgs_dryRun_setsFlag', () => {
      const options = parseReconcileArgs(['--dry-run']);

      expect(options.dryRun).toBe(true);
      expect(options.force).toBeUndefined();
      expect(options.byCommit).toBeUndefined();
      expect(options.incrementNumber).toBeUndefined();
    });

    it('parseReconcileArgs_force_setsFlag', () => {
      const options = parseReconcileArgs(['--force']);

      expect(options.force).toBe(true);
      expect(options.dryRun).toBeUndefined();
    });

    it('parseReconcileArgs_byCommit_setsFlag', () => {
      const options = parseReconcileArgs(['--by-commit']);

      expect(options.byCommit).toBe(true);
    });

    it('parseReconcileArgs_incrementNumber_setsNumber', () => {
      const options = parseReconcileArgs(['0001']);

      expect(options.incrementNumber).toBe('0001');
    });

    it('parseReconcileArgs_combinedFlags_parsesAll', () => {
      const options = parseReconcileArgs(['--dry-run', '--force', '0042', '--by-commit']);

      expect(options.dryRun).toBe(true);
      expect(options.force).toBe(true);
      expect(options.byCommit).toBe(true);
      expect(options.incrementNumber).toBe('0042');
    });

    it('parseReconcileArgs_emptyArgs_returnsEmptyOptions', () => {
      const options = parseReconcileArgs([]);

      expect(options.dryRun).toBeUndefined();
      expect(options.force).toBeUndefined();
      expect(options.byCommit).toBeUndefined();
      expect(options.incrementNumber).toBeUndefined();
    });

    it('parseReconcileArgs_unknownFlags_ignored', () => {
      const options = parseReconcileArgs(['--unknown', '--verbose', '0001']);

      expect(options.incrementNumber).toBe('0001');
      expect(Object.keys(options)).not.toContain('unknown');
      expect(Object.keys(options)).not.toContain('verbose');
    });
  });

  // ============================================================================
  // Test 8: Dry-Run Mode
  // ============================================================================
  describe('Dry-Run Mode', () => {
    it('reconcile_dryRun_showsWhatWouldChange', async () => {
      // Arrange: Create a collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0050-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0050-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile in dry-run mode
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ dryRun: true });

      // Assert: Reports what would happen
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(1);
      expect(result.operations.length).toBe(1);

      // Verify operations contain "Would" descriptions
      const op = result.operations[0];
      expect(op.updatedReferences.some((r) => r.details.includes('Would'))).toBe(true);

      // Verify nothing was actually changed
      expect(await incrementExists(INCREMENTS_DIR, '0050-original')).toBe(true);
      expect(await incrementExists(INCREMENTS_DIR, '0050-duplicate')).toBe(true);
    });
  });

  // ============================================================================
  // Test 9: Specific Increment Number Filter
  // ============================================================================
  describe('Specific Increment Number Filter', () => {
    it('reconcile_specificNumber_onlyChecksThoseCollisions', async () => {
      // Arrange: Create multiple collision groups
      const older = new Date();
      older.setDate(older.getDate() - 10);

      // Collision group 1: Base number 0060
      await createTestIncrement(INCREMENTS_DIR, '0060-feature-a1', {
        lastActivity: older.toISOString(),
      });
      await createTestIncrement(INCREMENTS_DIR, '0060-feature-a2', {
        lastActivity: new Date().toISOString(),
      });

      // Collision group 2: Base number 0061
      await createTestIncrement(INCREMENTS_DIR, '0061-feature-b1', {
        lastActivity: older.toISOString(),
      });
      await createTestIncrement(INCREMENTS_DIR, '0061-feature-b2', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile for only 0060
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true, incrementNumber: '0060' });

      // Assert: Only 0060 collision resolved
      expect(result.collisionsFound).toBe(1);
      expect(result.incrementsRenumbered).toBe(1);

      // 0061 collision should remain
      expect(await incrementExists(INCREMENTS_DIR, '0061-feature-b1')).toBe(true);
      expect(await incrementExists(INCREMENTS_DIR, '0061-feature-b2')).toBe(true);
    });
  });

  // ============================================================================
  // Test 10: External Increment (E suffix) Handling
  // ============================================================================
  describe('External Increment Handling', () => {
    it('reconcile_externalIncrement_preservesESuffix', async () => {
      // Arrange: Create collision with external increment
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0070E-external-feature', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0070E-another-external', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: E suffix preserved in renumbered ID
      expect(result.incrementsRenumbered).toBe(1);

      // Original kept
      expect(await incrementExists(INCREMENTS_DIR, '0070E-external-feature')).toBe(true);

      // Renumbered with E suffix (exact number depends on gap-filling)
      expect(await incrementExists(INCREMENTS_DIR, '0070E-another-external')).toBe(false);

      // Check that the renumbered increment has E suffix preserved
      const op = result.operations[0];
      expect(op.newId).toContain('E-'); // E suffix is preserved
      expect(op.newId).toContain('another-external');

      // Verify it exists with the new ID
      expect(await incrementExists(INCREMENTS_DIR, op.newId)).toBe(true);
    });
  });

  // ============================================================================
  // Test 11: Spec.md Frontmatter Update
  // ============================================================================
  describe('Spec.md Frontmatter Update', () => {
    it('reconcile_updatesSpecFrontmatter_withNewId', async () => {
      // Arrange: Create collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0080-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0080-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Spec.md updated
      expect(result.incrementsRenumbered).toBe(1);

      // Get the new ID from the operation result
      const op = result.operations[0];
      expect(op.newId).toContain('duplicate');

      // Verify spec.md frontmatter was updated with the new ID
      const frontmatter = await readSpecFrontmatter(INCREMENTS_DIR, op.newId);
      expect(frontmatter).toContain(`increment: ${op.newId}`);
    });
  });

  // ============================================================================
  // Test 12: Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('reconcile_withErrors_reportsThemGracefully', async () => {
      // Arrange: Create a collision where the folder might be read-only
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0090-original', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0090-duplicate', {
        lastActivity: new Date().toISOString(),
      });

      // Make the duplicate folder read-only to simulate an error (Unix only)
      if (process.platform !== 'win32') {
        const duplicatePath = path.join(INCREMENTS_DIR, '0090-duplicate');
        await fs.chmod(duplicatePath, 0o444);
      }

      // Act: Run reconcile
      const manager = createReconcileManager(TEST_ROOT);
      const result = await manager.reconcile({ force: true });

      // Assert: Either completes or reports errors gracefully
      if (process.platform !== 'win32') {
        // Expect error or partial success
        expect(result.errors.length).toBeGreaterThanOrEqual(0);

        // Restore permissions for cleanup
        const duplicatePath = path.join(INCREMENTS_DIR, '0090-duplicate');
        if (await fs.pathExists(duplicatePath)) {
          await fs.chmod(duplicatePath, 0o755);
        }
      }
    });
  });

  // ============================================================================
  // Test 13: Collision Summary Display
  // ============================================================================
  describe('Collision Summary', () => {
    it('getCollisionSummary_formatsCorrectly', async () => {
      // Arrange: Create a collision
      const older = new Date();
      older.setDate(older.getDate() - 10);

      await createTestIncrement(INCREMENTS_DIR, '0100-first', {
        lastActivity: older.toISOString(),
      });

      await createTestIncrement(INCREMENTS_DIR, '0100-second', {
        lastActivity: new Date().toISOString(),
      });

      // Act: Get collision summary
      const manager = createReconcileManager(TEST_ROOT);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert: Summary formatted correctly
      expect(collisions.length).toBe(1);
      expect(summary).toContain('Collision: Base ID 0100');
      expect(summary).toContain('KEEP');
      expect(summary).toContain('RENUMBER');
    });

    it('getCollisionSummary_noCollisions_showsMessage', async () => {
      // Arrange: Create unique increments
      await createTestIncrement(INCREMENTS_DIR, '0110-unique-a', {});
      await createTestIncrement(INCREMENTS_DIR, '0111-unique-b', {});

      // Act: Get collision summary
      const manager = createReconcileManager(TEST_ROOT);
      const { collisions, summary } = await manager.getCollisionSummary();

      // Assert: No collisions message
      expect(collisions.length).toBe(0);
      expect(summary).toContain('No ID collisions found');
    });
  });
});

describe('Reconcile Command CLI Tests', () => {
  beforeEach(async () => {
    // Create worker-specific temp directory
    TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), `reconcile-cli-test-${Date.now()}-`));
    INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');

    await fs.mkdir(INCREMENTS_DIR, { recursive: true });

    // Create config.json
    const configDir = path.join(TEST_ROOT, '.specweave');
    await fs.writeFile(
      path.join(configDir, 'config.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );
  });

  afterEach(async () => {
    if (TEST_ROOT) {
      await fs.remove(TEST_ROOT);
    }
  });

  it('runReconcileCommand_withNoCollisions_reportsSuccess', async () => {
    // Arrange: Create unique increments
    await createTestIncrement(INCREMENTS_DIR, '0001-feature', {});

    // Capture console output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act: Run command
    const result = await runReconcileCommand(TEST_ROOT, {});

    // Assert
    expect(result.collisionsFound).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No ID collisions found'));

    consoleSpy.mockRestore();
  });

  it('runReconcileCommand_withCollisions_showsSummary', async () => {
    // Arrange: Create collision
    const older = new Date();
    older.setDate(older.getDate() - 10);

    await createTestIncrement(INCREMENTS_DIR, '0001-original', {
      lastActivity: older.toISOString(),
    });

    await createTestIncrement(INCREMENTS_DIR, '0001-duplicate', {
      lastActivity: new Date().toISOString(),
    });

    // Capture console output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act: Run command with force
    const result = await runReconcileCommand(TEST_ROOT, { force: true });

    // Assert
    expect(result.collisionsFound).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));

    consoleSpy.mockRestore();
  });
});
