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
