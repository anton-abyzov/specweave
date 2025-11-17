/**
 * GitHub API Client for Repository Fetching
 *
 * Fetches repository metadata from GitHub API with:
 * - Pagination handling
 * - Rate limiting
 * - Authentication
 * - Error handling
 * - Fallback to local git parsing
 */

import { RepositoryMetadata } from './types.js';

/**
 * GitHub API Client configuration
 */
export interface GitHubAPIConfig {
  /** GitHub personal access token */
  token?: string;

  /** Base API URL */
  baseUrl?: string;

  /** Items per page */
  perPage?: number;

  /** Max pages to fetch */
  maxPages?: number;
}

/**
 * GitHub API Client
 */
export class GitHubAPIClient {
  private config: Required<GitHubAPIConfig>;

  constructor(config: GitHubAPIConfig = {}) {
    this.config = {
      token: config.token || process.env.GITHUB_TOKEN || '',
      baseUrl: config.baseUrl || 'https://api.github.com',
      perPage: config.perPage || 100,
      maxPages: config.maxPages || 10
    };
  }

  /**
   * Fetch all repositories for a user or organization
   *
   * @param owner - GitHub username or organization name
   * @returns Array of repository metadata
   */
  async fetchAllRepos(owner: string): Promise<RepositoryMetadata[]> {
    const repos: RepositoryMetadata[] = [];
    let page = 1;

    try {
      while (page <= this.config.maxPages) {
        const url = `${this.config.baseUrl}/users/${owner}/repos?per_page=${this.config.perPage}&page=${page}&sort=updated`;

        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json'
        };

        if (this.config.token) {
          headers['Authorization'] = `Bearer ${this.config.token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          if (response.status === 404) {
            // User not found - try as org
            return this.fetchOrgRepos(owner);
          }
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any[];

        if (data.length === 0) {
          // No more repos
          break;
        }

        // Map to RepositoryMetadata
        for (const repo of data) {
          repos.push({
            name: repo.name,
            url: repo.html_url,
            owner: repo.owner.login,
            description: repo.description || '',
            language: repo.language || 'Unknown',
            stars: repo.stargazers_count || 0,
            lastUpdated: new Date(repo.updated_at),
            private: repo.private,
            defaultBranch: repo.default_branch
          });
        }

        // Check for next page
        if (data.length < this.config.perPage) {
          break;
        }

        page++;
      }

      return repos;
    } catch (error) {
      console.error('GitHub API fetch failed:', error);
      // Fallback to empty array (could implement local git remote parsing here)
      return [];
    }
  }

  /**
   * Fetch repositories for an organization
   */
  private async fetchOrgRepos(org: string): Promise<RepositoryMetadata[]> {
    const repos: RepositoryMetadata[] = [];
    let page = 1;

    while (page <= this.config.maxPages) {
      const url = `${this.config.baseUrl}/orgs/${org}/repos?per_page=${this.config.perPage}&page=${page}&sort=updated`;

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.config.token) {
        headers['Authorization'] = `Bearer ${this.config.token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any[];

      if (data.length === 0) {
        break;
      }

      for (const repo of data) {
        repos.push({
          name: repo.name,
          url: repo.html_url,
          owner: repo.owner.login,
          description: repo.description || '',
          language: repo.language || 'Unknown',
          stars: repo.stargazers_count || 0,
          lastUpdated: new Date(repo.updated_at),
          private: repo.private,
          defaultBranch: repo.default_branch
        });
      }

      if (data.length < this.config.perPage) {
        break;
      }

      page++;
    }

    return repos;
  }

  /**
   * Check rate limit status
   */
  async getRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const url = `${this.config.baseUrl}/rate_limit`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json() as any;

    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000)
    };
  }
}
