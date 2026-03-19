/**
 * Unit tests for skipDuplicateCheck option in createEpicIssue (T-005)
 *
 * Verifies that when skipDuplicateCheck is true, searchIssueByTitle is NOT called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileNoThrow } = vi.hoisted(() => {
  const mockExecFileNoThrow = vi.fn();
  return { mockExecFileNoThrow };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Mock budget to always allow — these tests focus on dedup, not budget
vi.mock('../../../../src/sync/github-rate-limit-budget.js', () => ({
  checkAndDecrement: vi.fn().mockResolvedValue(true),
}));

import { GitHubClientV2 } from '../../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

describe('createEpicIssue skipDuplicateCheck', () => {
  let client: GitHubClientV2;

  beforeEach(() => {
    vi.clearAllMocks();
    (GitHubClientV2 as any).issueCache = new Map();
    (GitHubClientV2 as any).searchCache = new Map();
    client = GitHubClientV2.fromRepo('test-owner', 'test-repo');
  });

  it('should call searchIssueByTitle by default (skipDuplicateCheck not set)', async () => {
    // Search returns null (no existing issue)
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify([]),
      stderr: '',
    });
    // Create returns URL
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'https://github.com/test-owner/test-repo/issues/1\n',
      stderr: '',
    });
    // getIssue fetches details
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        number: 1,
        title: '[FS-001][US-001] Test',
        body: 'body',
        state: 'OPEN',
        url: 'https://github.com/test-owner/test-repo/issues/1',
        labels: [],
        milestone: null,
      }),
      stderr: '',
    });

    await client.createEpicIssue('[FS-001][US-001] Test', 'body');

    // First call should be the search
    const searchCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1].includes('--search')
    );
    expect(searchCalls.length).toBe(1);
  });

  it('should skip searchIssueByTitle when skipDuplicateCheck is true', async () => {
    // Create returns URL (no search call needed)
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'https://github.com/test-owner/test-repo/issues/2\n',
      stderr: '',
    });
    // getIssue fetches details
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        number: 2,
        title: '[FS-001][US-001] Test',
        body: 'body',
        state: 'OPEN',
        url: 'https://github.com/test-owner/test-repo/issues/2',
        labels: [],
        milestone: null,
      }),
      stderr: '',
    });

    await client.createEpicIssue('[FS-001][US-001] Test', 'body', undefined, [], { skipDuplicateCheck: true });

    // No search calls
    const searchCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1].includes('--search')
    );
    expect(searchCalls.length).toBe(0);
  });

  it('should still call searchIssueByTitle when skipDuplicateCheck is false', async () => {
    // Search returns null
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify([]),
      stderr: '',
    });
    // Create returns URL
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'https://github.com/test-owner/test-repo/issues/3\n',
      stderr: '',
    });
    // getIssue fetches details
    mockExecFileNoThrow.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        number: 3,
        title: '[FS-001][US-001] Test',
        body: 'body',
        state: 'OPEN',
        url: 'https://github.com/test-owner/test-repo/issues/3',
        labels: [],
        milestone: null,
      }),
      stderr: '',
    });

    await client.createEpicIssue('[FS-001][US-001] Test', 'body', undefined, [], { skipDuplicateCheck: false });

    const searchCalls = mockExecFileNoThrow.mock.calls.filter(
      (call: any[]) => call[1].includes('--search')
    );
    expect(searchCalls.length).toBe(1);
  });
});
