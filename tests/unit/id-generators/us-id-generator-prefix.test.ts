/**
 * Tests for prefixed User Story ID generation (T-006 / T-007)
 *
 * Validates US-{PREFIX}-NNN format support while maintaining
 * backward compatibility with plain US-NNN format.
 */

import { describe, it, expect } from 'vitest';
import {
  parseUsId,
  getNextUsId,
  generateUsIdRange,
} from '../../../src/id-generators/us-id-generator.js';

describe('Prefixed US ID Generation (T-006 / T-007)', () => {
  describe('parseUsId with prefix', () => {
    // AC-US3-01: Parse US-SPE-001 format
    it('should parse prefixed internal ID', () => {
      const parsed = parseUsId('US-SPE-001');
      expect(parsed.id).toBe('US-SPE-001');
      expect(parsed.number).toBe(1);
      expect(parsed.origin).toBe('internal');
      expect(parsed.prefix).toBe('SPE');
    });

    it('should parse prefixed external ID', () => {
      const parsed = parseUsId('US-VSK-002E');
      expect(parsed.id).toBe('US-VSK-002E');
      expect(parsed.number).toBe(2);
      expect(parsed.origin).toBe('external');
      expect(parsed.prefix).toBe('VSK');
    });

    it('should parse 6-char prefix', () => {
      const parsed = parseUsId('US-SHARED-010');
      expect(parsed.prefix).toBe('SHARED');
      expect(parsed.number).toBe(10);
    });

    it('should parse 2-char prefix', () => {
      const parsed = parseUsId('US-FE-005');
      expect(parsed.prefix).toBe('FE');
      expect(parsed.number).toBe(5);
    });

    // Backward compatibility: plain US-NNN still works
    it('should parse plain ID with no prefix', () => {
      const parsed = parseUsId('US-001');
      expect(parsed.number).toBe(1);
      expect(parsed.origin).toBe('internal');
      expect(parsed.prefix).toBeUndefined();
    });

    it('should parse plain external ID with no prefix', () => {
      const parsed = parseUsId('US-002E');
      expect(parsed.number).toBe(2);
      expect(parsed.origin).toBe('external');
      expect(parsed.prefix).toBeUndefined();
    });
  });

  describe('formatUsId with prefix', () => {
    // AC-US3-01: formatUsId(1, 'internal', 'SPE') → "US-SPE-001"
    it('should format prefixed internal ID', () => {
      const next = getNextUsId([], 'internal', 'SPE');
      expect(next).toBe('US-SPE-001');
    });

    // AC-US3-02: formatUsId(1, 'internal', undefined) → "US-001"
    it('should format plain ID when no prefix', () => {
      const next = getNextUsId([], 'internal');
      expect(next).toBe('US-001');
    });

    it('should format prefixed external ID', () => {
      const next = getNextUsId([], 'external', 'VSK');
      expect(next).toBe('US-VSK-001E');
    });
  });

  describe('getNextUsId with prefix', () => {
    // AC-US3-03: continue numbering from highest existing
    it('should generate next prefixed ID from existing prefixed IDs', () => {
      const existing = ['US-SPE-001', 'US-SPE-002'];
      const next = getNextUsId(existing, 'internal', 'SPE');
      expect(next).toBe('US-SPE-003');
    });

    it('should handle mixed prefixed and non-prefixed IDs', () => {
      const existing = ['US-001', 'US-SPE-002', 'US-003'];
      const next = getNextUsId(existing, 'internal', 'SPE');
      expect(next).toBe('US-SPE-004');
    });

    it('should count only numbers matching the given prefix', () => {
      const existing = ['US-SPE-001', 'US-VSK-005'];
      // When generating for SPE, should still account for VSK-005 as max
      const next = getNextUsId(existing, 'internal', 'SPE');
      expect(next).toBe('US-SPE-006');
    });

    it('should handle external prefixed IDs in mix', () => {
      const existing = ['US-SPE-001', 'US-SPE-003E'];
      const next = getNextUsId(existing, 'internal', 'SPE');
      expect(next).toBe('US-SPE-004');
    });
  });

  describe('generateUsIdRange with prefix', () => {
    it('should generate prefixed range', () => {
      const range = generateUsIdRange(1, 3, 'internal', 'FE');
      expect(range).toEqual(['US-FE-001', 'US-FE-002', 'US-FE-003']);
    });

    it('should generate non-prefixed range when no prefix', () => {
      const range = generateUsIdRange(1, 2, 'internal');
      expect(range).toEqual(['US-001', 'US-002']);
    });

    it('should generate prefixed external range', () => {
      const range = generateUsIdRange(1, 2, 'external', 'BE');
      expect(range).toEqual(['US-BE-001E', 'US-BE-002E']);
    });
  });

  describe('backward compatibility', () => {
    // AC-US3-05: old US-001 format continues to work
    it('should parse and generate old format without any prefix', () => {
      const parsed = parseUsId('US-123');
      expect(parsed.number).toBe(123);
      expect(parsed.prefix).toBeUndefined();

      const next = getNextUsId(['US-001', 'US-002'], 'internal');
      expect(next).toBe('US-003');
    });
  });
});
