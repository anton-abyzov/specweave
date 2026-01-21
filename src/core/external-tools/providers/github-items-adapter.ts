/**
 * GitHub Items Adapter - OPTIMIZED FOR SCALE
 *
 * Three-tier fetching:
 * 1. getOpenCount() - Single API call, returns total (for status)
 * 2. getOpenItems(filter) - Paginated, filtered (for details)
 */

import { execFileNoThrow } from '../../../utils/execFileNoThrow.js';
import {
  ExternalItem,
  ExternalItemsProvider,
  ExternalProvider,
  ItemsFilter,
  PaginatedItemsResult,
  STALE_THRESHOLD_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  calculateAgeDays,
  emptyPaginatedResult,
  filterByStale,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

interface GitHubIssueRaw {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  labels: Array<{ name: string }>;
  state: string;
}

interface GitHubSearchResult {
  total_count: number;
  items: GitHubIssueRaw[];
}

export class GitHubItemsAdapter implements ExternalItemsProvider {
  private owner: string;
  private repo: string;
  private logger: Logger;

  constructor(options: {
    owner: string;
    repo: string;
    logger?: Logger;
  }) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Create adapter from auto-detected git remote
   */
  static async fromGitRemote(options?: { logger?: Logger }): Promise<GitHubItemsAdapter | null> {
    const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin']);

    if (result.exitCode !== 0) {
      return null;
    }

    const remote = result.stdout.trim();
    const match = remote.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);

    if (!match) {
      return null;
    }

    return new GitHubItemsAdapter({
      owner: match[1],
      repo: match[2],
      logger: options?.logger,
    });
  }

  getProviderName(): ExternalProvider {
    return 'github';
  }

  async isConfigured(): Promise<boolean> {
    const result = await execFileNoThrow('gh', ['auth', 'status']);
    return result.exitCode === 0;
  }

  /**
   * TIER 1: Fast count - single API call
   * Uses GitHub search API to get total_count without fetching items
   */
  async getOpenCount(): Promise<number> {
    // Use search API with per_page=1 to get total_count efficiently
    const query = `repo:${this.owner}/${this.repo} is:issue is:open`;
    const result = await execFileNoThrow('gh', [
      'api',
      'search/issues',
      '-X', 'GET',
      '-f', `q=${query}`,
      '-f', 'per_page=1',
      '--jq', '.total_count',
    ]);

    if (result.exitCode !== 0) {
      this.logger.error(`GitHub count failed: ${result.stderr}`);
      return 0;
    }

    return parseInt(result.stdout.trim(), 10) || 0;
  }

  /**
   * TIER 3: Paginated items - on-demand with filters
   */
  async getOpenItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    const limit = Math.min(filter?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = filter?.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const total = await this.getOpenCount();

    const result = await execFileNoThrow('gh', [
      'issue',
      'list',
      '--repo', `${this.owner}/${this.repo}`,
      '--state', 'open',
      '--limit', String(limit),
      '--json', 'number,title,url,createdAt,labels,state',
    ]);

    if (result.exitCode !== 0) {
      this.logger.error(`GitHub items failed: ${result.stderr}`);
      return emptyPaginatedResult(page, limit);
    }

    try {
      const issues: GitHubIssueRaw[] = JSON.parse(result.stdout);

      const items: ExternalItem[] = issues.map(issue => {
        const ageDays = calculateAgeDays(issue.createdAt);
        return {
          id: `#${issue.number}`,
          title: issue.title,
          url: issue.url,
          createdAt: issue.createdAt,
          age: ageDays,
          labels: issue.labels.map(l => l.name),
          provider: 'github' as ExternalProvider,
          project: `${this.owner}/${this.repo}`,
          state: issue.state,
          isStale: ageDays >= STALE_THRESHOLD_DAYS,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        items: filterByStale(items, filter?.staleOnly),
        total,
        page,
        pageSize: limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      this.logger.error(`GitHub parse failed: ${error}`);
      return emptyPaginatedResult(page, limit);
    }
  }
}
