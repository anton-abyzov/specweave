/**
 * Kafka Consumer Example (Node.js)
 *
 * Install: npm install kafkajs
 */

const { Kafka, logLevel } = require('kafkajs');

// ========================================
// Configuration
// ========================================

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
  logLevel: logLevel.INFO
});

const consumer = kafka.consumer({
  groupId: 'my-consumer-group',

  // Session timeout (broker detects consumer failure)
  sessionTimeout: 30000,
  heartbeatInterval: 3000,

  // Rebalancing strategy
  partitionAssigners: [
    kafka.PartitionAssigners.roundRobin  // or cooperativeSticky
  ],

  // Auto-commit (disable for manual offset management)
  autoCommit: true,
  autoCommitInterval: 5000
});

// ========================================
// Consumer Functions
// ========================================

async function consumeMessages(topic) {
  await consumer.subscribe({
    topic,
    fromBeginning: false  // true = read from earliest offset
  });

  await consumer.run({
    // Messages per partition to fetch
    eachBatchAutoResolve: true,
    partitionsConsumedConcurrently: 3,

    // Process each message
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = JSON.parse(message.value.toString());
        const headers = {};
        for (const [key, val] of Object.entries(message.headers)) {
          headers[key] = val.toString();
        }

        console.log({
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
          value,
          headers,
          timestamp: message.timestamp
        });

        // Process the message
        await processMessage(value);

        // Optional: Manual offset commit
        // await consumer.commitOffsets([{
        //   topic,
        //   partition,
        //   offset: (parseInt(message.offset) + 1).toString()
        // }]);

      } catch (error) {
        console.error('❌ Error processing message:', error);
        // Send to dead letter queue
        // await sendToDLQ(message, error);
      }
    }
  });
}

async function consumeBatch(topic) {
  await consumer.subscribe({ topic });

  await consumer.run({
    // Process messages in batches
    eachBatch: async ({
      batch,
      resolveOffset,
      heartbeat,
      commitOffsetsIfNecessary,
      isRunning,
      isStale
    }) => {
      console.log(`📦 Processing batch: ${batch.messages.length} messages`);

      for (let message of batch.messages) {
        if (!isRunning() || isStale()) {
          break;  // Stop if consumer is shutting down
        }

        try {
          const value = JSON.parse(message.value.toString());
          await processMessage(value);

          // Mark message as processed
          resolveOffset(message.offset);

          // Send heartbeat to avoid rebalance
          await heartbeat();
        } catch (error) {
          console.error('❌ Error in batch:', error);
        }
      }

      // Commit all offsets
      await commitOffsetsIfNecessary();
    }
  });
}

// ========================================
// Message Processing
// ========================================

async function processMessage(message) {
  // Your business logic here
  console.log('⚙️  Processing:', message);

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Example: Handle different event types
  switch (message.event) {
    case 'user_login':
      await handleUserLogin(message);
      break;
    case 'order_created':
      await handleOrderCreated(message);
      break;
    default:
      console.log('Unknown event type:', message.event);
  }
}

async function handleUserLogin(message) {
  console.log('👤 User login:', message.userId);
  // Update user last login time
  // Send welcome email
  // etc.
}

async function handleOrderCreated(message) {
  console.log('🛒 Order created:', message);
  // Process order
  // Send confirmation email
  // Update inventory
}

// ========================================
// Dead Letter Queue
// ========================================

async function sendToDLQ(message, error) {
  const producer = kafka.producer();
  await producer.connect();

  await producer.send({
    topic: 'my-topic-dlq',
    messages: [{
      key: message.key,
      value: message.value,
      headers: {
        ...message.headers,
        'error-message': error.message,
        'error-stack': error.stack,
        'failed-at': Date.now().toString(),
        'original-topic': message.topic,
        'original-partition': message.partition.toString(),
        'original-offset': message.offset.toString()
      }
    }]
  });

  await producer.disconnect();
  console.log('📮 Message sent to DLQ');
}

// ========================================
// Main Function
// ========================================

async function main() {
  await consumer.connect();
  console.log('📡 Consumer connected');

  // Start consuming
  await consumeMessages('my-topic');

  // Or use batch processing
  // await consumeBatch('my-topic');
}

// ========================================
// Run
// ========================================

main().catch(console.error);

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down consumer...');
  await consumer.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
