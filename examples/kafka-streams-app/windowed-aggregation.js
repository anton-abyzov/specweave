require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const WINDOW_SIZE_MS = 60000; // 1 minute tumbling windows
const windows = new Map(); // In-memory state (use RocksDB for production)

async function run() {
  const consumer = kafka.consumer({ groupId: 'streams-aggregator' });
  const producer = kafka.producer();

  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: 'user-events', fromBeginning: false });

  console.log('✓ Kafka Streams app started');
  console.log('⏳ Aggregating events in 1-minute windows...\n');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      // Calculate window start
      const timestamp = event.timestamp || Date.now();
      const windowStart = Math.floor(timestamp / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
      const windowEnd = windowStart + WINDOW_SIZE_MS;

      // Aggregate by userId + window
      const windowKey = `${event.userId}:${windowStart}`;

      if (!windows.has(event.userId)) {
        windows.set(event.userId, new Map());
      }

      const userWindows = windows.get(event.userId);
      const count = (userWindows.get(windowStart) || 0) + 1;
      userWindows.set(windowStart, count);

      // Emit windowed count
      const result = {
        userId: event.userId,
        count,
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(windowEnd).toISOString()
      };

      await producer.send({
        topic: 'user-event-counts-1min',
        messages: [{
          key: windowKey,
          value: JSON.stringify(result)
        }]
      });

      console.log(`📊 Window [${result.windowStart}]: User ${event.userId} → ${count} events`);
    }
  });
}

process.on('SIGINT', async () => process.exit(0));

run().catch(console.error);
