/**
 * Sync Throttle
 *
 * Shared throttle utility that prevents multiple sync trigger paths
 * (status-change-sync-trigger, sync-progress, auto-create-external-issue)
 * from firing redundantly for the same increment within a configurable window.
 *
 * Backed by file state at `.specweave/state/sync-throttle.json`.
 *
 * Usage:
 * ```typescript
 * const throttle = new SyncThrottle(projectRoot);
 *
 * if (throttle.shouldSkip(incrementId)) {
 *   return; // another trigger already fired recently
 * }
 *
 * // ... perform sync ...
 * throttle.record(incrementId);
 * ```
 *
 * @see AC-US3-02, AC-US3-03, AC-US3-04
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

/** Internal state shape: { [key]: lastTimestamp } */
interface ThrottleState {
  [key: string]: number;
}

export class SyncThrottle {
  private readonly stateFile: string;
  private readonly windowMs: number;

  /**
   * @param projectRoot - Project root directory
   * @param windowMs - Throttle window in milliseconds (default 5000ms)
   */
  constructor(projectRoot: string, windowMs: number = 5000) {
    this.stateFile = path.join(projectRoot, '.specweave/state/sync-throttle.json');
    this.windowMs = windowMs;
  }

  /**
   * Check whether a sync for the given key should be skipped.
   *
   * @param key - Deduplication key (typically increment ID)
   * @param forceBypass - When true, always returns false (never skip)
   * @returns true if the caller should skip the sync (throttled)
   */
  shouldSkip(key: string, forceBypass?: boolean): boolean {
    if (forceBypass) {
      return false;
    }

    const state = this.loadState();
    const lastTimestamp = state[key];

    if (lastTimestamp == null) {
      return false;
    }

    const elapsed = Date.now() - lastTimestamp;
    return elapsed < this.windowMs;
  }

  /**
   * Record that a sync was just performed for the given key.
   *
   * @param key - Deduplication key (typically increment ID)
   */
  record(key: string): void {
    const state = this.loadState();
    state[key] = Date.now();
    this.saveState(state);
  }

  // ── private ──────────────────────────────────────────────

  private loadState(): ThrottleState {
    if (!existsSync(this.stateFile)) {
      return {};
    }

    try {
      const content = readFileSync(this.stateFile, 'utf-8');
      const parsed = JSON.parse(content);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }

      return parsed as ThrottleState;
    } catch {
      return {};
    }
  }

  private saveState(state: ThrottleState): void {
    try {
      const dir = path.dirname(this.stateFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch {
      // Non-critical -- log would be nice but not required
    }
  }
}
