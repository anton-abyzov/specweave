/**
 * Circuit Breaker Registry
 *
 * Per-provider circuit breaker singletons. Activates the existing
 * SyncCircuitBreaker (previously dead code) as per-provider instances.
 *
 * @module core/sync/circuit-breaker-registry
 */

import { SyncCircuitBreaker, CircuitBreakerState } from '../increment/sync-circuit-breaker.js';

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, SyncCircuitBreaker>();

  get(provider: string): SyncCircuitBreaker {
    let breaker = this.breakers.get(provider);
    if (!breaker) {
      breaker = new SyncCircuitBreaker();
      this.breakers.set(provider, breaker);
    }
    return breaker;
  }

  getAll(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {};
    for (const [provider, breaker] of this.breakers) {
      result[provider] = breaker.getState();
    }
    return result;
  }

  reset(provider: string): void {
    this.breakers.delete(provider);
  }
}
