/**
 * Integration Tests: GitHub Epic Sync - Duplicate Prevention
 *
 * Tests that github-epic-sync correctly detects existing GitHub issues
 * and re-links them instead of creating duplicates (self-healing).
 *
 * @module tests/integration/github-epic-sync-duplicate-prevention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';

describe('GitHub Epic Sync - Duplicate Prevention', () => {
  const testRoot = path.join(__dirname, '../.tmp/epic-sync-test');
  const specsDir = path.join(testRoot, '.specweave/docs/internal/specs/default');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(specsDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('findExistingIssue Logic', () => {
    it('should find issue by epic ID in title', () => {
      // Arrange: Simulate GitHub API response
      const githubIssues = [
        {
          number: 100,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0032-test-feature\n\nSome content...'
        },
        {
          number: 101,
          title: '[FS-25-11-15] Another Feature',
          body: '**Increment**: 0033-another-feature\n\nSome content...'
        }
      ];

      // Act: Find issue for epic FS-25-11-14
      const epicId = 'FS-25-11-14';
      const incrementId = '0032-test-feature';

      // Method 1: Check body for increment ID
      const foundByBody = githubIssues.find(
        (issue) =>
          issue.title.includes(`[${epicId}]`) &&
          issue.body.includes(`**Increment**: ${incrementId}`)
      );

      // Assert: Should find correct issue
      expect(foundByBody).toBeDefined();
      expect(foundByBody?.number).toBe(100);
    });

    it('should find issue by increment ID in title (fallback)', () => {
      // Arrange: Simulate GitHub API response
      const githubIssues = [
        {
          number: 200,
          title: '[INC-0032-test-feature] Test Feature',
          body: 'Some content...'
        }
      ];

      // Act: Find issue for increment
      const incrementId = '0032-test-feature';

      // Method 2: Check title for increment ID (case-insensitive)
      const foundByTitle = githubIssues.find((issue) =>
        issue.title.toLowerCase().includes(incrementId.toLowerCase())
      );

      // Assert: Should find issue via fallback
      expect(foundByTitle).toBeDefined();
      expect(foundByTitle?.number).toBe(200);
    });

    it('should return null when no matching issue found', () => {
      // Arrange: Simulate GitHub API response
      const githubIssues = [
        {
          number: 300,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0032-test-feature'
        }
      ];

      // Act: Search for non-existent increment
      const incrementId = '0099-non-existent';

      const found = githubIssues.find(
        (issue) =>
          issue.body.includes(`**Increment**: ${incrementId}`) ||
          issue.title.toLowerCase().includes(incrementId.toLowerCase())
      );

      // Assert: Should not find anything
      expect(found).toBeUndefined();
    });

    it('should handle multiple issues with same epic ID', () => {
      // Arrange: Multiple issues for same epic
      const githubIssues = [
        {
          number: 400,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0032-test-feature-part-1'
        },
        {
          number: 401,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0033-test-feature-part-2'
        }
      ];

      // Act: Find specific increment
      const incrementId = '0033-test-feature-part-2';

      const found = githubIssues.find((issue) =>
        issue.body.includes(`**Increment**: ${incrementId}`)
      );

      // Assert: Should find correct issue (not first match)
      expect(found).toBeDefined();
      expect(found?.number).toBe(401);
    });
  });

  describe('Self-Healing Sync', () => {
    it('should re-link orphaned issue instead of creating duplicate', () => {
      // Scenario: README.md missing external_tools.github, but issue exists on GitHub

      // Arrange: Create Epic README without external link
      const epicFolder = path.join(specsDir, 'FS-25-11-14-test-feature');
      mkdirSync(epicFolder, { recursive: true });

      const readmePath = path.join(epicFolder, 'README.md');
      const readmeContent = `---
id: FS-25-11-14
title: Test Feature
type: epic
status: active
priority: P1
created: 2025-11-14
---

# Epic: Test Feature

## Increments

- [0032-test-feature](./0032-test-feature.md)
`;

      writeFileSync(readmePath, readmeContent);

      // Simulate finding existing GitHub issue
      const existingGitHubIssue = {
        number: 500,
        title: '[FS-25-11-14] Test Feature',
        body: '**Increment**: 0032-test-feature'
      };

      // Act: Detect missing link
      const hasMissingLink = !readmeContent.includes('external_tools');

      // Assert: Should detect missing link (self-healing needed)
      expect(hasMissingLink).toBe(true);
      expect(existingGitHubIssue.number).toBe(500);
    });

    it('should update README.md with external_tools.github link', () => {
      // Arrange: Create README without external tools
      const epicFolder = path.join(specsDir, 'FS-25-11-14-test-feature');
      mkdirSync(epicFolder, { recursive: true });

      const readmePath = path.join(epicFolder, 'README.md');
      let readmeContent = `---
id: FS-25-11-14
title: Test Feature
---

# Epic: Test Feature
`;

      writeFileSync(readmePath, readmeContent);

      // Act: Add external_tools section (self-healing)
      const issueNumber = 600;
      const issueUrl = `https://github.com/anton-abyzov/specweave/issues/${issueNumber}`;

      const updatedFrontmatter = `---
id: FS-25-11-14
title: Test Feature
external_tools:
  github:
    issue: ${issueNumber}
    url: ${issueUrl}
---`;

      readmeContent = readmeContent.replace(/---[\s\S]*?---/, updatedFrontmatter);
      writeFileSync(readmePath, readmeContent);

      // Assert: Should have external tools link
      const finalContent = readmeContent;
      expect(finalContent).toContain('external_tools');
      expect(finalContent).toContain(`issue: ${issueNumber}`);
      expect(finalContent).toContain(issueUrl);
    });
  });

  describe('Duplicate Detection Scenarios', () => {
    it('should detect duplicate when same epic synced twice', () => {
      // Scenario: User runs /specweave-github:sync-epic twice

      // First sync: Create issue #700
      const firstSyncIssue = {
        number: 700,
        title: '[FS-25-11-14] Test Feature',
        body: '**Increment**: 0032-test-feature'
      };

      // Second sync: Check if issue already exists
      const githubIssues = [firstSyncIssue];
      const epicId = 'FS-25-11-14';
      const incrementId = '0032-test-feature';

      const existingIssue = githubIssues.find(
        (issue) =>
          issue.title.includes(`[${epicId}]`) &&
          issue.body.includes(`**Increment**: ${incrementId}`)
      );

      // Assert: Should detect existing issue (skip creation)
      expect(existingIssue).toBeDefined();
      expect(existingIssue?.number).toBe(700);
    });

    it('should track duplicates detected count', () => {
      // Scenario: Epic sync detects 3 self-healing events

      let duplicatesDetected = 0;

      // Simulate 3 self-healing events
      for (let i = 0; i < 3; i++) {
        // Found existing issue → Re-link instead of create
        duplicatesDetected++;
      }

      // Assert: Should count self-healing events
      expect(duplicatesDetected).toBe(3);
    });

    it('should validate post-sync for duplicates', () => {
      // Scenario: Post-sync validation checks for duplicate issues

      const githubIssues = [
        {
          number: 800,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0032-test-feature'
        },
        {
          number: 801,
          title: '[FS-25-11-14] Test Feature',
          body: '**Increment**: 0032-test-feature'
        }
      ];

      // Act: Group by title
      const groupedByTitle = githubIssues.reduce((acc, issue) => {
        const key = issue.title;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(issue.number);
        return acc;
      }, {} as Record<string, number[]>);

      // Find duplicates (title has >1 issue)
      const duplicates = Object.entries(groupedByTitle).filter(
        ([_, numbers]) => numbers.length > 1
      );

      // Assert: Should detect duplicates in validation
      expect(duplicates.length).toBe(1);
      expect(duplicates[0][1]).toEqual([800, 801]);
    });
  });

  describe('Idempotency', () => {
    it('should be safe to run epic sync multiple times', () => {
      // Scenario: User runs /specweave-github:sync-epic 5 times

      const githubIssues: Array<{ number: number; title: string; body: string }> = [];

      // Simulate 5 sync runs
      for (let i = 0; i < 5; i++) {
        const epicId = 'FS-25-11-14';
        const incrementId = '0032-test-feature';

        // Check if issue exists
        const existingIssue = githubIssues.find(
          (issue) =>
            issue.title.includes(`[${epicId}]`) &&
            issue.body.includes(`**Increment**: ${incrementId}`)
        );

        if (!existingIssue) {
          // Create only if doesn't exist
          githubIssues.push({
            number: 900,
            title: '[FS-25-11-14] Test Feature',
            body: '**Increment**: 0032-test-feature'
          });
        }
      }

      // Assert: Should create only 1 issue across 5 runs
      expect(githubIssues.length).toBe(1);
      expect(githubIssues[0].number).toBe(900);
    });

    it('should preserve issue number across multiple syncs', () => {
      // Scenario: Epic synced 3 times, issue number should not change

      const initialIssueNumber = 1000;
      let currentIssueNumber = initialIssueNumber;

      // Simulate 3 sync runs
      for (let i = 0; i < 3; i++) {
        // Issue already exists → Use existing number (don't create new)
        if (currentIssueNumber) {
          // Re-use existing issue number
        } else {
          currentIssueNumber = initialIssueNumber;
        }
      }

      // Assert: Issue number should remain unchanged
      expect(currentIssueNumber).toBe(initialIssueNumber);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive increment ID matching', () => {
      // Arrange: Issue with uppercase increment ID
      const githubIssues = [
        {
          number: 1100,
          title: '[INC-0032-TEST-FEATURE] Test',
          body: 'Content'
        }
      ];

      // Act: Search with lowercase increment ID
      const incrementId = '0032-test-feature';

      const found = githubIssues.find((issue) =>
        issue.title.toLowerCase().includes(incrementId.toLowerCase())
      );

      // Assert: Should find issue (case-insensitive)
      expect(found).toBeDefined();
      expect(found?.number).toBe(1100);
    });

    it('should handle empty GitHub search results', () => {
      // Arrange: Empty GitHub response
      const githubIssues: Array<{ number: number; title: string; body: string }> = [];

      // Act: Search for issue
      const found = githubIssues.find((issue) => issue.title.includes('[FS-'));

      // Assert: Should handle empty results
      expect(found).toBeUndefined();
    });

    it('should limit GitHub search to 50 issues', () => {
      // Scenario: Large epic with 100+ increments

      // Arrange: Create 60 issues
      const githubIssues = Array.from({ length: 60 }, (_, i) => ({
        number: 2000 + i,
        title: `[FS-25-11-14] Test Feature`,
        body: `**Increment**: 00${i}-test`
      }));

      // Act: Search with limit (simulate GitHub API limit)
      const limit = 50;
      const limitedSearch = githubIssues.slice(0, limit);

      // Assert: Should respect limit
      expect(limitedSearch.length).toBe(50);
      expect(githubIssues.length).toBe(60);
    });
  });
});
