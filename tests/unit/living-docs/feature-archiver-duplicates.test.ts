/**
 * Feature Archiver - Duplicate Prevention Tests
 *
 * Tests for the critical duplicate prevention logic added in v0.24.1
 * to handle cases where archived features are restored by git/sync.
 *
 * Incident: 2025-11-20 - Archiving created duplicates when targets existed
 * Fix: Pre-flight checks in executeArchiveOperation to remove duplicates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { FeatureArchiver } from '../../../src/core/living-docs/feature-archiver.js';

describe('FeatureArchiver - Duplicate Prevention', () => {
  let testRoot: string;
  let featuresDir: string;
  let archiveDir: string;
  let archiver: FeatureArchiver;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `feature-archiver-test-${Date.now()}`);
    const specsDir = path.join(testRoot, '.specweave', 'docs', 'internal', 'specs');
    featuresDir = path.join(specsDir, '_features');
    archiveDir = path.join(featuresDir, '_archive');

    await fs.ensureDir(featuresDir);
    await fs.ensureDir(archiveDir);
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));

    archiver = new FeatureArchiver(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.clearAllMocks();
  });

  describe('Normal Archiving (No Duplicates)', () => {
    it('should move feature from root to archive when target does not exist', async () => {
      // Arrange: Create feature in root
      const featureId = 'FS-001';
      const featurePath = path.join(featuresDir, featureId);
      await fs.ensureDir(featurePath);
      await fs.writeFile(
        path.join(featurePath, 'FEATURE.md'),
        '---\nid: FS-001\ntitle: Test Feature\n---\n# Test'
      );

      // Create increment with this feature
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(incrementPath);
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        '---\nfeature_id: FS-001\n---\n# Spec'
      );

      // Archive the increment first
      const incrementArchivePath = path.join(
        testRoot,
        '.specweave',
        'increments',
        '_archive',
        '0001-test'
      );
      await fs.ensureDir(path.dirname(incrementArchivePath));
      await fs.move(incrementPath, incrementArchivePath);

      // Act: Archive features
      const result = await archiver.archiveFeatures({
        dryRun: false,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: Feature moved to archive, removed from root
      expect(result.archivedFeatures).toContain(featureId);
      expect(result.errors).toHaveLength(0);
      expect(await fs.pathExists(featurePath)).toBe(false);
      expect(await fs.pathExists(path.join(archiveDir, featureId))).toBe(true);
    });
  });

  describe('Duplicate Handling (Critical Fix)', () => {
    it('should remove duplicate from root when target already exists in archive', async () => {
      // Arrange: Feature exists in BOTH root and archive (duplicate scenario)
      const featureId = 'FS-002';
      const featurePath = path.join(featuresDir, featureId);
      const archivePath = path.join(archiveDir, featureId);

      // Create feature in root (restored by git/sync)
      await fs.ensureDir(featurePath);
      await fs.writeFile(
        path.join(featurePath, 'FEATURE.md'),
        '---\nid: FS-002\ntitle: Duplicate Feature\n---\n# Root Version'
      );

      // Create feature in archive (from previous archiving)
      await fs.ensureDir(archivePath);
      await fs.writeFile(
        path.join(archivePath, 'FEATURE.md'),
        '---\nid: FS-002\ntitle: Duplicate Feature\n---\n# Archived Version'
      );

      // Create archived increment
      const incrementArchivePath = path.join(
        testRoot,
        '.specweave',
        'increments',
        '_archive',
        '0002-test'
      );
      await fs.ensureDir(incrementArchivePath);
      await fs.writeFile(
        path.join(incrementArchivePath, 'spec.md'),
        '---\nfeature_id: FS-002\n---\n# Spec'
      );

      // Act: Archive features (should detect and clean duplicate)
      const result = await archiver.archiveFeatures({
        dryRun: false,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: Duplicate removed from root, archive version preserved
      expect(result.archivedFeatures).toContain(featureId);
      expect(result.errors).toHaveLength(0);
      expect(await fs.pathExists(featurePath)).toBe(false); // Root removed
      expect(await fs.pathExists(archivePath)).toBe(true); // Archive preserved

      // Verify archive version is preserved (not overwritten)
      const archivedContent = await fs.readFile(
        path.join(archivePath, 'FEATURE.md'),
        'utf-8'
      );
      expect(archivedContent).toContain('Archived Version');
    });

    it('should handle multiple duplicates in single operation', async () => {
      // Arrange: Create 3 features with duplicates
      const features = ['FS-003', 'FS-004', 'FS-005'];

      for (const featureId of features) {
        const featurePath = path.join(featuresDir, featureId);
        const archivePath = path.join(archiveDir, featureId);

        // Root version
        await fs.ensureDir(featurePath);
        await fs.writeFile(path.join(featurePath, 'FEATURE.md'), `# ${featureId} Root`);

        // Archive version
        await fs.ensureDir(archivePath);
        await fs.writeFile(path.join(archivePath, 'FEATURE.md'), `# ${featureId} Archive`);

        // Archived increment
        const incrementId = `000${features.indexOf(featureId) + 3}-test`;
        const incrementArchivePath = path.join(
          testRoot,
          '.specweave',
          'increments',
          '_archive',
          incrementId
        );
        await fs.ensureDir(incrementArchivePath);
        await fs.writeFile(
          path.join(incrementArchivePath, 'spec.md'),
          `---\nfeature_id: ${featureId}\n---\n`
        );
      }

      // Act
      const result = await archiver.archiveFeatures({
        dryRun: false,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: All duplicates cleaned
      expect(result.archivedFeatures).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      for (const featureId of features) {
        expect(await fs.pathExists(path.join(featuresDir, featureId))).toBe(false);
        expect(await fs.pathExists(path.join(archiveDir, featureId))).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should skip when source already removed', async () => {
      // Arrange: Feature exists ONLY in archive (no root version)
      const featureId = 'FS-006';
      const archivePath = path.join(archiveDir, featureId);

      await fs.ensureDir(archivePath);
      await fs.writeFile(path.join(archivePath, 'FEATURE.md'), '# Archive Only');

      // Create archived increment
      const incrementArchivePath = path.join(
        testRoot,
        '.specweave',
        'increments',
        '_archive',
        '0006-test'
      );
      await fs.ensureDir(incrementArchivePath);
      await fs.writeFile(
        path.join(incrementArchivePath, 'spec.md'),
        '---\nfeature_id: FS-006\n---\n'
      );

      // Act
      const result = await archiver.archiveFeatures({
        dryRun: false,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: No errors, archive version unchanged
      expect(result.errors).toHaveLength(0);
      expect(await fs.pathExists(archivePath)).toBe(true);
    });

    it('should not archive features with active increments', async () => {
      // Arrange: Feature with active increment
      const featureId = 'FS-007';
      const featurePath = path.join(featuresDir, featureId);

      await fs.ensureDir(featurePath);
      await fs.writeFile(path.join(featurePath, 'FEATURE.md'), '# Active Feature');

      // Create ACTIVE increment (not archived)
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0007-active');
      await fs.ensureDir(incrementPath);
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        '---\nfeature_id: FS-007\n---\n'
      );

      // Act
      const result = await archiver.archiveFeatures({
        dryRun: false,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: Feature NOT archived (still active)
      expect(result.archivedFeatures).not.toContain(featureId);
      expect(await fs.pathExists(featurePath)).toBe(true);
      expect(await fs.pathExists(path.join(archiveDir, featureId))).toBe(false);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not modify files in dry run mode', async () => {
      // Arrange: Duplicate scenario
      const featureId = 'FS-008';
      const featurePath = path.join(featuresDir, featureId);
      const archivePath = path.join(archiveDir, featureId);

      await fs.ensureDir(featurePath);
      await fs.writeFile(path.join(featurePath, 'FEATURE.md'), '# Root');
      await fs.ensureDir(archivePath);
      await fs.writeFile(path.join(archivePath, 'FEATURE.md'), '# Archive');

      // Create archived increment
      const incrementArchivePath = path.join(
        testRoot,
        '.specweave',
        'increments',
        '_archive',
        '0008-test'
      );
      await fs.ensureDir(incrementArchivePath);
      await fs.writeFile(
        path.join(incrementArchivePath, 'spec.md'),
        '---\nfeature_id: FS-008\n---\n'
      );

      // Act: Dry run
      const result = await archiver.archiveFeatures({
        dryRun: true,
        updateLinks: false,
        preserveActiveFeatures: false,
        forceArchiveWhenAllIncrementsArchived: true
      });

      // Assert: Files unchanged
      expect(result.archivedFeatures).toContain(featureId);
      expect(await fs.pathExists(featurePath)).toBe(true); // Still in root
      expect(await fs.pathExists(archivePath)).toBe(true); // Still in archive
    });
  });
});
