/**
 * Increment Metadata Types
 *
 * Defines the schema for increment metadata tracking (status, type, timestamps).
 * Part of increment 0007: Smart Status Management
 */

/**
 * Increment status enum
 * Tracks the lifecycle state of an increment
 */
export enum IncrementStatus {
  /** Planning phase - spec/plan/tasks being created (does NOT count towards WIP limits) */
  PLANNING = 'planning',

  /** Currently being worked on */
  ACTIVE = 'active',

  /** Planned but not ready to start yet (does NOT count towards WIP limits) */
  BACKLOG = 'backlog',

  /** Temporarily stopped (blocked by external dependency, deprioritized) */
  PAUSED = 'paused',

  /**
   * All tasks complete, awaiting user review (v0.28.63+)
   *
   * CRITICAL: This is a gating status that prevents auto-completion bugs.
   * - Auto-transitions to READY_FOR_REVIEW when all tasks completed
   * - User MUST explicitly run /sw:done to move to COMPLETED
   * - /sw:next will prompt for confirmation before closure
   *
   * Prevents the bug where status becomes "completed" without:
   * 1. ACs being checked in spec.md
   * 2. User approval
   */
  READY_FOR_REVIEW = 'ready_for_review',

  /** All tasks complete AND user approved - increment finished */
  COMPLETED = 'completed',

  /** Work abandoned (requirements changed, obsolete, etc.) */
  ABANDONED = 'abandoned'
}

/**
 * Increment type enum
 * Determines rules and limits applied to the increment
 */
export enum IncrementType {
  /** Critical production fix (bypasses all limits) */
  HOTFIX = 'hotfix',

  /** Standard feature development (limit: 2 active) */
  FEATURE = 'feature',

  /** Production bug fix with SRE investigation (unlimited, urgent) */
  BUG = 'bug',

  /** Change request from stakeholders (limit: 2 active) */
  CHANGE_REQUEST = 'change-request',

  /** Code improvement (limit: 1 active) */
  REFACTOR = 'refactor',

  /** POC/spike work (unlimited, auto-abandon after 14 days) */
  EXPERIMENT = 'experiment'
}

/**
 * Increment metadata schema
 * Stored in .specweave/increments/{id}/metadata.json
 */
export interface IncrementMetadata {
  /** Increment ID (e.g., "0007-smart-increment-discipline") */
  id: string;

  /** Current status */
  status: IncrementStatus;

  /** Increment type */
  type: IncrementType;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last activity timestamp (ISO 8601) */
  lastActivity: string;

  /** Testing mode for this increment (defaults to global config) */
  testMode?: 'TDD' | 'test-after' | 'manual' | 'none';

  /** Coverage target percentage (0-100, 0 = no tracking, defaults to global config) */
  coverageTarget?: number;

  /** Reason for moving to backlog (only if status = backlog) */
  backlogReason?: string;

  /** Timestamp when moved to backlog (ISO 8601) */
  backlogAt?: string;

  /** Reason for pausing (only if status = paused) */
  pausedReason?: string;

  /** Timestamp when paused (ISO 8601) */
  pausedAt?: string;

  /** Reason for abandoning (only if status = abandoned) */
  abandonedReason?: string;

  /** Timestamp when abandoned (ISO 8601) */
  abandonedAt?: string;

  /**
   * Timestamp when moved to ready_for_review (ISO 8601)
   * Set automatically when all tasks are completed
   * (v0.28.63+)
   */
  readyForReviewAt?: string;

  /**
   * Timestamp when user approved completion (ISO 8601)
   * Set only via explicit /sw:done command
   * (v0.28.63+)
   */
  approvedAt?: string;
}

/**
 * Increment metadata with additional computed fields
 * Used for rich status displays
 */
export interface IncrementMetadataExtended extends IncrementMetadata {
  /** Progress percentage (0-100) */
  progress?: number;

  /** Number of completed tasks */
  completedTasks?: number;

  /** Total number of tasks */
  totalTasks?: number;

  /** Age in days since creation */
  ageInDays?: number;

  /** Days since paused (if paused) */
  daysPaused?: number;
}

/**
 * Valid status transitions
 * Enforces increment lifecycle rules
 *
 * CRITICAL (v0.28.63+): ACTIVE cannot directly transition to COMPLETED!
 * Must go through READY_FOR_REVIEW first, which requires explicit user approval.
 * This prevents the auto-completion bug where increments are marked "completed"
 * without ACs being checked or user confirmation.
 */
export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
  [IncrementStatus.PLANNING]: [
    IncrementStatus.ACTIVE,     // Move to active when tasks start
    IncrementStatus.BACKLOG,    // Move to backlog if deprioritized
    IncrementStatus.ABANDONED   // Cancel planning
  ],
  [IncrementStatus.ACTIVE]: [
    IncrementStatus.BACKLOG,
    IncrementStatus.PAUSED,
    IncrementStatus.READY_FOR_REVIEW, // All tasks done → awaiting review
    IncrementStatus.ABANDONED
    // NOTE: COMPLETED intentionally NOT allowed! Must go through READY_FOR_REVIEW
  ],
  [IncrementStatus.BACKLOG]: [
    IncrementStatus.PLANNING,   // Resume planning
    IncrementStatus.ACTIVE,
    IncrementStatus.ABANDONED
  ],
  [IncrementStatus.PAUSED]: [
    IncrementStatus.ACTIVE,
    IncrementStatus.READY_FOR_REVIEW, // Can mark done while paused
    IncrementStatus.ABANDONED
  ],
  [IncrementStatus.READY_FOR_REVIEW]: [
    IncrementStatus.COMPLETED,  // ONLY via explicit /sw:done with user approval
    IncrementStatus.ACTIVE,     // Reopen if more work needed
    IncrementStatus.ABANDONED   // Cancel if requirements changed
  ],
  [IncrementStatus.COMPLETED]: [
    // Allow reopening completed increments when issues discovered
    IncrementStatus.ACTIVE,     // Reopen for fixes
    IncrementStatus.ABANDONED   // Mark as failed (rare)
  ],
  [IncrementStatus.ABANDONED]: [
    IncrementStatus.ACTIVE  // Can un-abandon if needed (rare)
  ]
};

/**
 * Type-based limits
 * Maximum active increments per type
 *
 * null = unlimited (no limit enforcement)
 * User can configure per-project in .specweave/config.json
 */
export const TYPE_LIMITS: Record<IncrementType, number | null> = {
  [IncrementType.HOTFIX]: null,          // Unlimited (emergency work)
  [IncrementType.FEATURE]: 2,            // Max 2 active (context switching cost)
  [IncrementType.BUG]: null,             // Unlimited (production issues)
  [IncrementType.CHANGE_REQUEST]: 2,     // Max 2 active (stakeholder-driven)
  [IncrementType.REFACTOR]: 1,           // Max 1 active (needs focus)
  [IncrementType.EXPERIMENT]: null       // Unlimited (exploratory work)
};

/**
 * Staleness thresholds (days)
 * When to warn about stale increments
 */
export const STALENESS_THRESHOLDS = {
  /** Warn if paused for more than this many days */
  PAUSED: 7,

  /** Warn if active for more than this many days */
  ACTIVE: 30,

  /** Auto-abandon experiments after this many days */
  EXPERIMENT: 14
};

/**
 * Default metadata for new increments
 *
 * NOTE: New increments start in PLANNING status by default.
 * They auto-transition to ACTIVE when tasks.md is created or first task starts.
 */
export function createDefaultMetadata(id: string, type: IncrementType = IncrementType.FEATURE): IncrementMetadata {
  const now = new Date().toISOString();

  return {
    id,
    status: IncrementStatus.PLANNING,  // Start in planning phase
    type,
    created: now,
    lastActivity: now
  };
}

/**
 * Check if status transition is valid
 */
export function isValidTransition(from: IncrementStatus, to: IncrementStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Check if increment is stale (paused too long or active too long)
 */
export function isStale(metadata: IncrementMetadata): boolean {
  const now = new Date();

  if (metadata.status === IncrementStatus.PAUSED && metadata.pausedAt) {
    const pausedDate = new Date(metadata.pausedAt);
    const daysPaused = (now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysPaused > STALENESS_THRESHOLDS.PAUSED;
  }

  if (metadata.status === IncrementStatus.ACTIVE) {
    const createdDate = new Date(metadata.created);
    const daysActive = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysActive > STALENESS_THRESHOLDS.ACTIVE;
  }

  return false;
}

/**
 * Check if increment should be auto-abandoned (experiments only)
 */
export function shouldAutoAbandon(metadata: IncrementMetadata): boolean {
  if (metadata.type !== IncrementType.EXPERIMENT) {
    return false;
  }

  const now = new Date();
  const lastActivityDate = new Date(metadata.lastActivity);
  const daysSinceActivity = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceActivity > STALENESS_THRESHOLDS.EXPERIMENT;
}

/**
 * Statuses that count toward WIP (Work In Progress) limits
 *
 * ACTIVE: Currently executing tasks, consumes team capacity
 * PAUSED: Temporarily blocked but still holding resources/context
 * READY_FOR_REVIEW: Tasks done, awaiting approval (still blocks capacity)
 *
 * Statuses that do NOT count:
 * - PLANNING: Lightweight spec/planning work, parallel-safe
 * - BACKLOG: Not started yet
 * - COMPLETED: Already done (user approved)
 * - ABANDONED: Cancelled
 */
export const WIP_COUNTED_STATUSES: IncrementStatus[] = [
  IncrementStatus.ACTIVE,
  IncrementStatus.PAUSED,          // Paused work still blocks team capacity
  IncrementStatus.READY_FOR_REVIEW // Awaiting user approval, still in progress
];

/**
 * Check if increment status counts toward WIP (Work In Progress) limits
 */
export function countsTowardWipLimit(status: IncrementStatus): boolean {
  return WIP_COUNTED_STATUSES.includes(status);
}

/**
 * Validate if a status transition is allowed
 * @throws Error if transition is invalid
 */
export function validateTransition(from: IncrementStatus, to: IncrementStatus): void {
  if (!isValidTransition(from, to)) {
    const validTransitions = VALID_TRANSITIONS[from];
    throw new Error(
      `Invalid transition: ${from} → ${to}.\n` +
      `Valid transitions from ${from}: ${validTransitions.join(', ')}`
    );
  }
}

// ============================================================================
// Multi-Project User Story Types (v0.29.0+)
// ============================================================================

/**
 * Project scope for a multi-project user story
 * Defines what portion of the work belongs to each project
 */
export interface MultiProjectScope {
  /** SpecWeave project ID (e.g., "FE", "BE", "Shared") */
  id: string;

  /** Description of work scope for this project */
  scope: string;

  /** Keywords for this project's portion (for auto-classification) */
  keywords?: string[];

  /** Estimated effort percentage (0-100) */
  effortPercentage?: number;
}

/**
 * Cross-project dependency
 * Defines dependencies between projects within a user story
 */
export interface CrossProjectDependency {
  /** Project that depends on another */
  from: string;

  /** Project being depended upon */
  to: string;

  /** Description of the dependency */
  reason: string;

  /** Type of dependency */
  type?: 'blocking' | 'soft' | 'interface';
}

/**
 * Multi-project user story configuration
 * Used when a single user story spans multiple SpecWeave projects
 */
export interface MultiProjectUserStory {
  /** List of projects this user story touches */
  projects: MultiProjectScope[];

  /** Dependencies between projects (optional) */
  dependencies?: CrossProjectDependency[];

  /** Primary project (receives the main spec, others get derived specs) */
  primaryProject?: string;

  /** How to handle sync - create linked issues in each project's external tool */
  syncStrategy?: 'linked' | 'primary-only' | 'all';
}

/**
 * External container context for 2-level directory structure
 * Used for JIRA boards / ADO area paths mapping
 */
export interface ExternalContainerContext {
  /** Container type (e.g., "jira-project", "ado-project") */
  type: 'jira-project' | 'ado-project' | 'github-org';

  /** External container ID (e.g., "CORE" for JIRA, "MyProduct" for ADO) */
  containerId: string;

  /** Display name */
  containerName: string;

  /** Board ID (JIRA only) */
  boardId?: number;

  /** Board name (JIRA only) */
  boardName?: string;

  /** Area path (ADO only) */
  areaPath?: string;
}

/**
 * External reference for a single US in a single external tool
 * @since v0.33.0
 */
export interface USExternalRef {
  /** External tool type */
  provider: 'github' | 'jira' | 'ado';

  /** Issue/work item number */
  issueNumber: number | string;

  /** Issue URL */
  url: string;

  /** Target project/repo for this US (from projectMappings) */
  targetProject: string;

  /** Last sync timestamp */
  lastSynced?: string;
}

/**
 * Per-US external references map
 * Maps US-ID → provider → reference
 * @since v0.33.0
 */
export interface USExternalRefsMap {
  [usId: string]: {
    github?: USExternalRef;
    jira?: USExternalRef;
    ado?: USExternalRef;
  };
}

/**
 * Extended increment metadata with multi-project support (v0.29.0+)
 *
 * NOTE (v0.29.0): featureId field was REMOVED
 * Feature ID is derived from increment number: 0081 → FS-081
 * Use deriveFeatureId() from src/utils/feature-id-derivation.ts
 * See ADR-0140 for rationale
 */
export interface IncrementMetadataV2 extends IncrementMetadata {
  /** Single project ID (backward compatible) */
  projectId?: string;

  /** Multi-project configuration (v0.29.0+, overrides projectId if set) */
  multiProject?: MultiProjectUserStory;

  /** External container context for 2-level directory structure */
  externalContainer?: ExternalContainerContext;

  /** Epic ID if part of an epic */
  epicId?: string;

  /**
   * Per-US external references (v0.33.0+)
   * Replaces the single external_ref for cross-project increments
   * Maps: US-001 → { github: {...}, jira: {...} }
   */
  externalRefs?: USExternalRefsMap;
}
