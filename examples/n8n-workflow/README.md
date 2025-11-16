# n8n Kafka Workflow Example

**No-code Kafka workflows with n8n automation**

Demonstrates integrating Kafka with n8n for event-driven workflows.

## Features

- **Kafka Trigger** - Start workflows from Kafka messages
- **Enrichment** - Call external APIs to enrich data
- **Filtering** - Route messages based on conditions
- **Multi-Sink** - Send to database, Slack, email, etc.

## Setup

```bash
# Start n8n
docker-compose up -d

# Access n8n UI
open http://localhost:5678
```

## Import Workflow

1. Open n8n at http://localhost:5678
2. Click "Import from File"
3. Select `kafka-to-slack.json`
4. Configure Kafka credentials
5. Activate workflow

## Example Workflow

```
Kafka Consumer (user-events)
  ↓
Filter (event_type === 'purchase')
  ↓
HTTP Request (fetch user details)
  ↓
Slack (send notification)
```

## Use Cases

- Alerts and notifications
- Data pipeline orchestration
- Event-driven automation
- Integration with 3rd party services

## Documentation

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Kafka Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.kafka/)
