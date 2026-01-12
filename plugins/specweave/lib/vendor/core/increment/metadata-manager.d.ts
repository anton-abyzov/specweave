/**
 * Metadata Manager
 *
 * Handles CRUD operations for increment metadata (status, type, timestamps).
 * Part of increment 0007: Smart Status Management
 */
import { IncrementMetadata, IncrementMetadataExtended, IncrementMetadataV2, IncrementStatus, IncrementType, SyncTarget } from '../types/increment-metadata.js';
import { Logger } from '../../utils/logger.js';
/**
 * Error thrown when metadata operations fail
 */
export declare class MetadataError extends Error {
    incrementId: string;
    cause?: Error;
    constructor(message: string, incrementId: string, cause?: Error);
}
/**
 * Metadata Manager
 *
 * Provides CRUD operations and queries for increment metadata
 */
export declare class MetadataManager {
    /**
     * Logger instance (injectable for testing)
     */
    private static logger;
    /**
     * Set logger instance (primarily for testing with silentLogger)
     *
     * @param logger - Logger instance to use
     */
    static setLogger(logger: Logger): void;
    /**
     * Get metadata file path for increment
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * creating/accessing .specweave in wrong location when CWD != project root.
     */
    private static getMetadataPath;
    /**
     * Get increment directory path
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * creating/accessing .specweave in wrong location when CWD != project root.
     */
    private static getIncrementPath;
    /**
     * Check if metadata file exists
     */
    static exists(incrementId: string, rootDir?: string): boolean;
    /**
     * Read metadata from file
     * Creates default metadata if file doesn't exist (lazy initialization)
     */
    static read(incrementId: string, rootDir?: string): IncrementMetadata;
    /**
     * Reserved increment IDs that cannot be used
     * These are status values, special folders, and state files
     */
    private static readonly RESERVED_INCREMENT_IDS;
    /**
     * Validate increment ID is not a reserved name
     * Throws if ID is reserved
     */
    private static validateNotReserved;
    /**
     * Validate increment before creation (check for duplicates and reserved names)
     * Throws if duplicates exist in other locations or ID is reserved
     */
    static validateBeforeCreate(incrementId: string, rootDir?: string): Promise<void>;
    /**
     * Write metadata to file
     * Uses atomic write (temp file → rename)
     *
     * @param incrementId - Increment ID
     * @param metadata - Metadata to write
     * @param rootDir - Optional root directory (defaults to process.cwd())
     */
    static write(incrementId: string, metadata: IncrementMetadata, rootDir?: string): void;
    /**
     * Delete metadata file
     */
    static delete(incrementId: string, rootDir?: string): void;
    /**
     * Update increment status
     * Validates transition and updates timestamps
     *
     * **CRITICAL**: Also updates active increment state automatically!
     *
     * NOTE: This method is now SYNCHRONOUS to ensure spec.md is updated
     * before returning. This prevents race conditions in tests and ensures
     * data consistency.
     */
    static updateStatus(incrementId: string, newStatus: IncrementStatus, reason?: string, rootDir?: string): IncrementMetadata;
    /**
     * Update spec.md status synchronously (used by updateStatus)
     *
     * This is a private helper to avoid async/await in updateStatus() which would
     * break backward compatibility with callers expecting sync behavior.
     */
    private static updateSpecMdStatusSync;
    /**
     * Update increment type
     */
    static updateType(incrementId: string, type: IncrementType): IncrementMetadata;
    /**
     * Touch increment (update lastActivity)
     */
    static touch(incrementId: string): IncrementMetadata;
    /**
     * Get all increments
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * accessing wrong .specweave folder when CWD != project root.
     */
    static getAll(projectRoot?: string): IncrementMetadata[];
    /**
     * Get increments by status
     */
    static getByStatus(status: IncrementStatus): IncrementMetadata[];
    /**
     * Get active increments (FAST: cache-first strategy)
     *
     * **PERFORMANCE UPGRADE**: Uses ActiveIncrementManager cache instead of scanning all increments
     * - Old: Scan 31 metadata files (~50ms)
     * - New: Read 1 cache file + 1-2 metadata files (~5ms) = **10x faster**
     *
     * Fallback to full scan if cache is stale or missing
     */
    static getActive(): IncrementMetadata[];
    /**
     * Get backlog increments
     */
    static getBacklog(): IncrementMetadata[];
    /**
     * Get paused increments
     */
    static getPaused(): IncrementMetadata[];
    /**
     * Get completed increments
     */
    static getCompleted(): IncrementMetadata[];
    /**
     * Get abandoned increments
     */
    static getAbandoned(): IncrementMetadata[];
    /**
     * Get increments by type
     */
    static getByType(type: IncrementType): IncrementMetadata[];
    /**
     * Get stale increments (paused >7 days or active >30 days)
     */
    static getStale(): IncrementMetadata[];
    /**
     * Get increments that should be auto-abandoned (experiments inactive >14 days)
     */
    static getShouldAutoAbandon(): IncrementMetadata[];
    /**
     * Get extended metadata with computed fields (progress, age, etc.)
     */
    static getExtended(incrementId: string): IncrementMetadataExtended;
    /**
     * Validate metadata schema
     */
    static validate(metadata: IncrementMetadata): boolean;
    /**
     * Check if status transition is allowed
     */
    static canTransition(from: IncrementStatus, to: IncrementStatus): boolean;
    /**
     * Get human-readable status transition error message
     */
    static getTransitionError(from: IncrementStatus, to: IncrementStatus): string;
    /**
     * Set the external tool sync target for an increment
     *
     * This explicitly specifies which sync profile the increment uses.
     * The sync target provides audit trail and deterministic sync behavior.
     *
     * @param incrementId - Increment ID
     * @param syncTarget - Sync target configuration
     * @param rootDir - Optional root directory
     * @returns Updated metadata
     *
     * @example
     * ```typescript
     * MetadataManager.setSyncTarget('0142-feature', {
     *   profileId: 'github-frontend',
     *   provider: 'github',
     *   derivedFrom: 'project-mapping',
     *   setAt: new Date().toISOString(),
     *   sourceProjectId: 'frontend-app'
     * });
     * ```
     */
    static setSyncTarget(incrementId: string, syncTarget: SyncTarget, rootDir?: string): IncrementMetadataV2;
    /**
     * Get the sync target for an increment
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns Sync target or undefined if not set
     */
    static getSyncTarget(incrementId: string, rootDir?: string): SyncTarget | undefined;
    /**
     * Clear the sync target for an increment
     *
     * Use this when the external tool configuration changes and
     * the increment needs to be re-resolved.
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns Updated metadata
     */
    static clearSyncTarget(incrementId: string, rootDir?: string): IncrementMetadataV2;
    /**
     * Check if increment has a sync target configured
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns true if sync target is set
     */
    static hasSyncTarget(incrementId: string, rootDir?: string): boolean;
    /**
     * Get all increments with a specific sync provider
     *
     * Useful for bulk operations on all GitHub/JIRA/ADO synced increments.
     *
     * @param provider - Provider type ('github', 'jira', 'ado')
     * @returns Array of increments with that provider configured
     */
    static getByProvider(provider: 'github' | 'jira' | 'ado'): IncrementMetadataV2[];
    /**
     * Get all increments with a specific sync profile
     *
     * @param profileId - Profile ID from config.sync.profiles
     * @returns Array of increments using that profile
     */
    static getByProfile(profileId: string): IncrementMetadataV2[];
}
//# sourceMappingURL=metadata-manager.d.ts.map