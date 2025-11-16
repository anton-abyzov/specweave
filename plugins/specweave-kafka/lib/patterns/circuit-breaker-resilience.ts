/**
 * Circuit Breaker and Resilience Patterns
 *
 * Circuit breaker, retry policies, bulkhead pattern, and failure isolation
 *
 * @module circuit-breaker-resilience
 */

/**
 * Circuit Breaker State
 */
export enum CircuitBreakerState {
  /** Circuit closed: requests flow normally */
  CLOSED = 'closed',
  /** Circuit open: requests fail fast */
  OPEN = 'open',
  /** Circuit half-open: testing if service recovered */
  HALF_OPEN = 'half-open',
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold (number of failures) */
  failureThreshold: number;
  /** Success threshold for half-open state */
  successThreshold: number;
  /** Timeout before half-open (ms) */
  timeout: number;
  /** Rolling window size (ms) */
  rollingWindowMs?: number;
  /** Minimum requests before tripping */
  minimumRequests?: number;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Max retry attempts */
  maxRetries: number;
  /** Initial delay (ms) */
  initialDelay: number;
  /** Max delay (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter (random variation) */
  jitter?: boolean;
}

/**
 * Bulkhead Configuration
 */
export interface BulkheadConfig {
  /** Max concurrent calls */
  maxConcurrent: number;
  /** Max queue size */
  maxQueue: number;
  /** Queue timeout (ms) */
  queueTimeout: number;
}

/**
 * Circuit Breaker
 *
 * Prevents cascading failures by failing fast when error rate is high
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      timeout: config.timeout,
      rollingWindowMs: config.rollingWindowMs || 60000, // 1 minute default
      minimumRequests: config.minimumRequests || 10,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if timeout elapsed → move to HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        console.log('Circuit breaker: OPEN → HALF_OPEN (testing recovery)');
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - failing fast');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.log(`Circuit breaker: HALF_OPEN → CLOSED (recovered after ${this.successCount} successes)`);
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in HALF_OPEN → back to OPEN
      console.log('Circuit breaker: HALF_OPEN → OPEN (still failing)');
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      // Too many failures → trip circuit
      console.log(`Circuit breaker: CLOSED → OPEN (${this.failureCount} failures)`);
      this.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Retry Handler
 *
 * Implements exponential backoff with jitter
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig) {
    this.config = {
      maxRetries: config.maxRetries,
      initialDelay: config.initialDelay,
      maxDelay: config.maxDelay,
      backoffMultiplier: config.backoffMultiplier,
      jitter: config.jitter !== false, // Default true
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter (random variation ±25%)
    if (this.config.jitter) {
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Bulkhead Pattern
 *
 * Isolates resources to prevent cascading failures
 */
export class Bulkhead {
  private activeCalls: number = 0;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private config: BulkheadConfig;

  constructor(config: BulkheadConfig) {
    this.config = config;
  }

  /**
   * Execute function with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If under concurrent limit, execute immediately
    if (this.activeCalls < this.config.maxConcurrent) {
      return this.executeNow(fn);
    }

    // Otherwise, queue if space available
    if (this.queue.length < this.config.maxQueue) {
      return this.enqueue(fn);
    }

    // Queue full → reject
    throw new Error('Bulkhead queue full - request rejected');
  }

  /**
   * Execute function immediately
   */
  private async executeNow<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCalls++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeCalls--;
      this.processQueue();
    }
  }

  /**
   * Enqueue function for later execution
   */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.queue.findIndex((item) => item.fn === fn);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Bulkhead queue timeout'));
      }, this.config.queueTimeout);

      this.queue.push({
        fn: async () => {
          clearTimeout(timeoutId);
          return fn();
        },
        resolve,
        reject,
      });
    });
  }

  /**
   * Process queued functions
   */
  private processQueue(): void {
    while (this.activeCalls < this.config.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        this.executeNow(item.fn)
          .then(item.resolve)
          .catch(item.reject);
      }
    }
  }

  /**
   * Get bulkhead metrics
   */
  getMetrics(): {
    activeCalls: number;
    queueSize: number;
    utilization: number;
  } {
    return {
      activeCalls: this.activeCalls,
      queueSize: this.queue.length,
      utilization: (this.activeCalls / this.config.maxConcurrent) * 100,
    };
  }
}

/**
 * Resilient Kafka Consumer
 *
 * Combines circuit breaker, retry, and bulkhead patterns
 */
export class ResilientKafkaConsumer {
  private circuitBreaker: CircuitBreaker;
  private retryHandler: RetryHandler;
  private bulkhead: Bulkhead;

  constructor(options: {
    circuitBreaker: CircuitBreakerConfig;
    retry: RetryConfig;
    bulkhead: BulkheadConfig;
  }) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.retryHandler = new RetryHandler(options.retry);
    this.bulkhead = new Bulkhead(options.bulkhead);
  }

  /**
   * Process message with full resilience stack
   */
  async processMessage<T>(handler: () => Promise<T>): Promise<T> {
    // Circuit breaker → Bulkhead → Retry → Handler
    return this.circuitBreaker.execute(async () => {
      return this.bulkhead.execute(async () => {
        return this.retryHandler.execute(handler);
      });
    });
  }

  /**
   * Get all metrics
   */
  getMetrics(): {
    circuitBreaker: ReturnType<CircuitBreaker['getMetrics']>;
    bulkhead: ReturnType<Bulkhead['getMetrics']>;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      bulkhead: this.bulkhead.getMetrics(),
    };
  }
}

/**
 * Example Usage: Circuit Breaker
 *
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({
 *   failureThreshold: 5,     // Open after 5 failures
 *   successThreshold: 2,     // Close after 2 successes
 *   timeout: 60000,          // Try again after 60s
 * });
 *
 * async function callExternalAPI() {
 *   return circuitBreaker.execute(async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   });
 * }
 * ```
 */

/**
 * Example Usage: Retry Handler
 *
 * ```typescript
 * const retryHandler = new RetryHandler({
 *   maxRetries: 3,
 *   initialDelay: 100,       // Start with 100ms
 *   maxDelay: 5000,          // Max 5s
 *   backoffMultiplier: 2,    // Exponential (100ms, 200ms, 400ms)
 *   jitter: true,            // Add randomness
 * });
 *
 * const result = await retryHandler.execute(async () => {
 *   return producer.send({ topic: 'orders', messages: [...] });
 * });
 * ```
 */

/**
 * Example Usage: Resilient Consumer
 *
 * ```typescript
 * const resilientConsumer = new ResilientKafkaConsumer({
 *   circuitBreaker: {
 *     failureThreshold: 5,
 *     successThreshold: 2,
 *     timeout: 60000,
 *   },
 *   retry: {
 *     maxRetries: 3,
 *     initialDelay: 100,
 *     maxDelay: 5000,
 *     backoffMultiplier: 2,
 *   },
 *   bulkhead: {
 *     maxConcurrent: 10,
 *     maxQueue: 100,
 *     queueTimeout: 30000,
 *   },
 * });
 *
 * await consumer.run({
 *   eachMessage: async ({ message }) => {
 *     await resilientConsumer.processMessage(async () => {
 *       // Your processing logic
 *       await saveToDatabase(message.value);
 *     });
 *   },
 * });
 * ```
 */

/**
 * Circuit Breaker & Resilience Best Practices:
 *
 * **Circuit Breaker Configuration**:
 * - failureThreshold: 5-10 failures (sensitive vs tolerant)
 * - successThreshold: 2-5 successes (cautious vs aggressive)
 * - timeout: 30-60 seconds (balance between recovery and availability)
 * - Use for external dependencies (databases, APIs)
 *
 * **Retry Configuration**:
 * - maxRetries: 3 (typical), 5+ for critical operations
 * - initialDelay: 100-1000ms (balance responsiveness vs load)
 * - backoffMultiplier: 2 (exponential), 1 (linear)
 * - jitter: Always enable (prevents thundering herd)
 * - Only retry transient errors (network, timeout), not logic errors
 *
 * **Bulkhead Configuration**:
 * - maxConcurrent: 10-100 (depends on downstream capacity)
 * - maxQueue: 100-1000 (balance memory vs throughput)
 * - queueTimeout: 10-30 seconds (prevent indefinite wait)
 * - Separate bulkheads for different resources
 *
 * **Pattern Combinations**:
 * - Circuit Breaker + Retry: Fail fast after circuit opens
 * - Bulkhead + Circuit Breaker: Isolate failures per resource
 * - All three: Comprehensive resilience stack
 *
 * **Monitoring**:
 * - Circuit breaker: State transitions, trip rate
 * - Retry: Attempt count, success rate after retry
 * - Bulkhead: Queue size, rejection rate, utilization
 * - Alerts: Circuit open, high retry rate, queue full
 *
 * **Testing**:
 * - Chaos engineering: Inject failures to test resilience
 * - Load testing: Verify bulkhead limits
 * - Failover testing: Verify circuit breaker behavior
 */

export default {
  CircuitBreaker,
  RetryHandler,
  Bulkhead,
  ResilientKafkaConsumer,
  CircuitBreakerState,
};
