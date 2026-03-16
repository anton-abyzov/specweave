/**
 * Integration Test: Multi-Provider Partial Failure Isolation (T-027)
 *
 * Verifies that when one provider fails, other providers still succeed
 * and the increment is NOT rolled back.
 *
 * Setup: GitHub (mock success) + JIRA (mock success) + ADO (mock 503)
 * Expected: GitHub/JIRA syncs succeed, ADO failure reported,
 *           increment state preserved.
 *
 * @integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncError } from '../../../src/core/errors/sync-error.js';

// Mock providers as ProviderAdapter implementations
import type {
  ProviderAdapter,
  ExternalRef,
  UserStoryData,
  FeatureData,
  SyncResult,
} from '../../../src/sync/engine.js';
import { SyncEngine } from '../../../src/sync/engine.js';
import { resolvePermissions } from '../../../src/sync/config.js';

function makeMockProvider(
  platform: 'github' | 'jira' | 'ado',
  behavior: 'succeed' | { failStatus: number }
): ProviderAdapter {
  const suffix = platform === 'github' ? 'G' : platform === 'jira' ? 'J' : 'A';

  return {
    platform: platform as any,
    suffix: suffix as any,
    testConnection: vi.fn().mockResolvedValue({ ok: behavior === 'succeed' }),
    createIssue: vi.fn().mockImplementation(async (story: UserStoryData, feature: FeatureData): Promise<ExternalRef> => {
      if (behavior !== 'succeed') {
        throw new SyncError(platform, behavior.failStatus, `${behavior.failStatus} Service Unavailable`, `Push failed`);
      }
      return {
        platform: platform as any,
        id: `${platform}-issue-1`,
        url: `https://${platform}.example.com/issue/1`,
        userStory: story.id,
      };
    }),
    updateIssue: vi.fn().mockResolvedValue(undefined),
    closeIssue: vi.fn().mockResolvedValue(undefined),
    reopenIssue: vi.fn().mockResolvedValue(undefined),
    pullChanges: vi.fn().mockResolvedValue([]),
    getIssueState: vi.fn().mockResolvedValue({ status: 'open', labels: [], title: '' }),
    applyLabels: vi.fn().mockResolvedValue(undefined),
    detectHierarchy: vi.fn().mockResolvedValue({ pattern: 'flat', levels: [] }),
    reconcile: vi.fn().mockResolvedValue({ created: 0, updated: 0, closed: 0, errors: [] }),
    generateLabels: vi.fn().mockReturnValue([]),
  };
}

describe('Multi-Provider Partial Failure Isolation (T-027)', () => {
  let engine: SyncEngine;
  let githubProvider: ProviderAdapter;
  let jiraProvider: ProviderAdapter;
  let adoProvider: ProviderAdapter;
  let stderrOutput: string[];

  const testStory: UserStoryData = {
    id: 'US-T027',
    title: 'Multi-provider isolation test',
    description: 'Test partial failure across providers.',
    priority: 'P2',
  };

  const testFeature: FeatureData = {
    id: 'FS-T027',
    title: 'Multi-Provider Test Feature',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stderrOutput = [];

    // Capture stderr
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      stderrOutput.push(String(msg));
    });

    // GitHub succeeds, JIRA succeeds, ADO fails with 503
    githubProvider = makeMockProvider('github', 'succeed');
    jiraProvider = makeMockProvider('jira', 'succeed');
    adoProvider = makeMockProvider('ado', { failStatus: 503 });

    engine = new SyncEngine({ permissions: resolvePermissions('bidirectional') });
    engine.registerProvider(githubProvider);
    engine.registerProvider(jiraProvider);
    engine.registerProvider(adoProvider);
  });

  it('GitHub and JIRA push succeeds when ADO fails', async () => {
    // Push to GitHub — should succeed
    const githubResult = await engine.push('github', {
      userStory: testStory,
      feature: testFeature,
    });
    expect(githubResult.ref.platform).toBe('github');
    expect(githubResult.action).toBe('created');

    // Push to JIRA — should succeed
    const jiraResult = await engine.push('jira', {
      userStory: testStory,
      feature: testFeature,
    });
    expect(jiraResult.ref.platform).toBe('jira');
    expect(jiraResult.action).toBe('created');

    // Push to ADO — should throw SyncError
    await expect(
      engine.push('ado', { userStory: testStory, feature: testFeature })
    ).rejects.toThrow(SyncError);
  });

  it('ADO failure contains SyncError with provider="ado" and httpStatus=503', async () => {
    try {
      await engine.push('ado', { userStory: testStory, feature: testFeature });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SyncError);
      const syncErr = err as SyncError;
      expect(syncErr.provider).toBe('ado');
      expect(syncErr.httpStatus).toBe(503);
      expect(syncErr.message).toMatch(/\[ADO\] sync failed: 503/);
    }
  });

  it('GitHub and JIRA results are independent of ADO failure', async () => {
    // Track results per provider
    const results: Record<string, SyncResult | null> = {
      github: null,
      jira: null,
      ado: null,
    };
    const errors: Record<string, Error | null> = {
      github: null,
      jira: null,
      ado: null,
    };

    // Push to all providers, collecting results
    for (const platform of ['github', 'jira', 'ado'] as const) {
      try {
        results[platform] = await engine.push(platform, {
          userStory: testStory,
          feature: testFeature,
        });
      } catch (err) {
        errors[platform] = err as Error;
      }
    }

    // GitHub succeeded
    expect(results.github).not.toBeNull();
    expect(results.github!.ref.platform).toBe('github');
    expect(errors.github).toBeNull();

    // JIRA succeeded
    expect(results.jira).not.toBeNull();
    expect(results.jira!.ref.platform).toBe('jira');
    expect(errors.jira).toBeNull();

    // ADO failed
    expect(results.ado).toBeNull();
    expect(errors.ado).toBeInstanceOf(SyncError);
    expect((errors.ado as SyncError).httpStatus).toBe(503);
  });

  it('ADO failure does not roll back GitHub/JIRA work', async () => {
    // Push GitHub and JIRA first
    await engine.push('github', { userStory: testStory, feature: testFeature });
    await engine.push('jira', { userStory: testStory, feature: testFeature });

    // ADO push fails
    await expect(
      engine.push('ado', { userStory: testStory, feature: testFeature })
    ).rejects.toThrow();

    // Verify GitHub and JIRA createIssue were called and not reversed
    expect(githubProvider.createIssue).toHaveBeenCalledTimes(1);
    expect(jiraProvider.createIssue).toHaveBeenCalledTimes(1);

    // No close/rollback calls on GitHub or JIRA
    expect(githubProvider.closeIssue).not.toHaveBeenCalled();
    expect(jiraProvider.closeIssue).not.toHaveBeenCalled();
  });
});
