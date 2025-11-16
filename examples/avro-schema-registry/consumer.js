require('dotenv').config();
const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081'
});

async function run() {
  const consumer = kafka.consumer({ groupId: 'avro-consumer-group' });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'users', fromBeginning: true });
    console.log('✓ Consumer ready');

    await consumer.run({
      eachMessage: async ({ message }) => {
        // Decode automatically (schema ID in message)
        const user = await registry.decode(message.value);
        console.log('📥 Received user:', user);
        // Output: { id: 1, name: 'Alice', email: 'alice@example.com' }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

process.on('SIGINT', async () => process.exit(0));

run().catch(console.error);
