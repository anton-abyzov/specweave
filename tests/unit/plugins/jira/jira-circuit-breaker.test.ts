/**
 * Test: JIRA Circuit Breaker & Retry Queue Integration
 *
 * Validates:
 * 1. Circuit breaker records failures on JIRA API errors
 * 2. Retry queue enqueues failed operations
 * 3. Circuit breaker opens after threshold and blocks calls
 * 4. Recovery after cooldown records success
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreakerRegistry } from '../../../../src/core/sync/circuit-breaker-registry.js';
import { SyncRetryQueue } from '../../../../src/core/sync/sync-retry-queue.js';
import { SyncError } from '../../../../src/core/errors/sync-error.js';

// Mock axios to simulate JIRA API responses
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  defaults: { baseURL: 'https://test.atlassian.net/rest/api/3', auth: { username: 'test@test.com', password: 'token' } },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock('../../../../plugins/specweave-jira/lib/jira-deployment-detector.js', () => ({
  detectDeploymentType: vi.fn(async () => ({ type: 'cloud', baseUrl: 'https://test.atlassian.net/rest/api/3' })),
  getApiBaseUrl: vi.fn(() => 'https://test.atlassian.net/rest/api/3'),
}));

vi.mock('../../../../plugins/specweave-jira/lib/content-format-adapter.js', () => ({
  toCommentBody: vi.fn((text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })),
  toDescription: vi.fn((text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })),
}));

const { JiraStatusSync } = await import('../../../../plugins/specweave-jira/lib/jira-status-sync.js');

describe('JIRA Circuit Breaker Integration', () => {
  let registry: CircuitBreakerRegistry;
  let statusSync: InstanceType<typeof JiraStatusSync>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new CircuitBreakerRegistry();
    statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { circuitBreakerRegistry: registry },
    );
  });

  it('records failure on circuit breaker when JIRA returns 503', async () => {
    const breaker = registry.get('jira');

    // Simulate 2 prior failures
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState().failures).toBe(2);

    // JIRA returns 503
    const axiosError = Object.assign(new Error('Service Unavailable'), {
      response: { status: 503, data: { errorMessages: ['Service Unavailable'] } },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    // updateStatus should throw SyncError and record failure
    await expect(
      statusSync.updateStatus('PROJ-123', { state: 'Done' }),
    ).rejects.toThrow(SyncError);

    // 3rd failure should open the breaker
    expect(breaker.getState().failures).toBe(3);
    expect(breaker.getState().state).toBe('open');
  });

  it('blocks sync when circuit breaker is open', async () => {
    const breaker = registry.get('jira');

    // Open the breaker manually (3 failures)
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false);

    // getStatus should throw when breaker is open
    await expect(
      statusSync.getStatus('PROJ-123'),
    ).rejects.toThrow('Circuit breaker open for jira');
  });

  it('records success after cooldown recovery', async () => {
    const breaker = registry.get('jira');

    // Open breaker
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // Reset to simulate cooldown expiry
    breaker.reset();
    expect(breaker.canSync()).toBe(true);

    // Successful call
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        fields: { status: { name: 'Done' } },
      },
    });

    const result = await statusSync.getStatus('PROJ-123');
    expect(result.state).toBe('Done');
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failures).toBe(0);
  });
});

describe('JIRA Retry Queue Integration', () => {
  let registry: CircuitBreakerRegistry;
  let retryQueue: SyncRetryQueue;
  let statusSync: InstanceType<typeof JiraStatusSync>;
  const tmpDir = '/tmp/specweave-jira-retry-test-' + Date.now();

  beforeEach(async () => {
    vi.clearAllMocks();
    registry = new CircuitBreakerRegistry();
    retryQueue = new SyncRetryQueue({ statePath: tmpDir });
    statusSync = new JiraStatusSync(
      'test.atlassian.net',
      'test@test.com',
      'api-token',
      'PROJ',
      { circuitBreakerRegistry: registry, retryQueue, incrementId: '0549', featureId: 'FS-549', projectPath: '/test', projectName: 'test' },
    );
  });

  it('enqueues failed operation to retry queue on 503', async () => {
    const axiosError = Object.assign(new Error('Service Unavailable'), {
      response: { status: 503, data: { errorMessages: ['Service Unavailable'] } },
      isAxiosError: true,
    });
    mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

    await expect(
      statusSync.updateStatus('PROJ-123', { state: 'Done' }),
    ).rejects.toThrow(SyncError);

    const entries = await retryQueue.getByProvider('jira');
    expect(entries.length).toBe(1);
    expect(entries[0].provider).toBe('jira');
    expect(entries[0].error).toContain('503');
  });
});
