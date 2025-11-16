# Simple Producer-Consumer Example

**Basic Kafka producer and consumer with Node.js**

This example demonstrates the simplest way to produce and consume messages with Kafka using KafkaJS.

## Prerequisites

- Node.js 18+
- Kafka cluster running (local or remote)
- Broker accessible at `localhost:9092` (or update `.env`)

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Kafka broker addresses

# Start Kafka locally (if needed)
docker-compose up -d
```

## Run

### Terminal 1: Start Consumer

```bash
npm run consumer
```

Expected output:
```
✓ Consumer connected to Kafka
✓ Subscribed to topic: demo-topic
⏳ Waiting for messages...

📥 Received message:
   Topic: demo-topic
   Partition: 0
   Offset: 0
   Key: user-123
   Value: {"message":"Hello Kafka!","timestamp":"2025-11-15T..."}
```

### Terminal 2: Send Messages

```bash
npm run producer
```

Expected output:
```
✓ Producer connected to Kafka
📤 Sending message...
✅ Message sent successfully!
   Topic: demo-topic
   Partition: 0
   Offset: 0
```

## Files

- **producer.js** - Sends a test message to Kafka
- **consumer.js** - Consumes messages from Kafka topic
- **package.json** - Dependencies and scripts
- **.env.example** - Environment variables template
- **docker-compose.yml** - Local Kafka cluster (optional)

## Code Walkthrough

### Producer (producer.js)

```javascript
const { Kafka } = require('kafkajs');

// 1. Create Kafka client
const kafka = new Kafka({
  clientId: 'my-producer',
  brokers: ['localhost:9092']
});

// 2. Create producer
const producer = kafka.producer();

// 3. Connect and send
async function run() {
  await producer.connect();

  await producer.send({
    topic: 'demo-topic',
    messages: [{
      key: 'user-123',
      value: JSON.stringify({ message: 'Hello Kafka!', timestamp: new Date() })
    }]
  });

  await producer.disconnect();
}
```

### Consumer (consumer.js)

```javascript
const { Kafka } = require('kafkajs');

// 1. Create Kafka client
const kafka = new Kafka({
  clientId: 'my-consumer',
  brokers: ['localhost:9092']
});

// 2. Create consumer with group ID
const consumer = kafka.consumer({ groupId: 'demo-group' });

// 3. Subscribe and consume
async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'demo-topic', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString(),
        value: message.value?.toString()
      });
    }
  });
}
```

## Troubleshooting

### Error: Connection refused

```bash
# Check if Kafka is running
docker ps | grep kafka

# If not running, start it
docker-compose up -d

# Wait for Kafka to be ready (~30 seconds)
docker logs kafka-broker -f
```

### Error: Topic does not exist

```bash
# Create topic manually
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic demo-topic \
  --partitions 3 --replication-factor 1
```

### Consumer not receiving messages

```bash
# Reset consumer group offsets
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group demo-group \
  --topic demo-topic \
  --reset-offsets --to-earliest \
  --execute
```

## Next Steps

- Try [avro-schema-registry](../avro-schema-registry/) - Add schema validation
- Try [exactly-once-semantics](../exactly-once-semantics/) - Ensure zero message loss
- Try [kafka-streams-app](../kafka-streams-app/) - Real-time stream processing

## Documentation

- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [SpecWeave Getting Started Guide](../../.specweave/docs/public/guides/kafka-getting-started.md)
