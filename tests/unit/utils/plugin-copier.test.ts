/**
 * Unit tests for plugin-copier.ts
 *
 * Tests the inline first-party plugin copier that replaces vskill CLI shell-out.
 * Uses real temp directories for reliable file-system testing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'node:crypto';

import {
  copyPlugin,
  computePluginHash,
  fixHookPermissions,
  findSpecweaveRoot,
  readLockfile,
  writeLockfile,
  ensureLockfile,
} from '../../../src/utils/plugin-copier.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let originalCwd: string;

/** Create a fake specweave root with marketplace.json and plugin dirs */
function createFakeSpecweaveRoot(rootDir: string, plugins: Array<{ name: string; source: string }>): void {
  // Create package.json
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ name: 'specweave', version: '1.0.278' }),
  );

  // Create .claude-plugin/marketplace.json
  const claudePluginDir = path.join(rootDir, '.claude-plugin');
  fs.mkdirSync(claudePluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(claudePluginDir, 'marketplace.json'),
    JSON.stringify({
      name: 'specweave',
      version: '1.0.0',
      plugins: plugins.map(p => ({ name: p.name, source: p.source, version: '1.0.0' })),
    }),
  );

  // Create plugin source directories with sample files
  for (const plugin of plugins) {
    const pluginDir = path.join(rootDir, plugin.source);
    fs.mkdirSync(pluginDir, { recursive: true });

    // Create a SKILL.md
    fs.writeFileSync(path.join(pluginDir, 'SKILL.md'), `# ${plugin.name} skill`);

    // Create hooks directory with a .sh file
    const hooksDir = path.join(pluginDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'user-prompt-submit.sh'), '#!/bin/bash\necho "hook"');
    // Set to non-executable initially
    fs.chmodSync(path.join(hooksDir, 'user-prompt-submit.sh'), 0o644);
  }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

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
  // copyPlugin — main function
  // =========================================================================
  describe('copyPlugin', () => {
    let specweaveRoot: string;
    let targetDir: string;

    beforeEach(() => {
      specweaveRoot = path.join(tmpDir, 'specweave');
      targetDir = path.join(tmpDir, 'target-commands');
      fs.mkdirSync(specweaveRoot, { recursive: true });
      fs.mkdirSync(targetDir, { recursive: true });

      createFakeSpecweaveRoot(specweaveRoot, [
        { name: 'sw', source: './plugins/specweave' },
        { name: 'sw-frontend', source: './plugins/sw-frontend' },
      ]);
    });

    it('should copy plugin files to target directory', () => {
      const result = copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });

      expect(result.success).toBe(true);
      expect(result.sha).toMatch(/^[a-f0-9]{12}$/);
      expect(result.targetDir).toBe(path.join(targetDir, 'sw'));

      // Verify files were copied
      expect(fs.existsSync(path.join(targetDir, 'sw', 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'sw', 'hooks', 'user-prompt-submit.sh'))).toBe(true);
    });

    it('should fix hook permissions after copy', () => {
      copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });

      const hookPath = path.join(targetDir, 'sw', 'hooks', 'user-prompt-submit.sh');
      const stat = fs.statSync(hookPath);
      expect(stat.mode & 0o755).toBe(0o755);
    });

    it('should update lockfile with BUNDLED tier', () => {
      copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });

      const lock = readLockfile(tmpDir);
      expect(lock).not.toBeNull();
      expect(lock!.skills.sw).toBeDefined();
      expect(lock!.skills.sw.tier).toBe('BUNDLED');
      expect(lock!.skills.sw.source).toBe('local:specweave');
      expect(lock!.agents).toContain('claude-code');
    });

    it('should skip when hash matches lockfile (no force)', () => {
      // First install
      const first = copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });
      expect(first.success).toBe(true);
      expect(first.skipped).toBeUndefined();

      // Second install — should skip
      const second = copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });
      expect(second.success).toBe(true);
      expect(second.skipped).toBe(true);
    });

    it('should reinstall when force is true even if hash matches', () => {
      // First install
      copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });

      // Force reinstall
      const result = copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir, force: true });
      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
    });

    it('should return error for plugin not in marketplace.json', () => {
      const result = copyPlugin('nonexistent', specweaveRoot, { targetBaseDir: targetDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in marketplace');
    });

    it('should return error when marketplace.json is missing', () => {
      const emptyRoot = path.join(tmpDir, 'empty-root');
      fs.mkdirSync(emptyRoot, { recursive: true });

      const result = copyPlugin('sw', emptyRoot, { targetBaseDir: targetDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain('marketplace.json not found');
    });

    it('should return error when plugin source directory is missing', () => {
      // Create marketplace.json referencing a non-existent source
      const brokenRoot = path.join(tmpDir, 'broken-root');
      fs.mkdirSync(path.join(brokenRoot, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(brokenRoot, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({
          plugins: [{ name: 'sw', source: './plugins/missing', version: '1.0.0' }],
        }),
      );

      const result = copyPlugin('sw', brokenRoot, { targetBaseDir: targetDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source dir not found');
    });

    it('should handle multiple plugins independently', () => {
      const r1 = copyPlugin('sw', specweaveRoot, { targetBaseDir: targetDir });
      const r2 = copyPlugin('sw-frontend', specweaveRoot, { targetBaseDir: targetDir });

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      // Both should be in lockfile
      const lock = readLockfile(tmpDir);
      expect(lock!.skills.sw).toBeDefined();
      expect(lock!.skills['sw-frontend']).toBeDefined();
    });
  });
});
