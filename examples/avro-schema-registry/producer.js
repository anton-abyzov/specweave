require('dotenv').config();
const { Kafka } = require('kafkajs');
const { SchemaRegistry, SchemaType } = require('@kafkajs/confluent-schema-registry');

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081'
});

// Avro schema definition
const schema = {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null }
  ]
};

async function run() {
  const producer = kafka.producer();

  try {
    await producer.connect();
    console.log('✓ Connected to Kafka');

    // Register schema
    const { id } = await registry.register({
      type: SchemaType.AVRO,
      schema: JSON.stringify(schema)
    });
    console.log(`✓ Schema registered with ID: ${id}`);

    // Encode message with schema
    const message = { id: 1, name: 'Alice', email: 'alice@example.com' };
    const encodedValue = await registry.encode(id, message);

    // Send message
    await producer.send({
      topic: 'users',
      messages: [{ key: '1', value: encodedValue }]
    });

    console.log('✅ Message sent with schema validation');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await producer.disconnect();
  }
}

run().catch(console.error);
