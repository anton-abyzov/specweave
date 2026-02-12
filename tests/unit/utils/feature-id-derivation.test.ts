/**
 * Tests for feature ID derivation utility
 *
 * Validates the 1:1 mapping from increment IDs to feature IDs:
 * - deriveFeatureId: NNNN-name -> FS-XXX
 * - extractIncrementNumber: NNNN-name -> number
 * - isValidFeatureId: validates FS-XXX format
 * - isExternalFeatureId: checks E suffix
 *
 * @module tests/unit/utils/feature-id-derivation
 */

import { describe, it, expect } from 'vitest';
import {
  deriveFeatureId,
  extractIncrementNumber,
  isValidFeatureId,
  isExternalFeatureId,
} from '../../../src/utils/feature-id-derivation.js';

describe('feature-id-derivation', () => {
  describe('deriveFeatureId', () => {
    it('should derive FS-081 from 0081-ado-repo-cloning', () => {
      expect(deriveFeatureId('0081-ado-repo-cloning')).toBe('FS-081');
    });

    it('should pad single-digit numbers to 3 digits', () => {
      expect(deriveFeatureId('0001-project-setup')).toBe('FS-001');
    });

    it('should pad double-digit numbers to 3 digits', () => {
      expect(deriveFeatureId('0042-some-feature')).toBe('FS-042');
    });

    it('should derive FS-100 from 0100-some-feature', () => {
      expect(deriveFeatureId('0100-some-feature')).toBe('FS-100');
    });

    it('should preserve 4-digit numbers naturally (no extra padding)', () => {
      expect(deriveFeatureId('1000-future-feature')).toBe('FS-1000');
    });

    it('should handle 4-digit numbers above 1000', () => {
      expect(deriveFeatureId('1234-big-feature')).toBe('FS-1234');
    });

    it('should derive external feature ID with E suffix', () => {
      expect(deriveFeatureId('0111E-external-issue')).toBe('FS-111E');
    });

    it('should derive external feature ID with padding for small numbers', () => {
      expect(deriveFeatureId('0005E-external-task')).toBe('FS-005E');
    });

    it('should derive external feature ID for 4-digit numbers', () => {
      expect(deriveFeatureId('1000E-imported-epic')).toBe('FS-1000E');
    });

    it('should throw for increment ID with no leading digits', () => {
      expect(() => deriveFeatureId('no-digits-here')).toThrow('Invalid increment ID format');
    });

    it('should throw for empty string', () => {
      expect(() => deriveFeatureId('')).toThrow('Invalid increment ID format');
    });

    it('should handle increment ID that is just a number', () => {
      expect(deriveFeatureId('0050')).toBe('FS-050');
    });

    it('should handle increment ID with number only and E suffix', () => {
      expect(deriveFeatureId('0050E')).toBe('FS-050E');
    });

    it('should strip leading zeros and re-pad to minimum 3 digits', () => {
      // 0001 -> parseInt -> 1 -> padStart(3) -> '001'
      expect(deriveFeatureId('0001-init')).toBe('FS-001');
    });

    it('should handle 999 correctly as 3 digits', () => {
      expect(deriveFeatureId('0999-last-three-digit')).toBe('FS-999');
    });
  });

  describe('extractIncrementNumber', () => {
    it('should extract 81 from 0081-ado-repo-cloning', () => {
      expect(extractIncrementNumber('0081-ado-repo-cloning')).toBe(81);
    });

    it('should extract 1 from 0001-project-setup', () => {
      expect(extractIncrementNumber('0001-project-setup')).toBe(1);
    });

    it('should extract 100 from 0100-some-feature', () => {
      expect(extractIncrementNumber('0100-some-feature')).toBe(100);
    });

    it('should extract 1000 from 1000-future-feature', () => {
      expect(extractIncrementNumber('1000-future-feature')).toBe(1000);
    });

    it('should extract number from external increment (ignoring E)', () => {
      // The regex matches ^(\d+), so 0111E -> match[1] = '0111' -> 111
      expect(extractIncrementNumber('0111E-external-issue')).toBe(111);
    });

    it('should extract number from bare number string', () => {
      expect(extractIncrementNumber('0042')).toBe(42);
    });

    it('should throw for input with no leading digits', () => {
      expect(() => extractIncrementNumber('no-digits-here')).toThrow('Invalid increment ID format');
    });

    it('should throw for empty string', () => {
      expect(() => extractIncrementNumber('')).toThrow('Invalid increment ID format');
    });

    it('should throw for input starting with a dash', () => {
      expect(() => extractIncrementNumber('-123-name')).toThrow('Invalid increment ID format');
    });

    it('should extract only leading digits, ignoring trailing text', () => {
      expect(extractIncrementNumber('99abc')).toBe(99);
    });
  });

  describe('isValidFeatureId', () => {
    it('should accept FS-001', () => {
      expect(isValidFeatureId('FS-001')).toBe(true);
    });

    it('should accept FS-100', () => {
      expect(isValidFeatureId('FS-100')).toBe(true);
    });

    it('should accept FS-999', () => {
      expect(isValidFeatureId('FS-999')).toBe(true);
    });

    it('should accept FS-1000 (4 digits)', () => {
      expect(isValidFeatureId('FS-1000')).toBe(true);
    });

    it('should accept FS-12345 (5 digits)', () => {
      expect(isValidFeatureId('FS-12345')).toBe(true);
    });

    it('should accept FS-001E (external)', () => {
      expect(isValidFeatureId('FS-001E')).toBe(true);
    });

    it('should accept FS-1000E (4-digit external)', () => {
      expect(isValidFeatureId('FS-1000E')).toBe(true);
    });

    it('should reject FS-01 (too few digits)', () => {
      expect(isValidFeatureId('FS-01')).toBe(false);
    });

    it('should reject FS-1 (single digit)', () => {
      expect(isValidFeatureId('FS-1')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidFeatureId('')).toBe(false);
    });

    it('should reject string without FS- prefix', () => {
      expect(isValidFeatureId('001')).toBe(false);
    });

    it('should reject lowercase fs- prefix', () => {
      expect(isValidFeatureId('fs-001')).toBe(false);
    });

    it('should reject FS- with no digits', () => {
      expect(isValidFeatureId('FS-')).toBe(false);
    });

    it('should reject FS-abc (non-numeric)', () => {
      expect(isValidFeatureId('FS-abc')).toBe(false);
    });

    it('should reject FS-001X (wrong suffix letter)', () => {
      expect(isValidFeatureId('FS-001X')).toBe(false);
    });

    it('should reject FS-001EE (double suffix)', () => {
      expect(isValidFeatureId('FS-001EE')).toBe(false);
    });

    it('should reject feature ID with trailing whitespace', () => {
      expect(isValidFeatureId('FS-001 ')).toBe(false);
    });

    it('should reject feature ID with leading whitespace', () => {
      expect(isValidFeatureId(' FS-001')).toBe(false);
    });
  });

  describe('isExternalFeatureId', () => {
    it('should return true for FS-001E', () => {
      expect(isExternalFeatureId('FS-001E')).toBe(true);
    });

    it('should return true for FS-1000E', () => {
      expect(isExternalFeatureId('FS-1000E')).toBe(true);
    });

    it('should return false for FS-001', () => {
      expect(isExternalFeatureId('FS-001')).toBe(false);
    });

    it('should return false for FS-1000', () => {
      expect(isExternalFeatureId('FS-1000')).toBe(false);
    });

    it('should return true for any string ending in E', () => {
      // The function only checks endsWith('E'), no format validation
      expect(isExternalFeatureId('anythingE')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isExternalFeatureId('')).toBe(false);
    });

    it('should return false for string ending in lowercase e', () => {
      expect(isExternalFeatureId('FS-001e')).toBe(false);
    });
  });

  describe('deriveFeatureId and extractIncrementNumber consistency', () => {
    it('should produce consistent results for the same input', () => {
      const incrementId = '0081-feature';
      const featureId = deriveFeatureId(incrementId);
      const num = extractIncrementNumber(incrementId);

      // FS-081 should contain the number 81 padded to 3 digits
      expect(featureId).toBe(`FS-${String(num).padStart(3, '0')}`);
    });

    it('should maintain round-trip consistency for 4-digit numbers', () => {
      const incrementId = '1234-big-feature';
      const featureId = deriveFeatureId(incrementId);
      const num = extractIncrementNumber(incrementId);

      expect(featureId).toBe(`FS-${String(num).padStart(3, '0')}`);
      expect(featureId).toBe('FS-1234');
    });

    it('should produce valid feature IDs that pass isValidFeatureId', () => {
      const testCases = [
        '0001-init',
        '0042-middle',
        '0100-hundred',
        '0999-boundary',
        '1000-four-digit',
        '0050E-external',
      ];

      for (const id of testCases) {
        const featureId = deriveFeatureId(id);
        expect(isValidFeatureId(featureId)).toBe(true);
      }
    });

    it('should correctly mark external IDs derived from E-suffix increments', () => {
      const externalId = deriveFeatureId('0050E-external');
      const internalId = deriveFeatureId('0050-internal');

      expect(isExternalFeatureId(externalId)).toBe(true);
      expect(isExternalFeatureId(internalId)).toBe(false);
    });
  });
});
