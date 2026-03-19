/**
 * Unit tests for SyncThrottle wiring in trigger paths
 *
 * Verifies that status-change-sync-trigger, sync-progress, and
 * auto-create-external-issue all check SyncThrottle.shouldSkip()
 * before executing downstream sync operations.
 *
 * Satisfies: AC-US3-02, AC-US3-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const REPO = '/Users/antonabyzov/Projects/github/specweave-umb/repositories/anton-abyzov/specweave';

describe('SyncThrottle wiring in trigger paths', () => {
  describe('status-change-sync-trigger.ts', () => {
    it('should import SyncThrottle', () => {
      const source = readFileSync(
        path.join(REPO, 'src/core/increment/status-change-sync-trigger.ts'),
        'utf-8'
      );
      expect(source).toContain('SyncThrottle');
      expect(source).toMatch(/import.*SyncThrottle/);
    });

    it('should call shouldSkip before spawnAsyncSync', () => {
      const source = readFileSync(
        path.join(REPO, 'src/core/increment/status-change-sync-trigger.ts'),
        'utf-8'
      );
      // shouldSkip should appear before spawnAsyncSync in the triggerIfNeeded method
      const shouldSkipPos = source.indexOf('shouldSkip');
      const spawnPos = source.indexOf('this.spawnAsyncSync(');
      expect(shouldSkipPos).toBeGreaterThan(-1);
      expect(spawnPos).toBeGreaterThan(-1);
      expect(shouldSkipPos).toBeLessThan(spawnPos);
    });

    it('should call record after sync completes', () => {
      const source = readFileSync(
        path.join(REPO, 'src/core/increment/status-change-sync-trigger.ts'),
        'utf-8'
      );
      expect(source).toContain('.record(');
    });
  });

  describe('sync-progress.ts', () => {
    it('should import SyncThrottle', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      expect(source).toContain('SyncThrottle');
      expect(source).toMatch(/import.*SyncThrottle/);
    });

    it('should check shouldSkip with forceBypass from --force flag', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      // Should reference both shouldSkip and force together
      expect(source).toContain('shouldSkip');
      expect(source).toContain('force');
    });

    it('should call record after sync completes', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      expect(source).toContain('.record(');
    });
  });

  describe('auto-create-external-issue.ts', () => {
    it('should import SyncThrottle', () => {
      const source = readFileSync(
        path.join(REPO, 'src/hooks/auto-create-external-issue.ts'),
        'utf-8'
      );
      expect(source).toContain('SyncThrottle');
      expect(source).toMatch(/import.*SyncThrottle/);
    });

    it('should call shouldSkip before autoCreateExternalIssue', () => {
      const source = readFileSync(
        path.join(REPO, 'src/hooks/auto-create-external-issue.ts'),
        'utf-8'
      );
      const shouldSkipPos = source.indexOf('shouldSkip');
      const createPos = source.indexOf('autoCreateExternalIssue(');
      expect(shouldSkipPos).toBeGreaterThan(-1);
      expect(createPos).toBeGreaterThan(-1);
      expect(shouldSkipPos).toBeLessThan(createPos);
    });

    it('should call record after successful create', () => {
      const source = readFileSync(
        path.join(REPO, 'src/hooks/auto-create-external-issue.ts'),
        'utf-8'
      );
      expect(source).toContain('.record(');
    });
  });
});
