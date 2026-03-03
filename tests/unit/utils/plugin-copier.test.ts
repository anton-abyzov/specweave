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
