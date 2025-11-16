# ADR-0039: n8n Kafka Integration Approach

**Date**: 2025-11-15
**Status**: Accepted

## Context

n8n is a workflow automation platform with 1000+ service integrations. Integrating Kafka with n8n enables no-code event-driven workflows for non-developers. Multiple integration approaches exist with different complexity levels and capabilities.

**n8n Kafka Integration Options** (as of 2025-11):

1. **n8n Kafka Trigger Node** (Native)
   - **Type**: Built-in n8n node (available since n8n 1.0)
   - **Capabilities**: Consume messages from Kafka topics, trigger workflows on new messages
   - **Authentication**: SASL/PLAINTEXT, SASL/SSL
   - **Use Case**: Event-driven workflows (new order → send email, new log → alert)
   - **Maturity**: Production-grade
   - **Limitations**: No message production (consume only)

2. **n8n Kafka Producer Node** (Community)
   - **Type**: Community-contributed node
   - **Capabilities**: Publish messages to Kafka topics
   - **Use Case**: Workflow → Kafka (e.g., webhook → transform → Kafka)
   - **Maturity**: Community-maintained
   - **Limitations**: Less comprehensive than trigger node

3. **n8n MCP Server Trigger** (2025 Feature)
   - **Type**: New n8n node type (announced Q1 2025)
   - **Capabilities**: Trigger workflows from MCP server events
   - **Use Case**: AI-driven workflows, natural language event processing
   - **Maturity**: New (early adoption)
   - **Limitations**: Requires MCP server setup, newer technology

4. **n8n MCP Client Tool** (2025 Feature)
   - **Type**: n8n → external MCP servers
   - **Capabilities**: Call MCP servers from workflows
   - **Use Case**: Workflow → MCP server → Kafka operations
   - **Maturity**: New (early adoption)
   - **Limitations**: Not event-driven (pull-based)

5. **Custom n8n Webhook + Kafka CLI**
   - **Type**: DIY integration
   - **Capabilities**: Webhook → bash script → kcat CLI → Kafka
   - **Use Case**: Custom workflows, complex transformations
   - **Maturity**: Requires custom scripting
   - **Limitations**: Maintenance burden, brittle

**Key Decision Factors**:
- Event-driven vs request-driven workflows
- Native n8n features vs custom integrations
- Ease of use for non-developers
- AI-driven capabilities (MCP)
- Production maturity
- Maintenance overhead

**Requirements from User Stories**:
- US-014: n8n Kafka Integration (P2)
- AC-US14-01: n8n Kafka Trigger node (consume messages) - P2
- AC-US14-02: n8n Kafka Producer node (publish messages) - P2
- AC-US14-03: n8n credentials for Kafka authentication - P2
- AC-US14-04: n8n workflow templates (Kafka → Webhook, Kafka → Database) - P2

## Decision

We will implement a **hybrid approach leveraging both native n8n nodes and MCP integration**:

1. **Primary: Native n8n Kafka Nodes** (P1)
   - Use built-in n8n Kafka Trigger node for event-driven workflows
   - Use community n8n Kafka Producer node for publishing messages
   - Provide pre-built workflow templates (Kafka → Webhook, Kafka → Database, Kafka → Slack)

2. **Advanced: n8n MCP Server Trigger** (P2)
   - Enable AI-driven workflows via MCP Server Trigger
   - Natural language event processing (e.g., "When urgent order arrives, alert team")
   - Leverage existing Kafka MCP servers (kanapuli, tuannvm, Confluent)

3. **Fallback: Custom Webhook + kcat CLI** (P3)
   - For edge cases not covered by native nodes
   - Custom transformations, complex routing logic

**Rationale**:
- Native nodes provide the most stable, low-maintenance solution
- MCP integration enables AI-driven workflows (future-proof)
- Hybrid approach balances simplicity (native nodes) with advanced capabilities (MCP)

## Alternatives Considered

### Alternative 1: Native n8n Kafka Nodes Only

**Pros**:
- Built-in n8n functionality (no external dependencies)
- Production-grade stability
- Easy setup (drag-and-drop nodes)
- Well-documented

**Cons**:
- No AI-driven workflows
- Limited to pre-defined operations (consume, produce)
- Can't leverage Kafka MCP servers
- No natural language event processing

**Why NOT chosen**: Doesn't enable AI-driven capabilities, limits SpecWeave's differentiation.

### Alternative 2: n8n MCP Integration Only

**Pros**:
- AI-driven workflows (natural language)
- Leverages existing Kafka MCP servers
- Future-proof (MCP is Anthropic's standard)
- Unified with SpecWeave's MCP strategy (ADR-0036)

**Cons**:
- Newer technology (early adoption, less stable)
- More complex setup (MCP server + n8n MCP nodes)
- Requires users to understand MCP concepts
- Not event-driven (MCP Server Trigger is pull-based)

**Why NOT chosen**: Too complex for basic use cases, early adoption risk violates production readiness requirement (NFR-002).

### Alternative 3: Custom n8n Webhook + kcat CLI

**Pros**:
- Maximum flexibility
- No n8n plugin dependencies
- Works with any Kafka setup
- Full control over transformations

**Cons**:
- High maintenance burden
- Brittle (shell scripts, error handling)
- Not user-friendly for non-developers
- No drag-and-drop workflow builder
- Violates n8n's value proposition (no-code)

**Why NOT chosen**: Defeats the purpose of n8n integration, high maintenance overhead.

### Alternative 4: Build Custom n8n Kafka Plugin

**Pros**:
- Full control over features
- Optimized for SpecWeave use cases
- Can support advanced Kafka features (Schema Registry, transactional producers)

**Cons**:
- Significant development effort (3-4 months)
- Maintenance burden
- Duplicates existing n8n Kafka nodes
- n8n plugin ecosystem is smaller than expected
- Must keep up with n8n API changes

**Why NOT chosen**: Not aligned with SpecWeave's principle of leveraging existing tools. Native n8n nodes already exist.

## Consequences

### Positive

✅ **Low Barrier to Entry**: Native n8n nodes are drag-and-drop (no code required)
- Non-developers can create event-driven workflows
- Pre-built templates accelerate onboarding
- No Kafka expertise needed

✅ **Production-Grade Stability**: Native n8n Kafka Trigger node is battle-tested
- Used by 1000+ n8n users
- Well-documented
- Active community support

✅ **AI-Driven Workflows** (MCP Server Trigger):
- Natural language event processing
- AI agents can react to Kafka events
- Unified with SpecWeave's MCP strategy (ADR-0036)

✅ **Flexibility**: Hybrid approach supports simple and complex use cases
- Simple: Native Kafka Trigger → Webhook
- Advanced: MCP Server Trigger → AI agent → multi-step workflow
- Custom: Webhook → bash script → kcat

✅ **Future-Proof**: MCP integration aligns with Anthropic's roadmap
- n8n MCP support announced Q1 2025
- Early adoption positions SpecWeave as leader

### Negative

❌ **Two Integration Paths to Maintain**: Native nodes + MCP
- Different configuration formats
- Different troubleshooting approaches
- More documentation needed

**Mitigation**: Provide clear decision tree: "Use native nodes for 90% of use cases, MCP for AI-driven workflows"

❌ **MCP Server Trigger Immaturity**: New feature (early 2025)
- May have bugs or breaking changes
- Limited production adoption
- Documentation may be incomplete

**Mitigation**: Mark MCP integration as P2 (optional), native nodes are P1 (core)

❌ **Community Kafka Producer Node Dependency**:
- Not officially maintained by n8n
- May become outdated
- Breaking changes possible

**Mitigation**: Fork community node if needed, contribute upstream improvements

❌ **Workflow Template Maintenance**: Pre-built templates must stay current
- n8n API changes
- Kafka version changes
- Template complexity grows

**Mitigation**: Use version pinning, quarterly template review

### Neutral

🔄 **n8n Hosting**: Users must host n8n themselves (cloud or self-hosted)
- n8n Cloud (managed): $20-100/month
- Self-hosted: Docker/K8s deployment
- Generally not an issue (n8n is widely adopted)

🔄 **MCP Server Requirement** (for MCP workflows):
- Must have Kafka MCP server running
- Additional configuration complexity
- Only affects users who want AI-driven workflows

## Implementation Details

### n8n Kafka Trigger Node Configuration

```json
{
  "nodes": [
    {
      "parameters": {
        "topic": "orders",
        "clientId": "n8n-workflow",
        "groupId": "n8n-consumer-group",
        "brokers": "kafka.example.com:9092",
        "authentication": "sasl",
        "sasl": {
          "mechanism": "scram-sha-256",
          "username": "={{ $credentials.username }}",
          "password": "={{ $credentials.password }}"
        },
        "ssl": {
          "enabled": true
        },
        "options": {
          "autoCommit": true,
          "sessionTimeout": 30000,
          "fromBeginning": false
        }
      },
      "name": "Kafka Trigger",
      "type": "n8n-nodes-base.kafkaTrigger",
      "position": [250, 300],
      "credentials": {
        "kafka": {
          "id": "1",
          "name": "Kafka Production"
        }
      }
    },
    {
      "parameters": {
        "url": "https://api.example.com/webhook",
        "options": {
          "bodyParametersJson": "={{ JSON.stringify($json) }}"
        }
      },
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    }
  ],
  "connections": {
    "Kafka Trigger": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### n8n MCP Server Trigger Configuration (2025 Feature)

```json
{
  "nodes": [
    {
      "parameters": {
        "mcpServer": "kafka-mcp-server",
        "event": "message.received",
        "filters": {
          "topic": "orders",
          "priority": "urgent"
        },
        "naturalLanguageQuery": "When an urgent order arrives on orders topic"
      },
      "name": "MCP Kafka Trigger",
      "type": "n8n-nodes-base.mcpServerTrigger",
      "position": [250, 300],
      "credentials": {
        "mcpServer": {
          "id": "1",
          "name": "Kafka MCP Server"
        }
      }
    },
    {
      "parameters": {
        "aiAgent": "claude-3.5",
        "prompt": "Analyze the order and determine if immediate action is needed",
        "context": "={{ $json }}"
      },
      "name": "AI Analysis",
      "type": "n8n-nodes-base.aiAgent",
      "position": [450, 300]
    },
    {
      "parameters": {
        "channel": "#urgent-orders",
        "message": "🚨 Urgent order detected: {{ $json.orderId }}"
      },
      "name": "Slack Alert",
      "type": "n8n-nodes-base.slack",
      "position": [650, 300]
    }
  ]
}
```

### Pre-Built Workflow Templates

**Template 1: Kafka → Webhook** (Event-Driven API Integration)
```
Kafka Trigger (topic: events)
  → Transform (map Kafka message to API payload)
  → HTTP Request (POST to webhook)
  → Error Handler (retry on failure)
```

**Template 2: Kafka → Database** (Event Sourcing)
```
Kafka Trigger (topic: user-events)
  → Transform (extract user data)
  → Postgres (INSERT into events table)
  → Error Handler (dead letter queue)
```

**Template 3: Kafka → Slack** (Real-Time Alerts)
```
Kafka Trigger (topic: errors)
  → Filter (error level >= ERROR)
  → Transform (format error message)
  → Slack (post to #alerts channel)
```

**Template 4: Webhook → Kafka** (API to Event Stream)
```
Webhook Trigger (POST /api/events)
  → Transform (validate and enrich)
  → Kafka Producer (publish to events topic)
  → HTTP Response (200 OK)
```

**Template 5: Kafka → AI Agent → Action** (AI-Driven Workflow, using MCP)
```
MCP Kafka Trigger (topic: support-tickets)
  → AI Agent (classify urgency)
  → Switch Node (route by urgency)
    → High: Slack Alert + Jira Ticket
    → Medium: Email Notification
    → Low: Database Log
```

### SpecWeave Plugin Commands

```bash
# List available n8n workflow templates
/specweave-n8n:workflow-list

# Create workflow from template
/specweave-n8n:workflow-create --template kafka-to-webhook --topic orders --webhook-url https://api.example.com/orders

# Setup Kafka credentials in n8n
/specweave-n8n:kafka-credentials-setup

# Deploy n8n instance (Docker)
/specweave-n8n:deploy --kafka-cluster kafka.example.com:9092
```

### n8n Kafka Credentials Schema

```json
{
  "name": "Kafka Production",
  "type": "kafka",
  "data": {
    "brokers": "kafka.example.com:9092",
    "authentication": "sasl",
    "sasl": {
      "mechanism": "scram-sha-256",
      "username": "${KAFKA_USERNAME}",
      "password": "${KAFKA_PASSWORD}"
    },
    "ssl": {
      "enabled": true,
      "rejectUnauthorized": true,
      "ca": "${KAFKA_CA_CERT}"
    },
    "clientId": "n8n-client",
    "connectionTimeout": 30000,
    "requestTimeout": 30000
  }
}
```

## Risks

**Risk 1: n8n Kafka Node Breaking Changes**
- **Impact**: n8n updates may break existing workflows
- **Mitigation**: Pin n8n version in Docker deployment, test updates in staging
- **Probability**: Low (n8n is stable)
- **Severity**: Medium

**Risk 2: MCP Server Trigger Immaturity**
- **Impact**: Early adoption bugs, breaking API changes
- **Mitigation**: Mark as P2 (optional), provide fallback to native nodes
- **Probability**: Medium (new feature)
- **Severity**: Low (doesn't affect core functionality)

**Risk 3: Community Kafka Producer Node Abandonment**
- **Impact**: Node becomes unmaintained
- **Mitigation**: Fork if needed, contribute improvements upstream
- **Probability**: Medium
- **Severity**: Low (easy to fork)

**Risk 4: Workflow Template Drift**
- **Impact**: Templates become outdated with Kafka/n8n changes
- **Mitigation**: Quarterly template review, automated testing
- **Probability**: Medium
- **Severity**: Low

## Installation Workflow

### Quick Start (Native n8n Kafka Nodes)

```bash
# Deploy n8n with Kafka support
/specweave-n8n:deploy --kafka-cluster kafka.example.com:9092

# Output:
# ✓ Deploying n8n (Docker container)
# ✓ Installing Kafka Trigger node
# ✓ Installing Kafka Producer node (community)
# ✓ n8n accessible at http://localhost:5678
#
# Pre-built workflow templates:
# 1. Kafka → Webhook (event-driven API)
# 2. Kafka → Database (event sourcing)
# 3. Kafka → Slack (real-time alerts)
# 4. Webhook → Kafka (API to event stream)
#
# Setup Kafka credentials:
# /specweave-n8n:kafka-credentials-setup
```

### Advanced Setup (MCP Server Trigger)

```bash
# Deploy n8n with MCP support
/specweave-n8n:deploy --kafka-cluster kafka.example.com:9092 --enable-mcp

# Output:
# ✓ Deploying n8n with MCP support
# ✓ Detected MCP server: kanapuli/mcp-kafka
# ✓ Configuring MCP Server Trigger node
#
# AI-driven workflow templates:
# 1. Kafka → AI Agent → Action (intelligent routing)
# 2. Natural Language Event Processing
#
# Configure MCP server:
# /specweave-n8n:mcp-server-deploy
```

### Workflow Creation (CLI)

```bash
# Create Kafka → Webhook workflow
/specweave-n8n:workflow-create \
  --template kafka-to-webhook \
  --topic orders \
  --webhook-url https://api.example.com/orders

# Output:
# ✓ Workflow created: "Orders to API"
# ✓ Kafka Trigger: topic=orders, group=n8n-consumer-group
# ✓ HTTP Request: POST https://api.example.com/orders
#
# Import to n8n:
# 1. Open n8n: http://localhost:5678
# 2. Import workflow from .specweave/n8n/workflows/orders-to-api.json
# 3. Configure Kafka credentials
# 4. Activate workflow
```

## Related Decisions

- **ADR-0035**: Multi-Plugin Architecture - Defines `specweave-n8n` plugin scope
- **ADR-0036**: MCP Server Selection - Kafka MCP servers power n8n MCP integration
- **ADR-0037**: Terraform Provider Strategy - Deploy n8n infrastructure
- **ADR-0038**: Monitoring Stack Selection - Monitor n8n workflow performance

## References

- [n8n Kafka Trigger Node Documentation](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.kafkatrigger/)
- [n8n MCP Integration Announcement (Q1 2025)](https://n8n.io/blog/mcp-integration/)
- [n8n Community Kafka Producer Node](https://github.com/n8n-io/n8n-nodes-kafka)
- [n8n Workflow Templates](https://n8n.io/workflows/)
- [kcat (kafkacat) Documentation](https://github.com/edenhill/kcat)
- [SPEC-035: US-014 n8n Kafka Integration](../../specs/default/spec-035-kafka-plugin.md#us-014-n8n-kafka-integration-priority-p2)

---

**Last Updated**: 2025-11-15
**Author**: Architect Agent
**Increment**: 0035-kafka-event-streaming-plugin
