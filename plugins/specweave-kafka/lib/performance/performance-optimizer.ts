/**
 * Kafka Performance Optimization Patterns
 *
 * Producer and consumer optimization, batching, compression, connection pooling
 *
 * @module performance-optimizer
 */

import { Kafka, Producer, Consumer, CompressionTypes, PartitionAssigners } from 'kafkajs';

/**
 * Performance Configuration for Producer
 */
export interface ProducerPerformanceConfig {
  /** Batch size in bytes (default: 16384 = 16KB) */
  batchSize?: number;
  /** Linger time in ms (wait before sending batch, default: 0) */
  lingerMs?: number;
  /** Compression type */
  compressionType?: CompressionTypes;
  /** Max concurrent requests (default: 5) */
  maxInFlightRequests?: number;
  /** Enable idempotence (default: true) */
  idempotent?: boolean;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
  /** Retry configuration */
  retry?: {
    /** Max retry attempts (default: 8) */
    retries?: number;
    /** Initial retry delay in ms (default: 100) */
    initialRetryTime?: number;
    /** Max retry delay in ms (default: 30000) */
    maxRetryTime?: number;
    /** Retry multiplier (default: 2) */
    multiplier?: number;
  };
}

/**
 * Performance Configuration for Consumer
 */
export interface ConsumerPerformanceConfig {
  /** Max records per poll (default: 500) */
  maxBytesPerPartition?: number;
  /** Max wait time for fetch in ms (default: 5000) */
  maxWaitTimeInMs?: number;
  /** Min bytes to fetch (default: 1) */
  minBytes?: number;
  /** Session timeout in ms (default: 30000) */
  sessionTimeout?: number;
  /** Heartbeat interval in ms (default: 3000) */
  heartbeatInterval?: number;
  /** Partition assignment strategy */
  partitionAssigners?: typeof PartitionAssigners.roundRobin[];
  /** Max poll records */
  maxPollRecords?: number;
}

/**
 * High-Performance Producer
 */
export class HighPerformanceProducer {
  private producer: Producer;
  private config: Required<ProducerPerformanceConfig>;

  constructor(kafka: Kafka, config: ProducerPerformanceConfig = {}) {
    this.config = {
      batchSize: config.batchSize || 65536, // 64KB batches for high throughput
      lingerMs: config.lingerMs || 100, // Wait 100ms to batch messages
      compressionType: config.compressionType || CompressionTypes.LZ4,
      maxInFlightRequests: config.maxInFlightRequests || 5,
      idempotent: config.idempotent !== false,
      requestTimeout: config.requestTimeout || 30000,
      retry: {
        retries: config.retry?.retries || 8,
        initialRetryTime: config.retry?.initialRetryTime || 100,
        maxRetryTime: config.retry?.maxRetryTime || 30000,
        multiplier: config.retry?.multiplier || 2,
      },
    };

    this.producer = kafka.producer({
      idempotent: this.config.idempotent,
      maxInFlightRequests: this.config.maxInFlightRequests,
      retry: this.config.retry,
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Send messages with optimized batching and compression
   */
  async send(topic: string, messages: Array<{ key?: string; value: string }>) {
    return this.producer.send({
      topic,
      messages,
      compression: this.config.compressionType,
      // @ts-ignore - kafkajs typing issue
      batchSize: this.config.batchSize,
      timeout: this.config.requestTimeout,
    });
  }

  /**
   * Batch send with explicit flush control
   */
  async sendBatch(batches: Array<{ topic: string; messages: Array<{ key?: string; value: string }> }>) {
    // Send all batches in parallel
    return Promise.all(
      batches.map((batch) =>
        this.send(batch.topic, batch.messages)
      )
    );
  }
}

/**
 * High-Performance Consumer
 */
export class HighPerformanceConsumer {
  private consumer: Consumer;
  private config: Required<ConsumerPerformanceConfig>;

  constructor(kafka: Kafka, groupId: string, config: ConsumerPerformanceConfig = {}) {
    this.config = {
      maxBytesPerPartition: config.maxBytesPerPartition || 1048576, // 1MB per partition
      maxWaitTimeInMs: config.maxWaitTimeInMs || 500, // Fetch more frequently
      minBytes: config.minBytes || 1024, // Minimum 1KB to reduce overhead
      sessionTimeout: config.sessionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 3000,
      partitionAssigners: config.partitionAssigners || [PartitionAssigners.roundRobin],
      maxPollRecords: config.maxPollRecords || 500,
    };

    this.consumer = kafka.consumer({
      groupId,
      sessionTimeout: this.config.sessionTimeout,
      heartbeatInterval: this.config.heartbeatInterval,
      maxBytesPerPartition: this.config.maxBytesPerPartition,
      maxWaitTimeInMs: this.config.maxWaitTimeInMs,
      minBytes: this.config.minBytes,
      partitionAssigners: this.config.partitionAssigners,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.subscribe({ topics, fromBeginning: false });
  }

  /**
   * Run consumer with batch processing
   */
  async runBatched(
    batchSize: number,
    handler: (messages: Array<any>) => Promise<void>
  ): Promise<void> {
    let messageBatch: Array<any> = [];

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageBatch.push({ topic, partition, message });

        // Process batch when full
        if (messageBatch.length >= batchSize) {
          await handler(messageBatch);
          messageBatch = [];
        }
      },
    });
  }
}

/**
 * Connection Pooling for Kafka Clients
 */
export class KafkaConnectionPool {
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private kafka: Kafka;

  constructor(kafka: Kafka) {
    this.kafka = kafka;
  }

  /**
   * Get or create producer
   */
  getProducer(id: string = 'default'): Producer {
    if (!this.producers.has(id)) {
      const producer = this.kafka.producer({
        idempotent: true,
        maxInFlightRequests: 5,
      });
      this.producers.set(id, producer);
    }
    return this.producers.get(id)!;
  }

  /**
   * Get or create consumer
   */
  getConsumer(groupId: string): Consumer {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({ groupId });
      this.consumers.set(groupId, consumer);
    }
    return this.consumers.get(groupId)!;
  }

  /**
   * Connect all clients
   */
  async connectAll(): Promise<void> {
    const producers = Array.from(this.producers.values());
    const consumers = Array.from(this.consumers.values());

    await Promise.all([
      ...producers.map((p) => p.connect()),
      ...consumers.map((c) => c.connect()),
    ]);
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const producers = Array.from(this.producers.values());
    const consumers = Array.from(this.consumers.values());

    await Promise.all([
      ...producers.map((p) => p.disconnect()),
      ...consumers.map((c) => c.disconnect()),
    ]);

    this.producers.clear();
    this.consumers.clear();
  }
}

/**
 * Performance Metrics Collector
 */
export class KafkaPerformanceMetrics {
  private metrics: {
    messagesProduced: number;
    messagesFailed: number;
    messagesConsumed: number;
    totalBytesProduced: number;
    totalBytesConsumed: number;
    averageProduceLatency: number;
    averageConsumeLatency: number;
    produceLatencies: number[];
    consumeLatencies: number[];
  } = {
    messagesProduced: 0,
    messagesFailed: 0,
    messagesConsumed: 0,
    totalBytesProduced: 0,
    totalBytesConsumed: 0,
    averageProduceLatency: 0,
    averageConsumeLatency: 0,
    produceLatencies: [],
    consumeLatencies: [],
  };

  /**
   * Record produce event
   */
  recordProduce(bytes: number, latencyMs: number, success: boolean): void {
    if (success) {
      this.metrics.messagesProduced++;
      this.metrics.totalBytesProduced += bytes;
      this.metrics.produceLatencies.push(latencyMs);
      this.metrics.averageProduceLatency = this.calculateAverage(this.metrics.produceLatencies);
    } else {
      this.metrics.messagesFailed++;
    }
  }

  /**
   * Record consume event
   */
  recordConsume(bytes: number, latencyMs: number): void {
    this.metrics.messagesConsumed++;
    this.metrics.totalBytesConsumed += bytes;
    this.metrics.consumeLatencies.push(latencyMs);
    this.metrics.averageConsumeLatency = this.calculateAverage(this.metrics.consumeLatencies);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      p50ProduceLatency: this.calculatePercentile(this.metrics.produceLatencies, 0.5),
      p95ProduceLatency: this.calculatePercentile(this.metrics.produceLatencies, 0.95),
      p99ProduceLatency: this.calculatePercentile(this.metrics.produceLatencies, 0.99),
      p50ConsumeLatency: this.calculatePercentile(this.metrics.consumeLatencies, 0.5),
      p95ConsumeLatency: this.calculatePercentile(this.metrics.consumeLatencies, 0.95),
      p99ConsumeLatency: this.calculatePercentile(this.metrics.consumeLatencies, 0.99),
      throughputMBps: (this.metrics.totalBytesProduced + this.metrics.totalBytesConsumed) / 1024 / 1024,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      messagesProduced: 0,
      messagesFailed: 0,
      messagesConsumed: 0,
      totalBytesProduced: 0,
      totalBytesConsumed: 0,
      averageProduceLatency: 0,
      averageConsumeLatency: 0,
      produceLatencies: [],
      consumeLatencies: [],
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }
}

/**
 * Example Usage: High-Performance Producer
 *
 * ```typescript
 * const kafka = new Kafka({ brokers: ['localhost:9092'] });
 * const producer = new HighPerformanceProducer(kafka, {
 *   batchSize: 65536,      // 64KB batches
 *   lingerMs: 100,         // Wait 100ms for batching
 *   compressionType: CompressionTypes.LZ4, // Fast compression
 * });
 *
 * await producer.connect();
 *
 * // Send with optimized batching
 * await producer.send('high-throughput-topic', [
 *   { key: 'key1', value: 'value1' },
 *   { key: 'key2', value: 'value2' },
 *   // ... thousands of messages batched efficiently
 * ]);
 * ```
 */

/**
 * Example Usage: High-Performance Consumer with Batching
 *
 * ```typescript
 * const consumer = new HighPerformanceConsumer(kafka, 'high-perf-group', {
 *   maxBytesPerPartition: 2097152, // 2MB per partition
 *   maxWaitTimeInMs: 500,          // Fetch every 500ms
 * });
 *
 * await consumer.connect();
 * await consumer.subscribe(['high-throughput-topic']);
 *
 * // Process 100 messages at a time
 * await consumer.runBatched(100, async (messages) => {
 *   // Batch database insert
 *   await db.batchInsert(messages.map(m => JSON.parse(m.message.value.toString())));
 * });
 * ```
 */

/**
 * Performance Tips:
 *
 * **Producer Optimization**:
 * - Increase batch size (64KB-1MB)
 * - Use linger.ms (10-100ms) for better batching
 * - Enable compression (lz4 for speed, gzip for ratio)
 * - Use connection pooling
 * - Send in parallel (Promise.all)
 *
 * **Consumer Optimization**:
 * - Increase max.poll.records (500-1000)
 * - Process messages in batches
 * - Use multiple consumer instances (scale horizontally)
 * - Parallelize processing within handler
 * - Commit offsets in batches
 *
 * **Network Optimization**:
 * - Increase socket.send.buffer.bytes (128KB-256KB)
 * - Increase socket.receive.buffer.bytes (128KB-256KB)
 * - Use compression to reduce network I/O
 *
 * **Benchmarking**:
 * - Producer: kafka-producer-perf-test.sh
 * - Consumer: kafka-consumer-perf-test.sh
 * - Target: >100K msg/sec per producer, >50K msg/sec per consumer
 */

export default {
  HighPerformanceProducer,
  HighPerformanceConsumer,
  KafkaConnectionPool,
  KafkaPerformanceMetrics,
};
