---
name: specweave-n8n:workflow-template
description: Generate n8n workflow JSON template with Kafka trigger/producer nodes. Creates event-driven workflow patterns (fan-out, retry+DLQ, enrichment, CDC).
---

# Generate n8n Workflow Template

Create ready-to-use n8n workflow JSON files with Kafka integration patterns.

## What This Command Does

1. **Select Pattern**: Choose from common event-driven patterns
2. **Configure Kafka**: Specify topics, consumer groups, brokers
3. **Customize Workflow**: Add enrichment, transformations, error handling
4. **Generate JSON**: Export n8n-compatible workflow file
5. **Import Instructions**: How to load into n8n UI

## Available Patterns

### Pattern 1: Kafka Trigger → HTTP Enrichment → Kafka Producer
**Use Case**: Event enrichment with external API

**Workflow**:
```
[Kafka Trigger] → [HTTP Request] → [Set/Transform] → [Kafka Producer]
     ↓                 ↓                  ↓
  Input topic      Enrich data        Output topic
```

**Configuration**:
- Input topic (e.g., `orders`)
- API endpoint (e.g., `https://api.example.com/customers/{id}`)
- Output topic (e.g., `enriched-orders`)

### Pattern 2: Kafka Trigger → Fan-Out
**Use Case**: Single event triggers multiple downstream topics

**Workflow**:
```
[Kafka Trigger] → [Switch] → [Kafka Producer] (high-priority)
     ↓                ↓
  Input          └─→ [Kafka Producer] (all-events)
                      └─→ [Kafka Producer] (analytics)
```

### Pattern 3: Retry with Dead Letter Queue
**Use Case**: Fault-tolerant processing with retry logic

**Workflow**:
```
[Kafka Trigger] → [Try] → [Process] → [Kafka Producer] (success)
     ↓              ↓
  Input          [Catch] → [Increment Retry Count]
                               ↓
                         retry < 3 ?
                               ↓
                     [Kafka Producer] (retry-topic)
                               ↓
                     [Kafka Producer] (dlq-topic)
```

### Pattern 4: Change Data Capture (CDC)
**Use Case**: Database polling → Kafka events

**Workflow**:
```
[Cron: Every 1m] → [PostgreSQL Query] → [Compare] → [Kafka Producer]
                         ↓                    ↓
                    Get new rows        Detect changes
                                             ↓
                                    Publish CDC events
```

## Example Usage

```bash
# Generate workflow template
/specweave-n8n:workflow-template

# I'll ask:
# 1. Which pattern? (Enrichment, Fan-Out, Retry+DLQ, CDC)
# 2. Input topic name?
# 3. Output topic(s)?
# 4. Kafka broker (default: localhost:9092)?
# 5. Consumer group name?

# Then I'll generate:
# - workflow.json (importable into n8n)
# - README.md with setup instructions
# - .env.example with required variables
```

## Generated Files

**1. workflow.json**: n8n workflow definition
```json
{
  "name": "Kafka Event Enrichment",
  "nodes": [
    {
      "type": "n8n-nodes-base.kafkaTrigger",
      "name": "Kafka Trigger",
      "parameters": {
        "topic": "orders",
        "groupId": "order-processor",
        "brokers": "localhost:9092"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Enrich Customer Data",
      "parameters": {
        "url": "https://api.example.com/customers/={{$json.customerId}}",
        "authentication": "genericCredentialType"
      }
    },
    {
      "type": "n8n-nodes-base.set",
      "name": "Transform",
      "parameters": {
        "values": {
          "orderId": "={{$json.order.id}}",
          "customerName": "={{$json.customer.name}}"
        }
      }
    },
    {
      "type": "n8n-nodes-base.kafka",
      "name": "Kafka Producer",
      "parameters": {
        "topic": "enriched-orders",
        "brokers": "localhost:9092"
      }
    }
  ],
  "connections": { ... }
}
```

**2. README.md**: Import instructions
```markdown
# Import Workflow into n8n

1. Open n8n UI (http://localhost:5678)
2. Click "Workflows" → "Import from File"
3. Select workflow.json
4. Configure credentials (Kafka, HTTP API)
5. Activate workflow
6. Test with sample event
```

**3. .env.example**: Required environment variables
```bash
KAFKA_BROKERS=localhost:9092
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
API_ENDPOINT=https://api.example.com
API_TOKEN=your-api-token
```

## Import into n8n

**Via UI**:
1. n8n Dashboard → Workflows → Import from File
2. Select generated workflow.json
3. Configure Kafka credentials
4. Activate workflow

**Via CLI**:
```bash
# Import workflow
n8n import:workflow --input=workflow.json

# List workflows
n8n list:workflow
```

## Configuration Options

### Kafka Settings
- **Brokers**: Comma-separated list (e.g., `broker1:9092,broker2:9092`)
- **Consumer Group**: Unique identifier for this workflow
- **Offset**: `earliest` (replay) or `latest` (new messages only)
- **Auto Commit**: `true` (recommended) or `false` (manual)
- **SSL/SASL**: Authentication credentials for secure clusters

### Error Handling
- **Retry Count**: Maximum retries before DLQ (default: 3)
- **Backoff Strategy**: Exponential (1s, 2s, 4s, 8s)
- **DLQ Topic**: Dead letter queue for failed messages
- **Alert on Failure**: Send Slack/email notification

### Performance
- **Batch Size**: Process N messages at once (default: 1)
- **Batch Timeout**: Wait up to N ms for batch (default: 5000)
- **Parallel Execution**: Enable for HTTP enrichment (default: disabled)
- **Max Memory**: Limit workflow memory usage

## Testing

**Manual Test**:
```bash
# 1. Produce test event
echo '{"orderId": 123, "customerId": 456}' | \
  kcat -P -b localhost:9092 -t orders

# 2. Check n8n execution log
# n8n UI → Executions → View latest run

# 3. Consume output
kcat -C -b localhost:9092 -t enriched-orders
```

**Automated Test**:
```bash
# Execute workflow via CLI
n8n execute workflow --file workflow.json \
  --input test-data.json

# Expected output: success status
```

## Troubleshooting

### Issue 1: Workflow Not Triggering
**Solution**: Check Kafka connection
```bash
# Test Kafka connectivity
kcat -L -b localhost:9092

# Verify consumer group registered
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group order-processor
```

### Issue 2: Messages Not Being Consumed
**Solution**: Check offset position
- n8n UI → Workflow → Kafka Trigger → Offset
- Set to `earliest` to replay all messages

### Issue 3: HTTP Enrichment Timeout
**Solution**: Enable parallel processing
- Workflow → HTTP Request → Batching → Enable
- Set batch size: 100
- Set timeout: 30s

## Related Commands

- `/specweave-kafka:dev-env` - Set up local Kafka cluster
- `/specweave-n8n:test-workflow` - Test workflow with sample data (coming soon)

## Documentation

- **n8n Kafka Nodes**: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.kafka/
- **Workflow Patterns**: `.specweave/docs/public/guides/n8n-kafka-patterns.md`
- **Error Handling**: `.specweave/docs/public/guides/n8n-error-handling.md`

---

**Plugin**: specweave-n8n
**Version**: 1.0.0
**Status**: ✅ Production Ready
