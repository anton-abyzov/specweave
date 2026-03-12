import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreakerRegistry } from '../../../../src/core/sync/circuit-breaker-registry.js';

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  it('lazy-creates a new breaker on first get', () => {
    const breaker = registry.get('github');
    expect(breaker).toBeDefined();
    expect(breaker.canSync()).toBe(true); // starts closed
  });

  it('returns same breaker instance on subsequent get', () => {
    const first = registry.get('jira');
    const second = registry.get('jira');
    expect(first).toBe(second);
  });

  it('creates separate breakers per provider', () => {
    const github = registry.get('github');
    const jira = registry.get('jira');
    expect(github).not.toBe(jira);
  });

  it('getAll returns state map for all registered providers', () => {
    registry.get('github');
    registry.get('jira');
    registry.get('ado');

    const all = registry.getAll();
    expect(Object.keys(all)).toHaveLength(3);
    expect(all['github'].state).toBe('closed');
    expect(all['jira'].state).toBe('closed');
    expect(all['ado'].state).toBe('closed');
  });

  it('open breaker returns canSync false', () => {
    const breaker = registry.get('github');
    // Force open: 3 consecutive failures
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canSync()).toBe(false);
  });

  it('reset removes breaker from map — next get creates fresh', () => {
    const old = registry.get('github');
    old.recordFailure();
    old.recordFailure();
    old.recordFailure();
    expect(old.canSync()).toBe(false);

    registry.reset('github');

    const fresh = registry.get('github');
    expect(fresh).not.toBe(old);
    expect(fresh.canSync()).toBe(true);
  });

  it('getAll reflects open state after failures', () => {
    const breaker = registry.get('github');
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    const all = registry.getAll();
    expect(all['github'].state).toBe('open');
  });
});
