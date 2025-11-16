var BackpressureStrategy = /* @__PURE__ */ ((BackpressureStrategy2) => {
  BackpressureStrategy2["DROP"] = "drop";
  BackpressureStrategy2["BUFFER"] = "buffer";
  BackpressureStrategy2["THROTTLE"] = "throttle";
  BackpressureStrategy2["DYNAMIC"] = "dynamic";
  return BackpressureStrategy2;
})(BackpressureStrategy || {});
class TokenBucketRateLimiter {
  // tokens per millisecond
  constructor(config) {
    this.maxTokens = config.burstCapacity || config.maxMessagesPerSecond;
    this.refillRate = (config.refillRate || config.maxMessagesPerSecond) / 1e3;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
  /**
   * Try to consume tokens (non-blocking)
   */
  tryConsume(count = 1) {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
  /**
   * Wait until tokens available (blocking)
   */
  async consume(count = 1) {
    while (!this.tryConsume(count)) {
      const waitMs = (count - this.tokens) / this.refillRate;
      await this.sleep(Math.ceil(waitMs));
    }
  }
  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
  /**
   * Get current tokens available
   */
  getAvailableTokens() {
    this.refill();
    return Math.floor(this.tokens);
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
class RateLimitedProducer {
  constructor(producer, config) {
    this.producer = producer;
    this.rateLimiter = new TokenBucketRateLimiter(config);
    if (config.maxBytesPerSecond) {
      this.byteRateLimiter = new TokenBucketRateLimiter({
        maxMessagesPerSecond: config.maxBytesPerSecond,
        burstCapacity: config.maxBytesPerSecond * 2
        // 2x burst
      });
    }
  }
  /**
   * Send message with rate limiting
   */
  async send(params) {
    const messageCount = params.messages.length;
    await this.rateLimiter.consume(messageCount);
    if (this.byteRateLimiter) {
      const totalBytes = params.messages.reduce(
        (sum, msg) => sum + (msg.value?.length || 0),
        0
      );
      await this.byteRateLimiter.consume(totalBytes);
    }
    await this.producer.send(params);
  }
  /**
   * Try send (non-blocking, returns false if rate limited)
   */
  trySend(params) {
    const messageCount = params.messages.length;
    if (!this.rateLimiter.tryConsume(messageCount)) {
      return false;
    }
    this.producer.send(params).catch((err) => {
      console.error("Send failed:", err);
    });
    return true;
  }
  /**
   * Get current rate limit status
   */
  getStatus() {
    return {
      availableMessages: this.rateLimiter.getAvailableTokens(),
      availableBytes: this.byteRateLimiter?.getAvailableTokens()
    };
  }
}
class BackpressureHandler {
  constructor(strategy, maxBufferSize = 1e4) {
    this.buffer = [];
    this.droppedCount = 0;
    this.strategy = strategy;
    this.maxBufferSize = maxBufferSize;
  }
  /**
   * Handle incoming message with backpressure
   */
  async handleMessage(message, processor) {
    switch (this.strategy) {
      case "drop" /* DROP */:
        return this.handleDrop(message, processor);
      case "buffer" /* BUFFER */:
        return this.handleBuffer(message, processor);
      case "throttle" /* THROTTLE */:
        return this.handleThrottle(message, processor);
      case "dynamic" /* DYNAMIC */:
        return this.handleDynamic(message, processor);
      default:
        throw new Error(`Unknown backpressure strategy: ${this.strategy}`);
    }
  }
  /**
   * Drop strategy: Drop messages when buffer full
   */
  async handleDrop(message, processor) {
    if (this.buffer.length < this.maxBufferSize) {
      this.buffer.push(message);
      this.processBuffer(processor);
      return true;
    } else {
      this.droppedCount++;
      console.warn(`Message dropped (backpressure). Total dropped: ${this.droppedCount}`);
      return false;
    }
  }
  /**
   * Buffer strategy: Buffer up to max size, then block
   */
  async handleBuffer(message, processor) {
    while (this.buffer.length >= this.maxBufferSize) {
      await this.sleep(100);
    }
    this.buffer.push(message);
    this.processBuffer(processor);
    return true;
  }
  /**
   * Throttle strategy: Slow down producer by blocking
   */
  async handleThrottle(message, processor) {
    const utilizationPercent = this.buffer.length / this.maxBufferSize * 100;
    const delayMs = utilizationPercent > 80 ? 1e3 : utilizationPercent > 50 ? 100 : 0;
    if (delayMs > 0) {
      await this.sleep(delayMs);
    }
    this.buffer.push(message);
    this.processBuffer(processor);
    return true;
  }
  /**
   * Dynamic strategy: Adapt based on buffer state
   */
  async handleDynamic(message, processor) {
    const utilization = this.buffer.length / this.maxBufferSize;
    if (utilization < 0.5) {
      this.buffer.push(message);
      this.processBuffer(processor);
      return true;
    } else if (utilization < 0.9) {
      return this.handleThrottle(message, processor);
    } else {
      return this.handleDrop(message, processor);
    }
  }
  /**
   * Process buffered messages
   */
  async processBuffer(processor) {
    while (this.buffer.length > 0) {
      const message = this.buffer.shift();
      if (message) {
        try {
          await processor(message);
        } catch (error) {
          console.error("Processing failed:", error);
        }
      }
    }
  }
  /**
   * Get backpressure metrics
   */
  getMetrics() {
    return {
      bufferSize: this.buffer.length,
      bufferUtilization: this.buffer.length / this.maxBufferSize * 100,
      droppedCount: this.droppedCount
    };
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
class KafkaQuotaManager {
  /**
   * Generate quota configuration script
   */
  static generateQuotaScript(quota) {
    const commands = [];
    if (quota.producerQuota) {
      commands.push(
        `kafka-configs.sh --alter --add-config 'producer_byte_rate=${quota.producerQuota}' --entity-type clients --entity-name ${quota.clientId}`
      );
    }
    if (quota.consumerQuota) {
      commands.push(
        `kafka-configs.sh --alter --add-config 'consumer_byte_rate=${quota.consumerQuota}' --entity-type clients --entity-name ${quota.clientId}`
      );
    }
    if (quota.requestQuota) {
      commands.push(
        `kafka-configs.sh --alter --add-config 'request_percentage=${quota.requestQuota}' --entity-type clients --entity-name ${quota.clientId}`
      );
    }
    return commands.join("\n");
  }
  /**
   * Calculate recommended quotas
   */
  static calculateRecommendedQuotas(expectedThroughputMBps, clientCount, headroomPercent = 20) {
    const targetThroughputMBps = expectedThroughputMBps * (1 + headroomPercent / 100);
    const targetBytesPerSec = targetThroughputMBps * 1024 * 1024;
    const quotaPerClient = Math.ceil(targetBytesPerSec / clientCount);
    return {
      producerQuota: quotaPerClient,
      consumerQuota: quotaPerClient * 2
      // Consumers need 2x (read + fanout)
    };
  }
}
var rate_limiting_backpressure_default = {
  TokenBucketRateLimiter,
  RateLimitedProducer,
  BackpressureHandler,
  KafkaQuotaManager,
  BackpressureStrategy
};
export {
  BackpressureHandler,
  BackpressureStrategy,
  KafkaQuotaManager,
  RateLimitedProducer,
  TokenBucketRateLimiter,
  rate_limiting_backpressure_default as default
};
