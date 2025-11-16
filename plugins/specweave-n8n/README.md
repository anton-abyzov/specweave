# specweave-n8n

**n8n Workflow Automation Integration with Kafka for SpecWeave**

Event-driven workflows, Kafka triggers, producers, and no-code/low-code patterns for workflow automation with Apache Kafka.

## Features

### 🚀 Core Capabilities

- **Kafka Trigger Node**: Event-driven workflow activation on Kafka messages
- **Kafka Producer Node**: Send messages to Kafka topics from workflows
- **Event-Driven Patterns**: Fan-out, retry with DLQ, batch processing, CDC
- **Error Handling**: Try/Catch, exponential backoff, circuit breaker, idempotency
- **Integration**: HTTP API enrichment, database sync, email/Slack notifications
- **No-Code/Low-Code**: Visual workflow builder for Kafka event processing

### 📚 Skills (1)

- `n8n-kafka-workflows` - Workflow patterns, Kafka triggers, producers, error handling, no-code automation

### 🤖 Agents (0)

*Agents coming in future releases*

### ⚡ Commands (0)

*Commands coming in future releases*

## Installation

### Prerequisites

- n8n installed (self-hosted or cloud)
- Apache Kafka 2.8+ cluster
- Node.js 18+ (for n8n)

### Install Plugin

```bash
# Via SpecWeave marketplace
specweave plugin install specweave-n8n

# Or via Claude Code plugin system
/plugin install specweave-n8n
```

## Quick Start

### 1. Configure Kafka Credentials in n8n

**n8n UI → Credentials → Add Credential**:
```json
{
  "name": "My Kafka Cluster",
  "type": "kafka",
  "brokers": "localhost:9092",
  "clientId": "n8n-workflow",
  "ssl": false,
  "sasl": {
    "mechanism": "plain",
    "username": "{{$env.KAFKA_USER}}",
    "password": "{{$env.KAFKA_PASSWORD}}"
  }
}
```

### 2. Create Event-Driven Workflow

**Workflow**: Process orders from Kafka, enrich with customer data, save to database

```
[Kafka Trigger] → [HTTP Request] → [Set] → [PostgreSQL]
     ↓                 ↓            ↓
  orders topic    Get customer   Merge data
                                     ↓
                                Save to DB
```

**1. Kafka Trigger Node**:
- Credential: My Kafka Cluster
- Topics: `orders`
- Consumer Group: `order-processor`
- Offset: `latest`
- Auto Commit: `true`

**2. HTTP Request Node** (Enrich):
- URL: `https://api.example.com/customers/{{$json.customerId}}`
- Method: GET
- Authentication: Bearer Token

**3. Set Node** (Transform):
```javascript
return {
  orderId: $json.order.id,
  customerId: $json.order.customerId,
  customerName: $json.customer.name,
  total: $json.order.total,
  timestamp: new Date().toISOString()
};
```

**4. PostgreSQL Node** (Save):
- Operation: INSERT
- Table: `enriched_orders`

### 3. Fan-Out Pattern (Publish to Multiple Topics)

**Workflow**: Single event triggers multiple downstream topics

```
[Kafka Trigger] → [Switch] → [Kafka Producer] (high-value-orders)
     ↓                ↓
  orders          └─→ [Kafka Producer] (all-orders)
                       └─→ [Kafka Producer] (analytics)
```

**Switch Node**:
- Route 1: `{{$json.total > 1000}}` → `high-value-orders`
- Route 2: Always → `all-orders`
- Route 3: Always → `analytics`

**Kafka Producer Nodes**: Send to respective topics

## Architecture

### Event-Driven Workflow Patterns

**1. Filter and Transform**:
```
[Kafka Trigger] → [Filter] → [Transform] → [Kafka Producer]
     ↓              ↓            ↓
  Raw events    Drop invalid  Enrich data
                                  ↓
                            Publish processed
```

**2. Retry with DLQ**:
```
[Kafka Trigger] → [Try] → [Process] → [Success]
     ↓              ↓
  Input          [Catch]
                     ↓
             [Increment Retry]
                     ↓ retry < 3
            [Kafka Producer] (retry topic)
                     ↓ retry >= 3
            [Kafka Producer] (dlq topic)
```

**3. Batch Processing**:
```
[Kafka Trigger] → [Aggregate] → [HTTP Batch API] → [Kafka Producer]
     ↓               ↓
  Events         Buffer 100 msgs
                     ↓
               Send batch to API
```

**4. Change Data Capture (CDC)**:
```
[Cron] → [PostgreSQL] → [Compare] → [Kafka Producer]
   ↓         ↓             ↓
Every 1m  Get new rows  Detect changes
                            ↓
                      Publish CDC events
```

### Error Handling Strategies

**Exponential Backoff**:
```javascript
const retryCount = $json.headers?.['retry-count'] || 0;
const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 60000);
return { retryCount: retryCount + 1, backoffMs };
```

**Circuit Breaker**:
```javascript
const failureRate = $json.metrics.failures / $json.metrics.total;
if (failureRate > 0.5) {
  return { circuitState: 'OPEN', skipProcessing: true };
}
```

**Idempotency**:
```javascript
const messageId = $json.headers?.['message-id'];
if (await $('Redis').exists(messageId)) {
  return { skip: true, reason: 'duplicate' };
}
```

## Usage Examples

### Kafka + HTTP API Enrichment

```
[Kafka Trigger: user-events]
  ↓
[HTTP Request: GET /users/{{$json.userId}}]
  ↓
[Set: Merge user data]
  ↓
[Kafka Producer: enriched-events]
```

### Kafka + Database Sync

```
[Kafka Trigger: orders]
  ↓
[PostgreSQL: UPSERT into orders table]
  ↓
[Kafka Producer: order-processed]
```

### Kafka + Slack Alerts

```
[Kafka Trigger: errors]
  ↓
[If: severity === 'critical']
  ↓ true
[Slack: Send to #alerts]
  ↓
[Kafka Producer: alert-sent]
```

### Kafka + Email Notifications

```
[Kafka Trigger: high-value-orders]
  ↓
[Send Email: Notify sales team]
  ↓
[Kafka Producer: notification-sent]
```

## Testing

### Manual Testing

**1. Test Kafka Trigger**:
```bash
# Produce test message
echo '{"userId": 123, "event": "click"}' | \
  kcat -P -b localhost:9092 -t user-events
```

**2. Test Kafka Producer**:
```bash
# Consume test topic
kcat -C -b localhost:9092 -t enriched-events -o beginning
```

**3. n8n UI Testing**:
- Click "Execute Workflow"
- Use "Test Step" to check node outputs
- View execution history

### Automated Testing

```bash
# Execute workflow via CLI
n8n execute workflow --file workflow.json --input test-data.json

# Export workflow
n8n export:workflow --id=123 --output=my-workflow.json
```

## Performance Optimization

**1. Enable Batching**:
```
Kafka Trigger:
  Batch Size: 100
  Batch Timeout: 5000ms
```

**2. Parallel Processing**:
```
[Kafka Trigger] → [Split in Batches] → [HTTP Request]
     ↓                  ↓
  1000 events      Process 100 at a time
```

**3. Use Compression**:
```
Kafka Producer:
  Compression: lz4
  Batch Size: 1000
```

## Troubleshooting

### Issue 1: Consumer Lag Building Up

**Solutions**:
- Increase consumer group size (deploy more n8n instances)
- Enable batching (process 100+ messages at once)
- Use Split in Batches for parallel HTTP requests
- Optimize database queries (use batch UPSERT)

### Issue 2: Duplicate Messages

**Solution**: Add idempotency check:
```javascript
const messageId = $json.headers?.['message-id'];
const exists = await $('Redis').exists(messageId);
if (exists) return { skip: true };
```

### Issue 3: Workflow Execution Timeout

**Solution**: Use async patterns:
```
[Kafka Trigger] → [Webhook] → [Wait for Webhook] → [Process]
     ↓               ↓
  Trigger job    Async callback
```

## Documentation

- **Getting Started**: `.specweave/docs/public/guides/n8n-kafka-getting-started.md`
- **Workflow Patterns**: `.specweave/docs/public/guides/n8n-kafka-patterns.md`
- **Error Handling**: `.specweave/docs/public/guides/n8n-error-handling.md`
- **Best Practices**: `.specweave/docs/public/guides/n8n-best-practices.md`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Related Plugins

- **specweave-kafka** - Core Kafka plugin (Apache Kafka integration)
- **specweave-confluent** - Confluent Cloud features (Schema Registry, ksqlDB)
- **specweave-kafka-streams** - Kafka Streams library (Java/Kotlin stream processing)

## License

MIT License - see [LICENSE](../../LICENSE)

## Support

- **Documentation**: https://spec-weave.com/docs/plugins/n8n
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Status**: ✅ Production Ready
