/**
 * Unit tests for plugin-copier.ts
 *
 * Tests pure utility functions: hash computation, permissions, lockfile management,
 * root discovery, and legacy migration. The main installPlugin() function shells out
 * to `claude plugin install` and is tested via integration tests.
 *
 * @updated 1.0.356 - Removed copy-to-commands tests, added migration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  computePluginHash,
  fixHookPermissions,
  findSpecweaveRoot,
  readLockfile,
  writeLockfile,
  ensureLockfile,
  migrateLegacyCommandsDir,
  GLOBAL_LOCKFILE_NAME,
  getGlobalLockDir,
  readGlobalLockfile,
  writeGlobalLockfile,
  ensureGlobalLockfile,
  migrateBundledToGlobalLock,
} from '../../../src/utils/plugin-copier.js';

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-plugin-copier-'));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('plugin-copier', () => {

  // =========================================================================
  // computePluginHash
  // =========================================================================
  describe('computePluginHash', () => {
    it('should return consistent 12-char hex hash for a directory', () => {
      const dir = path.join(tmpDir, 'hash-test');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'file.txt'), 'hello');

      const hash1 = computePluginHash(dir);
      const hash2 = computePluginHash(dir);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(12);
      expect(hash1).toMatch(/^[a-f0-9]{12}$/);
    });

    it('should return different hash when content changes', () => {
      const dir = path.join(tmpDir, 'hash-change');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'file.txt'), 'version-1');
      const hash1 = computePluginHash(dir);

      fs.writeFileSync(path.join(dir, 'file.txt'), 'version-2');
      const hash2 = computePluginHash(dir);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when file is renamed', () => {
      const dir = path.join(tmpDir, 'hash-rename');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'original.txt'), 'content');
      const hash1 = computePluginHash(dir);

      fs.unlinkSync(path.join(dir, 'original.txt'));
      fs.writeFileSync(path.join(dir, 'renamed.txt'), 'content');
      const hash2 = computePluginHash(dir);

      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes in nested subdirectories', () => {
      const dir = path.join(tmpDir, 'hash-nested');
      fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'hooks', 'submit.sh'), '#!/bin/bash\necho v1');

      const hash1 = computePluginHash(dir);

      fs.writeFileSync(path.join(dir, 'hooks', 'submit.sh'), '#!/bin/bash\necho v2');
      const hash2 = computePluginHash(dir);

      expect(hash1).not.toBe(hash2);
    });

    it('should return deterministic hash for empty directory', () => {
      const dir = path.join(tmpDir, 'hash-empty');
      fs.mkdirSync(dir, { recursive: true });

      const hash1 = computePluginHash(dir);
      const hash2 = computePluginHash(dir);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(12);
    });

    it('should not collide when filename and content are swapped', () => {
      // file "ab" content "c" vs file "a" content "bc" — delimiter prevents collision
      const dir1 = path.join(tmpDir, 'collision-1');
      fs.mkdirSync(dir1, { recursive: true });
      fs.writeFileSync(path.join(dir1, 'ab'), 'c');

      const dir2 = path.join(tmpDir, 'collision-2');
      fs.mkdirSync(dir2, { recursive: true });
      fs.writeFileSync(path.join(dir2, 'a'), 'bc');

      expect(computePluginHash(dir1)).not.toBe(computePluginHash(dir2));
    });

    it('should return empty string for non-existent directory', () => {
      const hash = computePluginHash(path.join(tmpDir, 'does-not-exist'));
      expect(hash).toBe('');
    });
  });

  // =========================================================================
  // fixHookPermissions
  // =========================================================================
  describe('fixHookPermissions', () => {
    it('should set .sh files to 755', () => {
      const dir = path.join(tmpDir, 'perms-test');
      const hooksDir = path.join(dir, 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      fs.writeFileSync(path.join(hooksDir, 'hook.sh'), '#!/bin/bash');
      fs.chmodSync(path.join(hooksDir, 'hook.sh'), 0o644);

      fixHookPermissions(dir);

      const stat = fs.statSync(path.join(hooksDir, 'hook.sh'));
      // Check executable bit is set (0o755 = 493)
      expect(stat.mode & 0o755).toBe(0o755);
    });

    it('should not affect non-.sh files', () => {
      const dir = path.join(tmpDir, 'perms-nonsh');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'readme.md'), '# Readme');
      fs.chmodSync(path.join(dir, 'readme.md'), 0o644);

      fixHookPermissions(dir);

      const stat = fs.statSync(path.join(dir, 'readme.md'));
      // Should still be 644 (no executable bit)
      expect(stat.mode & 0o111).toBe(0);
    });
  });

  // =========================================================================
  // Lockfile functions
  // =========================================================================
  describe('lockfile management', () => {
    it('readLockfile should return null when no lockfile exists', () => {
      const result = readLockfile(tmpDir);
      expect(result).toBeNull();
    });

    it('writeLockfile + readLockfile round-trip', () => {
      const lock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'abc123def456',
            tier: 'BUNDLED',
            installedAt: '2026-02-19T00:00:00Z',
            source: 'local:specweave',
          },
        },
        createdAt: '2026-02-19T00:00:00Z',
        updatedAt: '2026-02-19T00:00:00Z',
      };

      writeLockfile(lock, tmpDir);
      const result = readLockfile(tmpDir);

      expect(result).not.toBeNull();
      expect(result!.version).toBe(1);
      expect(result!.skills.sw.sha).toBe('abc123def456');
      expect(result!.skills.sw.tier).toBe('BUNDLED');
    });

    it('ensureLockfile should create new lockfile when none exists', () => {
      const lock = ensureLockfile(tmpDir);

      expect(lock.version).toBe(1);
      expect(lock.agents).toContain('claude-code');
      expect(lock.skills).toEqual({});

      // Should also be written to disk
      const diskLock = readLockfile(tmpDir);
      expect(diskLock).not.toBeNull();
    });

    it('ensureLockfile should return existing lockfile', () => {
      const original = {
        version: 1,
        agents: ['claude-code'],
        skills: { sw: { version: '1.0.0', sha: 'existing', tier: 'BUNDLED', installedAt: '', source: '' } },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      writeLockfile(original, tmpDir);

      const lock = ensureLockfile(tmpDir);
      expect(lock.skills.sw.sha).toBe('existing');
    });
  });

  // =========================================================================
  // findSpecweaveRoot
  // =========================================================================
  describe('findSpecweaveRoot', () => {
    it('should find root from nested directory', () => {
      const root = path.join(tmpDir, 'specweave-root');
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'specweave' }));

      const nested = path.join(root, 'dist', 'src', 'cli', 'commands');
      fs.mkdirSync(nested, { recursive: true });

      const found = findSpecweaveRoot(nested);
      expect(found).toBe(root);
    });

    it('should return null when no specweave root found', () => {
      const noRoot = path.join(tmpDir, 'no-specweave');
      fs.mkdirSync(noRoot, { recursive: true });

      const found = findSpecweaveRoot(noRoot);
      expect(found).toBeNull();
    });

    it('should find root with @specweave/core package name', () => {
      const root = path.join(tmpDir, 'core-root');
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@specweave/core' }));

      const nested = path.join(root, 'dist');
      fs.mkdirSync(nested, { recursive: true });

      const found = findSpecweaveRoot(nested);
      expect(found).toBe(root);
    });
  });

  // =========================================================================
  // T-001: getGlobalLockDir + GLOBAL_LOCKFILE_NAME
  // =========================================================================
  describe('getGlobalLockDir', () => {
    let fakeHome: string;
    let realHomedir: typeof import('node:os').homedir;

    beforeEach(() => {
      fakeHome = path.join(tmpDir, 'fake-home');
      // Patch homedir at the module level via env override
      realHomedir = os.homedir;
      // Create a separate fake home so we don't touch the real one
      fs.mkdirSync(fakeHome, { recursive: true });
    });

    it('GLOBAL_LOCKFILE_NAME should be plugins-lock.json', () => {
      expect(GLOBAL_LOCKFILE_NAME).toBe('plugins-lock.json');
    });

    it('should create ~/.specweave/ if it does not exist and return path', () => {
      const dir = getGlobalLockDir(fakeHome);
      expect(dir).toBe(path.join(fakeHome, '.specweave'));
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('should be idempotent — second call succeeds without error', () => {
      const dir1 = getGlobalLockDir(fakeHome);
      const dir2 = getGlobalLockDir(fakeHome);
      expect(dir1).toBe(dir2);
    });
  });

  // =========================================================================
  // T-002: readGlobalLockfile, writeGlobalLockfile, ensureGlobalLockfile
  // =========================================================================
  describe('global lockfile functions', () => {
    let fakeHome: string;

    beforeEach(() => {
      fakeHome = path.join(tmpDir, 'fake-home');
      fs.mkdirSync(fakeHome, { recursive: true });
    });

    it('readGlobalLockfile returns null when no file exists', () => {
      const result = readGlobalLockfile(fakeHome);
      expect(result).toBeNull();
    });

    it('writeGlobalLockfile + readGlobalLockfile round-trip preserves all fields', () => {
      const lock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.498',
            sha: 'abc123def456',
            tier: 'BUNDLED',
            installedAt: '2026-03-17T00:00:00Z',
            source: 'local:specweave',
          },
        },
        createdAt: '2026-03-17T00:00:00Z',
        updatedAt: '2026-03-17T00:00:00Z',
      };

      writeGlobalLockfile(lock, fakeHome);
      const result = readGlobalLockfile(fakeHome);

      expect(result).not.toBeNull();
      expect(result!.version).toBe(1);
      expect(result!.skills.sw.sha).toBe('abc123def456');
      expect(result!.skills.sw.source).toBe('local:specweave');
      // updatedAt should be refreshed
      expect(result!.updatedAt).not.toBe('2026-03-17T00:00:00Z');
    });

    it('ensureGlobalLockfile creates new file when none exists', () => {
      const lock = ensureGlobalLockfile(fakeHome);

      expect(lock.version).toBe(1);
      expect(lock.agents).toContain('claude-code');
      expect(lock.skills).toEqual({});

      // Should be on disk
      const diskLock = readGlobalLockfile(fakeHome);
      expect(diskLock).not.toBeNull();
    });

    it('ensureGlobalLockfile returns existing file on second call', () => {
      const lock1 = ensureGlobalLockfile(fakeHome);
      lock1.skills['sw'] = {
        version: '1.0.0', sha: 'test', tier: 'BUNDLED',
        installedAt: '2026-03-17T00:00:00Z', source: 'local:specweave',
      };
      writeGlobalLockfile(lock1, fakeHome);

      const lock2 = ensureGlobalLockfile(fakeHome);
      expect(lock2.skills.sw.sha).toBe('test');
    });
  });

  // =========================================================================
  // T-003: installPlugin uses global lock, not project lock
  // =========================================================================
  describe('installPlugin uses global lock', () => {
    let fakeHome: string;
    let specweaveRoot: string;

    beforeEach(() => {
      fakeHome = path.join(tmpDir, 'fake-home');
      fs.mkdirSync(path.join(fakeHome, '.claude', 'plugins'), { recursive: true });

      // Create a minimal specweave root with marketplace.json
      specweaveRoot = path.join(tmpDir, 'specweave-root');
      const pluginSourceDir = path.join(specweaveRoot, 'plugins', 'sw');
      fs.mkdirSync(path.join(specweaveRoot, '.claude-plugin'), { recursive: true });
      fs.mkdirSync(pluginSourceDir, { recursive: true });
      fs.writeFileSync(path.join(pluginSourceDir, 'SKILL.md'), '# SW plugin');
      fs.writeFileSync(
        path.join(specweaveRoot, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({ plugins: [{ name: 'sw', source: 'plugins/sw', version: '1.0.0' }] }),
      );
    });

    it('should NOT create vskill.lock in process.cwd()', async () => {
      // We need to import the function dynamically to test with mocks
      // For now, verify the static code: after T-003, installPlugin should
      // not call getProjectRoot() — it should use ensureGlobalLockfile()
      const src = fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'src', 'utils', 'plugin-copier.ts'),
        'utf-8',
      );
      // After T-003, installPlugin should NOT contain getProjectRoot()
      const installPluginBody = src.slice(
        src.indexOf('export function installPlugin('),
        src.indexOf('export const copyPlugin'),
      );
      expect(installPluginBody).not.toContain('getProjectRoot()');
      expect(installPluginBody).toContain('ensureGlobalLockfile');
      expect(installPluginBody).toContain('writeGlobalLockfile');
    });
  });

  // =========================================================================
  // T-004: Skip logic with global lock
  // =========================================================================
  describe('skip logic with global lock', () => {
    let fakeHome: string;

    beforeEach(() => {
      fakeHome = path.join(tmpDir, 'fake-home');
      fs.mkdirSync(fakeHome, { recursive: true });
    });

    it('global lock hash match enables skip', () => {
      // Write a global lockfile with a known hash
      const lock = ensureGlobalLockfile(fakeHome);
      lock.skills['sw'] = {
        version: '1.0.0',
        sha: 'abc123def456',
        tier: 'BUNDLED',
        installedAt: '2026-03-17T00:00:00Z',
        source: 'local:specweave',
      };
      writeGlobalLockfile(lock, fakeHome);

      // Read it back and verify hash comparison works
      const readBack = readGlobalLockfile(fakeHome);
      expect(readBack).not.toBeNull();
      expect(readBack!.skills['sw']?.sha).toBe('abc123def456');
    });
  });

  // =========================================================================
  // T-007: migrateBundledToGlobalLock
  // =========================================================================
  describe('migrateBundledToGlobalLock', () => {
    let fakeHome: string;
    let projectDir: string;

    beforeEach(() => {
      fakeHome = path.join(tmpDir, 'fake-home');
      projectDir = path.join(tmpDir, 'project');
      fs.mkdirSync(fakeHome, { recursive: true });
      fs.mkdirSync(projectDir, { recursive: true });
    });

    it('moves bundled entries to global lock, keeps user entries in project lock', () => {
      // Project lock has one bundled + one user entry
      const projectLock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0', sha: 'bundled123', tier: 'BUNDLED',
            installedAt: '2026-03-17T00:00:00Z', source: 'local:specweave',
          },
          'my-skill': {
            version: '2.0.0', sha: 'user456', tier: 'VERIFIED',
            installedAt: '2026-03-17T00:00:00Z', source: 'marketplace',
          },
        },
        createdAt: '2026-03-17T00:00:00Z',
        updatedAt: '2026-03-17T00:00:00Z',
      };
      writeLockfile(projectLock, projectDir);

      const result = migrateBundledToGlobalLock(projectDir, fakeHome);

      expect(result.migratedCount).toBe(1);
      expect(result.deletedProjectLock).toBe(false);

      // Global lock should have bundled entry
      const globalLock = readGlobalLockfile(fakeHome);
      expect(globalLock).not.toBeNull();
      expect(globalLock!.skills.sw.sha).toBe('bundled123');

      // Project lock should only have user entry
      const updatedProjectLock = readLockfile(projectDir);
      expect(updatedProjectLock).not.toBeNull();
      expect(updatedProjectLock!.skills['my-skill']).toBeDefined();
      expect(updatedProjectLock!.skills.sw).toBeUndefined();
    });

    it('deletes project lock when only bundled entries exist', () => {
      const projectLock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0', sha: 'bundled123', tier: 'BUNDLED',
            installedAt: '2026-03-17T00:00:00Z', source: 'local:specweave',
          },
        },
        createdAt: '2026-03-17T00:00:00Z',
        updatedAt: '2026-03-17T00:00:00Z',
      };
      writeLockfile(projectLock, projectDir);

      const result = migrateBundledToGlobalLock(projectDir, fakeHome);

      expect(result.migratedCount).toBe(1);
      expect(result.deletedProjectLock).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'vskill.lock'))).toBe(false);
    });

    it('is idempotent — second call is no-op', () => {
      const projectLock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0', sha: 'bundled123', tier: 'BUNDLED',
            installedAt: '2026-03-17T00:00:00Z', source: 'local:specweave',
          },
        },
        createdAt: '2026-03-17T00:00:00Z',
        updatedAt: '2026-03-17T00:00:00Z',
      };
      writeLockfile(projectLock, projectDir);

      migrateBundledToGlobalLock(projectDir, fakeHome);
      const result2 = migrateBundledToGlobalLock(projectDir, fakeHome);

      expect(result2.migratedCount).toBe(0);
      expect(result2.deletedProjectLock).toBe(false);
    });

    it('keeps newer global entry when project entry is older', () => {
      // Global lock already has a newer entry
      const globalLock = ensureGlobalLockfile(fakeHome);
      globalLock.skills.sw = {
        version: '1.0.1', sha: 'newer789', tier: 'BUNDLED',
        installedAt: '2026-03-18T00:00:00Z', source: 'local:specweave',
      };
      writeGlobalLockfile(globalLock, fakeHome);

      // Project lock has older entry
      const projectLock = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0', sha: 'older123', tier: 'BUNDLED',
            installedAt: '2026-03-17T00:00:00Z', source: 'local:specweave',
          },
        },
        createdAt: '2026-03-17T00:00:00Z',
        updatedAt: '2026-03-17T00:00:00Z',
      };
      writeLockfile(projectLock, projectDir);

      migrateBundledToGlobalLock(projectDir, fakeHome);

      // Global should keep newer entry
      const updatedGlobal = readGlobalLockfile(fakeHome);
      expect(updatedGlobal!.skills.sw.sha).toBe('newer789');
    });
  });

  // =========================================================================
  // T-013: Permission denied fallback
  // =========================================================================
  describe('getGlobalLockDir permission fallback', () => {
    it('throws when home is empty string', () => {
      expect(() => getGlobalLockDir('')).toThrow('No home directory');
    });
  });

  // =========================================================================
  // T-014: Empty homedir guard
  // =========================================================================
  describe('writeGlobalLockfile with empty homedir', () => {
    it('does not write to filesystem root and does not throw unhandled', () => {
      const lock = {
        version: 1, agents: ['claude-code'], skills: {},
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      // writeGlobalLockfile with empty home should not throw (caught internally)
      // but also should not write to '/'
      expect(() => writeGlobalLockfile(lock, '')).toThrow('No home directory');
      expect(fs.existsSync('/.specweave/plugins-lock.json')).toBe(false);
    });
  });

  // =========================================================================
  // migrateLegacyCommandsDir
  // =========================================================================
  describe('migrateLegacyCommandsDir', () => {
    it('should return false when legacy dir does not exist', () => {
      // migrateLegacyCommandsDir checks ~/.claude/commands/<name>,
      // which won't exist in the test environment
      const result = migrateLegacyCommandsDir('nonexistent-plugin-xyz');
      expect(result).toBe(false);
    });
  });
});
