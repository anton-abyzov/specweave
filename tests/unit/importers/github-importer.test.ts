/**
 * Unit Tests: GitHub Importer
 *
 * Tests GitHub issue import with pagination, filtering, and rate limiting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubImporter } from '../../../src/importers/github-importer.js';
import type { ImportConfig } from '../../../src/importers/external-importer.js';

// Mock Octokit
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      issues: {
        listForRepo: vi.fn(),
      },
    })),
  };
});

describe('GitHubImporter', () => {
  let importer: GitHubImporter;
  let mockListForRepo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    importer = new GitHubImporter('anton-abyzov', 'specweave', 'fake-token');

    // Access the mocked listForRepo function
    mockListForRepo = (importer as any).octokit.issues.listForRepo;
  });

  describe('TC-060: Import GitHub issues with pagination', () => {
    it('should import all 250 issues across 3 pages', async () => {
      // Setup: 3 pages of issues (100, 100, 50)
      const page1 = createMockIssues(1, 100);
      const page2 = createMockIssues(101, 200);
      const page3 = createMockIssues(201, 250);

      mockListForRepo
        .mockResolvedValueOnce({
          data: page1,
          headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
        })
        .mockResolvedValueOnce({
          data: page2,
          headers: { 'x-ratelimit-remaining': '3999', 'x-ratelimit-reset': '1234567890' },
        })
        .mockResolvedValueOnce({
          data: page3,
          headers: { 'x-ratelimit-remaining': '3998', 'x-ratelimit-reset': '1234567890' },
        });

      // Execute
      const items = await importer.import();

      // Verify
      expect(items).toHaveLength(250);
      expect(items[0].id).toBe('github#1');
      expect(items[99].id).toBe('github#100');
      expect(items[249].id).toBe('github#250');
      expect(mockListForRepo).toHaveBeenCalledTimes(3);
    });

    it('should stop pagination when page has < 100 items', async () => {
      // Setup: 2 pages (100, 75)
      const page1 = createMockIssues(1, 100);
      const page2 = createMockIssues(101, 175);

      mockListForRepo
        .mockResolvedValueOnce({
          data: page1,
          headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
        })
        .mockResolvedValueOnce({
          data: page2,
          headers: { 'x-ratelimit-remaining': '3999', 'x-ratelimit-reset': '1234567890' },
        });

      // Execute
      const items = await importer.import();

      // Verify
      expect(items).toHaveLength(175);
      expect(mockListForRepo).toHaveBeenCalledTimes(2); // Should not request page 3
    });

    it('should filter out pull requests', async () => {
      // Setup: Mix of issues and PRs
      const issues = [
        createMockIssue(1, 'Issue 1'),
        { ...createMockIssue(2, 'PR 1'), pull_request: {} }, // PR
        createMockIssue(3, 'Issue 2'),
        { ...createMockIssue(4, 'PR 2'), pull_request: {} }, // PR
      ];

      mockListForRepo.mockResolvedValueOnce({
        data: issues,
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      // Execute
      const items = await importer.import();

      // Verify
      expect(items).toHaveLength(2); // Only issues, no PRs
      expect(items[0].id).toBe('github#1');
      expect(items[1].id).toBe('github#3');
    });
  });

  describe('TC-061: Filter by time range (1 month)', () => {
    it('should only import issues from last 1 month', async () => {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const issues = [
        createMockIssue(1, 'Recent issue', oneMonthAgo.toISOString()),
        createMockIssue(2, 'Old issue', '2023-01-01T00:00:00Z'),
      ];

      mockListForRepo.mockResolvedValueOnce({
        data: issues,
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      // Execute with 1 month filter
      const config: ImportConfig = { timeRangeMonths: 1 };
      await importer.import(config);

      // Verify API was called with correct 'since' parameter
      const callArgs = mockListForRepo.mock.calls[0][0];
      const sinceDate = new Date(callArgs.since);
      const expectedSince = new Date(now);
      expectedSince.setMonth(expectedSince.getMonth() - 1);

      // Check dates are within 1 minute (to account for execution time)
      expect(Math.abs(sinceDate.getTime() - expectedSince.getTime())).toBeLessThan(60000);
    });

    it('should include closed issues when includeClosed=true', async () => {
      const issues = createMockIssues(1, 10);

      mockListForRepo.mockResolvedValueOnce({
        data: issues,
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      // Execute
      const config: ImportConfig = { includeClosed: true };
      await importer.import(config);

      // Verify
      expect(mockListForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'all',
        })
      );
    });

    it('should only include open issues by default', async () => {
      const issues = createMockIssues(1, 10);

      mockListForRepo.mockResolvedValueOnce({
        data: issues,
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      // Execute
      await importer.import();

      // Verify
      expect(mockListForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'open',
        })
      );
    });
  });

  describe('TC-062: Handle rate limiting', () => {
    it('should throw error when rate limit is approaching (<10 remaining)', async () => {
      mockListForRepo.mockResolvedValueOnce({
        data: createMockIssues(1, 10),
        headers: { 'x-ratelimit-remaining': '5', 'x-ratelimit-reset': '1234567890' },
      });

      // Execute & Verify
      await expect(importer.import()).rejects.toThrow(/rate limit approaching/i);
    });

    it('should include reset time in rate limit error message', async () => {
      const resetTime = 1234567890;
      mockListForRepo.mockResolvedValueOnce({
        data: createMockIssues(1, 10),
        headers: { 'x-ratelimit-remaining': '3', 'x-ratelimit-reset': resetTime.toString() },
      });

      // Execute & Verify
      await expect(importer.import()).rejects.toThrow(new Date(resetTime * 1000).toLocaleString());
    });

    it('should throw error on 403 rate limit exceeded', async () => {
      const error: any = new Error('rate limit exceeded');
      error.status = 403;
      mockListForRepo.mockRejectedValueOnce(error);

      // Execute & Verify
      await expect(importer.import()).rejects.toThrow(/GitHub rate limit exceeded/i);
    });
  });

  describe('Type Detection', () => {
    it('should detect user-story type from label', async () => {
      const issue = createMockIssue(1, 'User Story', undefined, [{ name: 'user-story' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].type).toBe('user-story');
    });

    it('should detect epic type from label', async () => {
      const issue = createMockIssue(1, 'Epic', undefined, [{ name: 'epic' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].type).toBe('epic');
    });

    it('should detect bug type from label', async () => {
      const issue = createMockIssue(1, 'Bug', undefined, [{ name: 'bug' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].type).toBe('bug');
    });

    it('should default to task type', async () => {
      const issue = createMockIssue(1, 'Generic Issue');

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].type).toBe('task');
    });
  });

  describe('Priority Detection', () => {
    it('should extract P0 priority from label', async () => {
      const issue = createMockIssue(1, 'Critical', undefined, [{ name: 'p0' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].priority).toBe('P0');
    });

    it('should extract P2 priority from label', async () => {
      const issue = createMockIssue(1, 'Medium', undefined, [{ name: 'P2' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].priority).toBe('P2');
    });

    it('should have undefined priority when no priority label', async () => {
      const issue = createMockIssue(1, 'No Priority');

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].priority).toBeUndefined();
    });
  });

  describe('Acceptance Criteria Extraction', () => {
    it('should extract AC from checkbox list', async () => {
      const body = `
## Acceptance Criteria
- [ ] AC-001: First criterion
- [x] AC-002: Second criterion
- [ ] AC-003: Third criterion
`;
      const issue = createMockIssue(1, 'With ACs', undefined, [], body);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].acceptanceCriteria).toHaveLength(3);
      expect(items[0].acceptanceCriteria).toContain('AC-001: First criterion');
      expect(items[0].acceptanceCriteria).toContain('AC-002: Second criterion');
    });

    it('should extract AC from bullet list', async () => {
      const body = `
## Acceptance Criteria
- User can login
- User can logout
- Session expires after 1 hour
`;
      const issue = createMockIssue(1, 'With ACs', undefined, [], body);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].acceptanceCriteria).toHaveLength(3);
    });

    it('should return undefined when no AC section found', async () => {
      const issue = createMockIssue(1, 'No ACs', undefined, [], 'Just a description');

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].acceptanceCriteria).toBeUndefined();
    });
  });

  describe('Status Mapping', () => {
    it('should map closed state to completed status', async () => {
      const issue = { ...createMockIssue(1, 'Closed'), state: 'closed' as const };

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const config: ImportConfig = { includeClosed: true };
      const items = await importer.import(config);
      expect(items[0].status).toBe('completed');
    });

    it('should map in-progress label to in-progress status', async () => {
      const issue = createMockIssue(1, 'In Progress', undefined, [{ name: 'in-progress' }]);

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].status).toBe('in-progress');
    });

    it('should default to open status', async () => {
      const issue = createMockIssue(1, 'Open');

      mockListForRepo.mockResolvedValueOnce({
        data: [issue],
        headers: { 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': '1234567890' },
      });

      const items = await importer.import();
      expect(items[0].status).toBe('open');
    });
  });
});

// Helper Functions

function createMockIssue(
  number: number,
  title: string,
  created_at?: string,
  labels: Array<{ name: string }> = [],
  body: string | null = 'Issue body'
) {
  return {
    number,
    title,
    body,
    state: 'open' as const,
    created_at: created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_url: `https://github.com/anton-abyzov/specweave/issues/${number}`,
    labels,
    user: { login: 'test-user' },
  };
}

function createMockIssues(startNum: number, endNum: number) {
  const issues = [];
  for (let i = startNum; i <= endNum; i++) {
    issues.push(createMockIssue(i, `Issue ${i}`));
  }
  return issues;
}
