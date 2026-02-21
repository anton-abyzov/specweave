/**
 * Unit tests for default branch detection in GitHubFeatureSync
 *
 * Tests that the detectDefaultBranch method:
 * - Calls the GitHub API with the correct endpoint
 * - Caches the result per sync session
 * - Falls back to 'main' on failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

const mockGetGitHubAuthFromProject = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mockGetGitHubAuthFromProject,
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('../../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: class {},
}));

vi.mock('../../../../plugins/specweave-github/lib/user-story-issue-builder.js', () => ({
  UserStoryIssueBuilder: class {
    buildIssueBody() {
      return Promise.resolve({
        title: '[FS-001][US-001] Test',
        body: 'test',
        labels: [],
        userStoryId: 'US-001',
      });
    }
  },
}));

vi.mock('../../../../plugins/specweave-github/lib/completion-calculator.js', () => ({
  CompletionCalculator: class {
    calculateCompletion() {
      return Promise.resolve({ overallComplete: false, acsPercentage: 0, tasksPercentage: 0 });
    }
    buildProgressComment() { return ''; }
    buildCompletionComment() { return ''; }
    buildReopenComment() { return ''; }
  },
}));

vi.mock('../../../../plugins/specweave-github/lib/duplicate-detector.js', () => ({
  DuplicateDetector: {
    createWithProtection: vi.fn().mockResolvedValue({
      issue: { number: 1 },
      wasReused: false,
      duplicatesFound: 0,
      duplicatesClosed: 0,
    }),
  },
}));

import { GitHubFeatureSync } from '../../../../plugins/specweave-github/lib/github-feature-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

// ---------------------------------------------------------------------------
// Tests: detectDefaultBranch (accessed via prototype for unit testing)
// ---------------------------------------------------------------------------

describe('GitHubFeatureSync — detectDefaultBranch', () => {
  let sync: GitHubFeatureSync;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGitHubAuthFromProject.mockReturnValue({ token: 'test-token' });

    const mockClient = {
      getOwner: () => 'test-owner',
      getRepo: () => 'test-repo',
      getIssue: vi.fn(),
    } as any;

    sync = new GitHubFeatureSync(mockClient, '/project/specs', '/project');
  });

  it('should detect default branch from GitHub API', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('main\n'));

    // Access private method via prototype
    const detectDefaultBranch = (sync as any).detectDefaultBranch.bind(sync);
    const branch = await detectDefaultBranch();

    expect(branch).toBe('main');
    expect(mockExecFileNoThrow).toHaveBeenCalledWith(
      'gh',
      ['api', 'repos/test-owner/test-repo', '--jq', '.default_branch'],
      expect.objectContaining({
        env: expect.objectContaining({ GH_TOKEN: 'test-token' }),
      }),
    );
  });

  it('should detect non-standard branch names', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('develop\n'));

    const detectDefaultBranch = (sync as any).detectDefaultBranch.bind(sync);
    const branch = await detectDefaultBranch();

    expect(branch).toBe('develop');
  });

  it('should fall back to main when API fails', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execFailure('Not Found'));

    const detectDefaultBranch = (sync as any).detectDefaultBranch.bind(sync);
    const branch = await detectDefaultBranch();

    expect(branch).toBe('main');
  });

  it('should cache the result for session reuse (no repeated API calls)', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess('develop\n'));

    const detectDefaultBranch = (sync as any).detectDefaultBranch.bind(sync);

    // First call
    const branch1 = await detectDefaultBranch();
    expect(branch1).toBe('develop');

    // Second call should use cached value
    const branch2 = await detectDefaultBranch();
    expect(branch2).toBe('develop');

    // API should only be called once
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
  });

  it('should fall back to main when API returns empty string', async () => {
    mockExecFileNoThrow.mockResolvedValueOnce(execSuccess(''));

    const detectDefaultBranch = (sync as any).detectDefaultBranch.bind(sync);
    const branch = await detectDefaultBranch();

    expect(branch).toBe('main');
  });
});
