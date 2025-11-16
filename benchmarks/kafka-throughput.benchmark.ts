/**
 * Kafka Performance Benchmarks
 *
 * Measures throughput and latency for:
 * - Producer performance (msgs/sec, MB/sec)
 * - Consumer performance (msgs/sec, lag)
 * - End-to-end latency (p50, p95, p99)
 * - Batch processing efficiency
 * - Compression impact
 * - Concurrent operations
 *
 * Target: 100K+ msgs/sec throughput
 *
 * @benchmark
 */

import { Kafka, Producer, Consumer, CompressionTypes } from 'kafkajs';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  messageCount: number;
  throughput: number; // msgs/sec
  bytesPerSecond: number;
  latencyP50?: number;
  latencyP95?: number;
  latencyP99?: number;
  avgLatency?: number;
}

class KafkaBenchmark {
  private kafka: Kafka;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.kafka = new Kafka({
      clientId: 'benchmark-client',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      retry: {
        retries: 3,
      },
    });
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting Kafka Performance Benchmarks...\n');

    await this.benchmarkProducerThroughput();
    await this.benchmarkConsumerThroughput();
    await this.benchmarkEndToEndLatency();
    await this.benchmarkBatchSizes();
    await this.benchmarkCompression();
    await this.benchmarkConcurrentProducers();

    this.generateReport();
  }

  /**
   * Benchmark 1: Producer Throughput
   * Target: 100K+ msgs/sec
   */
  private async benchmarkProducerThroughput(): Promise<void> {
    console.log('📊 Benchmark 1: Producer Throughput\n');

    const topic = `bench-producer-${uuidv4()}`;
    const messageCount = 100000;
    const messageSize = 1024; // 1KB

    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic, numPartitions: 10 }],
    });
    await admin.disconnect();

    const producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
    });

    await producer.connect();

    const message = {
      value: Buffer.alloc(messageSize).toString('base64'),
    };

    const startTime = performance.now();

    // Send in batches for better throughput
    const batchSize = 1000;
    for (let i = 0; i < messageCount; i += batchSize) {
      const batch = Array(Math.min(batchSize, messageCount - i)).fill(message);
      await producer.send({
        topic,
        messages: batch,
      });

      if ((i + batchSize) % 10000 === 0) {
        process.stdout.write(`\rProgress: ${i + batchSize}/${messageCount}`);
      }
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // seconds

    await producer.disconnect();

    const throughput = messageCount / duration;
    const bytesPerSecond = (messageCount * messageSize) / duration;

    this.results.push({
      name: 'Producer Throughput',
      duration,
      messageCount,
      throughput,
      bytesPerSecond,
    });

    console.log(`\n✅ Completed: ${throughput.toFixed(0)} msgs/sec, ${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/sec\n`);
  }

  /**
   * Benchmark 2: Consumer Throughput
   */
  private async benchmarkConsumerThroughput(): Promise<void> {
    console.log('📊 Benchmark 2: Consumer Throughput\n');

    const topic = `bench-consumer-${uuidv4()}`;
    const messageCount = 50000;
    const messageSize = 1024;

    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic, numPartitions: 10 }],
    });
    await admin.disconnect();

    // Produce messages first
    const producer = this.kafka.producer();
    await producer.connect();

    const message = {
      value: Buffer.alloc(messageSize).toString('base64'),
    };

    for (let i = 0; i < messageCount; i += 1000) {
      const batch = Array(1000).fill(message);
      await producer.send({ topic, messages: batch });
    }

    await producer.disconnect();

    // Benchmark consumption
    const consumer = this.kafka.consumer({
      groupId: `bench-group-${uuidv4()}`,
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    let consumedCount = 0;
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      consumer.run({
        eachBatch: async ({ batch }) => {
          consumedCount += batch.messages.length;

          if (consumedCount >= messageCount) {
            resolve();
          }
        },
      });
    });

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    await consumer.disconnect();

    const throughput = consumedCount / duration;
    const bytesPerSecond = (consumedCount * messageSize) / duration;

    this.results.push({
      name: 'Consumer Throughput',
      duration,
      messageCount: consumedCount,
      throughput,
      bytesPerSecond,
    });

    console.log(`✅ Completed: ${throughput.toFixed(0)} msgs/sec, ${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/sec\n`);
  }

  /**
   * Benchmark 3: End-to-End Latency
   */
  private async benchmarkEndToEndLatency(): Promise<void> {
    console.log('📊 Benchmark 3: End-to-End Latency\n');

    const topic = `bench-latency-${uuidv4()}`;
    const messageCount = 10000;

    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic, numPartitions: 1 }],
    });
    await admin.disconnect();

    const producer = this.kafka.producer();
    const consumer = this.kafka.consumer({
      groupId: `bench-latency-group-${uuidv4()}`,
    });

    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const latencies: number[] = [];
    const timestamps = new Map<string, number>();

    const consumePromise = new Promise<void>((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          const id = message.value!.toString();
          const sendTime = timestamps.get(id);

          if (sendTime) {
            const latency = performance.now() - sendTime;
            latencies.push(latency);

            if (latencies.length >= messageCount) {
              resolve();
            }
          }
        },
      });
    });

    // Send messages with timestamps
    for (let i = 0; i < messageCount; i++) {
      const id = `msg-${i}`;
      timestamps.set(id, performance.now());

      await producer.send({
        topic,
        messages: [{ value: id }],
      });

      if (i % 1000 === 0) {
        process.stdout.write(`\rProgress: ${i}/${messageCount}`);
      }
    }

    await consumePromise;

    await producer.disconnect();
    await consumer.disconnect();

    // Calculate percentiles
    latencies.sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    this.results.push({
      name: 'End-to-End Latency',
      duration: 0,
      messageCount,
      throughput: 0,
      bytesPerSecond: 0,
      latencyP50: p50,
      latencyP95: p95,
      latencyP99: p99,
      avgLatency: avg,
    });

    console.log(`\n✅ Latency - p50: ${p50.toFixed(2)}ms, p95: ${p95.toFixed(2)}ms, p99: ${p99.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark 4: Batch Size Impact
   */
  private async benchmarkBatchSizes(): Promise<void> {
    console.log('📊 Benchmark 4: Batch Size Impact\n');

    const batchSizes = [10, 100, 500, 1000, 5000];

    for (const batchSize of batchSizes) {
      const topic = `bench-batch-${batchSize}-${uuidv4()}`;
      const messageCount = 50000;

      const admin = this.kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic, numPartitions: 5 }],
      });
      await admin.disconnect();

      const producer = this.kafka.producer();
      await producer.connect();

      const startTime = performance.now();

      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = Array(Math.min(batchSize, messageCount - i))
          .fill({ value: 'benchmark-data' });

        await producer.send({ topic, messages: batch });
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      await producer.disconnect();

      const throughput = messageCount / duration;

      this.results.push({
        name: `Batch Size ${batchSize}`,
        duration,
        messageCount,
        throughput,
        bytesPerSecond: 0,
      });

      console.log(`  Batch ${batchSize}: ${throughput.toFixed(0)} msgs/sec`);
    }

    console.log();
  }

  /**
   * Benchmark 5: Compression Impact
   */
  private async benchmarkCompression(): Promise<void> {
    console.log('📊 Benchmark 5: Compression Impact\n');

    const compressionTypes = [
      { type: CompressionTypes.None, name: 'None' },
      { type: CompressionTypes.GZIP, name: 'GZIP' },
      { type: CompressionTypes.Snappy, name: 'Snappy' },
      { type: CompressionTypes.LZ4, name: 'LZ4' },
      { type: CompressionTypes.ZSTD, name: 'ZSTD' },
    ];

    for (const compression of compressionTypes) {
      const topic = `bench-compression-${compression.name}-${uuidv4()}`;
      const messageCount = 10000;
      const messageSize = 10240; // 10KB (compressible)

      const admin = this.kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic, numPartitions: 3 }],
      });
      await admin.disconnect();

      const producer = this.kafka.producer();
      await producer.connect();

      const message = {
        value: 'A'.repeat(messageSize), // Highly compressible
      };

      const startTime = performance.now();

      for (let i = 0; i < messageCount; i += 100) {
        const batch = Array(100).fill(message);
        await producer.send({
          topic,
          compression: compression.type,
          messages: batch,
        });
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      await producer.disconnect();

      const throughput = messageCount / duration;
      const bytesPerSecond = (messageCount * messageSize) / duration;

      this.results.push({
        name: `Compression: ${compression.name}`,
        duration,
        messageCount,
        throughput,
        bytesPerSecond,
      });

      console.log(`  ${compression.name}: ${throughput.toFixed(0)} msgs/sec, ${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/sec`);
    }

    console.log();
  }

  /**
   * Benchmark 6: Concurrent Producers
   */
  private async benchmarkConcurrentProducers(): Promise<void> {
    console.log('📊 Benchmark 6: Concurrent Producers\n');

    const topic = `bench-concurrent-${uuidv4()}`;
    const producerCount = 10;
    const messagesPerProducer = 10000;

    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic, numPartitions: 10 }],
    });
    await admin.disconnect();

    const startTime = performance.now();

    const producers = await Promise.all(
      Array.from({ length: producerCount }, async () => {
        const producer = this.kafka.producer();
        await producer.connect();
        return producer;
      })
    );

    await Promise.all(
      producers.map(async (producer) => {
        for (let i = 0; i < messagesPerProducer; i += 100) {
          const batch = Array(100).fill({ value: 'concurrent-test' });
          await producer.send({ topic, messages: batch });
        }
      })
    );

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    await Promise.all(producers.map(p => p.disconnect()));

    const totalMessages = producerCount * messagesPerProducer;
    const throughput = totalMessages / duration;

    this.results.push({
      name: `Concurrent Producers (${producerCount})`,
      duration,
      messageCount: totalMessages,
      throughput,
      bytesPerSecond: 0,
    });

    console.log(`✅ Completed: ${throughput.toFixed(0)} msgs/sec with ${producerCount} concurrent producers\n`);
  }

  /**
   * Generate benchmark report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 BENCHMARK RESULTS SUMMARY');
    console.log('='.repeat(80) + '\n');

    this.results.forEach((result) => {
      console.log(`${result.name}:`);
      console.log(`  Messages: ${result.messageCount.toLocaleString()}`);

      if (result.throughput > 0) {
        console.log(`  Throughput: ${result.throughput.toFixed(0)} msgs/sec`);
      }

      if (result.bytesPerSecond > 0) {
        console.log(`  Bandwidth: ${(result.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/sec`);
      }

      if (result.latencyP50) {
        console.log(`  Latency p50: ${result.latencyP50.toFixed(2)}ms`);
        console.log(`  Latency p95: ${result.latencyP95!.toFixed(2)}ms`);
        console.log(`  Latency p99: ${result.latencyP99!.toFixed(2)}ms`);
      }

      if (result.duration > 0) {
        console.log(`  Duration: ${result.duration.toFixed(2)}s`);
      }

      console.log();
    });

    // Save to file
    const reportDir = path.join(process.cwd(), 'benchmark-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.join(reportDir, `benchmark-${timestamp}.json`);

    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        kafkaBrokers: process.env.KAFKA_BROKERS || 'localhost:9092',
      },
    }, null, 2));

    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Performance validation
    const producerThroughput = this.results.find(r => r.name === 'Producer Throughput');
    if (producerThroughput && producerThroughput.throughput >= 100000) {
      console.log('✅ PASS: Producer throughput meets 100K+ msgs/sec target\n');
    } else {
      console.log('⚠️  WARNING: Producer throughput below 100K msgs/sec target\n');
    }
  }
}

// Run benchmarks
(async () => {
  const benchmark = new KafkaBenchmark();
  await benchmark.runAll();
  process.exit(0);
})();

/**
 * Benchmark Summary:
 *
 * 1. Producer Throughput - 100K+ msgs/sec target
 * 2. Consumer Throughput - Maximum consumption rate
 * 3. End-to-End Latency - p50, p95, p99 percentiles
 * 4. Batch Size Impact - Optimal batch sizing
 * 5. Compression Impact - Codec performance comparison
 * 6. Concurrent Producers - Scalability validation
 *
 * Expected Results:
 * - Producer: 100K-500K msgs/sec
 * - Consumer: 100K-300K msgs/sec
 * - Latency p50: <10ms
 * - Latency p95: <50ms
 * - Latency p99: <100ms
 *
 * Run: npm run benchmark
 */
