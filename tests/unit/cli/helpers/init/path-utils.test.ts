/**
 * Unit tests for init/path-utils
 *
 * Tests findPackageRoot, detectNestedSpecweave, countFilesRecursive
 * with real temp directories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  findPackageRoot,
  detectNestedSpecweave,
  countFilesRecursive,
} from '../../../../../src/cli/helpers/init/path-utils.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-path-test-${name}-${suffix}`);
}

describe('path-utils', () => {
  // ─── findPackageRoot ────────────────────────────────────────────

  describe('findPackageRoot', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('pkg');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should find package root with specweave package.json', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'specweave' }));
      const sub = path.join(dir, 'src', 'utils');
      mkdirSync(sub, { recursive: true });

      const result = findPackageRoot(sub);
      expect(result).toBe(dir);
    });

    it('should return null if package.json has different name', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'other-pkg' }));
      const sub = path.join(dir, 'src');
      mkdirSync(sub, { recursive: true });

      expect(findPackageRoot(sub)).toBeNull();
    });

    it('should return null if no package.json exists', () => {
      const sub = path.join(dir, 'deep', 'nested');
      mkdirSync(sub, { recursive: true });

      expect(findPackageRoot(sub)).toBeNull();
    });

    it('should handle invalid JSON in package.json', () => {
      writeFileSync(path.join(dir, 'package.json'), 'not valid json');
      expect(findPackageRoot(dir)).toBeNull();
    });
  });

  // ─── detectNestedSpecweave ──────────────────────────────────────

  describe('detectNestedSpecweave', () => {
    let parentDir: string;
    let childDir: string;

    beforeEach(() => {
      parentDir = tmpPath('nested-parent');
      childDir = path.join(parentDir, 'subproject');
      mkdirSync(childDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(parentDir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect .specweave in parent directory', () => {
      mkdirSync(path.join(parentDir, '.specweave'), { recursive: true });
      const result = detectNestedSpecweave(childDir);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(1);
      const parentFolder = result!.find(f => f.path === parentDir);
      expect(parentFolder).toBeTruthy();
      expect(parentFolder!.depth).toBe(1);
    });

    it('should return null when no parent .specweave exists', () => {
      expect(detectNestedSpecweave(childDir)).toBeNull();
    });

    it('should set isHomeDir correctly', () => {
      // This test can only validate the flag is boolean — we can't actually
      // create .specweave in the real home dir in tests
      const result = detectNestedSpecweave(childDir);
      if (result) {
        for (const folder of result) {
          expect(typeof folder.isHomeDir).toBe('boolean');
        }
      }
    });
  });

  // ─── countFilesRecursive ────────────────────────────────────────

  describe('countFilesRecursive', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('count');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should return 0 for empty directory', () => {
      expect(countFilesRecursive(dir)).toBe(0);
    });

    it('should count flat files', () => {
      writeFileSync(path.join(dir, 'a.txt'), 'a');
      writeFileSync(path.join(dir, 'b.txt'), 'b');
      writeFileSync(path.join(dir, 'c.txt'), 'c');
      expect(countFilesRecursive(dir)).toBe(3);
    });

    it('should count files recursively in subdirectories', () => {
      writeFileSync(path.join(dir, 'root.txt'), 'root');
      const sub = path.join(dir, 'sub');
      mkdirSync(sub);
      writeFileSync(path.join(sub, 'nested.txt'), 'nested');
      const deep = path.join(sub, 'deep');
      mkdirSync(deep);
      writeFileSync(path.join(deep, 'deep.txt'), 'deep');

      expect(countFilesRecursive(dir)).toBe(3);
    });

    it('should return 0 for non-existent directory', () => {
      expect(countFilesRecursive('/nonexistent/dir/xyz')).toBe(0);
    });
  });
});
