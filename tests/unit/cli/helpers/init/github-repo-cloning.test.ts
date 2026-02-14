/**
 * GitHub Repo Cloning Tests
 *
 * Tests for triggerGitHubRepoCloning:
 * - API fetching with pagination and rate limits
 * - Repository filtering (archived, forked, org mismatch)
 * - Pattern matching (all/glob/regex)
 * - Clone URL construction (HTTPS with PAT, SSH)
 * - Background job launching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLaunchCloneJob = vi.hoisted(() => vi.fn());
const mockFilterRepositoriesByPattern = vi.hoisted(() => vi.fn());

vi.mock('../../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: mockLaunchCloneJob
}));

vi.mock('../../../../../src/cli/helpers/selection-strategy.js', () => ({
  filterRepositoriesByPattern: mockFilterRepositoriesByPattern
}));

// Suppress chalk output in tests
vi.mock('chalk', () => ({
  default: {
    gray: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    cyan: (s: string) => s,
  }
}));

import { triggerGitHubRepoCloning } from '../../../../../src/cli/helpers/init/github-repo-cloning.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockResponse(
  body: any,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      ...headers
    }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function createRepo(name: string, owner = 'test-org', archived = false, fork = false) {
  return {
    id: Math.floor(Math.random() * 10000),
    name,
    full_name: `${owner}/${name}`,
    clone_url: `https://github.com/${owner}/${name}.git`,
    html_url: `https://github.com/${owner}/${name}`,
    owner: { login: owner },
    archived,
    fork,
    private: true,
  };
}

describe('github-repo-cloning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('triggerGitHubRepoCloning', () => {
    it('returns empty when strategy is skip', async () => {
      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'skip' }
      );
      expect(result.clonedRepos).toEqual([]);
      expect(result.jobId).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns empty when no org specified', async () => {
      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: '', pat: 'ghp_test' },
        { strategy: 'all' }
      );
      expect(result.clonedRepos).toEqual([]);
    });

    it('returns empty when no PAT specified', async () => {
      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: '' },
        { strategy: 'all' }
      );
      expect(result.clonedRepos).toEqual([]);
    });

    it('fetches repos from GitHub org API', async () => {
      const repos = [createRepo('repo-a'), createRepo('repo-b')];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue(repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/orgs/test-org/repos'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer ghp_test'
          })
        })
      );
      expect(result.jobId).toBe('job-123');
      expect(result.clonedRepos).toEqual(['repo-a', 'repo-b']);
    });

    it('filters out archived and forked repos', async () => {
      const repos = [
        createRepo('active-repo'),
        createRepo('archived-repo', 'test-org', true, false),
        createRepo('forked-repo', 'test-org', false, true),
      ];
      // API returns all 3, but archived and forked get filtered before pattern matching
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      // Only active-repo should reach the filter
      mockFilterRepositoriesByPattern.mockImplementation((repos: any[]) => repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      // filterRepositoriesByPattern should only receive non-archived, non-forked repos
      expect(mockFilterRepositoriesByPattern).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'active-repo' })]),
        expect.anything()
      );
      const passedRepos = mockFilterRepositoriesByPattern.mock.calls[0][0];
      expect(passedRepos).toHaveLength(1);
      expect(passedRepos[0].name).toBe('active-repo');
    });

    it('filters out repos from other orgs', async () => {
      const repos = [
        createRepo('own-repo', 'test-org'),
        createRepo('other-repo', 'other-org'),
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockImplementation((repos: any[]) => repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      const passedRepos = mockFilterRepositoriesByPattern.mock.calls[0][0];
      expect(passedRepos).toHaveLength(1);
      expect(passedRepos[0].name).toBe('own-repo');
    });

    it('handles 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 401));

      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'bad-pat' },
        { strategy: 'all' }
      );

      expect(result.clonedRepos).toEqual([]);
    });

    it('falls back to /user/repos on 404', async () => {
      const repos = [createRepo('user-repo', 'test-org')];
      // First call to /orgs/test-org/repos returns 404
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 404));
      // Fallback to /user/repos
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue(repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toContain('/user/repos');
      expect(result.clonedRepos).toEqual(['user-repo']);
    });

    it('returns empty when no repos found after fetch', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      expect(result.clonedRepos).toEqual([]);
    });

    it('returns empty when pattern filters out all repos', async () => {
      const repos = [createRepo('repo-a')];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue([]);

      const result = await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'pattern-glob', pattern: 'nonexistent-*' }
      );

      expect(result.clonedRepos).toEqual([]);
    });

    it('builds HTTPS clone URLs with PAT by default', async () => {
      const repos = [createRepo('test-repo')];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue(repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test123' },
        { strategy: 'all' },
        'https'
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      expect(launchCall.repositories[0].cloneUrl).toContain('ghp_test123@github.com');
      expect(launchCall.repositories[0].cloneUrl).toMatch(/^https:\/\//);

    });

    it('builds SSH clone URLs when gitUrlFormat is ssh', async () => {
      const repos = [createRepo('test-repo')];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue(repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test123' },
        { strategy: 'all' },
        'ssh'
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      expect(launchCall.repositories[0].cloneUrl).toBe('git@github.com:test-org/test-repo.git');
      expect(launchCall.repositories[0].cloneUrl).not.toContain('ghp_test123');
    });

    it('uses repositories/{org}/{repo} path structure', async () => {
      const repos = [createRepo('my-repo')];
      mockFetch.mockResolvedValueOnce(createMockResponse(repos));
      mockFilterRepositoriesByPattern.mockReturnValue(repos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      const launchCall = mockLaunchCloneJob.mock.calls[0][0];
      expect(launchCall.repositories[0].path).toBe('repositories/test-org/my-repo');
    });

    it('paginates when more repos than perPage', async () => {
      // Create 100 repos for page 1 (triggers pagination) + fewer for page 2
      const page1 = Array.from({ length: 100 }, (_, i) => createRepo(`repo-${i}`));
      const page2 = [createRepo('repo-100')];

      mockFetch
        .mockResolvedValueOnce(createMockResponse(page1))
        .mockResolvedValueOnce(createMockResponse(page2));

      const allRepos = [...page1, ...page2];
      mockFilterRepositoriesByPattern.mockReturnValue(allRepos);
      mockLaunchCloneJob.mockResolvedValue({
        job: { id: 'job-123' },
        isBackground: true,
        pid: 1234
      });

      await triggerGitHubRepoCloning(
        '/project',
        { org: 'test-org', pat: 'ghp_test' },
        { strategy: 'all' }
      );

      // Should have called fetch twice (two pages)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toContain('page=2');
    });
  });
});
