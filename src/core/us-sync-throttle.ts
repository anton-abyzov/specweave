/**
 * US Sync Throttle Manager
 *
 * Prevents excessive US sync operations by implementing a 60-second throttle window.
 * Tracks last sync time per increment to avoid spamming external tools (GitHub/JIRA/ADO).
 *
 * Architecture (v0.26.1):
 * - Safe now that fs.writeFile() confirmed to NOT trigger Claude Code hooks
 * - Allows restoration of automatic US sync while preventing spam
 * - Part of long-term fix to restore seamless UX (ADR-0129)
 *
 * Usage:
 * ```typescript
 * const throttle = USSyncThrottle.getInstance();
 *
 * if (throttle.shouldSkipSync(incrementId)) {
 *   logger.log('⏭️  US sync throttled (last sync < 60s ago)');
 *   return;
 * }
 *
 * // Perform sync...
 * throttle.recordSync(incrementId);
 * ```
 *
 * See:
 * - Test results: FS-WRITEFILE-HOOK-TEST-RESULTS-2025-11-24.md
 * - ADR-0129: US Sync Guard Rails (long-term fix strategy)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

export interface ThrottleState {
  incrementId: string;
  lastSyncTime: number;
  syncCount: number;
}

export interface ThrottleConfig {
  /** Minimum time between syncs in milliseconds (default: 60000ms = 60s) */
  throttleWindowMs?: number;
  /** Project root directory */
  projectRoot: string;
}

/**
 * Singleton throttle manager for US sync operations
 */
export class USSyncThrottle {
  private static instance: USSyncThrottle;
  private throttleWindowMs: number;
  private projectRoot: string;
  private stateFile: string;

  private constructor(config: ThrottleConfig) {
    this.projectRoot = config.projectRoot;
    this.throttleWindowMs = config.throttleWindowMs ?? 60000; // 60 seconds default
    this.stateFile = path.join(
      this.projectRoot,
      '.specweave/state/us-sync-throttle.json'
    );
  }

  /**
   * Get singleton instance
   *
   * @param config - Configuration (required for first call)
   * @returns Throttle manager instance
   */
  public static getInstance(config?: ThrottleConfig): USSyncThrottle {
    if (!USSyncThrottle.instance) {
      if (!config) {
        throw new Error('USSyncThrottle: config required for first getInstance() call');
      }
      USSyncThrottle.instance = new USSyncThrottle(config);
    }
    return USSyncThrottle.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    USSyncThrottle.instance = null as any;
  }

  /**
   * Check if sync should be skipped due to throttling
   *
   * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
   * @returns true if sync should be skipped (throttled), false if sync allowed
   */
  public shouldSkipSync(incrementId: string): boolean {
    const state = this.loadState();
    const entry = state.find(s => s.incrementId === incrementId);

    if (!entry) {
      // No previous sync - allow
      return false;
    }

    const timeSinceLastSync = Date.now() - entry.lastSyncTime;
    return timeSinceLastSync < this.throttleWindowMs;
  }

  /**
   * Record a sync operation
   *
   * @param incrementId - Increment ID
   */
  public recordSync(incrementId: string): void {
    const state = this.loadState();
    const existingIndex = state.findIndex(s => s.incrementId === incrementId);

    if (existingIndex >= 0) {
      // Update existing entry
      state[existingIndex].lastSyncTime = Date.now();
      state[existingIndex].syncCount++;
    } else {
      // Create new entry
      state.push({
        incrementId,
        lastSyncTime: Date.now(),
        syncCount: 1
      });
    }

    this.saveState(state);
  }

  /**
   * Get last sync time for an increment
   *
   * @param incrementId - Increment ID
   * @returns Last sync timestamp (ms since epoch) or null if never synced
   */
  public getLastSyncTime(incrementId: string): number | null {
    const state = this.loadState();
    const entry = state.find(s => s.incrementId === incrementId);
    return entry ? entry.lastSyncTime : null;
  }

  /**
   * Get time since last sync
   *
   * @param incrementId - Increment ID
   * @returns Milliseconds since last sync, or Infinity if never synced
   */
  public getTimeSinceLastSync(incrementId: string): number {
    const lastSync = this.getLastSyncTime(incrementId);
    return lastSync ? Date.now() - lastSync : Infinity;
  }

  /**
   * Get sync count for an increment
   *
   * @param incrementId - Increment ID
   * @returns Number of times synced
   */
  public getSyncCount(incrementId: string): number {
    const state = this.loadState();
    const entry = state.find(s => s.incrementId === incrementId);
    return entry ? entry.syncCount : 0;
  }

  /**
   * Clear throttle state for an increment
   *
   * @param incrementId - Increment ID
   */
  public clearThrottle(incrementId: string): void {
    const state = this.loadState();
    const filtered = state.filter(s => s.incrementId !== incrementId);
    this.saveState(filtered);
  }

  /**
   * Clear all throttle state
   */
  public clearAllThrottles(): void {
    this.saveState([]);
  }

  /**
   * Load throttle state from disk
   */
  private loadState(): ThrottleState[] {
    if (!existsSync(this.stateFile)) {
      return [];
    }

    try {
      const content = readFileSync(this.stateFile, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate structure
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Filter out stale entries (> 24 hours old)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const filtered = parsed.filter((entry: any) => {
        if (!entry.incrementId || !entry.lastSyncTime) {
          return false;
        }
        return (now - entry.lastSyncTime) < maxAge;
      });

      return filtered as ThrottleState[];
    } catch (error) {
      // Corrupted state file - return empty
      return [];
    }
  }

  /**
   * Save throttle state to disk
   */
  private saveState(state: ThrottleState[]): void {
    try {
      const dir = path.dirname(this.stateFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      // Non-critical - log error but don't throw
      console.warn('Failed to save US sync throttle state:', error);
    }
  }
}
