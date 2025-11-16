---
name: specweave-kafka:dev-env
description: Set up local Kafka development environment using Docker Compose. Includes Kafka (KRaft mode), Schema Registry, Kafka UI, Prometheus, and Grafana.
---

# Set Up Local Kafka Dev Environment

Spin up a complete local Kafka development environment with one command.

## What This Command Does

1. **Docker Compose Selection**: Choose Kafka or Redpanda
2. **Service Configuration**: Kafka + Schema Registry + UI + Monitoring
3. **Environment Setup**: Generate docker-compose.yml
4. **Start Services**: `docker-compose up -d`
5. **Verification**: Test cluster and provide connection details

## Two Options Available

### Option 1: Apache Kafka (KRaft Mode)
**Services**:
- ✅ Kafka broker (KRaft mode, no ZooKeeper)
- ✅ Schema Registry (Avro schemas)
- ✅ Kafka UI (web interface, port 8080)
- ✅ Prometheus (metrics, port 9090)
- ✅ Grafana (dashboards, port 3000)

**Use When**: Testing Apache Kafka specifically, need Schema Registry

### Option 2: Redpanda (3-Node Cluster)
**Services**:
- ✅ Redpanda (3 brokers, Kafka-compatible)
- ✅ Redpanda Console (web UI, port 8080)
- ✅ Prometheus (metrics, port 9090)
- ✅ Grafana (dashboards, port 3000)

**Use When**: Testing high-performance alternative, need multi-broker cluster locally

## Example Usage

```bash
# Start dev environment setup
/specweave-kafka:dev-env

# I'll ask:
# 1. Which stack? (Kafka or Redpanda)
# 2. Where to create files? (current directory or specify path)
# 3. Custom ports? (use defaults or customize)

# Then I'll:
# - Generate docker-compose.yml
# - Start all services
# - Wait for health checks
# - Provide connection details
# - Open Kafka UI in browser
```

## What Gets Created

**Directory Structure**:
```
./kafka-dev/
├── docker-compose.yml       # Main compose file
├── .env                      # Environment variables
├── data/                     # Persistent volumes
│   ├── kafka/
│   ├── prometheus/
│   └── grafana/
└── config/
    ├── prometheus.yml       # Prometheus config
    └── grafana/             # Dashboard provisioning
```

**Services Running**:
- Kafka: localhost:9092 (plaintext) or localhost:9093 (SASL_SSL)
- Schema Registry: localhost:8081
- Kafka UI: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

## Connection Examples

**After setup, connect with**:

### Producer (Node.js):
```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'test-topic',
  messages: [{ value: 'Hello Kafka!' }]
});
```

### Consumer (Python):
```python
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'test-topic',
    bootstrap_servers=['localhost:9092'],
    group_id='my-group',
    auto_offset_reset='earliest'
)

for message in consumer:
    print(f"Received: {message.value}")
```

### kcat (CLI):
```bash
# Produce message
echo "Hello Kafka" | kcat -P -b localhost:9092 -t test-topic

# Consume messages
kcat -C -b localhost:9092 -t test-topic -o beginning
```

## Sample Producer/Consumer

I'll also create sample code templates:
- `producer-nodejs.js` - Production-ready Node.js producer
- `consumer-nodejs.js` - Production-ready Node.js consumer
- `producer-python.py` - Python producer with error handling
- `consumer-python.py` - Python consumer with DLQ

## Prerequisites

- Docker 20+ installed
- Docker Compose v2+
- 4GB+ free RAM (for Redpanda 3-node cluster)
- Ports available: 8080, 8081, 9090, 9092, 9093, 3000

## Post-Setup

After environment starts, I'll:
1. ✅ Open Kafka UI in browser (http://localhost:8080)
2. ✅ Create a test topic via UI
3. ✅ Show producer/consumer examples
4. ✅ Provide kcat commands for testing
5. ✅ Show Grafana dashboards (http://localhost:3000)

## Useful Commands

```bash
# Start environment
docker-compose up -d

# Stop environment
docker-compose down

# Stop and remove data
docker-compose down -v

# View logs
docker-compose logs -f kafka

# Restart Kafka only
docker-compose restart kafka

# Check health
docker-compose ps
```

---

**Skills Activated**: kafka-cli-tools
**Docker Compose Location**: `plugins/specweave-kafka/docker/`
**Sample Code**: `plugins/specweave-kafka/docker/templates/`
