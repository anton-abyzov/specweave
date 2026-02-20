# Advanced Kafka Usage with SpecWeave

**Production-ready patterns for security, reliability, and observability**

This guide covers advanced Kafka features for production deployments. If you're new to SpecWeave Kafka, start with the [Getting Started Guide](kafka-getting-started.md).

## Table of Contents

1. [Exactly-Once Semantics (EOS)](#exactly-once-semantics-eos)
2. [Security Configuration](#security-configuration)
3. [Multi-Cluster Management](#multi-cluster-management)
4. [Kafka Streams Applications](#kafka-streams-applications)
5. [OpenTelemetry Instrumentation](#opentelemetry-instrumentation)
6. [Performance Optimization](#performance-optimization)
7. [High Availability Patterns](#high-availability-patterns)

---

## Exactly-Once Semantics (EOS)

Ensure zero message duplication or loss with transactional producers and consumers.

### Use Case

Financial transactions, order processing, billing systems - any scenario where duplicate or lost messages are unacceptable.

### Architecture

```
Producer (transactional) → Kafka (transaction log) → Consumer (read-committed)
                              ↓
                      Transaction Coordinator
```

### Transactional Producer

**File**: `src/producers/transactional-producer.ts`

```typescript
import { Kafka, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'payment-processor',
  brokers: ['localhost:9092']
});

// Enable transactional mode
const producer: Producer = kafka.producer({
  transactional: true,
  transactionalId: 'payment-tx-001', // Must be unique per producer instance
  idempotent: true, // Implied by transactional: true
  maxInFlightRequests: 1,
  acks: -1 // All replicas must acknowledge
});

async function processPayment(orderId: string, amount: number) {
  await producer.connect();

  // Begin transaction
  const transaction = await producer.transaction();

  try {
    // Send to payment topic
    await transaction.send({
      topic: 'payments',
      messages: [{
        key: orderId,
        value: JSON.stringify({ orderId, amount, status: 'processed' })
      }]
    });

    // Send to audit log
    await transaction.send({
      topic: 'audit-log',
      messages: [{
        key: orderId,
        value: JSON.stringify({ orderId, event: 'payment-processed', timestamp: Date.now() })
      }]
    });

    // Commit transaction - both messages delivered atomically
    await transaction.commit();
    console.log(`Payment ${orderId} processed successfully`);

  } catch (error) {
    // Abort transaction - neither message delivered
    await transaction.abort();
    console.error(`Payment ${orderId} failed:`, error);
    throw error;
  }
}

export { processPayment, producer };
```

### Read-Committed Consumer

**File**: `src/consumers/read-committed-consumer.ts`

```typescript
import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'payment-consumer',
  brokers: ['localhost:9092']
});

const consumer: Consumer = kafka.consumer({
  groupId: 'payment-processing-group',
  // Only read committed messages (ignore aborted transactions)
  isolation: 'read_committed'
});

async function consumePayments() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'payments', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payment = JSON.parse(message.value!.toString());

      // This message is guaranteed to be from a committed transaction
      console.log('Processing payment:', payment);

      // Update database, send confirmation, etc.
      await updateDatabase(payment);
    }
  });
}

async function updateDatabase(payment: any) {
  // Your database logic here
  console.log('Database updated for payment:', payment.orderId);
}

export { consumePayments };
```

### End-to-End EOS Pipeline

**File**: `src/pipelines/eos-pipeline.ts`

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'eos-pipeline',
  brokers: ['localhost:9092']
});

// Consumer reads from input topic
const consumer = kafka.consumer({
  groupId: 'pipeline-processor',
  isolation: 'read_committed'
});

// Producer writes to output topic
const producer = kafka.producer({
  transactional: true,
  transactionalId: 'pipeline-tx-001'
});

async function runPipeline() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: 'input-events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
      const transaction = await producer.transaction();

      try {
        // Process message
        const inputData = JSON.parse(message.value!.toString());
        const outputData = transformData(inputData);

        // Send transformed data
        await transaction.send({
          topic: 'output-events',
          messages: [{
            key: message.key,
            value: JSON.stringify(outputData)
          }]
        });

        // Commit consumer offset within transaction
        await transaction.sendOffsets({
          consumerGroupId: 'pipeline-processor',
          topics: [{
            topic: 'input-events',
            partitions: [{
              partition,
              offset: (parseInt(message.offset) + 1).toString()
            }]
          }]
        });

        // Commit transaction (output + offset)
        await transaction.commit();

      } catch (error) {
        await transaction.abort();
        // Pause consumer to prevent reprocessing
        pause();
        setTimeout(() => consumer.resume([{ topic: 'input-events' }]), 5000);
      }
    }
  });
}

function transformData(input: any): any {
  // Your transformation logic
  return { ...input, processed: true, timestamp: Date.now() };
}

export { runPipeline };
```

### EOS Configuration Checklist

✅ **Producer**:
- `transactional: true`
- `transactionalId: 'unique-id'` (one per producer instance)
- `idempotent: true` (automatic with transactional)
- `acks: -1` (all replicas)
- `maxInFlightRequests: 1` (strict ordering)

✅ **Consumer**:
- `isolation: 'read_committed'`
- Commit offsets within transactions (for pipelines)

✅ **Broker** (Kafka 0.11+):
- `transaction.state.log.replication.factor=3` (minimum)
- `transaction.state.log.min.isr=2` (minimum)

---

## Security Configuration

### SASL/PLAIN Authentication

**File**: `src/config/sasl-plain.ts`

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'secure-client',
  brokers: ['kafka-1.example.com:9093'],
  ssl: true, // Encryption in transit
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!
  }
});

export { kafka };
```

**Environment Variables**:
```bash
# .env
KAFKA_USERNAME=kafka-user
KAFKA_PASSWORD=secure-password-here
KAFKA_BROKERS=kafka-1.example.com:9093,kafka-2.example.com:9093
```

### SASL/SCRAM-SHA-256 (Recommended)

**File**: `src/config/sasl-scram.ts`

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'scram-client',
  brokers: process.env.KAFKA_BROKERS!.split(','),
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256', // or 'scram-sha-512'
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!
  },
  connectionTimeout: 10000,
  requestTimeout: 30000
});

export { kafka };
```

### Mutual TLS (mTLS)

**File**: `src/config/mtls.ts`

```typescript
import { Kafka } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';

const kafka = new Kafka({
  clientId: 'mtls-client',
  brokers: ['kafka-1.example.com:9093'],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.join(__dirname, '../../certs/ca-cert.pem'), 'utf-8')],
    key: fs.readFileSync(path.join(__dirname, '../../certs/client-key.pem'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, '../../certs/client-cert.pem'), 'utf-8')
  }
});

export { kafka };
```

**Certificate Directory Structure**:
```
certs/
├── ca-cert.pem       # Certificate Authority
├── client-cert.pem   # Client certificate
└── client-key.pem    # Client private key
```

### Access Control Lists (ACLs)

**File**: `scripts/setup-acls.sh`

```bash
#!/bin/bash
# Setup ACLs for producer and consumer

# Producer ACLs
kafka-acls --bootstrap-server localhost:9092 \
  --add \
  --allow-principal User:payment-producer \
  --operation Write \
  --topic payments

kafka-acls --bootstrap-server localhost:9092 \
  --add \
  --allow-principal User:payment-producer \
  --operation Describe \
  --topic payments

# Consumer ACLs
kafka-acls --bootstrap-server localhost:9092 \
  --add \
  --allow-principal User:payment-consumer \
  --operation Read \
  --topic payments

kafka-acls --bootstrap-server localhost:9092 \
  --add \
  --allow-principal User:payment-consumer \
  --operation Read \
  --group payment-processing-group

# List all ACLs
kafka-acls --bootstrap-server localhost:9092 --list
```

### Secrets Management

**Using AWS Secrets Manager**:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Kafka } from 'kafkajs';

async function getKafkaCredentials() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'prod/kafka/credentials' })
  );

  return JSON.parse(response.SecretString!);
}

async function createSecureKafkaClient() {
  const credentials = await getKafkaCredentials();

  return new Kafka({
    clientId: 'secure-app',
    brokers: credentials.brokers,
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: credentials.username,
      password: credentials.password
    }
  });
}

export { createSecureKafkaClient };
```

---

## Multi-Cluster Management

Manage multiple Kafka clusters (dev, staging, prod) with unified interface.

### Cluster Configuration

**File**: `src/config/clusters.ts`

```typescript
interface ClusterConfig {
  name: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: {
    mechanism: string;
    username: string;
    password: string;
  };
}

const clusters: Record<string, ClusterConfig> = {
  dev: {
    name: 'dev',
    brokers: ['localhost:9092']
  },
  staging: {
    name: 'staging',
    brokers: ['kafka-staging.example.com:9093'],
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: process.env.STAGING_KAFKA_USER!,
      password: process.env.STAGING_KAFKA_PASSWORD!
    }
  },
  prod: {
    name: 'prod',
    brokers: [
      'kafka-1.prod.example.com:9093',
      'kafka-2.prod.example.com:9093',
      'kafka-3.prod.example.com:9093'
    ],
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-512',
      username: process.env.PROD_KAFKA_USER!,
      password: process.env.PROD_KAFKA_PASSWORD!
    }
  }
};

export { clusters, ClusterConfig };
```

### Multi-Cluster Client Factory

**File**: `src/kafka/cluster-factory.ts`

```typescript
import { Kafka } from 'kafkajs';
import { clusters, ClusterConfig } from '../config/clusters';

class KafkaClusterFactory {
  private clients: Map<string, Kafka> = new Map();

  getClient(environment: 'dev' | 'staging' | 'prod'): Kafka {
    if (this.clients.has(environment)) {
      return this.clients.get(environment)!;
    }

    const config = clusters[environment];
    const kafka = new Kafka({
      clientId: `app-${config.name}`,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl
    });

    this.clients.set(environment, kafka);
    return kafka;
  }

  async healthCheck(environment: 'dev' | 'staging' | 'prod'): Promise<boolean> {
    try {
      const kafka = this.getClient(environment);
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch (error) {
      console.error(`Health check failed for ${environment}:`, error);
      return false;
    }
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const env of ['dev', 'staging', 'prod'] as const) {
      results[env] = await this.healthCheck(env);
    }

    return results;
  }
}

export const clusterFactory = new KafkaClusterFactory();
```

### Usage Example

```typescript
import { clusterFactory } from './kafka/cluster-factory';

async function main() {
  // Use dev cluster
  const devKafka = clusterFactory.getClient('dev');
  const devProducer = devKafka.producer();
  await devProducer.connect();
  // ... use dev producer

  // Use prod cluster
  const prodKafka = clusterFactory.getClient('prod');
  const prodProducer = prodKafka.producer();
  await prodProducer.connect();
  // ... use prod producer

  // Health check all clusters
  const health = await clusterFactory.healthCheckAll();
  console.log('Cluster health:', health);
  // Output: { dev: true, staging: true, prod: true }
}
```

---

## Kafka Streams Applications

Build real-time stream processing pipelines with windowing, joins, and stateful transformations.

### Generate Kafka Streams App Scaffold

```bash
/specweave-kafka-streams:app-scaffold

# Generates:
# - src/streams/app.ts (main application)
# - src/streams/processors/ (custom processors)
# - docker-compose.yml (Kafka + RocksDB state store)
```

### Windowed Aggregations

**File**: `src/streams/windowed-aggregation.ts`

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'streams-app',
  brokers: ['localhost:9092']
});

interface PageView {
  userId: string;
  page: string;
  timestamp: number;
}

interface WindowedCount {
  userId: string;
  count: number;
  windowStart: number;
  windowEnd: number;
}

// Tumbling window: Non-overlapping fixed-size windows
async function tumblingWindowAggregation() {
  const consumer = kafka.consumer({ groupId: 'page-view-aggregator' });
  const producer = kafka.producer();

  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: 'page-views', fromBeginning: false });

  const WINDOW_SIZE_MS = 60000; // 1 minute
  const windows: Map<string, Map<number, number>> = new Map();

  await consumer.run({
    eachMessage: async ({ message }) => {
      const view: PageView = JSON.parse(message.value!.toString());

      // Calculate window start
      const windowStart = Math.floor(view.timestamp / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
      const windowEnd = windowStart + WINDOW_SIZE_MS;

      // Aggregate by userId + window
      const windowKey = `${view.userId}:${windowStart}`;

      if (!windows.has(view.userId)) {
        windows.set(view.userId, new Map());
      }

      const userWindows = windows.get(view.userId)!;
      const currentCount = userWindows.get(windowStart) || 0;
      userWindows.set(windowStart, currentCount + 1);

      // Emit windowed count
      const result: WindowedCount = {
        userId: view.userId,
        count: currentCount + 1,
        windowStart,
        windowEnd
      };

      await producer.send({
        topic: 'page-view-counts-1min',
        messages: [{
          key: windowKey,
          value: JSON.stringify(result)
        }]
      });
    }
  });
}

// Hopping window: Overlapping windows
async function hoppingWindowAggregation() {
  const WINDOW_SIZE_MS = 300000; // 5 minutes
  const HOP_SIZE_MS = 60000;     // 1 minute (advance every minute)

  // Implementation: Emit to multiple overlapping windows
  // Window 1: 00:00-00:05, Window 2: 00:01-00:06, etc.
}

// Session window: Dynamic windows based on inactivity gap
async function sessionWindowAggregation() {
  const INACTIVITY_GAP_MS = 300000; // 5 minutes

  const sessions: Map<string, { lastEvent: number; events: PageView[] }> = new Map();

  // Implementation: Create new session after inactivity gap
  // Close session when gap exceeded
}

export { tumblingWindowAggregation, hoppingWindowAggregation, sessionWindowAggregation };
```

### Stream Joins

**File**: `src/streams/joins.ts`

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'joins-app',
  brokers: ['localhost:9092']
});

interface Order {
  orderId: string;
  userId: string;
  amount: number;
  timestamp: number;
}

interface Payment {
  paymentId: string;
  orderId: string;
  status: 'success' | 'failed';
  timestamp: number;
}

interface EnrichedOrder {
  orderId: string;
  userId: string;
  amount: number;
  paymentStatus: string;
  orderTimestamp: number;
  paymentTimestamp: number;
}

// Inner join: Orders + Payments
async function innerJoin() {
  const ordersConsumer = kafka.consumer({ groupId: 'order-join-processor' });
  const paymentsConsumer = kafka.consumer({ groupId: 'payment-join-processor' });
  const producer = kafka.producer();

  await ordersConsumer.connect();
  await paymentsConsumer.connect();
  await producer.connect();

  const orders: Map<string, Order> = new Map();
  const payments: Map<string, Payment> = new Map();

  // Consume orders
  await ordersConsumer.subscribe({ topic: 'orders', fromBeginning: false });
  ordersConsumer.run({
    eachMessage: async ({ message }) => {
      const order: Order = JSON.parse(message.value!.toString());
      orders.set(order.orderId, order);

      // Check if payment exists
      if (payments.has(order.orderId)) {
        await emitJoinedRecord(order, payments.get(order.orderId)!, producer);
      }
    }
  });

  // Consume payments
  await paymentsConsumer.subscribe({ topic: 'payments', fromBeginning: false });
  paymentsConsumer.run({
    eachMessage: async ({ message }) => {
      const payment: Payment = JSON.parse(message.value!.toString());
      payments.set(payment.orderId, payment);

      // Check if order exists
      if (orders.has(payment.orderId)) {
        await emitJoinedRecord(orders.get(payment.orderId)!, payment, producer);
      }
    }
  });
}

async function emitJoinedRecord(order: Order, payment: Payment, producer: any) {
  const enriched: EnrichedOrder = {
    orderId: order.orderId,
    userId: order.userId,
    amount: order.amount,
    paymentStatus: payment.status,
    orderTimestamp: order.timestamp,
    paymentTimestamp: payment.timestamp
  };

  await producer.send({
    topic: 'enriched-orders',
    messages: [{
      key: order.orderId,
      value: JSON.stringify(enriched)
    }]
  });
}

export { innerJoin };
```

### Stateful Processing with RocksDB

**File**: `src/streams/stateful-processor.ts`

```typescript
import RocksDB from 'rocksdb';
import { Kafka } from 'kafkajs';

class StatefulProcessor {
  private db: any;
  private kafka: Kafka;

  constructor() {
    this.db = RocksDB('./state-store');
    this.kafka = new Kafka({
      clientId: 'stateful-app',
      brokers: ['localhost:9092']
    });
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.open((err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  async processUserActivity() {
    const consumer = this.kafka.consumer({ groupId: 'stateful-processor' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'user-activity', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const activity = JSON.parse(message.value!.toString());

        // Read current state
        const currentState = await this.getState(activity.userId);

        // Update state
        const newState = {
          userId: activity.userId,
          lastActivity: activity.timestamp,
          totalEvents: (currentState?.totalEvents || 0) + 1,
          events: [...(currentState?.events || []), activity]
        };

        // Persist state
        await this.setState(activity.userId, newState);
      }
    });
  }

  private getState(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(key, (err: any, value: string) => {
        if (err && err.notFound) resolve(null);
        else if (err) reject(err);
        else resolve(JSON.parse(value));
      });
    });
  }

  private setState(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.put(key, JSON.stringify(value), (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export { StatefulProcessor };
```

---

## OpenTelemetry Instrumentation

Distributed tracing for Kafka producers and consumers.

### Setup OpenTelemetry

**File**: `src/observability/tracing.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'kafka-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
  }),
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-kafkajs': {
        enabled: true,
        producerHook: (span, info) => {
          span.setAttribute('kafka.topic', info.topic);
          span.setAttribute('kafka.partition', info.partition);
        },
        consumerHook: (span, info) => {
          span.setAttribute('kafka.consumer.group', info.groupId);
        }
      }
    })
  ]
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export { sdk };
```

### Traced Producer

**File**: `src/observability/traced-producer.ts`

```typescript
import './tracing'; // Import first to enable auto-instrumentation
import { Kafka } from 'kafkajs';
import { trace, context, propagation } from '@opentelemetry/api';

const kafka = new Kafka({
  clientId: 'traced-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendTracedMessage(topic: string, message: any) {
  await producer.connect();

  const tracer = trace.getTracer('kafka-producer');

  return tracer.startActiveSpan('send-message', async (span) => {
    try {
      // Extract trace context
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      // Send message with trace headers
      const result = await producer.send({
        topic,
        messages: [{
          key: message.key,
          value: JSON.stringify(message.value),
          headers: {
            // Inject trace context into message headers
            traceparent: carrier.traceparent || '',
            tracestate: carrier.tracestate || ''
          }
        }]
      });

      span.setAttributes({
        'kafka.topic': topic,
        'kafka.partition': result[0].partition,
        'kafka.offset': result[0].baseOffset,
        'message.key': message.key
      });

      span.setStatus({ code: 1 }); // OK
      return result;

    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}

export { sendTracedMessage, producer };
```

### Traced Consumer

**File**: `src/observability/traced-consumer.ts`

```typescript
import './tracing';
import { Kafka } from 'kafkajs';
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';

const kafka = new Kafka({
  clientId: 'traced-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'traced-consumer-group' });

async function consumeTracedMessages(topic: string) {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const tracer = trace.getTracer('kafka-consumer');

      // Extract trace context from message headers
      const carrier: Record<string, string> = {};
      if (message.headers) {
        Object.entries(message.headers).forEach(([key, value]) => {
          if (value) carrier[key] = value.toString();
        });
      }

      // Continue trace from producer
      const extractedContext = propagation.extract(context.active(), carrier);

      return context.with(extractedContext, () => {
        return tracer.startActiveSpan('process-message', async (span) => {
          try {
            span.setAttributes({
              'kafka.topic': topic,
              'kafka.partition': partition,
              'kafka.offset': message.offset,
              'kafka.key': message.key?.toString() || '',
              'kafka.consumer.group': 'traced-consumer-group'
            });

            // Process message
            const data = JSON.parse(message.value!.toString());
            await processMessage(data);

            span.setStatus({ code: SpanStatusCode.OK });

          } catch (error: any) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
          } finally {
            span.end();
          }
        });
      });
    }
  });
}

async function processMessage(data: any) {
  const tracer = trace.getTracer('business-logic');

  return tracer.startActiveSpan('process-business-logic', async (span) => {
    // Your business logic here
    console.log('Processing:', data);

    // Span will automatically be linked to parent (consume-message span)
    span.setAttribute('business.operation', 'data-processing');
    span.end();
  });
}

export { consumeTracedMessages };
```

### Jaeger UI Access

```bash
# Start Jaeger (included in monitoring stack)
/specweave-kafka:monitor-setup

# Access Jaeger UI
open http://localhost:16686

# Search for traces by:
# - Service: kafka-app
# - Operation: send-message, process-message
# - Tags: kafka.topic, kafka.consumer.group
```

**Trace Visualization**:
```
Producer Span (send-message)
  ↓ [traceparent header propagation]
Consumer Span (process-message)
  ↓
Business Logic Span (process-business-logic)
```

---

## Performance Optimization

### Producer Configuration

```typescript
const producer = kafka.producer({
  // Batching
  compression: 'gzip', // or 'snappy', 'lz4', 'zstd'
  maxInFlightRequests: 5,

  // Throughput
  linger: { ms: 10 }, // Wait up to 10ms to batch messages
  batch: {
    size: 16384, // 16KB batch size
  },

  // Reliability
  acks: -1, // Wait for all replicas
  retries: 5,
  timeout: 30000
});
```

### Consumer Configuration

```typescript
const consumer = kafka.consumer({
  groupId: 'optimized-consumer',

  // Fetching
  maxWaitTimeInMs: 100,
  minBytes: 1,
  maxBytes: 10485760, // 10MB

  // Parallelism
  partitionsConsumedConcurrently: 3,

  // Offset management
  autoCommit: false, // Manual offset management
  autoCommitInterval: 5000,

  // Session
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});
```

### Manual Offset Management

```typescript
await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    for (const message of batch.messages) {
      await processMessage(message);

      // Commit offset after successful processing
      await resolveOffset(message.offset);

      // Send heartbeat to prevent rebalance
      await heartbeat();
    }
  }
});
```

---

## High Availability Patterns

### Circuit Breaker

```typescript
class KafkaCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 60000; // 1 minute
  private readonly HALF_OPEN_ATTEMPTS = 3;

  async send(producer: any, message: any) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.TIMEOUT_MS) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await producer.send(message);

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;

    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.FAILURE_THRESHOLD) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }
}
```

### Retry with Exponential Backoff

```typescript
async function sendWithRetry(producer: any, message: any, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await producer.send(message);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Next Steps

**Explore Related Guides**:
- [Terraform Deployment Guide](kafka-terraform.md) - Production infrastructure
- [Troubleshooting Guide](kafka-troubleshooting.md) - Common issues
- [Getting Started Guide](kafka-getting-started.md) - Basic setup

**Learn More**:
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [OpenTelemetry Kafka Instrumentation](https://opentelemetry.io/docs/instrumentation/js/libraries/kafkajs/)

**Join the Community**:
- [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
- [Report Issues](https://github.com/anton-abyzov/specweave/issues)

---

**Last Updated**: 2025-11-15
