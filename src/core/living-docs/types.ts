/**
 * Types for Living Docs system
 *
 * Handles synchronization between increments and living documentation.
 */

/**
 * Acceptance Criterion structure
 */
export interface AcceptanceCriterion {
  /** AC ID (e.g., "AC-US1-01") */
  id: string;

  /** User Story ID (e.g., "US1") */
  userStoryId: string;

  /** AC description */
  description: string;

  /** Completion status */
  completed: boolean;

  /** Project tags (e.g., ["backend"], ["frontend"], ["backend", "frontend"]) */
  projects?: string[];

  /** Raw markdown line for preservation */
  rawLine?: string;
}

/**
 * Task structure
 */
export interface Task {
  /** Task ID (e.g., "T-001") */
  id: string;

  /** Task title */
  title: string;

  /** Task description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Completion date (ISO string) */
  completedDate?: string;

  /** AC IDs this task implements (e.g., ["AC-US1-01", "AC-US1-02"]) */
  acIds: string[];

  /** File paths this task modifies */
  files?: string[];

  /** Raw markdown line for preservation */
  rawLine?: string;
}

/**
 * User Story structure
 */
export interface UserStory {
  /** User Story ID (e.g., "US1") */
  id: string;

  /** User Story title */
  title: string;

  /** File path to user story markdown file */
  filePath: string;

  /** Projects this user story belongs to */
  projects: string[];

  /** Acceptance Criteria for this story */
  acceptanceCriteria: AcceptanceCriterion[];

  /** Tasks implementing this story */
  tasks: Task[];

  /** Optional fields for backward compatibility */
  description?: string;
  status?: string;
  phase?: string;
  priority?: string;
  businessRationale?: string;
}

/**
 * Project type
 */
export type ProjectType = 'backend' | 'frontend' | 'mobile' | 'shared';

/**
 * Project detection result
 */
export interface ProjectDetectionResult {
  /** Detected projects */
  projects: ProjectType[];

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Legacy types for backward compatibility
 * TODO: Refactor hierarchy-mapper.ts and project-manager.ts
 */

export interface ProjectContext {
  id?: string;           // Made optional for compatibility
  projectId?: string;
  name?: string;         // Made optional for compatibility
  projectName?: string;
  path?: string;         // Made optional for compatibility
  projectPath?: string;
  type?: string;
  techStack?: string[];
  keywords?: string[];
}

export interface EpicMapping {
  epicId: string;
  features: string[];
  epicFolder?: string;
  epicPath?: string;
  confidence?: number;
  detectionMethod?: string;  // Added for hierarchy-mapper
}

export interface FeatureMapping {
  featureId: string;
  userStories: string[];
  featureFolder?: string;
  featurePath?: string;
  confidence?: number;
  detectionMethod?: string;
  projects?: string[];
  projectPaths?: Record<string, string>;
  epic?: string;
}

// ============================================================================
// Sync Types (extracted from living-docs-sync.ts)
// ============================================================================

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  explicitFeatureId?: string;
}

export interface SyncResult {
  success: boolean;
  featureId: string;
  incrementId: string;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  status: string;
  priority: string;
  created: string;
  userStories: UserStoryData[];
  acceptanceCriteria: AcceptanceCriterionData[];
  frontmatter: Record<string, any>;
}

/**
 * Acceptance Criterion with full description (for external sync)
 * @since v1.0.59
 */
export interface ACWithDescription {
  id: string;
  description: string;
  completed: boolean;
}

export interface UserStoryData {
  id: string;
  title: string;
  description: string;
  /** AC IDs only (backward compatible) */
  acceptanceCriteria: string[];
  /**
   * Full AC data with descriptions for external sync (JIRA/ADO/GitHub)
   * @since v1.0.59 - Added for proper AC description sync
   */
  acceptanceCriteriaFull?: ACWithDescription[];
  phase?: string;
  status?: string;
  format_preservation?: boolean;
  external_title?: string;
  external_source?: 'github' | 'jira' | 'ado';
  external_id?: string;
  external_url?: string;
  imported_at?: string;
  origin?: 'internal' | 'external';

  // ============================================================================
  // Per-US Project/Board Targeting (v0.33.0+, enforced v0.34.0+)
  //
  // CRITICAL: Each User Story maps to EXACTLY ONE project and ONE board.
  // This is a 1:1 relationship - NOT optional, NOT multiple values allowed.
  //
  // For cross-project features, create separate USs for each project.
  //
  // Validation hook: plugins/specweave/hooks/v2/guards/per-us-project-validator.sh
  // ============================================================================

  /**
   * Target project for this US (REQUIRED for all structures)
   *
   * CONSTRAINT: Must be exactly ONE project ID (not comma-separated list)
   * - ✅ "frontend-app"
   * - ✅ "backend-api"
   * - ❌ "frontend-app, backend-api" (FORBIDDEN - use separate USs)
   *
   * @example "frontend-app"
   */
  project?: string;

  /**
   * Target board for 2-level structures (REQUIRED for 2-level)
   *
   * CONSTRAINT: Must be exactly ONE board ID (not comma-separated list)
   * - ✅ "web-team"
   * - ✅ "api-team"
   * - ❌ "web-team, api-team" (FORBIDDEN - use separate USs)
   *
   * @example "mobile-team"
   */
  board?: string;

  /**
   * Preferred external provider for this US
   * Used when project has multiple external tool mappings
   */
  externalProvider?: 'github' | 'jira' | 'ado';
}

export interface AcceptanceCriterionData {
  id: string;
  userStoryId: string;
  description: string;
  completed: boolean;
  priority?: string;
}
