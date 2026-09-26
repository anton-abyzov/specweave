/**
 * Unit tests for cleanupLegacyLockfiles
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
  DEFAULT_MAX_WALK_DEPTH,
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

  // T-012 (0879): symlinked directories are never followed. A link such as
  // `~/Google Drive -> ~/Library/CloudStorage/...` or `link -> /` must not pull
  // the whole disk into the scan, nor let the scan delete files outside the tree.
  it('T-012: should not follow symlinked directories', () => {
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-external-'));
    try {
      const externalLock = path.join(externalDir, 'skills-lock.json');
      fs.writeFileSync(externalLock, '{}');
      const oldTime = new Date(Date.now() - 60_000);
      fs.utimesSync(externalLock, oldTime, oldTime);

      fs.symlinkSync(externalDir, path.join(tmpDir, 'escape'));

      const result = cleanupLegacyLockfiles(tmpDir, { mtimeThresholdMs: 0 });

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(0);
      expect(result.removedPaths).toEqual([]);
      expect(fs.existsSync(externalLock)).toBe(true);
    } finally {
      fs.rmSync(externalDir, { recursive: true, force: true });
    }
  });

  // T-013 (0879): the descent is depth-bounded, so a huge tree (e.g. $HOME when
  // no project is found) cannot pin a core for minutes.
  it('T-013: should stop descending at maxDepth', () => {
    const oldTime = new Date(Date.now() - 60_000);
    const makeLock = (segments: string[]): string => {
      const dir = path.join(tmpDir, ...segments);
      fs.mkdirSync(dir, { recursive: true });
      const lock = path.join(dir, 'skills-lock.json');
      fs.writeFileSync(lock, '{}');
      fs.utimesSync(lock, oldTime, oldTime);
      return lock;
    };
    const depthSegments = (prefix: string, depth: number): string[] =>
      Array.from({ length: depth }, (_, i) => `${prefix}${i + 1}`);

    const atLimit = makeLock(depthSegments('d', DEFAULT_MAX_WALK_DEPTH));
    const pastLimit = makeLock(depthSegments('e', DEFAULT_MAX_WALK_DEPTH + 1));

    const bounded = cleanupLegacyLockfiles(tmpDir, { mtimeThresholdMs: 0 });
    expect(bounded.removedPaths).toEqual([atLimit]);
    expect(fs.existsSync(atLimit)).toBe(false);
    expect(fs.existsSync(pastLimit)).toBe(true);

    const deeper = cleanupLegacyLockfiles(tmpDir, {
      mtimeThresholdMs: 0,
      maxDepth: DEFAULT_MAX_WALK_DEPTH + 1,
    });
    expect(deeper.removedPaths).toEqual([pastLimit]);
    expect(fs.existsSync(pastLimit)).toBe(false);
  });
});
