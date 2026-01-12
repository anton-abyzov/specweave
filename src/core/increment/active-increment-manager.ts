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

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import { IncrementStatus } from '../types/increment-metadata.js';
import { MetadataManager } from './metadata-manager.js';

/**
 * Active increment state stored in .specweave/state/active-increment.json
 *
 * **UPGRADED**: Now supports MULTIPLE active increments (up to 2)
 * - One regular feature increment
 * - One hotfix/bug increment (optional)
 */
export interface ActiveIncrementState {
  // NEW: Array of active increment IDs (max 2)
  ids: string[];

  // For backwards compatibility (deprecated, read-only)
  id?: string | null;

  // Metadata
  lastUpdated: string;
}

/**
 * Active Increment Manager
 *
 * Central authority for managing which increment is currently active.
 */
export class ActiveIncrementManager {
  private stateFile: string;

  constructor(private rootDir: string = process.cwd()) {
    this.stateFile = path.join(rootDir, '.specweave/state/active-increment.json');
  }

  /**
   * Get all currently active increment IDs
   * Returns empty array if no increments are active
   *
   * **NEW**: Returns array of ALL active increments (max 2)
   */
  getActive(): string[] {
    try {
      if (!fs.existsSync(this.stateFile)) {
        return [];
      }

      const content = fs.readFileSync(this.stateFile, 'utf-8');
      const state: ActiveIncrementState = JSON.parse(content);

      // Backwards compatibility: Support old format
      if (state.id && !state.ids) {
        return [state.id];
      }

      return state.ids || [];
    } catch (error) {
      // File read/parse error = no active increments
      return [];
    }
  }

  /**
   * Get the primary active increment (first in list)
   * Returns null if no increments are active
   *
   * This maintains backwards compatibility with code expecting a single ID
   */
  getPrimary(): string | null {
    const active = this.getActive();
    return active.length > 0 ? active[0] : null;
  }

  /**
   * Add an increment to the active list
   * Validates that the increment exists and is actually active
   *
   * **NEW**: Adds to list instead of replacing (max 2)
   * @param skipValidation - Skip validation (used during lazy initialization to prevent circular dependency)
   */
  addActive(incrementId: string, skipValidation: boolean = false): void {
    // Validate increment exists and is active (unless skipValidation is true)
    if (!skipValidation) {
      const metadata = MetadataManager.read(incrementId, this.rootDir);

      // Validate increment is actually active
      if (metadata.status !== IncrementStatus.ACTIVE) {
        throw new Error(
          `Cannot add ${incrementId} as active: status is ${metadata.status}, not active`
        );
      }
    }

    // Get current active list
    const currentActive = this.getActive();

    // Don't add if already in list
    if (currentActive.includes(incrementId)) {
      return;
    }

    // Add to list (max 2)
    const newActive = [...currentActive, incrementId].slice(0, 2);

    // Write state
    const state: ActiveIncrementState = {
      ids: newActive,
      lastUpdated: new Date().toISOString()
    };
    this.writeState(state);
  }

  /**
   * Remove an increment from the active list
   */
  removeActive(incrementId: string): void {
    const currentActive = this.getActive();
    const newActive = currentActive.filter(id => id !== incrementId);

    const state: ActiveIncrementState = {
      ids: newActive,
      lastUpdated: new Date().toISOString()
    };
    this.writeState(state);
  }

  /**
   * Set the active increment (legacy method for backwards compatibility)
   * Now delegates to addActive()
   * @param skipValidation - Skip validation (used during lazy initialization to prevent circular dependency)
   */
  setActive(incrementId: string, skipValidation: boolean = false): void {
    this.addActive(incrementId, skipValidation);
  }

  /**
   * Clear all active increments
   */
  clearActive(): void {
    const state: ActiveIncrementState = {
      ids: [],
      lastUpdated: new Date().toISOString()
    };
    this.writeState(state);
  }

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
  smartUpdate(): void {
    // Use getByStatus directly to avoid caching circular dependency
    // MetadataManager.getActive() uses this cache, so we can't call it here
    const activeIncrements = MetadataManager.getByStatus(IncrementStatus.ACTIVE);

    if (activeIncrements.length > 0) {
      // Sort by lastActivity (most recent first)
      const sorted = activeIncrements.sort((a, b) => {
        const aTime = new Date(a.lastActivity).getTime();
        const bTime = new Date(b.lastActivity).getTime();
        return bTime - aTime; // Descending
      });

      // Take max 2
      const activeIds = sorted.slice(0, 2).map(m => m.id);

      const state: ActiveIncrementState = {
        ids: activeIds,
        lastUpdated: new Date().toISOString()
      };
      this.writeState(state);
    } else {
      // No active increments
      this.clearActive();
    }
  }

  /**
   * Validate that all active increment pointers are correct
   * Does NOT fix stale pointers - caller should call smartUpdate() if needed
   *
   * Returns true if all valid, false if any invalid
   */
  validate(): boolean {
    const currentActive = this.getActive();

    // No active increments = valid (nothing to validate)
    if (currentActive.length === 0) {
      return true;
    }

    let hasStale = false;

    for (const incrementId of currentActive) {
      try {
        // Check if increment still exists
        const metadata = MetadataManager.read(incrementId);

        // Check if increment is actually active
        if (metadata.status !== IncrementStatus.ACTIVE) {
          // Stale pointer! Mark for fix
          console.warn(
            `⚠️  Active increment pointer is stale: ${incrementId} is ${metadata.status}`
          );
          hasStale = true;
        }
      } catch (error) {
        // Increment doesn't exist = stale pointer
        console.warn(`⚠️  Active increment pointer is invalid: ${incrementId} not found`);
        hasStale = true;
      }
    }

    // Return false if stale found, but DON'T auto-fix (prevents circular dependency)
    // Caller should call smartUpdate() if needed
    return !hasStale;
  }

  /**
   * Validate and auto-repair the active increment state
   *
   * This is the recommended method to call on startup to ensure
   * the active-increment.json is in sync with metadata.json files.
   *
   * Part of 0168: Status Single Source of Truth
   *
   * @returns Object with validation result and any repairs made
   */
  validateAndRepair(): { valid: boolean; repaired: boolean; details: string[] } {
    const details: string[] = [];
    const currentActive = this.getActive();

    // Track what needs repair
    const staleIds: string[] = [];
    const missingIds: string[] = [];

    // Check each currently "active" increment
    for (const incrementId of currentActive) {
      try {
        const metadata = MetadataManager.read(incrementId, this.rootDir);
        if (metadata.status !== IncrementStatus.ACTIVE) {
          staleIds.push(incrementId);
          details.push(`Stale: ${incrementId} is ${metadata.status}, not active`);
        }
      } catch {
        missingIds.push(incrementId);
        details.push(`Missing: ${incrementId} not found`);
      }
    }

    // Check for active increments NOT in our list (missed additions)
    // Note: We use getByStatus directly to scan all metadata files
    // This avoids potential caching issues with getActive()
    const actuallyActive = MetadataManager.getByStatus(IncrementStatus.ACTIVE);
    const actuallyActiveIds = actuallyActive.map(m => m.id);
    const missingFromList = actuallyActiveIds.filter(id => !currentActive.includes(id));

    for (const id of missingFromList) {
      details.push(`Missing from list: ${id} is active but not tracked`);
    }

    // If anything is wrong, repair by calling smartUpdate
    const needsRepair = staleIds.length > 0 || missingIds.length > 0 || missingFromList.length > 0;

    if (needsRepair) {
      this.smartUpdate();
      details.push('Auto-repaired: Rebuilt active increment list from metadata');
    }

    return {
      valid: !needsRepair,
      repaired: needsRepair,
      details
    };
  }

  /**
   * Write state file atomically (temp file → rename)
   */
  private writeState(state: ActiveIncrementState): void {
    // Ensure state directory exists
    const stateDir = path.dirname(this.stateFile);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Atomic write: temp file → rename
    const tempFile = `${this.stateFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, this.stateFile);
  }

  /**
   * Get state file path (for testing)
   */
  getStateFilePath(): string {
    return this.stateFile;
  }

  /**
   * Check if state file exists (for testing)
   */
  exists(): boolean {
    return fs.existsSync(this.stateFile);
  }
}
