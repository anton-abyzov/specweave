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

import fs from 'fs-extra';
import path from 'path';
import { IncrementStatus } from '../types/increment-metadata.js';
import { MetadataManager } from './metadata-manager.js';

/**
 * Active increment state stored in .specweave/state/active-increment.json
 */
export interface ActiveIncrementState {
  id: string | null;
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
   * Get the currently active increment ID
   * Returns null if no increment is active
   */
  getActive(): string | null {
    try {
      if (!fs.existsSync(this.stateFile)) {
        return null;
      }

      const content = fs.readFileSync(this.stateFile, 'utf-8');
      const state: ActiveIncrementState = JSON.parse(content);

      return state.id || null;
    } catch (error) {
      // File read/parse error = no active increment
      return null;
    }
  }

  /**
   * Set the active increment
   * Validates that the increment exists and is actually active
   */
  setActive(incrementId: string): void {
    // Validate increment exists
    const metadata = MetadataManager.read(incrementId);

    // Validate increment is actually active
    if (metadata.status !== IncrementStatus.ACTIVE) {
      throw new Error(
        `Cannot set ${incrementId} as active: status is ${metadata.status}, not active`
      );
    }

    // Write state file atomically
    const state: ActiveIncrementState = { id: incrementId };
    this.writeState(state);
  }

  /**
   * Clear the active increment (no increment is active)
   */
  clearActive(): void {
    const state: ActiveIncrementState = { id: null };
    this.writeState(state);
  }

  /**
   * Smart update: Set active increment to next available active increment,
   * or clear if none are active.
   *
   * This is called when:
   * - An increment is completed
   * - An increment is paused
   * - An increment is abandoned
   *
   * Logic:
   * 1. Get all active increments
   * 2. If any exist, set the first one as active
   * 3. Otherwise, clear active state
   */
  smartUpdate(): void {
    const activeIncrements = MetadataManager.getActive();

    if (activeIncrements.length > 0) {
      // Set first active increment as the active one
      // (Could be improved with "most recently active" logic)
      this.setActive(activeIncrements[0].id);
    } else {
      // No active increments
      this.clearActive();
    }
  }

  /**
   * Validate that the active increment pointer is correct
   * Fixes stale pointers automatically
   *
   * Returns true if valid/fixed, false if invalid and couldn't fix
   */
  validate(): boolean {
    const currentActive = this.getActive();

    // No active increment = valid (nothing to validate)
    if (currentActive === null) {
      return true;
    }

    try {
      // Check if increment still exists
      const metadata = MetadataManager.read(currentActive);

      // Check if increment is actually active
      if (metadata.status !== IncrementStatus.ACTIVE) {
        // Stale pointer! Fix it automatically
        console.warn(
          `⚠️  Active increment pointer is stale: ${currentActive} is ${metadata.status}`
        );
        this.smartUpdate();
        return false;
      }

      return true;
    } catch (error) {
      // Increment doesn't exist = stale pointer
      console.warn(`⚠️  Active increment pointer is invalid: ${currentActive} not found`);
      this.smartUpdate();
      return false;
    }
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
