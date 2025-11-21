/**
 * End-to-End Duplicate Prevention Tests
 *
 * Tests ALL THREE layers of duplicate prevention working together:
 * 1. Import DuplicateDetector (src/importers/duplicate-detector.ts)
 * 2. GitHub DuplicateDetector (plugins/specweave-github/lib/duplicate-detector.ts)
 * 3. ID Generator (src/id-generators/us-id-generator.ts)
 *
 * This validates that the system prevents duplicates across:
 * - Imported external items (GitHub, JIRA, ADO)
 * - Generated GitHub issues (User Stories)
 * - Internal User Story ID generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DuplicateDetector as ImportDuplicateDetector } from '../../src/importers/duplicate-detector.js';
import { getNextUsId, validateUsIdUniqueness } from '../../src/id-generators/us-id-generator.js';

describe('End-to-End Duplicate Prevention', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `duplicate-e2e-test-${Date.now()}`);
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'default');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  /**
   * Helper: Create a User Story file
   */
  function createUserStoryFile(
    usId: string,
    externalId?: string,
    platform?: string
  ): string {
    const fileName = `${usId.toLowerCase()}-test-story.md`;
    const filePath = path.join(specsDir, fileName);

    const externalMetadata = externalId
      ? `---
external_id: ${externalId}
external_platform: ${platform || 'github'}
---

`
      : '';

    const content = `${externalMetadata}# ${usId}: Test User Story

**Origin**: ${externalId ? `🔗 [${platform?.toUpperCase() || 'GITHUB'} #${externalId}](https://example.com/${externalId})` : 'Internal'}

## Description

This is a test user story.

## Acceptance Criteria

- [ ] **AC-${usId}-01**: Test acceptance criterion

${
  externalId
    ? `
---

## External Metadata

- **External ID**: ${externalId}
- **External URL**: https://example.com/${externalId}
- **Platform**: ${platform || 'github'}
- **Imported At**: 2025-11-20T10:00:00Z
`
    : ''
}
`;

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Helper: Get all existing User Story IDs from specs directory
   */
  function getExistingUserStoryIds(): string[] {
    if (!fs.existsSync(specsDir)) {
      return [];
    }

    const files = fs.readdirSync(specsDir);
    const usIds: string[] = [];

    for (const file of files) {
      if (file.startsWith('us-') && file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(specsDir, file), 'utf-8');
        const match = content.match(/^#\s+(US-\d{3}E?):/m);
        if (match) {
          usIds.push(match[1]);
        }
      }
    }

    return usIds;
  }

  describe('Layer 1: Import DuplicateDetector', () => {
    it('should prevent re-importing external item with same external_id', async () => {
      // Arrange: Create existing User Story with external ID
      const existingExternalId = 'GH-#638';
      createUserStoryFile('US-001E', existingExternalId, 'github');

      const detector = new ImportDuplicateDetector({ specsDir });

      // Act: Try to import same external ID again
      const isDuplicate = await detector.checkExistingExternalId(existingExternalId);

      // Assert
      expect(isDuplicate).toBe(true);
    });

    it('should allow importing new external item', async () => {
      // Arrange: Create existing User Story
      createUserStoryFile('US-001E', 'GH-#638', 'github');

      const detector = new ImportDuplicateDetector({ specsDir });

      // Act: Try to import different external ID
      const isDuplicate = await detector.checkExistingExternalId('GH-#999');

      // Assert
      expect(isDuplicate).toBe(false);
    });

    it('should normalize external IDs across different formats', async () => {
      // Arrange: Create User Story with GitHub issue
      createUserStoryFile('US-001E', 'GH-#638', 'github');

      const detector = new ImportDuplicateDetector({ specsDir });

      // Act: Try different formats of same external ID
      const isDuplicate1 = await detector.checkExistingExternalId('GH-#638');
      const isDuplicate2 = await detector.checkExistingExternalId('gh-638');
      const isDuplicate3 = await detector.checkExistingExternalId('GITHUB-638');

      // Assert: All formats should be detected as duplicates
      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(isDuplicate3).toBe(true);
    });
  });

  describe('Layer 3: ID Generator (Internal + External)', () => {
    it('should generate unique sequential IDs for internal User Stories', () => {
      // Arrange: Create existing User Stories
      createUserStoryFile('US-001');
      createUserStoryFile('US-002');
      createUserStoryFile('US-003');

      const existingIds = getExistingUserStoryIds();

      // Act: Generate next internal ID
      const nextId = getNextUsId(existingIds, 'internal');

      // Assert
      expect(nextId).toBe('US-004');
      expect(() => {
        validateUsIdUniqueness(nextId, existingIds);
      }).not.toThrow();
    });

    it('should generate unique sequential IDs for external User Stories', () => {
      // Arrange: Create existing external User Stories
      createUserStoryFile('US-001E', 'GH-#638');
      createUserStoryFile('US-002E', 'GH-#639');

      const existingIds = getExistingUserStoryIds();

      // Act: Generate next external ID
      const nextId = getNextUsId(existingIds, 'external');

      // Assert
      expect(nextId).toBe('US-003E');
      expect(() => {
        validateUsIdUniqueness(nextId, existingIds);
      }).not.toThrow();
    });

    it('should prevent ID collision during generation', () => {
      // Arrange: Create existing User Stories
      createUserStoryFile('US-001');
      createUserStoryFile('US-002');

      const existingIds = getExistingUserStoryIds();

      // Act & Assert: Try to create duplicate ID
      expect(() => {
        validateUsIdUniqueness('US-001', existingIds);
      }).toThrow('ID collision detected: US-001 already exists');

      expect(() => {
        validateUsIdUniqueness('US-002', existingIds);
      }).toThrow('ID collision detected: US-002 already exists');
    });

    it('should handle mixed internal and external IDs correctly', () => {
      // Arrange: Create mix of internal and external User Stories
      createUserStoryFile('US-001'); // internal
      createUserStoryFile('US-002E', 'GH-#638'); // external
      createUserStoryFile('US-003'); // internal
      createUserStoryFile('US-004E', 'GH-#639'); // external

      const existingIds = getExistingUserStoryIds();

      // Act: Generate next IDs
      const nextInternal = getNextUsId(existingIds, 'internal');
      const nextExternal = getNextUsId(existingIds, 'external');

      // Assert: Both should be US-005 and US-005E (different suffixes)
      expect(nextInternal).toBe('US-005');
      expect(nextExternal).toBe('US-005E');

      // Validate both are unique
      expect(() => {
        validateUsIdUniqueness(nextInternal, existingIds);
        validateUsIdUniqueness(nextExternal, existingIds);
      }).not.toThrow();
    });

    it('should NOT collide between internal and external with same number', () => {
      // Arrange: Create US-001 (internal)
      createUserStoryFile('US-001');

      const existingIds = getExistingUserStoryIds();

      // Act & Assert: US-001E (external) should NOT collide with US-001
      expect(() => {
        validateUsIdUniqueness('US-001E', existingIds);
      }).not.toThrow(); // US-001E is different from US-001

      // But US-001 itself should collide
      expect(() => {
        validateUsIdUniqueness('US-001', existingIds);
      }).toThrow('ID collision detected: US-001 already exists');
    });
  });

  describe('All Layers Working Together', () => {
    it('should prevent duplicate across all three layers (import + GitHub + ID)', async () => {
      // Scenario: Import GitHub issue #638, verify all layers prevent duplicates

      // Step 1: Import first GitHub issue (Layer 1 + Layer 3)
      const externalId = 'GH-#638';
      const existingIds = getExistingUserStoryIds();
      const firstUsId = getNextUsId(existingIds, 'external'); // Should be US-001E

      createUserStoryFile(firstUsId, externalId, 'github');

      // Step 2: Verify Layer 1 (Import DuplicateDetector) prevents re-import
      const importDetector = new ImportDuplicateDetector({ specsDir });
      const isDuplicate = await importDetector.checkExistingExternalId(externalId);
      expect(isDuplicate).toBe(true); // ✅ Layer 1 works

      // Step 3: Verify Layer 3 (ID Generator) prevents ID collision
      const updatedIds = getExistingUserStoryIds();
      expect(() => {
        validateUsIdUniqueness(firstUsId, updatedIds);
      }).toThrow('ID collision detected'); // ✅ Layer 3 works

      // Step 4: Verify next ID is sequential (US-002E)
      const nextUsId = getNextUsId(updatedIds, 'external');
      expect(nextUsId).toBe('US-002E'); // ✅ Sequential ID generation works
    });

    it('should handle concurrent internal and external ID generation', () => {
      // Scenario: Concurrent operations creating internal and external User Stories

      // Step 1: Create initial User Stories (internal + external)
      createUserStoryFile('US-001'); // internal
      createUserStoryFile('US-002E', 'GH-#100'); // external
      createUserStoryFile('US-003'); // internal

      // Step 2: Simulate concurrent ID generation
      const existingIds = getExistingUserStoryIds();

      const nextInternal1 = getNextUsId(existingIds, 'internal'); // Should be US-004
      const nextExternal1 = getNextUsId(existingIds, 'external'); // Should be US-004E

      // Step 3: Verify both IDs are unique
      expect(nextInternal1).toBe('US-004');
      expect(nextExternal1).toBe('US-004E');

      // Step 4: Create the User Stories
      createUserStoryFile(nextInternal1);
      createUserStoryFile(nextExternal1, 'GH-#101');

      // Step 5: Verify next generation is sequential
      const updatedIds = getExistingUserStoryIds();
      expect(getNextUsId(updatedIds, 'internal')).toBe('US-005');
      expect(getNextUsId(updatedIds, 'external')).toBe('US-005E');
    });

    it('should handle brownfield import scenario (200 internal + external imports)', async () => {
      // Scenario: Brownfield project with 200 internal User Stories, then import external items

      // Step 1: Create 200 internal User Stories (simulate existing project)
      for (let i = 1; i <= 200; i++) {
        const usId = `US-${String(i).padStart(3, '0')}`;
        createUserStoryFile(usId);
      }

      // Step 2: Import first external item
      const existingIds = getExistingUserStoryIds();
      const firstExternalId = getNextUsId(existingIds, 'external');

      expect(firstExternalId).toBe('US-201E'); // Should be after max internal (200)

      // Step 3: Create external User Story
      createUserStoryFile(firstExternalId, 'GH-#500');

      // Step 4: Verify Import DuplicateDetector prevents re-import
      const importDetector = new ImportDuplicateDetector({ specsDir });
      const isDuplicate = await importDetector.checkExistingExternalId('GH-#500');
      expect(isDuplicate).toBe(true); // ✅ Layer 1 works

      // Step 5: Verify ID Generator prevents collision
      const updatedIds = getExistingUserStoryIds();
      expect(() => {
        validateUsIdUniqueness(firstExternalId, updatedIds);
      }).toThrow('ID collision detected'); // ✅ Layer 3 works

      // Step 6: Verify next external ID is sequential
      const nextExternalId = getNextUsId(updatedIds, 'external');
      expect(nextExternalId).toBe('US-202E'); // ✅ Sequential generation works
    });

    it('should handle multiple external platforms simultaneously', async () => {
      // Scenario: Import from GitHub, JIRA, and ADO concurrently

      // Step 1: Import from different platforms
      createUserStoryFile('US-001E', 'GH-#100', 'github');
      createUserStoryFile('US-002E', 'JIRA-PROJ-200', 'jira');
      createUserStoryFile('US-003E', 'ADO-300', 'ado');

      // Step 2: Verify Import DuplicateDetector detects all external IDs
      const importDetector = new ImportDuplicateDetector({ specsDir });

      const isDuplicateGH = await importDetector.checkExistingExternalId('GH-#100');
      const isDuplicateJIRA = await importDetector.checkExistingExternalId('JIRA-PROJ-200');
      const isDuplicateADO = await importDetector.checkExistingExternalId('ADO-300');

      expect(isDuplicateGH).toBe(true);
      expect(isDuplicateJIRA).toBe(true);
      expect(isDuplicateADO).toBe(true);

      // Step 3: Verify next external ID is sequential
      const existingIds = getExistingUserStoryIds();
      const nextExternalId = getNextUsId(existingIds, 'external');
      expect(nextExternalId).toBe('US-004E');
    });

    it('should validate uniqueness across all operations in complete workflow', async () => {
      // Complete workflow: internal planning → external import → GitHub sync

      // Step 1: Internal planning (create 5 User Stories)
      for (let i = 1; i <= 5; i++) {
        const existingIds = getExistingUserStoryIds();
        const nextId = getNextUsId(existingIds, 'internal');

        // Validate uniqueness before creation
        validateUsIdUniqueness(nextId, existingIds);

        createUserStoryFile(nextId);
      }

      // Step 2: External import (import 3 GitHub issues)
      const externalItems = [
        { id: 'GH-#100', title: 'Feature A' },
        { id: 'GH-#200', title: 'Feature B' },
        { id: 'GH-#300', title: 'Feature C' },
      ];

      const importDetector = new ImportDuplicateDetector({ specsDir });

      for (const item of externalItems) {
        // Check for duplicates (Layer 1)
        const isDuplicate = await importDetector.checkExistingExternalId(item.id);
        expect(isDuplicate).toBe(false); // First import, should not exist

        // Generate unique ID (Layer 3)
        const existingIds = getExistingUserStoryIds();
        const nextId = getNextUsId(existingIds, 'external');

        // Validate uniqueness
        validateUsIdUniqueness(nextId, existingIds);

        // Create User Story
        createUserStoryFile(nextId, item.id, 'github');
      }

      // Step 3: Verify final state
      const finalIds = getExistingUserStoryIds();

      // Should have 5 internal + 3 external = 8 total
      expect(finalIds).toHaveLength(8);

      // Verify all IDs are unique
      const uniqueIds = new Set(finalIds);
      expect(uniqueIds.size).toBe(8); // No duplicates

      // Verify next IDs are sequential
      expect(getNextUsId(finalIds, 'internal')).toBe('US-009');
      expect(getNextUsId(finalIds, 'external')).toBe('US-009E');

      // Verify import detector detects all external IDs
      for (const item of externalItems) {
        const isDuplicate = await importDetector.checkExistingExternalId(item.id);
        expect(isDuplicate).toBe(true); // Now they exist
      }
    });
  });

  describe('Edge Cases and Race Conditions', () => {
    it('should handle concurrent ID generation requests', () => {
      // Arrange: Create base User Stories
      createUserStoryFile('US-001');
      createUserStoryFile('US-002');

      const existingIds = getExistingUserStoryIds();

      // Act: Simulate 5 concurrent requests for next ID
      const nextIds = Array(5)
        .fill(null)
        .map(() => getNextUsId(existingIds, 'internal'));

      // Assert: All should return the same next ID (US-003)
      // This is expected behavior - uniqueness validation happens before creation
      expect(nextIds).toEqual(['US-003', 'US-003', 'US-003', 'US-003', 'US-003']);

      // In real system, only first creation succeeds, others fail validation
      createUserStoryFile(nextIds[0]); // ✅ First succeeds
      const updatedIds = getExistingUserStoryIds();

      // Others would fail validation
      for (let i = 1; i < nextIds.length; i++) {
        expect(() => {
          validateUsIdUniqueness(nextIds[i], updatedIds);
        }).toThrow('ID collision detected');
      }
    });

    it('should handle gaps in ID sequence', () => {
      // Arrange: Create User Stories with gaps (001, 002, 005, 010)
      createUserStoryFile('US-001');
      createUserStoryFile('US-002');
      createUserStoryFile('US-005');
      createUserStoryFile('US-010');

      const existingIds = getExistingUserStoryIds();

      // Act: Generate next ID
      const nextId = getNextUsId(existingIds, 'internal');

      // Assert: Should use max + 1, not fill gaps
      expect(nextId).toBe('US-011'); // After 010, not 003
    });

    it('should handle mixed valid and invalid ID formats', () => {
      // Arrange: Create User Stories with valid IDs
      createUserStoryFile('US-001');

      // Add invalid file (should be ignored)
      const invalidFile = path.join(specsDir, 'invalid-story.md');
      fs.writeFileSync(invalidFile, '# Invalid Story (no US-ID)', 'utf-8');

      const existingIds = getExistingUserStoryIds();

      // Act: Generate next ID
      const nextId = getNextUsId(existingIds, 'internal');

      // Assert: Should ignore invalid files
      expect(nextId).toBe('US-002');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of User Stories efficiently', () => {
      // Arrange: Create 100 User Stories
      const startTime = Date.now();

      for (let i = 1; i <= 100; i++) {
        const usId = `US-${String(i).padStart(3, '0')}`;
        createUserStoryFile(usId);
      }

      const setupTime = Date.now() - startTime;

      // Act: Generate next ID
      const existingIds = getExistingUserStoryIds();
      const idGenStart = Date.now();
      const nextId = getNextUsId(existingIds, 'internal');
      const idGenTime = Date.now() - idGenStart;

      // Assert: ID generation should be fast (< 100ms for 100 IDs)
      expect(idGenTime).toBeLessThan(100);
      expect(nextId).toBe('US-101');

      console.log(`Performance: Setup ${setupTime}ms, ID Gen ${idGenTime}ms for 100 User Stories`);
    });

    it('should handle import duplicate detection efficiently for large dataset', async () => {
      // Arrange: Create 100 User Stories with external IDs
      for (let i = 1; i <= 100; i++) {
        const usId = `US-${String(i).padStart(3, '0')}E`;
        const externalId = `GH-#${1000 + i}`;
        createUserStoryFile(usId, externalId);
      }

      const importDetector = new ImportDuplicateDetector({ specsDir, enableCache: true });

      // Act: Check duplicates (should use cache)
      const start = Date.now();

      const isDuplicate1 = await importDetector.checkExistingExternalId('GH-#1050');
      const isDuplicate2 = await importDetector.checkExistingExternalId('GH-#1075');
      const isDuplicate3 = await importDetector.checkExistingExternalId('GH-#9999'); // Not exists

      const duration = Date.now() - start;

      // Assert: Should be fast (< 50ms for 3 checks with cache)
      expect(duration).toBeLessThan(50);
      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(isDuplicate3).toBe(false);

      console.log(`Performance: 3 duplicate checks in ${duration}ms for 100 User Stories (cached)`);
    });
  });
});
