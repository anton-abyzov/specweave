import { CompressionTypes } from "kafkajs";
class ExactlyOnceProducer {
  constructor(kafka, config) {
    this.inTransaction = false;
    this.config = {
      transactionalId: config.transactionalId,
      transactionTimeout: config.transactionTimeout || 6e4,
      idempotent: config.idempotent !== false,
      // Default true
      maxInFlightRequests: config.maxInFlightRequests || 5,
      compressionType: config.compressionType || CompressionTypes.GZIP
    };
    this.producer = kafka.producer({
      transactionalId: this.config.transactionalId,
      idempotent: this.config.idempotent,
      maxInFlightRequests: this.config.maxInFlightRequests
    });
  }
  /**
   * Connect producer
   */
  async connect() {
    await this.producer.connect();
  }
  /**
   * Disconnect producer
   */
  async disconnect() {
    if (this.inTransaction) {
      await this.abortTransaction();
    }
    await this.producer.disconnect();
  }
  /**
   * Begin transaction
   */
  async beginTransaction() {
    if (this.inTransaction) {
      throw new Error("Transaction already in progress");
    }
    await this.producer.transaction();
    this.inTransaction = true;
  }
  /**
   * Send message within transaction
   */
  async send(topic, messages) {
    if (!this.inTransaction) {
      throw new Error("No active transaction. Call beginTransaction() first.");
    }
    return this.producer.send({
      topic,
      messages,
      compression: this.config.compressionType
    });
  }
  /**
   * Commit transaction
   */
  async commitTransaction() {
    if (!this.inTransaction) {
      throw new Error("No active transaction to commit");
    }
    await this.producer.commit();
    this.inTransaction = false;
  }
  /**
   * Abort transaction
   */
  async abortTransaction() {
    if (!this.inTransaction) {
      throw new Error("No active transaction to abort");
    }
    await this.producer.abort();
    this.inTransaction = false;
  }
  /**
   * Execute operation within transaction (auto-commit/abort)
   */
  async executeTransaction(operation) {
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
class ExactlyOnceConsumer {
  constructor(kafka, config) {
    this.config = {
      groupId: config.groupId,
      isolationLevel: config.isolationLevel || "read_committed",
      enableAutoCommit: false
      // Must be false for EOS
    };
    this.consumer = kafka.consumer({
      groupId: this.config.groupId,
      // @ts-ignore - isolationLevel typing issue in kafkajs
      isolationLevel: this.config.isolationLevel
    });
  }
  /**
   * Connect consumer
   */
  async connect() {
    await this.consumer.connect();
  }
  /**
   * Disconnect consumer
   */
  async disconnect() {
    await this.consumer.disconnect();
  }
  /**
   * Subscribe to topics
   */
  async subscribe(topics) {
    await this.consumer.subscribe({
      topics,
      fromBeginning: false
    });
  }
  /**
   * Run consumer with exactly-once processing
   *
   * Automatically commits offsets only after successful processing.
   */
  async run(handler) {
    await this.consumer.run({
      autoCommit: false,
      // Manual offset management for EOS
      eachMessage: async (payload) => {
        try {
          await handler(payload);
          await this.consumer.commitOffsets([
            {
              topic: payload.topic,
              partition: payload.partition,
              offset: (parseInt(payload.message.offset) + 1).toString()
            }
          ]);
        } catch (error) {
          console.error("Message processing failed:", error);
          throw error;
        }
      }
    });
  }
}
class ExactlyOnceProcessor {
  constructor(kafka, consumerGroupId, transactionalId) {
    this.transactionalId = transactionalId;
    this.consumer = kafka.consumer({
      groupId: consumerGroupId,
      // @ts-ignore
      isolationLevel: "read_committed"
    });
    this.producer = kafka.producer({
      transactionalId,
      idempotent: true,
      maxInFlightRequests: 5
    });
  }
  /**
   * Connect consumer and producer
   */
  async connect() {
    await this.consumer.connect();
    await this.producer.connect();
  }
  /**
   * Disconnect consumer and producer
   */
  async disconnect() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
  /**
   * Subscribe to input topics
   */
  async subscribe(topics) {
    await this.consumer.subscribe({ topics, fromBeginning: false });
  }
  /**
   * Run exactly-once consume-process-produce loop
   *
   * Pattern: Read → Transform → Write → Commit (all atomic)
   */
  async run(handler) {
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async (payload) => {
        const transaction = await this.producer.transaction();
        try {
          const output = await handler(payload);
          if (output) {
            await transaction.send(output);
          }
          await transaction.sendOffsets({
            consumerGroupId: this.consumer.groupId,
            topics: [
              {
                topic: payload.topic,
                partitions: [
                  {
                    partition: payload.partition,
                    offset: (parseInt(payload.message.offset) + 1).toString()
                  }
                ]
              }
            ]
          });
          await transaction.commit();
        } catch (error) {
          await transaction.abort();
          console.error("Transaction aborted:", error);
          throw error;
        }
      }
    });
  }
}
class IdempotentProducer {
  constructor(kafka) {
    this.producer = kafka.producer({
      idempotent: true,
      // Enable idempotence
      maxInFlightRequests: 5,
      // Max 5 for idempotence
      acks: -1
      // Wait for all replicas
    });
  }
  async connect() {
    await this.producer.connect();
  }
  async disconnect() {
    await this.producer.disconnect();
  }
  async send(topic, messages) {
    return this.producer.send({
      topic,
      messages,
      acks: -1,
      // Wait for all in-sync replicas
      compression: CompressionTypes.GZIP
    });
  }
}
var exactly_once_semantics_default = {
  ExactlyOnceProducer,
  ExactlyOnceConsumer,
  ExactlyOnceProcessor,
  IdempotentProducer
};
export {
  ExactlyOnceConsumer,
  ExactlyOnceProcessor,
  ExactlyOnceProducer,
  IdempotentProducer,
  exactly_once_semantics_default as default
};
