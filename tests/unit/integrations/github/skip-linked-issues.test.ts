/**
 * Unit tests for skip-linked-issues optimization (T-003, US-004)
 *
 * Validates:
 * - TC-011: Metadata has issue number → sync skips createWithProtection()
 * - TC-012: editIssueBody does direct edit with 1 API call (no pre-fetch)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// TC-012: editIssueBody on GitHubClientV2
// ---------------------------------------------------------------------------

const { mockExecFileNoThrow } = vi.hoisted(() => {
  return { mockExecFileNoThrow: vi.fn() };
});

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

import { GitHubClientV2 } from '../../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

describe('TC-012: editIssueBody — direct edit without pre-fetch', () => {
  let client: GitHubClientV2;

  beforeEach(() => {
    vi.clearAllMocks();
    client = GitHubClientV2.fromRepo('test-owner', 'test-repo');
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
  });

  it('should call gh issue edit with --body directly (1 API call)', async () => {
    await client.editIssueBody(42, 'Updated body content');

    // Exactly 1 API call — no getIssue() pre-fetch
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining([
        'issue', 'edit', '42',
        '--repo', 'test-owner/test-repo',
        '--body', 'Updated body content',
      ]),
      expect.anything(),
    );
  });

  it('should throw on failure', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'issue not found',
    });

    await expect(client.editIssueBody(999, 'body')).rejects.toThrow('Failed to edit issue #999');
  });
});

// ---------------------------------------------------------------------------
// TC-011: getIssueNumberFromMetadata helper
// ---------------------------------------------------------------------------

const { mockReadFile: mockReadFile2, mockExistsSync: mockExistsSync2, mockReaddir: mockReaddir2 } = vi.hoisted(() => {
  return {
    mockReadFile: vi.fn(),
    mockExistsSync: vi.fn(),
    mockReaddir: vi.fn(),
  };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: mockReadFile2,
    readdir: mockReaddir2,
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync2,
  };
});

import { getIssueNumberFromMetadata } from '../../../../plugins/specweave/lib/integrations/github/metadata-issue-lookup.js';

describe('TC-011: getIssueNumberFromMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync2.mockReturnValue(false);
  });

  it('should return issue number when metadata has linked issue for user story', async () => {
    // Given: metadata.json has issue number for US-001
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0621-reduce-github-api-calls-phase2']);
    mockReadFile2.mockResolvedValue(JSON.stringify({
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 42, issueUrl: 'https://github.com/o/r/issues/42', status: 'active' },
            'US-002': { issueNumber: 55, issueUrl: 'https://github.com/o/r/issues/55', status: 'active' },
          },
        },
      },
    }));

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBe(42);
  });

  it('should return null when metadata has no issues for user story', async () => {
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0621-reduce-github-api-calls-phase2']);
    mockReadFile2.mockResolvedValue(JSON.stringify({
      externalLinks: {
        github: {
          issues: {
            'US-002': { issueNumber: 55 },
          },
        },
      },
    }));

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBeNull();
  });

  it('should return null when metadata has no externalLinks', async () => {
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0621-reduce-github-api-calls-phase2']);
    mockReadFile2.mockResolvedValue(JSON.stringify({ status: 'active' }));

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBeNull();
  });

  it('should return null when increment folder not found', async () => {
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0001-other-increment']);

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBeNull();
  });

  it('should return null when increments directory does not exist', async () => {
    mockExistsSync2.mockReturnValue(false);

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBeNull();
  });

  it('should handle old metadata format (github.issues[] array)', async () => {
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0621-reduce-github-api-calls-phase2']);
    mockReadFile2.mockResolvedValue(JSON.stringify({
      github: {
        issues: [
          { userStory: 'US-001', number: 42 },
          { userStory: 'US-002', number: 55 },
        ],
      },
    }));

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBe(42);
  });

  it('should gracefully handle corrupted metadata.json', async () => {
    mockExistsSync2.mockReturnValue(true);
    mockReaddir2.mockResolvedValue(['0621-reduce-github-api-calls-phase2']);
    mockReadFile2.mockResolvedValue('not valid json');

    const result = await getIssueNumberFromMetadata('/project/.specweave/increments', 'FS-621', 'US-001');

    expect(result).toBeNull();
  });
});
