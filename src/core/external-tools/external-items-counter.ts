/**
 * External Items Counter - OPTIMIZED FOR SCALE
 *
 * Three-tier architecture for 1000+ items:
 *
 * TIER 1: getCounts() - Super fast, counts only, 30min cache
 *         Used by: /specweave:status, progress footer
 *         API calls: 1 per provider (just count)
 *
 * TIER 2: getSummary() - Project breakdown, 15min cache
 *         Used by: /specweave:external overview
 *         API calls: 1 per provider (count + project grouping)
 *
 * TIER 3: getItems(filter) - Paginated details, on-demand
 *         Used by: /specweave:external --project X --limit 20
 *         API calls: 1 per request (paginated)
 */

import { CacheManager } from '../cache/cache-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  ExternalItemsCounts,
  ExternalItemsSummary,
  ProviderCounts,
  ProjectCounts,
  ItemsFilter,
  PaginatedItemsResult,
  COUNTS_CACHE_TTL_MS,
  SUMMARY_CACHE_TTL_MS,
} from './types.js';
import { GitHubItemsAdapter } from './providers/github-items-adapter.js';
import { JiraItemsAdapter } from './providers/jira-items-adapter.js';
import { AdoItemsAdapter } from './providers/ado-items-adapter.js';

const COUNTS_CACHE_KEY = 'external-items-counts';
const SUMMARY_CACHE_KEY = 'external-items-summary';

export interface ExternalItemsCounterOptions {
  projectRoot: string;
  logger?: Logger;
  forceRefresh?: boolean;
}

export class ExternalItemsCounter {
  private projectRoot: string;
  private cache: CacheManager;
  private logger: Logger;
  private forceRefresh: boolean;

  constructor(options: ExternalItemsCounterOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.forceRefresh = options.forceRefresh ?? false;
    this.cache = new CacheManager(this.projectRoot, { logger: this.logger });
  }

  // ==========================================================================
  // TIER 1: COUNTS ONLY (for status/progress - super fast)
  // ==========================================================================

  /**
   * Get counts only - optimized for status display
   * Single API call per provider, 30min cache
   */
  async getCounts(): Promise<ExternalItemsCounts> {
    if (!this.forceRefresh) {
      const cached = await this.cache.get<ExternalItemsCounts>(COUNTS_CACHE_KEY);
      if (cached) {
        return cached;
      }
    }

    // Fetch counts in parallel (1 API call each)
    const [ghCount, jiraCount, adoCount] = await Promise.all([
      this.getGitHubCount(),
      this.getJiraCount(),
      this.getAdoCount(),
    ]);

    const counts: ExternalItemsCounts = {
      github: ghCount,
      jira: jiraCount,
      ado: adoCount,
      grandTotal: ghCount.total + jiraCount.total + adoCount.total,
      lastUpdated: new Date().toISOString(),
    };

    await this.cache.set(COUNTS_CACHE_KEY, counts, COUNTS_CACHE_TTL_MS);
    return counts;
  }

  // ==========================================================================
  // TIER 2: SUMMARY BY PROJECT (for external command overview)
  // ==========================================================================

  /**
   * Get summary with project breakdown - for dashboard overview
   * Note: For simplicity, uses counts (no per-project breakdown without fetching items)
   */
  async getSummary(): Promise<ExternalItemsSummary> {
    if (!this.forceRefresh) {
      const cached = await this.cache.get<ExternalItemsSummary>(SUMMARY_CACHE_KEY);
      if (cached) {
        return cached;
      }
    }

    const counts = await this.getCounts();

    // For summary, we derive from counts (no items needed)
    const summary: ExternalItemsSummary = {
      github: counts.github,
      jira: counts.jira,
      ado: counts.ado,
      byProject: this.buildProjectBreakdown(counts),
      grandTotal: counts.grandTotal,
      lastUpdated: counts.lastUpdated,
    };

    await this.cache.set(SUMMARY_CACHE_KEY, summary, SUMMARY_CACHE_TTL_MS);
    return summary;
  }

  // ==========================================================================
  // TIER 3: PAGINATED ITEMS (on-demand, filtered)
  // ==========================================================================

  /**
   * Get paginated items - on-demand, no cache
   * Used when user drills down: /specweave:external --limit 20
   */
  async getItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    const provider = filter?.provider || 'github';

    switch (provider) {
      case 'github':
        return this.getGitHubItems(filter);
      case 'jira':
        return this.getJiraItems(filter);
      case 'ado':
        return this.getAdoItems(filter);
      default:
        return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
  }

  /**
   * Force refresh all caches
   */
  async refresh(): Promise<ExternalItemsCounts> {
    this.forceRefresh = true;
    await this.cache.delete(COUNTS_CACHE_KEY);
    await this.cache.delete(SUMMARY_CACHE_KEY);
    return this.getCounts();
  }

  // ==========================================================================
  // PRIVATE: Provider-specific count fetchers
  // ==========================================================================

  private async getGitHubCount(): Promise<ProviderCounts> {
    try {
      const adapter = await GitHubItemsAdapter.fromGitRemote({ logger: this.logger });
      if (!adapter || !await adapter.isConfigured()) {
        return { configured: false, total: 0 };
      }
      const total = await adapter.getOpenCount();
      return { configured: true, total };
    } catch (error) {
      return { configured: false, total: 0, error: String(error) };
    }
  }

  private async getJiraCount(): Promise<ProviderCounts> {
    try {
      const adapter = JiraItemsAdapter.fromEnv({ logger: this.logger });
      if (!adapter) {
        return { configured: false, total: 0 };
      }
      const total = await adapter.getOpenCount();
      return { configured: true, total };
    } catch (error) {
      return { configured: false, total: 0, error: String(error) };
    }
  }

  private async getAdoCount(): Promise<ProviderCounts> {
    try {
      const adapter = AdoItemsAdapter.fromEnv({ logger: this.logger });
      if (!adapter) {
        return { configured: false, total: 0 };
      }
      const total = await adapter.getOpenCount();
      return { configured: true, total };
    } catch (error) {
      return { configured: false, total: 0, error: String(error) };
    }
  }

  // ==========================================================================
  // PRIVATE: Provider-specific item fetchers (paginated)
  // ==========================================================================

  private async getGitHubItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    const adapter = await GitHubItemsAdapter.fromGitRemote({ logger: this.logger });
    if (!adapter || !await adapter.isConfigured()) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
    return adapter.getOpenItems(filter);
  }

  private async getJiraItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    const adapter = JiraItemsAdapter.fromEnv({ logger: this.logger });
    if (!adapter) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
    return adapter.getOpenItems(filter);
  }

  private async getAdoItems(filter?: ItemsFilter): Promise<PaginatedItemsResult> {
    const adapter = AdoItemsAdapter.fromEnv({ logger: this.logger });
    if (!adapter) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
    return adapter.getOpenItems(filter);
  }

  // ==========================================================================
  // PRIVATE: Helpers
  // ==========================================================================

  /**
   * Build project breakdown from counts
   * Note: Without fetching all items, we can only show totals per provider
   */
  private buildProjectBreakdown(counts: ExternalItemsCounts): Record<string, ProjectCounts> {
    const breakdown: Record<string, ProjectCounts> = {};

    // Single project from current repo (GitHub)
    if (counts.github.configured && counts.github.total > 0) {
      breakdown['current'] = {
        github: counts.github.total,
        jira: counts.jira.configured ? counts.jira.total : 0,
        ado: counts.ado.configured ? counts.ado.total : 0,
        total: counts.grandTotal,
      };
    }

    return breakdown;
  }
}
