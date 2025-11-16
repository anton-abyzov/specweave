# Getting Started with SpecWeave Kafka

**Get your first Kafka cluster running in under 15 minutes**

This guide will walk you through installing the SpecWeave Kafka plugin suite, starting a local Kafka cluster, and producing/consuming your first messages.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed (`node --version`)
- **Docker Desktop** running (`docker ps`)
- **SpecWeave CLI** installed (`npm install -g @specweave/cli`)
- **Claude Code** (latest version)

## Step 1: Initialize SpecWeave (2 minutes)

```bash
# Create a new project directory
mkdir my-kafka-project
cd my-kafka-project

# Initialize SpecWeave
specweave init

# Select your AI coding tool
# → Choose "Claude Code" (recommended)

# Plugins are automatically installed during init
```

**What happens during init:**
- ✅ Creates `.specweave/` directory structure
- ✅ Installs all 4 Kafka plugins (kafka, confluent, kafka-streams, n8n)
- ✅ Registers skills and agents
- ✅ Configures default templates

## Step 2: Start Local Kafka Cluster (3 minutes)

```bash
# Start Kafka with Docker Compose
/specweave-kafka:dev-env start

# Wait for cluster to be ready (~60 seconds)
# ✓ Kafka broker (KRaft mode) on port 9092
# ✓ Schema Registry on port 8081
# ✓ Kafka UI on port 8080
```

**Verify the cluster is running:**

```bash
# Check Docker containers
docker ps | grep kafka

# Expected output:
# kafka-broker
# schema-registry
# kafka-ui
```

**Access Kafka UI:**
- Open browser: http://localhost:8080
- You should see your cluster with 0 topics

## Step 3: Configure MCP Server (2 minutes)

The MCP (Model Context Protocol) server enables AI-powered Kafka operations.

```bash
# Auto-detect and configure MCP server
/specweave-kafka:mcp-configure

# The command will:
# 1. Detect available MCP servers (kanapuli, tuannvm, etc.)
# 2. Generate .mcp.json configuration
# 3. Test connection to localhost:9092
```

**If you don't have an MCP server:**
```bash
# Install kanapuli MCP server (simplest option)
npm install -g @kanapuli/mcp-kafka

# Or use tuannvm (more features)
go install github.com/tuannvm/kafka-mcp-server@latest
```

## Step 4: Produce Your First Message (2 minutes)

### Option A: Using kcat (Command Line)

```bash
# Install kcat if not already installed
# macOS: brew install kcat
# Linux: sudo apt-get install kafkacat

# Produce a message
echo '{"user": "alice", "action": "login", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' | \
  kcat -P -b localhost:9092 -t user-events

# Verify message was sent
kcat -C -b localhost:9092 -t user-events -c 1 -o beginning
```

### Option B: Using Node.js Code

Create `producer.js`:

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-first-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendMessage() {
  await producer.connect();

  const result = await producer.send({
    topic: 'user-events',
    messages: [
      {
        key: 'user-alice',
        value: JSON.stringify({
          user: 'alice',
          action: 'login',
          timestamp: new Date().toISOString()
        })
      }
    ]
  });

  console.log('Message sent:', result);

  await producer.disconnect();
}

sendMessage().catch(console.error);
```

Run it:
```bash
npm install kafkajs
node producer.js
```

## Step 5: Consume Messages (2 minutes)

Create `consumer.js`:

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-first-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'my-consumer-group' });

async function consumeMessages() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString(),
        value: message.value?.toString(),
      });
    },
  });
}

consumeMessages().catch(console.error);
```

Run it:
```bash
node consumer.js

# Expected output:
# {
#   topic: 'user-events',
#   partition: 0,
#   offset: '0',
#   key: 'user-alice',
#   value: '{"user":"alice","action":"login",...}'
# }
```

## Step 6: Setup Monitoring (4 minutes)

```bash
# Deploy Prometheus + Grafana stack
/specweave-kafka:monitor-setup

# This deploys:
# - Prometheus with JMX Exporter
# - Grafana with 5 pre-built dashboards
# - 14 alerting rules

# Wait for deployment to complete (~2 minutes)
```

**Access dashboards:**
- **Grafana**: http://localhost:3000 (default: admin/admin)
- **Prometheus**: http://localhost:9090

**Pre-built dashboards:**
1. **Kafka Overview** - Cluster-wide metrics
2. **Consumer Lag** - Per-group lag tracking
3. **Broker Health** - CPU, memory, disk, network
4. **Topic Metrics** - Per-topic throughput
5. **Producer/Consumer Metrics** - Client-level stats

## Verification Checklist

At this point, you should have:

- ✅ Kafka cluster running locally
- ✅ MCP server configured
- ✅ Messages produced and consumed
- ✅ Monitoring stack deployed
- ✅ Grafana dashboards accessible

## Next Steps

### Learn Advanced Features

**Exactly-Once Semantics:**
```javascript
// See: .specweave/docs/public/guides/kafka-advanced-usage.md
const producer = kafka.producer({
  transactional: true,
  transactionalId: 'my-transaction-id'
});
```

**Schema Registry (Avro):**
```javascript
// Register schema and serialize messages
// See: examples/avro-schema-registry/
```

**Kafka Streams:**
```bash
# Generate Kafka Streams app
/specweave-kafka-streams:app-scaffold

# See: .specweave/docs/public/guides/kafka-streams.md
```

### Deploy to Production

**AWS MSK:**
```bash
/specweave-kafka:deploy aws-msk

# See: .specweave/docs/public/guides/kafka-terraform.md
```

**Confluent Cloud:**
```bash
/specweave-confluent:cluster-create

# See: plugins/specweave-confluent/README.md
```

### Explore Examples

```bash
# Working code examples
ls examples/

# - simple-producer-consumer/
# - avro-schema-registry/
# - exactly-once-semantics/
# - kafka-streams-app/
# - n8n-workflow/
```

## Common First-Time Issues

### Kafka Won't Start

**Problem:** Docker containers exit immediately

**Solution:**
```bash
# Check port 9092 is available
lsof -i :9092

# If occupied, kill the process or change port in docker-compose.yml
docker-compose -f plugins/specweave-kafka/templates/docker/kafka-kraft/docker-compose.yml down

# Restart
/specweave-kafka:dev-env start
```

### MCP Server Connection Failed

**Problem:** Cannot connect to MCP server

**Solution:**
```bash
# Check if MCP server is installed
which kcat

# If not installed:
brew install kcat  # macOS
sudo apt-get install kafkacat  # Linux

# Reconfigure
/specweave-kafka:mcp-configure
```

### Consumer Not Receiving Messages

**Problem:** Consumer runs but no messages appear

**Solution:**
```bash
# Check topic exists and has messages
kcat -L -b localhost:9092

# Verify messages in topic
kcat -C -b localhost:9092 -t user-events -c 10 -o beginning

# Check consumer group
kcat -b localhost:9092 -G my-consumer-group user-events
```

### Grafana Dashboards Not Loading

**Problem:** Grafana shows no data

**Solution:**
```bash
# Check Prometheus is scraping Kafka metrics
curl localhost:9090/api/v1/targets

# Restart monitoring stack
/specweave-kafka:monitor-setup --restart

# Verify JMX Exporter port (7071)
curl localhost:7071/metrics
```

## Learning Resources

### Documentation
- **[Advanced Usage Guide](kafka-advanced-usage.md)** - EOS, security, multi-cluster
- **[Terraform Guide](kafka-terraform.md)** - Production deployments
- **[Troubleshooting Guide](kafka-troubleshooting.md)** - Common issues

### Skills (Ask Claude Code)
- "How do I configure SASL authentication?" → `kafka-architecture` skill
- "Show me kcat examples" → `kafka-cli-tools` skill
- "Deploy Kafka to AWS" → `kafka-iac-deployment` skill
- "Setup monitoring" → `kafka-observability` skill

### Commands
- `/specweave-kafka:deploy` - Deploy to cloud
- `/specweave-kafka:monitor-setup` - Setup monitoring
- `/specweave-kafka:dev-env` - Local development
- `/specweave-confluent:cluster-create` - Confluent Cloud

### Examples
```bash
# Browse working examples
cd examples/

# Run example
cd simple-producer-consumer
npm install
npm start
```

## Quick Reference

### Start/Stop Local Cluster

```bash
# Start
/specweave-kafka:dev-env start

# Stop
/specweave-kafka:dev-env stop

# Reset (deletes all data)
/specweave-kafka:dev-env reset

# View logs
/specweave-kafka:dev-env logs
```

### Produce/Consume with kcat

```bash
# Produce (interactive)
kcat -P -b localhost:9092 -t my-topic
> message 1
> message 2
> ^D

# Consume (from beginning)
kcat -C -b localhost:9092 -t my-topic -o beginning

# Consume (tail)
kcat -C -b localhost:9092 -t my-topic -o end
```

### Topic Management

```bash
# List topics
kcat -L -b localhost:9092

# Create topic (via Kafka UI)
# → http://localhost:8080

# Delete topic (via CLI)
kafka-topics --bootstrap-server localhost:9092 --delete --topic my-topic
```

### Monitor Consumer Lag

```bash
# Via kcat
kcat -b localhost:9092 -C -G my-group my-topic

# Via Grafana
# → http://localhost:3000
# → Consumer Lag dashboard
```

## Congratulations! 🎉

You've successfully:
- ✅ Set up a local Kafka cluster
- ✅ Configured MCP server integration
- ✅ Produced and consumed messages
- ✅ Deployed monitoring stack
- ✅ Accessed Grafana dashboards

**Total time:** Under 15 minutes

**Ready for production?** See the [Terraform Guide](kafka-terraform.md) to deploy to AWS, Azure, or Confluent Cloud.

**Need help?** Check the [Troubleshooting Guide](kafka-troubleshooting.md) or ask in [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions).

---

**Next:** [Advanced Usage Guide →](kafka-advanced-usage.md)
