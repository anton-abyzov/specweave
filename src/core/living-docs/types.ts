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
  project?: string; // Project ID (backend, frontend, mobile, etc.)
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

/**
 * External Tool Mapping - Shows how SpecWeave hierarchy maps to external tool hierarchy
 *
 * Examples:
 * - SpecWeave Feature (FS-031) → JIRA Epic (AUTH-100)
 * - SpecWeave User Story (US-001) → JIRA Story (AUTH-101)
 * - SpecWeave Task (T-001) → JIRA Sub-task (AUTH-102)
 */
export interface ExternalToolMapping {
  provider: 'github' | 'jira' | 'ado'; // Which external tool
  externalType: string; // External type (e.g., "epic", "story", "issue", "feature")
  externalId?: string; // External ID (e.g., "AUTH-100", "#45", "12345")
  externalUrl?: string; // Full URL to external item
  hierarchyLevel: 'epic' | 'feature' | 'user-story' | 'task'; // SpecWeave hierarchy level
  mappingNote?: string; // Optional note explaining the divergence
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
  externalToolMapping?: ExternalToolMapping; // How this user story maps to external tool

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
  project?: string; // Project ID (backend, frontend, mobile, etc.)
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
  epic?: string; // Epic ID from frontmatter (EPIC-YYYY-QN-name)
  project?: string; // Single project ID from frontmatter (backward compat)
  projects?: string[]; // Multiple projects (for cross-project features)
  created?: string; // ISO date

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
// UNIVERSAL HIERARCHY MAPPING (NEW)
// ============================================================================

/**
 * Epic Mapping - Maps increments to cross-project epics (_epics/ folder)
 *
 * Epics are strategic themes that span multiple features.
 * Example: EPIC-2025-Q4-platform
 */
export interface EpicMapping {
  epicId: string;                 // EPIC-2025-Q4-platform
  epicFolder: string;             // EPIC-2025-Q4-platform
  epicPath: string;               // .../specs/_epics/EPIC-2025-Q4-platform
  features: string[];             // ['FS-25-11-12-external-tool-sync', ...]
  confidence: number;             // 0-100
  detectionMethod: 'frontmatter' | 'config' | 'fallback';
}

/**
 * Feature Mapping - Maps increments to cross-project features (_features/ + project folders)
 *
 * Features can be cross-project (implemented in multiple projects) or single-project.
 * Format: FS-{YY-MM-DD}-{feature-name}
 * Example: FS-25-11-12-external-tool-sync
 */
export interface FeatureMapping {
  featureId: string;              // FS-25-11-12-external-tool-sync
  featureFolder: string;          // FS-25-11-12-external-tool-sync
  featurePath: string;            // .../specs/_features/FS-25-11-12-external-tool-sync
  projects: string[];             // ['backend', 'frontend'] or ['default']
  projectPaths: Map<string, string>; // backend → .../specs/backend/FS-25-11-12-external-tool-sync
  epic?: string;                  // EPIC-2025-Q4-platform (if part of epic)
  confidence: number;             // 0-100
  detectionMethod: 'frontmatter' | 'increment-name' | 'config' | 'fallback';
}

/**
 * Project Context - Information about a specific project
 *
 * Projects are dynamic (no hardcodes):
 * - Single-project mode: ['default']
 * - Multi-project mode: User-configured names from config.json
 */
export interface ProjectContext {
  projectId: string;              // 'backend', 'frontend', 'default'
  projectName: string;            // 'Backend Services', 'Frontend App'
  projectPath: string;            // .../specs/backend/
  keywords: string[];             // ['api', 'backend', 'service']
  techStack: string[];            // ['Node.js', 'PostgreSQL']
}

/**
 * Feature File - Cross-project feature overview (FEATURE.md)
 *
 * NEW: Separate from EpicFile (which was repurposed from SPEC-###.md)
 * Location: _features/FS-{id}/FEATURE.md
 */
export interface FeatureFile {
  // Frontmatter
  id: string;                     // FS-25-11-12-external-tool-sync
  title: string;
  type: 'feature';
  status: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: string;              // P0, P1, P2, P3
  created: string;                // ISO date
  lastUpdated: string;            // ISO date
  epic?: string;                  // EPIC-2025-Q4-platform (if part of epic)
  projects: string[];             // ['backend', 'frontend'] (which projects implement this)
  sourceIncrement?: string;       // Source increment ID (e.g., '0031-external-tool-sync')
  externalToolMapping?: ExternalToolMapping; // How this feature maps to external tool

  // Content
  overview: string;               // High-level feature description
  businessValue: string[];        // Bullet points
  implementationHistory: ImplementationHistoryEntry[];
  userStoriesByProject: Map<string, UserStorySummary[]>; // backend -> [US-001, US-002]
  externalLinks: ExternalLinks;

  // Progress
  totalStories: number;
  completedStories: number;
  overallProgress: number;        // Percentage
}

/**
 * Epic File - Strategic theme overview (EPIC.md)
 *
 * NEW: Top-level strategic planning
 * Location: _epics/EPIC-{id}/EPIC.md
 */
export interface EpicThemeFile {
  // Frontmatter
  id: string;                     // EPIC-2025-Q4-platform
  title: string;
  type: 'epic';
  status: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: string;              // P0, P1, P2, P3
  created: string;                // ISO date
  lastUpdated: string;            // ISO date
  quarter?: string;               // '2025-Q4'

  // Content
  strategicOverview: string;      // Business goals and objectives
  features: string[];             // ['FS-25-11-12-external-tool-sync', ...]
  successMetrics: Array<{
    metric: string;
    target: string;
    current: string;
    status: 'on-track' | 'at-risk' | 'blocked';
  }>;
  timeline: {
    start: string;
    targetCompletion: string;
    currentPhase: string;
  };
  stakeholders: {
    sponsor?: string;
    productOwner?: string;
    technicalLead?: string;
  };
  externalLinks: ExternalLinks;
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
  userStoriesSubdir: string; // "user-stories" (deprecated: use empty string)

  // File naming
  epicFilePattern: string; // "SPEC-{id}-{name}.md" (deprecated: use EPIC.md)
  userStoryFilePattern: string; // "us-{id}-{name}.md"

  // Content generation
  generateFrontmatter: boolean;
  generateCrossLinks: boolean;
  preserveOriginal: boolean; // Keep original flat spec in _archive/

  // Behavior
  overwriteExisting: boolean;
  createBackups: boolean;
}
