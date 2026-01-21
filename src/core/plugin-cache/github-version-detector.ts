/**
 * GitHub Version Detector
 *
 * Compares cached plugin versions with GitHub source to detect staleness.
 */

import {
  CacheMetadata,
  StalenessResult,
  GitHubRateLimit,
  CachedGitHubResponse,
  CommitComparisonResult
} from './types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Detects version staleness by comparing with GitHub
 */
export class GitHubVersionDetector {
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  private static readonly GITHUB_OWNER = 'anton-abyzov';
  private static readonly GITHUB_REPO = 'specweave';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly AGE_THRESHOLD_DAYS = 14; // Consider stale if >14 days old

  private apiCache: Map<string, CachedGitHubResponse<any>> = new Map();
  private rateLimit: GitHubRateLimit = {
    limit: 60,
    remaining: 60,
    reset: 0
  };

  /**
   * Get latest commit SHA for a path in the repository
   *
   * @param pluginPath - Path in repository (e.g., "plugins/specweave")
   * @returns Latest commit SHA
   */
  async getLatestCommitSHA(pluginPath: string): Promise<string> {
    const cacheKey = `commits:${pluginPath}`;

    // Check cache
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) {
      return cached[0].sha;
    }

    const url = `${GitHubVersionDetector.GITHUB_API_BASE}/repos/${GitHubVersionDetector.GITHUB_OWNER}/${GitHubVersionDetector.GITHUB_REPO}/commits?path=${pluginPath}&per_page=1`;

    const response = await this.fetchGitHub(url);
    const commits = await response.json();

    if (!commits || commits.length === 0) {
      throw new Error(`No commits found for path: ${pluginPath}`);
    }

    this.setCached(cacheKey, commits);
    return commits[0].sha;
  }

  /**
   * Compare two commits and get changed files
   *
   * @param baseCommit - Base commit SHA
   * @param headCommit - Head commit SHA
   * @param filterPath - Only return files in this path
   * @returns Comparison result
   */
  async compareCommits(
    baseCommit: string,
    headCommit: string,
    filterPath?: string
  ): Promise<CommitComparisonResult> {
    if (baseCommit === headCommit) {
      return {
        different: false,
        baseCommit,
        headCommit,
        changedFiles: [],
        commitsBehind: 0
      };
    }

    const cacheKey = `compare:${baseCommit}:${headCommit}`;
    let comparison = this.getCached<any>(cacheKey);

    if (!comparison) {
      const url = `${GitHubVersionDetector.GITHUB_API_BASE}/repos/${GitHubVersionDetector.GITHUB_OWNER}/${GitHubVersionDetector.GITHUB_REPO}/compare/${baseCommit}...${headCommit}`;
      const response = await this.fetchGitHub(url);
      comparison = await response.json();
      this.setCached(cacheKey, comparison);
    }

    const changedFiles = (comparison.files || [])
      .map((f: any) => f.filename)
      .filter((f: string) => !filterPath || f.startsWith(filterPath));

    return {
      different: comparison.status !== 'identical',
      baseCommit,
      headCommit,
      changedFiles,
      commitsBehind: comparison.ahead_by || 0
    };
  }

  /**
   * Check if cache is stale
   *
   * @param metadata - Cache metadata
   * @param pluginPath - Plugin path in repository
   * @returns Staleness result
   */
  async checkStaleness(
    metadata: CacheMetadata,
    pluginPath: string
  ): Promise<StalenessResult> {
    try {
      const latestCommit = await this.getLatestCommitSHA(pluginPath);

      // Check commit difference
      if (metadata.commitSha !== latestCommit) {
        const comparison = await this.compareCommits(
          metadata.commitSha,
          latestCommit,
          pluginPath
        );

        return {
          stale: true,
          reason: 'commit_changed',
          cacheCommit: metadata.commitSha,
          githubCommit: latestCommit,
          affectedFiles: comparison.changedFiles,
          severity: 'high',
          message: `Cache is ${comparison.commitsBehind} commit(s) behind GitHub`
        };
      }

      // Check age
      const ageMs = Date.now() - new Date(metadata.lastUpdated).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      if (ageDays > GitHubVersionDetector.AGE_THRESHOLD_DAYS) {
        return {
          stale: true,
          reason: 'age',
          cacheCommit: metadata.commitSha,
          githubCommit: latestCommit,
          severity: 'medium',
          message: `Cache is ${Math.floor(ageDays)} days old (threshold: ${GitHubVersionDetector.AGE_THRESHOLD_DAYS})`
        };
      }

      return {
        stale: false,
        reason: 'none',
        cacheCommit: metadata.commitSha,
        githubCommit: latestCommit,
        severity: 'low',
        message: 'Cache is up to date'
      };
    } catch (error) {
      logger.warn(`Failed to check staleness: ${error}`);

      // Graceful degradation when offline
      return {
        stale: false,
        reason: 'none',
        severity: 'low',
        message: `Unable to check GitHub (offline or rate limited): ${error}`
      };
    }
  }

  /**
   * Get rate limit information
   *
   * @returns Current rate limit status
   */
  getRateLimitInfo(): GitHubRateLimit {
    return { ...this.rateLimit };
  }

  /**
   * Clear API cache (useful for testing)
   */
  clearCache(): void {
    this.apiCache.clear();
  }

  /**
   * Fetch from GitHub API with authentication and rate limit handling
   *
   * @param url - API URL
   * @returns Response
   */
  private async fetchGitHub(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json'
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    // Update rate limit from headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining) this.rateLimit.remaining = parseInt(remaining, 10);
    if (limit) this.rateLimit.limit = parseInt(limit, 10);
    if (reset) this.rateLimit.reset = parseInt(reset, 10);

    if (!response.ok) {
      if (response.status === 403 && this.rateLimit.remaining === 0) {
        throw new Error('GitHub API rate limit exceeded');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Get cached response if not expired
   *
   * @param key - Cache key
   * @returns Cached data or undefined
   */
  private getCached<T>(key: string): T | undefined {
    const cached = this.apiCache.get(key);
    if (!cached) return undefined;

    const age = Date.now() - cached.cachedAt;
    if (age > cached.ttl) {
      this.apiCache.delete(key);
      return undefined;
    }

    return cached.data as T;
  }

  /**
   * Cache a response
   *
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCached(key: string, data: any): void {
    this.apiCache.set(key, {
      data,
      cachedAt: Date.now(),
      ttl: GitHubVersionDetector.CACHE_TTL
    });
  }
}
