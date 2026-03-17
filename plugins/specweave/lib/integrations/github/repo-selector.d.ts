/**
 * GitHub Repository Selector with Pagination
 *
 * Features:
 * - Fetches all GitHub repos via gh CLI
 * - Interactive multi-select with search
 * - Manual repo entry (comma-separated, format: owner/repo)
 * - Handles large repo lists (50+ repos)
 * - Validates repo names
 */
export interface RepoSelectionResult {
    selectedRepos: string[];
    method: 'interactive' | 'manual' | 'all';
}
export interface RepoSelectorOptions {
    /** Allow manual entry of repo names */
    allowManualEntry?: boolean;
    /** Allow "Select All" option */
    allowSelectAll?: boolean;
    /** Pre-select these repos (owner/repo format) */
    preSelected?: string[];
    /** Minimum repos to select (0 = optional) */
    minSelection?: number;
    /** Maximum repos to select (undefined = unlimited) */
    maxSelection?: number;
    /** Page size for pagination */
    pageSize?: number;
    /** Filter by owner/org */
    owner?: string;
    /** Maximum number of repos to fetch (default: 100) */
    limit?: number;
}
/**
 * Fetch all GitHub repositories via gh CLI
 */
export declare function fetchAllGitHubRepos(owner?: string, limit?: number): Promise<Array<{
    owner: string;
    name: string;
    fullName: string;
}>>;
/**
 * Interactive repository selector with search and pagination
 */
export declare function selectGitHubRepos(options?: RepoSelectorOptions): Promise<RepoSelectionResult>;
/**
 * Quick repo selector - select single repository
 */
export declare function selectSingleGitHubRepo(message?: string, owner?: string): Promise<string>;
//# sourceMappingURL=repo-selector.d.ts.map