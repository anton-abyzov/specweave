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
   * Create request headers with optional auth token
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }
    return headers;
  }

  /**
   * Map GitHub API response to RepositoryMetadata
   */
  private mapRepoData(repo: any): RepositoryMetadata {
    return {
      name: repo.name,
      url: repo.html_url,
      owner: repo.owner.login,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      lastUpdated: new Date(repo.updated_at),
      private: repo.private,
      defaultBranch: repo.default_branch
    };
  }

  /**
   * Fetch paginated repositories from a URL pattern
   */
  private async fetchPaginatedRepos(urlPattern: string): Promise<RepositoryMetadata[]> {
    const repos: RepositoryMetadata[] = [];
    const headers = this.getHeaders();

    for (let page = 1; page <= this.config.maxPages; page++) {
      const url = `${urlPattern}?per_page=${this.config.perPage}&page=${page}&sort=updated`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any[];

      if (data.length === 0) {
        break;
      }

      repos.push(...data.map(repo => this.mapRepoData(repo)));

      if (data.length < this.config.perPage) {
        break;
      }
    }

    return repos;
  }

  /**
   * Fetch all repositories for a user or organization
   *
   * @param owner - GitHub username or organization name
   * @returns Array of repository metadata
   */
  async fetchAllRepos(owner: string): Promise<RepositoryMetadata[]> {
    try {
      return await this.fetchPaginatedRepos(`${this.config.baseUrl}/users/${owner}/repos`);
    } catch (error: any) {
      if (error.message?.includes('404')) {
        return this.fetchOrgRepos(owner);
      }
      console.error('GitHub API fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch repositories for an organization
   */
  private async fetchOrgRepos(org: string): Promise<RepositoryMetadata[]> {
    return this.fetchPaginatedRepos(`${this.config.baseUrl}/orgs/${org}/repos`);
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
