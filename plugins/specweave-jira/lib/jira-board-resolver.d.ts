/**
 * Jira Board Resolution for Hierarchical Sync
 *
 * Resolves board names to board IDs for use in JQL queries.
 * Supports Jira Agile (Software) boards.
 */
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
/**
 * Jira Board (Agile API)
 */
export interface JiraBoard {
    id: number;
    name: string;
    type: 'scrum' | 'kanban' | 'simple';
    self: string;
    location?: {
        projectId: number;
        projectKey: string;
        projectName: string;
    };
}
/**
 * Fetch all boards for a Jira project
 *
 * Uses Jira Agile REST API: GET /rest/agile/1.0/board?projectKeyOrId={projectKey}
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key (e.g., "PROJECT-A")
 * @returns Array of boards in the project
 */
export declare function fetchBoardsForProject(client: JiraClient, projectKey: string): Promise<JiraBoard[]>;
/**
 * Resolve board names to board IDs
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key
 * @param boardNames Array of board names to resolve
 * @returns Map of board name → board ID
 */
export declare function resolveBoardNames(client: JiraClient, projectKey: string, boardNames: string[]): Promise<Map<string, number>>;
/**
 * Get board IDs for a list of board names (helper function)
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key
 * @param boardNames Array of board names
 * @returns Array of board IDs (skips boards not found)
 */
export declare function getBoardIds(client: JiraClient, projectKey: string, boardNames: string[]): Promise<number[]>;
//# sourceMappingURL=jira-board-resolver.d.ts.map