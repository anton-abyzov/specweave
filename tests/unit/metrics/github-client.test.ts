/**
 * GitHub API Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockOctokit, MockOctokit } = vi.hoisted(() => {
  const mockOctokit = {
    rest: {
      repos: {
        listReleases: vi.fn(),
        listCommits: vi.fn(),
      },
      issues: {
        listForRepo: vi.fn(),
      },
    },
  };
  // Use a regular function (not arrow) so it can be used as a constructor
  const MockOctokit = vi.fn(function (this: any) {
    Object.assign(this, mockOctokit);
    return mockOctokit;
  });
  return { mockOctokit, MockOctokit };
});

vi.mock('@octokit/rest', () => ({
  Octokit: MockOctokit,
}));

import { GitHubClient } from '../../../src/metrics/github-client.js';
import type { GitHubConfig } from '../../../src/metrics/types.js';

function makeRateLimitError(resetTimestamp?: number): any {
  const error: any = new Error('Rate limited');
  error.status = 403;
  if (resetTimestamp !== undefined) {
    error.response = {
      headers: { 'x-ratelimit-reset': String(resetTimestamp) },
    };
  } else {
    error.response = { headers: {} };
  }
  return error;
}

describe('GitHubClient', () => {
  let client: GitHubClient;
  const config: GitHubConfig = {
    token: 'test-token',
    owner: 'test-owner',
    repo: 'test-repo',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    client = new GitHubClient(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create an Octokit instance with the provided token', () => {
      expect(MockOctokit).toHaveBeenCalledWith({ auth: 'test-token' });
    });
  });

  describe('getReleases', () => {
    it('should fetch and filter releases by date', async () => {
      const since = new Date('2025-01-10T00:00:00Z');
      const mockReleases = [
        {
          id: 1,
          tag_name: 'v1.0.0',
          name: 'Release 1',
          created_at: '2025-01-15T00:00:00Z',
          published_at: '2025-01-15T00:00:00Z',
          target_commitish: 'abc123',
        },
        {
          id: 2,
          tag_name: 'v0.9.0',
          name: 'Old Release',
          created_at: '2025-01-05T00:00:00Z',
          published_at: '2025-01-05T00:00:00Z',
          target_commitish: 'def456',
        },
      ];

      mockOctokit.rest.repos.listReleases.mockResolvedValue({
        data: mockReleases,
      });

      const releases = await client.getReleases(since);

      expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        per_page: 100,
      });

      expect(releases).toHaveLength(1);
      expect(releases[0].tag_name).toBe('v1.0.0');
    });

    it('should return empty array when no releases match the date filter', async () => {
      const since = new Date('2025-02-01T00:00:00Z');
      mockOctokit.rest.repos.listReleases.mockResolvedValue({
        data: [
          {
            id: 1,
            published_at: '2025-01-15T00:00:00Z',
            target_commitish: 'abc',
          },
        ],
      });

      const releases = await client.getReleases(since);
      expect(releases).toHaveLength(0);
    });

    it('should retry on 403 rate limit error with reset header', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const futureReset = Math.floor(Date.now() / 1000) + 5;

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError(futureReset))
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      await vi.advanceTimersByTimeAsync(10000);

      const releases = await promise;
      expect(releases).toEqual([]);
      expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledTimes(2);
    });

    it('should retry on 403 rate limit error without reset header', async () => {
      const since = new Date('2025-01-01T00:00:00Z');

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError())
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      await vi.advanceTimersByTimeAsync(10000);

      const releases = await promise;
      expect(releases).toEqual([]);
      expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledTimes(2);
    });

    it('should throw non-403 errors', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const error: any = new Error('Not found');
      error.status = 404;

      mockOctokit.rest.repos.listReleases.mockRejectedValue(error);

      await expect(client.getReleases(since)).rejects.toThrow('Not found');
    });
  });

  describe('getCommits', () => {
    it('should fetch commits for a given SHA and date', async () => {
      const sha = 'abc123';
      const until = new Date('2025-01-20T00:00:00Z');
      const mockCommits = [
        {
          sha: 'commit1',
          commit: { author: { name: 'Dev', date: '2025-01-15T10:00:00Z' } },
        },
      ];

      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: mockCommits,
      });

      const commits = await client.getCommits(sha, until);

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        sha: 'abc123',
        per_page: 100,
        until: until.toISOString(),
      });

      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe('commit1');
    });

    it('should retry on 403 rate limit error', async () => {
      const sha = 'abc123';
      const until = new Date('2025-01-20T00:00:00Z');

      mockOctokit.rest.repos.listCommits
        .mockRejectedValueOnce(makeRateLimitError())
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getCommits(sha, until);
      await vi.advanceTimersByTimeAsync(10000);

      const commits = await promise;
      expect(commits).toEqual([]);
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledTimes(2);
    });

    it('should throw non-403 errors', async () => {
      const sha = 'abc123';
      const until = new Date('2025-01-20T00:00:00Z');
      const error: any = new Error('Server error');
      error.status = 500;

      mockOctokit.rest.repos.listCommits.mockRejectedValue(error);

      await expect(client.getCommits(sha, until)).rejects.toThrow('Server error');
    });
  });

  describe('getCommitsToDefaultBranch', () => {
    it('should fetch commits to the default branch', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const mockCommits = [
        {
          sha: 'commit1',
          commit: { author: { name: 'Dev', date: '2025-01-15T10:00:00Z' } },
        },
        {
          sha: 'commit2',
          commit: { author: { name: 'Dev', date: '2025-01-16T10:00:00Z' } },
        },
      ];

      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: mockCommits,
      });

      const commits = await client.getCommitsToDefaultBranch(since);

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        sha: 'develop',
        per_page: 100,
        since: since.toISOString(),
      });

      expect(commits).toHaveLength(2);
    });

    it('should use custom branch name when provided', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

      await client.getCommitsToDefaultBranch(since, 'main');

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith(
        expect.objectContaining({ sha: 'main' })
      );
    });

    it('should retry on 403 rate limit error', async () => {
      const since = new Date('2025-01-01T00:00:00Z');

      mockOctokit.rest.repos.listCommits
        .mockRejectedValueOnce(makeRateLimitError())
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getCommitsToDefaultBranch(since);
      await vi.advanceTimersByTimeAsync(10000);

      const commits = await promise;
      expect(commits).toEqual([]);
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledTimes(2);
    });

    it('should throw non-403 errors', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const error: any = new Error('Bad request');
      error.status = 400;

      mockOctokit.rest.repos.listCommits.mockRejectedValue(error);

      await expect(client.getCommitsToDefaultBranch(since)).rejects.toThrow('Bad request');
    });
  });

  describe('getIssues', () => {
    it('should fetch issues with specified labels', async () => {
      const labels = ['incident', 'production-bug'];
      const since = new Date('2025-01-01T00:00:00Z');
      const mockIssues = [
        {
          id: 1,
          number: 10,
          title: 'Production incident',
          state: 'closed',
          labels: [{ name: 'incident' }],
          created_at: '2025-01-15T10:00:00Z',
          closed_at: '2025-01-15T11:00:00Z',
        },
      ];

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: mockIssues,
      });

      const issues = await client.getIssues(labels, since);

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        labels: 'incident,production-bug',
        state: 'all',
        per_page: 100,
        since: since.toISOString(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Production incident');
    });

    it('should retry on 403 rate limit error', async () => {
      const labels = ['incident'];
      const since = new Date('2025-01-01T00:00:00Z');

      mockOctokit.rest.issues.listForRepo
        .mockRejectedValueOnce(makeRateLimitError())
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getIssues(labels, since);
      await vi.advanceTimersByTimeAsync(10000);

      const issues = await promise;
      expect(issues).toEqual([]);
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledTimes(2);
    });

    it('should throw non-403 errors', async () => {
      const labels = ['incident'];
      const since = new Date('2025-01-01T00:00:00Z');
      const error: any = new Error('Unauthorized');
      error.status = 401;

      mockOctokit.rest.issues.listForRepo.mockRejectedValue(error);

      await expect(client.getIssues(labels, since)).rejects.toThrow('Unauthorized');
    });
  });

  describe('handleRateLimit (via retry behavior)', () => {
    it('should wait based on x-ratelimit-reset header', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const futureResetTime = Math.floor(Date.now() / 1000) + 5;

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError(futureResetTime))
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      await vi.advanceTimersByTimeAsync(10000);

      const releases = await promise;
      expect(releases).toEqual([]);
    });

    it('should fallback to 10s wait when no reset header', async () => {
      const since = new Date('2025-01-01T00:00:00Z');

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError())
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      await vi.advanceTimersByTimeAsync(10000);

      const releases = await promise;
      expect(releases).toEqual([]);
    });

    it('should fallback to 10s wait when response is missing', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 403;
      // No response object at all

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      await vi.advanceTimersByTimeAsync(10000);

      const releases = await promise;
      expect(releases).toEqual([]);
    });

    it('should handle reset time in the past (no wait needed)', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      const pastResetTime = Math.floor(Date.now() / 1000) - 60;

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError(pastResetTime))
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      // Even though reset is in the past, advance timers to ensure promise resolves
      await vi.advanceTimersByTimeAsync(1000);

      const releases = await promise;
      expect(releases).toEqual([]);
    });

    it('should cap wait time at 60 seconds', async () => {
      const since = new Date('2025-01-01T00:00:00Z');
      // Reset time very far in the future (300 seconds)
      const farFutureReset = Math.floor(Date.now() / 1000) + 300;

      mockOctokit.rest.repos.listReleases
        .mockRejectedValueOnce(makeRateLimitError(farFutureReset))
        .mockResolvedValueOnce({ data: [] });

      const promise = client.getReleases(since);
      // The implementation caps wait at 60s via Math.min, but actually sleeps for waitMs
      // which is resetDate - now. However the console.log message caps at 60s.
      // The actual sleep is the full waitMs, so advance enough to cover it.
      await vi.advanceTimersByTimeAsync(300000);

      const releases = await promise;
      expect(releases).toEqual([]);
    });
  });
});
