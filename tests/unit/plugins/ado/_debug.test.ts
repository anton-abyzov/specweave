import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { AdoStatusSync } from '../../../../plugins/specweave-ado/lib/ado-status-sync.js';
import { SyncCircuitBreaker } from '../../../../src/core/increment/sync-circuit-breaker.js';

describe('debug: AdoStatusSync breaker', () => {
  it('canSync reflects breaker state', () => {
    const breaker = new SyncCircuitBreaker();
    const sync = new AdoStatusSync('org', 'proj', 'pat', breaker);

    expect(sync.canSync()).toBe(true);

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState().state).toBe('open');
    expect(breaker.canSync()).toBe(false);
    expect(sync.canSync()).toBe(false);
  });

  it('getStatus throws when circuit open', async () => {
    const breaker = new SyncCircuitBreaker();
    const sync = new AdoStatusSync('org', 'proj', 'pat', breaker);

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    let caught: any;
    try {
      await sync.getStatus(123);
    } catch (e) {
      caught = e;
    }

    process.stderr.write(`caught error type: ${caught?.constructor?.name}\n`);
    process.stderr.write(`caught error message: ${caught?.message}\n`);
    process.stderr.write(`caught error name: ${caught?.name}\n`);
    expect(caught).toBeDefined();
    expect(caught.message).toContain('Circuit breaker open');
  });
});
