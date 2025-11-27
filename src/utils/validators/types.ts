/**
 * Type definitions for external resource validators
 * @module utils/validators/types
 */

// ============================================================================
// Jira Types
// ============================================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectKey?: string;
    projectId?: string;
  };
}

export interface JiraValidationResult {
  valid: boolean;
  project: {
    exists: boolean;
    key?: string;
    id?: string;
    name?: string;
  };
  boards: {
    valid: boolean;
    existing: number[];
    missing: string[];
    created: Array<{ name: string; id: number }>;
  };
  envUpdated: boolean;
}

// ============================================================================
// Azure DevOps Types
// ============================================================================

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  state?: string;
}

export interface AzureDevOpsTeam {
  id: string;
  name: string;
  description?: string;
}

export interface AzureDevOpsAreaPath {
  id: number;
  name: string;
  path: string;
  hasChildren?: boolean;
}

export interface AzureDevOpsProjectResult {
  name: string;
  id?: string;
  exists: boolean;
  created: boolean;
}

export interface AzureDevOpsAreaPathResult {
  name: string;
  project?: string;
  exists: boolean;
  created: boolean;
}

export interface AzureDevOpsTeamResult {
  name: string;
  id?: string;
  project?: string;
  exists: boolean;
  created: boolean;
}

export interface AzureDevOpsValidationResult {
  valid: boolean;
  strategy?: string;
  projects: AzureDevOpsProjectResult[];
  teams: AzureDevOpsTeamResult[];
  areaPaths: AzureDevOpsAreaPathResult[];
  envUpdated: boolean;
}
