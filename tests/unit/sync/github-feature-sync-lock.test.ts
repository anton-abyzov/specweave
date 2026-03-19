/**
 * Unit tests for LockManager replacing in-memory lock in github-feature-sync.ts
 *
 * Verifies that:
 * 1. The old `syncLocks` Map has been removed
 * 2. LockManager is imported and used for cross-process file locking
 * 3. Lock is released in finally block
 * 4. Lock acquisition failure returns placeholder result
 *
 * @see T-007: RED phase - syncLocks Map still exists
 * @see T-008: GREEN phase - replaced with LockManager
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SYNC_FILE_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/lib/integrations/github/github-feature-sync.ts'
);

describe('GitHubFeatureSync lock migration', () => {
  let sourceCode: string;

  beforeAll(() => {
    sourceCode = fs.readFileSync(SYNC_FILE_PATH, 'utf-8');
  });

  it('should NOT contain the old syncLocks Map', () => {
    // The old in-memory lock pattern should be removed
    expect(sourceCode).not.toContain('syncLocks: Map<string, number>');
    expect(sourceCode).not.toContain('syncLocks.get(');
    expect(sourceCode).not.toContain('syncLocks.set(');
    expect(sourceCode).not.toContain('LOCK_DURATION_MS');
  });

  it('should import LockManager', () => {
    expect(sourceCode).toContain('LockManager');
    // Should import from the correct path
    expect(sourceCode).toMatch(/import.*LockManager.*from/);
  });

  it('should use LockManager.acquire() in syncFeatureToGitHub', () => {
    // The sync method should call acquire on a LockManager instance
    expect(sourceCode).toContain('.acquire()');
  });

  it('should release the lock in a finally block', () => {
    // Lock must be released even if sync throws
    expect(sourceCode).toMatch(/finally\s*\{[^}]*\.release\(\)/s);
  });

  it('should use a lock key based on owner/repo', () => {
    // Lock path should include github-sync-{owner}-{repo} pattern
    expect(sourceCode).toMatch(/github-sync/);
  });

  it('should use 120s stale threshold for the lock', () => {
    // LockManager should be instantiated with 120 second threshold
    expect(sourceCode).toContain('120');
  });

  it('should return placeholder result when lock acquisition fails', () => {
    // When lock.acquire() returns false, sync should skip and return zeros
    // This pattern should exist in the code
    const acquireSection = sourceCode.slice(
      sourceCode.indexOf('syncFeatureToGitHub'),
      sourceCode.indexOf('syncFeatureToGitHub') + 3000
    );
    expect(acquireSection).toContain('acquire()');
    // Should check the boolean result and return placeholder on false
    expect(acquireSection).toMatch(/milestoneNumber:\s*0/);
  });
});
