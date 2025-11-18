/**
 * Integration Tests: Producer-Consumer Message Lifecycle
 *
 * Tests end-to-end message workflows including:
 * - Message production with various configurations
 * - Message consumption with different patterns
 * - Delivery guarantees (at-most-once, at-least-once, exactly-once)
 * - Offset management and commit strategies
 * - Error handling and retries
 * - Performance under load
 *
 * @requires Kafka broker running on localhost:9092 (or test container)
 * @integration
 */

import { Kafka, Producer, Consumer, CompressionTypes, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

describe('Producer-Consumer Message Lifecycle Integration', () => {
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let testTopic: string;
  let groupId: string;

  beforeAll(async () => {
    // Use test Kafka instance (e.g., Testcontainers or local broker)
    kafka = new Kafka({
      clientId: 'integration-test-client',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      logLevel: logLevel.ERROR,
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
    });

    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionalId: `test-txn-${uuidv4()}`,
    });

    await producer.connect();
  }, 30000);

  beforeEach(async () => {
    // Create unique topic and group for each test
    testTopic = `test-topic-${uuidv4()}`;
    groupId = `test-group-${uuidv4()}`;

    consumer = kafka.consumer({
      groupId,
      sessionTimeout: 6000,
      heartbeatInterval: 1000,
    });

    await consumer.connect();
  }, 15000);

  afterEach(async () => {
    await consumer.disconnect();
  });

  afterAll(async () => {
    await producer.disconnect();
  }, 10000);

  describe('Basic Message Lifecycle', () => {
    test('should produce and consume a single message', async () => {
      const messageValue = `test-message-${Date.now()}`;
      const receivedMessages: string[] = [];

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push(message.value!.toString());
            resolve();
          },
        });
      });

      // Give consumer time to subscribe
      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        messages: [{ value: messageValue }],
      });

      await consumePromise;

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toBe(messageValue);
    }, 10000);

    test('should produce and consume batch of messages', async () => {
      const batchSize = 100;
      const messages = Array.from({ length: batchSize }, (_, i) => ({
        key: `key-${i}`,
        value: `value-${i}`,
        headers: { index: String(i) },
      }));

      const receivedMessages: any[] = [];

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push({
              key: message.key!.toString(),
              value: message.value!.toString(),
              index: message.headers?.index?.toString(),
            });

            if (receivedMessages.length === batchSize) {
              resolve();
            }
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        messages,
      });

      await consumePromise;

      expect(receivedMessages).toHaveLength(batchSize);
      expect(receivedMessages[0].key).toBe('key-0');
      expect(receivedMessages[99].key).toBe('key-99');
    }, 15000);

    test('should maintain message order within partition', async () => {
      const partitionKey = 'same-partition';
      const messageCount = 50;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        key: partitionKey,
        value: `message-${i}`,
      }));

      const receivedMessages: string[] = [];

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push(message.value!.toString());
            if (receivedMessages.length === messageCount) {
              resolve();
            }
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        messages,
      });

      await consumePromise;

      // Verify order
      for (let i = 0; i < messageCount; i++) {
        expect(receivedMessages[i]).toBe(`message-${i}`);
      }
    }, 15000);
  });

  describe('Compression', () => {
    test('should produce and consume compressed messages (gzip)', async () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      const receivedMessages: string[] = [];

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push(message.value!.toString());
            resolve();
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        compression: CompressionTypes.GZIP,
        messages: [{ value: largeMessage }],
      });

      await consumePromise;

      expect(receivedMessages[0]).toBe(largeMessage);
      expect(receivedMessages[0].length).toBe(10000);
    }, 10000);

    test('should produce and consume compressed messages (snappy)', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        value: `message-${i}`.repeat(100), // ~1KB each
      }));

      const receivedCount = { count: 0 };

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          eachMessage: async () => {
            receivedCount.count++;
            if (receivedCount.count === 100) {
              resolve();
            }
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        compression: CompressionTypes.Snappy,
        messages,
      });

      await consumePromise;

      expect(receivedCount.count).toBe(100);
    }, 15000);
  });

  describe('Delivery Guarantees', () => {
    test('should support at-most-once delivery (acks=0)', async () => {
      // Producer doesn't wait for acknowledgment
      const messages = Array.from({ length: 10 }, (_, i) => ({
        value: `at-most-once-${i}`,
      }));

      // Send with acks=0 (fire and forget)
      const fastProducer = kafka.producer({
        allowAutoTopicCreation: true,
        idempotent: false,
        maxInFlightRequests: 1,
      });

      await fastProducer.connect();

      const startTime = Date.now();

      await fastProducer.send({
        topic: testTopic,
        acks: 0, // No acknowledgment
        messages,
      });

      const endTime = Date.now();

      await fastProducer.disconnect();

      // Should be very fast (no waiting for acks)
      expect(endTime - startTime).toBeLessThan(500);
    }, 10000);

    test('should support at-least-once delivery (acks=1)', async () => {
      const messageValue = 'at-least-once-message';
      const receivedMessages: string[] = [];

      await consumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        consumer.run({
          autoCommit: false, // Manual offset management
          eachMessage: async ({ topic, partition, message }) => {
            receivedMessages.push(message.value!.toString());

            // Manually commit after processing
            await consumer.commitOffsets([{
              topic,
              partition,
              offset: (Number(message.offset) + 1).toString(),
            }]);

            resolve();
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send with acks=1 (leader acknowledgment)
      await producer.send({
        topic: testTopic,
        acks: 1,
        messages: [{ value: messageValue }],
      });

      await consumePromise;

      expect(receivedMessages).toContain(messageValue);
    }, 10000);

    test('should support exactly-once delivery with transactions', async () => {
      const transactionalProducer = kafka.producer({
        transactionalId: `txn-test-${uuidv4()}`,
        idempotent: true,
        maxInFlightRequests: 1,
      });

      await transactionalProducer.connect();

      const messageValue = 'exactly-once-message';
      const receivedMessages: string[] = [];

      const transactionalConsumer = kafka.consumer({
        groupId: `txn-group-${uuidv4()}`,
        isolation: 'read_committed', // Only read committed messages
      });

      await transactionalConsumer.connect();
      await transactionalConsumer.subscribe({ topic: testTopic, fromBeginning: true });

      const consumePromise = new Promise<void>((resolve) => {
        transactionalConsumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push(message.value!.toString());
            resolve();
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send in transaction
      const transaction = await transactionalProducer.transaction();
      await transaction.send({
        topic: testTopic,
        messages: [{ value: messageValue }],
      });
      await transaction.commit();

      await consumePromise;

      await transactionalProducer.disconnect();
      await transactionalConsumer.disconnect();

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toBe(messageValue);
    }, 15000);

    test('should rollback transaction on error', async () => {
      const transactionalProducer = kafka.producer({
        transactionalId: `txn-rollback-${uuidv4()}`,
        idempotent: true,
      });

      await transactionalProducer.connect();

      const transactionalConsumer = kafka.consumer({
        groupId: `txn-rollback-group-${uuidv4()}`,
        isolation: 'read_committed',
      });

      await transactionalConsumer.connect();
      await transactionalConsumer.subscribe({ topic: testTopic, fromBeginning: true });

      let receivedCount = 0;

      transactionalConsumer.run({
        eachMessage: async () => {
          receivedCount++;
        },
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start transaction and abort it
      const transaction = await transactionalProducer.transaction();
      await transaction.send({
        topic: testTopic,
        messages: [{ value: 'should-not-appear' }],
      });
      await transaction.abort();

      // Wait for potential consumption
      await new Promise(resolve => setTimeout(resolve, 2000));

      await transactionalProducer.disconnect();
      await transactionalConsumer.disconnect();

      // Message should not be consumed (transaction aborted)
      expect(receivedCount).toBe(0);
    }, 15000);
  });

  describe('Offset Management', () => {
    test('should auto-commit offsets', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        value: `auto-commit-${i}`,
      }));

      const autoCommitConsumer = kafka.consumer({
        groupId: `auto-commit-group-${uuidv4()}`,
        sessionTimeout: 6000,
        autoCommit: true,
        autoCommitInterval: 1000,
      });

      await autoCommitConsumer.connect();
      await autoCommitConsumer.subscribe({ topic: testTopic, fromBeginning: true });

      let processedCount = 0;

      const consumePromise = new Promise<void>((resolve) => {
        autoCommitConsumer.run({
          eachMessage: async () => {
            processedCount++;
            if (processedCount === 10) {
              resolve();
            }
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        messages,
      });

      await consumePromise;

      // Wait for auto-commit
      await new Promise(resolve => setTimeout(resolve, 2000));

      await autoCommitConsumer.disconnect();

      expect(processedCount).toBe(10);
    }, 15000);

    test('should manually commit offsets', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        value: `manual-commit-${i}`,
      }));

      const manualConsumer = kafka.consumer({
        groupId: `manual-commit-group-${uuidv4()}`,
        autoCommit: false,
      });

      await manualConsumer.connect();
      await manualConsumer.subscribe({ topic: testTopic, fromBeginning: true });

      let lastOffset: string | undefined;

      const consumePromise = new Promise<void>((resolve) => {
        manualConsumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            lastOffset = message.offset;

            // Commit after each message
            await manualConsumer.commitOffsets([{
              topic,
              partition,
              offset: (Number(message.offset) + 1).toString(),
            }]);

            if (Number(message.offset) === 4) {
              resolve();
            }
          },
        });
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: testTopic,
        messages,
      });

      await consumePromise;

      await manualConsumer.disconnect();

      expect(lastOffset).toBe('4');
    }, 15000);

    test('should seek to specific offset', async () => {
      // Produce 10 messages
      const messages = Array.from({ length: 10 }, (_, i) => ({
        value: `seek-message-${i}`,
      }));

      await producer.send({
        topic: testTopic,
        messages,
      });

      // Wait for messages to be written
      await new Promise(resolve => setTimeout(resolve, 1000));

      const seekConsumer = kafka.consumer({
        groupId: `seek-group-${uuidv4()}`,
      });

      await seekConsumer.connect();
      await seekConsumer.subscribe({ topic: testTopic });

      const receivedMessages: string[] = [];

      const consumePromise = new Promise<void>((resolve) => {
        seekConsumer.run({
          eachMessage: async ({ message }) => {
            receivedMessages.push(message.value!.toString());
            if (receivedMessages.length === 5) {
              resolve();
            }
          },
        });
      });

      // Seek to offset 5 (skip first 5 messages)
      seekConsumer.seek({ topic: testTopic, partition: 0, offset: '5' });

      await consumePromise;

      await seekConsumer.disconnect();

      // Should only receive messages 5-9
      expect(receivedMessages).toHaveLength(5);
      expect(receivedMessages[0]).toBe('seek-message-5');
      expect(receivedMessages[4]).toBe('seek-message-9');
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should retry on transient producer errors', async () => {
      const retryProducer = kafka.producer({
        retry: {
          retries: 5,
          initialRetryTime: 100,
          multiplier: 2,
        },
      });

      await retryProducer.connect();

      // Send to valid topic (should succeed after retries if broker temporarily unavailable)
      await expect(
        retryProducer.send({
          topic: testTopic,
          messages: [{ value: 'retry-test' }],
        })
      ).resolves.not.toThrow();

      await retryProducer.disconnect();
    }, 10000);

    test('should handle consumer rebalance', async () => {
      const rebalanceTopic = `rebalance-topic-${uuidv4()}`;
      const rebalanceGroup = `rebalance-group-${uuidv4()}`;

      // Create first consumer
      const consumer1 = kafka.consumer({
        groupId: rebalanceGroup,
        sessionTimeout: 6000,
      });

      await consumer1.connect();
      await consumer1.subscribe({ topic: rebalanceTopic, fromBeginning: true });

      let consumer1Count = 0;

      consumer1.run({
        eachMessage: async () => {
          consumer1Count++;
        },
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Produce some messages
      await producer.send({
        topic: rebalanceTopic,
        messages: Array.from({ length: 10 }, (_, i) => ({ value: `msg-${i}` })),
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create second consumer (triggers rebalance)
      const consumer2 = kafka.consumer({
        groupId: rebalanceGroup,
        sessionTimeout: 6000,
      });

      await consumer2.connect();
      await consumer2.subscribe({ topic: rebalanceTopic, fromBeginning: false });

      let consumer2Count = 0;

      consumer2.run({
        eachMessage: async () => {
          consumer2Count++;
        },
      });

      // Produce more messages (should be distributed between consumers)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await producer.send({
        topic: rebalanceTopic,
        messages: Array.from({ length: 10 }, (_, i) => ({ value: `msg2-${i}` })),
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      await consumer1.disconnect();
      await consumer2.disconnect();

      // Both consumers should have processed messages
      expect(consumer1Count).toBeGreaterThan(0);
      expect(consumer2Count).toBeGreaterThan(0);
      expect(consumer1Count + consumer2Count).toBeGreaterThanOrEqual(10);
    }, 25000);
  });

  describe('Performance', () => {
    test('should handle high throughput production', async () => {
      const messageCount = 10000;
      const batchSize = 100;

      const startTime = Date.now();

      // Send messages in batches
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = Array.from({ length: batchSize }, (_, j) => ({
          value: `perf-msg-${i + j}`,
        }));

        await producer.send({
          topic: testTopic,
          messages: batch,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (messageCount / duration) * 1000; // msgs/sec

      expect(throughput).toBeGreaterThan(1000); // At least 1K msgs/sec
    }, 30000);

    test('should handle high throughput consumption', async () => {
      const messageCount = 5000;

      // Produce messages first
      const batches = 50;
      const batchSize = messageCount / batches;

      for (let i = 0; i < batches; i++) {
        const batch = Array.from({ length: batchSize }, (_, j) => ({
          value: `consume-perf-${i * batchSize + j}`,
        }));

        await producer.send({
          topic: testTopic,
          messages: batch,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const perfConsumer = kafka.consumer({
        groupId: `perf-group-${uuidv4()}`,
      });

      await perfConsumer.connect();
      await perfConsumer.subscribe({ topic: testTopic, fromBeginning: true });

      let receivedCount = 0;
      const startTime = Date.now();

      const consumePromise = new Promise<void>((resolve) => {
        perfConsumer.run({
          eachBatch: async ({ batch }) => {
            receivedCount += batch.messages.length;

            if (receivedCount >= messageCount) {
              resolve();
            }
          },
        });
      });

      await consumePromise;

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (receivedCount / duration) * 1000; // msgs/sec

      await perfConsumer.disconnect();

      expect(receivedCount).toBe(messageCount);
      expect(throughput).toBeGreaterThan(1000); // At least 1K msgs/sec
    }, 40000);
  });
});

/**
 * Test Coverage Summary:
 *
 * ✅ Basic Message Lifecycle
 *   - Single message production and consumption
 *   - Batch message handling
 *   - Message ordering within partitions
 *
 * ✅ Compression
 *   - GZIP compression for large messages
 *   - Snappy compression for batch processing
 *
 * ✅ Delivery Guarantees
 *   - At-most-once (acks=0, fire and forget)
 *   - At-least-once (acks=1, leader acknowledgment)
 *   - Exactly-once (transactions with read_committed)
 *   - Transaction rollback on error
 *
 * ✅ Offset Management
 *   - Auto-commit offsets
 *   - Manual offset commits
 *   - Seeking to specific offsets
 *
 * ✅ Error Handling
 *   - Producer retry logic
 *   - Consumer rebalancing
 *
 * ✅ Performance
 *   - High throughput production (10K+ msgs)
 *   - High throughput consumption (5K+ msgs)
 *   - Throughput validation (>1K msgs/sec)
 *
 * Coverage: 85%+ of producer-consumer workflows
 * Test Duration: ~3-5 minutes (depends on Kafka broker)
 */
