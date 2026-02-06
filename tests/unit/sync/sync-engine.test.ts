import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncEngine,
  type ProviderAdapter,
  type ExternalRef,
  type SyncResult,
  type PullResult,
  type ReconcileResult,
  type ExternalChange,
  type FieldChanges,
  type ItemState,
  type DetectedHierarchy,
  type Label,
} from '../../../src/sync/engine.js';
import { type SyncPermissions } from '../../../src/sync/config.js';
import { type Platform } from '../../../src/sync/types.js';

function createMockAdapter(platform: Platform): ProviderAdapter {
  return {
    platform,
    suffix: platform === 'github' ? 'G' : platform === 'jira' ? 'J' : 'A',

    testConnection: vi.fn().mockResolvedValue({ ok: true }),

    createIssue: vi.fn().mockResolvedValue({
      platform,
      id: '123',
      url: `https://example.com/${platform}/123`,
      userStory: 'US-001',
    }),

    updateIssue: vi.fn().mockResolvedValue(undefined),
    closeIssue: vi.fn().mockResolvedValue(undefined),
    reopenIssue: vi.fn().mockResolvedValue(undefined),

    pullChanges: vi.fn().mockResolvedValue([]),

    getIssueState: vi.fn().mockResolvedValue({
      status: 'open',
      labels: [],
      title: 'Test Issue',
    }),

    applyLabels: vi.fn().mockResolvedValue(undefined),

    detectHierarchy: vi.fn().mockResolvedValue({
      pattern: 'standard',
      levels: [],
    }),

    reconcile: vi.fn().mockResolvedValue({
      created: 0,
      updated: 0,
      closed: 0,
      errors: [],
    }),

    generateLabels: vi.fn().mockReturnValue([
      { name: 'priority:P1', color: '0075ca' },
      { name: 'type:user-story', color: 'e4e669' },
    ]),
  };
}

describe('SyncEngine', () => {
  let engine: SyncEngine;
  let githubAdapter: ProviderAdapter;
  let jiraAdapter: ProviderAdapter;

  beforeEach(() => {
    githubAdapter = createMockAdapter('github');
    jiraAdapter = createMockAdapter('jira');

    engine = new SyncEngine({
      permissions: {
        canRead: true,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      },
    });

    engine.registerProvider(githubAdapter);
    engine.registerProvider(jiraAdapter);
  });

  describe('Provider registration', () => {
    it('should register and retrieve providers', () => {
      expect(engine.getProvider('github')).toBe(githubAdapter);
      expect(engine.getProvider('jira')).toBe(jiraAdapter);
    });

    it('should return undefined for unregistered provider', () => {
      expect(engine.getProvider('ado')).toBeUndefined();
    });

    it('should list all registered platforms', () => {
      const platforms = engine.getRegisteredPlatforms();
      expect(platforms).toContain('github');
      expect(platforms).toContain('jira');
      expect(platforms).not.toContain('ado');
    });
  });

  describe('push', () => {
    it('should call createIssue on the specified provider', async () => {
      const result = await engine.push('github', {
        userStory: { id: 'US-001', title: 'Auth Flow' },
        feature: { id: 'FS-042', title: 'Auth Module' },
      });

      expect(githubAdapter.createIssue).toHaveBeenCalledOnce();
      expect(result.ref).toBeDefined();
      expect(result.ref.platform).toBe('github');
    });

    it('should throw when permissions deny upsert', async () => {
      engine = new SyncEngine({
        permissions: { canRead: true, canUpdateStatus: false, canUpsert: false, canDelete: false },
      });
      engine.registerProvider(githubAdapter);

      await expect(
        engine.push('github', {
          userStory: { id: 'US-001', title: 'Auth Flow' },
          feature: { id: 'FS-042', title: 'Auth Module' },
        })
      ).rejects.toThrow(/permission/i);
    });

    it('should throw for unregistered provider', async () => {
      await expect(
        engine.push('ado', {
          userStory: { id: 'US-001', title: 'Auth Flow' },
          feature: { id: 'FS-042', title: 'Auth Module' },
        })
      ).rejects.toThrow(/not registered/i);
    });
  });

  describe('pull', () => {
    it('should call pullChanges on specified provider', async () => {
      const changes: ExternalChange[] = [
        { type: 'status_change', ref: { platform: 'github', id: '1', url: '', userStory: 'US-001' }, data: { status: 'closed' } },
      ];
      (githubAdapter.pullChanges as ReturnType<typeof vi.fn>).mockResolvedValue(changes);

      const result = await engine.pull('github');
      expect(githubAdapter.pullChanges).toHaveBeenCalledOnce();
      expect(result.changes).toHaveLength(1);
    });

    it('should throw when permissions deny read', async () => {
      engine = new SyncEngine({
        permissions: { canRead: false, canUpdateStatus: false, canUpsert: false, canDelete: false },
      });
      engine.registerProvider(githubAdapter);

      await expect(engine.pull('github')).rejects.toThrow(/permission/i);
    });
  });

  describe('reconcile', () => {
    it('should call reconcile on specified provider', async () => {
      const result = await engine.reconcile('github', []);
      expect(githubAdapter.reconcile).toHaveBeenCalledOnce();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('testConnection', () => {
    it('should test connection for a provider', async () => {
      const result = await engine.testConnection('github');
      expect(result.ok).toBe(true);
    });

    it('should report failed connection', async () => {
      (githubAdapter.testConnection as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: 'Auth failed',
      });

      const result = await engine.testConnection('github');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Auth failed');
    });
  });

  describe('updateIssue', () => {
    it('should delegate to provider', async () => {
      const ref: ExternalRef = { platform: 'github', id: '123', url: '', userStory: 'US-001' };
      await engine.updateIssue(ref, { title: 'Updated' });
      expect(githubAdapter.updateIssue).toHaveBeenCalledWith(ref, { title: 'Updated' });
    });
  });

  describe('closeIssue', () => {
    it('should delegate to provider', async () => {
      const ref: ExternalRef = { platform: 'github', id: '123', url: '', userStory: 'US-001' };
      await engine.closeIssue(ref, 'Done');
      expect(githubAdapter.closeIssue).toHaveBeenCalledWith(ref, 'Done');
    });
  });
});
