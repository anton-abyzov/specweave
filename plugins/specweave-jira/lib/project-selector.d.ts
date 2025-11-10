/**
 * Jira Project Selector with Pagination
 *
 * Features:
 * - Fetches all Jira projects via API
 * - Interactive multi-select with search
 * - Manual project key entry (comma-separated)
 * - Handles large project lists (50+ projects)
 * - Validates project keys
 */
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
export interface ProjectSelectionResult {
    selectedKeys: string[];
    method: 'interactive' | 'manual' | 'all';
}
export interface ProjectSelectorOptions {
    /** Allow manual entry of project keys */
    allowManualEntry?: boolean;
    /** Allow "Select All" option */
    allowSelectAll?: boolean;
    /** Pre-select these project keys */
    preSelected?: string[];
    /** Minimum projects to select (0 = optional) */
    minSelection?: number;
    /** Maximum projects to select (undefined = unlimited) */
    maxSelection?: number;
    /** Page size for pagination */
    pageSize?: number;
}
/**
 * Fetch all Jira projects from API
 */
export declare function fetchAllJiraProjects(client: JiraClient): Promise<any[]>;
/**
 * Interactive project selector with search and pagination
 */
export declare function selectJiraProjects(client: JiraClient, options?: ProjectSelectorOptions): Promise<ProjectSelectionResult>;
/**
 * Quick project selector - select single project
 */
export declare function selectSingleJiraProject(client: JiraClient, message?: string): Promise<string>;
//# sourceMappingURL=project-selector.d.ts.map