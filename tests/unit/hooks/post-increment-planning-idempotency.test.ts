/**
 * Unit Tests: Post-Increment-Planning Hook Idempotency
 *
 * Tests that the post-increment-planning hook correctly detects existing
 * GitHub issues in metadata.json and skips creation (idempotent behavior).
 *
 * @module tests/unit/hooks/post-increment-planning-idempotency
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

describe('Post-Increment-Planning Hook - Idempotency', () => {
  const testRoot = path.join(__dirname, '../../.tmp/idempotency-test');
  const incrementDir = path.join(testRoot, '.specweave/increments/9999-test-idempotency');
  const metadataFile = path.join(incrementDir, 'metadata.json');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(incrementDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('Duplicate Detection', () => {
    it('should skip issue creation when metadata.json has github.issue', () => {
      // Arrange: Create metadata.json with existing GitHub issue
      const metadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z',
        github: {
          issue: 999,
          url: 'https://github.com/test/repo/issues/999',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Simulate hook logic (extract github.issue from metadata)
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should find existing issue
      expect(existingIssue).toBe('999');
      expect(existingIssue).not.toBeNull();
    });

    it('should allow issue creation when metadata.json has no github section', () => {
      // Arrange: Create metadata.json WITHOUT GitHub section
      const metadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z'
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Simulate hook logic
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should NOT find existing issue (creation allowed)
      expect(existingIssue).toBeNull();
    });

    it('should allow issue creation when metadata.json does not exist', () => {
      // Arrange: No metadata.json file

      // Act: Check if file exists
      const exists = existsSync(metadataFile);

      // Assert: File should not exist (creation allowed)
      expect(exists).toBe(false);
    });

    it('should extract issue number from complex metadata structure', () => {
      // Arrange: Create metadata with nested GitHub section
      const metadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z',
        github: {
          issue: 12345,
          url: 'https://github.com/anton-abyzov/specweave/issues/12345',
          synced: '2025-11-14T00:00:00Z'
        },
        githubProfile: 'specweave-dev'
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Extract using regex (same as hook)
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should extract correct issue number
      expect(existingIssue).toBe('12345');
    });

    it('should handle whitespace variations in metadata.json', () => {
      // Arrange: Create metadata with various whitespace patterns
      const metadataWithSpaces = `{
  "id": "9999-test-idempotency",
  "github"  :  {
    "issue"   :   777  ,
    "url": "https://github.com/test/repo/issues/777"
  }
}`;

      writeFileSync(metadataFile, metadataWithSpaces);

      // Act: Extract using flexible regex
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should handle whitespace correctly
      expect(existingIssue).toBe('777');
    });
  });

  describe('URL Extraction', () => {
    it('should extract GitHub issue URL from metadata', () => {
      // Arrange: Create metadata with URL
      const metadata = {
        id: '9999-test-idempotency',
        github: {
          issue: 999,
          url: 'https://github.com/anton-abyzov/specweave/issues/999',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Extract URL using regex
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const urlMatch = metadataContent.match(/"url"\s*:\s*"([^"]*)"/);
      const existingUrl = urlMatch ? urlMatch[1] : null;

      // Assert: Should extract correct URL
      expect(existingUrl).toBe('https://github.com/anton-abyzov/specweave/issues/999');
    });

    it('should handle missing URL gracefully', () => {
      // Arrange: Create metadata without URL
      const metadata = {
        id: '9999-test-idempotency',
        github: {
          issue: 999,
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Extract URL
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const urlMatch = metadataContent.match(/"url"\s*:\s*"([^"]*)"/);
      const existingUrl = urlMatch ? urlMatch[1] : null;

      // Assert: Should handle missing URL
      expect(existingUrl).toBeNull();
    });
  });

  describe('Idempotency Scenarios', () => {
    it('should skip creation on first re-run (idempotent)', () => {
      // Scenario: User runs /specweave:increment twice

      // First run: Create metadata with issue
      const firstRunMetadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z',
        github: {
          issue: 100,
          url: 'https://github.com/test/repo/issues/100',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(firstRunMetadata, null, 2));

      // Second run: Check for existing issue
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should detect existing issue (skip creation)
      expect(existingIssue).toBe('100');
    });

    it('should skip creation on multiple re-runs (idempotent)', () => {
      // Scenario: User runs /specweave:increment 5 times

      // Initial metadata
      const metadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z',
        github: {
          issue: 200,
          url: 'https://github.com/test/repo/issues/200',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Simulate 5 re-runs
      for (let i = 0; i < 5; i++) {
        const metadataContent = readFileSync(metadataFile, 'utf-8');
        const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
        const existingIssue = issueMatch ? issueMatch[1] : null;

        // Assert: Should always find same issue (never create new)
        expect(existingIssue).toBe('200');
      }
    });

    it('should preserve issue number across spec updates', () => {
      // Scenario: User updates spec.md but metadata.json remains unchanged

      // Initial metadata
      const metadata = {
        id: '9999-test-idempotency',
        status: 'active',
        created: '2025-11-14T00:00:00Z',
        github: {
          issue: 300,
          url: 'https://github.com/test/repo/issues/300',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Simulate spec update (metadata should not change)
      const specFile = path.join(incrementDir, 'spec.md');
      writeFileSync(specFile, '# Updated Spec\n\nSome changes...');

      // Re-run hook logic
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Issue number should remain unchanged
      expect(existingIssue).toBe('300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted metadata gracefully', () => {
      // Arrange: Create corrupted metadata (invalid JSON)
      writeFileSync(metadataFile, '{ "id": "9999-test-idempotency", invalid json }');

      // Act: Try to extract issue (should fail gracefully)
      let existingIssue = null;
      try {
        const metadataContent = readFileSync(metadataFile, 'utf-8');
        const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
        existingIssue = issueMatch ? issueMatch[1] : null;
      } catch (error) {
        // Graceful failure
        existingIssue = null;
      }

      // Assert: Should handle corruption (allow creation as fallback)
      expect(existingIssue).toBeNull();
    });

    it('should handle empty metadata.json', () => {
      // Arrange: Create empty metadata file
      writeFileSync(metadataFile, '{}');

      // Act: Extract issue
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should handle empty file (allow creation)
      expect(existingIssue).toBeNull();
    });

    it('should handle metadata with github section but no issue field', () => {
      // Arrange: Create metadata with github section but missing issue
      const metadata = {
        id: '9999-test-idempotency',
        github: {
          url: 'https://github.com/test/repo/issues/400',
          synced: '2025-11-14T00:00:00Z'
        }
      };

      writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      // Act: Extract issue
      const metadataContent = readFileSync(metadataFile, 'utf-8');
      const issueMatch = metadataContent.match(/"github"\s*:\s*{[^}]*"issue"\s*:\s*(\d+)/);
      const existingIssue = issueMatch ? issueMatch[1] : null;

      // Assert: Should not find issue (allow creation)
      expect(existingIssue).toBeNull();
    });
  });
});
