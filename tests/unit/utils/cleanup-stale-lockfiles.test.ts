/**
 * Unit tests for cleanupLegacyLockfiles and cleanupOrphanedChildLocks
 *
 * Uses real temporary directories for filesystem operations.
 * Covers US-001 (T-001 through T-006) and US-002 (T-007 through T-011).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  cleanupLegacyLockfiles,
  cleanupOrphanedChildLocks,
} from '../../../src/utils/cleanup-stale-plugins.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-stale-lockfiles-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ===========================================================================
// US-001: cleanupLegacyLockfiles
// ===========================================================================

describe('cleanupLegacyLockfiles', () => {
  // T-002: Happy path — finds and deletes skills-lock.json at root and nested dirs
  it('T-002: should find and delete skills-lock.json at root and nested dirs', () => {
    // Create skills-lock.json at root
    const rootLock = path.join(tmpDir, 'skills-lock.json');
    fs.writeFileSync(rootLock, '{}');
    // Backdate mtime so it passes the threshold
    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(rootLock, oldTime, oldTime);

    // Create nested skills-lock.json
    const nestedDir = path.join(tmpDir, 'sub', 'deep');
    fs.mkdirSync(nestedDir, { recursive: true });
    const nestedLock = path.join(nestedDir, 'skills-lock.json');
    fs.writeFileSync(nestedLock, '{}');
    fs.utimesSync(nestedLock, oldTime, oldTime);

    const result = cleanupLegacyLockfiles(tmpDir, { mtimeThresholdMs: 0 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(result.removedPaths).toContain(rootLock);
    expect(result.removedPaths).toContain(nestedLock);
    expect(fs.existsSync(rootLock)).toBe(false);
    expect(fs.existsSync(nestedLock)).toBe(false);
  });

  // T-003: mtime guard — skips files modified < 5s ago
  it('T-003: should skip files modified less than threshold ago', () => {
    const lockFile = path.join(tmpDir, 'skills-lock.json');
    fs.writeFileSync(lockFile, '{}');
    // File was just created, mtime is now — should be skipped with 5s threshold

    const result = cleanupLegacyLockfiles(tmpDir, { mtimeThresholdMs: 5000 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedPaths).toContain(lockFile);
    expect(fs.existsSync(lockFile)).toBe(true);
  });

  // T-004: No-op — returns removedCount 0 when no files exist
  it('T-004: should return removedCount 0 when no skills-lock.json files exist', () => {
    // Create some other files but not skills-lock.json
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), '');

    const result = cleanupLegacyLockfiles(tmpDir);

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  // T-005: Error capture — permission error on one file, continues to next
  it('T-005: should capture per-file errors and continue processing', () => {
    // Create two skills-lock.json files
    const dir1 = path.join(tmpDir, 'a');
    const dir2 = path.join(tmpDir, 'b');
    fs.mkdirSync(dir1, { recursive: true });
    fs.mkdirSync(dir2, { recursive: true });

    const lock1 = path.join(dir1, 'skills-lock.json');
    const lock2 = path.join(dir2, 'skills-lock.json');
    fs.writeFileSync(lock1, '{}');
    fs.writeFileSync(lock2, '{}');

    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(lock1, oldTime, oldTime);
    fs.utimesSync(lock2, oldTime, oldTime);

    // Use custom fs that throws on the first file's unlinkSync
    const customFs = {
      ...fs,
      unlinkSync: (p: string) => {
        if (p === lock1) {
          throw new Error('EPERM: permission denied');
        }
        fs.unlinkSync(p);
      },
    } as typeof fs;

    const result = cleanupLegacyLockfiles(tmpDir, {
      mtimeThresholdMs: 0,
      customFs,
    });

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].path).toBe(lock1);
    expect(result.removedCount).toBe(1);
    expect(result.removedPaths).toContain(lock2);
  });

  // T-006: Directory skip — ignores node_modules, .git, .specweave
  it('T-006: should not traverse node_modules, .git, or .specweave', () => {
    // Create skills-lock.json only in excluded directories
    const dirs = [
      path.join(tmpDir, 'node_modules', 'pkg'),
      path.join(tmpDir, '.git', 'objects'),
      path.join(tmpDir, '.specweave', 'data'),
    ];
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
      const lockPath = path.join(dir, 'skills-lock.json');
      fs.writeFileSync(lockPath, '{}');
      const oldTime = new Date(Date.now() - 60_000);
      fs.utimesSync(lockPath, oldTime, oldTime);
    }

    const result = cleanupLegacyLockfiles(tmpDir, { mtimeThresholdMs: 0 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
  });
});

// ===========================================================================
// US-002: cleanupOrphanedChildLocks
// ===========================================================================

describe('cleanupOrphanedChildLocks', () => {
  function makeUmbrella(root: string): void {
    const configDir = path.join(root, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ umbrella: { enabled: true } })
    );
  }

  function makeNonUmbrella(root: string): void {
    const configDir = path.join(root, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ project: { name: 'test' } })
    );
  }

  // T-007: Non-umbrella project returns early with no changes
  it('T-007: should return early with no changes for non-umbrella project', () => {
    makeNonUmbrella(tmpDir);

    const result = cleanupOrphanedChildLocks(tmpDir);

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.removedPaths).toEqual([]);
    expect(result.skippedPaths).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  // T-008: Removes child vskill.lock, preserves root
  it('T-008: should remove child vskill.lock and preserve root lock', () => {
    makeUmbrella(tmpDir);

    // Create root vskill.lock (should NOT be deleted)
    const rootLock = path.join(tmpDir, 'vskill.lock');
    fs.writeFileSync(rootLock, '{"skills":{}}');

    // Create child repo lock (should be deleted)
    const childDir = path.join(tmpDir, 'repositories', 'org', 'child-repo');
    fs.mkdirSync(childDir, { recursive: true });
    const childLock = path.join(childDir, 'vskill.lock');
    fs.writeFileSync(childLock, '{"skills":{}}');
    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(childLock, oldTime, oldTime);

    const result = cleanupOrphanedChildLocks(tmpDir, { mtimeThresholdMs: 0 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.removedPaths).toContain(childLock);
    expect(fs.existsSync(rootLock)).toBe(true);
    expect(fs.existsSync(childLock)).toBe(false);
  });

  // T-009: mtime guard skips recently modified child locks
  it('T-009: should skip recently modified child locks', () => {
    makeUmbrella(tmpDir);

    // Create child repo lock with recent mtime
    const childDir = path.join(tmpDir, 'repositories', 'org', 'child-repo');
    fs.mkdirSync(childDir, { recursive: true });
    const childLock = path.join(childDir, 'vskill.lock');
    fs.writeFileSync(childLock, '{"skills":{}}');
    // File is freshly created, mtime is now

    const result = cleanupOrphanedChildLocks(tmpDir, { mtimeThresholdMs: 5000 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedPaths).toContain(childLock);
    expect(fs.existsSync(childLock)).toBe(true);
  });

  // T-010: Symlink escape — doesn't delete through symlinks pointing outside project
  it('T-010: should not delete through symlinks pointing outside project', () => {
    makeUmbrella(tmpDir);

    // Create an external directory with a vskill.lock
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-external-'));
    const externalLock = path.join(externalDir, 'vskill.lock');
    fs.writeFileSync(externalLock, '{"skills":{}}');
    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(externalLock, oldTime, oldTime);

    // Create symlink inside repositories that points outside
    const repoDir = path.join(tmpDir, 'repositories', 'org');
    fs.mkdirSync(repoDir, { recursive: true });
    fs.symlinkSync(externalDir, path.join(repoDir, 'symlinked-repo'));

    const result = cleanupOrphanedChildLocks(tmpDir, { mtimeThresholdMs: 0 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    // Should have a warning in errors about symlink escape
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toMatch(/outside project/i);
    // External file should still exist
    expect(fs.existsSync(externalLock)).toBe(true);

    // Cleanup external dir
    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  // T-011: Missing root lock still cleans child locks
  it('T-011: should clean child locks even when root vskill.lock is absent', () => {
    makeUmbrella(tmpDir);

    // No root vskill.lock created

    // Create child repo lock
    const childDir = path.join(tmpDir, 'repositories', 'org', 'child-repo');
    fs.mkdirSync(childDir, { recursive: true });
    const childLock = path.join(childDir, 'vskill.lock');
    fs.writeFileSync(childLock, '{"skills":{}}');
    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(childLock, oldTime, oldTime);

    const result = cleanupOrphanedChildLocks(tmpDir, { mtimeThresholdMs: 0 });

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.removedPaths).toContain(childLock);
    expect(fs.existsSync(childLock)).toBe(false);
  });
});
