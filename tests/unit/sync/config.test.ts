/**
 * Tests for sync/config.ts — Permission Presets & Config Validation
 */
import { describe, it, expect } from 'vitest';
import {
  resolvePermissions,
  validateSyncConfigConsistency,
  PRESET_DEFAULTS,
  type SyncPreset,
  type SyncPermissions,
} from '../../../src/sync/config.js';

describe('PRESET_DEFAULTS', () => {
  it('defines read-only preset with canRead only', () => {
    expect(PRESET_DEFAULTS['read-only']).toEqual({
      canRead: true,
      canUpdateStatus: false,
      canUpsert: false,
      canDelete: false,
    });
  });

  it('defines push-only preset with write but no read', () => {
    expect(PRESET_DEFAULTS['push-only']).toEqual({
      canRead: false,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: false,
    });
  });

  it('defines bidirectional preset with read+write', () => {
    expect(PRESET_DEFAULTS.bidirectional).toEqual({
      canRead: true,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: false,
    });
  });

  it('defines full-control preset with all permissions', () => {
    expect(PRESET_DEFAULTS['full-control']).toEqual({
      canRead: true,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: true,
    });
  });
});

describe('resolvePermissions', () => {
  describe('preset resolution', () => {
    it('returns read-only defaults for read-only preset', () => {
      const perms = resolvePermissions('read-only');
      expect(perms).toEqual(PRESET_DEFAULTS['read-only']);
    });

    it('returns push-only defaults for push-only preset', () => {
      const perms = resolvePermissions('push-only');
      expect(perms).toEqual(PRESET_DEFAULTS['push-only']);
    });

    it('returns bidirectional defaults for bidirectional preset', () => {
      const perms = resolvePermissions('bidirectional');
      expect(perms).toEqual(PRESET_DEFAULTS.bidirectional);
    });

    it('returns full-control defaults for full-control preset', () => {
      const perms = resolvePermissions('full-control');
      expect(perms).toEqual(PRESET_DEFAULTS['full-control']);
    });
  });

  describe('override application', () => {
    it('applies overrides on top of preset', () => {
      const perms = resolvePermissions('read-only', { canDelete: true });
      expect(perms.canRead).toBe(true);
      expect(perms.canDelete).toBe(true);
      expect(perms.canUpsert).toBe(false);
    });

    it('overrides canRead on push-only preset', () => {
      const perms = resolvePermissions('push-only', { canRead: true });
      expect(perms.canRead).toBe(true);
      expect(perms.canUpsert).toBe(true);
    });

    it('disables permission via override', () => {
      const perms = resolvePermissions('full-control', { canDelete: false });
      expect(perms.canDelete).toBe(false);
      expect(perms.canUpsert).toBe(true);
    });

    it('applies multiple overrides', () => {
      const perms = resolvePermissions('read-only', {
        canUpdateStatus: true,
        canUpsert: true,
      });
      expect(perms.canRead).toBe(true);
      expect(perms.canUpdateStatus).toBe(true);
      expect(perms.canUpsert).toBe(true);
      expect(perms.canDelete).toBe(false);
    });
  });

  describe('legacy settings fallback', () => {
    it('maps legacy canUpdateExternalItems to canRead', () => {
      const perms = resolvePermissions(undefined, undefined, {
        canUpdateExternalItems: true,
      });
      expect(perms.canRead).toBe(true);
    });

    it('maps legacy canUpdateStatus', () => {
      const perms = resolvePermissions(undefined, undefined, {
        canUpdateStatus: true,
      });
      expect(perms.canUpdateStatus).toBe(true);
    });

    it('maps legacy canUpsertInternalItems to canUpsert', () => {
      const perms = resolvePermissions(undefined, undefined, {
        canUpsertInternalItems: true,
      });
      expect(perms.canUpsert).toBe(true);
    });

    it('legacy always has canDelete=false', () => {
      const perms = resolvePermissions(undefined, undefined, {
        canUpdateExternalItems: true,
        canUpsertInternalItems: true,
        canUpdateStatus: true,
      });
      expect(perms.canDelete).toBe(false);
    });

    it('maps all false legacy settings', () => {
      const perms = resolvePermissions(undefined, undefined, {
        canUpdateExternalItems: false,
        canUpdateStatus: false,
      });
      expect(perms.canRead).toBe(false);
      expect(perms.canUpdateStatus).toBe(false);
    });
  });

  describe('no arguments', () => {
    it('defaults to read-only when no args', () => {
      const perms = resolvePermissions();
      expect(perms).toEqual(PRESET_DEFAULTS['read-only']);
    });

    it('defaults to read-only with undefined preset and no legacy', () => {
      const perms = resolvePermissions(undefined, undefined, undefined);
      expect(perms).toEqual(PRESET_DEFAULTS['read-only']);
    });
  });

  describe('preset takes priority over legacy', () => {
    it('uses preset even when legacy settings provided', () => {
      const perms = resolvePermissions('full-control', undefined, {
        canUpdateExternalItems: false,
      });
      expect(perms.canRead).toBe(true);
      expect(perms.canDelete).toBe(true);
    });
  });

  describe('does not mutate PRESET_DEFAULTS', () => {
    it('returns a copy, not the original', () => {
      const perms = resolvePermissions('read-only');
      perms.canDelete = true;
      expect(PRESET_DEFAULTS['read-only'].canDelete).toBe(false);
    });
  });
});

describe('validateSyncConfigConsistency', () => {
  describe('contradiction detection', () => {
    it('detects enabled=false with write flags true', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: { canUpsertInternalItems: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('contradiction');
    });

    it('detects enabled=false with canUpdateExternalItems true', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: { canUpdateExternalItems: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('contradiction');
    });

    it('detects enabled=false with canUpdateStatus true', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: { canUpdateStatus: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('contradiction');
    });

    it('no contradiction when enabled=false and all flags false', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: {
          canUpsertInternalItems: false,
          canUpdateExternalItems: false,
          canUpdateStatus: false,
        },
      });
      expect(issues).toHaveLength(0);
    });

    it('no contradiction when enabled=true with write flags', () => {
      const issues = validateSyncConfigConsistency({
        enabled: true,
        settings: { canUpdateExternalItems: true },
      });
      expect(issues).toHaveLength(0);
    });
  });

  describe('provider incomplete config warnings', () => {
    it('warns when github enabled but no owner/repo', () => {
      const issues = validateSyncConfigConsistency({
        github: { enabled: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('warning');
      expect(issues[0].message).toContain('GitHub');
    });

    it('no warning when github has owner and repo', () => {
      const issues = validateSyncConfigConsistency({
        github: { enabled: true, owner: 'org', repo: 'repo' },
      });
      expect(issues).toHaveLength(0);
    });

    it('warns when jira enabled but no domain', () => {
      const issues = validateSyncConfigConsistency({
        jira: { enabled: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('warning');
      expect(issues[0].message).toContain('JIRA');
    });

    it('no warning when jira has domain', () => {
      const issues = validateSyncConfigConsistency({
        jira: { enabled: true, domain: 'myco.atlassian.net' },
      });
      expect(issues).toHaveLength(0);
    });

    it('warns when ado enabled but no organization', () => {
      const issues = validateSyncConfigConsistency({
        ado: { enabled: true },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('warning');
      expect(issues[0].message).toContain('ADO');
    });

    it('no warning when ado has organization', () => {
      const issues = validateSyncConfigConsistency({
        ado: { enabled: true, organization: 'myorg' },
      });
      expect(issues).toHaveLength(0);
    });

    it('skips provider checks when enabled=false', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        github: { enabled: true },
        jira: { enabled: true },
        ado: { enabled: true },
      });
      // Only the contradiction if write flags are set, but no provider warnings
      expect(issues.filter(i => i.type === 'warning')).toHaveLength(0);
    });
  });

  describe('sync metadata failures', () => {
    it('reports platform sync failure', () => {
      const issues = validateSyncConfigConsistency({}, {
        github: { lastSyncResult: 'failed', lastImportCount: 0 },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('failure');
      expect(issues[0].message).toContain('github');
    });

    it('reports multiple platform failures', () => {
      const issues = validateSyncConfigConsistency({}, {
        github: { lastSyncResult: 'failed', lastImportCount: 0 },
        jira: { lastSyncResult: 'failed', lastImportCount: 5 },
      });
      expect(issues).toHaveLength(2);
    });

    it('ignores successful sync metadata', () => {
      const issues = validateSyncConfigConsistency({}, {
        github: { lastSyncResult: 'success', lastImportCount: 10 },
      });
      expect(issues).toHaveLength(0);
    });

    it('handles missing metadata gracefully', () => {
      const issues = validateSyncConfigConsistency({});
      expect(issues).toHaveLength(0);
    });
  });

  describe('combined issues', () => {
    it('reports multiple issue types at once', () => {
      const issues = validateSyncConfigConsistency(
        {
          enabled: false,
          settings: { canUpdateExternalItems: true },
          github: { enabled: true },
        },
        {
          jira: { lastSyncResult: 'failed', lastImportCount: 0 },
        },
      );
      expect(issues.length).toBeGreaterThanOrEqual(2);
      const types = issues.map(i => i.type);
      expect(types).toContain('contradiction');
      expect(types).toContain('failure');
    });
  });

  describe('issue structure', () => {
    it('each issue has type, message, and suggestedFix', () => {
      const issues = validateSyncConfigConsistency({
        enabled: false,
        settings: { canUpdateExternalItems: true },
      });
      for (const issue of issues) {
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('suggestedFix');
        expect(typeof issue.message).toBe('string');
        expect(typeof issue.suggestedFix).toBe('string');
      }
    });
  });
});
