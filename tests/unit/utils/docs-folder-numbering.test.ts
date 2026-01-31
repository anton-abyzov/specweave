/**
 * Tests for docs folder numbering collision prevention
 *
 * @module tests/unit/utils/docs-folder-numbering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getNextAvailableDocsFolderNumber,
  getUsedDocsFolderNumbers,
  hasDocsFolderCollision,
  formatDocsFolderNumber,
  generateSafeDocsFolderName,
  detectDocsFolderCollisions,
} from '../../../src/utils/docs-folder-numbering.js';

describe('docs-folder-numbering', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-numbering-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getUsedDocsFolderNumbers', () => {
    it('should return empty set for empty directory', () => {
      const result = getUsedDocsFolderNumbers(testDir);
      expect(result.size).toBe(0);
    });

    it('should return empty set for non-existent directory', () => {
      const result = getUsedDocsFolderNumbers('/non/existent/path');
      expect(result.size).toBe(0);
    });

    it('should detect single-digit prefixed folders', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result.size).toBe(2);
    });

    it('should detect double-digit prefixed folders', () => {
      fs.mkdirSync(path.join(testDir, '10-reference'));
      fs.mkdirSync(path.join(testDir, '99-archive'));

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result).toContain(10);
      expect(result).toContain(99);
    });

    it('should ignore non-numbered folders', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, 'architecture')); // No number prefix
      fs.mkdirSync(path.join(testDir, 'README.md')); // File, not folder

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result.size).toBe(1);
      expect(result).toContain(1);
    });

    it('should ignore files with number prefixes', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.writeFileSync(path.join(testDir, '02-START-HERE.md'), 'content');

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result.size).toBe(1);
      expect(result).toContain(1);
    });
  });

  describe('getNextAvailableDocsFolderNumber', () => {
    it('should return 1 for empty directory', () => {
      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(1);
    });

    it('should return next sequential number', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));

      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(3);
    });

    it('should find gap in sequence', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '03-development')); // Gap at 02

      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(2); // Should find the gap
    });

    it('should skip 99 (reserved for archive)', () => {
      fs.mkdirSync(path.join(testDir, '98-reference'));

      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(1); // Should start from 1, not 99
    });

    it('should handle starting from specific number', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '05-features'));

      const result = getNextAvailableDocsFolderNumber(testDir, { startFrom: 5 });
      expect(result).toBe(6); // 5 is taken, so 6
    });

    it('should return 1 for non-existent directory', () => {
      const result = getNextAvailableDocsFolderNumber('/non/existent/path');
      expect(result).toBe(1);
    });
  });

  describe('hasDocsFolderCollision', () => {
    it('should return false when number is available', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));

      const result = hasDocsFolderCollision(testDir, 2);
      expect(result).toBe(false);
    });

    it('should return true when number is already used', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));

      const result = hasDocsFolderCollision(testDir, 1);
      expect(result).toBe(true);
    });

    it('should return false for non-existent directory', () => {
      const result = hasDocsFolderCollision('/non/existent/path', 1);
      expect(result).toBe(false);
    });
  });

  describe('collision scenarios', () => {
    it('should correctly identify duplicate prefix scenario', () => {
      // Simulate the sw-easychamp collision scenario
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));
      fs.mkdirSync(path.join(testDir, '03-development'));
      fs.mkdirSync(path.join(testDir, '04-deployment'));
      fs.mkdirSync(path.join(testDir, '04-workflows')); // COLLISION!

      const used = getUsedDocsFolderNumbers(testDir);
      // Both 04-* folders should register as using prefix 4
      expect(used).toContain(4);

      // But there ARE two folders with prefix 04
      const entries = fs.readdirSync(testDir);
      const prefix04 = entries.filter(e => e.startsWith('04-'));
      expect(prefix04.length).toBe(2); // This confirms the collision exists
    });

    it('should suggest correct next number after collision fix', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));
      fs.mkdirSync(path.join(testDir, '03-development'));
      fs.mkdirSync(path.join(testDir, '04-deployment'));
      fs.mkdirSync(path.join(testDir, '05-workflows'));
      fs.mkdirSync(path.join(testDir, '06-features'));

      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(7);
    });
  });

  describe('formatDocsFolderNumber', () => {
    it('should format single digit as two-digit string', () => {
      expect(formatDocsFolderNumber(1)).toBe('01');
      expect(formatDocsFolderNumber(5)).toBe('05');
      expect(formatDocsFolderNumber(9)).toBe('09');
    });

    it('should format double digit as two-digit string', () => {
      expect(formatDocsFolderNumber(10)).toBe('10');
      expect(formatDocsFolderNumber(42)).toBe('42');
      expect(formatDocsFolderNumber(99)).toBe('99');
    });

    it('should handle zero', () => {
      expect(formatDocsFolderNumber(0)).toBe('00');
    });

    it('should format three-digit numbers as three-digit string', () => {
      expect(formatDocsFolderNumber(100)).toBe('100');
      expect(formatDocsFolderNumber(999)).toBe('999');
    });
  });

  describe('generateSafeDocsFolderName', () => {
    it('should generate folder name with next available number', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));

      const result = generateSafeDocsFolderName(testDir, 'development');
      expect(result).toBe('03-development');
    });

    it('should generate folder name starting from 1 for empty directory', () => {
      const result = generateSafeDocsFolderName(testDir, 'getting-started');
      expect(result).toBe('01-getting-started');
    });

    it('should find gap and use it', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '03-development')); // Gap at 02

      const result = generateSafeDocsFolderName(testDir, 'architecture');
      expect(result).toBe('02-architecture');
    });

    it('should respect startFrom option', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));

      const result = generateSafeDocsFolderName(testDir, 'features', { startFrom: 10 });
      expect(result).toBe('10-features');
    });
  });

  describe('detectDocsFolderCollisions', () => {
    it('should return empty map when no collisions', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));
      fs.mkdirSync(path.join(testDir, '03-development'));

      const result = detectDocsFolderCollisions(testDir);
      expect(result.size).toBe(0);
    });

    it('should detect single collision', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '04-deployment'));
      fs.mkdirSync(path.join(testDir, '04-workflows')); // COLLISION!

      const result = detectDocsFolderCollisions(testDir);
      expect(result.size).toBe(1);
      expect(result.has(4)).toBe(true);
      expect(result.get(4)).toEqual(['04-deployment', '04-workflows']);
    });

    it('should detect multiple collisions', () => {
      fs.mkdirSync(path.join(testDir, '04-deployment'));
      fs.mkdirSync(path.join(testDir, '04-workflows')); // Collision at 04
      fs.mkdirSync(path.join(testDir, '05-features'));
      fs.mkdirSync(path.join(testDir, '05-systems')); // Collision at 05
      fs.mkdirSync(path.join(testDir, '08-reference'));
      fs.mkdirSync(path.join(testDir, '08-imports')); // Collision at 08
      fs.mkdirSync(path.join(testDir, '08-adr')); // Triple collision at 08!

      const result = detectDocsFolderCollisions(testDir);
      expect(result.size).toBe(3);
      expect(result.has(4)).toBe(true);
      expect(result.has(5)).toBe(true);
      expect(result.has(8)).toBe(true);
      expect(result.get(8)?.length).toBe(3);
    });

    it('should return empty map for non-existent directory', () => {
      const result = detectDocsFolderCollisions('/non/existent/path');
      expect(result.size).toBe(0);
    });

    it('should return empty map for empty directory', () => {
      const result = detectDocsFolderCollisions(testDir);
      expect(result.size).toBe(0);
    });
  });

  describe('overflow and edge cases', () => {
    it('should throw error when all slots 1-98 are used', () => {
      // Create folders 01 through 98 (skipping 99 which is reserved)
      for (let i = 1; i <= 98; i++) {
        const prefix = i.toString().padStart(2, '0');
        fs.mkdirSync(path.join(testDir, `${prefix}-folder${i}`));
      }

      // Should throw DocsNumberingOverflowError
      expect(() => getNextAvailableDocsFolderNumber(testDir)).toThrow('overflow');
    });

    it('should handle maxNumber option correctly', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '02-architecture'));
      fs.mkdirSync(path.join(testDir, '03-development'));

      // With maxNumber=3, should throw since 1-3 are used
      expect(() => getNextAvailableDocsFolderNumber(testDir, { maxNumber: 3 })).toThrow('overflow');
    });

    it('should handle findGaps=false option', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '03-development')); // Gap at 02

      const result = getNextAvailableDocsFolderNumber(testDir, { findGaps: false });
      expect(result).toBe(4); // Should return max+1, not fill gap
    });
  });

  describe('3-digit prefix support', () => {
    it('should detect 3-digit prefixed folders', () => {
      fs.mkdirSync(path.join(testDir, '001-platform'));
      fs.mkdirSync(path.join(testDir, '002-architecture'));
      fs.mkdirSync(path.join(testDir, '100-advanced'));

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(100);
    });

    it('should find next available with 3-digit folders', () => {
      fs.mkdirSync(path.join(testDir, '001-platform'));
      fs.mkdirSync(path.join(testDir, '002-architecture'));

      const result = getNextAvailableDocsFolderNumber(testDir);
      expect(result).toBe(3);
    });

    it('should handle mixed 2-digit and 3-digit prefixes', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));
      fs.mkdirSync(path.join(testDir, '002-architecture')); // 3-digit
      fs.mkdirSync(path.join(testDir, '03-development'));

      const result = getUsedDocsFolderNumbers(testDir);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
    });

    it('should format 3-digit numbers correctly', () => {
      fs.mkdirSync(path.join(testDir, '01-platform'));

      // Request starting from 100
      const result = generateSafeDocsFolderName(testDir, 'advanced', { startFrom: 100, maxNumber: 200 });
      expect(result).toBe('100-advanced');
    });
  });
});
