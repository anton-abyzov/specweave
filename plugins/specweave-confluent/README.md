# specweave-confluent

**Confluent Cloud Integration Plugin for SpecWeave**

Enterprise Kafka features including Schema Registry, ksqlDB stream processing, Cluster Linking, and Confluent Cloud architecture patterns.

## Features

### 🚀 Core Capabilities

- **Schema Registry**: Avro, Protobuf, JSON Schema management with compatibility modes
- **ksqlDB**: SQL-like stream processing with real-time queries and materialized views
- **Confluent Cloud**: eCKU sizing, multi-region architecture, cluster linking
- **Stream Governance**: Schema validation, data quality, lineage tracking
- **Enterprise Features**: Cluster Linking, Tiered Storage, Private Networking

### 📚 Skills (2)

**Organized for Enterprise Kafka**:

- `confluent-schema-registry` - Schema management, evolution strategies, Avro/Protobuf/JSON Schema, compatibility modes
- `confluent-ksqldb` - Stream processing with SQL, joins, aggregations, windowing, materialized views

### 🤖 Agents (1)

- `confluent-architect` - eCKU sizing, cluster linking, multi-region strategies, cost optimization

### ⚡ Commands (0)

*Commands coming in future releases*

## Installation

### Prerequisites

- Node.js 18+
- Confluent Cloud account (or self-hosted Confluent Platform)
- Schema Registry credentials
- ksqlDB cluster (optional)

### Install Plugin

```bash
# Via SpecWeave marketplace
specweave plugin install specweave-confluent

# Or via Claude Code plugin system
/plugin install specweave-confluent
```

## Quick Start

### 1. Schema Registry - Register Avro Schema

```javascript
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const registry = new SchemaRegistry({
  host: 'https://schema-registry.us-east-1.aws.confluent.cloud',
  auth: {
    username: process.env.SR_API_KEY,
    password: process.env.SR_API_SECRET
  }
});

// Define Avro schema
const schema = `
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": ["null", "string"], "default": null}
  ]
}
`;

// Register schema
const { id } = await registry.register({
  type: SchemaType.AVRO,
  schema
});

console.log(`Schema registered with ID: ${id}`);

// Encode message
const payload = await registry.encode(id, {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
});

// Send to Kafka
await producer.send({
  topic: 'users',
  messages: [{ value: payload }]
});
```

### 2. ksqlDB - Real-Time Stream Processing

```sql
-- Create stream from Kafka topic
CREATE STREAM clicks_stream (
  user_id BIGINT,
  page VARCHAR,
  timestamp TIMESTAMP
) WITH (
  kafka_topic='clicks',
  value_format='AVRO'
);

-- Filter important events
CREATE STREAM checkout_clicks AS
SELECT user_id, page, timestamp
FROM clicks_stream
WHERE page = 'checkout'
EMIT CHANGES;

-- Real-time aggregation (5-minute tumbling window)
CREATE TABLE user_clicks_per_5min AS
SELECT
  user_id,
  WINDOWSTART AS window_start,
  COUNT(*) AS click_count
FROM clicks_stream
WINDOW TUMBLING (SIZE 5 MINUTES)
GROUP BY user_id
EMIT CHANGES;

-- Query current window
SELECT * FROM user_clicks_per_5min
WHERE user_id = 123;
```

### 3. Confluent Cloud - Cluster Sizing

Ask the `confluent-architect` agent:

```
Me: "I need 50K msg/sec, 7-day retention. How many eCKUs?"

Confluent Architect:
- Throughput: 50K msg/sec × 1KB = 50 MB/sec
- eCKU calculation: 50 MB/sec / 30 MB/sec per CKU = 2 CKUs
- Recommended: 4 CKUs (100% headroom for bursts)
- Cost: 4 CKUs × $0.11/hour × 730 hours = $321/month
- Cluster type: Standard (99.95% SLA)
```

## Architecture

### Schema Registry Integration

**Producer with Avro**:
```javascript
const { Kafka } = require('kafkajs');
const { SchemaRegistry, SchemaType } = require('@kafkajs/confluent-schema-registry');

const kafka = new Kafka({
  clientId: 'my-producer',
  brokers: ['pkc-xxx.us-east-1.aws.confluent.cloud:9092'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET
  }
});

const registry = new SchemaRegistry({
  host: 'https://psrc-xxx.us-east-1.aws.confluent.cloud',
  auth: {
    username: process.env.SR_API_KEY,
    password: process.env.SR_API_SECRET
  }
});

const producer = kafka.producer();
await producer.connect();

// Encode with schema
const payload = await registry.encode(schemaId, { id: 1, name: 'John' });

await producer.send({
  topic: 'users',
  messages: [{ value: payload }]
});
```

**Consumer with Avro**:
```javascript
const consumer = kafka.consumer({ groupId: 'user-processor' });
await consumer.subscribe({ topic: 'users' });

await consumer.run({
  eachMessage: async ({ message }) => {
    // Decode automatically (schema ID in header)
    const user = await registry.decode(message.value);
    console.log(user); // { id: 1, name: 'John' }
  }
});
```

### ksqlDB Deployment Patterns

**Confluent Cloud**:
- Managed ksqlDB clusters (CSUs - Confluent Streaming Units)
- 1 CSU = 1 vCPU + 4GB RAM
- Auto-scaling based on query load
- 99.95% SLA

**Self-Hosted**:
- Deploy on Kubernetes (Helm chart)
- 3+ nodes for HA (multi-AZ)
- Persistent query state in RocksDB
- Standby replicas for failover

### Cluster Linking Topology

**Active-Passive (DR)**:
```
┌─────────────────┐           ┌─────────────────┐
│  Primary        │           │  Secondary      │
│  us-east-1      │  ──────>  │  us-west-2      │
│  (4 CKUs)       │  Linking  │  (2 CKUs)       │
└─────────────────┘           └─────────────────┘
```

**Active-Active (Multi-Region)**:
```
┌─────────────────┐  <──────>  ┌─────────────────┐
│  US Cluster     │  Linking   │  EU Cluster     │
│  us-east-1      │  (Bi-Dir)  │  eu-west-1      │
│  (6 CKUs)       │            │  (6 CKUs)       │
└─────────────────┘            └─────────────────┘
```

## Usage Examples

### Schema Evolution - Add Optional Field

```javascript
// V1 schema
const schemaV1 = `
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "name", "type": "string"}
  ]
}
`;

// V2 schema - BACKWARD compatible (added optional field)
const schemaV2 = `
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": ["null", "string"], "default": null}
  ]
}
`;

// Test compatibility BEFORE registering
const compatible = await registry.checkCompatibility({
  schema: schemaV2,
  subject: 'users-value'
});

if (compatible) {
  await registry.register({ schema: schemaV2 });
}
```

### ksqlDB - Enrich Events with Stream-Table Join

```sql
-- Create users table (current state)
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY,
  name VARCHAR,
  email VARCHAR
) WITH (
  kafka_topic='users',
  value_format='AVRO'
);

-- Enrich click events with user data
CREATE STREAM enriched_clicks AS
SELECT
  c.user_id,
  c.page,
  c.timestamp,
  u.name,
  u.email
FROM clicks_stream c
LEFT JOIN users u ON c.user_id = u.user_id
EMIT CHANGES;
```

### Confluent Cloud - eCKU Sizing Calculator

```
Inputs:
- Throughput: 100K msg/sec × 1KB avg = 100 MB/sec
- Peak factor: 2.0x (200 MB/sec peak)
- Retention: 7 days
- Partitions: 20 topics × 24 partitions = 480 total

eCKU Calculation:
- Write throughput: 200 MB/sec / 30 MB/sec per CKU = 6.67 CKUs
- Recommended: 8 CKUs (rounded up)
- Partition validation: 480 partitions / 8 CKUs = 60 partitions/CKU (OK, <1500 limit)

Cost:
- 8 CKUs × $0.11/hour × 730 hours = $642/month
- Storage: Included (800 GB total)

Alternative (Dedicated):
- 2 dedicated CKUs (higher performance)
- Cost: $2,190/month
- Use when: >10 CKUs OR >1000 partitions OR <5ms latency required
```

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires Confluent Cloud credentials)
npm run test:integration

# E2E tests (requires ksqlDB cluster)
npm run test:e2e
```

## Documentation

- **Schema Registry Guide**: `.specweave/docs/public/guides/confluent-schema-registry.md`
- **ksqlDB Tutorial**: `.specweave/docs/public/guides/confluent-ksqldb.md`
- **Cluster Linking**: `.specweave/docs/public/guides/confluent-cluster-linking.md`
- **Cost Optimization**: `.specweave/docs/public/guides/confluent-cost-optimization.md`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Related Plugins

- **specweave-kafka** - Core Kafka plugin (Apache Kafka, AWS MSK, Azure Event Hubs)
- **specweave-kafka-streams** - Kafka Streams library and patterns
- **specweave-n8n** - n8n workflow automation with Kafka/Confluent integration

## License

MIT License - see [LICENSE](../../LICENSE)

## Support

- **Documentation**: https://spec-weave.com/docs/plugins/confluent
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Status**: ✅ Production Ready
