import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  cleanupLegacyLockfiles,
  cleanupOrphanedChildLocks,
} from '../../../src/utils/cleanup-stale-plugins.js';

describe('cleanupLegacyLockfiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-legacy-lock-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T-002: Happy path — deletes at root and nested
  it('should delete all skills-lock.json at any depth', () => {
    fs.writeFileSync(path.join(tempDir, 'skills-lock.json'), '{}');
    fs.mkdirSync(path.join(tempDir, 'sub', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'sub', 'deep', 'skills-lock.json'), '{}');

    const result = cleanupLegacyLockfiles(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(2);
    expect(result.removedPaths).toHaveLength(2);
    expect(fs.existsSync(path.join(tempDir, 'skills-lock.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'sub', 'deep', 'skills-lock.json'))).toBe(false);
  });

  // T-003: Mtime guard skips recent files
  it('should skip files with recent mtime', () => {
    const filePath = path.join(tempDir, 'skills-lock.json');
    fs.writeFileSync(filePath, '{}');

    const result = cleanupLegacyLockfiles(tempDir, { mtimeThresholdMs: 60000 });

    expect(result.removedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedPaths).toContain(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  // T-004: No-op when no files exist
  it('should return success with zero removals when no files exist', () => {
    const result = cleanupLegacyLockfiles(tempDir);

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  // T-005: Per-file error capture continues processing
  it('should capture per-file errors and continue', () => {
    const rootFile = path.join(tempDir, 'skills-lock.json');
    fs.writeFileSync(rootFile, '{}');
    fs.mkdirSync(path.join(tempDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'sub', 'skills-lock.json'), '{}');

    // Create a proxy that intercepts unlinkSync to throw on the root file
    const handler: ProxyHandler<typeof fs> = {
      get(target, prop, receiver) {
        if (prop === 'unlinkSync') {
          return (p: fs.PathLike) => {
            if (p.toString() === rootFile) throw new Error('EPERM: permission denied');
            return target.unlinkSync(p);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    };
    const proxiedFs = new Proxy(fs, handler) as typeof import('fs');

    const result = cleanupLegacyLockfiles(tempDir, { customFs: proxiedFs, mtimeThresholdMs: 0 });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe(rootFile);
    expect(result.removedCount).toBe(1);
    expect(result.success).toBe(true);
  });

  // T-006: Skips node_modules, .git, .specweave
  it('should skip excluded directories', () => {
    fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'skills-lock.json'), '{}');
    fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.git', 'skills-lock.json'), '{}');

    const result = cleanupLegacyLockfiles(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(0);
  });
});

describe('cleanupOrphanedChildLocks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-orphan-lock-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function setupUmbrellaConfig(enabled: boolean) {
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ umbrella: { enabled } })
    );
  }

  function setupChildRepo(org: string, repo: string, withLock: boolean = true) {
    const repoDir = path.join(tempDir, 'repositories', org, repo);
    fs.mkdirSync(repoDir, { recursive: true });
    if (withLock) {
      fs.writeFileSync(path.join(repoDir, 'vskill.lock'), '{}');
    }
    return repoDir;
  }

  // T-007: Non-umbrella returns early
  it('should return early for non-umbrella projects', () => {
    setupUmbrellaConfig(false);
    setupChildRepo('org', 'repo');

    const result = cleanupOrphanedChildLocks(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(0);
    expect(fs.existsSync(path.join(tempDir, 'repositories', 'org', 'repo', 'vskill.lock'))).toBe(true);
  });

  // T-008: Removes child lock, preserves root
  it('should remove child vskill.lock and preserve root', () => {
    setupUmbrellaConfig(true);
    fs.writeFileSync(path.join(tempDir, 'vskill.lock'), '{}'); // root lock
    setupChildRepo('org', 'child');

    const result = cleanupOrphanedChildLocks(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(1);
    expect(fs.existsSync(path.join(tempDir, 'vskill.lock'))).toBe(true); // root preserved
    expect(fs.existsSync(path.join(tempDir, 'repositories', 'org', 'child', 'vskill.lock'))).toBe(false);
  });

  // T-009: Mtime guard skips recently written child lock
  it('should skip child lock with recent mtime', () => {
    setupUmbrellaConfig(true);
    setupChildRepo('org', 'child');

    const result = cleanupOrphanedChildLocks(tempDir, { mtimeThresholdMs: 60000 });

    expect(result.skippedCount).toBe(1);
    expect(result.removedCount).toBe(0);
  });

  // T-010: Symlink escape prevention
  it('should skip symlinks that resolve outside project root', () => {
    setupUmbrellaConfig(true);

    // Create a target outside project root
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-external-'));
    fs.writeFileSync(path.join(externalDir, 'vskill.lock'), '{}');

    // Create symlink
    const orgDir = path.join(tempDir, 'repositories', 'org');
    fs.mkdirSync(orgDir, { recursive: true });
    fs.symlinkSync(externalDir, path.join(orgDir, 'symlinked-repo'));

    const result = cleanupOrphanedChildLocks(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('outside project root');
    // External file should still exist
    expect(fs.existsSync(path.join(externalDir, 'vskill.lock'))).toBe(true);

    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  // T-011: Umbrella root lock absent does not block child cleanup
  it('should clean child locks even when root lock is absent', () => {
    setupUmbrellaConfig(true);
    // No root vskill.lock
    setupChildRepo('org', 'child');

    const result = cleanupOrphanedChildLocks(tempDir, { mtimeThresholdMs: 0 });

    expect(result.removedCount).toBe(1);
    expect(fs.existsSync(path.join(tempDir, 'repositories', 'org', 'child', 'vskill.lock'))).toBe(false);
  });
});
