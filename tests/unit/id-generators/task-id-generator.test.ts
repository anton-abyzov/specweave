/**
 * Unit tests for Task ID Generator (T-028)
 */

import { describe, it, expect } from 'vitest';
import {
  parseTaskId,
  getNextTaskId,
  validateTaskIdUniqueness,
  getTaskIdOrigin,
  getTaskIdNumber,
  isExternalTaskId,
  generateTaskIdRange
} from '../../../src/id-generators/task-id-generator.js';

describe('Task ID Generator (T-028)', () => {
  describe('parseTaskId', () => {
    it('should parse internal Task ID', () => {
      const parsed = parseTaskId('T-001');

      expect(parsed.id).toBe('T-001');
      expect(parsed.number).toBe(1);
      expect(parsed.origin).toBe('internal');
    });

    it('should parse external Task ID', () => {
      const parsed = parseTaskId('T-002E');

      expect(parsed.id).toBe('T-002E');
      expect(parsed.number).toBe(2);
      expect(parsed.origin).toBe('external');
    });

    it('should parse three-digit numbers', () => {
      const parsed = parseTaskId('T-123');

      expect(parsed.number).toBe(123);
      expect(parsed.origin).toBe('internal');
    });

    it('should parse external three-digit numbers', () => {
      const parsed = parseTaskId('T-456E');

      expect(parsed.number).toBe(456);
      expect(parsed.origin).toBe('external');
    });

    it('should throw error for invalid format (missing prefix)', () => {
      expect(() => parseTaskId('001')).toThrow('Invalid Task ID format');
    });

    it('should throw error for invalid format (wrong prefix)', () => {
      expect(() => parseTaskId('US-001')).toThrow('Invalid Task ID format');
    });

    it('should throw error for invalid format (lowercase)', () => {
      expect(() => parseTaskId('t-001')).toThrow('Invalid Task ID format');
    });

    it('should throw error for invalid format (wrong suffix)', () => {
      expect(() => parseTaskId('T-001X')).toThrow('Invalid Task ID format');
    });
  });

  describe('Generate next internal Task ID', () => {
    it('should generate first internal ID when no IDs exist', () => {
      const nextId = getNextTaskId([], 'internal');
      expect(nextId).toBe('T-001');
    });

    it('should generate next internal ID from existing internal IDs', () => {
      const existing = ['T-001', 'T-002', 'T-003'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-004');
    });

    it('should generate next internal ID from mixed IDs', () => {
      const existing = ['T-001', 'T-002', 'T-003E'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-004');
    });

    it('should pad internal ID with zeros', () => {
      const existing = ['T-001'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-002');
    });

    it('should handle large numbers', () => {
      const existing = ['T-099'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-100');
    });
  });

  describe('Generate next external Task ID', () => {
    it('should generate first external ID when no IDs exist', () => {
      const nextId = getNextTaskId([], 'external');
      expect(nextId).toBe('T-001E');
    });

    it('should generate next external ID from existing external IDs', () => {
      const existing = ['T-001E', 'T-002E', 'T-003E'];
      const nextId = getNextTaskId(existing, 'external');
      expect(nextId).toBe('T-004E');
    });

    it('should generate next external ID from mixed IDs', () => {
      const existing = ['T-001', 'T-002', 'T-003E'];
      const nextId = getNextTaskId(existing, 'external');
      expect(nextId).toBe('T-004E');
    });

    it('should pad external ID with zeros', () => {
      const existing = ['T-005E'];
      const nextId = getNextTaskId(existing, 'external');
      expect(nextId).toBe('T-006E');
    });
  });

  describe('Handle mixed Task IDs', () => {
    it('should find max across both internal and external IDs', () => {
      const existing = ['T-001', 'T-003E', 'T-005', 'T-007E'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-008'); // Max is 7, next is 8
    });

    it('should generate external ID from mixed IDs', () => {
      const existing = ['T-001', 'T-003E', 'T-005', 'T-007E'];
      const nextId = getNextTaskId(existing, 'external');
      expect(nextId).toBe('T-008E');
    });

    it('should handle unordered mixed IDs', () => {
      const existing = ['T-005', 'T-002E', 'T-010', 'T-003E'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-011'); // Max is 10, next is 11
    });

    it('should handle gaps in sequences', () => {
      const existing = ['T-001', 'T-005E', 'T-010'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-011'); // Max is 10, next is 11
    });

    it('should handle mostly external IDs', () => {
      const existing = ['T-001E', 'T-002E', 'T-003E', 'T-004E'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-005'); // Next internal after externals
    });

    it('should handle mostly internal IDs', () => {
      const existing = ['T-001', 'T-002', 'T-003', 'T-004'];
      const nextId = getNextTaskId(existing, 'external');
      expect(nextId).toBe('T-005E'); // Next external after internals
    });
  });

  describe('Detect Task ID collision', () => {
    it('should throw error for duplicate internal ID', () => {
      const existing = ['T-001', 'T-002'];
      expect(() => validateTaskIdUniqueness('T-001', existing)).toThrow(
        'ID collision detected: T-001 already exists'
      );
    });

    it('should throw error for duplicate external ID', () => {
      const existing = ['T-001E', 'T-002E'];
      expect(() => validateTaskIdUniqueness('T-001E', existing)).toThrow(
        'ID collision detected: T-001E already exists'
      );
    });

    it('should allow new unique internal ID', () => {
      const existing = ['T-001', 'T-002'];
      expect(() => validateTaskIdUniqueness('T-003', existing)).not.toThrow();
    });

    it('should allow new unique external ID', () => {
      const existing = ['T-001E', 'T-002E'];
      expect(() => validateTaskIdUniqueness('T-003E', existing)).not.toThrow();
    });

    it('should allow T-001 when T-001E exists', () => {
      const existing = ['T-001E'];
      expect(() => validateTaskIdUniqueness('T-001', existing)).not.toThrow();
    });

    it('should allow T-001E when T-001 exists', () => {
      const existing = ['T-001'];
      expect(() => validateTaskIdUniqueness('T-001E', existing)).not.toThrow();
    });
  });

  describe('getTaskIdOrigin', () => {
    it('should detect internal origin', () => {
      expect(getTaskIdOrigin('T-001')).toBe('internal');
      expect(getTaskIdOrigin('T-123')).toBe('internal');
    });

    it('should detect external origin', () => {
      expect(getTaskIdOrigin('T-001E')).toBe('external');
      expect(getTaskIdOrigin('T-456E')).toBe('external');
    });
  });

  describe('getTaskIdNumber', () => {
    it('should extract number from internal ID', () => {
      expect(getTaskIdNumber('T-001')).toBe(1);
      expect(getTaskIdNumber('T-042')).toBe(42);
      expect(getTaskIdNumber('T-123')).toBe(123);
    });

    it('should extract number from external ID', () => {
      expect(getTaskIdNumber('T-001E')).toBe(1);
      expect(getTaskIdNumber('T-042E')).toBe(42);
      expect(getTaskIdNumber('T-123E')).toBe(123);
    });
  });

  describe('isExternalTaskId', () => {
    it('should return true for external IDs', () => {
      expect(isExternalTaskId('T-001E')).toBe(true);
      expect(isExternalTaskId('T-999E')).toBe(true);
    });

    it('should return false for internal IDs', () => {
      expect(isExternalTaskId('T-001')).toBe(false);
      expect(isExternalTaskId('T-999')).toBe(false);
    });
  });

  describe('generateTaskIdRange', () => {
    it('should generate internal ID range', () => {
      const range = generateTaskIdRange(1, 3, 'internal');
      expect(range).toEqual(['T-001', 'T-002', 'T-003']);
    });

    it('should generate external ID range', () => {
      const range = generateTaskIdRange(5, 2, 'external');
      expect(range).toEqual(['T-005E', 'T-006E']);
    });

    it('should generate range starting from high number', () => {
      const range = generateTaskIdRange(98, 3, 'internal');
      expect(range).toEqual(['T-098', 'T-099', 'T-100']);
    });

    it('should generate empty range for count=0', () => {
      const range = generateTaskIdRange(1, 0, 'internal');
      expect(range).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const nextInternal = getNextTaskId([], 'internal');
      const nextExternal = getNextTaskId([], 'external');

      expect(nextInternal).toBe('T-001');
      expect(nextExternal).toBe('T-001E');
    });

    it('should skip invalid IDs when finding max', () => {
      const existing = ['T-001', 'INVALID', 'T-003E', 'US-005'];
      const nextId = getNextTaskId(existing, 'internal');
      expect(nextId).toBe('T-004'); // Max valid is 3
    });

    it('should handle single ID', () => {
      const nextId = getNextTaskId(['T-010'], 'internal');
      expect(nextId).toBe('T-011');
    });

    it('should handle single external ID', () => {
      const nextId = getNextTaskId(['T-010E'], 'external');
      expect(nextId).toBe('T-011E');
    });
  });
});
