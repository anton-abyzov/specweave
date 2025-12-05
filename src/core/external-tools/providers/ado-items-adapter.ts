/**
 * Azure DevOps Items Adapter - OPTIMIZED FOR SCALE
 *
 * Three-tier fetching:
 * 1. getOpenCount() - Single WIQL query, returns count (for status)
 * 2. getOpenItems(filter) - Paginated, filtered (for details)
 *
 * Requires ADO_ORG_URL, ADO_PROJECT, ADO_PAT in environment
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

export class AdoItemsAdapter implements ExternalItemsProvider {
  private orgUrl: string;
  private project: string;
  private pat: string;
  private logger: Logger;

  constructor(options: {
    orgUrl: string;
    project: string;
    pat: string;
    logger?: Logger;
  }) {
    this.orgUrl = options.orgUrl.replace(/\/$/, '');
    this.project = options.project;
    this.pat = options.pat;
    this.logger = options.logger ?? consoleLogger;
  }

  static fromEnv(options?: { logger?: Logger }): AdoItemsAdapter | null {
    const orgUrl = process.env.ADO_ORG_URL || process.env.AZURE_DEVOPS_ORG_URL;
    const project = process.env.ADO_PROJECT || process.env.AZURE_DEVOPS_PROJECT;
    const pat = process.env.ADO_PAT || process.env.AZURE_DEVOPS_PAT;

    if (!orgUrl || !project || !pat) {
      return null;
    }

    return new AdoItemsAdapter({
      orgUrl,
      project,
      pat,
      logger: options?.logger,
    });
  }

  getProviderName(): ExternalProvider {
    return 'ado';
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.orgUrl && this.project && this.pat);
  }

  /**
   * TIER 1: Fast count - single WIQL query, just count IDs
   * WIQL returns workItem IDs, we just count them without fetching details
   */
  async getOpenCount(): Promise<number> {
    if (!await this.isConfigured()) {
      return 0;
    }

    try {
      const wiql = {
        query: `SELECT [System.Id]
                FROM WorkItems
                WHERE [System.TeamProject] = '${this.project}'
                AND [System.State] NOT IN ('Done', 'Closed', 'Removed', 'Completed')`,
      };

      const queryUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=7.0`;
      const authString = Buffer.from(`:${this.pat}`).toString('base64');

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wiql),
      });

      if (!response.ok) {
        this.logger.error(`ADO count error: ${response.status} ${response.statusText}`);
        return 0;
      }

      const data = await response.json() as {
        workItems: Array<{ id: number }>;
      };

      return data.workItems?.length || 0;
    } catch (error) {
      this.logger.error(`ADO count failed: ${error}`);
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
      // First get all IDs (for total count and pagination)
      const wiql = {
        query: `SELECT [System.Id]
                FROM WorkItems
                WHERE [System.TeamProject] = '${this.project}'
                AND [System.State] NOT IN ('Done', 'Closed', 'Removed', 'Completed')
                ORDER BY [System.CreatedDate] DESC`,
      };

      const queryUrl = `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=7.0`;
      const authString = Buffer.from(`:${this.pat}`).toString('base64');

      const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wiql),
      });

      if (!queryResponse.ok) {
        this.logger.error(`ADO WIQL error: ${queryResponse.status} ${queryResponse.statusText}`);
        return this.emptyResult(page, limit);
      }

      const queryData = await queryResponse.json() as {
        workItems: Array<{ id: number }>;
      };

      const allIds = queryData.workItems || [];
      const total = allIds.length;
      const totalPages = Math.ceil(total / limit);

      if (total === 0) {
        return this.emptyResult(page, limit);
      }

      // Get IDs for current page
      const pageIds = allIds.slice(offset, offset + limit).map(wi => wi.id);

      if (pageIds.length === 0) {
        return {
          items: [],
          total,
          page,
          pageSize: limit,
          totalPages,
          hasMore: false,
        };
      }

      // Fetch details for page
      const detailsUrl = `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${pageIds.join(',')}&fields=System.Id,System.Title,System.CreatedDate,System.State,System.Tags&api-version=7.0`;
      const detailsResponse = await fetch(detailsUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      });

      if (!detailsResponse.ok) {
        this.logger.error(`ADO details error: ${detailsResponse.status}`);
        return this.emptyResult(page, limit);
      }

      const detailsData = await detailsResponse.json() as {
        value: Array<{
          id: number;
          fields: {
            'System.Title': string;
            'System.CreatedDate': string;
            'System.State': string;
            'System.Tags'?: string;
          };
          _links: {
            html: { href: string };
          };
        }>;
      };

      const now = Date.now();

      const items: ExternalItem[] = detailsData.value.map(item => {
        const createdDate = new Date(item.fields['System.CreatedDate']).getTime();
        const ageMs = now - createdDate;
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const tags = item.fields['System.Tags']?.split(';').map(t => t.trim()) || [];

        return {
          id: `#${item.id}`,
          title: item.fields['System.Title'],
          url: item._links.html.href,
          createdAt: item.fields['System.CreatedDate'],
          age: ageDays,
          labels: tags,
          provider: 'ado' as ExternalProvider,
          project: this.project,
          state: item.fields['System.State'],
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
      this.logger.error(`Failed to fetch ADO work items: ${error}`);
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
