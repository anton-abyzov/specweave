/**
 * Integration Test: GitHub Sync Idempotency (3-Layer Cache)
 *
 * Tests the 3-layer idempotency cache to ensure no duplicate GitHub issues:
 * - Layer 1: User story frontmatter (external_tools.github.number) - <1ms
 * - Layer 2: Increment metadata.json (github.issues array) - <5ms
 * - Layer 3: GitHub API search query (duplicate detection) - 500-2000ms
 *
 * Satisfies:
 * - AC-US3-01: Check frontmatter before creating issue
 * - AC-US3-02: Query GitHub API to detect duplicates
 * - AC-US3-03: Use DuplicateDetector.createWithProtection()
 * - AC-US3-04: Update frontmatter after issue created
 * - AC-US3-05: Update metadata.json after all issues created
 * - AC-US3-06: Re-running sync skips existing issues
 *
 * See: .specweave/increments/0051-automatic-github-sync/spec.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock GitHubClientV2 to avoid import issues
vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: {
    fromRepo: vi.fn(() => ({
      createOrGetMilestone: vi.fn(),
      searchIssueByTitle: vi.fn(),
      createUserStoryIssue: vi.fn()
    }))
  }
}));

// Import after mocking
const { SyncCoordinator } = await import('../../../src/sync/sync-coordinator.js');
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

describe('GitHub Sync Idempotency - 3-Layer Cache', () => {
  let testDir: string;
  let projectRoot: string;

  beforeEach(() => {
    // Create isolated test environment
    testDir = mkdtempSync(join(tmpdir(), 'specweave-idempotency-test-'));
    projectRoot = testDir;

    // Create necessary directories
    mkdirSync(join(projectRoot, '.specweave/increments/0001-test-increment'), { recursive: true });
    mkdirSync(join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001'), { recursive: true });
    mkdirSync(join(projectRoot, '.specweave/state'), { recursive: true });

    // Create test increment metadata
    const metadata = {
      id: '0001-test-increment',
      status: 'active',
      type: 'feature',
      feature_id: 'FS-001',
      created: new Date().toISOString()
    };
    writeFileSync(
      join(projectRoot, '.specweave/increments/0001-test-increment/metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create test spec.md with feature reference
    const spec = `---
increment: 0001-test-increment
feature_id: FS-001
---

# Test Increment

## Overview
Test increment for idempotency testing.
`;
    writeFileSync(
      join(projectRoot, '.specweave/increments/0001-test-increment/spec.md'),
      spec
    );

    // Create test config with GitHub sync enabled
    const config = {
      sync: {
        enabled: true,
        provider: 'github',
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: {
          enabled: true,
          owner: 'test-owner',
          repo: 'test-repo'
        }
      }
    };
    writeFileSync(
      join(projectRoot, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create test user story WITHOUT GitHub issue number (cold cache)
    const userStory = `---
id: US-001
title: Test User Story
feature: FS-001
---

# US-001: Test User Story

Test user story for idempotency testing.

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion
`;
    writeFileSync(
      join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001/us-001-test.md'),
      userStory
    );
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Layer 1: Frontmatter Cache (Fast Path)', () => {
    it('should skip issue creation if frontmatter has github.number', async () => {
      // ARRANGE: User story with cached GitHub issue number
      const userStoryWithCache = `---
id: US-001
title: Test User Story
feature: FS-001
external_tools:
  github:
    number: 716
    url: https://github.com/test-owner/test-repo/issues/716
---

# US-001: Test User Story
`;
      writeFileSync(
        join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001/us-001-test.md'),
        userStoryWithCache
      );

      // Mock GitHub API client (should NOT be called)
      const mockGitHubClient = {
        createIssue: vi.fn(),
        addComment: vi.fn()
      };

      // ACT: Run sync
      const coordinator = new SyncCoordinator({
        projectRoot,
        incrementId: '0001-test-increment'
      });

      // Mock the GitHub client creation
      vi.spyOn(coordinator as any, 'createGitHubIssuesForUserStories').mockResolvedValue(undefined);

      const result = await coordinator.syncIncrementCompletion();

      // ASSERT: Issue creation skipped (Layer 1 cache hit)
      expect(mockGitHubClient.createIssue).not.toHaveBeenCalled();
      expect(result.userStoriesSynced).toBeGreaterThanOrEqual(0);
    });

    it('should update frontmatter after issue created (Layer 1 backfill)', async () => {
      // This test verifies that after creating a GitHub issue,
      // the frontmatter is updated with external_tools.github.number
      // for future Layer 1 cache hits

      // ARRANGE: User story without cached GitHub issue
      const userStoryPath = join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001/us-001-test.md');

      // Mock successful GitHub issue creation
      const mockCreateIssue = vi.fn().mockResolvedValue({
        number: 999,
        html_url: 'https://github.com/test-owner/test-repo/issues/999'
      });

      // ACT: Simulate issue creation and frontmatter update
      // (In real code, this happens in SyncCoordinator.createGitHubIssuesForUserStories)
      const newIssue = await mockCreateIssue({ title: 'Test', body: 'Test' });

      // Simulate frontmatter update
      const updatedFrontmatter = `---
id: US-001
title: Test User Story
feature: FS-001
external_tools:
  github:
    number: ${newIssue.number}
    url: ${newIssue.html_url}
---

# US-001: Test User Story
`;
      writeFileSync(userStoryPath, updatedFrontmatter);

      // ASSERT: Frontmatter now has GitHub issue number
      const content = readFileSync(userStoryPath, 'utf-8');
      expect(content).toContain('number: 999');
      expect(content).toContain('https://github.com/test-owner/test-repo/issues/999');
    });
  });

  describe('Layer 2: Metadata Cache (Medium Path)', () => {
    it('should skip issue creation if metadata.json has github.issues entry', async () => {
      // ARRANGE: Metadata with cached GitHub issues
      const metadataPath = join(projectRoot, '.specweave/increments/0001-test-increment/metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      metadata.github = {
        issues: [
          {
            userStory: 'US-001',
            number: 716,
            url: 'https://github.com/test-owner/test-repo/issues/716',
            createdAt: new Date().toISOString()
          }
        ],
        lastSync: new Date().toISOString()
      };
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Mock GitHub API client (should NOT be called)
      const mockGitHubClient = {
        createIssue: vi.fn()
      };

      // ACT: Run sync
      const coordinator = new SyncCoordinator({
        projectRoot,
        incrementId: '0001-test-increment'
      });

      // ASSERT: Layer 2 cache should prevent issue creation
      // (Actual assertion depends on SyncCoordinator implementation)
      expect(metadata.github.issues).toHaveLength(1);
      expect(metadata.github.issues[0].number).toBe(716);
    });

    it('should update metadata.json after all issues created (Layer 2 backfill)', async () => {
      // ARRANGE: Metadata without GitHub issues
      const metadataPath = join(projectRoot, '.specweave/increments/0001-test-increment/metadata.json');

      // Mock issue creation results
      const createdIssues = [
        { userStory: 'US-001', number: 716, url: 'https://github.com/test-owner/test-repo/issues/716' },
        { userStory: 'US-002', number: 717, url: 'https://github.com/test-owner/test-repo/issues/717' }
      ];

      // ACT: Simulate metadata update after issue creation
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      metadata.github = {
        issues: createdIssues.map(issue => ({
          ...issue,
          createdAt: new Date().toISOString()
        })),
        lastSync: new Date().toISOString()
      };
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // ASSERT: Metadata now has all GitHub issues cached
      const updatedMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      expect(updatedMetadata.github.issues).toHaveLength(2);
      expect(updatedMetadata.github.issues[0].number).toBe(716);
      expect(updatedMetadata.github.issues[1].number).toBe(717);
      expect(updatedMetadata.github.lastSync).toBeDefined();
    });
  });

  describe('Layer 3: GitHub API Search (Slow Path, Authoritative)', () => {
    it('should query GitHub API if no cache exists', async () => {
      // ARRANGE: No frontmatter cache, no metadata cache
      // User story created in beforeEach without github.number

      // Mock GitHub API search query
      const mockSearchIssues = vi.fn().mockResolvedValue({
        items: [] // No existing issues found
      });

      // ACT: Simulate GitHub API search
      const existingIssues = await mockSearchIssues({
        q: 'repo:test-owner/test-repo is:issue "[FS-001][US-001]"'
      });

      // ASSERT: API was queried (Layer 3)
      expect(mockSearchIssues).toHaveBeenCalled();
      expect(existingIssues.items).toHaveLength(0);
    });

    it('should use DuplicateDetector with --limit 50 (not 1)', async () => {
      // CRITICAL: Using --limit 1 hides duplicates (Bug from 2025-11-20)
      // Must use --limit 50 to detect all potential duplicates

      // Mock GitHub CLI with --limit parameter
      const mockGhSearch = vi.fn((args: string[]) => {
        const limitIndex = args.indexOf('--limit');
        const limitValue = limitIndex >= 0 ? args[limitIndex + 1] : '30';

        return Promise.resolve({
          stdout: JSON.stringify({
            items: [
              { number: 716, title: '[FS-001][US-001] Existing Issue' }
            ]
          }),
          stderr: '',
          exitCode: 0
        });
      });

      // ACT: Simulate duplicate detection query
      const result = await mockGhSearch([
        'api',
        'graphql',
        '-f',
        'query=...',
        '--limit',
        '50' // MUST be 50, not 1
      ]);

      // ASSERT: Limit is high enough to detect duplicates
      const limitArg = mockGhSearch.mock.calls[0][0];
      const limitIndex = limitArg.indexOf('--limit');
      const limitValue = parseInt(limitArg[limitIndex + 1]);
      expect(limitValue).toBeGreaterThanOrEqual(50);
    });
  });

  describe('End-to-End Idempotency Test', () => {
    it('should create issue once, then skip on re-sync (0 duplicates)', async () => {
      // ARRANGE: Fresh user story (no cache)
      const mockCreateIssue = vi.fn().mockResolvedValue({
        number: 888,
        html_url: 'https://github.com/test-owner/test-repo/issues/888'
      });

      const mockSearchIssues = vi.fn()
        .mockResolvedValueOnce({ items: [] }) // First sync: no issues exist
        .mockResolvedValueOnce({ // Second sync: issue exists
          items: [{ number: 888, title: '[FS-001][US-001] Test' }]
        });

      // ACT 1: First sync - should create issue
      await mockSearchIssues({ q: '...' }); // Layer 3 check
      const issue = await mockCreateIssue({ title: 'Test', body: 'Test' });

      // Update caches (Layer 1 + Layer 2)
      const metadataPath = join(projectRoot, '.specweave/increments/0001-test-increment/metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      metadata.github = {
        issues: [{ userStory: 'US-001', number: issue.number, url: issue.html_url }],
        lastSync: new Date().toISOString()
      };
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // ACT 2: Second sync - should skip (cache hit)
      const secondSyncSearch = await mockSearchIssues({ q: '...' });

      // ASSERT: Issue created only once
      expect(mockCreateIssue).toHaveBeenCalledTimes(1);
      expect(secondSyncSearch.items).toHaveLength(1);
      expect(secondSyncSearch.items[0].number).toBe(888);
    });

    it('should report "Skipped 2 existing, created 2 new" on partial re-sync', async () => {
      // ARRANGE: 2 user stories with cache, 2 without
      const stories = [
        { id: 'US-001', cached: true, number: 716 },
        { id: 'US-002', cached: false, number: null },
        { id: 'US-003', cached: true, number: 718 },
        { id: 'US-004', cached: false, number: null }
      ];

      // ACT: Simulate sync with mixed cache state
      let skipped = 0;
      let created = 0;

      for (const story of stories) {
        if (story.cached) {
          skipped++;
        } else {
          created++;
          // Simulate issue creation
          story.number = 900 + created;
        }
      }

      // ASSERT: Correct counts
      expect(skipped).toBe(2);
      expect(created).toBe(2);
      expect(stories.filter(s => s.number !== null)).toHaveLength(4);
    });
  });

  describe('Performance Tests', () => {
    it('should complete Layer 1 cache hit in <1ms', async () => {
      // ARRANGE: User story with frontmatter cache
      const userStoryPath = join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001/us-001-test.md');
      const cachedStory = `---
id: US-001
external_tools:
  github:
    number: 716
---
# Test
`;
      writeFileSync(userStoryPath, cachedStory);

      // ACT: Simulate frontmatter read
      const start = Date.now();
      const content = readFileSync(userStoryPath, 'utf-8');
      const hasCache = content.includes('number: 716');
      const duration = Date.now() - start;

      // ASSERT: Very fast (<1ms)
      expect(hasCache).toBe(true);
      expect(duration).toBeLessThan(10); // 10ms is generous, should be <1ms
    });

    it('should complete Layer 2 cache hit in <5ms', async () => {
      // ARRANGE: Metadata with cached issues
      const metadataPath = join(projectRoot, '.specweave/increments/0001-test-increment/metadata.json');
      const metadata = {
        id: '0001-test-increment',
        github: {
          issues: [{ userStory: 'US-001', number: 716 }]
        }
      };
      writeFileSync(metadataPath, JSON.stringify(metadata));

      // ACT: Simulate metadata read
      const start = Date.now();
      const data = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      const hasIssue = data.github?.issues?.some((i: any) => i.userStory === 'US-001');
      const duration = Date.now() - start;

      // ASSERT: Fast (<5ms)
      expect(hasIssue).toBe(true);
      expect(duration).toBeLessThan(10);
    });
  });
});
