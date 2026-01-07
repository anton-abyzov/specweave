import { describe, it, expect } from 'vitest';
import {
  parseIncrementNumber,
  validateIncrementNumber,
  logValidationResult
} from '../../src/core/increment-validator.js';

describe('increment-validator', () => {
  describe('parseIncrementNumber', () => {
    it('parses valid increment IDs', () => {
      expect(parseIncrementNumber('0001-feature-name')).toBe(1);
      expect(parseIncrementNumber('0157-skill-routing')).toBe(157);
      expect(parseIncrementNumber('9999-max-number')).toBe(9999);
    });

    it('returns null for invalid formats', () => {
      expect(parseIncrementNumber('invalid')).toBeNull();
      expect(parseIncrementNumber('feature-name')).toBeNull();
      expect(parseIncrementNumber('1-feature')).toBeNull(); // Not 4 digits
      expect(parseIncrementNumber('')).toBeNull();
    });

    it('handles edge cases', () => {
      expect(parseIncrementNumber('0000-zero')).toBe(0);
      expect(parseIncrementNumber('0100-hundred')).toBe(100);
    });
  });

  describe('validateIncrementNumber', () => {
    it('accepts sequential numbers', () => {
      const existingIncrements = ['0001-first', '0002-second', '0003-third'];
      const result = validateIncrementNumber('0004', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.expectedNumber).toBe('0004');
      expect(result.providedNumber).toBe('0004');
    });

    it('warns about forward jumps (skipping numbers)', () => {
      const existingIncrements = ['0001-first', '0002-second'];
      const result = validateIncrementNumber('0005', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Skipping 2 number(s)');
      expect(result.warnings[0]).toContain('0003 to 0004');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.expectedNumber).toBe('0003');
      expect(result.providedNumber).toBe('0005');
    });

    it('warns about single number skip', () => {
      const existingIncrements = ['0001-first', '0002-second'];
      const result = validateIncrementNumber('0004', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Skipping 1 number(s)');
      expect(result.warnings[0]).toContain('0003');
      expect(result.expectedNumber).toBe('0003');
    });

    it('warns about backfills (filling gaps)', () => {
      const existingIncrements = ['0001-first', '0002-second', '0005-fifth'];
      const result = validateIncrementNumber('0003', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('non-sequential');
      expect(result.warnings[0]).toContain('expected: 0006');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[1]).toContain('intentional');
      expect(result.expectedNumber).toBe('0006');
      expect(result.providedNumber).toBe('0003');
    });

    it('rejects invalid number formats', () => {
      const existingIncrements = ['0001-first'];
      const result = validateIncrementNumber('invalid', existingIncrements);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Invalid increment number format');
      expect(result.suggestions[0]).toContain('0002');
    });

    it('rejects duplicate numbers', () => {
      const existingIncrements = ['0001-first', '0002-second', '0003-third'];
      const result = validateIncrementNumber('0002', existingIncrements);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('already exists');
      expect(result.expectedNumber).toBe('0004');
    });

    it('handles empty increment list (first increment)', () => {
      const result = validateIncrementNumber('0001', []);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.expectedNumber).toBe('0001');
      expect(result.providedNumber).toBe('0001');
    });

    it('warns when first increment is not 0001', () => {
      const result = validateIncrementNumber('0100', []);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Skipping 99 number(s)');
      expect(result.expectedNumber).toBe('0001');
      expect(result.providedNumber).toBe('0100');
    });

    it('handles increments from archived folders', () => {
      const existingIncrements = [
        '0001-first',
        '0002-second',
        '_archive/0003-archived',
        '0004-current'
      ];
      const result = validateIncrementNumber('0005', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.expectedNumber).toBe('0005');
    });

    it('provides helpful suggestions for non-sequential numbers', () => {
      const existingIncrements = ['0001-first', '0002-second'];
      const result = validateIncrementNumber('0010', existingIncrements);

      expect(result.isValid).toBe(true);
      expect(result.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('0003 for sequential tracking'),
          expect.stringContaining('harder to track')
        ])
      );
    });
  });

  describe('logValidationResult', () => {
    it('logs success for valid sequential numbers', () => {
      const result = {
        isValid: true,
        warnings: [],
        suggestions: [],
        expectedNumber: '0004',
        providedNumber: '0004'
      };

      // Should not throw
      expect(() => logValidationResult(result)).not.toThrow();
    });

    it('logs warnings for non-sequential numbers', () => {
      const result = {
        isValid: true,
        warnings: ['⚠️  Skipping 2 number(s): 0003 to 0004'],
        suggestions: ['Consider using 0003 for sequential tracking.'],
        expectedNumber: '0003',
        providedNumber: '0005'
      };

      // Should not throw
      expect(() => logValidationResult(result)).not.toThrow();
    });

    it('logs errors for invalid numbers', () => {
      const result = {
        isValid: false,
        warnings: ['Increment 0002 already exists!'],
        suggestions: ['Use 0004 for the next increment'],
        expectedNumber: '0004',
        providedNumber: '0002'
      };

      // Should not throw
      expect(() => logValidationResult(result)).not.toThrow();
    });
  });
});
