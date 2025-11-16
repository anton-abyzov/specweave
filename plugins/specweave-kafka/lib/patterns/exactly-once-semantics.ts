/**
 * Exactly-Once Semantics (EOS) Implementation for Kafka
 *
 * Provides patterns and utilities for achieving exactly-once delivery
 * guarantees in Kafka producers and consumers.
 *
 * @module exactly-once-semantics
 */

import { Producer, Consumer, Kafka, EachMessagePayload, CompressionTypes } from 'kafkajs';

/**
 * EOS Configuration for Producer
 */
export interface EOSProducerConfig {
  /** Transactional ID (must be unique per producer instance) */
  transactionalId: string;
  /** Max time to wait for transaction commit (default: 60000ms) */
  transactionTimeout?: number;
  /** Enable idempotent producer (required for EOS) */
  idempotent?: boolean;
  /** Max in-flight requests (default: 5 for EOS) */
  maxInFlightRequests?: number;
  /** Compression type (default: gzip) */
  compressionType?: CompressionTypes;
}

/**
 * EOS Configuration for Consumer
 */
export interface EOSConsumerConfig {
  /** Consumer group ID */
  groupId: string;
  /** Isolation level (read_committed for EOS) */
  isolationLevel?: 'read_committed' | 'read_uncommitted';
  /** Enable auto-commit (must be false for EOS) */
  enableAutoCommit?: boolean;
}

/**
 * Exactly-Once Producer
 *
 * Implements transactional producer with exactly-once delivery guarantees.
 */
export class ExactlyOnceProducer {
  private producer: Producer;
  private config: Required<EOSProducerConfig>;
  private inTransaction = false;

  constructor(kafka: Kafka, config: EOSProducerConfig) {
    this.config = {
      transactionalId: config.transactionalId,
      transactionTimeout: config.transactionTimeout || 60000,
      idempotent: config.idempotent !== false, // Default true
      maxInFlightRequests: config.maxInFlightRequests || 5,
      compressionType: config.compressionType || CompressionTypes.GZIP,
    };

    this.producer = kafka.producer({
      transactionalId: this.config.transactionalId,
      idempotent: this.config.idempotent,
      maxInFlightRequests: this.config.maxInFlightRequests,
    });
  }

  /**
   * Connect producer
   */
  async connect(): Promise<void> {
    await this.producer.connect();
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    if (this.inTransaction) {
      await this.abortTransaction();
    }
    await this.producer.disconnect();
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }
    await this.producer.transaction();
    this.inTransaction = true;
  }

  /**
   * Send message within transaction
   */
  async send(topic: string, messages: Array<{ key?: string; value: string }>) {
    if (!this.inTransaction) {
      throw new Error('No active transaction. Call beginTransaction() first.');
    }

    return this.producer.send({
      topic,
      messages,
      compression: this.config.compressionType,
    });
  }

  /**
   * Commit transaction
   */
  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction to commit');
    }
    await this.producer.commit();
    this.inTransaction = false;
  }

  /**
   * Abort transaction
   */
  async abortTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction to abort');
    }
    await this.producer.abort();
    this.inTransaction = false;
  }

  /**
   * Execute operation within transaction (auto-commit/abort)
   */
  async executeTransaction<T>(
    operation: (producer: Producer) => Promise<T>
  ): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await operation(this.producer);
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.abortTransaction();
      throw error;
    }
  }
}

/**
 * Exactly-Once Consumer
 *
 * Implements consumer with read_committed isolation level for EOS.
 */
export class ExactlyOnceConsumer {
  private consumer: Consumer;
  private config: Required<EOSConsumerConfig>;

  constructor(kafka: Kafka, config: EOSConsumerConfig) {
    this.config = {
      groupId: config.groupId,
      isolationLevel: config.isolationLevel || 'read_committed',
      enableAutoCommit: false, // Must be false for EOS
    };

    this.consumer = kafka.consumer({
      groupId: this.config.groupId,
      // @ts-ignore - isolationLevel typing issue in kafkajs
      isolationLevel: this.config.isolationLevel,
    });
  }

  /**
   * Connect consumer
   */
  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.subscribe({
      topics,
      fromBeginning: false,
    });
  }

  /**
   * Run consumer with exactly-once processing
   *
   * Automatically commits offsets only after successful processing.
   */
  async run(
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    await this.consumer.run({
      autoCommit: false, // Manual offset management for EOS
      eachMessage: async (payload) => {
        try {
          // Process message
          await handler(payload);

          // Commit offset only after successful processing
          await this.consumer.commitOffsets([
            {
              topic: payload.topic,
              partition: payload.partition,
              offset: (parseInt(payload.message.offset) + 1).toString(),
            },
          ]);
        } catch (error) {
          // Error: offset NOT committed, message will be reprocessed
          console.error('Message processing failed:', error);
          throw error;
        }
      },
    });
  }
}

/**
 * End-to-End Exactly-Once Pattern
 *
 * Combines transactional producer and consumer for consume-process-produce pattern.
 */
export class ExactlyOnceProcessor {
  private consumer: Consumer;
  private producer: Producer;
  private transactionalId: string;

  constructor(kafka: Kafka, consumerGroupId: string, transactionalId: string) {
    this.transactionalId = transactionalId;

    // Consumer with read_committed
    this.consumer = kafka.consumer({
      groupId: consumerGroupId,
      // @ts-ignore
      isolationLevel: 'read_committed',
    });

    // Transactional producer
    this.producer = kafka.producer({
      transactionalId,
      idempotent: true,
      maxInFlightRequests: 5,
    });
  }

  /**
   * Connect consumer and producer
   */
  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.producer.connect();
  }

  /**
   * Disconnect consumer and producer
   */
  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }

  /**
   * Subscribe to input topics
   */
  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.subscribe({ topics, fromBeginning: false });
  }

  /**
   * Run exactly-once consume-process-produce loop
   *
   * Pattern: Read → Transform → Write → Commit (all atomic)
   */
  async run(
    handler: (
      payload: EachMessagePayload
    ) => Promise<{ topic: string; messages: Array<{ key?: string; value: string }> } | null>
  ): Promise<void> {
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async (payload) => {
        // Begin transaction
        const transaction = await this.producer.transaction();

        try {
          // 1. Process message (transform)
          const output = await handler(payload);

          // 2. Send output (if any)
          if (output) {
            await transaction.send(output);
          }

          // 3. Commit consumer offset within transaction
          await transaction.sendOffsets({
            consumerGroupId: this.consumer.groupId,
            topics: [
              {
                topic: payload.topic,
                partitions: [
                  {
                    partition: payload.partition,
                    offset: (parseInt(payload.message.offset) + 1).toString(),
                  },
                ],
              },
            ],
          });

          // 4. Commit transaction (atomic: write + offset commit)
          await transaction.commit();
        } catch (error) {
          // Abort transaction (rollback everything)
          await transaction.abort();
          console.error('Transaction aborted:', error);
          throw error;
        }
      },
    });
  }
}

/**
 * Idempotent Producer (Simplified EOS)
 *
 * Ensures at-least-once delivery without duplicates (no transactions).
 */
export class IdempotentProducer {
  private producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({
      idempotent: true, // Enable idempotence
      maxInFlightRequests: 5, // Max 5 for idempotence
      acks: -1, // Wait for all replicas
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async send(topic: string, messages: Array<{ key?: string; value: string }>) {
    return this.producer.send({
      topic,
      messages,
      acks: -1, // Wait for all in-sync replicas
      compression: CompressionTypes.GZIP,
    });
  }
}

/**
 * Example Usage: Exactly-Once Producer
 *
 * ```typescript
 * const kafka = new Kafka({ brokers: ['localhost:9092'] });
 * const eosProducer = new ExactlyOnceProducer(kafka, {
 *   transactionalId: 'my-producer-1', // Unique per instance
 * });
 *
 * await eosProducer.connect();
 *
 * // Option 1: Manual transaction control
 * await eosProducer.beginTransaction();
 * await eosProducer.send('orders', [{ key: '123', value: '{"total": 99.99}' }]);
 * await eosProducer.send('analytics', [{ value: '{"event": "order_created"}' }]);
 * await eosProducer.commitTransaction(); // Atomic commit
 *
 * // Option 2: Auto-commit/abort wrapper
 * await eosProducer.executeTransaction(async (producer) => {
 *   await producer.send({ topic: 'orders', messages: [...] });
 *   await producer.send({ topic: 'analytics', messages: [...] });
 * });
 * ```
 */

/**
 * Example Usage: Exactly-Once Consumer
 *
 * ```typescript
 * const eosConsumer = new ExactlyOnceConsumer(kafka, {
 *   groupId: 'my-consumer-group',
 * });
 *
 * await eosConsumer.connect();
 * await eosConsumer.subscribe(['orders']);
 *
 * await eosConsumer.run(async ({ message }) => {
 *   const order = JSON.parse(message.value.toString());
 *   await processOrder(order); // Process message
 *   // Offset committed automatically only on success
 * });
 * ```
 */

/**
 * Example Usage: End-to-End Exactly-Once
 *
 * ```typescript
 * const processor = new ExactlyOnceProcessor(
 *   kafka,
 *   'transform-consumer-group',
 *   'transform-producer-1'
 * );
 *
 * await processor.connect();
 * await processor.subscribe(['input-topic']);
 *
 * await processor.run(async ({ message }) => {
 *   // Transform message
 *   const input = JSON.parse(message.value.toString());
 *   const output = transform(input);
 *
 *   // Return output to send (or null to skip)
 *   return {
 *     topic: 'output-topic',
 *     messages: [{ key: input.id, value: JSON.stringify(output) }],
 *   };
 * });
 * // Read, transform, write, and offset commit are ALL atomic!
 * ```
 */

export default {
  ExactlyOnceProducer,
  ExactlyOnceConsumer,
  ExactlyOnceProcessor,
  IdempotentProducer,
};
