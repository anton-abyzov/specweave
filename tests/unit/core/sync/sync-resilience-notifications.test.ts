import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncResilience, SyncResilienceParams } from '../../../../src/core/sync/sync-resilience.js';
import { CircuitBreakerRegistry } from '../../../../src/core/sync/circuit-breaker-registry.js';
import { SyncRetryQueue } from '../../../../src/core/sync/sync-retry-queue.js';
import { SyncResilienceAuditLogger } from '../../../../src/core/sync/sync-resilience-audit-logger.js';
import { CachedRateLimiter } from '../../../../src/core/sync/cached-rate-limiter.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SyncResilience — notification wiring', () => {
  let tempDir: string;
  let mockSyncFn: ReturnType<typeof vi.fn>;
  let mockNotificationAdd: ReturnType<typeof vi.fn>;
  let resilience: SyncResilience;

  const baseParams: SyncResilienceParams = {
    incrementId: '0499-test',
    provider: 'github',
    featureId: 'FS-499',
    projectPath: '/test/path',
    projectName: 'specweave',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-notif-test-'));
    mockSyncFn = vi.fn().mockResolvedValue(undefined);
    mockNotificationAdd = vi.fn().mockResolvedValue({ id: 'notif-test' });

    resilience = new SyncResilience({
      registry: new CircuitBreakerRegistry(),
      retryQueue: new SyncRetryQueue({ statePath: tempDir }),
      auditLogger: new SyncResilienceAuditLogger({ statePath: tempDir }),
      rateLimiter: new CachedRateLimiter({
        checkRateLimit: vi.fn().mockResolvedValue({
          remaining: 4000, limit: 5000,
          resetAt: new Date(Date.now() + 3600_000), percentUsed: 20,
        }),
      }),
      syncFn: mockSyncFn,
      notificationAdd: mockNotificationAdd,
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('writes warning notification on retryable sync failure', async () => {
    mockSyncFn.mockRejectedValue(new Error('API rate limit exceeded'));

    await resilience.syncWithResilience(baseParams);

    expect(mockNotificationAdd).toHaveBeenCalledTimes(1);
    const call = mockNotificationAdd.mock.calls[0][0];
    expect(call.type).toBe('sync-failure');
    expect(call.severity).toBe('warning');
    expect(call.title).toContain('github');
  });

  it('does NOT write notification on success', async () => {
    await resilience.syncWithResilience(baseParams);

    expect(mockNotificationAdd).not.toHaveBeenCalled();
  });

  it('writes warning notification on circuit open skip', async () => {
    const registry = new CircuitBreakerRegistry();
    const breaker = registry.get('github');
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    resilience = new SyncResilience({
      registry,
      retryQueue: new SyncRetryQueue({ statePath: tempDir }),
      auditLogger: new SyncResilienceAuditLogger({ statePath: tempDir }),
      rateLimiter: new CachedRateLimiter({
        checkRateLimit: vi.fn().mockResolvedValue({
          remaining: 4000, limit: 5000,
          resetAt: new Date(Date.now() + 3600_000), percentUsed: 20,
        }),
      }),
      syncFn: mockSyncFn,
      notificationAdd: mockNotificationAdd,
    });

    await resilience.syncWithResilience(baseParams);

    expect(mockNotificationAdd).toHaveBeenCalledTimes(1);
    const call = mockNotificationAdd.mock.calls[0][0];
    expect(call.severity).toBe('warning');
    expect(call.message).toContain('Circuit breaker');
  });
});
