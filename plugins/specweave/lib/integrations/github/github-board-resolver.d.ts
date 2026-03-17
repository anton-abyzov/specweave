/**
 * GitHub Project Board Resolution for Hierarchical Sync
 *
 * Resolves project board names to board IDs for use in search queries.
 * Supports both GitHub Classic Projects (v1) and Projects v2 (beta).
 */
/**
 * GitHub Project Board (Classic Projects)
 */
export interface GitHubProjectBoard {
    id: number;
    name: string;
    number: number;
    state: 'open' | 'closed';
    html_url: string;
}
/**
 * Fetch all project boards for a GitHub repository
 *
 * Uses GitHub CLI: gh api repos/{owner}/{repo}/projects
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @returns Array of project boards
 */
export declare function fetchBoardsForRepo(owner: string, repo: string): Promise<GitHubProjectBoard[]>;
/**
 * Fetch organization-level project boards
 *
 * Uses GitHub CLI: gh api orgs/{org}/projects
 *
 * @param org Organization name
 * @returns Array of organization project boards
 */
export declare function fetchBoardsForOrg(org: string): Promise<GitHubProjectBoard[]>;
/**
 * Resolve board names to board numbers (for repo-level projects)
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param boardNames Array of board names to resolve
 * @returns Map of board name → board number
 */
export declare function resolveBoardNames(owner: string, repo: string, boardNames: string[]): Promise<Map<string, number>>;
/**
 * Get board numbers for a list of board names (helper function)
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param boardNames Array of board names
 * @returns Array of board numbers (skips boards not found)
 */
export declare function getBoardNumbers(owner: string, repo: string, boardNames: string[]): Promise<number[]>;
//# sourceMappingURL=github-board-resolver.d.ts.map