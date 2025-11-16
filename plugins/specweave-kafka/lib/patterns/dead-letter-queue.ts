/**
 * Dead Letter Queue (DLQ) Pattern for Kafka
 *
 * Handles poison messages and failed processing with retry logic
 * and eventual routing to dead letter topics.
 *
 * @module dead-letter-queue
 */

import { Producer, Consumer, EachMessagePayload, Message } from 'kafkajs';

/**
 * DLQ Configuration
 */
export interface DLQConfig {
  /** Main input topic */
  inputTopic: string;
  /** Dead letter topic for failed messages */
  dlqTopic: string;
  /** Optional retry topic */
  retryTopic?: string;
  /** Max retry attempts before DLQ (default: 3) */
  maxRetries?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Initial backoff delay in ms (default: 1000) */
  initialBackoffMs?: number;
  /** Max backoff delay in ms (default: 60000) */
  maxBackoffMs?: number;
  /** Consumer group ID */
  consumerGroupId: string;
}

/**
 * DLQ Message Headers
 */
export interface DLQHeaders {
  /** Original topic */
  'dlq.original.topic': string;
  /** Original partition */
  'dlq.original.partition': string;
  /** Original offset */
  'dlq.original.offset': string;
  /** Retry attempt count */
  'dlq.retry.count': string;
  /** Error message */
  'dlq.error.message': string;
  /** Error stacktrace */
  'dlq.error.stacktrace'?: string;
  /** Timestamp of failure */
  'dlq.failure.timestamp': string;
  /** Next retry timestamp (if applicable) */
  'dlq.next.retry.timestamp'?: string;
}

/**
 * Dead Letter Queue Handler
 *
 * Implements retry logic with exponential backoff and DLQ routing.
 */
export class DeadLetterQueueHandler {
  private config: Required<Omit<DLQConfig, 'retryTopic'>> & { retryTopic?: string };
  private producer: Producer;
  private consumer: Consumer;

  constructor(producer: Producer, consumer: Consumer, config: DLQConfig) {
    this.config = {
      inputTopic: config.inputTopic,
      dlqTopic: config.dlqTopic,
      retryTopic: config.retryTopic,
      maxRetries: config.maxRetries || 3,
      backoffMultiplier: config.backoffMultiplier || 2,
      initialBackoffMs: config.initialBackoffMs || 1000,
      maxBackoffMs: config.maxBackoffMs || 60000,
      consumerGroupId: config.consumerGroupId,
    };
    this.producer = producer;
    this.consumer = consumer;
  }

  /**
   * Process message with DLQ handling
   *
   * @param payload - Kafka message payload
   * @param handler - Message processing function
   */
  async processWithDLQ(
    payload: EachMessagePayload,
    handler: (message: Message) => Promise<void>
  ): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      // Attempt to process message
      await handler(message);

      // Success: commit offset
      await this.consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (parseInt(message.offset) + 1).toString(),
        },
      ]);
    } catch (error) {
      // Failure: handle with retry/DLQ logic
      await this.handleFailure(topic, partition, message, error as Error);
    }
  }

  /**
   * Handle message processing failure
   */
  private async handleFailure(
    topic: string,
    partition: number,
    message: Message,
    error: Error
  ): Promise<void> {
    // Get current retry count
    const retryCount = this.getRetryCount(message);
    const nextRetryCount = retryCount + 1;

    console.error(`Message processing failed (attempt ${nextRetryCount}/${this.config.maxRetries}):`, {
      topic,
      partition,
      offset: message.offset,
      error: error.message,
    });

    if (nextRetryCount >= this.config.maxRetries) {
      // Max retries reached → Send to DLQ
      await this.sendToDLQ(topic, partition, message, error, retryCount);
    } else if (this.config.retryTopic) {
      // Send to retry topic with backoff
      await this.sendToRetry(topic, partition, message, error, nextRetryCount);
    } else {
      // No retry topic → Send directly to DLQ
      await this.sendToDLQ(topic, partition, message, error, retryCount);
    }

    // Commit offset (message handled, don't reprocess)
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (parseInt(message.offset) + 1).toString(),
      },
    ]);
  }

  /**
   * Send message to retry topic
   */
  private async sendToRetry(
    originalTopic: string,
    originalPartition: number,
    message: Message,
    error: Error,
    retryCount: number
  ): Promise<void> {
    const backoffMs = this.calculateBackoff(retryCount);
    const nextRetryTimestamp = Date.now() + backoffMs;

    const headers: Record<string, string> = {
      ...this.convertHeaders(message.headers),
      'dlq.original.topic': originalTopic,
      'dlq.original.partition': originalPartition.toString(),
      'dlq.original.offset': message.offset,
      'dlq.retry.count': retryCount.toString(),
      'dlq.error.message': error.message,
      'dlq.error.stacktrace': error.stack || '',
      'dlq.failure.timestamp': Date.now().toString(),
      'dlq.next.retry.timestamp': nextRetryTimestamp.toString(),
    };

    await this.producer.send({
      topic: this.config.retryTopic!,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers,
          timestamp: nextRetryTimestamp.toString(), // Delay processing
        },
      ],
    });

    console.log(`Message sent to retry topic (${this.config.retryTopic}) with ${backoffMs}ms backoff`);
  }

  /**
   * Send message to dead letter queue
   */
  private async sendToDLQ(
    originalTopic: string,
    originalPartition: number,
    message: Message,
    error: Error,
    retryCount: number
  ): Promise<void> {
    const headers: Record<string, string> = {
      ...this.convertHeaders(message.headers),
      'dlq.original.topic': originalTopic,
      'dlq.original.partition': originalPartition.toString(),
      'dlq.original.offset': message.offset,
      'dlq.retry.count': retryCount.toString(),
      'dlq.error.message': error.message,
      'dlq.error.stacktrace': error.stack || '',
      'dlq.failure.timestamp': Date.now().toString(),
    };

    await this.producer.send({
      topic: this.config.dlqTopic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers,
        },
      ],
    });

    console.error(`Message sent to DLQ (${this.config.dlqTopic}) after ${retryCount} retries`);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    const backoff = this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, retryCount - 1);
    return Math.min(backoff, this.config.maxBackoffMs);
  }

  /**
   * Get retry count from message headers
   */
  private getRetryCount(message: Message): number {
    const retryHeader = message.headers?.['dlq.retry.count'];
    if (!retryHeader) return 0;

    const value = Array.isArray(retryHeader) ? retryHeader[0] : retryHeader;
    return parseInt(value?.toString() || '0', 10);
  }

  /**
   * Convert Kafka headers to string map
   */
  private convertHeaders(headers?: Message['headers']): Record<string, string> {
    if (!headers) return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const val = Array.isArray(value) ? value[0] : value;
      result[key] = val?.toString() || '';
    }
    return result;
  }
}

/**
 * Retry Topic Consumer
 *
 * Consumes from retry topic and processes messages after backoff delay.
 */
export class RetryTopicConsumer {
  private consumer: Consumer;
  private dlqHandler: DeadLetterQueueHandler;

  constructor(consumer: Consumer, dlqHandler: DeadLetterQueueHandler) {
    this.consumer = consumer;
    this.dlqHandler = dlqHandler;
  }

  /**
   * Run retry consumer
   *
   * Checks timestamp header and delays processing if needed.
   */
  async run(handler: (message: Message) => Promise<void>): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload) => {
        const { message } = payload;

        // Check if message is ready for retry
        const nextRetryTimestamp = this.getNextRetryTimestamp(message);
        if (nextRetryTimestamp) {
          const now = Date.now();
          if (now < nextRetryTimestamp) {
            // Too early, skip for now (will be reprocessed later)
            console.log(`Skipping message (not ready for retry yet): ${nextRetryTimestamp - now}ms remaining`);
            return;
          }
        }

        // Ready for retry
        await this.dlqHandler.processWithDLQ(payload, handler);
      },
    });
  }

  /**
   * Get next retry timestamp from message headers
   */
  private getNextRetryTimestamp(message: Message): number | null {
    const header = message.headers?.['dlq.next.retry.timestamp'];
    if (!header) return null;

    const value = Array.isArray(header) ? header[0] : header;
    return parseInt(value?.toString() || '0', 10);
  }
}

/**
 * DLQ Monitoring and Alerting
 */
export class DLQMonitor {
  private consumer: Consumer;
  private dlqTopic: string;

  constructor(consumer: Consumer, dlqTopic: string) {
    this.consumer = consumer;
    this.dlqTopic = dlqTopic;
  }

  /**
   * Monitor DLQ for new messages and trigger alerts
   */
  async monitor(onMessage: (message: Message, headers: Partial<DLQHeaders>) => Promise<void>): Promise<void> {
    await this.consumer.subscribe({ topics: [this.dlqTopic], fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const headers = this.extractDLQHeaders(message);
        await onMessage(message, headers);
      },
    });
  }

  /**
   * Extract DLQ headers from message
   */
  private extractDLQHeaders(message: Message): Partial<DLQHeaders> {
    const headers = message.headers || {};
    const getHeader = (key: string) => {
      const value = headers[key];
      return (Array.isArray(value) ? value[0] : value)?.toString() || '';
    };

    return {
      'dlq.original.topic': getHeader('dlq.original.topic'),
      'dlq.original.partition': getHeader('dlq.original.partition'),
      'dlq.original.offset': getHeader('dlq.original.offset'),
      'dlq.retry.count': getHeader('dlq.retry.count'),
      'dlq.error.message': getHeader('dlq.error.message'),
      'dlq.error.stacktrace': getHeader('dlq.error.stacktrace'),
      'dlq.failure.timestamp': getHeader('dlq.failure.timestamp'),
    };
  }
}

/**
 * Example Usage: DLQ Handler
 *
 * ```typescript
 * const kafka = new Kafka({ brokers: ['localhost:9092'] });
 * const producer = kafka.producer();
 * const consumer = kafka.consumer({ groupId: 'order-processor' });
 *
 * await producer.connect();
 * await consumer.connect();
 * await consumer.subscribe({ topics: ['orders'] });
 *
 * const dlqHandler = new DeadLetterQueueHandler(producer, consumer, {
 *   inputTopic: 'orders',
 *   dlqTopic: 'orders-dlq',
 *   retryTopic: 'orders-retry',
 *   maxRetries: 3,
 *   consumerGroupId: 'order-processor',
 * });
 *
 * await consumer.run({
 *   eachMessage: async (payload) => {
 *     await dlqHandler.processWithDLQ(payload, async (message) => {
 *       const order = JSON.parse(message.value.toString());
 *       await processOrder(order); // May throw error
 *     });
 *   },
 * });
 * ```
 */

/**
 * Example Usage: DLQ Monitoring
 *
 * ```typescript
 * const dlqMonitor = new DLQMonitor(
 *   kafka.consumer({ groupId: 'dlq-monitor' }),
 *   'orders-dlq'
 * );
 *
 * await dlqMonitor.monitor(async (message, headers) => {
 *   // Alert on new DLQ message
 *   console.error('DLQ Message Received:', {
 *     originalTopic: headers['dlq.original.topic'],
 *     error: headers['dlq.error.message'],
 *     retries: headers['dlq.retry.count'],
 *   });
 *
 *   // Send alert to Slack/PagerDuty
 *   await sendAlert({
 *     severity: 'HIGH',
 *     message: `Message failed after ${headers['dlq.retry.count']} retries`,
 *   });
 * });
 * ```
 */

export default {
  DeadLetterQueueHandler,
  RetryTopicConsumer,
  DLQMonitor,
};
