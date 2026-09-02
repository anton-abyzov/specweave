/**
 * Increment Metadata Types
 *
 * Defines the schema for increment metadata tracking (status, type, timestamps).
 * Part of increment 0007: Smart Status Management
 */
/**
 * Increment status enum — the 2.0 closed vocabulary.
 *
 * SpecWeave 2.0 recognises exactly five statuses on disk:
 *   planned | active | paused | completed | abandoned
 * and they are set ONLY by CLI transitions (`create-increment`, `start`,
 * `pause`, `resume`, `abandon`, `complete`) — never by hand.
 *
 * `backlog` and `ready_for_review` are 1.x states kept for backwards
 * compatibility with increments already on disk (and with the 1.x
 * ready-for-review closure gate). They are not part of the 2.0 vocabulary
 * and `create-increment` never writes them.
 */
export var IncrementStatus;
(function (IncrementStatus) {
    /**
     * Spec exists, work has not started (does NOT count towards WIP limits).
     *
     * 1.x wrote `planning` for the same state; that spelling is migrated to
     * `planned` on read (see {@link LEGACY_STATUS_MAP}).
     */
    IncrementStatus["PLANNED"] = "planned";
    /** Currently being worked on — what `task`/`verify`/`handoff` resolve to */
    IncrementStatus["ACTIVE"] = "active";
    /** @deprecated 1.x only. Planned but not ready to start yet. */
    IncrementStatus["BACKLOG"] = "backlog";
    /** Temporarily stopped (blocked by external dependency, deprioritized) */
    IncrementStatus["PAUSED"] = "paused";
    /**
     * @deprecated 1.x only — 2.0 closes through `specweave complete`.
     *
     * All tasks complete, awaiting user review. Still resolved as "in flight"
     * so 1.x increments mid-closure keep working.
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
 * Statuses seen in the wild that are not part of the 2.0 vocabulary, mapped to
 * the status 2.0 uses instead.
 *
 * - `planning` is the 1.x spelling of `planned` (what `create-increment` wrote
 *   up to 1.x, and what 217+ increments on disk carry).
 * - `superseded` was written by hand (and by older skills) whenever an
 *   increment was replaced by a newer one.
 *
 * Anything here is rewritten on read by {@link migrateLegacyStatus}, so legacy
 * increments keep resolving instead of silently disappearing from
 * `specweave status` totals.
 */
export const LEGACY_STATUS_MAP = {
    planning: IncrementStatus.PLANNED,
    new: IncrementStatus.PLANNED,
    todo: IncrementStatus.PLANNED,
    superseded: IncrementStatus.ABANDONED,
    cancelled: IncrementStatus.ABANDONED,
    canceled: IncrementStatus.ABANDONED,
    done: IncrementStatus.COMPLETED,
    closed: IncrementStatus.COMPLETED,
    complete: IncrementStatus.COMPLETED,
    finished: IncrementStatus.COMPLETED,
    in_progress: IncrementStatus.ACTIVE,
    'in-progress': IncrementStatus.ACTIVE,
    'in progress': IncrementStatus.ACTIVE,
    started: IncrementStatus.ACTIVE,
    'ready-for-review': IncrementStatus.READY_FOR_REVIEW,
    'ready_for_review ': IncrementStatus.READY_FOR_REVIEW,
    'in-review': IncrementStatus.READY_FOR_REVIEW,
    'in_review': IncrementStatus.READY_FOR_REVIEW,
    review: IncrementStatus.READY_FOR_REVIEW,
    on_hold: IncrementStatus.PAUSED,
    'on-hold': IncrementStatus.PAUSED,
    blocked: IncrementStatus.PAUSED,
};
/**
 * What `metadata.json` falls back to when its status is neither an
 * {@link IncrementStatus} nor in {@link LEGACY_STATUS_MAP}. Surfacing such an
 * increment as `planned` keeps it visible (and fixable) in `specweave status`;
 * before 2.0 the read threw and the increment vanished from every total.
 */
export const UNKNOWN_STATUS_FALLBACK = IncrementStatus.PLANNED;
/**
 * One-shot migration for `metadata.json` files carrying a status that is not
 * in {@link IncrementStatus}. `superseded` becomes `abandoned` and records the
 * intent in `closeReason` (+ `supersedes` when the file names a successor).
 * Idempotent: metadata already using enum statuses is returned untouched.
 */
export function migrateLegacyStatus(raw) {
    const status = typeof raw.status === 'string' ? raw.status : undefined;
    if (!status || Object.values(IncrementStatus).includes(status)) {
        return { metadata: raw, changed: false };
    }
    const mapped = LEGACY_STATUS_MAP[status.trim().toLowerCase()];
    // A status we cannot interpret is NOT silently rewritten here — callers that
    // must keep the increment visible (metadata.json) coerce it themselves with
    // UNKNOWN_STATUS_FALLBACK; callers validating authored content (spec.md
    // frontmatter) still reject it.
    if (!mapped)
        return { metadata: raw, changed: false };
    const mappedStatus = mapped;
    const metadata = { ...raw, status: mappedStatus };
    if (mappedStatus === IncrementStatus.ABANDONED) {
        // `supersedes` points forward (new → old), so a superseded increment records
        // its successor in closeReason, never in its own `supersedes` field.
        const successor = typeof raw.supersededBy === 'string' ? raw.supersededBy : undefined;
        if (!metadata.closeReason) {
            metadata.closeReason = successor ? `superseded by ${successor}` : `migrated from legacy status "${status}"`;
        }
        if (!metadata.abandonedAt)
            metadata.abandonedAt = raw.lastActivity || new Date().toISOString();
    }
    return { metadata, changed: true, note: `Legacy status '${status}' migrated to '${mappedStatus}'` };
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
export const VALID_TRANSITIONS = {
    [IncrementStatus.PLANNED]: [
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
        IncrementStatus.PLANNED, // Resume planning
        IncrementStatus.ACTIVE,
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.PAUSED]: [
        IncrementStatus.ACTIVE,
        IncrementStatus.READY_FOR_REVIEW, // Can mark done while paused
        IncrementStatus.ABANDONED
    ],
    [IncrementStatus.READY_FOR_REVIEW]: [
        IncrementStatus.COMPLETED, // ONLY via explicit sw:done with user approval
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
 * Compute the shortest valid transition path from `from` to `to`.
 *
 * Uses BFS over the VALID_TRANSITIONS graph.
 * Returns the sequence of intermediate + final states (excluding the starting state).
 * Returns null if no valid path exists.
 *
 * Example: computeTransitionPath(PLANNING, COMPLETED)
 *   => [ACTIVE, READY_FOR_REVIEW, COMPLETED]
 */
export function computeTransitionPath(from, to) {
    if (from === to)
        return [];
    const queue = [
        { status: from, path: [] }
    ];
    const visited = new Set([from]);
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = VALID_TRANSITIONS[current.status] ?? [];
        for (const next of neighbors) {
            if (visited.has(next))
                continue;
            const newPath = [...current.path, next];
            if (next === to)
                return newPath;
            visited.add(next);
            queue.push({ status: next, path: newPath });
        }
    }
    return null;
}
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
 * Default metadata for an increment whose metadata.json is missing (lazy
 * repair of a folder created by hand).
 *
 * NOTE: this is the REPAIR default, not what `create-increment` writes —
 * `createIncrementTemplates` writes `active` so the 2.0 loop
 * (`task next` → `claim` → `done` → `verify` → `complete`) works on a freshly
 * created increment without any hand-editing of metadata.json.
 */
export function createDefaultMetadata(id, type = IncrementType.FEATURE) {
    const now = new Date().toISOString();
    return {
        id,
        status: IncrementStatus.PLANNED, // Repair default: spec exists, work not claimed
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
 * Statuses that count as "active" for the advisory WIP note (limits.activeIncrements).
 *
 * ACTIVE: currently executing tasks
 * READY_FOR_REVIEW: tasks done, awaiting approval (still in progress)
 *
 * Not counted: PLANNING (lightweight, parallel-safe), BACKLOG (not started),
 * PAUSED (explicitly parked — pausing is how you get under the limit),
 * COMPLETED, ABANDONED.
 */
export const WIP_COUNTED_STATUSES = [
    IncrementStatus.ACTIVE,
    IncrementStatus.READY_FOR_REVIEW
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