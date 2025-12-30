/**
 * Circuit Breaker Module
 *
 * Protects auto from external service failures.
 * Implements the circuit breaker pattern for:
 * - GitHub API
 * - JIRA API
 * - Azure DevOps API
 * - Custom external services
 */

import * as fs from 'fs';
import * as path from 'path';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before trying half-open */
  resetTimeout: number;
  /** Number of successes in half-open to close */
  successThreshold: number;
  /** Time window for counting failures */
  failureWindow: number;
}

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: string;
  lastSuccess?: string;
  openedAt?: string;
  nextRetryAt?: string;
  queuedOperations: QueuedOperation[];
}

export interface QueuedOperation {
  id: string;
  operation: string;
  params: unknown;
  queuedAt: string;
  retryCount: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  failureWindow: 300000, // 5 minutes
};

export class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private status: CircuitStatus;
  private failureTimestamps: number[] = [];
  private projectRoot: string;

  constructor(
    name: string,
    projectRoot: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.name = name;
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = this.loadStatus() || {
      state: 'closed',
      failures: 0,
      successes: 0,
      queuedOperations: [],
    };
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new CircuitOpenError(this.name, this.status.nextRetryAt || '');
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Check if circuit is open (blocking calls)
   */
  isOpen(): boolean {
    if (this.status.state === 'open') {
      // Check if ready for half-open
      if (this.status.openedAt) {
        const openedTime = new Date(this.status.openedAt).getTime();
        const now = Date.now();
        if (now - openedTime >= this.config.resetTimeout) {
          this.transitionTo('half-open');
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Check if circuit allows calls (closed or half-open)
   */
  isCallAllowed(): boolean {
    return !this.isOpen();
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.status.successes++;
    this.status.lastSuccess = new Date().toISOString();

    if (this.status.state === 'half-open') {
      if (this.status.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    } else if (this.status.state === 'closed') {
      // Reset failure count on success
      this.status.failures = 0;
      this.failureTimestamps = [];
    }

    this.saveStatus();
  }

  /**
   * Record a failed operation
   */
  recordFailure(error?: unknown): void {
    const now = Date.now();

    // Clean old failures outside window
    this.failureTimestamps = this.failureTimestamps.filter(
      (ts) => now - ts < this.config.failureWindow
    );

    this.failureTimestamps.push(now);
    this.status.failures = this.failureTimestamps.length;
    this.status.lastFailure = new Date().toISOString();

    // Check if should open
    if (this.status.state === 'half-open') {
      this.transitionTo('open');
    } else if (
      this.status.state === 'closed' &&
      this.status.failures >= this.config.failureThreshold
    ) {
      this.transitionTo('open');
    }

    this.saveStatus();
  }

  /**
   * Transition to a new state
   */
  private transitionTo(state: CircuitState): void {
    const previousState = this.status.state;
    this.status.state = state;

    if (state === 'open') {
      this.status.openedAt = new Date().toISOString();
      this.status.nextRetryAt = new Date(
        Date.now() + this.config.resetTimeout
      ).toISOString();
      this.status.successes = 0;
    } else if (state === 'closed') {
      this.status.failures = 0;
      this.status.successes = 0;
      this.status.openedAt = undefined;
      this.status.nextRetryAt = undefined;
      this.failureTimestamps = [];
      // Process queued operations
      this.processQueue();
    } else if (state === 'half-open') {
      this.status.successes = 0;
    }

    this.logTransition(previousState, state);
    this.saveStatus();
  }

  /**
   * Queue an operation for later retry
   */
  queueOperation(operation: string, params: unknown): string {
    const id = `op-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.status.queuedOperations.push({
      id,
      operation,
      params,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    });

    this.saveStatus();
    return id;
  }

  /**
   * Process queued operations
   */
  private processQueue(): void {
    // In a real implementation, this would retry queued operations
    // For now, we just clear the queue (operations would need to be re-triggered)
    if (this.status.queuedOperations.length > 0) {
      console.log(
        `[CircuitBreaker:${this.name}] Circuit closed. ${this.status.queuedOperations.length} queued operations need manual retry.`
      );
    }
  }

  /**
   * Get current status
   */
  getStatus(): CircuitStatus {
    return { ...this.status };
  }

  /**
   * Get circuit name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Force reset circuit (for testing/recovery)
   */
  reset(): void {
    this.transitionTo('closed');
    this.status.queuedOperations = [];
    this.saveStatus();
  }

  /**
   * Load status from session
   */
  private loadStatus(): CircuitStatus | null {
    const sessionPath = path.join(
      this.projectRoot,
      '.specweave',
      'state',
      'auto-session.json'
    );

    if (!fs.existsSync(sessionPath)) return null;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      return session.circuitBreakers?.[this.name] || null;
    } catch {
      return null;
    }
  }

  /**
   * Save status to session
   */
  private saveStatus(): void {
    const sessionPath = path.join(
      this.projectRoot,
      '.specweave',
      'state',
      'auto-session.json'
    );

    if (!fs.existsSync(sessionPath)) return;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      session.circuitBreakers = session.circuitBreakers || {};
      session.circuitBreakers[this.name] = this.status;
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Log state transition
   */
  private logTransition(from: CircuitState, to: CircuitState): void {
    const logsDir = path.join(this.projectRoot, '.specweave', 'logs');

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        circuit: this.name,
        event: 'state_change',
        from,
        to,
        failures: this.status.failures,
        queuedOps: this.status.queuedOperations.length,
      };

      fs.appendFileSync(
        path.join(logsDir, 'circuit-breakers.log'),
        JSON.stringify(logEntry) + '\n'
      );
    } catch {
      // Ignore logging errors
    }
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    public circuitName: string,
    public retryAfter: string
  ) {
    super(`Circuit breaker '${circuitName}' is open. Retry after ${retryAfter}`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit Breaker Registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, this.projectRoot, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get status of all breakers
   */
  getAllStatus(): Record<string, CircuitStatus> {
    const status: Record<string, CircuitStatus> = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Check if any circuit is open
   */
  hasOpenCircuit(): boolean {
    for (const breaker of this.breakers.values()) {
      if (breaker.isOpen()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Create default service breakers
   */
  initializeDefaults(): void {
    this.getBreaker('github', { failureThreshold: 3, resetTimeout: 60000 });
    this.getBreaker('jira', { failureThreshold: 5, resetTimeout: 120000 });
    this.getBreaker('ado', { failureThreshold: 5, resetTimeout: 120000 });
  }
}

/**
 * Parse rate limit headers and extract retry time
 */
export function parseRateLimitHeaders(
  headers: Record<string, string | undefined>
): { limited: boolean; retryAfter: number } {
  // GitHub style
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '', 10);
  const reset = parseInt(headers['x-ratelimit-reset'] || '', 10);

  if (!isNaN(remaining) && remaining <= 0 && !isNaN(reset)) {
    return {
      limited: true,
      retryAfter: Math.max(0, reset * 1000 - Date.now()),
    };
  }

  // Standard Retry-After header
  const retryAfter = headers['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return { limited: true, retryAfter: seconds * 1000 };
    }
  }

  return { limited: false, retryAfter: 0 };
}
