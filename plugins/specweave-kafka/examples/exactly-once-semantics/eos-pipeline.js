require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({
  groupId: 'eos-pipeline',
  isolation: 'read_committed' // Only read committed transactions
});

const producer = kafka.producer({
  transactional: true,
  transactionalId: 'eos-pipeline-tx-001', // Unique per instance
  idempotent: true, // Prevent duplicates
  maxInFlightRequests: 1,
  acks: -1
});

async function run() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: 'input-events', fromBeginning: false });

  console.log('✓ EOS Pipeline started');
  console.log('⏳ Processing messages with exactly-once semantics...\n');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const transaction = await producer.transaction();

      try {
        // Parse input
        const input = JSON.parse(message.value.toString());
        console.log('📥 Input:', input);

        // Transform
        const output = {
          ...input,
          processed: true,
          timestamp: new Date().toISOString()
        };

        // Send to output topic
        await transaction.send({
          topic: 'output-events',
          messages: [{ key: message.key, value: JSON.stringify(output) }]
        });

        // Commit offset within transaction (atomic!)
        await transaction.sendOffsets({
          consumerGroupId: 'eos-pipeline',
          topics: [{
            topic,
            partitions: [{ partition, offset: (parseInt(message.offset) + 1).toString() }]
          }]
        });

        // Commit transaction (both output + offset committed atomically)
        await transaction.commit();
        console.log('✅ Processed:', output.id || 'message');

      } catch (error) {
        console.error('❌ Error, aborting transaction:', error.message);
        await transaction.abort();
      }
    }
  });
}

process.on('SIGINT', async () => {
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});

run().catch(console.error);
