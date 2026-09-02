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
export declare enum IncrementStatus {
    /**
     * Spec exists, work has not started (does NOT count towards WIP limits).
     *
     * 1.x wrote `planning` for the same state; that spelling is migrated to
     * `planned` on read (see {@link LEGACY_STATUS_MAP}).
     */
    PLANNED = "planned",
    /** Currently being worked on — what `task`/`verify`/`handoff` resolve to */
    ACTIVE = "active",
    /** @deprecated 1.x only. Planned but not ready to start yet. */
    BACKLOG = "backlog",
    /** Temporarily stopped (blocked by external dependency, deprioritized) */
    PAUSED = "paused",
    /**
     * @deprecated 1.x only — 2.0 closes through `specweave complete`.
     *
     * All tasks complete, awaiting user review. Still resolved as "in flight"
     * so 1.x increments mid-closure keep working.
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
     * Set only via explicit sw:done command
     * (v0.28.63+)
     */
    approvedAt?: string;
    /**
     * Why the increment was closed without a passing `reports/verify.json`
     * (`specweave complete --reason "<text>"`), or why it was abandoned in
     * favour of another increment. Present only when the 2.0 closure gate was
     * overridden or the increment was superseded.
     */
    closeReason?: string;
    /**
     * Increment id this one replaces (`specweave create-increment --supersedes NNNN`).
     * The superseded increment is moved to `abandoned` with
     * `closeReason: "superseded by <this id>"`.
     */
    supersedes?: string;
    /** Parent increment id when this increment is a split-off / follow-up child. */
    parent?: string;
}
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
export declare const LEGACY_STATUS_MAP: Record<string, IncrementStatus>;
/**
 * What `metadata.json` falls back to when its status is neither an
 * {@link IncrementStatus} nor in {@link LEGACY_STATUS_MAP}. Surfacing such an
 * increment as `planned` keeps it visible (and fixable) in `specweave status`;
 * before 2.0 the read threw and the increment vanished from every total.
 */
export declare const UNKNOWN_STATUS_FALLBACK = IncrementStatus.PLANNED;
export interface LegacyStatusMigration {
    /** The patched metadata (a copy; unchanged input when nothing matched). */
    metadata: Record<string, unknown>;
    /** True when a legacy status was rewritten. */
    changed: boolean;
    /** Human-readable note for the caller's warning channel. */
    note?: string;
}
/**
 * One-shot migration for `metadata.json` files carrying a status that is not
 * in {@link IncrementStatus}. `superseded` becomes `abandoned` and records the
 * intent in `closeReason` (+ `supersedes` when the file names a successor).
 * Idempotent: metadata already using enum statuses is returned untouched.
 */
export declare function migrateLegacyStatus(raw: Record<string, unknown>): LegacyStatusMigration;
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
 * Compute the shortest valid transition path from `from` to `to`.
 *
 * Uses BFS over the VALID_TRANSITIONS graph.
 * Returns the sequence of intermediate + final states (excluding the starting state).
 * Returns null if no valid path exists.
 *
 * Example: computeTransitionPath(PLANNING, COMPLETED)
 *   => [ACTIVE, READY_FOR_REVIEW, COMPLETED]
 */
export declare function computeTransitionPath(from: IncrementStatus, to: IncrementStatus): IncrementStatus[] | null;
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
 * Default metadata for an increment whose metadata.json is missing (lazy
 * repair of a folder created by hand).
 *
 * NOTE: this is the REPAIR default, not what `create-increment` writes —
 * `createIncrementTemplates` writes `active` so the 2.0 loop
 * (`task next` → `claim` → `done` → `verify` → `complete`) works on a freshly
 * created increment without any hand-editing of metadata.json.
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
 * Statuses that count as "active" for the advisory WIP note (limits.activeIncrements).
 *
 * ACTIVE: currently executing tasks
 * READY_FOR_REVIEW: tasks done, awaiting approval (still in progress)
 *
 * Not counted: PLANNING (lightweight, parallel-safe), BACKLOG (not started),
 * PAUSED (explicitly parked — pausing is how you get under the limit),
 * COMPLETED, ABANDONED.
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
 * How the sync target was determined
 * Used for debugging and audit trails
 */
export type SyncTargetDerivation = 'user-selection' | 'project-mapping' | 'default-profile' | 'first-profile-fallback' | 'auto-detected';
/**
 * External tool sync target for an increment
 *
 * Explicitly specifies which external tool profile this increment syncs with.
 * Stored in metadata.json to provide audit trail and deterministic sync behavior.
 *
 * @since v1.0.31 (ADR-0211)
 *
 * @example
 * ```json
 * {
 *   "syncTarget": {
 *     "profileId": "github-frontend",
 *     "provider": "github",
 *     "derivedFrom": "project-mapping",
 *     "setAt": "2025-12-18T10:30:00Z"
 *   }
 * }
 * ```
 */
export interface SyncTarget {
    /**
     * Profile ID from config.sync.profiles
     * This is the key that links to the full profile configuration
     *
     * @example "github-frontend", "jira-backend", "ado-main"
     */
    profileId: string;
    /**
     * Provider type for quick filtering without loading full config
     */
    provider: 'github' | 'jira' | 'ado';
    /**
     * How this target was determined (for debugging/audit)
     */
    derivedFrom: SyncTargetDerivation;
    /**
     * Timestamp when target was set (ISO 8601)
     */
    setAt: string;
    /**
     * Optional: Source project ID that led to this target
     * Useful when derivedFrom is 'project-mapping'
     */
    sourceProjectId?: string;
}
/**
 * Validation result for external tool configuration
 *
 * @since v1.0.31
 */
export interface ExternalToolValidationResult {
    /** Whether the configuration is valid */
    valid: boolean;
    /** Resolved sync target (if valid) */
    syncTarget?: SyncTarget;
    /** List of validation errors */
    errors: string[];
    /** List of validation warnings (non-blocking) */
    warnings: string[];
    /** Suggested fixes for errors */
    suggestions?: string[];
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
    /**
     * External tool sync target (v1.0.31+ - ADR-0211)
     *
     * Explicitly specifies which external tool profile this increment syncs with.
     * Provides deterministic sync behavior and audit trail.
     *
     * Resolution priority:
     * 1. This field (explicit)
     * 2. **Project**: field in spec.md → config.projectMappings
     * 3. config.sync.defaultProfile (fallback)
     *
     * @example
     * ```json
     * {
     *   "syncTarget": {
     *     "profileId": "github-frontend",
     *     "provider": "github",
     *     "derivedFrom": "project-mapping",
     *     "setAt": "2025-12-18T10:30:00Z"
     *   }
     * }
     * ```
     */
    syncTarget?: SyncTarget;
    /**
     * Pull request references for pr-based push strategy (v1.0.437+)
     *
     * Tracks branch names and PR URLs created during increment closure.
     * Single-repo: array with one entry. Multi-repo/umbrella: one entry per touched repo.
     *
     * @example
     * ```json
     * {
     *   "prRefs": [{
     *     "branch": "sw/0520-pr-based-closure",
     *     "prNumber": 42,
     *     "prUrl": "https://github.com/org/repo/pull/42",
     *     "state": "open",
     *     "createdAt": "2026-03-12T10:00:00Z"
     *   }]
     * }
     * ```
     */
    prRefs?: PrRef[];
    /** When true, skip living docs sync for this increment (per-increment override) */
    skipLivingDocsSync?: boolean;
}
/**
 * Pull request reference for a single repository (v1.0.437+)
 */
export interface PrRef {
    /** Branch name (e.g., 'sw/0016-checkout-flow') */
    branch: string;
    /** PR number */
    prNumber?: number;
    /** PR URL */
    prUrl?: string;
    /** Repository slug (owner/repo) for multi-repo. Omit for single-repo. */
    repoSlug?: string;
    /** PR state */
    state?: 'open' | 'merged' | 'closed';
    /** When the PR was created */
    createdAt?: string;
}
//# sourceMappingURL=increment-metadata.d.ts.map