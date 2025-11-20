import { describe, it, expect } from 'vitest';
import {
  getOriginBadge,
  formatOrigin,
  isExternalId,
  getOriginFromId,
  parseExternalId,
  createExternalMetadata,
  validateExternalMetadata,
  ORIGIN_BADGES,
  type ExternalItemMetadata,
  type ExternalSource
} from '../../../../src/core/types/origin-metadata.js';

describe('Origin Metadata', () => {
  describe('getOriginBadge', () => {
    it('should return correct badge for GitHub', () => {
      expect(getOriginBadge('github')).toBe('🔗');
    });

    it('should return correct badge for JIRA', () => {
      expect(getOriginBadge('jira')).toBe('🎫');
    });

    it('should return correct badge for Azure DevOps', () => {
      expect(getOriginBadge('ado')).toBe('📋');
    });

    it('should return correct badge for internal', () => {
      expect(getOriginBadge('internal')).toBe('🏠');
    });

    it('should return unknown badge for invalid source', () => {
      expect(getOriginBadge('unknown')).toBe('❓');
    });

    it('should have all expected badge mappings', () => {
      expect(ORIGIN_BADGES).toHaveProperty('internal');
      expect(ORIGIN_BADGES).toHaveProperty('github');
      expect(ORIGIN_BADGES).toHaveProperty('jira');
      expect(ORIGIN_BADGES).toHaveProperty('ado');
      expect(ORIGIN_BADGES).toHaveProperty('unknown');
    });
  });

  describe('formatOrigin', () => {
    it('should format GitHub origin with badge and link', () => {
      const metadata: ExternalItemMetadata = {
        id: 'US-004E',
        origin: 'external',
        source: 'github',
        external_id: 'GH-#638',
        external_url: 'https://github.com/owner/repo/issues/638',
        imported_at: '2025-11-19T10:30:00Z'
      };

      const formatted = formatOrigin(metadata);
      expect(formatted).toBe('🔗 [GITHUB #638](https://github.com/owner/repo/issues/638)');
    });

    it('should format JIRA origin with badge and link', () => {
      const metadata: ExternalItemMetadata = {
        id: 'US-010E',
        origin: 'external',
        source: 'jira',
        external_id: 'JIRA-SPEC-789',
        external_url: 'https://jira.company.com/browse/SPEC-789',
        imported_at: '2025-11-19T10:30:00Z'
      };

      const formatted = formatOrigin(metadata);
      expect(formatted).toBe('🎫 [JIRA SPEC-789](https://jira.company.com/browse/SPEC-789)');
    });

    it('should format ADO origin with badge and link', () => {
      const metadata: ExternalItemMetadata = {
        id: 'US-015E',
        origin: 'external',
        source: 'ado',
        external_id: 'ADO-12345',
        external_url: 'https://dev.azure.com/org/project/_workitems/edit/12345',
        imported_at: '2025-11-19T10:30:00Z'
      };

      const formatted = formatOrigin(metadata);
      expect(formatted).toBe('📋 [ADO 12345](https://dev.azure.com/org/project/_workitems/edit/12345)');
    });
  });

  describe('isExternalId', () => {
    it('should return true for external User Story ID', () => {
      expect(isExternalId('US-004E')).toBe(true);
      expect(isExternalId('US-010E')).toBe(true);
      expect(isExternalId('US-100E')).toBe(true);
    });

    it('should return true for external Task ID', () => {
      expect(isExternalId('T-004E')).toBe(true);
      expect(isExternalId('T-010E')).toBe(true);
    });

    it('should return false for internal User Story ID', () => {
      expect(isExternalId('US-001')).toBe(false);
      expect(isExternalId('US-010')).toBe(false);
      expect(isExternalId('US-100')).toBe(false);
    });

    it('should return false for internal Task ID', () => {
      expect(isExternalId('T-001')).toBe(false);
      expect(isExternalId('T-010')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isExternalId('E')).toBe(true); // Ends with E
      expect(isExternalId('TESTE')).toBe(true);
      expect(isExternalId('')).toBe(false);
    });
  });

  describe('getOriginFromId', () => {
    it('should return external for IDs with E suffix', () => {
      expect(getOriginFromId('US-004E')).toBe('external');
      expect(getOriginFromId('T-010E')).toBe('external');
    });

    it('should return internal for IDs without E suffix', () => {
      expect(getOriginFromId('US-001')).toBe('internal');
      expect(getOriginFromId('T-005')).toBe('internal');
    });
  });

  describe('parseExternalId', () => {
    describe('GitHub IDs', () => {
      it('should parse GitHub ID with hash', () => {
        const result = parseExternalId('GH-#638');
        expect(result).toEqual({ source: 'github', number: '638' });
      });

      it('should parse GitHub ID without hash', () => {
        const result = parseExternalId('GH-638');
        expect(result).toEqual({ source: 'github', number: '638' });
      });

      it('should parse large GitHub issue numbers', () => {
        const result = parseExternalId('GH-#12345');
        expect(result).toEqual({ source: 'github', number: '12345' });
      });
    });

    describe('JIRA IDs', () => {
      it('should parse JIRA ID with project key', () => {
        const result = parseExternalId('JIRA-SPEC-789');
        expect(result).toEqual({ source: 'jira', number: 'SPEC-789' });
      });

      it('should parse JIRA ID with different project key', () => {
        const result = parseExternalId('JIRA-PROJECT-123');
        expect(result).toEqual({ source: 'jira', number: 'PROJECT-123' });
      });
    });

    describe('Azure DevOps IDs', () => {
      it('should parse ADO ID', () => {
        const result = parseExternalId('ADO-12345');
        expect(result).toEqual({ source: 'ado', number: '12345' });
      });

      it('should parse large ADO work item numbers', () => {
        const result = parseExternalId('ADO-987654');
        expect(result).toEqual({ source: 'ado', number: '987654' });
      });
    });

    describe('Invalid IDs', () => {
      it('should return null for unrecognized format', () => {
        expect(parseExternalId('INVALID-123')).toBeNull();
        expect(parseExternalId('US-001')).toBeNull();
        expect(parseExternalId('random-string')).toBeNull();
      });

      it('should return null for empty string', () => {
        expect(parseExternalId('')).toBeNull();
      });
    });
  });

  describe('createExternalMetadata', () => {
    it('should create valid external metadata for GitHub', () => {
      const metadata = createExternalMetadata({
        id: 'US-004E',
        source: 'github',
        externalId: 'GH-#638',
        externalUrl: 'https://github.com/owner/repo/issues/638',
        externalTitle: 'Original GitHub Title',
        formatPreservation: true
      });

      expect(metadata.id).toBe('US-004E');
      expect(metadata.origin).toBe('external');
      expect(metadata.source).toBe('github');
      expect(metadata.external_id).toBe('GH-#638');
      expect(metadata.external_url).toBe('https://github.com/owner/repo/issues/638');
      expect(metadata.external_title).toBe('Original GitHub Title');
      expect(metadata.format_preservation).toBe(true);
      expect(metadata.imported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    });

    it('should create metadata with format preservation flag', () => {
      const metadata = createExternalMetadata({
        id: 'US-010E',
        source: 'jira',
        externalId: 'JIRA-SPEC-789',
        externalUrl: 'https://jira.example.com/browse/SPEC-789',
        formatPreservation: false
      });

      expect(metadata.format_preservation).toBe(false);
    });

    it('should generate current timestamp for imported_at', () => {
      const beforeTimestamp = new Date().toISOString();
      const metadata = createExternalMetadata({
        id: 'US-015E',
        source: 'ado',
        externalId: 'ADO-12345',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/12345'
      });
      const afterTimestamp = new Date().toISOString();

      expect(metadata.imported_at >= beforeTimestamp).toBe(true);
      expect(metadata.imported_at <= afterTimestamp).toBe(true);
    });
  });

  describe('validateExternalMetadata', () => {
    const validMetadata: ExternalItemMetadata = {
      id: 'US-004E',
      origin: 'external',
      source: 'github',
      external_id: 'GH-#638',
      external_url: 'https://github.com/owner/repo/issues/638',
      imported_at: '2025-11-19T10:30:00Z'
    };

    it('should validate correct metadata without errors', () => {
      expect(() => validateExternalMetadata(validMetadata)).not.toThrow();
    });

    it('should throw if id is missing', () => {
      const invalid = { ...validMetadata, id: '' };
      expect(() => validateExternalMetadata(invalid)).toThrow('must have id');
    });

    it('should throw if id does not have E suffix', () => {
      const invalid = { ...validMetadata, id: 'US-004' }; // Missing E
      expect(() => validateExternalMetadata(invalid)).toThrow('must end with E suffix');
    });

    it('should throw if origin is not external', () => {
      const invalid = { ...validMetadata, origin: 'internal' as 'external' };
      expect(() => validateExternalMetadata(invalid)).toThrow("origin='external'");
    });

    it('should throw if source is invalid', () => {
      const invalid = { ...validMetadata, source: 'invalid' as ExternalSource };
      expect(() => validateExternalMetadata(invalid)).toThrow('Invalid external source');
    });

    it('should throw if external_id is missing', () => {
      const invalid = { ...validMetadata, external_id: '' };
      expect(() => validateExternalMetadata(invalid)).toThrow('must have external_id');
    });

    it('should throw if external_url is missing', () => {
      const invalid = { ...validMetadata, external_url: '' };
      expect(() => validateExternalMetadata(invalid)).toThrow('must have external_url');
    });

    it('should throw if imported_at is missing', () => {
      const invalid = { ...validMetadata, imported_at: '' };
      expect(() => validateExternalMetadata(invalid)).toThrow('must have imported_at');
    });

    it('should throw if imported_at is not valid ISO 8601', () => {
      const invalid = { ...validMetadata, imported_at: 'not-a-timestamp' };
      expect(() => validateExternalMetadata(invalid)).toThrow('Invalid imported_at timestamp');
    });

    it('should accept various valid ISO 8601 formats', () => {
      const validFormats = [
        '2025-11-19T10:30:00Z',
        '2025-11-19T10:30:00.000Z',
        '2025-11-19T10:30:00+00:00',
        '2025-11-19T10:30:00-05:00'
      ];

      for (const format of validFormats) {
        const metadata = { ...validMetadata, imported_at: format };
        expect(() => validateExternalMetadata(metadata)).not.toThrow();
      }
    });
  });

  describe('Integration Tests', () => {
    it('should create, validate, and format external item', () => {
      // Create metadata
      const metadata = createExternalMetadata({
        id: 'US-042E',
        source: 'github',
        externalId: 'GH-#638',
        externalUrl: 'https://github.com/owner/repo/issues/638',
        externalTitle: 'Original GitHub Title',
        formatPreservation: true
      });

      // Validate
      expect(() => validateExternalMetadata(metadata)).not.toThrow();

      // Format for display
      const formatted = formatOrigin(metadata);
      expect(formatted).toContain('🔗');
      expect(formatted).toContain('GITHUB #638');
      expect(formatted).toContain('https://github.com/owner/repo/issues/638');

      // Check origin
      expect(getOriginFromId(metadata.id)).toBe('external');
      expect(isExternalId(metadata.id)).toBe(true);
    });

    it('should handle full lifecycle for JIRA item', () => {
      // Parse external ID
      const parsed = parseExternalId('JIRA-SPEC-789');
      expect(parsed).toEqual({ source: 'jira', number: 'SPEC-789' });

      // Create metadata
      const metadata = createExternalMetadata({
        id: 'US-050E',
        source: parsed!.source,
        externalId: 'JIRA-SPEC-789',
        externalUrl: 'https://jira.example.com/browse/SPEC-789',
        externalTitle: 'Original JIRA Epic',
        formatPreservation: true
      });

      // Validate
      validateExternalMetadata(metadata);

      // Format
      const formatted = formatOrigin(metadata);
      expect(formatted).toBe('🎫 [JIRA SPEC-789](https://jira.example.com/browse/SPEC-789)');
    });

    it('should handle full lifecycle for ADO item', () => {
      const metadata = createExternalMetadata({
        id: 'T-020E',
        source: 'ado',
        externalId: 'ADO-12345',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/12345',
        externalTitle: 'Original ADO Work Item'
      });

      validateExternalMetadata(metadata);

      const formatted = formatOrigin(metadata);
      expect(formatted).toBe('📋 [ADO 12345](https://dev.azure.com/org/project/_workitems/edit/12345)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle metadata without optional fields', () => {
      const minimalMetadata: ExternalItemMetadata = {
        id: 'US-001E',
        origin: 'external',
        source: 'github',
        external_id: 'GH-#1',
        external_url: 'https://github.com/owner/repo/issues/1',
        imported_at: '2025-11-19T10:30:00Z'
        // No external_title or format_preservation
      };

      expect(() => validateExternalMetadata(minimalMetadata)).not.toThrow();
      expect(formatOrigin(minimalMetadata)).toBe('🔗 [GITHUB #1](https://github.com/owner/repo/issues/1)');
    });

    it('should handle very long external IDs', () => {
      const metadata = createExternalMetadata({
        id: 'US-999E',
        source: 'jira',
        externalId: 'JIRA-VERY-LONG-PROJECT-KEY-12345',
        externalUrl: 'https://jira.example.com/browse/VERY-LONG-PROJECT-KEY-12345'
      });

      validateExternalMetadata(metadata);
      const formatted = formatOrigin(metadata);
      expect(formatted).toContain('VERY-LONG-PROJECT-KEY-12345');
    });

    it('should handle special characters in external URLs', () => {
      const metadata = createExternalMetadata({
        id: 'US-100E',
        source: 'github',
        externalId: 'GH-#100',
        externalUrl: 'https://github.com/owner/repo-name_with-special.chars/issues/100?query=param'
      });

      validateExternalMetadata(metadata);
      const formatted = formatOrigin(metadata);
      expect(formatted).toContain('repo-name_with-special.chars');
    });
  });
});
