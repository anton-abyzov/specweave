# Kafka Troubleshooting Guide

**Comprehensive solutions for common Kafka issues**

This guide helps you diagnose and fix problems with Kafka clusters, producers, consumers, and infrastructure.

## Table of Contents

1. [MCP Server Issues](#mcp-server-issues)
2. [Terraform Deployment Failures](#terraform-deployment-failures)
3. [Authentication Errors](#authentication-errors)
4. [Performance Problems](#performance-problems)
5. [Docker Compose Issues](#docker-compose-issues)
6. [Producer Failures](#producer-failures)
7. [Consumer Problems](#consumer-problems)
8. [Network Connectivity](#network-connectivity)
9. [Broker Failures](#broker-failures)
10. [Schema Registry Issues](#schema-registry-issues)

---

## MCP Server Issues

### Problem: MCP Server Connection Failed

**Error**:
```
Error: Cannot connect to MCP server at localhost:9092
Connection refused
```

**Diagnosis**:
```bash
# Check if Kafka is running
docker ps | grep kafka

# Check if port 9092 is listening
lsof -i :9092

# Test connection
nc -zv localhost 9092
```

**Solution 1: Kafka Not Running**

```bash
# Start Kafka cluster
/specweave-kafka:dev-env start

# Wait for cluster to be ready (~60 seconds)
docker logs kafka-broker -f

# Look for: "Kafka Server started"
```

**Solution 2: Wrong MCP Server**

```bash
# Check which MCP servers are installed
npm list -g | grep mcp

# Install kanapuli (simplest option)
npm install -g @kanapuli/mcp-kafka

# Or install tuannvm (more features)
go install github.com/tuannvm/kafka-mcp-server@latest

# Reconfigure MCP
/specweave-kafka:mcp-configure
```

**Solution 3: Firewall Blocking Port**

```bash
# macOS: Allow port in firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/kafka

# Linux: Allow port in iptables
sudo iptables -A INPUT -p tcp --dport 9092 -j ACCEPT

# Windows: Add firewall rule
netsh advfirewall firewall add rule name="Kafka" dir=in action=allow protocol=TCP localport=9092
```

---

## Terraform Deployment Failures

### Problem: State Lock Error

**Error**:
```
Error: Error acquiring the state lock
Lock Info:
  ID:        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Operation: OperationTypeApply
  Who:       user@hostname
```

**Solution**:

```bash
# Option 1: Wait for lock to expire (if colleague is working)
# Check with team first!

# Option 2: Force unlock (use with caution)
terraform force-unlock xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Option 3: Remove lock from DynamoDB (AWS)
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "my-state-file/terraform.tfstate-md5"}}'
```

### Problem: Provider Authentication Failed

**Error**:
```
Error: error configuring Terraform AWS Provider: error validating provider credentials
```

**Diagnosis**:

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Azure credentials
az account show

# Check Confluent credentials
confluent environment list
```

**Solution**:

```bash
# AWS: Configure credentials
aws configure
# Or use environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Azure: Login
az login

# Confluent: Login
confluent login --save
export CONFLUENT_CLOUD_API_KEY="your-api-key"
export CONFLUENT_CLOUD_API_SECRET="your-secret"
```

### Problem: Module Not Found

**Error**:
```
Error: Module not installed
Module "vpc" is not available in the module registry
```

**Solution**:

```bash
# Reinitialize Terraform
terraform init -upgrade

# If using local modules, check path
ls -la modules/vpc

# Download modules
terraform get

# Clear cache and reinit
rm -rf .terraform
terraform init
```

### Problem: Resource Already Exists

**Error**:
```
Error: A resource with the ID "production-kafka-cluster" already exists
```

**Solution**:

```bash
# Option 1: Import existing resource
terraform import aws_msk_cluster.main arn:aws:kafka:us-east-1:123456789012:cluster/production-kafka/...

# Option 2: Remove from state (if shouldn't be managed)
terraform state rm aws_msk_cluster.main

# Option 3: Rename resource in code
resource "aws_msk_cluster" "main_v2" {
  # ...
}
```

---

## Authentication Errors

### Problem: SASL Authentication Failed

**Error**:
```
KafkaJSConnectionError: Connection refused: SASL authentication failed
```

**Diagnosis**:

```bash
# Test credentials with kcat
kcat -b localhost:9093 \
  -X security.protocol=SASL_SSL \
  -X sasl.mechanism=SCRAM-SHA-256 \
  -X sasl.username=kafka-user \
  -X sasl.password=wrong-password \
  -L

# Expected output if credentials wrong:
# %3|1234567890.123|FAIL|rdkafka#producer-1| SASL authentication failed
```

**Solution 1: Wrong Credentials**

```typescript
// Check credentials in code
const kafka = new Kafka({
  brokers: ['localhost:9093'],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256', // Check mechanism
    username: process.env.KAFKA_USERNAME!, // Verify env var is set
    password: process.env.KAFKA_PASSWORD!
  }
});

// Verify environment variables
console.log('Username:', process.env.KAFKA_USERNAME);
console.log('Password set:', !!process.env.KAFKA_PASSWORD);
```

**Solution 2: Wrong SASL Mechanism**

```bash
# Check broker configuration
kafka-configs --bootstrap-server localhost:9092 \
  --describe --entity-type brokers --all | grep sasl

# Common mechanisms:
# - PLAIN (simple username/password)
# - SCRAM-SHA-256 (salted challenge response)
# - SCRAM-SHA-512 (stronger)
# - GSSAPI (Kerberos)

# Update code to match broker configuration
sasl: {
  mechanism: 'scram-sha-512', // Match broker
  username: 'kafka-user',
  password: 'secure-password'
}
```

### Problem: SSL Certificate Verification Failed

**Error**:
```
Error: unable to verify the first certificate
```

**Solution**:

```typescript
import * as fs from 'fs';

const kafka = new Kafka({
  brokers: ['kafka.example.com:9093'],
  ssl: {
    rejectUnauthorized: true, // Don't set to false in production!
    ca: [fs.readFileSync('/path/to/ca-cert.pem', 'utf-8')],
    cert: fs.readFileSync('/path/to/client-cert.pem', 'utf-8'),
    key: fs.readFileSync('/path/to/client-key.pem', 'utf-8')
  }
});
```

**Verify Certificates**:

```bash
# Check certificate expiration
openssl x509 -in ca-cert.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile ca-cert.pem client-cert.pem

# Test SSL connection
openssl s_client -connect kafka.example.com:9093 -CAfile ca-cert.pem
```

---

## Performance Problems

### Problem: High Producer Latency

**Symptoms**:
- Messages taking >1 second to send
- High p99 latency
- Application timeouts

**Diagnosis**:

```typescript
import { performance } from 'perf_hooks';

const start = performance.now();
await producer.send({
  topic: 'test',
  messages: [{ value: 'test' }]
});
const duration = performance.now() - start;
console.log(`Send duration: ${duration}ms`);
```

**Solution 1: Increase Batching**

```typescript
const producer = kafka.producer({
  // Wait up to 100ms to batch messages
  linger: { ms: 100 },

  // Increase batch size
  batch: {
    size: 32768 // 32KB
  },

  // Enable compression
  compression: 'gzip' // or 'snappy', 'lz4', 'zstd'
});
```

**Solution 2: Reduce Acks Requirement**

```typescript
// For non-critical data, reduce acks
const producer = kafka.producer({
  acks: 1, // Only wait for leader (faster)
  // acks: -1 // Wait for all replicas (slower but safer)
});
```

**Solution 3: Increase Network Buffer**

```typescript
const kafka = new Kafka({
  brokers: ['localhost:9092'],
  socketOptions: {
    sendBufferSize: 131072, // 128KB
    receiveBufferSize: 131072
  }
});
```

### Problem: Consumer Lag Growing

**Symptoms**:
- Consumer group lag increasing over time
- Messages backing up
- Real-time processing delayed

**Diagnosis**:

```bash
# Check consumer lag
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# Output shows:
# TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# events   0          1000            5000            4000  ← LAG!

# Or use kcat
kcat -b localhost:9092 -C -G my-consumer-group events -c 0
```

**Solution 1: Increase Partition Consumption Concurrency**

```typescript
const consumer = kafka.consumer({
  groupId: 'my-consumer-group',
  // Process multiple partitions in parallel
  partitionsConsumedConcurrently: 5
});
```

**Solution 2: Batch Processing**

```typescript
await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    // Process batch instead of individual messages
    for (const message of batch.messages) {
      await processMessage(message);
      await resolveOffset(message.offset);
    }

    await heartbeat();
  }
});
```

**Solution 3: Scale Consumer Group**

```bash
# Option 1: Add more consumer instances (up to partition count)
# Start consumer on additional servers/containers

# Option 2: Increase partition count
kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic events \
  --partitions 10

# Then restart consumers to rebalance
```

**Solution 4: Optimize Processing Logic**

```typescript
// Before: Sequential processing
for (const message of batch.messages) {
  await processMessage(message); // Slow!
}

// After: Parallel processing
await Promise.all(
  batch.messages.map(message => processMessage(message))
);
```

### Problem: Broker CPU/Memory High

**Diagnosis**:

```bash
# Check broker metrics
docker stats kafka-broker

# Check JVM memory
docker exec kafka-broker jstat -gcutil 1 1000 10

# Check Prometheus metrics
curl localhost:9090/api/v1/query?query=kafka_server_brokertopicmetrics_messagesinpersec
```

**Solution 1: Increase JVM Heap**

```bash
# Edit broker configuration
export KAFKA_HEAP_OPTS="-Xmx4G -Xms4G"

# Restart broker
docker-compose restart kafka-broker
```

**Solution 2: Enable Compression**

```properties
# server.properties
compression.type=gzip

# Or set per-topic
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name high-volume-topic \
  --alter --add-config compression.type=gzip
```

**Solution 3: Reduce Retention**

```bash
# Reduce retention from 7 days to 3 days
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name old-topic \
  --alter --add-config retention.ms=259200000
```

---

## Docker Compose Issues

### Problem: Kafka Container Won't Start

**Error**:
```
kafka-broker exited with code 1
```

**Diagnosis**:

```bash
# Check logs
docker logs kafka-broker

# Common errors:
# - "Address already in use" (port conflict)
# - "Cannot allocate memory" (insufficient resources)
# - "Invalid config" (syntax error in properties)
```

**Solution 1: Port Already in Use**

```bash
# Find process using port 9092
lsof -i :9092

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "9093:9092" # Use external port 9093
```

**Solution 2: Insufficient Resources**

```bash
# Check Docker resources
docker system df

# Increase Docker Desktop memory
# Docker Desktop → Preferences → Resources → Memory: 8GB

# Or reduce broker memory
environment:
  KAFKA_HEAP_OPTS: "-Xmx1G -Xms1G" # Reduce from default 4G
```

**Solution 3: Volume Permission Issues**

```bash
# Fix volume permissions
docker-compose down -v  # Remove volumes
docker volume prune     # Clean up

# Recreate with correct permissions
docker-compose up -d
```

### Problem: Kafka UI Not Accessible

**Error**: Browser shows "Connection refused" at http://localhost:8080

**Solution**:

```bash
# Check if container is running
docker ps | grep kafka-ui

# If not running, check logs
docker logs kafka-ui

# Common issue: Wrong Kafka bootstrap servers
# Edit docker-compose.yml:
environment:
  KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka-broker:9092 # Internal name
  # NOT: localhost:9092 (won't work inside container)

# Restart
docker-compose restart kafka-ui
```

---

## Producer Failures

### Problem: TimeoutError on Send

**Error**:
```
KafkaJSTimeout: Request timed out
```

**Diagnosis**:

```typescript
const producer = kafka.producer({
  timeout: 30000, // Increase timeout
  retry: {
    retries: 5,
    initialRetryTime: 300,
    maxRetryTime: 30000
  }
});

// Add error handling
try {
  await producer.send({ topic: 'test', messages: [{ value: 'test' }] });
} catch (error) {
  console.error('Send failed:', error);
  // Check error type
  if (error.name === 'KafkaJSTimeout') {
    console.log('Broker not responding - check network/broker health');
  }
}
```

**Solution**:

```bash
# Check broker is reachable
nc -zv localhost 9092

# Check broker health
kafka-broker-api-versions --bootstrap-server localhost:9092

# Check if topic exists
kafka-topics --bootstrap-server localhost:9092 --list

# Create topic if missing
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic test \
  --partitions 3 --replication-factor 1
```

### Problem: Message Too Large

**Error**:
```
KafkaJSProtocolError: The message is too large
```

**Solution**:

```bash
# Option 1: Increase max message size on broker
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type brokers --entity-default \
  --alter --add-config message.max.bytes=10485760  # 10MB

# Option 2: Split large messages
const largeData = ... // 20MB
const chunks = splitIntoChunks(largeData, 1048576); // 1MB chunks

for (const [index, chunk] of chunks.entries()) {
  await producer.send({
    topic: 'large-messages',
    messages: [{
      key: messageId,
      value: chunk,
      headers: {
        'chunk-index': index.toString(),
        'total-chunks': chunks.length.toString()
      }
    }]
  });
}

# Option 3: Use compression
const producer = kafka.producer({
  compression: 'gzip' // Can reduce size by 70%+
});
```

---

## Consumer Problems

### Problem: Consumer Not Receiving Messages

**Symptoms**:
- Consumer connected but no messages
- `eachMessage` callback never called
- No errors

**Diagnosis**:

```typescript
await consumer.subscribe({ topic: 'events', fromBeginning: true });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log('Received message:', {
      topic,
      partition,
      offset: message.offset,
      value: message.value?.toString()
    });
  }
});

// No output? Debug:
console.log('Consumer subscribed to:', consumer.subscription());
```

**Solution 1: Wrong Topic Name**

```bash
# List all topics
kafka-topics --bootstrap-server localhost:9092 --list

# Check if topic exists
kafka-topics --bootstrap-server localhost:9092 --describe --topic events

# Subscribe to correct topic
await consumer.subscribe({ topic: 'correct-topic-name' });
```

**Solution 2: Consumer Group Already Consumed Messages**

```bash
# Check consumer group offsets
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# Reset offsets to earliest
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --topic events \
  --reset-offsets --to-earliest \
  --execute

# Or in code:
await consumer.subscribe({ topic: 'events', fromBeginning: true });
```

**Solution 3: Partition Rebalance Loop**

```typescript
// Increase session timeout to prevent frequent rebalances
const consumer = kafka.consumer({
  groupId: 'my-group',
  sessionTimeout: 30000,     // 30 seconds (default: 10s)
  heartbeatInterval: 3000,   // 3 seconds
  maxWaitTimeInMs: 5000      // Max wait for new data
});
```

### Problem: Duplicate Messages

**Symptoms**:
- Same message processed multiple times
- Idempotency key violations

**Root Cause**: Consumer crashes before committing offsets

**Solution 1: Enable Auto-Commit**

```typescript
const consumer = kafka.consumer({
  groupId: 'my-group',
  autoCommit: true,
  autoCommitInterval: 5000 // Commit every 5 seconds
});
```

**Solution 2: Manual Offset Management (Recommended)**

```typescript
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    try {
      // Process message (with idempotency check)
      const processed = await processMessage(message);

      if (processed) {
        // Commit offset only after successful processing
        await consumer.commitOffsets([{
          topic,
          partition,
          offset: (parseInt(message.offset) + 1).toString()
        }]);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      // Don't commit offset - message will be reprocessed
    }
  }
});
```

**Solution 3: Implement Idempotency**

```typescript
const processedMessages = new Set<string>();

async function processMessage(message: any) {
  const messageId = message.headers['message-id']?.toString();

  // Skip if already processed
  if (processedMessages.has(messageId)) {
    console.log('Duplicate message, skipping:', messageId);
    return false;
  }

  // Process message
  await doWork(message);

  // Mark as processed
  processedMessages.add(messageId);
  return true;
}
```

---

## Network Connectivity

### Problem: Cannot Connect to Broker

**Error**:
```
KafkaJSConnectionError: Failed to connect to seed broker
```

**Diagnosis**:

```bash
# Test network connectivity
nc -zv kafka.example.com 9092

# Test DNS resolution
nslookup kafka.example.com

# Check firewall rules
telnet kafka.example.com 9092

# Check broker advertised listeners
kafka-broker-api-versions --bootstrap-server kafka.example.com:9092
```

**Solution 1: Wrong Advertised Listener**

```properties
# server.properties on broker
listeners=PLAINTEXT://0.0.0.0:9092,SSL://0.0.0.0:9093
advertised.listeners=PLAINTEXT://public-ip:9092,SSL://public-ip:9093

# Must match how clients connect
# If clients use kafka.example.com, use:
advertised.listeners=PLAINTEXT://kafka.example.com:9092
```

**Solution 2: Firewall Blocking Traffic**

```bash
# AWS Security Group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 9092 \
  --cidr 0.0.0.0/0

# Azure NSG
az network nsg rule create \
  --resource-group my-rg \
  --nsg-name my-nsg \
  --name allow-kafka \
  --priority 100 \
  --destination-port-ranges 9092 \
  --access Allow
```

**Solution 3: DNS Resolution Failed**

```bash
# Add to /etc/hosts (temporary fix)
echo "10.0.1.10 kafka-1.internal" >> /etc/hosts
echo "10.0.1.11 kafka-2.internal" >> /etc/hosts
echo "10.0.1.12 kafka-3.internal" >> /etc/hosts

# Or use IP addresses directly
const kafka = new Kafka({
  brokers: ['10.0.1.10:9092', '10.0.1.11:9092', '10.0.1.12:9092']
});
```

---

## Broker Failures

### Problem: Broker Crash Loop

**Symptoms**:
- Broker starts then immediately crashes
- Logs show "Shutdown completed"

**Diagnosis**:

```bash
# Check logs for errors
docker logs kafka-broker --tail 100

# Common errors:
# - "Disk full" → Free up disk space
# - "Out of memory" → Increase JVM heap
# - "Corrupt log segment" → Delete corrupt segment
```

**Solution 1: Disk Full**

```bash
# Check disk usage
df -h /var/lib/kafka

# Clean up old log segments
kafka-log-dirs --bootstrap-server localhost:9092 --describe

# Reduce retention
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name large-topic \
  --alter --add-config retention.ms=86400000  # 1 day
```

**Solution 2: Corrupt Log Segment**

```bash
# Find corrupt segment
grep -r "CORRUPT" /var/lib/kafka/logs/

# Delete corrupt segment (CAUTION: Data loss!)
rm /var/lib/kafka/logs/my-topic-0/00000000000000000123.log

# Restart broker
systemctl restart kafka
```

**Solution 3: Split Brain (Multiple Controllers)**

```bash
# Check controller status
kafka-metadata --snapshot /var/lib/kafka/__cluster_metadata-0/00000000000000000000.log \
  --print

# If multiple controllers, restart all brokers
for broker in kafka-1 kafka-2 kafka-3; do
  ssh $broker "systemctl restart kafka"
done
```

---

## Schema Registry Issues

### Problem: Schema Not Found

**Error**:
```
Error: Schema not found for subject 'user-events-value'
```

**Solution**:

```bash
# Register schema
curl -X POST http://localhost:8081/subjects/user-events-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"name\",\"type\":\"string\"}]}"
  }'

# List all subjects
curl http://localhost:8081/subjects

# Get latest schema version
curl http://localhost:8081/subjects/user-events-value/versions/latest
```

### Problem: Schema Compatibility Error

**Error**:
```
Schema being registered is incompatible with an earlier schema
```

**Solution**:

```bash
# Check compatibility mode
curl http://localhost:8081/config/user-events-value

# Set to BACKWARD (allows removing fields)
curl -X PUT http://localhost:8081/config/user-events-value \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"compatibility": "BACKWARD"}'

# Or FORWARD (allows adding fields)
# Or FULL (both)
# Or NONE (disable compatibility checking - not recommended)
```

---

## Emergency Procedures

### Complete Cluster Reset (Dev Only!)

```bash
# ⚠️ CAUTION: Deletes ALL data!

# Stop all services
/specweave-kafka:dev-env stop

# Remove volumes
docker volume prune -f

# Restart fresh
/specweave-kafka:dev-env start
```

### Export Cluster Diagnostics

```bash
# Create diagnostics bundle
mkdir kafka-diagnostics
cd kafka-diagnostics

# Broker logs
docker logs kafka-broker > broker.log 2>&1

# Topic list
kafka-topics --bootstrap-server localhost:9092 --list > topics.txt

# Consumer groups
kafka-consumer-groups --bootstrap-server localhost:9092 --list > consumer-groups.txt

# Broker config
kafka-configs --bootstrap-server localhost:9092 \
  --describe --entity-type brokers --all > broker-config.txt

# Create archive
tar -czf ../kafka-diagnostics-$(date +%Y%m%d).tar.gz .
```

---

## Getting Help

**Still stuck? Try these resources:**

1. **Search Existing Issues**: [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
2. **Ask the Community**: [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
3. **Official Kafka Docs**: [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
4. **KafkaJS Docs**: [KafkaJS Documentation](https://kafka.js.org/)

**When reporting issues, include:**
- Error messages (full stack traces)
- Environment details (OS, Node.js version, Kafka version)
- Relevant configuration (broker, producer, consumer)
- Steps to reproduce
- Diagnostic logs

---

**Related Guides**:
- [Getting Started Guide](kafka-getting-started.md) - Setup and basics
- [Advanced Usage Guide](kafka-advanced-usage.md) - EOS, security, performance
- [Terraform Guide](kafka-terraform.md) - Infrastructure deployment

---

**Last Updated**: 2025-11-15
