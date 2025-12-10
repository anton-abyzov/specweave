/**
 * External Importer Interface
 *
 * Abstraction layer for importing User Stories and tasks from external tools
 * (GitHub, JIRA, Azure DevOps) into SpecWeave living docs.
 *
 * Supports:
 * - Pagination for large datasets
 * - Time range filtering
 * - Platform-specific conversion
 */

/**
 * External item representation (platform-agnostic)
 */
export interface ExternalItem {
  /** Platform-specific ID (e.g., "JIRA-123", "github#456") */
  id: string;

  /** Item type (user-story, epic, task, bug) */
  type: 'user-story' | 'epic' | 'task' | 'bug' | 'feature';

  /** Title/summary */
  title: string;

  /** Description/body */
  description: string;

  /** Status (open, in-progress, completed, closed) */
  status: 'open' | 'in-progress' | 'completed' | 'closed';

  /** Priority (P0-P4) */
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

  /** Creation date */
  createdAt: Date;

  /** Last updated date */
  updatedAt: Date;

  /** External URL */
  url: string;

  /** Labels/tags */
  labels: string[];

  /** Acceptance criteria (extracted from description) */
  acceptanceCriteria?: string[];

  /** Child items (subtasks, linked issues) */
  children?: ExternalItem[];

  /** Parent ID (for hierarchical items) */
  parentId?: string;

  /** Platform this item came from */
  platform: 'github' | 'jira' | 'ado';

  /** Source repository (owner/repo format for multi-repo imports) */
  sourceRepo?: string;

  // ============================================================================
  // External Container Context (v0.29.0+ - 2-Level Directory Structure Support)
  // ============================================================================

  /**
   * JIRA space key (e.g., "myspace")
   * CRITICAL (v0.34.1+): Space is the TOP-LEVEL container in JIRA
   * Maps to SpecWeave PROJECT in 2-level structure
   * Used for 2-level directory: specs/JIRA-{spaceKey}/{projectKey}/
   */
  jiraSpaceKey?: string;

  /**
   * JIRA space name (e.g., "My Space")
   * Human-readable name for display purposes
   */
  jiraSpaceName?: string;

  /**
   * JIRA project key (e.g., "ID" for Identity project)
   * CRITICAL (v0.34.1+): Project is the MIDDLE level in JIRA
   * Maps to SpecWeave BOARD (2nd level subfolder) in 2-level structure
   * Used for 2-level directory: specs/JIRA-{spaceKey}/{projectKey}/
   */
  jiraProjectKey?: string;

  /**
   * JIRA project name (e.g., "Identity")
   * Human-readable name for display purposes
   */
  jiraProjectName?: string;

  /**
   * JIRA board ID (numeric)
   * DEPRECATED (v0.34.1+): Boards are NOT used for directory structure
   * Kept for backwards compatibility with sync profiles
   */
  jiraBoardId?: number;

  /**
   * JIRA board name (e.g., "Identity Sprint Board")
   * DEPRECATED (v0.34.1+): Boards are NOT used for directory structure
   * Kept for backwards compatibility with sync profiles
   */
  jiraBoardName?: string;

  /**
   * ADO project name (e.g., "MyProduct")
   * Used for 2-level directory: specs/{projectName}/{areaPathMapping}/
   */
  adoProjectName?: string;

  /**
   * ADO area path (e.g., "MyProduct\\Frontend")
   * Maps to SpecWeave project via areaPathMapping configuration
   */
  adoAreaPath?: string;

  /**
   * Original ADO work item type (e.g., "Capability", "Epic", "User Story")
   * Used for hierarchy mapping - Capability→Epic→Feature→User Story→Task
   * @added 2025-12-01
   */
  adoWorkItemType?: string;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  /** Time range in months (default: 3) */
  timeRangeMonths?: number;

  /** Include closed items (default: false) */
  includeClosed?: boolean;

  /** Filter by labels */
  labels?: string[];

  /** Filter by milestone/epic */
  milestone?: string;

  /** Maximum items to import (default: unlimited) */
  maxItems?: number;

  /** Include child items (subtasks) */
  includeChildren?: boolean;

  /** Page size for pagination (default: 100) */
  pageSize?: number;
}

/**
 * Importer interface
 */
export interface Importer {
  /** Platform name */
  readonly platform: 'github' | 'jira' | 'ado';

  /**
   * Import items from external platform
   * @param config - Import configuration
   * @returns Array of external items
   */
  import(config?: ImportConfig): Promise<ExternalItem[]>;

  /**
   * Paginate through items (for large datasets)
   * @param config - Import configuration
   * @returns Async generator yielding items page by page
   */
  paginate(config?: ImportConfig): AsyncGenerator<ExternalItem[], void, unknown>;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Number of items imported */
  count: number;

  /** Imported items */
  items: ExternalItem[];

  /** Errors encountered during import */
  errors: string[];

  /** Platform */
  platform: 'github' | 'jira' | 'ado';

  /** Estimated total items (for progress tracking) */
  totalEstimate?: number;

  /** Source repository (for multi-repo imports) */
  sourceRepo?: string;
}
