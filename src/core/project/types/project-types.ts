/**
 * Project Registry Type Definitions
 *
 * Central type definitions for the Project Registry system.
 * Provides strongly-typed interfaces for projects, external mappings,
 * and event payloads used in the EDA-based synchronization.
 */

/**
 * GitHub external mapping configuration
 */
export interface GitHubMapping {
  /** Label name in GitHub (e.g., "project:frontend-app") */
  labelName: string;
  /** Label color hex code (without #) */
  labelColor?: string;
  /** Last successful sync timestamp */
  lastSynced?: string;
  /** Last sync error message if any */
  syncError?: string;
}

/**
 * Azure DevOps external mapping configuration
 */
export interface ADOMapping {
  /** Area path in ADO (e.g., "MyProject\\Frontend") */
  areaPath: string;
  /** Last successful sync timestamp */
  lastSynced?: string;
  /** Last sync error message if any */
  syncError?: string;
}

/**
 * JIRA external mapping configuration
 */
export interface JiraMapping {
  /** JIRA project key (e.g., "FRONT") */
  projectKey: string;
  /** Last successful sync timestamp */
  lastSynced?: string;
  /** Last sync error message if any */
  syncError?: string;
}

/**
 * External tool mappings for a project
 */
export interface ExternalMapping {
  github?: GitHubMapping;
  ado?: ADOMapping;
  jira?: JiraMapping;
}

/**
 * Project definition in the registry
 */
export interface Project {
  /** Unique project identifier (kebab-case, e.g., "frontend-app") */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Optional project description */
  description?: string;
  /** Technology stack */
  techStack?: string[];
  /** Team or owner */
  team?: string;
  /** Keywords for intelligent detection */
  keywords?: string[];
  /** Creation timestamp */
  created: string;
  /** Last updated timestamp */
  updated?: string;
  /** External tool mappings */
  external?: ExternalMapping;
}

/**
 * Project registry data structure (stored in projects.json)
 */
export interface ProjectRegistryData {
  /** Schema version for migrations */
  version: string;
  /** Projects indexed by ID */
  projects: Record<string, Project>;
  /** Default project ID for new increments */
  defaultProject?: string;
  /** Registry metadata */
  metadata?: {
    /** When the registry was created */
    created: string;
    /** When the registry was last modified */
    lastModified: string;
    /** Source of migration (if migrated from config.json) */
    migratedFrom?: 'config.json' | 'manual';
  };
}

// ============================================
// Event Types for EDA
// ============================================

/**
 * Base event interface
 */
export interface ProjectEventBase {
  /** ISO timestamp when event was created */
  timestamp: string;
}

/**
 * Event emitted when a new project is added to the registry
 */
export interface ProjectCreatedEvent extends ProjectEventBase {
  type: 'ProjectCreated';
  project: Project;
}

/**
 * Event emitted when a project is updated
 */
export interface ProjectUpdatedEvent extends ProjectEventBase {
  type: 'ProjectUpdated';
  projectId: string;
  changes: Partial<Project>;
  previousValues?: Partial<Project>;
}

/**
 * Event emitted when a project is removed
 */
export interface ProjectDeletedEvent extends ProjectEventBase {
  type: 'ProjectDeleted';
  projectId: string;
  project: Project;
}

/**
 * Event emitted to request sync to external tools
 */
export interface ProjectSyncRequestedEvent extends ProjectEventBase {
  type: 'ProjectSyncRequested';
  /** Project ID to sync, or undefined to sync all */
  projectId?: string;
  /** Target tools to sync to */
  targets: ('github' | 'ado' | 'jira')[];
  /** Force sync even if already synced recently */
  force?: boolean;
}

/**
 * Event emitted when a project is discovered in an external tool
 */
export interface ExternalProjectDiscoveredEvent extends ProjectEventBase {
  type: 'ExternalProjectDiscovered';
  source: 'github' | 'ado' | 'jira';
  /** Discovered project identifier in external tool */
  externalId: string;
  /** Suggested project data */
  suggestedProject: Partial<Project>;
}

/**
 * Union type of all project events
 */
export type ProjectEvent =
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | ProjectDeletedEvent
  | ProjectSyncRequestedEvent
  | ExternalProjectDiscoveredEvent;

/**
 * Event type discriminator
 */
export type ProjectEventType = ProjectEvent['type'];

/**
 * Handler function type for project events
 */
export type ProjectEventHandler<T extends ProjectEvent = ProjectEvent> = (
  event: T
) => void | Promise<void>;

// ============================================
// Validation Types
// ============================================

/**
 * Validation result for project data
 */
export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Options for adding a project
 */
export interface AddProjectOptions {
  /** Skip validation */
  skipValidation?: boolean;
  /** Emit ProjectCreated event */
  emitEvent?: boolean;
  /** Mark as default project */
  setAsDefault?: boolean;
}

/**
 * Options for updating a project
 */
export interface UpdateProjectOptions {
  /** Skip validation */
  skipValidation?: boolean;
  /** Emit ProjectUpdated event */
  emitEvent?: boolean;
}

/**
 * Options for removing a project
 */
export interface RemoveProjectOptions {
  /** Emit ProjectDeleted event */
  emitEvent?: boolean;
  /** Force removal even if it's the default project */
  force?: boolean;
}

// ============================================
// Sync Status Types
// ============================================

/**
 * Sync status for a specific external tool
 */
export interface SyncStatus {
  tool: 'github' | 'ado' | 'jira';
  lastSynced?: string;
  status: 'synced' | 'pending' | 'error' | 'never';
  error?: string;
}

/**
 * Aggregated sync status for a project
 */
export interface ProjectSyncStatus {
  projectId: string;
  overallStatus: 'synced' | 'partial' | 'error' | 'never';
  tools: SyncStatus[];
}
