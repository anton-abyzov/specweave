/**
 * Living Docs Distribution Types
 *
 * Defines the structure for distributing increment specs into hierarchical living docs.
 *
 * Hierarchy:
 * - Epic (SPEC-###.md) - High-level summary
 * - User Stories (us-###.md) - Detailed requirements
 * - Tasks (tasks.md) - Implementation details
 *
 * @author SpecWeave Team
 * @version 2.0.0
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Acceptance Criterion
 */
export interface AcceptanceCriterion {
  id: string; // AC-US1-01, AC-US1-02, etc.
  description: string;
  priority?: string; // P1, P2, P3
  testable: boolean;
  completed: boolean;
}

/**
 * Task Reference (links to tasks.md)
 */
export interface TaskReference {
  id: string; // T-001, T-002, etc.
  title: string; // "Create Enhanced Content Builder"
  anchor: string; // "#t-001-create-enhanced-content-builder"
  path: string; // Full relative path to tasks.md
  acIds: string[]; // AC-IDs extracted from task (e.g., ["AC-US1-01", "AC-US1-02"])
}

/**
 * User Story (detailed requirements)
 */
export interface UserStory {
  id: string; // US-001, US-002, etc.
  epic?: string; // SPEC-031
  title: string;
  description: string; // "As a... I want... So that..."
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: TaskReference[]; // Links to tasks in tasks.md
  businessRationale?: string;
  priority?: string; // P0, P1, P2, P3
  status: 'pending' | 'in-progress' | 'complete';
  phase?: string; // "Phase 1: Enhanced Content Sync"
  created?: string; // ISO date
  completed?: string; // ISO date
}

/**
 * Implementation History Entry
 */
export interface ImplementationHistoryEntry {
  increment: string; // "0031-external-tool-status-sync"
  stories: string[]; // ["US-001", "US-002", ...]
  status: 'complete' | 'in-progress' | 'planned';
  date?: string; // ISO date
  notes?: string;
}

/**
 * External Tool Links
 */
export interface ExternalLinks {
  github?: string; // GitHub Project URL
  jira?: string; // Jira Epic URL
  ado?: string; // Azure DevOps Feature URL
}

// ============================================================================
// EPIC FILE
// ============================================================================

/**
 * Epic-level content (SPEC-###.md)
 *
 * High-level summary only, links to user story files.
 */
export interface EpicFile {
  // Frontmatter
  id: string; // SPEC-031
  title: string;
  type: 'epic';
  status: 'active' | 'complete' | 'archived';
  priority?: string;
  created: string;
  lastUpdated: string;

  // Content
  overview: string; // Quick overview paragraph
  businessValue: string[]; // Bullet points
  implementationHistory: ImplementationHistoryEntry[];
  userStories: UserStorySummary[]; // Links to user story files
  externalLinks: ExternalLinks;
  relatedDocs: string[]; // Links to architecture, ADRs, etc.

  // Progress
  totalStories: number;
  completedStories: number;
  overallProgress: number; // Percentage
}

/**
 * User Story Summary (for epic file)
 */
export interface UserStorySummary {
  id: string; // US-001
  title: string;
  status: 'pending' | 'in-progress' | 'complete';
  phase?: string; // "Phase 1: Enhanced Content Sync"
  filePath: string; // "user-stories/us-001-rich-external-issue-content.md"
}

// ============================================================================
// USER STORY FILE
// ============================================================================

/**
 * User Story-level content (us-###.md)
 *
 * Detailed requirements, acceptance criteria, and task links.
 */
export interface UserStoryFile {
  // Frontmatter
  id: string; // US-001
  epic: string; // SPEC-031
  title: string;
  status: 'pending' | 'in-progress' | 'complete';
  priority?: string;
  created: string;
  completed?: string;

  // Content
  description: string; // "As a... I want... So that..."
  acceptanceCriteria: AcceptanceCriterion[];
  implementation: {
    increment: string; // Link to increment tasks.md
    tasks: TaskReference[]; // Links to specific tasks
  };
  businessRationale?: string;
  testCoverage?: {
    unit?: string;
    integration?: string;
    e2e?: string;
  };
  relatedStories: UserStorySummary[]; // Links to related user stories

  // Metadata
  phase?: string;
}

// ============================================================================
// DISTRIBUTION RESULT
// ============================================================================

/**
 * Result of distributing an increment spec into living docs
 */
export interface DistributionResult {
  // Generated files
  epic: EpicFile;
  userStories: UserStoryFile[];

  // Metadata
  incrementId: string;
  specId: string; // SPEC-031
  totalStories: number;
  totalFiles: number; // 1 epic + N user stories

  // File paths
  epicPath: string;
  userStoryPaths: string[];

  // Status
  success: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// PARSED INCREMENT SPEC
// ============================================================================

/**
 * Parsed increment spec (from increments/####/spec.md)
 */
export interface ParsedIncrementSpec {
  // Metadata
  incrementId: string; // "0031-external-tool-status-sync"
  title: string;
  overview: string;
  businessValue: string[]; // Bullet points
  priority?: string;
  status?: string;
  project?: string; // Project ID from frontmatter (backend, frontend, mobile, etc.)

  // User Stories
  userStories: UserStory[];

  // Implementation
  implementsSpec?: string; // SPEC-031 (if referencing existing spec)

  // External
  externalLinks?: ExternalLinks;
}

// ============================================================================
// CLASSIFIED CONTENT
// ============================================================================

/**
 * Content classified into epic vs user-story level
 */
export interface ClassifiedContent {
  // Epic-level content
  epic: {
    id: string;
    title: string;
    overview: string;
    businessValue: string[];
    priority?: string;
    status: string;
  };

  // User-story-level content
  userStories: UserStory[];

  // Implementation
  implementationHistory: ImplementationHistoryEntry[];

  // External
  externalLinks: ExternalLinks;
  relatedDocs: string[];
}

// ============================================================================
// CROSS-LINKS
// ============================================================================

/**
 * Cross-link between files
 */
export interface CrossLink {
  from: string; // Source file path
  to: string; // Target file path
  type: 'epic-to-story' | 'story-to-epic' | 'story-to-story' | 'story-to-task';
  label: string; // Link text
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Distribution configuration
 */
export interface DistributionConfig {
  // Output paths
  specsDir: string; // .specweave/docs/internal/specs/default/
  userStoriesSubdir: string; // "user-stories"

  // File naming
  epicFilePattern: string; // "SPEC-{id}-{name}.md"
  userStoryFilePattern: string; // "us-{id}-{name}.md"

  // Content generation
  generateFrontmatter: boolean;
  generateCrossLinks: boolean;
  preserveOriginal: boolean; // Keep original flat spec in _archive/

  // Behavior
  overwriteExisting: boolean;
  createBackups: boolean;
}
