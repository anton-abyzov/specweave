var CircuitBreakerState = /* @__PURE__ */ ((CircuitBreakerState2) => {
  CircuitBreakerState2["CLOSED"] = "closed";
  CircuitBreakerState2["OPEN"] = "open";
  CircuitBreakerState2["HALF_OPEN"] = "half-open";
  return CircuitBreakerState2;
})(CircuitBreakerState || {});
class CircuitBreaker {
  constructor(config) {
    this.state = "closed" /* CLOSED */;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.config = {
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      timeout: config.timeout,
      rollingWindowMs: config.rollingWindowMs || 6e4,
      // 1 minute default
      minimumRequests: config.minimumRequests || 10
    };
  }
  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn) {
    if (this.state === "open" /* OPEN */) {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        console.log("Circuit breaker: OPEN \u2192 HALF_OPEN (testing recovery)");
        this.state = "half-open" /* HALF_OPEN */;
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - failing fast");
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
  onSuccess() {
    this.failureCount = 0;
    if (this.state === "half-open" /* HALF_OPEN */) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.log(`Circuit breaker: HALF_OPEN \u2192 CLOSED (recovered after ${this.successCount} successes)`);
        this.state = "closed" /* CLOSED */;
        this.successCount = 0;
      }
    }
  }
  /**
   * Handle failed execution
   */
  onFailure() {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    if (this.state === "half-open" /* HALF_OPEN */) {
      console.log("Circuit breaker: HALF_OPEN \u2192 OPEN (still failing)");
      this.state = "open" /* OPEN */;
      this.successCount = 0;
    } else if (this.state === "closed" /* CLOSED */ && this.failureCount >= this.config.failureThreshold) {
      console.log(`Circuit breaker: CLOSED \u2192 OPEN (${this.failureCount} failures)`);
      this.state = "open" /* OPEN */;
    }
  }
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
  /**
   * Manually reset circuit
   */
  reset() {
    this.state = "closed" /* CLOSED */;
    this.failureCount = 0;
    this.successCount = 0;
  }
}
class RetryHandler {
  constructor(config) {
    this.config = {
      maxRetries: config.maxRetries,
      initialDelay: config.initialDelay,
      maxDelay: config.maxDelay,
      backoffMultiplier: config.backoffMultiplier,
      jitter: config.jitter !== false
      // Default true
    };
  }
  /**
   * Execute function with retry logic
   */
  async execute(fn) {
    let lastError;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError || new Error("Max retries exceeded");
  }
  /**
   * Calculate exponential backoff delay
   */
  calculateDelay(attempt) {
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    delay = Math.min(delay, this.config.maxDelay);
    if (this.config.jitter) {
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }
    return Math.floor(delay);
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
class Bulkhead {
  constructor(config) {
    this.activeCalls = 0;
    this.queue = [];
    this.config = config;
  }
  /**
   * Execute function with bulkhead protection
   */
  async execute(fn) {
    if (this.activeCalls < this.config.maxConcurrent) {
      return this.executeNow(fn);
    }
    if (this.queue.length < this.config.maxQueue) {
      return this.enqueue(fn);
    }
    throw new Error("Bulkhead queue full - request rejected");
  }
  /**
   * Execute function immediately
   */
  async executeNow(fn) {
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
  enqueue(fn) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex((item) => item.fn === fn);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error("Bulkhead queue timeout"));
      }, this.config.queueTimeout);
      this.queue.push({
        fn: async () => {
          clearTimeout(timeoutId);
          return fn();
        },
        resolve,
        reject
      });
    });
  }
  /**
   * Process queued functions
   */
  processQueue() {
    while (this.activeCalls < this.config.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        this.executeNow(item.fn).then(item.resolve).catch(item.reject);
      }
    }
  }
  /**
   * Get bulkhead metrics
   */
  getMetrics() {
    return {
      activeCalls: this.activeCalls,
      queueSize: this.queue.length,
      utilization: this.activeCalls / this.config.maxConcurrent * 100
    };
  }
}
class ResilientKafkaConsumer {
  constructor(options) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.retryHandler = new RetryHandler(options.retry);
    this.bulkhead = new Bulkhead(options.bulkhead);
  }
  /**
   * Process message with full resilience stack
   */
  async processMessage(handler) {
    return this.circuitBreaker.execute(async () => {
      return this.bulkhead.execute(async () => {
        return this.retryHandler.execute(handler);
      });
    });
  }
  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      bulkhead: this.bulkhead.getMetrics()
    };
  }
}
var circuit_breaker_resilience_default = {
  CircuitBreaker,
  RetryHandler,
  Bulkhead,
  ResilientKafkaConsumer,
  CircuitBreakerState
};
export {
  Bulkhead,
  CircuitBreaker,
  CircuitBreakerState,
  ResilientKafkaConsumer,
  RetryHandler,
  circuit_breaker_resilience_default as default
};
