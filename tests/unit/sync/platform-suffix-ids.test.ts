import { describe, it, expect } from 'vitest';
import {
  parseId,
  isExternalId as isExternalIdNew,
  getPlatformFromSuffix,
  getSuffixFromPlatform,
  formatId,
  SUFFIX_MAP,
  PLATFORM_MAP,
  type PlatformSuffix,
  type Platform,
  type ParsedId,
  type IdPrefix,
} from '../../../src/sync/types.js';

describe('Platform Suffix ID System', () => {
  describe('parseId', () => {
    it('should parse internal ID without suffix', () => {
      const result = parseId('FS-042');
      expect(result).toEqual({
        prefix: 'FS',
        number: 42,
        suffix: undefined,
        platform: undefined,
        isExternal: false,
      });
    });

    it('should parse GitHub external ID with G suffix', () => {
      const result = parseId('FS-042G');
      expect(result).toEqual({
        prefix: 'FS',
        number: 42,
        suffix: 'G',
        platform: 'github',
        isExternal: true,
      });
    });

    it('should parse JIRA external ID with J suffix', () => {
      const result = parseId('US-004J');
      expect(result).toEqual({
        prefix: 'US',
        number: 4,
        suffix: 'J',
        platform: 'jira',
        isExternal: true,
      });
    });

    it('should parse ADO external ID with A suffix', () => {
      const result = parseId('T-010A');
      expect(result).toEqual({
        prefix: 'T',
        number: 10,
        suffix: 'A',
        platform: 'ado',
        isExternal: true,
      });
    });

    it('should parse legacy E suffix as external', () => {
      const result = parseId('FS-042E');
      expect(result).toEqual({
        prefix: 'FS',
        number: 42,
        suffix: 'E',
        platform: undefined,
        isExternal: true,
      });
    });

    it('should return null for invalid IDs', () => {
      expect(parseId('')).toBeNull();
      expect(parseId('INVALID')).toBeNull();
      expect(parseId('XX-042G')).toBeNull();
      expect(parseId('FS-')).toBeNull();
      expect(parseId('FS-abcG')).toBeNull();
    });

    it('should handle all prefixes: FS, US, T', () => {
      expect(parseId('FS-001')!.prefix).toBe('FS');
      expect(parseId('US-001')!.prefix).toBe('US');
      expect(parseId('T-001')!.prefix).toBe('T');
    });

    it('should handle large numbers', () => {
      const result = parseId('FS-9999G');
      expect(result!.number).toBe(9999);
      expect(result!.suffix).toBe('G');
    });
  });

  describe('isExternalId (new)', () => {
    it('should return true for G suffix', () => {
      expect(isExternalIdNew('FS-042G')).toBe(true);
      expect(isExternalIdNew('US-004G')).toBe(true);
      expect(isExternalIdNew('T-010G')).toBe(true);
    });

    it('should return true for J suffix', () => {
      expect(isExternalIdNew('FS-042J')).toBe(true);
    });

    it('should return true for A suffix', () => {
      expect(isExternalIdNew('FS-042A')).toBe(true);
    });

    it('should return true for legacy E suffix (backward compat)', () => {
      expect(isExternalIdNew('FS-042E')).toBe(true);
      expect(isExternalIdNew('US-004E')).toBe(true);
    });

    it('should return false for internal IDs', () => {
      expect(isExternalIdNew('FS-042')).toBe(false);
      expect(isExternalIdNew('US-004')).toBe(false);
      expect(isExternalIdNew('T-010')).toBe(false);
    });

    it('should return false for invalid strings', () => {
      expect(isExternalIdNew('')).toBe(false);
      expect(isExternalIdNew('INVALID')).toBe(false);
    });
  });

  describe('Independent namespaces (AC-US1-04)', () => {
    it('should allow FS-042 and FS-042G to coexist', () => {
      const internal = parseId('FS-042');
      const external = parseId('FS-042G');

      expect(internal!.isExternal).toBe(false);
      expect(external!.isExternal).toBe(true);
      expect(internal!.number).toBe(external!.number);
      expect(internal!.suffix).not.toBe(external!.suffix);
    });

    it('should treat same number with different suffixes as different items', () => {
      const github = parseId('US-010G');
      const jira = parseId('US-010J');
      const ado = parseId('US-010A');
      const internal = parseId('US-010');

      expect(github!.platform).toBe('github');
      expect(jira!.platform).toBe('jira');
      expect(ado!.platform).toBe('ado');
      expect(internal!.platform).toBeUndefined();
    });
  });

  describe('getPlatformFromSuffix', () => {
    it('should map G to github', () => {
      expect(getPlatformFromSuffix('G')).toBe('github');
    });

    it('should map J to jira', () => {
      expect(getPlatformFromSuffix('J')).toBe('jira');
    });

    it('should map A to ado', () => {
      expect(getPlatformFromSuffix('A')).toBe('ado');
    });

    it('should return undefined for E (legacy)', () => {
      expect(getPlatformFromSuffix('E')).toBeUndefined();
    });
  });

  describe('getSuffixFromPlatform', () => {
    it('should map github to G', () => {
      expect(getSuffixFromPlatform('github')).toBe('G');
    });

    it('should map jira to J', () => {
      expect(getSuffixFromPlatform('jira')).toBe('J');
    });

    it('should map ado to A', () => {
      expect(getSuffixFromPlatform('ado')).toBe('A');
    });
  });

  describe('formatId', () => {
    it('should format internal ID', () => {
      expect(formatId('FS', 42)).toBe('FS-042');
    });

    it('should format external ID with suffix', () => {
      expect(formatId('FS', 42, 'G')).toBe('FS-042G');
      expect(formatId('US', 4, 'J')).toBe('US-004J');
      expect(formatId('T', 10, 'A')).toBe('T-010A');
    });

    it('should pad numbers to 3 digits', () => {
      expect(formatId('FS', 1)).toBe('FS-001');
      expect(formatId('FS', 1, 'G')).toBe('FS-001G');
    });

    it('should not truncate numbers larger than 3 digits', () => {
      expect(formatId('FS', 1234)).toBe('FS-1234');
      expect(formatId('FS', 1234, 'G')).toBe('FS-1234G');
    });
  });

  describe('SUFFIX_MAP and PLATFORM_MAP constants', () => {
    it('should have all platforms in SUFFIX_MAP', () => {
      expect(SUFFIX_MAP.github).toBe('G');
      expect(SUFFIX_MAP.jira).toBe('J');
      expect(SUFFIX_MAP.ado).toBe('A');
    });

    it('should have all suffixes in PLATFORM_MAP', () => {
      expect(PLATFORM_MAP.G).toBe('github');
      expect(PLATFORM_MAP.J).toBe('jira');
      expect(PLATFORM_MAP.A).toBe('ado');
    });

    it('should be inverse mappings', () => {
      for (const [platform, suffix] of Object.entries(SUFFIX_MAP)) {
        expect(PLATFORM_MAP[suffix as PlatformSuffix]).toBe(platform);
      }
    });
  });
});
