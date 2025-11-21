/**
 * SpecWeave Configuration Types
 *
 * Defines the structure for .specweave/config.json
 *
 * @module core/config/types
 */

/**
 * Repository provider types
 */
export type RepositoryProvider = 'local' | 'github' | 'bitbucket' | 'ado' | 'gitlab' | 'generic';

/**
 * Issue tracker provider types
 */
export type IssueTrackerProvider = 'none' | 'jira' | 'github' | 'ado';

/**
 * Jira instance types
 */
export type JiraInstanceType = 'cloud' | 'server';

/**
 * Jira organization strategies
 */
export type JiraStrategy = 'single-project' | 'project-per-team' | 'component-based' | 'board-based';

/**
 * Sync direction types
 */
export type SyncDirection = 'import' | 'export' | 'bidirectional';

/**
 * Repository configuration
 */
export interface RepoConfig {
  name: string;
  url: string;
  path?: string;
  branch?: string;
  specweaveProject?: string;  // Maps to .specweave/docs/internal/specs/{project}/
}

/**
 * Jira project configuration
 */
export interface JiraProjectConfig {
  key: string;
  id?: string;
  name?: string;
  specweaveProject?: string;  // Maps to .specweave/docs/internal/specs/{project}/
}

/**
 * Jira board configuration
 */
export interface JiraBoardConfig {
  id: string;
  name?: string;
}

/**
 * Repository configuration section
 */
export interface RepositoryConfiguration {
  provider: RepositoryProvider;
  organization?: string;
  repos?: RepoConfig[];
}

/**
 * Issue tracker configuration section
 */
export interface IssueTrackerConfiguration {
  provider: IssueTrackerProvider;

  // Jira-specific configuration
  domain?: string;
  instanceType?: JiraInstanceType;
  strategy?: JiraStrategy;
  projects?: JiraProjectConfig[];
  components?: string[];  // For component-based strategy
  boards?: JiraBoardConfig[];  // For board-based strategy

  // GitHub-specific configuration
  owner?: string;
  repo?: string;
  repos?: string[];  // For multi-repo strategy

  // Azure DevOps-specific configuration
  organization_ado?: string;
  project?: string;
}

/**
 * Sync configuration section
 */
export interface SyncConfiguration {
  enabled: boolean;
  direction: SyncDirection;
  autoSync: boolean;
  includeStatus: boolean;
  autoApplyLabels: boolean;
}

/**
 * Permission configuration section
 */
export interface PermissionsConfiguration {
  canCreate: boolean;
  canUpdate: boolean;
  canUpdateStatus: boolean;
}

/**
 * Main SpecWeave configuration
 */
export interface SpecWeaveConfig {
  /**
   * Config version for migration support
   */
  version: string;

  /**
   * Repository provider configuration
   */
  repository?: RepositoryConfiguration;

  /**
   * Issue tracker configuration
   */
  issueTracker?: IssueTrackerConfiguration;

  /**
   * Sync configuration
   */
  sync?: SyncConfiguration;

  /**
   * Permissions configuration
   */
  permissions?: PermissionsConfiguration;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SpecWeaveConfig = {
  version: '2.0',
  repository: {
    provider: 'local'
  },
  issueTracker: {
    provider: 'none'
  },
  sync: {
    enabled: false,
    direction: 'bidirectional',
    autoSync: false,
    includeStatus: true,
    autoApplyLabels: true
  },
  permissions: {
    canCreate: true,
    canUpdate: true,
    canUpdateStatus: true
  }
};

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
