/**
 * Unit tests for Platform Suffix Support in IncrementNumberManager
 *
 * Tests G/J/A suffix recognition and generation (v1.0.272).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncrementNumberManager } from '../../src/core/increment/increment-utils.js';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

describe('IncrementNumberManager — Platform Suffixes (G/J/A)', () => {
  let testProjectRoot: string;
  let incrementsDir: string;

  beforeEach(() => {
    testProjectRoot = mkdtempSync(path.join(tmpdir(), 'specweave-suffix-test-'));
    incrementsDir = path.join(testProjectRoot, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('isExternalIncrement()', () => {
    it('should return true for G suffix', () => {
      expect(IncrementNumberManager.isExternalIncrement('0042G-auth-flow')).toBe(true);
    });

    it('should return true for J suffix', () => {
      expect(IncrementNumberManager.isExternalIncrement('0042J-payment-flow')).toBe(true);
    });

    it('should return true for A suffix', () => {
      expect(IncrementNumberManager.isExternalIncrement('0042A-ci-pipeline')).toBe(true);
    });

    it('should return true for legacy E suffix', () => {
      expect(IncrementNumberManager.isExternalIncrement('0042E-legacy-import')).toBe(true);
    });

    it('should return false for internal increments', () => {
      expect(IncrementNumberManager.isExternalIncrement('0042-feature')).toBe(false);
    });
  });

  describe('extractNumber()', () => {
    it('should extract number from G-suffixed increment', () => {
      expect(IncrementNumberManager.extractNumber('0042G-auth-flow')).toBe('0042');
    });

    it('should extract number from J-suffixed increment', () => {
      expect(IncrementNumberManager.extractNumber('0042J-payment-flow')).toBe('0042');
    });

    it('should extract number from A-suffixed increment', () => {
      expect(IncrementNumberManager.extractNumber('0042A-ci-pipeline')).toBe('0042');
    });

    it('should extract number from E-suffixed increment', () => {
      expect(IncrementNumberManager.extractNumber('0042E-legacy')).toBe('0042');
    });

    it('should extract number from unsuffixed increment', () => {
      expect(IncrementNumberManager.extractNumber('0042-feature')).toBe('0042');
    });

    it('should return null for invalid ID', () => {
      expect(IncrementNumberManager.extractNumber('invalid')).toBeNull();
    });
  });

  describe('incrementNumberExists()', () => {
    it('should detect G-suffixed increment', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001G-github-issue'));
      expect(IncrementNumberManager.incrementNumberExists('0001', testProjectRoot)).toBe(true);
    });

    it('should detect J-suffixed increment', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001J-jira-issue'));
      expect(IncrementNumberManager.incrementNumberExists('0001', testProjectRoot)).toBe(true);
    });

    it('should detect A-suffixed increment', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001A-ado-item'));
      expect(IncrementNumberManager.incrementNumberExists('0001', testProjectRoot)).toBe(true);
    });

    it('should detect E-suffixed increment (backwards compat)', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001E-legacy'));
      expect(IncrementNumberManager.incrementNumberExists('0001', testProjectRoot)).toBe(true);
    });
  });

  describe('getAllIncrementNumbers() — shared namespace', () => {
    it('should treat G-suffixed and base number as same namespace', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001G-github-issue'));
      // Next number should skip 0001 since 0001G occupies the slot
      const next = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      expect(next).toBe('0002');
    });

    it('should treat J-suffixed and base number as same namespace', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001J-jira-issue'));
      const next = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      expect(next).toBe('0002');
    });

    it('should handle mixed suffixes in same namespace', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-internal'));
      fs.mkdirSync(path.join(incrementsDir, '0002G-github'));
      fs.mkdirSync(path.join(incrementsDir, '0003J-jira'));
      const next = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      expect(next).toBe('0004');
    });
  });

  describe('getNextPlatformIncrementNumber()', () => {
    it('should return number with G suffix for github', () => {
      const id = IncrementNumberManager.getNextPlatformIncrementNumber(testProjectRoot, 'github');
      expect(id).toBe('0001G');
    });

    it('should return number with J suffix for jira', () => {
      const id = IncrementNumberManager.getNextPlatformIncrementNumber(testProjectRoot, 'jira');
      expect(id).toBe('0001J');
    });

    it('should return number with A suffix for ado', () => {
      const id = IncrementNumberManager.getNextPlatformIncrementNumber(testProjectRoot, 'ado');
      expect(id).toBe('0001A');
    });

    it('should skip occupied numbers', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-internal'));
      const id = IncrementNumberManager.getNextPlatformIncrementNumber(testProjectRoot, 'github');
      expect(id).toBe('0002G');
    });
  });

  describe('generateIncrementId() with platformSuffix', () => {
    it('should generate ID with G suffix', () => {
      const id = IncrementNumberManager.generateIncrementId('fix-login', {
        platformSuffix: 'G',
        projectRoot: testProjectRoot,
      });
      expect(id).toBe('0001G-fix-login');
    });

    it('should generate ID with J suffix', () => {
      const id = IncrementNumberManager.generateIncrementId('payment-flow', {
        platformSuffix: 'J',
        projectRoot: testProjectRoot,
      });
      expect(id).toBe('0001J-payment-flow');
    });

    it('should generate ID with A suffix', () => {
      const id = IncrementNumberManager.generateIncrementId('ci-pipeline', {
        platformSuffix: 'A',
        projectRoot: testProjectRoot,
      });
      expect(id).toBe('0001A-ci-pipeline');
    });

    it('should prefer platformSuffix over isExternal', () => {
      const id = IncrementNumberManager.generateIncrementId('feature', {
        isExternal: true,
        platformSuffix: 'G',
        projectRoot: testProjectRoot,
      });
      // platformSuffix G takes priority over isExternal E
      expect(id).toBe('0001G-feature');
    });

    it('should fall back to E when isExternal=true without platformSuffix', () => {
      const id = IncrementNumberManager.generateIncrementId('feature', {
        isExternal: true,
        projectRoot: testProjectRoot,
      });
      expect(id).toBe('0001E-feature');
    });

    it('should generate unsuffixed ID when neither is set', () => {
      const id = IncrementNumberManager.generateIncrementId('feature', {
        projectRoot: testProjectRoot,
      });
      expect(id).toBe('0001-feature');
    });
  });

  describe('findDuplicates() with suffixes', () => {
    it('should find G-suffixed duplicates', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001G-github-issue'));
      const dupes = IncrementNumberManager.findDuplicates('0001', testProjectRoot);
      expect(dupes.length).toBe(1);
      expect(dupes[0]).toContain('0001G-github-issue');
    });

    it('should find duplicates across suffix types', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-internal'));
      fs.mkdirSync(path.join(incrementsDir, '0002G-github'));
      // 0001 has one duplicate (the internal one)
      const dupes1 = IncrementNumberManager.findDuplicates('0001', testProjectRoot);
      expect(dupes1.length).toBe(1);
      // 0002 has one duplicate (the github one)
      const dupes2 = IncrementNumberManager.findDuplicates('0002', testProjectRoot);
      expect(dupes2.length).toBe(1);
    });

    it('should find duplicates in archive', () => {
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0001G-old-import'));
      const dupes = IncrementNumberManager.findDuplicates('0001', testProjectRoot);
      expect(dupes.length).toBe(1);
      expect(dupes[0]).toContain('_archive');
    });
  });
});
