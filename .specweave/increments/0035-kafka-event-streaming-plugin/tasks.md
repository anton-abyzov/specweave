---
increment: 0035-kafka-event-streaming-plugin
title: "Kafka Event Streaming Integration Plugin - Tasks"
total_tasks: 100
test_mode: BDD
coverage_target: 85
structure: embedded-tests
created: 2025-11-15
---

# Tasks: Kafka Event Streaming Integration Plugin

**Total Tasks**: 100
**Test Strategy**: BDD with embedded test plans
**Coverage Target**: 85-90%
**Test Mode**: Red-Green-Refactor (TDD optional)

---

## Progress Summary

- **Phase 1 - Foundation & Core Plugin**: 0/30 tasks (0%)
- **Phase 2 - Platform Plugins**: 0/25 tasks (0%)
- **Phase 3 - Advanced Features**: 0/20 tasks (0%)
- **Phase 4 - Testing & Integration**: 0/15 tasks (0%)
- **Phase 5 - Documentation & Polish**: 0/10 tasks (0%)

**Overall**: 0/100 tasks (0%)

---

## Phase 1: Foundation & Core Plugin (30 tasks)

### T-001: Create specweave-kafka Plugin Structure

**Model**: ⚡ haiku
**AC**: AC-US1-01
**Priority**: P1
**Estimated**: 1h

**Test Plan** (BDD):
- **Given** SpecWeave plugin directory structure
- **When** creating `plugins/specweave-kafka/`
- **Then** all required subdirectories exist (skills, agents, commands, lib, terraform, templates)

**Test Cases**:
- Unit (`plugin-structure.test.ts`): validatePluginStructure, checkManifest → 95% coverage
- Integration: N/A
- E2E: Verify plugin loads in Claude Code → 100%

**Implementation**:
```bash
mkdir -p plugins/specweave-kafka/{.claude-plugin,skills,agents,commands,lib,terraform,templates}
```

**Files**:
- `plugins/specweave-kafka/.claude-plugin/plugin.json`
- `plugins/specweave-kafka/README.md`
- `plugins/specweave-kafka/package.json`

---

### T-002: Create plugin.json Manifest

**Model**: ⚡ haiku
**AC**: AC-US1-01
**Priority**: P1
**Estimated**: 30m

**Test Plan** (BDD):
- **Given** Claude Code plugin manifest specification
- **When** creating plugin.json with name, description, version, author
- **Then** manifest validates against schema and loads in Claude Code

**Test Cases**:
- Unit (`plugin-manifest.test.ts`): validateSchema, checkRequiredFields → 90% coverage
- Integration: Load plugin via `/plugin install specweave-kafka` → 100%

**Implementation**:
Create `plugins/specweave-kafka/.claude-plugin/plugin.json`:
```json
{
  "name": "specweave-kafka",
  "description": "Apache Kafka event streaming integration",
  "version": "1.0.0",
  "author": {"name": "SpecWeave Team"},
  "repository": "https://github.com/anton-abyzov/specweave",
  "license": "MIT"
}
```

**Files**:
- `plugins/specweave-kafka/.claude-plugin/plugin.json`

---

### T-003: Implement MCP Server Detector

**Model**: 🧠 sonnet
**AC**: AC-US1-02, AC-US1-03
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** multiple MCP servers may be installed (kanapuli, tuannvm, Joel-hanson, Confluent)
- **When** running detector to find available servers
- **Then** returns list of installed servers with capabilities and connection details

**Test Cases**:
- Unit (`mcp-detector.test.ts`): detectKanapuli, detectTuannvm, detectJoelHanson, detectConfluent, fallbackBehavior → 90% coverage
- Integration (`mcp-integration.test.ts`): connectToDetectedServer, executeOperation → 85% coverage
- E2E: Full detection → connection → operation flow → 95%

**Implementation**:
`plugins/specweave-kafka/lib/mcp/detector.ts`:
- Check process list for running MCP servers
- Query MCP server info endpoints
- Return ranked list (Confluent > tuannvm > kanapuli > Joel-hanson)

**Files**:
- `plugins/specweave-kafka/lib/mcp/detector.ts`
- `plugins/specweave-kafka/lib/mcp/types.ts`
- `tests/unit/mcp-detector.test.ts`
- `tests/integration/mcp-integration.test.ts`

---

### T-004: Create kcat CLI Wrapper

**Model**: 🧠 sonnet
**AC**: AC-US2-01, AC-US2-02
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** kcat CLI tool installed on system
- **When** wrapping kcat commands (produce, consume, metadata, query)
- **Then** TypeScript API provides type-safe kcat operations

**Test Cases**:
- Unit (`kcat-wrapper.test.ts`): produceMessage, consumeMessages, getMetadata, queryOffsets → 90% coverage
- Integration (`kcat-cli.test.ts`): executeKcatCommand, parseOutput, handleErrors → 85% coverage
- E2E: Full kcat produce → consume cycle → 95%

**Implementation**:
`plugins/specweave-kafka/lib/cli/kcat-wrapper.ts`:
- Spawn kcat process with args
- Parse JSON/text output
- Handle errors and timeouts
- Provide TypeScript interfaces

**Files**:
- `plugins/specweave-kafka/lib/cli/kcat-wrapper.ts`
- `plugins/specweave-kafka/lib/cli/types.ts`
- `tests/unit/kcat-wrapper.test.ts`
- `tests/integration/kcat-cli.test.ts`

---

### T-005: Create kafka-mcp-integration Skill

**Model**: ⚡ haiku
**AC**: AC-US1-04
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** user asks about MCP server setup
- **When** skill activates on keywords "kafka mcp", "mcp server"
- **Then** provides configuration examples and connection guidance

**Test Cases**:
- Unit: N/A (skill content validation)
- Integration (`skill-activation.test.ts`): activatesOnKeywords, providesExamples → 100%

**Implementation**:
Create `plugins/specweave-kafka/skills/kafka-mcp-integration/SKILL.md` with:
- Description with activation keywords
- MCP server comparison table
- Configuration examples for all 4 servers
- Troubleshooting guide

**Files**:
- `plugins/specweave-kafka/skills/kafka-mcp-integration/SKILL.md`

---

### T-006: Create kafka-cli-tools Skill

**Model**: ⚡ haiku
**AC**: AC-US2-03
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** user asks about CLI tools
- **When** skill activates on keywords "kcat", "kafka cli"
- **Then** provides usage examples and command reference

**Test Cases**:
- Unit: N/A (skill content)
- Integration (`skill-activation.test.ts`): activatesOnKeywords → 100%

**Implementation**:
Create `plugins/specweave-kafka/skills/kafka-cli-tools/SKILL.md` with:
- kcat command examples (produce, consume, metadata)
- kcli, kaf, kafkactl comparisons
- Installation instructions

**Files**:
- `plugins/specweave-kafka/skills/kafka-cli-tools/SKILL.md`

---

### T-007: Create kafka-architecture Skill

**Model**: 🧠 sonnet
**AC**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** user asks about Kafka architecture decisions
- **When** skill activates on keywords "kafka architecture", "partitioning", "replication"
- **Then** provides expert guidance on deployment patterns and sizing

**Test Cases**:
- Unit: N/A (skill content)
- Integration (`skill-activation.test.ts`): activatesOnKeywords, providesGuidance → 100%

**Implementation**:
Create `plugins/specweave-kafka/skills/kafka-architecture/SKILL.md` with:
- Event-driven patterns (event sourcing, CQRS, event notification)
- Partitioning strategies
- Replication best practices
- Cluster sizing calculator reference
- KRaft vs ZooKeeper guidance

**Files**:
- `plugins/specweave-kafka/skills/kafka-architecture/SKILL.md`

---

### T-008: Implement Cluster Sizing Calculator

**Model**: 🧠 sonnet
**AC**: AC-US3-02
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** throughput (MB/s), retention (days), replication factor
- **When** calculating broker requirements
- **Then** returns broker count, CPU, RAM, disk size with 20% overhead

**Test Cases**:
- Unit (`cluster-sizer.test.ts`): calculateBrokers, calculateDisk, calculateRAM → 90% coverage
- Integration: Calculate for 100MB/s, 7-day retention, RF=3 → 95%

**Implementation**:
`plugins/specweave-kafka/lib/architecture/cluster-sizer.ts`:
- Input: throughput, retention, replication factor
- Formulas: disk = throughput * retention * RF * 1.2, brokers = ceil(disk / broker_disk_limit)
- Output: broker count, specs per broker

**Files**:
- `plugins/specweave-kafka/lib/architecture/cluster-sizer.ts`
- `tests/unit/cluster-sizer.test.ts`

---

### T-009: Implement Partitioning Strategy Analyzer

**Model**: 🧠 sonnet
**AC**: AC-US3-03
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** topic throughput and consumer parallelism
- **When** calculating partition count
- **Then** recommends partition count avoiding hot partitions

**Test Cases**:
- Unit (`partitioning-strategy.test.ts`): recommendPartitions, detectHotPartition → 85% coverage
- Integration: Calculate for 50MB/s topic, 100 consumers → 90%

**Implementation**:
`plugins/specweave-kafka/lib/architecture/partitioning-strategy.ts`:
- Input: throughput, consumer count
- Formula: partitions = max(consumer_count, throughput / target_throughput_per_partition)
- Validate: partitions % broker_count == 0 (balanced)

**Files**:
- `plugins/specweave-kafka/lib/architecture/partitioning-strategy.ts`
- `tests/unit/partitioning-strategy.test.ts`

---

### T-010: Create Terraform Apache Kafka Module

**Model**: 🧠 sonnet
**AC**: AC-US5-01
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Kubernetes cluster with Strimzi operator
- **When** applying Terraform module
- **Then** creates Kafka cluster with configurable brokers, storage, replication

**Test Cases**:
- Unit (`terraform-validation.test.ts`): validateSyntax, checkVariables → 90% coverage
- Integration: `terraform plan` succeeds → 100%
- E2E: `terraform apply` creates cluster, `kubectl get kafka` shows resource → 95%

**Implementation**:
Create `plugins/specweave-kafka/terraform/modules/apache-kafka/`:
- `main.tf` - Strimzi KafkaCluster resource
- `variables.tf` - broker_count, storage_size, replication_factor
- `outputs.tf` - bootstrap_servers, cluster_name

**Files**:
- `plugins/specweave-kafka/terraform/modules/apache-kafka/main.tf`
- `plugins/specweave-kafka/terraform/modules/apache-kafka/variables.tf`
- `plugins/specweave-kafka/terraform/modules/apache-kafka/outputs.tf`
- `tests/integration/terraform-apache-kafka.test.ts`

---

### T-011: Create Terraform AWS MSK Module

**Model**: 🧠 sonnet
**AC**: AC-US5-03
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** AWS account with VPC
- **When** applying Terraform module
- **Then** creates MSK cluster (provisioned or serverless)

**Test Cases**:
- Unit: Terraform syntax validation → 90%
- Integration: `terraform plan` succeeds → 100%
- E2E: `terraform apply` creates MSK cluster, test connection → 90%

**Implementation**:
Create `plugins/specweave-kafka/terraform/modules/aws-msk/`:
- `main.tf` - aws_msk_cluster resource
- `variables.tf` - instance_type, ebs_storage, kafka_version
- `outputs.tf` - bootstrap_brokers, zookeeper_connect

**Files**:
- `plugins/specweave-kafka/terraform/modules/aws-msk/main.tf`
- `plugins/specweave-kafka/terraform/modules/aws-msk/variables.tf`
- `plugins/specweave-kafka/terraform/modules/aws-msk/outputs.tf`
- `tests/integration/terraform-aws-msk.test.ts`

---

### T-012: Create Terraform Azure Event Hubs Module

**Model**: 🧠 sonnet
**AC**: AC-US5-04
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Azure subscription with resource group
- **When** applying Terraform module
- **Then** creates Event Hubs namespace with Kafka API enabled

**Test Cases**:
- Unit: Terraform syntax validation → 90%
- Integration: `terraform plan` succeeds → 100%
- E2E: `terraform apply` creates namespace, test Kafka connection → 85%

**Implementation**:
Create `plugins/specweave-kafka/terraform/modules/azure-event-hubs/`:
- `main.tf` - azurerm_eventhub_namespace, azurerm_eventhub
- `variables.tf` - throughput_units, partition_count
- `outputs.tf` - kafka_endpoint, connection_string

**Files**:
- `plugins/specweave-kafka/terraform/modules/azure-event-hubs/main.tf`
- `plugins/specweave-kafka/terraform/modules/azure-event-hubs/variables.tf`
- `plugins/specweave-kafka/terraform/modules/azure-event-hubs/outputs.tf`
- `tests/integration/terraform-azure-event-hubs.test.ts`

---

### T-013: Create Docker Compose Local Dev Template

**Model**: ⚡ haiku
**AC**: AC-US6-01
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Docker Compose CLI installed
- **When** running `docker-compose up -d`
- **Then** starts Kafka broker (KRaft), Schema Registry, Kafka UI in < 60 seconds

**Test Cases**:
- E2E (`local-dev.test.ts`): dockerComposeUp, waitForBroker, produceConsumeMessage → 100%

**Implementation**:
Create `plugins/specweave-kafka/templates/docker/kafka-kraft/docker-compose.yml`:
- Kafka broker (KRaft mode, port 9092)
- Schema Registry (port 8081)
- Kafka UI (port 8080)

**Files**:
- `plugins/specweave-kafka/templates/docker/kafka-kraft/docker-compose.yml`
- `plugins/specweave-kafka/templates/docker/kafka-kraft/.env.example`
- `tests/e2e/local-dev.test.ts`

---

### T-014: Create Redpanda Docker Compose Template

**Model**: ⚡ haiku
**AC**: AC-US6-02
**Priority**: P2
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** Docker Compose CLI installed
- **When** running `docker-compose up -d` for Redpanda
- **Then** starts Redpanda (Kafka-compatible) with Console UI in < 30 seconds

**Test Cases**:
- E2E: dockerComposeUp, testKafkaCompatibility → 95%

**Implementation**:
Create `plugins/specweave-kafka/templates/docker/redpanda/docker-compose.yml`:
- Redpanda broker (Kafka API on 9092)
- Redpanda Console (port 8080)

**Files**:
- `plugins/specweave-kafka/templates/docker/redpanda/docker-compose.yml`
- `tests/e2e/redpanda-local-dev.test.ts`

---

### T-015: Create Sample Producer/Consumer Templates

**Model**: ⚡ haiku
**AC**: AC-US6-03
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** local Kafka cluster running
- **When** executing sample producer/consumer
- **Then** successfully produces and consumes messages

**Test Cases**:
- E2E (`samples.test.ts`): runNodeProducer, runPythonConsumer, runGoProducer → 100%

**Implementation**:
Create templates:
- `nodejs-producer.js` - kafkajs producer
- `python-consumer.py` - confluent-kafka-python consumer
- `go-producer.go` - franz-go producer

**Files**:
- `plugins/specweave-kafka/templates/examples/nodejs-producer.js`
- `plugins/specweave-kafka/templates/examples/python-consumer.py`
- `plugins/specweave-kafka/templates/examples/go-producer.go`
- `tests/e2e/samples.test.ts`

---

### T-016: Implement Configuration Validator

**Model**: 🧠 sonnet
**AC**: AC-US7-02
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Kafka broker or topic configuration
- **When** validating against best practices
- **Then** detects dangerous configs and suggests fixes

**Test Cases**:
- Unit (`config-validator.test.ts`): validateBrokerConfig, validateTopicConfig, detectDangerousSettings → 90% coverage
- Integration: Validate production config file → 95%

**Implementation**:
`plugins/specweave-kafka/lib/config/validator.ts`:
- Check auto.create.topics.enable (should be false in prod)
- Validate min.insync.replicas vs replication.factor
- Check retention alignment (retention.ms vs retention.bytes)

**Files**:
- `plugins/specweave-kafka/lib/config/validator.ts`
- `tests/unit/config-validator.test.ts`

---

### T-017: Create Configuration Templates

**Model**: ⚡ haiku
**AC**: AC-US7-03
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** use case (high-throughput, low-latency, durability)
- **When** selecting template
- **Then** provides optimized broker/producer/consumer configs

**Test Cases**:
- Integration (`config-templates.test.ts`): loadHighThroughput, loadLowLatency, loadDurability → 100%

**Implementation**:
Create templates:
- `high-throughput.properties` - batch.size, linger.ms, compression
- `low-latency.properties` - acks=1, batch.size=0
- `durability.properties` - acks=all, min.insync.replicas=2

**Files**:
- `plugins/specweave-kafka/templates/config/high-throughput.properties`
- `plugins/specweave-kafka/templates/config/low-latency.properties`
- `plugins/specweave-kafka/templates/config/durability.properties`

---

### T-018: Implement Prometheus JMX Exporter Setup

**Model**: 🧠 sonnet
**AC**: AC-US8-01
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Kafka cluster with JMX enabled
- **When** deploying JMX Exporter
- **Then** Prometheus scrapes Kafka metrics every 15 seconds

**Test Cases**:
- Integration (`prometheus-setup.test.ts`): deployExporter, verifyMetricsEndpoint → 90% coverage
- E2E: Full Prometheus scrape → Grafana visualization → 95%

**Implementation**:
`plugins/specweave-kafka/lib/monitoring/prometheus-setup.ts`:
- Deploy JMX Exporter JAR
- Configure metrics scraping
- Verify /metrics endpoint

**Files**:
- `plugins/specweave-kafka/lib/monitoring/prometheus-setup.ts`
- `plugins/specweave-kafka/templates/monitoring/prometheus/jmx-exporter-config.yml`
- `tests/integration/prometheus-setup.test.ts`

---

### T-019: Create Grafana Dashboards

**Model**: ⚡ haiku
**AC**: AC-US8-02
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Prometheus with Kafka metrics
- **When** importing Grafana dashboards
- **Then** visualizes broker health, consumer lag, throughput

**Test Cases**:
- E2E (`grafana-dashboards.test.ts`): importDashboard, verifyPanels → 100%

**Implementation**:
Create pre-built dashboards:
- Kafka Overview (brokers, topics, throughput)
- Consumer Lag (group lag, offset trends)
- Broker Health (CPU, memory, disk)

**Files**:
- `plugins/specweave-kafka/templates/monitoring/grafana/kafka-overview-dashboard.json`
- `plugins/specweave-kafka/templates/monitoring/grafana/consumer-lag-dashboard.json`
- `plugins/specweave-kafka/templates/monitoring/grafana/broker-health-dashboard.json`

---

### T-020: Create Alerting Rules

**Model**: 🧠 sonnet
**AC**: AC-US8-04
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Prometheus with Kafka metrics
- **When** configuring alerting rules
- **Then** alerts fire on critical conditions (under-replicated partitions, high lag)

**Test Cases**:
- Integration (`alerting.test.ts`): triggerUnderReplicatedAlert, triggerHighLagAlert → 90% coverage

**Implementation**:
Create `plugins/specweave-kafka/templates/monitoring/prometheus/alerting-rules.yml`:
- UnderReplicatedPartitions: kafka_server_replicamanager_underreplicatedpartitions > 0 for 5m
- HighConsumerLag: kafka_consumer_group_lag > 10000
- BrokerDown: kafka_server_replicamanager_partitioncount == 0

**Files**:
- `plugins/specweave-kafka/templates/monitoring/prometheus/alerting-rules.yml`
- `tests/integration/alerting.test.ts`

---

### T-021: Implement Platform Adapter Interface

**Model**: 🧠 sonnet
**AC**: AC-US4-01, AC-US4-06
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** multiple Kafka platforms (Apache, Confluent, Redpanda, MSK, Event Hubs)
- **When** implementing adapter pattern
- **Then** provides unified API across all platforms

**Test Cases**:
- Unit (`platform-adapter.test.ts`): adaptApacheKafka, adaptConfluent, adaptRedpanda → 90% coverage
- Integration: Auto-detect platform from broker metadata → 95%

**Implementation**:
`plugins/specweave-kafka/lib/platforms/adapter.ts`:
- Interface: PlatformAdapter (connect, listTopics, produce, consume)
- Implementations: ApacheKafkaAdapter, ConfluentAdapter, RedpandaAdapter, MSKAdapter, EventHubsAdapter
- Auto-detection via broker metadata

**Files**:
- `plugins/specweave-kafka/lib/platforms/adapter.ts`
- `plugins/specweave-kafka/lib/platforms/apache-kafka-adapter.ts`
- `plugins/specweave-kafka/lib/platforms/auto-detector.ts`
- `tests/unit/platform-adapter.test.ts`

---

### T-022: Create ApacheKafkaAdapter Implementation

**Model**: 🧠 sonnet
**AC**: AC-US4-01
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Apache Kafka cluster (KRaft or ZooKeeper)
- **When** connecting via adapter
- **Then** supports SASL/SCRAM, mTLS, PLAINTEXT auth

**Test Cases**:
- Integration (`apache-kafka-adapter.test.ts`): connectSASL, connectMTLS, connectPlaintext → 90% coverage
- E2E: Full connection → produce → consume cycle → 95%

**Implementation**:
`plugins/specweave-kafka/lib/platforms/apache-kafka-adapter.ts`:
- kafkajs client configuration
- Auth strategies (SASL_SCRAM, SSL, PLAINTEXT)
- Version detection (2.8+, 3.0+, 4.0+)

**Files**:
- `plugins/specweave-kafka/lib/platforms/apache-kafka-adapter.ts`
- `tests/integration/apache-kafka-adapter.test.ts`

---

### T-023: Create /specweave-kafka:deploy Command

**Model**: 🧠 sonnet
**AC**: AC-US5-01, AC-US5-03, AC-US5-04
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Terraform module selection (Apache Kafka, AWS MSK, Azure Event Hubs)
- **When** running `/specweave-kafka:deploy <platform>`
- **Then** generates Terraform files and executes deployment

**Test Cases**:
- Integration (`deploy-command.test.ts`): generateTerraform, executeTerraformPlan → 90% coverage
- E2E: Full deploy flow → cluster creation → connection test → 85%

**Implementation**:
Create `plugins/specweave-kafka/commands/deploy.md`:
- Interactive prompts: platform, broker count, storage, replication
- Generate Terraform module from templates
- Execute `terraform init && terraform plan`
- Confirm before `terraform apply`

**Files**:
- `plugins/specweave-kafka/commands/deploy.md`
- `plugins/specweave-kafka/lib/commands/deploy-executor.ts`
- `tests/integration/deploy-command.test.ts`

---

### T-024: Create /specweave-kafka:monitor-setup Command

**Model**: 🧠 sonnet
**AC**: AC-US8-01, AC-US8-02, AC-US8-03
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Kafka cluster with JMX enabled
- **When** running `/specweave-kafka:monitor-setup`
- **Then** deploys Prometheus, Grafana, dashboards, alerting rules

**Test Cases**:
- Integration: deployPrometheus, deployGrafana, importDashboards → 90%
- E2E: Full monitoring stack deployment → metric visualization → 95%

**Implementation**:
Create `plugins/specweave-kafka/commands/monitor-setup.md`:
- Deploy Prometheus with JMX Exporter config
- Deploy Grafana with pre-built dashboards
- Configure alerting rules
- Output: Grafana URL, Prometheus URL

**Files**:
- `plugins/specweave-kafka/commands/monitor-setup.md`
- `plugins/specweave-kafka/lib/commands/monitor-setup-executor.ts`
- `tests/integration/monitor-setup-command.test.ts`

---

### T-025: Create /specweave-kafka:mcp-configure Command

**Model**: ⚡ haiku
**AC**: AC-US1-04, AC-US1-05
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** MCP server selection (kanapuli, tuannvm, Confluent)
- **When** running `/specweave-kafka:mcp-configure`
- **Then** generates MCP config file and tests connection

**Test Cases**:
- Integration: generateMCPConfig, testConnection → 95%
- E2E: Full config → connection → operation test → 100%

**Implementation**:
Create `plugins/specweave-kafka/commands/mcp-configure.md`:
- Auto-detect available MCP servers
- Prompt for broker URLs, auth credentials
- Generate `.mcp.json` config file
- Test connection

**Files**:
- `plugins/specweave-kafka/commands/mcp-configure.md`
- `plugins/specweave-kafka/lib/commands/mcp-configure-executor.ts`

---

### T-026: Create /specweave-kafka:dev-env Command

**Model**: ⚡ haiku
**AC**: AC-US6-01, AC-US6-02
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Docker Compose templates (Kafka, Redpanda)
- **When** running `/specweave-kafka:dev-env start`
- **Then** starts local cluster in < 60 seconds

**Test Cases**:
- E2E: startKafkaCluster, stopKafkaCluster, resetCluster → 100%

**Implementation**:
Create `plugins/specweave-kafka/commands/dev-env.md`:
- Subcommands: start, stop, reset, logs
- Platform selection: kafka-kraft, redpanda
- Execute docker-compose commands

**Files**:
- `plugins/specweave-kafka/commands/dev-env.md`
- `plugins/specweave-kafka/lib/commands/dev-env-executor.ts`

---

### T-027: Create kafka-devops Agent

**Model**: 🧠 sonnet
**AC**: AC-US5-01, AC-US7-01
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** deployment or configuration task
- **When** invoking kafka-devops agent
- **Then** provides expert DevOps guidance

**Test Cases**:
- Integration (`agent-invocation.test.ts`): invokeAgent, validateResponse → 90%

**Implementation**:
Create `plugins/specweave-kafka/agents/kafka-devops/AGENT.md`:
- Expertise: Terraform, Kubernetes, Docker, configuration management
- Capabilities: Cluster deployment, config tuning, troubleshooting
- Examples: Deploy Kafka on K8s, tune broker configs

**Files**:
- `plugins/specweave-kafka/agents/kafka-devops/AGENT.md`

---

### T-028: Create kafka-architect Agent

**Model**: 🧠 sonnet
**AC**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** architecture decision needed
- **When** invoking kafka-architect agent
- **Then** provides capacity planning, sizing, design guidance

**Test Cases**:
- Integration: invokeAgent, validateSizingRecommendations → 85%

**Implementation**:
Create `plugins/specweave-kafka/agents/kafka-architect/AGENT.md`:
- Expertise: Event-driven architecture, capacity planning, partitioning
- Capabilities: Cluster sizing, partition strategy, multi-region design
- Examples: Design for 100MB/s throughput, recommend partition count

**Files**:
- `plugins/specweave-kafka/agents/kafka-architect/AGENT.md`

---

### T-029: Create kafka-observability Agent

**Model**: 🧠 sonnet
**AC**: AC-US8-01, AC-US8-04
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** monitoring or alerting task
- **When** invoking kafka-observability agent
- **Then** provides Prometheus, Grafana, OpenTelemetry guidance

**Test Cases**:
- Integration: invokeAgent, validateMonitoringSetup → 90%

**Implementation**:
Create `plugins/specweave-kafka/agents/kafka-observability/AGENT.md`:
- Expertise: Prometheus, Grafana, OpenTelemetry, JMX
- Capabilities: Monitoring setup, dashboard creation, alerting
- Examples: Setup Prometheus for Kafka, create custom alerts

**Files**:
- `plugins/specweave-kafka/agents/kafka-observability/AGENT.md`

---

### T-030: Create Core Plugin README and Documentation

**Model**: ⚡ haiku
**AC**: AC-US1-06
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** completed core plugin features
- **When** generating README
- **Then** documents all skills, agents, commands with examples

**Test Cases**:
- Manual: Validate README completeness, check all links → 100%

**Implementation**:
Create `plugins/specweave-kafka/README.md`:
- Plugin overview
- Installation instructions
- Skills reference
- Agents reference
- Commands reference
- Quick start examples

**Files**:
- `plugins/specweave-kafka/README.md`

---

## Phase 2: Platform Plugins (25 tasks)

### T-031: Create specweave-confluent Plugin Structure

**Model**: ⚡ haiku
**AC**: AC-US4-02
**Priority**: P1
**Estimated**: 1h

**Test Plan** (BDD):
- **Given** SpecWeave plugin directory structure
- **When** creating `plugins/specweave-confluent/`
- **Then** all required subdirectories exist

**Test Cases**:
- Unit: validatePluginStructure → 95%
- Integration: Load plugin in Claude Code → 100%

**Implementation**:
```bash
mkdir -p plugins/specweave-confluent/{.claude-plugin,skills,agents,commands,lib,terraform}
```

**Files**:
- `plugins/specweave-confluent/.claude-plugin/plugin.json`
- `plugins/specweave-confluent/README.md`

---

### T-032: Create ConfluentCloudAdapter

**Model**: 🧠 sonnet
**AC**: AC-US4-02
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Confluent Cloud API keys
- **When** connecting via adapter
- **Then** supports elastic CKUs, Schema Registry, ksqlDB

**Test Cases**:
- Integration (`confluent-adapter.test.ts`): connectCloud, accessSchemaRegistry, queryKsqlDB → 90%
- E2E: Full Confluent Cloud deployment → connection → operations → 85%

**Implementation**:
`plugins/specweave-confluent/lib/platforms/confluent-cloud-adapter.ts`:
- Confluent Cloud API client
- Support for environments, clusters, topics
- Schema Registry integration
- ksqlDB client

**Files**:
- `plugins/specweave-confluent/lib/platforms/confluent-cloud-adapter.ts`
- `tests/integration/confluent-adapter.test.ts`

---

### T-033: Create Terraform Confluent Cloud Module

**Model**: 🧠 sonnet
**AC**: AC-US5-02
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Confluent Cloud account
- **When** applying Terraform module
- **Then** creates environment, cluster, topics, ACLs, service accounts

**Test Cases**:
- Unit: Terraform syntax validation → 90%
- Integration: `terraform plan` succeeds → 100%
- E2E: `terraform apply` creates all resources → 85%

**Implementation**:
Create `plugins/specweave-confluent/terraform/modules/confluent-cloud/`:
- `main.tf` - environment, kafka_cluster, topics
- `variables.tf` - cluster_type (basic/standard/dedicated), region
- `outputs.tf` - bootstrap_servers, api_key

**Files**:
- `plugins/specweave-confluent/terraform/modules/confluent-cloud/main.tf`
- `plugins/specweave-confluent/terraform/modules/confluent-cloud/variables.tf`
- `plugins/specweave-confluent/terraform/modules/confluent-cloud/outputs.tf`

---

### T-034: Create confluent-cloud-setup Skill

**Model**: ⚡ haiku
**AC**: AC-US4-02
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** user asks about Confluent Cloud setup
- **When** skill activates
- **Then** provides API key management, cluster types, pricing guidance

**Test Cases**:
- Integration: activatesOnKeywords, providesGuidance → 100%

**Implementation**:
Create `plugins/specweave-confluent/skills/confluent-cloud-setup/SKILL.md`:
- Confluent Cloud onboarding
- Cluster types (basic, standard, dedicated, eCKUs)
- API key management
- Pricing ($0.11/hr basic, $1.50/hr standard)

**Files**:
- `plugins/specweave-confluent/skills/confluent-cloud-setup/SKILL.md`

---

### T-035: Create confluent-schema-registry Skill

**Model**: 🧠 sonnet
**AC**: AC-US16-01, AC-US16-02, AC-US16-03
**Priority**: P2
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** user asks about Schema Registry
- **When** skill activates
- **Then** provides schema evolution, compatibility modes, registration examples

**Test Cases**:
- Integration: activatesOnKeywords → 100%

**Implementation**:
Create `plugins/specweave-confluent/skills/confluent-schema-registry/SKILL.md`:
- Schema Registry concepts
- Compatibility modes (backward, forward, full)
- Avro/Protobuf examples
- Schema evolution patterns

**Files**:
- `plugins/specweave-confluent/skills/confluent-schema-registry/SKILL.md`

---

### T-036: Implement Schema Registry Client

**Model**: 🧠 sonnet
**AC**: AC-US16-01, AC-US16-02
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Schema Registry URL and credentials
- **When** registering or retrieving schemas
- **Then** performs REST API operations with caching

**Test Cases**:
- Unit (`schema-registry-client.test.ts`): registerSchema, getSchema, checkCompatibility → 90% coverage
- Integration: Full schema lifecycle (register, retrieve, evolve) → 95%

**Implementation**:
`plugins/specweave-confluent/lib/schema-registry/client.ts`:
- REST API client for Schema Registry
- Schema caching (60s TTL)
- Compatibility validation

**Files**:
- `plugins/specweave-confluent/lib/schema-registry/client.ts`
- `plugins/specweave-confluent/lib/schema-registry/cache.ts`
- `tests/unit/schema-registry-client.test.ts`

---

### T-037: Create /specweave-confluent:cluster-create Command

**Model**: 🧠 sonnet
**AC**: AC-US5-02
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Confluent Cloud credentials
- **When** running `/specweave-confluent:cluster-create`
- **Then** creates environment and cluster via Terraform

**Test Cases**:
- Integration: generateTerraform, executeTerraform → 90%
- E2E: Full cluster creation → connection test → 85%

**Implementation**:
Create `plugins/specweave-confluent/commands/cluster-create.md`:
- Interactive prompts: cluster type, region, name
- Generate Terraform module
- Execute deployment

**Files**:
- `plugins/specweave-confluent/commands/cluster-create.md`
- `plugins/specweave-confluent/lib/commands/cluster-create-executor.ts`

---

### T-038: Create /specweave-confluent:schema-register Command

**Model**: ⚡ haiku
**AC**: AC-US16-02
**Priority**: P2
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Avro/Protobuf schema file
- **When** running `/specweave-confluent:schema-register`
- **Then** registers schema in Schema Registry

**Test Cases**:
- Integration: registerAvroSchema, registerProtobufSchema → 95%

**Implementation**:
Create `plugins/specweave-confluent/commands/schema-register.md`:
- Read schema file
- Validate compatibility
- Register schema
- Output: schema ID, version

**Files**:
- `plugins/specweave-confluent/commands/schema-register.md`

---

### T-039: Create confluent-architect Agent

**Model**: 🧠 sonnet
**AC**: AC-US4-02
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Confluent Cloud architecture question
- **When** invoking agent
- **Then** provides cluster sizing, cost optimization, eCKUs guidance

**Test Cases**:
- Integration: invokeAgent, validateRecommendations → 85%

**Implementation**:
Create `plugins/specweave-confluent/agents/confluent-architect/AGENT.md`:
- Expertise: Confluent Cloud architecture, cost optimization
- Capabilities: Cluster sizing with eCKUs, multi-region design
- Examples: Design for 500MB/s with 99.99% SLA

**Files**:
- `plugins/specweave-confluent/agents/confluent-architect/AGENT.md`

---

### T-040: Create specweave-kafka-streams Plugin Structure

**Model**: ⚡ haiku
**AC**: AC-US17-01
**Priority**: P2
**Estimated**: 1h

**Test Plan** (BDD):
- **Given** SpecWeave plugin directory structure
- **When** creating `plugins/specweave-kafka-streams/`
- **Then** all required subdirectories exist

**Test Cases**:
- Unit: validatePluginStructure → 95%
- Integration: Load plugin in Claude Code → 100%

**Implementation**:
```bash
mkdir -p plugins/specweave-kafka-streams/{.claude-plugin,skills,agents,commands,lib,templates}
```

**Files**:
- `plugins/specweave-kafka-streams/.claude-plugin/plugin.json`
- `plugins/specweave-kafka-streams/README.md`

---

### T-041: Create kafka-streams-api Skill

**Model**: 🧠 sonnet
**AC**: AC-US17-01, AC-US17-02
**Priority**: P2
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** user asks about Kafka Streams
- **When** skill activates
- **Then** provides DSL examples, stateful transformations, windowing

**Test Cases**:
- Integration: activatesOnKeywords → 100%

**Implementation**:
Create `plugins/specweave-kafka-streams/skills/kafka-streams-api/SKILL.md`:
- Kafka Streams DSL (filter, map, join, aggregate)
- Stateful transformations with RocksDB
- Windowing (tumbling, hopping, session)

**Files**:
- `plugins/specweave-kafka-streams/skills/kafka-streams-api/SKILL.md`

---

### T-042: Create Kafka Streams Templates

**Model**: 🧠 sonnet
**AC**: AC-US17-01, AC-US17-02, AC-US17-04
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Kafka Streams use case (filter, join, aggregate)
- **When** generating code from template
- **Then** produces working Kafka Streams application

**Test Cases**:
- E2E (`streams-templates.test.ts`): generateFilter, generateJoin, generateAggregate, testTopology → 90%

**Implementation**:
Create templates:
- `filter-map.java` - Filter and map transformations
- `join.java` - Stream-stream join
- `aggregate.java` - Stateful aggregation with RocksDB
- `windowing.java` - Tumbling/hopping/session windows

**Files**:
- `plugins/specweave-kafka-streams/templates/streams/filter-map.java`
- `plugins/specweave-kafka-streams/templates/streams/join.java`
- `plugins/specweave-kafka-streams/templates/streams/aggregate.java`
- `plugins/specweave-kafka-streams/templates/streams/windowing.java`

---

### T-043: Create redhat-amq-streams Skill

**Model**: 🧠 sonnet
**AC**: AC-US17-05
**Priority**: P2
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** user asks about Red Hat AMQ Streams
- **When** skill activates
- **Then** provides Strimzi operator, OpenShift deployment guidance

**Test Cases**:
- Integration: activatesOnKeywords → 100%

**Implementation**:
Create `plugins/specweave-kafka-streams/skills/redhat-amq-streams/SKILL.md`:
- Red Hat AMQ Streams overview
- Strimzi operator on OpenShift
- CRD-based cluster management
- Kafka Streams on OpenShift

**Files**:
- `plugins/specweave-kafka-streams/skills/redhat-amq-streams/SKILL.md`

---

### T-044: Create OpenShift Deployment Template

**Model**: 🧠 sonnet
**AC**: AC-US17-05
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** OpenShift cluster with Strimzi operator
- **When** applying Kafka Streams deployment
- **Then** deploys streams app with RocksDB state stores

**Test Cases**:
- Integration: `oc apply` succeeds → 100%
- E2E: Full deployment → app running → processing messages → 90%

**Implementation**:
Create `plugins/specweave-kafka-streams/templates/openshift/amq-streams-deployment.yaml`:
- Deployment with Kafka Streams app
- RocksDB tuning (block cache, write buffer)
- Resource requests/limits

**Files**:
- `plugins/specweave-kafka-streams/templates/openshift/amq-streams-deployment.yaml`

---

### T-045: Create /specweave-kafka-streams:app-scaffold Command

**Model**: 🧠 sonnet
**AC**: AC-US17-01
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Kafka Streams use case
- **When** running `/specweave-kafka-streams:app-scaffold`
- **Then** generates project structure with dependencies, code, tests

**Test Cases**:
- Integration: generateProject, validateStructure → 90%

**Implementation**:
Create `plugins/specweave-kafka-streams/commands/app-scaffold.md`:
- Prompt for use case (filter, join, aggregate)
- Generate Maven/Gradle project
- Add Kafka Streams dependencies
- Generate code from template

**Files**:
- `plugins/specweave-kafka-streams/commands/app-scaffold.md`

---

### T-046: Create specweave-n8n Plugin Structure

**Model**: ⚡ haiku
**AC**: AC-US12-01
**Priority**: P2
**Estimated**: 1h

**Test Plan** (BDD):
- **Given** SpecWeave plugin directory structure
- **When** creating `plugins/specweave-n8n/`
- **Then** all required subdirectories exist

**Test Cases**:
- Unit: validatePluginStructure → 95%

**Implementation**:
```bash
mkdir -p plugins/specweave-n8n/{.claude-plugin,skills,agents,commands,lib,templates}
```

**Files**:
- `plugins/specweave-n8n/.claude-plugin/plugin.json`
- `plugins/specweave-n8n/README.md`

---

### T-047: Create n8n Workflow Templates

**Model**: 🧠 sonnet
**AC**: AC-US12-03
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** common Kafka integration patterns
- **When** importing n8n workflow template
- **Then** workflow activates on Kafka events or produces to Kafka

**Test Cases**:
- E2E (`n8n-workflows.test.ts`): importTemplate, activateWorkflow, testTrigger → 90%

**Implementation**:
Create workflow templates:
- `kafka-to-http.json` - Forward Kafka events to HTTP webhook
- `http-to-kafka.json` - Ingest HTTP data to Kafka
- `kafka-to-database.json` - Persist events to PostgreSQL
- `kafka-to-email.json` - Email alerts on high-value events

**Files**:
- `plugins/specweave-n8n/templates/workflows/kafka-to-http.json`
- `plugins/specweave-n8n/templates/workflows/http-to-kafka.json`
- `plugins/specweave-n8n/templates/workflows/kafka-to-database.json`
- `plugins/specweave-n8n/templates/workflows/kafka-to-email.json`

---

### T-048: Create n8n-kafka-trigger Skill

**Model**: ⚡ haiku
**AC**: AC-US12-01, AC-US12-02
**Priority**: P2
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** user asks about n8n Kafka integration
- **When** skill activates
- **Then** provides MCP Server Trigger and MCP Client Tool examples

**Test Cases**:
- Integration: activatesOnKeywords → 100%

**Implementation**:
Create `plugins/specweave-n8n/skills/n8n-kafka-trigger/SKILL.md`:
- n8n MCP Server Trigger for Kafka events
- n8n MCP Client Tool for Kafka operations
- Workflow template references

**Files**:
- `plugins/specweave-n8n/skills/n8n-kafka-trigger/SKILL.md`

---

### T-049: Create /specweave-n8n:workflow-create Command

**Model**: ⚡ haiku
**AC**: AC-US12-03
**Priority**: P2
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** n8n instance running
- **When** running `/specweave-n8n:workflow-create`
- **Then** imports workflow template via n8n API

**Test Cases**:
- Integration: importWorkflow, activateWorkflow → 95%

**Implementation**:
Create `plugins/specweave-n8n/commands/workflow-create.md`:
- Select template (kafka-to-http, http-to-kafka, etc.)
- Configure Kafka credentials
- Import to n8n via API
- Activate workflow

**Files**:
- `plugins/specweave-n8n/commands/workflow-create.md`

---

### T-050: Create AWS MSK Adapter

**Model**: 🧠 sonnet
**AC**: AC-US4-04
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** AWS MSK cluster with IAM auth
- **When** connecting via adapter
- **Then** supports provisioned and serverless clusters

**Test Cases**:
- Integration (`aws-msk-adapter.test.ts`): connectIAM, connectSASL, listTopics → 90% coverage
- E2E: Full connection → produce → consume → 95%

**Implementation**:
`plugins/specweave-kafka/lib/platforms/aws-msk-adapter.ts`:
- AWS SDK integration
- IAM authentication
- CloudWatch metrics integration

**Files**:
- `plugins/specweave-kafka/lib/platforms/aws-msk-adapter.ts`
- `tests/integration/aws-msk-adapter.test.ts`

---

### T-051: Create Azure Event Hubs Adapter

**Model**: 🧠 sonnet
**AC**: AC-US4-05
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Azure Event Hubs namespace
- **When** connecting via Kafka protocol
- **Then** maps Event Hubs concepts to Kafka

**Test Cases**:
- Integration (`azure-event-hubs-adapter.test.ts`): connectAzureAD, mapPartitions, listConsumerGroups → 85% coverage
- E2E: Full connection → produce → consume → 90%

**Implementation**:
`plugins/specweave-kafka/lib/platforms/azure-event-hubs-adapter.ts`:
- Azure SDK integration
- Azure AD authentication
- Event Hubs → Kafka mapping

**Files**:
- `plugins/specweave-kafka/lib/platforms/azure-event-hubs-adapter.ts`
- `tests/integration/azure-event-hubs-adapter.test.ts`

---

### T-052: Create Redpanda Adapter

**Model**: 🧠 sonnet
**AC**: AC-US4-03
**Priority**: P2
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Redpanda cluster
- **When** connecting via adapter
- **Then** detects Redpanda-specific features (faster startup, no JVM)

**Test Cases**:
- Integration (`redpanda-adapter.test.ts`): connectRedpanda, detectFeatures, useConsole → 90% coverage
- E2E: Full connection → produce → consume → 95%

**Implementation**:
`plugins/specweave-kafka/lib/platforms/redpanda-adapter.ts`:
- Kafka-compatible API
- Redpanda Console integration
- Version detection

**Files**:
- `plugins/specweave-kafka/lib/platforms/redpanda-adapter.ts`
- `tests/integration/redpanda-adapter.test.ts`

---

### T-053: Create Multi-Platform Integration Tests

**Model**: 🧠 sonnet
**AC**: AC-US4-06
**Priority**: P1
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** all 5 platform adapters
- **When** running integration test suite
- **Then** validates connection and operations for each platform

**Test Cases**:
- E2E (`multi-platform.test.ts`): testApacheKafka, testConfluent, testRedpanda, testMSK, testEventHubs → 100%

**Implementation**:
Create comprehensive E2E test suite:
- Testcontainers for Apache Kafka and Redpanda
- Confluent Cloud test cluster (requires credentials)
- AWS MSK test cluster (requires AWS account)
- Azure Event Hubs test namespace (requires Azure subscription)

**Files**:
- `tests/e2e/multi-platform.test.ts`

---

### T-054: Create Platform Selection Guide

**Model**: ⚡ haiku
**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Priority**: P2
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** platform decision criteria
- **When** creating selection guide
- **Then** documents pros/cons, pricing, features for all 5 platforms

**Test Cases**:
- Manual: Validate completeness, accuracy → 100%

**Implementation**:
Create documentation comparing:
- Apache Kafka (self-hosted) - Full control, maintenance burden
- Confluent Cloud - Managed, expensive, best features
- Redpanda - Faster, simpler, Kafka-compatible
- AWS MSK - AWS integration, IAM auth
- Azure Event Hubs - Azure integration, limited features

**Files**:
- `plugins/specweave-kafka/docs/platform-selection-guide.md`

---

### T-055: Create Platform Plugin README Files

**Model**: ⚡ haiku
**AC**: All platform-specific ACs
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** completed platform plugins
- **When** generating README files
- **Then** documents features, installation, usage for each plugin

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Create README files for:
- `plugins/specweave-confluent/README.md`
- `plugins/specweave-kafka-streams/README.md`
- `plugins/specweave-n8n/README.md`

**Files**:
- `plugins/specweave-confluent/README.md`
- `plugins/specweave-kafka-streams/README.md`
- `plugins/specweave-n8n/README.md`

---

## Phase 3: Advanced Features (20 tasks)

### T-056: Implement OpenTelemetry Producer Instrumentation

**Model**: 🧠 sonnet
**AC**: AC-US9-01
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** kafkajs producer
- **When** instrumenting with OpenTelemetry
- **Then** injects trace context into message headers (W3C format)

**Test Cases**:
- Unit (`otel-producer.test.ts`): injectTraceContext, createProducerSpan → 90% coverage
- Integration: Full produce with trace propagation → 95%

**Implementation**:
`plugins/specweave-kafka/lib/instrumentation/otel-producer.ts`:
- OpenTelemetry SDK integration
- W3C Trace Context injection
- Producer span creation

**Files**:
- `plugins/specweave-kafka/lib/instrumentation/otel-producer.ts`
- `tests/unit/otel-producer.test.ts`

---

### T-057: Implement OpenTelemetry Consumer Instrumentation

**Model**: 🧠 sonnet
**AC**: AC-US9-02, AC-US9-03
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** kafkajs consumer
- **When** instrumenting with OpenTelemetry
- **Then** extracts trace context and creates linked consumer span

**Test Cases**:
- Unit (`otel-consumer.test.ts`): extractTraceContext, createConsumerSpan, linkToProducer → 90% coverage
- E2E: Full produce → consume trace linkage → 100%

**Implementation**:
`plugins/specweave-kafka/lib/instrumentation/otel-consumer.ts`:
- Extract W3C Trace Context from headers
- Create consumer span linked to producer span
- Track processing time, lag

**Files**:
- `plugins/specweave-kafka/lib/instrumentation/otel-consumer.ts`
- `tests/unit/otel-consumer.test.ts`

---

### T-058: Create Producer/Consumer Code Templates

**Model**: 🧠 sonnet
**AC**: AC-US10-01, AC-US10-02
**Priority**: P1
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** language selection (Node.js, Python, Go, Java)
- **When** generating code from template
- **Then** produces production-ready producer/consumer with error handling, retries

**Test Cases**:
- E2E (`code-templates.test.ts`): generateNodeProducer, generatePythonConsumer, generateGoProducer, generateJavaConsumer → 100%

**Implementation**:
Create comprehensive templates for 4 languages:
- Node.js (kafkajs): Producer with batching, compression
- Python (confluent-kafka-python): Consumer with offset management
- Go (franz-go): High-performance producer
- Java (kafka-clients): Enterprise-grade consumer

**Files**:
- `plugins/specweave-kafka/templates/code/nodejs/producer.js`
- `plugins/specweave-kafka/templates/code/nodejs/consumer.js`
- `plugins/specweave-kafka/templates/code/python/producer.py`
- `plugins/specweave-kafka/templates/code/python/consumer.py`
- `plugins/specweave-kafka/templates/code/go/producer.go`
- `plugins/specweave-kafka/templates/code/go/consumer.go`
- `plugins/specweave-kafka/templates/code/java/Producer.java`
- `plugins/specweave-kafka/templates/code/java/Consumer.java`

---

### T-059: Create Exactly-Once Semantics Templates

**Model**: 💎 opus
**AC**: AC-US10-03
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** EOS requirements
- **When** generating transactional producer/consumer
- **Then** provides end-to-end exactly-once pipeline

**Test Cases**:
- E2E (`eos-templates.test.ts`): testTransactionalProducer, testReadCommitted, validateEOS → 100%

**Implementation**:
Create EOS templates:
- Transactional producer (transactional.id, enable.idempotence)
- Read-committed consumer (isolation.level=read_committed)
- End-to-end EOS pipeline example

**Files**:
- `plugins/specweave-kafka/templates/code/eos/transaction-producer.js`
- `plugins/specweave-kafka/templates/code/eos/read-committed-consumer.js`

---

### T-060: Create Dead Letter Queue Handler

**Model**: 🧠 sonnet
**AC**: AC-US10-05
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** processing error in consumer
- **When** sending to DLQ
- **Then** includes error metadata (exception, timestamp, original message)

**Test Cases**:
- Integration (`dlq-handler.test.ts`): catchError, sendToDLQ, consumeFromDLQ → 95% coverage

**Implementation**:
`plugins/specweave-kafka/lib/dlq/handler.ts`:
- Catch processing errors
- Create DLQ message with error metadata
- Produce to DLQ topic (topic-name.dlq)

**Files**:
- `plugins/specweave-kafka/lib/dlq/handler.ts`
- `plugins/specweave-kafka/templates/code/dlq/dlq-handler.js`
- `tests/integration/dlq-handler.test.ts`

---

### T-061: Implement Testcontainers Kafka Setup

**Model**: 🧠 sonnet
**AC**: AC-US11-01
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** Docker runtime available
- **When** starting Testcontainers Kafka
- **Then** ephemeral Kafka cluster starts in < 30 seconds

**Test Cases**:
- E2E (`testcontainers.test.ts`): startKafka, waitForBroker, produceConsume, cleanup → 100%

**Implementation**:
`plugins/specweave-kafka/lib/testing/testcontainers-kafka.ts`:
- testcontainers library integration
- Kafka image configuration (KRaft mode)
- Auto-cleanup after tests

**Files**:
- `plugins/specweave-kafka/lib/testing/testcontainers-kafka.ts`
- `tests/e2e/testcontainers.test.ts`

---

### T-062: Implement Schema Registry Testcontainers

**Model**: 🧠 sonnet
**AC**: AC-US11-02
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Testcontainers Kafka running
- **When** starting Schema Registry container
- **Then** registers test schemas and validates evolution

**Test Cases**:
- E2E (`schema-registry-testcontainers.test.ts`): startSchemaRegistry, registerSchema, testEvolution → 95%

**Implementation**:
`plugins/specweave-kafka/lib/testing/testcontainers-schema-registry.ts`:
- Schema Registry container
- Pre-load test schemas
- Compatibility testing utilities

**Files**:
- `plugins/specweave-kafka/lib/testing/testcontainers-schema-registry.ts`
- `tests/e2e/schema-registry-testcontainers.test.ts`

---

### T-063: Create Test Utilities and Helpers

**Model**: ⚡ haiku
**AC**: AC-US11-03
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** integration test needs
- **When** using test helpers
- **Then** provides convenience methods for produce, consume, wait

**Test Cases**:
- Unit (`test-helpers.test.ts`): produceTestMessages, consumeMessages, waitForConsumerGroup → 90% coverage

**Implementation**:
`plugins/specweave-kafka/lib/testing/helpers.ts`:
- produceTestMessages(topic, messages) → offsets
- consumeMessages(topic, timeout) → messages
- waitForConsumerGroup(groupId) → boolean

**Files**:
- `plugins/specweave-kafka/lib/testing/helpers.ts`
- `tests/unit/test-helpers.test.ts`

---

### T-064: Create Security Configuration Templates

**Model**: 🧠 sonnet
**AC**: AC-US14-01, AC-US14-02, AC-US14-04
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** security requirements (SASL/SCRAM, mTLS, TLS)
- **When** selecting template
- **Then** provides production-ready security configs

**Test Cases**:
- Integration (`security-templates.test.ts`): loadSASLConfig, loadMTLSConfig, validateTLS → 95%

**Implementation**:
Create security templates:
- `sasl-scram-config.properties` - SASL_SCRAM authentication
- `mtls-config.properties` - Mutual TLS
- `tls-broker-config.properties` - TLS encryption

**Files**:
- `plugins/specweave-kafka/templates/security/sasl-scram-config.properties`
- `plugins/specweave-kafka/templates/security/mtls-config.properties`
- `plugins/specweave-kafka/templates/security/tls-broker-config.properties`

---

### T-065: Implement ACL Manager

**Model**: 🧠 sonnet
**AC**: AC-US14-03
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Kafka cluster with ACLs enabled
- **When** creating ACL rules
- **Then** applies least privilege permissions for topics and consumer groups

**Test Cases**:
- Integration (`acl-manager.test.ts`): createTopicACL, createConsumerGroupACL, validatePermissions → 90% coverage

**Implementation**:
`plugins/specweave-kafka/lib/security/acl-manager.ts`:
- kafka-admin ACL API
- Topic read/write ACLs
- Consumer group ACLs
- Principle of least privilege

**Files**:
- `plugins/specweave-kafka/lib/security/acl-manager.ts`
- `tests/integration/acl-manager.test.ts`

---

### T-066: Create Operational Runbooks

**Model**: ⚡ haiku
**AC**: AC-US13-01, AC-US13-02, AC-US13-03, AC-US13-04
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** common Kafka incidents
- **When** creating runbooks
- **Then** provides step-by-step resolution procedures

**Test Cases**:
- Manual: Validate runbook completeness, test procedures → 100%

**Implementation**:
Create runbooks for:
- Under-replicated partitions
- High consumer lag
- Broker unavailability
- Disk full
- Schema compatibility errors

**Files**:
- `plugins/specweave-kafka/runbooks/under-replicated-partitions.md`
- `plugins/specweave-kafka/runbooks/high-consumer-lag.md`
- `plugins/specweave-kafka/runbooks/broker-unavailability.md`
- `plugins/specweave-kafka/runbooks/disk-full.md`
- `plugins/specweave-kafka/runbooks/schema-compatibility-errors.md`

---

### T-067: Create kafka-runbooks Skill

**Model**: ⚡ haiku
**AC**: AC-US13-06
**Priority**: P2
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** incident keywords
- **When** skill activates
- **Then** suggests relevant runbook

**Test Cases**:
- Integration: activatesOnKeywords, linksRunbook → 100%

**Implementation**:
Create `plugins/specweave-kafka/skills/kafka-runbooks/SKILL.md`:
- Auto-activates on "under-replicated", "high lag", "broker down"
- Links to relevant runbooks
- Provides quick diagnostic commands

**Files**:
- `plugins/specweave-kafka/skills/kafka-runbooks/SKILL.md`

---

### T-068: Implement Capacity Planning Calculator

**Model**: 🧠 sonnet
**AC**: AC-US15-01, AC-US15-02, AC-US15-03, AC-US15-04
**Priority**: P2
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** capacity requirements (throughput, retention, parallelism)
- **When** calculating sizing
- **Then** recommends broker count, partitions, network bandwidth, disk I/O

**Test Cases**:
- Unit (`capacity-planner.test.ts`): calculateBrokers, calculatePartitions, calculateNetwork, calculateDiskIO → 90% coverage

**Implementation**:
`plugins/specweave-kafka/lib/capacity/` modules:
- broker-sizing.ts
- partition-sizing.ts
- network-calculator.ts
- disk-io-calculator.ts

**Files**:
- `plugins/specweave-kafka/lib/capacity/broker-sizing.ts`
- `plugins/specweave-kafka/lib/capacity/partition-sizing.ts`
- `plugins/specweave-kafka/lib/capacity/network-calculator.ts`
- `plugins/specweave-kafka/lib/capacity/disk-io-calculator.ts`
- `tests/unit/capacity-planner.test.ts`

---

### T-069: Implement Growth Projections

**Model**: 🧠 sonnet
**AC**: AC-US15-05
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** historical metrics (30/90 days)
- **When** projecting future capacity
- **Then** alerts when cluster approaching 80% capacity

**Test Cases**:
- Integration (`growth-projections.test.ts`): analyzeHistorical, projectFuture, detectThreshold → 85% coverage

**Implementation**:
`plugins/specweave-kafka/lib/capacity/growth-projections.ts`:
- Query Prometheus for historical metrics
- Linear regression for trend analysis
- Project 6/12 months ahead
- Alert threshold (80%)

**Files**:
- `plugins/specweave-kafka/lib/capacity/growth-projections.ts`
- `tests/integration/growth-projections.test.ts`

---

### T-070: Create MirrorMaker 2 Configuration

**Model**: 🧠 sonnet
**AC**: AC-US18-01
**Priority**: P3
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** source and target clusters
- **When** configuring MirrorMaker 2
- **Then** replicates topics with automatic creation

**Test Cases**:
- Integration (`mirrormaker2.test.ts`): configureMM2, testReplication → 90% coverage

**Implementation**:
Create `plugins/specweave-kafka/templates/migration/mirrormaker2-config.properties`:
- Source/target cluster configs
- Topic whitelist/blacklist
- Offset sync settings

**Files**:
- `plugins/specweave-kafka/templates/migration/mirrormaker2-config.properties`

---

### T-071: Create Multi-Cluster Management Tools

**Model**: 🧠 sonnet
**AC**: AC-US19-01, AC-US19-02
**Priority**: P3
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** multiple clusters (dev, staging, prod)
- **When** managing via unified interface
- **Then** switches contexts and aggregates metrics

**Test Cases**:
- Integration (`multi-cluster.test.ts`): switchCluster, aggregateMetrics → 85% coverage

**Implementation**:
`plugins/specweave-kafka/lib/multi-cluster/`:
- cluster-config-manager.ts - Manage cluster configs
- cluster-switcher.ts - Switch active cluster
- health-aggregator.ts - Aggregate health across clusters

**Files**:
- `plugins/specweave-kafka/lib/multi-cluster/cluster-config-manager.ts`
- `plugins/specweave-kafka/lib/multi-cluster/cluster-switcher.ts`
- `plugins/specweave-kafka/lib/multi-cluster/health-aggregator.ts`

---

### T-072: Create Multi-Cluster Grafana Dashboard

**Model**: ⚡ haiku
**AC**: AC-US19-02
**Priority**: P3
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Prometheus metrics from multiple clusters
- **When** importing multi-cluster dashboard
- **Then** visualizes all clusters with selector dropdown

**Test Cases**:
- E2E: Import dashboard, select cluster, view metrics → 100%

**Implementation**:
Create `plugins/specweave-kafka/templates/monitoring/grafana/multi-cluster-dashboard.json`:
- Cluster selector variable
- Aggregate panels (total throughput, total topics)
- Per-cluster panels

**Files**:
- `plugins/specweave-kafka/templates/monitoring/grafana/multi-cluster-dashboard.json`

---

### T-073: Implement Documentation Generator

**Model**: 🧠 sonnet
**AC**: AC-US20-01, AC-US20-02
**Priority**: P3
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** Kafka cluster
- **When** generating documentation
- **Then** produces cluster topology, schema catalog, data flow diagrams

**Test Cases**:
- Integration (`doc-generator.test.ts`): generateTopology, generateSchemaCatalog, generateDiagrams → 90% coverage

**Implementation**:
`plugins/specweave-kafka/lib/documentation/`:
- topology-generator.ts - Cluster metadata
- schema-catalog-generator.ts - Schema Registry docs
- diagram-generator.ts - Mermaid data flow diagrams

**Files**:
- `plugins/specweave-kafka/lib/documentation/topology-generator.ts`
- `plugins/specweave-kafka/lib/documentation/schema-catalog-generator.ts`
- `plugins/specweave-kafka/lib/documentation/diagram-generator.ts`

---

### T-074: Create Documentation Export Utilities

**Model**: ⚡ haiku
**AC**: AC-US20-05
**Priority**: P3
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** generated documentation
- **When** exporting to Markdown/HTML/PDF
- **Then** creates formatted output files

**Test Cases**:
- E2E (`doc-export.test.ts`): exportMarkdown, exportHTML, exportPDF → 95%

**Implementation**:
`plugins/specweave-kafka/lib/documentation/exporter.ts`:
- Markdown export
- HTML export (static site)
- PDF export (pandoc or wkhtmltopdf)

**Files**:
- `plugins/specweave-kafka/lib/documentation/exporter.ts`

---

### T-075: Create Advanced Feature Integration Tests

**Model**: 🧠 sonnet
**AC**: All Phase 3 ACs
**Priority**: P2
**Estimated**: 10h

**Test Plan** (BDD):
- **Given** all advanced features implemented
- **When** running comprehensive E2E test suite
- **Then** validates OpenTelemetry, EOS, DLQ, security, capacity planning

**Test Cases**:
- E2E (`advanced-features.test.ts`): 15+ comprehensive test scenarios → 100%

**Implementation**:
Create comprehensive E2E test suite covering:
- OpenTelemetry end-to-end tracing
- Exactly-once semantics validation
- DLQ error handling
- Security (SASL, mTLS, ACLs)
- Capacity planning accuracy
- Multi-cluster management

**Files**:
- `tests/e2e/advanced-features.test.ts`

---

## Phase 4: Testing & Integration (15 tasks)

### T-076: Create Unit Test Suite

**Model**: 🧠 sonnet
**AC**: All unit test cases from previous tasks
**Priority**: P1
**Estimated**: 12h

**Test Plan** (BDD):
- **Given** all TypeScript utilities and libraries
- **When** running unit test suite
- **Then** achieves 90%+ coverage

**Test Cases**:
- Unit tests for all lib/ modules → 90% coverage target

**Implementation**:
Consolidate and enhance all unit tests:
- MCP detector tests
- kcat wrapper tests
- Configuration validator tests
- Platform adapter tests
- Capacity planner tests
- Security tests

**Files**:
- `tests/unit/**/*.test.ts` (comprehensive coverage)

---

### T-077: Create Integration Test Suite

**Model**: 🧠 sonnet
**AC**: All integration test cases from previous tasks
**Priority**: P1
**Estimated**: 16h

**Test Plan** (BDD):
- **Given** external dependencies (Docker, Terraform, MCP servers)
- **When** running integration test suite
- **Then** achieves 85%+ coverage

**Test Cases**:
- Integration tests for commands, Terraform modules, MCP operations → 85% coverage

**Implementation**:
Consolidate and enhance all integration tests:
- Terraform plan/apply tests
- MCP server connection tests
- Docker Compose startup tests
- Platform adapter integration

**Files**:
- `tests/integration/**/*.test.ts`

---

### T-078: Create E2E Test Suite

**Model**: 🧠 sonnet
**AC**: All E2E test cases from previous tasks
**Priority**: P1
**Estimated**: 20h

**Test Plan** (BDD):
- **Given** full Kafka ecosystem (cluster, monitoring, security)
- **When** running E2E test suite
- **Then** validates complete workflows

**Test Cases**:
- E2E tests for full workflows → 95%+ coverage

**Implementation**:
Create comprehensive E2E test suite:
- Cluster deployment end-to-end
- Producer → consume message flow
- Monitoring stack deployment
- Security configuration
- Multi-platform validation

**Files**:
- `tests/e2e/**/*.test.ts`

---

### T-079: Implement CI/CD Pipeline

**Model**: 🧠 sonnet
**AC**: Automated testing, build, publish
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** GitHub Actions workflow
- **When** pushing code
- **Then** runs tests, builds, publishes to marketplace

**Test Cases**:
- CI pipeline runs successfully → 100%

**Implementation**:
Create `.github/workflows/kafka-plugin-ci.yml`:
- Run unit tests
- Run integration tests (Docker required)
- Build TypeScript
- Publish to SpecWeave marketplace

**Files**:
- `.github/workflows/kafka-plugin-ci.yml`

---

### T-080: Create Performance Benchmarks

**Model**: 🧠 sonnet
**AC**: Validate 100K+ messages/sec throughput
**Priority**: P2
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** Kafka cluster with known specs
- **When** running performance benchmarks
- **Then** achieves 100K+ messages/sec producer throughput

**Test Cases**:
- Performance benchmarks with k6 → Validate targets

**Implementation**:
Create performance test suite:
- Producer throughput benchmark (k6)
- Consumer lag benchmark
- End-to-end latency measurement

**Files**:
- `tests/performance/producer-throughput.js` (k6)
- `tests/performance/consumer-lag.js`
- `tests/performance/e2e-latency.js`

---

### T-081: Create Security Vulnerability Scan

**Model**: ⚡ haiku
**AC**: No high/critical vulnerabilities
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** npm dependencies
- **When** running security audit
- **Then** reports no high/critical vulnerabilities

**Test Cases**:
- `npm audit` passes → 100%

**Implementation**:
Add security scan to CI:
```bash
npm audit --audit-level=high
```

**Files**:
- `.github/workflows/security-audit.yml`

---

### T-082: Create Linter Configuration

**Model**: ⚡ haiku
**AC**: Code quality standards enforced
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** TypeScript code
- **When** running ESLint
- **Then** enforces code quality rules

**Test Cases**:
- ESLint passes with 0 errors → 100%

**Implementation**:
Create `.eslintrc.json`:
- TypeScript rules
- Prettier integration
- Import sorting

**Files**:
- `.eslintrc.json`
- `.prettierrc`

---

### T-083: Create Plugin Validation Tests

**Model**: 🧠 sonnet
**AC**: All 4 plugins load successfully in Claude Code
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** Claude Code plugin system
- **When** loading all 4 plugins
- **Then** validates plugin.json, skills activate, commands register

**Test Cases**:
- E2E (`plugin-validation.test.ts`): loadPlugins, validateSkills, validateCommands → 100%

**Implementation**:
Create comprehensive plugin validation:
- Load specweave-kafka
- Load specweave-confluent
- Load specweave-kafka-streams
- Load specweave-n8n
- Validate all skills auto-activate
- Validate all commands register

**Files**:
- `tests/e2e/plugin-validation.test.ts`

---

### T-084: Create Skill Activation Tests

**Model**: ⚡ haiku
**AC**: Skills activate on correct keywords
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** skill description with keywords
- **When** user query contains keywords
- **Then** skill activates automatically

**Test Cases**:
- Integration (`skill-activation.test.ts`): Test each skill's keywords → 100%

**Implementation**:
Test skill activation for:
- kafka-architecture
- kafka-mcp-integration
- kafka-cli-tools
- confluent-cloud-setup
- kafka-streams-api
- n8n-kafka-trigger

**Files**:
- `tests/integration/skill-activation.test.ts`

---

### T-085: Create Command Execution Tests

**Model**: 🧠 sonnet
**AC**: All commands execute successfully
**Priority**: P1
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** command implementation
- **When** executing via Claude Code
- **Then** completes without errors

**Test Cases**:
- E2E (`command-execution.test.ts`): Test all commands → 95%

**Implementation**:
Test command execution for:
- /specweave-kafka:deploy
- /specweave-kafka:monitor-setup
- /specweave-kafka:mcp-configure
- /specweave-confluent:cluster-create
- /specweave-kafka-streams:app-scaffold
- /specweave-n8n:workflow-create

**Files**:
- `tests/e2e/command-execution.test.ts`

---

### T-086: Create Agent Invocation Tests

**Model**: 🧠 sonnet
**AC**: Agents provide expert guidance
**Priority**: P2
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** agent specialization
- **When** invoking via Task tool
- **Then** provides relevant expert guidance

**Test Cases**:
- Integration (`agent-invocation.test.ts`): Test all agents → 90%

**Implementation**:
Test agent invocation for:
- kafka-architect
- kafka-devops
- kafka-observability
- confluent-architect

**Files**:
- `tests/integration/agent-invocation.test.ts`

---

### T-087: Create Terraform Validation Tests

**Model**: 🧠 sonnet
**AC**: All Terraform modules pass validation
**Priority**: P1
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** Terraform modules
- **When** running `terraform validate`
- **Then** passes without errors

**Test Cases**:
- Integration (`terraform-validation.test.ts`): Validate all modules → 100%

**Implementation**:
Test Terraform modules:
- apache-kafka module
- aws-msk module
- azure-event-hubs module
- confluent-cloud module
- monitoring module

**Files**:
- `tests/integration/terraform-validation.test.ts`

---

### T-088: Create Docker Compose Validation Tests

**Model**: ⚡ haiku
**AC**: All Docker Compose files start successfully
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Docker Compose templates
- **When** running `docker-compose up`
- **Then** starts all services in < 60 seconds

**Test Cases**:
- E2E (`docker-compose-validation.test.ts`): Test all templates → 100%

**Implementation**:
Test Docker Compose templates:
- kafka-kraft template
- redpanda template

**Files**:
- `tests/e2e/docker-compose-validation.test.ts`

---

### T-089: Create Test Coverage Report

**Model**: ⚡ haiku
**AC**: Generate coverage report with 85%+ overall
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** all test suites run
- **When** generating coverage report
- **Then** shows 85%+ overall coverage

**Test Cases**:
- Coverage report generation → 100%

**Implementation**:
Configure Jest coverage:
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
}
```

**Files**:
- `jest.config.js` (updated)
- `.github/workflows/coverage-report.yml`

---

### T-090: Create Integration Test Documentation

**Model**: ⚡ haiku
**AC**: Document how to run all test suites
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** test documentation
- **When** following instructions
- **Then** successfully runs unit, integration, E2E tests

**Test Cases**:
- Manual: Follow documentation → 100%

**Implementation**:
Create `tests/README.md`:
- Prerequisites (Docker, Terraform, MCP servers)
- Running unit tests
- Running integration tests
- Running E2E tests
- Troubleshooting

**Files**:
- `tests/README.md`

---

## Phase 5: Documentation & Polish (10 tasks)

### T-091: Create Main Plugin Suite Documentation

**Model**: ⚡ haiku
**AC**: Comprehensive overview of all 4 plugins
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** all 4 plugins completed
- **When** creating documentation
- **Then** provides architecture overview, getting started, features

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Create `plugins/README.md`:
- Architecture overview (4 plugins)
- Installation instructions
- Quick start guide
- Plugin comparison table
- Links to individual plugin docs

**Files**:
- `plugins/README.md`

---

### T-092: Create Getting Started Guide

**Model**: ⚡ haiku
**AC**: New users can set up Kafka in < 15 minutes
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** new user with no Kafka experience
- **When** following guide
- **Then** deploys local cluster and produces/consumes messages

**Test Cases**:
- Manual: Follow guide, time completion → < 15 minutes

**Implementation**:
Create `.specweave/docs/public/guides/kafka-getting-started.md`:
- Install SpecWeave + Kafka plugin
- Start local dev cluster
- Produce first message
- Consume messages
- Setup monitoring

**Files**:
- `.specweave/docs/public/guides/kafka-getting-started.md`

---

### T-093: Create Advanced Usage Guide

**Model**: 🧠 sonnet
**AC**: Covers all advanced features
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** advanced use cases
- **When** creating guide
- **Then** documents EOS, security, multi-cluster, Kafka Streams

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Create `.specweave/docs/public/guides/kafka-advanced-usage.md`:
- Exactly-once semantics
- Security configuration (SASL, mTLS, ACLs)
- Multi-cluster management
- Kafka Streams applications
- OpenTelemetry instrumentation

**Files**:
- `.specweave/docs/public/guides/kafka-advanced-usage.md`

---

### T-094: Create Terraform Guide

**Model**: ⚡ haiku
**AC**: Explains how to deploy Kafka with Terraform
**Priority**: P1
**Estimated**: 3h

**Test Plan** (BDD):
- **Given** Terraform module documentation
- **When** following guide
- **Then** deploys Kafka cluster on chosen platform

**Test Cases**:
- Manual: Follow guide for each platform → 100%

**Implementation**:
Create `.specweave/docs/public/guides/kafka-terraform.md`:
- Apache Kafka (self-hosted) deployment
- Confluent Cloud deployment
- AWS MSK deployment
- Azure Event Hubs deployment
- Module customization

**Files**:
- `.specweave/docs/public/guides/kafka-terraform.md`

---

### T-095: Create Troubleshooting Guide

**Model**: 🧠 sonnet
**AC**: Covers common issues and solutions
**Priority**: P1
**Estimated**: 4h

**Test Plan** (BDD):
- **Given** common troubleshooting scenarios
- **When** creating guide
- **Then** provides diagnostic steps and solutions

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Create `.specweave/docs/public/guides/kafka-troubleshooting.md`:
- MCP server connection issues
- Terraform deployment failures
- Authentication errors
- Performance issues
- Docker Compose problems

**Files**:
- `.specweave/docs/public/guides/kafka-troubleshooting.md`

---

### T-096: Create API Reference Documentation

**Model**: ⚡ haiku
**AC**: Documents all TypeScript APIs
**Priority**: P2
**Estimated**: 5h

**Test Plan** (BDD):
- **Given** TypeScript source code
- **When** generating API docs
- **Then** documents all public interfaces

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Use TypeDoc to generate API reference:
```bash
npx typedoc --out docs/api src/
```

**Files**:
- `docs/api/` (generated)
- `typedoc.json` (config)

---

### T-097: Create Examples Repository

**Model**: ⚡ haiku
**AC**: Provides working code examples
**Priority**: P2
**Estimated**: 6h

**Test Plan** (BDD):
- **Given** common use cases
- **When** creating examples
- **Then** provides runnable code samples

**Test Cases**:
- E2E: Run all examples → 100% success

**Implementation**:
Create `examples/` directory:
- Simple producer/consumer
- Avro with Schema Registry
- Exactly-once semantics
- Kafka Streams application
- n8n workflow integration

**Files**:
- `examples/simple-producer-consumer/`
- `examples/avro-schema-registry/`
- `examples/exactly-once-semantics/`
- `examples/kafka-streams-app/`
- `examples/n8n-workflow/`

---

### T-098: Create Changelog and Release Notes

**Model**: ⚡ haiku
**AC**: Documents all features and changes
**Priority**: P1
**Estimated**: 2h

**Test Plan** (BDD):
- **Given** all features implemented
- **When** creating changelog
- **Then** documents v1.0.0 release

**Test Cases**:
- Manual: Validate completeness → 100%

**Implementation**:
Create `CHANGELOG.md`:
- v1.0.0 (2025-11-15)
  - Initial release
  - 4 plugins (kafka, confluent, kafka-streams, n8n)
  - 20 user stories implemented
  - 100 tasks completed

**Files**:
- `CHANGELOG.md`

---

### T-099: Create Video Tutorials

**Model**: ⚡ haiku
**AC**: 5-minute quick start video
**Priority**: P3
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** video recording and editing
- **When** creating tutorial
- **Then** demonstrates getting started in 5 minutes

**Test Cases**:
- Manual: Watch video, validate clarity → 100%

**Implementation**:
Record screen capture:
- Install plugin
- Start local cluster
- Produce/consume messages
- Setup monitoring
- Publish to YouTube

**Files**:
- Video link in README.md

---

### T-100: Final Quality Review and Polish

**Model**: 💎 opus
**AC**: All features working, documentation complete, tests passing
**Priority**: P1
**Estimated**: 8h

**Test Plan** (BDD):
- **Given** completed increment
- **When** running final review
- **Then** validates all success criteria met

**Test Cases**:
- Manual QA: Test all features → 100%
- Automated: Run full test suite → 95%+ pass rate
- Documentation: Validate all links, examples → 100%

**Implementation**:
Final checklist:
- ✅ All 100 tasks completed
- ✅ Test coverage 85%+
- ✅ All documentation complete
- ✅ CI/CD passing
- ✅ Performance benchmarks met
- ✅ Security audit passed
- ✅ All 4 plugins working

**Files**:
- `.specweave/increments/0035-kafka-event-streaming-plugin/reports/FINAL-REVIEW.md`

---

## Summary

**Total Tasks**: 100
**Estimated Effort**: ~320 hours (~8 weeks with 1 developer)
**Test Coverage Target**: 85-90%
**Success Criteria**: All features working, comprehensive documentation, production-ready

**Next Steps After Completion**:
1. Run `/specweave:validate 0035 --quality` - Quality assessment
2. Run `/specweave:done 0035` - Close increment with PM validation
3. Publish plugins to SpecWeave marketplace
4. Announce release to community
