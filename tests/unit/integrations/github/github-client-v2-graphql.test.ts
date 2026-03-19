/**
 * Unit tests for getIssueWithLastComment GraphQL method (T-004)
 *
 * Verifies the merged GraphQL query that replaces sequential
 * getIssue() + getLastComment() calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileNoThrow } = vi.hoisted(() => {
  const mockExecFileNoThrow = vi.fn();
  return { mockExecFileNoThrow };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Mock budget to always allow — these tests focus on GraphQL, not budget
vi.mock('../../../../src/sync/github-rate-limit-budget.js', () => ({
  checkAndDecrement: vi.fn().mockResolvedValue(true),
}));

import { GitHubClientV2 } from '../../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

describe('GitHubClientV2.getIssueWithLastComment', () => {
  let client: GitHubClientV2;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear static caches
    (GitHubClientV2 as any).issueCache = new Map();
    (GitHubClientV2 as any).searchCache = new Map();

    client = GitHubClientV2.fromRepo('test-owner', 'test-repo');
  });

  it('should return issue state + labels + last comment in one call', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        data: {
          repository: {
            issue: {
              number: 42,
              title: '[FS-001][US-001] Test',
              body: 'issue body',
              url: 'https://github.com/test-owner/test-repo/issues/42',
              state: 'OPEN',
              labels: { nodes: [{ name: 'specweave' }, { name: 'status:active' }] },
              comments: { nodes: [{ body: 'last comment text', author: { login: 'user1' } }] },
            },
          },
        },
      }),
      stderr: '',
    });

    const result = await client.getIssueWithLastComment(42);

    expect(result.issue.number).toBe(42);
    expect(result.issue.state).toBe('open');
    expect(result.issue.labels).toEqual(['specweave', 'status:active']);
    expect(result.lastComment).toEqual({ body: 'last comment text', author: 'user1' });
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    // Verify it uses GraphQL
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['api', 'graphql']),
      expect.anything()
    );
  });

  it('should return null lastComment when no comments exist', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        data: {
          repository: {
            issue: {
              number: 10,
              title: 'No Comments Issue',
              body: 'body',
              url: 'https://github.com/test-owner/test-repo/issues/10',
              state: 'OPEN',
              labels: { nodes: [] },
              comments: { nodes: [] },
            },
          },
        },
      }),
      stderr: '',
    });

    const result = await client.getIssueWithLastComment(10);

    expect(result.issue.number).toBe(10);
    expect(result.lastComment).toBeNull();
  });

  it('should fallback to sequential calls when GraphQL fails', async () => {
    // GraphQL call fails
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: 'GraphQL error',
    });
    // Fallback: getIssue REST call
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        number: 7,
        title: 'Fallback Issue',
        body: 'body',
        state: 'OPEN',
        url: 'https://github.com/test-owner/test-repo/issues/7',
        labels: [{ name: 'specweave' }],
        milestone: null,
      }),
      stderr: '',
    });
    // Fallback: getLastComment REST call
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({ body: 'fallback comment', author: 'bot' }),
      stderr: '',
    });

    const result = await client.getIssueWithLastComment(7);

    expect(result.issue.number).toBe(7);
    expect(result.lastComment).toEqual({ body: 'fallback comment', author: 'bot' });
    // 3 calls: GraphQL attempt + getIssue fallback + getLastComment fallback
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(3);
  });
});
