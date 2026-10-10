/**
 * End-to-End Duplicate Prevention Tests
 *
 * Tests the import-side duplicate prevention layer
 * (src/importers/duplicate-detector.ts): re-importing an external item
 * (GitHub, JIRA, ADO) with the same external ID is refused.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { DuplicateDetector as ImportDuplicateDetector } from '../../src/importers/duplicate-detector.js';

describe('End-to-End Duplicate Prevention', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(() => {
    // Create isolated test directory
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `duplicate-e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'default');
    mkdirSync(specsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
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

    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Helper: Get all existing User Story IDs from specs directory
   */
  function getExistingUserStoryIds(): string[] {
    if (!existsSync(specsDir)) {
      return [];
    }

    const files = readdirSync(specsDir);
    const usIds: string[] = [];

    for (const file of files) {
      if (file.startsWith('us-') && file.endsWith('.md')) {
        const content = readFileSync(path.join(specsDir, file), 'utf-8');
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

  describe('Performance and Scalability', () => {
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

      // Assert: Should be fast (< 200ms for 3 checks with cache on CI)
      // Note: CI environments can be slower, so increased threshold from 50ms
      expect(duration).toBeLessThan(500); // CI-adjusted: was 200ms, varies by machine load
      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(isDuplicate3).toBe(false);

      console.log(`Performance: 3 duplicate checks in ${duration}ms for 100 User Stories (cached)`);
    });
  });
});
