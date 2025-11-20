/**
 * Unit tests for User Story ID Generator (T-028)
 */

import { describe, it, expect } from 'vitest';
import {
  parseUsId,
  getNextUsId,
  validateUsIdUniqueness,
  getUsIdOrigin,
  getUsIdNumber,
  isExternalUsId,
  generateUsIdRange
} from '../../../src/id-generators/us-id-generator.js';

describe('US ID Generator (T-028)', () => {
  describe('parseUsId', () => {
    it('should parse internal User Story ID', () => {
      const parsed = parseUsId('US-001');

      expect(parsed.id).toBe('US-001');
      expect(parsed.number).toBe(1);
      expect(parsed.origin).toBe('internal');
    });

    it('should parse external User Story ID', () => {
      const parsed = parseUsId('US-002E');

      expect(parsed.id).toBe('US-002E');
      expect(parsed.number).toBe(2);
      expect(parsed.origin).toBe('external');
    });

    it('should parse three-digit numbers', () => {
      const parsed = parseUsId('US-123');

      expect(parsed.number).toBe(123);
      expect(parsed.origin).toBe('internal');
    });

    it('should parse external three-digit numbers', () => {
      const parsed = parseUsId('US-456E');

      expect(parsed.number).toBe(456);
      expect(parsed.origin).toBe('external');
    });

    it('should throw error for invalid format (missing prefix)', () => {
      expect(() => parseUsId('001')).toThrow('Invalid User Story ID format');
    });

    it('should throw error for invalid format (wrong prefix)', () => {
      expect(() => parseUsId('T-001')).toThrow('Invalid User Story ID format');
    });

    it('should throw error for invalid format (lowercase)', () => {
      expect(() => parseUsId('us-001')).toThrow('Invalid User Story ID format');
    });

    it('should throw error for invalid format (wrong suffix)', () => {
      expect(() => parseUsId('US-001X')).toThrow('Invalid User Story ID format');
    });
  });

  describe('TC-078: Generate next internal ID (no suffix)', () => {
    it('should generate first internal ID when no IDs exist', () => {
      const nextId = getNextUsId([], 'internal');
      expect(nextId).toBe('US-001');
    });

    it('should generate next internal ID from existing internal IDs', () => {
      const existing = ['US-001', 'US-002', 'US-003'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-004');
    });

    it('should generate next internal ID from mixed IDs', () => {
      const existing = ['US-001', 'US-002', 'US-003E'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-004');
    });

    it('should pad internal ID with zeros', () => {
      const existing = ['US-001'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-002');
    });

    it('should handle large numbers', () => {
      const existing = ['US-099'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-100');
    });
  });

  describe('TC-079: Generate next external ID (E suffix)', () => {
    it('should generate first external ID when no IDs exist', () => {
      const nextId = getNextUsId([], 'external');
      expect(nextId).toBe('US-001E');
    });

    it('should generate next external ID from existing external IDs', () => {
      const existing = ['US-001E', 'US-002E', 'US-003E'];
      const nextId = getNextUsId(existing, 'external');
      expect(nextId).toBe('US-004E');
    });

    it('should generate next external ID from mixed IDs', () => {
      const existing = ['US-001', 'US-002', 'US-003E'];
      const nextId = getNextUsId(existing, 'external');
      expect(nextId).toBe('US-004E');
    });

    it('should pad external ID with zeros', () => {
      const existing = ['US-005E'];
      const nextId = getNextUsId(existing, 'external');
      expect(nextId).toBe('US-006E');
    });
  });

  describe('TC-080: Handle mixed IDs correctly', () => {
    it('should find max across both internal and external IDs', () => {
      const existing = ['US-001', 'US-003E', 'US-005', 'US-007E'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-008'); // Max is 7, next is 8
    });

    it('should generate external ID from mixed IDs', () => {
      const existing = ['US-001', 'US-003E', 'US-005', 'US-007E'];
      const nextId = getNextUsId(existing, 'external');
      expect(nextId).toBe('US-008E');
    });

    it('should handle unordered mixed IDs', () => {
      const existing = ['US-005', 'US-002E', 'US-010', 'US-003E'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-011'); // Max is 10, next is 11
    });

    it('should handle gaps in sequences', () => {
      const existing = ['US-001', 'US-005E', 'US-010'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-011'); // Max is 10, next is 11
    });

    it('should handle mostly external IDs', () => {
      const existing = ['US-001E', 'US-002E', 'US-003E', 'US-004E'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-005'); // Next internal after externals
    });

    it('should handle mostly internal IDs', () => {
      const existing = ['US-001', 'US-002', 'US-003', 'US-004'];
      const nextId = getNextUsId(existing, 'external');
      expect(nextId).toBe('US-005E'); // Next external after internals
    });
  });

  describe('TC-081: Detect ID collision', () => {
    it('should throw error for duplicate internal ID', () => {
      const existing = ['US-001', 'US-002'];
      expect(() => validateUsIdUniqueness('US-001', existing)).toThrow(
        'ID collision detected: US-001 already exists'
      );
    });

    it('should throw error for duplicate external ID', () => {
      const existing = ['US-001E', 'US-002E'];
      expect(() => validateUsIdUniqueness('US-001E', existing)).toThrow(
        'ID collision detected: US-001E already exists'
      );
    });

    it('should allow new unique internal ID', () => {
      const existing = ['US-001', 'US-002'];
      expect(() => validateUsIdUniqueness('US-003', existing)).not.toThrow();
    });

    it('should allow new unique external ID', () => {
      const existing = ['US-001E', 'US-002E'];
      expect(() => validateUsIdUniqueness('US-003E', existing)).not.toThrow();
    });

    it('should allow US-001 when US-001E exists', () => {
      const existing = ['US-001E'];
      expect(() => validateUsIdUniqueness('US-001', existing)).not.toThrow();
    });

    it('should allow US-001E when US-001 exists', () => {
      const existing = ['US-001'];
      expect(() => validateUsIdUniqueness('US-001E', existing)).not.toThrow();
    });
  });

  describe('getUsIdOrigin', () => {
    it('should detect internal origin', () => {
      expect(getUsIdOrigin('US-001')).toBe('internal');
      expect(getUsIdOrigin('US-123')).toBe('internal');
    });

    it('should detect external origin', () => {
      expect(getUsIdOrigin('US-001E')).toBe('external');
      expect(getUsIdOrigin('US-456E')).toBe('external');
    });
  });

  describe('getUsIdNumber', () => {
    it('should extract number from internal ID', () => {
      expect(getUsIdNumber('US-001')).toBe(1);
      expect(getUsIdNumber('US-042')).toBe(42);
      expect(getUsIdNumber('US-123')).toBe(123);
    });

    it('should extract number from external ID', () => {
      expect(getUsIdNumber('US-001E')).toBe(1);
      expect(getUsIdNumber('US-042E')).toBe(42);
      expect(getUsIdNumber('US-123E')).toBe(123);
    });
  });

  describe('isExternalUsId', () => {
    it('should return true for external IDs', () => {
      expect(isExternalUsId('US-001E')).toBe(true);
      expect(isExternalUsId('US-999E')).toBe(true);
    });

    it('should return false for internal IDs', () => {
      expect(isExternalUsId('US-001')).toBe(false);
      expect(isExternalUsId('US-999')).toBe(false);
    });
  });

  describe('generateUsIdRange', () => {
    it('should generate internal ID range', () => {
      const range = generateUsIdRange(1, 3, 'internal');
      expect(range).toEqual(['US-001', 'US-002', 'US-003']);
    });

    it('should generate external ID range', () => {
      const range = generateUsIdRange(5, 2, 'external');
      expect(range).toEqual(['US-005E', 'US-006E']);
    });

    it('should generate range starting from high number', () => {
      const range = generateUsIdRange(98, 3, 'internal');
      expect(range).toEqual(['US-098', 'US-099', 'US-100']);
    });

    it('should generate empty range for count=0', () => {
      const range = generateUsIdRange(1, 0, 'internal');
      expect(range).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const nextInternal = getNextUsId([], 'internal');
      const nextExternal = getNextUsId([], 'external');

      expect(nextInternal).toBe('US-001');
      expect(nextExternal).toBe('US-001E');
    });

    it('should skip invalid IDs when finding max', () => {
      const existing = ['US-001', 'INVALID', 'US-003E', 'T-005'];
      const nextId = getNextUsId(existing, 'internal');
      expect(nextId).toBe('US-004'); // Max valid is 3
    });

    it('should handle single ID', () => {
      const nextId = getNextUsId(['US-010'], 'internal');
      expect(nextId).toBe('US-011');
    });

    it('should handle single external ID', () => {
      const nextId = getNextUsId(['US-010E'], 'external');
      expect(nextId).toBe('US-011E');
    });
  });
});
