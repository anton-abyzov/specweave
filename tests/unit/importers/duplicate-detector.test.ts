/**
 * Unit tests for Duplicate Detector
 *
 * Tests cover:
 * - TC-106: Detect existing external ID
 * - TC-107: Allow new external ID
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  DuplicateDetector,
  checkExistingExternalId,
  type ExternalIdReference,
} from '../../../src/importers/duplicate-detector.js';

describe('Duplicate Detector', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `duplicate-detector-test-${Date.now()}`);
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  /**
   * Helper: Create a User Story file with external metadata
   */
  function createUserStoryFile(
    usId: string,
    externalId: string,
    platform: string = 'github'
  ): string {
    const fileName = `${usId.toLowerCase()}-test-story.md`;
    const filePath = path.join(specsDir, fileName);

    const content = `# ${usId}: Test User Story

**Origin**: 🔗 [${platform.toUpperCase()} #${externalId}](https://example.com/${externalId})

## Description

This is a test user story.

## Acceptance Criteria

- [ ] **AC-${usId}-01**: Test acceptance criterion

---

## External Metadata

- **External ID**: ${externalId}
- **External URL**: https://example.com/${externalId}
- **Platform**: ${platform}
- **Imported At**: 2025-11-19T10:00:00Z
`;

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Helper: Create a User Story file with frontmatter
   */
  function createUserStoryFileWithFrontmatter(
    usId: string,
    externalId: string,
    platform: string = 'github'
  ): string {
    const fileName = `${usId.toLowerCase()}-test-story.md`;
    const filePath = path.join(specsDir, fileName);

    const content = `---
external_id: ${externalId}
external_platform: ${platform}
---

# ${usId}: Test User Story

**Origin**: 🔗 [${platform.toUpperCase()} #${externalId}](https://example.com/${externalId})

## Description

This is a test user story with frontmatter.
`;

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  describe('TC-106: Detect existing external ID', () => {
    it('should detect duplicate when external ID exists in markdown content', async () => {
      // Arrange
      const externalId = 'GH-#638';
      createUserStoryFile('US-042E', externalId, 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const isDuplicate = await detector.checkExistingExternalId(externalId);

      // Assert
      expect(isDuplicate).toBe(true);
    });

    it('should detect duplicate when external ID exists in frontmatter', async () => {
      // Arrange
      const externalId = 'GH-#999';
      createUserStoryFileWithFrontmatter('US-099E', externalId, 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const isDuplicate = await detector.checkExistingExternalId(externalId);

      // Assert
      expect(isDuplicate).toBe(true);
    });

    it('should find external ID reference with correct details', async () => {
      // Arrange
      const externalId = 'GH-#638';
      const filePath = createUserStoryFile('US-042E', externalId, 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const reference = await detector.findExternalIdReference(externalId);

      // Assert
      expect(reference).toBeDefined();
      expect(reference?.usId).toBe('US-042E');
      expect(reference?.externalId).toBe(externalId);
      expect(reference?.filePath).toBe(filePath);
      // Platform may not be extracted from markdown content (only from frontmatter)
    });

    it('should normalize external IDs for comparison', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act - Try different formats of same external ID
      const isDuplicate1 = await detector.checkExistingExternalId('GH-#638');
      const isDuplicate2 = await detector.checkExistingExternalId('gh-638');
      const isDuplicate3 = await detector.checkExistingExternalId('GITHUB-638');

      // Assert
      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(isDuplicate3).toBe(true);
    });

    it('should handle multiple User Stories with different external IDs', async () => {
      // Arrange
      createUserStoryFile('US-001E', 'GH-#100', 'github');
      createUserStoryFile('US-002E', 'GH-#200', 'github');
      createUserStoryFile('US-003E', 'JIRA-PROJ-300', 'jira');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const isDuplicate1 = await detector.checkExistingExternalId('GH-#100');
      const isDuplicate2 = await detector.checkExistingExternalId('GH-#200');
      const isDuplicate3 = await detector.checkExistingExternalId('JIRA-PROJ-300');

      // Assert
      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(isDuplicate3).toBe(true);
    });
  });

  describe('TC-107: Allow new external ID', () => {
    it('should return false when external ID does not exist', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const isDuplicate = await detector.checkExistingExternalId('GH-#999');

      // Assert
      expect(isDuplicate).toBe(false);
    });

    it('should return null when external ID reference not found', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const reference = await detector.findExternalIdReference('GH-#999');

      // Assert
      expect(reference).toBeNull();
    });

    it('should return false when specs directory is empty', async () => {
      // Arrange
      const detector = new DuplicateDetector({ specsDir });

      // Act
      const isDuplicate = await detector.checkExistingExternalId('GH-#638');

      // Assert
      expect(isDuplicate).toBe(false);
    });

    it('should return false when specs directory does not exist', async () => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'non-existent');
      const detector = new DuplicateDetector({ specsDir: nonExistentDir });

      // Act
      const isDuplicate = await detector.checkExistingExternalId('GH-#638');

      // Assert
      expect(isDuplicate).toBe(false);
    });
  });

  describe('getAllExternalIds', () => {
    it('should return all external IDs in living docs', async () => {
      // Arrange
      createUserStoryFile('US-001E', 'GH-#100', 'github');
      createUserStoryFile('US-002E', 'GH-#200', 'github');
      createUserStoryFile('US-003E', 'JIRA-PROJ-300', 'jira');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const allExternalIds = await detector.getAllExternalIds();

      // Assert
      expect(allExternalIds.size).toBe(3);
      expect(allExternalIds.has('gh-100')).toBe(true);
      expect(allExternalIds.has('gh-200')).toBe(true);
      expect(allExternalIds.has('jira-proj-300')).toBe(true);
    });

    it('should return empty map when no User Stories exist', async () => {
      // Arrange
      const detector = new DuplicateDetector({ specsDir });

      // Act
      const allExternalIds = await detector.getAllExternalIds();

      // Assert
      expect(allExternalIds.size).toBe(0);
    });
  });

  describe('Cache functionality', () => {
    it('should cache external ID map when cache is enabled', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir, enableCache: true });

      // Act
      await detector.checkExistingExternalId('GH-#638');
      const stats1 = detector.getCacheStats();

      await detector.checkExistingExternalId('GH-#999');
      const stats2 = detector.getCacheStats();

      // Assert
      expect(stats1.enabled).toBe(true);
      expect(stats1.size).toBe(1);
      expect(stats2.size).toBe(1); // Cache size unchanged (reused)
    });

    it('should not cache when cache is disabled', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir, enableCache: false });

      // Act
      await detector.checkExistingExternalId('GH-#638');
      const stats = detector.getCacheStats();

      // Assert
      expect(stats.enabled).toBe(false);
      expect(stats.size).toBe(0);
    });

    it('should clear cache when requested', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir, enableCache: true });

      // Act
      await detector.checkExistingExternalId('GH-#638');
      const statsBefore = detector.getCacheStats();

      detector.clearCache();
      const statsAfter = detector.getCacheStats();

      // Assert
      expect(statsBefore.size).toBe(1);
      expect(statsAfter.size).toBe(0);
    });

    it('should rebuild cache after clearing', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      const detector = new DuplicateDetector({ specsDir, enableCache: true });

      // Act
      await detector.checkExistingExternalId('GH-#638');
      detector.clearCache();
      await detector.checkExistingExternalId('GH-#638');
      const stats = detector.getCacheStats();

      // Assert
      expect(stats.size).toBe(1);
    });
  });

  describe('Convenience function', () => {
    it('should work via convenience function', async () => {
      // Arrange
      createUserStoryFile('US-042E', 'GH-#638', 'github');

      // Act
      const isDuplicate = await checkExistingExternalId('GH-#638', specsDir);

      // Assert
      expect(isDuplicate).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle User Stories without external metadata', async () => {
      // Arrange
      const fileName = 'us-001e-no-external.md';
      const filePath = path.join(specsDir, fileName);
      const content = `# US-001E: User Story Without External Metadata

This story has no external metadata.
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const allExternalIds = await detector.getAllExternalIds();

      // Assert
      expect(allExternalIds.size).toBe(0);
    });

    it('should handle malformed User Story files gracefully', async () => {
      // Arrange
      const fileName = 'us-002e-malformed.md';
      const filePath = path.join(specsDir, fileName);
      const content = `This is not a valid User Story file`;
      fs.writeFileSync(filePath, content, 'utf-8');

      const detector = new DuplicateDetector({ specsDir });

      // Act & Assert - Should not throw
      const isDuplicate = await detector.checkExistingExternalId('GH-#999');
      expect(isDuplicate).toBe(false);
    });

    it('should handle non-markdown files in specs directory', async () => {
      // Arrange
      const txtFile = path.join(specsDir, 'README.txt');
      fs.writeFileSync(txtFile, 'This is a text file', 'utf-8');

      createUserStoryFile('US-001E', 'GH-#100', 'github');

      const detector = new DuplicateDetector({ specsDir });

      // Act
      const allExternalIds = await detector.getAllExternalIds();

      // Assert
      expect(allExternalIds.size).toBe(1); // Only the .md file
    });
  });
});
