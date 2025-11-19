---
increment: 0035-kafka-event-streaming-plugin
title: "Kafka Event Streaming Integration Plugin"
status: planned
created: 2025-11-15
architecture_docs:
  - ../../docs/internal/architecture/system-design.md#kafka-event-streaming-plugin-suite
  - ../../docs/internal/architecture/adr/0035-kafka-multi-plugin-architecture.md
  - ../../docs/internal/architecture/adr/0036-kafka-mcp-server-selection.md
  - ../../docs/internal/architecture/adr/0037-kafka-terraform-provider-strategy.md
  - ../../docs/internal/architecture/adr/0038-kafka-monitoring-stack-selection.md
  - ../../docs/internal/architecture/adr/0039-n8n-kafka-integration-approach.md
diagrams:
  - ../../docs/internal/architecture/diagrams/kafka-plugin/system-context.mmd
  - ../../docs/internal/architecture/diagrams/kafka-plugin/system-container.mmd
  - ../../docs/internal/architecture/diagrams/kafka-plugin/component-diagram.mmd
---

# Implementation Plan: Kafka Event Streaming Integration Plugin

## Quick Overview

This increment creates a comprehensive Kafka event streaming plugin ecosystem for SpecWeave, enabling seamless integration with Apache Kafka, Confluent Cloud, Redpanda, AWS MSK, and Azure Event Hubs. The plugin suite includes MCP server integration, CLI tools (kcat), Terraform modules, and full observability stack (Prometheus/Grafana/OpenTelemetry).

**Complete Specification**: [SPEC-035: Kafka Event Streaming Integration Plugin](../../docs/internal/specs/default/spec-035-kafka-plugin.md)

---

## Architecture Overview

**Complete Architecture**: [System Design - Kafka Event Streaming Plugin Suite](../../docs/internal/architecture/system-design.md#kafka-event-streaming-plugin-suite)

### Key Architectural Decisions

1. **Multi-Plugin Architecture** ([ADR-0035](../../docs/internal/architecture/adr/0035-kafka-multi-plugin-architecture.md))
   - **Decision**: Create 4 separate plugins (specweave-kafka, specweave-confluent, specweave-kafka-streams, specweave-n8n)
   - **Rationale**: Modular installation, focused skills, 75% context reduction
   - **Trade-offs**: More maintenance vs better UX

2. **MCP Server Selection** ([ADR-0036](../../docs/internal/architecture/adr/0036-kafka-mcp-server-selection.md))
   - **Decision**: Support all 4 MCP servers (kanapuli, tuannvm, Joel-hanson, Confluent) with auto-detection
   - **Rationale**: Maximum flexibility, graceful fallback, vendor neutrality
   - **Trade-offs**: Testing overhead vs user choice

3. **Terraform Provider Strategy** ([ADR-0037](../../docs/internal/architecture/adr/0037-kafka-terraform-provider-strategy.md))
   - **Decision**: Multi-provider approach (Confluent, Mongey, AWS, Azure)
   - **Rationale**: Best-in-class features per platform
   - **Trade-offs**: Configuration complexity vs platform flexibility

4. **Monitoring Stack** ([ADR-0038](../../docs/internal/architecture/adr/0038-kafka-monitoring-stack-selection.md))
   - **Decision**: Prometheus + Grafana (default), OpenTelemetry (optional), cloud-native (fallback)
   - **Rationale**: Industry standard, distributed tracing support
   - **Trade-offs**: Setup complexity vs feature completeness

5. **n8n Integration** ([ADR-0039](../../docs/internal/architecture/adr/0039-n8n-kafka-integration-approach.md))
   - **Decision**: Native n8n nodes + MCP Server Trigger (hybrid)
   - **Rationale**: Stability (native) + AI capabilities (MCP)
   - **Trade-offs**: Two integration paths vs future-proof

### Architecture Diagrams

**C4 Level 1: System Context**
- [system-context.mmd](../../docs/internal/architecture/diagrams/kafka-plugin/system-context.mmd)
- Shows: Developers, DevOps, SRE → SpecWeave → Kafka platforms + tools

**C4 Level 2: Container Diagram**
- [system-container.mmd](../../docs/internal/architecture/diagrams/kafka-plugin/system-container.mmd)
- Shows: 4 plugins, Kafka infrastructure, observability stack, MCP layer

**C4 Level 3: Component Diagram**
- [component-diagram.mmd](../../docs/internal/architecture/diagrams/kafka-plugin/component-diagram.mmd)
- Shows: specweave-kafka internals (skills, agents, commands, lib, terraform)

---

## Technology Stack

**Core Dependencies**:
- **Runtime**: Node.js 18+, TypeScript 5.0+
- **Kafka Client**: kafkajs (Node.js), franz-go (Go, for MCP servers)
- **MCP Servers**: kanapuli/mcp-kafka, tuannvm/kafka-mcp-server, Confluent MCP server
- **CLI Tools**: kcat (primary), kcli, kaf, kafkactl
- **IaC**: Terraform 1.5+ (Confluent, Mongey, AWS, AzureRM providers)
- **Monitoring**: Prometheus, Grafana, kafka_exporter, JMX Exporter, OpenTelemetry
- **Workflow**: n8n (Docker or cloud-hosted)

**Platforms Supported**:
- Apache Kafka 3.6+ (self-hosted, KRaft mode)
- Confluent Cloud (managed Kafka)
- Redpanda 23.3+ (Kafka-compatible)
- AWS MSK (Amazon Managed Streaming for Kafka)
- Azure Event Hubs (Kafka API)

**Testing**:
- **Unit**: Jest (TypeScript utilities, config validation)
- **Integration**: Playwright (MCP server interaction, Terraform execution)
- **E2E**: testcontainers-kafka (full message flow)
- **Performance**: k6 (throughput benchmarks)

---

## Component Design

### Plugin 1: specweave-kafka (Core, P1)

**Size**: ~8K tokens
**Purpose**: Core Apache Kafka operations, MCP integration, monitoring

**Components**:

**Skills** (5):
- `kafka-architecture` - Deployment patterns, scaling strategies
- `kafka-topic-design` - Partitioning, replication, retention
- `kafka-monitoring` - Prometheus, Grafana, OpenTelemetry setup
- `kafka-mcp-integration` - MCP server configuration, operations
- `kafka-cli-tools` - kcat, kcli, kaf usage patterns

**Agents** (3):
- `kafka-architect` - Architecture decisions, capacity planning
- `kafka-devops` - Deployment, configuration management
- `kafka-observability` - Monitoring setup, alerting

**Commands** (5):
- `/specweave-kafka:deploy` - Deploy Kafka cluster (Terraform)
- `/specweave-kafka:monitor-setup` - Setup monitoring stack
- `/specweave-kafka:mcp-configure` - Configure MCP server
- `/specweave-kafka:dev-env` - Start/stop local dev cluster
- `/specweave-kafka:terraform-init` - Generate Terraform modules

**Terraform Modules**:
- `self-hosted/cluster` - Docker Compose Kafka cluster
- `aws-msk/cluster` - AWS MSK cluster provisioning
- `azure-event-hubs/namespace` - Azure Event Hubs provisioning
- `monitoring/prometheus-grafana` - Observability stack

**Code Templates**:
- `producer-template` - kafkajs producer boilerplate
- `consumer-template` - kafkajs consumer boilerplate
- `testing-template` - testcontainers-kafka integration tests

**Library** (TypeScript):
- `MCP Server Detector` - Auto-detect available MCP servers
- `Terraform Generator` - Generate Terraform modules
- `Config Validator` - Validate Kafka configuration
- `Monitoring Setup` - Deploy Prometheus, Grafana
- `kcat Wrapper` - CLI tool integration

---

### Plugin 2: specweave-confluent (Managed Service, P1)

**Size**: ~5K tokens
**Purpose**: Confluent Cloud integration, Schema Registry, ksqlDB

**Components**:

**Skills** (5):
- `confluent-cloud-setup` - Cluster provisioning, authentication
- `confluent-terraform` - Terraform module generation
- `confluent-schema-registry` - Avro/Protobuf schemas
- `confluent-connectors` - Source/sink connectors
- `confluent-ksqldb` - Stream processing SQL

**Agents** (3):
- `confluent-architect` - Confluent Cloud architecture
- `confluent-cost-optimizer` - Cost estimation, optimization
- `confluent-security-engineer` - RBAC, ACLs, encryption

**Commands** (4):
- `/specweave-confluent:cluster-create` - Provision Confluent Cloud cluster
- `/specweave-confluent:cost-estimate` - Estimate monthly costs
- `/specweave-confluent:connector-deploy` - Deploy Kafka Connect connector
- `/specweave-confluent:schema-register` - Register Avro/Protobuf schema

**Terraform Modules**:
- `confluent-cloud/environment` - Confluent Cloud environment
- `confluent-cloud/cluster` - Kafka cluster
- `confluent-cloud/connector` - Kafka Connect connector
- `confluent-cloud/schema-registry` - Schema Registry configuration

**Integrations**:
- Confluent MCP server (natural language management)
- Confluent CLI (command-line operations)
- Confluent REST API (programmatic access)

---

### Plugin 3: specweave-kafka-streams (Stream Processing, P2)

**Size**: ~4K tokens
**Purpose**: Kafka Streams API, Red Hat AMQ Streams, OpenShift

**Components**:

**Skills** (4):
- `kafka-streams-api` - Stream processing patterns
- `kafka-streams-testing` - Testing strategies
- `redhat-amq-streams` - Red Hat AMQ Streams (Strimzi)
- `openshift-operator-deployment` - OpenShift operator deployment

**Agents** (3):
- `streams-developer` - Stream processing development
- `openshift-sre` - OpenShift cluster operations
- `stateful-transformation-expert` - RocksDB state stores

**Commands** (3):
- `/specweave-kafka-streams:app-scaffold` - Generate Kafka Streams application
- `/specweave-kafka-streams:openshift-deploy` - Deploy to OpenShift
- `/specweave-kafka-streams:rocksdb-tune` - Tune RocksDB state store

**Terraform Modules**:
- `openshift/amq-streams` - Red Hat AMQ Streams operator
- `kafka-streams/app` - Kafka Streams application deployment
- `kafka-streams/rocksdb` - RocksDB state store configuration

**Integrations**:
- Strimzi Kafka operator (Kubernetes-native Kafka)
- Red Hat AMQ Streams (enterprise Kafka on OpenShift)

---

### Plugin 4: specweave-n8n (Workflow Automation, P2)

**Size**: ~4K tokens
**Purpose**: n8n workflow automation, AI-driven event processing

**Components**:

**Skills** (3):
- `n8n-kafka-trigger` - Kafka Trigger node usage
- `n8n-mcp-integration` - MCP Server Trigger (2025 feature)
- `n8n-workflow-templates` - Pre-built workflow templates

**Agents** (2):
- `n8n-workflow-designer` - Workflow design patterns
- `n8n-integration-specialist` - Service integrations

**Commands** (3):
- `/specweave-n8n:workflow-create` - Create workflow from template
- `/specweave-n8n:kafka-trigger-setup` - Configure Kafka Trigger node
- `/specweave-n8n:mcp-server-deploy` - Deploy MCP Server Trigger

**Workflow Templates**:
- `kafka-to-webhook` - Event-driven API integration
- `kafka-to-database` - Event sourcing pattern
- `kafka-to-slack` - Real-time alerts
- `webhook-to-kafka` - API to event stream
- `kafka-ai-agent-action` - AI-driven workflow (MCP)

**Integrations**:
- n8n Kafka Trigger node (native)
- n8n Kafka Producer node (community)
- n8n MCP Server Trigger (2025 feature)

---

## Data Models

### Plugin Manifest (plugin.json)

```json
{
  "name": "specweave-kafka",
  "description": "Core Apache Kafka integration with MCP, CLI tools, monitoring",
  "version": "1.0.0",
  "author": {
    "name": "SpecWeave Team",
    "url": "https://spec-weave.com"
  },
  "repository": "https://github.com/anton-abyzov/specweave",
  "homepage": "https://spec-weave.com/plugins/kafka",
  "license": "MIT",
  "keywords": ["kafka", "mcp", "event-streaming", "monitoring", "terraform"]
}
```

### MCP Server Configuration (.specweave/kafka/mcp-config.json)

```json
{
  "mcp": {
    "preferredServer": "tuannvm",
    "fallbackServers": ["kanapuli", "joel-hanson"],
    "servers": {
      "kanapuli": {
        "enabled": true,
        "path": "~/.mcp-servers/kanapuli",
        "config": {
          "brokers": ["localhost:9092"],
          "clientId": "specweave-kafka",
          "auth": "SASL_PLAINTEXT"
        }
      },
      "tuannvm": {
        "enabled": true,
        "path": "~/.mcp-servers/tuannvm",
        "config": {
          "brokers": ["kafka.example.com:9093"],
          "sasl": {
            "mechanism": "SCRAM-SHA-256",
            "username": "${KAFKA_USERNAME}",
            "password": "${KAFKA_PASSWORD}"
          }
        }
      }
    }
  }
}
```

### Kafka Configuration (.specweave/kafka/brokers.yml)

```yaml
brokers:
  - id: 1
    host: kafka-broker-1.example.com
    port: 9092
    rack: us-west-2a
  - id: 2
    host: kafka-broker-2.example.com
    port: 9092
    rack: us-west-2b

authentication:
  mechanism: SCRAM-SHA-256
  username: ${KAFKA_USERNAME}
  password: ${KAFKA_PASSWORD}

tls:
  enabled: true
  ca_cert: /path/to/ca-cert.pem
  client_cert: /path/to/client-cert.pem
  client_key: /path/to/client-key.pem
```

### Topic Configuration (.specweave/kafka/topics/orders.yml)

```yaml
name: orders
partitions: 12
replication_factor: 3
config:
  cleanup.policy: delete
  retention.ms: 604800000  # 7 days
  compression.type: lz4
  min.insync.replicas: 2
  max.message.bytes: 1048576  # 1 MB
```

---

## Integration Points

### MCP Servers

**kanapuli/mcp-kafka** (TypeScript):
- Basic Kafka operations (produce, consume, topic management)
- SASL_PLAINTEXT, PLAINTEXT authentication
- Installation: `npm install -g kanapuli-mcp-kafka`

**tuannvm/kafka-mcp-server** (Go):
- Advanced SASL support (SCRAM-SHA-256, SCRAM-SHA-512)
- Based on franz-go client (high performance)
- Installation: Download binary from GitHub releases

**Confluent MCP Server** (Proprietary):
- Natural language cluster management
- Flink SQL integration
- Confluent Cloud only
- Installation: Confluent Cloud account + API key

### CLI Tools

**kcat** (Primary):
- Kafka metadata inspection
- Message produce/consume
- Avro/Schema Registry support
- Installation: `brew install kcat` (macOS), `apt install kafkacat` (Linux)

**kcli, kaf, kafkactl** (Alternative):
- Multi-environment management
- REST Proxy integration
- Installation: Download from GitHub releases

### Terraform Providers

**Confluent Provider**:
```hcl
terraform {
  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "~> 1.60"
    }
  }
}
```

**Mongey/kafka Provider**:
```hcl
terraform {
  required_providers {
    kafka = {
      source  = "Mongey/kafka"
      version = "~> 0.7"
    }
  }
}
```

**AWS Provider** (for MSK):
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### Monitoring Stack

**Prometheus + Grafana**:
- JMX Exporter: Kafka broker JVM metrics
- kafka_exporter: Topic, consumer lag metrics
- Grafana dashboards: Cluster overview, topic performance, consumer monitoring

**OpenTelemetry**:
- OTel Collector: Kafka Metrics Receiver
- OTel Java Agent: Producer/consumer instrumentation
- Jaeger: Distributed tracing backend

---

## File Structure

```
plugins/
├── specweave-kafka/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── skills/
│   │   ├── kafka-architecture/SKILL.md
│   │   ├── kafka-topic-design/SKILL.md
│   │   ├── kafka-monitoring/SKILL.md
│   │   ├── kafka-mcp-integration/SKILL.md
│   │   └── kafka-cli-tools/SKILL.md
│   ├── agents/
│   │   ├── kafka-architect/AGENT.md
│   │   ├── kafka-devops/AGENT.md
│   │   └── kafka-observability/AGENT.md
│   ├── commands/
│   │   ├── deploy.md
│   │   ├── monitor-setup.md
│   │   ├── mcp-configure.md
│   │   ├── dev-env.md
│   │   └── terraform-init.md
│   ├── lib/
│   │   ├── mcp-detector.ts
│   │   ├── terraform-generator.ts
│   │   ├── config-validator.ts
│   │   ├── monitoring-setup.ts
│   │   └── kcat-wrapper.ts
│   ├── terraform/
│   │   ├── self-hosted/cluster/
│   │   ├── aws-msk/cluster/
│   │   ├── azure-event-hubs/namespace/
│   │   └── monitoring/prometheus-grafana/
│   └── templates/
│       ├── producer-template.ts
│       ├── consumer-template.ts
│       └── testing-template.test.ts
│
├── specweave-confluent/
│   ├── .claude-plugin/plugin.json
│   ├── skills/ (5 skills)
│   ├── agents/ (3 agents)
│   ├── commands/ (4 commands)
│   ├── lib/ (TypeScript utilities)
│   └── terraform/ (Confluent modules)
│
├── specweave-kafka-streams/
│   ├── .claude-plugin/plugin.json
│   ├── skills/ (4 skills)
│   ├── agents/ (3 agents)
│   ├── commands/ (3 commands)
│   ├── lib/ (TypeScript utilities)
│   └── terraform/ (OpenShift modules)
│
└── specweave-n8n/
    ├── .claude-plugin/plugin.json
    ├── skills/ (3 skills)
    ├── agents/ (2 agents)
    ├── commands/ (3 commands)
    └── workflows/ (n8n workflow templates)
```

---

## Test Strategy

### Unit Testing (Jest)

**Target Coverage**: 90%

**Test Files**:
- `mcp-detector.test.ts` - MCP server detection logic
- `terraform-generator.test.ts` - Terraform module generation
- `config-validator.test.ts` - Configuration schema validation
- `kcat-wrapper.test.ts` - CLI tool integration

**Example Test**:
```typescript
describe('MCP Server Detector', () => {
  it('should detect kanapuli MCP server', async () => {
    const detector = new MCPServerDetector();
    const server = await detector.detectPreferredServer();
    expect(server).toBe('kanapuli');
  });

  it('should fallback to CLI-only mode if no MCP server', async () => {
    const detector = new MCPServerDetector();
    await expect(detector.detectPreferredServer()).rejects.toThrow('No MCP server available');
  });
});
```

### Integration Testing (Playwright)

**Target Coverage**: 85%

**Test Scenarios**:
- End-to-end Kafka message flow (produce → consume)
- Terraform deployment to localstack (AWS MSK simulation)
- Docker Compose cluster startup/shutdown
- MCP server interaction (via Claude Code Task tool)

**Example Test**:
```typescript
test('Kafka message flow', async ({ page }) => {
  // Start local Kafka cluster
  await page.getByText('/specweave-kafka:dev-env start').click();
  await page.waitForText('Kafka cluster started');

  // Produce message
  await page.getByText('/specweave-kafka:produce').click();
  await page.fill('topic', 'test-topic');
  await page.fill('message', '{"orderId": "12345"}');
  await page.click('Send');

  // Consume message
  await page.getByText('/specweave-kafka:consume').click();
  await page.fill('topic', 'test-topic');
  await page.click('Start Consuming');
  await page.waitForText('{"orderId": "12345"}');
});
```

### Performance Testing (k6)

**Target**: 100K+ messages/sec producer throughput

**Test Script**:
```javascript
import { check } from 'k6';
import kafka from 'k6/x/kafka';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 producers
    { duration: '1m', target: 100 },   // Sustain 100 producers
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  const message = JSON.stringify({ orderId: Math.random() });
  const result = kafka.produce('kafka.example.com:9092', 'test-topic', message);
  check(result, { 'message sent': (r) => r === true });
}
```

### Security Testing

**Validation**:
- SASL/SCRAM authentication (username/password)
- SSL/TLS encryption (client certificates)
- ACL enforcement (topic-level permissions)
- Credential rotation (manual)

**Test Cases**:
- Valid credentials → Successful connection
- Invalid credentials → Connection refused
- No TLS → Connection refused (production mode)
- Unauthorized topic access → Access denied

---

## Deployment Considerations

### NPM Package Distribution

**Package Structure**:
```json
{
  "name": "specweave-kafka",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "specweave-kafka": "dist/cli.js"
  },
  "files": [
    "dist/",
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "terraform/",
    "templates/"
  ]
}
```

**Installation**:
```bash
# Via Claude Code marketplace (recommended)
/plugin install specweave-kafka

# Via npm (manual)
npm install -g specweave-kafka
```

### Plugin Marketplace Registration

**Marketplace Entry** (`.claude-plugin/marketplace.json`):
```json
{
  "name": "specweave-kafka",
  "description": "Core Apache Kafka integration with MCP, CLI tools, monitoring",
  "version": "1.0.0",
  "source": "npm:specweave-kafka",
  "categories": ["event-streaming", "infrastructure", "monitoring"],
  "tags": ["kafka", "mcp", "terraform", "prometheus"],
  "screenshots": [
    "https://spec-weave.com/assets/kafka-dashboard.png",
    "https://spec-weave.com/assets/kafka-mcp-demo.gif"
  ]
}
```

**Registration**:
```bash
# Automatic (via specweave init)
claude plugin marketplace add anton-abyzov/specweave

# Manual (if needed)
claude plugin marketplace add npm:specweave-kafka
```

---

## Security Considerations

### Secrets Management

**Environment Variables** (12-factor app):
```bash
export KAFKA_USERNAME="admin"
export KAFKA_PASSWORD="secret"
export KAFKA_CA_CERT="/path/to/ca-cert.pem"
export CONFLUENT_API_KEY="xxx"
export CONFLUENT_API_SECRET="yyy"
```

**`.env` Files** (local development):
```bash
# .specweave/kafka/.env
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=secret
```

**Terraform Variables** (production):
```hcl
variable "kafka_username" {
  description = "Kafka SASL username"
  type        = string
  sensitive   = true
}

variable "kafka_password" {
  description = "Kafka SASL password"
  type        = string
  sensitive   = true
}
```

### Authentication Methods

**SASL/SCRAM** (recommended):
- SCRAM-SHA-256 (default)
- SCRAM-SHA-512 (high security)

**TLS Client Certificates** (mutual TLS):
- Client certificate authentication
- No username/password needed
- Higher security

**OAuth/OIDC** (Confluent Cloud):
- Single sign-on (SSO)
- RBAC integration
- Enterprise-grade

### ACL Configuration

**Topic-Level Permissions**:
```yaml
# .specweave/kafka/acls.yml
acls:
  - principal: User:producer-app
    resource: Topic:orders
    operation: Write
    permission: Allow

  - principal: User:consumer-app
    resource: Topic:orders
    operation: Read
    permission: Allow

  - principal: User:admin
    resource: Topic:*
    operation: All
    permission: Allow
```

---

## Performance Targets

### NFR-001: Performance

- Plugin installation: < 30 seconds
- MCP server startup: < 5 seconds
- Local Kafka cluster startup: < 60 seconds (Docker Compose)
- Terraform apply (local): < 5 minutes
- Skill activation: < 1 second

### NFR-003: Scalability

- Kafka clusters: Up to 100 brokers
- Topics: Up to 1000 partitions per topic
- Consumer groups: Up to 100 consumers
- Multi-region deployments: Supported via Terraform

### Message Throughput Benchmarks

**Producer**:
- 100K+ messages/sec (batching enabled, compression: lz4)
- 10MB/sec (sustained throughput)

**Consumer**:
- 50K+ messages/sec (parallel processing, 10 consumers)
- 5MB/sec (sustained throughput)

**End-to-End Latency**:
- p50: < 10ms
- p95: < 100ms
- p99: < 500ms

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Deliverables**:
- Plugin structure (plugin.json, skills, agents, commands)
- MCP server integration (kanapuli, Joel-hanson)
- kcat CLI integration
- Local Docker Compose environment
- Basic skills (kafka-architecture, kafka-topic-design)

**Success Criteria**:
- Working local Kafka setup (docker-compose up)
- MCP server auto-detection
- kcat CLI wrapper functional

**Tasks** (example):
- T-001: Create plugin structure for specweave-kafka
- T-002: Implement MCP Server Detector (kanapuli, Joel-hanson)
- T-003: Create kcat CLI wrapper
- T-004: Generate Docker Compose Kafka cluster
- T-005: Write kafka-architecture skill

### Phase 2: Infrastructure (Weeks 3-4)

**Deliverables**:
- Terraform modules (Apache Kafka, AWS MSK, Confluent Cloud)
- Configuration management (YAML schemas)
- Producer/consumer templates (Node.js/TypeScript)
- Integration testing utilities (testcontainers-kafka)

**Success Criteria**:
- Terraform modules provision Kafka clusters
- Producer/consumer templates generate working code
- Integration tests pass

**Tasks** (example):
- T-006: Create Terraform module for self-hosted Kafka
- T-007: Create Terraform module for AWS MSK
- T-008: Generate producer template (kafkajs)
- T-009: Generate consumer template (kafkajs)
- T-010: Write integration tests (testcontainers-kafka)

### Phase 3: Observability (Weeks 5-6)

**Deliverables**:
- Prometheus kafka_exporter integration
- Grafana dashboards (cluster, topics, consumers)
- OpenTelemetry instrumentation
- Operational runbooks

**Success Criteria**:
- Prometheus scrapes Kafka metrics
- Grafana dashboards render correctly
- OpenTelemetry traces visible in Jaeger

**Tasks** (example):
- T-011: Deploy kafka_exporter (Docker)
- T-012: Configure Prometheus scrape targets
- T-013: Import Grafana dashboards (IDs: 7589, 10973, 11962)
- T-014: Instrument producer/consumer with OpenTelemetry
- T-015: Write operational runbooks (broker failure, consumer lag)

### Phase 4: Advanced Features (Weeks 7-8)

**Deliverables**:
- Schema Registry integration (Confluent)
- n8n Kafka nodes (Trigger, Producer)
- Kafka Streams templates (Java/Scala)
- ksqlDB support
- Security hardening (SASL/SCRAM, TLS)
- Capacity planning tools

**Success Criteria**:
- Schema Registry registers Avro schemas
- n8n workflows trigger on Kafka events
- Kafka Streams application deploys successfully
- Security audit passes

**Tasks** (example):
- T-016: Integrate Confluent Schema Registry
- T-017: Deploy n8n with Kafka Trigger node
- T-018: Create Kafka Streams application template
- T-019: Configure SASL/SCRAM authentication
- T-020: Build capacity planning calculator

### Phase 5: Documentation & Polish (Weeks 9-10)

**Deliverables**:
- Comprehensive documentation (quick start, architecture, API)
- Video tutorials (YouTube)
- Example applications (e-commerce, log aggregation)
- Performance optimization
- Bug fixes and refinements

**Success Criteria**:
- Documentation complete (>90% coverage)
- Video tutorials published
- Example applications working
- Performance benchmarks met

**Tasks** (example):
- T-021: Write quick start guide (10-minute setup)
- T-022: Record video tutorial (Kafka setup to first message)
- T-023: Build example e-commerce application
- T-024: Optimize producer throughput (batching, compression)
- T-025: Fix bugs from user feedback

---

## Success Metrics

### Metric 1: Adoption Rate
**Target**: 30% of SpecWeave users enable Kafka plugin within 3 months
**Measurement**: Plugin installation analytics

### Metric 2: Time to First Message
**Target**: Users send first Kafka message within 10 minutes of installation
**Measurement**: Telemetry tracking

### Metric 3: Test Coverage
**Target**: >85% code coverage for plugin components
**Measurement**: Jest/Playwright test reports

### Metric 4: Platform Support
**Target**: 100% coverage for Apache Kafka, Confluent Cloud, AWS MSK, Redpanda, Azure Event Hubs
**Measurement**: Integration test suite execution

### Metric 5: Documentation Quality
**Target**: >90% of users complete quick start without support
**Measurement**: User surveys

---

## Risks & Mitigation

### Risk 1: MCP Server Compatibility
- **Impact**: New Kafka versions may break MCP servers
- **Mitigation**: Version matrix testing, pin server versions
- **Probability**: Low
- **Severity**: Medium

### Risk 2: Terraform Provider Updates
- **Impact**: Breaking changes in Confluent/Mongey providers
- **Mitigation**: Pin provider versions, test updates in staging
- **Probability**: Medium
- **Severity**: Medium

### Risk 3: n8n MCP Trigger Immaturity
- **Impact**: Early adoption bugs (2025 feature)
- **Mitigation**: Mark as P2 (optional), fallback to native nodes
- **Probability**: Medium
- **Severity**: Low

### Risk 4: Monitoring Overhead
- **Impact**: Prometheus/Grafana consume resources
- **Mitigation**: Resource sizing guidelines, cloud-managed options
- **Probability**: Low
- **Severity**: Low

---

## Related Documentation

**Architecture**:
- [System Design - Kafka Plugin Suite](../../docs/internal/architecture/system-design.md#kafka-event-streaming-plugin-suite)
- [ADR-0035: Multi-Plugin Architecture](../../docs/internal/architecture/adr/0035-kafka-multi-plugin-architecture.md)
- [ADR-0036: MCP Server Selection](../../docs/internal/architecture/adr/0036-kafka-mcp-server-selection.md)
- [ADR-0037: Terraform Provider Strategy](../../docs/internal/architecture/adr/0037-kafka-terraform-provider-strategy.md)
- [ADR-0038: Monitoring Stack Selection](../../docs/internal/architecture/adr/0038-kafka-monitoring-stack-selection.md)
- [ADR-0039: n8n Integration Approach](../../docs/internal/architecture/adr/0039-n8n-kafka-integration-approach.md)

**Diagrams**:
- [System Context (C4 Level 1)](../../docs/internal/architecture/diagrams/kafka-plugin/system-context.mmd)
- [Container Diagram (C4 Level 2)](../../docs/internal/architecture/diagrams/kafka-plugin/system-container.mmd)
- [Component Diagram (C4 Level 3)](../../docs/internal/architecture/diagrams/kafka-plugin/component-diagram.mmd)

**Living Specs**:
- [SPEC-035: Kafka Event Streaming Integration Plugin](../../docs/internal/specs/default/spec-035-kafka-plugin.md)

**External Resources**:
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Cloud Documentation](https://docs.confluent.io/)
- [MCP Protocol Specification](https://github.com/anthropics/mcp)
- [kcat Documentation](https://github.com/edenhill/kcat)

---

**Last Updated**: 2025-11-15
**Status**: Planned
**Estimated Effort**: 3-4 weeks (10 weeks total including documentation)
