import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IncrementNumberManager } from '../../src/core/increment/increment-utils.js';
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

  });

  describe('T-002: Directory Scanning Logic (Gap-Filling v0.33.1+)', () => {
    // NOTE: Tests updated for gap-filling behavior (v0.33.1+)
    // Gap-filling finds first available number from 0001, not highest+1

    it('should find increments in main directory', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));
      fs.mkdirSync(path.join(incrementsDir, '0002-test'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0003'); // Sequential, no gaps
    });

    it('should find increments in _archive directory and fill gaps', () => {
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0005-archived'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: finds first gap from 0001 → 0001 is available
      expect(result).toBe('0001');
    });

    it('should fill first gap across all directories', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-main'));

      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0010-archived'));

      const abandonedDir = path.join(incrementsDir, '_abandoned');
      fs.mkdirSync(abandonedDir, { recursive: true });
      fs.mkdirSync(path.join(abandonedDir, '0005-abandoned'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 0001 taken → first gap is 0002
      expect(result).toBe('0002');
    });

    it('should handle 3-digit increment IDs and fill gaps', () => {
      fs.mkdirSync(path.join(incrementsDir, '005-old-format'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 0005 taken → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should handle mixed 3-digit and 4-digit formats with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '005-old'));
      fs.mkdirSync(path.join(incrementsDir, '0010-new'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 0005 and 0010 taken → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should gracefully handle missing subdirectories', () => {
      fs.mkdirSync(path.join(incrementsDir, '0002-test'));
      // No _archive, _abandoned, or _paused directories

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 0002 taken → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should ignore folders without number prefix', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-valid'));
      fs.mkdirSync(path.join(incrementsDir, 'invalid-folder'));
      fs.mkdirSync(path.join(incrementsDir, '_archive'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0002'); // 0001 taken, 0002 is first gap
    });

    it('should return 0001 for empty directories', () => {
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0001');
    });

    it('should return sequential number when no gaps exist', () => {
      // Create consecutive increments with no gaps
      fs.mkdirSync(path.join(incrementsDir, '0001-first'));
      fs.mkdirSync(path.join(incrementsDir, '0002-second'));
      fs.mkdirSync(path.join(incrementsDir, '0003-third'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toBe('0004'); // No gaps, so highest+1
    });
  });

  describe('T-003: getNextIncrementNumber with Caching (Gap-Filling v0.33.1+)', () => {
    it('should always return 4-digit format', () => {
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      expect(result).toMatch(/^\d{4}$/);
      expect(result.length).toBe(4);
    });

    it('should fill gap when single high number exists', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032-test'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 0032 exists → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should always scan fresh (no caching) - v0.30.21', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      const first = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      expect(first).toBe('0002');

      // Second call scans fresh - still returns 0002 because no new increment created
      const second = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      expect(second).toBe('0002'); // Same - no new increments on disk

      // Create new increment, should see it and still find next gap
      fs.mkdirSync(path.join(incrementsDir, '0005-new'));
      const third = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      // Gap-filling: 0001, 0005 exist → first gap is 0002 (still available)
      expect(third).toBe('0002');
    });

    it('should ignore useCache parameter (deprecated) - v0.30.21', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      // Both calls should behave the same regardless of useCache
      const withCache = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      const withoutCache = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);

      expect(withCache).toBe('0002');
      expect(withoutCache).toBe('0002'); // Same because it always scans fresh
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

  describe('T-005: Cache Management (Gap-Filling v0.33.1+)', () => {
    it('should clear all cached values', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-test'));

      // Get next number
      IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);

      // Add new increment
      fs.mkdirSync(path.join(incrementsDir, '0005-new'));

      // Should see new value (always fresh scan, no caching)
      // Gap-filling: 0001 and 0005 exist → first gap is 0002
      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, true);
      expect(result).toBe('0002');
    });
  });

  describe('T-005: Edge Cases (Gap-Filling v0.33.1+)', () => {
    it('should handle very large increment numbers with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '9998-large'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
      // Gap-filling: 9998 exists → first gap is 0001
      expect(result).toBe('0001');
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

  describe('T-006: External Increment E-Suffix (v0.32.0) with Gap-Filling (v0.33.1+)', () => {
    it('should recognize E suffix increments when scanning and fill gaps', () => {
      fs.mkdirSync(path.join(incrementsDir, '0010E-external-fix'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      // Gap-filling: 0010E exists (base 10) → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should return 0002 when 0001E exists (CRITICAL collision prevention)', () => {
      // When external increment 0001E exists, generating new internal should return 0002
      // This is the CORE collision prevention scenario
      fs.mkdirSync(path.join(incrementsDir, '0001E-external-item'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      // 0001E uses base number 1 → next available is 0002
      expect(result).toBe('0002');
    });

    it('should return 0002E when 0001 exists (CRITICAL collision prevention)', () => {
      // When internal increment 0001 exists, generating new external should return 0002E
      fs.mkdirSync(path.join(incrementsDir, '0001-internal-item'));

      const result = IncrementNumberManager.getNextExternalIncrementNumber(testProjectRoot);
      // 0001 uses base number 1 → next available is 0002 → returns 0002E
      expect(result).toBe('0002E');
    });

    it('should handle mixed internal and external increments with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0005-internal'));
      fs.mkdirSync(path.join(incrementsDir, '0010E-external'));
      fs.mkdirSync(path.join(incrementsDir, '0008-another'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      // Gap-filling: 5, 8, 10 exist → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should detect E suffix increment existence', () => {
      fs.mkdirSync(path.join(incrementsDir, '0032E-external-fix'));

      const exists = IncrementNumberManager.incrementNumberExists('0032', testProjectRoot);
      expect(exists).toBe(true);
    });

    it('should find E suffix increments in _archive and fill gaps', () => {
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0015E-archived-external'));

      const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot);
      // Gap-filling: 0015E exists in _archive → first gap is 0001
      expect(result).toBe('0001');
    });

    it('should generate external increment number with E suffix and gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0010-test'));

      const result = IncrementNumberManager.getNextExternalIncrementNumber(testProjectRoot);
      // Gap-filling: 0010 exists → first gap is 0001 → returns 0001E
      expect(result).toBe('0001E');
    });

    it('should generate full increment ID for internal items with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0005-existing'));

      const result = IncrementNumberManager.generateIncrementId('new-feature', { projectRoot: testProjectRoot });
      // Gap-filling: 0005 exists → first gap is 0001
      expect(result).toBe('0001-new-feature');
    });

    it('should generate full increment ID for external items with E suffix and gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0005-existing'));

      const result = IncrementNumberManager.generateIncrementId('dora-fix', {
        isExternal: true,
        projectRoot: testProjectRoot
      });
      // Gap-filling: 0005 exists → first gap is 0001 → returns 0001E-...
      expect(result).toBe('0001E-dora-fix');
    });

    it('should correctly identify external increments', () => {
      expect(IncrementNumberManager.isExternalIncrement('0033E-dora-fix')).toBe(true);
      expect(IncrementNumberManager.isExternalIncrement('033E-short')).toBe(true);
      expect(IncrementNumberManager.isExternalIncrement('0033-internal')).toBe(false);
      expect(IncrementNumberManager.isExternalIncrement('invalid')).toBe(false);
    });

    it('should extract number from internal increment', () => {
      expect(IncrementNumberManager.extractNumber('0033-feature')).toBe('0033');
      expect(IncrementNumberManager.extractNumber('033-short')).toBe('0033');
    });

    it('should extract number from external increment', () => {
      expect(IncrementNumberManager.extractNumber('0033E-dora-fix')).toBe('0033');
      expect(IncrementNumberManager.extractNumber('033E-short')).toBe('0033');
    });

    it('should return null for invalid increment IDs', () => {
      expect(IncrementNumberManager.extractNumber('invalid')).toBe(null);
      expect(IncrementNumberManager.extractNumber('E-no-number')).toBe(null);
      expect(IncrementNumberManager.extractNumber('')).toBe(null);
    });
  });

  describe('T-007: Duplicate Detection and Prevention (v0.33.0)', () => {
    it('should find duplicates with same base number', () => {
      fs.mkdirSync(path.join(incrementsDir, '0121-feature-a'));
      fs.mkdirSync(path.join(incrementsDir, '0121-feature-b'));

      const duplicates = IncrementNumberManager.findDuplicates('0121', testProjectRoot);
      expect(duplicates).toHaveLength(2);
      expect(duplicates).toContain('0121-feature-a (active)');
      expect(duplicates).toContain('0121-feature-b (active)');
    });

    it('should find duplicates across directories', () => {
      fs.mkdirSync(path.join(incrementsDir, '0050-active'));

      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0050-archived'));

      const duplicates = IncrementNumberManager.findDuplicates('0050', testProjectRoot);
      expect(duplicates).toHaveLength(2);
      expect(duplicates).toContain('0050-active (active)');
      expect(duplicates).toContain('0050-archived (_archive)');
    });

    it('should treat 0001 and 0001E as the same base number', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-internal'));
      fs.mkdirSync(path.join(incrementsDir, '0001E-external'));

      const duplicates = IncrementNumberManager.findDuplicates('0001', testProjectRoot);
      expect(duplicates).toHaveLength(2);
      expect(duplicates.some(d => d.includes('0001-internal'))).toBe(true);
      expect(duplicates.some(d => d.includes('0001E-external'))).toBe(true);
    });

    it('should return empty array for unique numbers', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-only'));

      const duplicates = IncrementNumberManager.findDuplicates('0099', testProjectRoot);
      expect(duplicates).toHaveLength(0);
    });

    it('should validate unique increment IDs', () => {
      fs.mkdirSync(path.join(incrementsDir, '0050-existing'));

      // Should throw for duplicate
      expect(() => {
        IncrementNumberManager.validateUnique('0050-new-feature', testProjectRoot);
      }).toThrow('Duplicate increment number detected');
    });

    it('should allow unique increment IDs', () => {
      fs.mkdirSync(path.join(incrementsDir, '0050-existing'));

      // Should NOT throw for different number
      expect(() => {
        IncrementNumberManager.validateUnique('0051-new-feature', testProjectRoot);
      }).not.toThrow();
    });

    it('should block 0001E when 0001 exists (same base)', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001-internal'));

      expect(() => {
        IncrementNumberManager.validateUnique('0001E-external', testProjectRoot);
      }).toThrow('Duplicate increment number detected');
    });

    it('should block 0001 when 0001E exists (same base)', () => {
      fs.mkdirSync(path.join(incrementsDir, '0001E-external'));

      expect(() => {
        IncrementNumberManager.validateUnique('0001-internal', testProjectRoot);
      }).toThrow('Duplicate increment number detected');
    });

    it('should generate guaranteed unique ID with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0010-existing'));

      const id = IncrementNumberManager.generateUniqueIncrementId('new-feature', {
        projectRoot: testProjectRoot
      });

      // Gap-filling: 0010 exists → first gap is 0001
      expect(id).toBe('0001-new-feature');
      // Verify it's actually unique
      expect(() => {
        IncrementNumberManager.validateUnique(id, testProjectRoot);
      }).not.toThrow();
    });

    it('should generate unique external ID with gap-filling', () => {
      fs.mkdirSync(path.join(incrementsDir, '0010-existing'));

      const id = IncrementNumberManager.generateUniqueIncrementId('fix', {
        isExternal: true,
        projectRoot: testProjectRoot
      });

      // Gap-filling: 0010 exists → first gap is 0001 → returns 0001E-...
      expect(id).toBe('0001E-fix');
    });

    it('should throw for invalid increment ID format', () => {
      expect(() => {
        IncrementNumberManager.validateUnique('invalid-no-number', testProjectRoot);
      }).toThrow('Invalid increment ID format');
    });
  });

  describe('T-008: Per-Project Collision Prevention (v1.0.19)', () => {
    let specsDir: string;

    beforeEach(() => {
      // Create living docs specs directory structure
      specsDir = path.join(testProjectRoot, '.specweave', 'docs', 'internal', 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
    });

    it('should have getNextIncrementNumberForProject method', () => {
      expect(IncrementNumberManager.getNextIncrementNumberForProject).toBeDefined();
      expect(typeof IncrementNumberManager.getNextIncrementNumberForProject).toBe('function');
    });

    it('should return 0001 when project has no features', () => {
      const projectDir = path.join(specsDir, 'my-project');
      fs.mkdirSync(projectDir, { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'my-project');
      expect(result).toBe('0001');
    });

    it('should skip number when FS-ID exists in project', () => {
      // Create project with FS-001 feature
      const projectDir = path.join(specsDir, 'my-project');
      fs.mkdirSync(path.join(projectDir, 'FS-001'), { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'my-project');
      // Should skip 0001 because FS-001 exists, return 0002
      expect(result).toBe('0002');
    });

    it('should skip number when FS-XXXE (external) exists in project', () => {
      // Create project with FS-001E external feature (from import)
      const projectDir = path.join(specsDir, 'my-project');
      fs.mkdirSync(path.join(projectDir, 'FS-001E'), { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'my-project');
      // Should skip 0001 because FS-001E exists (same base number), return 0002
      expect(result).toBe('0002');
    });

    it('should find first available number when multiple features exist', () => {
      // Create project with FS-001, FS-002, FS-004 (gap at 003)
      const projectDir = path.join(specsDir, 'my-project');
      fs.mkdirSync(path.join(projectDir, 'FS-001'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'FS-002'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'FS-004'), { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'my-project');
      // Should return 0003 (fills gap)
      expect(result).toBe('0003');
    });

    it('should prevent collision between internal and external (core scenario)', () => {
      // SCENARIO: Project ec-web-ui has imported external issue creating FS-001E
      // User creates internal increment - should skip 0001 to prevent collision
      const projectDir = path.join(specsDir, 'ec-web-ui');
      fs.mkdirSync(path.join(projectDir, 'FS-001E'), { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'ec-web-ui');
      // Must return 0002, NOT 0001 (which would collide with FS-001E's base number)
      expect(result).toBe('0002');
    });

    it('should generateIncrementId with projectId to prevent collision', () => {
      // Create project with FS-001E (external feature)
      const projectDir = path.join(specsDir, 'ec-web-ui');
      fs.mkdirSync(path.join(projectDir, 'FS-001E'), { recursive: true });

      const id = IncrementNumberManager.generateIncrementId('new-feature', {
        projectRoot: testProjectRoot,
        projectId: 'ec-web-ui'
      });

      // Should be 0002-new-feature, NOT 0001-new-feature
      expect(id).toBe('0002-new-feature');
    });

    it('should generateIncrementId without projectId to use global (backward compat)', () => {
      // Create project with FS-001E (external feature)
      const projectDir = path.join(specsDir, 'ec-web-ui');
      fs.mkdirSync(path.join(projectDir, 'FS-001E'), { recursive: true });

      // Without projectId, uses global increment numbering (no feature collision check)
      const id = IncrementNumberManager.generateIncrementId('new-feature', {
        projectRoot: testProjectRoot
        // projectId NOT provided - backward compatible behavior
      });

      // Global behavior: returns 0001 (no check against feature space)
      expect(id).toBe('0001-new-feature');
    });

    it('should handle project that does not exist yet', () => {
      // Project folder doesn't exist - no collision possible
      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'non-existent-project');
      expect(result).toBe('0001');
    });

    it('should check archived features for collision', () => {
      // Create project with archived FS-001
      const projectDir = path.join(specsDir, 'my-project');
      fs.mkdirSync(path.join(projectDir, '_archive', 'FS-001'), { recursive: true });

      const result = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'my-project');
      // Should skip 0001 because FS-001 exists in _archive
      expect(result).toBe('0002');
    });

    it('should work with multiple projects independently', () => {
      // Project A has FS-001, FS-002
      const projectA = path.join(specsDir, 'project-a');
      fs.mkdirSync(path.join(projectA, 'FS-001'), { recursive: true });
      fs.mkdirSync(path.join(projectA, 'FS-002'), { recursive: true });

      // Project B has FS-001E (external)
      const projectB = path.join(specsDir, 'project-b');
      fs.mkdirSync(path.join(projectB, 'FS-001E'), { recursive: true });

      // Project A: next should be 0003
      const resultA = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'project-a');
      expect(resultA).toBe('0003');

      // Project B: next should be 0002 (skips 0001 due to FS-001E)
      const resultB = IncrementNumberManager.getNextIncrementNumberForProject(testProjectRoot, 'project-b');
      expect(resultB).toBe('0002');
    });
  });
});
