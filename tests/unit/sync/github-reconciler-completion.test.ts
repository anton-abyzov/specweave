/**
 * Tests for GitHubReconciler.closeCompletedIncrementIssues()
 *
 * Verifies the direct metadata-based GitHub issue closure fallback
 * that runs when the LivingDocsSync chain fails silently.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockExistsSync,
  mockReadFile,
  mockWriteFile,
  mockGetIssue,
  mockCloseIssue,
  mockFromRepo,
  mockExecFileNoThrow,
} = vi.hoisted(() => {
  const _mockGetIssue = vi.fn();
  const _mockCloseIssue = vi.fn();
  const _mockFromRepo = vi.fn(() => ({
    getIssue: _mockGetIssue,
    closeIssue: _mockCloseIssue,
    reopenIssue: vi.fn(),
    searchIssuesByFeature: vi.fn(),
    addComment: vi.fn(),
  }));

  return {
    mockExistsSync: vi.fn(),
    mockReadFile: vi.fn(),
    mockWriteFile: vi.fn().mockResolvedValue(undefined),
    mockGetIssue: _mockGetIssue,
    mockCloseIssue: _mockCloseIssue,
    mockFromRepo: _mockFromRepo,
    mockExecFileNoThrow: vi.fn(),
  };
});

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readFile: mockReadFile,
    readdir: vi.fn(),
    writeFile: mockWriteFile,
  },
}));

vi.mock('yaml', () => ({
  default: { parse: vi.fn(), stringify: vi.fn() },
}));

vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: {
    detectRepo: vi.fn(),
    fromRepo: mockFromRepo,
  },
}));

vi.mock('../../../src/sync/config.js', () => ({
  resolvePermissions: vi.fn(),
}));

vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: vi.fn(),
}));

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GitHubReconciler } from '../../../src/sync/github-reconciler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ROOT = '/test/project';

function metadataWithExternalLinks(
  issues: Record<string, { issueNumber: number; status: string }>,
  milestone?: number,
) {
  return JSON.stringify({
    id: '0001-test',
    status: 'completed',
    externalLinks: {
      github: {
        issues,
        ...(milestone !== undefined ? { milestone } : {}),
      },
    },
  });
}

function configWithGitHub(owner = 'test-owner', repo = 'test-repo') {
  return JSON.stringify({
    sync: { github: { enabled: true, owner, repo } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubReconciler.closeCompletedIncrementIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  it('closes open issues from externalLinks format', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'active' },
          'US-002': { issueNumber: 101, status: 'active' },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockCloseIssue).toHaveBeenCalledTimes(2);
  });

  it('skips already-closed issues', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'closed' },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'closed' });

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(0);
    expect(mockCloseIssue).not.toHaveBeenCalled();
  });

  it('reads from both metadata formats and deduplicates', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return JSON.stringify({
          id: '0001-test',
          status: 'completed',
          externalLinks: {
            github: {
              issues: { 'US-001': { issueNumber: 100, status: 'active' } },
            },
          },
          github: {
            issues: [
              { userStory: 'US-001', number: 100 }, // duplicate
              { userStory: 'US-002', number: 200 }, // unique
            ],
          },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(2); // 100 + 200, not 3
    expect(mockCloseIssue).toHaveBeenCalledTimes(2);
  });

  it('returns early when no issues in metadata', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return JSON.stringify({ id: '0001-test', status: 'completed' });
      }
      return configWithGitHub();
    });

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(0);
    expect(mockFromRepo).not.toHaveBeenCalled();
  });

  it('handles missing metadata.json', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('closes milestone when present', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks(
          { 'US-001': { issueNumber: 100, status: 'active' } },
          42,
        );
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.milestoneClose).toBe(true);
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['api', '-X', 'PATCH']),
    );
  });

  it('continues on per-issue errors', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'active' },
          'US-002': { issueNumber: 101, status: 'active' },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue
      .mockRejectedValueOnce(new Error('API rate limit'))
      .mockResolvedValueOnce({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(result.closed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('API rate limit');
  });

  it('updates metadata externalLinks status after closure', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'active' },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(mockWriteFile).toHaveBeenCalled();
    const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
    expect(written.externalLinks.github.issues['US-001'].status).toBe(
      'closed',
    );
    expect(written.externalLinks.github.syncedAt).toBeDefined();
  });

  it('only marks actually-closed issues in metadata (not failed ones)', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'active' },
          'US-002': { issueNumber: 101, status: 'active' },
        });
      }
      return configWithGitHub();
    });
    // Issue 100 fails, issue 101 succeeds
    mockGetIssue
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
    );

    expect(mockWriteFile).toHaveBeenCalled();
    const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
    // US-002 (issue 101) was closed → status updated
    expect(written.externalLinks.github.issues['US-002'].status).toBe('closed');
    // US-001 (issue 100) failed → status stays active
    expect(written.externalLinks.github.issues['US-001'].status).toBe('active');
  });

  it('accepts a simple log function as logger', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('metadata.json')) {
        return metadataWithExternalLinks({
          'US-001': { issueNumber: 100, status: 'active' },
        });
      }
      return configWithGitHub();
    });
    mockGetIssue.mockResolvedValue({ state: 'open' });
    mockCloseIssue.mockResolvedValue(undefined);

    const logFn = vi.fn();
    const result = await GitHubReconciler.closeCompletedIncrementIssues(
      PROJECT_ROOT,
      '0001-test',
      logFn,
    );

    expect(result.closed).toBe(1);
  });
});
