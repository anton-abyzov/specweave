import { describe, it, expect } from 'vitest';
import {
  parseIncrementFolder,
  deriveFeatureId,
  createIncrementFolderName,
} from '../../../src/sync/types.js';

describe('Increment Folder Platform Suffix', () => {
  describe('parseIncrementFolder', () => {
    it('should parse internal folder without suffix', () => {
      const result = parseIncrementFolder('0042-auth-flow');
      expect(result).toEqual({
        number: 42,
        suffix: undefined,
        platform: undefined,
        name: 'auth-flow',
        isExternal: false,
      });
    });

    it('should parse GitHub folder with G suffix', () => {
      const result = parseIncrementFolder('0042G-auth-flow');
      expect(result).toEqual({
        number: 42,
        suffix: 'G',
        platform: 'github',
        name: 'auth-flow',
        isExternal: true,
      });
    });

    it('should parse JIRA folder with J suffix', () => {
      const result = parseIncrementFolder('0042J-auth-flow');
      expect(result).toEqual({
        number: 42,
        suffix: 'J',
        platform: 'jira',
        name: 'auth-flow',
        isExternal: true,
      });
    });

    it('should parse ADO folder with A suffix', () => {
      const result = parseIncrementFolder('0042A-auth-flow');
      expect(result).toEqual({
        number: 42,
        suffix: 'A',
        platform: 'ado',
        name: 'auth-flow',
        isExternal: true,
      });
    });

    it('should parse legacy E suffix folder', () => {
      const result = parseIncrementFolder('0042E-auth-flow');
      expect(result).toEqual({
        number: 42,
        suffix: 'E',
        platform: undefined,
        name: 'auth-flow',
        isExternal: true,
      });
    });

    it('should handle multi-word names', () => {
      const result = parseIncrementFolder('0190-sync-architecture-redesign');
      expect(result!.number).toBe(190);
      expect(result!.name).toBe('sync-architecture-redesign');
    });

    it('should return null for invalid folder names', () => {
      expect(parseIncrementFolder('')).toBeNull();
      expect(parseIncrementFolder('invalid')).toBeNull();
      expect(parseIncrementFolder('abc-name')).toBeNull();
    });
  });

  describe('deriveFeatureId', () => {
    it('should derive FS-042 from internal folder', () => {
      expect(deriveFeatureId('0042-auth-flow')).toBe('FS-042');
    });

    it('should derive FS-042G from GitHub folder', () => {
      expect(deriveFeatureId('0042G-auth-flow')).toBe('FS-042G');
    });

    it('should derive FS-042J from JIRA folder', () => {
      expect(deriveFeatureId('0042J-auth-flow')).toBe('FS-042J');
    });

    it('should derive FS-042A from ADO folder', () => {
      expect(deriveFeatureId('0042A-auth-flow')).toBe('FS-042A');
    });

    it('should derive FS-042E from legacy folder', () => {
      expect(deriveFeatureId('0042E-auth-flow')).toBe('FS-042E');
    });

    it('should return null for invalid folder', () => {
      expect(deriveFeatureId('invalid')).toBeNull();
    });
  });

  describe('createIncrementFolderName', () => {
    it('should create internal folder name', () => {
      expect(createIncrementFolderName(42, 'auth-flow')).toBe('0042-auth-flow');
    });

    it('should create GitHub folder name', () => {
      expect(createIncrementFolderName(42, 'auth-flow', 'G')).toBe('0042G-auth-flow');
    });

    it('should create JIRA folder name', () => {
      expect(createIncrementFolderName(42, 'auth-flow', 'J')).toBe('0042J-auth-flow');
    });

    it('should create ADO folder name', () => {
      expect(createIncrementFolderName(42, 'auth-flow', 'A')).toBe('0042A-auth-flow');
    });

    it('should pad number to 4 digits', () => {
      expect(createIncrementFolderName(1, 'setup')).toBe('0001-setup');
      expect(createIncrementFolderName(1, 'setup', 'G')).toBe('0001G-setup');
    });

    it('should not truncate numbers larger than 4 digits', () => {
      expect(createIncrementFolderName(12345, 'big')).toBe('12345-big');
    });
  });

  describe('Sorting behavior (AC-US2-05)', () => {
    it('should sort internal and external folders adjacently by numeric prefix', () => {
      const folders = [
        '0042G-from-github',
        '0041-other',
        '0042-internal',
        '0043J-from-jira',
        '0043-internal-next',
      ];

      const sorted = [...folders].sort();
      expect(sorted).toEqual([
        '0041-other',
        '0042-internal',
        '0042G-from-github',
        '0043-internal-next',
        '0043J-from-jira',
      ]);
    });
  });
});
