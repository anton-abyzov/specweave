/**
 * GitHub Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One repository, all issues (backward compatible)
 * 2. Filtered: Multiple repositories + project boards + filters
 * 3. Custom: Raw GitHub search query
 */

import {
  SyncProfile,
  SyncContainer,
  GitHubConfig,
  isSimpleStrategy,
  isFilteredStrategy,
  isCustomStrategy,
  TimeRangePreset,
} from '../../../src/core/types/sync-profile.js';
import { GitHubIssue } from './types.js';
import { getBoardNumbers } from './github-board-resolver.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

/**
 * Build hierarchical GitHub search query from containers
 *
 * Example output:
 * repo:owner/repo-a repo:owner/repo-b is:issue label:feature milestone:"v2.0" created:2024-01-01..2024-12-31
 *
 * @param containers Array of containers (repos) with filters
 * @returns GitHub search query string
 */
export async function buildHierarchicalSearchQuery(
  containers: SyncContainer[]
): Promise<string> {
  const parts: string[] = [];

  // Add repo clauses
  for (const container of containers) {
    parts.push(`repo:${container.id}`);

    // Note: GitHub search doesn't support filtering by project board directly
    // Project boards would need to be handled via GraphQL API or issue filtering
    if (container.subOrganizations && container.subOrganizations.length > 0) {
      console.warn(
        `⚠️  GitHub search doesn't support project board filtering directly.`
      );
      console.warn(
        `   Boards will be ignored: ${container.subOrganizations.join(', ')}`
      );
    }
  }

  // Add is:issue filter
  parts.push('is:issue');

  // Add filters from first container (apply to all repos)
  // Note: GitHub search applies filters globally, not per-repo
  const filters = containers[0]?.filters;
  if (filters) {
    const filterClauses = buildFilterClauses(filters);
    parts.push(...filterClauses);
  }

  return parts.join(' ');
}

/**
 * Build filter clauses from container filters
 *
 * @param filters Container filters
 * @returns Array of GitHub search filter clauses
 */
function buildFilterClauses(filters: any): string[] {
  const clauses: string[] = [];

  // Include labels
  if (filters.includeLabels && filters.includeLabels.length > 0) {
    for (const label of filters.includeLabels) {
      clauses.push(`label:"${label}"`);
    }
  }

  // Exclude labels (GitHub uses -label:)
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    for (const label of filters.excludeLabels) {
      clauses.push(`-label:"${label}"`);
    }
  }

  // Assignees
  if (filters.assignees && filters.assignees.length > 0) {
    // GitHub supports multiple assignees with OR logic
    const assigneeQuery = filters.assignees
      .map((a: string) => `assignee:"${a}"`)
      .join(' ');
    clauses.push(assigneeQuery);
  }

  // Status (GitHub uses is:open, is:closed)
  if (filters.statusCategories && filters.statusCategories.length > 0) {
    const statuses = filters.statusCategories.map((s: string) => s.toLowerCase());
    if (statuses.includes('open') || statuses.includes('to do') || statuses.includes('in progress')) {
      clauses.push('is:open');
    } else if (statuses.includes('closed') || statuses.includes('done')) {
      clauses.push('is:closed');
    }
  }

  // Milestones (GitHub-specific)
  if (filters.milestones && filters.milestones.length > 0) {
    for (const milestone of filters.milestones) {
      clauses.push(`milestone:"${milestone}"`);
    }
  }

  return clauses;
}

/**
 * Add time range filter to GitHub search query
 *
 * @param query Base search query
 * @param timeRange Time range preset (1W, 1M, 3M, 6M, ALL)
 * @returns Search query with time range filter
 */
function addTimeRangeFilter(query: string, timeRange: string): string {
  if (timeRange === 'ALL') {
    return query; // No time filter
  }

  const { since, until } = calculateTimeRange(timeRange as TimeRangePreset);

  return `${query} created:${since}..${until}`;
}

/**
 * Calculate date range from time range preset
 */
function calculateTimeRange(timeRange: TimeRangePreset): {
  since: string;
  until: string;
} {
  const now = new Date();
  const since = new Date(now);

  switch (timeRange) {
    case '1W':
      since.setDate(now.getDate() - 7);
      break;
    case '2W':
      since.setDate(now.getDate() - 14);
      break;
    case '1M':
      since.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      since.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      since.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      since.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
      return {
        since: '1970-01-01',
        until: now.toISOString().split('T')[0],
      };
  }

  return {
    since: since.toISOString().split('T')[0],
    until: now.toISOString().split('T')[0],
  };
}

/**
 * Fetch issues hierarchically based on sync strategy
 *
 * @param profile Sync profile with strategy
 * @param timeRange Time range preset
 * @returns Array of GitHub issues
 */
export async function fetchIssuesHierarchical(
  profile: SyncProfile,
  timeRange: string = '1M'
): Promise<GitHubIssue[]> {
  const config = profile.config as GitHubConfig;

  // Strategy 1: SIMPLE (backward compatible)
  if (isSimpleStrategy(profile)) {
    return fetchIssuesSimple(config, timeRange);
  }

  // Strategy 2: CUSTOM (raw search query)
  if (isCustomStrategy(profile)) {
    return fetchIssuesCustom(config, timeRange);
  }

  // Strategy 3: FILTERED (hierarchical)
  if (isFilteredStrategy(profile)) {
    return fetchIssuesFiltered(config, timeRange);
  }

  // Default to simple if strategy not recognized
  console.warn('⚠️  Unknown strategy, defaulting to simple');
  return fetchIssuesSimple(config, timeRange);
}

/**
 * Fetch issues using SIMPLE strategy (one repo, all issues)
 *
 * @param config GitHub configuration
 * @param timeRange Time range preset
 * @returns Array of GitHub issues
 */
async function fetchIssuesSimple(
  config: GitHubConfig,
  timeRange: string
): Promise<GitHubIssue[]> {
  const owner = config.owner;
  const repo = config.repo;

  if (!owner || !repo) {
    throw new Error('Simple strategy requires owner and repo in config');
  }

  let query = `repo:${owner}/${repo} is:issue`;

  // Add time range
  query = addTimeRangeFilter(query, timeRange);

  console.log('🔍 Fetching issues (SIMPLE strategy):', query);

  return executeSearch(query);
}

/**
 * Fetch issues using CUSTOM strategy (raw search query)
 *
 * @param config GitHub configuration
 * @param timeRange Time range preset
 * @returns Array of GitHub issues
 */
async function fetchIssuesCustom(
  config: GitHubConfig,
  timeRange: string
): Promise<GitHubIssue[]> {
  const customQuery = config.customQuery;

  if (!customQuery) {
    throw new Error('Custom strategy requires customQuery in config');
  }

  // Add time range to custom query
  const query = addTimeRangeFilter(customQuery, timeRange);

  console.log('🔍 Fetching issues (CUSTOM strategy):', query);

  return executeSearch(query);
}

/**
 * Fetch issues using FILTERED strategy (multiple repos + filters)
 *
 * @param config GitHub configuration
 * @param timeRange Time range preset
 * @returns Array of GitHub issues
 */
async function fetchIssuesFiltered(
  config: GitHubConfig,
  timeRange: string
): Promise<GitHubIssue[]> {
  const containers = config.containers;

  if (!containers || containers.length === 0) {
    throw new Error('Filtered strategy requires containers array in config');
  }

  // Build hierarchical search query
  const baseQuery = await buildHierarchicalSearchQuery(containers);

  // Add time range
  const query = addTimeRangeFilter(baseQuery, timeRange);

  console.log('🔍 Fetching issues (FILTERED strategy):', query);

  return executeSearch(query);
}

/**
 * Execute GitHub search and return issues
 *
 * @param query GitHub search query
 * @returns Array of GitHub issues
 */
async function executeSearch(query: string): Promise<GitHubIssue[]> {
  const result = await execFileNoThrow('gh', [
    'search',
    'issues',
    query,
    '--json',
    'number,title,body,state,url,labels,milestone,repository',
    '--limit',
    '1000', // Max results
  ]);

  if (result.status !== 0) {
    throw new Error(`Failed to search issues: ${result.stderr || result.stdout}`);
  }

  if (!result.stdout.trim()) {
    return [];
  }

  const issues = JSON.parse(result.stdout);

  // Transform to GitHubIssue format
  return issues.map((issue: any) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state,
    html_url: issue.url,
    url: issue.url,
    labels: issue.labels?.map((l: any) => l.name) || [],
    milestone: issue.milestone
      ? {
          number: issue.milestone.number,
          title: issue.milestone.title,
          description: issue.milestone.description,
          state: issue.milestone.state,
        }
      : undefined,
    repository: issue.repository
      ? {
          owner: issue.repository.owner.login,
          name: issue.repository.name,
          full_name: issue.repository.full_name,
        }
      : undefined,
  }));
}
