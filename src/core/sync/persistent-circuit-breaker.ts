/**
 * Persistent Circuit Breaker
 *
 * Wraps the in-memory SyncCircuitBreaker with file-based persistence
 * so open/closed state survives across process restarts.
 *
 * State file format: { state, failures, lastFailure }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { SyncCircuitBreaker, type CircuitBreakerState } from '../increment/sync-circuit-breaker.js';

interface PersistedState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure?: string;
}

export class PersistentCircuitBreaker {
  private breaker: SyncCircuitBreaker;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.breaker = new SyncCircuitBreaker();
    this.loadState();
  }

  canSync(): boolean {
    return this.breaker.canSync();
  }

  recordSuccess(): void {
    this.breaker.recordSuccess();
    this.saveState();
  }

  recordFailure(): void {
    this.breaker.recordFailure();
    this.saveState();
  }

  reset(): void {
    this.breaker.reset();
    this.saveState();
  }

  getState(): CircuitBreakerState {
    return this.breaker.getState();
  }

  private loadState(): void {
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const data: PersistedState = JSON.parse(raw);

      // Replay persisted state onto the in-memory breaker
      for (let i = 0; i < (data.failures ?? 0); i++) {
        this.breaker.recordFailure();
      }
    } catch {
      // No file or corrupted — start fresh (closed)
    }
  }

  private saveState(): void {
    const state = this.breaker.getState();
    const data: PersistedState = {
      state: state.state,
      failures: state.failures,
      lastFailure: state.lastFailure?.toISOString(),
    };
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Best-effort persistence — don't crash on write failure
    }
  }
}
