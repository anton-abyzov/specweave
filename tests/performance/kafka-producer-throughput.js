/**
 * Kafka Producer Throughput Benchmark (k6)
 *
 * Validates that the Kafka producer can achieve 100K+ messages/sec throughput
 *
 * Usage:
 *   k6 run --vus 10 --duration 30s tests/performance/kafka-producer-throughput.js
 *
 * Target: 100,000+ messages/second
 */

import { check } from 'k6';
import { Kafka } from 'k6/x/kafka';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const messagesSent = new Counter('kafka_messages_sent');
const sendLatency = new Trend('kafka_send_latency');
const batchSize = new Trend('kafka_batch_size');
const compressionRatio = new Trend('kafka_compression_ratio');

// Test configuration
export const options = {
  vus: 10, // 10 virtual users (producers)
  duration: '30s',
  thresholds: {
    // Target: 100K+ messages/sec
    kafka_messages_sent: ['count>3000000'], // 100K/s * 30s = 3M messages
    kafka_send_latency: ['p(95)<100'], // 95th percentile < 100ms
    kafka_send_latency: ['p(99)<200'], // 99th percentile < 200ms
  },
};

// Kafka configuration
const KAFKA_BROKERS = __ENV.KAFKA_BROKERS || 'localhost:9092';
const TOPIC = __ENV.KAFKA_TOPIC || 'performance-test';

export default function () {
  const kafka = new Kafka({
    brokers: KAFKA_BROKERS.split(','),
    // Optimize for throughput
    producerConfig: {
      acks: 1, // Wait for leader acknowledgment only
      compression: 'snappy', // Enable compression
      linger: 10, // Wait up to 10ms for batching
      batchSize: 16384, // 16KB batches
      maxInFlightRequests: 5, // Allow 5 in-flight requests
    },
  });

  // Message payload (1KB)
  const message = {
    timestamp: Date.now(),
    eventId: `evt-${__VU}-${__ITER}`,
    userId: `user-${Math.floor(Math.random() * 10000)}`,
    action: 'page_view',
    page: `/page-${Math.floor(Math.random() * 100)}`,
    metadata: {
      browser: 'Chrome',
      os: 'Linux',
      country: 'US',
      sessionId: `session-${__VU}`,
    },
    // Padding to reach 1KB
    padding: 'x'.repeat(800),
  };

  const startTime = Date.now();

  // Send message
  const result = kafka.produce({
    topic: TOPIC,
    messages: [
      {
        key: `key-${__VU}`,
        value: JSON.stringify(message),
      },
    ],
  });

  const sendTime = Date.now() - startTime;

  // Record metrics
  check(result, {
    'message sent successfully': (r) => r.error === undefined,
  });

  if (!result.error) {
    messagesSent.add(1);
    sendLatency.add(sendTime);
  }
}

export function handleSummary(data) {
  const messageCount = data.metrics.kafka_messages_sent.values.count;
  const throughput = messageCount / 30; // messages/sec
  const p95Latency = data.metrics.kafka_send_latency.values['p(95)'];
  const p99Latency = data.metrics.kafka_send_latency.values['p(99)'];

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          Kafka Producer Throughput Benchmark Results          ║
╠═══════════════════════════════════════════════════════════════╣
║  Total Messages Sent:   ${messageCount.toLocaleString().padStart(15)} messages   ║
║  Test Duration:         ${options.duration.padStart(15)}              ║
║  Throughput:            ${Math.floor(throughput).toLocaleString().padStart(15)} msg/sec     ║
║  P95 Latency:           ${p95Latency.toFixed(2).padStart(15)} ms          ║
║  P99 Latency:           ${p99Latency.toFixed(2).padStart(15)} ms          ║
║                                                               ║
║  Target Throughput:     ${(100000).toLocaleString().padStart(15)} msg/sec     ║
║  Status:                ${(throughput >= 100000 ? '✅ PASS' : '❌ FAIL').padStart(15)}              ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  return {
    'summary.txt': `
Kafka Producer Throughput Benchmark

Test Configuration:
- Virtual Users: ${options.vus}
- Duration: ${options.duration}
- Brokers: ${KAFKA_BROKERS}
- Topic: ${TOPIC}
- Message Size: ~1KB

Results:
- Total Messages: ${messageCount.toLocaleString()}
- Throughput: ${Math.floor(throughput).toLocaleString()} messages/sec
- P95 Latency: ${p95Latency.toFixed(2)}ms
- P99 Latency: ${p99Latency.toFixed(2)}ms

Target: 100,000+ messages/sec
Status: ${throughput >= 100000 ? 'PASS ✅' : 'FAIL ❌'}

Configuration Optimizations:
- acks=1 (leader only)
- compression=snappy
- linger=10ms (batching)
- batchSize=16KB
- maxInFlightRequests=5

Recommendations:
${throughput >= 100000 ? '- Throughput target met. No action needed.' : `
- Increase number of partitions (current: auto)
- Increase batch size (current: 16KB)
- Increase linger time (current: 10ms)
- Add more brokers for horizontal scaling
`}
`,
  };
}

/**
 * Benchmark Configuration Guide:
 *
 * To achieve 100K+ msg/sec:
 * 1. Partition Count: At least 10-20 partitions
 * 2. Broker Count: At least 3 brokers
 * 3. Network: 1Gbps+ between brokers and clients
 * 4. Disk: SSD recommended
 * 5. Batch Size: 16KB - 32KB
 * 6. Compression: snappy or lz4
 * 7. In-flight Requests: 5-10
 *
 * Run Commands:
 *
 * Quick test (10 VUs, 30s):
 *   k6 run --vus 10 --duration 30s tests/performance/kafka-producer-throughput.js
 *
 * Stress test (50 VUs, 5min):
 *   k6 run --vus 50 --duration 5m tests/performance/kafka-producer-throughput.js
 *
 * Load test with custom brokers:
 *   KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092 \
 *   k6 run --vus 20 --duration 2m tests/performance/kafka-producer-throughput.js
 */
