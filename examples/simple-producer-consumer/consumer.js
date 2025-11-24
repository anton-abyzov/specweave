require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'my-consumer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'demo-group'
});

async function run() {
  try {
    // Connect consumer
    await consumer.connect();
    console.log('✓ Consumer connected to Kafka');

    // Subscribe to topic
    const topic = process.env.KAFKA_TOPIC || 'demo-topic';
    await consumer.subscribe({ topic, fromBeginning: true });
    console.log('✓ Subscribed to topic:', topic);
    console.log('⏳ Waiting for messages...\n');

    // Consume messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log('📥 Received message:');
        console.log('   Topic:', topic);
        console.log('   Partition:', partition);
        console.log('   Offset:', message.offset);
        console.log('   Key:', message.key?.toString());
        console.log('   Value:', message.value?.toString());

        // Parse headers
        if (message.headers) {
          console.log('   Headers:');
          Object.entries(message.headers).forEach(([key, value]) => {
            console.log(`     ${key}:`, value.toString());
          });
        }

        console.log(''); // Blank line between messages
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏸️  Shutting down consumer...');
  await consumer.disconnect();
  console.log('✓ Consumer disconnected');
  process.exit(0);
});

run().catch(console.error);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
