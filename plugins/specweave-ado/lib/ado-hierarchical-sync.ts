/**
 * Azure DevOps Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One project, all work items (backward compatible)
 * 2. Filtered: Multiple projects + area paths + filters
 * 3. Custom: Raw WIQL query
 */

import {
  SyncProfile,
  SyncContainer,
  AdoConfig,
  isSimpleStrategy,
  isFilteredStrategy,
  isCustomStrategy,
  TimeRangePreset,
} from '../../../src/core/types/sync-profile.js';
import { WorkItem } from './ado-client-v2.js';
import { getAreaPaths } from './ado-board-resolver.js';
import https from 'https';

/**
 * Build hierarchical WIQL query from containers
 *
 * Example output:
 * SELECT [System.Id], [System.Title], [System.State]
 * FROM WorkItems
 * WHERE (
 *   ([System.TeamProject] = 'PROJECT-A' AND [System.AreaPath] UNDER 'PROJECT-A\\Team Alpha')
 *   OR
 *   ([System.TeamProject] = 'PROJECT-B' AND [System.AreaPath] UNDER 'PROJECT-B\\Platform')
 * )
 * AND [System.WorkItemType] IN ('User Story', 'Bug')
 * AND [System.State] IN ('Active', 'New')
 *
 * @param organization Organization name
 * @param pat Personal Access Token
 * @param containers Array of containers (projects) with filters
 * @returns WIQL query string
 */
export async function buildHierarchicalWIQL(
  organization: string,
  pat: string,
  containers: SyncContainer[]
): Promise<string> {
  const projectClauses: string[] = [];

  for (const container of containers) {
    const parts: string[] = [];

    // Project clause
    parts.push(`[System.TeamProject] = '${container.id}'`);

    // Area path filtering (sub-organizations)
    if (container.subOrganizations && container.subOrganizations.length > 0) {
      try {
        const areaPaths = await getAreaPaths(
          organization,
          container.id,
          pat,
          container.subOrganizations
        );

        if (areaPaths.length > 0) {
          const areaPathClauses = areaPaths
            .map((path) => `[System.AreaPath] UNDER '${path}'`)
            .join(' OR ');

          parts.push(`(${areaPathClauses})`);
        } else {
          console.warn(
            `⚠️  No valid area paths found for project ${container.id}, syncing all areas`
          );
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to resolve area paths for ${container.id}, syncing all areas:`,
          (error as Error).message
        );
      }
    }

    // Combine parts with AND
    projectClauses.push(`(${parts.join(' AND ')})`);
  }

  // Build WHERE clause with project clauses
  let whereClause = projectClauses.join(' OR ');

  // Add global filters (apply to all projects)
  const filters = containers[0]?.filters;
  if (filters) {
    const filterClauses = buildFilterClauses(filters);
    if (filterClauses.length > 0) {
      whereClause = `(${whereClause}) AND ${filterClauses.join(' AND ')}`;
    }
  }

  // Build complete WIQL query
  return `
    SELECT [System.Id], [System.Title], [System.Description], [System.State],
           [System.CreatedDate], [System.ChangedDate], [System.WorkItemType],
           [System.AreaPath], [System.IterationPath], [System.Tags]
    FROM WorkItems
    WHERE ${whereClause}
    ORDER BY [System.CreatedDate] DESC
  `.trim();
}

/**
 * Build filter clauses from container filters
 *
 * @param filters Container filters
 * @returns Array of WIQL filter clauses
 */
function buildFilterClauses(filters: any): string[] {
  const clauses: string[] = [];

  // Work item types (ADO-specific)
  if (filters.workItemTypes && filters.workItemTypes.length > 0) {
    const types = filters.workItemTypes.map((t: string) => `'${t}'`).join(', ');
    clauses.push(`[System.WorkItemType] IN (${types})`);
  }

  // Status categories (ADO uses State field)
  if (filters.statusCategories && filters.statusCategories.length > 0) {
    const states = filters.statusCategories.map((s: string) => `'${s}'`).join(', ');
    clauses.push(`[System.State] IN (${states})`);
  }

  // Area paths (additional filtering beyond sub-organizations)
  if (filters.areaPaths && filters.areaPaths.length > 0) {
    const areaPathClauses = filters.areaPaths
      .map((path: string) => `[System.AreaPath] UNDER '${path}'`)
      .join(' OR ');
    clauses.push(`(${areaPathClauses})`);
  }

  // Iteration paths (sprints in ADO)
  if (filters.iterationPaths && filters.iterationPaths.length > 0) {
    const iterationClauses = filters.iterationPaths
      .map((path: string) => `[System.IterationPath] UNDER '${path}'`)
      .join(' OR ');
    clauses.push(`(${iterationClauses})`);
  }

  // Tags (labels in ADO)
  if (filters.includeLabels && filters.includeLabels.length > 0) {
    const tagClauses = filters.includeLabels
      .map((tag: string) => `[System.Tags] CONTAINS '${tag}'`)
      .join(' OR ');
    clauses.push(`(${tagClauses})`);
  }

  // Exclude labels/tags
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    for (const tag of filters.excludeLabels) {
      clauses.push(`NOT [System.Tags] CONTAINS '${tag}'`);
    }
  }

  // Assignees (assigned to)
  if (filters.assignees && filters.assignees.length > 0) {
    const assigneeClauses = filters.assignees
      .map((assignee: string) => `[System.AssignedTo] = '${assignee}'`)
      .join(' OR ');
    clauses.push(`(${assigneeClauses})`);
  }

  return clauses;
}

/**
 * Add time range filter to WIQL query
 *
 * @param wiql Base WIQL query
 * @param timeRange Time range preset (1W, 1M, 3M, 6M, ALL)
 * @returns WIQL with time range filter
 */
function addTimeRangeFilter(wiql: string, timeRange: string): string {
  if (timeRange === 'ALL') {
    return wiql; // No time filter
  }

  const { since, until } = calculateTimeRange(timeRange as TimeRangePreset);

  // Add time range to WHERE clause
  const timeFilter = `[System.CreatedDate] >= '${since}' AND [System.CreatedDate] <= '${until}'`;

  // Insert before ORDER BY if present, otherwise append
  if (wiql.includes('ORDER BY')) {
    return wiql.replace('ORDER BY', `AND ${timeFilter} ORDER BY`);
  } else {
    return `${wiql} AND ${timeFilter}`;
  }
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
        since: '1970-01-01T00:00:00Z',
        until: now.toISOString(),
      };
  }

  return {
    since: since.toISOString(),
    until: now.toISOString(),
  };
}

/**
 * Fetch work items hierarchically based on sync strategy
 *
 * @param profile Sync profile with strategy
 * @param pat Personal Access Token
 * @param timeRange Time range preset
 * @returns Array of work items
 */
export async function fetchWorkItemsHierarchical(
  profile: SyncProfile,
  pat: string,
  timeRange: string = '1M'
): Promise<WorkItem[]> {
  const config = profile.config as AdoConfig;

  // Strategy 1: SIMPLE (backward compatible)
  if (isSimpleStrategy(profile)) {
    return fetchWorkItemsSimple(config, pat, timeRange);
  }

  // Strategy 2: CUSTOM (raw WIQL)
  if (isCustomStrategy(profile)) {
    return fetchWorkItemsCustom(config, pat, timeRange);
  }

  // Strategy 3: FILTERED (hierarchical)
  if (isFilteredStrategy(profile)) {
    return fetchWorkItemsFiltered(config, pat, timeRange);
  }

  // Default to simple if strategy not recognized
  console.warn('⚠️  Unknown strategy, defaulting to simple');
  return fetchWorkItemsSimple(config, pat, timeRange);
}

/**
 * Fetch work items using SIMPLE strategy (one project, all work items)
 *
 * @param config ADO configuration
 * @param pat Personal Access Token
 * @param timeRange Time range preset
 * @returns Array of work items
 */
async function fetchWorkItemsSimple(
  config: AdoConfig,
  pat: string,
  timeRange: string
): Promise<WorkItem[]> {
  const organization = config.organization;
  const project = config.project;

  if (!project) {
    throw new Error('Simple strategy requires project in config');
  }

  let wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project}'
  `.trim();

  // Add time range
  wiql = addTimeRangeFilter(wiql, timeRange);

  console.log('🔍 Fetching work items (SIMPLE strategy):', wiql);

  return executeQuery(organization, project, pat, wiql);
}

/**
 * Fetch work items using CUSTOM strategy (raw WIQL)
 *
 * @param config ADO configuration
 * @param pat Personal Access Token
 * @param timeRange Time range preset
 * @returns Array of work items
 */
async function fetchWorkItemsCustom(
  config: AdoConfig,
  pat: string,
  timeRange: string
): Promise<WorkItem[]> {
  const organization = config.organization;
  const project = config.project || 'DefaultProject';
  const customQuery = config.customQuery;

  if (!customQuery) {
    throw new Error('Custom strategy requires customQuery in config');
  }

  // Add time range to custom query
  const wiql = addTimeRangeFilter(customQuery, timeRange);

  console.log('🔍 Fetching work items (CUSTOM strategy):', wiql);

  return executeQuery(organization, project, pat, wiql);
}

/**
 * Fetch work items using FILTERED strategy (multiple projects + area paths + filters)
 *
 * @param config ADO configuration
 * @param pat Personal Access Token
 * @param timeRange Time range preset
 * @returns Array of work items
 */
async function fetchWorkItemsFiltered(
  config: AdoConfig,
  pat: string,
  timeRange: string
): Promise<WorkItem[]> {
  const organization = config.organization;
  const containers = config.containers;

  if (!containers || containers.length === 0) {
    throw new Error('Filtered strategy requires containers array in config');
  }

  // Build hierarchical WIQL
  const baseWiql = await buildHierarchicalWIQL(organization, pat, containers);

  // Add time range
  const wiql = addTimeRangeFilter(baseWiql, timeRange);

  console.log('🔍 Fetching work items (FILTERED strategy):', wiql);

  // Use first project for API endpoint (WIQL can query across projects)
  const project = containers[0].id;

  return executeQuery(organization, project, pat, wiql);
}

/**
 * Execute WIQL query and return work items
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @param wiql WIQL query string
 * @returns Array of work items
 */
async function executeQuery(
  organization: string,
  project: string,
  pat: string,
  wiql: string
): Promise<WorkItem[]> {
  const baseUrl = `https://dev.azure.com/${organization}/${project}`;

  // Execute query
  const queryUrl = `${baseUrl}/_apis/wit/wiql?api-version=7.1`;
  const queryResult: any = await makeRequest(queryUrl, pat, 'POST', { query: wiql });

  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    return [];
  }

  // Get full work item details (batch request)
  const ids = queryResult.workItems.map((wi: any) => wi.id);
  const batchUrl = `${baseUrl}/_apis/wit/workitemsbatch?api-version=7.1`;

  const response: any = await makeRequest(batchUrl, pat, 'POST', {
    ids,
    fields: [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.State',
      'System.CreatedDate',
      'System.ChangedDate',
      'System.WorkItemType',
      'System.AreaPath',
      'System.IterationPath',
      'System.Tags',
    ],
  });

  return response.value || [];
}

/**
 * Make HTTPS request to ADO API
 */
function makeRequest(
  url: string,
  pat: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);

    const authHeader = 'Basic ' + Buffer.from(`:${pat}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      hostname,
      path: pathname + search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Send body if present
    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}
