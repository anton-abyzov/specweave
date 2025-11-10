/**
 * Jira Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One project, all boards (backward compatible)
 * 2. Filtered: Multiple projects + specific boards + filters
 * 3. Custom: Raw JQL query
 */
import { SyncProfile, SyncContainer } from '../../../src/core/types/sync-profile.js';
import { JiraClient, JiraIssue } from '../../../src/integrations/jira/jira-client.js';
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
export declare function buildHierarchicalJQL(client: JiraClient, containers: SyncContainer[]): Promise<string>;
/**
 * Fetch issues hierarchically based on sync strategy
 *
 * @param client JiraClient instance
 * @param profile Sync profile with strategy
 * @param timeRange Time range preset
 * @returns Array of Jira issues
 */
export declare function fetchIssuesHierarchical(client: JiraClient, profile: SyncProfile, timeRange?: string): Promise<JiraIssue[]>;
//# sourceMappingURL=jira-hierarchical-sync.d.ts.map