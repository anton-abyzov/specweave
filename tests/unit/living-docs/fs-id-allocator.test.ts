import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { FSIdAllocator, type ExternalWorkItem, type FeatureMetadata } from '../../../src/living-docs/fs-id-allocator.js';

describe('FS-ID Allocator (T-041)', () => {
  let testDir: string;
  let allocator: FSIdAllocator;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `test-fs-allocator-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.specweave/docs/internal/specs'));
    await fs.ensureDir(path.join(testDir, '.specweave/docs/_archive/specs'));

    allocator = new FSIdAllocator(testDir);
  });

  afterEach(async () => {
    // Cleanup test directory
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('TC-128: Chronological insertion into gap', () => {
    it('should insert FS-011E between FS-010 and FS-020 based on creation date', async () => {
      // Given: FS-010 (2025-01-10), FS-020 (2025-01-20)
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z');

      // When: Work item created 2025-01-15 (between the two)
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#100',
        title: 'Middle Feature',
        createdAt: '2025-01-15T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/100'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-011E (chronological insert)
      expect(result.id).toBe('FS-011E');
      expect(result.strategy).toBe('chronological-insert');
      expect(result.number).toBe(11);
      expect(result.reason).toContain('Inserted chronologically');
    });

    it('should insert FS-006E between FS-005 and FS-010', async () => {
      // Given: FS-005 (2025-01-05), FS-010 (2025-01-10)
      await createFeatureFolder(testDir, 'FS-005', '2025-01-05T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');

      // When: Work item created 2025-01-07
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#50',
        title: 'Middle Feature',
        createdAt: '2025-01-07T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/50'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-006E
      expect(result.id).toBe('FS-006E');
      expect(result.strategy).toBe('chronological-insert');
    });

    it('should handle multiple gaps and choose correct one', async () => {
      // Given: FS-001 (2025-01-01), FS-005 (2025-01-05), FS-010 (2025-01-10)
      await createFeatureFolder(testDir, 'FS-001', '2025-01-01T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-005', '2025-01-05T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');

      // When: Work item created 2025-01-03 (fits in first gap)
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#25',
        title: 'Early Feature',
        createdAt: '2025-01-03T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/25'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-002E (first gap)
      expect(result.id).toBe('FS-002E');
      expect(result.strategy).toBe('chronological-insert');
    });
  });

  describe('TC-129: Append mode when no suitable gap', () => {
    it('should append FS-013E when IDs are consecutive', async () => {
      // Given: FS-010, FS-011, FS-012 (consecutive, no gaps)
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-011', '2025-01-11T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-012', '2025-01-12T00:00:00Z');

      // When: Work item created after all (2025-02-01)
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#200',
        title: 'Latest Feature',
        createdAt: '2025-02-01T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/200'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should append FS-013E (max + 1)
      expect(result.id).toBe('FS-013E');
      expect(result.strategy).toBe('append');
      expect(result.number).toBe(13);
      expect(result.reason).toContain('created after all existing features');
    });

    it('should append when work item is newest', async () => {
      // Given: FS-001, FS-002, FS-003
      await createFeatureFolder(testDir, 'FS-001', '2025-01-01T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-002', '2025-01-02T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-003', '2025-01-03T00:00:00Z');

      // When: Work item created after all
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#999',
        title: 'Newest Feature',
        createdAt: '2025-12-31T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/999'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should append FS-004E
      expect(result.id).toBe('FS-004E');
      expect(result.strategy).toBe('append');
    });

    it('should handle large ID numbers correctly', async () => {
      // Given: FS-998, FS-999
      await createFeatureFolder(testDir, 'FS-998', '2025-01-01T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-999', '2025-01-02T00:00:00Z');

      // When: Allocate new ID
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#1000',
        title: 'Feature 1000',
        createdAt: '2025-01-03T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/1000'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-1000E (4-digit)
      expect(result.id).toBe('FS-1000E');
      expect(result.number).toBe(1000);
    });
  });

  describe('TC-130: Detect collision with existing ID', () => {
    it('should detect collision with exact match', async () => {
      // Given: FS-010, FS-011E, FS-020
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-011E', '2025-01-11T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z');

      await allocator.scanExistingIds();

      // When: Check for collision with existing IDs
      expect(allocator.hasCollision('FS-010')).toBe(true);
      expect(allocator.hasCollision('FS-011E')).toBe(true);
      expect(allocator.hasCollision('FS-020')).toBe(true);
    });

    it('should detect collision with variant (FS-011E when checking FS-011)', async () => {
      // Given: FS-011E exists
      await createFeatureFolder(testDir, 'FS-011E', '2025-01-11T00:00:00Z');

      await allocator.scanExistingIds();

      // When: Check for FS-011 (internal variant)
      expect(allocator.hasCollision('FS-011')).toBe(true);
      expect(allocator.hasCollision('FS-011E')).toBe(true);
    });

    it('should return false for non-existent IDs', async () => {
      // Given: FS-010, FS-020
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z');

      await allocator.scanExistingIds();

      // When: Check for non-existent IDs
      expect(allocator.hasCollision('FS-015')).toBe(false);
      expect(allocator.hasCollision('FS-015E')).toBe(false);
      expect(allocator.hasCollision('FS-025')).toBe(false);
    });

    it('should not allocate colliding ID', async () => {
      // Given: FS-010 exists
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');

      // When: Try to allocate work item that would collide
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#100',
        title: 'Test',
        createdAt: '2025-01-09T00:00:00Z', // Before FS-010
        externalUrl: 'https://github.com/owner/repo/issues/100'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should not allocate FS-010 (exists) or FS-010E (variant collision)
      expect(result.id).not.toBe('FS-010');
      expect(result.id).not.toBe('FS-010E');
    });
  });

  describe('TC-131: Scan archived IDs (prevent reuse)', () => {
    it('should scan both active and archived folders', async () => {
      // Given: FS-010 active, FS-020 archived
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z', 'active');
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z', 'archived');

      await allocator.scanExistingIds();

      // Then: Both should be detected
      expect(allocator.hasCollision('FS-010')).toBe(true);
      expect(allocator.hasCollision('FS-020')).toBe(true);
    });

    it('should not reuse archived IDs', async () => {
      // Given: FS-010 active, FS-020 archived
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z', 'active');
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z', 'archived');

      // When: Work item created between active and archived
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#150',
        title: 'Middle Feature',
        createdAt: '2025-01-15T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/150'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-011E (not FS-020, even though archived)
      expect(result.id).toBe('FS-011E');
      expect(result.strategy).toBe('chronological-insert');
    });

    it('should include archived IDs in max ID calculation', async () => {
      // Given: Active FS-010, Archived FS-050
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z', 'active');
      await createFeatureFolder(testDir, 'FS-050', '2025-01-20T00:00:00Z', 'archived');

      await allocator.scanExistingIds();

      // Then: Max ID should be 50 (from archive)
      expect(allocator.getMaxId()).toBe(50);
    });

    it('should allocate next ID after archived max', async () => {
      // Given: Archived FS-100
      await createFeatureFolder(testDir, 'FS-100', '2025-01-01T00:00:00Z', 'archived');

      // When: Allocate new ID for later date
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#999',
        title: 'New Feature',
        createdAt: '2025-12-31T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/999'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-101E (after archived max)
      expect(result.id).toBe('FS-101E');
    });
  });

  describe('TC-132: Parse feature metadata from README.md', () => {
    it('should parse createdAt from FEATURE.md frontmatter', async () => {
      // Given: Feature with FEATURE.md containing frontmatter
      const featurePath = path.join(testDir, '.specweave/docs/internal/specs/FS-042');
      await fs.ensureDir(featurePath);
      await fs.writeFile(
        path.join(featurePath, 'FEATURE.md'),
        `---
created: 2025-01-15T10:30:00Z
title: Test Feature
---
# Feature Content
`
      );

      // When: Scan features
      await allocator.scanExistingIds();

      // Then: Should extract metadata correctly
      const features = allocator.getExistingFeatures();
      const feature = features.find(f => f.id === 'FS-042');

      expect(feature).toBeDefined();
      expect(feature?.createdAt).toBe('2025-01-15T10:30:00Z');
      expect(feature?.id).toBe('FS-042');
      expect(feature?.origin).toBe('internal');
    });

    it('should parse external_id for external features', async () => {
      // Given: External feature with external_id
      const featurePath = path.join(testDir, '.specweave/docs/internal/specs/FS-042E');
      await fs.ensureDir(featurePath);
      await fs.writeFile(
        path.join(featurePath, 'FEATURE.md'),
        `---
created: 2025-01-15T10:30:00Z
external_id: GH-#638
title: External Feature
---
# Feature Content
`
      );

      // When: Scan features
      await allocator.scanExistingIds();

      // Then: Should extract external metadata
      const features = allocator.getExistingFeatures();
      const feature = features.find(f => f.id === 'FS-042E');

      expect(feature).toBeDefined();
      expect(feature?.origin).toBe('external');
      expect(feature?.externalId).toBe('GH-#638');
    });

    it('should fallback to README.md if FEATURE.md not found', async () => {
      // Given: Feature with README.md only
      const featurePath = path.join(testDir, '.specweave/docs/internal/specs/FS-050');
      await fs.ensureDir(featurePath);
      await fs.writeFile(
        path.join(featurePath, 'README.md'),
        `---
createdAt: 2025-02-01T00:00:00Z
title: Feature via README
---
# README Content
`
      );

      // When: Scan features
      await allocator.scanExistingIds();

      // Then: Should parse from README.md
      const features = allocator.getExistingFeatures();
      const feature = features.find(f => f.id === 'FS-050');

      expect(feature).toBeDefined();
      expect(feature?.createdAt).toBe('2025-02-01T00:00:00Z');
    });

    it('should handle missing frontmatter gracefully', async () => {
      // Given: Feature folder without metadata file
      const featurePath = path.join(testDir, '.specweave/docs/internal/specs/FS-060');
      await fs.ensureDir(featurePath);

      // When: Scan features
      await allocator.scanExistingIds();

      // Then: Should create minimal metadata with epoch timestamp
      const features = allocator.getExistingFeatures();
      const feature = features.find(f => f.id === 'FS-060');

      expect(feature).toBeDefined();
      expect(feature?.createdAt).toBe(new Date(0).toISOString());
      expect(feature?.origin).toBe('internal');
    });
  });

  describe('First Feature Allocation', () => {
    it('should allocate FS-001E for first external feature', async () => {
      // Given: Empty project (no existing features)

      // When: Allocate first external feature
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#1',
        title: 'First Feature',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/1'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should allocate FS-001E
      expect(result.id).toBe('FS-001E');
      expect(result.strategy).toBe('first');
      expect(result.number).toBe(1);
      expect(result.reason).toBe('First external feature in project');
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      // Given: Mixed features (active and archived, internal and external)
      await createFeatureFolder(testDir, 'FS-001', '2025-01-01T00:00:00Z', 'active');
      await createFeatureFolder(testDir, 'FS-002E', '2025-01-02T00:00:00Z', 'active');
      await createFeatureFolder(testDir, 'FS-003', '2025-01-03T00:00:00Z', 'archived');
      await createFeatureFolder(testDir, 'FS-004E', '2025-01-04T00:00:00Z', 'archived');

      await allocator.scanExistingIds();

      // When: Get stats
      const stats = allocator.getStats();

      // Then: Should have accurate counts
      expect(stats.total).toBe(4);
      expect(stats.active).toBe(2);
      expect(stats.archived).toBe(2);
      expect(stats.internal).toBe(2);
      expect(stats.external).toBe(2);
      expect(stats.maxId).toBe(4);
    });

    it('should get chronologically sorted features', async () => {
      // Given: Features created in non-sequential order
      await createFeatureFolder(testDir, 'FS-020', '2025-01-20T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-010', '2025-01-10T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-030', '2025-01-30T00:00:00Z');
      await createFeatureFolder(testDir, 'FS-015', '2025-01-15T00:00:00Z');

      await allocator.scanExistingIds();

      // When: Get sorted features
      const features = allocator.getExistingFeatures();

      // Then: Should be sorted by creation date
      expect(features.map(f => f.id)).toEqual(['FS-010', 'FS-015', 'FS-020', 'FS-030']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very old timestamps (epoch)', async () => {
      // Given: Feature with epoch timestamp
      await createFeatureFolder(testDir, 'FS-001', '1970-01-01T00:00:00Z');

      // When: Allocate newer feature
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#1',
        title: 'New Feature',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/1'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should append after epoch feature
      expect(result.id).toBe('FS-002E');
    });

    it('should handle same-day timestamps with different times', async () => {
      // Given: Two features same day, different times
      await createFeatureFolder(testDir, 'FS-001', '2025-01-15T08:00:00Z');
      await createFeatureFolder(testDir, 'FS-002', '2025-01-15T16:00:00Z');

      // When: Allocate feature between them (midday)
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#50',
        title: 'Midday Feature',
        createdAt: '2025-01-15T12:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/50'
      };

      const result = await allocator.allocateId(workItem);

      // Then: Should detect no gap (consecutive IDs) and append
      expect(result.id).toBe('FS-003E');
      expect(result.strategy).toBe('append');
    });

    it('should throw on invalid FS-ID format', async () => {
      // Given: Allocator scanned
      await allocator.scanExistingIds();

      // When/Then: Invalid ID should throw
      expect(() => {
        // @ts-expect-error - Testing invalid input
        allocator['extractNumber']('INVALID-ID');
      }).toThrow('Invalid FS-ID format');
    });
  });
});

// Helper function to create feature folder with metadata
async function createFeatureFolder(
  testDir: string,
  fsId: string,
  createdAt: string,
  location: 'active' | 'archived' = 'active'
): Promise<void> {
  const basePath =
    location === 'active'
      ? path.join(testDir, '.specweave/docs/internal/specs')
      : path.join(testDir, '.specweave/docs/_archive/specs');

  const featurePath = path.join(basePath, fsId);
  await fs.ensureDir(featurePath);

  const content = `---
created: ${createdAt}
title: Feature ${fsId}
${fsId.endsWith('E') ? `external_id: GH-#${fsId.replace(/\D/g, '')}` : ''}
---

# Feature ${fsId}

Test feature created at ${createdAt}
`;

  await fs.writeFile(path.join(featurePath, 'FEATURE.md'), content);
}
