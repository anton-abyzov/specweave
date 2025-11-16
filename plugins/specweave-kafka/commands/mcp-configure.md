---
name: specweave-kafka:mcp-configure
description: Configure MCP (Model Context Protocol) server for Kafka integration. Auto-detects and configures kanapuli, tuannvm, Joel-hanson, or Confluent MCP servers.
---

# Configure Kafka MCP Server

Set up MCP (Model Context Protocol) server integration for natural language Kafka operations.

## What This Command Does

1. **MCP Server Detection**: Auto-detect installed MCP servers
2. **Server Ranking**: Recommend best server for your needs
3. **Configuration**: Generate Claude Desktop config
4. **Testing**: Verify MCP server connectivity
5. **Usage Guide**: Show natural language examples

## Supported MCP Servers

| Server | Language | Features | Best For |
|--------|----------|----------|----------|
| **Confluent Official** | - | Natural language, Flink SQL, Enterprise | Production + Confluent Cloud |
| **tuannvm/kafka-mcp-server** | Go | Advanced SASL (SCRAM-SHA-256/512) | Security-focused deployments |
| **kanapuli/mcp-kafka** | Node.js | Basic operations, SASL_PLAINTEXT | Quick start, dev environments |
| **Joel-hanson/kafka-mcp-server** | Python | Claude Desktop integration | Desktop AI workflows |

## Example Usage

```bash
# Start MCP configuration wizard
/specweave-kafka:mcp-configure

# I'll:
# 1. Detect installed MCP servers (npm, go, pip, CLI)
# 2. Rank servers (Confluent > tuannvm > kanapuli > Joel-hanson)
# 3. Generate Claude Desktop config (~/.claude/settings.json)
# 4. Test connection to Kafka
# 5. Show natural language examples
```

## What Gets Configured

**Claude Desktop Config** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "kafka": {
      "command": "npx",
      "args": ["mcp-kafka"],
      "env": {
        "KAFKA_BROKERS": "localhost:9092",
        "KAFKA_SASL_USERNAME": "admin",
        "KAFKA_SASL_PASSWORD": "admin-secret"
      }
    }
  }
}
```

## Natural Language Examples

After MCP is configured, you can use natural language with Claude:

```
You: "List all Kafka topics"
Claude: [Uses MCP to call listTopics()]
Output: user-events, order-events, payment-events

You: "Create a topic called 'analytics' with 12 partitions and RF=3"
Claude: [Uses MCP to call createTopic()]
Output: Topic 'analytics' created successfully

You: "What's the consumer lag for group 'orders-consumer'?"
Claude: [Uses MCP to call getConsumerGroupOffsets()]
Output: Total lag: 1,234 messages across 6 partitions

You: "Send a test message to 'user-events' topic"
Claude: [Uses MCP to call produceMessage()]
Output: Message sent to partition 3, offset 12345
```

## Prerequisites

- Node.js 18+ (for kanapuli or Joel-hanson)
- Go 1.20+ (for tuannvm)
- Confluent Cloud account (for Confluent MCP)
- Kafka cluster accessible from your machine

## Post-Configuration

After MCP is configured, I'll:
1. ✅ Restart Claude Desktop (required for MCP changes)
2. ✅ Test MCP server with simple command
3. ✅ Show 10+ natural language examples
4. ✅ Provide troubleshooting tips if connection fails

---

**Skills Activated**: kafka-mcp-integration
**Related Commands**: /specweave-kafka:deploy, /specweave-kafka:dev-env
**MCP Docs**: https://modelcontextprotocol.io/
