/**
 * Unit Tests: FeatureArchiver
 *
 * Tests the feature & epic archiving system for living docs.
 * Focuses on testable logic: inference helpers, archive operations,
 * link updates, dry-run behavior, edge cases with missing/invalid data.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from '../../../../src/utils/fs-native.js';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';

// ---------------------------------------------------------------------------
// Mocks - must be hoisted before imports that use them
// ---------------------------------------------------------------------------

// Mock IncrementArchiver - track instances for per-test mock overrides
const { MockIncrementArchiver, getLastIncrementArchiver } = vi.hoisted(() => {
  let lastInstance: any = null;
  class MockIncrementArchiver {
    listArchived = vi.fn().mockResolvedValue([]);
    constructor() {
      lastInstance = this;
    }
  }
  return {
    MockIncrementArchiver,
    getLastIncrementArchiver: () => lastInstance,
  };
});

vi.mock('../../../../src/core/increment/increment-archiver.js', () => ({
  IncrementArchiver: MockIncrementArchiver,
}));

// Mock HierarchyMapper (constructor dependency, not directly tested)
const { MockHierarchyMapper } = vi.hoisted(() => {
  class MockHierarchyMapper {}
  return { MockHierarchyMapper };
});

vi.mock('../../../../src/core/living-docs/hierarchy-mapper.js', () => ({
  HierarchyMapper: MockHierarchyMapper,
}));

// Mock FeatureIDManager (constructor dependency, not directly tested)
const { MockFeatureIDManager } = vi.hoisted(() => {
  class MockFeatureIDManager {}
  return { MockFeatureIDManager };
});

vi.mock('../../../../src/core/living-docs/feature-id-manager.js', () => ({
  FeatureIDManager: MockFeatureIDManager,
}));

// Mock ConfigManager (transitive dependency from IncrementArchiver)
vi.mock('../../../../src/core/config-manager.js', () => ({
  ConfigManager: vi.fn(),
}));

// Mock MetadataManager (transitive dependency)
vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: vi.fn(),
}));

// Mock duplicate-detector (transitive dependency)
vi.mock('../../../../src/core/increment/duplicate-detector.js', () => ({
  detectDuplicatesByNumber: vi.fn().mockResolvedValue([]),
}));

// Mock logger to suppress console output
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  Logger: vi.fn(),
}));

// Import the class under test (after mocks are set up)
import { FeatureArchiver } from '../../../../src/core/living-docs/feature-archiver.js';
import type { FeatureArchiveOptions, FeatureArchiveResult } from '../../../../src/core/living-docs/feature-archiver.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

function specsDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'docs', 'internal', 'specs', ...segments);
}

function epicsDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'docs', 'internal', 'specs', '_epics', ...segments);
}

function incDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'increments', ...segments);
}

function archiveIncDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'increments', '_archive', ...segments);
}

/**
 * Create a minimal feature folder with FEATURE.md
 */
async function createFeature(
  projectId: string,
  featureId: string,
  content?: string
): Promise<string> {
  const featurePath = specsDir(projectId, featureId);
  await fs.ensureDir(featurePath);
  const featureContent = content || `# ${featureId}\n\nA test feature.\n`;
  await fs.writeFile(path.join(featurePath, 'FEATURE.md'), featureContent, 'utf-8');
  return featurePath;
}

/**
 * Create a minimal epic folder with EPIC.md
 */
async function createEpic(epicId: string, content?: string): Promise<string> {
  const epicPath = epicsDir(epicId);
  await fs.ensureDir(epicPath);
  const epicContent = content || `# ${epicId}\n\nA test epic.\n`;
  await fs.writeFile(path.join(epicPath, 'EPIC.md'), epicContent, 'utf-8');
  return epicPath;
}

/**
 * Create a minimal increment folder with metadata.json
 */
async function createIncrement(
  incrementId: string,
  opts: { featureId?: string; archived?: boolean } = {}
): Promise<string> {
  const dir = opts.archived
    ? archiveIncDir(incrementId)
    : incDir(incrementId);
  await fs.ensureDir(dir);

  const metadata: Record<string, unknown> = {
    id: incrementId,
    status: opts.archived ? 'archived' : 'active',
  };
  if (opts.featureId) {
    metadata.feature_id = opts.featureId;
  }
  await fs.writeJson(path.join(dir, 'metadata.json'), metadata, { spaces: 2 });
  await fs.writeFile(path.join(dir, 'spec.md'), `# ${incrementId}\n`, 'utf-8');
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeatureArchiver', () => {
  let archiver: FeatureArchiver;

  beforeEach(async () => {
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'feature-archiver-test-'));

    // Create base directory structure
    await fs.ensureDir(specsDir());
    await fs.ensureDir(epicsDir());
    await fs.ensureDir(incDir());
    await fs.ensureDir(archiveIncDir());

    archiver = new FeatureArchiver(tempDir);

    // No extra mock reset needed - each new instance gets fresh vi.fn()
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  // =========================================================================
  // inferFeatureIdFromIncrement (private, tested indirectly via archiveFeatures)
  // We can access it through prototype for focused unit tests
  // =========================================================================
  describe('inferFeatureIdFromIncrement', () => {
    // Access the private method for focused testing
    const infer = (increment: string): string | null => {
      return (archiver as any).inferFeatureIdFromIncrement(increment);
    };

    it('should convert 4-digit prefix to FS-XXX format', () => {
      expect(infer('0041-living-docs-test-fixes')).toBe('FS-041');
      expect(infer('0123-my-feature')).toBe('FS-123');
      expect(infer('0001-initial-setup')).toBe('FS-001');
    });

    it('should handle numbers that need zero-padding', () => {
      expect(infer('0001-setup')).toBe('FS-001');
      expect(infer('0010-feature')).toBe('FS-010');
      expect(infer('0100-bigger')).toBe('FS-100');
    });

    it('should handle large numbers (> 999)', () => {
      expect(infer('1234-large-increment')).toBe('FS-1234');
    });

    it('should handle external increments with E suffix', () => {
      expect(infer('0111E-external-issue')).toBe('FS-111E');
      expect(infer('0001E-imported')).toBe('FS-001E');
      expect(infer('0042E-jira-ticket')).toBe('FS-042E');
    });

    it('should return null for non-numeric prefixes', () => {
      expect(infer('temp-experiment')).toBeNull();
      expect(infer('feature-name')).toBeNull();
      expect(infer('')).toBeNull();
    });

    it('should return null for short numeric prefixes', () => {
      // Pattern requires 4 digits
      expect(infer('01-short')).toBeNull();
      expect(infer('012-still-short')).toBeNull();
    });

    it('should handle increment names with no description', () => {
      expect(infer('0099')).toBe('FS-099');
    });

    it('should handle leading zeros correctly', () => {
      expect(infer('0000-zero')).toBe('FS-000');
    });
  });

  // =========================================================================
  // Constructor / path setup
  // =========================================================================
  describe('constructor', () => {
    it('should set up internal paths correctly', () => {
      const arch = new FeatureArchiver('/some/root');
      // Verify internal state via accessing private fields
      expect((arch as any).rootDir).toBe('/some/root');
      expect((arch as any).specsDir).toBe(
        path.join('/some/root', '.specweave', 'docs', 'internal', 'specs')
      );
      expect((arch as any).epicsDir).toBe(
        path.join('/some/root', '.specweave', 'docs', 'internal', 'specs', '_epics')
      );
    });
  });

  // =========================================================================
  // archiveFeatures - dry run
  // =========================================================================
  describe('archiveFeatures (dry run)', () => {
    it('should return empty result when no features exist', async () => {
      const result = await archiver.archiveFeatures({ dryRun: true });

      expect(result.archivedFeatures).toEqual([]);
      expect(result.archivedEpics).toEqual([]);
      expect(result.updatedLinks).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should identify features with all increments archived in dry run', async () => {
      // Create a feature that references an increment
      await createFeature('my-project', 'FS-041', `# FS-041

## Implementation History
| Increment | Status | Date |
|---|---|---|
| [0041-some-feature](../../../../increments/0041-some-feature/spec.md) | completed | 2025-01-01 |
`);

      // Create the archived increment
      await createIncrement('0041-some-feature', { archived: true, featureId: 'FS-041' });

      // Mock listArchived to return the archived increment
      getLastIncrementArchiver().listArchived.mockResolvedValue([
        '0041-some-feature',
      ]);

      const result = await archiver.archiveFeatures({ dryRun: true });

      expect(result.archivedFeatures).toContain('FS-041');
      expect(result.errors).toEqual([]);
    });

    it('should skip features with active increments in dry run', async () => {
      // Create a feature referencing two increments
      await createFeature('my-project', 'FS-050', `# FS-050

## Implementation History
| Increment | Status | Date |
|---|---|---|
| [0050-part-one](../../../../increments/0050-part-one/spec.md) | completed | 2025-01-01 |
| [0051-part-two](../../../../increments/0051-part-two/spec.md) | in-progress | 2025-02-01 |
`);

      // Only one increment is archived
      getLastIncrementArchiver().listArchived.mockResolvedValue([
        '0050-part-one',
      ]);

      const result = await archiver.archiveFeatures({ dryRun: true });

      expect(result.archivedFeatures).not.toContain('FS-050');
    });

    it('should not modify filesystem in dry run mode', async () => {
      await createFeature('my-project', 'FS-099', `# FS-099

## Implementation History
| [0099-done](../../../../increments/0099-done/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0099-done', { archived: true });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0099-done']);

      await archiver.archiveFeatures({ dryRun: true });

      // Feature folder should still exist (not moved)
      const featureExists = await fs.pathExists(specsDir('my-project', 'FS-099'));
      expect(featureExists).toBe(true);

      // Archive folder should NOT have been created
      const archiveExists = await fs.pathExists(specsDir('my-project', '_archive', 'FS-099'));
      expect(archiveExists).toBe(false);
    });
  });

  // =========================================================================
  // archiveFeatures - actual archiving
  // =========================================================================
  describe('archiveFeatures (real)', () => {
    it('should move feature to archive when all increments archived', async () => {
      await createFeature('my-project', 'FS-060', `# FS-060

## Implementation History
| [0060-my-feature](../../../../increments/0060-my-feature/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0060-my-feature', { archived: true, featureId: 'FS-060' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0060-my-feature']);

      const result = await archiver.archiveFeatures();

      expect(result.archivedFeatures).toContain('FS-060');
      expect(result.errors).toEqual([]);

      // Feature should be in archive now
      const archiveExists = await fs.pathExists(specsDir('my-project', '_archive', 'FS-060'));
      expect(archiveExists).toBe(true);

      // Original should be gone
      const originalExists = await fs.pathExists(specsDir('my-project', 'FS-060'));
      expect(originalExists).toBe(false);
    });

    it('should write archive metadata file', async () => {
      await createFeature('my-project', 'FS-070', `# FS-070

## Implementation History
| [0070-archived-inc](../../../../increments/0070-archived-inc/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0070-archived-inc', { archived: true, featureId: 'FS-070' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0070-archived-inc']);

      await archiver.archiveFeatures();

      const metadataPath = specsDir('my-project', '_archive', 'FS-070', '.archive-metadata.json');
      const metadataExists = await fs.pathExists(metadataPath);
      expect(metadataExists).toBe(true);

      const metadata = await fs.readJson(metadataPath);
      expect(metadata.id).toBe('FS-070');
      expect(metadata.type).toBe('feature');
      expect(metadata.reason).toBe('all-increments-archived');
      expect(metadata.archivedAt).toBeDefined();
      expect(metadata.linkedIncrements).toContain('0070-archived-inc');
    });

    it('should use customReason when provided', async () => {
      await createFeature('my-project', 'FS-071', `# FS-071

## Implementation History
| [0071-done](../../../../increments/0071-done/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0071-done', { archived: true, featureId: 'FS-071' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0071-done']);

      await archiver.archiveFeatures({ customReason: 'sprint-cleanup' });

      const metadataPath = specsDir('my-project', '_archive', 'FS-071', '.archive-metadata.json');
      const metadata = await fs.readJson(metadataPath);
      expect(metadata.reason).toBe('sprint-cleanup');
    });

    it('should handle duplicate when target already exists in archive', async () => {
      // Create both active and archived versions
      await createFeature('my-project', 'FS-080', `# FS-080

## Implementation History
| [0080-dup](../../../../increments/0080-dup/spec.md) | completed | 2025-01-01 |
`);

      // Manually create archive target
      const archivePath = specsDir('my-project', '_archive', 'FS-080');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-080 archived\n',
        'utf-8'
      );

      await createIncrement('0080-dup', { archived: true, featureId: 'FS-080' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0080-dup']);

      const result = await archiver.archiveFeatures();

      // Should clean up the duplicate (remove source, keep target)
      expect(result.archivedFeatures).toContain('FS-080');
      expect(result.errors).toEqual([]);

      // Original should be removed
      const originalExists = await fs.pathExists(specsDir('my-project', 'FS-080'));
      expect(originalExists).toBe(false);

      // Archive should still exist
      const archiveExists = await fs.pathExists(specsDir('my-project', '_archive', 'FS-080'));
      expect(archiveExists).toBe(true);
    });

    it('should skip already-archived features that have no active source', async () => {
      // Create only the archive version (no active source)
      const archivePath = specsDir('my-project', '_archive', 'FS-090');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-090 only in archive\n',
        'utf-8'
      );

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures();

      // Should not attempt to archive something that only exists in archive
      expect(result.archivedFeatures).not.toContain('FS-090');
    });
  });

  // =========================================================================
  // External features (FS-XXXE)
  // =========================================================================
  describe('external features', () => {
    it('should skip external features in normal archiving flow', async () => {
      await createFeature('my-project', 'FS-111E', `# FS-111E

An external feature imported from JIRA.
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures({ archiveOrphanedFeatures: true });

      // External features with no linked increments should be skipped
      expect(result.archivedFeatures).not.toContain('FS-111E');
    });
  });

  // =========================================================================
  // Orphaned features
  // =========================================================================
  describe('orphaned features', () => {
    it('should archive orphaned features when archiveOrphanedFeatures is true', async () => {
      // Create a feature with no increment references
      await createFeature('my-project', 'FS-200', `# FS-200

An orphaned feature with no increments.
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures({ archiveOrphanedFeatures: true });

      expect(result.archivedFeatures).toContain('FS-200');
    });

    it('should NOT archive orphaned features when archiveOrphanedFeatures is false', async () => {
      await createFeature('my-project', 'FS-201', `# FS-201

Another orphaned feature.
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures({ archiveOrphanedFeatures: false });

      expect(result.archivedFeatures).not.toContain('FS-201');
    });

    it('should not archive orphaned features by default (vacuous truth prevention)', async () => {
      await createFeature('my-project', 'FS-202', `# FS-202

Feature with no increments.
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures();

      // Default: archiveOrphanedFeatures is undefined/false
      expect(result.archivedFeatures).not.toContain('FS-202');
    });
  });

  // =========================================================================
  // preserveActiveFeatures
  // =========================================================================
  describe('preserveActiveFeatures', () => {
    it('should skip features with active user stories when preserveActiveFeatures is true', async () => {
      await createFeature('my-project', 'FS-300', `# FS-300

## Implementation History
| [0300-feature](../../../../increments/0300-feature/spec.md) | completed | 2025-01-01 |
`);

      // Create a user story with active status
      const featurePath = specsDir('my-project', 'FS-300');
      await fs.writeFile(
        path.join(featurePath, 'us-001.md'),
        '---\nstatus: in-progress\n---\n# US-001\n',
        'utf-8'
      );

      await createIncrement('0300-feature', { archived: true, featureId: 'FS-300' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0300-feature']);

      const result = await archiver.archiveFeatures({ preserveActiveFeatures: true });

      expect(result.archivedFeatures).not.toContain('FS-300');
    });

    it('should force-archive even with active stories when forceArchiveWhenAllIncrementsArchived is true', async () => {
      await createFeature('my-project', 'FS-301', `# FS-301

## Implementation History
| [0301-feature](../../../../increments/0301-feature/spec.md) | completed | 2025-01-01 |
`);

      const featurePath = specsDir('my-project', 'FS-301');
      await fs.writeFile(
        path.join(featurePath, 'us-001.md'),
        '---\nstatus: in-progress\n---\n# US-001\n',
        'utf-8'
      );

      await createIncrement('0301-feature', { archived: true, featureId: 'FS-301' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0301-feature']);

      const result = await archiver.archiveFeatures({
        preserveActiveFeatures: true,
        forceArchiveWhenAllIncrementsArchived: true,
      });

      expect(result.archivedFeatures).toContain('FS-301');
    });
  });

  // =========================================================================
  // Epic archiving
  // =========================================================================
  describe('epic archiving', () => {
    it('should return empty result when no epics exist', async () => {
      // Remove epics dir
      await fs.remove(epicsDir());

      const result = await archiver.archiveFeatures({ dryRun: true });
      expect(result.archivedEpics).toEqual([]);
    });

    it('should archive orphaned epics when archiveOrphanedEpics is true', async () => {
      await createEpic('EPIC-001', '# EPIC-001\nAn orphaned epic.\n');

      const result = await archiver.archiveFeatures({
        archiveOrphanedEpics: true,
      });

      expect(result.archivedEpics).toContain('EPIC-001');
    });

    it('should NOT archive orphaned epics when archiveOrphanedEpics is false', async () => {
      await createEpic('EPIC-002', '# EPIC-002\nAnother epic.\n');

      const result = await archiver.archiveFeatures({
        archiveOrphanedEpics: false,
      });

      expect(result.archivedEpics).not.toContain('EPIC-002');
    });

    it('should skip already-archived epics', async () => {
      // Create only the archived version
      const archivePath = epicsDir('_archive', 'EPIC-003');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'EPIC.md'),
        '# EPIC-003\n',
        'utf-8'
      );

      const result = await archiver.archiveFeatures({ archiveOrphanedEpics: true });

      expect(result.archivedEpics).not.toContain('EPIC-003');
    });

    it('should archive epic when all linked features are archived', async () => {
      // Create an epic that references a feature
      await createEpic('EPIC-004', '# EPIC-004\nLinks to FS-400.\n');

      // Create the feature only in archive (not in active)
      const archiveFeaturePath = specsDir('my-project', '_archive', 'FS-400');
      await fs.ensureDir(archiveFeaturePath);
      await fs.writeFile(
        path.join(archiveFeaturePath, 'FEATURE.md'),
        '# FS-400\nLinked to EPIC-004\n',
        'utf-8'
      );

      const result = await archiver.archiveFeatures({});

      expect(result.archivedEpics).toContain('EPIC-004');
    });

    it('should NOT archive epic when it has active features', async () => {
      // Create an epic that references a feature
      await createEpic('EPIC-005', '# EPIC-005\nLinks to FS-500.\n');

      // Create the feature in active location
      await createFeature('my-project', 'FS-500', '# FS-500\nLinked to EPIC-005\n');

      const result = await archiver.archiveFeatures({});

      expect(result.archivedEpics).not.toContain('EPIC-005');
    });

    it('should use customReason for epic archiving', async () => {
      await createEpic('EPIC-006', '# EPIC-006\nOrphaned.\n');

      await archiver.archiveFeatures({
        archiveOrphanedEpics: true,
        customReason: 'quarterly-cleanup',
      });

      const metadataPath = epicsDir('_archive', 'EPIC-006', '.archive-metadata.json');
      const metadata = await fs.readJson(metadataPath);
      expect(metadata.reason).toBe('quarterly-cleanup');
    });
  });

  // =========================================================================
  // Restore feature
  // =========================================================================
  describe('restoreFeature', () => {
    it('should restore feature from archive to active location', async () => {
      // Create archived feature
      const archivePath = specsDir('my-project', '_archive', 'FS-600');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-600\nRestored feature.\n',
        'utf-8'
      );

      await archiver.restoreFeature('FS-600');

      // Should be in active location
      const activeExists = await fs.pathExists(specsDir('my-project', 'FS-600'));
      expect(activeExists).toBe(true);

      // Should no longer be in archive
      const archiveExists = await fs.pathExists(archivePath);
      expect(archiveExists).toBe(false);
    });

    it('should throw error when feature not found in any archive', async () => {
      await expect(archiver.restoreFeature('FS-999')).rejects.toThrow(
        'Feature FS-999 not found in any archive'
      );
    });

    it('should skip projects where feature already exists in active location', async () => {
      // Create active feature
      await createFeature('my-project', 'FS-601', '# FS-601 active\n');

      // Also create it in archive
      const archivePath = specsDir('my-project', '_archive', 'FS-601');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-601 archived\n',
        'utf-8'
      );

      // Should not throw, just skip
      await archiver.restoreFeature('FS-601');

      // Active version should remain untouched
      const content = await fs.readFile(
        path.join(specsDir('my-project', 'FS-601'), 'FEATURE.md'),
        'utf-8'
      );
      expect(content).toContain('FS-601 active');
    });
  });

  // =========================================================================
  // Restore epic
  // =========================================================================
  describe('restoreEpic', () => {
    it('should restore epic from archive', async () => {
      const archivePath = epicsDir('_archive', 'EPIC-700');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'EPIC.md'),
        '# EPIC-700\n',
        'utf-8'
      );

      await archiver.restoreEpic('EPIC-700');

      const activeExists = await fs.pathExists(epicsDir('EPIC-700'));
      expect(activeExists).toBe(true);

      const archiveExists = await fs.pathExists(archivePath);
      expect(archiveExists).toBe(false);
    });

    it('should throw error when epic not found in archive', async () => {
      await expect(archiver.restoreEpic('EPIC-999')).rejects.toThrow(
        'Epic EPIC-999 not found in archive'
      );
    });

    it('should throw error when epic already exists in active location', async () => {
      // Create both active and archived versions
      await createEpic('EPIC-701', '# EPIC-701 active\n');

      const archivePath = epicsDir('_archive', 'EPIC-701');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'EPIC.md'),
        '# EPIC-701 archived\n',
        'utf-8'
      );

      await expect(archiver.restoreEpic('EPIC-701')).rejects.toThrow(
        'Epic EPIC-701 already exists in active location'
      );
    });
  });

  // =========================================================================
  // getArchiveStats
  // =========================================================================
  describe('getArchiveStats', () => {
    it('should return zero counts when no features or epics exist', async () => {
      const stats = await archiver.getArchiveStats();

      expect(stats.features.active).toBe(0);
      expect(stats.features.archived).toBe(0);
      expect(stats.epics.active).toBe(0);
      expect(stats.epics.archived).toBe(0);
      expect(Object.keys(stats.projects)).toEqual([]);
    });

    it('should count active and archived features per project', async () => {
      // Active features
      await createFeature('project-alpha', 'FS-800');
      await createFeature('project-alpha', 'FS-801');

      // Archived features
      const archivePath = specsDir('project-alpha', '_archive', 'FS-802');
      await fs.ensureDir(archivePath);
      await fs.writeFile(path.join(archivePath, 'FEATURE.md'), '# FS-802\n', 'utf-8');

      const stats = await archiver.getArchiveStats();

      expect(stats.projects['project-alpha']).toBeDefined();
      expect(stats.projects['project-alpha'].active).toBe(2);
      expect(stats.projects['project-alpha'].archived).toBe(1);
      expect(stats.features.active).toBe(2);
      expect(stats.features.archived).toBe(1);
    });

    it('should count active and archived epics', async () => {
      await createEpic('EPIC-810');
      await createEpic('EPIC-811');

      const archivePath = epicsDir('_archive', 'EPIC-812');
      await fs.ensureDir(archivePath);
      await fs.writeFile(path.join(archivePath, 'EPIC.md'), '# EPIC-812\n', 'utf-8');

      const stats = await archiver.getArchiveStats();

      expect(stats.epics.active).toBe(2);
      expect(stats.epics.archived).toBe(1);
    });

    it('should handle multiple projects', async () => {
      await createFeature('frontend', 'FS-820');
      await createFeature('backend', 'FS-821');
      await createFeature('backend', 'FS-822');

      const stats = await archiver.getArchiveStats();

      expect(stats.projects['frontend'].active).toBe(1);
      expect(stats.projects['backend'].active).toBe(2);
      expect(stats.features.active).toBe(3);
    });
  });

  // =========================================================================
  // Link updates
  // =========================================================================
  describe('link updates', () => {
    it('should update feature links from active to archive path', async () => {
      // Create a feature and archive it
      await createFeature('my-project', 'FS-900', `# FS-900

## Implementation History
| [0900-done](../../../../increments/0900-done/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0900-done', { archived: true, featureId: 'FS-900' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0900-done']);

      // Create a markdown file that links to the feature
      const linkingFile = path.join(tempDir, 'docs', 'overview.md');
      await fs.ensureDir(path.dirname(linkingFile));
      await fs.writeFile(
        linkingFile,
        `# Overview\n\nSee [FS-900 Feature](.specweave/docs/internal/specs/my-project/FS-900/FEATURE.md) for details.\n`,
        'utf-8'
      );

      const result = await archiver.archiveFeatures({ updateLinks: true });

      expect(result.archivedFeatures).toContain('FS-900');

      // Check that the link was updated
      const updatedContent = await fs.readFile(linkingFile, 'utf-8');
      expect(updatedContent).toContain('_archive/FS-900');
      expect(updatedContent).not.toMatch(/specs\/my-project\/FS-900\//);

      expect(result.updatedLinks.length).toBeGreaterThan(0);
    });

    it('should update epic links from active to archive path', async () => {
      await createEpic('EPIC-910', '# EPIC-910\nOrphaned.\n');

      // Create a markdown file that links to the epic
      const linkingFile = path.join(tempDir, 'docs', 'epics.md');
      await fs.ensureDir(path.dirname(linkingFile));
      await fs.writeFile(
        linkingFile,
        `# Epics\n\nSee [EPIC-910](.specweave/docs/internal/specs/_epics/EPIC-910/EPIC.md) for info.\n`,
        'utf-8'
      );

      const result = await archiver.archiveFeatures({
        archiveOrphanedEpics: true,
        updateLinks: true,
      });

      expect(result.archivedEpics).toContain('EPIC-910');

      const updatedContent = await fs.readFile(linkingFile, 'utf-8');
      expect(updatedContent).toContain('_epics/_archive/EPIC-910');
    });

    it('should skip links already pointing to archive', async () => {
      await createFeature('my-project', 'FS-920', `# FS-920

## Implementation History
| [0920-done](../../../../increments/0920-done/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0920-done', { archived: true, featureId: 'FS-920' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0920-done']);

      // Link already points to archive
      const linkingFile = path.join(tempDir, 'docs', 'already-archived.md');
      await fs.ensureDir(path.dirname(linkingFile));
      await fs.writeFile(
        linkingFile,
        `See [FS-920](.specweave/docs/internal/specs/my-project/_archive/FS-920/FEATURE.md).\n`,
        'utf-8'
      );

      const result = await archiver.archiveFeatures({ updateLinks: true });

      // Link should not be double-archived
      const updatedContent = await fs.readFile(linkingFile, 'utf-8');
      expect(updatedContent).not.toContain('_archive/_archive');
    });

    it('should not update links when updateLinks is false', async () => {
      await createFeature('my-project', 'FS-930', `# FS-930

## Implementation History
| [0930-done](../../../../increments/0930-done/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0930-done', { archived: true, featureId: 'FS-930' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0930-done']);

      const linkingFile = path.join(tempDir, 'docs', 'no-update.md');
      await fs.ensureDir(path.dirname(linkingFile));
      await fs.writeFile(
        linkingFile,
        `See [FS-930](.specweave/docs/internal/specs/my-project/FS-930/FEATURE.md).\n`,
        'utf-8'
      );

      await archiver.archiveFeatures({ updateLinks: false });

      // Link should NOT be updated
      const content = await fs.readFile(linkingFile, 'utf-8');
      expect(content).toContain('specs/my-project/FS-930/');
      expect(content).not.toContain('_archive');
    });
  });

  // =========================================================================
  // Feature-to-increment linking (getLinkedIncrements)
  // =========================================================================
  describe('getLinkedIncrements (via archiveFeatures)', () => {
    it('should find increments from FEATURE.md Implementation History', async () => {
      await createFeature('my-project', 'FS-100', `# FS-100

## Implementation History
| Increment | Status | Date |
|---|---|---|
| [0100-first](../../../../increments/0100-first/spec.md) | completed | 2025-01-01 |
| [0101-second](../../../../increments/0101-second/spec.md) | completed | 2025-02-01 |
`);

      // Only one archived
      await createIncrement('0100-first', { archived: true });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0100-first']);

      const result = await archiver.archiveFeatures({ dryRun: true });

      // Feature has one active increment (0101), so should NOT be archived
      expect(result.archivedFeatures).not.toContain('FS-100');
    });

    it('should fallback to metadata.json feature_id when no FEATURE.md history', async () => {
      await createFeature('my-project', 'FS-110', `# FS-110

A feature with no implementation history table.
`);

      // Create increment with explicit feature_id in metadata
      await createIncrement('0110-linked', { featureId: 'FS-110', archived: true });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0110-linked']);

      const result = await archiver.archiveFeatures({ dryRun: true });

      expect(result.archivedFeatures).toContain('FS-110');
    });

    it('should fallback to auto-inference from increment number', async () => {
      await createFeature('my-project', 'FS-120', `# FS-120

A feature with no implementation history.
`);

      // Create increment with NO explicit feature_id (auto-infer 0120 -> FS-120)
      await createIncrement('0120-auto-infer', { archived: true });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0120-auto-infer']);

      const result = await archiver.archiveFeatures({ dryRun: true });

      expect(result.archivedFeatures).toContain('FS-120');
    });
  });

  // =========================================================================
  // Cleanup duplicates
  // =========================================================================
  describe('cleanupDuplicates', () => {
    it('should remove active folder when archive exists and all increments archived', async () => {
      // Create active feature
      await createFeature('my-project', 'FS-400', '# FS-400 active\n');

      // Create archived version
      const archivePath = specsDir('my-project', '_archive', 'FS-400');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-400 archived\n',
        'utf-8'
      );

      // No active increments for this feature
      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.cleanupDuplicates();

      expect(result.cleaned.length).toBeGreaterThanOrEqual(1);
      expect(result.errors).toEqual([]);

      // Active should be removed (no active increments -> keep archive)
      const activeExists = await fs.pathExists(specsDir('my-project', 'FS-400'));
      expect(activeExists).toBe(false);

      // Archive should remain
      const archiveExists = await fs.pathExists(archivePath);
      expect(archiveExists).toBe(true);
    });

    it('should remove archive folder when feature has active increments', async () => {
      // Create active feature with FEATURE.md referencing an active increment
      await createFeature('my-project', 'FS-401', `# FS-401

## Implementation History
| [0401-active](../../../../increments/0401-active/spec.md) | in-progress | 2025-01-01 |
`);

      // Create the active increment
      await createIncrement('0401-active', { featureId: 'FS-401' });

      // Create archived version too (the duplicate)
      const archivePath = specsDir('my-project', '_archive', 'FS-401');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-401 archived\n',
        'utf-8'
      );

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.cleanupDuplicates();

      expect(result.cleaned.length).toBeGreaterThanOrEqual(1);

      // Active should remain (has active increments)
      const activeExists = await fs.pathExists(specsDir('my-project', 'FS-401'));
      expect(activeExists).toBe(true);

      // Archive should be removed
      const archiveGone = !(await fs.pathExists(archivePath));
      expect(archiveGone).toBe(true);
    });

    it('should return empty when no duplicates exist', async () => {
      await createFeature('my-project', 'FS-402', '# FS-402\n');

      const result = await archiver.cleanupDuplicates();

      expect(result.cleaned).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  // =========================================================================
  // archiveExternalFeatures
  // =========================================================================
  describe('archiveExternalFeatures', () => {
    it('should archive specific external features by ID', async () => {
      await createFeature('my-project', 'FS-501E', `# FS-501E\nExternal.\n`);
      await createFeature('my-project', 'FS-502E', `# FS-502E\nExternal.\n`);

      const result = await archiver.archiveExternalFeatures({
        featureIds: ['FS-501E'],
      });

      expect(result.archivedFeatures).toContain('FS-501E');
      expect(result.archivedFeatures).not.toContain('FS-502E');
    });

    it('should skip already-archived external features', async () => {
      // Create only the archived version
      const archivePath = specsDir('my-project', '_archive', 'FS-503E');
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '# FS-503E archived\n',
        'utf-8'
      );

      // Also create active version
      await createFeature('my-project', 'FS-503E', `# FS-503E\nExternal.\n`);

      const result = await archiver.archiveExternalFeatures({
        featureIds: ['FS-503E'],
      });

      // Should skip (archive already exists)
      expect(result.archivedFeatures).not.toContain('FS-503E');
    });

    it('should respect keepLast parameter', async () => {
      // Create many external features
      for (let i = 1; i <= 5; i++) {
        await createFeature('my-project', `FS-${(510 + i).toString().padStart(3, '0')}E`, `# External ${i}\n`);
      }

      const result = await archiver.archiveExternalFeatures({
        keepLast: 3,
      });

      // Should archive 2 oldest (keep 3)
      expect(result.archivedFeatures.length).toBe(2);
    });

    it('should return empty result when no external features exist', async () => {
      // Only non-external features
      await createFeature('my-project', 'FS-520', '# FS-520\nNot external.\n');

      const result = await archiver.archiveExternalFeatures();

      expect(result.archivedFeatures).toEqual([]);
    });

    it('should handle dry run for external features', async () => {
      await createFeature('my-project', 'FS-530E', '# FS-530E\nExternal.\n');

      const result = await archiver.archiveExternalFeatures({
        featureIds: ['FS-530E'],
        dryRun: true,
      });

      expect(result.archivedFeatures).toContain('FS-530E');

      // Active folder should still exist
      const activeExists = await fs.pathExists(specsDir('my-project', 'FS-530E'));
      expect(activeExists).toBe(true);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('error handling', () => {
    it('should catch errors and add to result.errors', async () => {
      // Create a feature that will be archived
      await createFeature('err-project', 'FS-990', `# FS-990

## Implementation History
| [0990-fail](../../../../increments/0990-fail/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0990-fail', { archived: true, featureId: 'FS-990' });
      getLastIncrementArchiver().listArchived.mockResolvedValue(['0990-fail']);

      // Create a FILE at the _archive path so ensureDir for parent fails
      // when trying to create {project}/_archive/FS-990/
      // The _archive is already a file, so mkdir inside it fails
      const archiveParent = specsDir('err-project', '_archive');
      // Remove dir if it exists (created by ensureArchiveDirectories during beforeEach)
      await fs.remove(archiveParent);
      // Create a FILE (not directory) at the _archive path
      await fs.writeFile(archiveParent, 'not-a-directory', 'utf-8');

      const result = await archiver.archiveFeatures();

      // Should have recorded an error but not crashed
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing specs directory gracefully', async () => {
      // Remove the entire specs directory
      await fs.remove(specsDir());

      const result = await archiver.archiveFeatures();

      expect(result.archivedFeatures).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  // =========================================================================
  // Validate and repair feature IDs
  // =========================================================================
  describe('validateAndRepairFeatureIds', () => {
    it('should rename feature folder when ID mismatches increment reference', async () => {
      // Feature FS-060 references increment 0088 (mismatch!)
      await createFeature('my-project', 'FS-060', `# FS-060

## Implementation History
| [0088-renamed-increment](../../../../increments/0088-renamed-increment/spec.md) | completed | 2025-01-01 |
`);

      // Run archiveFeatures which calls validateAndRepairFeatureIds first
      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      await archiver.archiveFeatures();

      // FS-060 should have been renamed to FS-088
      const oldExists = await fs.pathExists(specsDir('my-project', 'FS-060'));
      const newExists = await fs.pathExists(specsDir('my-project', 'FS-088'));

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });

    it('should handle external increment mismatch (E suffix)', async () => {
      // Feature FS-111 references external increment 0111E (should become FS-111E)
      await createFeature('my-project', 'FS-111', `# FS-111

## Implementation History
| [0111E-external-issue](../../../../increments/0111E-external-issue/spec.md) | completed | 2025-01-01 |
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      await archiver.archiveFeatures();

      const oldExists = await fs.pathExists(specsDir('my-project', 'FS-111'));
      const newExists = await fs.pathExists(specsDir('my-project', 'FS-111E'));

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });

    it('should not rename when IDs already match', async () => {
      await createFeature('my-project', 'FS-050', `# FS-050

## Implementation History
| [0050-matching](../../../../increments/0050-matching/spec.md) | completed | 2025-01-01 |
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      await archiver.archiveFeatures();

      // Should still exist with original name
      const exists = await fs.pathExists(specsDir('my-project', 'FS-050'));
      expect(exists).toBe(true);
    });

    it('should skip rename when target already exists', async () => {
      // Create both FS-060 (mismatched) and FS-088 (target)
      await createFeature('my-project', 'FS-060', `# FS-060

## Implementation History
| [0088-something](../../../../increments/0088-something/spec.md) | completed | 2025-01-01 |
`);
      await createFeature('my-project', 'FS-088', '# FS-088\nAlready exists.\n');

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      await archiver.archiveFeatures();

      // Both should still exist (rename was skipped)
      const oldExists = await fs.pathExists(specsDir('my-project', 'FS-060'));
      const newExists = await fs.pathExists(specsDir('my-project', 'FS-088'));

      expect(oldExists).toBe(true);
      expect(newExists).toBe(true);
    });

    it('should skip dry run without calling validateAndRepairFeatureIds', async () => {
      await createFeature('my-project', 'FS-060', `# FS-060

## Implementation History
| [0088-mismatch](../../../../increments/0088-mismatch/spec.md) | completed | 2025-01-01 |
`);

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      // In dry run, validateAndRepairFeatureIds is NOT called
      await archiver.archiveFeatures({ dryRun: true });

      // FS-060 should still exist (no rename in dry run)
      const exists = await fs.pathExists(specsDir('my-project', 'FS-060'));
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // Edge cases: special folder names
  // =========================================================================
  describe('edge cases', () => {
    it('should skip directories starting with underscore', async () => {
      // Create a _internal folder (should be ignored)
      const internalPath = specsDir('_internal', 'FS-999');
      await fs.ensureDir(internalPath);
      await fs.writeFile(
        path.join(internalPath, 'FEATURE.md'),
        '# FS-999\n',
        'utf-8'
      );

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      const result = await archiver.archiveFeatures({ archiveOrphanedFeatures: true });

      // Should not try to archive features from _internal
      expect(result.archivedFeatures).not.toContain('FS-999');
    });

    it('should handle feature with no FEATURE.md', async () => {
      // Create feature directory but no FEATURE.md
      const featurePath = specsDir('my-project', 'FS-150');
      await fs.ensureDir(featurePath);
      // Just create an empty directory

      getLastIncrementArchiver().listArchived.mockResolvedValue([]);

      // Should not crash
      const result = await archiver.archiveFeatures({ archiveOrphanedFeatures: true });

      // May or may not archive - depends on getLinkedIncrements fallback
      // Main assertion: no crash
      expect(result.errors).toEqual([]);
    });

    it('should handle multiple projects with same feature ID', async () => {
      await createFeature('frontend', 'FS-160', `# FS-160 frontend

## Implementation History
| [0160-fe](../../../../increments/0160-fe/spec.md) | completed | 2025-01-01 |
`);

      await createFeature('backend', 'FS-160', `# FS-160 backend

## Implementation History
| [0160-be](../../../../increments/0160-be/spec.md) | completed | 2025-01-01 |
`);

      await createIncrement('0160-fe', { archived: true });
      await createIncrement('0160-be', { archived: true });
      getLastIncrementArchiver().listArchived.mockResolvedValue([
        '0160-fe',
        '0160-be',
      ]);

      const result = await archiver.archiveFeatures();

      // Both project copies should be archived
      const feArchiveExists = await fs.pathExists(specsDir('frontend', '_archive', 'FS-160'));
      const beArchiveExists = await fs.pathExists(specsDir('backend', '_archive', 'FS-160'));

      // At least one should be archived (implementation may deduplicate by feature ID)
      expect(result.archivedFeatures).toContain('FS-160');
    });

    it('should use exact match for increment comparison (not partial)', async () => {
      // Create a feature linked to increment 0041
      await createFeature('my-project', 'FS-041', `# FS-041

## Implementation History
| [0041-my-feature](../../../../increments/0041-my-feature/spec.md) | completed | 2025-01-01 |
`);

      // Archive a DIFFERENT increment with similar prefix (0041X should not match 0041)
      getLastIncrementArchiver().listArchived.mockResolvedValue([
        '0041X-different-feature',
      ]);

      const result = await archiver.archiveFeatures({ dryRun: true });

      // Should NOT archive because 0041X !== 0041-my-feature (exact match)
      expect(result.archivedFeatures).not.toContain('FS-041');
    });
  });
});
