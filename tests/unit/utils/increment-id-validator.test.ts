import { describe, it, expect } from 'vitest';
import {
  isValidIncrementId,
  validateIncrementId,
  extractIncrementNumber,
  isExternalIncrement,
} from '../../../src/utils/increment-id-validator.js';

describe('increment-id-validator', () => {
  // ---------------------------------------------------------------------------
  // isValidIncrementId
  // ---------------------------------------------------------------------------
  describe('isValidIncrementId', () => {
    describe('valid IDs', () => {
      it('accepts standard increment ID (0001-feature-name)', () => {
        expect(isValidIncrementId('0001-feature-name')).toBe(true);
      });

      it('accepts external increment ID (0111E-external)', () => {
        expect(isValidIncrementId('0111E-external')).toBe(true);
      });

      it('accepts alpha suffix (0001A-hotfix)', () => {
        expect(isValidIncrementId('0001A-hotfix')).toBe(true);
      });

      it('accepts lowercase alpha suffix (0001a-hotfix)', () => {
        expect(isValidIncrementId('0001a-hotfix')).toBe(true);
      });

      it('accepts single character name (0001-x)', () => {
        expect(isValidIncrementId('0001-x')).toBe(true);
      });

      it('accepts numeric-only name (0001-123)', () => {
        expect(isValidIncrementId('0001-123')).toBe(true);
      });

      it('accepts multi-segment kebab-case (0042-my-cool-feature)', () => {
        expect(isValidIncrementId('0042-my-cool-feature')).toBe(true);
      });

      it('accepts max digits (9999-last)', () => {
        expect(isValidIncrementId('9999-last')).toBe(true);
      });

      it('accepts zero prefix (0000-init)', () => {
        expect(isValidIncrementId('0000-init')).toBe(true);
      });

      it('accepts mixed case name (0001-MyFeature)', () => {
        expect(isValidIncrementId('0001-MyFeature')).toBe(true);
      });
    });

    describe('invalid IDs', () => {
      it('rejects path traversal (../../etc)', () => {
        expect(isValidIncrementId('../../etc')).toBe(false);
      });

      it('rejects path traversal with prefix (0001-../../etc/passwd)', () => {
        expect(isValidIncrementId('0001-../../etc/passwd')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(isValidIncrementId('')).toBe(false);
      });

      it('rejects 3-digit prefix (001-short)', () => {
        expect(isValidIncrementId('001-short')).toBe(false);
      });

      it('rejects 5-digit prefix (00001-long)', () => {
        expect(isValidIncrementId('00001-long')).toBe(false);
      });

      it('rejects no hyphen (0001feature)', () => {
        expect(isValidIncrementId('0001feature')).toBe(false);
      });

      it('rejects trailing hyphen (0001-name-)', () => {
        expect(isValidIncrementId('0001-name-')).toBe(false);
      });

      it('rejects dots in name (0001-name.bad)', () => {
        expect(isValidIncrementId('0001-name.bad')).toBe(false);
      });

      it('rejects slashes in name (0001-name/bad)', () => {
        expect(isValidIncrementId('0001-name/bad')).toBe(false);
      });

      it('rejects spaces in name (0001-name bad)', () => {
        expect(isValidIncrementId('0001-name bad')).toBe(false);
      });

      it('rejects underscores in name (0001-name_bad)', () => {
        expect(isValidIncrementId('0001-name_bad')).toBe(false);
      });

      it('rejects missing name after hyphen (0001-)', () => {
        expect(isValidIncrementId('0001-')).toBe(false);
      });

      it('rejects name starting with hyphen (0001--name)', () => {
        expect(isValidIncrementId('0001--name')).toBe(false);
      });

      it('rejects null', () => {
        expect(isValidIncrementId(null as unknown as string)).toBe(false);
      });

      it('rejects undefined', () => {
        expect(isValidIncrementId(undefined as unknown as string)).toBe(false);
      });

      it('rejects number type', () => {
        expect(isValidIncrementId(1234 as unknown as string)).toBe(false);
      });

      it('rejects only digits (0001)', () => {
        expect(isValidIncrementId('0001')).toBe(false);
      });

      it('rejects two alpha suffixes (0001AB-name)', () => {
        expect(isValidIncrementId('0001AB-name')).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // validateIncrementId
  // ---------------------------------------------------------------------------
  describe('validateIncrementId', () => {
    it('does not throw for a valid standard ID', () => {
      expect(() => validateIncrementId('0001-feature')).not.toThrow();
    });

    it('does not throw for a valid external ID', () => {
      expect(() => validateIncrementId('0111E-external')).not.toThrow();
    });

    it('does not throw for a valid alpha-suffix ID', () => {
      expect(() => validateIncrementId('0001A-hotfix')).not.toThrow();
    });

    it('throws Error for an invalid ID', () => {
      expect(() => validateIncrementId('bad')).toThrow(Error);
    });

    it('throws with descriptive message containing the invalid ID', () => {
      expect(() => validateIncrementId('../../etc')).toThrow(
        /Invalid increment ID format: "\.\.\/\.\.\/etc"/
      );
    });

    it('throws with expected format hint in the message', () => {
      expect(() => validateIncrementId('')).toThrow(
        /Expected format: NNNN-name/
      );
    });

    it('throws for trailing hyphen', () => {
      expect(() => validateIncrementId('0001-name-')).toThrow(Error);
    });

    it('throws for empty string', () => {
      expect(() => validateIncrementId('')).toThrow(Error);
    });
  });

  // ---------------------------------------------------------------------------
  // extractIncrementNumber
  // ---------------------------------------------------------------------------
  describe('extractIncrementNumber', () => {
    it('extracts 1 from 0001-feature', () => {
      expect(extractIncrementNumber('0001-feature')).toBe(1);
    });

    it('extracts 111 from 0111E-external', () => {
      expect(extractIncrementNumber('0111E-external')).toBe(111);
    });

    it('extracts 0 from 0000-init', () => {
      expect(extractIncrementNumber('0000-init')).toBe(0);
    });

    it('extracts 9999 from 9999-last', () => {
      expect(extractIncrementNumber('9999-last')).toBe(9999);
    });

    it('extracts 42 from 0042-my-cool-feature', () => {
      expect(extractIncrementNumber('0042-my-cool-feature')).toBe(42);
    });

    it('extracts number even from IDs that fail full validation (only needs 4-digit prefix)', () => {
      // extractIncrementNumber only looks for the 4-digit prefix, not full validity
      expect(extractIncrementNumber('1234')).toBe(1234);
    });

    it('returns null for invalid string without 4-digit prefix', () => {
      expect(extractIncrementNumber('abc')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractIncrementNumber('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(extractIncrementNumber(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(extractIncrementNumber(undefined as unknown as string)).toBeNull();
    });

    it('returns null for non-string input (number)', () => {
      expect(extractIncrementNumber(42 as unknown as string)).toBeNull();
    });

    it('returns null for 3-digit prefix', () => {
      expect(extractIncrementNumber('001-short')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isExternalIncrement
  // ---------------------------------------------------------------------------
  describe('isExternalIncrement', () => {
    it('returns true for external ID (0111E-name)', () => {
      expect(isExternalIncrement('0111E-name')).toBe(true);
    });

    it('returns true for external ID with long name (0200E-jira-import-sprint-5)', () => {
      expect(isExternalIncrement('0200E-jira-import-sprint-5')).toBe(true);
    });

    it('returns false for standard ID (0001-name)', () => {
      expect(isExternalIncrement('0001-name')).toBe(false);
    });

    it('returns false for alpha suffix that is not E (0001A-hotfix)', () => {
      expect(isExternalIncrement('0001A-hotfix')).toBe(false);
    });

    it('returns false for lowercase e suffix (0001e-name)', () => {
      // The regex specifically checks for uppercase E
      expect(isExternalIncrement('0001e-name')).toBe(false);
    });

    it('returns false for invalid ID (empty string)', () => {
      expect(isExternalIncrement('')).toBe(false);
    });

    it('returns false for invalid ID (path traversal)', () => {
      expect(isExternalIncrement('../../etc')).toBe(false);
    });

    it('returns false for null input', () => {
      expect(isExternalIncrement(null as unknown as string)).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isExternalIncrement(123 as unknown as string)).toBe(false);
    });

    it('returns false for ID with E not as suffix (E001-name)', () => {
      expect(isExternalIncrement('E001-name')).toBe(false);
    });
  });
});
