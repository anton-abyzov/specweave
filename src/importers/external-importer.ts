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
}
