/**
 * Kafka Consumer Lag Benchmark (k6)
 *
 * Measures consumer lag under various load conditions and validates
 * that lag stays within acceptable bounds.
 *
 * Usage:
 *   k6 run --vus 5 --duration 60s tests/performance/kafka-consumer-lag.js
 *
 * Target: Lag < 1000 messages (1 second at 1K msg/sec per partition)
 */

import { check, sleep } from 'k6';
import { Kafka } from 'k6/x/kafka';
import { Counter, Gauge, Trend } from 'k6/metrics';

// Custom metrics
const consumerLag = new Gauge('kafka_consumer_lag');
const messagesConsumed = new Counter('kafka_messages_consumed');
const processingTime = new Trend('kafka_processing_time');
const commitLatency = new Trend('kafka_commit_latency');

// Test configuration
export const options = {
  scenarios: {
    // Producer scenario: Generate load
    producer: {
      executor: 'constant-vus',
      vus: 5,
      duration: '60s',
      exec: 'produceMessages',
    },
    // Consumer scenario: Consume with lag monitoring
    consumer: {
      executor: 'constant-vus',
      vus: 3,
      duration: '60s',
      exec: 'consumeMessages',
      startTime: '5s', // Start consuming after producers have generated some lag
    },
  },
  thresholds: {
    kafka_consumer_lag: ['value<1000'], // Lag should stay under 1000 messages
    kafka_processing_time: ['p(95)<50'], // 95th percentile processing time < 50ms
    kafka_commit_latency: ['p(99)<100'], // 99th percentile commit latency < 100ms
  },
};

// Kafka configuration
const KAFKA_BROKERS = __ENV.KAFKA_BROKERS || 'localhost:9092';
const TOPIC = __ENV.KAFKA_TOPIC || 'lag-test';
const GROUP_ID = __ENV.KAFKA_GROUP_ID || 'lag-test-group';

// Shared state (approximation for lag calculation)
let producedCount = 0;
let consumedCount = 0;

export function produceMessages() {
  const kafka = new Kafka({
    brokers: KAFKA_BROKERS.split(','),
    producerConfig: {
      acks: 1,
      compression: 'snappy',
      linger: 5,
      batchSize: 8192,
    },
  });

  // Produce 10 messages per iteration
  for (let i = 0; i < 10; i++) {
    const message = {
      timestamp: Date.now(),
      eventId: `evt-${__VU}-${__ITER}-${i}`,
      data: `Message from VU ${__VU}, iteration ${__ITER}, index ${i}`,
      payload: 'x'.repeat(500), // 500 bytes
    };

    const result = kafka.produce({
      topic: TOPIC,
      messages: [
        {
          key: `key-${__VU}`,
          value: JSON.stringify(message),
        },
      ],
    });

    if (!result.error) {
      producedCount++;
    }
  }

  sleep(0.1); // 100ms between batches (allows ~100 msg/sec per VU)
}

export function consumeMessages() {
  const kafka = new Kafka({
    brokers: KAFKA_BROKERS.split(','),
    consumerConfig: {
      groupId: GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxPollRecords: 100, // Consume up to 100 messages per poll
      autoCommit: false, // Manual commit for latency measurement
    },
  });

  // Subscribe to topic
  kafka.subscribe([TOPIC]);

  // Poll for messages
  const messages = kafka.consume({
    limit: 100, // Fetch up to 100 messages
    timeout: 1000, // 1 second timeout
  });

  if (messages && messages.length > 0) {
    const startTime = Date.now();

    // Simulate processing
    messages.forEach((message) => {
      // Parse message
      const data = JSON.parse(message.value);

      // Simulate processing time (5ms per message)
      sleep(0.005);

      messagesConsumed.add(1);
      consumedCount++;
    });

    const processTime = (Date.now() - startTime) / messages.length;
    processingTime.add(processTime);

    // Commit offset
    const commitStart = Date.now();
    kafka.commit();
    const commitTime = Date.now() - commitStart;
    commitLatency.add(commitTime);

    // Calculate lag (approximation)
    const currentLag = producedCount - consumedCount;
    consumerLag.add(currentLag);

    check({ lag: currentLag }, {
      'lag is under 1000 messages': (metrics) => metrics.lag < 1000,
      'lag is under 5000 messages': (metrics) => metrics.lag < 5000,
    });
  }

  sleep(0.1); // 100ms between polls
}

export function handleSummary(data) {
  const avgLag = data.metrics.kafka_consumer_lag?.values?.value || 0;
  const maxLag = data.metrics.kafka_consumer_lag?.values?.max || 0;
  const consumed = data.metrics.kafka_messages_consumed?.values?.count || 0;
  const avgProcessing = data.metrics.kafka_processing_time?.values?.avg || 0;
  const p95Processing = data.metrics.kafka_processing_time?.values['p(95)'] || 0;
  const p99Commit = data.metrics.kafka_commit_latency?.values['p(99)'] || 0;

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Kafka Consumer Lag Benchmark Results                ║
╠═══════════════════════════════════════════════════════════════╣
║  Messages Consumed:     ${consumed.toLocaleString().padStart(15)} messages   ║
║  Avg Lag:               ${Math.floor(avgLag).toLocaleString().padStart(15)} messages   ║
║  Max Lag:               ${Math.floor(maxLag).toLocaleString().padStart(15)} messages   ║
║  Avg Processing Time:   ${avgProcessing.toFixed(2).padStart(15)} ms          ║
║  P95 Processing Time:   ${p95Processing.toFixed(2).padStart(15)} ms          ║
║  P99 Commit Latency:    ${p99Commit.toFixed(2).padStart(15)} ms          ║
║                                                               ║
║  Target Max Lag:        ${(1000).toLocaleString().padStart(15)} messages   ║
║  Status:                ${(maxLag < 1000 ? '✅ PASS' : '❌ FAIL').padStart(15)}              ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  return {
    'lag-summary.txt': `
Kafka Consumer Lag Benchmark

Test Configuration:
- Producers: 5 VUs
- Consumers: 3 VUs
- Duration: 60s
- Brokers: ${KAFKA_BROKERS}
- Topic: ${TOPIC}
- Consumer Group: ${GROUP_ID}

Results:
- Messages Consumed: ${consumed.toLocaleString()}
- Average Lag: ${Math.floor(avgLag).toLocaleString()} messages
- Maximum Lag: ${Math.floor(maxLag).toLocaleString()} messages
- Avg Processing Time: ${avgProcessing.toFixed(2)}ms
- P95 Processing Time: ${p95Processing.toFixed(2)}ms
- P99 Commit Latency: ${p99Commit.toFixed(2)}ms

Target: Lag < 1000 messages
Status: ${maxLag < 1000 ? 'PASS ✅' : 'FAIL ❌'}

Consumer Configuration:
- maxPollRecords=100
- sessionTimeout=30s
- heartbeatInterval=3s
- autoCommit=false (manual commit)

Lag Analysis:
${maxLag < 1000 ? '- Consumer keeping up with producer load' : `
- Consumer falling behind producer
- Recommendations:
  1. Increase number of consumer instances
  2. Optimize processing time (currently ${avgProcessing.toFixed(2)}ms/msg)
  3. Increase partition count for parallel processing
  4. Tune maxPollRecords (current: 100)
`}

Throughput:
- Producer: ~${(producedCount / 60).toFixed(0)} msg/sec
- Consumer: ~${(consumed / 60).toFixed(0)} msg/sec
- Lag Growth: ${maxLag > avgLag * 2 ? 'Increasing (bad)' : 'Stable (good)'}
`,
  };
}

/**
 * Lag Benchmark Configuration Guide:
 *
 * What is Consumer Lag?
 * - Lag = (Latest Offset) - (Consumer Offset)
 * - Measures how far behind the consumer is
 *
 * Acceptable Lag Levels:
 * - < 100 messages: Excellent (real-time processing)
 * - < 1000 messages: Good (near real-time, <1s at 1K msg/sec)
 * - < 10000 messages: Acceptable (catch-up possible)
 * - > 10000 messages: Bad (falling behind, investigate)
 *
 * Factors Affecting Lag:
 * 1. Processing Time: Faster processing = lower lag
 * 2. Consumer Count: More consumers = parallel processing
 * 3. Partition Count: More partitions = more parallelism
 * 4. Network Latency: Lower latency = faster commits
 * 5. Broker Load: Less loaded brokers = faster responses
 *
 * Run Commands:
 *
 * Standard test:
 *   k6 run --vus 5 --duration 60s tests/performance/kafka-consumer-lag.js
 *
 * Stress test (high load):
 *   k6 run --vus 10 --duration 5m tests/performance/kafka-consumer-lag.js
 *
 * Custom configuration:
 *   KAFKA_BROKERS=broker1:9092,broker2:9092 \
 *   KAFKA_TOPIC=my-topic \
 *   KAFKA_GROUP_ID=my-group \
 *   k6 run tests/performance/kafka-consumer-lag.js
 */
