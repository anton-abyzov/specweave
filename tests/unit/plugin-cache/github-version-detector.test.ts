import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubVersionDetector } from '../../../src/core/plugin-cache/github-version-detector.js';
import { StalenessResult } from '../../../src/core/plugin-cache/types.js';

// Helper to create mock Headers object
const createMockHeaders = (entries: [string, string][]): any => {
  const map = new Map(entries);
  return {
    get: (key: string) => map.get(key) || null,
    has: (key: string) => map.has(key),
    entries: () => map.entries(),
    keys: () => map.keys(),
    values: () => map.values()
  };
};

// Mock fetch for GitHub API calls
global.fetch = vi.fn();

describe('GitHubVersionDetector', () => {
  let detector: GitHubVersionDetector;

  beforeEach(() => {
    detector = new GitHubVersionDetector();
    vi.clearAllMocks();
    // Reset fetch mock completely (clear queued responses and call history)
    (global.fetch as any).mockReset();
    // Clear internal API cache to prevent test pollution
    detector.clearCache();
  });

  describe('getLatestCommitSHA', () => {
    it('should fetch latest commit SHA from GitHub API', async () => {
      const mockResponse = [
        {
          sha: 'abc123def456',
          commit: {
            message: 'Latest commit'
          }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const sha = await detector.getLatestCommitSHA('plugins/specweave');

      expect(sha).toBe('abc123def456');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/anton-abyzov/specweave/commits'),
        expect.any(Object)
      );
    });

    it('should use cached result within TTL', async () => {
      const mockResponse = [{ sha: 'cached123' }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const sha1 = await detector.getLatestCommitSHA('plugins/specweave');
      const sha2 = await detector.getLatestCommitSHA('plugins/specweave');

      expect(sha1).toBe('cached123');
      expect(sha2).toBe('cached123');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle GitHub API rate limit', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 403,
        json: async () => ({ message: 'rate limit exceeded' }),
        headers: createMockHeaders([['x-ratelimit-remaining', '0']])
      });

      await expect(detector.getLatestCommitSHA('plugins/specweave')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(detector.getLatestCommitSHA('plugins/specweave')).rejects.toThrow();
    });

    it('should include GitHub token in Authorization header if available', async () => {
      process.env.GITHUB_TOKEN = 'test-token-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ sha: 'abc' }],
        headers: createMockHeaders([['x-ratelimit-remaining', '5000']])
      });

      await detector.getLatestCommitSHA('plugins/specweave');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123'
          })
        })
      );

      delete process.env.GITHUB_TOKEN;
    });
  });

  describe('compareCommits', () => {
    it('should detect when commits are different', async () => {
      const mockCompareResponse = {
        status: 'ahead',
        ahead_by: 3,
        files: [
          { filename: 'plugins/specweave/hooks/stop.sh', status: 'modified' },
          { filename: 'plugins/specweave/scripts/reflect.sh', status: 'modified' }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompareResponse,
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const result = await detector.compareCommits('old-sha', 'new-sha', 'plugins/specweave');

      expect(result.different).toBe(true);
      expect(result.commitsBehind).toBe(3);
      expect(result.changedFiles).toContain('plugins/specweave/hooks/stop.sh');
      expect(result.changedFiles).toContain('plugins/specweave/scripts/reflect.sh');
    });

    it('should detect when commits are identical', async () => {
      const mockCompareResponse = {
        status: 'identical',
        ahead_by: 0,
        files: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompareResponse,
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const result = await detector.compareCommits('same-sha', 'same-sha', 'plugins/specweave');

      expect(result.different).toBe(false);
      expect(result.commitsBehind).toBe(0);
      expect(result.changedFiles).toEqual([]);
    });

    it('should filter files by plugin path', async () => {
      const mockCompareResponse = {
        status: 'ahead',
        ahead_by: 2,
        files: [
          { filename: 'plugins/specweave/hook.sh', status: 'modified' },
          { filename: 'plugins/other-plugin/script.sh', status: 'modified' },
          { filename: 'src/core/file.ts', status: 'modified' }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompareResponse,
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const result = await detector.compareCommits('old', 'new', 'plugins/specweave');

      // Should only include files in plugins/specweave path
      expect(result.changedFiles).toContain('plugins/specweave/hook.sh');
      expect(result.changedFiles).not.toContain('plugins/other-plugin/script.sh');
      expect(result.changedFiles).not.toContain('src/core/file.ts');
    });
  });

  describe('checkStaleness', () => {
    it('should detect stale cache with commit change', async () => {
      const mockMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'old-commit-sha',
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        checksums: {}
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ sha: 'new-commit-sha' }],
          headers: createMockHeaders([['x-ratelimit-remaining', '59']])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'ahead',
            ahead_by: 5,
            files: [{ filename: 'plugins/specweave/hooks/stop.sh' }]
          }),
          headers: createMockHeaders([['x-ratelimit-remaining', '58']])
        });

      const result = await detector.checkStaleness(mockMetadata, 'plugins/specweave');

      expect(result.stale).toBe(true);
      expect(result.reason).toBe('commit_changed');
      expect(result.cacheCommit).toBe('old-commit-sha');
      expect(result.githubCommit).toBe('new-commit-sha');
      expect(result.severity).toBe('high');
    });

    it('should mark as not stale when commits match', async () => {
      const mockMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'current-sha',
        lastUpdated: new Date().toISOString(),
        checksums: {}
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ sha: 'current-sha' }],
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const result = await detector.checkStaleness(mockMetadata, 'plugins/specweave');

      expect(result.stale).toBe(false);
      expect(result.reason).toBe('none');
      expect(result.severity).toBe('low');
    });

    it('should detect stale cache based on age alone', async () => {
      const mockMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'same-sha',
        lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days old
        checksums: {}
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ sha: 'same-sha' }],
        headers: createMockHeaders([['x-ratelimit-remaining', '59']])
      });

      const result = await detector.checkStaleness(mockMetadata, 'plugins/specweave');

      expect(result.stale).toBe(true);
      expect(result.reason).toBe('age');
      expect(result.severity).toBe('medium');
    });

    it('should handle offline mode gracefully', async () => {
      const mockMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc',
        lastUpdated: new Date().toISOString(),
        checksums: {}
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('Network offline'));

      const result = await detector.checkStaleness(mockMetadata, 'plugins/specweave');

      // Should return non-stale result when offline (graceful degradation)
      expect(result.stale).toBe(false);
      expect(result.message).toContain('offline');
    });
  });

  describe('getRateLimitInfo', () => {
    it('should parse rate limit from response headers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ sha: 'abc' }],
        headers: createMockHeaders([
          ['x-ratelimit-limit', '60'],
          ['x-ratelimit-remaining', '42'],
          ['x-ratelimit-reset', '1704672000']
        ])
      });

      await detector.getLatestCommitSHA('plugins/specweave');
      const rateLimit = detector.getRateLimitInfo();

      expect(rateLimit.limit).toBe(60);
      expect(rateLimit.remaining).toBe(42);
      expect(rateLimit.reset).toBe(1704672000);
    });

    it('should return default when no rate limit headers', () => {
      const rateLimit = detector.getRateLimitInfo();

      expect(rateLimit.limit).toBe(60); // Default unauthenticated
      expect(rateLimit.remaining).toBeGreaterThanOrEqual(0);
    });
  });
});
