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
    IncrementStatus["READY_FOR_REVIEW"] = "ready_for_review";
    /** All tasks complete AND user approved - increment finished */
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
 *
 * CRITICAL (v0.28.63+): ACTIVE cannot directly transition to COMPLETED!
 * Must go through READY_FOR_REVIEW first, which requires explicit user approval.
 * This prevents the auto-completion bug where increments are marked "completed"
 * without ACs being checked or user confirmation.
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
        IncrementStatus.READY_FOR_REVIEW, // All tasks done → awaiting review
        IncrementStatus.ABANDONED
        // NOTE: COMPLETED intentionally NOT allowed! Must go through READY_FOR_REVIEW
    ],
    [IncrementStatus.BACKLOG]: [
        IncrementStatus.PLANNING, // Resume planning
        IncrementStatus.ACTIVE,
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.PAUSED]: [
        IncrementStatus.ACTIVE,
        IncrementStatus.READY_FOR_REVIEW, // Can mark done while paused
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.READY_FOR_REVIEW]: [
        IncrementStatus.COMPLETED, // ONLY via explicit /sw:done with user approval
        IncrementStatus.ACTIVE, // Reopen if more work needed
        IncrementStatus.ABANDONED // Cancel if requirements changed
    ],
    [IncrementStatus.COMPLETED]: [
        // Allow reopening completed increments when issues discovered
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
 * Calculate days elapsed since a given date
 */
function daysSince(dateStr) {
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}
/**
 * Check if increment is stale (paused too long or active too long)
 */
export function isStale(metadata) {
    if (metadata.status === IncrementStatus.PAUSED && metadata.pausedAt) {
        return daysSince(metadata.pausedAt) > STALENESS_THRESHOLDS.PAUSED;
    }
    if (metadata.status === IncrementStatus.ACTIVE) {
        return daysSince(metadata.created) > STALENESS_THRESHOLDS.ACTIVE;
    }
    return false;
}
/**
 * Check if increment should be auto-abandoned (experiments only)
 */
export function shouldAutoAbandon(metadata) {
    return metadata.type === IncrementType.EXPERIMENT &&
        daysSince(metadata.lastActivity) > STALENESS_THRESHOLDS.EXPERIMENT;
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
export const WIP_COUNTED_STATUSES = [
    IncrementStatus.ACTIVE,
    IncrementStatus.PAUSED, // Paused work still blocks team capacity
    IncrementStatus.READY_FOR_REVIEW // Awaiting user approval, still in progress
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