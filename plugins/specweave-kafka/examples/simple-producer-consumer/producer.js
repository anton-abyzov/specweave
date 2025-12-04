require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'my-producer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();

async function run() {
  try {
    // Connect producer
    await producer.connect();
    console.log('✓ Producer connected to Kafka');

    // Prepare message
    const message = {
      message: 'Hello Kafka!',
      timestamp: new Date().toISOString(),
      source: 'simple-producer'
    };

    console.log('\n📤 Sending message...');

    // Send message
    const result = await producer.send({
      topic: process.env.KAFKA_TOPIC || 'demo-topic',
      messages: [{
        key: 'user-123',
        value: JSON.stringify(message),
        headers: {
          'correlation-id': '12345',
          'content-type': 'application/json'
        }
      }]
    });

    console.log('✅ Message sent successfully!');
    console.log('   Topic:', result[0].topicName);
    console.log('   Partition:', result[0].partition);
    console.log('   Offset:', result[0].baseOffset);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await producer.disconnect();
    console.log('\n✓ Producer disconnected');
  }
}

run().catch(console.error);
