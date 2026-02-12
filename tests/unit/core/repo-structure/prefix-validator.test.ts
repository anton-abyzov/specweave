/**
 * Unit tests for prefix-validator
 *
 * Validates story prefixes: format, reserved words, uniqueness.
 */

import { describe, it, expect } from 'vitest';

import {
  validatePrefix,
  RESERVED_PREFIXES,
  ROLE_PREFIX_DEFAULTS,
  type PrefixValidationResult,
} from '../../../../src/core/repo-structure/prefix-validator.js';

describe('prefix-validator', () => {
  describe('validatePrefix', () => {
    // ─── Format checks ──────────────────────────────────────────

    it('should accept valid 2-letter prefix', () => {
      const result = validatePrefix('FE', new Set());
      expect(result.valid).toBe(true);
    });

    it('should accept valid 3-letter prefix', () => {
      const result = validatePrefix('MOB', new Set());
      expect(result.valid).toBe(true);
    });

    it('should accept valid 6-letter prefix', () => {
      const result = validatePrefix('INFRAS', new Set());
      expect(result.valid).toBe(true);
    });

    it('should reject empty prefix', () => {
      const result = validatePrefix('', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/required/i);
    });

    it('should reject single-letter prefix', () => {
      const result = validatePrefix('A', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/2.*6/);
    });

    it('should reject prefix longer than 6 characters', () => {
      const result = validatePrefix('TOOLONG', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/2.*6/);
    });

    it('should reject prefix with numbers', () => {
      const result = validatePrefix('FE1', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/letters/i);
    });

    it('should reject prefix with special characters', () => {
      const result = validatePrefix('F-E', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/letters/i);
    });

    // ─── Case normalization ─────────────────────────────────────

    it('should accept lowercase and normalize to uppercase', () => {
      const result = validatePrefix('fe', new Set());
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('FE');
    });

    it('should accept mixed case and normalize to uppercase', () => {
      const result = validatePrefix('MoB', new Set());
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('MOB');
    });

    // ─── Reserved words ─────────────────────────────────────────

    it('should reject reserved prefix "US"', () => {
      const result = validatePrefix('US', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });

    it('should reject reserved prefix "FS"', () => {
      const result = validatePrefix('FS', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });

    it('should reject reserved prefix "EP"', () => {
      const result = validatePrefix('EP', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });

    it('should reject reserved prefix "AC"', () => {
      const result = validatePrefix('AC', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });

    it('should reject reserved prefix case-insensitively', () => {
      const result = validatePrefix('us', new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });

    // ─── Uniqueness ─────────────────────────────────────────────

    it('should reject duplicate prefix', () => {
      const used = new Set(['FE']);
      const result = validatePrefix('FE', used);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already used/i);
    });

    it('should reject duplicate prefix case-insensitively', () => {
      const used = new Set(['FE']);
      const result = validatePrefix('fe', used);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already used/i);
    });

    it('should accept prefix not in used set', () => {
      const used = new Set(['FE', 'BE']);
      const result = validatePrefix('MOB', used);
      expect(result.valid).toBe(true);
    });
  });

  // ─── Constants ──────────────────────────────────────────────────

  describe('RESERVED_PREFIXES', () => {
    it('should include core SpecWeave identifiers', () => {
      expect(RESERVED_PREFIXES).toContain('US');
      expect(RESERVED_PREFIXES).toContain('FS');
      expect(RESERVED_PREFIXES).toContain('EP');
      expect(RESERVED_PREFIXES).toContain('AC');
    });

    it('should include task prefix', () => {
      expect(RESERVED_PREFIXES).toContain('T');
    });
  });

  describe('ROLE_PREFIX_DEFAULTS', () => {
    it('should map standard roles to prefixes', () => {
      expect(ROLE_PREFIX_DEFAULTS.frontend).toBe('FE');
      expect(ROLE_PREFIX_DEFAULTS.backend).toBe('BE');
      expect(ROLE_PREFIX_DEFAULTS.mobile).toBe('MOB');
      expect(ROLE_PREFIX_DEFAULTS.infra).toBe('INFRA');
      expect(ROLE_PREFIX_DEFAULTS.shared).toBe('SHARED');
    });
  });
});
