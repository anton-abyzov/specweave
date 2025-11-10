/**
 * Spec Metadata Type Definitions
 *
 * Defines the structure for spec.md files in .specweave/docs/internal/specs/
 *
 * KEY ARCHITECTURE:
 * - Specs are PERMANENT (living docs, source of truth)
 * - Increments are TEMPORARY (implementation vehicles)
 * - External tools (GitHub/Jira/ADO) sync to SPECS, not increments
 *
 * @module spec-metadata
 */

/**
 * External tool link for a spec
 */
export interface ExternalToolLink {
  /** Tool type */
  provider: 'github' | 'jira' | 'ado';

  /** External entity ID (GitHub Project ID, Jira Epic Key, ADO Feature ID) */
  externalId: string;

  /** External entity URL */
  url: string;

  /** Last sync timestamp */
  syncedAt?: string;

  /** Sync status */
  syncStatus?: 'synced' | 'out-of-sync' | 'error';

  /** Last sync error message (if any) */
  lastError?: string;
}

/**
 * GitHub-specific external link
 */
export interface GitHubLink {
  /** GitHub Project ID (numeric) */
  projectId?: number;

  /** GitHub Project URL */
  projectUrl?: string;

  /** Last sync timestamp */
  syncedAt?: string;

  /** Repository owner */
  owner?: string;

  /** Repository name */
  repo?: string;
}

/**
 * Jira-specific external link
 */
export interface JiraLink {
  /** Jira Epic Key (e.g., SPEC-1) */
  epicKey?: string;

  /** Jira Epic URL */
  epicUrl?: string;

  /** Last sync timestamp */
  syncedAt?: string;

  /** Jira project key */
  projectKey?: string;

  /** Jira domain */
  domain?: string;
}

/**
 * Azure DevOps-specific external link
 */
export interface AdoLink {
  /** ADO Feature ID (numeric) */
  featureId?: number;

  /** ADO Feature URL */
  featureUrl?: string;

  /** Last sync timestamp */
  syncedAt?: string;

  /** ADO organization */
  organization?: string;

  /** ADO project */
  project?: string;
}

/**
 * Acceptance Criteria
 */
export interface AcceptanceCriteria {
  /** Unique identifier (e.g., AC-US1-01) */
  id: string;

  /** Description of the acceptance criteria */
  description: string;

  /** Status */
  status: 'todo' | 'done';

  /** Priority (P1 = must-have, P2 = should-have, P3 = nice-to-have) */
  priority?: 'P1' | 'P2' | 'P3';

  /** Is this testable? */
  testable?: boolean;
}

/**
 * User Story
 */
export interface UserStory {
  /** Unique identifier (e.g., US-001) */
  id: string;

  /** User story title (As a X, I want Y, so that Z) */
  title: string;

  /** Detailed description */
  description?: string;

  /** Status */
  status: 'todo' | 'in-progress' | 'done';

  /** Priority */
  priority: 'P1' | 'P2' | 'P3';

  /** Acceptance criteria */
  acceptanceCriteria: AcceptanceCriteria[];

  /** Which increment implemented this (if any) */
  implementedIn?: string[];

  /** Epic this story belongs to */
  epic?: string;
}

/**
 * Increment Reference (which increments implemented parts of this spec)
 */
export interface IncrementReference {
  /** Increment ID (e.g., 0001-core-framework) */
  id: string;

  /** Increment status */
  status: 'planned' | 'in-progress' | 'complete' | 'abandoned';

  /** Completion date */
  completedAt?: string;

  /** User stories implemented in this increment */
  userStories: string[]; // Array of US-IDs

  /** Notes about this increment */
  notes?: string;
}

/**
 * Spec Metadata (from YAML frontmatter)
 */
export interface SpecMetadata {
  /** Spec ID (e.g., spec-001) */
  id: string;

  /** Feature area title */
  title: string;

  /** Current status */
  status: 'draft' | 'in-progress' | 'complete' | 'archived';

  /** Priority level */
  priority: 'P0' | 'P1' | 'P2' | 'P3';

  /** Creation date */
  created?: string;

  /** Last updated date */
  updated?: string;

  /** External tool links */
  externalLinks?: {
    github?: GitHubLink;
    jira?: JiraLink;
    ado?: AdoLink;
  };

  /** User stories (extracted from markdown content) */
  userStories?: UserStory[];

  /** Increments that implemented parts of this spec */
  increments?: IncrementReference[];

  /** Total progress (calculated) */
  progress?: {
    totalUserStories: number;
    completedUserStories: number;
    percentComplete: number;
  };

  /** Tags/labels */
  tags?: string[];

  /** Related specs */
  relatedSpecs?: string[];
}

/**
 * Spec Content (full parsed spec file)
 */
export interface SpecContent {
  /** Metadata from YAML frontmatter */
  metadata: SpecMetadata;

  /** Markdown content (without frontmatter) */
  markdown: string;

  /** File path */
  filePath: string;
}

/**
 * Sync Conflict
 */
export interface SpecSyncConflict {
  /** Conflict type */
  type: 'status' | 'user-story' | 'acceptance-criteria' | 'metadata';

  /** Field that conflicts */
  field: string;

  /** Value in spec.md (local) */
  localValue: any;

  /** Value in external tool (remote) */
  remoteValue: any;

  /** Suggested resolution */
  resolution: 'local-wins' | 'remote-wins' | 'merge' | 'prompt-user';

  /** Conflict description */
  description: string;
}

/**
 * Spec Sync Result
 */
export interface SpecSyncResult {
  /** Success or failure */
  success: boolean;

  /** Spec ID that was synced */
  specId: string;

  /** Provider that was synced to */
  provider: 'github' | 'jira' | 'ado';

  /** External entity ID created/updated */
  externalId?: string;

  /** External entity URL */
  url?: string;

  /** Conflicts detected (if any) */
  conflicts?: SpecSyncConflict[];

  /** Changes applied */
  changes?: {
    created: string[];      // What was created
    updated: string[];      // What was updated
    deleted: string[];      // What was deleted
  };

  /** Error message (if failed) */
  error?: string;
}

/**
 * Spec Validation Result
 */
export interface SpecValidationResult {
  /** Is spec valid? */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Spec ID */
  specId: string;
}
