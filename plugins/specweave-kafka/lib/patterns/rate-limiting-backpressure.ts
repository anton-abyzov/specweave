/**
 * Rate Limiting and Backpressure Handling
 *
 * Producer rate limiting, consumer backpressure, quota management, and flow control
 *
 * @module rate-limiting-backpressure
 */

import { Producer, Consumer } from 'kafkajs';

/**
 * Rate Limiter Configuration
 */
export interface RateLimiterConfig {
  /** Max messages per second */
  maxMessagesPerSecond: number;
  /** Max bytes per second */
  maxBytesPerSecond?: number;
  /** Burst capacity (tokens) */
  burstCapacity?: number;
  /** Refill rate (messages/sec) */
  refillRate?: number;
}

/**
 * Backpressure Strategy
 */
export enum BackpressureStrategy {
  /** Drop messages when overwhelmed */
  DROP = 'drop',
  /** Buffer messages up to limit */
  BUFFER = 'buffer',
  /** Throttle producer */
  THROTTLE = 'throttle',
  /** Dynamic (adaptive) */
  DYNAMIC = 'dynamic',
}

/**
 * Quota Configuration (Kafka Broker-Level)
 */
export interface QuotaConfig {
  /** Client ID */
  clientId: string;
  /** Producer quota (bytes/sec) */
  producerQuota?: number;
  /** Consumer quota (bytes/sec) */
  consumerQuota?: number;
  /** Request quota (% of network/IO thread time) */
  requestQuota?: number;
}

/**
 * Token Bucket Rate Limiter
 *
 * Classic rate limiting algorithm with burst capacity
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.burstCapacity || config.maxMessagesPerSecond;
    this.refillRate = (config.refillRate || config.maxMessagesPerSecond) / 1000; // per ms
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens (non-blocking)
   */
  tryConsume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true; // Allowed
    }

    return false; // Rate limit exceeded
  }

  /**
   * Wait until tokens available (blocking)
   */
  async consume(count: number = 1): Promise<void> {
    while (!this.tryConsume(count)) {
      const waitMs = (count - this.tokens) / this.refillRate;
      await this.sleep(Math.ceil(waitMs));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Get current tokens available
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate-Limited Producer
 *
 * Wraps kafkajs Producer with rate limiting
 */
export class RateLimitedProducer {
  private producer: Producer;
  private rateLimiter: TokenBucketRateLimiter;
  private byteRateLimiter?: TokenBucketRateLimiter;

  constructor(producer: Producer, config: RateLimiterConfig) {
    this.producer = producer;
    this.rateLimiter = new TokenBucketRateLimiter(config);

    if (config.maxBytesPerSecond) {
      this.byteRateLimiter = new TokenBucketRateLimiter({
        maxMessagesPerSecond: config.maxBytesPerSecond,
        burstCapacity: config.maxBytesPerSecond * 2, // 2x burst
      });
    }
  }

  /**
   * Send message with rate limiting
   */
  async send(params: {
    topic: string;
    messages: Array<{ key?: string; value: string }>;
  }): Promise<void> {
    const messageCount = params.messages.length;

    // Rate limit by message count
    await this.rateLimiter.consume(messageCount);

    // Rate limit by bytes (if configured)
    if (this.byteRateLimiter) {
      const totalBytes = params.messages.reduce(
        (sum, msg) => sum + (msg.value?.length || 0),
        0
      );
      await this.byteRateLimiter.consume(totalBytes);
    }

    // Send to Kafka
    await this.producer.send(params);
  }

  /**
   * Try send (non-blocking, returns false if rate limited)
   */
  trySend(params: {
    topic: string;
    messages: Array<{ key?: string; value: string }>;
  }): boolean {
    const messageCount = params.messages.length;

    if (!this.rateLimiter.tryConsume(messageCount)) {
      return false; // Rate limited
    }

    // Async send (fire-and-forget)
    this.producer.send(params).catch((err) => {
      console.error('Send failed:', err);
    });

    return true; // Accepted
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    availableMessages: number;
    availableBytes?: number;
  } {
    return {
      availableMessages: this.rateLimiter.getAvailableTokens(),
      availableBytes: this.byteRateLimiter?.getAvailableTokens(),
    };
  }
}

/**
 * Backpressure Handler
 *
 * Handles consumer backpressure with different strategies
 */
export class BackpressureHandler {
  private strategy: BackpressureStrategy;
  private buffer: Array<any> = [];
  private maxBufferSize: number;
  private droppedCount: number = 0;

  constructor(strategy: BackpressureStrategy, maxBufferSize: number = 10000) {
    this.strategy = strategy;
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Handle incoming message with backpressure
   */
  async handleMessage(
    message: any,
    processor: (msg: any) => Promise<void>
  ): Promise<boolean> {
    switch (this.strategy) {
      case BackpressureStrategy.DROP:
        return this.handleDrop(message, processor);

      case BackpressureStrategy.BUFFER:
        return this.handleBuffer(message, processor);

      case BackpressureStrategy.THROTTLE:
        return this.handleThrottle(message, processor);

      case BackpressureStrategy.DYNAMIC:
        return this.handleDynamic(message, processor);

      default:
        throw new Error(`Unknown backpressure strategy: ${this.strategy}`);
    }
  }

  /**
   * Drop strategy: Drop messages when buffer full
   */
  private async handleDrop(message: any, processor: (msg: any) => Promise<void>): Promise<boolean> {
    if (this.buffer.length < this.maxBufferSize) {
      this.buffer.push(message);
      this.processBuffer(processor);
      return true; // Accepted
    } else {
      this.droppedCount++;
      console.warn(`Message dropped (backpressure). Total dropped: ${this.droppedCount}`);
      return false; // Dropped
    }
  }

  /**
   * Buffer strategy: Buffer up to max size, then block
   */
  private async handleBuffer(message: any, processor: (msg: any) => Promise<void>): Promise<boolean> {
    // Wait until buffer has space
    while (this.buffer.length >= this.maxBufferSize) {
      await this.sleep(100); // Wait 100ms
    }

    this.buffer.push(message);
    this.processBuffer(processor);
    return true;
  }

  /**
   * Throttle strategy: Slow down producer by blocking
   */
  private async handleThrottle(message: any, processor: (msg: any) => Promise<void>): Promise<boolean> {
    // Calculate delay based on buffer utilization
    const utilizationPercent = (this.buffer.length / this.maxBufferSize) * 100;
    const delayMs = utilizationPercent > 80 ? 1000 : utilizationPercent > 50 ? 100 : 0;

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
  private async handleDynamic(message: any, processor: (msg: any) => Promise<void>): Promise<boolean> {
    const utilization = this.buffer.length / this.maxBufferSize;

    if (utilization < 0.5) {
      // Low utilization: Accept immediately
      this.buffer.push(message);
      this.processBuffer(processor);
      return true;
    } else if (utilization < 0.9) {
      // Medium utilization: Throttle
      return this.handleThrottle(message, processor);
    } else {
      // High utilization: Drop
      return this.handleDrop(message, processor);
    }
  }

  /**
   * Process buffered messages
   */
  private async processBuffer(processor: (msg: any) => Promise<void>): Promise<void> {
    while (this.buffer.length > 0) {
      const message = this.buffer.shift();
      if (message) {
        try {
          await processor(message);
        } catch (error) {
          console.error('Processing failed:', error);
        }
      }
    }
  }

  /**
   * Get backpressure metrics
   */
  getMetrics(): {
    bufferSize: number;
    bufferUtilization: number;
    droppedCount: number;
  } {
    return {
      bufferSize: this.buffer.length,
      bufferUtilization: (this.buffer.length / this.maxBufferSize) * 100,
      droppedCount: this.droppedCount,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Kafka Quota Manager
 *
 * Manages broker-level quotas via Admin API
 */
export class KafkaQuotaManager {
  /**
   * Generate quota configuration script
   */
  static generateQuotaScript(quota: QuotaConfig): string {
    const commands: string[] = [];

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

    return commands.join('\n');
  }

  /**
   * Calculate recommended quotas
   */
  static calculateRecommendedQuotas(
    expectedThroughputMBps: number,
    clientCount: number,
    headroomPercent: number = 20
  ): {
    producerQuota: number;
    consumerQuota: number;
  } {
    // Add headroom
    const targetThroughputMBps = expectedThroughputMBps * (1 + headroomPercent / 100);

    // Convert to bytes/sec
    const targetBytesPerSec = targetThroughputMBps * 1024 * 1024;

    // Distribute across clients
    const quotaPerClient = Math.ceil(targetBytesPerSec / clientCount);

    return {
      producerQuota: quotaPerClient,
      consumerQuota: quotaPerClient * 2, // Consumers need 2x (read + fanout)
    };
  }
}

/**
 * Example Usage: Rate-Limited Producer
 *
 * ```typescript
 * const kafka = new Kafka({ brokers: ['localhost:9092'] });
 * const producer = kafka.producer();
 * await producer.connect();
 *
 * const rateLimitedProducer = new RateLimitedProducer(producer, {
 *   maxMessagesPerSecond: 1000,
 *   maxBytesPerSecond: 10 * 1024 * 1024, // 10 MB/s
 *   burstCapacity: 2000, // Allow bursts up to 2000 messages
 * });
 *
 * // Rate-limited send
 * await rateLimitedProducer.send({
 *   topic: 'high-volume-topic',
 *   messages: [{ value: 'message1' }, { value: 'message2' }],
 * });
 * ```
 */

/**
 * Example Usage: Backpressure Handler
 *
 * ```typescript
 * const backpressure = new BackpressureHandler(
 *   BackpressureStrategy.DYNAMIC,
 *   10000 // Max 10K buffered messages
 * );
 *
 * await consumer.run({
 *   eachMessage: async ({ message }) => {
 *     await backpressure.handleMessage(message, async (msg) => {
 *       // Your processing logic
 *       await processMessage(msg);
 *     });
 *   },
 * });
 *
 * // Monitor backpressure
 * setInterval(() => {
 *   const metrics = backpressure.getMetrics();
 *   console.log(`Buffer: ${metrics.bufferUtilization.toFixed(1)}%`);
 * }, 5000);
 * ```
 */

/**
 * Rate Limiting & Backpressure Best Practices:
 *
 * **When to Use Rate Limiting**:
 * - Protect downstream systems from overload
 * - Comply with SLA/quotas
 * - Prevent "thundering herd" problems
 * - Smooth out traffic spikes
 *
 * **Rate Limiter Configuration**:
 * - maxMessagesPerSecond: Set to 80% of target (20% headroom)
 * - burstCapacity: 2x rate (handle short bursts)
 * - Use token bucket (better than leaky bucket for bursts)
 *
 * **Backpressure Strategies**:
 * - DROP: Real-time analytics (some loss OK)
 * - BUFFER: Important data (no loss, accept latency)
 * - THROTTLE: Flow control (slow down producer)
 * - DYNAMIC: Adaptive (combine strategies)
 *
 * **Kafka Broker Quotas**:
 * - producer_byte_rate: Limit producer throughput (bytes/sec)
 * - consumer_byte_rate: Limit consumer throughput (bytes/sec)
 * - request_percentage: Limit CPU/network time (%)
 * - Apply per client-id or user
 *
 * **Monitoring**:
 * - Rate limiter: Available tokens, wait time
 * - Backpressure: Buffer utilization, dropped count
 * - Broker quotas: Throttle time, quota violations
 * - Consumer lag: Detect backpressure issues
 *
 * **Tuning**:
 * - Start conservative (low limits)
 * - Monitor throttle metrics
 * - Gradually increase limits
 * - Set alerts for quota violations
 */

export default {
  TokenBucketRateLimiter,
  RateLimitedProducer,
  BackpressureHandler,
  KafkaQuotaManager,
  BackpressureStrategy,
};
