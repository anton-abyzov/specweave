/**
 * Tests for Windows Long Path Support Utilities
 *
 * @module tests/unit/core/lazy-loading/path-utils
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  isWindows,
  isLongPathEnabled,
  toLongPath,
  fromLongPath,
  mkdirSafe,
  copyFileSafe,
  existsSafe,
  readdirSafe,
  rmSafe,
  calculatePathLength,
  wouldExceedMaxPath,
  validatePathLength,
  copyDirSafe,
  getPathInfo,
  getLongPathRegistryDoc,
  WIN_MAX_PATH,
  WIN_LONG_PATH_PREFIX,
} from '../../../../src/core/lazy-loading/path-utils.js';

// Test directory
const TEST_DIR = path.join(os.tmpdir(), 'specweave-path-test');

describe('Path Utilities', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Platform Detection', () => {
    it('should correctly identify platform', () => {
      expect(isWindows()).toBe(os.platform() === 'win32');
    });

    it('should report long path status', () => {
      // On non-Windows, should return true (not applicable)
      if (!isWindows()) {
        expect(isLongPathEnabled()).toBe(true);
      } else {
        // On Windows, returns boolean based on registry
        expect(typeof isLongPathEnabled()).toBe('boolean');
      }
    });
  });

  describe('toLongPath', () => {
    it('should return unchanged path on non-Windows', () => {
      if (!isWindows()) {
        const testPath = '/some/path/to/file';
        expect(toLongPath(testPath)).toBe(testPath);
      }
    });

    it('should not modify short paths on Windows', () => {
      if (isWindows()) {
        const shortPath = 'C:\\short\\path';
        const result = toLongPath(shortPath);
        // Should be absolute but not have prefix for short paths
        expect(result).not.toContain(WIN_LONG_PATH_PREFIX);
      }
    });

    it('should add prefix for long paths on Windows', () => {
      if (isWindows()) {
        // Create a path longer than 260 chars
        const longSegment = 'x'.repeat(50);
        const segments = Array(10).fill(longSegment);
        const longPath = 'C:\\' + segments.join('\\');

        expect(longPath.length).toBeGreaterThan(WIN_MAX_PATH);

        const result = toLongPath(longPath);
        expect(result.startsWith(WIN_LONG_PATH_PREFIX)).toBe(true);
      }
    });

    it('should not double-prefix', () => {
      const prefixedPath = WIN_LONG_PATH_PREFIX + 'C:\\some\\path';
      const result = toLongPath(prefixedPath);
      expect(result).toBe(prefixedPath);
    });
  });

  describe('fromLongPath', () => {
    it('should remove long path prefix', () => {
      const longPath = WIN_LONG_PATH_PREFIX + 'C:\\some\\path';
      expect(fromLongPath(longPath)).toBe('C:\\some\\path');
    });

    it('should return unchanged path without prefix', () => {
      const normalPath = 'C:\\some\\path';
      expect(fromLongPath(normalPath)).toBe(normalPath);
    });
  });

  describe('Safe File Operations', () => {
    it('mkdirSafe should create directory', () => {
      const testDir = path.join(TEST_DIR, 'new-dir', 'nested');
      mkdirSafe(testDir);
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('copyFileSafe should copy file', () => {
      const srcFile = path.join(TEST_DIR, 'source.txt');
      const destFile = path.join(TEST_DIR, 'dest', 'copied.txt');

      fs.writeFileSync(srcFile, 'test content');
      copyFileSafe(srcFile, destFile);

      expect(fs.existsSync(destFile)).toBe(true);
      expect(fs.readFileSync(destFile, 'utf-8')).toBe('test content');
    });

    it('existsSafe should check existence', () => {
      const existing = path.join(TEST_DIR, 'exists.txt');
      fs.writeFileSync(existing, 'test');

      expect(existsSafe(existing)).toBe(true);
      expect(existsSafe(path.join(TEST_DIR, 'nonexistent'))).toBe(false);
    });

    it('readdirSafe should list directory contents', () => {
      fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), 'content');
      fs.writeFileSync(path.join(TEST_DIR, 'file2.txt'), 'content');

      const contents = readdirSafe(TEST_DIR);
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
    });

    it('rmSafe should remove files and directories', () => {
      const testFile = path.join(TEST_DIR, 'to-remove.txt');
      fs.writeFileSync(testFile, 'content');

      expect(fs.existsSync(testFile)).toBe(true);
      rmSafe(testFile);
      expect(fs.existsSync(testFile)).toBe(false);
    });
  });

  describe('Path Length Utilities', () => {
    it('calculatePathLength should return correct length', () => {
      const length = calculatePathLength('/foo', 'bar', 'baz.txt');
      expect(length).toBe(path.join('/foo', 'bar', 'baz.txt').length);
    });

    it('wouldExceedMaxPath should detect long paths on Windows', () => {
      if (isWindows()) {
        const longSegment = 'x'.repeat(100);
        const segments = Array(5).fill(longSegment);
        expect(wouldExceedMaxPath('C:\\', ...segments)).toBe(true);
      }
    });

    it('wouldExceedMaxPath should return false for short paths', () => {
      expect(wouldExceedMaxPath('/short', 'path')).toBe(false);
    });
  });

  describe('validatePathLength', () => {
    it('should validate short paths as valid', () => {
      const result = validatePathLength('/short/path');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should always return valid on non-Windows', () => {
      if (!isWindows()) {
        const longPath = '/' + 'x'.repeat(500);
        const result = validatePathLength(longPath);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('copyDirSafe', () => {
    it('should copy directory recursively', () => {
      // Create source structure
      const srcDir = path.join(TEST_DIR, 'src-dir');
      const subDir = path.join(srcDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(subDir, 'file2.txt'), 'content2');

      // Copy
      const destDir = path.join(TEST_DIR, 'dest-dir');
      const result = copyDirSafe(srcDir, destDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf-8')).toBe('content1');
    });

    it('should fail for non-existent source', () => {
      const result = copyDirSafe(
        path.join(TEST_DIR, 'nonexistent'),
        path.join(TEST_DIR, 'dest')
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getPathInfo', () => {
    it('should return detailed path information', () => {
      const testPath = path.join(TEST_DIR, 'test');
      const info = getPathInfo(testPath);

      expect(info.original).toBe(testPath);
      expect(info.absolute).toBe(path.resolve(testPath));
      expect(typeof info.length).toBe('number');
      expect(typeof info.wouldNeedLongPath).toBe('boolean');
      expect(typeof info.longPathEnabled).toBe('boolean');
    });
  });

  describe('getLongPathRegistryDoc', () => {
    it('should return documentation string', () => {
      const doc = getLongPathRegistryDoc();
      expect(doc).toContain('Windows Long Path Support');
      expect(doc).toContain('LongPathsEnabled');
      expect(doc).toContain('Registry');
    });
  });
});

describe('Edge Cases', () => {
  it('should handle empty path', () => {
    const info = getPathInfo('');
    expect(info.length).toBeGreaterThan(0); // resolved to cwd
  });

  it('should handle relative paths', () => {
    const info = getPathInfo('./relative/path');
    expect(path.isAbsolute(info.absolute)).toBe(true);
  });
});
