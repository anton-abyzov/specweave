import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncResilience, SyncResilienceParams } from '../../../../src/core/sync/sync-resilience.js';
import { CircuitBreakerRegistry } from '../../../../src/core/sync/circuit-breaker-registry.js';
import { SyncRetryQueue } from '../../../../src/core/sync/sync-retry-queue.js';
import { SyncResilienceAuditLogger } from '../../../../src/core/sync/sync-resilience-audit-logger.js';
import { CachedRateLimiter } from '../../../../src/core/sync/cached-rate-limiter.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SyncResilience', () => {
  let tempDir: string;
  let registry: CircuitBreakerRegistry;
  let retryQueue: SyncRetryQueue;
  let auditLogger: SyncResilienceAuditLogger;
  let rateLimiter: CachedRateLimiter;
  let mockSyncFn: ReturnType<typeof vi.fn>;
  let resilience: SyncResilience;

  const baseParams: SyncResilienceParams = {
    incrementId: '0499-test',
    provider: 'github',
    featureId: 'FS-499',
    projectPath: '/test/path',
    projectName: 'specweave',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-resilience-test-'));
    registry = new CircuitBreakerRegistry();
    retryQueue = new SyncRetryQueue({ statePath: tempDir });
    auditLogger = new SyncResilienceAuditLogger({ statePath: tempDir });
    rateLimiter = new CachedRateLimiter({
      checkRateLimit: vi.fn().mockResolvedValue({
        remaining: 4000,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000),
        percentUsed: 20,
      }),
    });
    mockSyncFn = vi.fn().mockResolvedValue(undefined);

    resilience = new SyncResilience({
      registry,
      retryQueue,
      auditLogger,
      rateLimiter,
      syncFn: mockSyncFn,
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('calls syncFn and records success on happy path', async () => {
    const result = await resilience.syncWithResilience(baseParams);

    expect(result.ok).toBe(true);
    expect(mockSyncFn).toHaveBeenCalledTimes(1);

    // Audit entry recorded
    const entries = await auditLogger.readRecent(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe('success');
    expect(entries[0].durationMs).toBeDefined();
  });

  it('skips sync when circuit breaker is open', async () => {
    const breaker = registry.get('github');
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false);

    const result = await resilience.syncWithResilience(baseParams);

    expect(result.ok).toBe(false);
    expect(result.skipped).toBe('circuit_open');
    expect(mockSyncFn).not.toHaveBeenCalled();

    // Retry enqueued
    const queueEntries = await retryQueue.getAll();
    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].provider).toBe('github');

    // Audit records skipped
    const auditEntries = await auditLogger.readRecent(1);
    expect(auditEntries[0].outcome).toBe('skipped_circuit_open');
  });

  it('skips sync when rate limiter returns not allowed for github', async () => {
    rateLimiter = new CachedRateLimiter({
      checkRateLimit: vi.fn().mockResolvedValue({
        remaining: 2,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000),
        percentUsed: 99.96,
      }),
    });
    resilience = new SyncResilience({
      registry,
      retryQueue,
      auditLogger,
      rateLimiter,
      syncFn: mockSyncFn,
    });

    const result = await resilience.syncWithResilience(baseParams);

    expect(result.ok).toBe(false);
    expect(result.skipped).toBe('rate_limit');
    expect(mockSyncFn).not.toHaveBeenCalled();

    const queueEntries = await retryQueue.getAll();
    expect(queueEntries).toHaveLength(1);
  });

  it('does NOT check rate limiter for non-github providers', async () => {
    // Rate limiter would block, but for jira it shouldn't be checked
    rateLimiter = new CachedRateLimiter({
      checkRateLimit: vi.fn().mockResolvedValue({
        remaining: 0,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000),
        percentUsed: 100,
      }),
    });
    resilience = new SyncResilience({
      registry,
      retryQueue,
      auditLogger,
      rateLimiter,
      syncFn: mockSyncFn,
    });

    const jiraParams = { ...baseParams, provider: 'jira' };
    const result = await resilience.syncWithResilience(jiraParams);

    expect(result.ok).toBe(true);
    expect(mockSyncFn).toHaveBeenCalledTimes(1);
  });

  it('enqueues retry and records failure when syncFn throws', async () => {
    mockSyncFn.mockRejectedValue(new Error('Network timeout'));

    const result = await resilience.syncWithResilience(baseParams);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network timeout');

    // Retry enqueued
    const queueEntries = await retryQueue.getAll();
    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].error).toBe('Network timeout');

    // Audit records failure
    const auditEntries = await auditLogger.readRecent(1);
    expect(auditEntries[0].outcome).toBe('failure');

    // Circuit breaker records failure
    const state = registry.get('github').getState();
    expect(state.failures).toBe(1);
  });

  it('never throws — always returns SyncResilienceResult', async () => {
    mockSyncFn.mockRejectedValue(new Error('catastrophic failure'));

    const result = await resilience.syncWithResilience(baseParams);
    expect(result).toBeDefined();
    expect(result.ok).toBe(false);
  });

  it('records success on circuit breaker after successful sync', async () => {
    const breaker = registry.get('github');
    breaker.recordFailure(); // 1 failure, still closed

    await resilience.syncWithResilience(baseParams);

    const state = breaker.getState();
    expect(state.failures).toBe(0);
    expect(state.state).toBe('closed');
  });
});
