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
export declare enum IncrementStatus {
    /** Planning phase - spec/plan/tasks being created (does NOT count towards WIP limits) */
    PLANNING = "planning",
    /** Currently being worked on */
    ACTIVE = "active",
    /** Planned but not ready to start yet (does NOT count towards WIP limits) */
    BACKLOG = "backlog",
    /** Temporarily stopped (blocked by external dependency, deprioritized) */
    PAUSED = "paused",
    /**
     * All tasks complete, awaiting user review (v0.28.63+)
     *
     * CRITICAL: This is a gating status that prevents auto-completion bugs.
     * - Auto-transitions to READY_FOR_REVIEW when all tasks completed
     * - User MUST explicitly run /specweave:done to move to COMPLETED
     * - /specweave:next will prompt for confirmation before closure
     *
     * Prevents the bug where status becomes "completed" without:
     * 1. ACs being checked in spec.md
     * 2. User approval
     */
    READY_FOR_REVIEW = "ready_for_review",
    /** All tasks complete AND user approved - increment finished */
    COMPLETED = "completed",
    /** Work abandoned (requirements changed, obsolete, etc.) */
    ABANDONED = "abandoned"
}
/**
 * Increment type enum
 * Determines rules and limits applied to the increment
 */
export declare enum IncrementType {
    /** Critical production fix (bypasses all limits) */
    HOTFIX = "hotfix",
    /** Standard feature development (limit: 2 active) */
    FEATURE = "feature",
    /** Production bug fix with SRE investigation (unlimited, urgent) */
    BUG = "bug",
    /** Change request from stakeholders (limit: 2 active) */
    CHANGE_REQUEST = "change-request",
    /** Code improvement (limit: 1 active) */
    REFACTOR = "refactor",
    /** POC/spike work (unlimited, auto-abandon after 14 days) */
    EXPERIMENT = "experiment"
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
    testMode?: 'TDD' | 'test-after' | 'manual';
    /** Coverage target percentage (70-95, defaults to global config) */
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
     * Set only via explicit /specweave:done command
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
export declare const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]>;
/**
 * Type-based limits
 * Maximum active increments per type
 *
 * null = unlimited (no limit enforcement)
 * User can configure per-project in .specweave/config.json
 */
export declare const TYPE_LIMITS: Record<IncrementType, number | null>;
/**
 * Staleness thresholds (days)
 * When to warn about stale increments
 */
export declare const STALENESS_THRESHOLDS: {
    /** Warn if paused for more than this many days */
    PAUSED: number;
    /** Warn if active for more than this many days */
    ACTIVE: number;
    /** Auto-abandon experiments after this many days */
    EXPERIMENT: number;
};
/**
 * Default metadata for new increments
 *
 * NOTE: New increments start in PLANNING status by default.
 * They auto-transition to ACTIVE when tasks.md is created or first task starts.
 */
export declare function createDefaultMetadata(id: string, type?: IncrementType): IncrementMetadata;
/**
 * Check if status transition is valid
 */
export declare function isValidTransition(from: IncrementStatus, to: IncrementStatus): boolean;
/**
 * Check if increment is stale (paused too long or active too long)
 */
export declare function isStale(metadata: IncrementMetadata): boolean;
/**
 * Check if increment should be auto-abandoned (experiments only)
 */
export declare function shouldAutoAbandon(metadata: IncrementMetadata): boolean;
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
export declare const WIP_COUNTED_STATUSES: IncrementStatus[];
/**
 * Check if increment status counts toward WIP (Work In Progress) limits
 */
export declare function countsTowardWipLimit(status: IncrementStatus): boolean;
/**
 * Validate if a status transition is allowed
 * @throws Error if transition is invalid
 */
export declare function validateTransition(from: IncrementStatus, to: IncrementStatus): void;
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
}
//# sourceMappingURL=increment-metadata.d.ts.map