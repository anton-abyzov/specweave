/**
 * JIRA Items Adapter - OPTIMIZED FOR SCALE
 *
 * Three-tier fetching:
 * 1. getOpenCount() - Single API call, returns total (for status)
 * 2. getOpenItems(filter) - Paginated, filtered (for details)
 *
 * Requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in environment
 */

import {
  ExternalItem,
  ExternalItemsProvider,
  ExternalProvider,
  ItemsFilter,
  PaginatedItemsResult,
  STALE_THRESHOLD_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export class JiraItemsAdapter implements ExternalItemsProvider {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private projectKey: string;
  private logger: Logger;

  constructor(options: {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
    logger?: Logger;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.email = options.email;
    this.apiToken = options.apiToken;
    this.projectKey = options.projectKey;
    this.logger = options.logger ?? consoleLogger;
  }

  static fromEnv(options?: { projectKey?: string; logger?: Logger }): JiraItemsAdapter | null {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const projectKey = options?.projectKey || process.env.JIRA_PROJECT_KEY;

    if (!baseUrl || !email || !apiToken) {
      return null;
    }

    return new JiraItemsAdapter({
      baseUrl,
      email,
      apiToken,
      projectKey: projectKey || '',
      logger: options?.logger,
    });
  }

  getProviderName(): ExternalProvider {
    return 'jira';
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.baseUrl && this.email && this.apiToken);
  }

  /**
   * TIER 1: Fast count - single API call with maxResults=0
   * JIRA returns total even when maxResults=0, so we get count without fetching items
   */
  async getOpenCount(): Promise<number> {
    if (!await this.isConfigured()) {
      return 0;
    }

    try {
      const jql = this.projectKey
        ? `project = "${this.projectKey}" AND status NOT IN (Done, Closed)`
        : 'status NOT IN (Done, Closed)';

      const encodedJql = encodeURIComponent(jql);
      // maxResults=0 returns just the total count without fetching items
      const url = `${this.baseUrl}/rest/api/3/search?jql=${encodedJql}&maxResults=0`;

      const authString = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`JIRA count error: ${response.status} ${response.statusText}`);
        return 0;
      }

      const data = await response.json() as { total: number };
      return data.total || 0;
    } catch (error) {
      this.logger.error(`JIRA count failed: ${error}`);
      return 0;
    }
  }

  /**
   * TIER 3: Paginated items - on-demand with filters
   */
  async getOpenItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    if (!await this.isConfigured()) {
      return this.emptyResult(1, DEFAULT_PAGE_SIZE);
    }

    const limit = Math.min(filter?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = filter?.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    try {
      const jql = this.projectKey
        ? `project = "${this.projectKey}" AND status NOT IN (Done, Closed) ORDER BY created DESC`
        : 'status NOT IN (Done, Closed) ORDER BY created DESC';

      const encodedJql = encodeURIComponent(jql);
      const url = `${this.baseUrl}/rest/api/3/search?jql=${encodedJql}&startAt=${offset}&maxResults=${limit}&fields=key,summary,created,labels,status`;

      const authString = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`JIRA API error: ${response.status} ${response.statusText}`);
        return this.emptyResult(page, limit);
      }

      const data = await response.json() as {
        total: number;
        issues: Array<{
          key: string;
          fields: {
            summary: string;
            created: string;
            labels: string[];
            status: { name: string };
          };
        }>;
      };

      const now = Date.now();
      const total = data.total;
      const totalPages = Math.ceil(total / limit);

      const items: ExternalItem[] = data.issues.map(issue => {
        const createdDate = new Date(issue.fields.created).getTime();
        const ageMs = now - createdDate;
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

        return {
          id: issue.key,
          title: issue.fields.summary,
          url: `${this.baseUrl}/browse/${issue.key}`,
          createdAt: issue.fields.created,
          age: ageDays,
          labels: issue.fields.labels || [],
          provider: 'jira' as ExternalProvider,
          project: this.projectKey || 'default',
          state: issue.fields.status.name,
          isStale: ageDays >= STALE_THRESHOLD_DAYS,
        };
      });

      // Filter stale if requested
      const filteredItems = filter?.staleOnly
        ? items.filter(i => i.isStale)
        : items;

      return {
        items: filteredItems,
        total,
        page,
        pageSize: limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch JIRA issues: ${error}`);
      return this.emptyResult(page, limit);
    }
  }

  private emptyResult(page: number, pageSize: number): PaginatedItemsResult {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    };
  }
}
