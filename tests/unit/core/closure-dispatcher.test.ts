/**
 * Unit tests for closure-dispatcher
 *
 * Tests the function-map closure dispatcher per ADR-0240:
 * - Dispatches to all enabled providers (GitHub, JIRA, ADO)
 * - Partial failures don't block other providers
 * - Config gating skips disabled providers
 * - Results aggregate successes and failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchClosure,
  type ClosureConfig,
  type ClosureContext,
  type ProviderCloseFn,
} from '../../../src/core/closure-dispatcher.js';
import { SyncError } from '../../../src/core/errors/sync-error.js';

describe('closure-dispatcher', () => {
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

  it('calls all 3 providers when all enabled', async () => {
    const config: ClosureConfig = {
      github: true,
      jira: true,
      ado: true,
    };

    const result = await dispatchClosure(baseContext, config, closeFns);

    expect(closeFns.github).toHaveBeenCalledOnce();
    expect(closeFns.jira).toHaveBeenCalledOnce();
    expect(closeFns.ado).toHaveBeenCalledOnce();
    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(3);
    expect(result.failures).toHaveLength(0);
  });

  it('skips disabled providers', async () => {
    const config: ClosureConfig = {
      github: true,
      jira: false,
      ado: false,
    };

    const result = await dispatchClosure(baseContext, config, closeFns);

    expect(closeFns.github).toHaveBeenCalledOnce();
    expect(closeFns.jira).not.toHaveBeenCalled();
    expect(closeFns.ado).not.toHaveBeenCalled();
    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(1);
  });

  it('ADO throws SyncError — promise resolves, error in failures, incrementClosed true', async () => {
    const adoError = new SyncError('ado', 503, 'Service Unavailable', 'ADO is down');
    (closeFns.ado as ReturnType<typeof vi.fn>).mockRejectedValue(adoError);

    const config: ClosureConfig = {
      github: true,
      jira: true,
      ado: true,
    };

    const result = await dispatchClosure(baseContext, config, closeFns);

    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].provider).toBe('ado');
    expect(result.failures[0].error).toContain('ADO');
  });

  it('both JIRA and ADO throw — both errors in failures, incrementClosed true', async () => {
    const jiraError = new SyncError('jira', 401, 'Unauthorized', 'bad token');
    const adoError = new SyncError('ado', 500, 'Internal', 'server crash');
    (closeFns.jira as ReturnType<typeof vi.fn>).mockRejectedValue(jiraError);
    (closeFns.ado as ReturnType<typeof vi.fn>).mockRejectedValue(adoError);

    const config: ClosureConfig = {
      github: true,
      jira: true,
      ado: true,
    };

    const result = await dispatchClosure(baseContext, config, closeFns);

    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(1);
    expect(result.failures).toHaveLength(2);
  });

  it('all disabled — returns immediately, incrementClosed true', async () => {
    const config: ClosureConfig = {
      github: false,
      jira: false,
      ado: false,
    };

    const result = await dispatchClosure(baseContext, config, closeFns);

    expect(closeFns.github).not.toHaveBeenCalled();
    expect(closeFns.jira).not.toHaveBeenCalled();
    expect(closeFns.ado).not.toHaveBeenCalled();
    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  it('passes context to each provider function', async () => {
    const config: ClosureConfig = {
      github: true,
      jira: false,
      ado: false,
    };

    await dispatchClosure(baseContext, config, closeFns);

    expect(closeFns.github).toHaveBeenCalledWith(baseContext);
  });

  it('missing provider function is skipped without error', async () => {
    const sparseCloseFns: Record<string, ProviderCloseFn> = {
      github: vi.fn().mockResolvedValue({ closed: [], provider: 'github' }),
      // jira and ado not provided
    };

    const config: ClosureConfig = {
      github: true,
      jira: true,
      ado: true,
    };

    const result = await dispatchClosure(baseContext, config, sparseCloseFns);

    expect(result.incrementClosed).toBe(true);
    expect(result.successes).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
  });
});
