/**
 * Kafka Producer Example (Node.js)
 *
 * Install: npm install kafkajs
 */

const { Kafka, CompressionTypes, logLevel } = require('kafkajs');

// ========================================
// Configuration
// ========================================

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],

  // Optional: Logging
  logLevel: logLevel.INFO,

  // Optional: SASL/SSL (for production)
  // ssl: true,
  // sasl: {
  //   mechanism: 'scram-sha-512',
  //   username: 'user',
  //   password: 'password'
  // }
});

const producer = kafka.producer({
  // Performance tuning
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,

  // Batching for throughput
  compression: CompressionTypes.LZ4,
  batch: {
    size: 16384,    // 16 KB
    lingerMs: 10    // Wait 10ms to batch
  },

  // Idempotence (exactly-once semantics)
  idempotent: true,
  maxInFlightRequests: 5,

  // Acknowledgment
  acks: 1  // 0 = none, 1 = leader, -1/all = all replicas
});

// ========================================
// Producer Functions
// ========================================

async function produceMessage(topic, key, value) {
  try {
    const result = await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: {
            'source': 'my-app',
            'timestamp': Date.now().toString()
          }
        }
      ]
    });

    console.log('✅ Message sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error producing message:', error);
    throw error;
  }
}

async function produceBatch(topic, messages) {
  try {
    const kafkaMessages = messages.map(msg => ({
      key: msg.key,
      value: JSON.stringify(msg.value),
      headers: {
        'source': 'my-app',
        'timestamp': Date.now().toString()
      }
    }));

    const result = await producer.send({
      topic,
      messages: kafkaMessages
    });

    console.log(`✅ ${messages.length} messages sent:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error producing batch:', error);
    throw error;
  }
}

// Transactional producer (exactly-once semantics)
async function produceTransactional(topic, messages) {
  const transaction = await producer.transaction();

  try {
    const kafkaMessages = messages.map(msg => ({
      key: msg.key,
      value: JSON.stringify(msg.value)
    }));

    await transaction.send({
      topic,
      messages: kafkaMessages
    });

    await transaction.commit();
    console.log('✅ Transaction committed');
  } catch (error) {
    await transaction.abort();
    console.error('❌ Transaction aborted:', error);
    throw error;
  }
}

// ========================================
// Main Function
// ========================================

async function main() {
  await producer.connect();
  console.log('📡 Producer connected');

  // Example 1: Single message
  await produceMessage('my-topic', 'user-123', {
    event: 'user_login',
    userId: 'user-123',
    timestamp: Date.now()
  });

  // Example 2: Batch of messages
  await produceBatch('my-topic', [
    { key: 'user-123', value: { event: 'page_view', page: '/home' } },
    { key: 'user-124', value: { event: 'page_view', page: '/products' } },
    { key: 'user-125', value: { event: 'page_view', page: '/checkout' } }
  ]);

  // Example 3: Transactional send
  await produceTransactional('my-topic', [
    { key: 'order-1', value: { event: 'order_created', amount: 99.99 } },
    { key: 'order-1', value: { event: 'payment_processed', amount: 99.99 } }
  ]);

  await producer.disconnect();
  console.log('👋 Producer disconnected');
}

// ========================================
// Run
// ========================================

main().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await producer.disconnect();
  process.exit(0);
});
