/**
 * Unit tests for SyncThrottle
 *
 * Tests the shared throttle utility that prevents multiple sync trigger paths
 * from firing redundantly for the same increment within a configurable window.
 *
 * Satisfies: AC-US3-02, AC-US3-03, AC-US3-04
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { SyncThrottle } from '../../../src/core/sync-throttle.js';

describe('SyncThrottle', () => {
  let testDir: string;
  let throttle: SyncThrottle;

  beforeEach(() => {
    testDir = path.join(
      os.tmpdir(),
      `specweave-test-sync-throttle-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(testDir, { recursive: true });
    throttle = new SyncThrottle(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('shouldSkip()', () => {
    it('returns false on first call (no throttle)', () => {
      const result = throttle.shouldSkip('0587-fix-github-sync-dedup');
      expect(result).toBe(false);
    });

    it('returns true within throttle window after record()', () => {
      throttle.record('0587-fix-github-sync-dedup');
      const result = throttle.shouldSkip('0587-fix-github-sync-dedup');
      expect(result).toBe(true);
    });

    it('returns false after throttle window expires', () => {
      const baseTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      throttle.record('0587-fix-github-sync-dedup');

      // Move forward past the default 5s window
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 6000);

      const result = throttle.shouldSkip('0587-fix-github-sync-dedup');
      expect(result).toBe(false);
    });

    it('returns false when forceBypass is true regardless of throttle state', () => {
      throttle.record('0587-fix-github-sync-dedup');

      // Normally would be throttled
      expect(throttle.shouldSkip('0587-fix-github-sync-dedup')).toBe(true);

      // With forceBypass, should not be throttled
      const result = throttle.shouldSkip('0587-fix-github-sync-dedup', true);
      expect(result).toBe(false);
    });

    it('tracks different keys independently', () => {
      throttle.record('0001-first-increment');

      // First key should be throttled
      expect(throttle.shouldSkip('0001-first-increment')).toBe(true);

      // Second key (never recorded) should not be throttled
      expect(throttle.shouldSkip('0002-second-increment')).toBe(false);
    });
  });

  describe('record()', () => {
    it('persists state to disk', () => {
      throttle.record('0587-fix-github-sync-dedup');

      const stateFile = path.join(testDir, '.specweave/state/sync-throttle.json');
      expect(existsSync(stateFile)).toBe(true);
    });

    it('updates timestamp on subsequent calls', () => {
      const baseTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);
      throttle.record('0587-fix-github-sync-dedup');

      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 1000);
      throttle.record('0587-fix-github-sync-dedup');

      // Should still be throttled (within window from latest record)
      expect(throttle.shouldSkip('0587-fix-github-sync-dedup')).toBe(true);
    });
  });

  describe('custom throttle window', () => {
    it('respects custom window duration', () => {
      const customThrottle = new SyncThrottle(testDir, 2000); // 2 second window
      const baseTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      customThrottle.record('0587-fix-github-sync-dedup');

      // 1.5s later: still within 2s window
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 1500);
      expect(customThrottle.shouldSkip('0587-fix-github-sync-dedup')).toBe(true);

      // 2.5s later: outside 2s window
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 2500);
      expect(customThrottle.shouldSkip('0587-fix-github-sync-dedup')).toBe(false);
    });
  });

  describe('state file handling', () => {
    it('handles missing state directory gracefully', () => {
      // state directory doesn't exist yet -- shouldSkip should not throw
      const freshThrottle = new SyncThrottle(
        path.join(testDir, 'nonexistent-subdir')
      );
      expect(freshThrottle.shouldSkip('any-key')).toBe(false);
    });

    it('handles corrupted state file gracefully', () => {
      const stateDir = path.join(testDir, '.specweave/state');
      mkdirSync(stateDir, { recursive: true });
      const { writeFileSync } = require('fs');
      writeFileSync(path.join(stateDir, 'sync-throttle.json'), 'NOT VALID JSON{{{');

      const freshThrottle = new SyncThrottle(testDir);
      // Should not throw, treat as empty state
      expect(freshThrottle.shouldSkip('any-key')).toBe(false);
    });
  });
});
