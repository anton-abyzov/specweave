import { CompressionTypes, PartitionAssigners } from "kafkajs";
class HighPerformanceProducer {
  constructor(kafka, config = {}) {
    this.config = {
      batchSize: config.batchSize || 65536,
      // 64KB batches for high throughput
      lingerMs: config.lingerMs || 100,
      // Wait 100ms to batch messages
      compressionType: config.compressionType || CompressionTypes.LZ4,
      maxInFlightRequests: config.maxInFlightRequests || 5,
      idempotent: config.idempotent !== false,
      requestTimeout: config.requestTimeout || 3e4,
      retry: {
        retries: config.retry?.retries || 8,
        initialRetryTime: config.retry?.initialRetryTime || 100,
        maxRetryTime: config.retry?.maxRetryTime || 3e4,
        multiplier: config.retry?.multiplier || 2
      }
    };
    this.producer = kafka.producer({
      idempotent: this.config.idempotent,
      maxInFlightRequests: this.config.maxInFlightRequests,
      retry: this.config.retry
    });
  }
  async connect() {
    await this.producer.connect();
  }
  async disconnect() {
    await this.producer.disconnect();
  }
  /**
   * Send messages with optimized batching and compression
   */
  async send(topic, messages) {
    return this.producer.send({
      topic,
      messages,
      compression: this.config.compressionType,
      // @ts-ignore - kafkajs typing issue
      batchSize: this.config.batchSize,
      timeout: this.config.requestTimeout
    });
  }
  /**
   * Batch send with explicit flush control
   */
  async sendBatch(batches) {
    return Promise.all(
      batches.map(
        (batch) => this.send(batch.topic, batch.messages)
      )
    );
  }
}
class HighPerformanceConsumer {
  constructor(kafka, groupId, config = {}) {
    this.config = {
      maxBytesPerPartition: config.maxBytesPerPartition || 1048576,
      // 1MB per partition
      maxWaitTimeInMs: config.maxWaitTimeInMs || 500,
      // Fetch more frequently
      minBytes: config.minBytes || 1024,
      // Minimum 1KB to reduce overhead
      sessionTimeout: config.sessionTimeout || 3e4,
      heartbeatInterval: config.heartbeatInterval || 3e3,
      partitionAssigners: config.partitionAssigners || [PartitionAssigners.roundRobin],
      maxPollRecords: config.maxPollRecords || 500
    };
    this.consumer = kafka.consumer({
      groupId,
      sessionTimeout: this.config.sessionTimeout,
      heartbeatInterval: this.config.heartbeatInterval,
      maxBytesPerPartition: this.config.maxBytesPerPartition,
      maxWaitTimeInMs: this.config.maxWaitTimeInMs,
      minBytes: this.config.minBytes,
      partitionAssigners: this.config.partitionAssigners
    });
  }
  async connect() {
    await this.consumer.connect();
  }
  async disconnect() {
    await this.consumer.disconnect();
  }
  async subscribe(topics) {
    await this.consumer.subscribe({ topics, fromBeginning: false });
  }
  /**
   * Run consumer with batch processing
   */
  async runBatched(batchSize, handler) {
    let messageBatch = [];
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageBatch.push({ topic, partition, message });
        if (messageBatch.length >= batchSize) {
          await handler(messageBatch);
          messageBatch = [];
        }
      }
    });
  }
}
class KafkaConnectionPool {
  constructor(kafka) {
    this.producers = /* @__PURE__ */ new Map();
    this.consumers = /* @__PURE__ */ new Map();
    this.kafka = kafka;
  }
  /**
   * Get or create producer
   */
  getProducer(id = "default") {
    if (!this.producers.has(id)) {
      const producer = this.kafka.producer({
        idempotent: true,
        maxInFlightRequests: 5
      });
      this.producers.set(id, producer);
    }
    return this.producers.get(id);
  }
  /**
   * Get or create consumer
   */
  getConsumer(groupId) {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({ groupId });
      this.consumers.set(groupId, consumer);
    }
    return this.consumers.get(groupId);
  }
  /**
   * Connect all clients
   */
  async connectAll() {
    const producers = Array.from(this.producers.values());
    const consumers = Array.from(this.consumers.values());
    await Promise.all([
      ...producers.map((p) => p.connect()),
      ...consumers.map((c) => c.connect())
    ]);
  }
  /**
   * Disconnect all clients
   */
  async disconnectAll() {
    const producers = Array.from(this.producers.values());
    const consumers = Array.from(this.consumers.values());
    await Promise.all([
      ...producers.map((p) => p.disconnect()),
      ...consumers.map((c) => c.disconnect())
    ]);
    this.producers.clear();
    this.consumers.clear();
  }
}
class KafkaPerformanceMetrics {
  constructor() {
    this.metrics = {
      messagesProduced: 0,
      messagesFailed: 0,
      messagesConsumed: 0,
      totalBytesProduced: 0,
      totalBytesConsumed: 0,
      averageProduceLatency: 0,
      averageConsumeLatency: 0,
      produceLatencies: [],
      consumeLatencies: []
    };
  }
  /**
   * Record produce event
   */
  recordProduce(bytes, latencyMs, success) {
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
  recordConsume(bytes, latencyMs) {
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
      throughputMBps: (this.metrics.totalBytesProduced + this.metrics.totalBytesConsumed) / 1024 / 1024
    };
  }
  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      messagesProduced: 0,
      messagesFailed: 0,
      messagesConsumed: 0,
      totalBytesProduced: 0,
      totalBytesConsumed: 0,
      averageProduceLatency: 0,
      averageConsumeLatency: 0,
      produceLatencies: [],
      consumeLatencies: []
    };
  }
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }
}
var performance_optimizer_default = {
  HighPerformanceProducer,
  HighPerformanceConsumer,
  KafkaConnectionPool,
  KafkaPerformanceMetrics
};
export {
  HighPerformanceConsumer,
  HighPerformanceProducer,
  KafkaConnectionPool,
  KafkaPerformanceMetrics,
  performance_optimizer_default as default
};
