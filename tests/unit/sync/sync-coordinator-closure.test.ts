/**
 * Unit tests for SyncCoordinator closure dispatcher wiring (T-013)
 *
 * Tests that the closure dispatcher config builder correctly gates
 * providers based on hooks config and sync settings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchClosure,
  buildClosureConfigFromHooks,
  type ClosureConfig,
  type ClosureContext,
  type ProviderCloseFn,
} from '../../../src/core/closure-dispatcher.js';
import { SyncError } from '../../../src/core/errors/sync-error.js';

describe('SyncCoordinator closure dispatcher wiring', () => {
  let closeFns: Record<string, ProviderCloseFn>;
  let baseContext: ClosureContext;

  beforeEach(() => {
    vi.restoreAllMocks();

    closeFns = {
      github: vi.fn().mockResolvedValue({ closed: ['US-001'], provider: 'github' }),
      jira: vi.fn().mockResolvedValue({ closed: ['PROJ-123'], provider: 'jira' }),
      ado: vi.fn().mockResolvedValue({ closed: ['WI-456'], provider: 'ado' }),
    };

    baseContext = {
      projectRoot: '/tmp/test-project',
      incrementId: '0100-test-feature',
    };
  });

  describe('dispatchClosure with all 3 providers enabled', () => {
    it('calls all provider close functions after living docs sync', async () => {
      const config: ClosureConfig = { github: true, jira: true, ado: true };
      const result = await dispatchClosure(baseContext, config, closeFns);

      expect(closeFns.github).toHaveBeenCalledOnce();
      expect(closeFns.jira).toHaveBeenCalledOnce();
      expect(closeFns.ado).toHaveBeenCalledOnce();
      expect(result.incrementClosed).toBe(true);
      expect(result.successes).toHaveLength(3);
    });
  });

  describe('config gating via buildClosureConfigFromHooks', () => {
    it('canUpdateExternalItems false → dispatchClosure NOT called (all disabled)', () => {
      const config = buildClosureConfigFromHooks(
        { post_increment_done: { close_github_issue: true, close_jira_issue: true } },
        { canUpdateExternalItems: false },
      );

      expect(config.github).toBe(false);
      expect(config.jira).toBe(false);
      expect(config.ado).toBe(false);
    });

    it('all providers default to true when hooks section exists and canUpdate is true', () => {
      const config = buildClosureConfigFromHooks(
        { post_increment_done: { close_github_issue: true } },
        { canUpdateExternalItems: true },
      );

      expect(config.github).toBe(true);
      expect(config.jira).toBe(true);
      expect(config.ado).toBe(true);
    });

    it('respects per-provider flags: close_jira_issue false skips JIRA', () => {
      const config = buildClosureConfigFromHooks(
        { post_increment_done: { close_github_issue: true, close_jira_issue: false } },
        { canUpdateExternalItems: true },
      );

      expect(config.github).toBe(true);
      expect(config.jira).toBe(false);
      expect(config.ado).toBe(true);
    });

    it('no hooks config → all disabled', () => {
      const config = buildClosureConfigFromHooks(undefined, { canUpdateExternalItems: true });
      expect(config.github).toBe(false);
      expect(config.jira).toBe(false);
      expect(config.ado).toBe(false);
    });

    it('no post_increment_done section → all disabled', () => {
      const config = buildClosureConfigFromHooks({}, { canUpdateExternalItems: true });
      expect(config.github).toBe(false);
      expect(config.jira).toBe(false);
      expect(config.ado).toBe(false);
    });
  });

  describe('partial failure isolation', () => {
    it('ADO failure does not prevent GitHub and JIRA closure', async () => {
      (closeFns.ado as ReturnType<typeof vi.fn>).mockRejectedValue(
        new SyncError('ado', 503, 'Service Unavailable', 'down'),
      );

      const config: ClosureConfig = { github: true, jira: true, ado: true };
      const result = await dispatchClosure(baseContext, config, closeFns);

      expect(result.incrementClosed).toBe(true);
      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].provider).toBe('ado');
    });
  });
});
