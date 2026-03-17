import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { AdoStatusSync } from '../../../../plugins/specweave/lib/integrations/ado/ado-status-sync.js';
import { SyncError } from '../../../../src/core/errors/sync-error.js';
import { SyncCircuitBreaker } from '../../../../src/core/increment/sync-circuit-breaker.js';

describe('AdoStatusSync — structured error surfacing', () => {
  let sync: AdoStatusSync;
  let breaker: SyncCircuitBreaker;

  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.patch.mockReset();
    mockClient.post.mockReset();
    breaker = new SyncCircuitBreaker();
    sync = new AdoStatusSync('myorg', 'myproject', 'fake-pat', breaker);
  });

  it('throws SyncError with "[ADO] sync failed: 403 Forbidden" on HTTP 403', async () => {
    const axiosErr: any = new Error('Request failed with status code 403');
    axiosErr.status = 403;
    axiosErr.response = { status: 403, statusText: 'Forbidden', data: 'Access denied' };

    mockClient.get.mockRejectedValue(axiosErr);

    await expect(sync.getStatus(123)).rejects.toThrow(SyncError);

    // Reset for the second assertion
    sync = new AdoStatusSync('myorg', 'myproject', 'fake-pat', new SyncCircuitBreaker());
    await expect(sync.getStatus(123)).rejects.toThrow(/\[ADO\] sync failed: 403 Forbidden/);
  });

  it('includes httpStatus and responseBody in SyncError', async () => {
    const axiosErr: any = new Error('Request failed with status code 500');
    axiosErr.status = 500;
    axiosErr.response = { status: 500, statusText: 'Internal Server Error', data: '{"message":"boom"}' };

    mockClient.get.mockRejectedValue(axiosErr);

    try {
      await sync.getStatus(456);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SyncError);
      const syncErr = err as SyncError;
      expect(syncErr.provider).toBe('ado');
      expect(syncErr.httpStatus).toBe(500);
      expect(syncErr.responseBody).toContain('boom');
    }
  });

  it('throws SyncError when circuit breaker is open', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // Verify breaker is open
    expect(breaker.getState().state).toBe('open');
    expect(breaker.canSync()).toBe(false);

    // getStatus should throw SyncError without making HTTP calls
    try {
      await sync.getStatus(789);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SyncError);
      expect((err as SyncError).message).toMatch(/Circuit breaker open/);
    }
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('records success on circuit breaker after successful call', async () => {
    mockClient.get.mockResolvedValue({
      data: { fields: { 'System.State': 'Active' } },
    });

    const result = await sync.getStatus(100);
    expect(result.state).toBe('Active');
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failures).toBe(0);
  });
});
