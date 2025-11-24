/**
 * Sync Circuit Breaker
 *
 * Prevents sync storms when external services (GitHub, JIRA, ADO) are down.
 *
 * Pattern: Circuit Breaker (Microservices pattern)
 * States:
 * - CLOSED: Normal operation, syncs allowed
 * - OPEN: Too many failures, syncs blocked
 * - HALF_OPEN: Testing if service recovered
 *
 * Thresholds:
 * - Opens after 3 consecutive failures
 * - Auto-resets after 5 minutes
 * - Closes on first success in HALF_OPEN state
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure?: Date;
}

export class SyncCircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: CircuitState = 'closed';

  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if sync is allowed
   *
   * @returns true if sync should proceed, false if circuit is open
   */
  canSync(): boolean {
    if (this.state === 'open') {
      // Check if timeout passed
      if (this.shouldReset()) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Record successful sync
   *
   * Resets failure count and closes circuit
   */
  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  /**
   * Record failed sync
   *
   * Increments failure count and opens circuit if threshold exceeded
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.FAILURE_THRESHOLD) {
      this.state = 'open';
      console.error(`🔴 Circuit breaker OPEN after ${this.failures} failures`);
      console.log(`⏰ Auto-reset in ${this.RESET_TIMEOUT_MS / 60000} minutes`);
    }
  }

  /**
   * Check if circuit should reset
   *
   * @returns true if timeout elapsed
   */
  private shouldReset(): boolean {
    if (!this.lastFailure) return false;
    const elapsed = Date.now() - this.lastFailure.getTime();
    return elapsed > this.RESET_TIMEOUT_MS;
  }

  /**
   * Get current circuit state
   *
   * @returns Circuit state info
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }

  /**
   * Manually reset circuit (for testing/admin)
   */
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailure = undefined;
  }
}
