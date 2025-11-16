# specweave-kafka

**Apache Kafka Event Streaming Integration Plugin for SpecWeave**

Comprehensive plugin providing MCP server integration, CLI tools (kcat), Terraform infrastructure modules, and full observability stack (Prometheus/Grafana/OpenTelemetry) for Apache Kafka.

## Features

### 🚀 Core Capabilities

- **MCP Server Integration**: Auto-detect and configure 4 MCP servers (kanapuli, tuannvm, Joel-hanson, Confluent)
- **CLI Tool Wrappers**: Type-safe TypeScript wrappers for kcat, kcli, kaf, kafkactl
- **Multi-Platform Support**: Apache Kafka, Confluent Cloud, Redpanda, AWS MSK, Azure Event Hubs
- **Infrastructure as Code**: Terraform modules for all major platforms
- **Local Development**: Docker Compose templates (Kafka KRaft, Redpanda)
- **Observability**: Prometheus, Grafana dashboards, OpenTelemetry instrumentation

### 📚 Skills (6)

**Organized for Maximum Efficiency**: Skills are separated by concern for better activation and productivity.

- `kafka-architecture` - Event-driven patterns, CQRS, saga patterns, data modeling, capacity planning
- `kafka-mcp-integration` - MCP server configuration and operations
- `kafka-cli-tools` - kcat, kcli, kaf, kafkactl usage patterns
- `kafka-iac-deployment` - Terraform modules, multi-cloud infrastructure deployment (AWS MSK, Azure Event Hubs, Apache Kafka)
- `kafka-kubernetes` - Strimzi Operator, Confluent Operator, Bitnami Helm chart deployment patterns
- `kafka-observability` - Prometheus + Grafana setup, JMX exporter, 5 dashboards, 14 alerting rules, SLO definitions

### 🤖 Agents (3)

- `kafka-architect` - Architecture decisions, capacity planning, design patterns
- `kafka-devops` - Deployment, configuration management, troubleshooting
- `kafka-observability` - Monitoring setup, dashboarding, alerting

### ⚡ Commands (4)

- `/specweave-kafka:deploy` - Deploy Kafka cluster via Terraform (AWS MSK, Azure Event Hubs, Apache Kafka)
- `/specweave-kafka:monitor-setup` - Setup Prometheus/Grafana monitoring stack with 5 dashboards and 14 alerts
- `/specweave-kafka:mcp-configure` - Configure MCP server integration (auto-detects kanapuli, tuannvm, Joel-hanson, Confluent)
- `/specweave-kafka:dev-env` - Setup local development environment (Docker Compose: Kafka KRaft or Redpanda)

## Installation

### Prerequisites

- Node.js 18+
- Docker 20+ (for local development)
- Terraform 1.5+ (for infrastructure deployment)
- Claude Code (SpecWeave runtime)

### Install Plugin

```bash
# Via SpecWeave marketplace
specweave plugin install specweave-kafka

# Or via Claude Code plugin system
/plugin install specweave-kafka
```

## Quick Start

### 1. Start Local Kafka Cluster

```bash
/specweave-kafka:dev-env start
```

This starts a Kafka cluster (KRaft mode) with Schema Registry and Kafka UI on your local machine.

### 2. Configure MCP Server

```bash
/specweave-kafka:mcp-configure
```

Auto-detects available MCP servers and generates configuration.

### 3. Produce/Consume Messages

Use the provided code templates:

```javascript
// Producer example (plugins/specweave-kafka/templates/examples/nodejs-producer.js)
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'test-topic',
  messages: [{ value: 'Hello Kafka!' }]
});
```

### 4. Setup Monitoring

```bash
/specweave-kafka:monitor-setup
```

Deploys Prometheus, Grafana, and pre-built dashboards for Kafka monitoring.

## Architecture

### Skill Coordination

Skills work together in coordinated workflows:

**Deployment Workflow** (`/specweave-kafka:deploy`):
1. `kafka-architect` → Cluster sizing and partitioning strategy
2. `kafka-iac-deployment` → Generate Terraform modules
3. `kafka-kubernetes` → Kubernetes manifests (if K8s deployment)
4. `kafka-observability` → Monitoring stack configuration

**Monitoring Workflow** (`/specweave-kafka:monitor-setup`):
1. `kafka-observability` → JMX exporter configuration
2. `kafka-observability` → Prometheus scraping setup
3. `kafka-observability` → Grafana dashboard provisioning (5 dashboards)
4. `kafka-observability` → Alerting rules deployment (14 critical/high/warning alerts)

**Local Development** (`/specweave-kafka:dev-env`):
1. `kafka-cli-tools` → Docker Compose stack selection (Kafka or Redpanda)
2. `kafka-observability` → Monitoring integration
3. `kafka-mcp-integration` → Configure MCP server for local cluster

### Supported Platforms

| Platform | Auth Methods | Features |
|----------|-------------|----------|
| **Apache Kafka** | SASL/SCRAM, mTLS, PLAINTEXT | Full control, KRaft mode support |
| **Confluent Cloud** | API Keys | Managed, eCKUs, Schema Registry, ksqlDB |
| **Redpanda** | SASL/SCRAM | Kafka-compatible, faster startup, no JVM |
| **AWS MSK** | IAM, SASL | AWS integration, CloudWatch metrics |
| **Azure Event Hubs** | Azure AD | Azure integration, Kafka protocol |

### Terraform Modules

- `apache-kafka/` - Self-hosted Kafka on Kubernetes (Strimzi)
- `aws-msk/` - AWS MSK cluster provisioning
- `azure-event-hubs/` - Azure Event Hubs namespace
- `monitoring/` - Prometheus + Grafana stack

### MCP Servers

| Server | Language | Auth Support | Special Features |
|--------|----------|--------------|------------------|
| **kanapuli/mcp-kafka** | Node.js | SASL_PLAINTEXT | Basic operations |
| **tuannvm/kafka-mcp-server** | Go | SCRAM-SHA-256/512 | Advanced SASL |
| **Joel-hanson/kafka-mcp-server** | Python | Standard | Claude Desktop integration |
| **Confluent MCP** | Official | OAuth | Natural language, Flink SQL |

## Usage Examples

### Deploy to AWS MSK

```bash
/specweave-kafka:deploy aws-msk
```

Interactive prompts guide you through:
- Instance type selection
- Storage configuration
- Authentication setup
- VPC configuration

### Setup Security (SASL/SCRAM)

Use the provided configuration templates:

```bash
cp plugins/specweave-kafka/templates/security/sasl-scram-config.properties ./kafka-config.properties
```

Edit and apply:
- Broker configuration
- Client configuration
- User credentials (use secrets manager)

### Monitor Multiple Clusters

```bash
/specweave-kafka:monitor-setup --multi-cluster
```

Creates unified Grafana dashboard with cluster selector.

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires Docker)
npm run test:integration

# E2E tests (requires Kafka cluster)
npm run test:e2e

# Coverage report
npm run test:coverage
```

**Coverage Target**: 85-90%

## Documentation

- **Getting Started**: `.specweave/docs/public/guides/kafka-getting-started.md`
- **Advanced Usage**: `.specweave/docs/public/guides/kafka-advanced-usage.md`
- **Terraform Guide**: `.specweave/docs/public/guides/kafka-terraform.md`
- **Troubleshooting**: `.specweave/docs/public/guides/kafka-troubleshooting.md`
- **API Reference**: Generated via TypeDoc

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Related Plugins

- **specweave-confluent** - Confluent Cloud specific features
- **specweave-kafka-streams** - Kafka Streams + Red Hat AMQ Streams
- **specweave-n8n** - n8n workflow automation with Kafka

## License

MIT License - see [LICENSE](../../LICENSE)

## Support

- **Documentation**: https://spec-weave.com/docs/plugins/kafka
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Status**: ✅ Production Ready
