/**
 * ADO Project Selector with Pagination
 *
 * Features:
 * - Fetches all ADO projects via API
 * - Interactive multi-select with search
 * - Manual project name entry (comma-separated)
 * - Handles large project lists (50+ projects)
 * - Validates project names
 */
import { AdoClient } from '../../../src/integrations/ado/ado-client.js';
export interface ProjectSelectionResult {
    selectedNames: string[];
    method: 'interactive' | 'manual' | 'all';
}
export interface ProjectSelectorOptions {
    /** Allow manual entry of project names */
    allowManualEntry?: boolean;
    /** Allow "Select All" option */
    allowSelectAll?: boolean;
    /** Pre-select these project names */
    preSelected?: string[];
    /** Minimum projects to select (0 = optional) */
    minSelection?: number;
    /** Maximum projects to select (undefined = unlimited) */
    maxSelection?: number;
    /** Page size for pagination */
    pageSize?: number;
}
/**
 * Fetch all ADO projects from API
 */
export declare function fetchAllAdoProjects(client: AdoClient): Promise<any[]>;
/**
 * Interactive project selector with search and pagination
 */
export declare function selectAdoProjects(client: AdoClient, options?: ProjectSelectorOptions): Promise<ProjectSelectionResult>;
/**
 * Quick project selector - select single project
 */
export declare function selectSingleAdoProject(client: AdoClient, message?: string): Promise<string>;
//# sourceMappingURL=project-selector.d.ts.map