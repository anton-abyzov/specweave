import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

import { describe, it, expect, beforeEach, afterEach, jest } from 'vitest';
import { IncrementNumberManager } from '../../src/core/increment-utils.js';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

describe('IncrementNumberManager', () => {
  let testProjectRoot: string;
  let incrementsDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testProjectRoot = mkdtempSync(path.join(tmpdir(), 'specweave-test-'));
    incrementsDir = path.join(testProjectRoot, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });

    // Clear cache before each test
    IncrementNumberManager.clearCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('T-001: Class Structure', () => {
    it('should export IncrementNumberManager class', () => {
      expect(IncrementNumberManager).toBeDefined();
      expect(typeof IncrementNumberManager).toBe('function');
    });

    it('should have static getNextIncrementNumber method', () => {
      expect(IncrementNumberManager.getNextIncrementNumber).toBeDefined();
      expect(typeof IncrementNumberManager.getNextIncrementNumber).toBe('function');
    });

    it('should have static incrementNumberExists method', () => {
      expect(IncrementNumberManager.incrementNumberExists).toBeDefined();
      expect(typeof IncrementNumberManager.incrementNumberExists).toBe('function');
    });

    it('should have static clearCache method', () => {
      expect(IncrementNumberManager.clearCache).toBeDefined();
      expect(typeof IncrementNumberManager.clearCache).toBe('function');
    });
  });

  describe('T-002: Directory Scanning Logic', () => {
    it('should find increments in main directory', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));
      fs.mkdirSync(path.join(incrementsDir, '0002-test'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0003');
    });

    it('should find increments in _archive directory', () => {
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0005-archived'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0006');
    });

    it('should find highest across all directories', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-main'));

      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0010-archived'));

      const abandonedDir = path.join(incrementsDir, '_abandoned');
      fs.mkdirSync(abandonedDir, { recursive: true });
      fs.mkdirSync(path.join(abandonedDir, '0005-abandoned'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0011'); // Highest is 10 in _archive
    });

    it('should handle 3-digit increment IDs', () => {
      fs.mkdirSync(path.join(incrementsDir, '005-old-format'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0006');
    });

    it('should handle mixed 3-digit and 4-digit formats', () => {
      fs.mkdirSync(path.join(incrementsDir, '005-old'));
      fs.mkdirSync(path.join(incrementsDir, '0010-new'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0011'); // Highest is 10
    });

    it('should gracefully handle missing subdirectories', () => {
      fs.mkdirSync(path.join(incrementsDir, '0002-test'));
      // No _archive, _abandoned, or _paused directories

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0003');
    });

    it('should ignore folders without number prefix', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-valid'));
      fs.mkdirSync(path.join(incrementsDir, 'invalid-folder'));
      fs.mkdirSync(path.join(incrementsDir, '_archive'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0002');
    });

    it('should return 0001 for empty directories', () => {
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0001');
    });
  });

  describe('T-003: getNextIncrementNumber with Caching', () => {
    it('should always return 4-digit format', () => {
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toMatch(/^\d{4}$/);
      expect(result.length).toBe(4);
    });

    it('should return next number after highest', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0033');
    });

    it('should use cache on repeated calls', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      const first = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      expect(first).toBe('0002');

      // Add new increment but cached value should be returned
      fs.mkdirSync(path.join(incrementsDir, '0005-new'));

      const second = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      expect(second).toBe('0002'); // Should still be cached value
    });

    it('should bypass cache when useCache=false', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      const first = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      expect(first).toBe('0002');

      // Add new increment
      fs.mkdirSync(path.join(incrementsDir, '0005-new'));

      const second = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(second).toBe('0006'); // Should see new highest
    });

    it('should use process.cwd() when projectRoot not specified', () => {
      const result = IncrementNumberManager.getNextIncrementNumber();
      expect(result).toMatch(/^\d{4}$/);
    });
  });

  describe('T-004: incrementNumberExists Validation', () => {
    it('should detect increment in main directory', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      const exists = IncrementNumberManager.incrementNumberExists('0032', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should detect increment in _archive directory', () => {
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0029-archived'));

      const exists = IncrementNumberManager.incrementNumberExists('0029', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should detect increment in _abandoned directory', () => {
      const abandonedDir = path.join(incrementsDir, '_abandoned');
      fs.mkdirSync(abandonedDir, { recursive: true });
      fs.mkdirSync(path.join(abandonedDir, '0015-abandoned'));

      const exists = IncrementNumberManager.incrementNumberExists('0015', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should normalize 3-digit to 4-digit for comparison', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      // Check with 3-digit format
      const exists = IncrementNumberManager.incrementNumberExists('032', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should accept string input', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      const exists = IncrementNumberManager.incrementNumberExists('0032', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should accept number input', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      const exists = IncrementNumberManager.incrementNumberExists(32, testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent increment', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      const exists = IncrementNumberManager.incrementNumberExists('9999', testProjectRoot);
      expect(exists).toBe(false);
    });

    it('should handle missing subdirectories gracefully', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));
      // No _archive, _abandoned, or _paused directories

      const exists = IncrementNumberManager.incrementNumberExists('0001', testProjectRoot);
      expect(exists).toBe(true);
    });
  });

  describe('T-005: Cache Management', () => {
    it('should clear all cached values', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      // Populate cache
      IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);

      // Clear cache
      IncrementNumberManager.clearCache();

      // Add new increment
      fs.mkdirSync(path.join(incrementsDir, '0005-new'));

      // Should see new value (cache was cleared)
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      expect(result).toBe('0006');
    });
  });

  describe('T-005: Edge Cases', () => {
    it('should handle very large increment numbers', () => {
      fs.mkdirSync(path.join(incrementsDir, '9998-large'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('9999');
    });

    it('should handle increments with complex names', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-complex-feature-name-with-dashes'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0002');
    });

    it('should ignore non-directory entries', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));
      fs.writeFileSync(path.join(incrementsDir, '0999-fake-file.txt'), 'test');

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0002'); // Should ignore the file
    });
  });
});
