/**
 * Active Increment Manager
 *
 * Manages the `.specweave/state/active-increment.json` file which tracks
 * the currently active increment for status line display.
 *
 * **Critical**: This file MUST be updated whenever increment status changes:
 * - When new increment is created → Set as active
 * - When increment is completed → Clear or set to next active
 * - When increment is paused → Set to next active (or clear if none)
 * - When increment is resumed → Set as active
 *
 * Part of increment 0021: Fix Active Increment Tracking
 */
/**
 * Active increment state stored in .specweave/state/active-increment.json
 *
 * **UPGRADED**: Now supports MULTIPLE active increments (up to 2)
 * - One regular feature increment
 * - One hotfix/bug increment (optional)
 */
export interface ActiveIncrementState {
    ids: string[];
    id?: string | null;
    lastUpdated: string;
}
/**
 * Active Increment Manager
 *
 * Central authority for managing which increment is currently active.
 */
export declare class ActiveIncrementManager {
    private rootDir;
    private stateFile;
    constructor(rootDir?: string);
    /**
     * Get all currently active increment IDs
     * Returns empty array if no increments are active
     *
     * **NEW**: Returns array of ALL active increments (max 2)
     */
    getActive(): string[];
    /**
     * Get the primary active increment (first in list)
     * Returns null if no increments are active
     *
     * This maintains backwards compatibility with code expecting a single ID
     */
    getPrimary(): string | null;
    /**
     * Add an increment to the active list
     * Validates that the increment exists and is actually active
     *
     * **NEW**: Adds to list instead of replacing (max 2)
     * @param skipValidation - Skip validation (used during lazy initialization to prevent circular dependency)
     */
    addActive(incrementId: string, skipValidation?: boolean): void;
    /**
     * Remove an increment from the active list
     */
    removeActive(incrementId: string): void;
    /**
     * Set the active increment (legacy method for backwards compatibility)
     * Now delegates to addActive()
     * @param skipValidation - Skip validation (used during lazy initialization to prevent circular dependency)
     */
    setActive(incrementId: string, skipValidation?: boolean): void;
    /**
     * Clear all active increments
     */
    clearActive(): void;
    /**
     * Smart update: Rebuild active list from metadata
     *
     * This is called when:
     * - An increment is completed
     * - An increment is paused
     * - An increment is abandoned
     *
     * Logic:
     * 1. Scan all increments for status=active
     * 2. Update cache to match reality
     * 3. Max 2 increments (sorted by lastActivity)
     */
    smartUpdate(): void;
    /**
     * Validate that all active increment pointers are correct
     * Does NOT fix stale pointers - caller should call smartUpdate() if needed
     *
     * Returns true if all valid, false if any invalid
     */
    validate(): boolean;
    /**
     * Write state file atomically (temp file → rename)
     */
    private writeState;
    /**
     * Get state file path (for testing)
     */
    getStateFilePath(): string;
    /**
     * Check if state file exists (for testing)
     */
    exists(): boolean;
}
//# sourceMappingURL=active-increment-manager.d.ts.map