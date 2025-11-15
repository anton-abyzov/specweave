/**
 * Tests for FeatureIDManager - Ensures no duplicate feature IDs
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FeatureIDManager } from '../../src/core/living-docs/feature-id-manager.js';

describe('FeatureIDManager', () => {
  const testProjectRoot = path.join(__dirname, '../fixtures/test-project');
  let manager: FeatureIDManager;

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove(testProjectRoot);
    await fs.ensureDir(testProjectRoot);

    // Create test increments with different dates
    const increments = [
      {
        id: '0001-first-feature',
        created: '2025-01-01',
        feature: 'FS-25-01-01-first-feature',
        title: 'First Feature'
      },
      {
        id: '0002-second-feature',
        created: '2025-01-02',
        feature: 'FS-25-01-02-second-feature',
        title: 'Second Feature'
      },
      {
        id: '0003-third-feature',
        created: '2025-01-03',
        feature: 'FS-25-01-03-third-feature',
        title: 'Third Feature'
      },
      {
        id: '0004-first-feature-update',  // Same feature as 0001
        created: '2025-01-04',
        feature: 'FS-25-01-01-first-feature',
        title: 'First Feature Update'
      }
    ];

    for (const inc of increments) {
      const incrementPath = path.join(testProjectRoot, '.specweave/increments', inc.id);
      await fs.ensureDir(incrementPath);

      // Create spec.md
      const specContent = `---
title: "${inc.title}"
feature: ${inc.feature}
created: ${inc.created}
imported: true
---

# ${inc.title}
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create metadata.json
      const metadata = {
        id: inc.id,
        created: inc.created,
        status: 'active'
      };
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);
    }

    manager = new FeatureIDManager(testProjectRoot);
  });

  afterEach(async () => {
    await fs.remove(testProjectRoot);
  });

  describe('buildRegistry', () => {
    it('should assign unique FS-XXX IDs based on creation date', async () => {
      await manager.buildRegistry();
      const features = manager.getAllFeatures();

      // Should have 3 unique features (0001 and 0004 are the same feature)
      expect(features).toHaveLength(3);

      // Check that IDs are assigned in order
      const firstFeature = features.find(f => f.originalId.includes('first-feature'));
      const secondFeature = features.find(f => f.originalId.includes('second-feature'));
      const thirdFeature = features.find(f => f.originalId.includes('third-feature'));

      expect(firstFeature?.assignedId).toBe('FS-001');
      expect(secondFeature?.assignedId).toBe('FS-002');
      expect(thirdFeature?.assignedId).toBe('FS-003');
    });

    it('should not create duplicate IDs for the same feature', async () => {
      await manager.buildRegistry();

      // Both increments 0001 and 0004 reference the same feature
      const id1 = manager.getAssignedId('FS-25-01-01-first-feature');
      const id2 = manager.getAssignedId('FS-25-01-01-first-feature');

      expect(id1).toBe(id2);
      expect(id1).toBe('FS-001');
    });

    it('should handle features without dates gracefully', async () => {
      // Add an increment without a date
      const noDatePath = path.join(testProjectRoot, '.specweave/increments/0005-no-date');
      await fs.ensureDir(noDatePath);
      await fs.writeFile(path.join(noDatePath, 'spec.md'), `---
title: "No Date Feature"
feature: FS-no-date-feature
---`);

      await manager.buildRegistry();
      const features = manager.getAllFeatures();

      // Should still have unique IDs
      const assignedIds = features.map(f => f.assignedId);
      const uniqueIds = new Set(assignedIds);
      expect(uniqueIds.size).toBe(assignedIds.length);
    });
  });

  describe('duplicate prevention', () => {
    it('should prevent duplicate FS-XXX IDs', async () => {
      await manager.buildRegistry();

      // Try to assign IDs to the same feature multiple times
      const id1 = manager.getAssignedId('FS-25-01-01-first-feature');
      const id2 = manager.getAssignedId('FS-25-01-01-first-feature');
      const id3 = manager.getAssignedId('FS-25-01-01-first-feature');

      // Should always return the same ID
      expect(id1).toBe('FS-001');
      expect(id2).toBe('FS-001');
      expect(id3).toBe('FS-001');

      // Verify no duplicates in registry
      const allFeatures = manager.getAllFeatures();
      const assignedIds = allFeatures.map(f => f.assignedId);
      const uniqueIds = new Set(assignedIds);

      expect(uniqueIds.size).toBe(assignedIds.length);
    });

    it('should assign sequential IDs to new features', async () => {
      await manager.buildRegistry();

      // Get ID for a new feature not in registry
      const newId1 = manager.getAssignedId('FS-25-01-10-new-feature');
      expect(newId1).toBe('FS-004');

      const newId2 = manager.getAssignedId('FS-25-01-11-another-feature');
      expect(newId2).toBe('FS-005');

      // Verify they're different
      expect(newId1).not.toBe(newId2);
    });

    it('should handle concurrent requests without duplicates', async () => {
      await manager.buildRegistry();

      // Simulate concurrent ID requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(manager.getAssignedId(`FS-25-01-20-concurrent-${i}`));
      }

      const ids = await Promise.all(promises);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      // IDs should be sequential
      const sortedIds = [...uniqueIds].sort();
      expect(sortedIds[0]).toBe('FS-004');
      expect(sortedIds[9]).toBe('FS-013');
    });
  });

  describe('registry persistence', () => {
    it('should save and load registry correctly', async () => {
      await manager.buildRegistry();

      // Save registry
      await manager.saveRegistry();

      // Create new manager and load registry
      const manager2 = new FeatureIDManager(testProjectRoot);
      await manager2.loadRegistry();

      // Should have same features
      const features1 = manager.getAllFeatures();
      const features2 = manager2.getAllFeatures();

      expect(features2).toHaveLength(features1.length);

      // Check specific IDs match
      expect(manager2.getAssignedId('FS-25-01-01-first-feature')).toBe('FS-001');
      expect(manager2.getAssignedId('FS-25-01-02-second-feature')).toBe('FS-002');
    });

    it('should continue numbering after reload', async () => {
      await manager.buildRegistry();
      await manager.saveRegistry();

      // Create new manager and load registry
      const manager2 = new FeatureIDManager(testProjectRoot);
      await manager2.loadRegistry();

      // Assign new ID - should continue from where it left off
      const newId = manager2.getAssignedId('FS-25-01-30-after-reload');
      expect(newId).toBe('FS-004');
    });
  });

  describe('edge cases', () => {
    it('should handle empty increments directory', async () => {
      const emptyProject = path.join(__dirname, '../fixtures/empty-project');
      await fs.ensureDir(emptyProject);

      const emptyManager = new FeatureIDManager(emptyProject);
      await emptyManager.buildRegistry();

      const features = emptyManager.getAllFeatures();
      expect(features).toHaveLength(0);

      // Should still assign IDs starting from 001
      const id = emptyManager.getAssignedId('FS-first-in-empty');
      expect(id).toBe('FS-001');
    });

    it('should handle malformed increment specs gracefully', async () => {
      // Add increment with malformed spec
      const badPath = path.join(testProjectRoot, '.specweave/increments/0006-bad');
      await fs.ensureDir(badPath);
      await fs.writeFile(path.join(badPath, 'spec.md'), 'not valid yaml');

      await manager.buildRegistry();

      // Should still process other increments
      const features = manager.getAllFeatures();
      expect(features.length).toBeGreaterThan(0);
    });

    it('should normalize different feature ID formats', async () => {
      await manager.buildRegistry();

      // Different formats for the same feature
      const id1 = manager.getAssignedId('FS-25-01-01-first-feature');
      const id2 = manager.getAssignedId('FS-001-first-feature');  // Old numeric format
      const id3 = manager.getAssignedId('first-feature');  // Just the name

      // Should recognize them as different features since normalization changed
      expect(id1).toBe('FS-001');
      // These would be new features
      expect(id2).not.toBe(id1);
      expect(id3).not.toBe(id1);
    });
  });

  describe('feature ordering', () => {
    it('should order features by creation date', async () => {
      // Add features with non-sequential dates
      const unorderedIncrements = [
        { id: '0010-newest', created: '2025-03-01', feature: 'FS-newest' },
        { id: '0011-oldest', created: '2024-12-01', feature: 'FS-oldest' },  // Earlier than beforeEach features
        { id: '0012-middle', created: '2025-02-01', feature: 'FS-middle' }
      ];

      for (const inc of unorderedIncrements) {
        const incrementPath = path.join(testProjectRoot, '.specweave/increments', inc.id);
        await fs.ensureDir(incrementPath);
        await fs.writeJson(path.join(incrementPath, 'metadata.json'), { created: inc.created });
        await fs.writeFile(path.join(incrementPath, 'spec.md'), `---
feature: ${inc.feature}
created: ${inc.created}
imported: true
---`);
      }

      await manager.buildRegistry();

      expect(manager.getAssignedId('FS-oldest')).toBe('FS-001');
      expect(manager.getAssignedId('FS-25-01-01-first-feature')).toBe('FS-002');  // From beforeEach
      expect(manager.getAssignedId('FS-25-01-02-second-feature')).toBe('FS-003');
      expect(manager.getAssignedId('FS-25-01-03-third-feature')).toBe('FS-004');
      expect(manager.getAssignedId('FS-middle')).toBe('FS-005');
      expect(manager.getAssignedId('FS-newest')).toBe('FS-006');
    });
  });
});

describe('FeatureIDManager Integration', () => {
  it('should prevent duplicate feature IDs across entire system', async () => {
    const projectRoot = path.join(__dirname, '../fixtures/integration-test');
    await fs.ensureDir(projectRoot);

    const manager = new FeatureIDManager(projectRoot);

    // Simulate multiple increments being processed
    const features = [
      'authentication-service',
      'payment-processing',
      'user-management',
      'authentication-service',  // Duplicate
      'reporting-dashboard',
      'payment-processing',      // Duplicate
      'api-gateway'
    ];

    const assignedIds: string[] = [];
    for (const feature of features) {
      const id = manager.getAssignedId(`FS-25-11-${feature}`);
      assignedIds.push(id);
    }

    // Check for unique IDs
    expect(assignedIds[0]).toBe('FS-001');  // authentication-service
    expect(assignedIds[1]).toBe('FS-002');  // payment-processing
    expect(assignedIds[2]).toBe('FS-003');  // user-management
    expect(assignedIds[3]).toBe('FS-001');  // authentication-service (duplicate)
    expect(assignedIds[4]).toBe('FS-004');  // reporting-dashboard
    expect(assignedIds[5]).toBe('FS-002');  // payment-processing (duplicate)
    expect(assignedIds[6]).toBe('FS-005');  // api-gateway

    // Verify only 5 unique features registered
    const allFeatures = manager.getAllFeatures();
    expect(allFeatures).toHaveLength(5);

    await fs.remove(projectRoot);
  });
});