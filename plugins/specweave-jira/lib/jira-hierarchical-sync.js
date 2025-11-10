/**
 * Jira Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One project, all boards (backward compatible)
 * 2. Filtered: Multiple projects + specific boards + filters
 * 3. Custom: Raw JQL query
 */
import { isSimpleStrategy, isFilteredStrategy, isCustomStrategy, } from '../../../src/core/types/sync-profile.js';
import { getBoardIds } from './jira-board-resolver.js';
/**
 * Build hierarchical JQL query from containers
 *
 * Example output:
 * (project=PROJECT-A AND board IN (123, 456) AND labels IN (feature))
 * OR
 * (project=PROJECT-B AND board IN (789))
 *
 * @param client JiraClient instance
 * @param containers Array of containers with projects + boards + filters
 * @returns JQL query string
 */
export async function buildHierarchicalJQL(client, containers) {
    const clauses = [];
    for (const container of containers) {
        const parts = [];
        // Project clause
        parts.push(`project=${container.id}`);
        // Board filtering (if sub-organizations specified)
        if (container.subOrganizations && container.subOrganizations.length > 0) {
            try {
                const boardIds = await getBoardIds(client, container.id, container.subOrganizations);
                if (boardIds.length > 0) {
                    parts.push(`board IN (${boardIds.join(',')})`);
                }
                else {
                    console.warn(`⚠️  No valid boards found for project ${container.id}, syncing all boards`);
                }
            }
            catch (error) {
                console.warn(`⚠️  Failed to resolve boards for ${container.id}, syncing all boards:`, error.message);
            }
        }
        // Filters
        if (container.filters) {
            const filterClauses = buildFilterClauses(container.filters);
            parts.push(...filterClauses);
        }
        // Combine parts with AND
        clauses.push(`(${parts.join(' AND ')})`);
    }
    // Combine clauses with OR
    return clauses.join(' OR ');
}
/**
 * Build filter clauses from container filters
 *
 * @param filters Container filters
 * @returns Array of JQL filter clauses
 */
function buildFilterClauses(filters) {
    const clauses = [];
    // Include labels
    if (filters.includeLabels && filters.includeLabels.length > 0) {
        const labels = filters.includeLabels.map((l) => `"${l}"`).join(', ');
        clauses.push(`labels IN (${labels})`);
    }
    // Exclude labels
    if (filters.excludeLabels && filters.excludeLabels.length > 0) {
        const labels = filters.excludeLabels.map((l) => `"${l}"`).join(', ');
        clauses.push(`labels NOT IN (${labels})`);
    }
    // Assignees
    if (filters.assignees && filters.assignees.length > 0) {
        const assignees = filters.assignees.map((a) => `"${a}"`).join(', ');
        clauses.push(`assignee IN (${assignees})`);
    }
    // Status categories
    if (filters.statusCategories && filters.statusCategories.length > 0) {
        const statuses = filters.statusCategories.map((s) => `"${s}"`).join(', ');
        clauses.push(`status IN (${statuses})`);
    }
    // Components (Jira-specific)
    if (filters.components && filters.components.length > 0) {
        const components = filters.components.map((c) => `"${c}"`).join(', ');
        clauses.push(`component IN (${components})`);
    }
    // Sprints (Jira-specific)
    if (filters.sprints && filters.sprints.length > 0) {
        const sprints = filters.sprints.map((s) => `"${s}"`).join(', ');
        clauses.push(`sprint IN (${sprints})`);
    }
    // Issue types (Jira-specific)
    if (filters.issueTypes && filters.issueTypes.length > 0) {
        const types = filters.issueTypes.map((t) => `"${t}"`).join(', ');
        clauses.push(`issuetype IN (${types})`);
    }
    return clauses;
}
/**
 * Add time range filter to JQL query
 *
 * @param jql Base JQL query
 * @param timeRange Time range preset (1W, 1M, 3M, 6M, ALL)
 * @returns JQL with time range filter
 */
function addTimeRangeFilter(jql, timeRange) {
    if (timeRange === 'ALL') {
        return jql; // No time filter
    }
    // Convert time range to Jira format
    const timeMap = {
        '1W': '-1w',
        '2W': '-2w',
        '1M': '-1M',
        '3M': '-3M',
        '6M': '-6M',
        '1Y': '-1y',
    };
    const jiraTime = timeMap[timeRange] || '-1M';
    return `${jql} AND created >= ${jiraTime}`;
}
/**
 * Fetch issues hierarchically based on sync strategy
 *
 * @param client JiraClient instance
 * @param profile Sync profile with strategy
 * @param timeRange Time range preset
 * @returns Array of Jira issues
 */
export async function fetchIssuesHierarchical(client, profile, timeRange = '1M') {
    const config = profile.config;
    // Strategy 1: SIMPLE (backward compatible)
    if (isSimpleStrategy(profile)) {
        return fetchIssuesSimple(client, config, timeRange);
    }
    // Strategy 2: CUSTOM (raw JQL)
    if (isCustomStrategy(profile)) {
        return fetchIssuesCustom(client, config, timeRange);
    }
    // Strategy 3: FILTERED (hierarchical)
    if (isFilteredStrategy(profile)) {
        return fetchIssuesFiltered(client, config, timeRange);
    }
    // Default to simple if strategy not recognized
    console.warn('⚠️  Unknown strategy, defaulting to simple');
    return fetchIssuesSimple(client, config, timeRange);
}
/**
 * Fetch issues using SIMPLE strategy (one project, all boards)
 *
 * @param client JiraClient instance
 * @param config Jira configuration
 * @param timeRange Time range preset
 * @returns Array of Jira issues
 */
async function fetchIssuesSimple(client, config, timeRange) {
    const projectKey = config.projectKey;
    if (!projectKey) {
        throw new Error('Simple strategy requires projectKey in config');
    }
    let jql = `project=${projectKey}`;
    // Add time range
    jql = addTimeRangeFilter(jql, timeRange);
    console.log('🔍 Fetching issues (SIMPLE strategy):', jql);
    return client.searchIssues({ jql });
}
/**
 * Fetch issues using CUSTOM strategy (raw JQL)
 *
 * @param client JiraClient instance
 * @param config Jira configuration
 * @param timeRange Time range preset
 * @returns Array of Jira issues
 */
async function fetchIssuesCustom(client, config, timeRange) {
    const customQuery = config.customQuery;
    if (!customQuery) {
        throw new Error('Custom strategy requires customQuery in config');
    }
    // Add time range to custom query
    const jql = addTimeRangeFilter(customQuery, timeRange);
    console.log('🔍 Fetching issues (CUSTOM strategy):', jql);
    return client.searchIssues({ jql });
}
/**
 * Fetch issues using FILTERED strategy (multiple projects + boards + filters)
 *
 * @param client JiraClient instance
 * @param config Jira configuration
 * @param timeRange Time range preset
 * @returns Array of Jira issues
 */
async function fetchIssuesFiltered(client, config, timeRange) {
    const containers = config.containers;
    if (!containers || containers.length === 0) {
        throw new Error('Filtered strategy requires containers array in config');
    }
    // Build hierarchical JQL
    const baseJql = await buildHierarchicalJQL(client, containers);
    // Add time range
    const jql = addTimeRangeFilter(baseJql, timeRange);
    console.log('🔍 Fetching issues (FILTERED strategy):', jql);
    return client.searchIssues({ jql });
}
//# sourceMappingURL=jira-hierarchical-sync.js.map