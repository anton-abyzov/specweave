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
    /** All tasks complete, increment finished */
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
 *
 * Statuses that do NOT count:
 * - PLANNING: Lightweight spec/planning work, parallel-safe
 * - BACKLOG: Not started yet
 * - COMPLETED: Already done
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
//# sourceMappingURL=increment-metadata.d.ts.map