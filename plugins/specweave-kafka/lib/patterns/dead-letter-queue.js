class DeadLetterQueueHandler {
  constructor(producer, consumer, config) {
    this.config = {
      inputTopic: config.inputTopic,
      dlqTopic: config.dlqTopic,
      retryTopic: config.retryTopic,
      maxRetries: config.maxRetries || 3,
      backoffMultiplier: config.backoffMultiplier || 2,
      initialBackoffMs: config.initialBackoffMs || 1e3,
      maxBackoffMs: config.maxBackoffMs || 6e4,
      consumerGroupId: config.consumerGroupId
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
  async processWithDLQ(payload, handler) {
    const { topic, partition, message } = payload;
    try {
      await handler(message);
      await this.consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (parseInt(message.offset) + 1).toString()
        }
      ]);
    } catch (error) {
      await this.handleFailure(topic, partition, message, error);
    }
  }
  /**
   * Handle message processing failure
   */
  async handleFailure(topic, partition, message, error) {
    const retryCount = this.getRetryCount(message);
    const nextRetryCount = retryCount + 1;
    console.error(`Message processing failed (attempt ${nextRetryCount}/${this.config.maxRetries}):`, {
      topic,
      partition,
      offset: message.offset,
      error: error.message
    });
    if (nextRetryCount >= this.config.maxRetries) {
      await this.sendToDLQ(topic, partition, message, error, retryCount);
    } else if (this.config.retryTopic) {
      await this.sendToRetry(topic, partition, message, error, nextRetryCount);
    } else {
      await this.sendToDLQ(topic, partition, message, error, retryCount);
    }
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (parseInt(message.offset) + 1).toString()
      }
    ]);
  }
  /**
   * Send message to retry topic
   */
  async sendToRetry(originalTopic, originalPartition, message, error, retryCount) {
    const backoffMs = this.calculateBackoff(retryCount);
    const nextRetryTimestamp = Date.now() + backoffMs;
    const headers = {
      ...this.convertHeaders(message.headers),
      "dlq.original.topic": originalTopic,
      "dlq.original.partition": originalPartition.toString(),
      "dlq.original.offset": message.offset,
      "dlq.retry.count": retryCount.toString(),
      "dlq.error.message": error.message,
      "dlq.error.stacktrace": error.stack || "",
      "dlq.failure.timestamp": Date.now().toString(),
      "dlq.next.retry.timestamp": nextRetryTimestamp.toString()
    };
    await this.producer.send({
      topic: this.config.retryTopic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers,
          timestamp: nextRetryTimestamp.toString()
          // Delay processing
        }
      ]
    });
    console.log(`Message sent to retry topic (${this.config.retryTopic}) with ${backoffMs}ms backoff`);
  }
  /**
   * Send message to dead letter queue
   */
  async sendToDLQ(originalTopic, originalPartition, message, error, retryCount) {
    const headers = {
      ...this.convertHeaders(message.headers),
      "dlq.original.topic": originalTopic,
      "dlq.original.partition": originalPartition.toString(),
      "dlq.original.offset": message.offset,
      "dlq.retry.count": retryCount.toString(),
      "dlq.error.message": error.message,
      "dlq.error.stacktrace": error.stack || "",
      "dlq.failure.timestamp": Date.now().toString()
    };
    await this.producer.send({
      topic: this.config.dlqTopic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers
        }
      ]
    });
    console.error(`Message sent to DLQ (${this.config.dlqTopic}) after ${retryCount} retries`);
  }
  /**
   * Calculate exponential backoff delay
   */
  calculateBackoff(retryCount) {
    const backoff = this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, retryCount - 1);
    return Math.min(backoff, this.config.maxBackoffMs);
  }
  /**
   * Get retry count from message headers
   */
  getRetryCount(message) {
    const retryHeader = message.headers?.["dlq.retry.count"];
    if (!retryHeader) return 0;
    const value = Array.isArray(retryHeader) ? retryHeader[0] : retryHeader;
    return parseInt(value?.toString() || "0", 10);
  }
  /**
   * Convert Kafka headers to string map
   */
  convertHeaders(headers) {
    if (!headers) return {};
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
      const val = Array.isArray(value) ? value[0] : value;
      result[key] = val?.toString() || "";
    }
    return result;
  }
}
class RetryTopicConsumer {
  constructor(consumer, dlqHandler) {
    this.consumer = consumer;
    this.dlqHandler = dlqHandler;
  }
  /**
   * Run retry consumer
   *
   * Checks timestamp header and delays processing if needed.
   */
  async run(handler) {
    await this.consumer.run({
      eachMessage: async (payload) => {
        const { message } = payload;
        const nextRetryTimestamp = this.getNextRetryTimestamp(message);
        if (nextRetryTimestamp) {
          const now = Date.now();
          if (now < nextRetryTimestamp) {
            console.log(`Skipping message (not ready for retry yet): ${nextRetryTimestamp - now}ms remaining`);
            return;
          }
        }
        await this.dlqHandler.processWithDLQ(payload, handler);
      }
    });
  }
  /**
   * Get next retry timestamp from message headers
   */
  getNextRetryTimestamp(message) {
    const header = message.headers?.["dlq.next.retry.timestamp"];
    if (!header) return null;
    const value = Array.isArray(header) ? header[0] : header;
    return parseInt(value?.toString() || "0", 10);
  }
}
class DLQMonitor {
  constructor(consumer, dlqTopic) {
    this.consumer = consumer;
    this.dlqTopic = dlqTopic;
  }
  /**
   * Monitor DLQ for new messages and trigger alerts
   */
  async monitor(onMessage) {
    await this.consumer.subscribe({ topics: [this.dlqTopic], fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const headers = this.extractDLQHeaders(message);
        await onMessage(message, headers);
      }
    });
  }
  /**
   * Extract DLQ headers from message
   */
  extractDLQHeaders(message) {
    const headers = message.headers || {};
    const getHeader = (key) => {
      const value = headers[key];
      return (Array.isArray(value) ? value[0] : value)?.toString() || "";
    };
    return {
      "dlq.original.topic": getHeader("dlq.original.topic"),
      "dlq.original.partition": getHeader("dlq.original.partition"),
      "dlq.original.offset": getHeader("dlq.original.offset"),
      "dlq.retry.count": getHeader("dlq.retry.count"),
      "dlq.error.message": getHeader("dlq.error.message"),
      "dlq.error.stacktrace": getHeader("dlq.error.stacktrace"),
      "dlq.failure.timestamp": getHeader("dlq.failure.timestamp")
    };
  }
}
var dead_letter_queue_default = {
  DeadLetterQueueHandler,
  RetryTopicConsumer,
  DLQMonitor
};
export {
  DLQMonitor,
  DeadLetterQueueHandler,
  RetryTopicConsumer,
  dead_letter_queue_default as default
};
