/**
 * Azure DevOps Team & Area Path Resolution for Hierarchical Sync
 *
 * Resolves team names and area paths for use in WIQL queries.
 * Azure DevOps organizes work by:
 * - Teams (organizational unit)
 * - Area Paths (hierarchical work categorization)
 * - Iteration Paths (sprints/time-based organization)
 */
/**
 * ADO Team
 */
export interface AdoTeam {
    id: string;
    name: string;
    description?: string;
    projectName: string;
    projectId: string;
}
/**
 * ADO Area Path
 */
export interface AdoAreaPath {
    id: number;
    identifier: string;
    name: string;
    path: string;
    hasChildren: boolean;
}
/**
 * ADO Iteration Path
 */
export interface AdoIterationPath {
    id: number;
    identifier: string;
    name: string;
    path: string;
    attributes: {
        startDate?: string;
        finishDate?: string;
    };
}
/**
 * Fetch all teams for an ADO project
 *
 * Uses Azure DevOps REST API: GET /{organization}/_apis/projects/{project}/teams
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of teams
 */
export declare function fetchTeamsForProject(organization: string, project: string, pat: string): Promise<AdoTeam[]>;
/**
 * Fetch area paths for a project
 *
 * Uses Azure DevOps REST API: GET /{organization}/{project}/_apis/wit/classificationnodes/areas
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of area paths (flattened hierarchy)
 */
export declare function fetchAreaPathsForProject(organization: string, project: string, pat: string): Promise<AdoAreaPath[]>;
/**
 * Fetch iteration paths for a project
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of iteration paths (flattened hierarchy)
 */
export declare function fetchIterationPathsForProject(organization: string, project: string, pat: string): Promise<AdoIterationPath[]>;
/**
 * Resolve area path names to full paths
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @param areaPathNames Array of area path names (can be partial)
 * @returns Map of area path name → full path
 */
export declare function resolveAreaPathNames(organization: string, project: string, pat: string, areaPathNames: string[]): Promise<Map<string, string>>;
/**
 * Get full area paths for a list of names (helper function)
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @param areaPathNames Array of area path names
 * @returns Array of full area paths (skips paths not found)
 */
export declare function getAreaPaths(organization: string, project: string, pat: string, areaPathNames: string[]): Promise<string[]>;
//# sourceMappingURL=ado-board-resolver.d.ts.map