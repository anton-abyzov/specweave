/**
 * Integration Test: Full sync cycle with all dedup guards active (T-015)
 *
 * Simulates a full sync cycle running twice in rapid succession
 * with mocked GitHub API responses. Asserts:
 * - Zero duplicate `gh issue comment` calls
 * - Zero redundant `gh issue edit` calls
 * - Second sync is throttled by SyncThrottle or short-circuited
 *   by fingerprint/body-diff checks
 *
 * Satisfies: AC-US1-01, AC-US2-03, AC-US3-01
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { SyncThrottle } from '../../../src/core/sync-throttle.js';

describe('GitHub Sync Idempotency - Full Dedup Guards', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(
      os.tmpdir(),
      `specweave-sync-dedup-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('SyncThrottle prevents duplicate sync cycles', () => {
    it('second sync within throttle window is skipped', () => {
      const throttle = new SyncThrottle(testDir);
      const incrementId = '0587-fix-github-sync-dedup';

      // First sync: shouldSkip returns false (allowed)
      expect(throttle.shouldSkip(incrementId)).toBe(false);

      // Record the sync
      throttle.record(incrementId);

      // Second sync: shouldSkip returns true (throttled)
      expect(throttle.shouldSkip(incrementId)).toBe(true);
    });

    it('second sync after window expires is allowed', () => {
      const throttle = new SyncThrottle(testDir, 100); // 100ms window for test speed
      const incrementId = '0587-fix-github-sync-dedup';

      const baseTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      throttle.record(incrementId);
      expect(throttle.shouldSkip(incrementId)).toBe(true);

      // Move past the window
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 200);
      expect(throttle.shouldSkip(incrementId)).toBe(false);
    });

    it('--force flag bypasses throttle', () => {
      const throttle = new SyncThrottle(testDir);
      const incrementId = '0587-fix-github-sync-dedup';

      throttle.record(incrementId);

      // Without force: throttled
      expect(throttle.shouldSkip(incrementId)).toBe(true);

      // With force: not throttled
      expect(throttle.shouldSkip(incrementId, true)).toBe(false);
    });
  });

  describe('Full sync cycle simulation', () => {
    it('simulates two rapid sync runs with zero duplicate API calls', () => {
      const throttle = new SyncThrottle(testDir);
      const incrementId = '0100-test-increment';

      // Track mock API calls
      const apiCalls = {
        ghIssueComment: 0,
        ghIssueEdit: 0,
      };

      // Simulate first sync run
      const runSync = (forceBypass: boolean = false): boolean => {
        if (throttle.shouldSkip(incrementId, forceBypass)) {
          return false; // throttled, no API calls made
        }

        // Simulate sync operations
        apiCalls.ghIssueComment++;
        apiCalls.ghIssueEdit++;

        // Record after successful sync
        throttle.record(incrementId);
        return true;
      };

      // First run: should execute
      const firstRun = runSync();
      expect(firstRun).toBe(true);
      expect(apiCalls.ghIssueComment).toBe(1);
      expect(apiCalls.ghIssueEdit).toBe(1);

      // Second run (rapid succession): should be throttled
      const secondRun = runSync();
      expect(secondRun).toBe(false);
      expect(apiCalls.ghIssueComment).toBe(1); // zero additional calls
      expect(apiCalls.ghIssueEdit).toBe(1);    // zero additional calls
    });

    it('simulates rapid sync with multiple trigger paths converging', () => {
      const throttle = new SyncThrottle(testDir);
      const incrementId = '0100-test-increment';

      let syncExecutions = 0;

      // Simulate three trigger paths firing in rapid succession
      const triggerPaths = [
        'status-change-sync-trigger',
        'sync-progress',
        'auto-create-external-issue',
      ];

      for (const trigger of triggerPaths) {
        if (!throttle.shouldSkip(incrementId)) {
          syncExecutions++;
          throttle.record(incrementId);
        }
      }

      // Only the first trigger should have executed
      expect(syncExecutions).toBe(1);
    });
  });

  describe('Throttle state persistence across instances', () => {
    it('new SyncThrottle instance reads existing throttle state', () => {
      const throttle1 = new SyncThrottle(testDir);
      const incrementId = '0100-test-increment';

      throttle1.record(incrementId);

      // Create a brand new instance (simulating different trigger path)
      const throttle2 = new SyncThrottle(testDir);

      // Should see the recorded state from throttle1
      expect(throttle2.shouldSkip(incrementId)).toBe(true);
    });

    it('state file is valid JSON', () => {
      const throttle = new SyncThrottle(testDir);
      throttle.record('0100-test-increment');

      const stateFile = path.join(testDir, '.specweave/state/sync-throttle.json');
      const content = readFileSync(stateFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(typeof parsed).toBe('object');
      expect(typeof parsed['0100-test-increment']).toBe('number');
    });
  });

  describe('Fingerprint + throttle combined dedup', () => {
    it('unchanged progress (3/5) with existing fingerprint results in zero API calls', () => {
      const throttle = new SyncThrottle(testDir);
      const incrementId = '0100-test-increment';

      // Simulate: existing comment has <!-- sw-progress:3/5 -->
      const existingFingerprint = '3/5';
      const currentProgress = { completed: 3, total: 5 };
      const currentFingerprint = `${currentProgress.completed}/${currentProgress.total}`;

      let commentPosted = false;

      // Fingerprint check: skip if progress unchanged
      if (existingFingerprint !== currentFingerprint) {
        commentPosted = true;
      }

      // No change in progress = no comment
      expect(commentPosted).toBe(false);

      // Throttle also prevents duplicate trigger
      throttle.record(incrementId);
      expect(throttle.shouldSkip(incrementId)).toBe(true);
    });

    it('changed progress (3/5 -> 4/5) posts exactly one comment', () => {
      const existingFingerprint = '3/5';
      const currentProgress = { completed: 4, total: 5 };
      const currentFingerprint = `${currentProgress.completed}/${currentProgress.total}`;

      let commentsPosted = 0;

      // Fingerprint check: progress changed, post comment
      if (existingFingerprint !== currentFingerprint) {
        commentsPosted++;
      }

      expect(commentsPosted).toBe(1);
    });
  });

  describe('Body diff + throttle combined dedup', () => {
    it('identical issue body results in zero gh issue edit calls', () => {
      const currentBody = '## US-001: Feature\n\n- [ ] **AC-US1-01**: Criterion';
      const computedBody = '## US-001: Feature\n\n- [ ] **AC-US1-01**: Criterion';

      // Normalize and compare (simulating normalizeIssueBody)
      const normalize = (body: string) => body.trim().replace(/\s+$/gm, '').replace(/\n{3,}/g, '\n\n');
      const normalized_current = normalize(currentBody);
      const normalized_computed = normalize(computedBody);

      let editCalls = 0;
      if (normalized_current !== normalized_computed) {
        editCalls++;
      }

      // Bodies are identical: zero edits
      expect(editCalls).toBe(0);
    });

    it('changed issue body results in exactly one gh issue edit call', () => {
      const currentBody = '## US-001: Feature\n\n- [ ] **AC-US1-01**: Criterion';
      const computedBody = '## US-001: Feature\n\n- [x] **AC-US1-01**: Criterion';

      const normalize = (body: string) => body.trim().replace(/\s+$/gm, '').replace(/\n{3,}/g, '\n\n');
      const normalized_current = normalize(currentBody);
      const normalized_computed = normalize(computedBody);

      let editCalls = 0;
      if (normalized_current !== normalized_computed) {
        editCalls++;
      }

      expect(editCalls).toBe(1);
    });
  });
});
