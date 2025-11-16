/**
 * Kafka End-to-End Latency Benchmark (k6)
 *
 * Measures complete message latency from producer send to consumer receive.
 * Validates that end-to-end latency stays within acceptable bounds.
 *
 * Usage:
 *   k6 run --vus 5 --duration 60s tests/performance/kafka-e2e-latency.js
 *
 * Target: P99 latency < 100ms for real-time event-driven systems
 */

import { check, sleep } from 'k6';
import { Kafka } from 'k6/x/kafka';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics
const e2eLatency = new Trend('kafka_e2e_latency');
const networkLatency = new Trend('kafka_network_latency');
const messagesProcessed = new Counter('kafka_messages_processed');
const latencyBuckets = {
  under10ms: new Counter('latency_under_10ms'),
  under50ms: new Counter('latency_under_50ms'),
  under100ms: new Counter('latency_under_100ms'),
  over100ms: new Counter('latency_over_100ms'),
};

// Test configuration
export const options = {
  scenarios: {
    // Producer: Send timestamped messages
    producer: {
      executor: 'constant-vus',
      vus: 5,
      duration: '60s',
      exec: 'produceMessages',
    },
    // Consumer: Measure receive latency
    consumer: {
      executor: 'constant-vus',
      vus: 3,
      duration: '60s',
      exec: 'consumeMessages',
      startTime: '2s',
    },
  },
  thresholds: {
    kafka_e2e_latency: [
      'p(50)<50', // Median < 50ms
      'p(95)<80', // 95th percentile < 80ms
      'p(99)<100', // 99th percentile < 100ms
    ],
    kafka_network_latency: ['avg<20'], // Average network latency < 20ms
  },
};

// Kafka configuration
const KAFKA_BROKERS = __ENV.KAFKA_BROKERS || 'localhost:9092';
const TOPIC = __ENV.KAFKA_TOPIC || 'latency-test';
const GROUP_ID = __ENV.KAFKA_GROUP_ID || 'latency-test-group';

export function produceMessages() {
  const kafka = new Kafka({
    brokers: KAFKA_BROKERS.split(','),
    producerConfig: {
      acks: 'all', // Wait for all replicas (durability)
      compression: 'none', // No compression for minimal latency
      linger: 0, // Send immediately (no batching delay)
      batchSize: 1, // Single message batches
      maxInFlightRequests: 1, // Strict ordering
    },
  });

  // High-precision timestamp
  const sendTimestamp = Date.now();
  const sendTimestampMicro = performance.now();

  const message = {
    sendTimestamp: sendTimestamp,
    sendTimestampMicro: sendTimestampMicro,
    eventId: `evt-${__VU}-${__ITER}`,
    vuId: __VU,
    iteration: __ITER,
    // Small payload for minimal serialization overhead
    data: `Latency test message from VU ${__VU}`,
  };

  const networkStart = Date.now();

  const result = kafka.produce({
    topic: TOPIC,
    messages: [
      {
        key: `key-${__VU}`,
        value: JSON.stringify(message),
        headers: {
          'send-timestamp': String(sendTimestamp),
        },
      },
    ],
  });

  const networkTime = Date.now() - networkStart;

  check(result, {
    'message sent successfully': (r) => r.error === undefined,
  });

  if (!result.error) {
    networkLatency.add(networkTime);
  }

  sleep(0.02); // 20ms between messages (50 msg/sec per VU)
}

export function consumeMessages() {
  const kafka = new Kafka({
    brokers: KAFKA_BROKERS.split(','),
    consumerConfig: {
      groupId: GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxPollRecords: 50,
      autoCommit: true,
      autoCommitInterval: 1000,
    },
  });

  kafka.subscribe([TOPIC]);

  const messages = kafka.consume({
    limit: 50,
    timeout: 1000,
  });

  if (messages && messages.length > 0) {
    const receiveTimestamp = Date.now();
    const receiveTimestampMicro = performance.now();

    messages.forEach((message) => {
      try {
        const data = JSON.parse(message.value);

        // Calculate end-to-end latency
        const latency = receiveTimestamp - data.sendTimestamp;
        const latencyMicro = receiveTimestampMicro - data.sendTimestampMicro;

        // Record metrics
        e2eLatency.add(latency);
        messagesProcessed.add(1);

        // Latency buckets for distribution analysis
        if (latency < 10) {
          latencyBuckets.under10ms.add(1);
        } else if (latency < 50) {
          latencyBuckets.under50ms.add(1);
        } else if (latency < 100) {
          latencyBuckets.under100ms.add(1);
        } else {
          latencyBuckets.over100ms.add(1);
        }

        check({ latency }, {
          'latency under 100ms': (l) => l.latency < 100,
          'latency under 50ms': (l) => l.latency < 50,
        });
      } catch (error) {
        console.error(`Failed to parse message: ${error}`);
      }
    });
  }

  sleep(0.02); // 20ms between polls
}

export function handleSummary(data) {
  const messagesCount = data.metrics.kafka_messages_processed?.values?.count || 0;
  const avgLatency = data.metrics.kafka_e2e_latency?.values?.avg || 0;
  const p50Latency = data.metrics.kafka_e2e_latency?.values?.med || 0;
  const p95Latency = data.metrics.kafka_e2e_latency?.values['p(95)'] || 0;
  const p99Latency = data.metrics.kafka_e2e_latency?.values['p(99)'] || 0;
  const maxLatency = data.metrics.kafka_e2e_latency?.values?.max || 0;
  const avgNetwork = data.metrics.kafka_network_latency?.values?.avg || 0;

  const under10 = data.metrics.latency_under_10ms?.values?.count || 0;
  const under50 = data.metrics.latency_under_50ms?.values?.count || 0;
  const under100 = data.metrics.latency_under_100ms?.values?.count || 0;
  const over100 = data.metrics.latency_over_100ms?.values?.count || 0;

  const total = under10 + under50 + under100 + over100;
  const pct10 = total > 0 ? (under10 / total) * 100 : 0;
  const pct50 = total > 0 ? ((under10 + under50) / total) * 100 : 0;
  const pct100 = total > 0 ? ((under10 + under50 + under100) / total) * 100 : 0;

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Kafka End-to-End Latency Benchmark Results            ║
╠═══════════════════════════════════════════════════════════════╣
║  Messages Processed:    ${messagesCount.toLocaleString().padStart(15)} messages   ║
║  Avg Latency:           ${avgLatency.toFixed(2).padStart(15)} ms          ║
║  P50 (Median):          ${p50Latency.toFixed(2).padStart(15)} ms          ║
║  P95:                   ${p95Latency.toFixed(2).padStart(15)} ms          ║
║  P99:                   ${p99Latency.toFixed(2).padStart(15)} ms          ║
║  Max Latency:           ${maxLatency.toFixed(2).padStart(15)} ms          ║
║  Avg Network Latency:   ${avgNetwork.toFixed(2).padStart(15)} ms          ║
║                                                               ║
║  Latency Distribution:                                        ║
║    < 10ms:   ${pct10.toFixed(1).padStart(5)}%  (${under10.toLocaleString().padStart(6)} messages)        ║
║    < 50ms:   ${pct50.toFixed(1).padStart(5)}%  (${(under10 + under50).toLocaleString().padStart(6)} messages)        ║
║    < 100ms:  ${pct100.toFixed(1).padStart(5)}%  (${(under10 + under50 + under100).toLocaleString().padStart(6)} messages)        ║
║    > 100ms:  ${((100 - pct100)).toFixed(1).padStart(5)}%  (${over100.toLocaleString().padStart(6)} messages)        ║
║                                                               ║
║  Target P99:            ${(100).toLocaleString().padStart(15)} ms          ║
║  Status:                ${(p99Latency < 100 ? '✅ PASS' : '❌ FAIL').padStart(15)}              ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  return {
    'latency-summary.txt': `
Kafka End-to-End Latency Benchmark

Test Configuration:
- Producers: 5 VUs
- Consumers: 3 VUs
- Duration: 60s
- Brokers: ${KAFKA_BROKERS}
- Topic: ${TOPIC}
- Consumer Group: ${GROUP_ID}

Producer Configuration (Low Latency):
- acks=all (durability)
- compression=none (no compression overhead)
- linger=0ms (no batching delay)
- batchSize=1 (single messages)
- maxInFlightRequests=1 (strict ordering)

Consumer Configuration:
- maxPollRecords=50
- autoCommit=true
- autoCommitInterval=1s

Results:
- Messages Processed: ${messagesCount.toLocaleString()}
- Average Latency: ${avgLatency.toFixed(2)}ms
- Median (P50): ${p50Latency.toFixed(2)}ms
- P95 Latency: ${p95Latency.toFixed(2)}ms
- P99 Latency: ${p99Latency.toFixed(2)}ms
- Max Latency: ${maxLatency.toFixed(2)}ms
- Avg Network Latency: ${avgNetwork.toFixed(2)}ms

Latency Distribution:
- < 10ms:  ${pct10.toFixed(1)}% (${under10.toLocaleString()} messages)
- < 50ms:  ${pct50.toFixed(1)}% (${(under10 + under50).toLocaleString()} messages)
- < 100ms: ${pct100.toFixed(1)}% (${(under10 + under50 + under100).toLocaleString()} messages)
- > 100ms: ${(100 - pct100).toFixed(1)}% (${over100.toLocaleString()} messages)

Target: P99 < 100ms
Status: ${p99Latency < 100 ? 'PASS ✅' : 'FAIL ❌'}

Latency Breakdown:
- Network Latency (Producer → Broker): ${avgNetwork.toFixed(2)}ms
- Broker Processing: ~${(avgLatency - avgNetwork).toFixed(2)}ms
  (includes replication, commit, consumer fetch)

Recommendations:
${p99Latency < 100 ? `
- Latency target met. System performs well for real-time use cases.
- Current configuration is optimal for low-latency scenarios.
` : `
- P99 latency exceeds 100ms target
- Investigate:
  1. Network latency between brokers and clients
  2. Broker disk I/O (use SSDs)
  3. Replication lag (check broker metrics)
  4. Consumer processing time (optimize handlers)
  5. Partition count (more partitions = more parallelism)
`}

Use Cases by Latency:
- < 10ms:  High-frequency trading, real-time gaming
- < 50ms:  Real-time analytics, live dashboards
- < 100ms: Event-driven microservices (typical target)
- < 500ms: Batch processing, async workflows
- < 1s:    Logging, audit trails

Current Performance: ${p50Latency < 50 ? 'Excellent for real-time systems' : p50Latency < 100 ? 'Good for event-driven systems' : 'Acceptable for async workflows'}
`,
  };
}

/**
 * End-to-End Latency Benchmark Guide:
 *
 * What is E2E Latency?
 * - Time from producer.send() to consumer.receive()
 * - Includes: network, serialization, broker processing, replication, consumer fetch
 *
 * Latency Targets by Use Case:
 * - Real-time systems: P99 < 50ms
 * - Event-driven systems: P99 < 100ms
 * - Async workflows: P99 < 500ms
 * - Batch processing: P99 < 1s
 *
 * Factors Affecting Latency:
 * 1. Network Latency: Physical distance, bandwidth, routing
 * 2. Broker Configuration: Disk type (SSD vs HDD), memory, CPU
 * 3. Replication Factor: More replicas = higher latency (wait for acks)
 * 4. Compression: Compression overhead vs network transfer time
 * 5. Batching: linger.ms adds delay for throughput optimization
 * 6. Consumer Poll Interval: How often consumer fetches messages
 *
 * Configuration Trade-offs:
 * - Low Latency: acks=1, linger=0, compression=none, batchSize=1
 * - High Throughput: acks=1, linger=10ms, compression=snappy, batchSize=16KB
 * - High Durability: acks=all, replication=3, min.insync.replicas=2
 *
 * Run Commands:
 *
 * Standard latency test:
 *   k6 run --vus 5 --duration 60s tests/performance/kafka-e2e-latency.js
 *
 * Stress test (high concurrency):
 *   k6 run --vus 20 --duration 5m tests/performance/kafka-e2e-latency.js
 *
 * Custom brokers:
 *   KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092 \
 *   k6 run tests/performance/kafka-e2e-latency.js
 *
 * Real-time analytics profile (aggressive):
 *   # Requires Kafka broker tuning:
 *   # - num.network.threads=8
 *   # - num.io.threads=8
 *   # - socket.send.buffer.bytes=102400
 *   # - socket.receive.buffer.bytes=102400
 *   k6 run --vus 10 --duration 2m tests/performance/kafka-e2e-latency.js
 */
