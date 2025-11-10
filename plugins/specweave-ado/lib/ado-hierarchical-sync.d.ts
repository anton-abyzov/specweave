/**
 * Azure DevOps Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One project, all work items (backward compatible)
 * 2. Filtered: Multiple projects + area paths + filters
 * 3. Custom: Raw WIQL query
 */
import { SyncProfile, SyncContainer } from '../../../src/core/types/sync-profile.js';
import { WorkItem } from './ado-client-v2.js';
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
export declare function buildHierarchicalWIQL(organization: string, pat: string, containers: SyncContainer[]): Promise<string>;
/**
 * Fetch work items hierarchically based on sync strategy
 *
 * @param profile Sync profile with strategy
 * @param pat Personal Access Token
 * @param timeRange Time range preset
 * @returns Array of work items
 */
export declare function fetchWorkItemsHierarchical(profile: SyncProfile, pat: string, timeRange?: string): Promise<WorkItem[]>;
//# sourceMappingURL=ado-hierarchical-sync.d.ts.map