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
export var IncrementStatus;
(function (IncrementStatus) {
    /** Planning phase - spec/plan/tasks being created (does NOT count towards WIP limits) */
    IncrementStatus["PLANNING"] = "planning";
    /** Currently being worked on */
    IncrementStatus["ACTIVE"] = "active";
    /** Planned but not ready to start yet (does NOT count towards WIP limits) */
    IncrementStatus["BACKLOG"] = "backlog";
    /** Temporarily stopped (blocked by external dependency, deprioritized) */
    IncrementStatus["PAUSED"] = "paused";
    /** All tasks complete, increment finished */
    IncrementStatus["COMPLETED"] = "completed";
    /** Work abandoned (requirements changed, obsolete, etc.) */
    IncrementStatus["ABANDONED"] = "abandoned";
})(IncrementStatus || (IncrementStatus = {}));
/**
 * Increment type enum
 * Determines rules and limits applied to the increment
 */
export var IncrementType;
(function (IncrementType) {
    /** Critical production fix (bypasses all limits) */
    IncrementType["HOTFIX"] = "hotfix";
    /** Standard feature development (limit: 2 active) */
    IncrementType["FEATURE"] = "feature";
    /** Production bug fix with SRE investigation (unlimited, urgent) */
    IncrementType["BUG"] = "bug";
    /** Change request from stakeholders (limit: 2 active) */
    IncrementType["CHANGE_REQUEST"] = "change-request";
    /** Code improvement (limit: 1 active) */
    IncrementType["REFACTOR"] = "refactor";
    /** POC/spike work (unlimited, auto-abandon after 14 days) */
    IncrementType["EXPERIMENT"] = "experiment";
})(IncrementType || (IncrementType = {}));
/**
 * Valid status transitions
 * Enforces increment lifecycle rules
 */
export const VALID_TRANSITIONS = {
    [IncrementStatus.PLANNING]: [
        IncrementStatus.ACTIVE, // Move to active when tasks start
        IncrementStatus.BACKLOG, // Move to backlog if deprioritized
        IncrementStatus.ABANDONED // Cancel planning
    ],
    [IncrementStatus.ACTIVE]: [
        IncrementStatus.BACKLOG,
        IncrementStatus.PAUSED,
        IncrementStatus.COMPLETED,
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.BACKLOG]: [
        IncrementStatus.PLANNING, // Resume planning
        IncrementStatus.ACTIVE,
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.PAUSED]: [
        IncrementStatus.ACTIVE,
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.COMPLETED]: [
        // NEW: Allow reopening completed increments when issues discovered
        IncrementStatus.ACTIVE, // Reopen for fixes
        IncrementStatus.ABANDONED // Mark as failed (rare)
    ],
    [IncrementStatus.ABANDONED]: [
        IncrementStatus.ACTIVE // Can un-abandon if needed (rare)
    ]
};
/**
 * Type-based limits
 * Maximum active increments per type
 *
 * null = unlimited (no limit enforcement)
 * User can configure per-project in .specweave/config.json
 */
export const TYPE_LIMITS = {
    [IncrementType.HOTFIX]: null, // Unlimited (emergency work)
    [IncrementType.FEATURE]: 2, // Max 2 active (context switching cost)
    [IncrementType.BUG]: null, // Unlimited (production issues)
    [IncrementType.CHANGE_REQUEST]: 2, // Max 2 active (stakeholder-driven)
    [IncrementType.REFACTOR]: 1, // Max 1 active (needs focus)
    [IncrementType.EXPERIMENT]: null // Unlimited (exploratory work)
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
export function createDefaultMetadata(id, type = IncrementType.FEATURE) {
    const now = new Date().toISOString();
    return {
        id,
        status: IncrementStatus.PLANNING, // Start in planning phase
        type,
        created: now,
        lastActivity: now
    };
}
/**
 * Check if status transition is valid
 */
export function isValidTransition(from, to) {
    const allowedTransitions = VALID_TRANSITIONS[from];
    return allowedTransitions.includes(to);
}
/**
 * Check if increment is stale (paused too long or active too long)
 */
export function isStale(metadata) {
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
export function shouldAutoAbandon(metadata) {
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
 *
 * Statuses that do NOT count:
 * - PLANNING: Lightweight spec/planning work, parallel-safe
 * - BACKLOG: Not started yet
 * - COMPLETED: Already done
 * - ABANDONED: Cancelled
 */
export const WIP_COUNTED_STATUSES = [
    IncrementStatus.ACTIVE,
    IncrementStatus.PAUSED // Paused work still blocks team capacity
];
/**
 * Check if increment status counts toward WIP (Work In Progress) limits
 */
export function countsTowardWipLimit(status) {
    return WIP_COUNTED_STATUSES.includes(status);
}
/**
 * Validate if a status transition is allowed
 * @throws Error if transition is invalid
 */
export function validateTransition(from, to) {
    if (!isValidTransition(from, to)) {
        const validTransitions = VALID_TRANSITIONS[from];
        throw new Error(`Invalid transition: ${from} → ${to}.\n` +
            `Valid transitions from ${from}: ${validTransitions.join(', ')}`);
    }
}
//# sourceMappingURL=increment-metadata.js.map