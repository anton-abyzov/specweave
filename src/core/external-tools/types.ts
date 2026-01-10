/**
 * External Items Dashboard - Type Definitions
 *
 * OPTIMIZED FOR SCALE: Supports 1000+ items across projects
 *
 * Three-tier architecture:
 * 1. COUNTS - For status/progress (super fast, 30min cache)
 * 2. SUMMARY - By project breakdown (medium, 15min cache)
 * 3. DETAILS - Paginated items on-demand (filtered, no cache)
 */

export type ExternalProvider = 'github' | 'jira' | 'ado';

// ============================================================================
// TIER 1: COUNTS ONLY (for status line, progress footer)
// Single API call per provider, returns just numbers
// ============================================================================

export interface ProviderCounts {
  configured: boolean;
  total: number;
  error?: string;
}

export interface ExternalItemsCounts {
  github: ProviderCounts;
  jira: ProviderCounts;
  ado: ProviderCounts;
  grandTotal: number;
  lastUpdated: string;
}

// ============================================================================
// TIER 2: SUMMARY BY PROJECT (for /sw:external overview)
// Aggregated counts per project/board, no item details
// ============================================================================

export interface ProjectCounts {
  github: number;
  jira: number;
  ado: number;
  total: number;
}

export interface ExternalItemsSummary {
  github: ProviderCounts;
  jira: ProviderCounts;
  ado: ProviderCounts;
  byProject: Record<string, ProjectCounts>;
  grandTotal: number;
  lastUpdated: string;
}

// ============================================================================
// TIER 3: PAGINATED DETAILS (on-demand, filtered)
// Only fetched when user drills down with filters
// ============================================================================

export interface ExternalItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  age: number; // days
  labels: string[];
  provider: ExternalProvider;
  project?: string;
  board?: string;
  state: string;
  isStale: boolean;
}

export interface PaginatedItemsResult {
  items: ExternalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ItemsFilter {
  provider?: ExternalProvider;
  project?: string;
  board?: string;
  staleOnly?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface ExternalItemsProvider {
  getProviderName(): ExternalProvider;
  isConfigured(): Promise<boolean>;

  // Tier 1: Fast count (single API call)
  getOpenCount(): Promise<number>;

  // Tier 3: Paginated items (on-demand)
  getOpenItems(filter?: ItemsFilter): Promise<PaginatedItemsResult>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const STALE_THRESHOLD_DAYS = 7;
export const COUNTS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const SUMMARY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Calculate age in days from a date string
 */
export function calculateAgeDays(createdAt: string): number {
  const createdDate = new Date(createdAt).getTime();
  return Math.floor((Date.now() - createdDate) / MS_PER_DAY);
}

/**
 * Create an empty paginated result
 */
export function emptyPaginatedResult(page: number, pageSize: number): PaginatedItemsResult {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    hasMore: false,
  };
}

/**
 * Filter items by stale status if requested
 */
export function filterByStale(items: ExternalItem[], staleOnly?: boolean): ExternalItem[] {
  return staleOnly ? items.filter(i => i.isStale) : items;
}
