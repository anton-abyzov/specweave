/**
 * GitHub API Client
 *
 * Wrapper around Octokit for fetching DORA metrics data
 * Handles authentication, rate limiting, and error handling
 */

import { Octokit } from '@octokit/rest';
import { Release, Commit, Issue, GitHubConfig } from './types.js';

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GitHub API Client for DORA Metrics
 */
export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Get releases from last N days
   *
   * @param since - Date to fetch releases from
   * @returns Array of releases
   */
  async getReleases(since: Date): Promise<Release[]> {
    try {
      const response = await this.octokit.rest.repos.listReleases({
        owner: this.owner,
        repo: this.repo,
        per_page: 100,
      });

      // Filter by date
      return response.data.filter(release => {
        const publishedAt = new Date(release.published_at!);
        return publishedAt >= since;
      }) as Release[];
    } catch (error: any) {
      if (error.status === 403) {
        await this.handleRateLimit(error);
        return this.getReleases(since);  // Retry
      }
      throw error;
    }
  }

  /**
   * Get commits for a specific SHA range
   *
   * @param sha - Commit SHA to start from
   * @param until - Date to fetch commits until
   * @returns Array of commits
   */
  async getCommits(sha: string, until: Date): Promise<Commit[]> {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha,
        per_page: 100,
        until: until.toISOString(),
      });

      return response.data as unknown as Commit[];
    } catch (error: any) {
      if (error.status === 403) {
        await this.handleRateLimit(error);
        return this.getCommits(sha, until);  // Retry
      }
      throw error;
    }
  }

  /**
   * Get issues with specific labels
   *
   * @param labels - Array of label names to filter by
   * @param since - Date to fetch issues from
   * @returns Array of issues
   */
  async getIssues(labels: string[], since: Date): Promise<Issue[]> {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        labels: labels.join(','),
        state: 'all',  // Include open and closed
        per_page: 100,
        since: since.toISOString(),
      });

      return response.data as unknown as Issue[];
    } catch (error: any) {
      if (error.status === 403) {
        await this.handleRateLimit(error);
        return this.getIssues(labels, since);  // Retry
      }
      throw error;
    }
  }

  /**
   * Handle GitHub API rate limit errors
   *
   * Implements exponential backoff:
   * 1. Check X-RateLimit-Reset header
   * 2. Wait until reset time (max 1 minute)
   * 3. Retry request
   *
   * @param error - GitHub API error
   */
  private async handleRateLimit(error: any): Promise<void> {
    const resetTime = error.response?.headers?.['x-ratelimit-reset'];
    if (resetTime) {
      const resetDate = new Date(parseInt(resetTime) * 1000);
      const now = new Date();
      const waitMs = resetDate.getTime() - now.getTime();

      if (waitMs > 0) {
        const waitSeconds = Math.min(waitMs / 1000, 60);  // Max 1 minute
        console.log(`⏳ GitHub API rate limited. Waiting ${waitSeconds}s...`);
        await sleep(waitMs);
      }
    } else {
      // Fallback: wait 10 seconds
      await sleep(10000);
    }
  }
}
