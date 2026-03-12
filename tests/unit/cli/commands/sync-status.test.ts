import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncStatusCommand } from '../../../../src/cli/commands/sync-status.js';
import { SyncRetryQueue } from '../../../../src/core/sync/sync-retry-queue.js';
import { CircuitBreakerRegistry } from '../../../../src/core/sync/circuit-breaker-registry.js';
import { SyncResilienceAuditLogger } from '../../../../src/core/sync/sync-resilience-audit-logger.js';

describe('syncStatusCommand', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-status-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('returns healthy when queue is empty and no breakers', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const result = await syncStatusCommand(tempDir, {
      retryQueue: new SyncRetryQueue({ statePath }),
      registry: new CircuitBreakerRegistry(),
      auditLogger: new SyncResilienceAuditLogger({ statePath }),
    });
    expect(result.hasIssues).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.retryQueuePending).toBe(0);
  });

  it('reports pending retry queue entries', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const queue = new SyncRetryQueue({ statePath });
    await queue.enqueue({
      incrementId: '0001-test',
      provider: 'github',
      featureId: 'FS-001',
      projectPath: '/test',
      projectName: 'test',
      error: 'rate limited',
    });
    const result = await syncStatusCommand(tempDir, {
      retryQueue: queue,
      registry: new CircuitBreakerRegistry(),
      auditLogger: new SyncResilienceAuditLogger({ statePath }),
    });
    expect(result.retryQueuePending).toBe(1);
    expect(result.hasIssues).toBe(true);
    expect(result.exitCode).toBe(1);
  });

  it('reports open circuit breakers', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const registry = new CircuitBreakerRegistry();
    const breaker = registry.get('github');
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure(); // Opens the circuit
    const result = await syncStatusCommand(tempDir, {
      retryQueue: new SyncRetryQueue({ statePath }),
      registry,
      auditLogger: new SyncResilienceAuditLogger({ statePath }),
    });
    expect(result.circuitBreakers['github']).toBe('open');
    expect(result.hasIssues).toBe(true);
    expect(result.exitCode).toBe(1);
  });

  it('reports recent errors from audit log', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const auditLogger = new SyncResilienceAuditLogger({ statePath });
    await auditLogger.append({
      incrementId: '0001-test',
      provider: 'github',
      outcome: 'failure',
      error: 'API error',
    });
    await auditLogger.append({
      incrementId: '0001-test',
      provider: 'github',
      outcome: 'success',
    });
    const result = await syncStatusCommand(tempDir, {
      retryQueue: new SyncRetryQueue({ statePath }),
      registry: new CircuitBreakerRegistry(),
      auditLogger,
    });
    expect(result.recentErrors).toBe(1);
  });

  it('exits 0 when all healthy', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const result = await syncStatusCommand(tempDir, {
      retryQueue: new SyncRetryQueue({ statePath }),
      registry: new CircuitBreakerRegistry(),
      auditLogger: new SyncResilienceAuditLogger({ statePath }),
    });
    expect(result.exitCode).toBe(0);
    expect(result.hasIssues).toBe(false);
  });
});
