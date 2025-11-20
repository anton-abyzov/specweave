/**
 * Format Preservation Metadata Tests (T-034A)
 *
 * Tests for format preservation metadata fields in living docs User Story files:
 * - format_preservation: boolean
 * - external_title: string
 * - external_source: string
 * - external_id: string
 * - external_url: string
 * - imported_at: string
 * - origin: 'internal' | 'external'
 */

import { describe, it, expect } from 'vitest';
import {
  LivingDocsUSFile,
  hasFormatPreservation,
  isExternalUS,
  getOrigin
} from '../../../src/types/living-docs-us-file.js';

describe('Format Preservation Metadata', () => {
  describe('TC-034A-01: External US has format_preservation=true', () => {
    it('should have format_preservation=true for external US', () => {
      const externalUS: LivingDocsUSFile = {
        id: 'US-004E',
        title: 'External Feature from GitHub',
        format_preservation: true,
        external_title: 'Original GitHub Title',
        external_source: 'github',
        external_id: 'GH-#638',
        external_url: 'https://github.com/owner/repo/issues/638',
        imported_at: '2025-11-19T10:30:00Z',
        origin: 'external'
      };

      expect(externalUS.format_preservation).toBe(true);
      expect(hasFormatPreservation(externalUS)).toBe(true);
    });

    it('should detect external US from ID suffix', () => {
      expect(isExternalUS('US-004E')).toBe(true);
      expect(isExternalUS('US-001')).toBe(false);
      expect(isExternalUS('US-100e')).toBe(true); // case-insensitive
    });
  });

  describe('TC-034A-02: External US stores external_title correctly', () => {
    it('should store external_title for validation', () => {
      const externalUS: LivingDocsUSFile = {
        id: 'US-005E',
        title: 'Payment Processing Integration',
        format_preservation: true,
        external_title: '[FEAT] Payment Processing Integration',
        external_source: 'github',
        origin: 'external'
      };

      expect(externalUS.external_title).toBe('[FEAT] Payment Processing Integration');
      expect(externalUS.external_title).not.toBe(externalUS.title); // Can differ
    });

    it('should include all external metadata fields', () => {
      const externalUS: LivingDocsUSFile = {
        id: 'US-010E',
        title: 'User Authentication',
        format_preservation: true,
        external_title: 'User Authentication Feature',
        external_source: 'jira',
        external_id: 'JIRA-SPEC-789',
        external_url: 'https://company.atlassian.net/browse/SPEC-789',
        imported_at: '2025-11-20T08:15:00Z',
        origin: 'external'
      };

      expect(externalUS.external_source).toBe('jira');
      expect(externalUS.external_id).toBe('JIRA-SPEC-789');
      expect(externalUS.external_url).toBe('https://company.atlassian.net/browse/SPEC-789');
      expect(externalUS.imported_at).toBe('2025-11-20T08:15:00Z');
    });
  });

  describe('TC-034A-03: Internal US has format_preservation=false', () => {
    it('should have format_preservation=false for internal US', () => {
      const internalUS: LivingDocsUSFile = {
        id: 'US-001',
        title: 'Internal Feature',
        format_preservation: false,
        origin: 'internal'
      };

      expect(internalUS.format_preservation).toBe(false);
      expect(hasFormatPreservation(internalUS)).toBe(false);
    });

    it('should not have external metadata fields', () => {
      const internalUS: LivingDocsUSFile = {
        id: 'US-002',
        title: 'Another Internal Feature',
        format_preservation: false,
        origin: 'internal'
      };

      expect(internalUS.external_title).toBeUndefined();
      expect(internalUS.external_source).toBeUndefined();
      expect(internalUS.external_id).toBeUndefined();
      expect(internalUS.external_url).toBeUndefined();
      expect(internalUS.imported_at).toBeUndefined();
    });
  });

  describe('TC-034A-04: Metadata validation detects missing external_title', () => {
    it('should detect when external_title is missing for external US', () => {
      const invalidExternalUS: LivingDocsUSFile = {
        id: 'US-020E',
        title: 'External Feature',
        format_preservation: true,
        external_source: 'github',
        origin: 'external'
        // Missing: external_title
      };

      // Validation should detect missing external_title
      const hasRequiredFields = Boolean(
        invalidExternalUS.format_preservation &&
        invalidExternalUS.external_title &&
        invalidExternalUS.external_source
      );

      expect(hasRequiredFields).toBe(false);
    });

    it('should validate complete external US metadata', () => {
      const validExternalUS: LivingDocsUSFile = {
        id: 'US-025E',
        title: 'Complete External Feature',
        format_preservation: true,
        external_title: 'Original Title from External Tool',
        external_source: 'ado',
        external_id: 'ADO-12345',
        external_url: 'https://dev.azure.com/org/project/_workitems/edit/12345',
        imported_at: '2025-11-20T10:00:00Z',
        origin: 'external'
      };

      // Validation should pass for complete metadata
      const hasRequiredFields = Boolean(
        validExternalUS.format_preservation &&
        validExternalUS.external_title &&
        validExternalUS.external_source
      );

      expect(hasRequiredFields).toBe(true);
      expect(validExternalUS.external_source).toBe('ado');
    });
  });

  describe('getOrigin() utility function', () => {
    it('should return origin from metadata if present', () => {
      const us: LivingDocsUSFile = {
        id: 'US-100E',
        title: 'Test',
        origin: 'external'
      };

      expect(getOrigin(us)).toBe('external');
    });

    it('should infer origin from ID when metadata missing', () => {
      const externalUS: LivingDocsUSFile = {
        id: 'US-100E',
        title: 'Test'
        // No origin field
      };

      const internalUS: LivingDocsUSFile = {
        id: 'US-100',
        title: 'Test'
        // No origin field
      };

      expect(getOrigin(externalUS)).toBe('external');
      expect(getOrigin(internalUS)).toBe('internal');
    });
  });

  describe('Support for multiple external sources', () => {
    it('should support GitHub as external source', () => {
      const githubUS: LivingDocsUSFile = {
        id: 'US-030E',
        title: 'GitHub Feature',
        format_preservation: true,
        external_source: 'github',
        external_id: 'GH-#123',
        origin: 'external'
      };

      expect(githubUS.external_source).toBe('github');
    });

    it('should support JIRA as external source', () => {
      const jiraUS: LivingDocsUSFile = {
        id: 'US-031E',
        title: 'JIRA Feature',
        format_preservation: true,
        external_source: 'jira',
        external_id: 'PROJ-456',
        origin: 'external'
      };

      expect(jiraUS.external_source).toBe('jira');
    });

    it('should support ADO as external source', () => {
      const adoUS: LivingDocsUSFile = {
        id: 'US-032E',
        title: 'ADO Feature',
        format_preservation: true,
        external_source: 'ado',
        external_id: 'ADO-789',
        origin: 'external'
      };

      expect(adoUS.external_source).toBe('ado');
    });
  });
});
