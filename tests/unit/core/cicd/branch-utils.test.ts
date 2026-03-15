import { describe, it, expect } from 'vitest';
import { buildBranchName } from '../../../../src/core/cicd/branch-utils.js';

describe('branch-utils', () => {
  describe('buildBranchName', () => {
    it('returns default format when includeExternalKey is false', () => {
      const metadata = { jira: { issue: 'PROJ-123' } };
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
        includeExternalKey: false,
      });
      expect(result).toBe('sw/0521-smart-linking');
    });

    it('returns default format when includeExternalKey is undefined', () => {
      const metadata = { jira: { issue: 'PROJ-123' } };
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
      });
      expect(result).toBe('sw/0521-smart-linking');
    });

    it('includes JIRA key when includeExternalKey is true', () => {
      const metadata = { jira: { issue: 'PROJ-123' } };
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
        includeExternalKey: true,
      });
      expect(result).toBe('PROJ-123/sw/0521-smart-linking');
    });

    it('includes ADO key when includeExternalKey is true and no JIRA', () => {
      const metadata = { externalLinks: { ado: { featureId: 456 } } };
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
        includeExternalKey: true,
      });
      expect(result).toBe('AB#456/sw/0521-smart-linking');
    });

    it('falls back to default when includeExternalKey true but no external refs', () => {
      const metadata = {};
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
        includeExternalKey: true,
      });
      expect(result).toBe('sw/0521-smart-linking');
    });

    it('falls back to default when metadata is null', () => {
      const result = buildBranchName('0521-smart-linking', null, {
        branchPrefix: 'sw/',
        includeExternalKey: true,
      });
      expect(result).toBe('sw/0521-smart-linking');
    });

    it('uses default branchPrefix when not specified', () => {
      const result = buildBranchName('0521-smart-linking', null);
      expect(result).toBe('sw/0521-smart-linking');
    });

    it('respects custom branchPrefix', () => {
      const result = buildBranchName('0521-smart-linking', null, {
        branchPrefix: 'feature/',
      });
      expect(result).toBe('feature/0521-smart-linking');
    });

    it('prefers JIRA key over ADO when both exist', () => {
      const metadata = {
        jira: { issue: 'ID-100' },
        externalLinks: { ado: { featureId: 999 } },
      };
      const result = buildBranchName('0521-smart-linking', metadata, {
        branchPrefix: 'sw/',
        includeExternalKey: true,
      });
      expect(result).toBe('ID-100/sw/0521-smart-linking');
    });
  });
});
