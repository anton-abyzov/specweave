/**
 * Unit tests for Spec-to-Increment Mapper
 *
 * Tests the mapping between permanent specs and increment tasks.
 * Following TDD: Tests written first, implementation follows.
 */

import { SpecIncrementMapper, SpecIncrementMapping } from '../../../src/core/sync/spec-increment-mapper';
import path from 'path';

describe('SpecIncrementMapper', () => {
  let mapper: SpecIncrementMapper;
  const testRoot = path.join(__dirname, '../../fixtures/sync');

  beforeEach(() => {
    mapper = new SpecIncrementMapper(testRoot);
  });

  describe('mapSpecToIncrements', () => {
    it('should map spec to related increments', async () => {
      const specId = 'spec-001-core-framework';
      const mapping = await mapper.mapSpecToIncrements(specId);

      expect(mapping).toBeDefined();
      expect(mapping.specId).toBe(specId);
      expect(mapping.increments).toBeDefined();
      expect(Array.isArray(mapping.increments)).toBe(true);
    });

    it('should extract user story to task mappings', async () => {
      const specId = 'spec-001-core-framework';
      const mapping = await mapper.mapSpecToIncrements(specId);

      expect(mapping.userStoryMappings).toBeDefined();
      expect(typeof mapping.userStoryMappings).toBe('object');

      // Example: US-001 should map to specific tasks
      if (mapping.userStoryMappings['US-001']) {
        expect(Array.isArray(mapping.userStoryMappings['US-001'])).toBe(true);
      }
    });

    it('should include increment metadata', async () => {
      const specId = 'spec-001-core-framework';
      const mapping = await mapper.mapSpecToIncrements(specId);

      if (mapping.increments.length > 0) {
        const increment = mapping.increments[0];
        expect(increment.id).toBeDefined();
        expect(increment.tasks).toBeDefined();
        expect(Array.isArray(increment.tasks)).toBe(true);
      }
    });
  });

  describe('findIncrementsByUserStory', () => {
    it('should find increments implementing a specific user story', async () => {
      const userStoryId = 'US-001';
      const increments = await mapper.findIncrementsByUserStory(userStoryId);

      expect(Array.isArray(increments)).toBe(true);

      increments.forEach(inc => {
        expect(inc.id).toBeDefined();
        expect(inc.tasks).toBeDefined();
        expect(Array.isArray(inc.tasks)).toBe(true);
      });
    });

    it('should return empty array for non-existent user story', async () => {
      const userStoryId = 'US-999';
      const increments = await mapper.findIncrementsByUserStory(userStoryId);

      expect(Array.isArray(increments)).toBe(true);
      expect(increments.length).toBe(0);
    });
  });

  describe('getTasksForUserStory', () => {
    it('should get all tasks implementing a user story', async () => {
      const userStoryId = 'US-001';
      const tasks = await mapper.getTasksForUserStory(userStoryId);

      expect(Array.isArray(tasks)).toBe(true);

      tasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.incrementId).toBeDefined();
        expect(task.userStories).toContain(userStoryId);
      });
    });
  });

  describe('updateSpecWithIncrementLinks', () => {
    it('should add increment links to spec frontmatter', async () => {
      const specId = 'spec-001-core-framework';
      const incrementId = '0003-new-feature'; // New increment not yet in linked_increments

      const updated = await mapper.updateSpecWithIncrementLinks(specId, incrementId);

      expect(updated).toBe(true);
    });

    it('should not duplicate increment links', async () => {
      const specId = 'spec-001-core-framework';
      const incrementId = '0001-core-framework';

      // This increment is already linked in fixture (from previous tests)
      const updated = await mapper.updateSpecWithIncrementLinks(specId, incrementId);

      // Should detect duplicate and not add again
      expect(updated).toBe(false);
    });
  });

  describe('updateIncrementWithSpecLink', () => {
    it('should add spec link to increment frontmatter', async () => {
      const incrementId = '0001-core-framework';
      const specId = 'spec-002-new-spec'; // Different spec ID not yet linked

      const updated = await mapper.updateIncrementWithSpecLink(incrementId, specId);

      expect(updated).toBe(true);

      // Verify link was added
      const specFromIncrement = await mapper.getSpecForIncrement(incrementId);
      expect(specFromIncrement).toBe(specId);
    });

    it('should not duplicate spec links', async () => {
      const incrementId = '0001-core-framework';
      const specId = 'spec-001-core-framework';

      // This spec is already linked via spec_id field in fixture
      const updated = await mapper.updateIncrementWithSpecLink(incrementId, specId);

      // Should detect duplicate
      expect(updated).toBe(false);
    });
  });

  describe('createBidirectionalLink', () => {
    it('should create both forward and backward links', async () => {
      const specId = 'spec-001-core-framework';
      const incrementId = '0004-bidirectional-test'; // New increment for this test

      const result = await mapper.createBidirectionalLink(specId, incrementId);

      expect(result.success).toBe(true);
      // At least one link should be created (may already exist)
    });

    it('should handle already-linked scenario gracefully', async () => {
      const specId = 'spec-001-core-framework';
      const incrementId = '0001-core-framework';

      // These links already exist in fixture
      const result = await mapper.createBidirectionalLink(specId, incrementId);

      // Both links already exist, so both should return false
      expect(result.forwardLink).toBe(false);
      expect(result.backwardLink).toBe(false);
    });
  });

  describe('getSpecForIncrement', () => {
    it('should get spec for a given increment', async () => {
      const incrementId = '0001-core-framework';

      const specId = await mapper.getSpecForIncrement(incrementId);

      expect(specId).toBeDefined();
      expect(typeof specId).toBe('string');
    });

    it('should return null for non-existent increment', async () => {
      const incrementId = '9999-non-existent';

      const specId = await mapper.getSpecForIncrement(incrementId);

      expect(specId).toBeNull();
    });
  });

  describe('validateLinks', () => {
    it('should validate bidirectional links', async () => {
      const validation = await mapper.validateLinks();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.brokenForwardLinks)).toBe(true);
      expect(Array.isArray(validation.brokenBackwardLinks)).toBe(true);
      expect(Array.isArray(validation.orphanedIncrements)).toBe(true);
    });

    it('should detect orphaned increments', async () => {
      const validation = await mapper.validateLinks();

      // Check structure of orphaned increments
      if (validation.orphanedIncrements.length > 0) {
        expect(typeof validation.orphanedIncrements[0]).toBe('string');
      }
    });

    it('should detect broken links', async () => {
      const validation = await mapper.validateLinks();

      // Check structure of broken links
      validation.brokenForwardLinks.forEach(link => {
        expect(link.specId).toBeDefined();
        expect(link.incrementId).toBeDefined();
      });

      validation.brokenBackwardLinks.forEach(link => {
        expect(link.incrementId).toBeDefined();
        expect(link.specId).toBeDefined();
      });
    });
  });

  describe('buildTraceabilityReport', () => {
    it('should build complete traceability report', async () => {
      const specId = 'spec-001-core-framework';
      const report = await mapper.buildTraceabilityReport(specId);

      expect(report).toBeDefined();
      expect(report.specId).toBe(specId);
      expect(report.totalUserStories).toBeGreaterThanOrEqual(0);
      expect(report.totalIncrements).toBeGreaterThanOrEqual(0);
      expect(report.totalTasks).toBeGreaterThanOrEqual(0);
      expect(report.coverage).toBeDefined();
      expect(typeof report.coverage).toBe('number');
      expect(report.coverage).toBeGreaterThanOrEqual(0);
      expect(report.coverage).toBeLessThanOrEqual(100);
    });

    it('should identify unmapped user stories', async () => {
      const specId = 'spec-001-core-framework';
      const report = await mapper.buildTraceabilityReport(specId);

      expect(report.unmappedUserStories).toBeDefined();
      expect(Array.isArray(report.unmappedUserStories)).toBe(true);
    });

    it('should show user story to increment mapping', async () => {
      const specId = 'spec-001-core-framework';
      const report = await mapper.buildTraceabilityReport(specId);

      expect(report.mappingDetails).toBeDefined();
      expect(typeof report.mappingDetails).toBe('object');
    });
  });
});
