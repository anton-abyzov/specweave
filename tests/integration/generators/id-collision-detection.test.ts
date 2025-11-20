/**
 * ID Collision Detection Tests (T-030)
 *
 * Tests that User Story ID generation detects and prevents collisions.
 * Validates uniqueness validation during increment planning.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseUsId,
  getNextUsId,
  validateUsIdUniqueness,
  getUsIdOrigin,
  isExternalUsId,
  generateUsIdRange
} from '../../../src/id-generators/us-id-generator.js';

describe('ID Collision Detection (T-030)', () => {
  describe('TC-084: Detect ID collision during planning', () => {
    it('should throw error when trying to create duplicate internal US-ID', () => {
      const existingIds = ['US-001', 'US-002', 'US-003'];

      // Attempt to create US-001 again
      expect(() => {
        validateUsIdUniqueness('US-001', existingIds);
      }).toThrow('ID collision detected: US-001 already exists');
    });

    it('should throw error when trying to create duplicate external US-ID', () => {
      const existingIds = ['US-001E', 'US-002E', 'US-003E'];

      // Attempt to create US-002E again
      expect(() => {
        validateUsIdUniqueness('US-002E', existingIds);
      }).toThrow('ID collision detected: US-002E already exists');
    });

    it('should throw error when creating duplicate in mixed ID list', () => {
      const existingIds = ['US-001', 'US-002E', 'US-003', 'US-004E'];

      // Attempt to create US-003 again (internal)
      expect(() => {
        validateUsIdUniqueness('US-003', existingIds);
      }).toThrow('ID collision detected: US-003 already exists');

      // Attempt to create US-004E again (external)
      expect(() => {
        validateUsIdUniqueness('US-004E', existingIds);
      }).toThrow('ID collision detected: US-004E already exists');
    });

    it('should allow creating new ID that does not exist', () => {
      const existingIds = ['US-001', 'US-002E', 'US-003'];

      // US-004 does not exist, should not throw
      expect(() => {
        validateUsIdUniqueness('US-004', existingIds);
      }).not.toThrow();

      // US-005E does not exist, should not throw
      expect(() => {
        validateUsIdUniqueness('US-005E', existingIds);
      }).not.toThrow();
    });
  });

  describe('TC-085: Suggest next available ID', () => {
    it('should suggest next internal ID when collision detected', () => {
      const existingIds = ['US-001', 'US-002', 'US-003', 'US-004', 'US-005'];

      // Try to use US-005 (exists), should detect collision
      try {
        validateUsIdUniqueness('US-005', existingIds);
        throw new Error('Should have thrown collision error');
      } catch (error: any) {
        expect(error.message).toContain('ID collision detected: US-005');
      }

      // Get next available ID
      const nextId = getNextUsId(existingIds, 'internal');
      expect(nextId).toBe('US-006');
    });

    it('should suggest next external ID when collision detected', () => {
      const existingIds = ['US-001E', 'US-002E', 'US-003E'];

      // Try to use US-003E (exists), should detect collision
      try {
        validateUsIdUniqueness('US-003E', existingIds);
        throw new Error('Should have thrown collision error');
      } catch (error: any) {
        expect(error.message).toContain('ID collision detected: US-003E');
      }

      // Get next available ID
      const nextId = getNextUsId(existingIds, 'external');
      expect(nextId).toBe('US-004E');
    });

    it('should suggest correct next ID in mixed scenario', () => {
      const existingIds = ['US-001', 'US-002E', 'US-003', 'US-004E', 'US-005'];

      // Max ID is 5, so next should be 6
      const nextInternal = getNextUsId(existingIds, 'internal');
      expect(nextInternal).toBe('US-006');

      const nextExternal = getNextUsId(existingIds, 'external');
      expect(nextExternal).toBe('US-006E');
    });

    it('should handle gaps in ID sequence', () => {
      const existingIds = ['US-001', 'US-002', 'US-005', 'US-010'];
      // Gap at 3, 4, 6-9, but next should be after max (10)

      const nextId = getNextUsId(existingIds, 'internal');
      expect(nextId).toBe('US-011');
    });
  });

  describe('ID Parsing and Origin Detection', () => {
    it('should correctly parse internal US-ID', () => {
      const parsed = parseUsId('US-001');

      expect(parsed.id).toBe('US-001');
      expect(parsed.number).toBe(1);
      expect(parsed.origin).toBe('internal');
    });

    it('should correctly parse external US-ID', () => {
      const parsed = parseUsId('US-042E');

      expect(parsed.id).toBe('US-042E');
      expect(parsed.number).toBe(42);
      expect(parsed.origin).toBe('external');
    });

    it('should detect origin from US-ID', () => {
      expect(getUsIdOrigin('US-001')).toBe('internal');
      expect(getUsIdOrigin('US-002E')).toBe('external');
      expect(isExternalUsId('US-001')).toBe(false);
      expect(isExternalUsId('US-002E')).toBe(true);
    });

    it('should throw error for invalid US-ID format', () => {
      expect(() => parseUsId('US001')).toThrow('Invalid User Story ID format');
      expect(() => parseUsId('US-1')).not.toThrow(); // This is valid (US-001 after padding)
      expect(() => parseUsId('US-ABC')).toThrow('Invalid User Story ID format');
      expect(() => parseUsId('FS-001')).toThrow('Invalid User Story ID format');
    });
  });

  describe('ID Range Generation', () => {
    it('should generate range of internal IDs', () => {
      const range = generateUsIdRange(1, 5, 'internal');

      expect(range).toEqual(['US-001', 'US-002', 'US-003', 'US-004', 'US-005']);
    });

    it('should generate range of external IDs', () => {
      const range = generateUsIdRange(10, 3, 'external');

      expect(range).toEqual(['US-010E', 'US-011E', 'US-012E']);
    });

    it('should handle large numbers correctly', () => {
      const range = generateUsIdRange(998, 3, 'internal');

      expect(range).toEqual(['US-998', 'US-999', 'US-1000']); // Exceeds 3-digit, but valid
    });
  });

  describe('Empty ID List Scenario', () => {
    it('should start from US-001 for internal when no existing IDs', () => {
      const nextId = getNextUsId([], 'internal');
      expect(nextId).toBe('US-001');
    });

    it('should start from US-001E for external when no existing IDs', () => {
      const nextId = getNextUsId([], 'external');
      expect(nextId).toBe('US-001E');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle brownfield import scenario', () => {
      // Existing internal IDs from 40 increments
      const existingInternalIds = generateUsIdRange(1, 200, 'internal');

      // First external import should start at 201E
      const firstExternalId = getNextUsId(existingInternalIds, 'external');
      expect(firstExternalId).toBe('US-201E');

      // Validate uniqueness
      expect(() => {
        validateUsIdUniqueness(firstExternalId, existingInternalIds);
      }).not.toThrow();
    });

    it('should handle mixed internal and external IDs', () => {
      const mixedIds = [
        'US-001', 'US-002E', 'US-003', 'US-004E', 'US-005',
        'US-006E', 'US-007', 'US-008E', 'US-009', 'US-010E'
      ];

      // Next internal should be US-011
      const nextInternal = getNextUsId(mixedIds, 'internal');
      expect(nextInternal).toBe('US-011');

      // Next external should be US-011E
      const nextExternal = getNextUsId(mixedIds, 'external');
      expect(nextExternal).toBe('US-011E');

      // Both should be unique
      expect(() => {
        validateUsIdUniqueness(nextInternal, mixedIds);
        validateUsIdUniqueness(nextExternal, mixedIds);
      }).not.toThrow();
    });

    it('should prevent collision between internal and external with same number', () => {
      const existingIds = ['US-001', 'US-002', 'US-003'];

      // US-002E is different from US-002, should not collide
      expect(() => {
        validateUsIdUniqueness('US-002E', existingIds);
      }).not.toThrow();

      // But US-002 already exists
      expect(() => {
        validateUsIdUniqueness('US-002', existingIds);
      }).toThrow('ID collision detected: US-002');
    });
  });
});
