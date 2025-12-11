/**
 * Unit tests for USSyncThrottle
 *
 * Tests the smart throttle mechanism that prevents spam by limiting
 * US sync operations to once per 60 seconds per increment.
 *
 * Coverage:
 * - Throttle window enforcement
 * - State persistence
 * - Multi-increment support
 * - Stale entry cleanup
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { USSyncThrottle, ThrottleState } from '../../../src/core/us-sync-throttle.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

describe('USSyncThrottle', () => {
  let testDir: string;
  let throttle: USSyncThrottle;

  beforeEach(() => {
    // Create isolated test directory
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `specweave-test-throttle-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Reset singleton instance
    USSyncThrottle.resetInstance();

    // Initialize throttle with test directory
    throttle = USSyncThrottle.getInstance({
      projectRoot: testDir,
      throttleWindowMs: 60000 // 60 seconds
    });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Reset singleton
    USSyncThrottle.resetInstance();
  });

  describe('shouldSkipSync()', () => {
    it('returns false for first sync (no previous sync recorded)', () => {
      const result = throttle.shouldSkipSync('0053-safe-feature-deletion');
      expect(result).toBe(false);
    });

    it('returns true within throttle window (< 60s)', () => {
      // Record sync
      throttle.recordSync('0053-safe-feature-deletion');

      // Check immediately (within window)
      const result = throttle.shouldSkipSync('0053-safe-feature-deletion');
      expect(result).toBe(true);
    });

    it('returns false after throttle window (>= 60s)', () => {
      // Record sync with mock timestamp (61 seconds ago)
      const realNow = Date.now();
      throttle.recordSync('0053-safe-feature-deletion');

      // Mock Date.now() to return time 61 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 61000);

      const result = throttle.shouldSkipSync('0053-safe-feature-deletion');
      expect(result).toBe(false);

      // Restore Date.now
      vi.restoreAllMocks();
    });

    it('handles multiple increments independently', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      throttle.recordSync('0054-another-feature');

      // First increment should be throttled
      expect(throttle.shouldSkipSync('0053-safe-feature-deletion')).toBe(true);

      // Second increment should also be throttled
      expect(throttle.shouldSkipSync('0054-another-feature')).toBe(true);

      // New increment should not be throttled
      expect(throttle.shouldSkipSync('0055-new-feature')).toBe(false);
    });
  });

  describe('recordSync()', () => {
    it('creates new entry for first sync', () => {
      throttle.recordSync('0053-safe-feature-deletion');

      const lastSync = throttle.getLastSyncTime('0053-safe-feature-deletion');
      expect(lastSync).toBeGreaterThan(0);
      expect(lastSync).toBeLessThanOrEqual(Date.now());

      const syncCount = throttle.getSyncCount('0053-safe-feature-deletion');
      expect(syncCount).toBe(1);
    });

    it('updates existing entry on subsequent sync', () => {
      const realNow = Date.now();
      throttle.recordSync('0053-safe-feature-deletion');
      const firstSyncTime = throttle.getLastSyncTime('0053-safe-feature-deletion');

      // Wait 100ms
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 100);

      throttle.recordSync('0053-safe-feature-deletion');
      const secondSyncTime = throttle.getLastSyncTime('0053-safe-feature-deletion');

      expect(secondSyncTime).toBeGreaterThan(firstSyncTime!);

      const syncCount = throttle.getSyncCount('0053-safe-feature-deletion');
      expect(syncCount).toBe(2);

      vi.restoreAllMocks();
    });

    it('increments sync count correctly', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(1);

      throttle.recordSync('0053-safe-feature-deletion');
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(2);

      throttle.recordSync('0053-safe-feature-deletion');
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(3);
    });
  });

  describe('getLastSyncTime()', () => {
    it('returns timestamp for synced increment', () => {
      const beforeSync = Date.now();
      throttle.recordSync('0053-safe-feature-deletion');
      const afterSync = Date.now();

      const lastSync = throttle.getLastSyncTime('0053-safe-feature-deletion');

      expect(lastSync).toBeGreaterThanOrEqual(beforeSync);
      expect(lastSync).toBeLessThanOrEqual(afterSync);
    });

    it('returns null for never-synced increment', () => {
      const lastSync = throttle.getLastSyncTime('0099-never-synced');
      expect(lastSync).toBeNull();
    });
  });

  describe('getTimeSinceLastSync()', () => {
    it('returns time difference for synced increment', () => {
      const realNow = Date.now();
      throttle.recordSync('0053-safe-feature-deletion');

      // Mock Date.now() to return time 5 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 5000);

      const timeSince = throttle.getTimeSinceLastSync('0053-safe-feature-deletion');
      expect(timeSince).toBeGreaterThanOrEqual(5000);
      expect(timeSince).toBeLessThan(6000); // Allow for small timing variance

      vi.restoreAllMocks();
    });

    it('returns Infinity for never-synced increment', () => {
      const timeSince = throttle.getTimeSinceLastSync('0099-never-synced');
      expect(timeSince).toBe(Infinity);
    });
  });

  describe('getSyncCount()', () => {
    it('returns 0 for never-synced increment', () => {
      const count = throttle.getSyncCount('0099-never-synced');
      expect(count).toBe(0);
    });

    it('returns correct count for synced increment', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      throttle.recordSync('0053-safe-feature-deletion');
      throttle.recordSync('0053-safe-feature-deletion');

      const count = throttle.getSyncCount('0053-safe-feature-deletion');
      expect(count).toBe(3);
    });
  });

  describe('clearThrottle()', () => {
    it('removes increment entry', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(1);

      throttle.clearThrottle('0053-safe-feature-deletion');
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(0);
      expect(throttle.getLastSyncTime('0053-safe-feature-deletion')).toBeNull();
    });

    it('does not affect other increments', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      throttle.recordSync('0054-another-feature');

      throttle.clearThrottle('0053-safe-feature-deletion');

      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(0);
      expect(throttle.getSyncCount('0054-another-feature')).toBe(1);
    });
  });

  describe('clearAllThrottles()', () => {
    it('removes all increment entries', () => {
      throttle.recordSync('0053-safe-feature-deletion');
      throttle.recordSync('0054-another-feature');
      throttle.recordSync('0055-new-feature');

      throttle.clearAllThrottles();

      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(0);
      expect(throttle.getSyncCount('0054-another-feature')).toBe(0);
      expect(throttle.getSyncCount('0055-new-feature')).toBe(0);
    });
  });

  describe('State Persistence', () => {
    it('persists state to disk', () => {
      throttle.recordSync('0053-safe-feature-deletion');

      const stateFile = path.join(testDir, '.specweave/state/us-sync-throttle.json');
      expect(existsSync(stateFile)).toBe(true);

      const content = JSON.parse(readFileSync(stateFile, 'utf-8'));
      expect(content).toHaveLength(1);
      expect(content[0].incrementId).toBe('0053-safe-feature-deletion');
      expect(content[0].syncCount).toBe(1);
    });

    it('loads state from disk', () => {
      throttle.recordSync('0053-safe-feature-deletion');

      // Reset singleton and create new instance
      USSyncThrottle.resetInstance();
      const newThrottle = USSyncThrottle.getInstance({ projectRoot: testDir });

      // Should load state from disk
      expect(newThrottle.getSyncCount('0053-safe-feature-deletion')).toBe(1);
      expect(newThrottle.shouldSkipSync('0053-safe-feature-deletion')).toBe(true);
    });

    it('handles missing state file gracefully', () => {
      // No state file exists yet
      expect(throttle.shouldSkipSync('0053-safe-feature-deletion')).toBe(false);
      expect(throttle.getSyncCount('0053-safe-feature-deletion')).toBe(0);
    });

    it('handles corrupted state file gracefully', () => {
      // Create corrupted state file
      const stateFile = path.join(testDir, '.specweave/state/us-sync-throttle.json');
      mkdirSync(path.dirname(stateFile), { recursive: true });
      writeFileSync(stateFile, 'INVALID JSON{{{', 'utf-8');

      // Reset singleton and create new instance
      USSyncThrottle.resetInstance();
      const newThrottle = USSyncThrottle.getInstance({ projectRoot: testDir });

      // Should handle gracefully and return defaults
      expect(newThrottle.shouldSkipSync('0053-safe-feature-deletion')).toBe(false);
      expect(newThrottle.getSyncCount('0053-safe-feature-deletion')).toBe(0);
    });
  });

  describe('Stale Entry Cleanup', () => {
    it('removes entries older than 24 hours', () => {
      // Create state with stale entry (25 hours old)
      const staleTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      const stateFile = path.join(testDir, '.specweave/state/us-sync-throttle.json');
      mkdirSync(path.dirname(stateFile), { recursive: true });

      const staleState: ThrottleState[] = [
        {
          incrementId: '0050-old-feature',
          lastSyncTime: staleTimestamp,
          syncCount: 5
        },
        {
          incrementId: '0053-safe-feature-deletion',
          lastSyncTime: Date.now(),
          syncCount: 1
        }
      ];

      writeFileSync(stateFile, JSON.stringify(staleState, null, 2), 'utf-8');

      // Reset singleton and create new instance (should trigger cleanup)
      USSyncThrottle.resetInstance();
      const newThrottle = USSyncThrottle.getInstance({ projectRoot: testDir });

      // Stale entry should be removed
      expect(newThrottle.getSyncCount('0050-old-feature')).toBe(0);

      // Recent entry should be preserved
      expect(newThrottle.getSyncCount('0053-safe-feature-deletion')).toBe(1);
    });

    it('preserves entries younger than 24 hours', () => {
      // Create state with recent entries
      const stateFile = path.join(testDir, '.specweave/state/us-sync-throttle.json');
      mkdirSync(path.dirname(stateFile), { recursive: true });

      const recentState: ThrottleState[] = [
        {
          incrementId: '0053-safe-feature-deletion',
          lastSyncTime: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
          syncCount: 2
        },
        {
          incrementId: '0054-another-feature',
          lastSyncTime: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
          syncCount: 5
        }
      ];

      writeFileSync(stateFile, JSON.stringify(recentState, null, 2), 'utf-8');

      // Reset singleton and create new instance
      USSyncThrottle.resetInstance();
      const newThrottle = USSyncThrottle.getInstance({ projectRoot: testDir });

      // All entries should be preserved
      expect(newThrottle.getSyncCount('0053-safe-feature-deletion')).toBe(2);
      expect(newThrottle.getSyncCount('0054-another-feature')).toBe(5);
    });
  });

  describe('Singleton Pattern', () => {
    it('returns same instance on multiple getInstance() calls', () => {
      const instance1 = USSyncThrottle.getInstance({ projectRoot: testDir });
      const instance2 = USSyncThrottle.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('throws error if getInstance() called without config on first call', () => {
      USSyncThrottle.resetInstance();

      expect(() => {
        USSyncThrottle.getInstance();
      }).toThrow('USSyncThrottle: config required for first getInstance() call');
    });
  });

  describe('Custom Throttle Window', () => {
    it('respects custom throttle window (30s)', () => {
      USSyncThrottle.resetInstance();
      const customThrottle = USSyncThrottle.getInstance({
        projectRoot: testDir,
        throttleWindowMs: 30000 // 30 seconds
      });

      const realNow = Date.now();
      customThrottle.recordSync('0053-safe-feature-deletion');

      // Mock Date.now() to return time 35 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 35000);

      // Should not be throttled (> 30s)
      expect(customThrottle.shouldSkipSync('0053-safe-feature-deletion')).toBe(false);

      vi.restoreAllMocks();
    });

    it('respects custom throttle window (120s)', () => {
      USSyncThrottle.resetInstance();
      const customThrottle = USSyncThrottle.getInstance({
        projectRoot: testDir,
        throttleWindowMs: 120000 // 120 seconds
      });

      const realNow = Date.now();
      customThrottle.recordSync('0053-safe-feature-deletion');

      // Mock Date.now() to return time 90 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 90000);

      // Should still be throttled (< 120s)
      expect(customThrottle.shouldSkipSync('0053-safe-feature-deletion')).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
