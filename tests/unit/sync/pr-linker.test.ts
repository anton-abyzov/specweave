import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveExternalBranchPrefix } from '../../../src/sync/pr-linker.js';

describe('pr-linker', () => {
  describe('resolveExternalBranchPrefix', () => {
    it('returns JIRA key from metadata.jira.issue', () => {
      const metadata = { jira: { issue: 'ID-300' } };
      expect(resolveExternalBranchPrefix(metadata)).toBe('ID-300');
    });

    it('returns JIRA key from externalLinks.jira.issueKey', () => {
      const metadata = { externalLinks: { jira: { issueKey: 'PROJ-42' } } };
      expect(resolveExternalBranchPrefix(metadata)).toBe('PROJ-42');
    });

    it('returns JIRA key from externalLinks.jira.epicKey', () => {
      const metadata = { externalLinks: { jira: { epicKey: 'EPIC-10' } } };
      expect(resolveExternalBranchPrefix(metadata)).toBe('EPIC-10');
    });

    it('returns ADO prefix when no JIRA key', () => {
      const metadata = { externalLinks: { ado: { featureId: 4567 } } };
      expect(resolveExternalBranchPrefix(metadata)).toBe('AB#4567');
    });

    it('prefers JIRA over ADO', () => {
      const metadata = {
        jira: { issue: 'ID-100' },
        externalLinks: { ado: { featureId: 999 } }
      };
      expect(resolveExternalBranchPrefix(metadata)).toBe('ID-100');
    });

    it('returns null when no external links', () => {
      expect(resolveExternalBranchPrefix({})).toBeNull();
    });

    it('deduplicates JIRA keys from multiple sources', () => {
      const metadata = {
        jira: { issue: 'ID-300' },
        externalLinks: { jira: { issueKey: 'ID-300', epicKey: 'ID-300' } }
      };
      // Should still resolve to a single key
      expect(resolveExternalBranchPrefix(metadata)).toBe('ID-300');
    });

    it('collects per-user-story JIRA keys', () => {
      const metadata = {
        externalLinks: {
          jira: {
            userStories: {
              'US-001': { issueKey: 'PROJ-10' },
              'US-002': { issueKey: 'PROJ-11' }
            }
          }
        }
      };
      // Returns first key found
      expect(resolveExternalBranchPrefix(metadata)).toBe('PROJ-10');
    });
  });
});
