import { describe, it, expect } from 'vitest';
import {
  validateSyncConfigConsistency,
  type SyncConfigIssue,
} from '../../../src/sync/config.js';

describe('Sync Config Consistency Validation', () => {
  describe('validateSyncConfigConsistency', () => {
    it('should detect enabled=false with write flags true', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          canUpdateStatus: true,
        },
      });

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.type === 'contradiction')).toBe(true);
      expect(issues.some(i => i.message.includes('enabled') || i.message.includes('disabled'))).toBe(true);
    });

    it('should pass for consistent enabled=true config', () => {
      const issues = validateSyncConfigConsistency({
        enabled: true,
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          canUpdateStatus: true,
        },
      });

      const contradictions = issues.filter(i => i.type === 'contradiction');
      expect(contradictions).toHaveLength(0);
    });

    it('should pass for consistent disabled config', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: {
          canUpsertInternalItems: false,
          canUpdateExternalItems: false,
          canUpdateStatus: false,
        },
      });

      const contradictions = issues.filter(i => i.type === 'contradiction');
      expect(contradictions).toHaveLength(0);
    });

    it('should detect missing provider config when enabled', () => {
      const issues = validateSyncConfigConsistency({
        enabled: true,
        github: { enabled: true },
      });

      expect(issues.some(i => i.type === 'warning' && i.message.includes('github'))).toBe(true);
    });

    it('should provide suggested fix for each issue', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          canUpdateStatus: true,
        },
      });

      for (const issue of issues) {
        expect(issue.suggestedFix).toBeDefined();
        expect(issue.suggestedFix.length).toBeGreaterThan(0);
      }
    });

    it('should detect sync-metadata failures', () => {
      const issues = validateSyncConfigConsistency(
        { enabled: true },
        {
          github: { lastSyncResult: 'failed', lastImportCount: 0 },
          jira: { lastSyncResult: 'failed', lastImportCount: 0 },
        }
      );

      expect(issues.some(i => i.type === 'failure' && i.message.includes('github'))).toBe(true);
      expect(issues.some(i => i.type === 'failure' && i.message.includes('jira'))).toBe(true);
    });

    it('should not flag successful sync-metadata', () => {
      const issues = validateSyncConfigConsistency(
        { enabled: true },
        {
          github: { lastSyncResult: 'success', lastImportCount: 5 },
        }
      );

      const failures = issues.filter(i => i.type === 'failure');
      expect(failures).toHaveLength(0);
    });
  });
});
