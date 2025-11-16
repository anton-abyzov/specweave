# Kafka Examples

**Working code examples for SpecWeave Kafka plugins**

This directory contains 5 complete, runnable examples demonstrating Kafka best practices.

## Quick Start

Each example is self-contained with its own README, dependencies, and Docker Compose file.

```bash
cd simple-producer-consumer
npm install
npm start
```

## Examples

### 1. [Simple Producer-Consumer](./simple-producer-consumer/)

**Basic Kafka operations**

- ✅ Connect to Kafka
- ✅ Produce JSON messages
- ✅ Consume with consumer groups
- ✅ Local Kafka cluster (Docker Compose)

**Difficulty**: Beginner
**Time**: 15 minutes

### 2. [Avro Schema Registry](./avro-schema-registry/)

**Schema-based serialization**

- ✅ Register Avro schemas
- ✅ Schema evolution (backward compatible)
- ✅ Binary serialization (smaller than JSON)
- ✅ Message validation

**Difficulty**: Intermediate
**Time**: 20 minutes

### 3. [Exactly-Once Semantics](./exactly-once-semantics/)

**Zero message duplication or loss**

- ✅ Transactional producers
- ✅ Read-committed consumers
- ✅ Atomic offset commits
- ✅ End-to-end exactly-once pipeline

**Difficulty**: Advanced
**Time**: 30 minutes

### 4. [Kafka Streams Application](./kafka-streams-app/)

**Real-time stream processing**

- ✅ Windowed aggregations (tumbling windows)
- ✅ Stateful processing
- ✅ Event-time processing
- ✅ RocksDB state store

**Difficulty**: Advanced
**Time**: 45 minutes

### 5. [n8n Workflow Integration](./n8n-workflow/)

**No-code event-driven automation**

- ✅ Kafka trigger workflows
- ✅ Event filtering and routing
- ✅ Multi-sink integration (Slack, DB, email)
- ✅ Visual workflow builder

**Difficulty**: Beginner
**Time**: 20 minutes

## Learning Path

### Beginner
1. Start with **simple-producer-consumer** to understand basics
2. Try **n8n-workflow** for no-code integration

### Intermediate
3. Learn schema management with **avro-schema-registry**
4. Explore windowed aggregations in **kafka-streams-app**

### Advanced
5. Master reliability with **exactly-once-semantics**

## Prerequisites

All examples require:
- **Node.js 18+** (`node --version`)
- **Docker Desktop** (for local Kafka cluster)
- **npm** (`npm --version`)

Optional (for specific examples):
- **Schema Registry** (avro-schema-registry example)
- **n8n** (n8n-workflow example)

## Quick Start Local Kafka

Each example includes a `docker-compose.yml` for local Kafka:

```bash
# Start Kafka
docker-compose up -d

# Wait for cluster (~30 seconds)
docker logs kafka-broker -f

# Stop Kafka
docker-compose down
```

## Common Issues

### Port 9092 Already in Use

```bash
# Find process using port 9092
lsof -i :9092

# Kill the process
kill -9 <PID>
```

### Kafka Container Won't Start

```bash
# Check Docker resources
docker system df

# Increase Docker memory to 8GB
# Docker Desktop → Preferences → Resources → Memory
```

### Consumer Not Receiving Messages

```bash
# Check topic exists
kafka-topics --bootstrap-server localhost:9092 --list

# Reset consumer group offsets
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group my-group \
  --topic my-topic \
  --reset-offsets --to-earliest \
  --execute
```

## Running Tests

Some examples include tests:

```bash
cd simple-producer-consumer
npm test
```

## Production Deployment

These examples are for learning. For production:

1. **Security**: Enable SASL/SSL authentication
2. **Monitoring**: Add Prometheus + Grafana
3. **Reliability**: Use 3+ brokers with replication
4. **Performance**: Tune batching, compression, partitions
5. **Deployment**: Use Terraform modules (see `../terraform/`)

## Documentation

- **Getting Started**: [kafka-getting-started.md](../.specweave/docs/public/guides/kafka-getting-started.md)
- **Advanced Usage**: [kafka-advanced-usage.md](../.specweave/docs/public/guides/kafka-advanced-usage.md)
- **Terraform Guide**: [kafka-terraform.md](../.specweave/docs/public/guides/kafka-terraform.md)
- **Troubleshooting**: [kafka-troubleshooting.md](../.specweave/docs/public/guides/kafka-troubleshooting.md)

## Contributing

Found a bug or want to add an example? See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Support

- **GitHub Issues**: [Report a problem](https://github.com/anton-abyzov/specweave/issues)
- **Discussions**: [Ask questions](https://github.com/anton-abyzov/specweave/discussions)

---

**Last Updated**: 2025-11-15
